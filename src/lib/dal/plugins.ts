import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  classroomSessions,
  governanceAudits,
  pluginActionAudits,
  pluginHookRuns,
  pluginLessonExtensions,
  pluginLifecycleTransitions,
  pluginLessonStepExtensions,
  pluginOwnedBusinessData,
  pluginRegistrations,
  pluginResourceExtensions,
} from "@/db/schema";
import { pluginOwnedQuizQuestions, pluginOwnedQuizResponses } from "@/db/schema/generated/plugin-owned/quiz";
import type { PluginLifecycleState, RuntimeActorScope } from "@/features/runtime-platform/contracts/permissions";
import { getUserMembershipsDTO } from "@/lib/dal/membership";
import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";
import { PluginDataModelSchema, type PluginDataModel } from "@/lib/dto/plugin-data-model";
import { PluginActionInput, PluginActionResult, PluginManifest, PluginManifestSchema, PluginRegistrationDTO, PluginRegistrationDTOSchema } from "@/lib/dto/resource-ai";
import { getExternalMarketplaceCatalogEntry, listExternalMarketplaceCatalog as listExternalMarketplaceCatalogEntries } from "@/lib/plugins/external-catalog";
import { executePluginUpgradeWithTx as executePluginUpgradeMigrationWithTx, preflightPluginUpgrade as preflightPluginUpgradeMigration } from "@/lib/dal/plugin-migration";
import { dispatchPluginAction, PLUGIN_ACTION_PERMISSION_REQUIREMENTS } from "@/server/plugins/registry";
import { registerThemeTokens } from "@/lib/dal/themes";
import { RUNTIME_CONTRACT_VERSION } from "@/features/runtime-platform/contracts/version";

import type { PluginGovernanceProjectionInput } from "@/features/platform-core/plugins/governance-projection";

// Phase 50 boundary freeze: plugin domain DAL only; not platform orchestration authority.
export const PLUGIN_KEY_CONFLICT = "PLUGIN_KEY_CONFLICT";
export const PLUGIN_DB_NAMESPACE_CONFLICT = "PLUGIN_DB_NAMESPACE_CONFLICT";
export const PLUGIN_DB_NAMESPACE_FROZEN = "PLUGIN_DB_NAMESPACE_FROZEN";
export const PLUGIN_MANIFEST_INVALID = "PLUGIN_MANIFEST_INVALID";
export const PLUGIN_DATA_MODEL_INVALID = "PLUGIN_DATA_MODEL_INVALID";
export const PLUGIN_RECOVERY_NOT_AVAILABLE = "PLUGIN_RECOVERY_NOT_AVAILABLE";

export type ExternalMarketplaceInstallPreflightResult = {
  ok: boolean;
  pluginKey: string;
  version: string;
  sourceType: "external";
  builtIn: false;
  dbNamespace: string;
  requestedPermissions: readonly string[];
  declaredDataTables: readonly string[];
  rejectReason: string | null;
  canRecover: boolean;
  retainedRegistrationId: string | null;
};

type RecoverRetainedPluginInstallWithTxInput = {
  actorId: string;
  schoolId: string;
  pluginKey: string;
  version: string;
  tx: PluginDalTx;
  actorScope?: RuntimeActorScope;
  commandContext?: PluginCommandContext;
};

type RecoverRetainedPluginInstallResult = PluginRegistrationDTO & {
  recoveredFromPluginId: string;
  recoveredDataTakeover: true;
};

