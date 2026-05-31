import { describe, expect, it } from "vitest";

describe("phase 54 ai-native contracts", () => {
  it("defines a shared descriptor shell for command, action, and capability discovery", async () => {
    const contracts = await import("./contracts");
    const actionDescriptor = contracts.PlatformAiActionDescriptorSchema.parse({
      kind: "action",
      key: "action:createNotificationStub",
      title: "Create notification stub",
      description: "Machine-readable action descriptor for AI discovery.",
      inputSchemaKey: "plugin-action.payload.generic",
      requiredCapabilities: ["runtime:event:emit"],
      requiredPermission: "notification:create:stub",
      sideEffectClass: "notification-stub",
      implementationSource: "main-repo-static-implementation",
      delegationPosture: "allowed-with-approval",
      approvalPosture: "teacher-approval-required",
      stability: "stable",
      contractVersion: "phase-54.v1",
      implementationVersion: "phase-52-static-catalog",
      sourceDescriptor: {
        actionKey: "createNotificationStub",
        ownerType: "default-plugin",
        ownerPluginKey: null,
        inputSchemaKey: "plugin-action.payload.generic",
        requiredPermission: "notification:create:stub",
        sideEffectClass: "notification-stub",
        implementationSource: "main-repo-static-implementation",
      },
    });

    expect(contracts.AiDescriptorKindSchema.options).toEqual([
      "command",
      "action",
      "capability",
    ]);

    expect(actionDescriptor.sourceDescriptor.actionKey).toBe("createNotificationStub");

    expect(
      contracts.PlatformAiDescriptorSchema.parse({
        kind: "command",
        key: "command:plugin.enable",
        title: "Enable plugin",
        description: "Machine-readable command descriptor for AI discovery.",
        inputSchemaKey: "platform-command.payload.plugin.enable",
        requiredCapabilities: ["runtime:event:emit"],
        requiredPermission: null,
        sideEffectClass: "platform-write",
        implementationSource: "platform-command-bus",
        delegationPosture: "operator-delegated",
        approvalPosture: "operator-review-required",
        stability: "beta",
        contractVersion: "phase-54.v1",
        implementationVersion: "phase-53-command-bus",
      }).kind,
    ).toBe("command");

    expect(
      contracts.PlatformAiDescriptorSchema.parse({
        kind: "capability",
        key: "capability:runtime:event:emit",
        title: "Runtime event emit",
        description: "Machine-readable capability descriptor for AI discovery.",
        inputSchemaKey: "capability-input.none",
        requiredCapabilities: ["runtime:event:emit"],
        requiredPermission: null,
        sideEffectClass: "event-emission",
        implementationSource: "runtime-capability-registry",
        delegationPosture: "host-only",
        approvalPosture: "no-human-approval",
        stability: "stable",
        contractVersion: "phase-54.v1",
        implementationVersion: "runtime-capabilities-2026.05",
      }).kind,
    ).toBe("capability");
  });

  it("exports outward-facing ai descriptor dto shells from resource-ai", async () => {
    const dto = await import("@/lib/dto/resource-ai");

    expect("PlatformAiDescriptorCatalogDTOSchema" in dto).toBe(true);
  });

  it("requires action descriptors to reuse the existing ActionDescriptorSchema field semantics", async () => {
    const contracts = await import("./contracts");

    expect(() =>
      contracts.PlatformAiDescriptorSchema.parse({
        kind: "action",
        key: "action:createNotificationStub",
        title: "Create notification stub",
        description: "Machine-readable action descriptor for AI discovery.",
        inputSchemaKey: "plugin-action.payload.generic",
        requiredCapabilities: ["runtime:event:emit"],
        requiredPermission: "notification:create:stub",
        sideEffectClass: "notification-stub",
        implementationSource: "main-repo-static-implementation",
        delegationPosture: "allowed-with-approval",
        approvalPosture: "teacher-approval-required",
        stability: "stable",
        contractVersion: "phase-54.v1",
        implementationVersion: "phase-52-static-catalog",
        sourceDescriptor: {
          actionKey: "createNotificationStub",
          ownerType: "default-plugin",
          ownerPluginKey: null,
          inputSchemaKey: "plugin-action.payload.generic",
          requiredPermission: "notification:create:stub",
          sideEffectClass: "proposal",
          implementationSource: "main-repo-static-implementation",
        },
      }),
    ).toThrow(/sideEffectClass/i);
  });
});
