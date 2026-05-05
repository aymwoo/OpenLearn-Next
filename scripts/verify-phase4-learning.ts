import { existsSync, readFileSync } from "node:fs";

type Check = {
  label: string;
  passed: boolean;
};

function read(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function noDbImports(source: string) {
  return !/(from\s+["'](@\/db|@\/db\/schema|@\/db\/index|src\/db|src\/db\/schema)["'])/.test(source);
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

function noDeferredScopeTokens(source: string) {
  const filtered = withoutLineComments(source);

  return [
    /\bgradebook\b/i,
    /\brubric\b/i,
    /\bbulk\b/i,
    /\bEventSource\b/,
    /notification center/i,
  ].every((pattern) => !pattern.test(filtered));
}

const schema = read("src/db/schema.ts");
const dto = read("src/lib/dto/learning.ts");
const dal = read("src/lib/dal/learning.ts");
const actions = read("src/actions/learning-actions.ts");
const studentDashboard = read("src/components/surfaces/student-dashboard-surface.tsx");
const player = read("src/components/surfaces/player-surface.tsx");
const taskCard = read("src/components/learning/task-step-card.tsx");
const quizCard = read("src/components/learning/quiz-step-card.tsx");
const teacherReview = read("src/components/learning/teacher-review-surface.tsx");
const feedbackComposer = read("src/components/learning/feedback-composer.tsx");
const studentPage = read("src/app/(student)/student/page.tsx");
const playerPage = read("src/app/(student)/student/player/page.tsx");
const teacherReviewPage = read("src/app/(teacher)/teacher/review/page.tsx");
const packageJson = read("package.json");

const uiSources = [studentDashboard, player, taskCard, quizCard, teacherReview, feedbackComposer, studentPage, playerPage, teacherReviewPage].filter(Boolean);
const allSources = [schema, dto, dal, actions, ...uiSources].join("\n");
const cachedShellSource = functionBody(dal, "getPublishedStudentPlayerShellDTO");
const shellWrapperSource = functionBody(dal, "getStudentPlayerShellDTO");

const checks: Check[] = [
  { label: "schema contains lessonStepProgress", passed: schema.includes("export const lessonStepProgress = sqliteTable") },
  { label: "schema contains taskSubmissions", passed: schema.includes("export const taskSubmissions = sqliteTable") },
  { label: "schema contains quizAttempts", passed: schema.includes("export const quizAttempts = sqliteTable") },
  { label: "schema contains attemptFeedback", passed: schema.includes("export const attemptFeedback = sqliteTable") },
  { label: "schema contains taskSubmissions_latest_idx", passed: schema.includes("taskSubmissions_latest_idx") },
  { label: "schema contains taskSubmissions_history_idx", passed: schema.includes("taskSubmissions_history_idx") },
  { label: "schema contains quizAttempts_latest_idx", passed: schema.includes("quizAttempts_latest_idx") },
  { label: "schema contains quizAttempts_history_idx", passed: schema.includes("quizAttempts_history_idx") },
  { label: "schema contains attemptFeedback_target_idx", passed: schema.includes("attemptFeedback_target_idx") },
  { label: "schema contains cascade deletes", passed: (schema.match(/onDelete: "cascade"/g)?.length ?? 0) >= 12 },
  { label: "DTO contains StudentDashboardDTOSchema", passed: dto.includes("StudentDashboardDTOSchema") },
  { label: "DTO contains StudentPlayerDTOSchema", passed: dto.includes("StudentPlayerDTOSchema") },
  { label: "DTO contains split player shell schema", passed: dto.includes("StudentPlayerShellDTOSchema") },
  { label: "DTO contains split player personal schema", passed: dto.includes("StudentPlayerPersonalDTOSchema") },
  { label: "DTO contains task and quiz attempt schemas", passed: dto.includes("TaskAttemptDTOSchema") && dto.includes("QuizAttemptDTOSchema") },
  { label: "DTO contains TeacherLessonReviewDTOSchema", passed: dto.includes("TeacherLessonReviewDTOSchema") },
  { label: "DTO contains retry and reveal flags", passed: ["canRetryTask", "canRetryQuiz", "showCorrectAnswer"].every((token) => dto.includes(token)) },
  { label: "DTO caps feedback body", passed: dto.includes("body: z.string().min(1).max(200)") },
  { label: "DTO contains required Chinese copy", passed: ["课时暂不可学习", "已提交，本次尝试已记录", "老师还没有留下反馈"].every((copy) => dto.includes(copy)) },
  { label: "DAL is server-only", passed: dal ? dal.trimStart().startsWith('import "server-only";') : false },
  { label: "DAL reads published lesson snapshots", passed: dal.includes("publishedLessonVersions") && dal.includes("snapshotJson") },
  { label: "DAL exposes split student player loaders", passed: dal.includes("getStudentPlayerShellDTO") && dal.includes("getStudentPlayerPersonalDTO") },
  { label: "DAL caches only the player shell", passed: cachedShellSource.includes("'use cache'") && cachedShellSource.includes("cacheLife('hours')") && cachedShellSource.includes("cacheTag(cacheTags.lesson(input.lessonId))") && cachedShellSource.includes("cacheTag(cacheTags.steps(input.lessonId))") },
  { label: "cached player shell avoids request auth", passed: cachedShellSource.length > 0 && !cachedShellSource.includes("assertActiveStudent") && !cachedShellSource.includes("assertStudentCanAccessLesson") && !cachedShellSource.includes("getCurrentUserDTO") && !cachedShellSource.includes("getUserMembershipsDTO") && shellWrapperSource.includes("input.scope") },
  { label: "DAL uses transactions for append-only latest writes", passed: dal.includes("db.transaction") && dal.includes("insert(taskSubmissions)") && dal.includes("insert(quizAttempts)") },
  { label: "DAL clears previous latest markers", passed: dal.includes("isLatest: false") && dal.includes("isLatest: true") && dal.includes("isLatest: 0") && dal.includes("isLatest: 1") },
  { label: "DAL exposes teacher review and feedback", passed: dal.includes("getTeacherLessonReviewDTO") && dal.includes("saveAttemptFeedback") },
  { label: "actions are Server Actions", passed: actions.trimStart().startsWith('"use server";') },
  { label: "actions validate inputs with safeParse", passed: (actions.match(/safeParse/g)?.length ?? 0) >= 4 },
  { label: "actions update progress cache tag", passed: actions.includes("updateTag(cacheTags.progress") },
  { label: "actions update submission cache tag", passed: actions.includes("updateTag(cacheTags.submission") },
  { label: "actions update teacher review cache tag", passed: actions.includes("updateTag(cacheTags.teacherReview") },
  { label: "UI has no direct DB imports", passed: uiSources.length > 0 && uiSources.every(noDbImports) },
  { label: "student dashboard required copy", passed: studentDashboard.includes("继续学习") && studentDashboard.includes("还没有可学习的课时") },
  { label: "player required copy", passed: player.includes("老师指定") && player.includes("正在加载你的学习进度") && player.includes("正在读取最近一次提交") },
  { label: "player route uses Suspense split loaders", passed: playerPage.includes("Suspense") && playerPage.includes("assertStudentCanOpenPlayer") && playerPage.includes("getStudentPlayerShellDTO") && playerPage.includes("getStudentPlayerPersonalDTO") },
  { label: "player route avoids full DTO loader", passed: !nonCommentSourceIncludes(playerPage, "getStudentPlayerDTO({") },
  { label: "player surface exposes personal region and fallback", passed: player.includes("PlayerPersonalRegion") && player.includes("PlayerPersonalFallback") && player.includes("personalSlot") },
  { label: "task card required copy", passed: taskCard.includes("提交任务") && taskCard.includes("提交后会保留为一次新的尝试记录") },
  { label: "quiz card required copy", passed: quizCard.includes("提交答案") && quizCard.includes("已记录你的答案") },
  { label: "teacher review required copy", passed: teacherReview.includes("TeacherReviewSurface") && teacherReview.includes("待反馈") },
  { label: "feedback composer required copy", passed: feedbackComposer.includes("给学生的简短反馈") && feedbackComposer.includes("最多 200 字") && feedbackComposer.includes("发送反馈") },
  { label: "out-of-scope terms absent outside comments", passed: noDeferredScopeTokens(allSources) },
  { label: "package exposes verify:phase4", passed: packageJson.includes('"verify:phase4"') && packageJson.includes("tsx scripts/verify-phase4-learning.ts") },
];

const failed = checks.filter((check) => !check.passed);

if (failed.length > 0) {
  console.error("Phase 4 learning verification failed");
  for (const check of failed) {
    console.error(`- ${check.label}`);
  }
  process.exit(1);
}

console.log("Phase 4 learning verification passed");
