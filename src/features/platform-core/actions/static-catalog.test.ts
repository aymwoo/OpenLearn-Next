import { describe, expect, it } from "vitest";

describe("phase 52 action contracts", () => {
  it("defines separate executable catalog and blocked diagnostic contracts", async () => {
    const contracts = await import("./contracts");

    expect(contracts.ActionBlockedReasonCodeSchema.options).toEqual([
      "plugin_not_installed",
      "plugin_not_enabled",
      "plugin_suspended",
      "dependency_not_satisfied",
      "activation_failed",
      "duplicate_action_key",
    ]);

    const descriptor = {
      actionKey: "addStepSuggestion",
      ownerType: "default-plugin",
      ownerPluginKey: null,
      inputSchemaKey: "plugin-action.payload.generic",
      requiredPermission: "lesson:write:suggestion",
      sideEffectClass: "proposal",
      implementationSource: "main-repo-static-implementation",
    };

    expect(contracts.ActionDescriptorSchema.parse(descriptor)).toMatchObject(descriptor);
    expect(
      contracts.ExecutableActionCatalogRowSchema.parse({
        ...descriptor,
        catalogView: "executable",
      }),
    ).toMatchObject({
      actionKey: "addStepSuggestion",
      catalogView: "executable",
    });

    expect(
      contracts.BlockedActionDiagnosticRowSchema.parse({
        ...descriptor,
        catalogView: "blocked-diagnostic",
        reasonCode: "plugin_not_enabled",
      }),
    ).toMatchObject({
      actionKey: "addStepSuggestion",
      catalogView: "blocked-diagnostic",
      reasonCode: "plugin_not_enabled",
    });
  });

  it("exports machine-readable action catalog DTOs from resource-ai", async () => {
    const dto = await import("@/lib/dto/resource-ai");

    const catalogResult = dto.ActionCatalogDTOSchema.safeParse([
      {
        actionKey: "createNotificationStub",
        ownerType: "default-plugin",
        ownerPluginKey: null,
        inputSchemaKey: "plugin-action.payload.generic",
        requiredPermission: "notification:create:stub",
        sideEffectClass: "notification-stub",
        implementationSource: "main-repo-static-implementation",
        catalogView: "executable",
      },
    ]);
    expect(catalogResult.success).toBe(true);

    const diagnosticResult = dto.ActionBlockedDiagnosticDTOSchema.safeParse([
      {
        actionKey: "createNotificationStub",
        ownerType: "default-plugin",
        ownerPluginKey: null,
        inputSchemaKey: "plugin-action.payload.generic",
        requiredPermission: "notification:create:stub",
        sideEffectClass: "notification-stub",
        implementationSource: "main-repo-static-implementation",
        catalogView: "blocked-diagnostic",
        reasonCode: "plugin_not_enabled",
      },
    ]);
    expect(diagnosticResult.success).toBe(true);
  });
});
