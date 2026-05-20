// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ClassroomControlPanel } from './classroom-control-panel'
import type { ClassroomSnapshotDTO } from '@/lib/dto/classroom'

const refreshMock = vi.fn()
const classroomActionMocks = vi.hoisted(() => ({
  changeClassroomModeAction: vi.fn(),
  changeClassroomSlideAction: vi.fn(),
  changeClassroomStepAction: vi.fn(),
  endClassroomSessionAction: vi.fn(),
  recordRuntimeTeacherControlAction: vi.fn(),
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
  recordRuntimeTeacherControlAction: classroomActionMocks.recordRuntimeTeacherControlAction,
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
      payload: { type: 'content', markdown: '# Summary' },
    },
  ],
  slideState: { stepId: 'step-1', slideIndex: 0 },
  transportStatus: {
    fanoutMode: 'local_only',
    degraded: false,
    degradedReason: null,
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
})
