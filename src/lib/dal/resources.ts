import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { courses, knowledgeChunks, knowledgeSources, resources } from "@/db/schema";
import { assertActiveTeacher } from "./lesson-authoring";
import {
  ResourceCardDTOSchema,
  ResourceCardDTO,
  CreateResourceInput,
  UpdateResourceInput,
} from "../dto/resource-ai";

type ResourceUpdatePatch = Partial<typeof resources.$inferInsert>;

export async function getTeacherResourceLibraryDTO(): Promise<ResourceCardDTO[]> {
  const scope = await assertActiveTeacher();

  const resourceRows = await db.query.resources.findMany({
    where: inArray(resources.schoolId, scope.schoolIds),
    orderBy: (resource, { desc }) => [desc(resource.createdAt)],
  });

  const sourceRows = resourceRows.length
    ? await db.query.knowledgeSources.findMany({
        where: inArray(
          knowledgeSources.resourceId,
          resourceRows.map((row) => row.id),
        ),
        orderBy: (source, { desc }) => [desc(source.updatedAt), desc(source.createdAt)],
      })
    : [];

  const latestSourceByResourceId = new Map<string, (typeof sourceRows)[number]>();
  for (const source of sourceRows) {
    if (!latestSourceByResourceId.has(source.resourceId)) {
      latestSourceByResourceId.set(source.resourceId, source);
    }
  }

  const latestSourceIds = Array.from(latestSourceByResourceId.values()).map((source) => source.id);
  const chunkRows = latestSourceIds.length
    ? await db.query.knowledgeChunks.findMany({
        where: inArray(knowledgeChunks.sourceId, latestSourceIds),
      })
    : [];

  const chunkStatsBySourceId = new Map<string, { indexed: number; failed: number }>();
  for (const chunk of chunkRows) {
    const current = chunkStatsBySourceId.get(chunk.sourceId) ?? { indexed: 0, failed: 0 };
    if (chunk.indexingStatus === "indexed") {
      current.indexed += 1;
    }
    if (chunk.indexingStatus === "failed") {
      current.failed += 1;
    }
    chunkStatsBySourceId.set(chunk.sourceId, current);
  }

  return resourceRows.map((row) =>
    {
      const source = latestSourceByResourceId.get(row.id) ?? null;
      const chunkStats = source ? chunkStatsBySourceId.get(source.id) : null;

      return ResourceCardDTOSchema.parse({
        id: row.id,
        schoolId: row.schoolId,
        ownerId: row.ownerId,
        courseId: row.courseId,
        title: row.title,
        visibility: row.visibility,
        classification: row.classification,
        ragEligible: row.ragEligible ?? false,
        url: row.url,
        knowledgeSourceStatus: source?.status ?? null,
        knowledgeSourceError: source?.error ?? null,
        indexedChunkCount: chunkStats?.indexed ?? 0,
        failedChunkCount: chunkStats?.failed ?? 0,
        createdAt: row.createdAt?.getTime() ?? 0,
        updatedAt: row.updatedAt?.getTime() ?? 0,
      });
    }
  );
}

export async function createTeacherResource(input: CreateResourceInput): Promise<ResourceCardDTO> {
  const scope = await assertActiveTeacher();

  if (!scope.schoolIds.includes(input.schoolId)) {
    throw new Error("RESOURCE_AUTH_REQUIRED");
  }

  if (input.courseId) {
    const course = await db.query.courses.findFirst({
      where: eq(courses.id, input.courseId),
    });
    if (!course || course.schoolId !== input.schoolId) {
      throw new Error("RESOURCE_AUTH_REQUIRED");
    }
  }

  const [row] = await db
    .insert(resources)
    .values({
      schoolId: input.schoolId,
      ownerId: scope.userId,
      courseId: input.courseId ?? null,
      title: input.title,
      visibility: input.visibility,
      classification: input.classification,
      ragEligible: input.ragEligible ?? false,
      url: input.url ?? null,
      content: input.content ?? null,
    })
    .returning();

  return ResourceCardDTOSchema.parse({
    id: row.id,
    schoolId: row.schoolId,
    ownerId: row.ownerId,
    courseId: row.courseId,
    title: row.title,
    visibility: row.visibility,
    classification: row.classification,
    ragEligible: row.ragEligible ?? false,
    url: row.url,
    knowledgeSourceStatus: null,
    knowledgeSourceError: null,
    indexedChunkCount: 0,
    failedChunkCount: 0,
    createdAt: row.createdAt?.getTime() ?? 0,
    updatedAt: row.updatedAt?.getTime() ?? 0,
  });
}

