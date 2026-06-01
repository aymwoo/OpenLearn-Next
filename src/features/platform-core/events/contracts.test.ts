import { describe, expect, it } from "vitest";

import {
  PlatformCommandExecutionResultSchema,
} from "@/features/platform-core/commands/contracts";
import {
  LessonDraftProducedEventSchema,
  LessonDraftRejectedEventSchema,
  LessonDraftRequestedEventSchema,
  LessonToolInvokedEventSchema,
  PlatformDomainEventSchema,
  PlatformEventBridgeOwnershipSchema,
  PlatformEventSchema,
  PlatformSuccessOrDomainEventSchema,
} from "@/features/platform-core/events/contracts";

describe("platform event contracts", () => {
  it("allows success results to carry one generic outcome event plus minimal domain events", () => {
    const result = PlatformCommandExecutionResultSchema.parse({
      resultSummary: {
        commandType: "plugin.install",
        pluginId: "plugin-1",
      },
      invalidation: {
        tags: ["plugin:registry", "plugin:plugin-1"],
      },
      emittedEvents: [
        {
          eventType: "platform.command.succeeded",
          category: "outcome",
          aggregateType: "plugin",
          aggregateId: "plugin-1",
          payload: {
            commandType: "plugin.install",
            invalidationTags: ["plugin:registry", "plugin:plugin-1"],
            resultSummary: {
              pluginId: "plugin-1",
              lifecycleState: "installed",
            },
          },
        },
        {
          eventType: "plugin.installed",
          category: "domain",
          aggregateType: "plugin",
          aggregateId: "plugin-1",
          payload: {
            pluginId: "plugin-1",
            pluginKey: "plugin-key",
            installSource: "manual",
            lifecycleState: "installed",
          },
        },
      ],
    });

    expect(result.emittedEvents).toHaveLength(2);
    expect(result.failureEvent).toBeNull();
    expect(result.failureAttribution).toBeNull();
  });

  it("allows exactly one generic failure event and rejects domain events on failed commands", () => {
    const failed = PlatformCommandExecutionResultSchema.parse({
      resultSummary: null,
      invalidation: { tags: [] },
      failureAttribution: {
        scope: "plugin",
        pluginId: "plugin-1",
        reasonCode: "activation_failed",
        recommendedRecoveryAction: "retry",
      },
      failureEvent: {
        eventType: "platform.command.failed",
        category: "outcome",
        aggregateType: "plugin",
        aggregateId: "plugin-1",
        payload: {
          commandType: "plugin.enable",
          reasonCode: "activation_failed",
          failureAttribution: {
            scope: "plugin",
            pluginId: "plugin-1",
            reasonCode: "activation_failed",
            recommendedRecoveryAction: "retry",
          },
        },
      },
    });

    expect(failed.failureEvent?.eventType).toBe("platform.command.failed");
    expect(failed.emittedEvents).toEqual([]);

    expect(() =>
      PlatformCommandExecutionResultSchema.parse({
        resultSummary: null,
        invalidation: { tags: [] },
        failureAttribution: {
          scope: "plugin",
          pluginId: "plugin-1",
          reasonCode: "activation_failed",
          recommendedRecoveryAction: "retry",
        },
        failureEvent: {
          eventType: "platform.command.failed",
          category: "outcome",
          aggregateType: "plugin",
          aggregateId: "plugin-1",
          payload: {
            commandType: "plugin.enable",
            reasonCode: "activation_failed",
            failureAttribution: {
              scope: "plugin",
              pluginId: "plugin-1",
              reasonCode: "activation_failed",
              recommendedRecoveryAction: "retry",
            },
          },
        },
        emittedEvents: [
          {
            eventType: "plugin.lifecycle.changed",
            category: "domain",
            aggregateType: "plugin",
            aggregateId: "plugin-1",
            payload: {
              pluginId: "plugin-1",
              fromState: "installed",
              toState: "enabled",
              reasonCode: "enabled",
              transitionCounter: 1,
            },
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects snapshot-style payloads and invalidation event families", () => {
    expect(() =>
      PlatformEventSchema.parse({
        eventType: "plugin.installed",
        category: "domain",
        aggregateType: "plugin",
        aggregateId: "plugin-1",
        payload: {
          pluginId: "plugin-1",
          pluginKey: "plugin-key",
          installSource: "manual",
          lifecycleState: "installed",
          manifestJson: {
            name: "too-much-detail",
          },
        },
      }),
    ).toThrow();

    expect(() =>
      PlatformEventSchema.parse({
        eventType: "platform.cache.invalidation.requested",
        category: "domain",
        aggregateType: "plugin",
        aggregateId: "plugin-1",
        payload: {
          tags: ["plugin:registry"],
        },
      }),
    ).toThrow();
  });

  it("parses the three AI-domain lesson draft events as valid PlatformEvents", () => {
    const requested = PlatformEventSchema.parse({
      eventType: "lesson.draft.requested",
      category: "domain",
      aggregateType: "lesson",
      aggregateId: "lesson_x",
      payload: {
        commandType: "lesson.draft.request",
        stepType: "content",
        intentSummary: "导入",
      },
    });
    expect(requested.eventType).toBe("lesson.draft.requested");

    const invoked = PlatformEventSchema.parse({
      eventType: "lesson.tool.invoked",
      category: "domain",
      aggregateType: "lesson",
      aggregateId: "lesson_x",
      payload: {
        toolName: "draftContentStep",
        stepType: "task",
        attempt: 1,
      },
    });
    expect(invoked.eventType).toBe("lesson.tool.invoked");

    const produced = PlatformEventSchema.parse({
      eventType: "lesson.draft.produced",
      category: "domain",
      aggregateType: "lesson",
      aggregateId: "lesson_x",
      payload: {
        stepType: "quiz",
        title: "随堂检测",
        succeeded: true,
        tokenUsage: 128,
      },
    });
    expect(produced.eventType).toBe("lesson.draft.produced");

    expect(LessonDraftRequestedEventSchema.safeParse({
      eventType: "lesson.draft.requested",
      category: "domain",
      aggregateType: "lesson",
      aggregateId: "lesson_x",
      payload: { commandType: "lesson.draft.request", stepType: "content", intentSummary: "导入" },
    }).success).toBe(true);
    expect(LessonToolInvokedEventSchema.safeParse({
      eventType: "lesson.tool.invoked",
      category: "domain",
      aggregateType: "lesson",
      aggregateId: "lesson_x",
      payload: { toolName: "draftContentStep", stepType: "content", attempt: 2 },
    }).success).toBe(true);
  });

  it("rejects AI-domain payload fields ending in Json (summary-only guard)", () => {
    const result = LessonDraftRequestedEventSchema.safeParse({
      eventType: "lesson.draft.requested",
      category: "domain",
      aggregateType: "lesson",
      aggregateId: "lesson_x",
      payload: {
        commandType: "lesson.draft.request",
        stepType: "content",
        intentSummary: "导入",
        stepPayloadJson: { title: "整包快照禁入" },
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message).join(" | ");
      expect(messages).toContain("must not include object snapshots");
    }
  });

  it("carries lesson.draft.produced through the domain and emittedEvents-capable unions", () => {
    const event = {
      eventType: "lesson.draft.produced" as const,
      category: "domain" as const,
      aggregateType: "lesson" as const,
      aggregateId: "lesson_x",
      payload: {
        stepType: "content" as const,
        title: "课堂导入",
        succeeded: true as const,
      },
    };

    expect(PlatformDomainEventSchema.safeParse(event).success).toBe(true);
    expect(PlatformSuccessOrDomainEventSchema.safeParse(event).success).toBe(true);
  });

  it("rejects AI-domain payloads with undeclared fields (.strict())", () => {
    const result = LessonDraftProducedEventSchema.safeParse({
      eventType: "lesson.draft.produced",
      category: "domain",
      aggregateType: "lesson",
      aggregateId: "lesson_x",
      payload: {
        stepType: "content",
        title: "课堂导入",
        succeeded: true,
        unexpectedField: "should be rejected",
      },
    });

    expect(result.success).toBe(false);
  });

  it("carries a guardrail rejection through the rejected, domain, and discriminated unions", () => {
    const rejected = {
      eventType: "lesson.draft.rejected" as const,
      category: "domain" as const,
      aggregateType: "lesson" as const,
      aggregateId: "l1",
      payload: {
        lessonId: "l1",
        stepType: "quiz" as const,
        reasonCode: "forbidden_content" as const,
        teacherId: "t1",
      },
    };

    expect(LessonDraftRejectedEventSchema.safeParse(rejected).success).toBe(true);
    expect(PlatformDomainEventSchema.safeParse(rejected).success).toBe(true);
    expect(PlatformEventSchema.safeParse(rejected).success).toBe(true);
  });

  it("rejects lesson.draft.rejected payloads carrying a step snapshot or *Json (T-65-PII)", () => {
    const withSnapshot = LessonDraftRejectedEventSchema.safeParse({
      eventType: "lesson.draft.rejected",
      category: "domain",
      aggregateType: "lesson",
      aggregateId: "l1",
      payload: {
        lessonId: "l1",
        stepType: "quiz",
        reasonCode: "forbidden_content",
        teacherId: "t1",
        stepJson: { title: "整包快照禁入" },
      },
    });
    expect(withSnapshot.success).toBe(false);

    const withExtraField = LessonDraftRejectedEventSchema.safeParse({
      eventType: "lesson.draft.rejected",
      category: "domain",
      aggregateType: "lesson",
      aggregateId: "l1",
      payload: {
        lessonId: "l1",
        stepType: "quiz",
        reasonCode: "forbidden_content",
        teacherId: "t1",
        body: "未声明字段应被拒绝",
      },
    });
    expect(withExtraField.success).toBe(false);
  });

  it("rejects lesson.draft.rejected with a reasonCode outside the shared vocabulary", () => {
    const result = LessonDraftRejectedEventSchema.safeParse({
      eventType: "lesson.draft.rejected",
      category: "domain",
      aggregateType: "lesson",
      aggregateId: "l1",
      payload: {
        lessonId: "l1",
        stepType: "quiz",
        reasonCode: "made_up",
        teacherId: "t1",
      },
    });
    expect(result.success).toBe(false);
  });

  it("locks bridge ownership to sqlite-ledger truth", () => {
    const ownership = PlatformEventBridgeOwnershipSchema.parse({
      sourceOfTruth: "sqlite-platform-event-ledger",
      delivery: "in-process",
      posture: "ledger-first",
      notes: ["future adapters must not replace durable truth"],
    });

    expect(ownership.sourceOfTruth).toBe("sqlite-platform-event-ledger");
  });
});
