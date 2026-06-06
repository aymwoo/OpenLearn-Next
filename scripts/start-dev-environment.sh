#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
ENV_FILE="$REPO_ROOT/.env.local"
DEV_RUNTIME_DIR="$REPO_ROOT/.local/dev-runtime"
WEB_PID_FILE="$DEV_RUNTIME_DIR/web.pid"
WORKER_PID_FILE="$DEV_RUNTIME_DIR/worker.pid"

BOOTSTRAP_MODE="auto"
INSTALL_MODE="auto"
WORKER_MODE="auto"

usage() {
  cat <<'EOF'
Usage: bash scripts/start-dev-environment.sh [options]

Starts the local development environment with minimal setup.

Options:
  --bootstrap      Force pnpm db:bootstrap:dev before starting
  --migrate-only   Force pnpm db:migrate before starting
  --skip-db        Skip database preparation
  --install        Force pnpm install before starting
  --skip-install   Skip pnpm install even if node_modules is missing
  --with-worker    Start pnpm worker:dev in background
  --no-worker      Start web only
  --help           Show this help message
EOF
}

require_command() {
  local command_name=$1

  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$command_name" >&2
    exit 1
  fi
}

get_listener_pid() {
  local port=$1

  if ! command -v lsof >/dev/null 2>&1; then
    return 1
  fi

  lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | while IFS= read -r pid; do
    if [[ -n "$pid" ]]; then
      printf '%s\n' "$pid"
      break
    fi
  done
}

resolve_process_cwd() {
  local pid=$1

  if [[ -e "/proc/$pid/cwd" ]]; then
    readlink -f "/proc/$pid/cwd"
    return 0
  fi

  if command -v pwdx >/dev/null 2>&1; then
    pwdx "$pid" 2>/dev/null | cut -d' ' -f2-
    return 0
  fi

  return 1
}

read_pid_file() {
  local pid_file=$1

  if [[ ! -f "$pid_file" ]]; then
    return 1
  fi

  local pid
  pid=$(tr -d '[:space:]' < "$pid_file")
  if [[ -z "$pid" ]]; then
    return 1
  fi

  printf '%s\n' "$pid"
}

is_pid_running() {
  local pid=$1
  kill -0 "$pid" >/dev/null 2>&1
}

ensure_process_slot_available() {
  local label=$1
  local pid_file=$2
  local pid

  if ! pid=$(read_pid_file "$pid_file"); then
    rm -f "$pid_file"
    return
  fi

  if is_pid_running "$pid"; then
    printf '%s already running (pid %s). Run `bash scripts/stop-dev-environment.sh` first.\n' "$label" "$pid" >&2
    exit 1
  fi

  rm -f "$pid_file"
}

ensure_port_available_for_workspace() {
  local port=${PORT:-3000}
  local listener_pid

  if ! listener_pid=$(get_listener_pid "$port"); then
    return
  fi

  if [[ -z "$listener_pid" ]]; then
    return
  fi

  local listener_cwd=""
  listener_cwd=$(resolve_process_cwd "$listener_pid" 2>/dev/null || true)

  if [[ "$listener_cwd" == "$REPO_ROOT/.local/pilot-host/"* ]]; then
    printf 'Port %s is occupied by a pilot-host release at %s. Stopping pilot-host services...\n' "$port" "$listener_cwd"
    bash "$REPO_ROOT/ops/deploy/stop-local-pilot-host.sh"

    for _ in {1..20}; do
      sleep 0.5
      if ! listener_pid=$(get_listener_pid "$port"); then
        return
      fi
      if [[ -z "$listener_pid" ]]; then
        return
      fi
    done

    printf 'Port %s is still occupied after stopping pilot-host. Please inspect the remaining listener manually.\n' "$port" >&2
    exit 1
  fi

  printf 'Port %s is already occupied by pid %s' "$port" "$listener_pid" >&2
  if [[ -n "$listener_cwd" ]]; then
    printf ' (%s)' "$listener_cwd" >&2
  fi
  printf '. Stop it first, then rerun `pnpm dev:setup`.\n' >&2
  exit 1
}

ensure_env_file() {
  if [[ -f "$ENV_FILE" ]]; then
    return
  fi

  cat > "$ENV_FILE" <<'EOF'
NODE_ENV=development
HOSTNAME=127.0.0.1
PORT=3000

DB_FILE_NAME=file:local.db

AUTH_SECRET=dev-auth-secret
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=dev-server-actions-key-0123456789abcdef

ASYNC_TASKS_ENABLED=false
REDIS_FANOUT_ENABLED=false

OPENLEARN_DEPLOY_ENV=local-dev
OPENLEARN_SHARED_ROOT=./shared
OPENLEARN_CURRENT_ROOT=./current
OPENLEARN_RUNTIME_ASSETS_ROOT=./runtime-assets
OPENLEARN_RELEASE_MANIFESTS_DIR=./ops/releases/manifests
OPENLEARN_HEALTHCHECK_BASE_URL=http://127.0.0.1:3000
EOF

  printf 'Created minimal .env.local at %s\n' "$ENV_FILE"
}

load_env_file() {
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
}

