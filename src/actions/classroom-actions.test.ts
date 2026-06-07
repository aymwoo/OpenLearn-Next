import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { readFileSync } from "node:fs";

import {
  changeClassroomActiveStep,
  changeClassroomMode,
  changeClassroomSlide,
  endClassroomSession,
  launchClassroomSession,
  recordClassroomEvidence,
  recordClassroomIntervention,
  recordStudentFormativeEvaluation,
  recordStudentQuickResponse,
  refreshClassroomSnapshot,
  submitQuizSampleAnswer,
  updateClassroomParticipantConnection,
} from "@/lib/dal/classroom";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import { cacheTags } from "@/lib/cache-policy";

// Mocks
const mockUpdateTag = vi.fn();
vi.mock("next/cache", () => ({
  updateTag: mockUpdateTag,
}));

const mockLaunchClassroomSession = vi.fn();
const mockChangeClassroomActiveStep = vi.fn();
const mockChangeClassroomMode = vi.fn();
const mockChangeClassroomSlide = vi.fn();
const mockEndClassroomSession = vi.fn();
const mockRecordClassroomEvidence = vi.fn();
const mockRecordClassroomIntervention = vi.fn();
const mockRecordStudentFormativeEvaluation = vi.fn();
const mockRecordStudentQuickResponse = vi.fn();
const mockSubmitQuizSampleAnswer = vi.fn();
const mockRefreshClassroomSnapshot = vi.fn();
const mockRecordRuntimeReady = vi.fn();
const mockUpdateClassroomParticipantConnection = vi.fn();
const mockRecordRuntimeTeacherControl = vi.fn();
const mockRecordClassroomVotingRoundControl = vi.fn();
const actionSource = readFileSync("src/actions/classroom-actions.ts", "utf8");

vi.mock("@/lib/dal/classroom", () => ({
  launchClassroomSession: mockLaunchClassroomSession,
  changeClassroomActiveStep: mockChangeClassroomActiveStep,
  changeClassroomMode: mockChangeClassroomMode,
  changeClassroomSlide: mockChangeClassroomSlide,
  endClassroomSession: mockEndClassroomSession,
  recordClassroomEvidence: mockRecordClassroomEvidence,
  recordClassroomIntervention: mockRecordClassroomIntervention,
  recordStudentFormativeEvaluation: mockRecordStudentFormativeEvaluation,
  recordStudentQuickResponse: mockRecordStudentQuickResponse,
  submitQuizSampleAnswer: mockSubmitQuizSampleAnswer,
  refreshClassroomSnapshot: mockRefreshClassroomSnapshot,
  recordRuntimeReady: mockRecordRuntimeReady,
  recordRuntimeTeacherControl: mockRecordRuntimeTeacherControl,
  recordClassroomVotingRoundControl: mockRecordClassroomVotingRoundControl,
  updateClassroomParticipantConnection: mockUpdateClassroomParticipantConnection,
  QuizSampleAnswerSlotSchema: z.enum(["A", "B", "C", "D"]),
}));

const mockGetCurrentUserDTO = vi.fn();
vi.mock("@/lib/dal/auth", () => ({
  getCurrentUserDTO: mockGetCurrentUserDTO,
}));

