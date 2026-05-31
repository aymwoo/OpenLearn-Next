import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  classroomEvidence,
  classroomSessions,
  governanceAudits,
  lessons,
  lessonSteps,
  publishedLessonVersions,
  runtimeLifecycleTransitions,
  runtimeEventOutbox,
  runtimeStepSessions,
  runtimeStepStates,
  taskSubmissions,
  quizAttempts,
} from "@/db/schema";
import {
  type RuntimeDescriptor,
  type RuntimeSubmitBridgeTarget,
} from "@/features/runtime-platform/contracts/descriptors";
import type { PluginLifecycleState } from "@/features/runtime-platform/contracts/permissions";
import { RUNTIME_CONTRACT_VERSION } from "@/features/runtime-platform/contracts/version";
import {
  RuntimeBootstrapRequestSchema,
  RuntimeInteractionRequestSchema,
  RuntimeReadyRequestSchema,
  RuntimeSaveRequestSchema,
  RuntimeSubmitRequestSchema,
  RuntimeTeacherControlRequestSchema,
  type RuntimeInteractionRequest,
  type RuntimeReadyRequest,
  type RuntimeSaveRequest,
  type RuntimeSubmitRequest,
  type RuntimeTeacherControlRequest,
} from "@/features/runtime-platform/contracts/bridge";
import { publishTransportEvent } from "@/features/runtime-platform/seams";
import {
  CreateOrResumeRuntimeSessionInputSchema,
  RuntimeBootstrapDTOSchema,
  RuntimeStateSummarySchema,
  type CreateOrResumeRuntimeSessionInput,
  type RuntimeBootstrapDTO,
  type RuntimeSessionSummary,
  type RuntimeStateSummary,
} from "./runtime-session-contracts";
import { lessonStepPayloadSchema } from "@/lib/dto/lesson-authoring";
import {
  recordRuntimeClassroomEvidence,
} from "@/lib/dal/classroom";
import {
  recordRuntimeQuizAttempt,
  recordRuntimeProgressCompletion,
  recordRuntimeTaskSubmission,
} from "@/lib/dal/learning";

type ActorLike = {
  actorId: string;
  actorScope: "host" | "teacher" | "student" | "plugin" | "operator" | "system";
  schoolId: string;
  capabilities: readonly string[];
  hostPermissions: readonly string[];
};

type StateRecord = typeof runtimeStepStates.$inferSelect;
type RuntimeSessionRecord = typeof runtimeStepSessions.$inferSelect;
type LessonStepPayload = z.infer<typeof lessonStepPayloadSchema>;

const RAW_INTERACTION_PATTERNS = ["click", "pointer", "mouse", "keydown", "keyup", "dom", "hover", "focus"];

