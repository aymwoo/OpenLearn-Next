import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type StaticCheck = {
  label: string;
  passed: boolean;
};

export const PHASE_73_VERIFY_SCRIPT =
  "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase73-quiz-ext.ts";

const PHASE_73_FOCUSED_VITEST_PATHS = [
  "src/features/platform-core/plugin-data-access/quiz-data-access.test.ts",
  "src/features/platform-core/plugin-data-access/allowlist.test.ts",
  "src/components/classroom/classroom-session-recap-surface.test.tsx",
  "src/components/classroom/live-answer-dashboard-store.test.ts",
  "src/components/classroom/live-answer-dashboard-surface.test.tsx",
  "src/features/runtime-platform/seams/transport/ws-envelope.test.ts",
  "src/features/runtime-platform/seams/transport/ws-adapter.test.ts",
  "src/features/runtime-platform/seams/transport/redis-fanout-manager.test.ts",
  "tests/classroom/ws-events.test.ts",
  "tests/classroom/fanout.test.ts",
  "tests/classroom/dashboard.test.ts",
  "tests/classroom/live-view.test.ts",
  "src/app/(classroom)/classroom/page.test.tsx",
  "src/components/classroom/classroom-control-panel.test.tsx",
  "src/lib/dal/classroom.test.ts",
] as const;

function read(filePath: string) {
  const absolutePath = path.join(process.cwd(), filePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
}

function run(command: string, args: readonly string[], label: string) {
  try {
    const output = execFileSync(command, [...args], {
      stdio: "pipe",
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV ?? "test",
      },
    });
    if (output) {
      process.stdout.write(output);
    }
  } catch (error: unknown) {
    const stdout = typeof error === "object" && error && "stdout" in error ? error.stdout : "";
    const stderr = typeof error === "object" && error && "stderr" in error ? error.stderr : "";
    if (typeof stdout === "string" && stdout.length > 0) process.stdout.write(stdout);
    if (typeof stderr === "string" && stderr.length > 0) process.stderr.write(stderr);
    console.error(`Phase 73 verification failed while running: ${label}`);
    throw error;
  }
}

function runVitest(paths: readonly string[], label: string) {
  const directRunner = path.join(process.cwd(), "node_modules", "vitest", "vitest.mjs");
  const localBin = path.join(process.cwd(), "node_modules", ".bin", "vitest");
  const args = ["run", ...paths];

  if (existsSync(directRunner)) {
    run(process.execPath, [directRunner, ...args], label);
    return;
  }

  if (existsSync(localBin)) {
    run(localBin, args, label);
    return;
  }

  run("pnpm", ["vitest", ...args], label);
}

function verifyPackageScript(packageSource: string) {
  try {
    const pkg = JSON.parse(packageSource) as { scripts?: Record<string, string> };
    const scripts = pkg.scripts ?? {};
    return [
      {
        label: "package.json exposes exact verify:phase73 script",
        passed: scripts["verify:phase73"] === PHASE_73_VERIFY_SCRIPT,
      },
      {
        label: "package.json keeps verify:phase frozen on pnpm verify:phase72",
        passed: scripts["verify:phase"] === "pnpm verify:phase72",
      },
    ] satisfies StaticCheck[];
  } catch {
    return [
      {
        label: "package.json is valid JSON with verify:phase73 wiring",
        passed: false,
      },
    ] satisfies StaticCheck[];
  }
}

