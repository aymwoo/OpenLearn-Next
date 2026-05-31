import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

type StaticCheck = {
  label: string;
  passed: boolean;
  detail?: string;
};

const REQUIRED_FILES = [
  "src/app/(teacher)/teacher/launch/page.tsx",
  "src/components/classroom/classroom-launch-panel.tsx",
  "src/components/classroom/classroom-launch-panel.test.tsx",
  "src/lib/dal/classroom.test.ts",
  "src/lib/dal/plugins.builtins.test.ts",
  "src/components/authoring/lesson-authoring-workspace.test.tsx",
  "src/app/settings/plugins/page.tsx",
  "src/components/surfaces/plugin-marketplace-surface.tsx",
  "src/components/surfaces/settings-surface.test.tsx",
  "package.json",
] as const;

const UNSAFE_PATTERN_TARGETS = [
  "src/server/plugins/registry.ts",
  "src/components/plugins/plugin-renderer.tsx",
  "src/components/plugins/widgets/index.tsx",
  "src/components/surfaces/plugin-marketplace-surface.tsx",
] as const;

const UNSAFE_PATTERNS = [/eval\(/, /dangerouslySetInnerHTML/, /<script/i];

const BEHAVIOR_SUITES = [
  {
    label: "launch and built-in behavior regression suite",
    args: [
      "test",
      "--",
      "src/lib/dal/classroom.test.ts",
      "src/components/classroom/classroom-launch-panel.test.tsx",
      "src/lib/dal/plugins.builtins.test.ts",
      "src/components/authoring/lesson-authoring-workspace.test.tsx",
    ],
  },
  {
    label: "marketplace/settings regression suite",
    args: ["test", "--", "src/components/surfaces/settings-surface.test.tsx"],
  },
] as const;

function read(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function withoutLineComments(source: string) {
  return source
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

function runPnpm(args: readonly string[], label: string) {
  try {
    execFileSync("pnpm", [...args], {
      stdio: "inherit",
    });
  } catch (error) {
    console.error(`Phase 12 verification failed while running: ${label}`);
    throw error;
  }
}

function requireFile(path: string): StaticCheck {
  return {
    label: `required file exists: ${path}`,
    passed: existsSync(path),
    detail: path,
  };
}

function checkUnsafePatterns(path: string): StaticCheck {
  const source = withoutLineComments(read(path));
  return {
    label: `unsafe runtime patterns are blocked in ${path}`,
    passed: existsSync(path) && UNSAFE_PATTERNS.every((pattern) => !pattern.test(source)),
    detail: path,
  };
}

function checkPackageScript(): StaticCheck {
  const source = read("package.json");
  return {
    label: "package.json exposes verify:phase12",
    passed:
      source.includes('"verify:phase12"') &&
      source.includes("tsx scripts/verify-phase12-launch-and-builtins.ts"),
  };
}

const staticChecks: StaticCheck[] = [
  ...REQUIRED_FILES.map((path) => requireFile(path)),
  ...UNSAFE_PATTERN_TARGETS.map((path) => checkUnsafePatterns(path)),
  checkPackageScript(),
];

const failedStaticChecks = staticChecks.filter((check) => !check.passed);

if (failedStaticChecks.length > 0) {
  console.error("Phase 12 launch and built-ins verification failed");
  for (const check of failedStaticChecks) {
    console.error(`- ${check.label}`);
  }
  process.exit(1);
}

for (const suite of BEHAVIOR_SUITES) {
  runPnpm(suite.args, suite.label);
}

console.log("Phase 12 launch and built-ins verification passed");
