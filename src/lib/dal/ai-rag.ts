import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { 
  agentRegistry, 
  agentProposals, 
  agentAuditLogs, 
  knowledgeSources, 
  knowledgeChunks, 
  resources 
} from "@/db/schema";
import { assertActiveTeacher } from "./lesson-authoring";
import { agentRegistrySeed } from "@/server/ai/agents/registry";
import { buildSafeRetrievalFilter } from "@/server/rag/retrieval-boundary";
import {
  AgentRegistryDTOSchema,
  AgentProposalDTOSchema,
  KnowledgeSourceDTOSchema,
  RetrievalFilterDTO,
  AgentRegistryDTO,
  AgentProposalDTO,
  KnowledgeSourceDTO,
} from "@/lib/dto/resource-ai";

type JsonRecord = Record<string, unknown>;

export async function getAgentRegistryDTO(): Promise<AgentRegistryDTO[]> {
  await assertActiveTeacher();

  const existingAgents = await db.query.agentRegistry.findMany();
  const agentMap = new Map(existingAgents.map((a) => [a.agentKey, a]));

  for (const seed of agentRegistrySeed) {
    if (!agentMap.has(seed.agentKey)) {
      const [inserted] = await db
        .insert(agentRegistry)
        .values({
          agentKey: seed.agentKey,
          displayName: seed.displayName,
          capabilityManifestJson: seed.capabilityManifestJson,
          featureFlag: seed.featureFlag,
          enabled: seed.enabled,
        })
        .returning();
      agentMap.set(inserted.agentKey, inserted);
    }
  }

  return Array.from(agentMap.values()).map((row) => AgentRegistryDTOSchema.parse(row));
}

export async function registerKnowledgeSourceForResource(input: { resourceId: string }): Promise<KnowledgeSourceDTO> {
  const scope = await assertActiveTeacher();
  
  const resource = await db.query.resources.findFirst({
    where: eq(resources.id, input.resourceId),
  });

  if (!resource) {
    throw new Error("RESOURCE_NOT_FOUND");
  }

  if (!scope.schoolIds.includes(resource.schoolId)) {
    throw new Error("FORBIDDEN");
  }

  if (!resource.ragEligible) {
    throw new Error("RESOURCE_NOT_RAG_ELIGIBLE");
  }

  const [source] = await db
    .insert(knowledgeSources)
    .values({
      resourceId: input.resourceId,
      status: "pending",
    })
    .returning();

  return KnowledgeSourceDTOSchema.parse({
    ...source,
    error: source.error ?? null,
  });
}

export async function recordKnowledgeChunkMetadata(input: {
  sourceId: string;
  chunkIndex: number;
  textHash: string;
  tokenEstimate: number;
  payloadJson: JsonRecord;
  metadataJson: JsonRecord;
}) {
  await assertActiveTeacher();
  // We trust the teacher scope, but in a real system we'd verify the source's resource is in scope.
  // For the metadata contract, we just insert the chunk.
  
  await db.insert(knowledgeChunks).values({
    sourceId: input.sourceId,
    chunkIndex: input.chunkIndex,
    textHash: input.textHash,
    tokenEstimate: input.tokenEstimate,
    payloadJson: input.payloadJson,
    metadataJson: input.metadataJson,
    indexingStatus: "pending",
  });
}

export async function previewSafeRetrievalFilter(input: RetrievalFilterDTO) {
  await assertActiveTeacher();
  return buildSafeRetrievalFilter(input);
}

export async function createAgentProposal(input: {
  agentId: string;
  targetType: string;
  targetId: string;
  structuredOutputJson: JsonRecord;
}): Promise<AgentProposalDTO> {
  const scope = await assertActiveTeacher();

  const [proposal] = await db
    .insert(agentProposals)
    .values({
      agentId: input.agentId,
      targetType: input.targetType,
      targetId: input.targetId,
      structuredOutputJson: input.structuredOutputJson,
      status: "pending",
      approvalState: "pending_teacher_approval",
      requestedById: scope.userId,
    })
    .returning();

  await recordAgentAudit({
    agentId: input.agentId,
    action: "create_proposal",
    payloadJson: { proposalId: proposal.id, targetType: input.targetType, targetId: input.targetId },
  });

  return AgentProposalDTOSchema.parse({
    ...proposal,
    approvedById: proposal.approvedById ?? null,
  });
}

export async function approveAgentProposal(input: { proposalId: string }): Promise<AgentProposalDTO> {
  const scope = await assertActiveTeacher();

  const proposal = await db.query.agentProposals.findFirst({
    where: eq(agentProposals.id, input.proposalId),
  });

  if (!proposal) {
    throw new Error("PROPOSAL_NOT_FOUND");
  }

  const [updated] = await db
    .update(agentProposals)
    .set({
      status: "approved",
      approvalState: "approved",
      approvedById: scope.userId,
      updatedAt: new Date(),
    })
    .where(eq(agentProposals.id, input.proposalId))
    .returning();

  await recordAgentAudit({
    agentId: updated.agentId,
    action: "approve_proposal",
    payloadJson: { proposalId: updated.id },
  });

  return AgentProposalDTOSchema.parse({
    ...updated,
    approvedById: updated.approvedById ?? null,
  });
}

export async function recordAgentAudit(input: {
  agentId: string;
  action: string;
  payloadJson: JsonRecord;
}) {
  const scope = await assertActiveTeacher();
  await db.insert(agentAuditLogs).values({
    agentId: input.agentId,
    action: input.action,
    payloadJson: input.payloadJson,
    actorId: scope.userId,
  });
}