function toIso(value: Date | number | null | undefined) {
  if (!value) {
    return new Date(0).toISOString();
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function parseSnapshot(value: unknown) {
  return (value ?? {}) as {
    lesson?: { title?: string };
    steps?: Array<{
      id: string;
      lessonId?: string;
      type: "content" | "task" | "quiz";
      title: string;
      rank: string;
      payload: unknown;
    }>;
  };
}

function isSemanticInteraction(event: string) {
  const normalized = event.trim().toLowerCase();
  return normalized.length > 0 && !RAW_INTERACTION_PATTERNS.some((token) => normalized.includes(token));
}

function normalizeBridgeTargets(descriptor: RuntimeDescriptor, stepType: "content" | "task" | "quiz") {
  const declared = [descriptor.submitTarget.primary, ...descriptor.submitTarget.additional];
  const deduped = [...new Set(declared)];

  if (stepType === "task" && !deduped.includes("task-submission")) {
    deduped.push("task-submission");
  }

  if (stepType === "quiz" && !deduped.includes("quiz-attempt")) {
    deduped.push("quiz-attempt");
  }

  if (deduped.length === 0) {
    return ["classroom-evidence"] as RuntimeSubmitBridgeTarget[];
  }

  return deduped;
}

function buildRuntimeInspectorHref(runtimeSessionId: string) {
  return `/settings/labs/runtime-inspector?runtimeSessionId=${runtimeSessionId}`;
}

function buildRuntimeSubmitProofSummary(input: {
  stepTitle: string;
  bridgeTargets: RuntimeSubmitBridgeTarget[];
  summary: Record<string, unknown>;
  runtimeSessionId: string;
}) {
  const submittedStateLabel = "已完成互动证明";

  return {
    title: `${input.stepTitle}已提交`,
    submittedStateLabel,
    bridgeTargets: input.bridgeTargets,
    inspectorHref: buildRuntimeInspectorHref(input.runtimeSessionId),
    summary: input.summary,
  };
}

function stableSerializeRuntimePayload(value: unknown): string {
  const normalize = (input: unknown): unknown => {
    if (Array.isArray(input)) {
      return input.map((entry) => normalize(entry));
    }

    if (input && typeof input === "object") {
      return Object.fromEntries(
        Object.keys(input as Record<string, unknown>)
          .sort((left, right) => left.localeCompare(right))
          .flatMap((key) => {
            const normalized = normalize((input as Record<string, unknown>)[key]);
            return normalized === undefined ? [] : [[key, normalized]];
          }),
      );
    }

    return input;
  };

  return JSON.stringify(normalize(value));
}

function isVotingRuntimeStep(stepPayload: LessonStepPayload) {
  return stepPayload.builtInSource?.builtInKey === "classroomVoting";
}

function extractVotingRoundArtifact(payload: unknown) {
  const record = (payload ?? {}) as {
    kind?: unknown;
    openedAt?: unknown;
    closedAt?: unknown;
  };

  if (record.kind !== "voting-round-opened" && record.kind !== "voting-round-closed") {
    return null;
  }

  return {
    kind: record.kind,
    openedAt: typeof record.openedAt === "string" && record.openedAt.length > 0 ? record.openedAt : null,
    closedAt: typeof record.closedAt === "string" && record.closedAt.length > 0 ? record.closedAt : null,
  };
}

async function getCurrentVotingRoundState(input: {
  classroomSessionId: string;
  stepId: string;
}) {
  const rows = await db.query.classroomEvidence.findMany({
    where: and(
      eq(classroomEvidence.sessionId, input.classroomSessionId),
      eq(classroomEvidence.stepId, input.stepId),
      eq(classroomEvidence.sourceType, "system"),
      eq(classroomEvidence.evidenceType, "artifact"),
    ),
    orderBy: [desc(classroomEvidence.createdAt)],
  });

  let latestOpened: { openedAt: string | null; createdAt: string } | null = null;
  let latestClosed: { closedAt: string | null; createdAt: string } | null = null;

  for (const row of rows) {
    const artifact = extractVotingRoundArtifact(row.payloadJson);
    if (!artifact) {
      continue;
    }

    if (artifact.kind === "voting-round-opened" && !latestOpened) {
      latestOpened = {
        openedAt: artifact.openedAt,
        createdAt: toIso(row.createdAt),
      };
      continue;
    }

    if (artifact.kind === "voting-round-closed" && !latestClosed) {
      latestClosed = {
        closedAt: artifact.closedAt,
        createdAt: toIso(row.createdAt),
      };
    }

    if (latestOpened && latestClosed) {
      break;
    }
  }

  if (!latestOpened && !latestClosed) {
    return {
      status: "idle" as const,
      startedAt: null,
      endedAt: null,
    };
  }

  if (
    latestClosed
    && (!latestOpened || Date.parse(latestClosed.closedAt ?? latestClosed.createdAt) >= Date.parse(latestOpened.openedAt ?? latestOpened.createdAt))
  ) {
    return {
      status: "closed" as const,
      startedAt: latestOpened?.openedAt ?? latestOpened?.createdAt ?? null,
      endedAt: latestClosed.closedAt ?? latestClosed.createdAt,
    };
  }

  return {
    status: "live" as const,
    startedAt: latestOpened?.openedAt ?? latestOpened?.createdAt ?? null,
    endedAt: null,
  };
}

function parseVotingSubmissionPayload(payload: unknown) {
  const record = (payload ?? {}) as {
    runtimeSessionId?: unknown;
    submittedAt?: unknown;
    stateVersion?: unknown;
    state?: unknown;
    proofSummary?: unknown;
    payloadFingerprint?: unknown;
  };

  if (typeof record.runtimeSessionId !== "string" || record.runtimeSessionId.length === 0) {
    return null;
  }

  return {
    runtimeSessionId: record.runtimeSessionId,
    submittedAt: typeof record.submittedAt === "string" && record.submittedAt.length > 0 ? record.submittedAt : null,
    stateVersion: typeof record.stateVersion === "number" && Number.isFinite(record.stateVersion) ? record.stateVersion : 1,
    state: record.state && typeof record.state === "object" ? (record.state as Record<string, unknown>) : {},
    proofSummary: (record.proofSummary ?? {
      title: "已提交",
      submittedStateLabel: "已完成互动证明",
      bridgeTargets: ["classroom-evidence"],
      summary: {},
    }) as {
      title: string;
      submittedStateLabel: string;
      bridgeTargets: string[];
      inspectorHref?: string;
      summary: Record<string, unknown>;
    },
    payloadFingerprint:
      typeof record.payloadFingerprint === "string" && record.payloadFingerprint.length > 0
        ? record.payloadFingerprint
        : stableSerializeRuntimePayload(record.state),
  };
}

async function getLatestVotingRuntimeSubmission(input: {
  classroomSessionId: string;
  stepId: string;
  studentId: string;
  startedAt: string | null;
}) {
  const rows = await db.query.classroomEvidence.findMany({
    where: and(
      eq(classroomEvidence.sessionId, input.classroomSessionId),
      eq(classroomEvidence.stepId, input.stepId),
      eq(classroomEvidence.studentId, input.studentId),
      eq(classroomEvidence.sourceType, "student-submission"),
    ),
    orderBy: [desc(classroomEvidence.createdAt)],
  });

  for (const row of rows) {
    const submittedAt = toIso(row.createdAt);
    if (input.startedAt && Date.parse(submittedAt) < Date.parse(input.startedAt)) {
      continue;
    }

    const payload = parseVotingSubmissionPayload(row.payloadJson);
    if (!payload) {
      continue;
    }

    return {
      runtimeSessionId: payload.runtimeSessionId,
      submittedAt: payload.submittedAt ?? submittedAt,
      stateVersion: payload.stateVersion,
      proofSummary: payload.proofSummary,
      payloadFingerprint: payload.payloadFingerprint,
      payload: payload.state,
      persistedAt: submittedAt,
    };
  }

  return null;
}

async function getRuntimeStepContext(input: {
  classroomSessionId: string;
  stepId: string;
}) {
  const session = await db.query.classroomSessions.findFirst({
    where: eq(classroomSessions.id, input.classroomSessionId),
  });

  if (!session) {
    throw new Error("CLASSROOM_ENDED");
  }

  const published = await db.query.publishedLessonVersions.findFirst({
    where: eq(publishedLessonVersions.id, session.publishedVersionId),
  });

  if (!published) {
    throw new Error("CLASSROOM_LESSON_NOT_PUBLISHED");
  }

  const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, session.lessonId) });
  const snapshot = parseSnapshot(published.snapshotJson);
  const snapshotStep = (snapshot.steps ?? []).find((step) => step.id === input.stepId);
  const stepRow = await db.query.lessonSteps.findFirst({ where: eq(lessonSteps.id, input.stepId) });

  if (!snapshotStep || !stepRow) {
    throw new Error("CLASSROOM_STEP_NOT_IN_LESSON");
  }

  const payload = lessonStepPayloadSchema.parse(snapshotStep.payload);

  if (!payload.runtime) {
    throw new Error("RUNTIME_DESCRIPTOR_REQUIRED");
  }

  return {
    session,
    lesson,
    published,
    stepRow,
    stepPayload: payload,
    stepType: payload.type,
    stepTitle: snapshotStep.title,
    runtime: payload.runtime,
  };
}

