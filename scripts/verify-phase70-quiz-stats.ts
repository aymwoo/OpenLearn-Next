import { readFileSync } from "node:fs";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function main() {
  const cacheSource = readFileSync("src/lib/cache-policy.ts", "utf8");
  const dtoSource = readFileSync("src/lib/dto/classroom.ts", "utf8");
  const dalSource = readFileSync("src/lib/dal/classroom.ts", "utf8");
  const actionSource = readFileSync("src/actions/classroom-actions.ts", "utf8");
  const recapSurfaceSource = readFileSync("src/components/classroom/classroom-session-recap-surface.tsx", "utf8");

  console.log("==================================================");
  console.log("Phase 70 close-gate verification starting...");
  console.log("==================================================");

  console.log("[1/5] quiz stats cache tag exists...");
  assert(cacheSource.includes("quizStats: (sessionId: string) => `quiz-stats:${sessionId}`"), "cacheTags.quizStats is missing or renamed");
  assert(actionSource.includes("updateTag(cacheTags.quizStats(parsed.data.sessionId))"), "submitQuizSampleAnswerAction must invalidate quizStats tag");
  console.log("  ✓ quizStats cache tag and invalidation are wired.");

  console.log("[2/5] recap DTO exposes quiz sample stats section...");
  assert(dtoSource.includes("export const ClassroomSessionRecapQuizStatsSectionDTOSchema = z.object({"), "quiz sample recap section schema missing");
  assert(dtoSource.includes("quizSampleStats: ClassroomSessionRecapQuizStatsSectionDTOSchema"), "ClassroomSessionRecapDTOSchema missing quizSampleStats section");
  console.log("  ✓ recap DTO contract exposes quiz sample stats.");

  console.log("[3/5] DAL uses plugin-owned latest-only aggregation...");
  assert(dalSource.includes("buildQuizSampleRecapStats"), "quiz sample recap aggregate helper missing");
  assert(dalSource.includes("pluginOwnedQuizQuestions"), "quiz sample recap must read frozen question snapshot rows");
  assert(dalSource.includes("pluginOwnedQuizResponses"), "quiz sample recap must read plugin-owned responses");
  assert(dalSource.includes("eq(pluginOwnedQuizResponses.isLatest, true)"), "quiz sample recap must restrict to latest responses");
  assert(dalSource.includes("countAgg()"), "quiz sample recap should aggregate with SQL count");
  console.log("  ✓ DAL seam reads plugin-owned latest-only truth.");

  console.log("[4/5] quiz stats stay out of durable summary artifact...");
  assert(!dtoSource.includes("ClassroomSessionSummaryArtifactSchema = z.object({\n  sessionId: z.string(),\n  lessonId: z.string(),\n  classId: z.string(),\n  lessonTitle: z.string(),\n  className: z.string(),\n  startedAt: z.string(),\n  endedAt: z.string().nullable(),\n  completionLabel: z.string(),\n  completionCount: z.number().int().nonnegative(),\n  totalStudents: z.number().int().nonnegative(),\n  submissionCount: z.number().int().nonnegative(),\n  evidenceCount: z.number().int().nonnegative(),\n  participationBuckets: z.object({\n    active: z.number().int().nonnegative(),\n    normal: z.number().int().nonnegative(),\n    attention: z.number().int().nonnegative(),\n    unevaluated: z.number().int().nonnegative(),\n  }),\n  quizSampleStats:"), "summary artifact must not persist quizSampleStats");
  assert(dalSource.includes("quizSampleStats: recap.quizSampleStats"), "ended-session recap DTO must include quizSampleStats");
  console.log("  ✓ quiz stats remain recap-only, not summary-artifact writeback.");

  console.log("[5/5] recap UI exposes question recap contract...");
  assert(recapSurfaceSource.includes("题目复盘"), "recap UI missing question recap section label");
  assert(recapSurfaceSource.includes("正确率按已作答人数计算；作答 / 未作答人数相对本次课堂参与者名单。"), "recap UI missing denominator helper copy");
  assert(recapSurfaceSource.includes("正确答案"), "recap UI missing correct-answer affordance");
  assert(recapSurfaceSource.includes("当前课堂没有 quiz sample 题目，或还没有可用于复盘的作答记录。"), "recap UI missing calm empty state copy");
  console.log("  ✓ recap UI surfaces quiz question stats and empty state.");

  console.log("==================================================");
  console.log("Phase 70 close-gate verification passed.");
  console.log("==================================================");
}

main();
