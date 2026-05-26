#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
SYSTEMCTL_BIN=${SYSTEMCTL_BIN:-/usr/bin/systemctl}
CURL_BIN=${CURL_BIN:-/usr/bin/curl}
ROLLBACK_SCRIPT="$SCRIPT_DIR/rollback.sh"

usage() {
  cat <<'EOF'
Usage: bash ops/deploy/deploy.sh [options]

Required:
  --environment <name>
  --actor <name>
  --shared-root <path>
  --current-root <path>
  --base-url <url>
  --school-id <id>
  --classroom-session-id <id>
  --lesson-version-id <id>
  --plugin-id <id>
  --action-key <key>
  --command-id <id>
  --task-id <id>

Optional:
  --release-manifests-dir <path>
  --dry-run
  --help
EOF
}

DRY_RUN=false
ENVIRONMENT=${OPENLEARN_DEPLOY_ENV:-}
ACTOR=${OPENLEARN_RELEASE_ACTOR:-}
SHARED_ROOT=${OPENLEARN_SHARED_ROOT:-}
CURRENT_ROOT=${OPENLEARN_CURRENT_ROOT:-}
BASE_URL=${OPENLEARN_HEALTHCHECK_BASE_URL:-}
RELEASE_MANIFESTS_DIR=${OPENLEARN_RELEASE_MANIFESTS_DIR:-}
SCHOOL_ID=${OPENLEARN_RELEASE_SCHOOL_ID:-}
CLASSROOM_SESSION_ID=${OPENLEARN_RELEASE_CLASSROOM_SESSION_ID:-}
LESSON_VERSION_ID=${OPENLEARN_RELEASE_LESSON_VERSION_ID:-}
PLUGIN_ID=${OPENLEARN_RELEASE_PLUGIN_ID:-}
ACTION_KEY=${OPENLEARN_RELEASE_ACTION_KEY:-}
COMMAND_ID=${OPENLEARN_RELEASE_COMMAND_ID:-}
TASK_ID=${OPENLEARN_RELEASE_TASK_ID:-}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --environment)
      ENVIRONMENT=${2:-}
      shift 2
      ;;
    --actor)
      ACTOR=${2:-}
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
    --school-id)
      SCHOOL_ID=${2:-}
      shift 2
      ;;
    --classroom-session-id)
      CLASSROOM_SESSION_ID=${2:-}
      shift 2
      ;;
    --lesson-version-id)
      LESSON_VERSION_ID=${2:-}
      shift 2
      ;;
    --plugin-id)
      PLUGIN_ID=${2:-}
      shift 2
      ;;
    --action-key)
      ACTION_KEY=${2:-}
      shift 2
      ;;
    --command-id)
      COMMAND_ID=${2:-}
      shift 2
      ;;
    --task-id)
      TASK_ID=${2:-}
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

required_values=(
  ENVIRONMENT
  ACTOR
  SHARED_ROOT
  CURRENT_ROOT
  BASE_URL
  SCHOOL_ID
  CLASSROOM_SESSION_ID
  LESSON_VERSION_ID
  PLUGIN_ID
  ACTION_KEY
  COMMAND_ID
  TASK_ID
)

for name in "${required_values[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required value: $name" >&2
    exit 1
  fi
done

if [[ -z "$RELEASE_MANIFESTS_DIR" ]]; then
  RELEASE_MANIFESTS_DIR="$SHARED_ROOT/manifests"
fi

RELEASES_DIR="$SHARED_ROOT/releases"
CURRENT_POINTER="$RELEASE_MANIFESTS_DIR/current.json"
GREEN_POINTER="$RELEASE_MANIFESTS_DIR/green.json"
GIT_SHA=$(git -C "$REPO_ROOT" rev-parse --short HEAD)
RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)_${GIT_SHA}"
RELEASE_DIR="$RELEASES_DIR/$RELEASE_ID"
MANIFEST_PATH="$RELEASE_MANIFESTS_DIR/${RELEASE_ID}.json"
PREVIOUS_GREEN_RELEASE_ID=""
PREVIOUS_GREEN_MANIFEST_PATH=""
ROLLBACK_REASON="migration_or_ready_failed"
RELEASED_AT=""

