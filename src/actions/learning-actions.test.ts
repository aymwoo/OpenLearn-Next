import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync("src/actions/learning-actions.ts", "utf8");

describe("learning Server Actions", () => {
  it("validates all learning mutations before calling the DAL", () => {
    expect(source.trimStart().startsWith('"use server";')).toBe(true);
    expect(source).toContain("MarkProgressInputSchema.safeParse");
    expect(source).toContain("SubmitTaskInputSchema.safeParse");
    expect(source).toContain("SubmitQuizInputSchema.safeParse");
    expect(source).toContain("FeedbackInputSchema.safeParse");
  });

  it("updates progress, submission, and teacher review cache tags after successful writes", () => {
    expect(source).toContain("updateTag(cacheTags.progress");
    expect(source).toContain("updateTag(cacheTags.submission");
    expect(source).toContain("updateTag(cacheTags.teacherReview");
  });

  it("returns safe Chinese retry messages without direct database imports", () => {
    expect(source).toContain("输入内容不完整，请检查后重试。");
    expect(source).toContain("提交暂时失败，请保留当前内容后重试。");
    expect(source).toContain("提交已记录，进度稍后同步");
    expect(source).toContain("反馈最多 200 字，请修改后再发送。");
    expect(source).toContain("反馈暂时没有发送成功，请保留内容后重试。");
    expect(source).not.toContain("@/db");
  });
});
