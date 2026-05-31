import { describe, expect, it } from "vitest";

import {
  assertPhase60LiveResult,
  evaluatePhase60StaticChecks,
  getPhase60FocusedSuitePaths,
  getPhase60MissingLiveEnv,
  getPhase60RequiredArtifacts,
  getPhase60SharedLocalDbBlocker,
  getPhase60StageOrder,
  PHASE_60_LOCAL_VERIFY_SCRIPT,
  PHASE_60_VERIFY_SCRIPT,
  resolvePhase60K6Invocation,
  validatePhase60SummarySource,
  verifyPhase60LocalPackageScript,
  verifyPhase60PackageScripts,
  withLoopbackNoProxy,
} from "./verify-phase60-load-and-rehearsal";
import { withPhase56VerificationEnv } from "./proof-phase60-load-smoke";

function asEnv(values: Record<string, string>): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    ...values,
  } as NodeJS.ProcessEnv;
}

describe("verify-phase60 load/degrade/rehearsal gate", () => {
  it("expects the dedicated verify:phase60 and verify:phase60:local package scripts", () => {
    expect(
      verifyPhase60PackageScripts(
        JSON.stringify({
          scripts: {
            "verify:phase60": PHASE_60_VERIFY_SCRIPT,
            "verify:phase60:local": PHASE_60_LOCAL_VERIFY_SCRIPT,
          },
        }),
      ),
    ).toBe(true);

    expect(
      verifyPhase60LocalPackageScript(
        JSON.stringify({
          scripts: {
            "verify:phase60": PHASE_60_VERIFY_SCRIPT,
            "verify:phase60:local": PHASE_60_LOCAL_VERIFY_SCRIPT,
          },
        }),
      ),
    ).toBe(true);
  });

  it("locks the required artifact list, focused suites, and hard-gate stage order", () => {
    expect(getPhase60RequiredArtifacts()).toEqual([
      "scripts/proof-phase60-load-smoke.ts",
      "scripts/load/phase60-fixtures.ts",
      "scripts/load/phase60-capacity.k6.js",
      "scripts/load/phase60-drill-classifier.js",
      "scripts/load/phase60-drills.k6.js",
      "scripts/rehearse-phase60-rollout-rollback.ts",
      "ops/releases/evidence/phase60/rehearsal-summary.md",
      "ops/releases/evidence/phase60/rollout-notes.md",
      "ops/releases/evidence/phase60/rollback-notes.md",
      "ops/releases/evidence/phase60/transport-fallback-notes.md",
    ]);
    expect(getPhase60FocusedSuitePaths()).toEqual([
      "scripts/load/phase60-thresholds.test.ts",
      "scripts/load/phase60-drills.test.ts",
      "scripts/rehearse-phase60-rollout-rollback.test.ts",
      "scripts/verify-phase60-load-and-rehearsal.test.ts",
    ]);
    expect(getPhase60StageOrder()).toEqual([
      "static",
      "sample smoke",
      "capacity",
      "drills",
      "rollout/rollback rehearsal",
      "summary",
    ]);
  });

  it("requires explicit live target env before non-dry-run verification can claim closeout readiness", () => {
    expect(
      getPhase60MissingLiveEnv(asEnv({
        PHASE60_BASE_URL: "https://pilot.example.com",
        OPENLEARN_SHARED_ROOT: "/srv/openlearn/shared",
        OPENLEARN_CURRENT_ROOT: "/srv/openlearn/current",
        OPENLEARN_HEALTHCHECK_BASE_URL: "https://pilot.example.com",
      })),
    ).toEqual([]);

    expect(
      getPhase60MissingLiveEnv(asEnv({
        PHASE60_BASE_URL: "https://pilot.example.com",
      })),
    ).toEqual([
      "OPENLEARN_SHARED_ROOT",
      "OPENLEARN_CURRENT_ROOT",
      "OPENLEARN_HEALTHCHECK_BASE_URL",
    ]);
  });

  it("fails closed when localhost proof points back to the shared local.db", () => {
    expect(
      getPhase60SharedLocalDbBlocker(asEnv({
        PHASE60_BASE_URL: "http://127.0.0.1:3000",
        DB_FILE_NAME: "file:local.db",
      })),
    ).toBe("PHASE60_LOCAL_DB_SHARED_WITH_APP: rerun pnpm verify:phase60:local");

    expect(
      getPhase60SharedLocalDbBlocker(asEnv({
        PHASE60_BASE_URL: "http://127.0.0.1:3000",
        DB_FILE_NAME: "file:/tmp/opencode/phase60-local-proof/local.db",
      })),
    ).toBeNull();
  });

  it("adds loopback no-proxy entries for local phase60 load checks", () => {
    expect(withLoopbackNoProxy(asEnv({}))).toMatchObject({
      NO_PROXY: "127.0.0.1,localhost",
      no_proxy: "127.0.0.1,localhost",
    });

    expect(
      withLoopbackNoProxy(asEnv({
        NO_PROXY: "example.com,127.0.0.1",
        no_proxy: "example.com",
      })),
    ).toMatchObject({
      NO_PROXY: "example.com,127.0.0.1,localhost",
      no_proxy: "example.com,127.0.0.1,localhost",
    });
  });

  it("forces nested Phase 56 verification to run under test env", () => {
    expect(
      withPhase56VerificationEnv(asEnv({
        NODE_ENV: "production",
        PHASE60_BASE_URL: "http://127.0.0.1:3000",
      })),
    ).toMatchObject({
      NODE_ENV: "test",
      PHASE60_BASE_URL: "http://127.0.0.1:3000",
    });
  });

  it("passes the live base url and no-proxy env into docker k6 fallback", () => {
    const previousEnv = process.env;
    process.env = asEnv({
      PHASE60_BASE_URL: "http://127.0.0.1:3060",
      PATH: previousEnv.PATH || "",
    });

    try {
      const invocation = resolvePhase60K6Invocation("scripts/load/phase60-capacity.k6.js");

      expect(invocation.mode).toBe("docker");
      expect(invocation.args).toContain("grafana/k6:latest");
      expect(invocation.args).toContain("PHASE60_BASE_URL=http://127.0.0.1:3060");
      expect(invocation.args).toContain("NO_PROXY=127.0.0.1,localhost");
      expect(invocation.args).toContain("no_proxy=127.0.0.1,localhost");
      expect(invocation.env).toMatchObject({
        PHASE60_BASE_URL: "http://127.0.0.1:3060",
        NO_PROXY: "127.0.0.1,localhost",
        no_proxy: "127.0.0.1,localhost",
      });
    } finally {
      process.env = previousEnv;
    }
  });

  it("keeps static checks focused on helper-based verifier wiring, required artifacts, and dry-run k6 contract", () => {
    const checks = evaluatePhase60StaticChecks({
      packageSource: JSON.stringify({
        scripts: {
          "verify:phase60": PHASE_60_VERIFY_SCRIPT,
          "verify:phase60:local": PHASE_60_LOCAL_VERIFY_SCRIPT,
        },
      }),
      verifierSource: `
        export function read(filePath: string) {}
        function run(command: string, args: readonly string[], label: string, env?: NodeJS.ProcessEnv) {}
        function runVitest(paths: readonly string[], label: string) {}
        PHASE60_THRESHOLDS
        PHASE60_K6_MODE
        PHASE60_REHEARSAL_MODE
        resolvePhase60K6Invocation
        sample smoke
        capacity
        drills
        rollout/rollback rehearsal
        summary
        grafana/k6:latest
        phase60-capacity.k6.js
        phase60-drills.k6.js
      `,
      artifactPresence: Object.fromEntries(getPhase60RequiredArtifacts().map((artifact) => [artifact, true])),
      summarySource: `
        ops/releases/evidence/phase60/smoke-result.json
        ops/releases/evidence/phase60/capacity-result.json
        ops/releases/evidence/phase60/drill-results.json
        ops/releases/evidence/phase60/transport-fallback-notes.md
        manual evidence only
        do not treat it as an automated pass bit
      `,
    });

    expect(checks).toHaveLength(5);
    expect(checks.every((check) => check.passed)).toBe(true);
  });

  it("treats dry-run or failed machine-readable results as close blockers", () => {
    expect(() => assertPhase60LiveResult("smoke", { status: "dry-run" })).toThrow(
      "PHASE60_SMOKE_DRY_RUN_NOT_ALLOWED",
    );

    expect(() => assertPhase60LiveResult("capacity", { status: "close-blocker", blockingFailure: "capacity breached" })).toThrow(
      "capacity breached",
    );

    expect(() => assertPhase60LiveResult("smoke", { status: "blocked", blockingFailure: "Missing live target env: PHASE60_BASE_URL" })).toThrow(
      "Missing live target env: PHASE60_BASE_URL",
    );

    expect(() => assertPhase60LiveResult("drills", { status: "passed", blockingFailure: null })).not.toThrow();
    expect(() => assertPhase60LiveResult("drills", {
      status: "escalate",
      blockingFailure: null,
      manualRequired: { transportFallback: true },
    })).not.toThrow();
  });

  it("requires the summary to keep transport fallback as manual evidence only", () => {
    expect(
      validatePhase60SummarySource(`
        Go/No-Go
        smoke-result.json
        capacity-result.json
        drill-results.json
        transport-fallback-notes.md
        manual evidence only
        do not treat it as an automated pass bit
      `),
    ).toBe(true);

    expect(
      validatePhase60SummarySource(`
        Go/No-Go
        smoke-result.json
        capacity-result.json
        drill-results.json
        transport-fallback-notes.md
      `),
    ).toBe(false);
  });
});
