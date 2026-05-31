#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
ENV_FILE=${OPENLEARN_LOCAL_ENV_FILE:-"${XDG_CONFIG_HOME:-$HOME/.config}/openlearn/openlearn.env"}

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing local pilot-host env file: $ENV_FILE" >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

SYSTEMCTL_BIN="$REPO_ROOT/ops/deploy/systemctl-user.sh" bash "$REPO_ROOT/ops/deploy/rollback.sh" "$@"
