import { z } from "zod";
import { AsyncTaskOutcomeCountsSchema, AsyncTaskOutcomeStatusSchema, AsyncTaskResultSummarySchema } from "@/features/async-tasks/shared/contract";
import {
  BlockedActionDiagnosticRowSchema,
  ExecutableActionCatalogRowSchema,
} from "@/features/platform-core/actions/contracts";
import {
  PlatformAiDescriptorCatalogSchema,
  PlatformAiDescriptorSchema,
} from "@/features/platform-core/ai-contracts/contracts";

import { PluginManifestGovernanceV2Schema } from "@/features/runtime-platform/contracts/descriptors";
import { PluginPermissionSchema, PluginLifecycleStateSchema } from "@/features/runtime-platform/contracts/permissions";
import { BuiltInTeachingStepKeySchema, lessonStepPayloadSchema } from "@/lib/dto/lesson-authoring";
import {
  TEACHER_THEME_ROUTE_KEYS,
  THEME_LAYOUT_REGION_KEYS,
  THEME_LAYOUT_REQUIRED_REGIONS,
  THEME_PAGE_MODULE_KEYS,
} from "@/lib/theme-layout/route-surface-registry";

export const ResourceVisibilitySchema = z.enum(["private", "course", "school"]);
export type ResourceVisibility = z.infer<typeof ResourceVisibilitySchema>;

export const ResourceClassificationSchema = z.enum(["textbook", "worksheet", "other"]);
export type ResourceClassification = z.infer<typeof ResourceClassificationSchema>;

export const ResourceCardDTOSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  ownerId: z.string(),
  courseId: z.string().nullable(),
  title: z.string(),
  visibility: ResourceVisibilitySchema,
  classification: z.string(),
  ragEligible: z.boolean(),
  url: z.string().nullable(),
  knowledgeSourceStatus: z.enum(["pending", "processing", "completed", "failed"]).nullable().default(null),
  knowledgeSourceError: z.string().nullable().default(null),
  indexedChunkCount: z.number().int().nonnegative().default(0),
  failedChunkCount: z.number().int().nonnegative().default(0),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type ResourceCardDTO = z.infer<typeof ResourceCardDTOSchema>;

export const CreateResourceInputSchema = z.object({
  schoolId: z.string(),
  courseId: z.string().optional(),
  title: z.string().min(1),
  visibility: ResourceVisibilitySchema.default("private"),
  classification: z.string().min(1),
  ragEligible: z.boolean().default(false),
  url: z.string().optional(),
  content: z.string().optional(),
});
export type CreateResourceInput = z.infer<typeof CreateResourceInputSchema>;

export const UpdateResourceInputSchema = CreateResourceInputSchema.partial();
export type UpdateResourceInput = z.infer<typeof UpdateResourceInputSchema>;

