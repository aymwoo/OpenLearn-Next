import { z } from "zod";

import { PlatformAuditMetadataSchema } from "@/features/platform-core/ai-contracts/delegation";
// `draft-guardrails` 是最低层、非 server-only 的契约模块（reason-code 词表）。
// events/contracts 依赖 lib/dto 属于正确的向下依赖方向；绝不反向依赖
// server/ai/tools，也不会因此把 events/contracts 拉进 server-only 边界。
import { GuardrailReasonCodeSchema } from "@/lib/dto/draft-guardrails";

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

const LessonStepTypeSchema = z.enum(["content", "task", "quiz"]);

// summary-only + strict 守卫：复用既有快照拒绝语义（字段名禁以 json 结尾，
// 报 "must not include object snapshots"），并对未声明字段施加 strict 拒绝。
// 用 passthrough + superRefine 以保证在剥离前即可命中 *Json 字段名检查。
function summaryOnlyStrictPayload<Shape extends z.ZodRawShape>(shape: Shape) {
  const allowedKeys = new Set(Object.keys(shape));
  return z.object(shape).passthrough().superRefine((value, ctx) => {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (key.toLowerCase().endsWith("json")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Summary payload field '${key}' must not include object snapshots`,
          path: [key],
        });
        continue;
      }

      if (!allowedKeys.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.unrecognized_keys,
          keys: [key],
          path: [],
        });
        continue;
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
}

const LessonDraftRequestedPayloadSchema = summaryOnlyStrictPayload({
  commandType: z.string().min(1),
  stepType: LessonStepTypeSchema,
  intentSummary: z.string().min(1),
});

const LessonToolInvokedPayloadSchema = summaryOnlyStrictPayload({
  toolName: z.string().min(1),
  stepType: LessonStepTypeSchema,
  attempt: z.number().int().positive(),
});

const LessonDraftProducedPayloadSchema = summaryOnlyStrictPayload({
  stepType: LessonStepTypeSchema,
  title: z.string().min(1),
  succeeded: z.literal(true),
  tokenUsage: z.number().int().nonnegative().optional(),
});

// lesson.draft.persisted —— 写型命令成功后落账的 summary-only provenance 事件（DRAFT-03）。
// .strict() 仅允许 id/version/stepCount/source，拒绝任意额外键（含 snapshotJson），
// 沿用 Phase 62 summary-only 守卫：整包 snapshot 仅入 resultSummary/落表，绝不入事件 payload。
const LessonDraftPersistedPayloadSchema = z.object({
  draftVersionId: z.string().min(1),
  version: z.number().int().positive(),
  stepCount: z.number().int().nonnegative(),
  source: z.literal("ai"),
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

export const LessonDraftRequestedEventSchema = z.object({
  eventType: z.literal("lesson.draft.requested"),
  category: z.literal("domain"),
  aggregateType: z.literal("lesson"),
  aggregateId: z.string().min(1),
  payload: LessonDraftRequestedPayloadSchema,
  audit: PlatformAuditMetadataSchema.default({
    delegatedActor: null,
    approval: null,
  }),
}).strict();

export const LessonToolInvokedEventSchema = z.object({
  eventType: z.literal("lesson.tool.invoked"),
  category: z.literal("domain"),
  aggregateType: z.literal("lesson"),
  aggregateId: z.string().min(1),
  payload: LessonToolInvokedPayloadSchema,
  audit: PlatformAuditMetadataSchema.default({
    delegatedActor: null,
    approval: null,
  }),
}).strict();

export const LessonDraftProducedEventSchema = z.object({
  eventType: z.literal("lesson.draft.produced"),
  category: z.literal("domain"),
  aggregateType: z.literal("lesson"),
  aggregateId: z.string().min(1),
  payload: LessonDraftProducedPayloadSchema,
  audit: PlatformAuditMetadataSchema.default({
    delegatedActor: null,
    approval: null,
  }),
}).strict();

export const LessonDraftPersistedEventSchema = z.object({
  eventType: z.literal("lesson.draft.persisted"),
  category: z.literal("domain"),
  aggregateType: z.literal("lesson"),
  aggregateId: z.string().min(1),
  payload: LessonDraftPersistedPayloadSchema,
  audit: PlatformAuditMetadataSchema.default({
    delegatedActor: null,
    approval: null,
  }),
}).strict();

// Phase 64 — 教师审校接受草稿事件（summary-only）。
const LessonDraftAcceptedPayloadSchema = z.object({
  draftVersionId: z.string().min(1),
  version: z.number().int().positive(),
  appliedStepCount: z.number().int().nonnegative(),
  source: z.literal("ai"),
}).strict();

export const LessonDraftAcceptedEventSchema = z.object({
  eventType: z.literal("lesson.draft.accepted"),
  category: z.literal("domain"),
  aggregateType: z.literal("lesson"),
  aggregateId: z.string().min(1),
  payload: LessonDraftAcceptedPayloadSchema,
  audit: PlatformAuditMetadataSchema.default({
    delegatedActor: null,
    approval: null,
  }),
}).strict();

// Phase 64 — 教师审校丢弃草稿事件（summary-only）。
const LessonDraftDiscardedPayloadSchema = z.object({
  draftVersionId: z.string().min(1),
  version: z.number().int().positive(),
}).strict();

export const LessonDraftDiscardedEventSchema = z.object({
  eventType: z.literal("lesson.draft.discarded"),
  category: z.literal("domain"),
  aggregateType: z.literal("lesson"),
  aggregateId: z.string().min(1),
  payload: LessonDraftDiscardedPayloadSchema,
  audit: PlatformAuditMetadataSchema.default({
    delegatedActor: null,
    approval: null,
  }),
}).strict();

// Phase 64 — 草稿应用到活跃步骤事件（summary-only，CONTRACT-ONLY）。
const LessonDraftAppliedPayloadSchema = z.object({
  lessonId: z.string().min(1),
  draftVersionId: z.string().min(1),
  replacedStepCount: z.number().int().nonnegative(),
  newStepCount: z.number().int().nonnegative(),
}).strict();

export const LessonDraftAppliedEventSchema = z.object({
  eventType: z.literal("lesson.draft.applied"),
  category: z.literal("domain"),
  aggregateType: z.literal("lesson"),
  aggregateId: z.string().min(1),
  payload: LessonDraftAppliedPayloadSchema,
  audit: PlatformAuditMetadataSchema.default({
    delegatedActor: null,
    approval: null,
  }),
}).strict();

// Phase 65 — 守卫拦截草稿事件（summary-only，EVAL-02 "被拦截输出记录可查"）。
// payload 仅承载 lessonId/stepType/reasonCode/teacherId —— 绝不含 step 快照或
// 任何 *Json 字段（D-07 / T-65-PII），由 summaryOnlyStrictPayload 在结构上强制。
const LessonDraftRejectedPayloadSchema = summaryOnlyStrictPayload({
  lessonId: z.string().min(1),
  stepType: LessonStepTypeSchema,
  reasonCode: GuardrailReasonCodeSchema,
  teacherId: z.string().min(1),
});

export const LessonDraftRejectedEventSchema = z.object({
  eventType: z.literal("lesson.draft.rejected"),
  category: z.literal("domain"),
  aggregateType: z.literal("lesson"),
  aggregateId: z.string().min(1),
  payload: LessonDraftRejectedPayloadSchema,
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
  LessonDraftRequestedEventSchema,
  LessonToolInvokedEventSchema,
  LessonDraftProducedEventSchema,
  LessonDraftPersistedEventSchema,
  LessonDraftAcceptedEventSchema,
  LessonDraftDiscardedEventSchema,
  LessonDraftAppliedEventSchema,
  LessonDraftRejectedEventSchema,
]);

export const PlatformDomainEventSchema = z.union([
  PluginInstalledEventSchema,
  PluginLifecycleChangedEventSchema,
  PluginKillSwitchChangedEventSchema,
  LessonDraftRequestedEventSchema,
  LessonToolInvokedEventSchema,
  LessonDraftProducedEventSchema,
  LessonDraftPersistedEventSchema,
  LessonDraftAcceptedEventSchema,
  LessonDraftDiscardedEventSchema,
  LessonDraftAppliedEventSchema,
  LessonDraftRejectedEventSchema,
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
export type LessonDraftRequestedEvent = z.infer<typeof LessonDraftRequestedEventSchema>;
export type LessonToolInvokedEvent = z.infer<typeof LessonToolInvokedEventSchema>;
export type LessonDraftProducedEvent = z.infer<typeof LessonDraftProducedEventSchema>;
export type LessonDraftPersistedEvent = z.infer<typeof LessonDraftPersistedEventSchema>;
export type LessonDraftPersistedPayload = z.infer<typeof LessonDraftPersistedPayloadSchema>;
export type LessonDraftAcceptedEvent = z.infer<typeof LessonDraftAcceptedEventSchema>;
export type LessonDraftAcceptedPayload = z.infer<typeof LessonDraftAcceptedPayloadSchema>;
export type LessonDraftDiscardedEvent = z.infer<typeof LessonDraftDiscardedEventSchema>;
export type LessonDraftDiscardedPayload = z.infer<typeof LessonDraftDiscardedPayloadSchema>;
export type LessonDraftAppliedEvent = z.infer<typeof LessonDraftAppliedEventSchema>;
export type LessonDraftAppliedPayload = z.infer<typeof LessonDraftAppliedPayloadSchema>;
export type LessonDraftRejectedEvent = z.infer<typeof LessonDraftRejectedEventSchema>;
export type LessonDraftRejectedPayload = z.infer<typeof LessonDraftRejectedPayloadSchema>;
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
