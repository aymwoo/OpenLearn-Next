import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { asyncTaskRegistry } from "@/features/async-tasks/server/registry";

const overviewPageSource = readFileSync(
  "src/app/settings/labs/async-tasks/page.tsx",
  "utf8",
);
const detailPageSource = readFileSync(
  "src/app/settings/labs/async-tasks/[taskId]/page.tsx",
  "utf8",
);
const overviewSurfaceSource = readFileSync(
  "src/components/surfaces/async-task-operator-surface.tsx",
  "utf8",
);
const detailSurfaceSource = readFileSync(
  "src/components/surfaces/async-task-operator-detail-surface.tsx",
  "utf8",
);
const retryActionSource = readFileSync(
  "src/components/surfaces/async-task-operator-retry-action.tsx",
  "utf8",
);
const settingsSource = readFileSync(
  "src/components/surfaces/settings-surface.tsx",
  "utf8",
);

describe("async task operator surfaces", () => {
  it("exposes a dedicated Settings Labs route pair that only composes DAL output", () => {
    expect(overviewPageSource).toContain("getAsyncTaskOperatorOverviewDTO");
    expect(overviewPageSource).toContain("AsyncTaskOperatorSurface");
    expect(overviewPageSource).not.toContain("@/db");
    expect(overviewPageSource).not.toContain("bullmq");

    expect(detailPageSource).toContain("getAsyncTaskOperatorDetailDTO");
    expect(detailPageSource).toContain("AsyncTaskOperatorDetailSurface");
    expect(detailPageSource).not.toContain("@/db");
    expect(detailPageSource).not.toContain("bullmq");
  });

  it("adds the async operator quick link to settings labs navigation", () => {
    expect(settingsSource).toContain("/settings/labs/async-tasks");
    expect(settingsSource).toContain("worker、queue、backlog、问题任务");
  });

  it("keeps the overview surface platform-health first and problem-task cards second", () => {
    expect(overviewSurfaceSource).toContain("先判断平台是否健康，再进入问题任务");
    expect(overviewSurfaceSource).toContain("backlog posture");
    expect(overviewSurfaceSource).toContain("问题任务");
    expect(overviewSurfaceSource).toContain("不是 table-heavy 布局");
    expect(overviewSurfaceSource).toContain("查看任务详情");
  });

  it("keeps the detail surface summary-first before attempts and timeline", () => {
    expect(detailSurfaceSource).toContain("先看当前状态、进度和恢复姿态，再看 attempts 与 timeline");
    expect(detailSurfaceSource).toContain("Latest Error");
    expect(detailSurfaceSource).toContain("Retry Eligibility");
    expect(detailSurfaceSource).toContain("AsyncTaskOperatorRetryAction");
    expect(retryActionSource).toContain("useRouter");
    expect(retryActionSource).toContain("router.refresh()");
    expect(detailSurfaceSource).toContain("attempt groups");
    expect(detailSurfaceSource).toContain("audit timeline");
  });

  it("keeps phase43 workload families consumable by the existing operator surface vocabulary", () => {
    const taskTypes = [
      "schedule.reminder_delivery",
      "classroom.session_summary",
      "resource.knowledge_source_ingest",
    ] as const;

    for (const taskType of taskTypes) {
      expect(asyncTaskRegistry[taskType].visibilityScope).toBe("school_operator");
      expect(asyncTaskRegistry[taskType].labelKey).toContain("asyncTasks.");
      expect(asyncTaskRegistry[taskType].summaryKey).toContain("asyncTasks.");
    }

    expect(detailSurfaceSource).toContain("Retry Eligibility");
    expect(detailSurfaceSource).toContain("AsyncTaskOperatorRetryAction");
    expect(retryActionSource).toContain("重试此任务");
    expect(retryActionSource).toContain("当前任务暂时不能重试");
  });
});
