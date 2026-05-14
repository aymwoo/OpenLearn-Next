import { beforeEach, describe, expect, it, vi } from "vitest";

const updateTag = vi.fn();

const mockAIRagDAL = vi.hoisted(() => ({
  createAgentProposal: vi.fn(),
  approveAgentProposal: vi.fn(),
  registerKnowledgeSourceForResource: vi.fn(),
  previewSafeRetrievalFilter: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  updateTag,
}));

vi.mock("@/lib/dal/ai-rag", () => mockAIRagDAL);

describe("ai-rag-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createAgentProposalAction — Zod validation", () => {
    it("returns error when agentId is missing", async () => {
      const { createAgentProposalAction } = await import("./ai-rag-actions");

      // @ts-expect-error — intentionally invalid input
      const result = await createAgentProposalAction({
        targetType: "lesson",
        targetId: "lesson-1",
        structuredOutputJson: {},
      });

      expect(result).toMatchObject({ ok: false, error: "AI 提案信息不完整，请检查后再提交。" });
    });

    it("returns error when targetType is empty string", async () => {
      const { createAgentProposalAction } = await import("./ai-rag-actions");

      const result = await createAgentProposalAction({
        agentId: "agent-1",
        targetType: "",
        targetId: "lesson-1",
        structuredOutputJson: {},
      });

      expect(result).toMatchObject({ ok: false });
    });

    it("returns error when targetId is missing", async () => {
      const { createAgentProposalAction } = await import("./ai-rag-actions");

      // @ts-expect-error — intentionally invalid input
      const result = await createAgentProposalAction({
        agentId: "agent-1",
        targetType: "lesson",
        structuredOutputJson: {},
      });

      expect(result).toMatchObject({ ok: false });
    });

    it("accepts valid input and creates proposal", async () => {
      const { createAgentProposalAction } = await import("./ai-rag-actions");

      mockAIRagDAL.createAgentProposal.mockResolvedValueOnce({
        id: "proposal-1",
        agentId: "agent-1",
        targetType: "lesson",
        targetId: "lesson-1",
        structuredOutputJson: { summary: "Test" },
        status: "pending",
        approvalState: "pending_teacher_approval",
        requestedById: "user-1",
        approvedById: null,
      });

      const result = await createAgentProposalAction({
        agentId: "agent-1",
        targetType: "lesson",
        targetId: "lesson-1",
        structuredOutputJson: { summary: "Test" },
      });

      expect(result).toMatchObject({ ok: true, data: expect.objectContaining({ id: "proposal-1" }) });
      expect(updateTag).toHaveBeenCalledWith("ai:agent-registry");
      expect(updateTag).toHaveBeenCalledWith("ai:proposal:proposal-1");
    });

    it("returns generic error on DAL failure", async () => {
      const { createAgentProposalAction } = await import("./ai-rag-actions");

      mockAIRagDAL.createAgentProposal.mockRejectedValueOnce(new Error("DB_ERROR"));

      const result = await createAgentProposalAction({
        agentId: "agent-1",
        targetType: "lesson",
        targetId: "lesson-1",
        structuredOutputJson: {},
      });

      expect(result).toMatchObject({ ok: false, error: "AI/RAG 合同操作失败，请重试。" });
    });
  });

  describe("approveAgentProposalAction — Zod validation", () => {
    it("returns error when proposalId is missing", async () => {
      const { approveAgentProposalAction } = await import("./ai-rag-actions");

      // @ts-expect-error — intentionally invalid input
      const result = await approveAgentProposalAction({});

      expect(result).toMatchObject({ ok: false });
    });

    it("returns error when proposalId is empty string", async () => {
      const { approveAgentProposalAction } = await import("./ai-rag-actions");

      const result = await approveAgentProposalAction({ proposalId: "" });

      expect(result).toMatchObject({ ok: false });
    });

    it("approves proposal on valid input", async () => {
      const { approveAgentProposalAction } = await import("./ai-rag-actions");

      mockAIRagDAL.approveAgentProposal.mockResolvedValueOnce({
        id: "proposal-1",
        agentId: "agent-1",
        targetType: "lesson",
        targetId: "lesson-1",
        structuredOutputJson: {},
        status: "approved",
        approvalState: "approved",
        requestedById: "user-1",
        approvedById: "user-1",
      });

      const result = await approveAgentProposalAction({ proposalId: "proposal-1" });

      expect(result).toMatchObject({ ok: true });
      expect(updateTag).toHaveBeenCalledWith("ai:agent-registry");
    });

    it("returns generic error on DAL failure", async () => {
      const { approveAgentProposalAction } = await import("./ai-rag-actions");

      mockAIRagDAL.approveAgentProposal.mockRejectedValueOnce(new Error("PROPOSAL_NOT_FOUND"));

      const result = await approveAgentProposalAction({ proposalId: "proposal-1" });

      expect(result).toMatchObject({ ok: false, error: "AI/RAG 合同操作失败，请重试。" });
    });
  });

  describe("registerKnowledgeSourceAction — Zod validation", () => {
    it("returns error when resourceId is missing", async () => {
      const { registerKnowledgeSourceAction } = await import("./ai-rag-actions");

      // @ts-expect-error — intentionally invalid input
      const result = await registerKnowledgeSourceAction({});

      expect(result).toMatchObject({ ok: false });
    });

    it("returns error when resourceId is empty string", async () => {
      const { registerKnowledgeSourceAction } = await import("./ai-rag-actions");

      const result = await registerKnowledgeSourceAction({ resourceId: "" });

      expect(result).toMatchObject({ ok: false });
    });

    it("registers knowledge source on valid input", async () => {
      const { registerKnowledgeSourceAction } = await import("./ai-rag-actions");

      mockAIRagDAL.registerKnowledgeSourceForResource.mockResolvedValueOnce({
        id: "source-1",
        resourceId: "resource-1",
        status: "pending",
        error: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await registerKnowledgeSourceAction({ resourceId: "resource-1" });

      expect(result).toMatchObject({ ok: true, data: expect.objectContaining({ id: "source-1" }) });
    });

    it("returns generic error on DAL failure", async () => {
      const { registerKnowledgeSourceAction } = await import("./ai-rag-actions");

      mockAIRagDAL.registerKnowledgeSourceForResource.mockRejectedValueOnce(new Error("RESOURCE_NOT_FOUND"));

      const result = await registerKnowledgeSourceAction({ resourceId: "resource-1" });

      expect(result).toMatchObject({ ok: false, error: "AI/RAG 合同操作失败，请重试。" });
    });
  });

  describe("previewRetrievalFilterAction — Zod validation", () => {
    it("returns error when schoolId is missing", async () => {
      const { previewRetrievalFilterAction } = await import("./ai-rag-actions");

      // @ts-expect-error — intentionally invalid input
      const result = await previewRetrievalFilterAction({ courseId: "course-1" });

      expect(result).toMatchObject({ ok: false });
    });

    it("accepts minimal filter with only schoolId", async () => {
      const { previewRetrievalFilterAction } = await import("./ai-rag-actions");

      mockAIRagDAL.previewSafeRetrievalFilter.mockResolvedValueOnce({ schoolId: "school-1" });

      const result = await previewRetrievalFilterAction({ schoolId: "school-1" });

      expect(result).toMatchObject({ ok: true, data: { schoolId: "school-1" } });
    });

    it("accepts filter with optional courseId", async () => {
      const { previewRetrievalFilterAction } = await import("./ai-rag-actions");

      mockAIRagDAL.previewSafeRetrievalFilter.mockResolvedValueOnce({ schoolId: "school-1", courseId: "course-1" });

      const result = await previewRetrievalFilterAction({ schoolId: "school-1", courseId: "course-1" });

      expect(result).toMatchObject({ ok: true });
    });

    it("accepts filter with all optional fields", async () => {
      const { previewRetrievalFilterAction } = await import("./ai-rag-actions");

      mockAIRagDAL.previewSafeRetrievalFilter.mockResolvedValueOnce({
        schoolId: "school-1",
        courseId: "course-1",
        visibility: "school",
        resourceId: "resource-1",
        grade: "G1",
        subject: "Math",
      });

      const result = await previewRetrievalFilterAction({
        schoolId: "school-1",
        courseId: "course-1",
        visibility: "school",
        resourceId: "resource-1",
        grade: "G1",
        subject: "Math",
      });

      expect(result).toMatchObject({ ok: true });
    });

    it("returns generic error on DAL failure", async () => {
      const { previewRetrievalFilterAction } = await import("./ai-rag-actions");

      mockAIRagDAL.previewSafeRetrievalFilter.mockRejectedValueOnce(new Error("FILTER_BUILD_FAILED"));

      const result = await previewRetrievalFilterAction({ schoolId: "school-1" });

      expect(result).toMatchObject({ ok: false, error: "AI/RAG 合同操作失败，请重试。" });
    });
  });
});