// @vitest-environment jsdom

import type { ComponentProps } from "react";

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LessonDraftReviewWorkspace } from "./lesson-draft-review-workspace";

type ReviewWorkspaceDraftReview = ComponentProps<typeof LessonDraftReviewWorkspace>["draftReview"];
type ReviewWorkspaceLesson = ComponentProps<typeof LessonDraftReviewWorkspace>["lesson"];
type ReviewWorkspaceOverview = ComponentProps<typeof LessonDraftReviewWorkspace>["overview"];

const asReviewDraft = (value: unknown) => value as ReviewWorkspaceDraftReview;
const asReviewLesson = (value: unknown) => value as ReviewWorkspaceLesson;
const asReviewOverview = (value: unknown) => value as ReviewWorkspaceOverview;

// ── Mock Server Actions ──
const { applyDraftLessonVersionAction, discardDraftLessonVersionAction } = vi.hoisted(() => ({
  applyDraftLessonVersionAction: vi.fn(),
  discardDraftLessonVersionAction: vi.fn(),
}));

vi.mock("@/actions/lesson-authoring-actions", () => ({
  applyDraftLessonVersionAction,
  discardDraftLessonVersionAction,
}));

// ── Mock next/navigation ──
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ── Helpers ──

function makeStep(index: number, type: "content" | "task" | "quiz" = "content") {
  const id = `step-${index}`;
  const payload =
    type === "content"
      ? ({ type: "content", title: `步骤 ${index}`, body: `内容 ${index}`, materialRefs: [] } as const)
      : type === "task"
        ? ({ type: "task", prompt: `任务 ${index}`, submissionType: "text" as const, materialRefs: [] } as const)
        : ({ type: "quiz", question: `问题 ${index}`, options: ["A", "B"], materialRefs: [] } as const);

  return {
    id,
    lessonId: "lesson-1",
    type,
    title: `步骤 ${index}`,
    rank: String.fromCharCode(65 + index),
    payload: payload as unknown as NonNullable<ReviewWorkspaceDraftReview>["draftSteps"][number]["payload"],
    teachingDesignStatus: "explicit" as const,
    needsTeachingDesignRefinement: false,
    teachingDesignFallbackReason: null,
    archivedAt: null,
    updatedAt: "2026-05-01T00:00:00.000Z",
  };
}

function makeDraftReview(overrides: Partial<ReviewWorkspaceDraftReview> = {}): ReviewWorkspaceDraftReview {
  const liveSteps = [makeStep(0), makeStep(1, "task")];
  const draftSteps = [makeStep(0), makeStep(2, "quiz")]; // step 0: modified, step 2: new

  return asReviewDraft({
    lesson: { id: "lesson-1", courseId: "course-1", title: "测试课时", objective: "", status: "draft", revision: 0, stepCount: 0, publishedVersionId: null, updatedAt: "2026-05-01T00:00:00.000Z" },
    liveSteps,
    draftSteps,
    draftMeta: { draftVersionId: "dv-1", version: 1, source: "ai", status: "pending", createdAt: "2026-05-01T00:00:00.000Z", stepCount: 2 },
    diffRows: [
      { index: 0, state: "modified", liveStep: liveSteps[0] as NonNullable<ReviewWorkspaceDraftReview>["diffRows"][number]["liveStep"], draftStep: draftSteps[0] as NonNullable<ReviewWorkspaceDraftReview>["diffRows"][number]["draftStep"] },
      { index: 1, state: "deleted", liveStep: liveSteps[1] as NonNullable<ReviewWorkspaceDraftReview>["diffRows"][number]["liveStep"], draftStep: null },
      { index: 2, state: "new", liveStep: null, draftStep: draftSteps[1] as NonNullable<ReviewWorkspaceDraftReview>["diffRows"][number]["draftStep"] },
    ],
    hasPendingDraft: true,
    ...overrides,
  });
}

function makeDefaultProps() {
  return {
    draftReview: makeDraftReview(),
    lesson: asReviewLesson({
      lesson: { id: "lesson-1", courseId: "course-1", title: "测试课时", objective: "", status: "draft", revision: 0, stepCount: 0, publishedVersionId: null, updatedAt: "2026-05-01T00:00:00.000Z" },
      course: { id: "course-1", schoolId: "school-1", ownerId: "teacher-1", title: "测试课程", subject: "数学", grade: "G7", status: "active", lessonCount: 1, classLabels: [], enrollmentCount: 0, updatedAt: "2026-05-01T00:00:00.000Z" },
      classes: [],
      steps: [],
      materials: [],
      preparationSummary: { activeStepCount: 0, totalEstimatedMinutes: 0, materialCueCount: 0, evidenceReadyStepCount: 0, launchHref: "", blockingIssues: [], attentionIssues: [], advisoryIssues: [] },
      publishState: { isDraftHidden: false, latestVersion: null, publishedAt: null, canPublish: true, blockingIssues: [], warnings: [] },
    }),
    overview: asReviewOverview({ courses: [{ id: "course-1", schoolId: "school-1", ownerId: "teacher-1", title: "测试课程", subject: "数学", grade: "G7", status: "active", lessonCount: 1, classLabels: [], enrollmentCount: 0, updatedAt: "2026-05-01T00:00:00.000Z" }], classes: [], lessons: [{ id: "lesson-1", courseId: "course-1", title: "测试课时", objective: "", status: "draft", revision: 0, stepCount: 0, publishedVersionId: null, updatedAt: "2026-05-01T00:00:00.000Z" }] }),
  };
}

