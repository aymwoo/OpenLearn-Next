// Zero-runtime-DDL static gate (DATA-02 static face).
//
// Proves that no runtime code path executes physical DDL (CREATE/ALTER/DROP TABLE,
// CREATE [UNIQUE] INDEX, or interpolated `sql`CREATE ...`` template DDL) anywhere
// outside the only two legitimate DDL homes:
//   whitelist = drizzle/**  +  src/db/schema/generated/**
//
// [Plan-Check #2 deviation note] D-08 literally calls for ripgrep; this gate uses
// node:fs recursion instead to stay zero-dependency / CI-stable, and scans a SUPERSET
// of the D-08 directory list (adds scripts/** + plugins/**) — strictly stricter, not
// weaker. Documented here so later audits do not misread the divergence.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();
const SCAN_ROOTS = ["src", "scripts", "plugins"] as const;
const SKIP_DIR_NAMES = new Set(["node_modules", ".next", "dist", ".git"]);
// The only two legitimate DDL homes (posix-normalized prefixes, relative to repo root).
const WHITELIST_PREFIXES = ["drizzle/", "src/db/schema/generated/"] as const;
// Narrow, documented file-level exemptions (sanctioned migration tooling, NOT app/plugin
// request-path runtime). Kept as an explicit auditable allowlist rather than a broadened
// regex so the divergence stays visible:
//   scripts/prepare-dev-db.ts — the db:migrate applier; bootstraps drizzle's own
//   `__drizzle_migrations` ledger table. This is part of the sanctioned drizzle migration
//   path (the same conceptual home as drizzle/**), not plugin-owned data DDL.
const EXEMPT_FILES = new Set<string>(["scripts/prepare-dev-db.ts"]);
const SELF_BASENAME = "gate-no-runtime-ddl.ts";

/** Strips `// ...` line comments so commented examples never count as violations. */
function withoutLineComments(source: string): string {
  return source
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

/** Posix-normalized path relative to the repo root (cross-platform separator). */
function toPosixRelative(absolutePath: string): string {
  return path.relative(REPO_ROOT, absolutePath).split(path.sep).join("/");
}

function isWhitelisted(relativePosixPath: string): boolean {
  return WHITELIST_PREFIXES.some((prefix) => relativePosixPath.startsWith(prefix));
}

function shouldScanFile(relativePosixPath: string): boolean {
  if (isWhitelisted(relativePosixPath)) return false;
  if (EXEMPT_FILES.has(relativePosixPath)) return false;
  if (relativePosixPath.endsWith(`/${SELF_BASENAME}`) || relativePosixPath.endsWith(SELF_BASENAME)) return false;
  if (relativePosixPath.endsWith(".test.ts") || relativePosixPath.endsWith(".test.tsx")) return false;
  if (relativePosixPath.endsWith(".md")) return false;
  return relativePosixPath.endsWith(".ts") || relativePosixPath.endsWith(".tsx");
}

function collectFiles(absoluteDir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(absoluteDir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const absolute = path.join(absoluteDir, entry);
    let stats: ReturnType<typeof statSync>;
    try {
      stats = statSync(absolute);
    } catch {
      continue;
    }
    if (stats.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry)) continue;
      const relDir = toPosixRelative(absolute);
      if (isWhitelisted(`${relDir}/`)) continue;
      collectFiles(absolute, out);
    } else if (stats.isFile()) {
      out.push(absolute);
    }
  }
}

type Violation = { file: string; line: number; snippet: string };

// Narrow physical-DDL signatures (executable SQL string literals).
const DDL_TABLE_RE = /\b(CREATE|ALTER|DROP)\s+TABLE\b/i;
const DDL_INDEX_RE = /\bCREATE\s+(UNIQUE\s+)?INDEX\b/i;
// [Plan-Check #1 hardening] Broad interpolation guard: a single de-commented line that
// holds a standalone CREATE/ALTER/DROP keyword AND a backtick template literal is treated
// as suspected runtime DDL — catches `sql`CREATE ` + name + ` (...)`` interpolation splices
// that the adjacent-`\s+TABLE` regex would slip past.
const DDL_KEYWORD_RE = /\b(CREATE|ALTER|DROP)\b/i;
// Execution-channel signals: literal DDL only counts as a *runtime* violation when it is
// actually handed to an executor. This keeps detection/deny-list regex literals (e.g.
// FORBIDDEN_MARKERS `/drop table/i`) — which DETECT DDL rather than run it — out of scope.
const EXECUTION_CHANNEL_RE = /(\.execute\(|\.run\(|\.exec\(|sql\.raw\(|client\.execute|db\.run)/i;

function scanFile(absolutePath: string): Violation[] {
  const relative = toPosixRelative(absolutePath);
  const cleaned = withoutLineComments(readFileSync(absolutePath, "utf8"));
  const lines = cleaned.split("\n");
  const violations: Violation[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hasBacktick = line.includes("`");
    const hasExecutionChannel = EXECUTION_CHANNEL_RE.test(line);
    // Interpolated template DDL (`...CREATE...`) signals build-and-run intent on its own.
    const interpolatedDdl = DDL_KEYWORD_RE.test(line) && hasBacktick;
    // Literal DDL string only violates when it co-occurs with an execution channel.
    const executedLiteralDdl =
      (DDL_TABLE_RE.test(line) || DDL_INDEX_RE.test(line)) && hasExecutionChannel;
    if (interpolatedDdl || executedLiteralDdl) {
      violations.push({ file: relative, line: i + 1, snippet: line.trim().slice(0, 160) });
    }
  }
  return violations;
}

function main(): void {
  const files: string[] = [];
  for (const root of SCAN_ROOTS) {
    collectFiles(path.join(REPO_ROOT, root), files);
  }

  const scannable = files.map(toPosixRelative).filter(shouldScanFile);
  const violations: Violation[] = [];
  for (const relative of scannable) {
    violations.push(...scanFile(path.join(REPO_ROOT, relative)));
  }

  if (violations.length > 0) {
    console.error("zero-runtime-DDL gate: FAIL — physical DDL found outside whitelist");
    console.error("whitelist = drizzle/**, src/db/schema/generated/**");
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line}  ${v.snippet}`);
    }
    process.exit(1);
  }

  console.log(
    `zero-runtime-DDL gate: PASS (scanned ${scannable.length} files, whitelist=drizzle/**, src/db/schema/generated/**)`,
  );
  process.exit(0);
}

main();
