import { z } from "zod";

import {
  ActionDescriptorSchema,
  ActionImplementationSourceSchema,
  ActionSideEffectClassSchema,
} from "@/features/platform-core/actions/contracts";
import {
  PluginPermissionSchema,
  RuntimeCapabilitySchema,
} from "@/features/runtime-platform/contracts/permissions";

export const AiDescriptorKindSchema = z.enum(["command", "action", "capability"]);
export type AiDescriptorKind = z.infer<typeof AiDescriptorKindSchema>;

export const AiDescriptorDelegationPostureSchema = z.enum([
  "host-only",
  "allowed-with-approval",
  "operator-delegated",
]);
export type AiDescriptorDelegationPosture = z.infer<typeof AiDescriptorDelegationPostureSchema>;

export const AiDescriptorApprovalPostureSchema = z.enum([
  "no-human-approval",
  "teacher-approval-required",
  "operator-review-required",
]);
export type AiDescriptorApprovalPosture = z.infer<typeof AiDescriptorApprovalPostureSchema>;

export const AiDescriptorStabilitySchema = z.enum([
  "experimental",
  "beta",
  "stable",
  "deprecated",
]);
export type AiDescriptorStability = z.infer<typeof AiDescriptorStabilitySchema>;

export const AiDescriptorImplementationSourceSchema = z.union([
  ActionImplementationSourceSchema,
  z.literal("platform-command-bus"),
  z.literal("runtime-capability-registry"),
]);
export type AiDescriptorImplementationSource = z.infer<typeof AiDescriptorImplementationSourceSchema>;

export const AiDescriptorSideEffectClassSchema = z.union([
  ActionSideEffectClassSchema,
  z.literal("platform-write"),
  z.literal("event-emission"),
]);
export type AiDescriptorSideEffectClass = z.infer<typeof AiDescriptorSideEffectClassSchema>;

const PlatformAiDescriptorBaseSchema = z.object({
  kind: AiDescriptorKindSchema,
  key: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  inputSchemaKey: z.string().min(1),
  requiredCapabilities: z.array(RuntimeCapabilitySchema).default([]),
  requiredPermission: PluginPermissionSchema.nullable().default(null),
  sideEffectClass: AiDescriptorSideEffectClassSchema,
  implementationSource: AiDescriptorImplementationSourceSchema,
  delegationPosture: AiDescriptorDelegationPostureSchema,
  approvalPosture: AiDescriptorApprovalPostureSchema,
  stability: AiDescriptorStabilitySchema,
  contractVersion: z.string().min(1),
  implementationVersion: z.string().min(1),
});

export const PlatformAiActionDescriptorSchema = PlatformAiDescriptorBaseSchema.extend({
  kind: z.literal("action"),
  implementationSource: ActionImplementationSourceSchema,
  sideEffectClass: ActionSideEffectClassSchema,
  sourceDescriptor: ActionDescriptorSchema,
}).superRefine((value, ctx) => {
  if (value.inputSchemaKey !== value.sourceDescriptor.inputSchemaKey) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "inputSchemaKey must match ActionDescriptorSchema semantics",
      path: ["inputSchemaKey"],
    });
  }

  if (value.requiredPermission !== value.sourceDescriptor.requiredPermission) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "requiredPermission must match ActionDescriptorSchema semantics",
      path: ["requiredPermission"],
    });
  }

  if (value.sideEffectClass !== value.sourceDescriptor.sideEffectClass) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "sideEffectClass must match ActionDescriptorSchema semantics",
      path: ["sideEffectClass"],
    });
  }

  if (value.implementationSource !== value.sourceDescriptor.implementationSource) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "implementationSource must match ActionDescriptorSchema semantics",
      path: ["implementationSource"],
    });
  }
});
export type PlatformAiActionDescriptor = z.infer<typeof PlatformAiActionDescriptorSchema>;

export const PlatformAiCommandDescriptorSchema = PlatformAiDescriptorBaseSchema.extend({
  kind: z.literal("command"),
  implementationSource: z.literal("platform-command-bus"),
  sideEffectClass: z.literal("platform-write"),
});
export type PlatformAiCommandDescriptor = z.infer<typeof PlatformAiCommandDescriptorSchema>;

export const PlatformAiCapabilityDescriptorSchema = PlatformAiDescriptorBaseSchema.extend({
  kind: z.literal("capability"),
  implementationSource: z.literal("runtime-capability-registry"),
  sideEffectClass: z.literal("event-emission"),
});
export type PlatformAiCapabilityDescriptor = z.infer<typeof PlatformAiCapabilityDescriptorSchema>;

export const PlatformAiDescriptorSchema = z.discriminatedUnion("kind", [
  PlatformAiCommandDescriptorSchema,
  PlatformAiActionDescriptorSchema,
  PlatformAiCapabilityDescriptorSchema,
]);
export type PlatformAiDescriptor = z.infer<typeof PlatformAiDescriptorSchema>;

export const PlatformAiDescriptorCatalogSchema = z.array(PlatformAiDescriptorSchema);
export type PlatformAiDescriptorCatalog = z.infer<typeof PlatformAiDescriptorCatalogSchema>;
