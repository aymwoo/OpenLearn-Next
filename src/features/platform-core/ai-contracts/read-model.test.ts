import { describe, expect, it, vi } from "vitest";

import { PlatformAiDescriptorCatalogSchema } from "./contracts";

vi.mock("server-only", () => ({}));

describe("phase 54 ai descriptor read model", () => {
  it("exposes unified server-side list APIs for commands, actions, and capabilities", async () => {
    const {
      listPlatformActions,
      listPlatformCapabilities,
      listPlatformCommands,
    } = await import("./read-model");

    const [commands, actions, capabilities] = await Promise.all([
      listPlatformCommands(),
      listPlatformActions(),
      listPlatformCapabilities(),
    ]);

    expect(commands.length).toBeGreaterThan(0);
    expect(actions.length).toBeGreaterThan(0);
    expect(capabilities.length).toBeGreaterThan(0);
    expect(commands.every((descriptor) => descriptor.kind === "command")).toBe(true);
    expect(actions.every((descriptor) => descriptor.kind === "action")).toBe(true);
    expect(capabilities.every((descriptor) => descriptor.kind === "capability")).toBe(true);
  });

  it("returns a DTO-safe machine-readable descriptor catalog from the server read model", async () => {
    const { readPlatformAiDescriptorCatalog } = await import("./read-model");

    const catalog = await readPlatformAiDescriptorCatalog();
    const parsed = PlatformAiDescriptorCatalogSchema.parse(catalog);

    expect(parsed.length).toBe(catalog.length);
    expect(parsed.some((descriptor) => descriptor.kind === "command")).toBe(true);
    expect(parsed.some((descriptor) => descriptor.kind === "action")).toBe(true);
    expect(parsed.some((descriptor) => descriptor.kind === "capability")).toBe(true);
  });
});
