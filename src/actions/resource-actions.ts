"use server";

import { z } from "zod";
import { updateTag } from "next/cache";
import { cacheTags } from "@/lib/cache-policy";
import {
  createTeacherResource,
  updateTeacherResource,
  setResourceRagEligibility,
} from "@/lib/dal/resources";
import {
  CreateResourceInputSchema,
  UpdateResourceInputSchema,
} from "@/lib/dto/resource-ai";

const resourceRagEligibilityInputSchema = z.object({
  resourceId: z.string(),
  ragEligible: z.boolean(),
});

function normalizeFormData(input: FormData | Record<string, unknown>) {
  if (input instanceof FormData) {
    return Object.fromEntries(input.entries());
  }
  return input;
}

export async function createResourceAction(input: FormData | Record<string, unknown>) {
  try {
    const rawData = normalizeFormData(input);
    const parsed = CreateResourceInputSchema.safeParse({
      ...rawData,
      ragEligible: rawData.ragEligible === "true" || rawData.ragEligible === true,
    });

    if (!parsed.success) {
      return { ok: false, error: parsed.error.format(), message: "资源信息不完整，请检查后再保存。" };
    }

    const data = await createTeacherResource(parsed.data);

    updateTag(cacheTags.resources(data.schoolId));
    updateTag(cacheTags.resource(data.id));

    return { ok: true, data };
  } catch (error: any) {
    console.error("createResourceAction failed", error);
    return { ok: false, message: "资源保存失败，请重试。" };
  }
}

export async function updateResourceAction(
  resourceId: string,
  input: FormData | Record<string, unknown>
) {
  try {
    const rawData = normalizeFormData(input);
    const parsed = UpdateResourceInputSchema.safeParse({
      ...rawData,
      ...(rawData.ragEligible !== undefined
        ? { ragEligible: rawData.ragEligible === "true" || rawData.ragEligible === true }
        : {}),
    });

    if (!parsed.success) {
      return { ok: false, error: parsed.error.format(), message: "资源信息不完整，请检查后再保存。" };
    }

    const data = await updateTeacherResource({ resourceId, ...parsed.data });

    updateTag(cacheTags.resources(data.schoolId));
    updateTag(cacheTags.resource(data.id));

    return { ok: true, data };
  } catch (error: any) {
    console.error("updateResourceAction failed", error);
    return { ok: false, message: "资源保存失败，请重试。" };
  }
}

export async function setResourceRagEligibilityAction(input: FormData | Record<string, unknown>) {
  try {
    const rawData = normalizeFormData(input);
    const parsed = resourceRagEligibilityInputSchema.safeParse({
      resourceId: rawData.resourceId,
      ragEligible: rawData.ragEligible === "true" || rawData.ragEligible === true,
    });

    if (!parsed.success) {
      return { ok: false, error: parsed.error.format(), message: "资源信息不完整，请检查后再保存。" };
    }

    const data = await setResourceRagEligibility(parsed.data);

    updateTag(cacheTags.resources(data.schoolId));
    updateTag(cacheTags.resource(data.id));

    return { ok: true, data };
  } catch (error: any) {
    console.error("setResourceRagEligibilityAction failed", error);
    return { ok: false, message: "资源保存失败，请重试。" };
  }
}