export const KnowledgeSourceDTOSchema = z.object({
  id: z.string(),
  resourceId: z.string(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  error: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type KnowledgeSourceDTO = z.infer<typeof KnowledgeSourceDTOSchema>;

export const KnowledgeChunkDTOSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  chunkIndex: z.number().int(),
  textHash: z.string(),
  tokenEstimate: z.number().int(),
  payloadJson: z.record(z.string(), z.any()),
  metadataJson: z.record(z.string(), z.any()),
  indexingStatus: z.enum(["pending", "indexed", "failed"]),
  createdAt: z.number(),
});
export type KnowledgeChunkDTO = z.infer<typeof KnowledgeChunkDTOSchema>;

export const ResourceKnowledgeSourceTaskPayloadSchema = z.object({
  knowledgeSourceId: z.string().min(1),
  resourceId: z.string().min(1),
  schoolId: z.string().min(1),
  actorId: z.string().min(1),
}).strict();
export type ResourceKnowledgeSourceTaskPayload = z.infer<typeof ResourceKnowledgeSourceTaskPayloadSchema>;

export const ResourceKnowledgeSourceTaskResultSchema = AsyncTaskResultSummarySchema.extend({
  knowledgeSourceId: z.string().min(1),
  resourceId: z.string().min(1),
  schoolId: z.string().min(1),
  actorId: z.string().min(1),
  knowledgeSourceStatus: z.enum(["completed", "failed"]),
  indexedChunkCount: z.number().int().nonnegative(),
  failedChunkCount: z.number().int().nonnegative(),
  counts: AsyncTaskOutcomeCountsSchema,
  outcome: AsyncTaskOutcomeStatusSchema,
}).strict();
export type ResourceKnowledgeSourceTaskResult = z.infer<typeof ResourceKnowledgeSourceTaskResultSchema>;

export const RetrievalFilterDTOSchema = z.object({
  schoolId: z.string(),
  courseId: z.string().nullable().optional(),
  visibility: ResourceVisibilitySchema.optional(),
  resourceId: z.string().optional(),
  grade: z.string().optional(),
  subject: z.string().optional(),
});
export type RetrievalFilterDTO = z.infer<typeof RetrievalFilterDTOSchema>;

export const AgentRegistryDTOSchema = z.object({
  id: z.string(),
  agentKey: z.string(),
  displayName: z.string(),
  capabilityManifestJson: z.record(z.string(), z.any()),
  featureFlag: z.string().nullable(),
  enabled: z.boolean(),
});
export type AgentRegistryDTO = z.infer<typeof AgentRegistryDTOSchema>;

export const ActionCatalogDTOSchema = z.array(ExecutableActionCatalogRowSchema);
export type ActionCatalogDTO = z.infer<typeof ActionCatalogDTOSchema>;

export const ActionBlockedDiagnosticDTOSchema = z.array(BlockedActionDiagnosticRowSchema);
export type ActionBlockedDiagnosticDTO = z.infer<typeof ActionBlockedDiagnosticDTOSchema>;

export const PlatformAiDescriptorDTOSchema = PlatformAiDescriptorSchema;
export type PlatformAiDescriptorDTO = z.infer<typeof PlatformAiDescriptorDTOSchema>;

export const PlatformAiDescriptorCatalogDTOSchema = PlatformAiDescriptorCatalogSchema;
export type PlatformAiDescriptorCatalogDTO = z.infer<typeof PlatformAiDescriptorCatalogDTOSchema>;

export const AgentProposalDTOSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  structuredOutputJson: z.record(z.string(), z.any()),
  status: z.enum(["pending", "approved", "rejected", "applied"]),
  approvalState: z.string(),
  requestedById: z.string(),
  approvedById: z.string().nullable(),
});
export type AgentProposalDTO = z.infer<typeof AgentProposalDTOSchema>;

export const McpServerDTOSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  name: z.string(),
  url: z.string(),
  status: z.string(),
});
export type McpServerDTO = z.infer<typeof McpServerDTOSchema>;

export const McpCapabilityDTOSchema = z.object({
  id: z.string(),
  serverId: z.string(),
  name: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  allowedRolesJson: z.array(z.string()),
  courseId: z.string().nullable(),
});
export type McpCapabilityDTO = z.infer<typeof McpCapabilityDTOSchema>;

export const McpAuditDTOSchema = z.object({
  id: z.string(),
  serverId: z.string(),
  action: z.string(),
  payloadJson: z.record(z.string(), z.any()),
  actorId: z.string().nullable(),
  createdAt: z.number(),
});
export type McpAuditDTO = z.infer<typeof McpAuditDTOSchema>;

export const ThemeShellModeSchema = z.enum(["left-nav", "top-nav", "top-nav-secondary-rail"]);
export type ThemeShellMode = z.infer<typeof ThemeShellModeSchema>;

export const ThemeShellRadiusSchema = z.enum(["rounded", "square"]);
export type ThemeShellRadius = z.infer<typeof ThemeShellRadiusSchema>;

export const ThemeShellWidthSchema = z.enum(["default", "full-width"]);
export type ThemeShellWidth = z.infer<typeof ThemeShellWidthSchema>;

export const ThemeShellChromeSchema = z.enum([
  "default",
  "immersive",
  "minimal",
  "presentation",
  "fullscreen",
  "focus",
]);
export type ThemeShellChrome = z.infer<typeof ThemeShellChromeSchema>;

