import { z } from "zod";

export const ClassroomWebSocketActorScopeSchema = z.enum([
  "teacher",
  "student",
  "runtime",
]);

export const ClassroomWebSocketMessageKindSchema = z.enum([
  "teacher.control",
  "classroom.snapshot",
  "quiz.answer.received",
  "runtime.command",
  "runtime.event",
  "transport.keepalive",
  "transport.error",
]);

export const ClassroomWebSocketServerMessageKindSchema = z.enum([
  "classroom.snapshot",
  "quiz.answer.received",
  "runtime.event",
  "transport.keepalive",
  "transport.error",
]);

export const QuizAnswerReceivedQuestionTypeSchema = z.enum([
  "single_choice",
  "multi_choice",
  "true_false",
  "fill_blank",
  "ordering",
]);

export const QuizAnswerReceivedPayloadSchema = z
  .object({
    questionId: z.string().uuid().or(z.string().min(1)),
    studentId: z.string().uuid().or(z.string().min(1)),
    responseType: QuizAnswerReceivedQuestionTypeSchema,
    payload: z.unknown(),
    receivedAt: z.number().int().positive(),
    classroomSessionId: z.string().uuid().or(z.string().min(1)),
  })
  .strict();

export const ClassroomWebSocketClientMessageKindSchema = z.enum([
  "teacher.control",
  "runtime.command",
  "transport.keepalive",
]);

export const ClassroomWebSocketCorrelationSchema = z
  .object({
    correlationId: z.string().min(1),
    causationId: z.string().min(1).optional(),
    requestId: z.string().min(1).optional(),
    truthPersisted: z.boolean().default(true),
  })
  .strict();

export const ClassroomWebSocketActorSchema = z
  .object({
    userId: z.string().min(1),
    scope: ClassroomWebSocketActorScopeSchema,
    schoolId: z.string().min(1),
    workspaceRole: z.string().min(1).optional(),
  })
  .strict();

const ClassroomWebSocketEnvelopeBaseSchema = z
  .object({
    messageId: z.string().min(1),
    sessionId: z.string().min(1),
    actor: ClassroomWebSocketActorSchema,
    kind: ClassroomWebSocketMessageKindSchema,
    sentAt: z.string().datetime(),
    correlation: ClassroomWebSocketCorrelationSchema,
    payload: z.record(z.string(), z.unknown()),
  })
  .strict();

export const ClassroomWebSocketServerEnvelopeSchema =
  ClassroomWebSocketEnvelopeBaseSchema.extend({
    kind: ClassroomWebSocketServerMessageKindSchema,
  }).strict();

export const ClassroomWebSocketClientEnvelopeSchema =
  ClassroomWebSocketEnvelopeBaseSchema.extend({
    kind: ClassroomWebSocketClientMessageKindSchema,
  }).strict();

export type ClassroomWebSocketActorScope = z.infer<
  typeof ClassroomWebSocketActorScopeSchema
>;
export type ClassroomWebSocketMessageKind = z.infer<
  typeof ClassroomWebSocketMessageKindSchema
>;
export type ClassroomWebSocketServerMessageKind = z.infer<
  typeof ClassroomWebSocketServerMessageKindSchema
>;
export type ClassroomWebSocketClientMessageKind = z.infer<
  typeof ClassroomWebSocketClientMessageKindSchema
>;
export type ClassroomWebSocketCorrelation = z.infer<
  typeof ClassroomWebSocketCorrelationSchema
>;
export type ClassroomWebSocketServerEnvelope = z.infer<
  typeof ClassroomWebSocketServerEnvelopeSchema
>;
export type ClassroomWebSocketClientEnvelope = z.infer<
  typeof ClassroomWebSocketClientEnvelopeSchema
>;

type BuildServerEnvelopeInput = {
  sessionId: string;
  actor: ClassroomWebSocketServerEnvelope["actor"];
  kind: ClassroomWebSocketServerMessageKind;
  correlationId: string;
  causationId?: string;
  requestId?: string;
  payload: Record<string, unknown>;
  truthPersisted?: boolean;
};

export function buildClassroomWebSocketServerEnvelope(
  input: BuildServerEnvelopeInput,
) {
  return ClassroomWebSocketServerEnvelopeSchema.parse({
    messageId: crypto.randomUUID(),
    sessionId: input.sessionId,
    actor: input.actor,
    kind: input.kind,
    sentAt: new Date().toISOString(),
    correlation: {
      correlationId: input.correlationId,
      causationId: input.causationId,
      requestId: input.requestId,
      truthPersisted: input.truthPersisted ?? true,
    },
    payload: input.payload,
  });
}