async function getLatestRuntimeSession(identity: CreateOrResumeRuntimeSessionInput) {
  return db.query.runtimeStepSessions.findFirst({
    where: and(
      eq(runtimeStepSessions.classroomSessionId, identity.classroomSessionId),
      eq(runtimeStepSessions.stepId, identity.stepId),
      eq(runtimeStepSessions.actorId, identity.actorId),
      eq(runtimeStepSessions.actorScope, identity.actorScope),
      eq(runtimeStepSessions.runtimeVersion, identity.runtimeVersion),
      eq(runtimeStepSessions.isLatest, true),
    ),
    orderBy: [desc(runtimeStepSessions.createdAt)],
  });
}

async function getLatestRuntimeState(runtimeSessionId: string): Promise<StateRecord | null> {
  return (await db.query.runtimeStepStates.findFirst({
    where: and(
      eq(runtimeStepStates.runtimeSessionId, runtimeSessionId),
      eq(runtimeStepStates.isLatest, true),
    ),
    orderBy: [desc(runtimeStepStates.stateVersion)],
  })) ?? null;
}

function toRuntimeStateSummary(row: StateRecord | null): RuntimeStateSummary | null {
  if (!row) {
    return null;
  }

  return RuntimeStateSummarySchema.parse({
    stateVersion: row.stateVersion,
    kind: row.kind,
    summary: row.summaryJson,
    updatedAt: toIso(row.createdAt),
  });
}

async function createRuntimeOutboxEvent(input: {
  runtimeSessionId: string;
  classroomSessionId: string;
  stepId: string;
  eventType: string;
  messageId: string;
  correlationId: string;
  payload: Record<string, unknown>;
  deliveryStatus?: "pending" | "sent" | "failed";
}) {
  const [row] = await db.insert(runtimeEventOutbox).values({
    runtimeSessionId: input.runtimeSessionId,
    classroomSessionId: input.classroomSessionId,
    stepId: input.stepId,
    eventType: input.eventType,
    messageId: input.messageId,
    correlationId: input.correlationId,
    payloadJson: input.payload,
    deliveryChannel: "sse",
    deliveryStatus: input.deliveryStatus ?? "pending",
    deliveredAt: input.deliveryStatus === "sent" ? new Date() : null,
  }).returning();

  return row;
}

async function publishRuntimeTransportEvent(input: {
  runtimeSessionId: string;
  classroomSessionId: string;
  schoolId: string;
  correlationId: string;
  kind: string;
  truthRefType: "runtime-session" | "governance-audit";
  truthRefId: string;
  payload: Record<string, unknown>;
}) {
  return publishTransportEvent({
    sessionId: input.classroomSessionId,
    channel: "classroom-runtime",
    kind: input.kind,
    correlationId: input.correlationId,
    truthPersisted: true,
    truthRef: {
      type: input.truthRefType,
      id: input.truthRefId,
      runtimeSessionId: input.runtimeSessionId,
      classroomSessionId: input.classroomSessionId,
      schoolId: input.schoolId,
    },
    payload: input.payload,
  });
}

async function appendRuntimeLifecycleTransition(input: {
  runtimeSessionId: string;
  actorId: string;
  fromState: PluginLifecycleState | null;
  toState: PluginLifecycleState;
  reason: string;
}) {
  await db.insert(runtimeLifecycleTransitions).values({
    runtimeSessionId: input.runtimeSessionId,
    actorId: input.actorId,
    fromState: input.fromState,
    toState: input.toState,
    reason: input.reason,
  });
}

