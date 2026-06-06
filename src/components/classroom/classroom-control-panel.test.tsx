// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ClassroomControlPanel } from './classroom-control-panel'
import type { ClassroomSnapshotDTO } from '@/lib/dto/classroom'

const refreshMock = vi.fn()
const classroomActionMocks = vi.hoisted(() => ({
  changeClassroomModeAction: vi.fn(),
  changeClassroomSlideAction: vi.fn(),
  changeClassroomStepAction: vi.fn(),
  endClassroomSessionAction: vi.fn(),
  recordClassroomParticipationControlAction: vi.fn(),
  recordClassroomVotingRoundControlAction: vi.fn(),
  recordRuntimeTeacherControlAction: vi.fn(),
  runCurrentVotingRecoveryAction: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}))

vi.mock('@/actions/classroom-actions', () => ({
  changeClassroomModeAction: classroomActionMocks.changeClassroomModeAction,
  changeClassroomSlideAction: classroomActionMocks.changeClassroomSlideAction,
  changeClassroomStepAction: classroomActionMocks.changeClassroomStepAction,
  endClassroomSessionAction: classroomActionMocks.endClassroomSessionAction,
  recordClassroomParticipationControlAction: classroomActionMocks.recordClassroomParticipationControlAction,
  recordClassroomVotingRoundControlAction: classroomActionMocks.recordClassroomVotingRoundControlAction,
  recordRuntimeTeacherControlAction: classroomActionMocks.recordRuntimeTeacherControlAction,
  runCurrentVotingRecoveryAction: classroomActionMocks.runCurrentVotingRecoveryAction,
}))

vi.mock('@/components/markdown/markdown-renderer', () => ({
  MarkdownRenderer: ({ onSlideChange }: { onSlideChange?: (slideIndex: number) => void }) => (
    <button type="button" onClick={() => onSlideChange?.(1)}>切到第 2 页</button>
  ),
}))

vi.mock('./classroom-conflict-panel', () => ({ ClassroomConflictPanel: () => <div>冲突面板</div> }))
vi.mock('./classroom-roster-panel', () => ({ ClassroomRosterPanel: () => <div>名册</div> }))
vi.mock('./classroom-session-history-panel', () => ({ ClassroomSessionHistoryPanel: () => <div>历史</div> }))
vi.mock('./classroom-student-detail-panel', () => ({ ClassroomStudentDetailPanel: () => <div>学生详情</div> }))
vi.mock('./classroom-timeline-panel', () => ({ ClassroomTimelinePanel: () => <div>时间线</div> }))
vi.mock('@/features/runtime-platform/host', () => ({ RuntimeHostClient: () => <div>Runtime Host</div> }))

class MockWebSocket {
  static instances: MockWebSocket[] = []
  static OPEN = 1

  readonly url: string
  readyState = MockWebSocket.OPEN
  sent: string[] = []
  private listeners = new Map<string, Set<(event: Event | MessageEvent) => void>>()

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
    queueMicrotask(() => this.emit('open'))
  }

  addEventListener(type: string, listener: (event: Event | MessageEvent) => void) {
    const set = this.listeners.get(type) ?? new Set<(event: Event | MessageEvent) => void>()
    set.add(listener)
    this.listeners.set(type, set)
  }

  send(data: string) {
    this.sent.push(data)
  }

  close() {}

  emit(type: string, data?: unknown) {
    const event = type === 'message'
      ? new MessageEvent('message', { data: typeof data === 'string' ? data : JSON.stringify(data) })
      : new Event(type)

    for (const listener of this.listeners.get(type) ?? []) {
      listener(event)
    }
  }
}

