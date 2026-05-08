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

function hasNoneOf(source: string, patterns: RegExp[]) {
  const filtered = withoutLineComments(source);
  return patterns.every((pattern) => !pattern.test(filtered));
}

const launchPage = read("src/app/(teacher)/teacher/launch/page.tsx");
const launchSurface = read("src/components/surfaces/classroom-launch-surface.tsx");
const sidebar = read("src/components/shell/sidebar.tsx");
const teacherLayout = read("src/app/(teacher)/teacher/layout.tsx");
const launchPanel = read("src/components/classroom/classroom-launch-panel.tsx");
const preview = read("src/components/classroom/classroom-launch-preview.tsx");
const authoring = read("src/components/authoring/lesson-authoring-workspace.tsx");
const bootstrap = read("scripts/bootstrap-dev-db.ts");
const settingsSurface = read("src/components/surfaces/settings-surface.tsx");
const registry = read("src/server/plugins/registry.ts");
const pluginRenderer = read("src/components/plugins/plugin-renderer.tsx");
const widgetIndex = read("src/components/plugins/widgets/index.tsx");
const packageJson = read("package.json");

const builtInNames = ["教师讲授", "问卷调查", "学生探究", "课堂测验", "评价"];

const checks: Check[] = [
  {
    label: "dedicated teacher launch route exists and renders ClassroomLaunchSurface",
    passed:
      existsSync("src/app/(teacher)/teacher/launch/page.tsx") &&
      nonCommentIncludes(launchPage, "ClassroomLaunchSurface"),
  },
  {
    label: "teacher launch CTAs route to /teacher/launch",
    passed:
      nonCommentIncludes(sidebar, 'href="/teacher/launch"') &&
      nonCommentIncludes(teacherLayout, 'href="/teacher/launch"'),
  },
  {
    label: "launch UI keeps preview and primary launch markers",
    passed:
      ["开启新课堂", "ClassroomLaunchPreview", "课堂节奏预览"].every((token) =>
        [launchSurface, launchPanel, preview].some((source) => nonCommentIncludes(source, token)),
      ),
  },
  {
    label: "authoring exposes 内置教学环节 in first-level action zone",
    passed:
      nonCommentIncludes(authoring, "内置教学环节") &&
      nonCommentIncludes(authoring, "新增步骤") &&
      builtInNames.every((name) => nonCommentIncludes(authoring, name)),
  },
  {
    label: "bootstrap seeds all five built-in teaching-step plugins",
    passed: builtInNames.every((name) => nonCommentIncludes(bootstrap, name)),
  },
  {
    label: "management UI labels built-ins as 系统内置 and 默认开启",
    passed:
      nonCommentIncludes(settingsSurface, "系统内置") &&
      nonCommentIncludes(settingsSurface, "默认开启"),
  },
  {
    label: "registry contains explicit built-in first-party action handling",
    passed:
      [
        "suggestBuiltInTeachingStep",
        "insertBuiltInTeachingStepTemplate",
        "builtInTeachingStepSuggestion",
        "builtInTeachingStepTemplate",
      ].every((token) => nonCommentIncludes(registry, token)),
  },
  {
    label: "plugin runtime files remain free of eval and raw HTML rendering",
    passed: hasNoneOf(registry + pluginRenderer + widgetIndex, [/eval\(/, /dangerouslySetInnerHTML/, /<script/]),
  },
  {
    label: "package.json exposes verify:phase12 script",
    passed:
      packageJson.includes('"verify:phase12"') &&
      packageJson.includes("tsx scripts/verify-phase12-launch-and-builtins.ts"),
  },
];

const failed = checks.filter((check) => !check.passed);

if (failed.length > 0) {
  console.error("Phase 12 launch and built-ins verification failed");
  for (const check of failed) {
    console.error(`- ${check.label}`);
  }
  process.exit(1);
}

console.log("Phase 12 launch and built-ins verification passed");
