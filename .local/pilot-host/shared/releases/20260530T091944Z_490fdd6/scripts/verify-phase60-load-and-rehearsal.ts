import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PHASE60_THRESHOLDS } from "./load/phase60-thresholds.js";

type StaticCheck = {
  label: string;
  passed: boolean;
};

type Phase60StaticSources = {
  packageSource: string;
  verifierSource: string;
  artifactPresence: Record<string, boolean>;
  summarySource: string;
};

type Phase60StageResult = {
  status?: string;
  blockingFailure?: string | null;
  manualRequired?: {
    transportFallback?: boolean;
  } | null;
};

const PHASE60_LIVE_ENV = [
  "PHASE60_BASE_URL",
  "OPENLEARN_SHARED_ROOT",
  "OPENLEARN_CURRENT_ROOT",
  "OPENLEARN_HEALTHCHECK_BASE_URL",
] as const;

export const PHASE_60_VERIFY_SCRIPT =
  "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase60-load-and-rehearsal.ts";

export const PHASE_60_LOCAL_VERIFY_SCRIPT =
  "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase60-local.ts";

export function getPhase60RequiredArtifacts() {
  return [
    "scripts/proof-phase60-load-smoke.ts",
    "scripts/load/phase60-fixtures.ts",
    "scripts/load/phase60-capacity.k6.js",
    "scripts/load/phase60-drill-classifier.js",
    "scripts/load/phase60-drills.k6.js",
    "scripts/rehearse-phase60-rollout-rollback.ts",
    "ops/releases/evidence/phase60/rehearsal-summary.md",
    "ops/releases/evidence/phase60/rollout-notes.md",
    "ops/releases/evidence/phase60/rollback-notes.md",
    "ops/releases/evidence/phase60/transport-fallback-notes.md",
  ] as const;
}

export function getPhase60FocusedSuitePaths() {
  return [
    "scripts/load/phase60-thresholds.test.ts",
    "scripts/load/phase60-drills.test.ts",
    "scripts/rehearse-phase60-rollout-rollback.test.ts",
    "scripts/verify-phase60-load-and-rehearsal.test.ts",
  ] as const;
}

export function getPhase60StageOrder() {
  return [
    "static",
    "sample smoke",
    "capacity",
    "drills",
    "rollout/rollback rehearsal",
    "summary",
  ] as const;
}

export function getPhase60MissingLiveEnv(env: NodeJS.ProcessEnv = process.env) {
  return PHASE60_LIVE_ENV.filter((name) => !env[name]?.trim());
}

function isLocalhostBaseUrl(baseUrl: string | undefined) {
  if (!baseUrl?.trim()) {
    return false;
  }

  try {
    const url = new URL(baseUrl);
    return url.hostname === "127.0.0.1" || url.hostname === "localhost";
  } catch {
    return false;
  }
}

function isSharedLocalDbFile(dbFileName: string | undefined) {
  const normalized = dbFileName?.trim() || "file:local.db";
  return normalized === "file:local.db" || normalized === "file:./local.db";
}

export function getPhase60SharedLocalDbBlocker(env: NodeJS.ProcessEnv = process.env) {
  if (!isLocalhostBaseUrl(env.PHASE60_BASE_URL)) {
    return null;
  }

  if (!isSharedLocalDbFile(env.DB_FILE_NAME)) {
    return null;
  }

  return "PHASE60_LOCAL_DB_SHARED_WITH_APP: rerun pnpm verify:phase60:local";
}

