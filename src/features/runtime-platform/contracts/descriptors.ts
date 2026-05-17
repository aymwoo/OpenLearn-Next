import { z } from "zod";

import {
  PluginLifecycleStateSchema,
  PluginPermissionSchema,
  RuntimeCapabilitySchema,
} from "./permissions";
import { RUNTIME_CONTRACT_VERSION, RuntimeContractVersionSchema } from "./version";

export const RuntimeDescriptorKindSchema = z.enum(["html-courseware", "plugin-runtime", "agent-runtime"]);

export const RuntimeSubmitBridgeTargetSchema = z.enum([
  "classroom-evidence",
  "task-submission",
  "quiz-attempt",
]);

export const RuntimeSubmitTargetSchema = z.object({
  primary: RuntimeSubmitBridgeTargetSchema,
  additional: z.array(RuntimeSubmitBridgeTargetSchema).default([]),
});

export const RuntimeBootstrapMetadataSchema = z.object({
  contextMode: z.enum(["minimal", "step-summary"]).default("minimal"),
  resumeStrategy: z.enum(["latest-or-create", "always-new"]).default("latest-or-create"),
  capabilitySnapshot: z.literal("session-scoped").default("session-scoped"),
});

export const RuntimeDescriptorSchema = z.object({
  version: RuntimeContractVersionSchema,
  runtimeId: z.string().min(1),
  runtimeVersion: z.string().min(1),
  kind: RuntimeDescriptorKindSchema,
  displayName: z.string().min(1),
  stateSchemaVersion: z.string().min(1),
  entry: z.object({
    sandbox: z.enum(["iframe", "worker", "wasm"]),
    bootstrap: z.string().min(1),
  }),
  bootstrap: RuntimeBootstrapMetadataSchema.default({
    contextMode: "minimal",
    resumeStrategy: "latest-or-create",
    capabilitySnapshot: "session-scoped",
  }),
  submitTarget: RuntimeSubmitTargetSchema,
  requestedCapabilities: z.array(RuntimeCapabilitySchema).default([]),
});

export const RuntimeEntryDescriptorSchema = z.object({
  sandbox: z.enum(["iframe", "worker", "wasm"]),
  bootstrap: z
    .string()
    .min(1)
    .refine((value) => value.startsWith("/"), {
      message: "runtime bootstrap must stay local-only",
    })
    .refine((value) => !/^https?:\/\//.test(value), {
      message: "runtime bootstrap cannot use remote URL",
    }),
});

export const PluginLifecycleMetadataSchema = z.object({
  ownerType: z.enum(["host", "plugin-manager", "school-admin"]).default("host"),
  installScope: z.enum(["global", "school"]).default("school"),
  initialState: PluginLifecycleStateSchema.default("installed"),
  mountMode: z.enum(["manual", "session-bootstrap"]).default("manual"),
});

export const PluginManifestGovernanceV2Schema = z.object({
  manifestVersion: z.literal(2),
  contractVersion: RuntimeContractVersionSchema.default(RUNTIME_CONTRACT_VERSION),
  runtime: RuntimeDescriptorSchema.extend({
    entry: RuntimeEntryDescriptorSchema,
  }).optional(),
  requestedCapabilities: z.array(RuntimeCapabilitySchema).default([]),
  permissions: z.array(PluginPermissionSchema).default([]),
  lifecycle: PluginLifecycleMetadataSchema.default({
    ownerType: "host",
    installScope: "school",
    initialState: "installed",
    mountMode: "manual",
  }),
});

export const RuntimeManifestV2Schema = z.object({
  manifestVersion: z.literal(2),
  contractVersion: RuntimeContractVersionSchema.default(RUNTIME_CONTRACT_VERSION),
  pluginId: z.string().min(1),
  runtime: RuntimeDescriptorSchema.extend({
    entry: RuntimeEntryDescriptorSchema,
  }),
  requestedCapabilities: z.array(RuntimeCapabilitySchema).default([]),
  permissions: z.array(PluginPermissionSchema).default([]),
  lifecycle: PluginLifecycleMetadataSchema.default({
    ownerType: "host",
    installScope: "school",
    initialState: "installed",
    mountMode: "manual",
  }),
});

export const PluginLifecycleOwnershipSchema = z.object({
  ownerType: z.enum(["host", "plugin-manager", "school-admin"]),
  installScope: z.enum(["global", "school"]),
  lifecycleState: PluginLifecycleStateSchema,
});

export type RuntimeDescriptorKind = z.infer<typeof RuntimeDescriptorKindSchema>;
export type RuntimeSubmitBridgeTarget = z.infer<typeof RuntimeSubmitBridgeTargetSchema>;
export type RuntimeSubmitTarget = z.infer<typeof RuntimeSubmitTargetSchema>;
export type RuntimeBootstrapMetadata = z.infer<typeof RuntimeBootstrapMetadataSchema>;
export type RuntimeDescriptor = z.infer<typeof RuntimeDescriptorSchema>;
export type RuntimeEntryDescriptor = z.infer<typeof RuntimeEntryDescriptorSchema>;
export type PluginLifecycleMetadata = z.infer<typeof PluginLifecycleMetadataSchema>;
export type PluginManifestGovernanceV2 = z.infer<typeof PluginManifestGovernanceV2Schema>;
export type RuntimeManifestV2 = z.infer<typeof RuntimeManifestV2Schema>;
export type PluginLifecycleOwnership = z.infer<typeof PluginLifecycleOwnershipSchema>;