ensure_runtime_dirs() {
  local shared_root=${OPENLEARN_SHARED_ROOT:-./shared}
  local current_root=${OPENLEARN_CURRENT_ROOT:-./current}
  local runtime_assets_root=${OPENLEARN_RUNTIME_ASSETS_ROOT:-./runtime-assets}
  local manifests_root=${OPENLEARN_RELEASE_MANIFESTS_DIR:-./ops/releases/manifests}

  local targets=("$shared_root" "$current_root" "$runtime_assets_root" "$manifests_root")
  local target
  for target in "${targets[@]}"; do
    if [[ "$target" = /* ]]; then
      mkdir -p "$target"
    else
      mkdir -p "$REPO_ROOT/$target"
    fi
  done
}

ensure_dev_runtime_dir() {
  mkdir -p "$DEV_RUNTIME_DIR"
}

resolve_db_file_path() {
  local db_url=${DB_FILE_NAME:-file:local.db}

  if [[ "$db_url" != file:* ]]; then
    return 1
  fi

  local db_path=${db_url#file:}
  if [[ "$db_path" = /* ]]; then
    printf '%s\n' "$db_path"
    return 0
  fi

  printf '%s\n' "$REPO_ROOT/$db_path"
}

install_dependencies_if_needed() {
  case "$INSTALL_MODE" in
    skip)
      printf 'Skipping pnpm install.\n'
      ;;
    force)
      printf 'Installing dependencies...\n'
      pnpm install
      ;;
    auto)
      if [[ -d "$REPO_ROOT/node_modules" ]]; then
        printf 'Dependencies already installed.\n'
      else
        printf 'node_modules missing, installing dependencies...\n'
        pnpm install
      fi
      ;;
    *)
      printf 'Unknown install mode: %s\n' "$INSTALL_MODE" >&2
      exit 1
      ;;
  esac
}

prepare_database() {
  case "$BOOTSTRAP_MODE" in
    skip)
      printf 'Skipping database preparation.\n'
      return
      ;;
    bootstrap)
      printf 'Bootstrapping development database...\n'
      pnpm db:bootstrap:dev
      return
      ;;
    migrate)
      printf 'Running database migrations...\n'
      pnpm db:migrate
      return
      ;;
    auto)
      ;;
    *)
      printf 'Unknown database mode: %s\n' "$BOOTSTRAP_MODE" >&2
      exit 1
      ;;
  esac

  local db_file_path
  if db_file_path=$(resolve_db_file_path); then
    if [[ -f "$db_file_path" ]]; then
      printf 'Existing database detected at %s, running migrations...\n' "$db_file_path"
      pnpm db:migrate
    else
      printf 'Database not found at %s, bootstrapping dev data...\n' "$db_file_path"
      pnpm db:bootstrap:dev
    fi
    return
  fi

  printf 'Non-file DB_FILE_NAME detected, running migrations only...\n'
  pnpm db:migrate
}

should_start_worker() {
  case "$WORKER_MODE" in
    always)
      return 0
      ;;
    never)
      return 1
      ;;
    auto)
      [[ "${ASYNC_TASKS_ENABLED:-false}" == "true" ]]
      ;;
    *)
      printf 'Unknown worker mode: %s\n' "$WORKER_MODE" >&2
      exit 1
      ;;
  esac
}

cleanup() {
  rm -f "$WEB_PID_FILE" "$WORKER_PID_FILE"

  if [[ -n "${WEB_PID:-}" ]] && is_pid_running "$WEB_PID"; then
    printf '\nStopping web server (pid %s)...\n' "$WEB_PID"
    kill "$WEB_PID" 2>/dev/null || true
  fi

  if [[ -n "${WORKER_PID:-}" ]]; then
    if is_pid_running "$WORKER_PID"; then
      printf '\nStopping worker (pid %s)...\n' "$WORKER_PID"
      kill "$WORKER_PID" 2>/dev/null || true
    fi
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bootstrap)
      BOOTSTRAP_MODE="bootstrap"
      ;;
    --migrate-only)
      BOOTSTRAP_MODE="migrate"
      ;;
    --skip-db)
      BOOTSTRAP_MODE="skip"
      ;;
    --install)
      INSTALL_MODE="force"
      ;;
    --skip-install)
      INSTALL_MODE="skip"
      ;;
    --with-worker)
      WORKER_MODE="always"
      ;;
    --no-worker)
      WORKER_MODE="never"
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown option: %s\n\n' "$1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

require_command node
require_command pnpm

cd "$REPO_ROOT"

ensure_env_file
load_env_file
ensure_runtime_dirs
ensure_dev_runtime_dir
ensure_port_available_for_workspace
ensure_process_slot_available "Web server" "$WEB_PID_FILE"
ensure_process_slot_available "Worker" "$WORKER_PID_FILE"
install_dependencies_if_needed
prepare_database

trap cleanup EXIT INT TERM

printf 'Development environment ready.\n'
printf 'Env file: %s\n' "$ENV_FILE"
printf 'Web URL: http://%s:%s\n' "${HOSTNAME:-127.0.0.1}" "${PORT:-3000}"

if should_start_worker; then
  if [[ -z "${BULLMQ_REDIS_URL:-}" ]]; then
    printf 'ASYNC_TASKS_ENABLED=true but BULLMQ_REDIS_URL is empty, skipping worker startup.\n' >&2
  else
    printf 'Starting worker in background...\n'
    pnpm worker:dev &
    WORKER_PID=$!
    printf '%s\n' "$WORKER_PID" > "$WORKER_PID_FILE"
    printf 'Worker PID: %s\n' "$WORKER_PID"
  fi
fi

printf 'Starting web server...\n'
pnpm dev &
WEB_PID=$!
printf '%s\n' "$WEB_PID" > "$WEB_PID_FILE"
printf 'Web PID: %s\n' "$WEB_PID"

set +e
wait "$WEB_PID"
WEB_EXIT_CODE=$?
set -e

exit "$WEB_EXIT_CODE"
