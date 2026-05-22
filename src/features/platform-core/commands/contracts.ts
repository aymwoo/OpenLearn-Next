import { z } from "zod";

import { RuntimeActorScopeSchema } from "@/features/runtime-platform/contracts/permissions";
import { PlatformAuditMetadataSchema } from "@/features/platform-core/ai-contracts/delegation";
import {
  PlatformFailureAttributionSchema,
  PlatformFailureEventSchema,
  type PlatformFailureAttribution,
  type PlatformFailureEvent,
  PlatformSuccessOrDomainEventSchema,
} from "@/features/platform-core/events/contracts";

export const PlatformPluginGovernanceCommandTypes = [
  "plugin.install",
  "plugin.enable",
  "plugin.disable",
  "plugin.reconcile",
  "plugin.retry",
  "plugin.suspend",
  "plugin.resume",
  "plugin.uninstall.preflight",
  "plugin.uninstall",
  "plugin.kill_switch.set",
] as const;

export const PlatformCommandTypeSchema = z.enum(PlatformPluginGovernanceCommandTypes);

export const PlatformCommandActorSchema = z.object({
  actorId: z.string().min(1),
  actorScope: RuntimeActorScopeSchema,
});

export const PlatformCommandScopeSchema = z.object({
  schoolId: z.string().min(1),
  pluginId: z.string().min(1),
});

export const PlatformCommandCorrelationSchema = z.object({
  correlationId: z.string().min(1),
  causationId: z.string().min(1).nullable().default(null),
  producer: z.string().min(1),
});

const PlatformCommandEnvelopeSchema = z.object({
  id: z.string().min(1),
  actor: PlatformCommandActorSchema,
  scope: PlatformCommandScopeSchema,
  correlation: PlatformCommandCorrelationSchema,
  audit: PlatformAuditMetadataSchema.default({
    delegatedActor: null,
    approval: null,
  }),
  dedupeKey: z.string().min(1).optional(),
});

const PluginInstallPayloadSchema = z.object({
  schoolId: z.string().min(1),
  pluginId: z.string().min(1),
  existingRegistrationId: z.string().min(1).optional(),
  name: z.string().min(1),
  installSource: z.enum(["manual", "bootstrap", "repair", "seed"]),
  manifestJson: z.record(z.string(), z.unknown()),
});

const PluginEnablePayloadSchema = z.object({
  schoolId: z.string().min(1),
  pluginId: z.string().min(1),
  enabledBy: z.string().min(1),
});

const PluginDisablePayloadSchema = z.object({
  schoolId: z.string().min(1),
  pluginId: z.string().min(1),
  disabledBy: z.string().min(1),
});

const PluginRetryPayloadSchema = z.object({
  schoolId: z.string().min(1),
  pluginId: z.string().min(1),
  commandId: z.string().min(1),
  reason: z.string().min(1),
});

const PluginReconcileTargetStateSchema = z.enum(["enabled", "mounted", "ready"]);

const PluginReconcilePayloadSchema = z.object({
  schoolId: z.string().min(1),
  pluginId: z.string().min(1),
  reason: z.string().min(1),
  targetState: PluginReconcileTargetStateSchema.optional(),
});

const PluginSuspendPayloadSchema = z.object({
  schoolId: z.string().min(1),
  pluginId: z.string().min(1),
  reason: z.string().min(1),
});

const PluginResumeTargetStateSchema = z.enum(["enabled", "mounted", "ready"]);

const PluginResumePayloadSchema = z.object({
  schoolId: z.string().min(1),
  pluginId: z.string().min(1),
  reason: z.string().min(1),
  targetState: PluginResumeTargetStateSchema.optional(),
});

const PluginUninstallPreflightPayloadSchema = z.object({
  schoolId: z.string().min(1),
  pluginId: z.string().min(1),
});

const PluginUninstallPayloadSchema = z.object({
  schoolId: z.string().min(1),
  pluginId: z.string().min(1),
  retentionMode: z.enum(["retain", "cleanup"]),
  confirmationToken: z.string().min(1).optional(),
});

const PluginKillSwitchSetPayloadSchema = z.object({
  schoolId: z.string().min(1),
  pluginId: z.string().min(1),
  enabled: z.boolean(),
  reason: z.string().min(1),
});

export const PlatformCommandPayloadSchemas = {
  "plugin.install": PluginInstallPayloadSchema,
  "plugin.enable": PluginEnablePayloadSchema,
  "plugin.disable": PluginDisablePayloadSchema,
  "plugin.reconcile": PluginReconcilePayloadSchema,
  "plugin.retry": PluginRetryPayloadSchema,
  "plugin.suspend": PluginSuspendPayloadSchema,
  "plugin.resume": PluginResumePayloadSchema,
  "plugin.uninstall.preflight": PluginUninstallPreflightPayloadSchema,
  "plugin.uninstall": PluginUninstallPayloadSchema,
  "plugin.kill_switch.set": PluginKillSwitchSetPayloadSchema,
} as const;

