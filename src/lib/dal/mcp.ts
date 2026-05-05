import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mcpAuditLogs, mcpCapabilities, mcpCredentialRefs, mcpServers } from "@/db/schema";
import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";
import { assertNoSecretMaterial, createMcpCapabilitySeed, type SupportedMcpProvider } from "@/server/mcp/registry";
import { McpServerDTOSchema, McpCapabilityDTOSchema, McpAuditDTOSchema } from "@/lib/dto/resource-ai";

type RegisterMcpServerInput = {
  schoolId: string;
  name: string;
  url: string;
};

type RegisterMcpCredentialRefInput = {
  serverId: string;
  provider: SupportedMcpProvider;
  credentialRef: string;
  scopes: string[];
};

type SetMcpCapabilityEnabledInput = {
  capabilityId: string;
  enabled: boolean;
};

type RecordMcpAuditInput = {
  serverId: string;
  capabilityId: string;
  targetType: string;
  targetId: string;
  status: "success" | "denied" | "error";
  deniedReason?: string;
  summary: string;
};

export async function registerMcpServer(input: RegisterMcpServerInput) {
  const scope = await assertActiveTeacher();
  if (!scope.schoolIds.includes(input.schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  const [server] = await db
    .insert(mcpServers)
    .values({
      schoolId: input.schoolId,
      name: input.name,
      url: input.url,
      status: "active",
    })
    .returning();

  // Create disabled capabilities by default
  const seeds = createMcpCapabilitySeed(server.id, input.schoolId);
  for (const seed of seeds) {
    await db.insert(mcpCapabilities).values({
      serverId: seed.serverId,
      name: seed.name,
      description: seed.description,
      enabled: false,
      allowedRolesJson: seed.allowedRolesJson,
      courseId: seed.courseId,
    });
  }

  return McpServerDTOSchema.parse({
    id: server.id,
    schoolId: server.schoolId,
    name: server.name,
    url: server.url,
    status: server.status,
  });
}

export async function registerMcpCredentialRef(input: RegisterMcpCredentialRefInput) {
  const scope = await assertActiveTeacher();
  
  // Need to ensure teacher has access to the server's school
  const server = await db.query.mcpServers.findFirst({ where: eq(mcpServers.id, input.serverId) });
  if (!server || !scope.schoolIds.includes(server.schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  // Validate we aren't storing secrets
  assertNoSecretMaterial(input);

  const [cred] = await db
    .insert(mcpCredentialRefs)
    .values({
      serverId: input.serverId,
      provider: input.provider,
      credentialRef: input.credentialRef,
      scopesJson: input.scopes,
      status: "active",
    })
    .returning();

  return cred;
}

export async function setMcpCapabilityEnabled(input: SetMcpCapabilityEnabledInput) {
  const scope = await assertActiveTeacher();
  
  const capability = await db.query.mcpCapabilities.findFirst({ where: eq(mcpCapabilities.id, input.capabilityId) });
  if (!capability) {
    throw new Error("CAPABILITY_NOT_FOUND");
  }

  const server = await db.query.mcpServers.findFirst({ where: eq(mcpServers.id, capability.serverId) });
  if (!server || !scope.schoolIds.includes(server.schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  const [updated] = await db
    .update(mcpCapabilities)
    .set({ enabled: input.enabled, updatedAt: new Date() })
    .where(eq(mcpCapabilities.id, input.capabilityId))
    .returning();

  return McpCapabilityDTOSchema.parse({
    id: updated.id,
    serverId: updated.serverId,
    name: updated.name,
    description: updated.description,
    enabled: updated.enabled,
    allowedRolesJson: updated.allowedRolesJson,
    courseId: updated.courseId,
  });
}

export async function getMcpRegistryDTO() {
  const scope = await assertActiveTeacher();
  
  // This would typically return all servers/capabilities the teacher can see
  return {
    // Return empty for now as it's just a placeholder for the registry
    servers: [],
    capabilities: []
  };
}

export async function recordMcpAudit(input: RecordMcpAuditInput) {
  const scope = await assertActiveTeacher();

  // Validate no secrets in summary or reason
  assertNoSecretMaterial({ summary: input.summary, deniedReason: input.deniedReason });

  const payloadJson = {
    capabilityId: input.capabilityId,
    targetType: input.targetType,
    targetId: input.targetId,
    status: input.status,
    deniedReason: input.deniedReason,
    summary: input.summary,
  };

  const [audit] = await db
    .insert(mcpAuditLogs)
    .values({
      serverId: input.serverId,
      action: "mcp_action",
      payloadJson,
      actorId: scope.userId,
    })
    .returning();

  return McpAuditDTOSchema.parse({
    id: audit.id,
    serverId: audit.serverId,
    action: audit.action,
    payloadJson: audit.payloadJson,
    actorId: audit.actorId,
    createdAt: audit.createdAt ? audit.createdAt.getTime() : Date.now(),
  });
}
