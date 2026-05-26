#!/usr/bin/env bash
set -euo pipefail

SQLITE_BIN=${SQLITE_BIN:-sqlite3}
CURL_BIN=${CURL_BIN:-curl}
CURL_NOPROXY=${CURL_NOPROXY:-*}

usage() {
  cat <<'EOF'
Usage: bash ops/deploy/verify-restore.sh [options]

Required:
  --db-path <path|file:sqlite-path>
  --base-url <url>

Optional:
  --smoke-command <command>
  --help
EOF
}

DB_PATH=""
BASE_URL=""
SMOKE_COMMAND=${OPENLEARN_RESTORE_SMOKE_COMMAND:-pnpm verify:phase57}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --db-path)
      DB_PATH=${2:-}
      shift 2
      ;;
    --base-url)
      BASE_URL=${2:-}
      shift 2
      ;;
    --smoke-command)
      SMOKE_COMMAND=${2:-}
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$DB_PATH" || -z "$BASE_URL" ]]; then
  echo "Missing required arguments: --db-path and --base-url" >&2
  exit 1
fi

resolve_db_path() {
  local raw=$1
  if [[ "$raw" == file:* ]]; then
    printf '%s\n' "${raw#file:}"
    return
  fi
  printf '%s\n' "$raw"
}

fail_blocker() {
  local step=$1
  local detail=$2
  printf 'RESTORE_BLOCKER [%s] %s\n' "$step" "$detail" >&2
  exit 1
}

DB_FILE_PATH=$(resolve_db_path "$DB_PATH")
if [[ ! -f "$DB_FILE_PATH" ]]; then
  fail_blocker "db" "restored SQLite file not found: $DB_FILE_PATH"
fi

echo "[verify-restore] dbPath=$DB_FILE_PATH"
echo "[verify-restore] baseUrl=$BASE_URL"

INTEGRITY_OUTPUT=$($SQLITE_BIN "$DB_FILE_PATH" "PRAGMA integrity_check;" 2>&1) || fail_blocker "integrity_check" "$INTEGRITY_OUTPUT"
if [[ "$INTEGRITY_OUTPUT" != "ok" ]]; then
  fail_blocker "integrity_check" "$INTEGRITY_OUTPUT"
fi
echo "[verify-restore] integrity_check=ok"

FOREIGN_KEY_OUTPUT=$($SQLITE_BIN "$DB_FILE_PATH" "PRAGMA foreign_key_check;" 2>&1) || fail_blocker "foreign_key_check" "$FOREIGN_KEY_OUTPUT"
if [[ -n "$FOREIGN_KEY_OUTPUT" ]]; then
  fail_blocker "foreign_key_check" "$FOREIGN_KEY_OUTPUT"
fi
echo "[verify-restore] foreign_key_check=ok"

HEALTH_OUTPUT=$($CURL_BIN --noproxy "$CURL_NOPROXY" -fsS "$BASE_URL/api/health" 2>&1) || fail_blocker "health" "$HEALTH_OUTPUT"
echo "[verify-restore] health=$HEALTH_OUTPUT"

READY_OUTPUT=$($CURL_BIN --noproxy "$CURL_NOPROXY" -fsS "$BASE_URL/api/ready" 2>&1) || fail_blocker "ready" "$READY_OUTPUT"
echo "[verify-restore] ready=$READY_OUTPUT"

SMOKE_OUTPUT=$(bash -lc "$SMOKE_COMMAND" 2>&1) || fail_blocker "sample_smoke" "$SMOKE_OUTPUT"
echo "[verify-restore] sample_smoke=$SMOKE_OUTPUT"

echo "[verify-restore] completed"
