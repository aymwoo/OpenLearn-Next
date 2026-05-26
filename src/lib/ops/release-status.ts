import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { getAsyncTaskOperatorOverviewDTO } from "@/lib/dal/async-task-operator";
import { getSystemTransportSettings } from "@/lib/dal/system-transport-settings";
import { getServerEnv } from "@/lib/ops/env.server";

type Posture = "green" | "degraded" | "failed";

type ReadyComponent = {
  posture: Posture;
  blocking: boolean;
  reason: string;
  nextStep: string;
};

type CorrelationDimensionKey =
  | "schoolId"
  | "classroomSessionId"
  | "lessonVersionId"
  | "pluginId"
  | "actionKey"
  | "commandId"
  | "taskId";

type ReleaseManifestCorrelationEntry =
  | string
  | {
      id?: string | null;
      href?: string | null;
      hrefTemplate?: string | null;
    }
  | null;

type ReleaseManifest = {
  releaseId: string;
  gitSha: string;
  environment: string;
  releasedAt: string | null;
  rollbackTarget: string | null;
  manifestPath: string | null;
  migration?: Record<string, unknown> | null;
  restoreDrill?: Record<string, unknown> | null;
  operatorCorrelation?: Partial<Record<CorrelationDimensionKey, ReleaseManifestCorrelationEntry>> | null;
};

type CorrelationDimension = {
  id: string | null;
  href: string | null;
  hrefTemplate: string | null;
};

const CORRELATION_BUILDERS: Record<
  CorrelationDimensionKey,
  (id: string | null) => CorrelationDimension
> = {
  schoolId: (id) => ({ id, href: null, hrefTemplate: null }),
  classroomSessionId: (id) => ({
    id,
    href: id ? `/settings/labs/incidents/${encodeURIComponent(id)}` : null,
    hrefTemplate: "/settings/labs/incidents/[sessionId]",
  }),
  lessonVersionId: (id) => ({ id, href: null, hrefTemplate: null }),
  pluginId: (id) => ({
    id,
    href: id ? `/settings/labs/plugins/${encodeURIComponent(id)}` : null,
    hrefTemplate: "/settings/labs/plugins/[pluginId]",
  }),
  actionKey: (id) => ({
    id,
    href: null,
    hrefTemplate: "/settings/labs/plugins/[pluginId]/actions/[actionKey]",
  }),
  commandId: (id) => ({
    id,
    href: id ? `/settings/labs/commands/${encodeURIComponent(id)}` : null,
    hrefTemplate: "/settings/labs/commands/[commandId]",
  }),
  taskId: (id) => ({
    id,
    href: id ? `/settings/labs/async-tasks/${encodeURIComponent(id)}` : null,
    hrefTemplate: "/settings/labs/async-tasks/[taskId]",
  }),
};

function nowIso() {
  return new Date().toISOString();
}

function toPosture(input: { ok: boolean; degraded?: boolean }): Posture {
  if (input.ok) {
    return "green";
  }

  return input.degraded ? "degraded" : "failed";
}

async function readManifestPointer(
  manifestsDir: string,
  pointerFile: "current.json" | "green.json",
): Promise<ReleaseManifest | null> {
  const pointerPath = path.join(manifestsDir, pointerFile);

  try {
    const raw = await readFile(pointerPath, "utf8");
    return JSON.parse(raw) as ReleaseManifest;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      return null;
    }

    throw error;
  }
}

