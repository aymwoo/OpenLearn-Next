import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("src/db/schema.ts", "utf8");

describe("Phase 04 learning persistence schema", () => {
  it("exports progress, task attempt, quiz attempt, and feedback tables", () => {
    expect(schema).toContain("export const lessonStepProgress = sqliteTable");
    expect(schema).toContain("export const taskSubmissions = sqliteTable");
    expect(schema).toContain("export const quizAttempts = sqliteTable");
    expect(schema).toContain("export const attemptFeedback = sqliteTable");
  });

  it("keeps attempts append-only with latest and history indexes", () => {
    expect(schema).toContain("attemptNo");
    expect(schema).toContain("isLatest");
    expect(schema).toContain("taskSubmissions_latest_idx");
    expect(schema).toContain("taskSubmissions_history_idx");
    expect(schema).toContain("quizAttempts_latest_idx");
    expect(schema).toContain("quizAttempts_history_idx");
  });

  it("uses cascade ownership for every learning relation", () => {
    const learningSection = schema.slice(schema.indexOf("export const lessonStepProgress"));

    expect(learningSection.match(/onDelete: "cascade"/g)?.length ?? 0).toBeGreaterThanOrEqual(10);
  });
});
