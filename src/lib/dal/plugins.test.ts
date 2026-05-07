import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync("src/lib/dal/plugins.ts", "utf8");
const registrySource = readFileSync("src/server/plugins/registry.ts", "utf8");

describe("plugin DAL security boundary", () => {
  it("is server-only and exposes school-scoped lifecycle APIs", () => {
    expect(source.trimStart().startsWith('import "server-only";')).toBe(true);
    expect(source).toContain("export async function setPluginEnabled");
    expect(source).toContain("export async function listPluginsForSchool");
    expect(source).toContain("export async function getPluginForSchool");
    expect(source).toContain("export async function deletePluginForSchool");
    expect(source).toContain("export async function getEnabledPluginsForAnchor");
    expect(source).toContain("export async function runPluginHook(input: RunPluginHookInput)");
  });

  it("requires authenticated actor scope and teacher membership for management paths", () => {
    expect(source).toContain("function assertActorId");
    expect(source).toContain("assertActiveTeacher");
    expect(source).toContain("scope.userId !== input.actorId");
    expect(source).toContain("!scope.schoolIds.includes(input.schoolId)");
    expect(source).not.toContain("actorId?: string | null");
  });

  it("filters enabled plugins by school membership and declared hook anchors", () => {
    expect(source).toContain("hasActiveSchoolMembership");
    expect(source).toContain('membership.status === "active"');
    expect(source).toContain("eq(pluginRegistrations.schoolId, input.schoolId)");
    expect(source).toContain("eq(pluginRegistrations.enabled, true)");
    expect(source).toContain("eq(pluginRegistrations.killSwitchEnabled, false)");
    expect(source).toContain("plugin.manifestJson.anchors.includes");
  });

  it("denies and audits school mismatch, permission denial, disabled, and kill switch cases", () => {
    expect(source).toContain("school_mismatch");
    expect(source).toContain("permission_denied");
    expect(source).toContain("disabled");
    expect(source).toContain("kill_switch");
    expect(source).toContain("requiredPermission");
    expect(source).toContain("denied: true");
    expect(source).toContain("plugin.schoolId !== input.schoolId");
    expect(source).toContain("await createHookRun");
    expect(source).toContain("await createPluginAudit");
  });

  it("registers validated theme tokens when enabling theme plugins", () => {
    expect(source).toContain("manifest.theme");
    expect(source).toContain('`${plugin.name} theme`');
    expect(source).toContain("registerThemeTokens(plugin.schoolId");
    expect(source).toContain("registeredThemeId");
  });

  it("exports explicit plugin action permission requirements", () => {
    expect(registrySource).toContain("export const PLUGIN_ACTION_PERMISSION_REQUIREMENTS");
    expect(registrySource).toContain('addStepSuggestion: "lesson:write:suggestion"');
    expect(registrySource).toContain('annotateLesson: "lesson:write:annotation"');
    expect(registrySource).toContain('createNotificationStub: "notification:create:stub"');
  });
});
