// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ClassroomSessionRecapSurface } from './classroom-session-recap-surface'
import type { ClassroomSessionRecapDTO } from '@/lib/dto/classroom'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/classroom',
  useSearchParams: () => new URLSearchParams('sessionId=session-1'),
}))

const recap: ClassroomSessionRecapDTO = {
  session: {
    id: 'session-1',
    status: 'ended',
    lessonId: 'lesson-1',
    lessonTitle: '古诗导读',
    className: '一班',
    startedAt: '2026-05-14T08:00:00.000Z',
    endedAt: '2026-05-14T08:40:00.000Z',
  },
  summary: {
    completionLabel: '已完成 1/2',
    completionCount: 1,
    totalStudents: 2,
    submissionCount: 2,
    evidenceCount: 3,
    participationBuckets: {
      active: 1,
      normal: 0,
      attention: 0,
      unevaluated: 1,
    },
  },
  workload: {
    followUpSignalsCount: 1,
    pendingFeedbackCount: 1,
  },
  detailTab: 'students',
  studentSummaries: [
    {
      studentId: 'student-1',
      studentName: '李雷',
      completionLabel: '已完成全部 2 个环节',
      participationLabel: '积极参与',
      evidenceCount: 2,
      needsFollowUp: false,
      pendingFeedbackCount: 0,
    },
    {
      studentId: 'student-2',
      studentName: '韩梅梅',
      completionLabel: '完成 1/2 个环节',
      participationLabel: '未评价',
      evidenceCount: 1,
      needsFollowUp: true,
      pendingFeedbackCount: 1,
    },
  ],
  selectedStudent: {
    studentId: 'student-2',
    studentName: '韩梅梅',
    completionLabel: '完成 1/2 个环节',
    participationLabel: '未评价',
    evidenceCount: 1,
    needsFollowUp: true,
    pendingFeedbackCount: 1,
    completionItems: [{ id: 'completion-1', title: '课堂完成情况', detail: '本次课堂完成 1/2 个环节。' }],
    submissionItems: [{ id: 'submission-1', title: '随堂测验', detail: '已作答，等待教师反馈' }],
    evaluationItems: [],
    timelineItems: [{ id: 'timeline-1', title: '课堂干预', detail: '老师提醒其回到当前任务。' }],
  },
  stepSummaries: [
    {
      stepId: 'step-1',
      stepTitle: '开场导入',
      completionCount: 2,
      submissionCount: 1,
      attentionCount: 0,
      totalStudents: 2,
    },
  ],
  selectedStepId: 'step-1',
}

describe('ClassroomSessionRecapSurface', () => {
  it('renders workload split and keeps step diagnostics secondary', () => {
    render(<ClassroomSessionRecapSurface recap={recap} />)

    expect(screen.getByText('待跟进课堂信号')).toBeTruthy()
    expect(screen.getByText('待反馈提交')).toBeTruthy()
    expect(screen.getByRole('button', { name: '查看学生复盘' })).toBeTruthy()
    expect(screen.getByText('环节诊断')).toBeTruthy()
    expect(screen.getByText('用于判断哪一环节需要回看，不替代学生复盘主路径')).toBeTruthy()
  })

  it('renders the exact grouped evidence labels and explicit 未评价 state', () => {
    render(<ClassroomSessionRecapSurface recap={recap} />)

    expect(screen.getAllByText('未评价').length).toBeGreaterThan(0)
    expect(screen.getAllByText('完成情况').length).toBeGreaterThan(0)
    expect(screen.getAllByText('提交与反馈').length).toBeGreaterThan(0)
    expect(screen.getAllByText('过程评价').length).toBeGreaterThan(0)
    expect(screen.getAllByText('课堂时间线').length).toBeGreaterThan(0)
  })

  it('shows calm Chinese empty copy for missing grouped evidence', () => {
    render(
      <ClassroomSessionRecapSurface
        recap={{
          ...recap,
          selectedStudent: {
            ...recap.selectedStudent!,
            submissionItems: [],
            evaluationItems: [],
          },
        }}
      />,
    )

    expect(screen.getByText('本次课堂还没有该学生的课堂证据，可先查看过程评价或课堂时间线。')).toBeTruthy()
    expect(screen.getAllByText('本次课堂还没有留下过程评价。').length).toBeGreaterThan(0)
  })
})
