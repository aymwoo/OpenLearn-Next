import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";

const reviewSource = readFileSync(
  "src/components/learning/teacher-review-surface.tsx",
  "utf8",
);

describe("Phase 04 teacher review cockpit", () => {
  it("renders the required lightweight filters and empty states", () => {
    for (const copy of ["全部", "未开始", "进行中", "已完成", "待反馈"]) {
      expect(reviewSource).toContain(copy);
    }

    expect(reviewSource).toContain("还没有提交学习证据");
    expect(reviewSource).toContain("暂无学生数据");
  });

  it("prioritizes progress, attempts, outcomes, feedback, and composer in student detail", () => {
    for (const copy of [
      "当前已完成",
      "最近任务",
      "测验结果",
      "历史尝试",
      "反馈状态",
      "第 1 次尝试",
    ]) {
      expect(reviewSource).toContain(copy);
    }

    expect(reviewSource).toContain("FeedbackComposer");
    expect(reviewSource).toContain("needs_feedback");
    expect(reviewSource).toContain("teacherSurfaceRhythm.card");
    expect(reviewSource).toContain("teacherSurfaceRhythm.cardInset");
  });

  it("does not introduce excluded review scope", () => {
    expect(reviewSource).not.toContain("gradebook");
    expect(reviewSource).not.toContain("rubric");
    expect(reviewSource).not.toContain("bulk");
  });
});
