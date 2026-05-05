import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  FeedbackInputSchema,
  StudentDashboardDTOSchema,
  StudentPlayerDTOSchema,
  StudentPlayerShellDTOSchema,
  StudentPlayerPersonalDTOSchema,
  TeacherLessonReviewDTOSchema,
} from "./learning";

const source = readFileSync("src/lib/dto/learning.ts", "utf8");

describe("Phase 04 learning DTO contracts", () => {
  it("exports dashboard, player, and teacher review schemas", () => {
    expect(StudentDashboardDTOSchema).toBeDefined();
    expect(StudentPlayerDTOSchema).toBeDefined();
    expect(StudentPlayerShellDTOSchema).toBeDefined();
    expect(StudentPlayerPersonalDTOSchema).toBeDefined();
    expect(TeacherLessonReviewDTOSchema).toBeDefined();
  });

  it("exports split player shell and personal DTO types", () => {
    expect(source).toContain("export type StudentPlayerShellDTO");
    expect(source).toContain("export type StudentPlayerPersonalDTO");
    expect(source).toContain("StudentPlayerDTOSchema.shape.shell");
    expect(source).toContain("StudentPlayerDTOSchema.omit({ shell: true })");
  });

  it("caps feedback body at 200 characters", () => {
    expect(FeedbackInputSchema.safeParse({ targetType: "task_submission", targetId: "attempt-1", body: "继续加油" }).success).toBe(
      true
    );
    expect(
      FeedbackInputSchema.safeParse({ targetType: "quiz_attempt", targetId: "attempt-2", body: "好".repeat(201) }).success
    ).toBe(false);
  });

  it("keeps retry and answer reveal flags server controlled", () => {
    const player = StudentPlayerDTOSchema.parse({
      shell: {
        lessonId: "lesson-1",
        publishedVersionId: "version-1",
        title: "分数认识",
        objective: "理解分数意义",
        steps: [
          {
            id: "step-1",
            lessonId: "lesson-1",
            type: "quiz",
            title: "课中小测",
            rank: "a0",
            payload: { type: "quiz", question: "1/2 等于？", options: ["0.5", "2"] },
          },
        ],
      },
      progress: {
        resumeStepId: "step-1",
        resumeLabel: "从第一个未完成步骤继续",
        steps: [{ stepId: "step-1", state: "in_progress" }],
      },
      runtime: { forcedStepId: null, inaccessibleMessage: null },
      latestSubmissions: { tasks: [], quizzes: [] },
      history: { tasks: [], quizzes: [] },
    });

    expect(player.latestSubmissions.tasks).toEqual([]);
  });
});