describe("classroom-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("launchClassroomSessionAction", () => {
    const validInput = {
      lessonId: "lesson-1",
      publishedVersionId: "version-1",
      classId: "class-1",
    };

    it("returns success with session data on valid input", async () => {
      const mockResult = { sessionId: "session-1", snapshot: {} };
      mockLaunchClassroomSession.mockResolvedValue(mockResult);

      const { launchClassroomSessionAction } = await import("./classroom-actions");
      const result = await launchClassroomSessionAction(validInput);

      expect(result).toEqual({ ok: true, data: mockResult });
      expect(mockLaunchClassroomSession).toHaveBeenCalledWith(validInput);
      expect(mockUpdateTag).toHaveBeenCalledWith(cacheTags.classroom("session-1"));
    });

    it("returns success even if sessionId is missing", async () => {
      const mockResult = { snapshot: {} };
      mockLaunchClassroomSession.mockResolvedValue(mockResult);

      const { launchClassroomSessionAction } = await import("./classroom-actions");
      const result = await launchClassroomSessionAction(validInput);

      expect(result).toEqual({ ok: true, data: mockResult });
      expect(mockUpdateTag).not.toHaveBeenCalled();
    });

    it("returns validation error on invalid input", async () => {
      const { launchClassroomSessionAction } = await import("./classroom-actions");
      const result = await launchClassroomSessionAction({});

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "输入内容不完整，请检查后重试。",
      });
      expect(mockLaunchClassroomSession).not.toHaveBeenCalled();
    });

    it("returns error on DAL exception", async () => {
      mockLaunchClassroomSession.mockRejectedValue(new Error("CLASSROOM_LESSON_NOT_PUBLISHED"));

      const { launchClassroomSessionAction } = await import("./classroom-actions");
      const result = await launchClassroomSessionAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "CLASSROOM_LESSON_NOT_PUBLISHED",
        message: "CLASSROOM_LESSON_NOT_PUBLISHED",
      });
    });
  });

  describe("changeClassroomStepAction", () => {
    const validInput = {
      sessionId: "session-1",
      targetStepId: "step-1",
      expectedVersion: 1,
    };

    it("returns success with result on valid input", async () => {
      const mockResult = { ok: true, sessionId: "session-1" };
      mockChangeClassroomActiveStep.mockResolvedValue(mockResult);

      const { changeClassroomStepAction } = await import("./classroom-actions");
      const result = await changeClassroomStepAction(validInput);

      expect(result).toEqual({ ok: true, data: mockResult });
      expect(mockUpdateTag).toHaveBeenCalledWith(cacheTags.classroom("session-1"));
    });

    it("returns version conflict with latest snapshot", async () => {
      const mockSnapshot = { sessionId: "session-1", version: 2 };
      const mockResult = {
        ok: false,
        error: "VERSION_CONFLICT",
        snapshot: mockSnapshot,
      };
      mockChangeClassroomActiveStep.mockResolvedValue(mockResult);

      const { changeClassroomStepAction } = await import("./classroom-actions");
      const result = await changeClassroomStepAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "VERSION_CONFLICT",
        message: "课堂状态已经被更新。请先恢复最新状态，再继续操作。",
        latest: mockSnapshot,
        attemptedAction: { actionType: "change_step", targetStepId: "step-1" },
      });
    });

    it("returns validation error on invalid input", async () => {
      const { changeClassroomStepAction } = await import("./classroom-actions");
      const result = await changeClassroomStepAction({});

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "输入内容不完整，请检查后重试。",
      });
    });

    it("handles ZodError during execution", async () => {
      mockChangeClassroomActiveStep.mockRejectedValue(new z.ZodError([]));

      const { changeClassroomStepAction } = await import("./classroom-actions");
      const result = await changeClassroomStepAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "输入内容不完整，请检查后重试。",
      });
    });
  });

  describe("changeClassroomModeAction", () => {
    const validInput = {
      sessionId: "session-1",
      locked: true,
      expectedVersion: 1,
    };

    it("returns success with result on valid input", async () => {
      const mockResult = { ok: true, sessionId: "session-1" };
      mockChangeClassroomMode.mockResolvedValue(mockResult);

      const { changeClassroomModeAction } = await import("./classroom-actions");
      const result = await changeClassroomModeAction(validInput);

      expect(result).toEqual({ ok: true, data: mockResult });
      expect(mockUpdateTag).toHaveBeenCalledWith(cacheTags.classroom("session-1"));
    });

    it("returns version conflict on version mismatch", async () => {
      const mockSnapshot = { sessionId: "session-1", version: 2 };
      const mockResult = {
        ok: false,
        error: "VERSION_CONFLICT",
        snapshot: mockSnapshot,
      };
      mockChangeClassroomMode.mockResolvedValue(mockResult);

      const { changeClassroomModeAction } = await import("./classroom-actions");
      const result = await changeClassroomModeAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "VERSION_CONFLICT",
        message: "课堂状态已经被更新。请先恢复最新状态，再继续操作。",
        latest: mockSnapshot,
        attemptedAction: { actionType: "change_mode", targetLocked: true },
      });
    });

    it("returns validation error on invalid input", async () => {
      const { changeClassroomModeAction } = await import("./classroom-actions");
      const result = await changeClassroomModeAction({});

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "输入内容不完整，请检查后重试。",
      });
    });

    it("returns error on DAL exception", async () => {
      mockChangeClassroomMode.mockRejectedValue(new Error("CLASSROOM_ENDED"));

      const { changeClassroomModeAction } = await import("./classroom-actions");
      const result = await changeClassroomModeAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "CLASSROOM_ENDED",
        message: "CLASSROOM_ENDED",
      });
    });
  });

  describe("changeClassroomSlideAction", () => {
    const validInput = {
      sessionId: "session-1",
      stepId: "step-1",
      slideIndex: 0,
      expectedVersion: 1,
    };

    it("returns success with result on valid input", async () => {
      const mockResult = { ok: true, sessionId: "session-1" };
      mockChangeClassroomSlide.mockResolvedValue(mockResult);

      const { changeClassroomSlideAction } = await import("./classroom-actions");
      const result = await changeClassroomSlideAction(validInput);

      expect(result).toEqual({ ok: true, data: mockResult });
      expect(mockUpdateTag).toHaveBeenCalledWith(cacheTags.classroom("session-1"));
    });

    it("returns version conflict on version mismatch", async () => {
      const mockSnapshot = { sessionId: "session-1", version: 2 };
      const mockResult = {
        ok: false,
        error: "VERSION_CONFLICT",
        snapshot: mockSnapshot,
      };
      mockChangeClassroomSlide.mockResolvedValue(mockResult);

      const { changeClassroomSlideAction } = await import("./classroom-actions");
      const result = await changeClassroomSlideAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "VERSION_CONFLICT",
        message: "课堂状态已经被更新。请先恢复最新状态，再继续操作。",
        latest: mockSnapshot,
        attemptedAction: { actionType: "change_slide", targetStepId: "step-1", slideIndex: 0 },
      });
    });

    it("returns validation error on invalid input", async () => {
      const { changeClassroomSlideAction } = await import("./classroom-actions");
      const result = await changeClassroomSlideAction({});

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "输入内容不完整，请检查后重试。",
      });
    });
  });

  describe("refreshClassroomSnapshotAction", () => {
    const validInput = {
      sessionId: "session-1",
    };

    it("returns success with snapshot on valid input", async () => {
      const mockResult = { ok: true, sessionId: "session-1", snapshot: {} };
      mockRefreshClassroomSnapshot.mockResolvedValue(mockResult);

      const { refreshClassroomSnapshotAction } = await import("./classroom-actions");
      const result = await refreshClassroomSnapshotAction(validInput);

      expect(result).toEqual({ ok: true, data: mockResult });
      expect(mockUpdateTag).toHaveBeenCalledWith(cacheTags.classroom("session-1"));
    });

    it("returns validation error on missing sessionId", async () => {
      const { refreshClassroomSnapshotAction } = await import("./classroom-actions");
      const result = await refreshClassroomSnapshotAction({});

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "输入内容不完整，请检查后重试。",
      });
    });

    it("returns error on session ended", async () => {
      mockRefreshClassroomSnapshot.mockRejectedValue(new Error("CLASSROOM_ENDED"));

      const { refreshClassroomSnapshotAction } = await import("./classroom-actions");
      const result = await refreshClassroomSnapshotAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "CLASSROOM_ENDED",
        message: "CLASSROOM_ENDED",
      });
    });
  });

  describe("endClassroomSessionAction", () => {
    const validInput = {
      sessionId: "session-1",
    };

    it("returns success with result on valid input", async () => {
      const mockResult = { ok: true, sessionId: "session-1" };
      mockEndClassroomSession.mockResolvedValue(mockResult);

      const { endClassroomSessionAction } = await import("./classroom-actions");
      const result = await endClassroomSessionAction(validInput);

      expect(result).toEqual({ ok: true, data: mockResult });
      expect(mockUpdateTag).toHaveBeenCalledWith(cacheTags.classroom("session-1"));
    });

    it("returns validation error on missing sessionId", async () => {
      const { endClassroomSessionAction } = await import("./classroom-actions");
      const result = await endClassroomSessionAction({});

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "输入内容不完整，请检查后重试。",
      });
    });

    it("returns error on unauthorized", async () => {
      mockEndClassroomSession.mockRejectedValue(new Error("TEACHER_AUTH_REQUIRED"));

      const { endClassroomSessionAction } = await import("./classroom-actions");
      const result = await endClassroomSessionAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "UNAUTHORIZED",
        message: "您没有权限执行此操作。",
      });
    });

    it("returns generic error on unexpected exception", async () => {
      mockEndClassroomSession.mockRejectedValue(new Error("Some error"));

      const { endClassroomSessionAction } = await import("./classroom-actions");
      const result = await endClassroomSessionAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "Some error",
        message: "Some error",
      });
    });
  });

  describe("touchClassroomPresenceAction", () => {
    const validInput = {
      sessionId: "session-1",
      connectionState: "connected" as const,
      currentStepId: "step-1",
    };

    it("returns success when user is logged in", async () => {
      mockGetCurrentUserDTO.mockResolvedValue({ id: "student-1" });
      mockUpdateClassroomParticipantConnection.mockResolvedValue(undefined);

      const { touchClassroomPresenceAction } = await import("./classroom-actions");
      const result = await touchClassroomPresenceAction(validInput);

      expect(result).toEqual({ ok: true, data: { sessionId: "session-1" } });
      expect(mockUpdateClassroomParticipantConnection).toHaveBeenCalledWith({
        sessionId: "session-1",
        studentId: "student-1",
        connectionState: "connected",
        currentStepId: "step-1",
      });
      expect(mockUpdateTag).toHaveBeenCalledWith(cacheTags.classroom("session-1"));
    });

    it("returns error when user is not logged in", async () => {
      mockGetCurrentUserDTO.mockResolvedValue(null);

      const { touchClassroomPresenceAction } = await import("./classroom-actions");
      const result = await touchClassroomPresenceAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "CLASSROOM_PARTICIPANT_REQUIRED",
        message: "请先登录后再进入课堂。",
      });
      expect(mockUpdateClassroomParticipantConnection).not.toHaveBeenCalled();
    });

    it("handles optional currentStepId", async () => {
      mockGetCurrentUserDTO.mockResolvedValue({ id: "student-1" });
      mockUpdateClassroomParticipantConnection.mockResolvedValue(undefined);

      const { touchClassroomPresenceAction } = await import("./classroom-actions");
      const result = await touchClassroomPresenceAction({
        sessionId: "session-1",
        connectionState: "reconnecting",
      });

      expect(result).toEqual({ ok: true, data: { sessionId: "session-1" } });
      expect(mockUpdateClassroomParticipantConnection).toHaveBeenCalledWith({
        sessionId: "session-1",
        studentId: "student-1",
        connectionState: "reconnecting",
        currentStepId: undefined,
      });
    });

    it("returns validation error on invalid input", async () => {
      const { touchClassroomPresenceAction } = await import("./classroom-actions");
      const result = await touchClassroomPresenceAction({});

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "输入内容不完整，请检查后重试。",
      });
    });
  });

  describe("recordClassroomEvidenceAction", () => {
    const validInput = {
      sessionId: "session-1",
      stepId: "step-1",
      sourceType: "teacher-observation",
      evidenceType: "observation",
      payload: { note: "学生在认真思考" },
    };

    it("returns success with evidence on valid input", async () => {
      const mockResult = { id: "evidence-1", sessionId: "session-1" };
      mockRecordClassroomEvidence.mockResolvedValue(mockResult);

      const { recordClassroomEvidenceAction } = await import("./classroom-actions");
      const result = await recordClassroomEvidenceAction(validInput);

      expect(result).toEqual({ ok: true, data: mockResult });
      expect(mockUpdateTag).toHaveBeenCalledWith(cacheTags.classroom("session-1"));
    });

    it("returns validation error on invalid input", async () => {
      const { recordClassroomEvidenceAction } = await import("./classroom-actions");
      const result = await recordClassroomEvidenceAction({});

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "输入内容不完整，请检查后重试。",
      });
    });

    it("returns unauthorized error for classroom evidence", async () => {
      mockRecordClassroomEvidence.mockRejectedValue(new Error("CLASSROOM_EVIDENCE_UNAUTHORIZED"));

      const { recordClassroomEvidenceAction } = await import("./classroom-actions");
      const result = await recordClassroomEvidenceAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "UNAUTHORIZED",
        message: "您没有权限执行此操作。",
      });
    });

    it("returns generic error on unexpected exception", async () => {
      mockRecordClassroomEvidence.mockRejectedValue(new Error("DATABASE_ERROR"));

      const { recordClassroomEvidenceAction } = await import("./classroom-actions");
      const result = await recordClassroomEvidenceAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "DATABASE_ERROR",
        message: "DATABASE_ERROR",
      });
    });
  });

  describe("recordClassroomInterventionAction", () => {
    const validInput = {
      sessionId: "session-1",
      stepId: "step-1",
      studentId: "student-1",
      title: "提醒学生集中注意力",
      body: "学生走神了",
      targetScope: "student" as const,
    };

    it("returns success with intervention on valid input", async () => {
      const mockResult = { id: "timeline-1", sessionId: "session-1" };
      mockRecordClassroomIntervention.mockResolvedValue(mockResult);

      const { recordClassroomInterventionAction } = await import("./classroom-actions");
      const result = await recordClassroomInterventionAction(validInput);

      expect(result).toEqual({ ok: true, data: mockResult });
      expect(mockUpdateTag).toHaveBeenCalledWith(cacheTags.classroom("session-1"));
    });

    it("returns validation error on invalid input", async () => {
      const { recordClassroomInterventionAction } = await import("./classroom-actions");
      const result = await recordClassroomInterventionAction({});

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "输入内容不完整，请检查后重试。",
      });
    });

    it("returns unauthorized error for intervention", async () => {
      mockRecordClassroomIntervention.mockRejectedValue(new Error("CLASSROOM_INTERVENTION_UNAUTHORIZED"));

      const { recordClassroomInterventionAction } = await import("./classroom-actions");
      const result = await recordClassroomInterventionAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "UNAUTHORIZED",
        message: "您没有权限执行此操作。",
      });
    });
  });

  describe("recordStudentFormativeEvaluationAction", () => {
    const validInput = {
      sessionId: "session-1",
      studentId: "student-1",
      participationLevel: "active" as const,
      tags: ["主动发言"],
      observationNote: "表现积极",
    };

    it("returns success with evaluation on valid input", async () => {
      const mockResult = { id: "evaluation-1", sessionId: "session-1" };
      mockRecordStudentFormativeEvaluation.mockResolvedValue(mockResult);

      const { recordStudentFormativeEvaluationAction } = await import("./classroom-actions");
      const result = await recordStudentFormativeEvaluationAction(validInput);

      expect(result).toEqual({ ok: true, data: mockResult });
      expect(mockUpdateTag).toHaveBeenCalledWith(cacheTags.classroom("session-1"));
    });

    it("returns validation error on invalid input", async () => {
      const { recordStudentFormativeEvaluationAction } = await import("./classroom-actions");
      const result = await recordStudentFormativeEvaluationAction({});

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "输入内容不完整，请检查后重试。",
      });
    });

    it("returns unauthorized error for teacher auth", async () => {
      mockRecordStudentFormativeEvaluation.mockRejectedValue(new Error("TEACHER_AUTH_REQUIRED"));

      const { recordStudentFormativeEvaluationAction } = await import("./classroom-actions");
      const result = await recordStudentFormativeEvaluationAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "UNAUTHORIZED",
        message: "您没有权限执行此操作。",
      });
    });

    it("returns custom error message on DAL failure", async () => {
      mockRecordStudentFormativeEvaluation.mockRejectedValue(new Error("DATABASE_ERROR"));

      const { recordStudentFormativeEvaluationAction } = await import("./classroom-actions");
      const result = await recordStudentFormativeEvaluationAction(validInput);

      // Note: handleClassroomActionError uses error.message for generic errors
      expect(result).toEqual({
        ok: false,
        error: "DATABASE_ERROR",
        message: "DATABASE_ERROR",
      });
    });
  });

  describe("submitStudentQuickResponseAction", () => {
    const validInput = {
      sessionId: "session-1",
      lessonId: "lesson-1",
      stepId: "step-1",
      sourceType: "student-quick-response" as const,
      evidenceType: "response" as const,
      body: "我的回答是...",
    };

    it("returns success with response and invalidates multiple cache tags", async () => {
      const mockResult = { id: "response-1", sessionId: "session-1", studentId: "student-1" };
      mockRecordStudentQuickResponse.mockResolvedValue(mockResult);

      const { submitStudentQuickResponseAction } = await import("./classroom-actions");
      const result = await submitStudentQuickResponseAction(validInput);

      expect(result).toEqual({ ok: true, data: mockResult });
      expect(mockUpdateTag).toHaveBeenCalledWith(cacheTags.classroom("session-1"));
      expect(mockUpdateTag).toHaveBeenCalledWith(cacheTags.progress("lesson-1", "student-1"));
      expect(mockUpdateTag).toHaveBeenCalledWith(cacheTags.submission("lesson-1", "student-1"));
    });

    it("returns validation error on invalid input", async () => {
      const { submitStudentQuickResponseAction } = await import("./classroom-actions");
      const result = await submitStudentQuickResponseAction({});

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "输入内容不完整，请检查后重试。",
      });
    });

    it("returns error on unexpected exception", async () => {
      mockRecordStudentQuickResponse.mockRejectedValue(new Error("DATABASE_ERROR"));

      const { submitStudentQuickResponseAction } = await import("./classroom-actions");
      const result = await submitStudentQuickResponseAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "DATABASE_ERROR",
        message: "DATABASE_ERROR",
      });
    });
  });

  describe("FormData normalization", () => {
    it("handles FormData input for launchClassroomSessionAction", async () => {
      const mockResult = { sessionId: "session-1" };
      mockLaunchClassroomSession.mockResolvedValue(mockResult);

      const formData = new FormData();
      formData.append("lessonId", "lesson-1");
      formData.append("publishedVersionId", "version-1");
      formData.append("classId", "class-1");

      const { launchClassroomSessionAction } = await import("./classroom-actions");
      const result = await launchClassroomSessionAction(formData);

      expect(result).toEqual({ ok: true, data: mockResult });
      expect(mockLaunchClassroomSession).toHaveBeenCalledWith({
        lessonId: "lesson-1",
        publishedVersionId: "version-1",
        classId: "class-1",
      });
    });

    it("coerces step control FormData fields before validation", async () => {
      mockChangeClassroomActiveStep.mockResolvedValue({ ok: true, sessionId: "session-1" });

      const formData = new FormData();
      formData.append("sessionId", "session-1");
      formData.append("targetStepId", "step-1");
      formData.append("expectedVersion", "1");

      const { changeClassroomStepAction } = await import("./classroom-actions");
      const result = await changeClassroomStepAction(formData);

      expect(result).toEqual({ ok: true, data: { ok: true, sessionId: "session-1" } });
      expect(mockChangeClassroomActiveStep).toHaveBeenCalledWith({
        sessionId: "session-1",
        targetStepId: "step-1",
        expectedVersion: 1,
      });
    });

    it("coerces mode control FormData fields before validation", async () => {
      mockChangeClassroomMode.mockResolvedValue({ ok: true, sessionId: "session-1" });

      const formData = new FormData();
      formData.append("sessionId", "session-1");
      formData.append("locked", "true");
      formData.append("expectedVersion", "1");

      const { changeClassroomModeAction } = await import("./classroom-actions");
      const result = await changeClassroomModeAction(formData);

      expect(result).toEqual({ ok: true, data: { ok: true, sessionId: "session-1" } });
      expect(mockChangeClassroomMode).toHaveBeenCalledWith({
        sessionId: "session-1",
        locked: true,
        expectedVersion: 1,
      });
    });

    it("coerces slide control FormData fields before validation", async () => {
      mockChangeClassroomSlide.mockResolvedValue({ ok: true, sessionId: "session-1" });

      const formData = new FormData();
      formData.append("sessionId", "session-1");
      formData.append("stepId", "step-1");
      formData.append("slideIndex", "0");
      formData.append("expectedVersion", "1");

      const { changeClassroomSlideAction } = await import("./classroom-actions");
      const result = await changeClassroomSlideAction(formData);

      expect(result).toEqual({ ok: true, data: { ok: true, sessionId: "session-1" } });
      expect(mockChangeClassroomSlide).toHaveBeenCalledWith({
        sessionId: "session-1",
        stepId: "step-1",
        slideIndex: 0,
        expectedVersion: 1,
      });
    });
  });

  describe("runtime action boundaries", () => {
    it("exposes runtime bootstrap save submit interaction and teacher-control actions", () => {
      expect(actionSource).toContain("bootstrapRuntimeSessionAction");
      expect(actionSource).toContain("recordRuntimeReadyAction");
      expect(actionSource).toContain("recordRuntimeInteractionAction");
      expect(actionSource).toContain("saveRuntimeStateAction");
      expect(actionSource).toContain("submitRuntimeStateAction");
      expect(actionSource).toContain("recordRuntimeTeacherControlAction");
    });

    it("refreshes classroom and downstream truth tags for runtime submit", () => {
      expect(actionSource).toContain("updateTag(cacheTags.classroom(parsed.data.payload.classroomSessionId))");
      expect(actionSource).toContain("updateTag(cacheTags.progress(result.lessonId, result.actorId))");
      expect(actionSource).toContain("updateTag(cacheTags.submission(result.lessonId, result.actorId))");
      expect(actionSource).toContain("updateTag(cacheTags.teacherReview(result.lessonId))");
    });

    it("dispatches current-round recovery actions through runtime teacher control and invalidates classroom tags", async () => {
      mockRecordRuntimeTeacherControl.mockResolvedValue({ sessionId: "session-1", applied: true });

      const { runCurrentVotingRecoveryAction } = await import("./classroom-actions");
      const result = await runCurrentVotingRecoveryAction({
        sessionId: "session-1",
        stepId: "step-1",
        recoveryAction: "retry",
      });

      expect(result).toEqual({ ok: true, data: { sessionId: "session-1", applied: true } });
      expect(mockRecordRuntimeTeacherControl).toHaveBeenCalledWith(expect.objectContaining({
        kind: "runtime-teacher-control",
        payload: expect.objectContaining({
          classroomSessionId: "session-1",
          stepId: "step-1",
          command: "broadcast-preset",
          payload: expect.objectContaining({
            recoveryAction: "retry",
          }),
        }),
      }));
      expect(mockUpdateTag).toHaveBeenCalledWith(cacheTags.classroom("session-1"));
    });

    it("exposes dedicated quiz sample submit action and invalidates governed truth tags", async () => {
      mockSubmitQuizSampleAnswer.mockResolvedValue({
        questionId: "step-1",
        questionType: "single_choice",
        studentId: "student-1",
        selectedOption: "B",
        attemptNo: 2,
        successMessage: "答案已更新",
      });

      const { submitQuizSampleAnswerAction } = await import("./classroom-actions");
      const result = await submitQuizSampleAnswerAction({
        lessonId: "lesson-1",
        sessionId: "session-1",
        stepId: "step-1",
        questionType: "single_choice",
        selectedOption: "B",
      });

      expect(result).toEqual({
        ok: true,
        data: {
          questionId: "step-1",
          questionType: "single_choice",
          studentId: "student-1",
          selectedOption: "B",
          attemptNo: 2,
          successMessage: "答案已更新",
        },
      });
      expect(mockSubmitQuizSampleAnswer).toHaveBeenCalledWith({
        lessonId: "lesson-1",
        sessionId: "session-1",
        questionType: "single_choice",
        stepId: "step-1",
        selectedOption: "B",
      });
      expect(mockUpdateTag).toHaveBeenCalledWith(cacheTags.classroom("session-1"));
      expect(mockUpdateTag).toHaveBeenCalledWith(cacheTags.progress("lesson-1", "student-1"));
      expect(mockUpdateTag).toHaveBeenCalledWith(cacheTags.submission("lesson-1", "student-1"));
      expect(mockUpdateTag).toHaveBeenCalledWith(cacheTags.teacherReview("lesson-1"));
      expect(mockUpdateTag).toHaveBeenCalledWith(cacheTags.quizStats("session-1"));
    });

    it("rejects invalid quiz sample submit payloads before reaching DAL", async () => {
      const { submitQuizSampleAnswerAction } = await import("./classroom-actions");
      const result = await submitQuizSampleAnswerAction({
        lessonId: "lesson-1",
        sessionId: "session-1",
        stepId: "step-1",
      });

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "输入内容不完整，请检查后重试。",
      });
      expect(mockSubmitQuizSampleAnswer).not.toHaveBeenCalled();
    });

    it("keeps quiz sample submit on dedicated governed boundary instead of runtime submit bridge", () => {
      expect(actionSource).toContain("submitQuizSampleAnswerAction");
      expect(actionSource).toContain("submitQuizSampleAnswer(parsed.data)");
      expect(actionSource).toContain("updateTag(cacheTags.teacherReview(parsed.data.lessonId))");
      expect(actionSource).toContain("updateTag(cacheTags.quizStats(parsed.data.sessionId))");
    });
  });
});
