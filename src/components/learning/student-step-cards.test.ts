import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";

const taskSource = readFileSync("src/components/learning/task-step-card.tsx", "utf8");
const quizSource = readFileSync("src/components/learning/quiz-step-card.tsx", "utf8");
const playerRouteSource = readFileSync("src/app/(student)/student/player/page.tsx", "utf8");
const runtimeSource = readFileSync("src/components/learning/classroom-runtime-client.tsx", "utf8");

describe("Phase 04 interactive student step cards", () => {
  it("keeps task submissions client-side and draft preserving", () => {
    expect(taskSource.startsWith('"use client";')).toBe(true);
    expect(taskSource).toContain("submitTaskAttemptAction");
    expect(taskSource).toContain("提交任务");
    expect(taskSource).toContain("正在提交");
    expect(taskSource).toContain("第 1 次尝试");
    expect(taskSource).toContain("已提交，本次尝试已记录");
  });

  it("keeps quiz answers client-side with retry and reveal controlled by DTO fields", () => {
    expect(quizSource.startsWith('"use client";')).toBe(true);
    expect(quizSource).toContain("submitQuizAttemptAction");
    expect(quizSource).toContain("提交答案");
    expect(quizSource).toContain("再试一次");
    expect(quizSource).toContain("showCorrectAnswer");
    expect(quizSource).toContain("canRetryQuiz");
  });

  it("wires task and quiz cards into the player surface", () => {
    expect(playerRouteSource).toContain("ClassroomRuntimeClient");
    expect(runtimeSource).toContain("TaskStepCard");
    expect(runtimeSource).toContain("QuizStepCard");
  });
});