export async function updateTeacherResource(
  input: UpdateResourceInput & { resourceId: string }
): Promise<ResourceCardDTO> {
  const scope = await assertActiveTeacher();

  const existing = await db.query.resources.findFirst({
    where: eq(resources.id, input.resourceId),
  });

  if (!existing || !scope.schoolIds.includes(existing.schoolId)) {
    throw new Error("RESOURCE_NOT_FOUND");
  }

  if (input.schoolId && !scope.schoolIds.includes(input.schoolId)) {
    throw new Error("RESOURCE_AUTH_REQUIRED");
  }

  const newSchoolId = input.schoolId ?? existing.schoolId;

  if (input.courseId) {
    const course = await db.query.courses.findFirst({
      where: eq(courses.id, input.courseId),
    });
    if (!course || course.schoolId !== newSchoolId) {
      throw new Error("RESOURCE_AUTH_REQUIRED");
    }
  }

  const updateData: ResourceUpdatePatch = { updatedAt: new Date() };
  if (input.schoolId !== undefined) updateData.schoolId = input.schoolId;
  if (input.courseId !== undefined) updateData.courseId = input.courseId;
  if (input.title !== undefined) updateData.title = input.title;
  if (input.visibility !== undefined) updateData.visibility = input.visibility;
  if (input.classification !== undefined) updateData.classification = input.classification;
  if (input.ragEligible !== undefined) updateData.ragEligible = input.ragEligible;
  if (input.url !== undefined) updateData.url = input.url;
  if (input.content !== undefined) updateData.content = input.content;

  const [row] = await db
    .update(resources)
    .set(updateData)
    .where(eq(resources.id, input.resourceId))
    .returning();

  return ResourceCardDTOSchema.parse({
    id: row.id,
    schoolId: row.schoolId,
    ownerId: row.ownerId,
    courseId: row.courseId,
    title: row.title,
    visibility: row.visibility,
    classification: row.classification,
    ragEligible: row.ragEligible ?? false,
    url: row.url,
    knowledgeSourceStatus: null,
    knowledgeSourceError: null,
    indexedChunkCount: 0,
    failedChunkCount: 0,
    createdAt: row.createdAt?.getTime() ?? 0,
    updatedAt: row.updatedAt?.getTime() ?? 0,
  });
}

export async function setResourceRagEligibility(input: {
  resourceId: string;
  ragEligible: boolean;
}): Promise<ResourceCardDTO> {
  const scope = await assertActiveTeacher();

  const existing = await db.query.resources.findFirst({
    where: eq(resources.id, input.resourceId),
  });

  if (!existing || !scope.schoolIds.includes(existing.schoolId)) {
    throw new Error("RESOURCE_NOT_FOUND");
  }

  const [row] = await db
    .update(resources)
    .set({ ragEligible: input.ragEligible, updatedAt: new Date() })
    .where(eq(resources.id, input.resourceId))
    .returning();

  return ResourceCardDTOSchema.parse({
    id: row.id,
    schoolId: row.schoolId,
    ownerId: row.ownerId,
    courseId: row.courseId,
    title: row.title,
    visibility: row.visibility,
    classification: row.classification,
    ragEligible: row.ragEligible ?? false,
    url: row.url,
    knowledgeSourceStatus: null,
    knowledgeSourceError: null,
    indexedChunkCount: 0,
    failedChunkCount: 0,
    createdAt: row.createdAt?.getTime() ?? 0,
    updatedAt: row.updatedAt?.getTime() ?? 0,
  });
}
