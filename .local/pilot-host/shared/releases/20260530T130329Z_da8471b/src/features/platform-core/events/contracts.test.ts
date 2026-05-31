import { describe, expect, it } from "vitest";

import {
  PlatformCommandExecutionResultSchema,
} from "@/features/platform-core/commands/contracts";
import {
  PlatformEventBridgeOwnershipSchema,
  PlatformEventSchema,
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
