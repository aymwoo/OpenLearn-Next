import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";

const composerSource = readFileSync("src/components/learning/feedback-composer.tsx", "utf8");

describe("Phase 04 feedback composer", () => {
  it("is a client component wired to the feedback action with 200 character limit", () => {
    expect(composerSource.startsWith('"use client";')).toBe(true);
    expect(composerSource).toContain("sendAttemptFeedbackAction");
    expect(composerSource).toContain("maxLength={200}");
  });

  it("uses required teacher copy and preserves failed input", () => {
    for (const copy of [
      "给学生的简短反馈",
      "最多 200 字，聚焦下一步改进",
      "发送反馈",
      "反馈已发送给学生",
      "反馈暂时没有发送成功，请保留内容后重试。",
    ]) {
      expect(composerSource).toContain(copy);
    }

    expect(composerSource).toContain("setBody(\"\")");
  });

  it("shows latest feedback only without edit history wording", () => {
    expect(composerSource).toContain("latestFeedback");
    expect(composerSource).not.toContain("history");
    expect(composerSource).not.toContain("edit history");
  });
});
