'use client'

import { create } from 'zustand'

import type { ClassroomWebSocketServerEnvelope } from '@/features/runtime-platform/seams/transport/ws-envelope'

export type LiveAnswerReceivedPayload = {
  questionId: string
  studentId: string
  responseType: 'single_choice' | 'multi_choice' | 'true_false' | 'fill_blank' | 'ordering'
  payload: unknown
  receivedAt: number
  classroomSessionId: string
}

export type LiveAnswerEvent = LiveAnswerReceivedPayload & {
  correlationId: string
}

export type LiveAnswerAggregate = {
  questionId: string
  responseType: LiveAnswerEvent['responseType']
  totalResponses: number
  lastReceivedAt: number
  buckets: Array<{ label: string; count: number }>
}

export type LiveAnswerDashboardState = {
  activeSessionId: string | null
  events: LiveAnswerEvent[]
  latestByQuestionStudent: Record<string, LiveAnswerEvent>
  aggregates: Record<string, LiveAnswerAggregate>
  recentLimit: 5 | 20 | 50
  selectedQuestionId: string | null
  bindSession: (sessionId: string) => void
  pushEnvelope: (envelope: ClassroomWebSocketServerEnvelope) => void
  setRecentLimit: (limit: 5 | 20 | 50) => void
  setSelectedQuestionId: (questionId: string | null) => void
  reset: () => void
}

const MAX_EVENTS = 200

function normalizeBucketLabel(
  responseType: LiveAnswerEvent['responseType'],
  rawValue: unknown,
) {
  if (responseType === 'true_false') {
    return rawValue === 'A' ? '正确' : rawValue === 'B' ? '错误' : '未知'
  }

  if (Array.isArray(rawValue)) {
    return rawValue.join('、')
  }

  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim()
    return trimmed.length > 0 ? trimmed : '未作答'
  }

  if (rawValue === null || rawValue === undefined) {
    return '未作答'
  }

  return String(rawValue)
}

function toAggregateBuckets(events: LiveAnswerEvent[]) {
  const counts = new Map<string, number>()

  for (const event of events) {
    const value = event.responseType === 'multi_choice' && typeof event.payload === 'string'
      ? event.payload
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : event.payload

    const bucketLabel = normalizeBucketLabel(event.responseType, value)
    counts.set(bucketLabel, (counts.get(bucketLabel) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
}

function rebuildAggregate(
  questionId: string,
  latestByQuestionStudent: Record<string, LiveAnswerEvent>,
) {
  const latestEvents = Object.values(latestByQuestionStudent).filter(
    (event) => event.questionId === questionId,
  )

  if (latestEvents.length === 0) {
    return null
  }

  const lastReceivedAt = Math.max(...latestEvents.map((event) => event.receivedAt))

  return {
    questionId,
    responseType: latestEvents[0]!.responseType,
    totalResponses: latestEvents.length,
    lastReceivedAt,
    buckets: toAggregateBuckets(latestEvents),
  } satisfies LiveAnswerAggregate
}

export function isQuizAnswerEnvelope(
  envelope: ClassroomWebSocketServerEnvelope,
): envelope is ClassroomWebSocketServerEnvelope & { payload: LiveAnswerReceivedPayload } {
  return envelope.kind === 'quiz.answer.received'
}

export function getRecentLiveAnswerEvents(
  events: LiveAnswerEvent[],
  limit: number,
) {
  return [...events]
    .sort((left, right) => right.receivedAt - left.receivedAt)
    .slice(0, limit)
}

export const useLiveAnswerStore = create<LiveAnswerDashboardState>((set: (partial: Partial<LiveAnswerDashboardState>) => void, get: () => LiveAnswerDashboardState) => ({
  activeSessionId: null,
  events: [],
  latestByQuestionStudent: {},
  aggregates: {},
  recentLimit: 20,
  selectedQuestionId: null,
  bindSession(sessionId: string) {
    if (get().activeSessionId === sessionId) {
      return
    }

    set({
      activeSessionId: sessionId,
      events: [],
      latestByQuestionStudent: {},
      aggregates: {},
      recentLimit: 20,
      selectedQuestionId: null,
    })
  },
  pushEnvelope(envelope: ClassroomWebSocketServerEnvelope) {
    if (!isQuizAnswerEnvelope(envelope)) {
      return
    }

    const sessionId = get().activeSessionId
    if (sessionId && envelope.payload.classroomSessionId !== sessionId) {
      return
    }

    const nextEvent: LiveAnswerEvent = {
      ...envelope.payload,
      correlationId: envelope.correlation.correlationId,
    }
    const latestKey = `${nextEvent.questionId}:${nextEvent.studentId}`
    const latestByQuestionStudent = {
      ...get().latestByQuestionStudent,
      [latestKey]: nextEvent,
    }
    const nextAggregate = rebuildAggregate(nextEvent.questionId, latestByQuestionStudent)

    set({
      events: [...get().events, nextEvent].slice(-MAX_EVENTS),
      latestByQuestionStudent,
      aggregates: nextAggregate
        ? {
            ...get().aggregates,
            [nextEvent.questionId]: nextAggregate,
          }
        : get().aggregates,
      selectedQuestionId: get().selectedQuestionId ?? nextEvent.questionId,
    })
  },
  setRecentLimit(limit: 5 | 20 | 50) {
    set({ recentLimit: limit })
  },
  setSelectedQuestionId(questionId: string | null) {
    set({ selectedQuestionId: questionId })
  },
  reset() {
    set({
      activeSessionId: null,
      events: [],
      latestByQuestionStudent: {},
      aggregates: {},
      recentLimit: 20,
      selectedQuestionId: null,
    })
  },
}))
