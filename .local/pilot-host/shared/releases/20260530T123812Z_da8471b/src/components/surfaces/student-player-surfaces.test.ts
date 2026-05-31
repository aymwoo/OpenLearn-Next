import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";

const dashboardSource = readFileSync("src/components/surfaces/student-dashboard-surface.tsx", "utf8");
const playerSource = readFileSync("src/components/surfaces/player-surface.tsx", "utf8");
const routeSource = readFileSync("src/app/(student)/student/player/page.tsx", "utf8");
const runtimeSource = readFileSync("src/components/learning/classroom-runtime-client.tsx", "utf8");

describe("Phase 04 student DTO surfaces", () => {
  it("renders dashboard states from learning DTOs instead of demo data", () => {
    expect(dashboardSource).not.toContain("demo-data");
    expect(dashboardSource).toContain("StudentDashboardDTO");
    expect(dashboardSource).toContain("还没有可学习的课时");
    expect(dashboardSource).toContain("查看课程列表");
    expect(dashboardSource).toContain("继续学习");
  });

  it("renders player shell, progress labels, and content completion from learning DTOs", () => {
    expect(playerSource).not.toContain("demo-data");
    expect(playerSource).toContain("StudentPlayerDTO");
    expect(playerSource).toContain("老师指定");
    expect(playerSource).toContain("已完成阅读");
    expect(routeSource).toContain("ClassroomRuntimeClient");
    expect(routeSource).toContain("getStudentPlayerPersonalDTO");
  });

  it("streams personal player state inside a Suspense boundary", () => {
    expect(routeSource).toContain("Suspense");
    expect(routeSource).toContain("getStudentPlayerShellDTO");
    expect(routeSource).toContain("getStudentPlayerPersonalDTO");
    expect(routeSource).toContain("selectedStepId={params?.stepId ?? null}");
    expect(routeSource).toContain("PlayerPersonalRegion");
    expect(routeSource).toContain("<Suspense");
    expect(routeSource).not.toContain("getStudentPlayerDTO({");
  });

  it("keeps shell chrome separate from personal learning state", () => {
    expect(playerSource).toContain("type PlayerSurfaceProps = {");
    expect(playerSource).toContain("shell:");
    expect(playerSource).toContain("personalSlot:");
    expect(playerSource).toContain("export function PlayerPersonalRegion");
    expect(playerSource).toContain("export function PlayerPersonalFallback");
    expect(playerSource).toContain("正在加载你的学习进度");
    expect(playerSource).toContain("正在读取最近一次提交");
  });

  it("keeps quick-response rendering inside the same classroom runtime shell", () => {
    expect(runtimeSource).toContain("StepActivityShell");
    expect(runtimeSource).toContain("RuntimeHostClient");
    expect(runtimeSource).toContain("当前活动");
    expect(runtimeSource).toContain("活动提示");
    expect(runtimeSource).toContain("提交要求");
    expect(runtimeSource).toContain("activity={activity}");
    expect(runtimeSource).toContain("QuickResponseStepCard");
    expect(runtimeSource).toContain("TaskStepCard");
    expect(runtimeSource).toContain("QuizStepCard");
  });

  it("keeps classroom EventSource auto reconnect active after transient errors", () => {
    expect(runtimeSource).toContain("subscribeClassroomSocket({");
    expect(runtimeSource).toContain("onReconnect() {");
    expect(runtimeSource).toContain("connectionState: 'reconnecting'");
    expect(runtimeSource).toContain("正在重新连接课堂，会先显示最近一次课堂状态。");
    expect(runtimeSource).toContain("onFallbackOpen() {");
    expect(runtimeSource).toContain("async onFallbackSnapshot(snapshot) {");
    expect(runtimeSource).not.toContain("source.onerror = () => {");
  });

  it("keeps runtime failure recovery on the same learning surface with retry CTA", () => {
    expect(runtimeSource).toContain("重试刚才的操作");
    expect(runtimeSource).toContain("当前状态暂未保存成功，请直接重试保存");
    expect(runtimeSource).toContain("本次互动结果暂未提交成功，请重试当前提交");
    expect(runtimeSource).toContain("snapshot_fallback");
    expect(runtimeSource).not.toContain("runtime-inspector");
    expect(runtimeSource).not.toContain("inspector auto-jump");
  });

  it("keeps retry orchestration on the same player surface after submit success is locked", () => {
    expect(runtimeSource).toContain("retryCurrentActionRequest");
    expect(runtimeSource).toContain("已保留当前学习上下文，请直接在当前 runtime 中重试刚才的操作。");
    expect(runtimeSource).toContain("RuntimeFailureRecoveryCard");
  });
});
