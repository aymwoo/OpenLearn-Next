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

describe("ClassroomLiveSnapshotRefresh", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    refreshMock.mockReset();
    vi.stubGlobal("EventSource", MockEventSource as unknown as typeof EventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("subscribes to live classroom snapshot events and refreshes only on newer versions", () => {
    render(<ClassroomLiveSnapshotRefresh sessionId="session-1" initialVersion={3} />);

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0]?.url).toBe("/api/classroom/session-1/events");

    MockEventSource.instances[0]?.emit("snapshot", {
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
    });

    expect(refreshMock).not.toHaveBeenCalled();

    MockEventSource.instances[0]?.emit("snapshot", {
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
    });

    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("closes the stream when a newer ended snapshot arrives or when the component unmounts", () => {
    const view = render(<ClassroomLiveSnapshotRefresh sessionId="session-1" initialVersion={1} />);

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
});
