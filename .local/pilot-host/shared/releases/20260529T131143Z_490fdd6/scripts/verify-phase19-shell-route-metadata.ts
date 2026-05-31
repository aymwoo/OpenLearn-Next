import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

type StaticCheck = {
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

function runPnpm(args: readonly string[], label: string) {
  try {
    execFileSync("pnpm", [...args], { stdio: "inherit" });
  } catch (error) {
    console.error(`Phase 19 verification failed while running: ${label}`);
    throw error;
  }
}

const shellSource = read("src/components/shell/teacher-sidebar-shell.tsx");
const registrySource = read("src/lib/theme-layout/route-surface-registry.ts");
const resolverSource = read("src/lib/theme-layout/shell-surface-resolver.ts");
const packageSource = read("package.json");

const staticChecks: StaticCheck[] = [
  {
    label: "teacher shell no longer branches on route strings",
    passed:
      !nonCommentIncludes(shellSource, 'routeKey === "/teacher"') &&
      !nonCommentIncludes(shellSource, "pathname.startsWith("),
  },
  {
    label: "teacher shell consumes centralized resolver output",
    passed:
      nonCommentIncludes(shellSource, "getShellSurfaceConfig") &&
      nonCommentIncludes(shellSource, "shellConfig") &&
      nonCommentIncludes(shellSource, "surfaceMetadata"),
  },
  {
    label: "route registry defines shell metadata for shared teacher-facing routes",
    passed:
      nonCommentIncludes(registrySource, '"/teacher":') &&
      nonCommentIncludes(registrySource, '"/settings":') &&
      nonCommentIncludes(registrySource, '"/resources":') &&
      nonCommentIncludes(registrySource, "radius") &&
      nonCommentIncludes(registrySource, "width") &&
      nonCommentIncludes(registrySource, "chrome"),
  },
  {
    label: "resolver exports remain available",
    passed:
      nonCommentIncludes(resolverSource, "resolveShellVariant") &&
      nonCommentIncludes(resolverSource, "getShellSurfaceConfig"),
  },
  {
    label: "shell still handles square and full-width through shellConfig",
    passed:
      nonCommentIncludes(shellSource, 'shellConfig.radius === "square"') &&
      nonCommentIncludes(shellSource, 'shellConfig.width === "full-width"'),
  },
  {
    label: "package.json exposes verify:phase19",
    passed:
      packageSource.includes('"verify:phase19"') &&
      packageSource.includes("tsx scripts/verify-phase19-shell-route-metadata.ts"),
  },
];

const failedChecks = staticChecks.filter((check) => !check.passed);

if (failedChecks.length > 0) {
  console.error("Phase 19 shell route metadata verification failed");
  for (const check of failedChecks) {
    console.error(`- ${check.label}`);
  }
  process.exit(1);
}

runPnpm(
  [
    "test",
    "--run",
    "src/lib/theme-layout/shell-surface-resolver.test.ts",
    "src/components/shell/teacher-sidebar-shell.test.tsx",
  ],
  "phase 19 regression suite",
);

console.log("Phase 19 shell route metadata verification passed");
