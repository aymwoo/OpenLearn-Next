// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ClassroomPage from "./page";

const getClassroomConsoleDTO = vi.fn();
const getClassroomSnapshotDTO = vi.fn();
const getClassroomSessionRecapDTO = vi.fn();
const getClassroomStudentDetailDTO = vi.fn();
const classroomConsoleSurface = vi.fn();

vi.mock("@/features/runtime-platform/classroom", () => ({
  getClassroomConsoleDTO: () => getClassroomConsoleDTO(),
  getClassroomSnapshotDTO: (...args: unknown[]) => getClassroomSnapshotDTO(...args),
  getClassroomSessionRecapDTO: (...args: unknown[]) => getClassroomSessionRecapDTO(...args),
  getClassroomStudentDetailDTO: (...args: unknown[]) => getClassroomStudentDetailDTO(...args),
}));

vi.mock("@/components/surfaces/classroom-console-surface", () => ({
  ClassroomConsoleSurface: (props: unknown) => {
    classroomConsoleSurface(props);
    return <div>classroom console surface</div>;
  },
}));

describe("ClassroomPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClassroomSnapshotDTO.mockResolvedValue({ sessionId: "session-live", status: "live" });
    getClassroomSessionRecapDTO.mockResolvedValue({ session: { id: "session-ended" }, detailTab: "steps" });
    getClassroomStudentDetailDTO.mockResolvedValue({ student: { id: "student-1" } });
  });

  it("keeps live snapshot and same-route student detail driven by sessionId", async () => {
    getClassroomConsoleDTO.mockResolvedValue({
      sessionEntries: [
        { id: "session-live", status: "live" },
        { id: "session-ended", status: "ended" },
      ],
    });

    render(
      await ClassroomPage({
        searchParams: Promise.resolve({
          sessionId: "session-live",
          studentId: "student-1",
          detailTab: "evaluation",
        }),
      }),
    );

    expect(screen.getByText("classroom console surface")).toBeTruthy();
    expect(getClassroomSnapshotDTO).toHaveBeenCalledWith({ sessionId: "session-live" });
    expect(getClassroomStudentDetailDTO).toHaveBeenCalledWith({
      sessionId: "session-live",
      studentId: "student-1",
    });
    expect(getClassroomSessionRecapDTO).not.toHaveBeenCalled();
    expect(classroomConsoleSurface).toHaveBeenCalledWith(
      expect.objectContaining({
        initialSnapshot: expect.objectContaining({ sessionId: "session-live" }),
        studentDetail: expect.objectContaining({ student: { id: "student-1" } }),
        activeDetailTab: "evaluation",
      }),
    );
  });

  it("keeps ended-session recap on /classroom and switches by sessionId without leaving the route", async () => {
    getClassroomConsoleDTO.mockResolvedValue({
      sessionEntries: [
        { id: "session-live", status: "live" },
        { id: "session-ended", status: "ended" },
      ],
    });

    render(
      await ClassroomPage({
        searchParams: Promise.resolve({
          sessionId: "session-ended",
          studentId: "student-9",
          stepId: "step-3",
          recapTab: "steps",
        }),
      }),
    );

    expect(getClassroomSessionRecapDTO).toHaveBeenCalledWith({
      sessionId: "session-ended",
      studentId: "student-9",
      stepId: "step-3",
      detailTab: "steps",
    });
    expect(getClassroomSnapshotDTO).not.toHaveBeenCalled();
    expect(getClassroomStudentDetailDTO).not.toHaveBeenCalled();
    expect(classroomConsoleSurface).toHaveBeenCalledWith(
      expect.objectContaining({
        recap: expect.objectContaining({ session: { id: "session-ended" } }),
      }),
    );
  });
});
