"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import {
  registerMcpServer,
  registerMcpCredentialRef,
  setMcpCapabilityEnabled,
  recordMcpAudit,
} from "@/lib/dal/mcp";
import { cacheTags } from "@/lib/cache-policy";
import { MCP_SUPPORTED_PROVIDERS } from "@/server/mcp/registry";

const RegisterMcpServerInputSchema = z.object({
  schoolId: z.string(),
  name: z.string(),
  url: z.string().url(),
});

const RegisterMcpCredentialRefInputSchema = z.object({
  serverId: z.string(),
  provider: z.enum(MCP_SUPPORTED_PROVIDERS),
  credentialRef: z.string(),
  scopes: z.array(z.string()),
}).catchall(z.any());

const SetMcpCapabilityEnabledInputSchema = z.object({
  serverId: z.string(),
  capabilityId: z.string(),
  enabled: z.boolean(),
});

const RecordMcpAuditInputSchema = z.object({
  serverId: z.string(),
  capabilityId: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  status: z.enum(["success", "denied", "error"]),
  deniedReason: z.string().optional(),
  summary: z.string(),
}).catchall(z.any());

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; message: string };

const validationMessage = "MCP 配置信息不完整，请检查后再保存。";
const actionErrorMessage = "MCP 元数据操作失败，请重试。";
const FORBIDDEN_KEYS = ["secret", "tokenValue", "apiKey", "password", "clientSecret"];

function normalizeInput(input: FormData | Record<string, unknown>) {
  if (!(input instanceof FormData)) {
    return input;
  }
  return Object.fromEntries(input.entries());
}

function hasForbiddenKeys(input: Record<string, unknown>): boolean {
  for (const key of Object.keys(input)) {
    if (FORBIDDEN_KEYS.includes(key)) {
      return true;
    }
  }
  return false;
}

function validationError(message = validationMessage) {
  return { ok: false as const, error: "VALIDATION_ERROR", message };
}

function handleActionError(error: unknown) {
  if (error instanceof z.ZodError) {
    return validationError();
  }
  if (error instanceof Error && error.message === "TEACHER_AUTH_REQUIRED") {
    return { ok: false as const, error: "UNAUTHORIZED", message: "您没有权限执行此操作。" };
  }
  return { ok: false as const, error: "ACTION_FAILED", message: actionErrorMessage };
}

export async function registerMcpServerAction(
  input: FormData | Record<string, unknown>
): Promise<ActionResult<unknown>> {
  const normalized = normalizeInput(input);
  if (hasForbiddenKeys(normalized)) return validationError();

  const parsed = RegisterMcpServerInputSchema.safeParse(normalized);
  if (!parsed.success) return validationError();

  try {
    const data = await registerMcpServer(parsed.data);
    updateTag(cacheTags.mcpServer(data.id));
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function registerMcpCredentialRefAction(
  input: FormData | Record<string, unknown>
): Promise<ActionResult<unknown>> {
  const normalized = normalizeInput(input);
  if (hasForbiddenKeys(normalized)) return validationError();

  const parsed = RegisterMcpCredentialRefInputSchema.safeParse(normalized);
  if (!parsed.success) return validationError();

  try {
    const data = await registerMcpCredentialRef(parsed.data);
    updateTag(cacheTags.mcpServer(parsed.data.serverId));
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function setMcpCapabilityEnabledAction(
  input: FormData | Record<string, unknown>
): Promise<ActionResult<unknown>> {
  const normalized = normalizeInput(input);
  if (hasForbiddenKeys(normalized)) return validationError();

  const parsed = SetMcpCapabilityEnabledInputSchema.safeParse(normalized);
  if (!parsed.success) return validationError();

  try {
    const data = await setMcpCapabilityEnabled({
      capabilityId: parsed.data.capabilityId,
      enabled: parsed.data.enabled,
    });
    updateTag(cacheTags.mcpServer(parsed.data.serverId));
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function recordMcpAuditAction(
  input: FormData | Record<string, unknown>
): Promise<ActionResult<unknown>> {
  const normalized = normalizeInput(input);
  if (hasForbiddenKeys(normalized)) return validationError();

  const parsed = RecordMcpAuditInputSchema.safeParse(normalized);
  if (!parsed.success) return validationError();

  try {
    const data = await recordMcpAudit(parsed.data);
    updateTag(cacheTags.mcpServer(parsed.data.serverId));
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
}
