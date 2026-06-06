// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ClassroomSessionRecapSurface } from './classroom-session-recap-surface'
import type { ClassroomSessionRecapDTO } from '@/lib/dto/classroom'

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/classroom',
  useSearchParams: () => new URLSearchParams('sessionId=session-1'),
}))

afterEach(() => {
  cleanup()
})

const recap: ClassroomSessionRecapDTO = {
  session: {
    id: 'session-1',
    status: 'ended',
    lessonId: 'lesson-1',
    classId: 'class-1',
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
  quizSampleStats: {
    questionCount: 0,
    questions: [],
  },
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

  it('keeps /classroom as the recap home and adds a secondary trends deep-link', () => {
    render(<ClassroomSessionRecapSurface recap={recap} />)

    expect(
      screen.getAllByText((content) =>
        content.includes('本页继续留在 `/classroom` 内查看这节课的完成、参与和后续工作。'),
      ).length,
    ).toBeGreaterThan(0)
    expect(
      screen
        .getAllByRole('link', { name: '查看班级趋势' })
        .some(
          (link) =>
            link.getAttribute('href') ===
            '/teacher/trends?classId=class-1&lessonId=lesson-1&sessionId=session-1&view=sessions',
        ),
    ).toBe(true)
  })

  it('renders the exact grouped evidence labels and explicit 未评价 state', () => {
    render(<ClassroomSessionRecapSurface recap={recap} />)

    expect(screen.getAllByText('未评价').length).toBeGreaterThan(0)
    expect(screen.getAllByText('完成情况').length).toBeGreaterThan(0)
    expect(screen.getAllByText('提交与反馈').length).toBeGreaterThan(0)
    expect(screen.getAllByText('过程评价').length).toBeGreaterThan(0)
    expect(screen.getAllByText('课堂时间线').length).toBeGreaterThan(0)
  })

  it('shows a calm empty state for question recap when no quiz sample stats exist', () => {
    render(<ClassroomSessionRecapSurface recap={recap} />)

    expect(screen.getByText('题目复盘')).toBeTruthy()
    expect(screen.getByText('看清这道题答得怎样，再决定该回看谁')).toBeTruthy()
    expect(screen.getByText('当前课堂没有 quiz sample 题目，或还没有可用于复盘的作答记录。')).toBeTruthy()
  })

  it('renders quiz sample question recap cards with denominator copy and option distribution', () => {
    render(
      <ClassroomSessionRecapSurface
        recap={{
          ...recap,
          quizSampleStats: {
            questionCount: 1,
            questions: [
              {
                stepId: 'step-quiz',
                stepTitle: '互动单选题',
                prompt: '这首诗主要描写哪个季节？',
                correctOption: 'A',
                answeredCount: 2,
                unansweredCount: 1,
                participantCount: 3,
                correctCount: 1,
                correctRate: 0.5,
                denominatorLabel: '正确率按已作答 2 人计算；作答 / 未作答人数相对本次课堂参与者名单。',
                options: [
                  { slot: 'A', label: '春天', count: 1, percentage: 0.5, isCorrect: true },
                  { slot: 'B', label: '秋天', count: 1, percentage: 0.5, isCorrect: false },
                ],
              },
            ],
          },
        }}
      />,
    )

    expect(screen.getByText('正确率')).toBeTruthy()
    expect(screen.getByText('正确答案 A')).toBeTruthy()
    expect(screen.getByText('已作答 2')).toBeTruthy()
    expect(screen.getByText('未作答 1')).toBeTruthy()
    expect(screen.getByText('春天')).toBeTruthy()
    expect(screen.getByText('秋天')).toBeTruthy()
    expect(screen.getByText('正确率按已作答 2 人计算；作答 / 未作答人数相对本次课堂参与者名单。')).toBeTruthy()
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
