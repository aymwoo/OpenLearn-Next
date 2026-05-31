import { describe, expect, it } from "vitest";

import {
  evaluatePhase57StaticChecks,
  getPhase57VerificationSuitePaths,
  PHASE_57_PROOF_SCRIPT,
  PHASE_57_VERIFY_SCRIPT,
  verifyPhase57PackageScripts,
} from "./verify-phase57-classroom-runtime";

describe("verify-phase57 classroom runtime gate", () => {
  it("expects the dedicated verify:phase57 and proof:phase57 package scripts", () => {
    expect(
      verifyPhase57PackageScripts(
        JSON.stringify({
          scripts: {
            "verify:phase57": PHASE_57_VERIFY_SCRIPT,
            "proof:phase57": PHASE_57_PROOF_SCRIPT,
          },
        }),
      ),
    ).toBe(true);
  });

  it("locks the focused phase 57 suite list to launch/control/submit/result regressions", () => {
    expect(getPhase57VerificationSuitePaths()).toEqual([
      "src/actions/classroom-actions.test.ts",
      "src/components/classroom/classroom-control-panel.test.tsx",
      "src/features/runtime-platform/classroom/runtime-session.test.ts",
      "src/lib/dal/learning.test.ts",
      "src/components/learning/classroom-runtime-client.test.tsx",
      "src/lib/dal/classroom.test.ts",
      "src/components/classroom/classroom-roster-panel.test.tsx",
    ]);
  });

  it("only keeps irreducible static checks for exact script entries and focused suite boundary", () => {
    const checks = evaluatePhase57StaticChecks({
      packageSource: JSON.stringify({
        scripts: {
          "verify:phase57": PHASE_57_VERIFY_SCRIPT,
          "proof:phase57": PHASE_57_PROOF_SCRIPT,
        },
      }),
    });

    expect(checks).toHaveLength(2);
    expect(checks.every((check) => check.passed)).toBe(true);
  });
});