export const ThemeLayoutRegionKeySchema = z.enum(THEME_LAYOUT_REGION_KEYS);
export type ThemeLayoutRegionKey = z.infer<typeof ThemeLayoutRegionKeySchema>;

export const ThemePageModuleKeySchema = z.enum(THEME_PAGE_MODULE_KEYS);
export type ThemePageModuleKey = z.infer<typeof ThemePageModuleKeySchema>;

export const ThemeRouteSurfaceKeySchema = z.enum(TEACHER_THEME_ROUTE_KEYS);
export type ThemeRouteSurfaceKey = z.infer<typeof ThemeRouteSurfaceKeySchema>;

export const ThemeLayoutSplitSchema = z.enum(["30/70", "40/60", "50/50", "60/40"]);
export type ThemeLayoutSplit = z.infer<typeof ThemeLayoutSplitSchema>;

export const LegacyThemeLayoutTokenKeySchema = z.enum([
  "shell-gap",
  "shell-inset",
  "content-radius",
  "sidebar-width",
]);
export type LegacyThemeLayoutTokenKey = z.infer<typeof LegacyThemeLayoutTokenKeySchema>;

export const LegacyThemeLayoutTokensSchema = z.partialRecord(LegacyThemeLayoutTokenKeySchema, z.string());
export type LegacyThemeLayoutTokens = z.infer<typeof LegacyThemeLayoutTokensSchema>;

export const ThemeLayoutRegionSchema = z.object({
  region: ThemeLayoutRegionKeySchema,
  visible: z.boolean().optional(),
  modules: z.array(ThemePageModuleKeySchema).max(6).optional(),
  split: ThemeLayoutSplitSchema.optional(),
});
export type ThemeLayoutRegion = z.infer<typeof ThemeLayoutRegionSchema>;

const ThemeLayoutRegionListSchema = z.array(ThemeLayoutRegionSchema).superRefine((regions, ctx) => {
  const seen = new Set<string>();
  for (const region of regions) {
    if (seen.has(region.region)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate region: ${region.region}`,
      });
    }
    seen.add(region.region);
  }
});

export const ThemePageSurfaceOverrideSchema = z.object({
  shell: z.object({
    mode: ThemeShellModeSchema.optional(),
    radius: ThemeShellRadiusSchema.optional(),
    width: ThemeShellWidthSchema.optional(),
    chrome: ThemeShellChromeSchema.optional(),
  }).optional(),
  regions: ThemeLayoutRegionListSchema.optional(),
});
export type ThemePageSurfaceOverride = z.infer<typeof ThemePageSurfaceOverrideSchema>;

export const ThemeShellLayoutSchema = z.object({
  mode: ThemeShellModeSchema.default("left-nav"),
  radius: ThemeShellRadiusSchema.default("rounded"),
  width: ThemeShellWidthSchema.default("default"),
  chrome: ThemeShellChromeSchema.default("default"),
  defaultRegions: ThemeLayoutRegionListSchema,
}).superRefine((shell, ctx) => {
  const regionMap = new Map(shell.defaultRegions.map((region) => [region.region, region]));
  for (const requiredRegion of THEME_LAYOUT_REQUIRED_REGIONS) {
    const config = regionMap.get(requiredRegion);
    if (!config || config.visible === false) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Required region must remain visible: ${requiredRegion}`,
      });
    }
  }
});

export const ThemeLayoutContractSchema = z.object({
  shell: ThemeShellLayoutSchema,
  pages: z.partialRecord(ThemeRouteSurfaceKeySchema, ThemePageSurfaceOverrideSchema).optional(),
  tokens: LegacyThemeLayoutTokensSchema.optional(),
});
export type ThemeLayoutContract = z.infer<typeof ThemeLayoutContractSchema>;

export const ThemeLayoutRegionRuntimeSchema = z.object({
  region: ThemeLayoutRegionKeySchema,
  visible: z.boolean(),
  modules: z.array(ThemePageModuleKeySchema),
  split: ThemeLayoutSplitSchema.nullable(),
  fallback: z.boolean().default(false),
});
export type ThemeLayoutRegionRuntime = z.infer<typeof ThemeLayoutRegionRuntimeSchema>;

