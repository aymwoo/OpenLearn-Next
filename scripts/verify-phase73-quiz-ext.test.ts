import { describe, expect, it } from "vitest";

import {
  PHASE_73_VERIFY_SCRIPT,
  buildStaticProductSeamChecks,
  runPhase73Verification,
} from "./verify-phase73-quiz-ext";

describe("verify-phase73-quiz-ext", () => {
  it("exports the exact package script entry for verify:phase73", () => {
    expect(PHASE_73_VERIFY_SCRIPT).toBe(
      "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase73-quiz-ext.ts",
    );
  });

  it("static seam checks assert the multi-type schema, DTO, allowlist and cache-tag proof lane", () => {
    const checks = buildStaticProductSeamChecks();
    const labels = checks.map((check) => check.label);

    expect(labels).toContain(
      "quiz schema keeps plugin_owned_quiz_questions.questionType 5-type enum",
    );
    expect(labels).toContain("QuestionTypeSchema is exported for quiz question types");
    expect(labels).toContain(
      'classroom DTO keeps the 5-branch z.discriminatedUnion("questionType", ...)',
    );
    expect(labels).toContain(
      "generated allowlist keeps questionType readable on quiz.questions",
    );
    expect(labels).toContain(
      "runtime allowlist consumer keeps questionType accessible through governed reads",
    );
    expect(labels).toContain(
      "submit action still invalidates updateTag(cacheTags.quizStats(parsed.data.sessionId))",
    );
  });

  it("static seam checks assert teacher-only dashboard delivery and real /classroom surface ownership", () => {
    const checks = buildStaticProductSeamChecks();
    const labels = checks.map((check) => check.label);

    expect(labels).toContain(
      "ws connection registry keeps teacher-only filtering for quiz.answer.received",
    );
    expect(labels).toContain(
      "ws auth keeps active membership and teacher ownership derivation",
    );
    expect(labels).toContain(
      "live-answer remains a sibling tab on the real /classroom control-room surface",
    );
    expect(labels).toContain(
      "focused proof inventory still covers teacher-only live-answer route and dashboard surfaces",
    );
  });

  it("smoke mode resolves successfully without outer close artifacts", async () => {
    await expect(runPhase73Verification({ smokeOnly: true })).resolves.toBeUndefined();
  });
});
