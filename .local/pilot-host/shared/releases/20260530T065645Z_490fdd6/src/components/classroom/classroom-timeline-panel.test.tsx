// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ClassroomTimelinePanel } from './classroom-timeline-panel'

describe('ClassroomTimelinePanel', () => {
  it('shows a Chinese empty state when there is no teacher timeline entry', () => {
    render(<ClassroomTimelinePanel entries={[]} />)

    expect(screen.getByRole('heading', { name: '干预记录时间线' })).toBeTruthy()
    expect(screen.getByText('还没有干预记录')).toBeTruthy()
    expect(screen.getByText(/当你在课堂中记录提醒、点名纠偏或过程性干预后/)).toBeTruthy()
  })

  it('renders title body targetScope and createdAt inside a dedicated tonal card', () => {
    render(
      <ClassroomTimelinePanel
        entries={[
          {
            id: 'timeline-1',
            sessionId: 'session-1',
            studentId: 'student-1',
            studentName: '李雷',
            stepId: 'step-2',
            stepTitle: '小组讨论',
            entryType: 'intervention_noted',
            title: '提醒聚焦',
            body: '请先回到当前讨论问题，再整理发言。',
            targetScope: 'student',
            targetLabel: '李雷',
            visibility: 'teacher-only',
            actorId: 'teacher-1',
            createdAt: '2026-05-12T10:04:00.000Z',
          },
        ]}
      />,
    )

    expect(screen.getByText('提醒聚焦')).toBeTruthy()
    expect(screen.getByText('请先回到当前讨论问题，再整理发言。')).toBeTruthy()
    expect(screen.getByText('目标学生')).toBeTruthy()
    expect(screen.getByText(/李雷/)).toBeTruthy()
    expect(screen.getByText(/05\/12 10:04/)).toBeTruthy()
  })

  it('keeps long body copy wrapped and shows class scope labels', () => {
    const longBody = '这是一个需要保留多行节奏的干预说明。'.repeat(10)

    render(
      <ClassroomTimelinePanel
        entries={[
          {
            id: 'timeline-2',
            sessionId: 'session-1',
            studentId: null,
            studentName: null,
            stepId: null,
            stepTitle: null,
            entryType: 'intervention_noted',
            title: '面向全班提醒',
            body: longBody,
            targetScope: 'class',
            targetLabel: '全班',
            visibility: 'teacher-only',
            actorId: 'teacher-1',
            createdAt: '2026-05-12T10:08:00.000Z',
          },
        ]}
      />,
    )

    expect(screen.getByText('目标范围')).toBeTruthy()
    expect(screen.getByText('全班')).toBeTruthy()

    const body = screen.getByText(longBody)
    expect(body.className).toContain('whitespace-pre-wrap')
    expect(body.className).toContain('break-words')
  })
})
