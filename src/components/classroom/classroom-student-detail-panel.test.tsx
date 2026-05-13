// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ClassroomControlPanel } from './classroom-control-panel'
import { ClassroomStudentDetailPanel } from './classroom-student-detail-panel'
import type { ClassroomSnapshotDTO, ClassroomStudentDetailDTO } from '@/lib/dto/classroom'

const pushMock = vi.fn()
const refreshMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
  usePathname: () => '/classroom',
  useSearchParams: () => new URLSearchParams('sessionId=session-1'),
}))

vi.mock('@/actions/classroom-actions', () => ({
  changeClassroomModeAction: vi.fn(),
  changeClassroomSlideAction: vi.fn(),
  changeClassroomStepAction: vi.fn(),
  endClassroomSessionAction: vi.fn(),
}))

vi.mock('./classroom-conflict-panel', () => ({
  ClassroomConflictPanel: () => <div>冲突面板</div>,
}))

vi.mock('./classroom-timeline-panel', () => ({
  ClassroomTimelinePanel: () => <div>课堂时间线</div>,
}))

vi.mock('@/components/markdown/markdown-renderer', () => ({
  MarkdownRenderer: () => <div>markdown</div>,
}))

const studentDetail: ClassroomStudentDetailDTO = {
  studentId: 'student-1',
  studentName: '李雷',
  latestParticipationLevel: 'active',
  evidenceEntries: [
    {
      id: 'evidence-1',
      sessionId: 'session-1',
      studentId: 'student-1',
      stepId: 'step-2',
      sourceType: 'student-submission',
      evidenceType: 'submission',
      payload: { note: '提交了讨论记录' },
      capturedById: 'student-1',
      createdAt: '2026-05-12T10:03:00.000Z',
    },
  ],
  evaluationEntries: [
    {
      id: 'evaluation-1',
      sessionId: 'session-1',
      studentId: 'student-1',
      participationLevel: 'active',
      tags: ['主动发言', '表达清晰'],
      observationNote: '能够主动回应问题。',
      capturedById: 'teacher-1',
      createdAt: '2026-05-12T10:04:00.000Z',
    },
  ],
}

const snapshot: ClassroomSnapshotDTO = {
  sessionId: 'session-1',
  lessonId: 'lesson-1',
  publishedVersionId: 'pub-1',
  classId: 'class-1',
  className: '一班',
  teacherId: 'teacher-1',
  lessonTitle: '古诗导读',
  activeStepId: 'step-2',
  locked: false,
  status: 'live',
  version: 3,
  updatedAt: '2026-05-12T10:05:00.000Z',
  participants: [
    {
      studentId: 'student-1',
      studentName: '李雷',
      connectionState: 'connected',
      currentStepId: 'step-2',
      lastSeenAt: '2026-05-12T10:03:00.000Z',
      progressLabel: '跟随当前环节',
      submissionCount: 2,
      needsAttention: false,
      attentionReasons: [],
    },
  ],
  monitoringSummary: {
    connectedCount: 1,
    reconnectingCount: 0,
    offlineCount: 0,
    needsAttentionCount: 0,
    submittedCount: 1,
  },
  steps: [
    { id: 'step-1', title: '开场导入', rank: 'a0', type: 'content', payload: { type: 'content', title: '开场导入', body: '导入' } },
    { id: 'step-2', title: '随堂测验', rank: 'b0', type: 'quiz', payload: { type: 'quiz', question: '问题', options: [{ id: 'a', text: 'A' }], correctOptionId: 'a' } },
  ],
  slideState: null,
  teacherTimeline: [],
  copy: {
    staleRefreshRequired: '课堂状态已经被更新。请先恢复最新状态，再继续操作。',
    pendingAction: '当前控课面板可能不是最新。已为你保留本次操作，请刷新课堂快照后确认。',
    reconnecting: '正在重新连接课堂，会先显示最近一次课堂状态。',
    restored: '已恢复课堂状态，你现在看到的是最新步骤。',
  },
}

describe('ClassroomStudentDetailPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders evidence and evaluation tabs in one tonal panel', () => {
    render(
      <ClassroomStudentDetailPanel
        sessionId="session-1"
        detail={studentDetail}
        activeTab="evidence"
      />,
    )

    expect(screen.getByRole('heading', { name: '李雷' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '课堂证据' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '过程评价' })).toBeTruthy()
    expect(screen.getByText('最近一次参与度')).toBeTruthy()
    expect(screen.getByText('提交了讨论记录')).toBeTruthy()
  })

  it('shows evaluation history above the fixed formative evaluation form', () => {
    render(
      <ClassroomStudentDetailPanel
        sessionId="session-1"
        detail={studentDetail}
        activeTab="evaluation"
      />,
    )

    expect(screen.getAllByText('主动发言').length).toBeGreaterThan(0)
    expect(screen.getAllByText('表达清晰').length).toBeGreaterThan(0)
    expect(screen.getByText('能够主动回应问题。')).toBeTruthy()
    expect(screen.getByText('在课堂上下文里记录单学生观察')).toBeTruthy()
  })

  it('renders the detail panel inside classroom control layout', () => {
    render(
      <ClassroomControlPanel
        initialSnapshot={snapshot}
        studentDetail={studentDetail}
        activeDetailTab="evaluation"
      />,
    )

    expect(screen.getByText('课堂时间线')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: '过程评价' }).length).toBeGreaterThan(0)
  })
})