export const ThemeLayoutSummarySchema = z.object({
  shellMode: ThemeShellModeSchema,
  shellLabel: z.string(),
  mainSplit: ThemeLayoutSplitSchema,
  mainSplitLabel: z.string(),
  helperRegionSummary: z.array(z.string()),
  fallbackRegions: z.array(ThemeLayoutRegionKeySchema),
  fallbackLabel: z.string().nullable(),
  description: z.string(),
});
export type ThemeLayoutSummary = z.infer<typeof ThemeLayoutSummarySchema>;

export const ThemeShellConfigSchema = z.object({
  mode: ThemeShellModeSchema,
  radius: ThemeShellRadiusSchema,
  width: ThemeShellWidthSchema,
  chrome: ThemeShellChromeSchema,
});
export type ThemeShellConfig = z.infer<typeof ThemeShellConfigSchema>;

export const ShellSurfaceMetadataSchema = z.object({
  routeKey: ThemeRouteSurfaceKeySchema,
  label: z.string(),
  regions: z.array(ThemeLayoutRegionRuntimeSchema),
  summary: ThemeLayoutSummarySchema,
});
export type ShellSurfaceMetadata = z.infer<typeof ShellSurfaceMetadataSchema>;

export const ThemePageSurfaceRuntimeSchema = z.object({
  routeKey: ThemeRouteSurfaceKeySchema,
  shellMode: ThemeShellModeSchema,
  shellConfig: ThemeShellConfigSchema,
  regions: z.array(ThemeLayoutRegionRuntimeSchema),
  summary: ThemeLayoutSummarySchema,
});
export type ThemePageSurfaceRuntime = z.infer<typeof ThemePageSurfaceRuntimeSchema>;

export const ShellSurfaceResolverResultSchema = z.object({
  shellVariant: ThemeShellModeSchema,
  shellConfig: ThemeShellConfigSchema,
  surfaceMetadata: ShellSurfaceMetadataSchema,
});
export type ShellSurfaceResolverResult = z.infer<typeof ShellSurfaceResolverResultSchema>;

export const ThemeLayoutRuntimeSchema = z.object({
  defaultSurface: ThemePageSurfaceRuntimeSchema,
  pages: z.partialRecord(ThemeRouteSurfaceKeySchema, ThemePageSurfaceRuntimeSchema),
  summary: ThemeLayoutSummarySchema,
});
export type ThemeLayoutRuntime = z.infer<typeof ThemeLayoutRuntimeSchema>;

export const ThemeTokenRegistrySchema = z.object({
  colors: z.record(z.string(), z.string()).optional(),
  surfaces: z.record(z.string(), z.string()).optional(),
  radius: z.record(z.string(), z.string()).optional(),
  typography: z.record(z.string(), z.string()).optional(),
  layout: z.union([ThemeLayoutContractSchema, LegacyThemeLayoutTokensSchema]).optional(),
});
export type ThemeTokenRegistry = z.infer<typeof ThemeTokenRegistrySchema>;

export const PluginHookAnchorSchema = z.enum(["dashboard.widget", "lesson.sidebar", "schedule.assistant"]);
export type PluginHookAnchor = z.infer<typeof PluginHookAnchorSchema>;

export const ScheduleProposalTypeSchema = z.enum([
  "scheduleOverrideProposal",
  "scheduleReminderDraft",
  "scheduleConflictAnnotation",
]);
export type ScheduleProposalType = z.infer<typeof ScheduleProposalTypeSchema>;

export const ScheduleOverrideProposalPayloadSchema = z.object({
  recurringEntryId: z.string(),
  effectiveDate: z.string(),
  reason: z.string(),
  action: z.enum(["substitute", "cancel", "move"]),
  substituteTeacherId: z.string().nullable().optional(),
  replacementBellSlotId: z.string().nullable().optional(),
  replacementRoomLabel: z.string().nullable().optional(),
});
export type ScheduleOverrideProposalPayload = z.infer<typeof ScheduleOverrideProposalPayloadSchema>;