declare -A GATE_STATUSES=(
  [lint]="pending"
  [typecheck]="pending"
  [test]="pending"
  [build]="pending"
  [migrate]="pending"
  [verifyPhase57]="pending"
  [verifyPhase58]="pending"
  [verifyPhase59]="pending"
  [health]="pending"
  [ready]="pending"
)

log() {
  printf '[deploy] %s\n' "$*"
}

run_step() {
  local label=$1
  shift

  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY-RUN $label :: $*"
    GATE_STATUSES[$label]="dry-run"
    return 0
  fi

  log "RUN $label :: $*"
  if "$@"; then
    GATE_STATUSES[$label]="passed"
    return 0
  fi

  GATE_STATUSES[$label]="failed"
  return 1
}

copy_release_tree() {
  mkdir -p "$RELEASE_DIR"

  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY-RUN copy current git worktree into $RELEASE_DIR"
    return 0
  fi

  tar \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='local.db' \
    -cf - -C "$REPO_ROOT" . | tar -xf - -C "$RELEASE_DIR"
}

load_previous_green() {
  if [[ -f "$GREEN_POINTER" ]]; then
    PREVIOUS_GREEN_RELEASE_ID=$(python - "$GREEN_POINTER" <<'PY'
import json, sys
from pathlib import Path
data = json.loads(Path(sys.argv[1]).read_text())
print(data.get("releaseId", ""))
PY
)
    PREVIOUS_GREEN_MANIFEST_PATH=$(python - "$GREEN_POINTER" <<'PY'
import json, sys
from pathlib import Path
data = json.loads(Path(sys.argv[1]).read_text())
print(data.get("manifestPath", ""))
PY
)
  fi
}

sync_manifest_env() {
  if [[ -z "$RELEASED_AT" ]]; then
    RELEASED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  fi

  export RELEASE_ID GIT_SHA ENVIRONMENT ACTOR RELEASE_DIR SCHOOL_ID CLASSROOM_SESSION_ID \
    LESSON_VERSION_ID PLUGIN_ID ACTION_KEY COMMAND_ID TASK_ID PREVIOUS_GREEN_RELEASE_ID RELEASED_AT
  export GATE_LINT=${GATE_STATUSES[lint]}
  export GATE_TYPECHECK=${GATE_STATUSES[typecheck]}
  export GATE_TEST=${GATE_STATUSES[test]}
  export GATE_BUILD=${GATE_STATUSES[build]}
  export GATE_MIGRATE=${GATE_STATUSES[migrate]}
  export GATE_VERIFY57=${GATE_STATUSES[verifyPhase57]}
  export GATE_VERIFY58=${GATE_STATUSES[verifyPhase58]}
  export GATE_VERIFY59=${GATE_STATUSES[verifyPhase59]}
  export GATE_HEALTH=${GATE_STATUSES[health]}
  export GATE_READY=${GATE_STATUSES[ready]}
}

