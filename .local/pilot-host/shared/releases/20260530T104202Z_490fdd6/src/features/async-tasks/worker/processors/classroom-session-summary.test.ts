import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

const { executeClassroomSessionSummaryTask } = vi.hoisted(() => ({
  executeClassroomSessionSummaryTask: vi.fn(),
}));

vi.mock("@/lib/dal/classroom", () => ({
  executeClassroomSessionSummaryTask,
}));

import { processClassroomSessionSummaryJob } from "./classroom-session-summary";

const processorSource = readFileSync(
  "src/features/async-tasks/worker/processors/classroom-session-summary.ts",
  "utf8",
);

describe("classroom session summary processor", () => {
  it("parses payload, records progress, and delegates incremental/finalize execution to the dal helper", async () => {
    executeClassroomSessionSummaryTask.mockResolvedValueOnce({
      sessionId: "session-1",
      schoolId: "school-1",
      triggerMode: "finalize",
      eventType: "ended",
      eventVersion: 4,
      artifactStatus: "completed",
      outcome: "completed",
      titleKey: "asyncTasks.classroom.sessionSummary.result.completed",
      summaryKey: "asyncTasks.classroom.sessionSummary.result.completedSummary",
      counts: {
        total: 1,
        succeeded: 1,
        partiallySucceeded: 0,
        failed: 0,
        skipped: 0,
      },
      detail: {
        sessionId: "session-1",
        schoolId: "school-1",
        triggerMode: "finalize",
        eventType: "ended",
        eventVersion: 4,
        lessonTitle: "古诗导读",
        className: "一班",
        completionCount: 1,
        totalStudents: 2,
        submissionCount: 1,
        evidenceCount: 2,
        participationBuckets: {
          active: 1,
          normal: 0,
          attention: 0,
          unevaluated: 1,
        },
      },
    });

    const updateProgress = vi.fn(async () => undefined);

    const result = await processClassroomSessionSummaryJob({
      id: "job-summary-1",
      name: "classroom.session_summary",
      data: {
        sessionId: "session-1",
        schoolId: "school-1",
        triggerMode: "finalize",
        eventType: "ended",
        eventVersion: 4,
      },
      updateProgress,
    });

    expect(updateProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "running",
        messageKey: "asyncTasks.classroom.sessionSummary.progress.running",
        percentComplete: 15,
        detail: expect.objectContaining({
          jobId: "job-summary-1",
          sessionId: "session-1",
          schoolId: "school-1",
          triggerMode: "finalize",
          eventType: "ended",
          eventVersion: 4,
        }),
      }),
    );
    expect(executeClassroomSessionSummaryTask).toHaveBeenCalledWith({
      sessionId: "session-1",
      schoolId: "school-1",
      triggerMode: "finalize",
      eventType: "ended",
      eventVersion: 4,
    });
    expect(result).toEqual(
      expect.objectContaining({
        sessionId: "session-1",
        schoolId: "school-1",
        triggerMode: "finalize",
        eventType: "ended",
        eventVersion: 4,
        artifactStatus: "completed",
        outcome: "completed",
      }),
    );
  });

  it("keeps processor discipline on derived execution only", () => {
    expect(processorSource).toContain("executeClassroomSessionSummaryTask(payload)");
    expect(processorSource).toContain("job.updateProgress(");
    expect(processorSource).not.toContain("@/db");
    expect(processorSource).not.toContain("drizzle-orm");
    expect(processorSource).not.toContain("update(classroomSessions)");
    expect(processorSource).not.toContain("insert(classroomEvents)");
  });
});
