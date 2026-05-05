"use server";

import { z } from "zod";
import { updateTag } from "next/cache";
import {
  createAgentProposal,
  approveAgentProposal,
  registerKnowledgeSourceForResource,
  previewSafeRetrievalFilter,
} from "@/lib/dal/ai-rag";
import { RetrievalFilterDTOSchema } from "@/lib/dto/resource-ai";
import { cacheTags } from "@/lib/cache-policy";

const CreateProposalInputSchema = z.object({
  agentId: z.string().min(1),
  targetType: z.string().min(1),
  targetId: z.string().min(1),
  structuredOutputJson: z.record(z.string(), z.any()),
});

export async function createAgentProposalAction(input: z.infer<typeof CreateProposalInputSchema>) {
  const parsed = CreateProposalInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "AI 提案信息不完整，请检查后再提交。" };
  }

  try {
    const proposal = await createAgentProposal(parsed.data);
    updateTag(cacheTags.agentRegistry);
    updateTag(cacheTags.agentProposal(proposal.id));
    return { ok: true, data: proposal };
  } catch (error) {
    console.error("createAgentProposalAction error:", error);
    return { ok: false, error: "AI/RAG 合同操作失败，请重试。" };
  }
}

const ApproveProposalInputSchema = z.object({
  proposalId: z.string().min(1),
});

export async function approveAgentProposalAction(input: z.infer<typeof ApproveProposalInputSchema>) {
  const parsed = ApproveProposalInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "AI 提案信息不完整，请检查后再提交。" };
  }

  try {
    const proposal = await approveAgentProposal(parsed.data);
    updateTag(cacheTags.agentRegistry);
    updateTag(cacheTags.agentProposal(proposal.id));
    return { ok: true, data: proposal };
  } catch (error) {
    console.error("approveAgentProposalAction error:", error);
    return { ok: false, error: "AI/RAG 合同操作失败，请重试。" };
  }
}

const RegisterKnowledgeSourceInputSchema = z.object({
  resourceId: z.string().min(1),
});

export async function registerKnowledgeSourceAction(input: z.infer<typeof RegisterKnowledgeSourceInputSchema>) {
  const parsed = RegisterKnowledgeSourceInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "AI 提案信息不完整，请检查后再提交。" };
  }

  try {
    const source = await registerKnowledgeSourceForResource(parsed.data);
    return { ok: true, data: source };
  } catch (error) {
    console.error("registerKnowledgeSourceAction error:", error);
    return { ok: false, error: "AI/RAG 合同操作失败，请重试。" };
  }
}

export async function previewRetrievalFilterAction(input: z.infer<typeof RetrievalFilterDTOSchema>) {
  const parsed = RetrievalFilterDTOSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "AI 提案信息不完整，请检查后再提交。" };
  }

  try {
    const filter = await previewSafeRetrievalFilter(parsed.data);
    return { ok: true, data: filter };
  } catch (error) {
    console.error("previewRetrievalFilterAction error:", error);
    return { ok: false, error: "AI/RAG 合同操作失败，请重试。" };
  }
}
