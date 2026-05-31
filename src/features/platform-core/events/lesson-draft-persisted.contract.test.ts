import { describe, expect, it } from "vitest";

import { cacheTags } from "@/lib/cache-policy";
import {
  LessonDraftPersistedEventSchema,
  PlatformDomainEventSchema,
} from "@/features/platform-core/events/contracts";

const validEvent = {
  eventType: "lesson.draft.persisted" as const,
  category: "domain" as const,
  aggregateType: "lesson" as const,
  aggregateId: "lesson-1",
  payload: {
    draftVersionId: "draft-1",
    version: 1,
    stepCount: 3,
    source: "ai" as const,
  },
};

describe("lesson.draft.persisted contract", () => {
  it("parses a valid summary-only persisted event", () => {
    const parsed = LessonDraftPersistedEventSchema.parse(validEvent);

    expect(parsed.eventType).toBe("lesson.draft.persisted");
    expect(parsed.payload).toEqual({
      draftVersionId: "draft-1",
      version: 1,
      stepCount: 3,
      source: "ai",
    });
    // audit default is applied
    expect(parsed.audit).toEqual({ delegatedActor: null, approval: null });
  });

  it("rejects payloads that leak object snapshots (summary-only guard, T-63-04)", () => {
    const leaky = {
      ...validEvent,
      payload: {
        ...validEvent.payload,
        snapshotJson: { steps: [{ type: "content" }] },
      },
    };

    expect(() => LessonDraftPersistedEventSchema.parse(leaky)).toThrow();

    // also reject any other arbitrary *Json key
    const leakyArbitrary = {
      ...validEvent,
      payload: { ...validEvent.payload, stepsJson: "[]" },
    };
    expect(() => LessonDraftPersistedEventSchema.parse(leakyArbitrary)).toThrow();
  });

  it("rejects non-ai source (this phase only writes source:'ai')", () => {
    const humanSource = {
      ...validEvent,
      payload: { ...validEvent.payload, source: "human" },
    };
    expect(() => LessonDraftPersistedEventSchema.parse(humanSource)).toThrow();
  });

  it("is registered in the PlatformDomainEvent union", () => {
    const parsed = PlatformDomainEventSchema.parse(validEvent);
    expect(parsed.eventType).toBe("lesson.draft.persisted");
  });

  it("derives the draftLesson cache tag", () => {
    expect(cacheTags.draftLesson("L1")).toBe("draft:L1");
  });
});