const snapshot: ClassroomSnapshotDTO = {
  sessionId: 'session-1',
  lessonId: 'lesson-1',
  publishedVersionId: 'pub-1',
  classId: 'class-1',
  className: '一班',
  teacherId: 'teacher-1',
  lessonTitle: '古诗导读',
  activeStepId: 'step-1',
  locked: false,
  status: 'live',
  version: 3,
  updatedAt: '2026-05-18T09:00:00.000Z',
  participants: [],
  monitoringSummary: {
    connectedCount: 0,
    reconnectingCount: 0,
    offlineCount: 0,
    needsAttentionCount: 0,
    submittedCount: 0,
  },
  steps: [
    {
      id: 'step-1',
      title: '互动 Runtime',
      rank: 'a0',
      type: 'content',
      pluginContract: null,
      payload: {
        type: 'content',
        markdown: '# Runtime',
        runtime: {
          version: 'v2',
          runtimeId: 'runtime-pilot',
          runtimeVersion: '1.0.0',
          kind: 'html-courseware',
          displayName: 'Pilot Runtime',
          stateSchemaVersion: '1',
          entry: { sandbox: 'iframe', bootstrap: '/runtime/html-courseware/pilot' },
          submitTarget: { primary: 'classroom-evidence', additional: [] },
          requestedCapabilities: [],
        },
      },
    },
    {
      id: 'step-2',
      title: '总结',
      rank: 'b0',
      type: 'content',
      pluginContract: null,
      payload: { type: 'content', markdown: '# Summary' },
    },
  ],
  slideState: { stepId: 'step-1', slideIndex: 0 },
  transportStatus: {
    fanoutMode: 'local_only',
    degraded: false,
    degradedReason: null,
  },
  currentVotingRound: {
    status: 'live',
    stepId: 'step-1',
    stepTitle: '互动 Runtime',
    startedAt: '2026-05-18T09:00:30.000Z',
    endedAt: null,
    submittedCount: 2,
    remainingCount: 1,
    optionResults: [
      { optionId: 'option-a', optionLabel: '方案 A', count: 1, percentage: 50, isLeading: true },
      { optionId: 'option-b', optionLabel: '方案 B', count: 1, percentage: 50, isLeading: true },
    ],
    incompleteStudents: [
      { studentId: 'student-3', studentName: '小雨', statusToken: '未提交' },
    ],
    namedResults: [
      { studentId: 'student-1', studentName: '李雷', selectedOptionIds: ['option-a'], selectedOptionLabels: ['方案 A'], submittedAt: '2026-05-18T09:01:30.000Z' },
      { studentId: 'student-2', studentName: '韩梅梅', selectedOptionIds: ['option-b'], selectedOptionLabels: ['方案 B'], submittedAt: '2026-05-18T09:01:45.000Z' },
    ],
    failureCount: 1,
    namedResultsFoldedByDefault: true,
    roundStatusCopy: '投票进行中',
    failureCopy: '有 1 名学生提交失败或状态异常，请先查看未完成名单。',
    recoveryActions: [
      { action: 'retry', label: '重试同步', description: '重新下发当前轮次同步指令。' },
      { action: 'reconcile', label: '重新对账', description: '按当前课堂 truth 重新校对结果。' },
      { action: 'suspend', label: '暂停本轮', description: '暂停当前轮次，避免继续接收异常写入。' },
      { action: 'fallback', label: '切换到课堂内回退处理', description: '保留课堂内处理，不跳出当前课堂。' },
    ],
    isFrozen: false,
    resultsDisplay: 'bar',
    anonymousResults: false,
    liveResultsVisible: true,
  },
  teacherTimeline: [],
  copy: {
    staleRefreshRequired: 'stale',
    pendingAction: 'pending',
    reconnecting: 'reconnecting',
    restored: 'restored',
  },
}

