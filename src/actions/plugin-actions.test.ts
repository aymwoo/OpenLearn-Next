import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync("src/actions/plugin-actions.ts", "utf8");

describe("plugin Server Actions", () => {
  it("validates plugin manifests at the action boundary", () => {
    expect(source.trimStart().startsWith('"use server";')).toBe(true);
    expect(source).toContain("PluginManifestSchema");
    expect(source).toContain("manifestJson: PluginManifestSchema");
    expect(source).not.toContain("manifestJson: z.any()");
  });

  it("exports plugin lifecycle actions and resolves the authenticated actor", () => {
    expect(source).toContain("export async function registerPluginManifestAction");
    expect(source).toContain("export async function setPluginEnabledAction");
    expect(source).toContain("export async function setPluginKillSwitchAction");
    expect(source).toContain("export async function listPluginsAction");
    expect(source).toContain("export async function getPluginAction");
    expect(source).toContain("export async function deletePluginAction");
    expect(source).toContain("export async function runPluginHookAction");
    expect(source).toContain("getCurrentUserDTO");
    expect(source).toContain("const actorId = await requireCurrentActorId()");
  });

  it("updates plugin and theme cache tags after successful mutations", () => {
    expect(source).toContain("updateTag(cacheTags.pluginRegistry)");
    expect(source).toContain("updateTag(cacheTags.plugin(parsed.data.pluginId))");
    expect(source).toContain("updateTag(cacheTags.themeRegistry)");
    expect(source).toContain("updateTag(cacheTags.theme(result.registeredThemeId))");
  });

  it("passes non-null actor context into secured DAL calls", () => {
    expect(source).toContain("registerPluginManifest({ ...parsed.data, actorId })");
    expect(source).toContain("setPluginEnabled({ ...parsed.data, actorId })");
    expect(source).toContain("setPluginKillSwitch({ ...parsed.data, actorId })");
    expect(source).toContain("listPluginsForSchool({ ...parsed.data, actorId })");
    expect(source).toContain("getPluginForSchool({ ...parsed.data, actorId })");
    expect(source).toContain("deletePluginForSchool({ ...parsed.data, actorId })");
    expect(source).toContain("runPluginHook({ ...parsed.data, actorId })");
    expect(source).not.toContain("actorId: null");
    expect(source).not.toContain("actorId: undefined");
  });
});