export const ScheduleReminderDraftPayloadSchema = z.object({
  type: z.enum(["pre_class", "schedule_change"]),
  channel: z.string(),
  recipientScope: z.enum(["teacher", "class_operator"]),
  offsetMinutes: z.number().int().nonnegative(),
});
export type ScheduleReminderDraftPayload = z.infer<typeof ScheduleReminderDraftPayloadSchema>;

export const ScheduleConflictAnnotationPayloadSchema = z.object({
  targetId: z.string(),
  title: z.string(),
  explanation: z.string(),
});
export type ScheduleConflictAnnotationPayload = z.infer<typeof ScheduleConflictAnnotationPayloadSchema>;

export const PluginActionSchema = z.enum([
  "addStepSuggestion",
  "annotateLesson",
  "createNotificationStub",
  "suggestBuiltInTeachingStep",
  "insertBuiltInTeachingStepTemplate",
  "createScheduleOverrideProposal",
  "createScheduleReminderDraft",
  "annotateScheduleConflict",
]);
export type PluginAction = z.infer<typeof PluginActionSchema>;

export const PluginProposalTypeSchema = z.enum([
  "stepSuggestion",
  "lessonAnnotation",
  "notificationStub",
  "builtInTeachingStepSuggestion",
  "builtInTeachingStepTemplate",
  "scheduleOverrideProposal",
  "scheduleReminderDraft",
  "scheduleConflictAnnotation",
  "unknown",
]);
export type PluginProposalType = z.infer<typeof PluginProposalTypeSchema>;

export type BuiltInTeachingStepKey = z.infer<typeof BuiltInTeachingStepKeySchema>;

export const BuiltInTeachingStepTemplatePayloadSchema = z.object({
  builtInKey: BuiltInTeachingStepKeySchema,
  pluginKey: z.string().nullable().optional(),
  pluginName: z.string(),
  title: z.string(),
  summary: z.string(),
  stepType: z.enum(["content", "task", "quiz"]),
  initialTitle: z.string(),
  initialPayload: lessonStepPayloadSchema,
});
export type BuiltInTeachingStepTemplatePayload = z.infer<typeof BuiltInTeachingStepTemplatePayloadSchema>;

export const BuiltInTeachingStepSuggestionPayloadSchema = z.object({
  builtInKey: BuiltInTeachingStepKeySchema,
  pluginKey: z.string().nullable().optional(),
  pluginName: z.string(),
  title: z.string(),
  summary: z.string(),
  stepType: z.enum(["content", "task", "quiz"]),
});
export type BuiltInTeachingStepSuggestionPayload = z.infer<typeof BuiltInTeachingStepSuggestionPayloadSchema>;

