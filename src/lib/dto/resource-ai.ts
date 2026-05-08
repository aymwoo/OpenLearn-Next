import { z } from "zod";

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
});
export type ThemeTokenRegistry = z.infer<typeof ThemeTokenRegistrySchema>;

export const PluginManifestSchema = z.object({
  id: z.string(),
  version: z.string(),
  permissions: z.array(z.string()).default([]),
  anchors: z.array(z.enum(["dashboard.widget", "lesson.sidebar"])),
  actions: z.array(z.enum(["addStepSuggestion", "annotateLesson", "createNotificationStub"])),
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
  action: z.enum(["addStepSuggestion", "annotateLesson", "createNotificationStub"]),
  payload: z.record(z.string(), z.any()),
});
export type PluginActionInput = z.infer<typeof PluginActionInputSchema>;

export const PluginAuditDTOSchema = z.object({
  id: z.string(),
  pluginId: z.string(),
  action: z.string(),
  payloadJson: z.record(z.string(), z.any()),
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