export const PlatformCommandSchema = z.discriminatedUnion("type", [
  PlatformCommandEnvelopeSchema.extend({
    type: z.literal("plugin.install"),
    payload: PluginInstallPayloadSchema,
  }),
  PlatformCommandEnvelopeSchema.extend({
    type: z.literal("plugin.enable"),
    payload: PluginEnablePayloadSchema,
  }),
  PlatformCommandEnvelopeSchema.extend({
    type: z.literal("plugin.disable"),
    payload: PluginDisablePayloadSchema,
  }),
  PlatformCommandEnvelopeSchema.extend({
    type: z.literal("plugin.reconcile"),
    payload: PluginReconcilePayloadSchema,
  }),
  PlatformCommandEnvelopeSchema.extend({
    type: z.literal("plugin.retry"),
    payload: PluginRetryPayloadSchema,
  }),
  PlatformCommandEnvelopeSchema.extend({
    type: z.literal("plugin.suspend"),
    payload: PluginSuspendPayloadSchema,
  }),
  PlatformCommandEnvelopeSchema.extend({
    type: z.literal("plugin.resume"),
    payload: PluginResumePayloadSchema,
  }),
  PlatformCommandEnvelopeSchema.extend({
    type: z.literal("plugin.uninstall.preflight"),
    payload: PluginUninstallPreflightPayloadSchema,
  }),
  PlatformCommandEnvelopeSchema.extend({
    type: z.literal("plugin.uninstall"),
    payload: PluginUninstallPayloadSchema,
  }),
  PlatformCommandEnvelopeSchema.extend({
    type: z.literal("plugin.kill_switch.set"),
    payload: PluginKillSwitchSetPayloadSchema,
  }),
]);

export const PlatformCommandResultStatusSchema = z.enum(["pending", "running", "succeeded", "failed"]);

export const PlatformCommandInvalidationSchema = z.object({
  tags: z.array(z.string().min(1)).default([]),
});

export const PlatformCommandDispatchResultSchema = z.object({
  commandId: z.string().min(1),
  attemptNumber: z.number().int().positive(),
  status: PlatformCommandResultStatusSchema,
  resultSummary: z.record(z.string(), z.unknown()).nullable(),
  invalidation: PlatformCommandInvalidationSchema,
});

export const PlatformCommandExecutionResultSchema = z.object({
  resultSummary: z.record(z.string(), z.unknown()).nullable(),
  invalidation: PlatformCommandInvalidationSchema.default({ tags: [] }),
  // D-53-07: handler-owned generic/domain event facts must be explicitly carried by execute() results.
  emittedEvents: z.array(PlatformSuccessOrDomainEventSchema).default([]),
  // D-53-08: failed commands emit exactly one generic failure event and never domain-change events.
  failureEvent: PlatformFailureEventSchema.nullable().default(null),
  failureAttribution: PlatformFailureAttributionSchema.nullable().default(null),
}).superRefine((value, ctx) => {
  if (value.failureEvent && value.emittedEvents.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Failed command results cannot include domain events when failureEvent is present",
      path: ["emittedEvents"],
    });
  }

  if (value.failureEvent && !value.failureAttribution) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "failureAttribution is required when failureEvent is present",
      path: ["failureAttribution"],
    });
  }
});

export class PlatformCommandValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlatformCommandValidationError";
  }
}

export class PlatformCommandExecutionError extends Error {
  readonly failureAttribution: PlatformFailureAttribution;
  readonly failureEvent: PlatformFailureEvent;

  constructor(input: {
    message: string;
    failureAttribution: PlatformFailureAttribution;
    failureEvent: PlatformFailureEvent;
  }) {
    super(input.message);
    this.name = "PlatformCommandExecutionError";
    this.failureAttribution = input.failureAttribution;
    this.failureEvent = input.failureEvent;
  }
}

export type PlatformCommandType = z.infer<typeof PlatformCommandTypeSchema>;
export type PlatformCommand = z.infer<typeof PlatformCommandSchema>;
export type PlatformCommandStatus = z.infer<typeof PlatformCommandResultStatusSchema>;
export type PlatformCommandInvalidation = z.infer<typeof PlatformCommandInvalidationSchema>;
export type PlatformCommandDispatchResult = z.infer<typeof PlatformCommandDispatchResultSchema>;
export type PlatformCommandExecutionResult = z.infer<typeof PlatformCommandExecutionResultSchema>;

export type PlatformCommandDefinition<TType extends PlatformCommandType = PlatformCommandType> = {
  commandType: TType;
  payloadSchema: z.ZodTypeAny;
  dedupe: "required" | "optional";
  authorize: (input: { command: PlatformCommand }) => Promise<void> | void;
  execute: (input: { command: PlatformCommand; attemptNumber: number }) => Promise<PlatformCommandExecutionResult>;
};
