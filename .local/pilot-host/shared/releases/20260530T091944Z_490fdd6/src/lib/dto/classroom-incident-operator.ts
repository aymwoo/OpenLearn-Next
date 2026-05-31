import { z } from "zod";

import {
  ClassroomIncidentImpactScopeSchema,
  ClassroomIncidentPostureSchema,
  ClassroomIncidentScopeRoleSchema,
} from "@/lib/dto/classroom-incident-list";

export const ClassroomIncidentDetailMetricDTOSchema = z
  .object({
    key: z.string().min(1),
    label: z.string().min(1),
    value: z.string().min(1),
    tone: ClassroomIncidentPostureSchema,
  })
  .strict();

export const ClassroomIncidentHeroDTOSchema = z
  .object({
    classroomSessionId: z.string().min(1),
    classId: z.string().min(1),
    className: z.string().min(1),
    lessonId: z.string().min(1),
    lessonTitle: z.string().min(1),
    lessonVersionId: z.string().min(1),
    lessonVersionLabel: z.string().min(1),
    runtimeSessionId: z.string().nullable().default(null),
    sessionStatus: z.string().min(1),
    updatedAt: z.string().min(1),
    detailHref: z.string().min(1),
  })
  .strict();

export const ClassroomIncidentHonestyDTOSchema = z
  .object({
    trustedFacts: z.string().min(1),
    untrustedFacts: z.string().min(1),
    impactScope: ClassroomIncidentImpactScopeSchema,
    recommendedNextStep: z.string().min(1),
    nextStepHref: z.string().min(1),
  })
  .strict();

export const ClassroomIncidentProblemCardDTOSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    summary: z.string().min(1),
    posture: ClassroomIncidentPostureSchema,
    detailHref: z.string().min(1),
  })
  .strict();

export const ClassroomIncidentRelatedCardKindSchema = z.enum([
  "runtime",
  "plugin",
  "action",
  "command",
  "task",
]);

export const ClassroomIncidentRelatedCardDTOSchema = z
  .object({
    kind: ClassroomIncidentRelatedCardKindSchema,
    id: z.string().min(1),
    label: z.string().min(1),
    summary: z.string().min(1),
    href: z.string().min(1),
    nextStepHref: z.string().min(1),
  })
  .strict();

export const ClassroomIncidentActionSchema = z.enum([
  "retry",
  "reconcile",
  "resume",
  "suspend",
  "fallback",
]);

export const ClassroomIncidentActionDTOSchema = z
  .object({
    action: ClassroomIncidentActionSchema,
    label: z.string().min(1),
    enabled: z.boolean(),
    reason: z.string().nullable().default(null),
    nextStepHref: z.string().nullable().default(null),
  })
  .strict();

export const ClassroomIncidentOperatorDTOSchema = z
  .object({
    scopeRole: ClassroomIncidentScopeRoleSchema,
    hero: ClassroomIncidentHeroDTOSchema,
    metrics: z
      .array(ClassroomIncidentDetailMetricDTOSchema)
      .min(3)
      .max(4),
    honesty: ClassroomIncidentHonestyDTOSchema,
    problemCards: z.array(ClassroomIncidentProblemCardDTOSchema),
    relatedCards: z.array(ClassroomIncidentRelatedCardDTOSchema),
    lightActions: z.array(ClassroomIncidentActionDTOSchema),
    guardedActions: z.array(ClassroomIncidentActionDTOSchema),
  })
  .strict();

export type ClassroomIncidentDetailMetricDTO = z.infer<
  typeof ClassroomIncidentDetailMetricDTOSchema
>;
export type ClassroomIncidentHeroDTO = z.infer<
  typeof ClassroomIncidentHeroDTOSchema
>;
export type ClassroomIncidentHonestyDTO = z.infer<
  typeof ClassroomIncidentHonestyDTOSchema
>;
export type ClassroomIncidentProblemCardDTO = z.infer<
  typeof ClassroomIncidentProblemCardDTOSchema
>;
export type ClassroomIncidentRelatedCardDTO = z.infer<
  typeof ClassroomIncidentRelatedCardDTOSchema
>;
export type ClassroomIncidentActionDTO = z.infer<
  typeof ClassroomIncidentActionDTOSchema
>;
export type ClassroomIncidentOperatorDTO = z.infer<
  typeof ClassroomIncidentOperatorDTOSchema
>;
