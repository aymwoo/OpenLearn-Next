// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ClassroomRuntimeClient } from './classroom-runtime-client'
import type { StudentPlayerPersonalDTO, StudentPlayerShellDTO } from '@/lib/dto/learning'

const classroomActionMocks = vi.hoisted(() => ({
  touchClassroomPresenceAction: vi.fn(),
}))

vi.mock('@/actions/classroom-actions', () => ({
  touchClassroomPresenceAction: classroomActionMocks.touchClassroomPresenceAction,
}))

vi.mock('@/actions/learning-actions', () => ({
  markStepProgressAction: vi.fn(),
}))

vi.mock('@/components/learning/quick-response-step-card', () => ({ QuickResponseStepCard: () => <div>Quick Response</div> }))
vi.mock('@/components/learning/quiz-step-card', () => ({ QuizStepCard: () => <div>Quiz</div> }))
vi.mock('@/components/learning/task-step-card', () => ({ TaskStepCard: () => <div>Task</div> }))
vi.mock('@/components/markdown/markdown-renderer', () => ({ MarkdownRenderer: () => <div>Markdown</div> }))
vi.mock('@/features/runtime-platform/host', () => ({
  RuntimeHostClient: ({ latestRuntimeStateSummary }: { latestRuntimeStateSummary?: Record<string, unknown> }) => (
    <div data-testid="runtime-host">{JSON.stringify(latestRuntimeStateSummary ?? {})}</div>
  ),
}))

class MockEventSource {
  static instances: MockEventSource[] = []
  readonly url: string
  listeners = new Map<string, Set<(event: Event) => void>>()

  constructor(url: string) {
    this.url = url
    MockEventSource.instances.push(this)
  }

  addEventListener(type: string, listener: (event: Event) => void) {
    const set = this.listeners.get(type) ?? new Set<(event: Event) => void>()
    set.add(listener)
    this.listeners.set(type, set)
  }

  close() {}

  emit(type: string, data: unknown) {
    const event = new MessageEvent(type, { data: typeof data === 'string' ? data : JSON.stringify(data) })
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event)
    }
  }
}

class MockWebSocket {
  static instances: MockWebSocket[] = []
  static OPEN = 1

  readonly url: string
  readyState = MockWebSocket.OPEN
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

