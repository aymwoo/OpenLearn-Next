import { z } from "zod";

import { lessonStepPayloadSchema } from "@/lib/dto/lesson-authoring";

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

export const ThemeTokenRegistrySchema = z.object({
  colors: z.record(z.string(), z.string()).optional(),
  surfaces: z.record(z.string(), z.string()).optional(),
  radius: z.record(z.string(), z.string()).optional(),
  typography: z.record(z.string(), z.string()).optional(),
  layout: z.record(z.string(), z.string()).optional(),
});
export type ThemeTokenRegistry = z.infer<typeof ThemeTokenRegistrySchema>;

export const PluginHookAnchorSchema = z.enum(["dashboard.widget", "lesson.sidebar"]);
export type PluginHookAnchor = z.infer<typeof PluginHookAnchorSchema>;

export const PluginActionSchema = z.enum([
  "addStepSuggestion",
  "annotateLesson",
  "createNotificationStub",
  "suggestBuiltInTeachingStep",
  "insertBuiltInTeachingStepTemplate",
]);
export type PluginAction = z.infer<typeof PluginActionSchema>;

export const PluginProposalTypeSchema = z.enum([
  "stepSuggestion",
  "lessonAnnotation",
  "notificationStub",
  "builtInTeachingStepSuggestion",
  "builtInTeachingStepTemplate",
  "unknown",
]);
export type PluginProposalType = z.infer<typeof PluginProposalTypeSchema>;

export const BuiltInTeachingStepKeySchema = z.enum([
  "directInstruction",
  "survey",
  "inquiry",
  "inClassQuiz",
  "evaluation",
]);
export type BuiltInTeachingStepKey = z.infer<typeof BuiltInTeachingStepKeySchema>;

export const BuiltInTeachingStepTemplatePayloadSchema = z.object({
  builtInKey: BuiltInTeachingStepKeySchema,
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
  pluginName: z.string(),
  title: z.string(),
  summary: z.string(),
  stepType: z.enum(["content", "task", "quiz"]),
});
export type BuiltInTeachingStepSuggestionPayload = z.infer<typeof BuiltInTeachingStepSuggestionPayloadSchema>;

export const BUILT_IN_TEACHING_STEP_DEFINITIONS = [
  {
    builtInKey: "directInstruction",
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
    builtInKey: "survey",
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
  permissions: z.array(z.string()).default([]),
  anchors: z.array(PluginHookAnchorSchema),
  actions: z.array(PluginActionSchema),
  builtIn: z.boolean().default(false),
  defaultEnabled: z.boolean().default(false),
  nonDeletable: z.boolean().default(false),
  theme: ThemeTokenRegistrySchema.optional(),
});
export type PluginManifest = z.infer<typeof PluginManifestSchema>;

export const PluginRegistrationDTOSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  name: z.string(),
  manifestJson: PluginManifestSchema,
  enabled: z.boolean(),
  killSwitchEnabled: z.boolean(),
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
  | { proposalType: "unknown"; payload: Record<string, unknown>; denied: true };

export const PluginAuditDTOSchema = z.object({
  id: z.string(),
  pluginId: z.string(),
  action: z.string(),
  payloadJson: z.record(z.string(), z.unknown()),
  actorId: z.string().nullable(),
  createdAt: z.number(),
});
export type PluginAuditDTO = z.infer<typeof PluginAuditDTOSchema>;

export const ThemeRegistryDTOSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  name: z.string(),
  tokenJson: ThemeTokenRegistrySchema,
  validationStatus: z.enum(["valid", "invalid", "pending"]),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type ThemeRegistryDTO = z.infer<typeof ThemeRegistryDTOSchema>;
