import { readFileSync } from "node:fs";

type Check = {
  label: string;
  passed: boolean;
};

function read(path: string) {
  return readFileSync(path, "utf8");
}

function withoutLineComments(source: string) {
  return source
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

function noDbImports(source: string) {
  return !/(from\s+["'](@\/db|@\/db\/schema|src\/db|src\/db\/schema)["'])/.test(source);
}

const schema = read("src/db/schema.ts");
const dto = read("src/lib/dto/lesson-authoring.ts");
const dal = read("src/lib/dal/lesson-authoring.ts");
const actions = read("src/actions/lesson-authoring-actions.ts");
const surface = read("src/components/surfaces/lesson-editor-surface.tsx");
const page = read("src/app/(teacher)/teacher/editor/page.tsx");

const checks: Check[] = [
  { label: "schema contains courses", passed: schema.includes("export const courses = sqliteTable") },
  { label: "schema contains lessons", passed: schema.includes("export const lessons = sqliteTable") },
  { label: "schema contains lessonSteps", passed: schema.includes("export const lessonSteps = sqliteTable") },
  {
    label: "schema contains publishedLessonVersions",
    passed: schema.includes("export const publishedLessonVersions = sqliteTable"),
  },
  { label: "schema contains lessonSteps_lessonId_rank_idx", passed: schema.includes("lessonSteps_lessonId_rank_idx") },
  { label: "schema contains cascade deletes", passed: schema.includes('onDelete: "cascade"') },
  { label: "schema has no non-comment position token", passed: !/\bposition\b/.test(withoutLineComments(schema)) },
  { label: "DTO contains payload discriminated union", passed: dto.includes('z.discriminatedUnion("type"') },
  { label: "DAL is server-only", passed: dal.trimStart().startsWith('import "server-only";') },
  { label: "DAL contains assertActiveTeacher", passed: dal.includes("assertActiveTeacher") },
  { label: "DAL parses LessonEditor DTO", passed: dal.includes("LessonEditorDTOSchema.parse") },
  { label: "actions are Server Actions", passed: actions.trimStart().startsWith('"use server";') },
  { label: "actions update lesson cache", passed: actions.includes("updateTag(cacheTags.lesson") },
  { label: "actions update steps cache", passed: actions.includes("updateTag(cacheTags.steps") },
  { label: "actions expose conflict feedback", passed: actions.includes("CONFLICT") },
  { label: "surface has no direct DB import", passed: noDbImports(surface) },
  { label: "page has no direct DB import", passed: noDbImports(page) },
  { label: "UI contains autosave copy", passed: surface.includes("已自动保存") },
  { label: "UI contains publish copy", passed: surface.includes("发布课时") },
  { label: "UI contains conflict copy", passed: surface.includes("检测到更新冲突") },
];

const failed = checks.filter((check) => !check.passed);

if (failed.length > 0) {
  console.error("Phase 3 authoring verification failed");
  for (const check of failed) {
    console.error(`- ${check.label}`);
  }
  process.exit(1);
}

console.log("Phase 3 authoring verification passed");
