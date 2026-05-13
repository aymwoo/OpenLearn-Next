import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const dtoSource = readFileSync("src/lib/dto/learning.ts", "utf8");
const source = readFileSync("src/lib/dal/learning.ts", "utf8");

function functionBody(name: string) {
  const start = source.indexOf(`function ${name}`);

  if (start === -1) {
    return "";
  }

  const bodyStart = source.indexOf("{\n", start);
  let depth = 0;

  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];

    if (char === "{") {
      depth += 1;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return source.slice(bodyStart, index + 1);
      }
    }
  }

  return "";
}

describe("learning DAL student read boundary", () => {
  it("adds a typed student activity guidance contract to player-facing step data", () => {
    expect(dtoSource).toContain("StudentStepActivityDTOSchema");
    expect(dtoSource).toContain("activityGuidance");
    expect(dtoSource).toContain("expectedOutput");
    expect(dtoSource).toContain("evidenceExpectationSummary");
    expect(dtoSource).toContain("completionStateCopy");
    expect(dtoSource).toContain("activityModeLabel");
    expect(dtoSource).toContain("estimatedMinutesLabel");
    expect(dtoSource).toContain("stepActivities");
  });

  it("adds a separate quick-response latest and history DTO contract", () => {
    expect(dtoSource).toContain("StudentQuickResponseAttemptDTOSchema");
    expect(dtoSource).toContain("latestQuickResponse");
    expect(dtoSource).toContain("quickResponseHistory");
    expect(dtoSource).toContain("已记录为新的课堂回应");
    expect(dtoSource).toContain("latestSubmissions: z.object({");
    expect(dtoSource).toContain("history: z.object({");
  });

  it("is server-only and requires an active student", () => {
    expect(source.trimStart().startsWith('import "server-only";')).toBe(true);
    expect(source).toContain("assertActiveStudent");
    expect(source).toContain("getCurrentUserDTO");
    expect(source).toContain("getUserMembershipsDTO");
    expect(source).toContain('membership.role === "student"');
    expect(source).toContain('membership.status === "active"');
  });

  it("reads only published snapshots without draft leakage", () => {
    expect(source).toContain("publishedLessonVersions");
    expect(source).toContain("snapshotJson");
    expect(source).toContain("lessonStepPayloadSchema.parse");
    expect(source).toContain("StudentPlayerDTOSchema.parse");
    expect(source).toContain("课时暂不可学习");
  });

  it("keeps markdown payload and slide runtime data available to the student player", () => {
    expect(source).toContain("function parseSnapshotSteps(snapshot: PublishedSnapshot, fallbackLessonId: string): LearningStepDTO[]");
    expect(source).toContain("payload: lessonStepPayloadSchema.parse(step.payload)");
    expect(source).toContain("payload.teachingDesign");
    expect(source).toContain("slideIndex = classroomRuntime.slideIndex");
    expect(source).toContain("teacherRecommendedStepId = classroomRuntime.activeStepId");
  });

  it("reads quick-response history from classroom evidence scoped by session step and student", () => {
    expect(source).toContain("classroomEvidence");
    expect(source).toContain('sourceType, "student-quick-response"');
    expect(source).toContain('evidenceType, "response"');
    expect(source).toContain("latestQuickResponse");
    expect(source).toContain("quickResponseHistory");
    expect(source).toContain("currentQuickResponseStepId");
    expect(source).toContain("row.stepId === currentQuickResponseStepId");
    expect(source).toContain("classroomSessionId");
    expect(source).toContain("const quickResponseHistory = quickResponseRows");
    expect(source).toContain(".reverse()");
    expect(source).toContain("toStudentQuickResponseAttemptDTO(row, index + 1)");
  });

  it("derives Chinese student activity guidance server-side without leaking teacher-only wording", () => {
    expect(source).toContain("activityGuidance");
    expect(source).toContain("expectedOutput");
    expect(source).toContain("evidenceExpectationSummary");
    expect(source).toContain("completionStateCopy");
    expect(source).toContain("activityModeLabel");
    expect(source).toContain("estimatedMinutesLabel");
    expect(source).toContain("先阅读并抓住重点");
    expect(source).toContain("完成本次课堂作答");
    expect(source).toContain("独立完成");
    expect(source).toContain("两人讨论");
    expect(source).toContain("全班跟随");
    expect(source).toContain("无需单独提交");
    expect(source).toContain("写下课堂回应并提交");
    expect(source).toContain("最近一次课堂回应已记录");
    expect(source).not.toContain('"teacher-only"');
  });

  it("computes first incomplete resume and teacher-forced placeholder", () => {
    expect(source).toContain("first incomplete");
    expect(source).toContain("teacher-forced");
    expect(source).toContain("forcedStepId");
    expect(source).toContain("getStudentDashboardDTO");
    expect(source).toContain("getStudentPlayerDTO");
  });

  it("splits player reads into cached shell and dynamic personal data", () => {
    expect(source).toContain("export async function getStudentPlayerShellDTO");
    expect(source).toContain("export async function getStudentPlayerPersonalDTO");
    expect(source).toContain("export async function getStudentPlayerDTO");
    expect(source).toContain("getPublishedStudentPlayerShellDTO");
    expect(source).toContain("cacheLife('hours')");
    expect(source).toContain("cacheTag(cacheTags.lesson(input.lessonId))");
    expect(source).toContain("cacheTag(cacheTags.steps(input.lessonId))");
  });

  it("keeps request-specific authorization outside the cached shell reader", () => {
    const cachedShellSource = functionBody("getPublishedStudentPlayerShellDTO");
    const publicShellSource = functionBody("getStudentPlayerShellDTO");

    expect(cachedShellSource).toContain("'use cache'");
    expect(cachedShellSource).not.toContain("assertActiveStudent");
    expect(cachedShellSource).not.toContain("assertStudentCanAccessLesson");
    expect(cachedShellSource).not.toContain("getCurrentUserDTO");
    expect(cachedShellSource).not.toContain("getUserMembershipsDTO");
    expect(publicShellSource).toContain("input.scope");
    expect(source).toContain("assertStudentCanOpenPlayer");
  });

  it("keeps personal player data dynamic and student-scoped", () => {
    const personalStart = source.indexOf("export async function getStudentPlayerPersonalDTO");
    const composerStart = source.indexOf("export async function getStudentPlayerDTO");
    const personalSource = source.slice(personalStart, composerStart);

    expect(personalSource).not.toContain("'use cache'");
    expect(personalSource).toContain("assertActiveStudent");
    expect(personalSource).toContain("lessonStepProgress");
    expect(personalSource).toContain("taskSubmissions");
    expect(personalSource).toContain("quizAttempts");
  });

  it("enforces locked runtime server-side before selectedStepId", () => {
    expect(source).toContain("forcedStepId = classroomRuntime.activeStepId");
    expect(source).toContain("const resumeStepId = forcedStepId ?? selectedStepId ?? progress.firstIncompleteStepId");
    expect(source).toContain('teacherRecommendedStepId = classroomRuntime.activeStepId');
    expect(source).toContain("slideIndex = classroomRuntime.slideIndex");
    expect(source).toContain("disabledStepIds: locked ? steps.map(s => s.id).filter(id => id !== forcedStepId) : []");
  });
});

describe("learning DAL progress, append-only attempts, and teacher review", () => {
  it("records progress and append-only task/quiz attempts in transactions", () => {
    expect(source).toContain("export async function markStepProgress");
    expect(source).toContain("export async function submitTaskAttempt");
    expect(source).toContain("export async function submitQuizAttempt");
    expect(source).toContain("db.transaction");
    expect(source).toContain("append-only");
    expect(source).toContain("isLatest: 0");
    expect(source).toContain("isLatest: 1");
  });

  it("keeps quiz outcomes server-controlled without gradebook terms", () => {
    expect(source).toContain("correctOptionIndex");
    expect(source).toContain("showCorrectAnswer");
    expect(source).not.toContain("gradebook");
    expect(source).not.toContain("percentage");
  });

  it("supports teacher filters and short feedback validation", () => {
    expect(source).toContain("export async function getTeacherLessonReviewDTO");
    expect(source).toContain("export async function getTeacherStudentReviewDTO");
    expect(source).toContain("export async function saveAttemptFeedback");
    expect(source).toContain("needs_feedback");
    expect(source).toContain("FeedbackInputSchema.parse");
    expect(source).toContain("assertActiveTeacher");
    expect(source).toContain("body.length > 200");
  });
});