export const BUILT_IN_TEACHING_STEP_DEFINITIONS = [
  {
    builtInKey: "directInstruction",
    pluginKey: "builtin-teaching-step-direct-instruction",
    pluginName: "教师讲授",
    title: "教师讲授",
    summary: "面向全班进行重点讲授、示范演示或板书整理。",
    stepType: "content",
    initialTitle: "教师讲授",
    initialPayload: {
      type: "content",
      title: "教师讲授",
      body: "围绕本节重点展开讲授，结合板书、示范或例题帮助学生建立知识框架。",
      teacherNotes: "先明确本环节目标，再补充示范或关键提示。",
      materialRefs: [],
    },
  },
  {
    builtInKey: "markdownDeck",
    pluginKey: "builtin-teaching-step-markdown-deck",
    pluginName: "Markdown 课件",
    title: "Markdown 课件",
    summary: "插入可渲染 Mermaid 与 RevealJS 的 markdown 文档课件。",
    stepType: "content",
    initialTitle: "Markdown 课件",
    initialPayload: {
      type: "content",
      title: "Markdown 课件",
      body: "请上传 markdown 文档，或直接粘贴课件内容。",
      teacherNotes: "可切换为 Reveal 模式进行课堂放映。",
      materialRefs: [],
    },
  },
  {
    builtInKey: "htmlCourseware",
    pluginKey: null,
    pluginName: "HTML 互动课件",
    title: "HTML 互动课件",
    summary: "插入本地 HTML runtime pilot，在共享 Runtime Host 中完成互动、保存与提交。",
    stepType: "task",
    initialTitle: "HTML 互动课件",
    initialPayload: {
      type: "task",
      prompt: "在互动课件中完成观察、填写结论，并提交你的结构化结果。",
      submissionType: "text",
      successCriteria: "完成至少一次互动输入，并提交观察结论与自评状态。",
      allowRetry: true,
      retryPolicy: "unlimited",
      materialRefs: [],
      runtime: {
        version: "v2",
        runtimeId: "runtime-html-courseware",
        runtimeVersion: "2026.05.0",
        kind: "html-courseware",
        displayName: "HTML 互动课件 Pilot",
        stateSchemaVersion: "state-v1",
        entry: {
          sandbox: "iframe",
          bootstrap: "/runtime/html-courseware/pilot",
        },
        bootstrap: {
          contextMode: "step-summary",
          resumeStrategy: "latest-or-create",
          capabilitySnapshot: "session-scoped",
        },
        submitTarget: {
          primary: "classroom-evidence",
          additional: ["task-submission"],
        },
        requestedCapabilities: [
          "runtime:ready",
          "runtime:event:emit",
          "runtime:state:save",
          "runtime:submission:create",
        ],
      },
    },
  },
  {
    builtInKey: "survey",
    pluginKey: "builtin-teaching-step-survey",
    pluginName: "问卷调查",
    title: "问卷调查",
    summary: "快速收集学生理解度、偏好或课堂反馈。",
    stepType: "quiz",
    initialTitle: "问卷调查",
    initialPayload: {
      type: "quiz",
      question: "你对当前内容的理解程度如何？",
      options: ["已经掌握", "还想再练习", "需要老师再讲解"],
      explanation: "通过问卷结果判断是否需要调整节奏。",
      allowRetry: true,
      retryPolicy: "unlimited",
      revealCorrectAnswer: false,
    },
  },
  {
    builtInKey: "inquiry",
    pluginKey: "builtin-teaching-step-inquiry",
    pluginName: "学生探究",
    title: "学生探究",
    summary: "布置开放任务，引导学生自主观察、讨论与记录。",
    stepType: "task",
    initialTitle: "学生探究",
    initialPayload: {
      type: "task",
      prompt: "结合课堂材料，小组讨论并记录你们的发现、证据和结论。",
      submissionType: "text",
      successCriteria: "至少整理出 2 条发现，并说明对应依据。",
      allowRetry: true,
      retryPolicy: "unlimited",
      materialRefs: [],
    },
  },
  {
    builtInKey: "inClassQuiz",
    pluginKey: "builtin-teaching-step-quiz",
    pluginName: "课堂测验",
    title: "课堂测验",
    summary: "用简短测验即时检查学生对关键知识点的掌握情况。",
    stepType: "quiz",
    initialTitle: "课堂测验",
    initialPayload: {
      type: "quiz",
      question: "以下哪一项最符合本节课的核心结论？",
      options: ["选项 A", "选项 B", "选项 C", "选项 D"],
      correctOptionIndex: 0,
      explanation: "可按实际教学内容补充正确答案解释。",
      allowRetry: true,
      retryPolicy: "once",
      revealCorrectAnswer: true,
    },
  },
  {
    builtInKey: "evaluation",
    pluginKey: "builtin-teaching-step-evaluation",
    pluginName: "评价",
    title: "评价",
    summary: "引导学生进行自评、互评或教师反馈总结。",
    stepType: "task",
    initialTitle: "评价",
    initialPayload: {
      type: "task",
      prompt: "请从完成情况、收获和下一步改进三个方面进行简短评价。",
      submissionType: "text",
      successCriteria: "评价内容至少覆盖一个优点和一个改进点。",
      allowRetry: true,
      retryPolicy: "once",
      materialRefs: [],
    },
  },
] as const satisfies readonly BuiltInTeachingStepTemplatePayload[];

export type BuiltInTeachingStepDefinition = (typeof BUILT_IN_TEACHING_STEP_DEFINITIONS)[number];
export type BuiltInTeachingPluginName = BuiltInTeachingStepDefinition["pluginName"];

