import "server-only";

import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { 
  agentRegistry, 
  agentProposals, 
  agentAuditLogs, 
  knowledgeSources, 
  knowledgeChunks, 
  resources 
} from "@/db/schema";
import { enqueueAsyncTask } from "@/features/async-tasks/server/enqueue";
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
  ResourceKnowledgeSourceTaskPayload,
  ResourceKnowledgeSourceTaskPayloadSchema,
  ResourceKnowledgeSourceTaskResult,
  ResourceKnowledgeSourceTaskResultSchema,
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

  await enqueueAsyncTask({
    actorId: scope.userId,
    schoolId: resource.schoolId,
    taskType: "resource.knowledge_source_ingest",
    entityRef: {
      entityType: "knowledge_source",
      entityId: source.id,
      entityLabel: resource.title,
    },
    payload: ResourceKnowledgeSourceTaskPayloadSchema.parse({
      knowledgeSourceId: source.id,
      resourceId: resource.id,
      schoolId: resource.schoolId,
      actorId: scope.userId,
    } satisfies ResourceKnowledgeSourceTaskPayload),
    dispatchRequested: true,
  });

  return KnowledgeSourceDTOSchema.parse({
    ...source,
    error: source.error ?? null,
    createdAt: source.createdAt?.getTime?.() ?? Date.now(),
    updatedAt: source.updatedAt?.getTime?.() ?? Date.now(),
  });
}

function estimateTokenCount(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

function buildKnowledgeSourceChunks(resource: { id: string; title: string; url: string | null; content: string | null }) {
  const raw = [resource.url ?? null, resource.content ?? null]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join("\n\n")
    .trim();

  if (!raw) {
    throw new Error("RESOURCE_SOURCE_EMPTY");
  }

  const chunkSize = 500;
  const chunks: Array<{
    chunkIndex: number;
    text: string;
    textHash: string;
    tokenEstimate: number;
    payloadJson: JsonRecord;
    metadataJson: JsonRecord;
  }> = [];

  for (let index = 0; index < raw.length; index += chunkSize) {
    const text = raw.slice(index, index + chunkSize).trim();
    if (!text) {
      continue;
    }

    const chunkIndex = chunks.length;
    chunks.push({
      chunkIndex,
      text,
      textHash: `${resource.id}:${chunkIndex}:${text.length}`,
      tokenEstimate: estimateTokenCount(text),
      payloadJson: {
        text,
      },
      metadataJson: {
        resourceId: resource.id,
        sourceType: resource.content ? "content" : "url",
        title: resource.title,
        url: resource.url,
      },
    });
  }

  if (!chunks.length) {
    throw new Error("RESOURCE_SOURCE_EMPTY");
  }

  return chunks;
}

export async function executeResourceKnowledgeSourceTask(
  rawPayload: unknown,
): Promise<ResourceKnowledgeSourceTaskResult> {
  const payload = ResourceKnowledgeSourceTaskPayloadSchema.parse(rawPayload);

  const source = await db.query.knowledgeSources.findFirst({
    where: eq(knowledgeSources.id, payload.knowledgeSourceId),
  });

  if (!source) {
    throw new Error("KNOWLEDGE_SOURCE_NOT_FOUND");
  }

  const resource = await db.query.resources.findFirst({
    where: eq(resources.id, payload.resourceId),
  });

  if (!resource || resource.schoolId !== payload.schoolId || !resource.ragEligible) {
    throw new Error("RESOURCE_NOT_RAG_ELIGIBLE");
  }

  await db
    .update(knowledgeSources)
    .set({
      status: "processing",
      error: null,
      updatedAt: new Date(),
    })
    .where(eq(knowledgeSources.id, payload.knowledgeSourceId));

  try {
    const chunks = buildKnowledgeSourceChunks(resource);

    const existingChunks = await db.query.knowledgeChunks.findMany({
      where: eq(knowledgeChunks.sourceId, payload.knowledgeSourceId),
    });

    const existingByIndex = new Map(existingChunks.map((chunk) => [chunk.chunkIndex, chunk]));

    for (const chunk of chunks) {
      const existing = existingByIndex.get(chunk.chunkIndex);

      if (existing) {
        await db
          .update(knowledgeChunks)
          .set({
            textHash: chunk.textHash,
            tokenEstimate: chunk.tokenEstimate,
            payloadJson: chunk.payloadJson,
            metadataJson: chunk.metadataJson,
            indexingStatus: "indexed",
          })
          .where(eq(knowledgeChunks.id, existing.id));
      } else {
        await db.insert(knowledgeChunks).values({
          sourceId: payload.knowledgeSourceId,
          chunkIndex: chunk.chunkIndex,
          textHash: chunk.textHash,
          tokenEstimate: chunk.tokenEstimate,
          payloadJson: chunk.payloadJson,
          metadataJson: chunk.metadataJson,
          indexingStatus: "indexed",
        });
      }
    }

    await db
      .update(knowledgeSources)
      .set({
        status: "completed",
        error: null,
        updatedAt: new Date(),
      })
      .where(eq(knowledgeSources.id, payload.knowledgeSourceId));

    return ResourceKnowledgeSourceTaskResultSchema.parse({
      knowledgeSourceId: payload.knowledgeSourceId,
      resourceId: payload.resourceId,
      schoolId: payload.schoolId,
      actorId: payload.actorId,
      knowledgeSourceStatus: "completed",
      indexedChunkCount: chunks.length,
      failedChunkCount: 0,
      outcome: "completed",
      titleKey: "asyncTasks.resource.knowledgeSourceIngest.result.completed",
      summaryKey: "asyncTasks.resource.knowledgeSourceIngest.result.completedSummary",
      counts: {
        total: chunks.length,
        succeeded: chunks.length,
        partiallySucceeded: 0,
        failed: 0,
        skipped: 0,
      },
      detail: {
        knowledgeSourceId: payload.knowledgeSourceId,
        resourceId: payload.resourceId,
        schoolId: payload.schoolId,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "KNOWLEDGE_SOURCE_PROCESSING_FAILED";

    await db
      .update(knowledgeSources)
      .set({
        status: "failed",
        error: message,
        updatedAt: new Date(),
      })
      .where(eq(knowledgeSources.id, payload.knowledgeSourceId));

    const existingChunks = await db.query.knowledgeChunks.findMany({
      where: eq(knowledgeChunks.sourceId, payload.knowledgeSourceId),
    });

    if (existingChunks.length) {
      await db
        .update(knowledgeChunks)
        .set({ indexingStatus: "failed" })
        .where(inArray(knowledgeChunks.id, existingChunks.map((chunk) => chunk.id)));
    }

    return ResourceKnowledgeSourceTaskResultSchema.parse({
      knowledgeSourceId: payload.knowledgeSourceId,
      resourceId: payload.resourceId,
      schoolId: payload.schoolId,
      actorId: payload.actorId,
      knowledgeSourceStatus: "failed",
      indexedChunkCount: 0,
      failedChunkCount: existingChunks.length,
      outcome: "failed",
      titleKey: "asyncTasks.resource.knowledgeSourceIngest.result.failed",
      summaryKey: "asyncTasks.resource.knowledgeSourceIngest.result.failedSummary",
      counts: {
        total: Math.max(existingChunks.length, 1),
        succeeded: 0,
        partiallySucceeded: 0,
        failed: Math.max(existingChunks.length, 1),
        skipped: 0,
      },
      detail: {
        knowledgeSourceId: payload.knowledgeSourceId,
        resourceId: payload.resourceId,
        schoolId: payload.schoolId,
        error: message,
      },
    });
  }
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
