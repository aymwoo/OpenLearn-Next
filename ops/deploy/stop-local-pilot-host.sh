#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
SYSTEMCTL_BIN="$REPO_ROOT/ops/deploy/systemctl-user.sh"

bash "$SYSTEMCTL_BIN" stop openlearn-web.service openlearn-worker.service

printf 'pilot-host stopped.\n'
