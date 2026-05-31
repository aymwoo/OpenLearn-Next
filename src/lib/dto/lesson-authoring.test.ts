import { describe, expect, it } from "vitest";
import {
  buildLessonDraftDiffRows,
  EditableDraftStepSchema,
  LessonDraftReviewDTOSchema,
} from "./lesson-authoring";
import type { LessonStepDTO } from "./lesson-authoring";

// Minimal payload shapes that satisfy the discriminated union at runtime
// Note: materialRefs is required by the Zod inferred type (has .default([]))
const contentPayload = { type: "content" as const, title: "Content Title", body: "some body", materialRefs: [] as never[] };
const taskPayload = { type: "task" as const, prompt: "prompt", submissionType: "text" as const, materialRefs: [] as never[] };
const quizPayload = { type: "quiz" as const, question: "Q?", options: ["A", "B"], materialRefs: [] as never[] };

function makeStep(overrides: Partial<LessonStepDTO> = {}): LessonStepDTO {
  const type = overrides.type ?? "content";
  const defaultPayload =
    type === "task" ? taskPayload : type === "quiz" ? quizPayload : contentPayload;
  return {
    id: overrides.id ?? "step-1",
    lessonId: overrides.lessonId ?? "lesson-1",
    type: type as LessonStepDTO["type"],
    title: overrides.title ?? "Step Title",
    rank: overrides.rank ?? "a",
    payload: (overrides.payload ?? defaultPayload) as LessonStepDTO["payload"],
    teachingDesignStatus: overrides.teachingDesignStatus ?? "explicit",
    needsTeachingDesignRefinement: overrides.needsTeachingDesignRefinement ?? false,
    teachingDesignFallbackReason: overrides.teachingDesignFallbackReason ?? null,
    archivedAt: overrides.archivedAt ?? null,
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z",
  } as LessonStepDTO;
}

// ============================================================

