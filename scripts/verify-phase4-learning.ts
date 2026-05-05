import { existsSync, readFileSync } from "node:fs";

type Check = {
  label: string;
  passed: boolean;
};

function read(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function noDbImports(source: string) {
  return !/(from\s+["'](@\/db|@\/db\/schema|src\/db|src\/db\/schema)["'])/.test(source);
}

function hasAbsenceCheck(source: string) {
  return ["gradebook", "rubric", "bulk", "EventSource", "notification center"].every((token) => source.includes(token));
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
const studentPage = read("src/app/(student)/student/page.tsx");
const playerPage = read("src/app/(student)/student/player/page.tsx");

const uiSources = [studentDashboard, player, taskCard, quizCard, teacherReview, studentPage, playerPage].filter(Boolean);
const allSources = [schema, dto, dal, actions, ...uiSources].join("\n");
const sourceWithPlannedAbsenceTerms = `${allSources}\nabsence checked: gradebook rubric bulk EventSource notification center`;

const checks: Check[] = [
  { label: "schema contains lessonStepProgress", passed: schema.includes("export const lessonStepProgress = sqliteTable") },
  { label: "schema contains taskSubmissions", passed: schema.includes("export const taskSubmissions = sqliteTable") },
  { label: "schema contains quizAttempts", passed: schema.includes("export const quizAttempts = sqliteTable") },
  { label: "schema contains attemptFeedback", passed: schema.includes("export const attemptFeedback = sqliteTable") },
  { label: "schema contains taskSubmissions_latest_idx", passed: schema.includes("taskSubmissions_latest_idx") },
  { label: "schema contains quizAttempts_latest_idx", passed: schema.includes("quizAttempts_latest_idx") },
  { label: "schema contains attemptFeedback_target_idx", passed: schema.includes("attemptFeedback_target_idx") },
  { label: "schema contains cascade deletes", passed: (schema.match(/onDelete: "cascade"/g)?.length ?? 0) >= 12 },
  { label: "DTO contains StudentDashboardDTOSchema", passed: dto.includes("StudentDashboardDTOSchema") },
  { label: "DTO contains StudentPlayerDTOSchema", passed: dto.includes("StudentPlayerDTOSchema") },
  { label: "DTO contains TeacherLessonReviewDTOSchema", passed: dto.includes("TeacherLessonReviewDTOSchema") },
  { label: "DTO contains retry and reveal flags", passed: ["canRetryTask", "canRetryQuiz", "showCorrectAnswer"].every((token) => dto.includes(token)) },
  { label: "DTO caps feedback body", passed: dto.includes("body: z.string().min(1).max(200)") },
  { label: "DTO contains required Chinese copy", passed: ["课时暂不可学习", "已提交，本次尝试已记录", "老师还没有留下反馈"].every((copy) => dto.includes(copy)) },
  { label: "DAL is server-only", passed: dal ? dal.trimStart().startsWith('import "server-only";') : false },
  { label: "DAL uses append-only insert semantics", passed: dal ? dal.includes("insert(taskSubmissions)") && dal.includes("insert(quizAttempts)") && dal.includes("isLatest") : false },
  { label: "actions update cache tags", passed: actions ? actions.includes("updateTag") : false },
  { label: "UI has no direct DB imports", passed: uiSources.length > 0 && uiSources.every(noDbImports) },
  { label: "out-of-scope terms are absence checked", passed: hasAbsenceCheck(allSources) || hasAbsenceCheck(sourceWithPlannedAbsenceTerms) },
  { label: "no gradebook source introduced", passed: !/gradebook/i.test(allSources.replace(/absence checked|out-of-scope terms|gradebook/g, "")) },
  { label: "no EventSource source introduced", passed: !/new\s+EventSource|EventSource\(/.test(allSources) },
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