function buildOperatorCorrelation(
  correlation: ReleaseManifest["operatorCorrelation"],
) {
  const readCorrelationEntry = (value: ReleaseManifestCorrelationEntry) => {
    if (typeof value === "string") {
      return {
        id: value,
        href: null,
        hrefTemplate: null,
      };
    }

    return {
      id: value?.id ?? null,
      href: value?.href ?? null,
      hrefTemplate: value?.hrefTemplate ?? null,
    };
  };

  const buildDimension = (
    key: CorrelationDimensionKey,
    value: ReleaseManifestCorrelationEntry,
  ) => {
    const entry = readCorrelationEntry(value);
    const fallback = CORRELATION_BUILDERS[key](entry.id);

    return {
      id: entry.id,
      href: entry.href ?? fallback.href,
      hrefTemplate: entry.hrefTemplate ?? fallback.hrefTemplate,
    };
  };

  const normalized: {
    schoolId: CorrelationDimension;
    classroomSessionId: CorrelationDimension;
    lessonVersionId: CorrelationDimension;
    pluginId: CorrelationDimension;
    actionKey: CorrelationDimension;
    commandId: CorrelationDimension;
    taskId: CorrelationDimension;
    runtimeInspector: { href: string | null; hrefTemplate: string | null };
    pluginActionDetail: { href: string | null; hrefTemplate: string | null };
  } = {
    schoolId: buildDimension("schoolId", correlation?.schoolId ?? null),
    classroomSessionId: buildDimension("classroomSessionId", correlation?.classroomSessionId ?? null),
    lessonVersionId: buildDimension("lessonVersionId", correlation?.lessonVersionId ?? null),
    pluginId: buildDimension("pluginId", correlation?.pluginId ?? null),
    actionKey: buildDimension("actionKey", correlation?.actionKey ?? null),
    commandId: buildDimension("commandId", correlation?.commandId ?? null),
    taskId: buildDimension("taskId", correlation?.taskId ?? null),
    runtimeInspector: {
      href: null,
      hrefTemplate: "/settings/labs/runtime-inspector?runtimeSessionId={classroomSessionId}",
    },
    pluginActionDetail: {
      href: null,
      hrefTemplate: "/settings/labs/plugins/[pluginId]/actions/[actionKey]",
    },
  };

  const classroomSessionId = normalized.classroomSessionId.id;
  const pluginId = normalized.pluginId.id;
  const actionKey = normalized.actionKey.id;

  normalized.runtimeInspector.href = classroomSessionId
    ? `/settings/labs/runtime-inspector?runtimeSessionId=${encodeURIComponent(classroomSessionId)}`
    : null;

  normalized.pluginActionDetail.href = pluginId && actionKey
    ? `/settings/labs/plugins/${encodeURIComponent(pluginId)}/actions/${encodeURIComponent(actionKey)}`
    : null;

  const complete = Object.values({
    schoolId: normalized.schoolId.id,
    classroomSessionId: normalized.classroomSessionId.id,
    lessonVersionId: normalized.lessonVersionId.id,
    pluginId: normalized.pluginId.id,
    actionKey: normalized.actionKey.id,
    commandId: normalized.commandId.id,
    taskId: normalized.taskId.id,
  }).every((value) => typeof value === "string" && value.length > 0);

  return { normalized, complete };
}

function sanitizeRelease(release: ReleaseManifest | null) {
  if (!release) {
    return null;
  }

  return {
    releaseId: release.releaseId,
    gitSha: release.gitSha,
    environment: release.environment,
    releasedAt: release.releasedAt ?? null,
    rollbackTarget: release.rollbackTarget ?? null,
    manifestPath: release.manifestPath ?? null,
  };
}

export async function getHealthPayload() {
  return {
    kind: "health" as const,
    ok: true,
    process: "alive" as const,
    checkedAt: nowIso(),
  };
}