describe("EditableDraftStepSchema", () => {
  it("accepts title, description, and content fields", () => {
    const result = EditableDraftStepSchema.safeParse({
      title: "New Title",
      description: "A description",
      content: "# markdown content",
    });
    expect(result.success).toBe(true);
  });

  it("rejects the type field (AI-generated step type should not be mutable)", () => {
    const result = EditableDraftStepSchema.safeParse({
      title: "Title",
      description: "desc",
      content: "body",
      type: "quiz",
    });
    expect(result.success).toBe(false);
  });

  it("rejects the pluginConfig field", () => {
    const result = EditableDraftStepSchema.safeParse({
      title: "Title",
      description: "desc",
      content: "body",
      pluginConfig: { enabled: true },
    });
    expect(result.success).toBe(false);
  });

  it("rejects the executableConfig field", () => {
    const result = EditableDraftStepSchema.safeParse({
      title: "Title",
      description: "desc",
      content: "body",
      executableConfig: { timeout: 30 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects the builtInSource field", () => {
    const result = EditableDraftStepSchema.safeParse({
      title: "Title",
      description: "desc",
      content: "body",
      builtInSource: { pluginId: "p1", builtInKey: "directInstruction", pluginName: "Test" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty payload (no fields)", () => {
    const result = EditableDraftStepSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("buildLessonDraftDiffRows", () => {
  it("returns empty array when both live and draft steps are empty", () => {
    expect(buildLessonDraftDiffRows([], [])).toEqual([]);
  });

  it("classifies a step present only in draft as new", () => {
    const draftStep = makeStep({ id: "draft-1", title: "New Step" });
    const rows = buildLessonDraftDiffRows([], [draftStep]);
    expect(rows).toHaveLength(1);
    expect(rows[0].state).toBe("new");
    expect(rows[0].index).toBe(0);
    expect(rows[0].liveStep).toBeNull();
    expect(rows[0].draftStep).toBe(draftStep);
  });

  it("classifies a step present only in live as deleted", () => {
    const liveStep = makeStep({ id: "live-1", title: "Old Step" });
    const rows = buildLessonDraftDiffRows([liveStep], []);
    expect(rows).toHaveLength(1);
    expect(rows[0].state).toBe("deleted");
    expect(rows[0].index).toBe(0);
    expect(rows[0].liveStep).toBe(liveStep);
    expect(rows[0].draftStep).toBeNull();
  });

  it("classifies steps with different titles as modified", () => {
    const liveStep = makeStep({
      id: "live-1",
      title: "Old Title",
      payload: { ...contentPayload, title: "Old Title" },
    });
    const draftStep = makeStep({
      id: "draft-1",
      title: "New Title",
      payload: { ...contentPayload, title: "New Title" },
    });
    const rows = buildLessonDraftDiffRows([liveStep], [draftStep]);
    expect(rows).toHaveLength(1);
    expect(rows[0].state).toBe("modified");
  });

  it("classifies steps with different content payload body as modified", () => {
    const liveStep = makeStep({
      id: "live-1",
      title: "Same Title",
      payload: { ...contentPayload, title: "Same Title", body: "old body" },
    });
    const draftStep = makeStep({
      id: "draft-1",
      title: "Same Title",
      payload: { ...contentPayload, title: "Same Title", body: "new body" },
    });
    const rows = buildLessonDraftDiffRows([liveStep], [draftStep]);
    expect(rows).toHaveLength(1);
    expect(rows[0].state).toBe("modified");
  });

  it("classifies steps with different task prompts as modified", () => {
    const liveStep = makeStep({
      id: "live-1",
      type: "task",
      title: "Task Step",
      payload: { ...taskPayload, prompt: "old prompt" },
    });
    const draftStep = makeStep({
      id: "draft-1",
      type: "task",
      title: "Task Step",
      payload: { ...taskPayload, prompt: "new prompt" },
    });
    const rows = buildLessonDraftDiffRows([liveStep], [draftStep]);
    expect(rows).toHaveLength(1);
    expect(rows[0].state).toBe("modified");
  });

  it("classifies steps with different quiz questions as modified", () => {
    const liveStep = makeStep({
      id: "live-1",
      type: "quiz",
      title: "Quiz Step",
      payload: { ...quizPayload, question: "old question" },
    });
    const draftStep = makeStep({
      id: "draft-1",
      type: "quiz",
      title: "Quiz Step",
      payload: { ...quizPayload, question: "new question" },
    });
    const rows = buildLessonDraftDiffRows([liveStep], [draftStep]);
    expect(rows).toHaveLength(1);
    expect(rows[0].state).toBe("modified");
  });

  it("classifies identical steps as unchanged", () => {
    const liveStep = makeStep({
      id: "live-1",
      title: "Same",
      payload: { ...contentPayload, title: "Same", body: "body" },
    });
    const draftStep = makeStep({
      id: "draft-1",
      title: "Same",
      payload: { ...contentPayload, title: "Same", body: "body" },
    });
    const rows = buildLessonDraftDiffRows([liveStep], [draftStep]);
    expect(rows).toHaveLength(1);
    expect(rows[0].state).toBe("unchanged");
  });

  it("handles deleted steps when live is longer than draft", () => {
    const liveSteps = [
      makeStep({ id: "live-1", title: "A", payload: { ...contentPayload, title: "A", body: "a" } }),
      makeStep({ id: "live-2", title: "B", payload: { ...contentPayload, title: "B", body: "b" } }),
      makeStep({ id: "live-3", title: "C", payload: { ...contentPayload, title: "C", body: "c" } }),
    ];
    const draftSteps = [
      makeStep({ id: "draft-1", title: "A", payload: { ...contentPayload, title: "A", body: "a" } }),
    ];
    const rows = buildLessonDraftDiffRows(liveSteps, draftSteps);
    expect(rows).toHaveLength(3);
    expect(rows[0].state).toBe("unchanged");
    expect(rows[1].state).toBe("deleted");
    expect(rows[2].state).toBe("deleted");
  });

  it("handles new steps when draft is longer than live", () => {
    const liveSteps = [
      makeStep({ id: "live-1", title: "A", payload: { ...contentPayload, title: "A", body: "a" } }),
    ];
    const draftSteps = [
      makeStep({ id: "draft-1", title: "A", payload: { ...contentPayload, title: "A", body: "a" } }),
      makeStep({ id: "draft-2", title: "B", payload: { ...contentPayload, title: "B", body: "b" } }),
      makeStep({ id: "draft-3", title: "C", payload: { ...contentPayload, title: "C", body: "c" } }),
    ];
    const rows = buildLessonDraftDiffRows(liveSteps, draftSteps);
    expect(rows).toHaveLength(3);
    expect(rows[0].state).toBe("unchanged");
    expect(rows[1].state).toBe("new");
    expect(rows[2].state).toBe("new");
  });
});

describe("LessonDraftReviewDTOSchema", () => {
  it("parses a valid review DTO with diffRows", () => {
    const dto = {
      lesson: {
        id: "lesson-1", courseId: "course-1", title: "Test Lesson", objective: "Learn testing",
        status: "draft", revision: 1, stepCount: 2, publishedVersionId: null,
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      liveSteps: [],
      draftSteps: [],
      draftMeta: {
        draftVersionId: "draft-1", version: 2, source: "ai", status: "pending",
        createdAt: "2026-01-01T00:00:00.000Z", stepCount: 1,
      },
      diffRows: [
        { index: 0, state: "modified", liveStep: null, draftStep: null },
      ],
      hasPendingDraft: true,
    };
    const result = LessonDraftReviewDTOSchema.safeParse(dto);
    expect(result.success).toBe(true);
  });

  it("rejects a DTO without diffRows array", () => {
    const result = LessonDraftReviewDTOSchema.safeParse({
      lesson: { id: "l1", courseId: "c1", title: "T", objective: "O", status: "draft", revision: 1, stepCount: 0, publishedVersionId: null, updatedAt: "2026-01-01T00:00:00.000Z" },
      liveSteps: [],
      draftSteps: [],
      draftMeta: { draftVersionId: "d1", version: 1, source: "ai", status: "pending", createdAt: "2026-01-01T00:00:00.000Z", stepCount: 0 },
      diffRows: "not-an-array",
      hasPendingDraft: true,
    });
    expect(result.success).toBe(false);
  });
});