export async function createRuntimeGovernanceAudit(input: {
  targetId: string;
  runtimeSessionId?: string;
  classroomSessionId?: string;
  schoolId: string;
  action: string;
  decision: "allowed" | "denied";
  reasonCode?: string | null;
  actorId: string;
  actorScope: ActorLike["actorScope"];
  lifecycleState: PluginLifecycleState;
  requestedCapabilities: readonly string[];
  grantedCapabilities: readonly string[];
  requiredPermission?: string | null;
  correlationId: string;
  payloadJson: Record<string, unknown>;
}) {
  const [audit] = await db.insert(governanceAudits).values({
    targetType: "runtime",
    targetId: input.targetId,
    runtimeSessionId: input.runtimeSessionId ?? null,
    classroomSessionId: input.classroomSessionId ?? null,
    schoolId: input.schoolId,
    action: input.action,
    decision: input.decision,
    reasonCode: input.reasonCode ?? null,
    actorId: input.actorId,
    actorScope: input.actorScope,
    lifecycleState: input.lifecycleState,
    killSwitchEnabled: false,
    requestedCapabilitiesJson: [...input.requestedCapabilities],
    grantedCapabilitiesJson: [...input.grantedCapabilities],
    requiredPermission: input.requiredPermission ?? null,
    correlationId: input.correlationId,
    payloadJson: input.payloadJson,
  }).returning();

  if (input.runtimeSessionId && input.classroomSessionId) {
    await publishRuntimeTransportEvent({
      runtimeSessionId: input.runtimeSessionId,
      classroomSessionId: input.classroomSessionId,
      schoolId: input.schoolId,
      correlationId: input.correlationId,
      kind: `governance.${input.action}.${input.decision}`,
      truthRefType: "governance-audit",
      truthRefId: audit.id,
      payload: {
        action: input.action,
        decision: input.decision,
        reasonCode: input.reasonCode ?? null,
      },
    });
  }
}

async function getRuntimeSessionRecord(runtimeSessionId: string) {
  const row = await db.query.runtimeStepSessions.findFirst({
    where: eq(runtimeStepSessions.id, runtimeSessionId),
  });

  if (!row) {
    throw new Error("RUNTIME_SESSION_NOT_FOUND");
  }

  return row;
}

async function updateRuntimeLifecycleState(input: {
  runtimeSessionId: string;
  actorId: string;
  nextState: PluginLifecycleState;
  reason: string;
}) {
  const current = await getRuntimeSessionRecord(input.runtimeSessionId);
  const currentState = (current.resetReason ?? "mounted") as PluginLifecycleState;

  if (currentState === input.nextState) {
    return current;
  }

  const [row] = await db
    .update(runtimeStepSessions)
    .set({ resetReason: input.nextState })
    .where(eq(runtimeStepSessions.id, input.runtimeSessionId))
    .returning();

  await appendRuntimeLifecycleTransition({
    runtimeSessionId: input.runtimeSessionId,
    actorId: input.actorId,
    fromState: currentState,
    toState: input.nextState,
    reason: input.reason,
  });

  return row;
}

async function appendRuntimeState(input: {
  runtimeSessionId: string;
  kind: "ready" | "saved" | "submitted" | "reset";
  stateVersion?: number;
  state: Record<string, unknown>;
  summary: Record<string, unknown>;
}) {
  const latest = await getLatestRuntimeState(input.runtimeSessionId);
  const nextStateVersion = input.stateVersion ?? (latest?.stateVersion ?? 0) + 1;

  await db.update(runtimeStepStates)
    .set({ isLatest: false })
    .where(eq(runtimeStepStates.runtimeSessionId, input.runtimeSessionId));

  const [row] = await db.insert(runtimeStepStates).values({
    runtimeSessionId: input.runtimeSessionId,
    stateVersion: nextStateVersion,
    kind: input.kind,
    stateJson: input.state,
    summaryJson: input.summary,
    isLatest: true,
  }).returning();

  return row;
}

export async function createOrResumeRuntimeSession(input: CreateOrResumeRuntimeSessionInput): Promise<RuntimeSessionSummary> {
  const identity = CreateOrResumeRuntimeSessionInputSchema.parse(input);
  const latest = identity.resumeFromLatest ? await getLatestRuntimeSession(identity) : null;

  if (latest) {
    return {
      sessionId: latest.id,
      runtimeId: latest.runtimeId,
      runtimeVersion: latest.runtimeVersion,
      isLatest: Boolean(latest.isLatest),
      createdAt: toIso(latest.createdAt),
    };
  }

  await db.update(runtimeStepSessions)
    .set({ isLatest: false })
    .where(and(
      eq(runtimeStepSessions.classroomSessionId, identity.classroomSessionId),
      eq(runtimeStepSessions.stepId, identity.stepId),
      eq(runtimeStepSessions.actorId, identity.actorId),
      eq(runtimeStepSessions.actorScope, identity.actorScope),
      eq(runtimeStepSessions.runtimeVersion, identity.runtimeVersion),
    ));

  const [row] = await db.insert(runtimeStepSessions).values({
    classroomSessionId: identity.classroomSessionId,
    publishedVersionId: identity.publishedVersionId,
    lessonId: identity.lessonId,
    stepId: identity.stepId,
    runtimeId: identity.runtimeId,
    runtimeVersion: identity.runtimeVersion,
    actorId: identity.actorId,
    actorScope: identity.actorScope,
    schoolId: identity.schoolId,
    resetReason: "mounted",
    isLatest: true,
  }).returning();

  await appendRuntimeLifecycleTransition({
    runtimeSessionId: row.id,
    actorId: identity.actorId,
    fromState: null,
    toState: "mounted",
    reason: "session-bootstrap",
  });

  return {
    sessionId: row.id,
    runtimeId: row.runtimeId,
    runtimeVersion: row.runtimeVersion,
    isLatest: Boolean(row.isLatest),
    createdAt: toIso(row.createdAt),
  };
}

