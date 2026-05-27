import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type StaticCheck = {
  label: string;
  passed: boolean;
};

type Phase59StaticSources = {
  packageSource: string;
  verifierSource: string;
  workflowSource: string;
  artifactPresence: Record<string, boolean>;
};

export const PHASE_59_VERIFY_SCRIPT =
  "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase59-deploy-release.ts";

export function getPhase59RequiredArtifacts() {
  return [
    ".env.example",
    "src/lib/ops/env.server.ts",
    "src/app/api/health/route.ts",
    "src/app/api/ready/route.ts",
    "src/app/api/release/route.ts",
    "ops/deploy/deploy.sh",
    "ops/deploy/rollback.sh",
    "ops/deploy/backup.sh",
    "ops/deploy/restore.sh",
    "ops/deploy/verify-restore.sh",
    "ops/systemd/openlearn-web.service",
    "ops/systemd/openlearn-worker.service",
    "ops/releases/checklists/rollout.md",
    "ops/releases/checklists/rollback.md",
    ".github/workflows/pilot-release.yml",
  ] as const;
}

export function getPhase59FocusedSuitePaths() {
  return [
    "src/lib/ops/env.server.test.ts",
    "src/lib/ops/release-status.test.ts",
    "src/app/api/ops-routes.test.ts",
    "scripts/verify-phase59-deploy-release.test.ts",
  ] as const;
}

export function read(filePath: string) {
  const absolutePath = path.join(process.cwd(), filePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
}

function run(command: string, args: readonly string[], label: string) {
  try {
    const output = execFileSync(command, [...args], {
      stdio: "pipe",
      encoding: "utf8",
    });
    if (output) process.stdout.write(output);
  } catch (error: unknown) {
    const stdout = typeof error === "object" && error && "stdout" in error ? error.stdout : "";
    const stderr = typeof error === "object" && error && "stderr" in error ? error.stderr : "";
    if (typeof stdout === "string" && stdout.length > 0) process.stdout.write(stdout);
    if (typeof stderr === "string" && stderr.length > 0) process.stderr.write(stderr);
    console.error(`Phase 59 verification failed while running: ${label}`);
    throw error;
  }
}

function runVitest(paths: readonly string[], label: string) {
  const directRunner = path.join(process.cwd(), "node_modules", "vitest", "vitest.mjs");
  const localBin = path.join(process.cwd(), "node_modules", ".bin", "vitest");

  if (existsSync(directRunner)) {
    run(process.execPath, [directRunner, "--run", ...paths], label);
    return;
  }

  if (existsSync(localBin)) {
    run(localBin, ["--run", ...paths], label);
    return;
  }

  run("pnpm", ["exec", "vitest", "--run", ...paths], label);
}

function includesAll(source: string, tokens: readonly string[]) {
  return tokens.every((token) => source.includes(token));
}

function tokensAppearInOrder(source: string, tokens: readonly string[]) {
  let cursor = -1;

  for (const token of tokens) {
    const nextIndex = source.indexOf(token, cursor + 1);
    if (nextIndex === -1) {
      return false;
    }
    cursor = nextIndex;
  }

  return true;
}

function containsShellHeredoc(source: string) {
  return source.includes(["<<", "EOF"].join("")) || source.includes(["<<", " 'EOF'"] .join(""));
}

export function verifyPhase59PackageScripts(packageSource: string) {
  try {
    const pkg = JSON.parse(packageSource) as { scripts?: Record<string, string> };
    return pkg.scripts?.["verify:phase59"] === PHASE_59_VERIFY_SCRIPT;
  } catch {
    return false;
  }
}

export function evaluatePhase59StaticChecks(sources: Phase59StaticSources): StaticCheck[] {
  const requiredArtifacts = getPhase59RequiredArtifacts();

  return [
    {
      label: "package.json exposes exact verify:phase59 script",
      passed: verifyPhase59PackageScripts(sources.packageSource),
    },
    {
      label: "phase59 required artifact list exists on disk",
      passed: requiredArtifacts.every((artifact) => sources.artifactPresence[artifact] === true),
    },
    {
      label: "verifier keeps helper-based implementation and avoids shell heredoc gates",
      passed:
        includesAll(sources.verifierSource, [
          "export function read(filePath: string)",
          "function run(command: string, args: readonly string[], label: string)",
          "function runVitest(paths: readonly string[], label: string)",
          "getPhase59RequiredArtifacts()",
          "getPhase59FocusedSuitePaths()",
        ])
        && !containsShellHeredoc(sources.verifierSource),
    },
    {
      label: "workflow locks release hard gate order, redis service, optional fanout posture, and health/ready curls",
      passed:
        includesAll(sources.workflowSource, [
          "pull_request:",
          "push:",
          "workflow_dispatch:",
          "branches: [main]",
          "actions/checkout@v4",
          "actions/setup-node@v4",
          "pnpm/action-setup@v4",
          "image: redis:7-alpine",
          "REDIS_FANOUT_ENABLED: false",
          "OPENLEARN_HEALTHCHECK_BASE_URL: http://127.0.0.1:3100",
          "curl -fsS http://127.0.0.1:3100/api/health",
          "curl -fsS http://127.0.0.1:3100/api/ready",
        ])
        && tokensAppearInOrder(sources.workflowSource, [
          "pnpm install --frozen-lockfile",
          "pnpm lint",
          "pnpm typecheck",
          "pnpm test --run",
          "pnpm build",
          "pnpm db:migrate",
          "pnpm verify:phase57",
          "pnpm verify:phase58",
          "pnpm verify:phase59",
          "PORT=3100 pnpm start",
          "pnpm worker:start",
          "curl -fsS http://127.0.0.1:3100/api/health",
          "curl -fsS http://127.0.0.1:3100/api/ready",
        ]),
    },
  ];
}

export async function runPhase59Verification() {
  console.log("==================================================");
  console.log("Starting Phase 59 deploy-release verification...");
  console.log("==================================================");

  const requiredArtifacts = getPhase59RequiredArtifacts();
  const staticChecks = evaluatePhase59StaticChecks({
    packageSource: read("package.json"),
    verifierSource: read("scripts/verify-phase59-deploy-release.ts"),
    workflowSource: read(".github/workflows/pilot-release.yml"),
    artifactPresence: Object.fromEntries(
      requiredArtifacts.map((artifact) => [artifact, existsSync(path.join(process.cwd(), artifact))]),
    ),
  });

  const failedChecks = staticChecks.filter((check) => !check.passed);
  if (failedChecks.length > 0) {
    console.error("  ❌ Static analysis failed with the following gaps:");
    for (const check of failedChecks) {
      console.error(`     - ${check.label}`);
    }
    process.exit(1);
  }

  console.log("  ✓ Static close-gate checks passed.");

  console.log("\n[1/1] Running focused Phase 59 suites...");
  runVitest(getPhase59FocusedSuitePaths(), "Phase 59 focused deploy-release suites");

  console.log("\nPhase 59 verification complete.");
  console.log("==================================================");
  console.log("Phase 59 deploy-release verification successfully PASSED!");
  console.log("==================================================");
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  runPhase59Verification().catch((error) => {
    console.error("Unhandled verification error:", error);
    process.exit(1);
  });
}
