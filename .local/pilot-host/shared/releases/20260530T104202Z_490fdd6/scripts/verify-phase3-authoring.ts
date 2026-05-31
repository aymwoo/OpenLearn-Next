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
const auth = read("src/lib/auth/auth.ts");
const authActions = read("src/actions/auth-actions.ts");
const authConfig = read("src/lib/auth/auth.config.ts");
const proxy = read("src/proxy.ts");
const seedTestAccounts = read("scripts/seed-test-accounts.ts");

function hasAuthJsJwtSessionIdCallbacks(source: string) {
  return (
    source.includes('session: { strategy: "jwt" }') &&
    source.includes("callbacks") &&
    /\bjwt\s*\(\s*\{|\bjwt\s*\(\s*\{/.test(source) &&
    /\bsession\s*\(\s*\{|\bsession\s*\(\s*\{/.test(source) &&
    source.includes("session.user.id") &&
    (source.includes("token.id") || source.includes("token.sub")) &&
    source.includes("CredentialsProvider") &&
    source.includes("DrizzleAdapter(db)") &&
    source.includes("bcrypt.compare")
  );
}

function edgeSafeConfigHasNoNodeOnlyImports(source: string) {
  return ![
    "@/db",
    "@auth/drizzle-adapter",
    "bcryptjs",
    "next-auth/providers/credentials",
    "@/lib/auth/auth",
  ].some((forbidden) => source.includes(forbidden));
}

function proxyCoversTeacherRoutes(source: string) {
  return source.includes("authConfig") && /matcher:[\s\S]*(teacher|\.\*)/.test(source);
}

function credentialsLoginKeepsRoleAwareRedirectContract(source: string) {
  const legacyInlineRedirect = source.includes(
    'redirectTo: parsed.data.roleIntent === "student" ? "/student" : "/teacher"',
  );
  const workspaceEntryRedirect =
    source.includes("resolveWorkspaceEntry(parsed.data.roleIntent)") &&
    source.includes('if (roleIntent === "student")') &&
    source.includes('return "/student"') &&
    source.includes('if (roleIntent === "admin")') &&
    source.includes('return "/admin"') &&
    source.includes('return "/teacher"');

  return source.includes('signIn("credentials"') && (legacyInlineRedirect || workspaceEntryRedirect);
}

function seedKeepsStudentOutOfTeacherRole(source: string) {
  const studentIndex = source.indexOf("student@example.com");
  if (studentIndex === -1) return false;

  const teacherRoleIndex = source.indexOf('role: "teacher"');
  return teacherRoleIndex === -1 || teacherRoleIndex > studentIndex + 200;
}

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
  {
    label: "UI keeps editor workspace-first copy and lesson flow header actions",
    passed:
      surface.includes("editor 继续保持 workspace-first posture") &&
      surface.includes("LessonEditorHeaderActions") &&
      surface.includes("LessonAuthoringWorkspace"),
  },
  {
    label: "Auth.js credentials JWT session exposes session.user.id",
    passed: hasAuthJsJwtSessionIdCallbacks(auth),
  },
  {
    label: "credentials login keeps role-aware redirect contract",
    passed: credentialsLoginKeepsRoleAwareRedirectContract(authActions),
  },
  {
    label: "edge-safe auth config has no Node-only auth dependencies",
    passed: edgeSafeConfigHasNoNodeOnlyImports(authConfig),
  },
  { label: "proxy imports authConfig and protects teacher routes", passed: proxyCoversTeacherRoutes(proxy) },
  {
    label: "test account seed creates active teacher membership",
    passed:
      seedTestAccounts.includes("schools") &&
      seedTestAccounts.includes("memberships") &&
      seedTestAccounts.includes("teacher@example.com") &&
      seedTestAccounts.includes('role: "teacher"') &&
      seedTestAccounts.includes('status: "active"'),
  },
  {
    label: "test account seed creates active student membership without teacher role",
    passed:
      seedTestAccounts.includes("student@example.com") &&
      seedTestAccounts.includes('"student@example.com": ["student"]') &&
      seedTestAccounts.includes('await ensureActiveMembership(user.id, testSchool.id, role);') &&
      seedKeepsStudentOutOfTeacherRole(seedTestAccounts),
  },
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
