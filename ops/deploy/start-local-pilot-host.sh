#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
SETUP_SCRIPT="$REPO_ROOT/ops/deploy/setup-local-pilot-host.sh"
SYSTEMCTL_BIN="$REPO_ROOT/ops/deploy/systemctl-user.sh"
ENV_FILE=${OPENLEARN_LOCAL_ENV_FILE:-"${XDG_CONFIG_HOME:-$HOME/.config}/openlearn/openlearn.env"}

bash "$SETUP_SCRIPT"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing local pilot-host env file after setup: $ENV_FILE" >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

export OPENLEARN_SOURCE_NODE_MODULES=${OPENLEARN_SOURCE_NODE_MODULES:-"$REPO_ROOT/node_modules"}
export NO_PROXY=${NO_PROXY:-127.0.0.1,localhost}
export no_proxy=${no_proxy:-127.0.0.1,localhost}

if [[ ! -d "${OPENLEARN_CURRENT_ROOT:-}" ]]; then
  echo "Missing pilot-host release tree: ${OPENLEARN_CURRENT_ROOT:-<unset>}" >&2
  echo "Run the local deploy wrapper first:" >&2
  echo "  bash ops/deploy/deploy-local.sh --environment pilot-single-school-local --actor local-operator --shared-root \"$REPO_ROOT/.local/pilot-host/shared\" --current-root \"$REPO_ROOT/.local/pilot-host/current\" --base-url http://127.0.0.1:3000 --school-id school-1 --classroom-session-id session-1 --lesson-version-id lesson-v1 --plugin-id plugin-voting-proof --action-key launchVote --command-id command-1 --task-id task-1" >&2
  exit 1
fi

bash "$SYSTEMCTL_BIN" daemon-reload
bash "$SYSTEMCTL_BIN" enable openlearn-web.service openlearn-worker.service >/dev/null 2>&1 || true
bash "$SYSTEMCTL_BIN" start openlearn-web.service openlearn-worker.service

printf 'pilot-host started.\n'
printf 'Web: http://127.0.0.1:%s\n' "${PORT:-3000}"
