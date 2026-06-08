import { describe, expect, it } from "vitest";

import {
  ClassroomWebSocketClientEnvelopeSchema,
  ClassroomWebSocketMessageKindSchema,
  ClassroomWebSocketServerEnvelopeSchema,
  QuizAnswerReceivedPayloadSchema,
  buildClassroomWebSocketServerEnvelope,
} from "./ws-envelope";

describe("ws envelope contract", () => {
  it("locks the canonical bidirectional message kinds", () => {
    expect(ClassroomWebSocketMessageKindSchema.options).toEqual([
      "teacher.control",
      "classroom.snapshot",
      "quiz.answer.received",
      "runtime.command",
      "runtime.event",
      "transport.keepalive",
      "transport.error",
    ]);
  });

  it("validates quiz.answer.received payload schema and rejects extra fields", () => {
    expect(
      QuizAnswerReceivedPayloadSchema.parse({
        questionId: "question-1",
        studentId: "student-1",
        responseType: "multi_choice",
        payload: ["A", "C"],
        receivedAt: 1710000000000,
        classroomSessionId: "session-1",
      }),
    ).toMatchObject({
      responseType: "multi_choice",
      classroomSessionId: "session-1",
    });

    expect(() =>
      QuizAnswerReceivedPayloadSchema.parse({
        questionId: "question-1",
        studentId: "student-1",
        responseType: "single_choice",
        payload: "A",
        receivedAt: 1710000000000,
        classroomSessionId: "session-1",
        extra: true,
      }),
    ).toThrow();
  });

  it("builds a typed server envelope for quiz.answer.received", () => {
    const envelope = buildClassroomWebSocketServerEnvelope({
      sessionId: "session-1",
      actor: {
        userId: "teacher-1",
        scope: "teacher",
        schoolId: "school-1",
      },
      kind: "quiz.answer.received",
      correlationId: "corr-quiz-1",
      payload: {
        questionId: "question-1",
        studentId: "student-1",
        responseType: "true_false",
        payload: "A",
        receivedAt: 1710000000000,
        classroomSessionId: "session-1",
      },
    });

    expect(envelope.kind).toBe("quiz.answer.received");
    expect(envelope.correlation.correlationId).toBe("corr-quiz-1");
  });

  it("builds a typed server envelope with message, session, actor and correlation metadata", () => {
    const envelope = buildClassroomWebSocketServerEnvelope({
      sessionId: "session-1",
      actor: {
        userId: "teacher-1",
        scope: "teacher",
        schoolId: "school-1",
        workspaceRole: "teacher",
      },
      kind: "classroom.snapshot",
      correlationId: "corr-1",
      causationId: "event-1",
      requestId: "req-1",
      payload: {
        snapshot: { version: 3 },
      },
      truthPersisted: true,
    });

    expect(ClassroomWebSocketServerEnvelopeSchema.parse(envelope)).toMatchObject({
      sessionId: "session-1",
      kind: "classroom.snapshot",
      actor: {
        userId: "teacher-1",
        scope: "teacher",
        schoolId: "school-1",
        workspaceRole: "teacher",
      },
      correlation: {
        correlationId: "corr-1",
        causationId: "event-1",
        requestId: "req-1",
        truthPersisted: true,
      },
      payload: {
        snapshot: { version: 3 },
      },
    });
    expect(envelope.messageId).toBeTruthy();
    expect(envelope.sentAt).toMatch(/T/);
  });

  it("rejects bare client payloads that do not declare actor/session/correlation-aware envelope fields", () => {
    expect(() =>
      ClassroomWebSocketClientEnvelopeSchema.parse({
        kind: "runtime.command",
        payload: {
          command: "refresh",
        },
      }),
    ).toThrow();
  });
});
