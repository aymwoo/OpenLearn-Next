import { z } from "zod";

import { RuntimeActorScopeSchema } from "@/features/runtime-platform/contracts/permissions";
import { PlatformAuditMetadataSchema } from "@/features/platform-core/ai-contracts/delegation";
import { lessonStepPayloadSchema } from "@/lib/dto/lesson-authoring";
import {
  PlatformFailureAttributionSchema,
  PlatformFailureEventSchema,
  type PlatformFailureAttribution,
  type PlatformFailureEvent,
  PlatformSuccessOrDomainEventSchema,
} from "@/features/platform-core/events/contracts";

export const PlatformPluginGovernanceCommandTypes = [
  "plugin.install",
  "plugin.upgrade.preflight",
  "plugin.upgrade",
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

// AI LessonAgent 起草命令类型（AGENT-04）。复用既有 {schoolId, pluginId} scope，
// scope.pluginId 携带保留 sentinel "core.lesson-agent"（内置系统 agent 身份）。
export const LessonDraftCommandTypes = ["lesson.draft.run", "lesson.draft.persist", "lesson.draft.accept", "lesson.draft.discard"] as const;

// 受治理数据访问**写动词**命令类型（Phase 68, ACCESS-02/ACCESS-03, D-02）。
// 仅两写动词进入命令面；读动词（getByIndex/count/aggregate）绝不声明命令类型（D-03，见 Plan 04）。
export const PluginDataCommandTypes = ["plugin.data.insert", "plugin.data.upsert"] as const;

export const QuizTransportCommandTypes = ["quiz.answer.received"] as const;

export const PlatformCommandTypeSchema = z.enum([
  ...PlatformPluginGovernanceCommandTypes,
  ...LessonDraftCommandTypes,
  ...PluginDataCommandTypes,
  ...QuizTransportCommandTypes,
]);

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
  marketplace: z.object({
    pluginKey: z.string().min(1),
    version: z.string().min(1),
    recoveryMode: z.enum(["fresh", "recover"]).optional(),
  }).optional(),
});

const PluginEnablePayloadSchema = z.object({
  schoolId: z.string().min(1),
  pluginId: z.string().min(1),
  enabledBy: z.string().min(1),
});

const PluginUpgradePreflightPayloadSchema = z.object({
  schoolId: z.string().min(1),
  pluginId: z.string().min(1),
  targetVersion: z.string().min(1),
});

