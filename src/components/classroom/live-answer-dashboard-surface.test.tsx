// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import type { ClassroomStepDTO } from '@/lib/dto/classroom'

import { LiveAnswerDashboardSurface } from './live-answer-dashboard-surface'
import { useLiveAnswerStore } from './live-answer-dashboard-store'

const quizSteps: ClassroomStepDTO[] = [
  {
    id: 'question-1',
    title: '互动答题（样板）',
    rank: 'a0',
    type: 'quiz',
    payload: {
      type: 'quiz',
      question: '以下哪项正确？',
      options: ['A 选项', 'B 选项'],
      correctOptionIndex: 0,
    },
    pluginContract: null,
  },
]

describe('LiveAnswerDashboardSurface', () => {
  beforeEach(() => {
    useLiveAnswerStore.getState().reset()
    useLiveAnswerStore.getState().bindSession('session-1')
  })

  it('renders empty state before live answers arrive', () => {
    render(
      <LiveAnswerDashboardSurface
        sessionId="session-1"
        classroomStatus="live"
        activeStepId="question-1"
        steps={quizSteps}
        connectionState="connected"
      />,
    )

    expect(screen.getByText('暂无作答数据')).toBeTruthy()
  })

  it('renders aggregate buckets from the store', () => {
    useLiveAnswerStore.getState().pushEnvelope({
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

    render(
      <LiveAnswerDashboardSurface
        sessionId="session-1"
        classroomStatus="live"
        activeStepId="question-1"
        steps={quizSteps}
        connectionState="connected"
      />,
    )

    expect(screen.getAllByText('老师侧实时作答面板').length).toBeGreaterThan(0)
    expect(screen.getAllByText('A').length).toBeGreaterThan(0)
    expect(screen.getAllByText('1 人').length).toBeGreaterThan(0)
  })

  it('shows recap redirect when the classroom has ended', () => {
    render(
      <LiveAnswerDashboardSurface
        sessionId="session-1"
        classroomStatus="ended"
        activeStepId="question-1"
        steps={quizSteps}
        connectionState="closed"
      />,
    )

    expect(screen.getByText('课堂已结束')).toBeTruthy()
    expect(screen.getByRole('link', { name: '跳转到 recap' })).toBeTruthy()
  })
})