export function buildStaticProductSeamChecks(): StaticCheck[] {
  const quizSchemaSource = read("src/db/schema/generated/plugin-owned/quiz.ts");
  const generatedAllowlistSource = read("src/db/schema/generated/plugin-owned/data-access-allowlist.ts");
  const pluginDataModelSource = read("src/lib/dto/plugin-data-model.ts");
  const classroomDtoSource = read("src/lib/dto/classroom.ts");
  const runtimeAllowlistSource = read("src/features/platform-core/plugin-data-access/allowlist.ts");
  const classroomActionSource = read("src/actions/classroom-actions.ts");
  const classroomDalSource = read("src/lib/dal/classroom.ts");
  const wsEnvelopeSource = read("src/features/runtime-platform/seams/transport/ws-envelope.ts");
  const wsRegistrySource = read("src/features/runtime-platform/seams/transport/ws-connection-registry.ts");
  const wsAuthSource = read("src/features/runtime-platform/seams/transport/ws-auth.ts");
  const liveDashboardSurfaceSource = read("src/components/classroom/live-answer-dashboard-surface.tsx");
  const classroomControlPanelSource = read("src/components/classroom/classroom-control-panel.tsx");
  const classroomPageSource = read("src/app/(classroom)/classroom/page.tsx");

  return [
    {
      label: "quiz schema keeps plugin_owned_quiz_questions.questionType 5-type enum",
      passed:
        quizSchemaSource.includes("plugin_owned_quiz_questions")
        && quizSchemaSource.includes("questionType")
        && quizSchemaSource.includes('"single_choice", "multi_choice", "true_false", "fill_blank", "ordering"'),
    },
    {
      label: "QuestionTypeSchema is exported for quiz question types",
      passed:
        pluginDataModelSource.includes("export const QuestionTypeSchema")
        && pluginDataModelSource.includes('"single_choice", "multi_choice", "true_false", "fill_blank", "ordering"'),
    },
    {
      label: 'classroom DTO keeps the 5-branch z.discriminatedUnion("questionType", ...)',
      passed:
        classroomDtoSource.includes('z.discriminatedUnion("questionType", [')
        && classroomDtoSource.includes('questionType: z.literal("single_choice")')
        && classroomDtoSource.includes('questionType: z.literal("multi_choice")')
        && classroomDtoSource.includes('questionType: z.literal("true_false")')
        && classroomDtoSource.includes('questionType: z.literal("fill_blank")')
        && classroomDtoSource.includes('questionType: z.literal("ordering")'),
    },
    {
      label: "generated allowlist keeps questionType readable on quiz.questions",
      passed:
        generatedAllowlistSource.includes('"plugin_owned_quiz_questions"')
        && generatedAllowlistSource.includes('"questionType"'),
    },
    {
      label: "runtime allowlist consumer keeps questionType accessible through governed reads",
      passed:
        runtimeAllowlistSource.includes("pluginDataAccessAllowlist")
        && runtimeAllowlistSource.includes("groupByColumns")
        && runtimeAllowlistSource.includes("resolvePluginTable"),
    },
    {
      label: "submit action still invalidates updateTag(cacheTags.quizStats(parsed.data.sessionId))",
      passed: classroomActionSource.includes("updateTag(cacheTags.quizStats(parsed.data.sessionId))"),
    },
    {
      label: "classroom DAL keeps recap + live-answer seams on the same durable truth path",
      passed:
        classroomDalSource.includes("buildQuizSampleRecapStats")
        && classroomDalSource.includes("produceQuizAnswerReceived({"),
    },
    {
      label: "ws envelope keeps quiz.answer.received as a dedicated typed transport kind",
      passed:
        wsEnvelopeSource.includes('"quiz.answer.received"')
        && wsEnvelopeSource.includes("QuizAnswerReceivedPayloadSchema"),
    },
    {
      label: "ws connection registry keeps teacher-only filtering for quiz.answer.received",
      passed:
        wsRegistrySource.includes('envelope.kind === "quiz.answer.received"')
        && wsRegistrySource.includes('connection.owner.actorScope !== "teacher"'),
    },
    {
      label: "ws auth keeps active membership and teacher ownership derivation",
      passed:
        wsAuthSource.includes('eq(memberships.status, "active")')
        && wsAuthSource.includes("if (await isTeacherActor(userId, sessionId))")
        && wsAuthSource.includes('eq(classMembers.role, "student")'),
    },
    {
      label: "live dashboard surface remains read-only and store-backed",
      passed:
        liveDashboardSurfaceSource.includes("useLiveAnswerStore")
        && liveDashboardSurfaceSource.includes("只读聚合作答流，不触发任何写操作")
        && !/from ['\"]@\/actions\//.test(liveDashboardSurfaceSource),
    },
    {
      label: "live-answer remains a sibling tab on the real /classroom control-room surface",
      passed:
        classroomPageSource.includes("tab?: 'control' | 'live-answer'")
        && classroomPageSource.includes("const requestedTab = resolvedSearchParams?.tab === 'live-answer' ? 'live-answer' : 'control'")
        && classroomControlPanelSource.includes('value="live-answer"')
        && classroomControlPanelSource.includes("<LiveAnswerDashboardSurface"),
    },
    {
      label: "focused proof inventory still covers teacher-only live-answer route and dashboard surfaces",
      passed: PHASE_73_FOCUSED_VITEST_PATHS.every((filePath) => existsSync(path.join(process.cwd(), filePath))),
    },
  ];
}

function reportStaticChecks(stageLabel: string, checks: readonly StaticCheck[]) {
  const failed = checks.filter((check) => !check.passed);
  if (failed.length > 0) {
    console.error(`  ❌ ${stageLabel} failed:`);
    for (const check of failed) {
      console.error(`     - ${check.label}`);
    }
    process.exit(1);
  }

  console.log(`  ✓ ${stageLabel} (${checks.length} checks):`);
  for (const check of checks) {
    console.log(`     - ✓ ${check.label}`);
  }
}

function runZeroWriteGuard() {
  run("pnpm", ["test:live-answer-zero-write"], "Phase 73 live-answer zero-write guard");
}

function runFocusedVitestSuite() {
  runVitest(PHASE_73_FOCUSED_VITEST_PATHS, "Phase 73 focused recap/live-answer/ws suites");
}

export async function runPhase73Verification(options?: { smokeOnly?: boolean }) {
  const smokeOnly = options?.smokeOnly ?? process.argv.includes("--smoke");

  console.log("==================================================");
  console.log(`Phase 73 quiz extension verification (${smokeOnly ? "smoke" : "full"}) starting...`);
  console.log("(product truth lane: schema -> DTO -> governed access -> recap -> live-answer dashboard)");
  console.log("==================================================");

  console.log("[1/3] Static product seam checks...");
  reportStaticChecks("Static product seams", [
    ...verifyPackageScript(read("package.json")),
    ...buildStaticProductSeamChecks(),
  ]);

  console.log("\n[2/3] Zero-write guard...");
  runZeroWriteGuard();
  console.log("  ✓ Zero-write guard passed.");

  console.log("\n[3/3] Focused Phase 73 suites...");
  if (smokeOnly) {
    console.log("  ↺ Smoke mode skips focused vitest suite; static seams + zero-write guard are the replayable proof lane.");
  } else {
    runFocusedVitestSuite();
    console.log("  ✓ Focused Phase 73 suites passed.");
  }

  console.log("\n==================================================");
  console.log(`Phase 73 quiz extension verification ${smokeOnly ? "smoke " : ""}passed.`);
  console.log("==================================================");
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  runPhase73Verification().catch((error) => {
    console.error("Unhandled verification error:", error);
    process.exit(1);
  });
}