const PluginUpgradePayloadSchema = z.object({
  schoolId: z.string().min(1),
  pluginId: z.string().min(1),
  targetVersion: z.string().min(1),
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

// lesson.draft.run payload —— strict 边界校验（T-62-07），非法 lessonId/stepType/intent
// 在 dispatch 入口被拒。teacherId 绝不出现于 payload（经授权 actor 闭包注入工具）。
const LessonDraftRunPayloadSchema = z.object({
  lessonId: z.string().min(1),
  stepType: z.enum(["content", "task", "quiz"]),
  intent: z.string().min(1),
}).strict();

// lesson.draft.persist payload —— 写型命令边界校验（T-63-06），承接整课已校验步骤包
// （D-02 整课多步，复用 lessonStepPayloadSchema，不造第二套 step schema）。
// teacherId/source 绝不出现于 payload（authorize 阶段闭包注入，见 Plan 04）；
// idempotencyKey 经 envelope.dedupeKey 注入，payload 不重复携带。
const LessonDraftPersistPayloadSchema = z.object({
  lessonId: z.string().min(1),
  steps: z.array(lessonStepPayloadSchema).min(1),
}).strict();

// lesson.draft.accept payload —— 教师审校接受草稿命令（Phase 64）。
// payload 仅 lessonId + draftVersionId + 可选逐步编辑；
// teacherId/schoolId 绝不出现于 payload（authorize 阶段闭包注入）。
const LessonDraftAcceptPayloadSchema = z.object({
  lessonId: z.string().min(1),
  draftVersionId: z.string().min(1),
  editedSteps: z.array(z.object({
    index: z.number().int().nonnegative(),
    title: z.string().min(1),
    description: z.string(),
    content: z.string(),
  })).optional(),
}).strict();

// lesson.draft.discard payload —— 教师审校丢弃草稿命令（Phase 64）。
const LessonDraftDiscardPayloadSchema = z.object({
  lessonId: z.string().min(1),
  draftVersionId: z.string().min(1),
}).strict();

// plugin.data.insert / plugin.data.upsert payload —— 写动词命令边界校验（Phase 68, D-02）。
// 形状仅 {pluginKey, table, values}，复用 plugin-data-access/contracts.ts 的 insert/upsert 面：
// - `values` 为扁平等值映射；表/列的 drizzle-zod 同源深校验在 handler.authorize 经
//   `validateInsertPayload(pluginKey, table, values)` 完成（pluginKey/table 为运行时值，
//   无法在契约层绑定单表 schema，故此处不重复造第二套 step/values schema）。
// - `.strict()` 使顶层多余键（如 schoolId）被拒；schoolId 绝不入 payload，仅由 session 派生
//   注入（cross_school 在白名单层再次拦截）。
const PluginDataInsertPayloadSchema = z.object({
  pluginKey: z.string().min(1),
  table: z.string().min(1),
  values: z.record(z.string(), z.unknown()),
}).strict();

const PluginDataUpsertPayloadSchema = z.object({
  pluginKey: z.string().min(1),
  table: z.string().min(1),
  values: z.record(z.string(), z.unknown()),
}).strict();

const QuizAnswerReceivedPayloadSchema = z.object({
  questionId: z.string().min(1),
  studentId: z.string().min(1),
  responseType: z.enum([
    "single_choice",
    "multi_choice",
    "true_false",
    "fill_blank",
    "ordering",
  ]),
  payload: z.unknown(),
  receivedAt: z.number().int().positive(),
  classroomSessionId: z.string().min(1),
}).strict();

export const PlatformCommandPayloadSchemas = {
  "plugin.install": PluginInstallPayloadSchema,
  "plugin.upgrade.preflight": PluginUpgradePreflightPayloadSchema,
  "plugin.upgrade": PluginUpgradePayloadSchema,
  "plugin.enable": PluginEnablePayloadSchema,
  "plugin.disable": PluginDisablePayloadSchema,
  "plugin.reconcile": PluginReconcilePayloadSchema,
  "plugin.retry": PluginRetryPayloadSchema,
  "plugin.suspend": PluginSuspendPayloadSchema,
  "plugin.resume": PluginResumePayloadSchema,
  "plugin.uninstall.preflight": PluginUninstallPreflightPayloadSchema,
  "plugin.uninstall": PluginUninstallPayloadSchema,
  "plugin.kill_switch.set": PluginKillSwitchSetPayloadSchema,
  "lesson.draft.run": LessonDraftRunPayloadSchema,
  "lesson.draft.persist": LessonDraftPersistPayloadSchema,
  "lesson.draft.accept": LessonDraftAcceptPayloadSchema,
  "lesson.draft.discard": LessonDraftDiscardPayloadSchema,
  "plugin.data.insert": PluginDataInsertPayloadSchema,
  "plugin.data.upsert": PluginDataUpsertPayloadSchema,
  "quiz.answer.received": QuizAnswerReceivedPayloadSchema,
} as const;

export const PlatformCommandSchema = z.discriminatedUnion("type", [
  PlatformCommandEnvelopeSchema.extend({
    type: z.literal("plugin.install"),
    payload: PluginInstallPayloadSchema,
  }),
  PlatformCommandEnvelopeSchema.extend({
    type: z.literal("plugin.upgrade.preflight"),
    payload: PluginUpgradePreflightPayloadSchema,
  }),
  PlatformCommandEnvelopeSchema.extend({
    type: z.literal("plugin.upgrade"),
    payload: PluginUpgradePayloadSchema,
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
  PlatformCommandEnvelopeSchema.extend({
    type: z.literal("lesson.draft.run"),
    payload: LessonDraftRunPayloadSchema,
  }),
  PlatformCommandEnvelopeSchema.extend({
    type: z.literal("lesson.draft.persist"),
    payload: LessonDraftPersistPayloadSchema,
  }),
  PlatformCommandEnvelopeSchema.extend({
    type: z.literal("lesson.draft.accept"),
    payload: LessonDraftAcceptPayloadSchema,
  }),
  PlatformCommandEnvelopeSchema.extend({
    type: z.literal("lesson.draft.discard"),
    payload: LessonDraftDiscardPayloadSchema,
  }),
  PlatformCommandEnvelopeSchema.extend({
    type: z.literal("plugin.data.insert"),
    payload: PluginDataInsertPayloadSchema,
  }),
  PlatformCommandEnvelopeSchema.extend({
    type: z.literal("plugin.data.upsert"),
    payload: PluginDataUpsertPayloadSchema,
  }),
  PlatformCommandEnvelopeSchema.extend({
    type: z.literal("quiz.answer.received"),
    payload: QuizAnswerReceivedPayloadSchema,
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