describe('ClassroomControlPanel websocket cutover', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    MockWebSocket.instances = []
    vi.stubGlobal('WebSocket', MockWebSocket as unknown as typeof WebSocket)
  })

  it('sends teacher.control for step and mode changes before fallback actions', async () => {
    render(<ClassroomControlPanel initialSnapshot={snapshot} />)

    fireEvent.click(screen.getAllByRole('button', { name: '切换到此环节' })[0]!)
    fireEvent.click(screen.getByRole('button', { name: /锁定跟随同步当前步骤/ }))

    await waitFor(() => {
      expect(MockWebSocket.instances[0]?.sent.some((entry) => entry.includes('teacher.control'))).toBe(true)
      expect(MockWebSocket.instances[0]?.sent.some((entry) => entry.includes('expectedVersion'))).toBe(true)
    })

    expect(classroomActionMocks.changeClassroomStepAction).not.toHaveBeenCalled()
    expect(classroomActionMocks.changeClassroomModeAction).not.toHaveBeenCalled()
  })

  it('falls back to canonical server actions after websocket returns transport.error', async () => {
    render(<ClassroomControlPanel initialSnapshot={snapshot} />)

    MockWebSocket.instances[0]?.emit('message', {
      messageId: 'msg-transport-error',
      sessionId: 'session-1',
      actor: { userId: 'teacher-1', scope: 'teacher', schoolId: 'school-1' },
      kind: 'transport.error',
      sentAt: '2026-05-18T09:01:00.000Z',
      correlation: { correlationId: 'corr-transport-error', truthPersisted: false },
      payload: { code: 'WEBSOCKET_MESSAGE_FAILED' },
    })

    classroomActionMocks.changeClassroomStepAction.mockResolvedValue({ ok: true, data: { sessionId: 'session-1' } })

    fireEvent.click(screen.getAllByRole('button', { name: '切换到此环节' })[0]!)

    await waitFor(() => {
      expect(classroomActionMocks.changeClassroomStepAction).toHaveBeenCalled()
    })
  })

  it('sends runtime.command and falls back to recordRuntimeTeacherControlAction when websocket is unavailable', async () => {
    render(<ClassroomControlPanel initialSnapshot={snapshot} />)

    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBeGreaterThan(0)
    })

    const runtimeCommandButton = screen.getAllByRole('button', { name: /重新下发当前 Runtime 指令/ }).at(-1)!

    fireEvent.click(runtimeCommandButton)

    await waitFor(() => {
      const sentEntries = MockWebSocket.instances.flatMap((instance) => instance.sent)
      expect(sentEntries.some((entry) => entry.includes('runtime.command'))).toBe(true)
      expect(sentEntries.some((entry) => entry.includes('runtime-teacher-control'))).toBe(true)
    })

    await waitFor(() => {
      expect(runtimeCommandButton.hasAttribute('disabled')).toBe(false)
    })

    for (const instance of MockWebSocket.instances) {
      instance.readyState = 0
    }
    classroomActionMocks.recordRuntimeTeacherControlAction.mockResolvedValue({ ok: true, data: { sessionId: 'runtime-session-1' } })

    fireEvent.click(runtimeCommandButton)

    await waitFor(() => {
      expect(classroomActionMocks.recordRuntimeTeacherControlAction).toHaveBeenCalled()
    })
  })

  it('renders voting round controls and falls back to canonical action when websocket is unavailable', async () => {
    render(<ClassroomControlPanel initialSnapshot={snapshot} />)

    expect(screen.getAllByRole('button', { name: '开始本轮投票' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: '结束本轮投票' }).length).toBeGreaterThan(0)

    for (const instance of MockWebSocket.instances) {
      instance.readyState = 0
    }
    classroomActionMocks.recordRuntimeTeacherControlAction.mockResolvedValue({ ok: true, data: { sessionId: 'runtime-session-1' } })

    fireEvent.click(screen.getAllByRole('button', { name: '开始本轮投票' })[0]!)

    await waitFor(() => {
      expect(classroomActionMocks.recordRuntimeTeacherControlAction).toHaveBeenCalledWith(expect.objectContaining({
        payload: expect.objectContaining({
          command: 'start-voting-round',
        }),
      }))
      expect(refreshMock).toHaveBeenCalled()
    })
  })

  it('falls back to classroom voting round action when the voting step has no runtime descriptor', async () => {
    classroomActionMocks.recordClassroomParticipationControlAction.mockResolvedValue({ ok: true, data: { sessionId: 'session-1' } })

    render(
      <ClassroomControlPanel
        initialSnapshot={{
          ...snapshot,
          activeStepId: 'step-1',
          steps: [
            {
              id: 'step-1',
              title: '课堂投票',
              rank: 'a0',
              type: 'quiz',
              payload: {
                type: 'quiz',
                question: '你更支持哪个方案？',
                options: ['方案 A', '方案 B'],
              },
              pluginContract: {
                kind: 'classroom-voting',
                contractVersion: 'v1',
                runtimeContractVersion: 'v2',
                pluginId: 'plugin-1',
                publicMetadata: {
                  builtInKey: 'classroomVoting',
                  pluginKey: 'builtin-teaching-step-classroom-voting',
                  pluginName: '课堂投票插件',
                  stepType: 'quiz',
                },
                executableConfig: {
                  prompt: '你更支持哪个方案？',
                  options: [
                    { id: 'option-a', label: '方案 A' },
                    { id: 'option-b', label: '方案 B' },
                  ],
                  allowMultiple: false,
                  anonymousResults: true,
                  showLiveResults: false,
                  participationWindowSeconds: 90,
                  resultsDisplay: 'compact',
                },
              },
            },
          ],
          currentVotingRound: null,
        }}
      />,
    )

    fireEvent.click(screen.getAllByRole('button', { name: '开始本轮投票' })[0]!)

    await waitFor(() => {
      expect(classroomActionMocks.recordClassroomParticipationControlAction).toHaveBeenCalledWith({
        sessionId: 'session-1',
        stepId: 'step-1',
        command: 'start-voting-round',
      })
      expect(refreshMock).toHaveBeenCalled()
    })
  })

  it('shows quiz sample open close copy and falls back through participation control action', async () => {
    classroomActionMocks.recordClassroomParticipationControlAction.mockResolvedValue({ ok: true, data: { sessionId: 'session-1' } })

    render(
      <ClassroomControlPanel
        initialSnapshot={{
          ...snapshot,
          activeStepId: 'step-1',
          steps: [
            {
              id: 'step-1',
              title: '互动答题（样板）',
              rank: 'a0',
              type: 'quiz',
              payload: {
                type: 'quiz',
                question: '以下哪项正确？',
                options: ['A 选项', 'B 选项'],
                correctOptionIndex: 0,
                builtInSource: {
                  pluginId: 'builtin-teaching-step-quiz-sample',
                  builtInKey: 'quizSample',
                  pluginName: '互动答题（样板）',
                },
              },
              pluginContract: null,
            },
          ],
          currentVotingRound: {
            ...snapshot.currentVotingRound!,
            stepId: 'step-1',
            stepTitle: '互动答题（样板）',
            roundStatusCopy: '开放作答',
            isFrozen: false,
          },
        }}
      />,
    )

    expect(screen.getByText('课堂答题控制')).toBeTruthy()
    expect(screen.getByRole('button', { name: '开放作答' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '已关闭' })).toBeTruthy()

    for (const instance of MockWebSocket.instances) {
      instance.readyState = 0
    }

    fireEvent.click(screen.getByRole('button', { name: '已关闭' }))

    await waitFor(() => {
      expect(classroomActionMocks.recordClassroomParticipationControlAction).toHaveBeenCalledWith({
        sessionId: 'session-1',
        stepId: 'step-1',
        command: 'end-voting-round',
      })
      expect(classroomActionMocks.recordRuntimeTeacherControlAction).not.toHaveBeenCalled()
    })
  })

  it('shows quiz sample controls before the round starts', () => {
    render(
      <ClassroomControlPanel
        initialSnapshot={{
          ...snapshot,
          activeStepId: 'step-1',
          steps: [
            {
              id: 'step-1',
              title: '互动答题（样板）',
              rank: 'a0',
              type: 'quiz',
              payload: {
                type: 'quiz',
                question: '以下哪项正确？',
                options: ['A 选项', 'B 选项'],
                correctOptionIndex: 0,
                builtInSource: {
                  pluginId: 'builtin-teaching-step-quiz-sample',
                  builtInKey: 'quizSample',
                  pluginName: '互动答题（样板）',
                },
              },
              pluginContract: null,
            },
          ],
          currentVotingRound: null,
        }}
      />,
    )

    expect(screen.getByText('课堂答题控制')).toBeTruthy()
    expect(screen.getByRole('button', { name: '开放作答' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '已关闭' })).toBeTruthy()
  })

  it('hides named results and live aggregates when frozen contract requires it', () => {
    render(
      <ClassroomControlPanel
        initialSnapshot={{
          ...snapshot,
          currentVotingRound: {
            ...snapshot.currentVotingRound!,
            optionResults: [],
            namedResults: [],
            anonymousResults: true,
            liveResultsVisible: false,
            isFrozen: false,
          },
        }}
      />,
    )

    expect(screen.queryAllByRole('button', { name: '展开实名结果' })).toHaveLength(0)
    expect(screen.getByText('当前设置为结束前不展示实时结果，老师仍可根据未完成名单推进课堂。')).toBeTruthy()
  })

  it('shows teacher-only degraded banner when transport falls back to local instance only', async () => {
    render(
      <ClassroomControlPanel
        initialSnapshot={{
          ...snapshot,
          transportStatus: {
            fanoutMode: 'redis_fanout',
            degraded: true,
            degradedReason: 'REDIS_SUBSCRIBER_CLOSED',
          },
        }}
      />,
    )

    expect(screen.getByText('当前仅保证本实例课堂同步')).toBeTruthy()
    expect(screen.getByText(/REDIS_SUBSCRIBER_CLOSED/)).toBeTruthy()
  })

  it('renders aggregate before incomplete roster and keeps named results folded by default', () => {
    render(<ClassroomControlPanel initialSnapshot={snapshot} />)

    const aggregateHeading = screen.getAllByRole('heading', { name: '实时汇总' })[0]!
    const incompleteHeading = screen.getAllByRole('heading', { name: '未完成名单' })[0]!
    const namedResultsToggle = screen.getAllByRole('button', { name: '展开实名结果' })[0]!

    expect(aggregateHeading.compareDocumentPosition(incompleteHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(incompleteHeading.compareDocumentPosition(namedResultsToggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByText('李雷')).toBeNull()
    expect(screen.getAllByText('有 1 名学生提交失败或状态异常，请先查看未完成名单。')[0]).toBeTruthy()
  })

  it('expands frozen named results on demand and shows round closed copy', () => {
    render(
      <ClassroomControlPanel
        initialSnapshot={{
          ...snapshot,
          currentVotingRound: {
            ...snapshot.currentVotingRound!,
            status: 'closed',
            endedAt: '2026-05-18T09:02:00.000Z',
            roundStatusCopy: '本轮已结束',
            isFrozen: true,
          },
        }}
      />,
    )

    expect(screen.getByText('本轮已结束')).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: '展开实名结果' })[0]!)
    expect(screen.getByText('李雷')).toBeTruthy()
    expect(screen.getAllByText('方案 A').length).toBeGreaterThan(0)
  })

  it('dispatches current-round recovery actions through classroom action chain', async () => {
    classroomActionMocks.runCurrentVotingRecoveryAction.mockResolvedValue({ ok: true, data: { sessionId: 'session-1' } })

    render(<ClassroomControlPanel initialSnapshot={snapshot} />)

    fireEvent.click(screen.getAllByRole('button', { name: '重试同步' })[0]!)

    await waitFor(() => {
      expect(classroomActionMocks.runCurrentVotingRecoveryAction).toHaveBeenCalledWith({
        sessionId: 'session-1',
        stepId: 'step-1',
        recoveryAction: 'retry',
      })
      expect(refreshMock).toHaveBeenCalled()
    })
  })

  it('always shows 查看课堂事件 entry and escalates it under degraded posture', () => {
    const { rerender } = render(<ClassroomControlPanel initialSnapshot={snapshot} />)

    const baseLink = screen.getAllByRole('link', { name: '查看课堂事件' })[0]!
    expect(baseLink.getAttribute('href')).toBe('/settings/labs/incidents/session-1')
    expect(baseLink.className).toContain('from-primary')

    rerender(
      <ClassroomControlPanel
        initialSnapshot={{
          ...snapshot,
          transportStatus: {
            fanoutMode: 'redis_fanout',
            degraded: true,
            degradedReason: 'REDIS_SUBSCRIBER_CLOSED',
          },
        }}
      />,
    )

    const escalatedLink = screen.getAllByRole('link', { name: '查看课堂事件' })[0]!
    expect(escalatedLink.className).toContain('from-primary')
  })

  it('renders degraded honesty as trusted boundary, impact scope, and next step', () => {
    render(
      <ClassroomControlPanel
        initialSnapshot={{
          ...snapshot,
          transportStatus: {
            fanoutMode: 'redis_fanout',
            degraded: true,
            degradedReason: 'REDIS_SUBSCRIBER_CLOSED',
          },
        }}
      />,
    )

    expect(screen.getAllByText(/仍可信什么：SQLite canonical truth 与当前课堂 session 仍可作为教师控课锚点/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/已不可信什么：跨实例 fanout 与“所有实例已同步”的假设当前不可直接信任/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/影响范围：当前课堂优先，多课堂可能受同类 transport posture 影响/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/推荐下一步：查看课堂事件或继续进入 runtime inspector/).length).toBeGreaterThan(0)
  })

  it('removes suspend and fallback from shell quick path but keeps detail guidance visible', () => {
    render(<ClassroomControlPanel initialSnapshot={snapshot} />)

    expect(screen.queryByRole('button', { name: '暂停本轮' })).toBeNull()
    expect(screen.queryByRole('button', { name: '切换到课堂内回退处理' })).toBeNull()
    expect(screen.getAllByText(/resume、suspend、fallback 需前往课堂事件或 detail surface 进行强确认/).length).toBeGreaterThan(0)
  })
})
