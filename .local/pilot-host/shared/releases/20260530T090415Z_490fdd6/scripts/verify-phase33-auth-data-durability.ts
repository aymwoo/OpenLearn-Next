import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type GuardLabel =
  | "auth drift"
  | "proxy drift"
  | "dal boundary drift"
  | "dto leakage drift"
  | "schema posture drift"
  | "classroom durability drift";

function read(filePath: string) {
  return existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
}

function includesAll(source: string, snippets: readonly string[]) {
  return snippets.every((snippet) => source.includes(snippet));
}

function fail(label: GuardLabel, message: string) {
  console.error(`Phase 33 ${label}: ${message}`);
}

function run(args: readonly string[], label: string) {
  const localBin = (name: string) => path.join(process.cwd(), "node_modules", ".bin", name);

  try {
    if (args[0]?.startsWith("verify:phase")) {
      const script = JSON.parse(packageSource).scripts?.[args[0]] as string | undefined;
      if (script?.startsWith("tsx ")) {
        execFileSync(localBin("tsx"), script.slice(4).split(" "), { stdio: "inherit" });
        return;
      }
    }

    if (args[0] === "exec" && args[1] === "vitest") {
      execFileSync(localBin("vitest"), [...args.slice(2)], { stdio: "inherit" });
      return;
    }

    execFileSync("pnpm", [...args], { stdio: "inherit" });
  } catch (error) {
    console.error(`Phase 33 verifier failed while running: ${label}`);
    throw error;
  }
}

const packageSource = read("package.json");
const authConfigSource = read("src/lib/auth/auth.config.ts");
const authSource = read("src/lib/auth/auth.ts");
const authActionsSource = read("src/actions/auth-actions.ts");
const authDalSource = read("src/lib/dal/auth.ts");
const proxySource = read("src/proxy.ts");
const classroomActionsSource = read("src/actions/classroom-actions.ts");
const learningActionsSource = read("src/actions/learning-actions.ts");
const classroomDalSource = read("src/lib/dal/classroom.ts");
const learningDalSource = read("src/lib/dal/learning.ts");
const classroomDtoSource = read("src/lib/dto/classroom.ts");
const learningDtoSource = read("src/lib/dto/learning.ts");
const schemaSource = read("src/db/schema.ts");

const protectedRouteFamilies = [
  "/teacher",
  "/student",
  "/classroom",
  "/admin",
  "/api/classroom",
] as const;
const proxyMatchers = [
  "/teacher/:path*",
  "/student/:path*",
  "/classroom/:path*",
  "/admin/:path*",
  "/api/classroom/:path*",
] as const;

