#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: bash ops/deploy/restore.sh [options]

Required:
  --backup-dir <path>
  --restore-root <path>

Optional:
  --db-path <path|file:sqlite-path>
  --runtime-assets-root <path>
  --dry-run
  --help
EOF
}

BACKUP_DIR=""
RESTORE_ROOT=""
DB_PATH=""
RUNTIME_ASSETS_ROOT=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --backup-dir)
      BACKUP_DIR=${2:-}
      shift 2
      ;;
    --restore-root)
      RESTORE_ROOT=${2:-}
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

if [[ -z "$BACKUP_DIR" || -z "$RESTORE_ROOT" ]]; then
  echo "Missing required arguments: --backup-dir and --restore-root" >&2
  exit 1
fi

MANIFEST_PATH="$BACKUP_DIR/backup-manifest.json"
if [[ ! -f "$MANIFEST_PATH" ]]; then
  echo "backup-manifest.json not found: $MANIFEST_PATH" >&2
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

read_manifest_field() {
  local field_name=$1
  python - "$MANIFEST_PATH" "$field_name" <<'PY'
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

resolve_manifest_path() {
  local value=$1
  if [[ "$value" = /* ]]; then
    printf '%s\n' "$value"
  else
    printf '%s\n' "$BACKUP_DIR/$value"
  fi
}

mkdir -p "$RESTORE_ROOT"

MANIFEST_BACKUP_ID=$(read_manifest_field "backupId")
SNAPSHOT_PATH=$(resolve_manifest_path "$(read_manifest_field "dbSnapshot")")
ASSETS_ARCHIVE_PATH=$(resolve_manifest_path "$(read_manifest_field "assetsArchive")")
ENV_TEMPLATE_SOURCE=$(resolve_manifest_path "$(read_manifest_field "envTemplate")")

if [[ -z "$DB_PATH" ]]; then
  DB_PATH="$RESTORE_ROOT/local.db"
fi
if [[ -z "$RUNTIME_ASSETS_ROOT" ]]; then
  RUNTIME_ASSETS_ROOT="$RESTORE_ROOT/runtime-assets"
fi

RESTORE_DB_PATH=$(resolve_db_path "$DB_PATH")
RESTORED_ENV_TEMPLATE="$RESTORE_ROOT/env.template"

for required_file in "$SNAPSHOT_PATH" "$ASSETS_ARCHIVE_PATH" "$ENV_TEMPLATE_SOURCE"; do
  if [[ ! -f "$required_file" ]]; then
    echo "Manifest referenced file is missing: $required_file" >&2
    exit 1
  fi
done

echo "[restore] backupId=$MANIFEST_BACKUP_ID"
echo "[restore] restoreRoot=$RESTORE_ROOT"
echo "[restore] dbPath=$RESTORE_DB_PATH"
echo "[restore] runtimeAssetsRoot=$RUNTIME_ASSETS_ROOT"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[restore] DRY-RUN copy $SNAPSHOT_PATH -> $RESTORE_DB_PATH"
  echo "[restore] DRY-RUN extract $ASSETS_ARCHIVE_PATH -> $RUNTIME_ASSETS_ROOT"
  echo "[restore] DRY-RUN copy env template -> $RESTORED_ENV_TEMPLATE"
  exit 0
fi

mkdir -p "$(dirname "$RESTORE_DB_PATH")"
cp "$SNAPSHOT_PATH" "$RESTORE_DB_PATH"

rm -rf "$RUNTIME_ASSETS_ROOT"
mkdir -p "$RUNTIME_ASSETS_ROOT"
tar -xzf "$ASSETS_ARCHIVE_PATH" -C "$RUNTIME_ASSETS_ROOT"

cp "$ENV_TEMPLATE_SOURCE" "$RESTORED_ENV_TEMPLATE"

echo "[restore] restored env template at $RESTORED_ENV_TEMPLATE"
echo "[restore] completed"
