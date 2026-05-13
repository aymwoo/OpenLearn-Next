import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";

const taskSource = readFileSync("src/components/learning/task-step-card.tsx", "utf8");
const quizSource = readFileSync("src/components/learning/quiz-step-card.tsx", "utf8");
const quickResponseSource = readFileSync("src/components/learning/quick-response-step-card.tsx", "utf8");
const playerRouteSource = readFileSync("src/app/(student)/student/player/page.tsx", "utf8");
const runtimeSource = readFileSync("src/components/learning/classroom-runtime-client.tsx", "utf8");

describe("Phase 04 interactive student step cards", () => {
  it("renders the current step through one classroom activity shell", () => {
    expect(runtimeSource).toContain("当前活动");
    expect(runtimeSource).toContain("活动提示");
    expect(runtimeSource).toContain("你将完成");
    expect(runtimeSource).toContain("提交要求");
    expect(runtimeSource).toContain("当前状态");
    expect(runtimeSource).toContain("StepActivityShell");
  });

  it("keeps task submissions client-side and draft preserving", () => {
    expect(taskSource.startsWith('"use client";')).toBe(true);
    expect(taskSource).toContain("submitTaskAttemptAction");
    expect(taskSource).toContain("提交任务");
    expect(taskSource).toContain("正在提交");
    expect(taskSource).toContain("第 1 次尝试");
    expect(taskSource).toContain("已提交，本次尝试已记录");
    expect(taskSource).toContain("最新一次");
    expect(taskSource).toContain("历史记录");
  });

  it("keeps quiz answers client-side with retry and reveal controlled by DTO fields", () => {
    expect(quizSource.startsWith('"use client";')).toBe(true);
    expect(quizSource).toContain("submitQuizAttemptAction");
    expect(quizSource).toContain("提交答案");
    expect(quizSource).toContain("再试一次");
    expect(quizSource).toContain("showCorrectAnswer");
    expect(quizSource).toContain("canRetryQuiz");
    expect(quizSource).toContain("最新一次");
    expect(quizSource).toContain("历史记录");
  });

  it("wires task and quiz cards into the player surface", () => {
    expect(playerRouteSource).toContain("ClassroomRuntimeClient");
    expect(runtimeSource).toContain("TaskStepCard");
    expect(runtimeSource).toContain("QuizStepCard");
    expect(runtimeSource).toContain("teacherRecommendedStepId");
    expect(runtimeSource).toContain("前往老师推荐步骤");
  });

  it("renders a lightweight quick-response card with durable latest and history feedback", () => {
    expect(quickResponseSource).toContain("activity.activityGuidance");
    expect(quickResponseSource).toContain("activity.evidenceExpectationSummary");
    expect(quickResponseSource).not.toContain("teachingDesign?.evidenceExpectation?.prompt");
    expect(quickResponseSource).toContain("提交课堂回应");
    expect(quickResponseSource).toContain("每次提交都会追加到回应历史");
    expect(quickResponseSource).toContain("不会覆盖之前的记录");
    expect(quickResponseSource).toContain("提交后会作为一次新的课堂记录保存");
    expect(quickResponseSource).toContain("最新回应");
    expect(quickResponseSource).toContain("第 1 次回应");
  });

  it("adds quick-response runtime routing without removing task and quiz cards", () => {
    expect(runtimeSource).toContain("QuickResponseStepCard");
    expect(runtimeSource).toContain("activity={activity}");
    expect(runtimeSource).toContain("student-quick-response");
    expect(runtimeSource).toContain("TaskStepCard");
    expect(runtimeSource).toContain("QuizStepCard");
  });
});
