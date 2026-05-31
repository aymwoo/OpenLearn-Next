#!/usr/bin/env bash
set -euo pipefail

wait_for_web_listener() {
  local port=${PORT:-3000}

  for _ in {1..40}; do
    if ss -ltn "( sport = :$port )" 2>/dev/null | grep -q LISTEN; then
      return 0
    fi
    sleep 0.5
  done

  echo "Timed out waiting for openlearn-web to listen on 127.0.0.1:$port." >&2
  return 1
}

if [[ $# -ge 2 && ( "$1" == "start" || "$1" == "restart" ) ]]; then
  systemctl --user "$@"

  for unit in "${@:2}"; do
    if [[ "$unit" == "openlearn-web" || "$unit" == "openlearn-web.service" ]]; then
      wait_for_web_listener
      break
    fi
  done

  exit 0
fi

exec systemctl --user "$@"