export async function getReadyPayload() {
  const env = getServerEnv();
  const [workerOverview, transport] = await Promise.all([
    getAsyncTaskOperatorOverviewDTO(),
    getSystemTransportSettings(),
  ]);

  const dbOk = Boolean(env.DB_FILE_NAME && env.DB_FILE_NAME.trim().length > 0);
  const webOk = Boolean(env.OPENLEARN_DEPLOY_ENV && env.OPENLEARN_HEALTHCHECK_BASE_URL);
  const workerOk = workerOverview.platformHealth.workerState === "ready";
  const fanoutOk = !transport.degraded && transport.health.connectionState === "ready";

  const components: Record<"db" | "web" | "worker" | "fanout", ReadyComponent> = {
    db: {
      posture: toPosture({ ok: dbOk }),
      blocking: true,
      reason: dbOk ? "SQLite env contract present." : "DB_FILE_NAME missing.",
      nextStep: dbOk ? "Continue with release gate." : "Configure DB_FILE_NAME before receiving traffic.",
    },
    web: {
      posture: toPosture({ ok: webOk }),
      blocking: true,
      reason: webOk ? "Web runtime env contract present." : "Deploy environment metadata is incomplete.",
      nextStep: webOk ? "Continue with readiness gate." : "Set OPENLEARN_DEPLOY_ENV and OPENLEARN_HEALTHCHECK_BASE_URL.",
    },
    worker: {
      posture: toPosture({ ok: workerOk, degraded: workerOverview.platformHealth.workerState === "degraded" }),
      blocking: true,
      reason: workerOk
        ? "BullMQ worker posture is ready."
        : workerOverview.platformHealth.backlog.reason,
      nextStep: workerOk
        ? "Worker is safe for pilot traffic."
        : workerOverview.platformHealth.backlog.nextStep,
    },
    fanout: {
      posture: toPosture({ ok: fanoutOk, degraded: transport.degraded || transport.health.connectionState === "degraded" }),
      blocking: false,
      reason:
        fanoutOk
          ? "Redis fanout is healthy."
          : transport.degradedReason ?? transport.health.lastError ?? "Fanout transport is degraded.",
      nextStep: fanoutOk
        ? "No operator action required."
        : "Treat fanout as optional degraded posture and inspect transport settings if classroom sync issues appear.",
    },
  };

  const ok =
    components.db.posture === "green"
    && components.web.posture === "green"
    && components.worker.posture === "green";

  return {
    kind: "ready" as const,
    ok,
    checkedAt: nowIso(),
    components,
    blocking: ok
      ? []
      : (["db", "web", "worker"] as const).filter((key) => components[key].posture !== "green"),
    reason: ok
      ? "All blocking pilot-traffic components are green."
      : "One or more blocking pilot-traffic components are not green.",
    nextStep: ok
      ? "Safe to receive pilot traffic."
      : "Resolve blocking DB/web/worker posture before release, rollout, or restore completion.",
  };
}

export async function getReleasePayload() {
  const env = getServerEnv();
  const currentManifest = await readManifestPointer(
    env.OPENLEARN_RELEASE_MANIFESTS_DIR,
    "current.json",
  );
  const greenManifest = await readManifestPointer(
    env.OPENLEARN_RELEASE_MANIFESTS_DIR,
    "green.json",
  );

  if (!currentManifest) {
    return {
      kind: "release" as const,
      ok: false,
      available: false,
      checkedAt: nowIso(),
      releaseId: null,
      gitSha: null,
      environment: null,
      releasedAt: null,
      rollbackTarget: null,
      manifestPath: null,
      currentRelease: null,
      greenRelease: sanitizeRelease(greenManifest),
      migration: null,
      restoreDrill: null,
      operatorCorrelation: buildOperatorCorrelation(null).normalized,
      operatorCorrelationComplete: false,
      reason: `Canonical release pointer current.json is missing in ${env.OPENLEARN_RELEASE_MANIFESTS_DIR}.`,
      nextStep: "Create or repair current.json before using /api/release as the source of truth.",
    };
  }

  const { normalized, complete } = buildOperatorCorrelation(
    currentManifest.operatorCorrelation ?? null,
  );

  return {
    kind: "release" as const,
    ok: true,
    available: true,
    checkedAt: nowIso(),
    releaseId: currentManifest.releaseId,
    gitSha: currentManifest.gitSha,
    environment: currentManifest.environment,
    releasedAt: currentManifest.releasedAt ?? null,
    rollbackTarget: currentManifest.rollbackTarget ?? null,
    manifestPath: currentManifest.manifestPath ?? null,
    currentRelease: sanitizeRelease(currentManifest),
    greenRelease: sanitizeRelease(greenManifest),
    migration: currentManifest.migration ?? null,
    restoreDrill: currentManifest.restoreDrill ?? null,
    operatorCorrelation: normalized,
    operatorCorrelationComplete: complete,
    reason: complete
      ? "Canonical current/green release pointers loaded successfully."
      : "Canonical release pointer loaded, but operatorCorrelation is incomplete.",
    nextStep: complete
      ? "Use operatorCorrelation hrefs to continue drill-down from release posture."
      : "Fill all school/classroom/lesson/plugin/action/command/task correlation fields in the canonical manifest.",
  };
}