export async function getRuntimeBootstrapDTO(input: {
  actor: ActorLike;
  payload: unknown;
}): Promise<RuntimeBootstrapDTO> {
  const payload = RuntimeBootstrapRequestSchema.parse(input.payload);
  const context = await getRuntimeStepContext({
    classroomSessionId: payload.classroomSessionId,
    stepId: payload.stepId,
  });
  const runtimeSession = await createOrResumeRuntimeSession({
    classroomSessionId: context.session.id,
    publishedVersionId: context.published.id,
    lessonId: context.session.lessonId,
    stepId: context.stepRow.id,
    runtimeId: context.runtime.runtimeId,
    runtimeVersion: context.runtime.runtimeVersion,
    actorId: input.actor.actorId,
    actorScope: input.actor.actorScope,
    schoolId: input.actor.schoolId,
    resumeFromLatest: payload.resumeFromLatest,
  });
  const latestState = await getLatestRuntimeState(runtimeSession.sessionId);

  return RuntimeBootstrapDTOSchema.parse({
    sessionId: runtimeSession.sessionId,
    runtimeVersion: context.runtime.runtimeVersion,
    stepSummary: {
      stepId: context.stepRow.id,
      stepType: context.stepType,
      stepTitle: context.stepTitle,
      runtime: context.runtime,
    },
    lessonSummary: {
      lessonId: context.session.lessonId,
      lessonTitle: context.lesson?.title ?? context.session.lessonId,
      publishedVersionId: context.published.id,
    },
    classroomSummary: {
      classroomSessionId: context.session.id,
      classId: context.session.classId,
      className: context.session.classId,
      teacherId: context.session.teacherId,
      locked: Boolean(context.session.locked),
      status: context.session.status,
    },
    actor: {
      actorId: input.actor.actorId,
      actorScope: input.actor.actorScope,
      schoolId: input.actor.schoolId,
    },
    capabilityContext: {
      grantedCapabilities: [...input.actor.capabilities],
      hostPermissions: [...input.actor.hostPermissions],
      authorizationMode: "session-snapshot",
    },
    latestStateSummary: toRuntimeStateSummary(latestState),
  });
}

export async function appendRuntimeEvent(input: {
  actor: ActorLike;
  requestKind: "runtime-ready" | "runtime-interaction" | "runtime-teacher-control";
  payload: RuntimeReadyRequest | RuntimeInteractionRequest | RuntimeTeacherControlRequest;
  messageId: string;
  correlationId: string;
  runtimeInstanceId: string;
}) {
  const payload =
    input.requestKind === "runtime-ready"
      ? RuntimeReadyRequestSchema.parse(input.payload)
      : input.requestKind === "runtime-interaction"
        ? RuntimeInteractionRequestSchema.parse(input.payload)
        : RuntimeTeacherControlRequestSchema.parse(input.payload);

  if (input.requestKind === "runtime-interaction") {
    const interactionPayload = payload as RuntimeInteractionRequest;

    if (!isSemanticInteraction(interactionPayload.semanticEvent) || !isSemanticInteraction(interactionPayload.interactionType)) {
      throw new Error("RUNTIME_INTERACTION_SEMANTIC_EVENT_REQUIRED");
    }
  }

  const stepId = payload.stepId;
  const classroomSessionId = payload.classroomSessionId;
  const context = await getRuntimeStepContext({ classroomSessionId, stepId });
  const runtimeSession = await createOrResumeRuntimeSession({
    classroomSessionId: context.session.id,
    publishedVersionId: context.published.id,
    lessonId: context.session.lessonId,
    stepId: context.stepRow.id,
    runtimeId: context.runtime.runtimeId,
    runtimeVersion: context.runtime.runtimeVersion,
    actorId: input.actor.actorId,
    actorScope: input.actor.actorScope,
    schoolId: input.actor.schoolId,
    resumeFromLatest: true,
  });

  const eventType =
    input.requestKind === "runtime-ready"
      ? "runtime.ready"
      : input.requestKind === "runtime-interaction"
        ? "runtime.interaction"
        : "runtime.teacher-control";

  const event = await createRuntimeOutboxEvent({
    runtimeSessionId: runtimeSession.sessionId,
    classroomSessionId: context.session.id,
    stepId: context.stepRow.id,
    eventType,
    messageId: input.messageId,
    correlationId: input.correlationId,
    payload: {
      version: RUNTIME_CONTRACT_VERSION,
      runtimeInstanceId: input.runtimeInstanceId,
      requestKind: input.requestKind,
      actorId: input.actor.actorId,
      actorScope: input.actor.actorScope,
      payload,
    },
  });

  if (input.requestKind === "runtime-ready") {
    const readyPayload = payload as RuntimeReadyRequest;

    await appendRuntimeState({
      runtimeSessionId: runtimeSession.sessionId,
      kind: "ready",
      state: {},
      summary: { readyState: readyPayload.readyState ?? "ready" },
    });

    await updateRuntimeLifecycleState({
      runtimeSessionId: runtimeSession.sessionId,
      actorId: input.actor.actorId,
      nextState: "ready",
      reason: "runtime-ready",
    });
  }

  await publishRuntimeTransportEvent({
    runtimeSessionId: runtimeSession.sessionId,
    classroomSessionId: context.session.id,
    schoolId: input.actor.schoolId,
    correlationId: input.correlationId,
    kind: eventType,
    truthRefType: "runtime-session",
    truthRefId: runtimeSession.sessionId,
    payload: {
      outboxEventId: event.id,
      requestKind: input.requestKind,
      runtimeInstanceId: input.runtimeInstanceId,
    },
  });

  await createRuntimeGovernanceAudit({
    targetId: context.runtime.runtimeId,
    runtimeSessionId: runtimeSession.sessionId,
    classroomSessionId: context.session.id,
    schoolId: input.actor.schoolId,
    action: input.requestKind,
    decision: "allowed",
    actorId: input.actor.actorId,
    actorScope: input.actor.actorScope,
    lifecycleState: input.requestKind === "runtime-ready" ? "ready" : "mounted",
    requestedCapabilities: context.runtime.requestedCapabilities,
    grantedCapabilities: input.actor.capabilities,
    correlationId: input.correlationId,
    payloadJson: { runtimeInstanceId: input.runtimeInstanceId, payload },
  });

  return {
    sessionId: runtimeSession.sessionId,
    recordedEventId: event.id,
    runtimeVersion: context.runtime.runtimeVersion,
  };
}