export function read(filePath: string) {
  const absolutePath = path.join(process.cwd(), filePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
}

export function readJson<T>(filePath: string): T | null {
  try {
    const source = read(filePath);
    if (!source) {
      return null;
    }

    return JSON.parse(source) as T;
  } catch {
    return null;
  }
}

function run(command: string, args: readonly string[], label: string, env?: NodeJS.ProcessEnv) {
  try {
    const output = execFileSync(command, [...args], {
      stdio: "pipe",
      encoding: "utf8",
      env: env ?? process.env,
    });
    if (output) process.stdout.write(output);
  } catch (error: unknown) {
    const stdout = typeof error === "object" && error && "stdout" in error ? error.stdout : "";
    const stderr = typeof error === "object" && error && "stderr" in error ? error.stderr : "";
    if (typeof stdout === "string" && stdout.length > 0) process.stdout.write(stdout);
    if (typeof stderr === "string" && stderr.length > 0) process.stderr.write(stderr);
    console.error(`Phase 60 verification failed while running: ${label}`);
    throw error;
  }
}

function runVitest(paths: readonly string[], label: string) {
  const directRunner = path.join(process.cwd(), "node_modules", "vitest", "vitest.mjs");
  const localBin = path.join(process.cwd(), "node_modules", ".bin", "vitest");
  const args = ["--run", "--testTimeout=20000", ...paths];

  if (existsSync(directRunner)) {
    run(process.execPath, [directRunner, ...args], label);
    return;
  }

  if (existsSync(localBin)) {
    run(localBin, args, label);
    return;
  }

  run("pnpm", ["exec", "vitest", ...args], label);
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

export function verifyPhase60PackageScripts(packageSource: string) {
  try {
    const pkg = JSON.parse(packageSource) as { scripts?: Record<string, string> };
    return pkg.scripts?.["verify:phase60"] === PHASE_60_VERIFY_SCRIPT;
  } catch {
    return false;
  }
}

export function verifyPhase60LocalPackageScript(packageSource: string) {
  try {
    const pkg = JSON.parse(packageSource) as { scripts?: Record<string, string> };
    return pkg.scripts?.["verify:phase60:local"] === PHASE_60_LOCAL_VERIFY_SCRIPT;
  } catch {
    return false;
  }
}

export function withLoopbackNoProxy(env: NodeJS.ProcessEnv = process.env) {
  const nextEnv = { ...env };
  const additions = ["127.0.0.1", "localhost"];

  for (const key of ["NO_PROXY", "no_proxy"] as const) {
    const existing = nextEnv[key]?.trim();
    const tokens = existing
      ? existing.split(",").map((token) => token.trim()).filter(Boolean)
      : [];

    for (const addition of additions) {
      if (!tokens.includes(addition)) {
        tokens.push(addition);
      }
    }

    nextEnv[key] = tokens.join(",");
  }

  return nextEnv;
}

export function resolvePhase60K6Invocation(scriptPath: string) {
  const env = withLoopbackNoProxy(process.env);

  if (process.env.PHASE60_K6_MODE === "dry-run") {
    return { mode: "dry-run" as const, command: "", args: [] as string[], env };
  }

  for (const candidate of [process.env.PHASE60_K6_BIN, "/usr/bin/k6", "/usr/local/bin/k6"]) {
    if (candidate && existsSync(candidate)) {
      return {
        mode: "host" as const,
        command: candidate,
        args: ["run", scriptPath],
        env,
      };
    }
  }

  const dockerEnvArgs = [
    "-e",
    `PHASE60_BASE_URL=${env.PHASE60_BASE_URL ?? ""}`,
    "-e",
    `NO_PROXY=${env.NO_PROXY ?? ""}`,
    "-e",
    `no_proxy=${env.no_proxy ?? ""}`,
  ];

  return {
    mode: "docker" as const,
    command: "docker",
    args: [
      "run",
      "--rm",
      "--user",
      `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`,
      "--network",
      "host",
      ...dockerEnvArgs,
      "-v",
      `${process.cwd()}:/work`,
      "-w",
      "/work",
      "grafana/k6:latest",
      "run",
      scriptPath,
    ],
    env,
  };
}

export function evaluatePhase60StaticChecks(sources: Phase60StaticSources): StaticCheck[] {
  return [
    {
      label: "package.json exposes exact verify:phase60 and verify:phase60:local scripts",
      passed:
        verifyPhase60PackageScripts(sources.packageSource)
        && verifyPhase60LocalPackageScript(sources.packageSource),
    },
    {
      label: "phase60 required artifacts exist on disk",
      passed: getPhase60RequiredArtifacts().every((artifact) => sources.artifactPresence[artifact] === true),
    },
    {
      label: "verifier stays helper-based, imports shared thresholds, and avoids shell heredoc shortcuts",
      passed:
        includesAll(sources.verifierSource, [
          'export function read(filePath: string)',
          'function run(command: string, args: readonly string[], label: string',
          'function runVitest(paths: readonly string[], label: string)',
          'PHASE60_THRESHOLDS',
          'PHASE60_K6_MODE',
          'PHASE60_REHEARSAL_MODE',
          'resolvePhase60K6Invocation',
        ]) && !containsShellHeredoc(sources.verifierSource),
    },
    {
      label: "verifier locks the hard-gate stage order and keeps docker k6 fallback",
      passed:
        tokensAppearInOrder(sources.verifierSource, [
          'sample smoke',
          'capacity',
          'drills',
          'rollout/rollback rehearsal',
          'summary',
        ])
        && includesAll(sources.verifierSource, ['grafana/k6:latest', 'phase60-capacity.k6.js', 'phase60-drills.k6.js']),
    },
    {
      label: "summary artifact still reads the machine-readable phase60 result contracts and keeps transport fallback manual-only",
      passed: includesAll(sources.summarySource, [
        'ops/releases/evidence/phase60/smoke-result.json',
        'ops/releases/evidence/phase60/capacity-result.json',
        'ops/releases/evidence/phase60/drill-results.json',
        'ops/releases/evidence/phase60/transport-fallback-notes.md',
        'manual evidence only',
        'do not treat it as an automated pass bit',
      ]),
    },
  ];
}

export function validatePhase60SummarySource(summarySource: string) {
  return includesAll(summarySource, [
    'Go/No-Go',
    'smoke-result.json',
    'capacity-result.json',
    'drill-results.json',
    'transport-fallback-notes.md',
    'manual evidence only',
    'do not treat it as an automated pass bit',
  ]);
}

export function assertPhase60LiveResult(label: string, result: Phase60StageResult | null) {
  if (!result?.status) {
    throw new Error(`PHASE60_${label.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_RESULT_MISSING`);
  }

  if (result.status === "dry-run") {
    throw new Error(`PHASE60_${label.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_DRY_RUN_NOT_ALLOWED`);
  }

  if (result.status === "blocked") {
    throw new Error(result.blockingFailure || `PHASE60_${label.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_BLOCKED`);
  }

  if (
    label === "drills"
    && result.status === "escalate"
    && result.manualRequired?.transportFallback === true
  ) {
    return;
  }

  if (result.status !== "passed" && result.status !== "go") {
    throw new Error(result.blockingFailure || `PHASE60_${label.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_FAILED`);
  }
}

function ensureDryRunK6Artifacts() {
  const capacityPath = path.join(process.cwd(), 'ops', 'releases', 'evidence', 'phase60', 'capacity-result.json');
  const drillPath = path.join(process.cwd(), 'ops', 'releases', 'evidence', 'phase60', 'drill-results.json');

  if (process.env.PHASE60_K6_MODE !== 'dry-run') {
    return;
  }

  writeFileSync(capacityPath, JSON.stringify({
    checkedAt: new Date().toISOString(),
    scenarioResults: Array.from({ length: PHASE60_THRESHOLDS.classrooms }, (_, index) => ({
      classroom: `phase60-load-rehearsal-class-${index + 1}`,
      actors: PHASE60_THRESHOLDS.studentsPerClassroom,
      iterations: PHASE60_THRESHOLDS.studentsPerClassroom,
      checksRate: 1,
      httpReqFailedRate: 0,
    })),
    thresholds: PHASE60_THRESHOLDS,
    status: 'dry-run',
    blockingFailure: 'Authoring mode only: dry-run capacity artifacts cannot satisfy the Phase 60 close gate.',
    nextStep: 'Execute host or docker k6 against PHASE60_BASE_URL to replace this authoring artifact with a live capacity result.',
  }, null, 2));

  writeFileSync(drillPath, JSON.stringify({
    checkedAt: new Date().toISOString(),
    drills: {
      redisDegraded: { status: 'dry-run', reason: 'authoring mode', nextStep: 'run live drill' },
      workerBacklog: { status: 'dry-run', reason: 'authoring mode', nextStep: 'run live drill' },
      reconnectRetry: { status: 'dry-run', reason: 'authoring mode', nextStep: 'run live drill' },
      partialFailure: { status: 'dry-run', reason: 'authoring mode', nextStep: 'run live drill' },
    },
    status: 'dry-run',
    blockingFailure: 'Authoring mode only: dry-run drill artifacts cannot satisfy the Phase 60 close gate.',
    manualRequired: { transportFallback: true },
    nextStep: 'Execute host or docker k6 against PHASE60_BASE_URL to replace this authoring artifact with a live drill result.',
  }, null, 2));
}

async function runPhase60SmokeStage() {
  run(process.execPath, [
    '--require',
    './scripts/server-only-node-shim.cjs',
    '--import',
    'tsx',
    'scripts/proof-phase60-load-smoke.ts',
  ], 'Phase 60 sample smoke proof');
}

function runPhase60K6Stage(scriptPath: string, label: string) {
  const invocation = resolvePhase60K6Invocation(scriptPath);
  if (invocation.mode === 'dry-run') {
    ensureDryRunK6Artifacts();
    console.log(`  ~ ${label} skipped in PHASE60_K6_MODE=dry-run.`);
    return;
  }

  run(invocation.command, invocation.args, label, invocation.env);
}

async function runPhase60RehearsalStage() {
  run(process.execPath, [
    '--require',
    './scripts/server-only-node-shim.cjs',
    '--import',
    'tsx',
    'scripts/rehearse-phase60-rollout-rollback.ts',
  ], 'Phase 60 rollout/rollback rehearsal');
}

export async function runPhase60Verification() {
  console.log('==================================================');
  console.log('Starting Phase 60 load/degrade/rehearsal verification...');
  console.log('==================================================');

  const staticChecks = evaluatePhase60StaticChecks({
    packageSource: read('package.json'),
    verifierSource: read('scripts/verify-phase60-load-and-rehearsal.ts'),
    artifactPresence: Object.fromEntries(
      getPhase60RequiredArtifacts().map((artifact) => [artifact, existsSync(path.join(process.cwd(), artifact))]),
    ),
    summarySource: read('ops/releases/evidence/phase60/rehearsal-summary.md'),
  });
  const failedChecks = staticChecks.filter((check) => !check.passed);

  if (failedChecks.length > 0) {
    console.error('  ❌ Static analysis failed with the following gaps:');
    for (const check of failedChecks) {
      console.error(`     - ${check.label}`);
    }
    process.exit(1);
  }

  console.log('  ✓ Static close-gate checks passed.');

  const sharedLocalDbBlocker = getPhase60SharedLocalDbBlocker();
  if (sharedLocalDbBlocker) {
    throw new Error(sharedLocalDbBlocker);
  }

  if (
    process.env.PHASE60_SMOKE_MODE !== 'dry-run'
    && process.env.PHASE60_K6_MODE !== 'dry-run'
    && process.env.PHASE60_REHEARSAL_MODE !== 'dry-run'
  ) {
    const missingEnv = getPhase60MissingLiveEnv();
    if (missingEnv.length > 0) {
      throw new Error(`PHASE60_LIVE_TARGET_ENV_MISSING: ${missingEnv.join(', ')}`);
    }
  }

  console.log('\n[1/6] focused Phase 60 helper suites...');
  runVitest(getPhase60FocusedSuitePaths(), 'Phase 60 focused helper suites');

  console.log('\n[2/6] sample smoke gate...');
  await runPhase60SmokeStage();

  console.log('\n[3/6] capacity gate...');
  runPhase60K6Stage('scripts/load/phase60-capacity.k6.js', 'Phase 60 capacity gate');

  console.log('\n[4/6] automated drill gate...');
  runPhase60K6Stage('scripts/load/phase60-drills.k6.js', 'Phase 60 drill gate');

  console.log('\n[5/6] rollout/rollback rehearsal...');
  await runPhase60RehearsalStage();

  console.log('\n[6/6] summary artifact validation...');
  const summarySource = read('ops/releases/evidence/phase60/rehearsal-summary.md');
  if (!validatePhase60SummarySource(summarySource)) {
    throw new Error('PHASE60_SUMMARY_ARTIFACT_INVALID');
  }

  const smokeResult = readJson<Phase60StageResult>('ops/releases/evidence/phase60/smoke-result.json');
  const capacityResult = readJson<Phase60StageResult>('ops/releases/evidence/phase60/capacity-result.json');
  const drillResult = readJson<Phase60StageResult>('ops/releases/evidence/phase60/drill-results.json');

  assertPhase60LiveResult('smoke', smokeResult);
  assertPhase60LiveResult('capacity', capacityResult);
  assertPhase60LiveResult('drills', drillResult);

  if (summarySource.includes('Mode: `dry-run`')) {
    throw new Error('PHASE60_REHEARSAL_DRY_RUN_NOT_ALLOWED');
  }

  if (summarySource.includes('Verdict: `no-go`')) {
    throw new Error('PHASE60_REHEARSAL_NO_GO');
  }

  console.log('\nPhase 60 verification complete.');
  console.log('==================================================');
  console.log('Phase 60 load/degrade/rehearsal verification successfully PASSED!');
  console.log('==================================================');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  runPhase60Verification().catch((error) => {
    console.error('Unhandled verification error:', error);
    process.exit(1);
  });
}