write_manifest() {
  mkdir -p "$RELEASE_MANIFESTS_DIR"

  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY-RUN manifest write skipped for $MANIFEST_PATH"
    return 0
  fi

  python - "$MANIFEST_PATH" <<'PY'
import json
import os
import sys
from pathlib import Path

manifest_path = Path(sys.argv[1])
gates = {
  "lint": os.environ["GATE_LINT"],
  "typecheck": os.environ["GATE_TYPECHECK"],
  "test": os.environ["GATE_TEST"],
  "build": os.environ["GATE_BUILD"],
  "migrate": os.environ["GATE_MIGRATE"],
  "verifyPhase57": os.environ["GATE_VERIFY57"],
  "verifyPhase58": os.environ["GATE_VERIFY58"],
  "verifyPhase59": os.environ["GATE_VERIFY59"],
  "health": os.environ["GATE_HEALTH"],
  "ready": os.environ["GATE_READY"],
}

manifest = {
  "releaseId": os.environ["RELEASE_ID"],
  "gitSha": os.environ["GIT_SHA"],
  "environment": os.environ["ENVIRONMENT"],
  "actor": os.environ["ACTOR"],
  "releaseDir": os.environ["RELEASE_DIR"],
  "manifestPath": str(manifest_path),
  "migration": {
    "command": "pnpm db:migrate",
    "status": os.environ["GATE_MIGRATE"],
  },
  "migrations": {
    "command": "pnpm db:migrate",
    "status": os.environ["GATE_MIGRATE"],
  },
  "gates": gates,
  "releasedAt": os.environ["RELEASED_AT"],
  "rollbackTarget": os.environ.get("PREVIOUS_GREEN_RELEASE_ID") or None,
  "systemdUnits": ["openlearn-web", "openlearn-worker"],
  "restoreDrill": {
    "status": "not_run",
    "nextStep": "Run ops/deploy/verify-restore.sh after Phase 59-05 lands the restore baseline.",
  },
  "operatorCorrelation": {
    "schoolId": {"id": os.environ["SCHOOL_ID"], "href": None, "hrefTemplate": None},
    "classroomSessionId": {
      "id": os.environ["CLASSROOM_SESSION_ID"],
      "href": f"/settings/labs/incidents/{os.environ['CLASSROOM_SESSION_ID']}",
      "hrefTemplate": "/settings/labs/incidents/[sessionId]",
    },
    "lessonVersionId": {"id": os.environ["LESSON_VERSION_ID"], "href": None, "hrefTemplate": None},
    "pluginId": {
      "id": os.environ["PLUGIN_ID"],
      "href": f"/settings/labs/plugins/{os.environ['PLUGIN_ID']}",
      "hrefTemplate": "/settings/labs/plugins/[pluginId]",
    },
    "actionKey": {
      "id": os.environ["ACTION_KEY"],
      "href": f"/settings/labs/plugins/{os.environ['PLUGIN_ID']}/actions/{os.environ['ACTION_KEY']}",
      "hrefTemplate": "/settings/labs/plugins/[pluginId]/actions/[actionKey]",
    },
    "commandId": {
      "id": os.environ["COMMAND_ID"],
      "href": f"/settings/labs/commands/{os.environ['COMMAND_ID']}",
      "hrefTemplate": "/settings/labs/commands/[commandId]",
    },
    "taskId": {
      "id": os.environ["TASK_ID"],
      "href": f"/settings/labs/async-tasks/{os.environ['TASK_ID']}",
      "hrefTemplate": "/settings/labs/async-tasks/[taskId]",
    },
    "runtimeInspector": {
      "href": f"/settings/labs/runtime-inspector?runtimeSessionId={os.environ['CLASSROOM_SESSION_ID']}",
      "hrefTemplate": "/settings/labs/runtime-inspector?runtimeSessionId={classroomSessionId}",
    },
    "pluginActionDetail": {
      "href": f"/settings/labs/plugins/{os.environ['PLUGIN_ID']}/actions/{os.environ['ACTION_KEY']}",
      "hrefTemplate": "/settings/labs/plugins/[pluginId]/actions/[actionKey]",
    },
  },
}

manifest_path.parent.mkdir(parents=True, exist_ok=True)
manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
PY
}

write_pointer_from_manifest() {
  local destination=$1
  mkdir -p "$(dirname "$destination")"

  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY-RUN pointer update skipped for $destination"
    return 0
  fi

  cp "$MANIFEST_PATH" "$destination"
}

