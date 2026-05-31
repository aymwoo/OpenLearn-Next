# Local Pilot Host

## Purpose

This repo supports a local pilot-host posture for user-level systemd rehearsal on one developer machine.

It preserves the canonical deploy/rollback scripts:

- `ops/deploy/deploy.sh`
- `ops/deploy/rollback.sh`

and adds only local wrappers for:

- user-level systemd
- local env file placement
- reuse of the workspace `node_modules` inside copied release directories

## Setup

Run:

```bash
bash ops/deploy/setup-local-pilot-host.sh
```

This writes:

- `~/.config/openlearn/openlearn.env`
- `~/.config/systemd/user/openlearn-web.service`
- `~/.config/systemd/user/openlearn-worker.service`

and prepares:

- `~/.local/share/openlearn/local-pilot-host/shared`
- `~/.local/share/openlearn/local-pilot-host/runtime-assets`
- `~/.local/share/openlearn/local-pilot-host/manifests`

Override with:

```bash
OPENLEARN_LOCAL_PILOT_HOST_ROOT=/some/other/path bash ops/deploy/setup-local-pilot-host.sh
```

## Deploy

Use the local wrapper so canonical deploy runs through `systemctl --user`:

```bash
bash ops/deploy/deploy-local.sh \
  --environment pilot-single-school-local \
  --actor local-operator \
  --shared-root "$PWD/.local/pilot-host/shared" \
  --current-root "$PWD/.local/pilot-host/current" \
  --base-url http://127.0.0.1:3000 \
  --school-id school-1 \
  --classroom-session-id session-1 \
  --lesson-version-id lesson-v1 \
  --plugin-id plugin-voting-proof \
  --action-key launchVote \
  --command-id command-1 \
  --task-id task-1
```

## Rollback

```bash
bash ops/deploy/rollback-local.sh \
  --release-id <release-id> \
  --reason ready_failed \
  --shared-root "$PWD/.local/pilot-host/shared" \
  --current-root "$PWD/.local/pilot-host/current" \
  --base-url http://127.0.0.1:3000
```

## Important Limitation

The copied release directory does not install dependencies itself.
For local pilot-host rehearsal only, `deploy.sh` may copy `OPENLEARN_SOURCE_NODE_MODULES` into the release tree so Turbopack stays within the release filesystem root.

This is a local-host adaptation and not evidence that a real remote pilot host is production-ready.
