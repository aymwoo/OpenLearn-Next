import { describe, expect, it } from "vitest";

import {
  evaluatePhase59StaticChecks,
  getPhase59FocusedSuitePaths,
  getPhase59RequiredArtifacts,
  verifyPhase59PackageScripts,
} from "./verify-phase59-deploy-release";

describe("verify-phase59 deploy-release gate", () => {
  it("expects the dedicated verify:phase59 package script", () => {
    expect(
      verifyPhase59PackageScripts(
        JSON.stringify({
          scripts: {
            "verify:phase59": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase59-deploy-release.ts",
          },
        }),
      ),
    ).toBe(true);
  });

  it("locks the required artifact list and focused suite list", () => {
    expect(getPhase59RequiredArtifacts()).toEqual([
      ".env.example",
      "src/lib/ops/env.server.ts",
      "src/app/api/health/route.ts",
      "src/app/api/ready/route.ts",
      "src/app/api/release/route.ts",
      "ops/deploy/deploy.sh",
      "ops/deploy/rollback.sh",
      "ops/deploy/backup.sh",
      "ops/deploy/restore.sh",
      "ops/deploy/verify-restore.sh",
      "ops/systemd/openlearn-web.service",
      "ops/systemd/openlearn-worker.service",
      "ops/releases/checklists/rollout.md",
      "ops/releases/checklists/rollback.md",
      ".github/workflows/pilot-release.yml",
    ]);

    expect(getPhase59FocusedSuitePaths()).toEqual([
      "src/lib/ops/env.server.test.ts",
      "src/lib/ops/release-status.test.ts",
      "src/app/api/ops-routes.test.ts",
      "scripts/verify-phase59-deploy-release.test.ts",
    ]);
  });

  it("keeps static close-gate checks focused on exact workflow contract, helper-based verifier, and artifact presence", () => {
    const checks = evaluatePhase59StaticChecks({
      packageSource: JSON.stringify({
        scripts: {
          "verify:phase59": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase59-deploy-release.ts",
        },
      }),
      verifierSource: `
        export function read(filePath: string) {}
        function run(command: string, args: readonly string[], label: string) {}
        function runVitest(paths: readonly string[], label: string) {}
        getPhase59RequiredArtifacts()
        getPhase59FocusedSuitePaths()
      `,
      workflowSource: `
        pull_request:
        push:
          branches: [main]
        workflow_dispatch:
        actions/checkout@v4
        actions/setup-node@v4
        pnpm/action-setup@v4
        image: redis:7-alpine
        REDIS_FANOUT_ENABLED: false
        OPENLEARN_HEALTHCHECK_BASE_URL: http://127.0.0.1:3100
        pnpm install --frozen-lockfile
        pnpm lint
        pnpm typecheck
        pnpm test --run
        pnpm build
        pnpm db:migrate
        pnpm verify:phase57
        pnpm verify:phase58
        pnpm verify:phase59
        PORT=3100 pnpm start
        pnpm worker:start
        curl -fsS http://127.0.0.1:3100/api/health
        curl -fsS http://127.0.0.1:3100/api/ready
      `,
      artifactPresence: Object.fromEntries(getPhase59RequiredArtifacts().map((artifact) => [artifact, true])),
    });

    expect(checks).toHaveLength(4);
    expect(checks.every((check) => check.passed)).toBe(true);
  });
});
