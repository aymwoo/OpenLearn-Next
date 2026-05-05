import "server-only";
import { inArray, eq } from "drizzle-orm";
import { db } from "@/db";
import { resources, courses } from "@/db/schema";
import { assertActiveTeacher } from "./lesson-authoring";
import {
  ResourceCardDTOSchema,
  ResourceCardDTO,
  CreateResourceInput,
  UpdateResourceInput,
} from "../dto/resource-ai";

export async function getTeacherResourceLibraryDTO(): Promise<ResourceCardDTO[]> {
  const scope = await assertActiveTeacher();

  const resourceRows = await db.query.resources.findMany({
    where: inArray(resources.schoolId, scope.schoolIds),
    orderBy: (resource, { desc }) => [desc(resource.createdAt)],
  });

  return resourceRows.map((row) =>
    ResourceCardDTOSchema.parse({
      id: row.id,
      schoolId: row.schoolId,
      ownerId: row.ownerId,
      courseId: row.courseId,
      title: row.title,
      visibility: row.visibility,
      classification: row.classification,
      ragEligible: row.ragEligible ?? false,
      url: row.url,
      createdAt: row.createdAt?.getTime() ?? 0,
      updatedAt: row.updatedAt?.getTime() ?? 0,
    })
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

  const updateData: any = { updatedAt: new Date() };
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
    createdAt: row.createdAt?.getTime() ?? 0,
    updatedAt: row.updatedAt?.getTime() ?? 0,
  });
}