const checks: Array<{ label: GuardLabel; passed: boolean; message: string }> = [
  {
    label: "auth drift",
    passed:
      includesAll(authSource, [
        "normalizeRoleIntent(credentials.roleIntent)",
        "eq(resolveLoginField(roleIntent), loginId)",
        "roles: activeRoles",
        "workspaceRole: roleIntent",
        "token.workspaceRole = user.workspaceRole",
        "session.user.workspaceRole",
      ]) &&
      includesAll(authActionsSource, [
        'roleIntent: WorkspaceRoleSchema.default("student")',
        "redirectTo: resolveWorkspaceEntry(parsed.data.roleIntent)",
      ]) &&
      includesAll(authDalSource, [
        "CurrentActorDTOSchema.safeParse",
        "activeMembershipRoles",
        "workspaceRoles",
        "schoolIds",
      ]),
    message:
      "credential role intent, session workspace role, or current actor scope drifted away from the phase 33 auth contract",
  },
  {
    label: "proxy drift",
    passed:
      protectedRouteFamilies.every((routeFamily) => authConfigSource.includes(`\"${routeFamily}\"`)) &&
      proxyMatchers.every((matcher) => proxySource.includes(`\"${matcher}\"`)) &&
      includesAll(authConfigSource, [
        "protectedRouteFamilies",
        "isProtectedRouteFamily",
        "isAuthorizedRouteAccess",
        "return isLoggedIn;",
      ]),
    message:
      "protected route families or proxy matchers drifted away from the unauthenticated gate contract for teacher, student, classroom, and admin entry",
  },
  {
    label: "dal boundary drift",
    passed:
      includesAll(classroomActionsSource, [
        'from "@/lib/dal/classroom"',
        "updateTag(cacheTags.classroom",
      ]) &&
      includesAll(learningActionsSource, [
        'from "@/lib/dal/learning"',
        "updateTag(cacheTags.teacherReview",
      ]) &&
      !classroomActionsSource.includes('from "@/db"') &&
      !learningActionsSource.includes('from "@/db"') &&
      includesAll(learningDalSource, ["getCurrentActorDTO", "assertActiveStudent"]),
    message:
      "teacher or student mutation surfaces drifted away from DAL-owned scope enforcement and cache invalidation boundaries",
  },
  {
    label: "dto leakage drift",
    passed:
      includesAll(learningDtoSource, [
        "TaskAttemptPayloadDTOSchema",
        "payload: TaskAttemptPayloadDTOSchema",
      ]) &&
      includesAll(classroomDtoSource, [
        "ClassroomEvidencePayloadDTOSchema",
        "payload: ClassroomEvidencePayloadDTOSchema",
      ]) &&
      includesAll(classroomDalSource, [
        "toClassroomEvidencePayloadDTO",
        "payload: toClassroomEvidencePayloadDTO(evidence.payloadJson)",
      ]),
    message:
      "learning or classroom DTO payloads drifted back toward raw payload leakage instead of explicit phase 33 DTO shapes",
  },
  {
    label: "schema posture drift",
    passed: includesAll(schemaSource, [
      'references(() => users.id, { onDelete: "cascade" })',
      'uniqueIndex("lessonStepProgress_identity_unique")',
      'index("taskSubmissions_latest_idx")',
      'index("classroomSessions_lesson_class_status_idx")',
      'index("classroomEvents_session_version_idx")',
      'index("classroomEvidence_session_created_idx")',
      'index("classroomTimeline_session_created_idx")',
    ]),
    message:
      "sqlite cascade or index posture for progress, submissions, classroom events, evidence, or timeline truth no longer matches the phase 33 durability baseline",
  },
  {
    label: "classroom durability drift",
    passed:
      includesAll(classroomDalSource, [
        "publishClassroomTransportEvent",
        "truthPersisted: true",
        "runtimeSessionId",
        "proofSummary",
        "runtimeBridge: true",
        "createClassroomTimelineEntry",
      ]) &&
      includesAll(classroomActionsSource, [
        "cacheTags.classroom(parsed.data.payload.classroomSessionId)",
        "cacheTags.progress(result.lessonId, result.actorId)",
        "cacheTags.submission(result.lessonId, result.actorId)",
      ]),
    message:
      "runtime-backed classroom proof, cache invalidation, or timeline durability drifted away from the persisted classroom truth contract",
  },
];

console.log("Phase 33 milestone prerequisite: verify phase 27-32 runtime foundations remain intact");
run(["verify:phase32"], "phase 32 milestone prerequisite");

console.log("Phase 33 closure contracts: verify auth, proxy, DAL, DTO, schema, and classroom durability guards");
const failed = checks.filter((check) => !check.passed);

if (failed.length > 0) {
  for (const check of failed) {
    fail(check.label, check.message);
  }
  process.exit(1);
}

console.log(
  "Phase 33 closure guards passed: auth entry, protected route families, DAL boundaries, DTO payload shaping, schema posture, and classroom durability remain intact",
);
console.log(
  "Phase 33 scope note: this gate builds on phase 27-32 runtime foundations and does not claim PostgreSQL, Redis, WebSocket, or multi-runtime expansion.",
);

run(
  [
    "exec",
    "vitest",
    "--run",
    "src/lib/auth/auth.test.ts",
    "src/lib/auth/auth.config.test.ts",
    "src/actions/auth-actions.test.ts",
    "src/lib/dal/learning.test.ts",
    "src/actions/learning-actions.test.ts",
    "src/lib/dal/classroom.test.ts",
    "src/lib/dal/course-authoring.test.ts",
    "src/actions/classroom-actions.test.ts",
  ],
  "phase 33 focused closure suites",
);

console.log(
  "Phase 33 verification passed: runtime foundations stay green and the auth/data/classroom durability closure gate is intact",
);