export async function saveRuntimeState(input: {
  actor: ActorLike;
  payload: RuntimeSaveRequest;
  messageId: string;
  correlationId: string;
  runtimeInstanceId: string;
}) {
  const payload = RuntimeSaveRequestSchema.parse(input.payload);
  const context = await getRuntimeStepContext({
    classroomSessionId: payload.classroomSessionId,
    stepId: payload.stepId,
  });
  const runtimeSession = await createOrResumeRuntimeSession({
    classroomSessionId: context.session.id,
    publishedVersionId: context.published.id,
    lessonId: context.session.lessonId,
    stepId: context.stepRow.id,
    runtimeId: context.runtime.runtimeId,
    runtimeVersion: context.runtime.runtimeVersion,
    actorId: input.actor.actorId,
    actorScope: input.actor.actorScope,
    schoolId: input.actor.schoolId,
    resumeFromLatest: true,
  });
  const state = await appendRuntimeState({
    runtimeSessionId: runtimeSession.sessionId,
    kind: "saved",
    stateVersion: payload.stateVersion,
    state: payload.state,
    summary: payload.summary,
  });

  await createRuntimeOutboxEvent({
    runtimeSessionId: runtimeSession.sessionId,
    classroomSessionId: context.session.id,
    stepId: context.stepRow.id,
    eventType: "runtime.state.saved",
    messageId: input.messageId,
    correlationId: input.correlationId,
    payload: {
      version: RUNTIME_CONTRACT_VERSION,
      runtimeInstanceId: input.runtimeInstanceId,
      actorId: input.actor.actorId,
      requestKind: "runtime-save",
      stateVersion: state.stateVersion,
      summary: payload.summary,
    },
  });

  await publishRuntimeTransportEvent({
    runtimeSessionId: runtimeSession.sessionId,
    classroomSessionId: context.session.id,
    schoolId: input.actor.schoolId,
    correlationId: input.correlationId,
    kind: "runtime.state.saved",
    truthRefType: "runtime-session",
    truthRefId: runtimeSession.sessionId,
    payload: {
      stateVersion: state.stateVersion,
      runtimeInstanceId: input.runtimeInstanceId,
    },
  });

  await createRuntimeGovernanceAudit({
    targetId: context.runtime.runtimeId,
    runtimeSessionId: runtimeSession.sessionId,
    classroomSessionId: context.session.id,
    schoolId: input.actor.schoolId,
    action: "runtime-save",
    decision: "allowed",
    actorId: input.actor.actorId,
    actorScope: input.actor.actorScope,
    lifecycleState: "ready",
    requestedCapabilities: context.runtime.requestedCapabilities,
    grantedCapabilities: input.actor.capabilities,
    correlationId: input.correlationId,
    payloadJson: { runtimeInstanceId: input.runtimeInstanceId, summary: payload.summary },
  });

  return {
    sessionId: runtimeSession.sessionId,
    classroomSessionId: context.session.id,
    lessonId: context.session.lessonId,
    actorId: input.actor.actorId,
    stateVersion: state.stateVersion,
    persistedAt: toIso(state.createdAt),
  };
}

