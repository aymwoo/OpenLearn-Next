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

function nonCommentIncludes(source: string, token: string) {
  return withoutLineComments(source).includes(token);
}

function noUnsafePluginUi(source: string) {
  const filtered = withoutLineComments(source);
  return !/eval\(|dangerouslySetInnerHTML/.test(filtered);
}

const pluginActions = read("src/actions/plugin-actions.ts");
const pluginDal = read("src/lib/dal/plugins.ts");
const themeTokens = read("src/server/themes/tokens.ts");
const themeInjector = read("src/components/theme/theme-injector.tsx");
const rootLayout = read("src/app/layout.tsx");
const pluginRenderer = read("src/components/plugins/plugin-renderer.tsx");
const pluginWidgets = read("src/components/plugins/widgets/index.tsx");
const lessonStepEditor = read("src/components/authoring/lesson-step-editor.tsx");
const classroomDal = read("src/lib/dal/classroom.ts");
const learningDal = read("src/lib/dal/learning.ts");
const settingsSurface = read("src/components/surfaces/settings-surface.tsx");
const teacherPage = read("src/app/(teacher)/teacher/page.tsx");
const studentPage = read("src/app/(student)/student/page.tsx");
const editorPage = read("src/app/(teacher)/teacher/editor/page.tsx");
const packageJson = read("package.json");

const checks: Check[] = [
  {
    label: "plugin Server Action no longer exposes manifestJson: z.any()",
    passed: !nonCommentIncludes(pluginActions, "manifestJson: z.any()") && nonCommentIncludes(pluginActions, "manifestJson: PluginManifestSchema"),
  },
  {
    label: "plugin DAL includes enable path and denial reasons",
    passed: ["setPluginEnabled", "school_mismatch", "permission_denied"].every((token) => nonCommentIncludes(pluginDal, token)),
  },
  {
    label: "theme token compiler uses --color- and no --surface- drift",
    passed: nonCommentIncludes(themeTokens, "--color-") && !nonCommentIncludes(themeTokens, "--surface-"),
  },
  {
    label: "theme runtime includes activeThemeId cookie and theme-injector",
    passed: nonCommentIncludes(themeInjector, 'id="theme-injector"') && nonCommentIncludes(themeInjector, "getActiveThemeId") && nonCommentIncludes(themeInjector, "getActiveThemeForCurrentActor"),
  },
  {
    label: "root layout renders ThemeInjector",
    passed: nonCommentIncludes(rootLayout, "ThemeInjector") && nonCommentIncludes(rootLayout, "<ThemeInjector />"),
  },
  {
    label: "plugin renderer and widgets avoid unsafe execution",
    passed: noUnsafePluginUi(pluginRenderer) && noUnsafePluginUi(pluginWidgets),
  },
  {
    label: "plugin renderer anchors are wired into teacher, student, and editor pages",
    passed: nonCommentIncludes(teacherPage, 'anchor="dashboard.widget"') && nonCommentIncludes(studentPage, 'anchor="dashboard.widget"') && nonCommentIncludes(editorPage, 'anchor="lesson.sidebar"'),
  },
  {
    label: "settings surface exposes theme and plugin controls",
    passed: ["setActiveThemeAction", "默认主题", "插件管理", "setPluginEnabledAction"].every((token) => nonCommentIncludes(settingsSurface, token)),
  },
  {
    label: "lesson step editor persists through autosave and save action",
    passed: nonCommentIncludes(lessonStepEditor, "autosaveLessonStepAction") && nonCommentIncludes(lessonStepEditor, "保存步骤"),
  },
  {
    label: "classroom DAL supports durable participant presence updates",
    passed: ["ensureClassroomParticipant", "updateClassroomParticipantConnection"].every((token) => nonCommentIncludes(classroomDal, token)),
  },
  {
    label: "learning runtime contains forcedStepId server-side lock enforcement hooks",
    passed: ["forcedStepId", "teacherRecommendedStepId", "disabledStepIds"].every((token) => nonCommentIncludes(learningDal, token)),
  },
  {
    label: "package.json exposes verify:phase11",
    passed: packageJson.includes('"verify:phase11"') && packageJson.includes("tsx scripts/verify-phase11-readiness.ts"),
  },
];

const failed = checks.filter((check) => !check.passed);

if (failed.length > 0) {
  console.error("Phase 11 readiness verification failed");
  for (const check of failed) {
    console.error(`- ${check.label}`);
  }
  process.exit(1);
}

console.log("Phase 11 readiness verification passed");