export function deriveDbNamespace(pluginKey: string) {
  const normalized = pluginKey
    .toLowerCase()
    .replace(/[-.:/@\s]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  const prefixed = normalized.length === 0
    ? "p_plugin"
    : /^[a-z]/.test(normalized)
      ? normalized
      : `p_${normalized}`;

  return prefixed.slice(0, 48);
}

type PluginManagerScopeInput = {
  actorId: string;
  schoolId: string;
};

type RegisterPluginManifestInput = PluginManagerScopeInput & {
  name: string;
  manifestJson: PluginManifest;
};

type InstallOrReconcilePluginInput = PluginManagerScopeInput & {
  pluginId?: string;
  name: string;
  manifestJson: PluginManifest;
  installSource: "manual" | "bootstrap" | "repair" | "seed";
  forceDefaultEnabledSnapshot?: boolean;
  enabled?: boolean;
  killSwitchEnabled?: boolean;
  lifecycleState?: PluginLifecycleState;
  dbNamespace?: string;
};

type SetPluginEnabledInput = PluginManagerScopeInput & {
  pluginId: string;
  enabled: boolean;
};

type TransitionPluginLifecycleInput = PluginBySchoolInput & {
  targetState: PluginLifecycleState;
  reason: string;
};

type PluginBySchoolInput = PluginManagerScopeInput & {
  pluginId: string;
};

export type PluginCommandContext = {
  commandId: string;
  correlationId: string;
  attemptNumber: number;
};

type PluginDalTx = {
  select: typeof db.select;
  insert: typeof db.insert;
  update: typeof db.update;
  delete: typeof db.delete;
};

type InstallOrReconcilePluginWithTxInput = InstallOrReconcilePluginInput & {
  tx: PluginDalTx;
  commandContext?: PluginCommandContext;
  actorScope?: RuntimeActorScope;
};

type TransitionPluginLifecycleWithTxInput = TransitionPluginLifecycleInput & {
  tx: PluginDalTx;
  commandContext?: PluginCommandContext;
  actorScope?: RuntimeActorScope;
};

type SetPluginKillSwitchWithTxInput = {
  tx: PluginDalTx;
  pluginId: string;
  actorId: string;
  killSwitchEnabled: boolean;
  commandContext?: PluginCommandContext;
  actorScope?: RuntimeActorScope;
};

type PreflightUninstallPluginWithTxInput = PluginBySchoolInput & {
  tx: PluginDalTx;
  commandContext?: PluginCommandContext;
  actorScope?: RuntimeActorScope;
};

type UninstallPluginWithTxInput = PluginBySchoolInput & {
  tx: PluginDalTx;
  retentionMode?: "retain" | "cleanup";
  confirmationToken?: string;
  commandContext?: PluginCommandContext;
  actorScope?: RuntimeActorScope;
};

export type PreflightUninstallPluginResult = {
  pluginId: string;
  schoolId: string;
  blocked: boolean;
  reason: string | null;
  lessonExtCount: number;
  stepExtCount: number;
  resourceExtCount: number;
  ownedBusinessCount: number;
  ownedQuestionCount: number;
  ownedResponseCount: number;
  affectedEndedSessionCount: number;
  totalCount: number;
  impactedLessonIds: string[];
  impactedLessonStepIds: string[];
  impactedResourceIds: string[];
  impactedBusinessKeys: string[];
  activeSessions: Array<{
    sessionId: string;
    lessonId: string;
    classId: string;
    status: "live";
  }>;
  cleanupConfirmationToken: string;
};

export type PluginUpgradePreflightResult = {
  pluginId: string;
  schoolId: string;
  currentVersion: string;
  targetVersion: string;
  hasOwnedQuizData: boolean;
  stages: Array<"backfill" | "verify" | "cutover">;
  blockers: string[];
  statsParityPreview: {
    questionCount: number;
    responseCount: number;
    latestResponseHash: string;
  };
  activeSessions: Array<{
    sessionId: string;
    lessonId: string;
    classId: string;
    status: "live";
  }>;
};

export type PluginUpgradeExecutionResult = {
  pluginId: string;
  schoolId: string;
  currentVersion: string;
  targetVersion: string;
  upgraded: boolean;
  verifyPassed: boolean;
  lifecycleState: PluginLifecycleState;
  stages: Array<{
    name: "backfill" | "verify" | "cutover";
    status: "completed" | "failed" | "skipped";
  }>;
  failureDetail: string | null;
  invalidatedSessionIds: string[];
};

export async function preflightPluginUpgrade(input: {
  actorId: string;
  schoolId: string;
  pluginId: string;
  targetVersion: string;
  actorScope?: RuntimeActorScope;
}) {
  await assertMarketplaceManagerScope({ actorId: input.actorId, schoolId: input.schoolId }, input.actorScope);
  return preflightPluginUpgradeMigration(input);
}

export async function executePluginUpgradeWithTx(input: {
  actorId: string;
  schoolId: string;
  pluginId: string;
  targetVersion: string;
  tx: PluginDalTx;
  actorScope?: RuntimeActorScope;
  commandContext?: PluginCommandContext;
}) {
  await assertMarketplaceManagerScope({ actorId: input.actorId, schoolId: input.schoolId }, input.actorScope);
  return executePluginUpgradeMigrationWithTx(input);
}

export type PluginGovernanceSnapshotRecord = PluginGovernanceProjectionInput;

export const ACTIVE_PLUGIN_STATES = ["enabled", "mounted", "ready"] as const satisfies readonly PluginLifecycleState[];

export function isRunnablePluginState(state: PluginLifecycleState) {
  return (ACTIVE_PLUGIN_STATES as readonly PluginLifecycleState[]).includes(state);
}

type EnabledPluginsForAnchorInput = PluginManagerScopeInput & {
  hookAnchor: "dashboard.widget" | "lesson.sidebar" | "schedule.assistant";
};

type RunPluginHookInput = {
  actorId: string;
  pluginId: string;
  schoolId: string;
  hookAnchor: "dashboard.widget" | "lesson.sidebar" | "schedule.assistant";
  input: PluginActionInput;
};

function assertActorId(actorId: string) {
  if (!actorId.trim()) {
    throw new Error("PLUGIN_ACTOR_REQUIRED");
  }
}

function parseManifestOrThrow(manifest: PluginManifest) {
  try {
    return PluginManifestSchema.parse(manifest);
  } catch {
    throw new Error(PLUGIN_MANIFEST_INVALID);
  }
}

function parseDataModelOrThrow(dataModel: PluginDataModel) {
  try {
    return PluginDataModelSchema.parse(dataModel);
  } catch {
    throw new Error(PLUGIN_DATA_MODEL_INVALID);
  }
}

function buildRetainedRecoveryArchivePluginKey(pluginKey: string, pluginId: string) {
  return `${pluginKey}#retained:${pluginId}`;
}

function buildRetainedRecoveryArchiveNamespace(dbNamespace: string, pluginId: string) {
  const suffix = pluginId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(-8) || "retained";

  return `${dbNamespace}_ret_${suffix}`.slice(0, 48);
}

async function assertTeacherManagerScope(input: PluginManagerScopeInput, actorScope?: RuntimeActorScope) {
  assertActorId(input.actorId);

  if (actorScope === "system") {
    return {
      userId: input.actorId,
      schoolIds: [input.schoolId],
    };
  }

  const scope = await assertActiveTeacher();
  if (scope.userId !== input.actorId || !scope.schoolIds.includes(input.schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  return scope;
}

async function assertOperatorScope(input: PluginManagerScopeInput, actorScope?: RuntimeActorScope) {
  assertActorId(input.actorId);

  if (actorScope === "system") {
    return;
  }

  if (actorScope !== "operator") {
    throw new Error("OPERATOR_AUTH_REQUIRED");
  }

  const memberships = await getUserMembershipsDTO(input.actorId);
  const hasOperatorMembership = memberships.some((membership) =>
    membership.schoolId === input.schoolId
    && membership.status === "active"
    && (membership.role === "admin" || membership.role === "developer")
  );

  if (!hasOperatorMembership) {
    throw new Error("OPERATOR_AUTH_REQUIRED");
  }
}

async function assertMarketplaceManagerScope(input: PluginManagerScopeInput, actorScope?: RuntimeActorScope) {
  if (actorScope === "operator") {
    await assertOperatorScope(input, actorScope);
    return;
  }

  await assertTeacherManagerScope(input, actorScope);
}

async function assertActiveSchoolMembershipScope(input: PluginManagerScopeInput) {
  assertActorId(input.actorId);

  const hasMembership = await hasActiveSchoolMembership(input.actorId, input.schoolId);
  if (!hasMembership) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }
}

async function hasActiveSchoolMembership(actorId: string, schoolId: string) {
  assertActorId(actorId);

  const memberships = await getUserMembershipsDTO(actorId);
  return memberships.some((membership) => membership.schoolId === schoolId && membership.status === "active");
}

function toPluginDTO(record: typeof pluginRegistrations.$inferSelect): PluginRegistrationDTO {
  const manifest = PluginManifestSchema.parse(record.manifestJson);

  return PluginRegistrationDTOSchema.parse({
    id: record.id,
    schoolId: record.schoolId,
    name: record.name,
    manifestJson: manifest,
    pluginKey: record.pluginKey,
    dbNamespace: record.dbNamespace,
    sourceType: record.sourceType,
    installSource: record.installSource,
    enabled: record.enabled,
    killSwitchEnabled: record.killSwitchEnabled,
    lifecycleState: record.lifecycleState,
    builtIn: manifest.builtIn,
    defaultEnabled: manifest.defaultEnabled,
    nonDeletable: manifest.nonDeletable,
  });
}

async function createPluginAudit(input: {
  tx?: PluginDalTx;
  pluginId: string;
  action: string;
  decision: "allowed" | "denied";
  reason?: string | null;
  schoolId?: string;
  actorScope?: RuntimeActorScope;
  lifecycleState?: PluginLifecycleState;
  correlationId?: string;
  commandId?: string | null;
  payloadJson: Record<string, unknown>;
  actorId: string;
}) {
  const executor = input.tx ?? db;
  const [record] = await executor
    .insert(pluginActionAudits)
    .values({
      pluginId: input.pluginId,
      commandId: input.commandId ?? null,
      action: input.action,
      decision: input.decision,
      reasonCode: input.reason ?? null,
      schoolId: input.schoolId ?? null,
      actorScope: input.actorScope ?? null,
      lifecycleState: input.lifecycleState ?? null,
      correlationId: input.correlationId ?? null,
      payloadJson: input.payloadJson,
      actorId: input.actorId,
    })
    .returning();

  return record;
}

async function createGovernanceAudit(input: {
  tx?: PluginDalTx;
  pluginId?: string | null;
  schoolId: string;
  action: string;
  decision: "allowed" | "denied";
  reason?: string | null;
  actorId: string;
  actorScope: RuntimeActorScope;
  lifecycleState: PluginLifecycleState;
  killSwitchEnabled: boolean;
  requestedCapabilities: readonly string[];
  requiredPermission?: string | null;
  correlationId: string;
  commandId?: string | null;
  payloadJson: Record<string, unknown>;
}) {
  const executor = input.tx ?? db;
  await executor.insert(governanceAudits).values({
    targetType: "plugin",
    targetId: input.pluginId ?? "",
    pluginId: input.pluginId ?? null,
    schoolId: input.schoolId,
    commandId: input.commandId ?? null,
    action: input.action,
    decision: input.decision,
    reasonCode: input.reason ?? null,
    actorId: input.actorId,
    actorScope: input.actorScope,
    lifecycleState: input.lifecycleState,
    killSwitchEnabled: input.killSwitchEnabled,
    requestedCapabilitiesJson: [...input.requestedCapabilities],
    grantedCapabilitiesJson: [],
    requiredPermission: input.requiredPermission ?? null,
    correlationId: input.correlationId,
    payloadJson: input.payloadJson,
  });
}

async function appendPluginLifecycleTransition(input: {
  tx?: PluginDalTx;
  pluginId: string;
  actorId: string;
  fromState: PluginLifecycleState | null;
  toState: PluginLifecycleState;
  reason: string;
}) {
  const executor = input.tx ?? db;
  await executor.insert(pluginLifecycleTransitions).values({
    pluginId: input.pluginId,
    actorId: input.actorId,
    fromState: input.fromState,
    toState: input.toState,
    reason: input.reason,
  });
}

async function createHookRun(pluginId: string, hookAnchor: string, status: "success" | "failed", durationMs: number) {
  const [record] = await db
    .insert(pluginHookRuns)
    .values({
      pluginId,
      hookAnchor,
      status,
      durationMs,
    })
    .returning();

  return record;
}

function collectPluginObservationErrorParts(error: unknown) {
  const seen = new Set<unknown>();
  const parts: string[] = [];
  let current: unknown = error;

  while (current && !seen.has(current)) {
    seen.add(current);

    if (typeof current === "string") {
      parts.push(current);
      break;
    }

    if (current instanceof Error) {
      if (current.message) {
        parts.push(current.message);
      }
      const code = (current as Error & { code?: unknown }).code;
      if (typeof code === "string") {
        parts.push(code);
      }
      current = (current as Error & { cause?: unknown }).cause;
      continue;
    }

    if (typeof current === "object") {
      const candidate = current as { message?: unknown; code?: unknown; cause?: unknown };
      if (typeof candidate.message === "string") {
        parts.push(candidate.message);
      }
      if (typeof candidate.code === "string") {
        parts.push(candidate.code);
      }
      current = candidate.cause;
      continue;
    }

    break;
  }

  return parts;
}

function isPluginObservationLockError(error: unknown) {
  return collectPluginObservationErrorParts(error).some((part) =>
    part.includes("SQLITE_BUSY") || part.includes("database is locked")
  );
}

async function runBestEffortPluginObservation(
  pluginId: string,
  label: "hook-run" | "plugin-audit" | "governance-audit",
  operation: () => Promise<unknown>,
) {
  try {
    await operation();
  } catch (error) {
    if (!isPluginObservationLockError(error)) {
      throw error;
    }

    const [summary] = collectPluginObservationErrorParts(error);
    console.warn(
      `[plugins] best-effort plugin hook observation write skipped (${label}) for ${pluginId}: ${summary ?? "unknown lock error"}`,
    );
  }
}

const PLUGIN_LIFECYCLE_TRANSITION_MATRIX: Record<PluginLifecycleState, readonly PluginLifecycleState[]> = {
  installed: ["enabled", "disabled"],
  enabled: ["mounted", "ready", "suspended", "disabled", "failed"],
  mounted: ["ready", "suspended", "disabled", "failed"],
  ready: ["suspended", "disabled", "failed"],
  suspended: ["enabled", "mounted", "ready", "disabled", "failed"],
  disabled: ["enabled"],
  failed: ["installed", "disabled"],
};

export function assertPluginLifecycleTransition(
  fromState: PluginLifecycleState,
  toState: PluginLifecycleState,
) {
  if (fromState === toState) {
    return;
  }

  if (!PLUGIN_LIFECYCLE_TRANSITION_MATRIX[fromState].includes(toState)) {
    throw new Error("LIFECYCLE_ILLEGAL_TRANSITION");
  }
}

function resolveInitialPluginLifecycleState(enabled: boolean, lifecycleState?: PluginLifecycleState) {
  if (lifecycleState) {
    return lifecycleState;
  }

  return enabled ? "enabled" : "installed";
}

function getPluginUninstallBlockReason(plugin: Pick<typeof pluginRegistrations.$inferSelect, "sourceType" | "manifestJson">) {
  if (plugin.sourceType === "default") {
    return "UNINSTALL_BLOCKED_DEFAULT_PLUGIN";
  }

  const manifest = PluginManifestSchema.parse(plugin.manifestJson);
  if (manifest.nonDeletable) {
    return "PLUGIN_BUILT_IN_NOT_DELETABLE";
  }

  return null;
}

function getGovernanceDependencies(plugin: Pick<typeof pluginRegistrations.$inferSelect, "manifestJson">) {
  const manifest = PluginManifestSchema.parse(plugin.manifestJson);
  return manifest.governance?.dependencies ?? [];
}

function getActivationStatus(plugin: Pick<typeof pluginRegistrations.$inferSelect, "lifecycleState" | "enabled" | "killSwitchEnabled">) {
  if (plugin.killSwitchEnabled || plugin.lifecycleState === "suspended") {
    return "idle" as const;
  }

  if (plugin.lifecycleState === "failed") {
    return "failed" as const;
  }

  if (plugin.enabled && (plugin.lifecycleState === "mounted" || plugin.lifecycleState === "ready")) {
    return "active" as const;
  }

  return "idle" as const;
}

function buildCleanupConfirmationToken(input: {
  pluginId: string;
  lessonExtCount: number;
  stepExtCount: number;
  resourceExtCount: number;
  ownedBusinessCount: number;
  ownedQuestionCount: number;
  ownedResponseCount: number;
  affectedEndedSessionCount: number;
  totalCount: number;
}) {
  return `cleanup:${input.pluginId}:${input.lessonExtCount}:${input.stepExtCount}:${input.resourceExtCount}:${input.ownedBusinessCount}:${input.ownedQuestionCount}:${input.ownedResponseCount}:${input.affectedEndedSessionCount}:${input.totalCount}`;
}

async function listPluginActiveSessions(input: { schoolId: string; pluginId: string }) {
  const questionRows = await db
    .select({ classroomSession: pluginOwnedQuizQuestions.classroomSession })
    .from(pluginOwnedQuizQuestions)
    .where(and(
      eq(pluginOwnedQuizQuestions.schoolId, input.schoolId),
      eq(pluginOwnedQuizQuestions.pluginId, input.pluginId),
    ));

  if (questionRows.length === 0) {
    return [];
  }

  const sessions = await db
    .select({
      sessionId: classroomSessions.id,
      lessonId: classroomSessions.lessonId,
      classId: classroomSessions.classId,
      status: classroomSessions.status,
    })
    .from(classroomSessions)
    .where(eq(classroomSessions.status, "live"));

  const activeSessionIds = new Set(questionRows.map((row) => String(row.classroomSession)));

  return sessions
    .filter((row) => activeSessionIds.has(String(row.sessionId)))
    .map((row) => ({
      sessionId: String(row.sessionId),
      lessonId: String(row.lessonId),
      classId: String(row.classId),
      status: "live" as const,
    }));
}

export async function listPluginGovernanceSnapshotRecords(
  input: PluginManagerScopeInput,
): Promise<PluginGovernanceSnapshotRecord[]> {
  await assertActiveSchoolMembershipScope(input);

  const rows = await db.query.pluginRegistrations.findMany({
    where: eq(pluginRegistrations.schoolId, input.schoolId),
  });

  const uninstallRows = await Promise.all(
    rows.map(async (row) => ({
      pluginId: row.id,
      uninstall: await preflightUninstallPluginWithTx({
        actorId: input.actorId,
        schoolId: input.schoolId,
        pluginId: row.id,
        tx: db,
      }).catch((error) => {
        if (error instanceof Error && error.message === "TEACHER_AUTH_REQUIRED") {
          return null;
        }
        throw error;
      }),
    })),
  );

  const uninstallByPluginId = new Map(
    uninstallRows
      .filter((row): row is { pluginId: string; uninstall: PreflightUninstallPluginResult } => Boolean(row.uninstall))
      .map((row) => [row.pluginId, row.uninstall]),
  );

  return rows.map((row) => ({
    pluginId: row.id,
    pluginKey: row.pluginKey,
    name: row.name,
    enabled: row.enabled,
    killSwitchEnabled: row.killSwitchEnabled,
    lifecycleState: row.lifecycleState,
    uninstalledAt: row.uninstalledAt,
    uninstallRetentionMode: row.uninstallRetentionMode,
    sourceType: row.sourceType as "default" | "external",
    dependencies: getGovernanceDependencies(row),
    activationStatus: getActivationStatus(row),
    failureDetail: row.lifecycleState === "failed" ? "activation failed" : null,
     uninstall: uninstallByPluginId.get(row.id) ?? {
       pluginId: row.id,
       schoolId: row.schoolId,
       blocked: false,
       reason: null,
       lessonExtCount: 0,
       stepExtCount: 0,
       resourceExtCount: 0,
       ownedBusinessCount: 0,
       ownedQuestionCount: 0,
       ownedResponseCount: 0,
       affectedEndedSessionCount: 0,
       totalCount: 0,
       impactedLessonIds: [],
       impactedLessonStepIds: [],
       impactedResourceIds: [],
       impactedBusinessKeys: [],
       activeSessions: [],
       cleanupConfirmationToken: buildCleanupConfirmationToken({
         pluginId: row.id,
         lessonExtCount: 0,
         stepExtCount: 0,
         resourceExtCount: 0,
         ownedBusinessCount: 0,
         ownedQuestionCount: 0,
         ownedResponseCount: 0,
         affectedEndedSessionCount: 0,
         totalCount: 0,
       }),
     },
  }));
}

export async function installOrReconcilePluginWithTx(input: InstallOrReconcilePluginWithTxInput) {
  await assertMarketplaceManagerScope({ actorId: input.actorId, schoolId: input.schoolId }, input.actorScope);

  const parsedManifest = PluginManifestSchema.parse(input.manifestJson);
  const pluginKey = parsedManifest.id;
  const derivedNamespace = deriveDbNamespace(pluginKey);
  const requestedNamespace = input.dbNamespace?.trim() || null;
  const sourceType = parsedManifest.builtIn ? "default" : "external";
  const hasExplicitRegistrationId = Boolean(input.pluginId);
  const shouldReconcileExisting = input.installSource !== "manual" || hasExplicitRegistrationId;
  const scopedPlugins = await input.tx
    .select()
    .from(pluginRegistrations)
    .where(eq(pluginRegistrations.schoolId, input.schoolId));

  let targetRecord = input.pluginId
    ? scopedPlugins.find((plugin) => plugin.id === input.pluginId) ?? null
    : null;

  if (hasExplicitRegistrationId && !targetRecord) {
    throw new Error("PLUGIN_NOT_FOUND");
  }

  if (targetRecord && targetRecord.pluginKey !== pluginKey) {
    throw new Error(PLUGIN_KEY_CONFLICT);
  }

  const pluginKeyConflict = scopedPlugins.find(
    (plugin) => plugin.pluginKey === pluginKey && plugin.id !== targetRecord?.id,
  ) ?? null;

  if (!targetRecord && shouldReconcileExisting && pluginKeyConflict) {
    targetRecord = pluginKeyConflict;
  } else if (pluginKeyConflict) {
    throw new Error(PLUGIN_KEY_CONFLICT);
  }

  const namespaceConflict = scopedPlugins.find(
    (plugin) => plugin.dbNamespace === derivedNamespace && plugin.id !== targetRecord?.id,
  );

  if (namespaceConflict) {
    throw new Error(PLUGIN_DB_NAMESPACE_CONFLICT);
  }

  if (requestedNamespace && requestedNamespace !== (targetRecord?.dbNamespace ?? derivedNamespace)) {
    throw new Error(PLUGIN_DB_NAMESPACE_FROZEN);
  }

  if (!targetRecord) {
    const enabled = input.enabled ?? input.forceDefaultEnabledSnapshot ?? parsedManifest.defaultEnabled;
    const killSwitchEnabled = input.killSwitchEnabled ?? false;
    const lifecycleState = resolveInitialPluginLifecycleState(enabled, input.lifecycleState);
    const [record] = await input.tx
      .insert(pluginRegistrations)
      .values({
        schoolId: input.schoolId,
        name: input.name,
        manifestJson: parsedManifest,
        pluginKey,
        dbNamespace: derivedNamespace,
        sourceType,
        installSource: input.installSource,
        enabled,
        killSwitchEnabled,
        lifecycleState,
      })
      .returning();

    await appendPluginLifecycleTransition({
      tx: input.tx,
      pluginId: record.id,
      actorId: input.actorId,
      fromState: null,
      toState: record.lifecycleState,
      reason: "registered",
    });

    return toPluginDTO(record);
  }

  const nextLifecycleState = input.lifecycleState ?? targetRecord.lifecycleState;
  assertPluginLifecycleTransition(targetRecord.lifecycleState, nextLifecycleState);

  const [record] = await input.tx
    .update(pluginRegistrations)
    .set({
      name: input.name,
      manifestJson: parsedManifest,
      pluginKey,
      dbNamespace: targetRecord.dbNamespace,
      sourceType,
      installSource: targetRecord.installSource,
      enabled: input.enabled ?? targetRecord.enabled,
      killSwitchEnabled: input.killSwitchEnabled ?? targetRecord.killSwitchEnabled,
      lifecycleState: nextLifecycleState,
      updatedAt: new Date(),
    })
    .where(and(eq(pluginRegistrations.id, targetRecord.id), eq(pluginRegistrations.schoolId, input.schoolId)))
    .returning();

  if (!record) {
    throw new Error("PLUGIN_NOT_FOUND");
  }
  await appendPluginLifecycleTransition({
    tx: input.tx,
    pluginId: record.id,
    actorId: input.actorId,
    fromState: targetRecord.lifecycleState,
    toState: record.lifecycleState,
    reason: "reconciled",
  });

  return toPluginDTO(record);
}

export async function installOrReconcilePlugin(input: InstallOrReconcilePluginInput) {
  return db.transaction(async (tx) => installOrReconcilePluginWithTx({
    ...input,
    tx,
  }));
}

async function denyHook(input: {
  pluginId: string;
  schoolId: string;
  lifecycleState: PluginLifecycleState;
  killSwitchEnabled: boolean;
  hookAnchor: string;
  action: string;
  payload: Record<string, unknown>;
  actorId: string;
  reason: "kill_switch" | "not_allowlisted" | "school_mismatch" | "permission_denied" | "lifecycle_blocked";
  requiredPermission?: string;
  requestedCapabilities?: readonly string[];
  correlationId: string;
  startedAt: number;
}) {
  await runBestEffortPluginObservation(input.pluginId, "hook-run", () =>
    createHookRun(input.pluginId, input.hookAnchor, "failed", Date.now() - input.startedAt)
  );
  await runBestEffortPluginObservation(input.pluginId, "plugin-audit", () =>
    createPluginAudit({
      pluginId: input.pluginId,
      action: input.action,
      decision: "denied",
      reason: input.reason,
      schoolId: input.schoolId,
      actorScope: "teacher",
      lifecycleState: input.lifecycleState,
      correlationId: input.correlationId,
      payloadJson: {
        ...input.payload,
        denied: true,
        reason: input.reason,
        ...(input.requiredPermission ? { requiredPermission: input.requiredPermission } : {}),
      },
      actorId: input.actorId,
    })
  );
  await runBestEffortPluginObservation(input.pluginId, "governance-audit", () =>
    createGovernanceAudit({
      pluginId: input.pluginId,
      schoolId: input.schoolId,
      action: input.action,
      decision: "denied",
      reason: input.reason,
      actorId: input.actorId,
      actorScope: "teacher",
      lifecycleState: input.lifecycleState,
      killSwitchEnabled: input.killSwitchEnabled,
      requestedCapabilities: input.requestedCapabilities ?? [],
      requiredPermission: input.requiredPermission ?? null,
      correlationId: input.correlationId,
      payloadJson: input.payload,
    })
  );

  return null;
}

export async function registerPluginManifest(input: RegisterPluginManifestInput) {
  return installOrReconcilePlugin({
    ...input,
    installSource: "manual",
  });
}

export function listExternalMarketplaceCatalog() {
  return listExternalMarketplaceCatalogEntries();
}

export async function preflightExternalPluginInstall(input: {
  actorId: string;
  schoolId: string;
  pluginKey: string;
  version: string;
  actorScope?: RuntimeActorScope;
}): Promise<ExternalMarketplaceInstallPreflightResult> {
  await assertMarketplaceManagerScope({ actorId: input.actorId, schoolId: input.schoolId }, input.actorScope);

  const catalogEntry = getExternalMarketplaceCatalogEntry(input.pluginKey, input.version);
  if (!catalogEntry) {
    return {
      ok: false,
      pluginKey: input.pluginKey,
      version: input.version,
      sourceType: "external",
      builtIn: false,
      dbNamespace: deriveDbNamespace(input.pluginKey),
      requestedPermissions: [],
      declaredDataTables: [],
      rejectReason: PLUGIN_MANIFEST_INVALID,
      canRecover: false,
      retainedRegistrationId: null,
    };
  }

  const manifest = parseManifestOrThrow(catalogEntry.manifest);
  const dataModel = parseDataModelOrThrow(catalogEntry.dataModel);
  const dbNamespace = deriveDbNamespace(manifest.id);
  const scopedPlugins = await db.query.pluginRegistrations.findMany({
    where: eq(pluginRegistrations.schoolId, input.schoolId),
  });
  const retainedRegistration = scopedPlugins.find((plugin) =>
    plugin.pluginKey === manifest.id
    && plugin.sourceType === "external"
    && plugin.uninstallRetentionMode === "retain"
    && plugin.uninstalledAt !== null,
  ) ?? null;
  const pluginKeyConflict = scopedPlugins.find((plugin) => plugin.pluginKey === manifest.id && plugin.id !== retainedRegistration?.id);
  const namespaceConflict = scopedPlugins.find((plugin) => plugin.dbNamespace === dbNamespace && plugin.id !== retainedRegistration?.id);

  return {
    ok: !pluginKeyConflict && !namespaceConflict,
    pluginKey: manifest.id,
    version: manifest.version,
    sourceType: "external",
    builtIn: false,
    dbNamespace,
    requestedPermissions: manifest.permissions,
    declaredDataTables: dataModel.tables.map((table) => table.name),
    rejectReason: pluginKeyConflict
      ? PLUGIN_KEY_CONFLICT
      : namespaceConflict
        ? PLUGIN_DB_NAMESPACE_CONFLICT
        : null,
    canRecover: Boolean(retainedRegistration),
    retainedRegistrationId: retainedRegistration?.id ?? null,
  };
}

export async function recoverRetainedPluginInstallWithTx(
  input: RecoverRetainedPluginInstallWithTxInput,
): Promise<RecoverRetainedPluginInstallResult> {
  await assertMarketplaceManagerScope({ actorId: input.actorId, schoolId: input.schoolId }, input.actorScope);

  const catalogEntry = getExternalMarketplaceCatalogEntry(input.pluginKey, input.version);
  if (!catalogEntry) {
    throw new Error(PLUGIN_MANIFEST_INVALID);
  }

  const preflight = await preflightExternalPluginInstall({
    actorId: input.actorId,
    schoolId: input.schoolId,
    pluginKey: input.pluginKey,
    version: input.version,
    actorScope: input.actorScope,
  });

  if (!preflight.canRecover || !preflight.retainedRegistrationId) {
    throw new Error(PLUGIN_RECOVERY_NOT_AVAILABLE);
  }

  const [retainedRegistration] = await input.tx
    .select()
    .from(pluginRegistrations)
    .where(and(
      eq(pluginRegistrations.id, preflight.retainedRegistrationId),
      eq(pluginRegistrations.schoolId, input.schoolId),
    ))
    .limit(1);

  if (!retainedRegistration) {
    throw new Error(PLUGIN_RECOVERY_NOT_AVAILABLE);
  }

  const archivedPluginKey = buildRetainedRecoveryArchivePluginKey(retainedRegistration.pluginKey, retainedRegistration.id);
  const archivedDbNamespace = buildRetainedRecoveryArchiveNamespace(retainedRegistration.dbNamespace, retainedRegistration.id);

  await input.tx
    .update(pluginRegistrations)
    .set({
      pluginKey: archivedPluginKey,
      dbNamespace: archivedDbNamespace,
      enabled: false,
      killSwitchEnabled: false,
      lifecycleState: "disabled",
      uninstallRetentionMode: "retain",
      updatedAt: new Date(),
    })
    .where(and(eq(pluginRegistrations.id, retainedRegistration.id), eq(pluginRegistrations.schoolId, input.schoolId)));

  const newRecord = await installOrReconcilePluginWithTx({
    schoolId: input.schoolId,
    name: catalogEntry.displayName,
    manifestJson: catalogEntry.manifest,
    installSource: "manual",
    tx: input.tx,
    actorId: input.actorId,
    actorScope: input.actorScope,
    commandContext: input.commandContext,
  });

  await Promise.all([
    input.tx
      .update(pluginLessonExtensions)
      .set({ pluginId: newRecord.id, updatedAt: new Date() })
      .where(and(eq(pluginLessonExtensions.schoolId, input.schoolId), eq(pluginLessonExtensions.pluginId, retainedRegistration.id))),
    input.tx
      .update(pluginLessonStepExtensions)
      .set({ pluginId: newRecord.id, updatedAt: new Date() })
      .where(and(eq(pluginLessonStepExtensions.schoolId, input.schoolId), eq(pluginLessonStepExtensions.pluginId, retainedRegistration.id))),
    input.tx
      .update(pluginResourceExtensions)
      .set({ pluginId: newRecord.id, updatedAt: new Date() })
      .where(and(eq(pluginResourceExtensions.schoolId, input.schoolId), eq(pluginResourceExtensions.pluginId, retainedRegistration.id))),
    input.tx
      .update(pluginOwnedBusinessData)
      .set({ pluginId: newRecord.id, updatedAt: new Date() })
      .where(and(eq(pluginOwnedBusinessData.schoolId, input.schoolId), eq(pluginOwnedBusinessData.pluginId, retainedRegistration.id))),
    input.tx
      .update(pluginOwnedQuizQuestions)
      .set({ pluginId: newRecord.id, updatedAt: new Date() })
      .where(and(eq(pluginOwnedQuizQuestions.schoolId, input.schoolId), eq(pluginOwnedQuizQuestions.pluginId, retainedRegistration.id))),
    input.tx
      .update(pluginOwnedQuizResponses)
      .set({ pluginId: newRecord.id, updatedAt: new Date() })
      .where(and(eq(pluginOwnedQuizResponses.schoolId, input.schoolId), eq(pluginOwnedQuizResponses.pluginId, retainedRegistration.id))),
    input.tx
      .update(pluginRegistrations)
      .set({
        enabled: false,
        killSwitchEnabled: false,
        lifecycleState: "disabled",
        uninstallRetentionMode: "retain",
        updatedAt: new Date(),
      })
      .where(and(eq(pluginRegistrations.id, retainedRegistration.id), eq(pluginRegistrations.schoolId, input.schoolId))),
  ]);

  return {
    ...newRecord,
    recoveredFromPluginId: retainedRegistration.id,
    recoveredDataTakeover: true,
  };
}

export async function setPluginEnabled(input: SetPluginEnabledInput) {
  await assertTeacherManagerScope({ actorId: input.actorId, schoolId: input.schoolId });

  const plugin = await db.query.pluginRegistrations.findFirst({
    where: eq(pluginRegistrations.id, input.pluginId),
  });

  if (!plugin || plugin.schoolId !== input.schoolId) {
    throw new Error("PLUGIN_NOT_FOUND");
  }

  const result = await transitionPluginLifecycle({
    actorId: input.actorId,
    schoolId: input.schoolId,
    pluginId: input.pluginId,
    targetState: input.enabled ? "enabled" : "disabled",
    reason: input.enabled ? "enabled" : "disabled",
  });

  let registeredThemeId: string | null = null;

  if (input.enabled) {
    const manifest = PluginManifestSchema.parse(plugin.manifestJson);

    if (manifest.theme) {
      const themeRecord = await registerThemeTokens(plugin.schoolId, `${plugin.name} theme`, manifest.theme, input.actorId);
      registeredThemeId = themeRecord.id;
    }
  }

  return {
    ...result,
    registeredThemeId,
  };
}

export async function setPluginKillSwitch(input: { pluginId: string; actorId: string; killSwitchEnabled: boolean }) {
  return db.transaction(async (tx) => setPluginKillSwitchWithTx({
    ...input,
    tx,
  }));
}

export async function setPluginKillSwitchWithTx(input: SetPluginKillSwitchWithTxInput) {
  assertActorId(input.actorId);

  const plugin = await db.query.pluginRegistrations.findFirst({
    where: eq(pluginRegistrations.id, input.pluginId),
  });

  if (!plugin) {
    throw new Error("PLUGIN_NOT_FOUND");
  }

  await assertTeacherManagerScope({ actorId: input.actorId, schoolId: plugin.schoolId }, input.actorScope);

  let targetState: PluginLifecycleState = plugin.lifecycleState;

  if (input.killSwitchEnabled) {
    targetState = "suspended";
  } else if (plugin.lifecycleState === "suspended") {
    const lastTransition = await db.query.pluginLifecycleTransitions.findFirst({
      where: and(
        eq(pluginLifecycleTransitions.pluginId, plugin.id),
        eq(pluginLifecycleTransitions.toState, "suspended")
      ),
      orderBy: [desc(pluginLifecycleTransitions.createdAt)],
    });

    if (lastTransition && lastTransition.fromState && isRunnablePluginState(lastTransition.fromState as PluginLifecycleState)) {
      targetState = lastTransition.fromState as PluginLifecycleState;
    } else {
      targetState = "enabled";
    }
  }

  if (targetState !== plugin.lifecycleState) {
    assertPluginLifecycleTransition(plugin.lifecycleState, targetState);
  }

  const [record] = await input.tx
    .update(pluginRegistrations)
    .set({
      killSwitchEnabled: input.killSwitchEnabled,
      enabled: isRunnablePluginState(targetState),
      lifecycleState: targetState,
      updatedAt: new Date(),
    })
    .where(eq(pluginRegistrations.id, input.pluginId))
    .returning();

  if (!record) {
    throw new Error("PLUGIN_NOT_FOUND");
  }

  if (record.lifecycleState !== plugin.lifecycleState) {
    await appendPluginLifecycleTransition({
      tx: input.tx,
      pluginId: record.id,
      actorId: input.actorId,
      fromState: plugin.lifecycleState,
      toState: record.lifecycleState,
      reason: input.killSwitchEnabled ? "kill-switch-enabled" : "kill-switch-disabled",
    });
  }

  return toPluginDTO(record);
}

export async function listPluginsForSchool(input: PluginManagerScopeInput) {
  await assertTeacherManagerScope(input);

  const rows = await db.query.pluginRegistrations.findMany({
    where: eq(pluginRegistrations.schoolId, input.schoolId),
  });

  return rows.map(toPluginDTO);
}

export async function listPluginsForMarketplace(input: PluginManagerScopeInput & { actorScope?: RuntimeActorScope }) {
  await assertMarketplaceManagerScope(input, input.actorScope);

  const rows = await db.query.pluginRegistrations.findMany({
    where: eq(pluginRegistrations.schoolId, input.schoolId),
  });

  return rows.map(toPluginDTO);
}

export async function getPluginForSchool(input: PluginBySchoolInput) {
  await assertTeacherManagerScope({ actorId: input.actorId, schoolId: input.schoolId });

  const row = await db.query.pluginRegistrations.findFirst({
    where: and(eq(pluginRegistrations.id, input.pluginId), eq(pluginRegistrations.schoolId, input.schoolId)),
  });

  return row ? toPluginDTO(row) : null;
}

export async function getPluginForMarketplace(input: PluginBySchoolInput & { actorScope?: RuntimeActorScope }) {
  await assertMarketplaceManagerScope({ actorId: input.actorId, schoolId: input.schoolId }, input.actorScope);

  const row = await db.query.pluginRegistrations.findFirst({
    where: and(eq(pluginRegistrations.id, input.pluginId), eq(pluginRegistrations.schoolId, input.schoolId)),
  });

  return row ? toPluginDTO(row) : null;
}

export async function transitionPluginLifecycleWithTx(input: TransitionPluginLifecycleWithTxInput) {
  await assertTeacherManagerScope({ actorId: input.actorId, schoolId: input.schoolId }, input.actorScope);

  const plugin = await db.query.pluginRegistrations.findFirst({
    where: and(eq(pluginRegistrations.id, input.pluginId), eq(pluginRegistrations.schoolId, input.schoolId)),
  });

  if (!plugin) {
    throw new Error("PLUGIN_NOT_FOUND");
  }

  assertPluginLifecycleTransition(plugin.lifecycleState, input.targetState);

  const manifest = PluginManifestSchema.parse(plugin.manifestJson);
  const correlationId = input.commandContext?.correlationId ?? `${plugin.id}:lifecycle:${input.targetState}:${Date.now()}`;

  const [updated] = await input.tx
      .update(pluginRegistrations)
      .set({
        lifecycleState: input.targetState,
        enabled: isRunnablePluginState(input.targetState),
        killSwitchEnabled: input.targetState === "suspended",
        updatedAt: new Date(),
      })
      .where(and(eq(pluginRegistrations.id, input.pluginId), eq(pluginRegistrations.schoolId, input.schoolId)))
      .returning();

    if (!updated) {
      throw new Error("PLUGIN_NOT_FOUND");
    }

  if (!updated) {
    throw new Error("PLUGIN_NOT_FOUND");
  }

  await appendPluginLifecycleTransition({
    tx: input.tx,
    pluginId: plugin.id,
    actorId: input.actorId,
    fromState: plugin.lifecycleState,
    toState: input.targetState,
    reason: input.reason,
  });

  await createPluginAudit({
    tx: input.tx,
    pluginId: plugin.id,
    action: "plugin.lifecycle.transition",
    decision: "allowed",
    reason: null,
    schoolId: plugin.schoolId,
    actorScope: "teacher",
    lifecycleState: input.targetState,
    correlationId,
    commandId: input.commandContext?.commandId ?? null,
    payloadJson: {
      fromState: plugin.lifecycleState,
      toState: input.targetState,
      reason: input.reason,
      sourceType: plugin.sourceType,
      attemptNumber: input.commandContext?.attemptNumber ?? null,
    },
    actorId: input.actorId,
  });

  await createGovernanceAudit({
    tx: input.tx,
    pluginId: plugin.id,
    schoolId: plugin.schoolId,
    action: "plugin.lifecycle.transition",
    decision: "allowed",
    reason: null,
    actorId: input.actorId,
    actorScope: "teacher",
    lifecycleState: input.targetState,
    killSwitchEnabled: updated.killSwitchEnabled,
    requestedCapabilities: manifest.governance?.requestedCapabilities ?? [],
    requiredPermission: null,
    correlationId,
    commandId: input.commandContext?.commandId ?? null,
    payloadJson: {
      fromState: plugin.lifecycleState,
      toState: input.targetState,
      reason: input.reason,
      attemptNumber: input.commandContext?.attemptNumber ?? null,
    },
  });

  return toPluginDTO(updated);
}

export async function transitionPluginLifecycle(input: TransitionPluginLifecycleInput) {
  return db.transaction(async (tx) => transitionPluginLifecycleWithTx({
    ...input,
    tx,
  }));
}

export async function preflightUninstallPluginWithTx(input: PreflightUninstallPluginWithTxInput): Promise<PreflightUninstallPluginResult | null> {
  await assertMarketplaceManagerScope({ actorId: input.actorId, schoolId: input.schoolId }, input.actorScope);

  const plugin = await db.query.pluginRegistrations.findFirst({
    where: and(eq(pluginRegistrations.id, input.pluginId), eq(pluginRegistrations.schoolId, input.schoolId)),
  });

  if (!plugin) {
    return null;
  }

  const blockedReason = getPluginUninstallBlockReason(plugin);

  if (blockedReason) {
    return {
      pluginId: plugin.id,
      schoolId: plugin.schoolId,
      blocked: true,
      reason: blockedReason,
      lessonExtCount: 0,
      stepExtCount: 0,
      resourceExtCount: 0,
      ownedBusinessCount: 0,
      ownedQuestionCount: 0,
      ownedResponseCount: 0,
      affectedEndedSessionCount: 0,
      totalCount: 0,
      impactedLessonIds: [],
      impactedLessonStepIds: [],
      impactedResourceIds: [],
      impactedBusinessKeys: [],
      activeSessions: [],
      cleanupConfirmationToken: buildCleanupConfirmationToken({
        pluginId: plugin.id,
        lessonExtCount: 0,
        stepExtCount: 0,
        resourceExtCount: 0,
        ownedBusinessCount: 0,
        ownedQuestionCount: 0,
        ownedResponseCount: 0,
        affectedEndedSessionCount: 0,
        totalCount: 0,
      }),
    };
  }

  const [lessonExtensions, stepExtensions, resourceExtensions, ownedBusiness, ownedQuestions, ownedResponses, activeSessions] = await Promise.all([
    db
      .select({ lessonId: pluginLessonExtensions.lessonId })
      .from(pluginLessonExtensions)
      .where(and(eq(pluginLessonExtensions.schoolId, input.schoolId), eq(pluginLessonExtensions.pluginId, input.pluginId))),
    db
      .select({ lessonStepId: pluginLessonStepExtensions.lessonStepId })
      .from(pluginLessonStepExtensions)
      .where(and(eq(pluginLessonStepExtensions.schoolId, input.schoolId), eq(pluginLessonStepExtensions.pluginId, input.pluginId))),
    db
      .select({ resourceId: pluginResourceExtensions.resourceId })
      .from(pluginResourceExtensions)
      .where(and(eq(pluginResourceExtensions.schoolId, input.schoolId), eq(pluginResourceExtensions.pluginId, input.pluginId))),
    db
      .select({ key: pluginOwnedBusinessData.key })
      .from(pluginOwnedBusinessData)
      .where(and(eq(pluginOwnedBusinessData.schoolId, input.schoolId), eq(pluginOwnedBusinessData.pluginId, input.pluginId))),
    db
      .select({ classroomSession: pluginOwnedQuizQuestions.classroomSession })
      .from(pluginOwnedQuizQuestions)
      .where(and(eq(pluginOwnedQuizQuestions.schoolId, input.schoolId), eq(pluginOwnedQuizQuestions.pluginId, input.pluginId))),
    db
      .select({ classroomSession: pluginOwnedQuizResponses.classroomSession, isLatest: pluginOwnedQuizResponses.isLatest, student: pluginOwnedQuizResponses.student, question: pluginOwnedQuizResponses.question, selectedOption: pluginOwnedQuizResponses.selectedOption })
      .from(pluginOwnedQuizResponses)
      .where(and(eq(pluginOwnedQuizResponses.schoolId, input.schoolId), eq(pluginOwnedQuizResponses.pluginId, input.pluginId))),
    listPluginActiveSessions({ schoolId: input.schoolId, pluginId: input.pluginId }),
  ]);

  const lessonExtCount = lessonExtensions.length;
  const stepExtCount = stepExtensions.length;
  const resourceExtCount = resourceExtensions.length;
  const ownedBusinessCount = ownedBusiness.length;
  const ownedQuestionCount = ownedQuestions.length;
  const ownedResponseCount = ownedResponses.length;
  const affectedEndedSessionCount = new Set([
    ...ownedQuestions.map((row) => row.classroomSession),
    ...ownedResponses.map((row) => row.classroomSession),
  ]).size - activeSessions.length;
  const totalCount = lessonExtCount + stepExtCount + resourceExtCount + ownedBusinessCount + ownedQuestionCount + ownedResponseCount;

  return {
    pluginId: plugin.id,
    schoolId: plugin.schoolId,
    blocked: activeSessions.length > 0,
    reason: activeSessions.length > 0 ? "PLUGIN_ACTIVE_CLASSROOM_BLOCKED" : null,
    lessonExtCount,
    stepExtCount,
    resourceExtCount,
    ownedBusinessCount,
    ownedQuestionCount,
    ownedResponseCount,
    affectedEndedSessionCount: Math.max(affectedEndedSessionCount, 0),
    totalCount,
    impactedLessonIds: lessonExtensions.map((row) => row.lessonId),
    impactedLessonStepIds: stepExtensions.map((row) => row.lessonStepId),
    impactedResourceIds: resourceExtensions.map((row) => row.resourceId),
    impactedBusinessKeys: ownedBusiness.map((row) => row.key),
    activeSessions,
    cleanupConfirmationToken: buildCleanupConfirmationToken({
      pluginId: plugin.id,
      lessonExtCount,
      stepExtCount,
      resourceExtCount,
      ownedBusinessCount,
      ownedQuestionCount,
      ownedResponseCount,
      affectedEndedSessionCount: Math.max(affectedEndedSessionCount, 0),
      totalCount,
    }),
  };
}

export async function preflightUninstallPlugin(input: PluginBySchoolInput): Promise<PreflightUninstallPluginResult | null> {
  return db.transaction(async (tx) => preflightUninstallPluginWithTx({
    ...input,
    tx,
  }));
}

export async function uninstallPluginWithTx(input: UninstallPluginWithTxInput) {
  await assertMarketplaceManagerScope({ actorId: input.actorId, schoolId: input.schoolId }, input.actorScope);

  const plugin = await db.query.pluginRegistrations.findFirst({
    where: and(eq(pluginRegistrations.id, input.pluginId), eq(pluginRegistrations.schoolId, input.schoolId)),
  });

  if (!plugin) {
    return null;
  }

  const blockedReason = getPluginUninstallBlockReason(plugin);
  if (blockedReason) {
    throw new Error(blockedReason);
  }

  const retentionMode = input.retentionMode ?? "retain";
  const preflight = await preflightUninstallPluginWithTx({
    actorId: input.actorId,
    schoolId: input.schoolId,
    pluginId: input.pluginId,
    tx: input.tx,
    commandContext: input.commandContext,
    actorScope: input.actorScope,
  });

  if (!preflight) {
    return null;
  }

  if (preflight.blocked) {
    throw new Error(preflight.reason ?? "PLUGIN_UNINSTALL_BLOCKED");
  }

  const manifest = PluginManifestSchema.parse(plugin.manifestJson);
  const correlationId = input.commandContext?.correlationId ?? `${plugin.id}:uninstall:${Date.now()}`;
  if (retentionMode === "cleanup") {
    if (input.confirmationToken !== preflight.cleanupConfirmationToken) {
      await createGovernanceAudit({
        tx: input.tx,
        pluginId: plugin.id,
        schoolId: plugin.schoolId,
        action: "plugin.uninstall",
        decision: "denied",
        reason: "cleanup_confirmation_required",
        actorId: input.actorId,
        actorScope: input.actorScope ?? "teacher",
        lifecycleState: plugin.lifecycleState,
        killSwitchEnabled: plugin.killSwitchEnabled,
        requestedCapabilities: manifest.governance?.requestedCapabilities ?? [],
        requiredPermission: null,
        correlationId,
        commandId: input.commandContext?.commandId ?? null,
        payloadJson: {
          pluginKey: plugin.pluginKey,
          sourceType: plugin.sourceType,
          dbNamespace: plugin.dbNamespace,
          lifecycleState: plugin.lifecycleState,
          retentionMode,
          confirmationToken: input.confirmationToken ?? null,
          expectedConfirmationToken: preflight.cleanupConfirmationToken,
          attemptNumber: input.commandContext?.attemptNumber ?? null,
        },
      });
      throw new Error("PLUGIN_CLEANUP_CONFIRMATION_REQUIRED");
    }

    await createGovernanceAudit({
      tx: input.tx,
      pluginId: plugin.id,
      schoolId: plugin.schoolId,
      action: "plugin.uninstall",
      decision: "allowed",
      reason: null,
      actorId: input.actorId,
      actorScope: input.actorScope ?? "teacher",
      lifecycleState: plugin.lifecycleState,
      killSwitchEnabled: plugin.killSwitchEnabled,
      requestedCapabilities: manifest.governance?.requestedCapabilities ?? [],
      requiredPermission: null,
      correlationId,
      commandId: input.commandContext?.commandId ?? null,
      payloadJson: {
        pluginKey: plugin.pluginKey,
        sourceType: plugin.sourceType,
        dbNamespace: plugin.dbNamespace,
        lifecycleState: plugin.lifecycleState,
        retentionMode,
        confirmationToken: input.confirmationToken ?? null,
        attemptNumber: input.commandContext?.attemptNumber ?? null,
      },
    });

    const [deleted] = await input.tx
      .delete(pluginRegistrations)
      .where(and(eq(pluginRegistrations.id, input.pluginId), eq(pluginRegistrations.schoolId, input.schoolId)))
      .returning();

    return deleted ?? null;
  }

  await createGovernanceAudit({
    tx: input.tx,
    pluginId: plugin.id,
    schoolId: plugin.schoolId,
    action: "plugin.uninstall",
    decision: "allowed",
    reason: null,
    actorId: input.actorId,
    actorScope: input.actorScope ?? "teacher",
    lifecycleState: plugin.lifecycleState,
    killSwitchEnabled: plugin.killSwitchEnabled,
    requestedCapabilities: manifest.governance?.requestedCapabilities ?? [],
    requiredPermission: null,
    correlationId,
    commandId: input.commandContext?.commandId ?? null,
    payloadJson: {
      pluginKey: plugin.pluginKey,
      sourceType: plugin.sourceType,
      dbNamespace: plugin.dbNamespace,
      lifecycleState: plugin.lifecycleState,
      retentionMode,
      confirmationToken: input.confirmationToken ?? null,
      attemptNumber: input.commandContext?.attemptNumber ?? null,
    },
  });

  const [updated] = await input.tx
    .update(pluginRegistrations)
    .set({
      enabled: false,
      killSwitchEnabled: false,
      lifecycleState: "disabled",
      uninstalledAt: new Date(),
      uninstallRetentionMode: "retain",
      updatedAt: new Date(),
    })
    .where(and(eq(pluginRegistrations.id, input.pluginId), eq(pluginRegistrations.schoolId, input.schoolId)))
    .returning();

  if (!updated) {
    throw new Error("PLUGIN_NOT_FOUND");
  }

  await appendPluginLifecycleTransition({
    tx: input.tx,
    pluginId: plugin.id,
    actorId: input.actorId,
    fromState: plugin.lifecycleState,
    toState: "disabled",
    reason: "uninstalled:retain",
  });

  return updated;
}

export async function uninstallPlugin(input: PluginBySchoolInput) {
  const record = await db.transaction(async (tx) => uninstallPluginWithTx({ ...input, tx }));

  return record ? toPluginDTO(record) : null;
}

export async function deletePluginForSchool(input: PluginBySchoolInput) {
  return uninstallPlugin(input);
}

export async function getEnabledPluginsForAnchor(input: EnabledPluginsForAnchorInput) {
  assertActorId(input.actorId);

  const hasMembership = await hasActiveSchoolMembership(input.actorId, input.schoolId);
  if (!hasMembership) {
    throw new Error("PLUGIN_SCOPE_REQUIRED");
  }

  const rows = await db.query.pluginRegistrations.findMany({
    where: and(
      eq(pluginRegistrations.schoolId, input.schoolId),
      eq(pluginRegistrations.enabled, true),
      eq(pluginRegistrations.killSwitchEnabled, false),
      inArray(pluginRegistrations.lifecycleState, [...ACTIVE_PLUGIN_STATES]),
    ),
  });

  return rows
    .map(toPluginDTO)
    .filter((plugin) => plugin.manifestJson.anchors.includes(input.hookAnchor));
}

export async function runPluginHook(input: RunPluginHookInput) {
  assertActorId(input.actorId);

  const startedAt = Date.now();
  const plugin = await db.query.pluginRegistrations.findFirst({
    where: eq(pluginRegistrations.id, input.pluginId),
  });

  if (!plugin) {
    return null;
  }

  if (!plugin.enabled || !isRunnablePluginState(plugin.lifecycleState)) {
    return denyHook({
      pluginId: plugin.id,
      schoolId: plugin.schoolId,
      lifecycleState: plugin.lifecycleState,
      killSwitchEnabled: plugin.killSwitchEnabled,
      hookAnchor: input.hookAnchor,
      action: input.input.action,
      payload: input.input.payload,
      actorId: input.actorId,
      reason: "lifecycle_blocked",
      correlationId: `${plugin.id}:${input.input.action}:${startedAt}`,
      startedAt,
    });
  }

  if (plugin.killSwitchEnabled) {
    return denyHook({
      pluginId: plugin.id,
      schoolId: plugin.schoolId,
      lifecycleState: plugin.lifecycleState,
      killSwitchEnabled: plugin.killSwitchEnabled,
      hookAnchor: input.hookAnchor,
      action: input.input.action,
      payload: input.input.payload,
      actorId: input.actorId,
      reason: "kill_switch",
      correlationId: `${plugin.id}:${input.input.action}:${startedAt}`,
      startedAt,
    });
  }

  if (plugin.schoolId !== input.schoolId) {
    return denyHook({
      pluginId: plugin.id,
      schoolId: plugin.schoolId,
      lifecycleState: plugin.lifecycleState,
      killSwitchEnabled: plugin.killSwitchEnabled,
      hookAnchor: input.hookAnchor,
      action: input.input.action,
      payload: input.input.payload,
      actorId: input.actorId,
      reason: "school_mismatch",
      correlationId: `${plugin.id}:${input.input.action}:${startedAt}`,
      startedAt,
    });
  }

  const hasMembership = await hasActiveSchoolMembership(input.actorId, plugin.schoolId);
  if (!hasMembership) {
    return denyHook({
      pluginId: plugin.id,
      schoolId: plugin.schoolId,
      lifecycleState: plugin.lifecycleState,
      killSwitchEnabled: plugin.killSwitchEnabled,
      hookAnchor: input.hookAnchor,
      action: input.input.action,
      payload: input.input.payload,
      actorId: input.actorId,
      reason: "school_mismatch",
      correlationId: `${plugin.id}:${input.input.action}:${startedAt}`,
      startedAt,
    });
  }

  const manifest = PluginManifestSchema.parse(plugin.manifestJson);

  if (!isRunnablePluginState(plugin.lifecycleState)) {
    return denyHook({
      pluginId: plugin.id,
      schoolId: plugin.schoolId,
      lifecycleState: plugin.lifecycleState,
      killSwitchEnabled: plugin.killSwitchEnabled,
      hookAnchor: input.hookAnchor,
      action: input.input.action,
      payload: input.input.payload,
      actorId: input.actorId,
      reason: "lifecycle_blocked",
      requestedCapabilities: manifest.governance?.requestedCapabilities ?? [],
      correlationId: `${plugin.id}:${input.input.action}:${startedAt}`,
      startedAt,
    });
  }

  if (!manifest.anchors.includes(input.hookAnchor) || !manifest.actions.includes(input.input.action)) {
    return denyHook({
      pluginId: plugin.id,
      schoolId: plugin.schoolId,
      lifecycleState: plugin.lifecycleState,
      killSwitchEnabled: plugin.killSwitchEnabled,
      hookAnchor: input.hookAnchor,
      action: input.input.action,
      payload: input.input.payload,
      actorId: input.actorId,
      reason: "not_allowlisted",
      requestedCapabilities: manifest.governance?.requestedCapabilities ?? [],
      correlationId: `${plugin.id}:${input.input.action}:${startedAt}`,
      startedAt,
    });
  }

  const requiredPermission = PLUGIN_ACTION_PERMISSION_REQUIREMENTS[input.input.action];
  if (!manifest.permissions.includes(requiredPermission)) {
    return denyHook({
      pluginId: plugin.id,
      schoolId: plugin.schoolId,
      lifecycleState: plugin.lifecycleState,
      killSwitchEnabled: plugin.killSwitchEnabled,
      hookAnchor: input.hookAnchor,
      action: input.input.action,
      payload: input.input.payload,
      actorId: input.actorId,
      reason: "permission_denied",
      requiredPermission,
      requestedCapabilities: manifest.governance?.requestedCapabilities ?? [],
      correlationId: `${plugin.id}:${input.input.action}:${startedAt}`,
      startedAt,
    });
  }

  const actionInput: PluginActionInput = manifest.builtIn
    ? {
        ...input.input,
        payload: {
          ...input.input.payload,
          pluginName: plugin.name,
          pluginKey: plugin.pluginKey,
        },
      }
    : input.input;

  const result = dispatchPluginAction(actionInput);

  await runBestEffortPluginObservation(plugin.id, "hook-run", () =>
    createHookRun(plugin.id, input.hookAnchor, "success", Date.now() - startedAt)
  );
  const correlationId = `${plugin.id}:${input.input.action}:${startedAt}`;
  await runBestEffortPluginObservation(plugin.id, "plugin-audit", () =>
    createPluginAudit({
      pluginId: plugin.id,
      action: input.input.action,
      decision: "allowed",
      schoolId: plugin.schoolId,
      actorScope: "teacher",
      lifecycleState: plugin.lifecycleState,
      correlationId,
      payloadJson: {
        ...input.input.payload,
        result,
      },
      actorId: input.actorId,
    })
  );
  await runBestEffortPluginObservation(plugin.id, "governance-audit", () =>
    createGovernanceAudit({
      pluginId: plugin.id,
      schoolId: plugin.schoolId,
      action: input.input.action,
      decision: "allowed",
      actorId: input.actorId,
      actorScope: "teacher",
      lifecycleState: plugin.lifecycleState,
      killSwitchEnabled: plugin.killSwitchEnabled,
      requestedCapabilities: manifest.governance?.requestedCapabilities ?? [],
      requiredPermission,
      correlationId,
      payloadJson: {
        ...input.input.payload,
        result,
      },
    })
  );

  return result;
}

const BUILT_IN_TEMPLATE_ACTION = "insertBuiltInTeachingStepTemplate" as const;
const VOTING_TEMPLATE_PLUGIN_KEY = "builtin-teaching-step-classroom-voting" as const;

function canResolveBuiltInTemplate(plugin: PluginRegistrationDTO) {
  return plugin.builtIn
    && plugin.enabled
    && !plugin.killSwitchEnabled
    && isRunnablePluginState(plugin.lifecycleState)
    && plugin.manifestJson.actions.includes(BUILT_IN_TEMPLATE_ACTION);
}

function isBuiltInTemplateCompatible(plugin: PluginRegistrationDTO) {
  if (!canResolveBuiltInTemplate(plugin)) {
    return false;
  }

  if (plugin.pluginKey !== VOTING_TEMPLATE_PLUGIN_KEY) {
    return true;
  }

  return plugin.manifestJson.manifestVersion === 2
    && plugin.manifestJson.governance?.contractVersion === RUNTIME_CONTRACT_VERSION;
}

export async function listBuiltInTeachingStepTemplates(input: PluginManagerScopeInput) {
  const plugins = await listPluginsForSchool(input);

  const templates = await Promise.all(
    plugins.filter(isBuiltInTemplateCompatible).map(async (plugin) => {
      const result = await runPluginHook({
        actorId: input.actorId,
        pluginId: plugin.id,
        schoolId: input.schoolId,
        hookAnchor: "lesson.sidebar",
        input: {
          pluginId: plugin.id,
          action: BUILT_IN_TEMPLATE_ACTION,
          payload: {},
        },
      });

      if (!result || result.proposalType !== "builtInTeachingStepTemplate") {
        return null;
      }

      return {
        id: plugin.id,
        pluginId: plugin.id,
        ...result.payload,
      };
    }),
  );

  return templates.filter((template): template is NonNullable<typeof template> => Boolean(template));
}

export async function getBuiltInTeachingStepTemplateForSchool(input: PluginBySchoolInput) {
  const plugin = await getPluginForSchool(input);
  if (!plugin || !isBuiltInTemplateCompatible(plugin)) {
    return null;
  }

  const result = await runPluginHook({
    actorId: input.actorId,
    pluginId: plugin.id,
    schoolId: input.schoolId,
    hookAnchor: "lesson.sidebar",
    input: {
      pluginId: plugin.id,
      action: BUILT_IN_TEMPLATE_ACTION,
      payload: {},
    },
  });

  if (!result || result.proposalType !== "builtInTeachingStepTemplate") {
    return null;
  }

  return result.payload;
}

export async function listBuiltInTeachingStepSuggestions(input: PluginManagerScopeInput) {
  const templates = await listBuiltInTeachingStepTemplates(input);

  return templates.map((template) => ({
    pluginId: template.pluginId,
    pluginName: template.pluginName,
    builtInKey: template.builtInKey,
    title: template.title,
    summary: template.summary,
    stepType: template.stepType,
  }));
}

export type BuiltInTeachingStepTemplateResult = Awaited<ReturnType<typeof getBuiltInTeachingStepTemplateForSchool>>;
export type BuiltInTeachingStepSuggestionResult = Awaited<ReturnType<typeof listBuiltInTeachingStepSuggestions>>[number];
export type PluginHookResult = PluginActionResult;

/**
 * Plugin identity metadata schema for operations and administration audits.
 */
export type PluginIdentityMetadata = {
  id: string;
  schoolId: string;
  name: string;
  pluginKey: string;
  dbNamespace: string;
  sourceType: "default" | "external";
  installSource: "manual" | "bootstrap" | "repair" | "seed";
  enabled: boolean;
  killSwitchEnabled: boolean;
  lifecycleState: PluginLifecycleState;
};

/**
 * Lists all registered plugins for a school with complete identity and namespace metadata,
 * protected by standard teacher manager scope authorization check.
 *
 * Args:
 *   input: The scope identification including actorId and schoolId.
 *
 * Returns:
 *   A promise that resolves to an array of plugin identity metadata objects.
 */
export async function getPluginIdentityMetadataForSchool(
  input: PluginManagerScopeInput
): Promise<PluginIdentityMetadata[]> {
  await assertTeacherManagerScope(input);

  const rows = await db.query.pluginRegistrations.findMany({
    where: eq(pluginRegistrations.schoolId, input.schoolId),
  });

  return rows.map((row) => ({
    id: row.id,
    schoolId: row.schoolId,
    name: row.name,
    pluginKey: row.pluginKey,
    dbNamespace: row.dbNamespace,
    sourceType: row.sourceType as "default" | "external",
    installSource: row.installSource as "manual" | "bootstrap" | "repair" | "seed",
    enabled: row.enabled,
    killSwitchEnabled: row.killSwitchEnabled,
    lifecycleState: row.lifecycleState,
  }));
}
