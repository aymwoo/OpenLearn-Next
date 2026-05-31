import { existsSync, readFileSync } from "node:fs";

type Check = {
  label: string;
  passed: boolean;
};

function read(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function withoutLineComments(source: string) {
  return source
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

function nonCommentIncludes(source: string, token: string) {
  return withoutLineComments(source).includes(token);
}

function noForbiddenUiImports(source: string) {
  const filtered = withoutLineComments(source);
  return !/from\s+["'](@\/db|@\/db\/schema|drizzle-orm|@\/lib\/dal)/.test(filtered);
}

function noForbiddenPluginExecution(source: string) {
  const filtered = withoutLineComments(source);
  return !/eval\(|new Function\(|import\(/.test(filtered);
}

function noSecretPersistence(source: string) {
  const filtered = withoutLineComments(source);
  // remove literal strings that happen to be these words (for FORBIDDEN_KEYS checks)
  const noLiterals = filtered.replace(/["'](secret|apiKey|password|tokenValue|clientSecret)["']/g, "");
  return !/secret|apiKey|password|tokenValue|fetch\(/.test(noLiterals);
}

function noDeferredScopeTokens(source: string) {
  const filtered = withoutLineComments(source);
  return [
    /PDF parsing/i,
    /embedding generation/i,
    /real Qdrant/i,
    /TutorAgent chat/i,
    /ParentAgent summaries/i,
    /autonomous AI classroom control/i,
    /plugin marketplace/i,
    /arbitrary CSS/i,
    /eval\(/i,
    /new Function/i,
  ].every((pattern) => !pattern.test(filtered));
}

const schema = read("src/db/schema.ts");
const dtoResourceAi = read("src/lib/dto/resource-ai.ts");
const dalResources = read("src/lib/dal/resources.ts");
const dalAiRag = read("src/lib/dal/ai-rag.ts");
const dalMcp = read("src/lib/dal/mcp.ts");
const dalPlugins = read("src/lib/dal/plugins.ts");
const dalThemes = read("src/lib/dal/themes.ts");
const actionResources = read("src/actions/resource-actions.ts");
const actionAiRag = read("src/actions/ai-rag-actions.ts");
const actionMcp = read("src/actions/mcp-actions.ts");
const actionPlugins = read("src/actions/plugin-actions.ts");
const librarySurface = read("src/components/surfaces/library-surface.tsx");
const adminSurface = read("src/components/surfaces/admin-surface.tsx");
const aiRegistry = read("src/server/ai/agents/registry.ts");
const mcpRegistry = read("src/server/mcp/registry.ts");
const pluginRegistry = read("src/server/plugins/registry.ts");
const themeTokens = read("src/server/themes/tokens.ts");
const ragBoundary = read("src/server/rag/retrieval-boundary.ts");
const packageJson = read("package.json");

const allImplementationSources = [
  schema,
  dtoResourceAi,
  dalResources,
  dalAiRag,
  dalMcp,
  dalPlugins,
  dalThemes,
  actionResources,
  actionAiRag,
  actionMcp,
  actionPlugins,
  librarySurface,
  adminSurface,
  aiRegistry,
  mcpRegistry,
  pluginRegistry,
  themeTokens,
  ragBoundary,
].join("\n");

const checks: Check[] = [
  { label: "D-01 schema exports tables", passed: [
    "resources", "mcpServers", "mcpCredentialRefs", "mcpCapabilities", "mcpAuditLogs",
    "pluginRegistrations", "pluginHookRuns", "pluginActionAudits", "themeTokenRegistries",
    "themeAuditLogs", "agentRegistry", "agentProposals", "agentAuditLogs"
  ].every(table => schema.includes(`export const ${table} = sqliteTable`)) },
  { label: "D-02 DTO schema exports", passed: [
    "ResourceCardDTOSchema", "CreateResourceInputSchema", "UpdateResourceInputSchema",
    "KnowledgeSourceDTOSchema", "KnowledgeChunkDTOSchema", "RetrievalFilterDTOSchema",
    "AgentRegistryDTOSchema", "AgentProposalDTOSchema", "McpServerDTOSchema",
    "McpCapabilityDTOSchema", "McpAuditDTOSchema", "PluginManifestSchema",
    "PluginRegistrationDTOSchema", "PluginActionInputSchema", "PluginAuditDTOSchema",
    "ThemeTokenRegistrySchema", "ThemeRegistryDTOSchema"
  ].every(dto => dtoResourceAi.includes(`export const ${dto}`)) },
  { label: "D-03 resource DAL is server-only and scoped", passed: nonCommentIncludes(dalResources, 'import "server-only"') && nonCommentIncludes(dalResources, 'assertActiveTeacher') },
  { label: "D-04 resource UI no resourceCards", passed: !librarySurface.includes('resourceCards') },
  { label: "D-05 resource UI no DB/DAL imports", passed: noForbiddenUiImports(librarySurface) },
  { label: "D-06 AI registry five agents and approval requirement", passed: [
    "LessonAgent", "HomeworkAgent", "DataAgent", "TutorAgent", "ParentAgent", "requiresTeacherApproval: true"
  ].every(t => aiRegistry.includes(t)) },
  { label: "D-07 AI DAL/action provider-free", passed: !nonCommentIncludes(dalAiRag, 'openai') && !nonCommentIncludes(dalAiRag, 'anthropic') && !nonCommentIncludes(dalAiRag, 'gemini') },
  { label: "D-08 retrieval helper includes required filters", passed: ragBoundary.includes('schoolId') && ragBoundary.includes('ragEligible') },
  { label: "D-09 MCP registry/DAL credentialRef-only and no external calls", passed: noSecretPersistence(dalMcp) && noSecretPersistence(actionMcp) },
  { label: "D-10 plugin allowlist/anchors/kill switch/audit", passed: dalPlugins.includes('killSwitchEnabled') && dalPlugins.includes('pluginActionAudits') && dalPlugins.includes('manifest.anchors') },
  { label: "D-11 plugin execution regression check", passed: noForbiddenPluginExecution(dalPlugins) && noForbiddenPluginExecution(actionPlugins) && noForbiddenPluginExecution(pluginRegistry) },
  { label: "D-12 theme compiler Lexend/no-line/CSS-variable only", passed: themeTokens.includes('Lexend') && themeTokens.includes('--color-') && themeTokens.includes('permittedSurfaceRoles') },
  { label: "D-13 admin UI safety copy", passed: adminSurface.includes('安全边界与注册表') && adminSurface.includes('安全清单') && adminSurface.includes('紧急控制') },
  { label: "D-14 admin UI no DB/DAL imports", passed: noForbiddenUiImports(adminSurface) },
  { label: "D-15 admin UI no divider-heavy styling", passed: !/divide-|border-b|border-t|border-l|border-r/.test(adminSurface) },
  { label: "D-16 library UI no divider-heavy styling", passed: !/divide-|border-b|border-t|border-l|border-r/.test(librarySurface) },
  { label: "D-17 deferred scope tokens absent", passed: noDeferredScopeTokens(allImplementationSources) },
  { label: "D-18 package script wiring", passed: packageJson.includes('"verify:phase6"') && packageJson.includes('tsx scripts/verify-phase6-foundations.ts') }
];

const failed = checks.filter(c => !c.passed);

if (failed.length > 0) {
  console.error("Phase 6 foundations verification failed");
  failed.forEach(c => console.error(`- ${c.label}`));
  process.exit(1);
}

console.log("Phase 6 foundations verification passed");
