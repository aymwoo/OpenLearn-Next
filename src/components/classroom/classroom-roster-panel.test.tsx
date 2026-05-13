// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ClassroomControlPanel } from "./classroom-control-panel";
import { ClassroomRosterPanel } from "./classroom-roster-panel";
import type { ClassroomSnapshotDTO } from "@/lib/dto/classroom";

const refreshMock = vi.fn();
const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
  usePathname: () => "/classroom",
  useSearchParams: () => new URLSearchParams("sessionId=session-1"),
}));

vi.mock("@/actions/classroom-actions", () => ({
  changeClassroomModeAction: vi.fn(),
  changeClassroomSlideAction: vi.fn(),
  changeClassroomStepAction: vi.fn(),
  endClassroomSessionAction: vi.fn(),
}));

vi.mock("./classroom-conflict-panel", () => ({
  ClassroomConflictPanel: () => <div>冲突面板</div>,
}));

vi.mock("./classroom-timeline-panel", () => ({
  ClassroomTimelinePanel: () => <div>课堂时间线</div>,
}));

vi.mock("@/components/markdown/markdown-renderer", () => ({
  MarkdownRenderer: () => <div>markdown</div>,
}));

const participants: ClassroomSnapshotDTO["participants"] = [
  {
    studentId: "student-1",
    studentName: "李雷",
    connectionState: "connected",
    currentStepId: "step-2",
    lastSeenAt: "2026-05-12T10:03:00.000Z",
    progressLabel: "跟随当前环节",
    submissionCount: 2,
    needsAttention: false,
    attentionReasons: [],
  },
  {
    studentId: "student-2",
    studentName: "韩梅梅",
    connectionState: "offline",
    currentStepId: "step-1",
    lastSeenAt: "2026-05-12T10:01:00.000Z",
    progressLabel: "落后于当前环节",
    submissionCount: 0,
    needsAttention: true,
    attentionReasons: ["当前离线", "落后于当前环节", "当前环节未提交"],
  },
];

const snapshot: ClassroomSnapshotDTO = {
  sessionId: "session-1",
  lessonId: "lesson-1",
  publishedVersionId: "pub-1",
  classId: "class-1",
  className: "一班",
  teacherId: "teacher-1",
  lessonTitle: "古诗导读",
  activeStepId: "step-2",
  locked: false,
  status: "live",
  version: 3,
  updatedAt: "2026-05-12T10:05:00.000Z",
  participants,
  monitoringSummary: {
    connectedCount: 1,
    reconnectingCount: 0,
    offlineCount: 1,
    needsAttentionCount: 1,
    submittedCount: 1,
  },
  steps: [
    { id: "step-1", title: "开场导入", rank: "a0", type: "content", payload: { type: "content", title: "开场导入", body: "导入" } },
    { id: "step-2", title: "随堂测验", rank: "b0", type: "quiz", payload: { type: "quiz", question: "问题", options: [{ id: "a", text: "A" }], correctOptionId: "a" } },
  ],
  slideState: null,
  teacherTimeline: [],
  copy: {
    staleRefreshRequired: "课堂状态已经被更新。请先恢复最新状态，再继续操作。",
    pendingAction: "当前控课面板可能不是最新。已为你保留本次操作，请刷新课堂快照后确认。",
    reconnecting: "正在重新连接课堂，会先显示最近一次课堂状态。",
    restored: "已恢复课堂状态，你现在看到的是最新步骤。",
  },
};

describe("ClassroomRosterPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows monitoring cards and attention-first participant signals", () => {
    render(
      <ClassroomRosterPanel
        participants={participants}
        monitoringSummary={snapshot.monitoringSummary}
      />,
    );

    expect(screen.getByText("课堂名册、进度与课堂回应概览")).toBeTruthy();
    expect(screen.getByText("已提交")).toBeTruthy();
    expect(screen.getAllByText("需要关注").length).toBeGreaterThan(0);
    expect(screen.getByText("状态稳定")).toBeTruthy();
    expect(screen.getByText("跟随当前环节")).toBeTruthy();
    expect(screen.getAllByText("落后于当前环节").length).toBeGreaterThan(0);
    expect(screen.getByText("2 次回应")).toBeTruthy();
    expect(screen.getByText("0 次回应")).toBeTruthy();
    expect(screen.getByText("当前离线")).toBeTruthy();
    expect(screen.getByText("当前环节未提交")).toBeTruthy();
  });

  it("updates classroom control copy toward roster monitoring triage", () => {
    render(<ClassroomControlPanel initialSnapshot={snapshot} />);

    expect(screen.queryByText("课堂活跃度")).toBeNull();
    expect(screen.getByText("名册监控")).toBeTruthy();
    expect(screen.getByText(/优先关注 1 名/)).toBeTruthy();
  });

  it("adds a same-route entry action for opening student detail state", () => {
    render(
      <ClassroomRosterPanel
        participants={participants}
        monitoringSummary={snapshot.monitoringSummary}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: '查看证据与评价' })[0]!);

    expect(pushMock).toHaveBeenCalledWith('/classroom?sessionId=session-1&studentId=student-1&detailTab=evidence');
  });
});