  send() {}
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

const shell: StudentPlayerShellDTO = {
  lessonId: 'lesson-1',
  publishedVersionId: 'pub-1',
  title: '古诗导读',
  objective: '理解诗意',
  steps: [
    {
      id: 'step-1',
      lessonId: 'lesson-1',
      type: 'content',
      title: '互动 Runtime',
      rank: 'a0',
      payload: {
        type: 'content',
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
      } as never,
    },
  ],
}

const personal: StudentPlayerPersonalDTO = {
  progress: {
    resumeStepId: 'step-1',
    resumeLabel: '继续学习',
    steps: [{ stepId: 'step-1', state: 'in_progress', completedAt: null }],
  },
  stepActivities: [],
  runtime: {
    forcedStepId: 'step-1',
    forcedLabel: '老师指定',
    locked: false,
    inaccessibleMessage: null,
    classroomSessionId: 'session-1',
    classroomVersion: 3,
    connectionState: 'offline',
    teacherRecommendedStepId: null,
    slideIndex: null,
    disabledStepIds: [],
    disabledReason: null,
    snapshotStatusCopy: null,
    manualRefreshAvailable: false,
    lastFailedAction: null,
    latestRuntime: null,
    latestRuntimeStateSummary: {},
    runtimeRecoveryStatus: 'unavailable',
  },
  canRetryTask: false,
  canRetryQuiz: false,
  showCorrectAnswer: false,
  latestSubmissions: { tasks: [], quizzes: [] },
  latestQuickResponse: null,
  history: { tasks: [], quizzes: [] },
  quickResponseHistory: [],
  inaccessibleMessage: '课时暂不可学习',
}

describe('ClassroomRuntimeClient websocket consumer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    MockEventSource.instances = []
    MockWebSocket.instances = []
    vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource)
    vi.stubGlobal('WebSocket', MockWebSocket as unknown as typeof WebSocket)
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
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
        version: 4,
        updatedAt: '2026-05-18T09:00:00.000Z',
        participants: [],
        monitoringSummary: {
          connectedCount: 1,
          reconnectingCount: 0,
          offlineCount: 0,
          needsAttentionCount: 0,
          submittedCount: 0,
        },
        steps: [],
        slideState: null,
        teacherTimeline: [],
        copy: {
          staleRefreshRequired: 'stale',
          pendingAction: 'pending',
          reconnecting: 'reconnecting',
          restored: 'restored',
        },
      }),
    })) as unknown as typeof fetch)
  })

  it('touches presence on websocket open and consumes durable snapshot parity', async () => {
    render(<ClassroomRuntimeClient shell={shell} personal={personal} />)

    await waitFor(() => {
      expect(classroomActionMocks.touchClassroomPresenceAction).toHaveBeenCalledWith({
        sessionId: 'session-1',
        connectionState: 'connected',
        currentStepId: 'step-1',
      })
    })

    MockWebSocket.instances[0]?.emit('message', {
      messageId: 'msg-1',
      sessionId: 'session-1',
      actor: { userId: 'teacher-1', scope: 'teacher', schoolId: 'school-1' },
      kind: 'classroom.snapshot',
      sentAt: '2026-05-18T09:01:00.000Z',
      correlation: { correlationId: 'corr-1', truthPersisted: true },
      payload: {
        snapshot: {
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
          version: 4,
          updatedAt: '2026-05-18T09:01:00.000Z',
          participants: [],
          monitoringSummary: {
            connectedCount: 1,
            reconnectingCount: 0,
            offlineCount: 0,
            needsAttentionCount: 0,
            submittedCount: 0,
          },
          steps: [],
          slideState: null,
          teacherTimeline: [],
          copy: {
            staleRefreshRequired: 'stale',
            pendingAction: 'pending',
            reconnecting: 'reconnecting',
            restored: 'restored',
          },
        },
      },
    })

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/classroom/session-1/snapshot', { cache: 'no-store' })
    })
  })

  it('updates runtime host summary on runtime.event and exposes snapshot_fallback manual reconnect', async () => {
    render(<ClassroomRuntimeClient shell={shell} personal={personal} />)

    MockWebSocket.instances[0]?.emit('message', {
      messageId: 'msg-2',
      sessionId: 'session-1',
      actor: { userId: 'teacher-1', scope: 'teacher', schoolId: 'school-1' },
      kind: 'runtime.event',
      sentAt: '2026-05-18T09:01:00.000Z',
      correlation: { correlationId: 'corr-2', truthPersisted: true },
      payload: {
        kind: 'runtime.teacher-control',
        runtimeInstanceId: 'runtime-1',
        recordedEventId: 'event-1',
        applied: true,
      },
    })

    await waitFor(() => {
      const hosts = screen.getAllByTestId('runtime-host')
      expect(hosts.at(-1)?.textContent).toContain('runtime.teacher-control')
      expect(hosts.at(-1)?.textContent).toContain('runtime-1')
    })

    MockWebSocket.instances[0]?.emit('message', {
      messageId: 'msg-3',
      sessionId: 'session-1',
      actor: { userId: 'teacher-1', scope: 'teacher', schoolId: 'school-1' },
      kind: 'transport.error',
      sentAt: '2026-05-18T09:01:00.000Z',
      correlation: { correlationId: 'corr-3', truthPersisted: false },
      payload: { code: 'WEBSOCKET_MESSAGE_FAILED' },
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '重新连接课堂' })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: '重新连接课堂' }))

    await waitFor(() => {
      expect(classroomActionMocks.touchClassroomPresenceAction).toHaveBeenCalled()
    })
  })
})
