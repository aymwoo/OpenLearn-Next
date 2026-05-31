import { z } from "zod";

import { PlatformAuditMetadataSchema } from "@/features/platform-core/ai-contracts/delegation";

const SummaryRecordSchema = z.record(z.string(), z.unknown()).superRefine((value, ctx) => {
  for (const [key, entry] of Object.entries(value)) {
    if (key.toLowerCase().endsWith("json")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Summary payload field '${key}' must not include object snapshots`,
        path: [key],
      });
    }

    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      for (const nestedKey of Object.keys(entry as Record<string, unknown>)) {
        if (nestedKey.toLowerCase().endsWith("json")) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Summary payload field '${key}.${nestedKey}' must not include object snapshots`,
            path: [key, nestedKey],
          });
        }
      }
    }
  }
});

export const PlatformFailureAttributionSchema = z.object({
  scope: z.enum(["plugin", "dependency", "operator"]),
  pluginId: z.string().min(1),
  reasonCode: z.string().min(1),
  recommendedRecoveryAction: z.string().min(1),
});

const PlatformCommandSucceededPayloadSchema = z.object({
  commandType: z.string().min(1),
  invalidationTags: z.array(z.string().min(1)).default([]),
  resultSummary: SummaryRecordSchema.nullable().default(null),
}).strict();

const PlatformCommandFailedPayloadSchema = z.object({
  commandType: z.string().min(1),
  reasonCode: z.string().min(1),
  failureAttribution: PlatformFailureAttributionSchema,
}).strict();

const PluginInstalledPayloadSchema = z.object({
  pluginId: z.string().min(1),
  pluginKey: z.string().min(1),
  installSource: z.enum(["manual", "bootstrap", "repair", "seed"]),
  lifecycleState: z.string().min(1),
}).strict();

const PluginLifecycleChangedPayloadSchema = z.object({
  pluginId: z.string().min(1),
  fromState: z.string().min(1).nullable().default(null),
  toState: z.string().min(1),
  reasonCode: z.string().min(1),
  transitionCounter: z.number().int().nonnegative(),
}).strict();

const PluginKillSwitchChangedPayloadSchema = z.object({
  pluginId: z.string().min(1),
  enabled: z.boolean(),
  reasonCode: z.string().min(1),
  toggleCounter: z.number().int().nonnegative(),
}).strict();

export const PlatformSuccessEventSchema = z.object({
  eventType: z.literal("platform.command.succeeded"),
  category: z.literal("outcome"),
  aggregateType: z.literal("plugin"),
  aggregateId: z.string().min(1),
  payload: PlatformCommandSucceededPayloadSchema,
  audit: PlatformAuditMetadataSchema.default({
    delegatedActor: null,
    approval: null,
  }),
}).strict();

export const PlatformFailureEventSchema = z.object({
  eventType: z.literal("platform.command.failed"),
  category: z.literal("outcome"),
  aggregateType: z.literal("plugin"),
  aggregateId: z.string().min(1),
  payload: PlatformCommandFailedPayloadSchema,
  audit: PlatformAuditMetadataSchema.default({
    delegatedActor: null,
    approval: null,
  }),
}).strict();

export const PluginInstalledEventSchema = z.object({
  eventType: z.literal("plugin.installed"),
  category: z.literal("domain"),
  aggregateType: z.literal("plugin"),
  aggregateId: z.string().min(1),
  payload: PluginInstalledPayloadSchema,
  audit: PlatformAuditMetadataSchema.default({
    delegatedActor: null,
    approval: null,
  }),
}).strict();

export const PluginLifecycleChangedEventSchema = z.object({
  eventType: z.literal("plugin.lifecycle.changed"),
  category: z.literal("domain"),
  aggregateType: z.literal("plugin"),
  aggregateId: z.string().min(1),
  payload: PluginLifecycleChangedPayloadSchema,
  audit: PlatformAuditMetadataSchema.default({
    delegatedActor: null,
    approval: null,
  }),
}).strict();

export const PluginKillSwitchChangedEventSchema = z.object({
  eventType: z.literal("plugin.kill_switch.changed"),
  category: z.literal("domain"),
  aggregateType: z.literal("plugin"),
  aggregateId: z.string().min(1),
  payload: PluginKillSwitchChangedPayloadSchema,
  audit: PlatformAuditMetadataSchema.default({
    delegatedActor: null,
    approval: null,
  }),
}).strict();

export const PlatformEventSchema = z.discriminatedUnion("eventType", [
  PlatformSuccessEventSchema,
  PlatformFailureEventSchema,
  PluginInstalledEventSchema,
  PluginLifecycleChangedEventSchema,
  PluginKillSwitchChangedEventSchema,
]);

export const PlatformDomainEventSchema = z.union([
  PluginInstalledEventSchema,
  PluginLifecycleChangedEventSchema,
  PluginKillSwitchChangedEventSchema,
]);

export const PlatformSuccessOrDomainEventSchema = z.union([
  PlatformSuccessEventSchema,
  PlatformDomainEventSchema,
]);

export const PlatformEventBridgeOwnershipSchema = z.object({
  sourceOfTruth: z.literal("sqlite-platform-event-ledger"),
  delivery: z.enum(["in-process", "redis-bridge", "websocket-bridge"]),
  posture: z.literal("ledger-first"),
  notes: z.array(z.string()).default([]),
});

export type PlatformEvent = z.infer<typeof PlatformEventSchema>;
export type PlatformDomainEvent = z.infer<typeof PlatformDomainEventSchema>;
export type PlatformSuccessEvent = z.infer<typeof PlatformSuccessEventSchema>;
export type PlatformFailureEvent = z.infer<typeof PlatformFailureEventSchema>;
export type PlatformFailureAttribution = z.infer<typeof PlatformFailureAttributionSchema>;
export type PlatformEventBridgeOwnership = z.infer<typeof PlatformEventBridgeOwnershipSchema>;
export type PlatformSuccessOrDomainEvent = z.infer<typeof PlatformSuccessOrDomainEventSchema>;
export type PlatformPersistedDispatchBatch = {
  commandId: string;
  attemptNumber: number;
  eventIds: string[];
  dispatchIds: string[];
};

export type PlatformEventPublicationPort = {
  readonly id: string;
  readonly ownership: PlatformEventBridgeOwnership;
  describeOwnership(): PlatformEventBridgeOwnership;
  publishPersisted(batch: PlatformPersistedDispatchBatch): Promise<void>;
  subscribe(eventType: PlatformEvent["eventType"] | "*", handler: (event: PlatformEvent) => Promise<void>): () => void;
};