export async function submitRuntimeState(input: {
  actor: ActorLike;
  payload: RuntimeSubmitRequest;
  messageId: string;
  correlationId: string;
  runtimeInstanceId: string;
}) {
  const payload = RuntimeSubmitRequestSchema.parse(input.payload);
  const context = await getRuntimeStepContext({
    classroomSessionId: payload.classroomSessionId,
    stepId: payload.stepId,
  });
  const bridgeTargets = normalizeBridgeTargets(context.runtime, context.stepType);
  const payloadFingerprint = stableSerializeRuntimePayload(payload.state);

  if (input.actor.actorScope === "student" && isVotingRuntimeStep(context.stepPayload)) {
    const votingRoundState = await getCurrentVotingRoundState({
      classroomSessionId: context.session.id,
      stepId: context.stepRow.id,
    });

    if (votingRoundState.status === "closed") {
      throw new Error("本轮投票已结束，无法再提交。");
    }

    const latestVotingSubmission = votingRoundState.status === "idle"
      ? null
      : await getLatestVotingRuntimeSubmission({
          classroomSessionId: context.session.id,
          stepId: context.stepRow.id,
          studentId: input.actor.actorId,
          startedAt: votingRoundState.startedAt,
        });

    if (latestVotingSubmission && latestVotingSubmission.payloadFingerprint === payloadFingerprint) {
      return {
        sessionId: latestVotingSubmission.runtimeSessionId,
        runtimeSessionId: latestVotingSubmission.runtimeSessionId,
        classroomSessionId: context.session.id,
        lessonId: context.session.lessonId,
        actorId: input.actor.actorId,
        stateVersion: latestVotingSubmission.stateVersion,
        bridgeTargets,
        submittedAt: latestVotingSubmission.submittedAt,
        proofSummary: latestVotingSubmission.proofSummary,
        persistedAt: latestVotingSubmission.persistedAt,
        samePayload: true,
      };
    }
  }

  const runtimeSession = await createOrResumeRuntimeSession({
    classroomSessionId: context.session.id,
    publishedVersionId: context.published.id,
    lessonId: context.session.lessonId,
    stepId: context.stepRow.id,
    runtimeId: context.runtime.runtimeId,
    runtimeVersion: context.runtime.runtimeVersion,
    actorId: input.actor.actorId,
    actorScope: input.actor.actorScope,
    schoolId: input.actor.schoolId,
    resumeFromLatest: true,
  });
  const state = await appendRuntimeState({
    runtimeSessionId: runtimeSession.sessionId,
    kind: "submitted",
    stateVersion: payload.stateVersion,
    state: payload.state,
    summary: payload.summary,
  });
  const submittedAt = payload.submittedAt ?? toIso(state.createdAt);
  const proofSummary = buildRuntimeSubmitProofSummary({
    stepTitle: context.stepTitle,
    bridgeTargets,
    summary: payload.summary,
    runtimeSessionId: runtimeSession.sessionId,
  });

  if (bridgeTargets.includes("classroom-evidence")) {
    await recordRuntimeClassroomEvidence({
      sessionId: context.session.id,
      studentId: input.actor.actorScope === "student" ? input.actor.actorId : undefined,
      stepId: context.stepRow.id,
      sourceType: "student-submission",
      evidenceType: context.stepType === "quiz" ? "quiz-response" : "submission",
      capturedById: input.actor.actorId,
      payload: {
        runtimeSessionId: runtimeSession.sessionId,
        runtimeInstanceId: input.runtimeInstanceId,
        runtimeId: context.runtime.runtimeId,
        runtimeVersion: context.runtime.runtimeVersion,
        submittedAt,
        stateVersion: state.stateVersion,
        state: payload.state,
        payloadFingerprint,
        proofSummary,
        summary: payload.summary,
      },
    });
  }

  if (bridgeTargets.includes("task-submission")) {
    await recordRuntimeTaskSubmission({
      publishedVersionId: context.published.id,
      lessonId: context.session.lessonId,
      stepId: context.stepRow.id,
      studentId: input.actor.actorId,
      payload: {
        runtimeSessionId: runtimeSession.sessionId,
        submittedAt,
        proofSummary,
        state: payload.state,
        summary: payload.summary,
      },
    });
  }

  if (bridgeTargets.includes("quiz-attempt")) {
    await recordRuntimeQuizAttempt({
      publishedVersionId: context.published.id,
      lessonId: context.session.lessonId,
      stepId: context.stepRow.id,
      studentId: input.actor.actorId,
      answer: payload.state,
      outcome: {
        runtimeSessionId: runtimeSession.sessionId,
        submittedAt,
        proofSummary,
        summary: payload.summary,
      },
    });
  }

  await recordRuntimeProgressCompletion({
    publishedVersionId: context.published.id,
    lessonId: context.session.lessonId,
    stepId: context.stepRow.id,
    studentId: input.actor.actorId,
  });

  await createRuntimeOutboxEvent({
    runtimeSessionId: runtimeSession.sessionId,
    classroomSessionId: context.session.id,
    stepId: context.stepRow.id,
    eventType: "runtime.submission.created",
    messageId: input.messageId,
    correlationId: input.correlationId,
    payload: {
      version: RUNTIME_CONTRACT_VERSION,
      runtimeInstanceId: input.runtimeInstanceId,
      actorId: input.actor.actorId,
      requestKind: "runtime-submit",
      bridgeTargets,
      stateVersion: state.stateVersion,
      submittedAt,
      proofSummary,
      summary: payload.summary,
    },
  });

  await publishRuntimeTransportEvent({
    runtimeSessionId: runtimeSession.sessionId,
    classroomSessionId: context.session.id,
    schoolId: input.actor.schoolId,
    correlationId: input.correlationId,
    kind: "runtime.submission.created",
    truthRefType: "runtime-session",
    truthRefId: runtimeSession.sessionId,
    payload: {
      stateVersion: state.stateVersion,
      bridgeTargets,
      submittedAt,
      proofSummary,
      runtimeInstanceId: input.runtimeInstanceId,
    },
  });

  await createRuntimeGovernanceAudit({
    targetId: context.runtime.runtimeId,
    runtimeSessionId: runtimeSession.sessionId,
    classroomSessionId: context.session.id,
    schoolId: input.actor.schoolId,
    action: "runtime-submit",
    decision: "allowed",
    actorId: input.actor.actorId,
    actorScope: input.actor.actorScope,
    lifecycleState: "ready",
    requestedCapabilities: context.runtime.requestedCapabilities,
    grantedCapabilities: input.actor.capabilities,
    correlationId: input.correlationId,
    payloadJson: {
      runtimeInstanceId: input.runtimeInstanceId,
      bridgeTargets,
      submittedAt,
      proofSummary,
      summary: payload.summary,
    },
  });

  return {
    sessionId: runtimeSession.sessionId,
    runtimeSessionId: runtimeSession.sessionId,
    classroomSessionId: context.session.id,
    lessonId: context.session.lessonId,
    actorId: input.actor.actorId,
    stateVersion: state.stateVersion,
    bridgeTargets,
    submittedAt,
    proofSummary,
    persistedAt: toIso(state.createdAt),
  };
}