export const PluginManifestSchema = z.object({
  id: z.string(),
  version: z.string(),
  manifestVersion: z.literal(1).or(z.literal(2)).default(1),
  permissions: z.array(PluginPermissionSchema).default([]),
  anchors: z.array(PluginHookAnchorSchema),
  actions: z.array(PluginActionSchema),
  builtIn: z.boolean().default(false),
  defaultEnabled: z.boolean().default(false),
  nonDeletable: z.boolean().default(false),
  theme: ThemeTokenRegistrySchema.optional(),
  governance: PluginManifestGovernanceV2Schema.optional(),
}).superRefine((manifest, ctx) => {
  if (manifest.manifestVersion === 2 && !manifest.governance) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "manifest v2 requires governance metadata",
      path: ["governance"],
    });
  }
});
export type PluginManifest = z.infer<typeof PluginManifestSchema>;

export const PluginRegistrationDTOSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  name: z.string(),
  manifestJson: PluginManifestSchema,
  pluginKey: z.string(),
  dbNamespace: z.string(),
  sourceType: z.enum(["default", "external"]),
  installSource: z.enum(["manual", "bootstrap", "repair", "seed"]),
  enabled: z.boolean(),
  killSwitchEnabled: z.boolean(),
  lifecycleState: PluginLifecycleStateSchema,
  builtIn: z.boolean(),
  defaultEnabled: z.boolean(),
  nonDeletable: z.boolean(),
});
export type PluginRegistrationDTO = z.infer<typeof PluginRegistrationDTOSchema>;

export const PluginActionInputSchema = z.object({
  pluginId: z.string(),
  action: PluginActionSchema,
  payload: z.record(z.string(), z.unknown()),
});
export type PluginActionInput = z.infer<typeof PluginActionInputSchema>;

export type PluginActionResult =
  | { proposalType: "stepSuggestion"; payload: Record<string, unknown> }
  | { proposalType: "lessonAnnotation"; payload: Record<string, unknown> }
  | { proposalType: "notificationStub"; payload: Record<string, unknown> }
  | { proposalType: "builtInTeachingStepSuggestion"; payload: BuiltInTeachingStepSuggestionPayload }
  | { proposalType: "builtInTeachingStepTemplate"; payload: BuiltInTeachingStepTemplatePayload }
  | { proposalType: "scheduleOverrideProposal"; payload: ScheduleOverrideProposalPayload }
  | { proposalType: "scheduleReminderDraft"; payload: ScheduleReminderDraftPayload }
  | { proposalType: "scheduleConflictAnnotation"; payload: ScheduleConflictAnnotationPayload }
  | { proposalType: "unknown"; payload: Record<string, unknown>; denied: true };

export const PluginAuditDTOSchema = z.object({
  id: z.string(),
  pluginId: z.string(),
  action: z.string(),
  decision: z.enum(["allowed", "denied"]),
  reason: z.string().nullable(),
  payloadJson: z.record(z.string(), z.unknown()),
  actorId: z.string().nullable(),
  schoolId: z.string().nullable().optional(),
  correlationId: z.string().nullable().optional(),
  createdAt: z.number(),
});
export type PluginAuditDTO = z.infer<typeof PluginAuditDTOSchema>;

export const ThemeRegistryDTOSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  name: z.string(),
  tokenJson: ThemeTokenRegistrySchema,
  validationStatus: z.enum(["valid", "invalid", "pending"]),
  layoutRuntime: ThemeLayoutRuntimeSchema.optional(),
  layoutSummary: ThemeLayoutSummarySchema.optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type ThemeRegistryDTO = z.infer<typeof ThemeRegistryDTOSchema>;

export const ThemeResolvedRuntimeDTOSchema = z.object({
  theme: ThemeRegistryDTOSchema,
  cssVariables: z.record(z.string(), z.string()),
  layoutRuntime: ThemeLayoutRuntimeSchema,
  layoutSummary: ThemeLayoutSummarySchema,
});
export type ThemeResolvedRuntimeDTO = z.infer<typeof ThemeResolvedRuntimeDTOSchema>;
