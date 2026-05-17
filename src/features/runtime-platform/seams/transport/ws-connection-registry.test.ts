import { describe, expect, it, vi } from "vitest";

import { classroomWebSocketConnectionRegistry } from "./ws-connection-registry";

function createSocket() {
  return {
    OPEN: 1,
    readyState: 1,
    send: vi.fn(),
  };
}

describe("ws connection registry", () => {
  it("tracks connection ownership per classroom session without storing business truth", () => {
    const sessionId = `session-${crypto.randomUUID()}`;
    const teacherSocket = createSocket();
    const studentSocket = createSocket();

    const teacher = classroomWebSocketConnectionRegistry.register({
      sessionId,
      actorId: "teacher-1",
      actorScope: "teacher",
      schoolId: "school-1",
      socket: teacherSocket as never,
    });

    const student = classroomWebSocketConnectionRegistry.register({
      sessionId,
      actorId: "student-1",
      actorScope: "student",
      schoolId: "school-1",
      socket: studentSocket as never,
    });

    expect(classroomWebSocketConnectionRegistry.describeSession(sessionId)).toMatchObject({
      sessionId,
      connectionCount: 2,
      owners: expect.arrayContaining([
        expect.objectContaining({
          connectionId: teacher.id,
          actorId: "teacher-1",
          actorScope: "teacher",
          schoolId: "school-1",
        }),
        expect.objectContaining({
          connectionId: student.id,
          actorId: "student-1",
          actorScope: "student",
          schoolId: "school-1",
        }),
      ]),
    });

    classroomWebSocketConnectionRegistry.unregister(sessionId, teacher.id);
    classroomWebSocketConnectionRegistry.unregister(sessionId, student.id);

    expect(classroomWebSocketConnectionRegistry.describeSession(sessionId)).toMatchObject({
      sessionId,
      connectionCount: 0,
      owners: [],
    });
  });
});