export async function recordTeacherControlEvent(input: {
  actor: ActorLike;
  payload: RuntimeTeacherControlRequest;
  messageId: string;
  correlationId: string;
  runtimeInstanceId: string;
}) {
  const payload = RuntimeTeacherControlRequestSchema.parse(input.payload);
  const context = await getRuntimeStepContext({
    classroomSessionId: payload.classroomSessionId,
    stepId: payload.stepId,
  });

  if (payload.command === "start-voting-round" || payload.command === "end-voting-round") {
    await recordRuntimeClassroomEvidence({
      sessionId: context.session.id,
      stepId: context.stepRow.id,
      sourceType: "system",
      evidenceType: "artifact",
      capturedById: input.actor.actorId,
      payload: {
        kind: payload.command === "start-voting-round" ? "voting-round-opened" : "voting-round-closed",
        sessionId: context.session.id,
        lessonId: context.session.lessonId,
        stepId: context.stepRow.id,
        stepTitle: context.stepTitle,
        version: context.session.version,
        command: payload.command,
        runtimeCommand: payload.command,
        openedAt: payload.command === "start-voting-round" ? new Date().toISOString() : null,
        closedAt: payload.command === "end-voting-round" ? new Date().toISOString() : null,
        closedByTeacherId: payload.command === "end-voting-round" ? input.actor.actorId : null,
      },
    });
  }

  const result = await appendRuntimeEvent({
    actor: input.actor,
    requestKind: "runtime-teacher-control",
    payload,
    messageId: input.messageId,
    correlationId: input.correlationId,
    runtimeInstanceId: input.runtimeInstanceId,
  });

  return {
    sessionId: result.sessionId,
    classroomSessionId: payload.classroomSessionId,
    applied: true,
    recordedEventId: result.recordedEventId,
  };
}

export async function getLatestRuntimeRecoverySummary(input: {
  lessonId: string;
  stepId: string;
  actorId: string;
}) {
  const session = await db.query.runtimeStepSessions.findFirst({
    where: and(
      eq(runtimeStepSessions.lessonId, input.lessonId),
      eq(runtimeStepSessions.stepId, input.stepId),
      eq(runtimeStepSessions.actorId, input.actorId),
      eq(runtimeStepSessions.isLatest, true),
    ),
    orderBy: [desc(runtimeStepSessions.createdAt)],
  });

  if (!session) {
    return null;
  }

  const state = await getLatestRuntimeState(session.id);

  if (!state) {
    return null;
  }

  return {
    sessionId: session.id,
    runtimeId: session.runtimeId,
    runtimeVersion: session.runtimeVersion,
    stateVersion: state.stateVersion,
    kind: state.kind,
    updatedAt: toIso(state.createdAt),
    summary: state.summaryJson as Record<string, unknown>,
  };
}

export async function getRuntimeSubmitWriteCounts(input: {
  lessonId: string;
  stepId: string;
  studentId: string;
}) {
  const [taskRows, quizRows] = await Promise.all([
    db.query.taskSubmissions.findMany({
      where: and(
        eq(taskSubmissions.lessonId, input.lessonId),
        eq(taskSubmissions.stepId, input.stepId),
        eq(taskSubmissions.studentId, input.studentId),
      ),
    }),
    db.query.quizAttempts.findMany({
      where: and(
        eq(quizAttempts.lessonId, input.lessonId),
        eq(quizAttempts.stepId, input.stepId),
        eq(quizAttempts.studentId, input.studentId),
      ),
    }),
  ]);

  return {
    taskAttemptCount: taskRows.length,
    quizAttemptCount: quizRows.length,
  };
}
