import { describe, expect, it } from "vitest";

import {
  evaluatePhase56StaticChecks,
  getPhase56VerificationSuitePaths,
  verifyPhase56PackageScript,
} from "./verify-phase56-voting-authoring";

describe("verify-phase56 voting authoring gate", () => {
  it("expects the dedicated verify:phase56 package script", () => {
    expect(
      verifyPhase56PackageScript(
        JSON.stringify({
          scripts: {
            "verify:phase56": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase56-voting-authoring.ts",
          },
        }),
      ),
    ).toBe(true);
  });

  it("locks the focused phase 56 suite list to repo-local authoring and publish tests", () => {
    expect(getPhase56VerificationSuitePaths()).toEqual([
      "src/components/authoring/lesson-authoring-workspace.test.tsx",
      "src/lib/dal/plugins.builtins.test.ts",
      "src/lib/dal/lesson-authoring.test.ts",
      "src/actions/lesson-authoring-actions.test.ts",
      "src/components/authoring/authoring-status-panel.test.tsx",
    ]);
  });

  it("fails static evaluation when voting blocker taxonomy regresses to a generic publish gate", () => {
    const checks = evaluatePhase56StaticChecks({
      packageSource: JSON.stringify({
        scripts: {
          "verify:phase56": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase56-voting-authoring.ts",
        },
      }),
      dtoSource: `
        export const lessonStepPayloadSchema = z.discriminatedUnion("type", [contentStepPayloadSchema, taskStepPayloadSchema, quizStepPayloadSchema]);
        export const LessonStepDTOSchema = z.object({ type: z.enum(["content", "task", "quiz"]) });
        export const LessonPublishIssueCodeSchema = z.enum(["LESSON_TITLE_REQUIRED"]);
      `,
      lessonAuthoringSource: `
        function resolveVotingExecutableContract() {}
        throw new Error("PUBLISH_BLOCKED");
      `,
      pluginDataSource: `
        export async function listPluginStepExtensions() {}
        function helper() { return pluginLessonStepExtensions; }
      `,
      pluginDalSource: "",
      actionsSource: "",
    });

    expect(
      checks.find((check: { label: string; passed: boolean }) => check.label === "voting publish blockers remain structured and specific")
        ?.passed,
    ).toBe(false);
  });
});
