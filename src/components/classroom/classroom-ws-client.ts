import { ClassroomSnapshotDTOSchema, type ClassroomSnapshotDTO } from '@/lib/dto/classroom'
import {
  ClassroomWebSocketServerEnvelopeSchema,
  type ClassroomWebSocketClientEnvelope,
  type ClassroomWebSocketClientMessageKind,
  type ClassroomWebSocketServerEnvelope,
} from '@/features/runtime-platform/seams/transport/ws-envelope'

type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'fallback' | 'closed'

type SubscribeClassroomSocketInput = {
  sessionId: string
  actorScope: 'teacher' | 'student'
  onOpen?: () => void
  onReconnect?: () => void
  onSnapshot?: (snapshot: ClassroomSnapshotDTO, envelope: ClassroomWebSocketServerEnvelope) => void
  onRuntimeEvent?: (envelope: ClassroomWebSocketServerEnvelope) => void
  onTransportError?: (envelope: ClassroomWebSocketServerEnvelope) => void
  onFallbackSnapshot?: (snapshot: ClassroomSnapshotDTO) => void
  onFallbackOpen?: () => void
  onClose?: () => void
}

type SubscribeClassroomSocketResult = {
  send: (message: {
    kind: ClassroomWebSocketClientMessageKind
    payload: Record<string, unknown>
    correlationId?: string
    requestId?: string
  }) => { ok: true; correlationId: string; requestId: string } | { ok: false; reason: 'socket_unavailable' | 'socket_not_open' }
  close: () => void
  getConnectionState: () => ConnectionState
}

export function createClassroomWebSocketUrl(sessionId: string, actorScope: 'teacher' | 'student') {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${window.location.host}/api/ws/classroom/${sessionId}?actor=${actorScope}`
}

export function parseClassroomSnapshotSignal(rawData: unknown) {
  let decoded: unknown

  try {
    decoded = typeof rawData === 'string' ? JSON.parse(rawData) : rawData
  } catch {
    return null
  }

  const parsedEnvelope = ClassroomWebSocketServerEnvelopeSchema.safeParse(decoded)
  if (parsedEnvelope.success) {
    if (parsedEnvelope.data.kind !== 'classroom.snapshot') {
      return {
        envelope: parsedEnvelope.data,
        snapshot: null,
      } as const
    }

    const parsedSnapshot = ClassroomSnapshotDTOSchema.safeParse(parsedEnvelope.data.payload.snapshot)
    if (!parsedSnapshot.success) {
      return null
    }

    return {
      envelope: parsedEnvelope.data,
      snapshot: parsedSnapshot.data,
    } as const
  }

  const parsedSnapshot = ClassroomSnapshotDTOSchema.safeParse(decoded)
  if (!parsedSnapshot.success) {
    return null
  }

  return {
    envelope: null,
    snapshot: parsedSnapshot.data,
  } as const
}

function buildClientEnvelope(input: {
  sessionId: string
  actorScope: 'teacher' | 'student'
  kind: ClassroomWebSocketClientMessageKind
  payload: Record<string, unknown>
  correlationId: string
  requestId: string
}): ClassroomWebSocketClientEnvelope {
  return {
    messageId: input.requestId,
    sessionId: input.sessionId,
    actor: {
      userId: `client:${input.actorScope}`,
      scope: input.actorScope,
      schoolId: 'handshake-boundary',
    },
    kind: input.kind,
    sentAt: new Date().toISOString(),
    correlation: {
      correlationId: input.correlationId,
      requestId: input.requestId,
      truthPersisted: input.kind !== 'transport.keepalive',
    },
    payload: input.payload,
  }
}

export function subscribeClassroomSocket(input: SubscribeClassroomSocketInput): SubscribeClassroomSocketResult {
  let socket: WebSocket | null = null
  let source: EventSource | null = null
  let connectionState: ConnectionState = 'connecting'

  const attachFallbackSource = () => {
    if (source) {
      return
    }

    connectionState = 'fallback'
    source = new EventSource(`/api/classroom/${input.sessionId}/events`)
    source.addEventListener('snapshot', (event) => {
      if (!(event instanceof MessageEvent)) {
        return
      }

      handleSnapshotSignal(event.data)
    })
    source.onopen = () => {
      input.onFallbackOpen?.()
    }
  }

  const handleSnapshotSignal = (rawData: unknown) => {
    const parsed = parseClassroomSnapshotSignal(rawData)
    if (!parsed) {
      return
    }

    if (parsed.envelope?.kind === 'transport.error') {
      input.onTransportError?.(parsed.envelope)
      return
    }

    if (parsed.envelope?.kind === 'runtime.event' || parsed.envelope?.kind === 'quiz.answer.received') {
      input.onRuntimeEvent?.(parsed.envelope)
      return
    }

    if (parsed.envelope?.kind === 'classroom.snapshot' && parsed.snapshot) {
      input.onSnapshot?.(parsed.snapshot, parsed.envelope)
      return
    }

    if (!parsed.envelope && parsed.snapshot) {
      input.onFallbackSnapshot?.(parsed.snapshot)
    }
  }

  try {
    socket = new WebSocket(createClassroomWebSocketUrl(input.sessionId, input.actorScope))
    socket.addEventListener('open', () => {
      connectionState = 'connected'
      input.onOpen?.()
    })
    socket.addEventListener('message', (event) => {
      handleSnapshotSignal(event.data)
    })
    socket.addEventListener('error', () => {
      connectionState = 'reconnecting'
      input.onReconnect?.()
      socket?.close()
      attachFallbackSource()
    })
    socket.addEventListener('close', () => {
      if (connectionState !== 'closed') {
        connectionState = 'reconnecting'
        input.onReconnect?.()
        attachFallbackSource()
      }
      input.onClose?.()
    })
  } catch {
    socket = null
  }

  if (!socket) {
    attachFallbackSource()
  }

  return {
    send(message) {
      if (!socket) {
        return { ok: false as const, reason: 'socket_unavailable' as const }
      }

      if (socket.readyState !== WebSocket.OPEN) {
        return { ok: false as const, reason: 'socket_not_open' as const }
      }

      const correlationId = message.correlationId ?? crypto.randomUUID()
      const requestId = message.requestId ?? crypto.randomUUID()
      socket.send(JSON.stringify(buildClientEnvelope({
        sessionId: input.sessionId,
        actorScope: input.actorScope,
        kind: message.kind,
        payload: message.payload,
        correlationId,
        requestId,
      })))
      return { ok: true as const, correlationId, requestId }
    },
    close() {
      connectionState = 'closed'
      socket?.close()
      source?.close()
    },
    getConnectionState() {
      return connectionState
    },
  }
}
