import { describe, expect, it } from "vitest";

import { cacheTags } from "./cache-policy";

describe("Phase 04 cache tags", () => {
  it("keeps progress tags stable while adding submission and teacher review freshness", () => {
    expect(cacheTags.progress("lesson-1", "student-1")).toBe("progress:lesson-1:student-1");
    expect(cacheTags.submission("lesson-1", "student-1")).toBe("submission:lesson-1:student-1");
    expect(cacheTags.teacherReview("lesson-1")).toBe("teacher-review:lesson-1");
    expect(cacheTags.quizStats("session-1")).toBe("quiz-stats:session-1");
  });
});
