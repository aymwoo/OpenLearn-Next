import { spawn, type ChildProcess } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { once } from "node:events";
import { homedir } from "node:os";
import path from "node:path";

export const PHASE60_LOCAL_PROOF_ROOT = "/tmp/opencode/phase60-local-proof";
export const PHASE60_LOCAL_PROOF_DB_PATH = path.join(PHASE60_LOCAL_PROOF_ROOT, "local.db");
export const PHASE60_LOCAL_PROOF_DB_URL = `file:${PHASE60_LOCAL_PROOF_DB_PATH}`;
const PHASE60_LOCAL_PROOF_PORT = 3060;
const LOCAL_ENV_FILE_PATH = path.join(process.cwd(), ".env.local");
const LOCAL_PILOT_HOST_ENV_PATH = path.join(homedir(), ".config", "openlearn", "openlearn.env");
const LOCAL_SYSTEMCTL_WRAPPER_PATH = path.join(process.cwd(), "ops", "deploy", "systemctl-user.sh");
const LOCAL_VERIFICATION_ENV_KEYS = [
  "AUTH_SECRET",
  "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY",
  "ASYNC_TASKS_ENABLED",
  "BULLMQ_REDIS_URL",
  "BULLMQ_PREFIX",
  "REDIS_FANOUT_ENABLED",
  "REDIS_URL",
  "RUNTIME_INSTANCE_ID",
  "WORKER_INSTANCE_ID",
  "DB_FILE_NAME",
  "HOSTNAME",
  "PORT",
  "OPENLEARN_DEPLOY_ENV",
  "OPENLEARN_SHARED_ROOT",
  "OPENLEARN_CURRENT_ROOT",
  "OPENLEARN_RUNTIME_ASSETS_ROOT",
  "OPENLEARN_RELEASE_MANIFESTS_DIR",
  "OPENLEARN_HEALTHCHECK_BASE_URL",
  "OPENLEARN_RELEASE_SCHOOL_ID",
  "OPENLEARN_RELEASE_CLASSROOM_SESSION_ID",
  "OPENLEARN_RELEASE_LESSON_VERSION_ID",
  "OPENLEARN_RELEASE_PLUGIN_ID",
  "OPENLEARN_RELEASE_ACTION_KEY",
  "OPENLEARN_RELEASE_COMMAND_ID",
  "OPENLEARN_RELEASE_TASK_ID",
  "OPENLEARN_SOURCE_NODE_MODULES",
  "NO_PROXY",
  "no_proxy",
] as const;

type ServerHandle = {
  process: ChildProcess;
  url: string;
};

type WorkerHandle = {
  process: ChildProcess;
};

export function appendProofServerStdout(
  stdoutBuffer: string,
  output: string,
  readyMessage: string,
) {
  const nextStdoutBuffer = stdoutBuffer + output;

  return {
    stdoutBuffer: nextStdoutBuffer,
    ready: nextStdoutBuffer.includes(readyMessage),
  };
}

function resolveSqliteFilePath(dbFileName: string) {
  const trimmed = dbFileName.trim();

  if (!trimmed.startsWith("file:")) {
    throw new Error(`PHASE60_LOCAL_VERIFY_REQUIRES_FILE_DB: ${trimmed}`);
  }

  const filePart = trimmed.slice("file:".length);

  if (!filePart) {
    return path.join(process.cwd(), "local.db");
  }

  return path.isAbsolute(filePart) ? filePart : path.join(process.cwd(), filePart);
}

function resetTargetProofFiles(targetDbPath: string) {
  for (const suffix of ["", "-wal", "-shm"]) {
    rmSync(`${targetDbPath}${suffix}`, { force: true });
  }
}

function copySqliteProofFile(sourceDbPath: string, targetDbPath: string) {
  copyFileSync(sourceDbPath, targetDbPath);

  for (const suffix of ["-wal", "-shm"]) {
    const sourceCompanion = `${sourceDbPath}${suffix}`;
    if (existsSync(sourceCompanion)) {
      copyFileSync(sourceCompanion, `${targetDbPath}${suffix}`);
    }
  }
}

