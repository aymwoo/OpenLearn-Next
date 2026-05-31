import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  CreateOrResumeRuntimeSessionInputSchema,
  RuntimeBootstrapDTOSchema,
} from "./runtime-session-contracts";

const bannedBootstrapTokens = ["snapshotJson", "cookies", "secret", "password", "dbRow"] as const;
const source = readFileSync("src/features/runtime-platform/classroom/runtime-session-contracts.ts", "utf8");

describe("runtime session contracts", () => {
  it("parses minimal bootstrap dto", () => {
    expect(
      RuntimeBootstrapDTOSchema.parse({
        sessionId: "runtime-session-1",
        runtimeVersion: "2026.05.0",
        stepSummary: {
          stepId: "step-1",
          stepType: "task",
          stepTitle: "交互实验",
          runtime: {
            version: "v2",
            runtimeId: "runtime-html-courseware",
            runtimeVersion: "2026.05.0",
            kind: "html-courseware",
            displayName: "HTML 实验",
            stateSchemaVersion: "state-v1",
            entry: {
              sandbox: "iframe",
              bootstrap: "/runtime/html-courseware",
            },
            bootstrap: {
              contextMode: "minimal",
              resumeStrategy: "latest-or-create",
              capabilitySnapshot: "session-scoped",
            },
            submitTarget: {
              primary: "classroom-evidence",
              additional: ["task-submission"],
            },
            requestedCapabilities: ["runtime:submission:create"],
          },
        },
        lessonSummary: {
          lessonId: "lesson-1",
          lessonTitle: "运动与受力",
          publishedVersionId: "published-1",
        },
        classroomSummary: {
          classroomSessionId: "classroom-1",
          classId: "class-1",
          className: "七年级一班",
          teacherId: "teacher-1",
          locked: true,
          status: "live",
        },
        actor: {
          actorId: "student-1",
          actorScope: "student",
          schoolId: "school-1",
        },
        capabilityContext: {
          grantedCapabilities: ["runtime:state:save"],
          hostPermissions: ["host:lesson:read"],
          authorizationMode: "session-snapshot",
        },
        latestStateSummary: {
          stateVersion: 3,
          kind: "saved",
          summary: {
            currentNode: "node-2",
          },
          updatedAt: "2026-05-16T14:20:00.000Z",
        },
      }),
    ).toMatchObject({ runtimeVersion: "2026.05.0" });
  });

  it("parses create or resume input identity", () => {
    expect(
      CreateOrResumeRuntimeSessionInputSchema.parse({
        classroomSessionId: "classroom-1",
        publishedVersionId: "published-1",
        lessonId: "lesson-1",
        stepId: "step-1",
        runtimeId: "runtime-html-courseware",
        runtimeVersion: "2026.05.0",
        actorId: "student-1",
        actorScope: "student",
        schoolId: "school-1",
        resumeFromLatest: true,
      }),
    ).toMatchObject({ stepId: "step-1" });
  });

  it("does not expose banned bootstrap field tokens", () => {
    for (const token of bannedBootstrapTokens) {
      expect(source).not.toContain(token);
    }
  });
});
