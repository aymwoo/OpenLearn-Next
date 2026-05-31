#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
ENV_FILE=${OPENLEARN_LOCAL_ENV_FILE:-"${XDG_CONFIG_HOME:-$HOME/.config}/openlearn/openlearn.env"}

is_workspace_server_process() {
  local pid=$1
  local cwd=""
  local cmdline=""

  [[ -d "/proc/$pid" ]] || return 1

  cwd=$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)
  [[ "$cwd" == "$REPO_ROOT" ]] || return 1

  cmdline=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || true)
  [[ "$cmdline" == *"server.ts"* ]]
}

is_local_pilot_host_server_process() {
  local pid=$1
  local cwd=""
  local cmdline=""

  [[ -d "/proc/$pid" ]] || return 1

  cwd=$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)
  cmdline=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || true)

  [[ "$cmdline" == *"server.ts"* ]] || return 1
  [[ "$cwd" == "$OPENLEARN_CURRENT_ROOT" ]] && return 0
  [[ "$cwd" == "$OPENLEARN_SHARED_ROOT"/releases/* ]]
}

port_listener_pids() {
  local port=$1
  ss -ltnp "( sport = :$port )" 2>/dev/null | grep -o 'pid=[0-9]\+' | cut -d= -f2 | sort -u || true
}

stop_local_pilot_host_worker() {
  if systemctl --user is-active --quiet openlearn-worker.service; then
    echo "Stopping openlearn-worker.service to avoid shared SQLite lock contention during deploy-local." >&2
    systemctl --user stop openlearn-worker.service
  fi
}

stop_stale_workspace_server() {
  local port=${PORT:-}
  local pid=""
  local -a pids=()
  local -a killable_pids=()

  [[ -n "$port" ]] || return 0

  mapfile -t pids < <(port_listener_pids "$port")
  [[ ${#pids[@]} -eq 0 ]] || [[ -z "${pids[0]}" ]] && return 0

  for pid in "${pids[@]}"; do
    if is_local_pilot_host_server_process "$pid"; then
      continue
    fi

    if is_workspace_server_process "$pid"; then
      killable_pids+=("$pid")
      continue
    fi

    if ! is_workspace_server_process "$pid"; then
      echo "Port $port is already in use by pid $pid. Stop that process before running deploy-local." >&2
      return 1
    fi
  done

  [[ ${#killable_pids[@]} -gt 0 ]] || return 0

  for pid in "${killable_pids[@]}"; do
    echo "Stopping stale workspace server on port $port (pid $pid)." >&2
    kill "$pid"
  done

  for _ in {1..20}; do
    mapfile -t pids < <(port_listener_pids "$port")
    if [[ ${#pids[@]} -eq 0 ]] || [[ -z "${pids[0]}" ]]; then
      return 0
    fi
    sleep 0.5
  done

  echo "Timed out waiting for port $port to become free." >&2
  return 1
}

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing local pilot-host env file: $ENV_FILE" >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

export OPENLEARN_SOURCE_NODE_MODULES=${OPENLEARN_SOURCE_NODE_MODULES:-"$REPO_ROOT/node_modules"}
export NO_PROXY=${NO_PROXY:-127.0.0.1,localhost}
export no_proxy=${no_proxy:-127.0.0.1,localhost}

stop_stale_workspace_server
stop_local_pilot_host_worker

SYSTEMCTL_BIN="$REPO_ROOT/ops/deploy/systemctl-user.sh" bash "$REPO_ROOT/ops/deploy/deploy.sh" "$@"
