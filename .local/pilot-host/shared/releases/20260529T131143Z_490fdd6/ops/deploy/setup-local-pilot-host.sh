#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
LOCAL_ROOT=${OPENLEARN_LOCAL_PILOT_HOST_ROOT:-"$REPO_ROOT/.local/pilot-host"}
SYSTEMD_USER_DIR=${XDG_CONFIG_HOME:-"$HOME/.config"}/systemd/user
OPENLEARN_USER_CONFIG_DIR=${XDG_CONFIG_HOME:-"$HOME/.config"}/openlearn
ENV_FILE="$OPENLEARN_USER_CONFIG_DIR/openlearn.env"
NODE_MODULES_PATH="$REPO_ROOT/node_modules"

mkdir -p "$LOCAL_ROOT/shared/releases" "$LOCAL_ROOT/shared/data" "$LOCAL_ROOT/runtime-assets" "$LOCAL_ROOT/manifests"
mkdir -p "$SYSTEMD_USER_DIR" "$OPENLEARN_USER_CONFIG_DIR"

cat > "$ENV_FILE" <<EOF
NODE_ENV=production
HOSTNAME=127.0.0.1
PORT=3000
DB_FILE_NAME=file:$LOCAL_ROOT/shared/data/local.db
AUTH_SECRET=${AUTH_SECRET:-WNo37IsRF1c+NmBzTKT/zZRylmqc5jCMXmYR/3pNjYMg}
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=${NEXT_SERVER_ACTIONS_ENCRYPTION_KEY:-ci-server-actions-key-0123456789abcdef}
ASYNC_TASKS_ENABLED=true
BULLMQ_REDIS_URL=${BULLMQ_REDIS_URL:-redis://127.0.0.1:6379}
BULLMQ_PREFIX=${BULLMQ_PREFIX:-openlearn:async-tasks}
REDIS_FANOUT_ENABLED=${REDIS_FANOUT_ENABLED:-false}
REDIS_URL=${REDIS_URL:-}
RUNTIME_INSTANCE_ID=${RUNTIME_INSTANCE_ID:-pilot-runtime-local}
WORKER_INSTANCE_ID=${WORKER_INSTANCE_ID:-pilot-worker-local}
OPENLEARN_DEPLOY_ENV=${OPENLEARN_DEPLOY_ENV:-pilot-single-school-local}
OPENLEARN_SHARED_ROOT=$LOCAL_ROOT/shared
OPENLEARN_CURRENT_ROOT=$LOCAL_ROOT/current
OPENLEARN_RUNTIME_ASSETS_ROOT=$LOCAL_ROOT/runtime-assets
OPENLEARN_RELEASE_MANIFESTS_DIR=$LOCAL_ROOT/manifests
OPENLEARN_HEALTHCHECK_BASE_URL=${OPENLEARN_HEALTHCHECK_BASE_URL:-http://127.0.0.1:3000}
OPENLEARN_SOURCE_NODE_MODULES=$NODE_MODULES_PATH
EOF

cp "$REPO_ROOT/ops/systemd/openlearn-web.user.service" "$SYSTEMD_USER_DIR/openlearn-web.service"
cp "$REPO_ROOT/ops/systemd/openlearn-worker.user.service" "$SYSTEMD_USER_DIR/openlearn-worker.service"

systemctl --user daemon-reload
systemctl --user enable openlearn-web.service openlearn-worker.service >/dev/null 2>&1 || true

printf 'Local pilot-host configured.\n'
printf 'Env file: %s\n' "$ENV_FILE"
printf 'User units: %s/openlearn-{web,worker}.service\n' "$SYSTEMD_USER_DIR"
printf 'Local root: %s\n' "$LOCAL_ROOT"
