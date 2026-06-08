import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  parseManualLedgerRows,
  PHASE_73_V41_CLOSE_GATE_SCRIPT,
  runPhase73V41CloseGate,
  STAGE_LABELS,
} from "./verify-phase73-v41-close-gate";

describe("verify-phase73-v41-close-gate", () => {
  it("exports the exact package script entry and 7 locked stage labels", () => {
    expect(PHASE_73_V41_CLOSE_GATE_SCRIPT).toBe(
      "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase73-v41-close-gate.ts",
    );

    expect(STAGE_LABELS).toEqual([
      "Static script wiring",
      "Upstream product proof lane",
      "Lifecycle milestone-bridge static seams",
      "Recap / stats milestone-bridge static seams",
      "Final-artifact dependencies + manual sign-off ledger",
      "Multi-type close-proof crosswalk",
      "Live-dashboard close-proof crosswalk + alias readiness",
    ]);
  });

  it("parses the single proof-mapping ledger into four rows", () => {
    const proofMappingSource = readFileSync(
      ".planning/phases/73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard/73-PROOF-MAPPING.md",
      "utf8",
    );

    const rows = parseManualLedgerRows(proofMappingSource);

    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.heading)).toEqual([
      "Row 1 — v4.0 carried-forward `/settings/plugins` lifecycle surface",
      "Row 2 — v4.0 carried-forward ended classroom recap baseline surface",
      "Row 3 — v4.1 `/classroom` live-answer surface",
      "Row 4 — v4.1 multi-type ended-session recap surface",
    ]);
    expect(rows[0]?.fields.status).toBe("`status: passed`");
    expect(rows[2]?.fields.status).toBe("`status: pending-human-signoff`");
  });

  it("smoke mode returns a blocked 7-stage readiness report instead of throwing when close artifacts are incomplete", async () => {
    await expect(runPhase73V41CloseGate({ smokeOnly: true })).resolves.toMatchObject({
      overallStatus: "blocked",
      stageStatuses: expect.arrayContaining([
        expect.objectContaining({ label: "Static script wiring" }),
        expect.objectContaining({ label: "Upstream product proof lane" }),
        expect.objectContaining({
          label: "Final-artifact dependencies + manual sign-off ledger",
          status: "blocked",
        }),
        expect.objectContaining({
          label: "Live-dashboard close-proof crosswalk + alias readiness",
        }),
      ]),
    });
  });
});
