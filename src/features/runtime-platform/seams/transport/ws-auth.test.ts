import { beforeEach, describe, expect, it, vi } from "vitest";

const getTokenMock = vi.fn();
const classroomSessionsFindFirst = vi.fn();
const membershipsFindFirst = vi.fn();
const classMembersFindFirst = vi.fn();

vi.mock("next-auth/jwt", () => ({
  getToken: (...args: unknown[]) => getTokenMock(...args),
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      classroomSessions: {
        findFirst: (...args: unknown[]) => classroomSessionsFindFirst(...args),
      },
      memberships: {
        findFirst: (...args: unknown[]) => membershipsFindFirst(...args),
      },
      classMembers: {
        findFirst: (...args: unknown[]) => classMembersFindFirst(...args),
      },
    },
  },
}));

describe("ws handshake auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getTokenMock.mockResolvedValue({
      id: "teacher-1",
      workspaceRole: "teacher",
    });

    classroomSessionsFindFirst.mockResolvedValue({
      id: "session-1",
      schoolId: "school-1",
      teacherId: "teacher-1",
      classId: "class-1",
    });

    membershipsFindFirst.mockResolvedValue({
      userId: "teacher-1",
      schoolId: "school-1",
      status: "active",
    });

    classMembersFindFirst.mockResolvedValue(null);
  });

  it("authenticates a teacher handshake only when actor, school and session scopes align", async () => {
    const { authenticateClassroomWebSocket } = await import("./ws-auth");

    const request = {
      url: "/api/ws/classroom/session-1?actor=teacher",
      headers: {},
    } as const;

    await expect(
      authenticateClassroomWebSocket(request as never, "session-1"),
    ).resolves.toMatchObject({
      userId: "teacher-1",
      schoolId: "school-1",
      actorScope: "teacher",
      workspaceRole: "teacher",
      sessionId: "session-1",
    });
  });

  it("rejects the handshake when the requested actor scope mismatches the authenticated actor", async () => {
    const { authenticateClassroomWebSocket, ClassroomWebSocketHandshakeError } =
      await import("./ws-auth");

    const request = {
      url: "/api/ws/classroom/session-1?actor=student",
      headers: {},
    } as const;

    await expect(
      authenticateClassroomWebSocket(request as never, "session-1"),
    ).rejects.toEqual(
      expect.objectContaining<ClassroomWebSocketHandshakeError>({
        code: "WEBSOCKET_SCOPE_MISMATCH",
        status: 403,
      }),
    );
  });

  it("authenticates an active student membership against the classroom class scope", async () => {
    getTokenMock.mockResolvedValue({
      id: "student-1",
      workspaceRole: "student",
    });

    membershipsFindFirst.mockResolvedValue({
      userId: "student-1",
      schoolId: "school-1",
      status: "active",
    });

    classMembersFindFirst.mockResolvedValue({
      classId: "class-1",
      studentId: "student-1",
      status: "active",
    });

    const { authenticateClassroomWebSocket } = await import("./ws-auth");

    const request = {
      url: "/api/ws/classroom/session-1?actor=student",
      headers: {},
    } as const;

    await expect(
      authenticateClassroomWebSocket(request as never, "session-1"),
    ).resolves.toMatchObject({
      userId: "student-1",
      schoolId: "school-1",
      actorScope: "student",
      workspaceRole: "student",
      sessionId: "session-1",
    });
  });
});