function shouldIgnoreCopiedDbMigrationMetadataError(error: unknown) {
  return error instanceof Error && error.message.startsWith("未找到 migration 元数据：");
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readEnvFile(filePath: string) {
  try {
    const source = readFileSync(filePath, "utf8");
    return Object.fromEntries(
      source
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#"))
        .map((line) => {
          const index = line.indexOf("=");
          if (index < 0) {
            return [line, ""];
          }

          return [line.slice(0, index), line.slice(index + 1)];
        }),
    );
  } catch {
    return {};
  }
}

function readReleaseIdFromManifest(filePath: string) {
  try {
    const payload = JSON.parse(readFileSync(filePath, "utf8")) as { releaseId?: string };
    return typeof payload.releaseId === "string" && payload.releaseId.length > 0 ? payload.releaseId : null;
  } catch {
    return null;
  }
}

function resolveLocalRollbackReleaseId(env: Record<string, string | undefined>) {
  const manifestsDir = env.OPENLEARN_RELEASE_MANIFESTS_DIR
    || (env.OPENLEARN_SHARED_ROOT ? path.join(env.OPENLEARN_SHARED_ROOT, "manifests") : null);

  if (!manifestsDir) {
    return null;
  }

  return readReleaseIdFromManifest(path.join(manifestsDir, "green.json"))
    ?? readReleaseIdFromManifest(path.join(manifestsDir, "current.json"));
}

function withLoopbackNoProxy(env: Record<string, string | undefined>) {
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

export async function waitForServerReady(
  child: ChildProcess,
  url: string,
  isReady: () => boolean,
  timeoutMs = 240000,
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (isReady()) {
      return;
    }

    try {
      const response = await fetch(`${url}/api/health`, {
        cache: "no-store",
      });

      if (response.ok) {
        return;
      }
    } catch {
      // Ignore transient startup failures while the proof server boots.
    }

    if (child.exitCode !== null) {
      throw new Error(`PHASE60_LOCAL_PROOF_SERVER_EXITED_BEFORE_READY: ${url} (exit=${child.exitCode})`);
    }

    await delay(250);
  }

  throw new Error(`PHASE60_LOCAL_PROOF_SERVER_TIMEOUT: ${url}`);
}

async function waitForWorkerReady(url: string, timeoutMs = 60000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${url}/api/ready`, {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null) as {
        components?: { worker?: { posture?: string } };
      } | null;

      if (payload?.components?.worker?.posture === "green") {
        return;
      }
    } catch {
      // Ignore transient startup failures while the proof worker heartbeat catches up.
    }

    await delay(1000);
  }

  throw new Error(`PHASE60_LOCAL_PROOF_WORKER_TIMEOUT: ${url}`);
}

function resolveLocalVerificationEnv() {
  const merged = withLoopbackNoProxy({
    ...readEnvFile(LOCAL_ENV_FILE_PATH),
    ...readEnvFile(LOCAL_PILOT_HOST_ENV_PATH),
    ...process.env,
  });

  return Object.fromEntries(
    LOCAL_VERIFICATION_ENV_KEYS
      .map((key) => [key, merged[key]])
      .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0),
  );
}

function hydrateProcessEnv(sourceEnv: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(sourceEnv)) {
    if (value !== undefined) {
      process.env[key] = value;
    }
  }
}

async function startLocalProofServer(baseEnv: Record<string, string | undefined>, port = PHASE60_LOCAL_PROOF_PORT): Promise<ServerHandle> {
  const url = `http://127.0.0.1:${port}`;
  const hasProductionBuild = existsSync(path.join(process.cwd(), ".next", "BUILD_ID"));
  const child = spawn(
    process.execPath,
    [
      "--require",
      "./scripts/server-only-node-shim.cjs",
      "--import",
      "next/dist/server/node-environment.js",
      "--import",
      "tsx",
      "server.ts",
    ],
    {
      cwd: process.cwd(),
      env: {
        ...baseEnv,
        NODE_ENV: hasProductionBuild ? "production" : "development",
        PORT: String(port),
        HOSTNAME: "127.0.0.1",
        DB_FILE_NAME: PHASE60_LOCAL_PROOF_DB_URL,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let ready = false;
  const readyMessage = `> Ready on ${url}`;
  let stdoutBuffer = "";

  child.stdout?.on("data", (chunk) => {
    const output = String(chunk);
    process.stdout.write(output);

    const nextState = appendProofServerStdout(stdoutBuffer, output, readyMessage);
    stdoutBuffer = nextState.stdoutBuffer;
    ready = nextState.ready;
  });
  child.stderr?.on("data", (chunk) => {
    process.stderr.write(String(chunk));
  });

  await waitForServerReady(child, url, () => ready);

  return { process: child, url };
}

async function startLocalProofWorker(baseEnv: Record<string, string | undefined>): Promise<WorkerHandle> {
  const hasProductionBuild = existsSync(path.join(process.cwd(), ".next", "BUILD_ID"));
  const child = spawn(
    process.execPath,
    [
      "--require",
      "./scripts/server-only-node-shim.cjs",
      "--import",
      "next/dist/server/node-environment.js",
      "--import",
      "tsx",
      "src/server/workers/async-task-worker.ts",
    ],
    {
      cwd: process.cwd(),
      env: {
        ...baseEnv,
        NODE_ENV: hasProductionBuild ? "production" : "development",
        DB_FILE_NAME: PHASE60_LOCAL_PROOF_DB_URL,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  child.stdout?.on("data", (chunk) => {
    process.stdout.write(String(chunk));
  });
  child.stderr?.on("data", (chunk) => {
    process.stderr.write(String(chunk));
  });

  return { process: child };
}

async function stopLocalProofServer(handle: ServerHandle | null) {
  if (!handle) return;
  handle.process.kill("SIGTERM");
  await Promise.race([once(handle.process, "exit"), delay(5000)]).catch(() => undefined);
  if (!handle.process.killed) {
    handle.process.kill("SIGKILL");
  }
}

async function stopLocalProofWorker(handle: WorkerHandle | null) {
  if (!handle) return;
  handle.process.kill("SIGTERM");
  await Promise.race([once(handle.process, "exit"), delay(5000)]).catch(() => undefined);
  if (!handle.process.killed) {
    handle.process.kill("SIGKILL");
  }
}

export async function runPhase60LocalVerification() {
  const verificationEnv = resolveLocalVerificationEnv();
  const sourceDbFileName = verificationEnv.DB_FILE_NAME || "file:local.db";
  const sourceDbPath = resolveSqliteFilePath(sourceDbFileName);
  let server: ServerHandle | null = null;
  let worker: WorkerHandle | null = null;

  if (!existsSync(sourceDbPath)) {
    throw new Error(`PHASE60_LOCAL_VERIFY_SOURCE_DB_MISSING: ${sourceDbPath}`);
  }

  mkdirSync(PHASE60_LOCAL_PROOF_ROOT, { recursive: true });
  resetTargetProofFiles(PHASE60_LOCAL_PROOF_DB_PATH);
  copySqliteProofFile(sourceDbPath, PHASE60_LOCAL_PROOF_DB_PATH);

  hydrateProcessEnv(verificationEnv);
  process.env.DB_FILE_NAME = PHASE60_LOCAL_PROOF_DB_URL;
  process.env.PHASE60_LOCAL_PROOF_MODE = "isolated-db";
  process.env.SYSTEMCTL_BIN = LOCAL_SYSTEMCTL_WRAPPER_PATH;

  const rollbackReleaseId = resolveLocalRollbackReleaseId(verificationEnv);
  if (rollbackReleaseId) {
    process.env.PHASE60_REHEARSAL_RELEASE_ID = rollbackReleaseId;
  }

  if (!process.env.PHASE60_FORCE_TRIGGER) {
    process.env.PHASE60_FORCE_TRIGGER = "sample-smoke-regression";
  }

  try {
    server = await startLocalProofServer(verificationEnv);
    process.env.PHASE60_BASE_URL = server.url;
    worker = await startLocalProofWorker(verificationEnv);
    await waitForWorkerReady(server.url);

    const { prepareDevDb } = await import("./prepare-dev-db");
    try {
      await prepareDevDb();
    } catch (error) {
      if (!shouldIgnoreCopiedDbMigrationMetadataError(error)) {
        throw error;
      }

      console.warn(
        "Phase 60 local verification: copied proof DB already contains the required schema, skipping migration metadata bridge because drizzle/meta/_journal.json is missing the detected tag.",
      );
    }

    const { runPhase60Verification } = await import("./verify-phase60-load-and-rehearsal");
    await runPhase60Verification();
  } finally {
    await stopLocalProofWorker(worker);
    await stopLocalProofServer(server);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  runPhase60LocalVerification().catch((error) => {
    console.error("Phase 60 local verification failed:", error);
    process.exit(1);
  });
}
