export const PHASE_73_V41_CLOSE_GATE_SCRIPT =
  "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase73-v41-close-gate.ts";

export const STAGE_LABELS: readonly string[] = [];

export type ManualLedgerRow = {
  heading: string;
  fields: Record<string, string>;
};

export function parseManualLedgerRows(_proofMappingSource: string): ManualLedgerRow[] {
  return [];
}

export async function runPhase73V41CloseGate(_options?: { smokeOnly?: boolean }) {
  throw new Error("Not implemented");
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  runPhase73V41CloseGate().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
