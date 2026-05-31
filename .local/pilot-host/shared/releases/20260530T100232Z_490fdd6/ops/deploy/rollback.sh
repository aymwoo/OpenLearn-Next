#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
SYSTEMCTL_BIN=${SYSTEMCTL_BIN:-/usr/bin/systemctl}
CURL_BIN=${CURL_BIN:-/usr/bin/curl}

usage() {
  cat <<'EOF'
Usage: bash ops/deploy/rollback.sh [options]

Required:
  --reason <reason>
  --shared-root <path>
  --current-root <path>
  --base-url <url>

Optional:
  --release-id <id>
  --release-manifests-dir <path>
  --promote-green
  --dry-run
  --help
EOF
}

DRY_RUN=false
PROMOTE_GREEN=false
RELEASE_ID=""
REASON=""
SHARED_ROOT=${OPENLEARN_SHARED_ROOT:-}
CURRENT_ROOT=${OPENLEARN_CURRENT_ROOT:-}
BASE_URL=${OPENLEARN_HEALTHCHECK_BASE_URL:-}
RELEASE_MANIFESTS_DIR=${OPENLEARN_RELEASE_MANIFESTS_DIR:-}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --release-id)
      RELEASE_ID=${2:-}
      shift 2
      ;;
    --reason)
      REASON=${2:-}
      shift 2
      ;;
    --shared-root)
      SHARED_ROOT=${2:-}
      shift 2
      ;;
    --current-root)
      CURRENT_ROOT=${2:-}
      shift 2
      ;;
    --base-url)
      BASE_URL=${2:-}
      shift 2
      ;;
    --release-manifests-dir)
      RELEASE_MANIFESTS_DIR=${2:-}
      shift 2
      ;;
    --promote-green)
      PROMOTE_GREEN=true
      shift
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

required_values=(REASON SHARED_ROOT CURRENT_ROOT BASE_URL)
for name in "${required_values[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required value: $name" >&2
    exit 1
  fi
done

if [[ -z "$RELEASE_MANIFESTS_DIR" ]]; then
  RELEASE_MANIFESTS_DIR="$SHARED_ROOT/manifests"
fi

CURRENT_POINTER="$RELEASE_MANIFESTS_DIR/current.json"
GREEN_POINTER="$RELEASE_MANIFESTS_DIR/green.json"
SELECTED_MANIFEST_PATH=""

log() {
  printf '[rollback] %s\n' "$*"
}

resolve_manifest_path() {
  if [[ -n "$RELEASE_ID" ]]; then
    SELECTED_MANIFEST_PATH="$RELEASE_MANIFESTS_DIR/${RELEASE_ID}.json"
    if [[ -f "$SELECTED_MANIFEST_PATH" ]]; then
      return 0
    fi

    if [[ "$DRY_RUN" == "true" ]]; then
      log "DRY-RUN manifest $SELECTED_MANIFEST_PATH missing; using synthetic manifest for simulation."
      return 0
    fi

    echo "Release manifest not found: $SELECTED_MANIFEST_PATH" >&2
    exit 1
  fi

  if [[ -f "$GREEN_POINTER" ]]; then
    SELECTED_MANIFEST_PATH="$GREEN_POINTER"
    return 0
  fi

  echo "green.json not found and no --release-id was provided." >&2
  exit 1
}

read_manifest_field() {
  local field=$1

  if [[ -f "$SELECTED_MANIFEST_PATH" ]]; then
    python - "$SELECTED_MANIFEST_PATH" "$field" <<'PY'
import json, sys
from pathlib import Path

path = Path(sys.argv[1])
field = sys.argv[2]
data = json.loads(path.read_text())
value = data.get(field)
if value is None:
    print("")
else:
    print(value)
PY
    return
  fi

  case "$field" in
    releaseId)
      printf '%s\n' "$RELEASE_ID"
      ;;
    gitSha)
      printf '%s\n' "$RELEASE_ID"
      ;;
    releaseDir)
      printf '%s\n' "$SHARED_ROOT/releases/$RELEASE_ID"
      ;;
    rollbackTarget)
      printf '\n'
      ;;
    *)
      printf '\n'
      ;;
  esac
}

write_pointer() {
  local destination=$1

  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY-RUN pointer update skipped for $destination"
    return 0
  fi

  if [[ -f "$SELECTED_MANIFEST_PATH" ]]; then
    cp "$SELECTED_MANIFEST_PATH" "$destination"
    return
  fi

  python - "$destination" <<'PY'
import json
import os
import sys
from pathlib import Path

destination = Path(sys.argv[1])
destination.parent.mkdir(parents=True, exist_ok=True)
payload = {
  "releaseId": os.environ["ROLLED_BACK_RELEASE_ID"],
  "gitSha": os.environ["ROLLED_BACK_GIT_SHA"],
  "environment": "dry-run",
  "releasedAt": None,
  "rollbackTarget": os.environ.get("ROLLBACK_TARGET") or None,
  "manifestPath": str(destination),
  "releaseDir": os.environ["ROLLED_BACK_RELEASE_DIR"],
}
destination.write_text(json.dumps(payload, indent=2) + "\n")
PY
}

resolve_manifest_path
ROLLED_BACK_RELEASE_ID=$(read_manifest_field releaseId)
ROLLED_BACK_GIT_SHA=$(read_manifest_field gitSha)
ROLLED_BACK_RELEASE_DIR=$(read_manifest_field releaseDir)
ROLLBACK_TARGET=$(read_manifest_field rollbackTarget)

if [[ -z "$ROLLED_BACK_RELEASE_ID" || -z "$ROLLED_BACK_RELEASE_DIR" || -z "$ROLLED_BACK_GIT_SHA" ]]; then
  echo "Manifest must include releaseId, releaseDir, and gitSha." >&2
  exit 1
fi

export ROLLED_BACK_RELEASE_ID ROLLED_BACK_GIT_SHA ROLLED_BACK_RELEASE_DIR ROLLBACK_TARGET

if [[ "$DRY_RUN" == "true" ]]; then
  log "DRY-RUN repoint current root to $ROLLED_BACK_RELEASE_DIR for release $ROLLED_BACK_RELEASE_ID"
  log "DRY-RUN reason=$REASON"
else
  mkdir -p "$(dirname "$CURRENT_ROOT")"
  ln -sfn "$ROLLED_BACK_RELEASE_DIR" "$CURRENT_ROOT"
fi

if [[ "$DRY_RUN" == "true" ]]; then
  log "DRY-RUN $SYSTEMCTL_BIN daemon-reload"
  log "DRY-RUN $SYSTEMCTL_BIN restart openlearn-web openlearn-worker"
  log "DRY-RUN $CURL_BIN -fsS $BASE_URL/api/health"
  log "DRY-RUN $CURL_BIN -fsS $BASE_URL/api/ready"
else
  "$SYSTEMCTL_BIN" daemon-reload
  "$SYSTEMCTL_BIN" restart openlearn-web openlearn-worker
  "$CURL_BIN" -fsS "$BASE_URL/api/health" >/dev/null
  "$CURL_BIN" -fsS "$BASE_URL/api/ready" >/dev/null
fi

write_pointer "$CURRENT_POINTER"
if [[ "$PROMOTE_GREEN" == "true" || -z "$RELEASE_ID" ]]; then
  write_pointer "$GREEN_POINTER"
fi

log "Rollback completed to $ROLLED_BACK_RELEASE_ID ($ROLLED_BACK_GIT_SHA)."
