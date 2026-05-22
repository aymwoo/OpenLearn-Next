import { describe, expect, it, vi } from "vitest";

import { listStaticActionCatalog } from "../actions/static-catalog";
import { PlatformPluginGovernanceCommandTypes } from "../commands/contracts";
import { RuntimeCapabilityValues } from "@/features/runtime-platform/contracts/permissions";

vi.mock("server-only", () => ({}));

describe("phase 54 ai descriptor registry", () => {
  it("projects command descriptors from real repo command registry only", async () => {
    const {
      buildPlatformDescriptorCatalog,
      projectPlatformCommandDescriptors,
    } = await import("./registry");

    const descriptors = projectPlatformCommandDescriptors();

    expect(descriptors.map((descriptor) => descriptor.key)).toEqual(
      PlatformPluginGovernanceCommandTypes.map((commandType) => `command:${commandType}`),
    );
    expect(descriptors.every((descriptor) => descriptor.implementationSource === "platform-command-bus")).toBe(true);

    const catalog = buildPlatformDescriptorCatalog();
    expect(catalog.filter((descriptor) => descriptor.kind === "command")).toHaveLength(
      PlatformPluginGovernanceCommandTypes.length,
    );
  });

  it("projects action descriptors from the phase 52 static catalog truth", async () => {
    const { projectPlatformActionDescriptors } = await import("./registry");

    const sourceCatalog = listStaticActionCatalog();
    const descriptors = projectPlatformActionDescriptors();

    expect(descriptors).toHaveLength(sourceCatalog.length);

    for (const descriptor of descriptors) {
      const sourceDescriptor = sourceCatalog.find(
        (entry) => entry.actionKey === descriptor.sourceDescriptor.actionKey,
      );

      expect(sourceDescriptor).toBeDefined();
      expect(descriptor.sourceDescriptor).toMatchObject({
        actionKey: sourceDescriptor?.actionKey,
        ownerType: sourceDescriptor?.ownerType,
        ownerPluginKey: sourceDescriptor?.ownerPluginKey,
        inputSchemaKey: sourceDescriptor?.inputSchemaKey,
        requiredPermission: sourceDescriptor?.requiredPermission,
        sideEffectClass: sourceDescriptor?.sideEffectClass,
        implementationSource: sourceDescriptor?.implementationSource,
      });
    }
  });

  it("projects capability descriptors from runtime capability truth only", async () => {
    const { projectPlatformCapabilityDescriptors } = await import("./registry");

    const descriptors = projectPlatformCapabilityDescriptors();

    expect(descriptors.map((descriptor) => descriptor.key)).toEqual(
      RuntimeCapabilityValues.map((capability) => `capability:${capability}`),
    );
    expect(descriptors.every((descriptor) => descriptor.implementationSource === "runtime-capability-registry")).toBe(true);
  });
});
