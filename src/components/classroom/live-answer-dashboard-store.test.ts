import { beforeEach, describe, expect, it } from 'vitest'

import { useLiveAnswerStore } from './live-answer-dashboard-store'

describe('live-answer-dashboard-store', () => {
  beforeEach(() => {
    useLiveAnswerStore.getState().reset()
    useLiveAnswerStore.getState().bindSession('session-1')
  })

  it('keeps latest-answer aggregates by student and question', () => {
    const store = useLiveAnswerStore.getState()

    store.pushEnvelope({
      messageId: 'msg-1',
      sessionId: 'session-1',
      actor: { userId: 'teacher-1', scope: 'teacher', schoolId: 'school-1' },
      kind: 'quiz.answer.received',
      sentAt: new Date().toISOString(),
      correlation: { correlationId: 'corr-1', truthPersisted: true },
      payload: {
        questionId: 'question-1',
        studentId: 'student-1',
        responseType: 'single_choice',
        payload: 'A',
        receivedAt: 100,
        classroomSessionId: 'session-1',
      },
    })
    store.pushEnvelope({
      messageId: 'msg-2',
      sessionId: 'session-1',
      actor: { userId: 'teacher-1', scope: 'teacher', schoolId: 'school-1' },
      kind: 'quiz.answer.received',
      sentAt: new Date().toISOString(),
      correlation: { correlationId: 'corr-2', truthPersisted: true },
      payload: {
        questionId: 'question-1',
        studentId: 'student-1',
        responseType: 'single_choice',
        payload: 'B',
        receivedAt: 200,
        classroomSessionId: 'session-1',
      },
    })

    const aggregate = useLiveAnswerStore.getState().aggregates['question-1']
    expect(aggregate?.totalResponses).toBe(1)
    expect(aggregate?.buckets).toEqual([{ label: 'B', count: 1 }])
  })

  it('caps recent stream and supports 5/20/50 limits', () => {
    const store = useLiveAnswerStore.getState()

    for (let index = 0; index < 30; index += 1) {
      store.pushEnvelope({
        messageId: `msg-${index}`,
        sessionId: 'session-1',
        actor: { userId: 'teacher-1', scope: 'teacher', schoolId: 'school-1' },
        kind: 'quiz.answer.received',
        sentAt: new Date().toISOString(),
        correlation: { correlationId: `corr-${index}`, truthPersisted: true },
        payload: {
          questionId: 'question-1',
          studentId: `student-${index}`,
          responseType: 'fill_blank',
          payload: `answer-${index}`,
          receivedAt: index + 1,
          classroomSessionId: 'session-1',
        },
      })
    }

    expect(useLiveAnswerStore.getState().events).toHaveLength(30)
    store.setRecentLimit(5)
    expect(useLiveAnswerStore.getState().recentLimit).toBe(5)
    store.setRecentLimit(50)
    expect(useLiveAnswerStore.getState().recentLimit).toBe(50)
  })
})
