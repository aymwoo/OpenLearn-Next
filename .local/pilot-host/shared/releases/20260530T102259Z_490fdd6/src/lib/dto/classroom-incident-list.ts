import { z } from "zod";

export const ClassroomIncidentScopeRoleSchema = z.enum(["admin", "developer"]);

export const ClassroomIncidentPostureSchema = z.enum([
  "healthy",
  "degraded",
  "failed",
  "blocked",
]);

export const ClassroomIncidentImpactScopeSchema = z.enum([
  "current_classroom",
  "multi_classroom",
  "platform",
]);

export const ClassroomIncidentRelationChipKindSchema = z.enum([
  "plugin",
  "command",
  "task",
]);

export const ClassroomIncidentRelationChipDTOSchema = z
  .object({
    kind: ClassroomIncidentRelationChipKindSchema,
    label: z.string().min(1),
    href: z.string().min(1),
  })
  .strict();

export const ClassroomIncidentListRowDTOSchema = z
  .object({
    classroomSessionId: z.string().min(1),
    classId: z.string().min(1),
    className: z.string().min(1),
    lessonId: z.string().min(1),
    lessonTitle: z.string().min(1),
    lessonVersionLabel: z.string().min(1),
    posture: ClassroomIncidentPostureSchema,
    summary: z.string().min(1),
    impactScope: ClassroomIncidentImpactScopeSchema,
    updatedAt: z.string().min(1),
    detailHref: z.string().min(1),
    relationChips: z.array(ClassroomIncidentRelationChipDTOSchema).max(2),
  })
  .strict();

export const ClassroomIncidentListDTOSchema = z
  .object({
    scopeRole: ClassroomIncidentScopeRoleSchema,
    rows: z.array(ClassroomIncidentListRowDTOSchema),
    emptyState: z.string().nullable().default(null),
  })
  .strict();

export type ClassroomIncidentScopeRole = z.infer<
  typeof ClassroomIncidentScopeRoleSchema
>;
export type ClassroomIncidentPosture = z.infer<
  typeof ClassroomIncidentPostureSchema
>;
export type ClassroomIncidentImpactScope = z.infer<
  typeof ClassroomIncidentImpactScopeSchema
>;
export type ClassroomIncidentRelationChipDTO = z.infer<
  typeof ClassroomIncidentRelationChipDTOSchema
>;
export type ClassroomIncidentListRowDTO = z.infer<
  typeof ClassroomIncidentListRowDTOSchema
>;
export type ClassroomIncidentListDTO = z.infer<
  typeof ClassroomIncidentListDTOSchema
>;
