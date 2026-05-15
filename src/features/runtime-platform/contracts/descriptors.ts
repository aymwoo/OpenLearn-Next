import { z } from "zod";

import { RuntimeCapabilitySchema } from "./permissions";
import { RUNTIME_CONTRACT_VERSION, RuntimeContractVersionSchema } from "./version";

export const RuntimeDescriptorKindSchema = z.enum(["html-courseware", "plugin-runtime", "agent-runtime"]);

export const RuntimeDescriptorSchema = z.object({
  version: RuntimeContractVersionSchema,
  runtimeId: z.string().min(1),
  kind: RuntimeDescriptorKindSchema,
  displayName: z.string().min(1),
  entry: z.object({
    sandbox: z.enum(["iframe", "worker", "wasm"]),
    bootstrap: z.string().min(1),
  }),
  requestedCapabilities: z.array(RuntimeCapabilitySchema).default([]),
});

export const RuntimeManifestV2Schema = z.object({
  manifestVersion: z.literal(2),
  contractVersion: RuntimeContractVersionSchema.default(RUNTIME_CONTRACT_VERSION),
  pluginId: z.string().min(1),
  runtime: RuntimeDescriptorSchema,
});

export const PluginLifecycleOwnershipSchema = z.object({
  ownerType: z.enum(["host", "plugin-manager", "school-admin"]),
  installScope: z.enum(["global", "school"]),
  lifecycleState: z.enum(["installed", "enabled", "mounted", "ready", "suspended", "disabled"]),
});

export type RuntimeDescriptorKind = z.infer<typeof RuntimeDescriptorKindSchema>;
export type RuntimeDescriptor = z.infer<typeof RuntimeDescriptorSchema>;
export type RuntimeManifestV2 = z.infer<typeof RuntimeManifestV2Schema>;
export type PluginLifecycleOwnership = z.infer<typeof PluginLifecycleOwnershipSchema>;
