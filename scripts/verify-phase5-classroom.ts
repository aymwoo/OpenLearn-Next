import { existsSync, readFileSync } from "node:fs";

type Check = {
  label: string;
  passed: boolean;
};

function read(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function withoutLineComments(source: string) {
  return source
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

function nonCommentSourceIncludes(source: string, token: string) {
  return withoutLineComments(source).includes(token);
}

function functionBody(source: string, name: string) {
  const start = source.indexOf(`function ${name}`);

  if (start === -1) {
    return "";
  }

  const bodyStart = source.indexOf("{\n", start);
  let depth = 0;

  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];

    if (char === "{") {
      depth += 1;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return source.slice(bodyStart, index + 1);
      }
    }
  }

  return "";
}

function noForbiddenEdgeImports(source: string) {
  const filtered = withoutLineComments(source);

  return !/from\s+["'](@\/db|@\/db\/schema|drizzle-orm|@\/lib\/dal|@\/auth)/.test(filtered);
}

function noDeferredScopeTokens(source: string) {
  const filtered = withoutLineComments(source);

  return [
    /multi-class merged/i,
    /WebSocket/i,
    /gradebook/i,
    /AI classroom control/i,
    /notification center/i,
    /ad hoc student/i,
  ].every((pattern) => !pattern.test(filtered));
}

const schema = read("src/db/schema.ts");
const classroomDto = read("src/lib/dto/classroom.ts");
const learningDto = read("src/lib/dto/learning.ts");
const classroomDal = read("src/lib/dal/classroom.ts");
const learningDal = read("src/lib/dal/learning.ts");
const classroomActions = read("src/actions/classroom-actions.ts");
const snapshotRoute = read("src/app/api/classroom/[sessionId]/snapshot/route.ts");
const eventsRoute = read("src/app/api/classroom/[sessionId]/events/route.ts");
const teacherSurface = read("src/components/surfaces/classroom-console-surface.tsx");
const launchPanel = read("src/components/classroom/classroom-launch-panel.tsx");
const controlPanel = read("src/components/classroom/classroom-control-panel.tsx");
const conflictPanel = read("src/components/classroom/classroom-conflict-panel.tsx");
const rosterPanel = read("src/components/classroom/classroom-roster-panel.tsx");
const playerSurface = read("src/components/surfaces/player-surface.tsx");
const playerRuntime = read("src/components/learning/classroom-runtime-client.tsx");
const studentPlayerPage = read("src/app/(student)/student/player/page.tsx");
const packageJson = read("package.json");

const teacherUiSources = [teacherSurface, launchPanel, controlPanel, conflictPanel, rosterPanel].join("\n");
const studentUiSources = [playerSurface, playerRuntime, studentPlayerPage].join("\n");
const allImplementationSources = [
  classroomDto,
  learningDto,
  classroomDal,
  learningDal,
  classroomActions,
  snapshotRoute,
  eventsRoute,
  teacherUiSources,
  studentUiSources,
].join("\n");
const cachedShellSource = functionBody(learningDal, "getPublishedStudentPlayerShellDTO");

const checks: Check[] = [
  { label: "D-01 schema exports classroomSessions", passed: schema.includes("export const classroomSessions = sqliteTable") },
  { label: "D-01 schema exports classroomParticipants", passed: schema.includes("export const classroomParticipants = sqliteTable") },
  { label: "D-01 schema exports classroomEvents", passed: schema.includes("export const classroomEvents = sqliteTable") },
  { label: "D-01 classroom tables use cascade deletes", passed: (schema.match(/onDelete: "cascade"/g)?.length ?? 0) >= 18 },
  { label: "D-02 session has active step, lock state, status, and version", passed: ["activeStepId", "locked", "status", "version"].every((token) => schema.includes(token)) },
  { label: "D-02 participant and event indexes exist", passed: ["classroomParticipants_session_student_unique", "classroomParticipants_session_idx", "classroomParticipants_student_idx", "classroomEvents_session_version_idx", "classroomEvents_session_created_idx"].every((token) => schema.includes(token)) },
  { label: "D-03 DTO exports classroom snapshot and action schemas", passed: ["ClassroomSnapshotDTOSchema", "ClassroomEventDTOSchema", "LaunchClassroomInputSchema", "ChangeClassroomStepInputSchema", "ChangeClassroomModeInputSchema", "ClassroomActionResultDTOSchema"].every((token) => classroomDto.includes(token)) },
  { label: "D-03 DTO contains conflict and reconnect copy", passed: ["课堂状态已经被更新。请先恢复最新状态，再继续操作。", "当前控课面板可能不是最新。已为你保留本次操作，请刷新课堂快照后确认。", "正在重新连接课堂，会先显示最近一次课堂状态。", "已恢复课堂状态，你现在看到的是最新步骤。"].every((copy) => classroomDto.includes(copy)) },
  { label: "D-04 DAL is server-only and teacher-scoped", passed: classroomDal.trimStart().startsWith('import "server-only";') && classroomDal.includes("assertActiveTeacher") },
  { label: "D-04 DAL authorizes participants for snapshots", passed: classroomDal.includes("getCurrentUserDTO") && classroomDal.includes("CLASSROOM_PARTICIPANT_REQUIRED") && classroomDal.includes("classroomParticipants.studentId") },
  { label: "D-04 DAL uses transactions for launch", passed: classroomDal.includes("db.transaction") && classroomDal.includes("tx.insert(classroomSessions)") && classroomDal.includes("tx.insert(classroomParticipants)") && classroomDal.includes("tx.insert(classroomEvents)") },
  { label: "D-09 DAL implements expectedVersion conflict handling", passed: classroomDal.includes("expectedVersion") && classroomDal.includes("VERSION_CONFLICT") && classroomDal.includes("eq(classroomSessions.version, payload.expectedVersion)") },
  { label: "D-10 DAL returns sanitized DTO parses", passed: classroomDal.includes("ClassroomSnapshotDTOSchema.parse") && classroomDal.includes("ClassroomActionResultDTOSchema.parse") },
  { label: "D-10 actions are Server Actions", passed: classroomActions.trimStart().startsWith('"use server";') },
  { label: "D-10 actions validate with safeParse", passed: (classroomActions.match(/safeParse/g)?.length ?? 0) >= 5 },
  { label: "D-10 actions invalidate classroom tag", passed: classroomActions.includes("updateTag(cacheTags.classroom") },
  { label: "D-11 snapshot route uses DAL snapshot, no-store, and no updateTag", passed: snapshotRoute.includes("getClassroomSnapshotDTO") && snapshotRoute.includes("no-store") && !snapshotRoute.includes("updateTag") },
  { label: "D-12 SSE route keeps no-store event stream without unsupported edge runtime export", passed: eventsRoute.includes("text/event-stream") && eventsRoute.includes("no-store") && !eventsRoute.includes('export const runtime = "edge"') },
  { label: "D-12 Edge SSE route emits event-stream snapshot and keepalive", passed: eventsRoute.includes("text/event-stream") && eventsRoute.includes("event: snapshot") && eventsRoute.includes("keepalive") },
  { label: "D-12 Edge SSE route validates payload", passed: eventsRoute.includes("ClassroomSnapshotDTOSchema.safeParse") || eventsRoute.includes("ClassroomSnapshotDTOSchema.parse") },
  { label: "D-12 Edge SSE route forwards Cookie header", passed: eventsRoute.includes('request.headers.get("cookie")') && eventsRoute.includes("Cookie: cookie") },
  { label: "D-12 Edge SSE route has no DB DAL Auth imports", passed: noForbiddenEdgeImports(eventsRoute) },
  { label: "D-12 Edge SSE route uses bounded polling", passed: eventsRoute.includes("CLASSROOM_SSE_POLL_INTERVAL_MS") && eventsRoute.includes("setInterval") && eventsRoute.includes("clearInterval") },
  { label: "D-05 current locked step remains interactive", passed: playerRuntime.includes("CurrentStepRenderer") && playerRuntime.includes("ContentStepCard") && playerRuntime.includes("TaskStepCard") && playerRuntime.includes("QuizStepCard") },
  { label: "D-06 locked non-current steps are disabled", passed: playerRuntime.includes("老师已开启锁定跟随，你将停留在当前步骤。") && playerRuntime.includes('aria-disabled="true"') && playerRuntime.includes("player.runtime.locked && !isCurrent") },
  { label: "D-07 unlocked mode keeps links and recommendation copy", passed: playerRuntime.includes("老师已开放自由浏览，你可以回看已开放步骤。") && playerRuntime.includes("teacherRecommendedStepId") && playerRuntime.includes("stepHref(player, step)") },
  { label: "D-08 forcedStepId takes priority over resumeStepId", passed: playerRuntime.includes("runtime.forcedStepId ?? personal.progress.resumeStepId") },
  { label: "D-13 reconnect keeps content visible and avoids route reconciliation", passed: playerRuntime.includes("正在重新连接课堂，会先显示最近一次课堂状态。") && !nonCommentSourceIncludes(playerRuntime, "router.replace") && !nonCommentSourceIncludes(playerRuntime, "router.push") && !nonCommentSourceIncludes(playerRuntime, "useRouter") },
  { label: "D-14 SSE confirms durable snapshot before applying", passed: playerRuntime.includes("new EventSource") && playerRuntime.includes("addEventListener('snapshot'") && playerRuntime.includes("fetchDurableSnapshot(sessionId)") && playerRuntime.includes("applySnapshot(durable, 'connected')") },
  { label: "D-14 EventSource cleans up", passed: playerRuntime.includes("return () =>") && playerRuntime.includes("source?.close()") },
  { label: "D-14 runtime wrapper updates forced, recommended, and currentStep together", passed: playerRuntime.includes("setRuntime") && playerRuntime.includes("forcedStepId") && playerRuntime.includes("teacherRecommendedStepId") && playerRuntime.includes("const currentStep") },
  { label: "D-15 late join restored copy is present", passed: learningDal.includes("已恢复课堂状态，你现在看到的是最新步骤。") && playerRuntime.includes("initialRuntime.snapshotStatusCopy") },
  { label: "D-16 manual snapshot fallback exists", passed: playerRuntime.includes("snapshot_fallback") && playerRuntime.includes("重新连接课堂") && playerRuntime.includes("handleManualRefresh") },
  {
    label: "student runtime wrapper owns rail and active content",
    passed:
      playerRuntime.includes("{player.shell.steps.map((step, index) => {") &&
      playerRuntime.includes("<StepActivityShell") &&
      playerRuntime.includes("player={player}") &&
      playerRuntime.includes("step={currentStep}"),
  },
  { label: "student runtime wrapper preserves draft card keys", passed: playerRuntime.includes("key={step.id}") && !/(key=\{[^}]*?(connectionState|classroomVersion|version|snapshot|retry)[^}]*?\})/.test(playerRuntime) },
  { label: "student UI announces live changes", passed: playerRuntime.includes('aria-live="polite"') },
  { label: "student UI uses 44px targets and constrained motion", passed: playerRuntime.includes("min-h-[44px]") && playerRuntime.includes("duration-150") },
  { label: "player route streams classroom live state under Suspense", passed: studentPlayerPage.includes("Suspense") && studentPlayerPage.includes("ClassroomRuntimeClient") && studentPlayerPage.includes("getStudentPlayerPersonalDTO") },
  { label: "cached player shell keeps cache boundary and no classroom runtime", passed: cachedShellSource.includes("'use cache'") && cachedShellSource.includes("cacheLife('hours')") && cachedShellSource.includes("cacheTag(cacheTags.lesson(input.lessonId))") && !cachedShellSource.includes("classroomSessions") && !cachedShellSource.includes("getClassroomSnapshotDTO") && !cachedShellSource.includes("getStudentClassroomRuntime") },
  {
    label: "teacher UI has launch and roster surfaces",
    passed:
      teacherUiSources.includes("ClassroomRosterPanel") &&
      teacherUiSources.includes("学生状态") &&
      teacherUiSources.includes("前往开启新课堂"),
  },
  { label: "teacher UI has conflict and refresh recovery", passed: teacherUiSources.includes("课堂状态已经被更新。请先恢复最新状态，再继续操作。") && teacherUiSources.includes("当前控课面板可能不是最新。已为你保留本次操作，请刷新课堂快照后确认。") && teacherUiSources.includes("刷新课堂快照") },
  {
    label: "teacher UI has required classroom mode copy",
    passed:
      teacherUiSources.includes("锁定跟随") &&
      teacherUiSources.includes("自由浏览") &&
      teacherUiSources.includes("同步当前步骤") &&
      teacherUiSources.includes("学生可回看已开放步骤"),
  },
  { label: "teacher UI uses 44px and 48px targets", passed: teacherUiSources.includes("min-h-[44px]") && teacherUiSources.includes("min-h-[52px]") && teacherUiSources.includes("min-h-[56px]") },
  { label: "teacher UI avoids divider-heavy styling", passed: !/divide-|border-b|border-t|border-l|border-r/.test(teacherUiSources) },
  { label: "deferred-scope tokens absent outside comments", passed: noDeferredScopeTokens(allImplementationSources) },
  { label: "package exposes verify:phase5", passed: packageJson.includes('"verify:phase5"') && packageJson.includes("tsx scripts/verify-phase5-classroom.ts") },
];

const failed = checks.filter((check) => !check.passed);

if (failed.length > 0) {
  console.error("Phase 5 classroom verification failed");
  for (const check of failed) {
    console.error(`- ${check.label}`);
  }
  process.exit(1);
}

console.log("Phase 5 classroom verification passed");
