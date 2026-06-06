// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClassroomLiveSnapshotRefresh } from "./classroom-live-snapshot-refresh";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

class MockEventSource {
  static instances: MockEventSource[] = [];

  readonly url: string;
  readonly listeners = new Map<string, Set<(event: Event) => void>>();
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: Event) => void) {
    const existing = this.listeners.get(type) ?? new Set<(event: Event) => void>();
    existing.add(listener);
    this.listeners.set(type, existing);
  }

  removeEventListener(type: string, listener: (event: Event) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  close() {
    this.closed = true;
  }

  emit(type: string, data: unknown) {
    const event = new MessageEvent(type, {
      data: typeof data === "string" ? data : JSON.stringify(data),
    });
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  static OPEN = 1;

  readonly url: string;
  readyState = MockWebSocket.OPEN;
  private listeners = new Map<string, Set<(event: Event | MessageEvent) => void>>();

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: (event: Event | MessageEvent) => void) {
    const existing = this.listeners.get(type) ?? new Set<(event: Event | MessageEvent) => void>();
    existing.add(listener);
    this.listeners.set(type, existing);
  }

  close() {}

  send() {}

  emit(type: string, data?: unknown) {
    const event = type === 'message'
      ? new MessageEvent('message', { data: typeof data === 'string' ? data : JSON.stringify(data) })
      : new Event(type);

    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

describe("ClassroomLiveSnapshotRefresh", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    MockWebSocket.instances = [];
    refreshMock.mockReset();
    vi.stubGlobal("EventSource", MockEventSource as unknown as typeof EventSource);
    vi.stubGlobal("WebSocket", MockWebSocket as unknown as typeof WebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefers websocket classroom.snapshot envelopes and refreshes on newer version or fresher updatedAt", () => {
    render(<ClassroomLiveSnapshotRefresh sessionId="session-1" initialVersion={3} initialUpdatedAt="2026-05-17T08:00:00.000Z" />);

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0]?.url).toContain('/api/ws/classroom/session-1?actor=teacher');

    MockWebSocket.instances[0]?.emit('message', {
      messageId: 'msg-1',
      sessionId: 'session-1',
      actor: { userId: 'teacher-1', scope: 'teacher', schoolId: 'school-1' },
      kind: 'classroom.snapshot',
      sentAt: '2026-05-17T08:00:00.000Z',
      correlation: { correlationId: 'corr-1', truthPersisted: true },
      payload: {
        snapshot: {
          sessionId: "session-1",
          lessonId: "lesson-1",
          publishedVersionId: "pub-1",
          classId: "class-1",
          className: "一班",
          teacherId: "teacher-1",
          lessonTitle: "古诗导读",
          activeStepId: "step-1",
          locked: false,
          status: "live",
          version: 3,
          updatedAt: "2026-05-17T08:00:00.000Z",
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
          teacherTimeline: [],
          copy: {
            staleRefreshRequired: "stale",
            pendingAction: "pending",
            reconnecting: "reconnecting",
            restored: "restored",
          },
        },
      },
    });

    expect(refreshMock).not.toHaveBeenCalled();

    MockWebSocket.instances[0]?.emit('message', {
      messageId: 'msg-2',
      sessionId: 'session-1',
      actor: { userId: 'teacher-1', scope: 'teacher', schoolId: 'school-1' },
      kind: 'classroom.snapshot',
      sentAt: '2026-05-17T08:00:00.000Z',
      correlation: { correlationId: 'corr-2', truthPersisted: true },
      payload: {
        snapshot: {
          sessionId: "session-1",
          lessonId: "lesson-1",
          publishedVersionId: "pub-1",
          classId: "class-1",
          className: "一班",
          teacherId: "teacher-1",
          lessonTitle: "古诗导读",
          activeStepId: "step-1",
          locked: false,
          status: "live",
          version: 4,
          updatedAt: "2026-05-17T08:00:00.000Z",
          participants: [],
          monitoringSummary: {
            connectedCount: 1,
            reconnectingCount: 0,
            offlineCount: 0,
            needsAttentionCount: 0,
            submittedCount: 1,
          },
          steps: [],
          slideState: null,
          teacherTimeline: [],
          copy: {
            staleRefreshRequired: "stale",
            pendingAction: "pending",
            reconnecting: "reconnecting",
            restored: "restored",
          },
        },
      },
    });

    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to EventSource when websocket is unavailable", () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("EventSource", MockEventSource as unknown as typeof EventSource);

    class ThrowingWebSocket {
      constructor() {
        throw new Error('WS failed');
      }
    }

    vi.stubGlobal('WebSocket', ThrowingWebSocket as unknown as typeof WebSocket)

    const view = render(<ClassroomLiveSnapshotRefresh sessionId="session-1" initialVersion={1} initialUpdatedAt="2026-05-17T08:00:00.000Z" />);

    const source = MockEventSource.instances[0];
    expect(source).toBeTruthy();

    source?.emit("snapshot", {
      sessionId: "session-1",
      lessonId: "lesson-1",
      publishedVersionId: "pub-1",
      classId: "class-1",
      className: "一班",
      teacherId: "teacher-1",
      lessonTitle: "古诗导读",
      activeStepId: "step-1",
      locked: false,
      status: "ended",
      version: 2,
      updatedAt: "2026-05-17T08:00:00.000Z",
      participants: [],
      monitoringSummary: {
        connectedCount: 1,
        reconnectingCount: 0,
        offlineCount: 0,
        needsAttentionCount: 0,
        submittedCount: 1,
      },
      steps: [],
      slideState: null,
      teacherTimeline: [],
      copy: {
        staleRefreshRequired: "stale",
        pendingAction: "pending",
        reconnecting: "reconnecting",
        restored: "restored",
      },
    });

    expect(source?.closed).toBe(true);

    view.unmount();
    expect(source?.closed).toBe(true);
  });

  it("refreshes on equal version when updatedAt becomes newer", () => {
    render(<ClassroomLiveSnapshotRefresh sessionId="session-1" initialVersion={2} initialUpdatedAt="2026-05-17T08:00:00.000Z" />);

    MockWebSocket.instances[0]?.emit('message', {
      messageId: 'msg-3',
      sessionId: 'session-1',
      actor: { userId: 'teacher-1', scope: 'teacher', schoolId: 'school-1' },
      kind: 'classroom.snapshot',
      sentAt: '2026-05-17T08:00:01.000Z',
      correlation: { correlationId: 'corr-3', truthPersisted: true },
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
          version: 2,
          updatedAt: '2026-05-17T08:00:02.000Z',
          participants: [],
          monitoringSummary: {
            connectedCount: 1,
            reconnectingCount: 0,
            offlineCount: 0,
            needsAttentionCount: 0,
            submittedCount: 1,
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
    });

    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});
