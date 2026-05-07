export const MCP_SUPPORTED_PROVIDERS = [
  "moodle",
  "github",
  "notion",
  "wecom",
  "dingtalk"
] as const;

export type SupportedMcpProvider = typeof MCP_SUPPORTED_PROVIDERS[number];

export const MCP_SUPPORTED_CAPABILITIES = [
  {
    id: "moodle-sync",
    provider: "moodle",
    name: "Moodle Sync",
    description: "Sync courses and grades with Moodle"
  },
  {
    id: "github-issues",
    provider: "github",
    name: "GitHub Issues",
    description: "Create and read GitHub issues"
  },
  {
    id: "notion-pages",
    provider: "notion",
    name: "Notion Pages",
    description: "Read and write Notion pages"
  },
  {
    id: "wecom-notify",
    provider: "wecom",
    name: "WeCom Notifications",
    description: "Send notifications via WeCom"
  },
  {
    id: "dingtalk-notify",
    provider: "dingtalk",
    name: "DingTalk Notifications",
    description: "Send notifications via DingTalk"
  }
] as const;

export function createMcpCapabilitySeed(serverId: string, schoolId: string, courseId?: string) {
  return MCP_SUPPORTED_CAPABILITIES.map(cap => ({
    id: `${serverId}-${cap.id}`,
    serverId,
    name: cap.name,
    description: cap.description,
    enabled: false,
    allowedRolesJson: ["teacher", "admin", "developer"],
    schoolId,
    courseId: courseId || null,
  }));
}

export interface McpCredentialRef {
  provider: SupportedMcpProvider;
  credentialRef: string;
  status: "active" | "inactive";
  scopes: string[];
}

const FORBIDDEN_KEYS = ["secret", "tokenValue", "apiKey", "password", "clientSecret"];

export function assertNoSecretMaterial(input: Record<string, unknown>) {
  for (const key of Object.keys(input)) {
    if (FORBIDDEN_KEYS.includes(key)) {
      throw new Error(`Input contains forbidden secret key: ${key}`);
    }
  }
}
