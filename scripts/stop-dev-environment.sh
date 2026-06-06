#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
DEV_RUNTIME_DIR="$REPO_ROOT/.local/dev-runtime"
WEB_PID_FILE="$DEV_RUNTIME_DIR/web.pid"
WORKER_PID_FILE="$DEV_RUNTIME_DIR/worker.pid"

usage() {
  cat <<'EOF'
Usage: bash scripts/stop-dev-environment.sh

Stops the local development web/worker processes started by start-dev-environment.sh.
EOF
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

stop_process() {
  local label=$1
  local pid_file=$2
  local pid
  local attempt

  if ! pid=$(read_pid_file "$pid_file"); then
    rm -f "$pid_file"
    printf '%s is not tracked.\n' "$label"
    return
  fi

  if is_pid_running "$pid"; then
    printf 'Stopping %s (pid %s)...\n' "$label" "$pid"
    kill "$pid"

    for attempt in 1 2 3 4 5; do
      if ! is_pid_running "$pid"; then
        break
      fi
      sleep 1
    done

    if is_pid_running "$pid"; then
      printf '%s pid %s did not exit yet; you may need to stop it manually.\n' "$label" "$pid" >&2
      return
    fi
  else
    printf '%s pid %s is already stopped.\n' "$label" "$pid"
  fi

  rm -f "$pid_file"
}

if [[ $# -gt 0 ]]; then
  case "$1" in
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
fi

mkdir -p "$DEV_RUNTIME_DIR"

stop_process "worker" "$WORKER_PID_FILE"
stop_process "web server" "$WEB_PID_FILE"

printf 'Development environment stop request complete.\n'