// ── Tests ──

describe("LessonDraftReviewWorkspace", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    applyDraftLessonVersionAction.mockResolvedValue({ ok: true, data: {} });
    discardDraftLessonVersionAction.mockResolvedValue({ ok: true, data: {} });
  });

  // ─────────────────────────────────────────────────

  it("1. renders diff rows with correct state badges", () => {
    render(<LessonDraftReviewWorkspace {...makeDefaultProps()} />);

    expect(screen.getByText("修改")).toBeTruthy();
    expect(screen.getByText("删除")).toBeTruthy();
    expect(screen.getByText("新增")).toBeTruthy();

    // Action bar renders
    expect(screen.getByText("审校 AI 课时草稿")).toBeTruthy();
    expect(screen.getByText("接受全部草稿")).toBeTruthy();
  });

  // ─────────────────────────────────────────────────

  it("2. accepts a step locally — badge changes to 已选用", () => {
    render(<LessonDraftReviewWorkspace {...makeDefaultProps()} />);

    const acceptButtons = screen.getAllByText("接受此步");
    expect(acceptButtons.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(acceptButtons[0]);

    expect(screen.getAllByText("已选用").length).toBeGreaterThanOrEqual(1);
  });

  // ─────────────────────────────────────────────────

  it("3. discards a step locally — card mutes with 已舍弃", () => {
    render(<LessonDraftReviewWorkspace {...makeDefaultProps()} />);

    const discardButtons = screen.getAllByText("丢弃此步");
    expect(discardButtons.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(discardButtons[0]);

    expect(screen.getByText("已舍弃")).toBeTruthy();
    // Undo affordance appears
    expect(screen.getByText("撤销")).toBeTruthy();
  });

  // ─────────────────────────────────────────────────

  it("4. opens edit panel on step card click", () => {
    render(<LessonDraftReviewWorkspace {...makeDefaultProps()} />);

    // Click on a step card (first modified step card, not buttons)
    const stepCards = screen.getAllByRole("button").filter(
      (el) => el.textContent?.includes("步骤") && !el.closest("[data-action]"),
    );
    if (stepCards.length > 0) {
      fireEvent.click(stepCards[0]);
      expect(screen.getByText("步骤类型（不可修改）")).toBeTruthy();
    }
  });

  // ─────────────────────────────────────────────────

  it("5. edit panel shows step type as read-only — no editable type field", () => {
    render(<LessonDraftReviewWorkspace {...makeDefaultProps()} />);

    // Find and click a step card to open the panel
    const stepTitleEls = screen.getAllByText(/^步骤 \d$/);
    if (stepTitleEls.length > 0) {
      // Click the parent card button
      const card = stepTitleEls[0].closest("button");
      if (card) fireEvent.click(card);
    }

    // Type is shown as read-only badge
    expect(screen.getByText("步骤类型（不可修改）")).toBeTruthy();
    // No editable type input — the panel only has title, description, content fields
    expect(screen.getByLabelText("标题")).toBeTruthy();
    expect(screen.getByLabelText("描述")).toBeTruthy();
    expect(screen.getByLabelText("内容 (Markdown)")).toBeTruthy();
  });

  // ─────────────────────────────────────────────────

  it("6. shows overwrite confirmation when active steps exist on accept all", () => {
    const props = makeDefaultProps();
    // Give the lesson existing active steps
    props.lesson = asReviewLesson({
      ...props.lesson!,
      steps: [
        { ...makeStep(0), archivedAt: null } as NonNullable<ReviewWorkspaceLesson>["steps"][number],
      ],
    });

    render(<LessonDraftReviewWorkspace {...props} />);

    fireEvent.click(screen.getByText("接受全部草稿"));

    expect(screen.getByText("接受全部草稿？")).toBeTruthy();
    expect(
      screen.getByText(/覆盖当前课时步骤/),
    ).toBeTruthy();
  });

  // ─────────────────────────────────────────────────

  it("7. shows discard confirmation dialog", () => {
    render(<LessonDraftReviewWorkspace {...makeDefaultProps()} />);

    fireEvent.click(screen.getByText("丢弃草稿"));

    expect(screen.getByText("丢弃草稿？")).toBeTruthy();
    expect(
      screen.getByText(/不会修改当前课时/),
    ).toBeTruthy();
  });

  // ─────────────────────────────────────────────────

  it("8. shows unsaved-changes warning when returning to edit with local edits", () => {
    render(<LessonDraftReviewWorkspace {...makeDefaultProps()} />);

    // First accept a step to create local state
    const acceptButtons = screen.getAllByText("接受此步");
    if (acceptButtons.length > 0) {
      fireEvent.click(acceptButtons[0]);
    }

    // Try to return to edit
    fireEvent.click(screen.getByText("返回编辑"));

    // Should show confirmation
    expect(screen.getByText("返回编辑？")).toBeTruthy();
    expect(
      screen.getByText(/清除本次未应用的草稿编辑/),
    ).toBeTruthy();
  });

  // ─────────────────────────────────────────────────

  it("9. shows empty state when hasPendingDraft is false", () => {
    const props = makeDefaultProps();
    props.draftReview = makeDraftReview({ hasPendingDraft: false });

    render(<LessonDraftReviewWorkspace {...props} />);

    expect(screen.getByText("当前没有待审校的 AI 草稿")).toBeTruthy();
    expect(
      screen.getByText(/先让 LessonAgent 生成草稿/),
    ).toBeTruthy();
  });
});
