import { describe, expect, it } from "vitest";

import {
  ClassroomWebSocketClientEnvelopeSchema,
  ClassroomWebSocketMessageKindSchema,
  ClassroomWebSocketServerEnvelopeSchema,
  buildClassroomWebSocketServerEnvelope,
} from "./ws-envelope";

describe("ws envelope contract", () => {
  it("locks the canonical bidirectional message kinds", () => {
    expect(ClassroomWebSocketMessageKindSchema.options).toEqual([
      "teacher.control",
      "classroom.snapshot",
      "runtime.command",
      "runtime.event",
      "transport.keepalive",
      "transport.error",
    ]);
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