reset_current_to_previous_green() {
  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY-RUN current pointer rewind skipped"
    return 0
  fi

  if [[ -n "$PREVIOUS_GREEN_MANIFEST_PATH" && -f "$PREVIOUS_GREEN_MANIFEST_PATH" ]]; then
    cp "$PREVIOUS_GREEN_MANIFEST_PATH" "$CURRENT_POINTER"
  elif [[ -f "$GREEN_POINTER" ]]; then
    cp "$GREEN_POINTER" "$CURRENT_POINTER"
  else
    rm -f "$CURRENT_POINTER"
  fi
}

trigger_failure_rollback() {
  sync_manifest_env
  write_manifest

  if [[ -z "$PREVIOUS_GREEN_RELEASE_ID" ]]; then
    log "No previous green release available; current.json will be cleared."
    reset_current_to_previous_green
    return 1
  fi

  log "Triggering rollback to previous green release $PREVIOUS_GREEN_RELEASE_ID"
  if [[ "$DRY_RUN" == "true" ]]; then
    bash "$ROLLBACK_SCRIPT" \
      --dry-run \
      --release-id "$PREVIOUS_GREEN_RELEASE_ID" \
      --reason "$ROLLBACK_REASON" \
      --shared-root "$SHARED_ROOT" \
      --current-root "$CURRENT_ROOT" \
      --base-url "$BASE_URL"
  else
    bash "$ROLLBACK_SCRIPT" \
      --release-id "$PREVIOUS_GREEN_RELEASE_ID" \
      --reason "$ROLLBACK_REASON" \
      --shared-root "$SHARED_ROOT" \
      --current-root "$CURRENT_ROOT" \
      --base-url "$BASE_URL"
  fi

  reset_current_to_previous_green
  return 1
}

mkdir -p "$SHARED_ROOT" "$RELEASES_DIR" "$RELEASE_MANIFESTS_DIR"
load_previous_green
copy_release_tree

run_step lint bash -lc "cd \"$RELEASE_DIR\" && pnpm lint" || trigger_failure_rollback
run_step typecheck bash -lc "cd \"$RELEASE_DIR\" && pnpm typecheck" || trigger_failure_rollback
run_step test bash -lc "cd \"$RELEASE_DIR\" && pnpm test --run" || trigger_failure_rollback
run_step build bash -lc "cd \"$RELEASE_DIR\" && pnpm build" || trigger_failure_rollback
run_step migrate bash -lc "cd \"$RELEASE_DIR\" && pnpm db:migrate" || trigger_failure_rollback
run_step verifyPhase57 bash -lc "cd \"$RELEASE_DIR\" && pnpm verify:phase57" || trigger_failure_rollback
run_step verifyPhase58 bash -lc "cd \"$RELEASE_DIR\" && pnpm verify:phase58" || trigger_failure_rollback
run_step verifyPhase59 bash -lc "cd \"$RELEASE_DIR\" && pnpm verify:phase59" || trigger_failure_rollback

if [[ "$DRY_RUN" == "true" ]]; then
  log "DRY-RUN switch current symlink to $RELEASE_DIR"
else
  mkdir -p "$(dirname "$CURRENT_ROOT")"
  ln -sfn "$RELEASE_DIR" "$CURRENT_ROOT"
fi

if [[ "$DRY_RUN" == "true" ]]; then
  log "DRY-RUN $SYSTEMCTL_BIN daemon-reload"
  log "DRY-RUN $SYSTEMCTL_BIN restart openlearn-web openlearn-worker"
else
  "$SYSTEMCTL_BIN" daemon-reload
  "$SYSTEMCTL_BIN" restart openlearn-web openlearn-worker
fi

run_step health "$CURL_BIN" -fsS "$BASE_URL/api/health" >/dev/null || trigger_failure_rollback
run_step ready "$CURL_BIN" -fsS "$BASE_URL/api/ready" >/dev/null || trigger_failure_rollback

sync_manifest_env
write_manifest
write_pointer_from_manifest "$CURRENT_POINTER"
write_pointer_from_manifest "$GREEN_POINTER"

log "Release $RELEASE_ID completed. Manifest: $MANIFEST_PATH"
