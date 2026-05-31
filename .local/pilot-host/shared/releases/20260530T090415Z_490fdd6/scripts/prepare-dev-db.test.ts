import { existsSync, readFileSync } from "fs";

import { describe, expect, it } from "vitest";

describe("Phase 51 command ledger schema bridge", () => {
  it("adds durable command ledger artifacts", () => {
    const schemaSource = readFileSync("src/db/schema.ts", "utf8");

    expect(schemaSource).toContain("export const platformCommands");
    expect(schemaSource).toContain("export const platformCommandAttempts");
    expect(existsSync("drizzle/0013_phase51_command_bus_foundation.sql")).toBe(true);
  });

  it("bridges dev db detection to the phase 51 schema tag", () => {
    const prepareSource = readFileSync("scripts/prepare-dev-db.ts", "utf8");

    expect(prepareSource).toContain("0013_phase51_command_bus_foundation");
    expect(prepareSource).toContain('tableExists("platformCommand")');
    expect(prepareSource).toContain('columnExists("pluginActionAudit", "commandId")');
    expect(prepareSource).toContain('columnExists("governanceAudit", "commandId")');
  });

  it("threads command attribution through plugin governance audits", () => {
    const schemaSource = readFileSync("src/db/schema.ts", "utf8");

    expect(schemaSource).toContain('commandId: text("commandId")');
    expect(schemaSource).toContain("references(() => platformCommands.id, { onDelete: \"cascade\" })");
  });
});
