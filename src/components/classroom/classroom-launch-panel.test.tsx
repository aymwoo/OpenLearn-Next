// @vitest-environment jsdom

import { readFileSync } from "node:fs";

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ClassroomLaunchPanel } from "./classroom-launch-panel";

const launchSurfaceSource = readFileSync(
  "src/components/surfaces/classroom-launch-surface.tsx",
  "utf8",
);

const launchClassroomSessionAction = vi.fn();
const push = vi.fn();
const refresh = vi.fn();

vi.mock("@/actions/classroom-actions", () => ({
  launchClassroomSessionAction: (...args: unknown[]) => launchClassroomSessionAction(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    refresh,
  }),
}));

describe("ClassroomLaunchPanel", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    launchClassroomSessionAction.mockResolvedValue({
      ok: true,
      data: { sessionId: "session-123" },
    });
  });

  it("routes to the exact classroom session returned by the launch action", async () => {
    render(
      <ClassroomLaunchPanel
        publishedLessons={[
          {
            id: "lesson-1",
            title: "古诗导读",
            publishedVersionId: "pub-1",
            courseId: "course-1",
            classes: [{
              id: "class-1",
              name: "一班",
              studentCount: 42,
                rosterSummary: {
                  classId: "class-1",
                  className: "一班",
                  studentCount: 42,
                  launchScopeLabel: "整班启动",
                  note: "本次会按整班名单同步进入课堂；如需调整名册，请先回到班级相关页面处理。",
                },
              }],
            launchPreview: {
              lessonId: "lesson-1",
              lessonTitle: "古诗导读",
              totalEstimatedMinutes: 15,
              stepCount: 1,
              steps: [
                {
                  id: "step-1",
                  order: 1,
                  title: "开场导入",
                  family: "教师讲授",
                  summary: "老师先带学生整体感知文本。",
                  activityIntent: "explain",
                  activityMode: "mini-lecture",
                  estimatedMinutes: 15,
                  evidenceSummary: "观察记录：关注学生是否能跟随讲解理解核心概念。",
                  teachingDesignStatus: "explicit",
                  needsTeachingDesignRefinement: false,
                  teachingDesignFallbackReason: null,
                  materialCues: [],
                },
              ],
            },
            launchReadiness: {
              blockingIssues: [],
              attentionIssues: [],
              advisoryIssues: [],
            },
          },
        ]}
        emptyStateCopy="暂无可开课课时"
        launchPreviewEmptyState={{
          title: "先选择一个已发布课时",
          description: "选定课时后会显示课堂节奏预览。",
        }}
        successHref="/classroom"
      />
    );

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0]!, { target: { value: "lesson-1" } });

    await waitFor(() => expect(screen.getAllByRole("combobox")).toHaveLength(2));

    fireEvent.change(screen.getAllByRole("combobox")[1]!, { target: { value: "class-1" } });
    fireEvent.click(screen.getByRole("button", { name: "开启新课堂" }));

    await waitFor(() => {
      expect(launchClassroomSessionAction).toHaveBeenCalledTimes(1);
      expect(push).toHaveBeenCalledWith("/classroom?sessionId=session-123");
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("shows inferred launch preview cues while still launching from the published snapshot", async () => {
    render(
      <ClassroomLaunchPanel
        publishedLessons={[
          {
            id: "lesson-1",
            title: "古诗导读",
            publishedVersionId: "pub-1",
            courseId: "course-1",
            classes: [{
              id: "class-1",
              name: "一班",
              studentCount: 42,
                rosterSummary: {
                  classId: "class-1",
                  className: "一班",
                  studentCount: 42,
                  launchScopeLabel: "整班启动",
                  note: "本次会按整班名单同步进入课堂；如需调整名册，请先回到班级相关页面处理。",
                },
              }],
            launchPreview: {
              lessonId: "lesson-1",
              lessonTitle: "古诗导读",
              totalEstimatedMinutes: 15,
              stepCount: 1,
              steps: [
                {
                  id: "step-1",
                  order: 1,
                  title: "开场导入",
                  family: "教师讲授",
                  summary: "老师先带学生整体感知文本。",
                  activityIntent: "explain",
                  activityMode: "mini-lecture",
                  estimatedMinutes: 15,
                  evidenceSummary: "观察记录：关注学生是否能跟随讲解理解核心概念。（默认推断）",
                  teachingDesignStatus: "inferred",
                  needsTeachingDesignRefinement: true,
                  teachingDesignFallbackReason: "legacy-content-default",
                  materialCues: [],
                },
              ],
            },
            launchReadiness: {
              blockingIssues: [],
              attentionIssues: [{
                code: "TEACHING_DESIGN_INFERRED",
                message: "1 个环节仍在使用默认推断，不会阻断开课，但建议教师先过一遍课堂节奏。",
              }],
              advisoryIssues: [{
                code: "EVIDENCE_CUES_REVIEW",
                message: "1 个环节的采证提醒仍需教师确认，建议开课前明确要观察或收集什么。",
              }],
            },
          },
        ]}
        emptyStateCopy="暂无可开课课时"
        launchPreviewEmptyState={{
          title: "先选择一个已发布课时",
          description: "选定课时后会显示课堂节奏预览。",
        }}
        successHref="/classroom"
      />,
    );

    const launchButton = screen.getAllByRole("button", { name: "开启新课堂" })[0]!;
    const launchForm = launchButton.parentElement;

    if (!(launchForm instanceof HTMLElement)) {
      throw new Error("Expected launch form container");
    }

    fireEvent.change(within(launchForm).getAllByRole("combobox")[0]!, { target: { value: "lesson-1" } });

    await waitFor(() => {
      expect(document.body.textContent).toContain("默认推断");
      expect(document.body.textContent).toContain("课堂仍会按已发布快照启动，本期不会因为默认推断而阻断开课。");
    });
    expect(document.body.textContent).toContain("整班摘要");
    expect(document.body.textContent).not.toContain("排除学生");
    expect(document.body.textContent).not.toContain("子集启动");

    await waitFor(() => expect(within(launchForm).getAllByRole("combobox")).toHaveLength(2));
    fireEvent.change(within(launchForm).getAllByRole("combobox")[1]!, { target: { value: "class-1" } });
    expect(document.body.textContent).toContain("本次会按整班名单同步进入课堂；如需调整名册，请先回到班级相关页面处理。");
    fireEvent.click(launchButton);

    await waitFor(() => {
      expect(launchClassroomSessionAction).toHaveBeenCalledWith(expect.any(FormData));
      expect(push).toHaveBeenCalledWith("/classroom?sessionId=session-123");
    });

    const formData = launchClassroomSessionAction.mock.calls[0]?.[0] as FormData;
    expect(formData.get("publishedVersionId")).toBe("pub-1");
  });

  it("shows the graded readiness labels without blocking the launch button on inferred cues alone", async () => {
    render(
      <ClassroomLaunchPanel
        publishedLessons={[
          {
            id: "lesson-1",
            title: "古诗导读",
            publishedVersionId: "pub-1",
            courseId: "course-1",
            classes: [{
              id: "class-1",
              name: "一班",
              studentCount: 42,
                rosterSummary: {
                  classId: "class-1",
                  className: "一班",
                  studentCount: 42,
                  launchScopeLabel: "整班启动",
                  note: "本次会按整班名单同步进入课堂；如需调整名册，请先回到班级相关页面处理。",
                },
              }],
            launchPreview: {
              lessonId: "lesson-1",
              lessonTitle: "古诗导读",
              totalEstimatedMinutes: 15,
              stepCount: 1,
              steps: [{
                id: "step-1",
                order: 1,
                title: "开场导入",
                family: "教师讲授",
                summary: "老师先带学生整体感知文本。",
                activityIntent: "explain",
                activityMode: "mini-lecture",
                estimatedMinutes: 15,
                evidenceSummary: "观察记录：关注学生是否能跟随讲解理解核心概念。（默认推断）",
                teachingDesignStatus: "inferred",
                needsTeachingDesignRefinement: true,
                teachingDesignFallbackReason: "legacy-content-default",
                materialCues: [],
              }],
            },
            launchReadiness: {
              blockingIssues: [],
              attentionIssues: [{ code: "TEACHING_DESIGN_INFERRED", message: "1 个环节仍在使用默认推断，不会阻断开课，但建议教师先过一遍课堂节奏。" }],
              advisoryIssues: [{ code: "MATERIAL_CUES_MISSING", message: "1 个环节还没有明确材料提示，建议开课前补齐讲义、链接或设备准备。" }],
            },
          },
        ]}
        emptyStateCopy="暂无可开课课时"
        launchPreviewEmptyState={{ title: "先选择一个已发布课时", description: "选定课时后会显示课堂节奏预览。" }}
      />,
    )

    fireEvent.change(screen.getAllByRole('combobox')[0]!, { target: { value: 'lesson-1' } })

    expect(screen.getAllByText('阻断项').length).toBeGreaterThan(0)
    expect(screen.getAllByText('需关注').length).toBeGreaterThan(0)
    expect(screen.getAllByText('建议完善').length).toBeGreaterThan(0)
    expect(screen.getByText('当前没有阻断项，可以继续选择整班并开启课堂。')).toBeTruthy()
    expect(screen.getByText('1 个环节仍在使用默认推断，不会阻断开课，但建议教师先过一遍课堂节奏。')).toBeTruthy()
    expect(screen.getByText('1 个环节还没有明确材料提示，建议开课前补齐讲义、链接或设备准备。')).toBeTruthy()
    expect(screen.getByText('当前只支持整班启动；选择班级后会在这里展示名册规模与启动范围说明。')).toBeTruthy()

    await waitFor(() => expect(screen.getAllByRole('combobox')).toHaveLength(2))
    fireEvent.change(screen.getAllByRole('combobox')[1]!, { target: { value: 'class-1' } })

    expect((screen.getByRole('button', { name: '开启新课堂' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it("keeps the launch surface on the shared teacher skeleton without horizontal card rails", () => {
    expect(launchSurfaceSource).toContain("surfaceWidths.workspace");
    expect(launchSurfaceSource).toContain("surfaceWidths.heroBody");
    expect(launchSurfaceSource).toContain("teacherSurfaceRhythm.stack");
    expect(launchSurfaceSource).toContain("xl:grid-cols-[minmax(0,1fr)_320px]");
    expect(launchSurfaceSource).not.toContain("overflow-x-auto");
  });

  it("adds a secondary seeded proof affordance without replacing the main launch CTA", () => {
    expect(launchSurfaceSource).toContain("seeded proof 演示");
    expect(launchSurfaceSource).toContain("开发测试课时");
    expect(launchSurfaceSource).toContain("互动证明：HTML 课件实验");
    expect(launchSurfaceSource).toContain("开启新课堂");
  });

  it("keeps launch proof discoverability on the secondary surface copy", () => {
    expect(launchSurfaceSource).toContain("次级发现入口");
    expect(launchSurfaceSource).toContain("editor/publish → launch/classroom →");
    expect(launchSurfaceSource).not.toContain("proof dashboard");
  });
});
