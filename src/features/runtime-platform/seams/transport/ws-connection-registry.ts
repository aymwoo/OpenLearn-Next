import type { WebSocket } from "ws";
import { z } from "zod";

import {
  ClassroomWebSocketActorScopeSchema,
  type ClassroomWebSocketActorScope,
  type ClassroomWebSocketServerEnvelope,
} from "./ws-envelope";

const ClassroomWebSocketConnectionOwnerSchema = z
  .object({
    actorId: z.string().min(1),
    actorScope: ClassroomWebSocketActorScopeSchema,
    schoolId: z.string().min(1),
  })
  .strict();

const ClassroomWebSocketConnectionRegistrationSchema =
  ClassroomWebSocketConnectionOwnerSchema.extend({
    sessionId: z.string().min(1),
    socket: z.custom<WebSocket>((value) => Boolean(value), {
      message: "WebSocket instance is required",
    }),
  }).strict();

type ConnectionRecord = {
  id: string;
  registeredAt: string;
  sessionId: string;
  owner: z.infer<typeof ClassroomWebSocketConnectionOwnerSchema>;
  socket: WebSocket;
};

class ClassroomWebSocketConnectionRegistry {
  private readonly bySession = new Map<string, Map<string, ConnectionRecord>>();

  register(input: {
    sessionId: string;
    actorId: string;
    actorScope: ClassroomWebSocketActorScope;
    schoolId: string;
    socket: WebSocket;
  }) {
    const parsed = ClassroomWebSocketConnectionRegistrationSchema.parse(input);
    const id = crypto.randomUUID();
    const record: ConnectionRecord = {
      id,
      registeredAt: new Date().toISOString(),
      sessionId: parsed.sessionId,
      owner: {
        actorId: parsed.actorId,
        actorScope: parsed.actorScope,
        schoolId: parsed.schoolId,
      },
      socket: parsed.socket,
    };

    const sessionBucket =
      this.bySession.get(parsed.sessionId) ?? new Map<string, ConnectionRecord>();
    sessionBucket.set(id, record);
    this.bySession.set(parsed.sessionId, sessionBucket);
    return record;
  }

  unregister(sessionId: string, connectionId: string) {
    const sessionBucket = this.bySession.get(sessionId);
    if (!sessionBucket) {
      return;
    }

    sessionBucket.delete(connectionId);
    if (sessionBucket.size === 0) {
      this.bySession.delete(sessionId);
    }
  }

  listBySession(sessionId: string) {
    return [...(this.bySession.get(sessionId)?.values() ?? [])];
  }

  describeSession(sessionId: string) {
    const connections = this.listBySession(sessionId);

    return {
      sessionId,
      connectionCount: connections.length,
      owners: connections.map((connection) => ({
        connectionId: connection.id,
        registeredAt: connection.registeredAt,
        ...connection.owner,
      })),
    };
  }

  broadcast(sessionId: string, envelope: ClassroomWebSocketServerEnvelope) {
    const payload = JSON.stringify(envelope);

    for (const connection of this.listBySession(sessionId)) {
      if (connection.socket.readyState !== connection.socket.OPEN) {
        this.unregister(sessionId, connection.id);
        continue;
      }

      connection.socket.send(payload);
    }
  }
}

export const classroomWebSocketConnectionRegistry =
  new ClassroomWebSocketConnectionRegistry();
