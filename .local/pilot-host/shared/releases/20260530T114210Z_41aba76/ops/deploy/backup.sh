#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
SQLITE_BIN=${SQLITE_BIN:-sqlite3}
TAR_BIN=${TAR_BIN:-tar}

usage() {
  cat <<'EOF'
Usage: bash ops/deploy/backup.sh [options]

Required:
  --backup-dir <path>

Optional:
  --db-path <path|file:sqlite-path>
  --runtime-assets-root <path>
  --dry-run
  --help
EOF
}

BACKUP_DIR=""
DB_PATH=${DB_FILE_NAME:-file:local.db}
RUNTIME_ASSETS_ROOT=${OPENLEARN_RUNTIME_ASSETS_ROOT:-./runtime-assets}
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --backup-dir)
      BACKUP_DIR=${2:-}
      shift 2
      ;;
    --db-path)
      DB_PATH=${2:-}
      shift 2
      ;;
    --runtime-assets-root)
      RUNTIME_ASSETS_ROOT=${2:-}
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
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

if [[ -z "$BACKUP_DIR" ]]; then
  echo "Missing required argument: --backup-dir" >&2
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

escape_sqlite_literal() {
  python -c 'import sys; print(sys.argv[1].replace("\'"'"'", "\'"'"'\'"'"'"), end="")' "$1"
}

read_release_field() {
  local pointer_path=$1
  local field_name=$2

  if [[ ! -f "$pointer_path" ]]; then
    return
  fi

  python - "$pointer_path" "$field_name" <<'PY'
import json, sys
from pathlib import Path

payload = json.loads(Path(sys.argv[1]).read_text())
value = payload.get(sys.argv[2])
if value is None:
    print("")
else:
    print(value)
PY
}

pick_env_template() {
  local shared_root=${OPENLEARN_SHARED_ROOT:-}
  local candidates=()

  if [[ -n "$shared_root" ]]; then
    candidates+=("$shared_root/shared/.env.template")
    candidates+=("$shared_root/.env.template")
  fi
  candidates+=("$REPO_ROOT/.env.example")

  local candidate
  for candidate in "${candidates[@]}"; do
    if [[ -f "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  return 1
}

LIVE_DB_PATH=$(resolve_db_path "$DB_PATH")
if [[ ! -f "$LIVE_DB_PATH" ]]; then
  echo "SQLite truth file not found: $LIVE_DB_PATH" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

GIT_SHA=$(git -C "$REPO_ROOT" rev-parse --short HEAD)
BACKUP_ID="$(date -u +%Y%m%dT%H%M%SZ)_${GIT_SHA}"
CREATED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
SNAPSHOT_DB="$BACKUP_DIR/${BACKUP_ID}-sqlite.sqlite"
ASSETS_ARCHIVE="$BACKUP_DIR/${BACKUP_ID}-runtime-assets.tar.gz"
ENV_TEMPLATE_PATH="$BACKUP_DIR/${BACKUP_ID}-env.template"
MANIFEST_PATH="$BACKUP_DIR/backup-manifest.json"
SOURCE_RELEASE_ID="workspace-${GIT_SHA}"

if [[ -n "${OPENLEARN_RELEASE_MANIFESTS_DIR:-}" ]]; then
  CURRENT_POINTER_PATH="$OPENLEARN_RELEASE_MANIFESTS_DIR/current.json"
  CURRENT_RELEASE_ID=$(read_release_field "$CURRENT_POINTER_PATH" "releaseId" || true)
  if [[ -n "$CURRENT_RELEASE_ID" ]]; then
    SOURCE_RELEASE_ID="$CURRENT_RELEASE_ID"
  fi
fi

TEMPLATE_SOURCE=$(pick_env_template || true)
if [[ -z "$TEMPLATE_SOURCE" ]]; then
  echo "No env template source found (.env.example or shared/.env.template)." >&2
  exit 1
fi

echo "[backup] backupId=$BACKUP_ID"
echo "[backup] liveDbPath=$LIVE_DB_PATH"
echo "[backup] runtimeAssetsRoot=$RUNTIME_ASSETS_ROOT"
echo "[backup] envTemplateSource=$TEMPLATE_SOURCE"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[backup] DRY-RUN sqlite3 \"$LIVE_DB_PATH\" \"VACUUM INTO '$(escape_sqlite_literal "$SNAPSHOT_DB")'\""
  echo "[backup] DRY-RUN archive runtime assets into $ASSETS_ARCHIVE"
  echo "[backup] DRY-RUN copy env template into $ENV_TEMPLATE_PATH"
else
  SQLITE_TARGET_LITERAL=$(escape_sqlite_literal "$SNAPSHOT_DB")
  "$SQLITE_BIN" "$LIVE_DB_PATH" "VACUUM INTO '$SQLITE_TARGET_LITERAL'"

  if [[ -d "$RUNTIME_ASSETS_ROOT" ]]; then
    "$TAR_BIN" -czf "$ASSETS_ARCHIVE" -C "$RUNTIME_ASSETS_ROOT" .
  else
    EMPTY_ROOT=$(mktemp -d)
    trap 'rm -rf "$EMPTY_ROOT"' EXIT
    "$TAR_BIN" -czf "$ASSETS_ARCHIVE" -C "$EMPTY_ROOT" .
  fi

  cp "$TEMPLATE_SOURCE" "$ENV_TEMPLATE_PATH"
fi

python - "$MANIFEST_PATH" "$BACKUP_ID" "$CREATED_AT" "$SNAPSHOT_DB" "$ASSETS_ARCHIVE" "$ENV_TEMPLATE_PATH" "$SOURCE_RELEASE_ID" "$GIT_SHA" <<'PY'
import json, sys
from pathlib import Path

manifest = {
    "backupId": sys.argv[2],
    "createdAt": sys.argv[3],
    "dbSnapshot": sys.argv[4],
    "assetsArchive": sys.argv[5],
    "envTemplate": sys.argv[6],
    "sourceReleaseId": sys.argv[7],
    "gitSha": sys.argv[8],
}

Path(sys.argv[1]).write_text(json.dumps(manifest, indent=2) + "\n")
PY

echo "[backup] manifest=$MANIFEST_PATH"
echo "[backup] completed"
