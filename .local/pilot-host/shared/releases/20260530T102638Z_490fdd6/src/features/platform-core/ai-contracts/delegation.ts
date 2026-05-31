import { z } from "zod";

import { RuntimeActorScopeSchema } from "@/features/runtime-platform/contracts/permissions";

export const PlatformDelegatedAuthorityPostureSchema = z.literal("delegated-no-elevation");
export type PlatformDelegatedAuthorityPosture = z.infer<typeof PlatformDelegatedAuthorityPostureSchema>;

export const PlatformDelegatedAgentScopeSchema = RuntimeActorScopeSchema.extract(["plugin"]);
export type PlatformDelegatedAgentScope = z.infer<typeof PlatformDelegatedAgentScopeSchema>;

export const PlatformDelegatedActorMetadataSchema = z.object({
  delegatedAgentId: z.string().min(1),
  delegatedAgentScope: PlatformDelegatedAgentScopeSchema,
  delegationReason: z.string().min(1),
  authorityPosture: PlatformDelegatedAuthorityPostureSchema,
}).strict();
export type PlatformDelegatedActorMetadata = z.infer<typeof PlatformDelegatedActorMetadataSchema>;

export const PlatformApprovalStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "not-required",
]);
export type PlatformApprovalStatus = z.infer<typeof PlatformApprovalStatusSchema>;

export const PlatformApprovalReferenceSchema = z.object({
  kind: z.enum(["command", "event", "audit-log", "url"]),
  id: z.string().min(1),
  summary: z.string().min(1),
  href: z.string().url().optional(),
}).strict();
export type PlatformApprovalReference = z.infer<typeof PlatformApprovalReferenceSchema>;

export const PlatformApprovalMetadataSchema = z.object({
  status: PlatformApprovalStatusSchema,
  summary: z.string().min(1),
  reference: PlatformApprovalReferenceSchema.nullable().default(null),
}).strict();
export type PlatformApprovalMetadata = z.infer<typeof PlatformApprovalMetadataSchema>;

export const PlatformAuditMetadataSchema = z.object({
  delegatedActor: PlatformDelegatedActorMetadataSchema.nullable().default(null),
  approval: PlatformApprovalMetadataSchema.nullable().default(null),
}).strict();
export type PlatformAuditMetadata = z.infer<typeof PlatformAuditMetadataSchema>;
