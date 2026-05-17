import { and, eq } from "drizzle-orm";
import { getToken } from "next-auth/jwt";
import type { IncomingMessage } from "node:http";
import { z } from "zod";

import { db } from "@/db";
import { classMembers, classroomSessions, memberships } from "@/db/schema";

import { ClassroomWebSocketActorScopeSchema } from "./ws-envelope";

export const ClassroomWebSocketHandshakeErrorCodeSchema = z.enum([
  "WEBSOCKET_UNAUTHORIZED",
  "WEBSOCKET_SESSION_NOT_FOUND",
  "WEBSOCKET_SCOPE_MISMATCH",
]);

export class ClassroomWebSocketHandshakeError extends Error {
  readonly code: z.infer<typeof ClassroomWebSocketHandshakeErrorCodeSchema>;
  readonly status: number;

  constructor(
    code: z.infer<typeof ClassroomWebSocketHandshakeErrorCodeSchema>,
    status = 401,
  ) {
    super(code);
    this.name = "ClassroomWebSocketHandshakeError";
    this.code = ClassroomWebSocketHandshakeErrorCodeSchema.parse(code);
    this.status = status;
  }
}

export const ClassroomWebSocketHandshakeContextSchema = z
  .object({
    userId: z.string().min(1),
    schoolId: z.string().min(1),
    actorScope: ClassroomWebSocketActorScopeSchema,
    workspaceRole: z.string().min(1),
    sessionId: z.string().min(1),
  })
  .strict();

function parseRequestedScope(request: IncomingMessage) {
  const url = new URL(request.url ?? "/", "http://localhost");
  const requested = url.searchParams.get("actor");

  if (!requested) {
    return null;
  }

  const parsed = ClassroomWebSocketActorScopeSchema.safeParse(requested);
  if (!parsed.success) {
    throw new ClassroomWebSocketHandshakeError("WEBSOCKET_SCOPE_MISMATCH", 403);
  }

  return parsed.data;
}

function assertRequestedScope(
  requestedScope: z.infer<typeof ClassroomWebSocketActorScopeSchema> | null,
  actualScope: z.infer<typeof ClassroomWebSocketActorScopeSchema>,
) {
  if (requestedScope && requestedScope !== actualScope) {
    throw new ClassroomWebSocketHandshakeError("WEBSOCKET_SCOPE_MISMATCH", 403);
  }
}

export async function authenticateClassroomWebSocket(request: IncomingMessage, sessionId: string) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  const userId = typeof token?.id === "string" ? token.id : typeof token?.sub === "string" ? token.sub : null;
  const workspaceRole =
    typeof token?.workspaceRole === "string" ? token.workspaceRole : null;
  const requestedScope = parseRequestedScope(request);

  if (!userId || !workspaceRole) {
    throw new ClassroomWebSocketHandshakeError("WEBSOCKET_UNAUTHORIZED", 401);
  }

  const session = await db.query.classroomSessions.findFirst({
    where: eq(classroomSessions.id, sessionId),
  });

  if (!session) {
    throw new ClassroomWebSocketHandshakeError("WEBSOCKET_SESSION_NOT_FOUND", 404);
  }

  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.userId, userId),
      eq(memberships.schoolId, session.schoolId),
      eq(memberships.status, "active"),
    ),
  });

  if (!membership) {
    throw new ClassroomWebSocketHandshakeError("WEBSOCKET_UNAUTHORIZED", 401);
  }

  if (session.teacherId === userId) {
    const context = {
      userId,
      schoolId: session.schoolId,
      actorScope: ClassroomWebSocketActorScopeSchema.parse("teacher"),
      workspaceRole,
      sessionId,
    };

    assertRequestedScope(requestedScope, context.actorScope);
    return ClassroomWebSocketHandshakeContextSchema.parse(context);
  }

  const classMember = await db.query.classMembers.findFirst({
    where: and(
      eq(classMembers.classId, session.classId),
      eq(classMembers.studentId, userId),
      eq(classMembers.status, "active"),
    ),
  });

  if (!classMember) {
    throw new ClassroomWebSocketHandshakeError("WEBSOCKET_UNAUTHORIZED", 401);
  }

  const context = {
    userId,
    schoolId: session.schoolId,
    actorScope: ClassroomWebSocketActorScopeSchema.parse("student"),
    workspaceRole,
    sessionId,
  };

  assertRequestedScope(requestedScope, context.actorScope);
  return ClassroomWebSocketHandshakeContextSchema.parse(context);
}
