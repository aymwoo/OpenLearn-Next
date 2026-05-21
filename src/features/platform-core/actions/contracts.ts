import { z } from "zod";

import {
  GovernanceLifecycleInternalSubstateSchema,
  GovernanceLifecycleStateSchema,
  PluginRecoveryActionSchema,
} from "@/features/platform-core/plugins/lifecycle-contracts";
import { PluginPermissionSchema } from "@/features/runtime-platform/contracts/permissions";

// D-52-04 + ACTN-05: descriptor truth stays on main-repo static implementations only.
export const ActionImplementationSourceSchema = z.literal("main-repo-static-implementation");
export type ActionImplementationSource = z.infer<typeof ActionImplementationSourceSchema>;

export const ActionOwnerTypeSchema = z.enum(["built-in", "default-plugin", "external-plugin"]);
export type ActionOwnerType = z.infer<typeof ActionOwnerTypeSchema>;

export const ActionSideEffectClassSchema = z.enum([
  "proposal",
  "annotation",
  "notification-stub",
  "teaching-step-template",
  "schedule-proposal",
  "schedule-reminder",
  "schedule-annotation",
]);
export type ActionSideEffectClass = z.infer<typeof ActionSideEffectClassSchema>;

// D-52-02: blocked diagnostics must use stable machine-readable reason codes.
export const ActionBlockedReasonCodeSchema = z.enum([
  "plugin_not_installed",
  "plugin_not_enabled",
  "plugin_suspended",
  "dependency_not_satisfied",
  "activation_failed",
  "duplicate_action_key",
]);
export type ActionBlockedReasonCode = z.infer<typeof ActionBlockedReasonCodeSchema>;

// D-52-01 / D-52-03: descriptor truth is shared, but executable catalog and blocked diagnostics stay split.
export const ActionDescriptorSchema = z.object({
  actionKey: z.string().min(1),
  ownerType: ActionOwnerTypeSchema,
  ownerPluginKey: z.string().min(1).nullable(),
  inputSchemaKey: z.string().min(1),
  requiredPermission: PluginPermissionSchema.nullable(),
  sideEffectClass: ActionSideEffectClassSchema,
  implementationSource: ActionImplementationSourceSchema,
});
export type ActionDescriptor = z.infer<typeof ActionDescriptorSchema>;

export const ExecutableActionCatalogRowSchema = ActionDescriptorSchema.extend({
  catalogView: z.literal("executable"),
  ownerPluginId: z.string().min(1).nullable().default(null),
  ownerDisplayName: z.string().min(1).nullable().default(null),
  lifecycleState: GovernanceLifecycleStateSchema.default("active"),
});
export type ExecutableActionCatalogRow = z.infer<typeof ExecutableActionCatalogRowSchema>;

export const BlockedActionDiagnosticRowSchema = ActionDescriptorSchema.extend({
  catalogView: z.literal("blocked-diagnostic"),
  ownerPluginId: z.string().min(1).nullable().default(null),
  ownerDisplayName: z.string().min(1).nullable().default(null),
  lifecycleState: GovernanceLifecycleStateSchema,
  internalLifecycleSubstate: GovernanceLifecycleInternalSubstateSchema.nullable().default(null),
  reasonCode: ActionBlockedReasonCodeSchema,
  recommendedRecoveryAction: PluginRecoveryActionSchema.nullable().default(null),
});
export type BlockedActionDiagnosticRow = z.infer<typeof BlockedActionDiagnosticRowSchema>;
