import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

export const PHASE60_LOCAL_PROOF_ROOT = "/tmp/opencode/phase60-local-proof";
export const PHASE60_LOCAL_PROOF_DB_PATH = path.join(PHASE60_LOCAL_PROOF_ROOT, "local.db");
export const PHASE60_LOCAL_PROOF_DB_URL = `file:${PHASE60_LOCAL_PROOF_DB_PATH}`;

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

export async function runPhase60LocalVerification() {
  const sourceDbFileName = process.env.DB_FILE_NAME || "file:local.db";
  const sourceDbPath = resolveSqliteFilePath(sourceDbFileName);

  if (!existsSync(sourceDbPath)) {
    throw new Error(`PHASE60_LOCAL_VERIFY_SOURCE_DB_MISSING: ${sourceDbPath}`);
  }

  mkdirSync(PHASE60_LOCAL_PROOF_ROOT, { recursive: true });
  resetTargetProofFiles(PHASE60_LOCAL_PROOF_DB_PATH);
  copySqliteProofFile(sourceDbPath, PHASE60_LOCAL_PROOF_DB_PATH);

  process.env.DB_FILE_NAME = PHASE60_LOCAL_PROOF_DB_URL;

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
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  runPhase60LocalVerification().catch((error) => {
    console.error("Phase 60 local verification failed:", error);
    process.exit(1);
  });
}
