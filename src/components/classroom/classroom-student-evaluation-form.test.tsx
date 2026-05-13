// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ClassroomStudentEvaluationForm } from './classroom-student-evaluation-form'

vi.mock('@/actions/classroom-actions', () => ({
  recordStudentFormativeEvaluationAction: vi.fn(),
}))

describe('ClassroomStudentEvaluationForm', () => {
  it('renders the exact three participation tiers in Chinese', () => {
    render(<ClassroomStudentEvaluationForm sessionId="session-1" studentId="student-1" />)

    expect(screen.getByRole('radio', { name: '积极参与' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: '正常参与' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: '需要关注' })).toBeTruthy()
  })

  it('renders the six fixed evaluation tags as toggle chips', () => {
    render(<ClassroomStudentEvaluationForm sessionId="session-1" studentId="student-1" />)

    expect(screen.getByRole('button', { name: '主动发言' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '专注跟进' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '协作支持' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '表达清晰' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '需要提醒' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '需要跟进' })).toBeTruthy()
  })

  it('renders a teacher-only observation note textarea instead of a score input', () => {
    render(<ClassroomStudentEvaluationForm sessionId="session-1" studentId="student-1" />)

    expect(screen.getByLabelText('observationNote')).toBeTruthy()
    expect(screen.getByText(/这是教师可见的过程性评价记录，不是分数录入/)).toBeTruthy()
    expect(screen.queryByText(/分数/)).toBeNull()
  })
})
