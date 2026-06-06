// @vitest-environment jsdom

import { readFileSync } from 'node:fs'

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ClassroomConsoleSurface } from './classroom-console-surface'
import type { ClassroomConsoleDTO, ClassroomSessionRecapDTO, ClassroomSnapshotDTO } from '@/lib/dto/classroom'

const source = readFileSync('src/components/surfaces/classroom-console-surface.tsx', 'utf8')
const controlPanelSource = readFileSync('src/components/classroom/classroom-control-panel.tsx', 'utf8')

vi.mock('@/components/classroom/classroom-control-panel', () => ({
  ClassroomControlPanel: () => <div>实时课堂控制</div>,
}))

vi.mock('@/components/classroom/classroom-session-history-panel', () => ({
  ClassroomSessionHistoryPanel: () => <div>课堂记录</div>,
}))

vi.mock('@/components/classroom/classroom-session-recap-surface', () => ({
  ClassroomSessionRecapSurface: () => <div>课堂复盘主舞台</div>,
}))

const consoleData: ClassroomConsoleDTO = {
  liveSessions: [],
  sessionEntries: [
    {
      id: 'session-1',
      lessonId: 'lesson-1',
      lessonTitle: '古诗导读',
      classId: 'class-1',
      className: '一班',
      updatedAt: '2026-05-14T08:40:00.000Z',
      startedAt: '2026-05-14T08:00:00.000Z',
      endedAt: '2026-05-14T08:40:00.000Z',
      locked: false,
      version: 3,
      status: 'ended',
    },
  ],
  publishedLessons: [],
  emptyStateCopy: '还没有可开课的已发布课时或可用班级',
  launchPreviewEmptyState: {
    title: '先选择一个已发布课时',
    description: '选定课时后，这里会展示上课步骤顺序、每一步摘要、预计时长与所需材料提示，方便你在开课前快速确认课堂节奏。',
  },
}

const snapshot: ClassroomSnapshotDTO = {
  sessionId: 'session-live',
  lessonId: 'lesson-1',
  publishedVersionId: 'pub-1',
  classId: 'class-1',
  className: '一班',
  teacherId: 'teacher-1',
  lessonTitle: '古诗导读',
  activeStepId: 'step-1',
  locked: false,
  status: 'live',
  version: 1,
  updatedAt: '2026-05-14T08:10:00.000Z',
  participants: [],
  monitoringSummary: {
    connectedCount: 0,
    reconnectingCount: 0,
    offlineCount: 0,
    needsAttentionCount: 0,
    submittedCount: 0,
  },
  steps: [],
  slideState: null,
  currentVotingRound: null,
  transportStatus: {
    fanoutMode: 'local_only',
    degraded: false,
    degradedReason: null,
  },
  teacherTimeline: [],
  copy: {
    staleRefreshRequired: '课堂状态已经被更新。请先恢复最新状态，再继续操作。',
    pendingAction: '当前控课面板可能不是最新。已为你保留本次操作，请刷新课堂快照后确认。',
    reconnecting: '正在重新连接课堂，会先显示最近一次课堂状态。',
    restored: '已恢复课堂状态，你现在看到的是最新步骤。',
  },
}

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
    completionLabel: '已完成 0/0',
    completionCount: 0,
    totalStudents: 0,
    submissionCount: 0,
    evidenceCount: 0,
    participationBuckets: { active: 0, normal: 0, attention: 0, unevaluated: 0 },
  },
  workload: {
    followUpSignalsCount: 0,
    pendingFeedbackCount: 0,
  },
  detailTab: 'students',
  studentSummaries: [],
  selectedStudent: null,
  stepSummaries: [],
  quizSampleStats: {
    questionCount: 0,
    questions: [],
  },
  selectedStepId: null,
}

describe('ClassroomConsoleSurface', () => {
  it('switches ended sessions to the recap main stage instead of live controls', () => {
    render(<ClassroomConsoleSurface consoleData={consoleData} initialSnapshot={null} recap={recap} />)

    expect(screen.getByText('课堂复盘主舞台')).toBeTruthy()
    expect(screen.getByText('课堂记录')).toBeTruthy()
    expect(screen.queryByText('实时课堂控制')).toBeNull()
  })

  it('keeps the live runtime path when only a live snapshot is present', () => {
    render(<ClassroomConsoleSurface consoleData={{ ...consoleData, sessionEntries: [] }} initialSnapshot={snapshot} />)

    expect(screen.getByText('实时课堂控制')).toBeTruthy()
  })

  it('reuses the shared teacher skeleton without horizontal scroll wrappers', () => {
    expect(source).toContain('surfaceWidths.workspace')
    expect(source).toContain('surfaceWidths.heroBody')
    expect(source).toContain('teacherSurfaceRhythm.stack')
    expect(source).toContain('ClassroomSessionRecapSurface')
    expect(source).not.toContain('overflow-x-auto')
  })

  it('keeps proof first-feedback in classroom and exposes the inspector deep-link as a secondary action', () => {
    expect(controlPanelSource).toContain('const showRuntimeProofFeedback = Boolean(primaryRuntimeProof) || runtimeAttentionParticipants.length > 0')
    expect(controlPanelSource).toContain('{showRuntimeProofFeedback ? (')
    expect(controlPanelSource).toContain('已有学生完成当前互动提交')
    expect(controlPanelSource).toContain('当前互动结果待重试，可进入运行排查')
    expect(controlPanelSource).toContain('查看运行轨迹')
    expect(controlPanelSource).toContain('runtimeSessionId=')
    expect(controlPanelSource).toContain('{currentStep && currentRuntimeDescriptor ? (')
  })
})
