import "server-only";

import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  classMembers,
  classes,
  courseClasses,
  courseEnrollments,
  courses,
  draftLessonVersions,
  lessonMaterials,
  lessons,
  lessonSteps,
  pluginRegistrations,
  publishedLessonVersions,
  resources,
} from "@/db/schema";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import { getUserMembershipsDTO } from "@/lib/dal/membership";
import {
  listPluginStepExtensions,
  type PluginStepExtensionRecord,
  upsertPluginStepExtensionWithTx,
} from "@/lib/dal/plugin-data";
import { ACTIVE_PLUGIN_STATES, isRunnablePluginState } from "@/lib/dal/plugins";
import {
  ClassroomVotingAuthoringConfigSchema,
  BUILT_IN_TEACHING_STEP_DEFINITIONS,
} from "@/lib/dto/resource-ai";
import { resolveTeachingDesignInput } from "@/lib/teaching-design";
import {
  AutosaveResultDTOSchema,
  ApplyDraftResultDTOSchema,
  BuiltInTeachingStepKeySchema,
  CourseDTOSchema,
  DiscardDraftResultDTOSchema,
  LessonDraftReviewDTOSchema,
  LessonEditorDTOSchema,
  LessonPublishReadinessDTOSchema,
  LessonSummaryDTOSchema,
  LessonStepDTOSchema,
  PublishResultDTOSchema,
  TeacherLessonPreviewDTOSchema,
  TeacherAuthoringOverviewDTOSchema,
  buildLessonDraftDiffRows,
  lessonStepPayloadSchema,
  type TeachingDesignFallbackReason,
  type TeachingDesignStatus,
  type AutosaveResultDTO,
  type ApplyDraftResultDTO,
  type DiscardDraftResultDTO,
  type LessonDraftReviewDTO,
  type LessonPreparationIssueDTO,
  type LessonPreparationSummaryDTO,
  type LessonPublishIssueDTO,
  type LessonStepDTO,
  type LessonStepPayload,
  type PublishResultDTO,
} from "@/lib/dto/lesson-authoring";
import { createInitialRank, createRankAfter, createRankBetween } from "@/lib/ranking/lexorank";

type TeacherScope = {
  userId: string;
  schoolIds: string[];
};

type CreateCourseInput = {
  schoolId: string;
  title: string;
  subject: string;
  grade: string;
};

type LessonDraftInput = {
  courseId: string;
  title: string;
  objective: string;
  expectedRevision?: number;
};

type AddLessonStepInput = {
  lessonId: string;
  type: "content" | "task" | "quiz";
  title: string;
  payload: LessonStepPayload;
  afterRank?: string;
};

type UpdateLessonStepInput = {
  stepId: string;
  title: string;
  payload: LessonStepPayload;
};

type SaveVotingLessonStepConfigInput = {
  stepId: string;
  title: string;
  pluginId: string;
  expectedUpdatedAt: string;
  executableConfig: ReturnType<typeof ClassroomVotingAuthoringConfigSchema.parse>;
};

type SaveVotingLessonStepConfigResult = AutosaveResultDTO & {
  publishState: Awaited<ReturnType<typeof getLessonPublishReadinessDTO>>;
};

function getClassroomVotingAuthoringContract() {
  const definition = BUILT_IN_TEACHING_STEP_DEFINITIONS.find((item) => item.builtInKey === "classroomVoting");
  if (!definition?.authoringContract) {
    throw new Error("VOTING_PLUGIN_CONTRACT_MISSING");
  }

  return definition.authoringContract;
}

function buildVotingExtensionPayload(input: {
  pluginId: string;
  executableConfig: ReturnType<typeof ClassroomVotingAuthoringConfigSchema.parse>;
}) {
  const contract = getClassroomVotingAuthoringContract();
  return {
    kind: "classroom-voting",
    contractVersion: "v1",
    runtimeContractVersion: "v2",
    executableConfig: input.executableConfig,
    builtInSource: {
      pluginId: input.pluginId,
      builtInKey: contract.publicMetadata.builtInKey,
      pluginName: contract.publicMetadata.pluginName,
    },
  } as const;
}

function buildVotingQuizShell(input: {
  currentPayload: Extract<LessonStepPayload, { type: "quiz" }>;
  executableConfig: ReturnType<typeof ClassroomVotingAuthoringConfigSchema.parse>;
}): Extract<LessonStepPayload, { type: "quiz" }> {
  return {
    ...input.currentPayload,
    type: "quiz",
    question: input.executableConfig.prompt,
    options: input.executableConfig.options.map((option) => option.label),
    correctOptionIndex: undefined,
    explanation: undefined,
    allowRetry: false,
    retryPolicy: "none",
    revealCorrectAnswer: false,
    materialRefs: input.currentPayload.materialRefs ?? [],
  };
}

async function syncMarkdownAssetForStep(input: {
  lessonId: string;
  courseId: string;
  schoolId: string;
  actorId: string;
  stepId: string;
  title: string;
  payload: LessonStepPayload;
}) {
  if (input.payload.type !== "content" || !input.payload.markdown) {
    return;
  }

  const asset = input.payload.markdown.asset;
  const existingResource = await db.query.resources.findFirst({ where: eq(resources.id, asset.resourceId) });

  if (existingResource) {
    await db
      .update(resources)
      .set({
        title: asset.title,
        content: input.payload.markdown.source,
        classification: "markdown",
        updatedAt: new Date(),
      })
      .where(eq(resources.id, asset.resourceId));
  } else {
    await db.insert(resources).values({
      id: asset.resourceId,
      schoolId: input.schoolId,
      ownerId: input.actorId,
      courseId: input.courseId,
      title: asset.title,
      visibility: "private",
      classification: "markdown",
      content: input.payload.markdown.source,
    });
  }

  const existingMaterial = await db.query.lessonMaterials.findFirst({ where: eq(lessonMaterials.id, asset.materialId) });

  if (existingMaterial) {
    await db
      .update(lessonMaterials)
      .set({
        stepId: input.stepId,
        title: asset.title,
        kind: "markdown",
        url: asset.resourceId,
        note: input.payload.markdown.renderMode,
      })
      .where(eq(lessonMaterials.id, asset.materialId));
  } else {
    await db.insert(lessonMaterials).values({
      id: asset.materialId,
      lessonId: input.lessonId,
      stepId: input.stepId,
      title: asset.title,
      kind: "markdown",
      url: asset.resourceId,
      note: input.payload.markdown.renderMode,
    });
  }
}

type ReorderLessonStepInput = {
  stepId: string;
  beforeRank?: string | null;
  afterRank?: string | null;
};

function toIso(value: Date | number | null | undefined) {
  if (!value) {
    return new Date(0).toISOString();
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function nullableIso(value: Date | number | null | undefined) {
  return value ? toIso(value) : null;
}

function assertSchoolAccess(scope: TeacherScope, schoolId: string) {
  if (!scope.schoolIds.includes(schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }
}

function ensureCourseOwnership(scope: TeacherScope, course: typeof courses.$inferSelect) {
  assertSchoolAccess(scope, course.schoolId);

  if (course.ownerId !== scope.userId) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }
}

export async function assertActiveTeacher(): Promise<TeacherScope> {
  const user = await getCurrentUserDTO();

  if (!user) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  const memberships = await getUserMembershipsDTO(user.id);
  const schoolIds = memberships
    .filter((membership) => membership.role === "teacher" && membership.status === "active")
    .map((membership) => membership.schoolId);

  if (schoolIds.length === 0) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  return { userId: user.id, schoolIds };
}

async function getScopedCourse(courseId: string, scope: TeacherScope) {
  const course = await db.query.courses.findFirst({ where: eq(courses.id, courseId) });

  if (!course) {
    throw new Error("COURSE_NOT_FOUND");
  }

  ensureCourseOwnership(scope, course);
  return course;
}

async function getScopedLesson(lessonId: string, scope: TeacherScope) {
  const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, lessonId) });

  if (!lesson) {
    throw new Error("LESSON_NOT_FOUND");
  }

  const course = await getScopedCourse(lesson.courseId, scope);
  return { lesson, course };
}

async function getScopedStep(stepId: string, scope: TeacherScope) {
  const step = await db.query.lessonSteps.findFirst({ where: eq(lessonSteps.id, stepId) });

  if (!step) {
    throw new Error("STEP_NOT_FOUND");
  }

  const scoped = await getScopedLesson(step.lessonId, scope);
  return { step, ...scoped };
}

async function getCourseDTO(course: typeof courses.$inferSelect) {
  const relatedLessons = await db.query.lessons.findMany({ where: eq(lessons.courseId, course.id) });
  const relatedEnrollments = await db.query.courseEnrollments.findMany({
    where: eq(courseEnrollments.courseId, course.id),
  });
  const links = await db
    .select({ className: classes.name })
    .from(courseClasses)
    .innerJoin(classes, eq(courseClasses.classId, classes.id))
    .where(eq(courseClasses.courseId, course.id));

  return CourseDTOSchema.parse({
    ...course,
    lessonCount: relatedLessons.length,
    classLabels: links.map((link) => link.className),
    enrollmentCount: relatedEnrollments.length,
    updatedAt: toIso(course.updatedAt),
  });
}

async function getLessonSummaryDTO(lesson: typeof lessons.$inferSelect) {
  const steps = await db.query.lessonSteps.findMany({
    where: and(eq(lessonSteps.lessonId, lesson.id), isNull(lessonSteps.archivedAt)),
  });

  return LessonSummaryDTOSchema.parse({
    ...lesson,
    stepCount: steps.length,
    publishedVersionId: lesson.publishedVersionId,
    updatedAt: toIso(lesson.updatedAt),
  });
}

async function getCourseClassDtos(courseId: string, scope: TeacherScope) {
  const linkedClassRows = await db.query.courseClasses.findMany({ where: eq(courseClasses.courseId, courseId) });

  if (linkedClassRows.length === 0) {
    return [];
  }

  const linkedClassIds = linkedClassRows.map((link) => link.classId);
  const classRows = await db.query.classes.findMany({ where: inArray(classes.id, linkedClassIds) });
  const scopedClassRows = classRows.filter((classRow) => scope.schoolIds.includes(classRow.schoolId));

  return Promise.all(
    scopedClassRows.map(async (classRow) => {
      const members = await db.query.classMembers.findMany({ where: eq(classMembers.classId, classRow.id) });

      return {
        id: classRow.id,
        schoolId: classRow.schoolId,
        name: classRow.name,
        studentCount: members.filter((member) => member.role === "student").length,
      };
    })
  );
}

function buildIssue(input: LessonPublishIssueDTO): LessonPublishIssueDTO {
  return input;
}

function buildPreparationIssue(input: LessonPreparationIssueDTO): LessonPreparationIssueDTO {
  return input;
}

function getBuiltInPluginAvailabilityMap(
  plugins: Array<{
    id: string;
    pluginKey?: string;
    name?: string;
    enabled: boolean;
    killSwitchEnabled: boolean;
    lifecycleState?: string | null;
    manifestJson?: { builtIn?: boolean } | null;
  }>,
) {
  return new Map(
    plugins.map((plugin) => [
      plugin.id,
      Boolean(
        plugin.manifestJson?.builtIn === true
          && plugin.enabled
          && !plugin.killSwitchEnabled
          && typeof plugin.lifecycleState === "string"
          && isRunnablePluginState(plugin.lifecycleState as (typeof ACTIVE_PLUGIN_STATES)[number]),
      ),
    ]),
  );
}

async function getBuiltInPluginRegistryForLesson(scope: TeacherScope, schoolId: string) {
  assertSchoolAccess(scope, schoolId);

  const plugins = await db.query.pluginRegistrations.findMany({
    where: eq(pluginRegistrations.schoolId, schoolId),
    columns: { id: true, pluginKey: true, name: true, enabled: true, killSwitchEnabled: true, lifecycleState: true, manifestJson: true },
  });

  return getBuiltInPluginAvailabilityMap(plugins as Parameters<typeof getBuiltInPluginAvailabilityMap>[0]);
}

const VOTING_TEMPLATE_PLUGIN_KEY = "builtin-teaching-step-classroom-voting" as const;

type PublishPluginRegistryEntry = {
  id: string;
  pluginKey: string | null;
  name: string | null;
  enabled: boolean;
  killSwitchEnabled: boolean;
  lifecycleState: string | null;
  manifestJson?: {
    builtIn?: boolean;
    manifestVersion?: number;
    governance?: { contractVersion?: string | null } | null;
  } | null;
};

type VotingExecutableContract = {
  kind: "classroom-voting";
  contractVersion: "v1";
  runtimeContractVersion: "v2";
  pluginId: string;
  publicMetadata: {
    builtInKey: "classroomVoting";
    pluginKey: string;
    pluginName: string;
    stepType: "quiz";
  };
  executableConfig: ReturnType<typeof ClassroomVotingAuthoringConfigSchema.parse>;
};

function isVotingBuiltInSource(payload: LessonStepPayload) {
  return payload.builtInSource?.builtInKey === "classroomVoting";
}

function isVotingPluginCompatible(plugin: PublishPluginRegistryEntry) {
  return plugin.manifestJson?.manifestVersion === 2
    && plugin.manifestJson?.governance?.contractVersion === "v2";
}

function assertVotingPluginWritable(input: {
  stepId: string;
  payload: LessonStepPayload;
  plugin: PublishPluginRegistryEntry | null;
  pluginId: string;
}) {
  if (input.payload.type !== "quiz") {
    throw new Error("VOTING_STEP_NOT_QUIZ");
  }

  const builtInSource = input.payload.builtInSource;
  if (!builtInSource || builtInSource.builtInKey !== "classroomVoting") {
    throw new Error("VOTING_STEP_NOT_CLASSROOM_VOTING");
  }

  if (builtInSource.pluginId !== input.pluginId) {
    throw new Error("VOTING_PLUGIN_MISMATCH");
  }

  if (!input.plugin) {
    throw new Error("VOTING_PLUGIN_DISABLED");
  }

  if (!isVotingPluginActive(input.plugin)) {
    throw new Error("VOTING_PLUGIN_DISABLED");
  }

  if (!isVotingPluginCompatible(input.plugin)) {
    throw new Error("VOTING_PLUGIN_INCOMPATIBLE");
  }
}

function isVotingPluginActive(plugin: PublishPluginRegistryEntry) {
  return plugin.enabled
    && !plugin.killSwitchEnabled
    && typeof plugin.lifecycleState === "string"
    && isRunnablePluginState(plugin.lifecycleState as (typeof ACTIVE_PLUGIN_STATES)[number]);
}

function resolveVotingExecutableContract(input: {
  stepId: string;
  payload: LessonStepPayload;
  plugin: PublishPluginRegistryEntry | null;
  extension: PluginStepExtensionRecord | null;
}):
  | { ok: true; contract: VotingExecutableContract }
  | { ok: false; issue: LessonPublishIssueDTO } {
  const builtInSource = input.payload.builtInSource;
  if (!builtInSource || builtInSource.builtInKey !== "classroomVoting") {
    return {
      ok: false,
      issue: buildIssue({
        code: "VOTING_PLUGIN_CONFIG_MISSING",
        message: "课堂投票步骤缺少已绑定的插件来源，无法冻结发布配置。",
        stepId: input.stepId,
      }),
    };
  }

  if (!input.extension) {
    return {
      ok: false,
      issue: buildIssue({
        code: "VOTING_PLUGIN_CONFIG_MISSING",
        message: "课堂投票步骤还没有保存正式配置，请先完成投票问题与选项设置后再发布。",
        stepId: input.stepId,
        pluginId: builtInSource.pluginId,
        builtInKey: builtInSource.builtInKey,
        pluginName: builtInSource.pluginName,
      }),
    };
  }

  const parsedConfig = ClassroomVotingAuthoringConfigSchema.safeParse(
    (input.extension.payloadJson as { executableConfig?: unknown } | null)?.executableConfig,
  );

  if (!parsedConfig.success) {
    return {
      ok: false,
      issue: buildIssue({
        code: "VOTING_PLUGIN_CONFIG_INVALID",
        message: "课堂投票配置不完整或格式错误，请检查题目、选项和作答窗口后再发布。",
        stepId: input.stepId,
        pluginId: builtInSource.pluginId,
        builtInKey: builtInSource.builtInKey,
        pluginName: builtInSource.pluginName,
      }),
    };
  }

  if (!input.plugin || !isVotingPluginActive(input.plugin)) {
    return {
      ok: false,
      issue: buildIssue({
        code: "VOTING_PLUGIN_DISABLED",
        message: `课堂投票插件“${builtInSource.pluginName}”当前已停用、被 kill switch 阻断或尚未就绪，请恢复插件后再发布。`,
        stepId: input.stepId,
        pluginId: builtInSource.pluginId,
        builtInKey: builtInSource.builtInKey,
        pluginName: builtInSource.pluginName,
      }),
    };
  }

  if (!isVotingPluginCompatible(input.plugin)) {
    return {
      ok: false,
      issue: buildIssue({
        code: "VOTING_PLUGIN_INCOMPATIBLE",
        message: `课堂投票插件“${builtInSource.pluginName}”版本与当前课堂 contract 不兼容，请切换到受支持版本后再发布。`,
        stepId: input.stepId,
        pluginId: builtInSource.pluginId,
        builtInKey: builtInSource.builtInKey,
        pluginName: builtInSource.pluginName,
      }),
    };
  }

  return {
    ok: true,
    contract: {
      kind: "classroom-voting",
      contractVersion: "v1",
      runtimeContractVersion: "v2",
      pluginId: builtInSource.pluginId,
      publicMetadata: {
        builtInKey: "classroomVoting",
        pluginKey: input.plugin.pluginKey ?? VOTING_TEMPLATE_PLUGIN_KEY,
        pluginName: builtInSource.pluginName,
        stepType: "quiz",
      },
      executableConfig: parsedConfig.data,
    },
  };
}

async function getVotingPluginContext(input: {
  actorId: string;
  schoolId: string;
  stepRows: Array<typeof lessonSteps.$inferSelect>;
  stepDtos?: Array<{ id: string; payload: LessonStepPayload }>;
}) {
  const votingSteps = input.stepDtos
    ? input.stepDtos.flatMap((step) =>
        isVotingBuiltInSource(step.payload) ? [{ stepId: step.id, pluginId: step.payload.builtInSource!.pluginId }] : [],
      )
    : input.stepRows
        .filter((step) => !step.archivedAt)
        .flatMap((step) => {
          const parsed = parseStepPayloadWithIssues(step);
          return parsed.ok && isVotingBuiltInSource(parsed.payload)
            ? [{ stepId: step.id, pluginId: parsed.payload.builtInSource!.pluginId }]
            : [];
        });

  if (votingSteps.length === 0) {
    return {
      pluginById: new Map<string, PublishPluginRegistryEntry>(),
      extensionByStepId: new Map<string, PluginStepExtensionRecord>(),
    };
  }

  const pluginRows = await db.query.pluginRegistrations.findMany({
    where: eq(pluginRegistrations.schoolId, input.schoolId),
    columns: {
      id: true,
      pluginKey: true,
      name: true,
      enabled: true,
      killSwitchEnabled: true,
      lifecycleState: true,
      manifestJson: true,
    },
  });

  const stepIdsByPluginId = new Map<string, string[]>();
  for (const votingStep of votingSteps) {
    const list = stepIdsByPluginId.get(votingStep.pluginId) ?? [];
    list.push(votingStep.stepId);
    stepIdsByPluginId.set(votingStep.pluginId, list);
  }

  const extensionRows = (
    await Promise.all(
      [...stepIdsByPluginId.entries()].map(async ([pluginId, lessonStepIds]) =>
        listPluginStepExtensions({
          actorId: input.actorId,
          schoolId: input.schoolId,
          pluginId,
          lessonStepIds,
        }).catch(() => []),
      ),
    )
  ).flat();

  return {
    pluginById: new Map(pluginRows.map((plugin) => [plugin.id, plugin as PublishPluginRegistryEntry])),
    extensionByStepId: new Map(extensionRows.map((extension) => [extension.lessonStepId, extension])),
  };
}

function parseStepPayloadWithIssues(
  step: Pick<typeof lessonSteps.$inferSelect, "id" | "title" | "payloadJson">,
):
  | { ok: true; payload: LessonStepPayload }
  | { ok: false; issue: LessonPublishIssueDTO } {
  const parsed = lessonStepPayloadSchema.safeParse(step.payloadJson);

  if (!parsed.success) {
    return {
      ok: false,
      issue: buildIssue({
        code: "STEP_PAYLOAD_INVALID",
        message: `步骤“${step.title || step.id}”内容结构无效，请重新编辑后再发布。`,
        stepId: step.id,
      }),
    };
  }

  return { ok: true, payload: parsed.data };
}

type HydratedTeachingDesign = {
  payload: LessonStepPayload;
  teachingDesignStatus: TeachingDesignStatus;
  needsTeachingDesignRefinement: boolean;
  teachingDesignFallbackReason: TeachingDesignFallbackReason | null;
};

function hydrateTeachingDesign(payload: LessonStepPayload): HydratedTeachingDesign {
  const resolution = resolveTeachingDesignInput(payload.type, payload.teachingDesign);

  return {
    payload: {
      ...payload,
      teachingDesign: resolution.teachingDesign,
    },
    teachingDesignStatus: resolution.teachingDesignStatus,
    needsTeachingDesignRefinement: resolution.needsTeachingDesignRefinement,
    teachingDesignFallbackReason: resolution.teachingDesignFallbackReason,
  };
}

function toPreparationBlockingIssue(issue: LessonPublishIssueDTO): LessonPreparationIssueDTO {
  return buildPreparationIssue({
    code: issue.code,
    message: issue.message,
    stepId: issue.stepId,
    pluginId: issue.pluginId,
    builtInKey: issue.builtInKey,
    pluginName: issue.pluginName,
  });
}

function hasMaterialCue(payload: LessonStepPayload) {
  if ("materialRefs" in payload && payload.materialRefs.length > 0) {
    return true;
  }

  return payload.type === "content" && Boolean(payload.markdown?.asset.title.trim());
}

function hasAuthoredEvidencePrompt(payload: LessonStepPayload) {
  const prompt = payload.teachingDesign?.evidenceExpectation?.prompt;
  return typeof prompt === "string" && prompt.trim().length > 0;
}

function buildLessonPreparationSummary(input: {
  lessonId: string;
  courseId: string;
  stepRows: Array<typeof lessonSteps.$inferSelect>;
  readiness: { blockingIssues: LessonPublishIssueDTO[] };
}): LessonPreparationSummaryDTO {
  const blockingIssues = input.readiness.blockingIssues.map(toPreparationBlockingIssue);
  const attentionIssues: LessonPreparationIssueDTO[] = [];
  const advisoryIssues: LessonPreparationIssueDTO[] = [];
  let activeStepCount = 0;
  let totalEstimatedMinutes = 0;
  let materialCueCount = 0;
  let evidenceReadyStepCount = 0;

  for (const step of input.stepRows) {
    if (step.archivedAt) {
      continue;
    }

    const parsedStep = parseStepPayloadWithIssues(step);
    if (!parsedStep.ok) {
      continue;
    }

    activeStepCount += 1;
    const hydrated = hydrateTeachingDesign(parsedStep.payload);
    totalEstimatedMinutes += hydrated.payload.teachingDesign?.estimatedMinutes ?? 0;

    if (hasMaterialCue(parsedStep.payload)) {
      materialCueCount += 1;
    } else {
      advisoryIssues.push(
        buildPreparationIssue({
          code: "MATERIAL_CUES_MISSING",
          message: `步骤“${step.title}”还没有补充材料提示，开课前建议确认学生可见资料。`,
          stepId: step.id,
        }),
      );
    }

    if (hasAuthoredEvidencePrompt(parsedStep.payload)) {
      evidenceReadyStepCount += 1;
    } else {
      advisoryIssues.push(
        buildPreparationIssue({
          code: "EVIDENCE_EXPECTATION_MISSING",
          message: `步骤“${step.title}”还没有明确采证提示，建议补充课堂观察或提交要求。`,
          stepId: step.id,
        }),
      );
    }

    if (hydrated.needsTeachingDesignRefinement) {
      attentionIssues.push(
        buildPreparationIssue({
          code: "TEACHING_DESIGN_NEEDS_REFINEMENT",
          message: `步骤“${step.title}”的教学设计仍需完善，当前只会作为开课前提醒。`,
          stepId: step.id,
        }),
      );
    }

    if (hydrated.teachingDesignStatus === "inferred") {
      advisoryIssues.push(
        buildPreparationIssue({
          code: "TEACHING_DESIGN_INFERRED",
          message: `步骤“${step.title}”仍在使用默认推断的教学设计，建议在开课前再确认节奏与证据要求。`,
          stepId: step.id,
        }),
      );
    }
  }

  return {
    activeStepCount,
    totalEstimatedMinutes,
    materialCueCount,
    evidenceReadyStepCount,
    launchHref: `/teacher/launch?courseId=${input.courseId}&lessonId=${input.lessonId}`,
    blockingIssues,
    attentionIssues,
    advisoryIssues,
  };
}

export async function getLessonPublishReadinessDTO(input: { lessonId: string }) {
  const scope = await assertActiveTeacher();
  const { lesson, course } = await getScopedLesson(input.lessonId, scope);
  const stepRows = await db.query.lessonSteps.findMany({
    where: eq(lessonSteps.lessonId, lesson.id),
    orderBy: (step, { asc }) => [asc(step.rank)],
  });
  const pluginAvailability = await getBuiltInPluginRegistryForLesson(scope, course.schoolId);
  const votingContext = await getVotingPluginContext({
    actorId: scope.userId,
    schoolId: course.schoolId,
    stepRows,
  });
  const blockingIssues: LessonPublishIssueDTO[] = [];
  let activeValidStepCount = 0;

  if (!lesson.title.trim()) {
    blockingIssues.push(buildIssue({ code: "LESSON_TITLE_REQUIRED", message: "发布前需要补充课时标题。" }));
  }

  if (!lesson.objective.trim()) {
    blockingIssues.push(buildIssue({ code: "LESSON_OBJECTIVE_REQUIRED", message: "发布前需要补充教学目标。" }));
  }

  for (const step of stepRows) {
    if (step.archivedAt) {
      continue;
    }

    const parsedStep = parseStepPayloadWithIssues(step);
    if (!parsedStep.ok) {
      blockingIssues.push(parsedStep.issue);
      continue;
    }

    activeValidStepCount += 1;
    const builtInSource = parsedStep.payload.builtInSource;
    if (!builtInSource) {
      continue;
    }

    BuiltInTeachingStepKeySchema.parse(builtInSource.builtInKey);

    if (builtInSource.builtInKey === "classroomVoting") {
      const votingContract = resolveVotingExecutableContract({
        stepId: step.id,
        payload: parsedStep.payload,
        plugin: votingContext.pluginById.get(builtInSource.pluginId) ?? null,
        extension: votingContext.extensionByStepId.get(step.id) ?? null,
      });

      if (!votingContract.ok) {
        blockingIssues.push(votingContract.issue);
      }

      continue;
    }

    if (!pluginAvailability.get(builtInSource.pluginId)) {
      blockingIssues.push(
        buildIssue({
          code: "BUILT_IN_PLUGIN_UNAVAILABLE",
          message: `内置教学环节插件“${builtInSource.pluginName}”当前不可用，请替换或重新启用后再发布。`,
          stepId: step.id,
          pluginId: builtInSource.pluginId,
          builtInKey: builtInSource.builtInKey,
          pluginName: builtInSource.pluginName,
        }),
      );
    }
  }

  if (activeValidStepCount === 0) {
    blockingIssues.push(buildIssue({ code: "NO_ACTIVE_STEPS", message: "发布前至少需要一个可用的未归档步骤。" }));
  }

  return LessonPublishReadinessDTOSchema.parse({
    lessonId: lesson.id,
    courseId: course.id,
    canPublish: blockingIssues.length === 0,
    blockingIssues,
  });
}

export async function getTeacherLessonPreviewDTO(input: { lessonId: string }) {
  const scope = await assertActiveTeacher();
  const { lesson, course } = await getScopedLesson(input.lessonId, scope);
  const courseDto = await getCourseDTO(course);
  const lessonDto = await getLessonSummaryDTO(lesson);
  const stepRows = await db.query.lessonSteps.findMany({
    where: eq(lessonSteps.lessonId, lesson.id),
    orderBy: (step, { asc }) => [asc(step.rank)],
  });
  const materialRows = await db.query.lessonMaterials.findMany({ where: eq(lessonMaterials.lessonId, lesson.id) });

  const steps = stepRows.flatMap((step) => {
    if (step.archivedAt) {
      return [];
    }

    const parsed = lessonStepPayloadSchema.safeParse(step.payloadJson);
    if (!parsed.success) {
      return [];
    }

    const hydrated = hydrateTeachingDesign(parsed.data);

    return [
      {
        id: step.id,
        lessonId: step.lessonId,
        type: step.type,
        title: step.title,
        rank: step.rank,
        payload: hydrated.payload,
        teachingDesignStatus: hydrated.teachingDesignStatus,
        needsTeachingDesignRefinement: hydrated.needsTeachingDesignRefinement,
        teachingDesignFallbackReason: hydrated.teachingDesignFallbackReason,
        updatedAt: toIso(step.updatedAt),
        builtInSourceLabel: hydrated.payload.builtInSource?.pluginName ?? null,
      },
    ];
  });

  return TeacherLessonPreviewDTOSchema.parse({
    course: courseDto,
    lesson: lessonDto,
    steps,
    materials: materialRows.map((material) => ({
      id: material.id,
      lessonId: material.lessonId,
      stepId: material.stepId,
      title: material.title,
      kind: material.kind,
      url: material.url,
      note: material.note,
    })),
  });
}

export async function getTeacherAuthoringOverview() {
  const scope = await assertActiveTeacher();
  const courseRows = await db.query.courses.findMany({ where: inArray(courses.schoolId, scope.schoolIds) });
  const scopedCourseRows = courseRows.filter((course) => course.ownerId === scope.userId);
  const classRows = await db.query.classes.findMany({ where: inArray(classes.schoolId, scope.schoolIds) });
  const lessonRows = scopedCourseRows.length
    ? await db.query.lessons.findMany({ where: inArray(lessons.courseId, scopedCourseRows.map((course) => course.id)) })
    : [];

  const classDtos = await Promise.all(
    classRows.map(async (classRow) => {
      const members = await db.query.classMembers.findMany({ where: eq(classMembers.classId, classRow.id) });

      return {
        id: classRow.id,
        schoolId: classRow.schoolId,
        name: classRow.name,
        studentCount: members.filter((member) => member.role === "student").length,
      };
    })
  );

  return TeacherAuthoringOverviewDTOSchema.parse({
    courses: await Promise.all(scopedCourseRows.map(getCourseDTO)),
    classes: classDtos,
    lessons: await Promise.all(lessonRows.map(getLessonSummaryDTO)),
  });
}

export async function getLessonEditorDTO(lessonId: string) {
  const scope = await assertActiveTeacher();
  const { lesson, course } = await getScopedLesson(lessonId, scope);
  const courseDto = await getCourseDTO(course);
  const classDtos = await getCourseClassDtos(course.id, scope);
  const stepRows = await db.query.lessonSteps.findMany({
    where: eq(lessonSteps.lessonId, lesson.id),
    orderBy: (step, { asc }) => [asc(step.rank)],
  });
  const materialRows = await db.query.lessonMaterials.findMany({ where: eq(lessonMaterials.lessonId, lesson.id) });
  const latestVersion = await db.query.publishedLessonVersions.findFirst({
    where: eq(publishedLessonVersions.lessonId, lesson.id),
    orderBy: desc(publishedLessonVersions.version),
  });
  const votingContext = await getVotingPluginContext({
    actorId: scope.userId,
    schoolId: course.schoolId,
    stepRows,
  });

  const readiness = await getLessonPublishReadinessDTO({ lessonId });
  const preparationSummary = buildLessonPreparationSummary({
    lessonId: lesson.id,
    courseId: course.id,
    stepRows,
    readiness,
  });

  return LessonEditorDTOSchema.parse({
    course: courseDto,
    classes: classDtos,
    lesson: await getLessonSummaryDTO(lesson),
    steps: stepRows.flatMap((step) => {
      const parsed = parseStepPayloadWithIssues(step);
      if (!parsed.ok) {
        return [];
      }

      const hydrated = hydrateTeachingDesign(parsed.payload);
      const pluginAuthoring = hydrated.payload.builtInSource?.builtInKey === "classroomVoting"
        ? {
            persistedConfigJson: votingContext.extensionByStepId.get(step.id)?.payloadJson ?? null,
            fallbackMessage: resolveVotingExecutableContract({
              stepId: step.id,
              payload: hydrated.payload,
              plugin: votingContext.pluginById.get(hydrated.payload.builtInSource.pluginId) ?? null,
              extension: votingContext.extensionByStepId.get(step.id) ?? null,
            }).ok
              ? null
              : ((() => {
                  const extension = votingContext.extensionByStepId.get(step.id);
                  if (!extension) return null;
                  const parsedConfig = ClassroomVotingAuthoringConfigSchema.safeParse(
                    (extension.payloadJson as { executableConfig?: unknown } | null)?.executableConfig,
                  );
                  return parsedConfig.success
                    ? null
                    : "当前投票配置无法解析，已回退到默认值，请重新确认并保存。";
                })()),
          }
        : undefined;

      return [{
        id: step.id,
        lessonId: step.lessonId,
        type: step.type,
        title: step.title,
        rank: step.rank,
        payload: hydrated.payload,
        teachingDesignStatus: hydrated.teachingDesignStatus,
        needsTeachingDesignRefinement: hydrated.needsTeachingDesignRefinement,
        teachingDesignFallbackReason: hydrated.teachingDesignFallbackReason,
        pluginAuthoring,
        archivedAt: nullableIso(step.archivedAt),
        updatedAt: toIso(step.updatedAt),
      }];
    }),
    materials: materialRows.map((material) => ({
      id: material.id,
      lessonId: material.lessonId,
      stepId: material.stepId,
      title: material.title,
      kind: material.kind,
      url: material.url,
      note: material.note,
    })),
    preparationSummary,
    publishState: {
      isDraftHidden: lesson.status !== "published",
      latestVersion: latestVersion?.version ?? null,
      publishedAt: nullableIso(latestVersion?.publishedAt),
      canPublish: readiness.canPublish,
      blockingIssues: readiness.blockingIssues,
      warnings: [],
    },
  });
}

export async function saveVotingLessonStepConfig(input: SaveVotingLessonStepConfigInput): Promise<SaveVotingLessonStepConfigResult> {
  const scope = await assertActiveTeacher();
  const { step, lesson, course } = await getScopedStep(input.stepId, scope);
  const expectedUpdatedAt = new Date(input.expectedUpdatedAt);
  if (Number.isNaN(expectedUpdatedAt.getTime())) {
    throw new Error("CONFLICT");
  }

  const payload = lessonStepPayloadSchema.parse(step.payloadJson);
  if (payload.type !== "quiz") {
    throw new Error("VOTING_STEP_NOT_QUIZ");
  }
  const executableConfig = ClassroomVotingAuthoringConfigSchema.parse(input.executableConfig);
  const pluginRows = await db.query.pluginRegistrations.findMany({
    where: eq(pluginRegistrations.schoolId, course.schoolId),
    columns: {
      id: true,
      pluginKey: true,
      name: true,
      enabled: true,
      killSwitchEnabled: true,
      lifecycleState: true,
      manifestJson: true,
    },
  });
  const plugin = pluginRows.find((item) => item.id === input.pluginId) as PublishPluginRegistryEntry | undefined;

  assertVotingPluginWritable({
    stepId: input.stepId,
    payload,
    plugin: plugin ?? null,
    pluginId: input.pluginId,
  });

  const nextPayload = buildVotingQuizShell({
    currentPayload: payload,
    executableConfig,
  });
  const extensionPayload = buildVotingExtensionPayload({
    pluginId: input.pluginId,
    executableConfig,
  });

  const savedAt = new Date();

  await db.transaction(async (tx) => {
    const updatedSteps = await tx
      .update(lessonSteps)
      .set({
        title: input.title,
        type: "quiz",
        payloadJson: nextPayload,
        updatedAt: savedAt,
      })
      .where(and(eq(lessonSteps.id, input.stepId), eq(lessonSteps.updatedAt, expectedUpdatedAt)))
      .returning({ id: lessonSteps.id });

    if (updatedSteps.length === 0) {
      throw new Error("CONFLICT");
    }

    await upsertPluginStepExtensionWithTx({
      tx,
      schoolId: course.schoolId,
      pluginId: input.pluginId,
      lessonStepId: input.stepId,
      payloadJson: extensionPayload,
    });

    await tx
      .update(lessons)
      .set({ revision: lesson.revision + 1, updatedAt: savedAt })
      .where(eq(lessons.id, lesson.id));
  });

  const publishState = await getLessonPublishReadinessDTO({ lessonId: lesson.id });

  return {
    ok: true,
    lessonId: lesson.id,
    courseId: course.id,
    stepId: input.stepId,
    savedAt: toIso(savedAt),
    publishState,
  };
}

export async function createCourseForTeacher(input: CreateCourseInput) {
  const scope = await assertActiveTeacher();
  assertSchoolAccess(scope, input.schoolId);

  const [course] = await db
    .insert(courses)
    .values({ ...input, ownerId: scope.userId, status: "draft" })
    .returning();

  return getCourseDTO(course);
}

export async function createLessonDraft(input: LessonDraftInput) {
  const scope = await assertActiveTeacher();
  await getScopedCourse(input.courseId, scope);

  const [lesson] = await db
    .insert(lessons)
    .values({
      courseId: input.courseId,
      createdById: scope.userId,
      title: input.title,
      objective: input.objective,
      status: "draft",
      revision: 1,
    })
    .returning();

  return getLessonSummaryDTO(lesson);
}

export async function updateLessonDraft(input: LessonDraftInput & { lessonId: string }): Promise<AutosaveResultDTO> {
  const scope = await assertActiveTeacher();
  const { lesson } = await getScopedLesson(input.lessonId, scope);

  if (input.expectedRevision && input.expectedRevision !== lesson.revision) {
    throw new Error("CONFLICT");
  }

  const [updated] = await db
    .update(lessons)
    .set({
      title: input.title,
      objective: input.objective,
      revision: lesson.revision + 1,
      updatedAt: new Date(),
    })
    .where(eq(lessons.id, input.lessonId))
    .returning();

  return AutosaveResultDTOSchema.parse({
    ok: true,
    lessonId: updated.id,
    courseId: updated.courseId,
    revision: updated.revision,
    savedAt: toIso(updated.updatedAt),
  });
}

export async function duplicateLesson(lessonId: string) {
  await assertActiveTeacher();
  const editor = await getLessonEditorDTO(lessonId);
  const draft = await createLessonDraft({
    courseId: editor.lesson.courseId,
    title: `${editor.lesson.title} 副本`,
    objective: editor.lesson.objective,
  });

  for (const step of editor.steps.filter((item) => !item.archivedAt)) {
    await addLessonStep({ lessonId: draft.id, type: step.type, title: step.title, payload: step.payload });
  }

  await assertActiveTeacher();
  return draft;
}

export async function archiveLesson(lessonId: string): Promise<AutosaveResultDTO> {
  const scope = await assertActiveTeacher();
  const { lesson } = await getScopedLesson(lessonId, scope);
  const [updated] = await db
    .update(lessons)
    .set({ status: "archived", revision: lesson.revision + 1, updatedAt: new Date() })
    .where(eq(lessons.id, lessonId))
    .returning();

  return AutosaveResultDTOSchema.parse({
    ok: true,
    lessonId,
    courseId: lesson.courseId,
    revision: updated.revision,
    savedAt: toIso(updated.updatedAt),
  });
}

export async function addLessonStep(input: AddLessonStepInput): Promise<AutosaveResultDTO> {
  const scope = await assertActiveTeacher();
  const { lesson, course } = await getScopedLesson(input.lessonId, scope);
  const payload = lessonStepPayloadSchema.parse(input.payload);
  const lastStep = await db.query.lessonSteps.findFirst({
    where: eq(lessonSteps.lessonId, input.lessonId),
    orderBy: desc(lessonSteps.rank),
  });
  const rank = input.afterRank ? createRankAfter(input.afterRank) : lastStep ? createRankAfter(lastStep.rank) : createInitialRank();
  const [step] = await db
    .insert(lessonSteps)
    .values({ lessonId: input.lessonId, type: input.type, title: input.title, rank, payloadJson: payload })
    .returning();

  await syncMarkdownAssetForStep({
    lessonId: input.lessonId,
    courseId: course.id,
    schoolId: course.schoolId,
    actorId: scope.userId,
    stepId: step.id,
    title: input.title,
    payload,
  });

  await db
    .update(lessons)
    .set({ revision: lesson.revision + 1, updatedAt: new Date() })
    .where(eq(lessons.id, input.lessonId));

  return AutosaveResultDTOSchema.parse({
    ok: true,
    lessonId: input.lessonId,
    courseId: lesson.courseId,
    stepId: step.id,
    savedAt: toIso(step.updatedAt),
  });
}

export async function updateLessonStep(input: UpdateLessonStepInput): Promise<AutosaveResultDTO> {
  const scope = await assertActiveTeacher();
  const { step, lesson, course } = await getScopedStep(input.stepId, scope);
  const payload = lessonStepPayloadSchema.parse(input.payload);
  const [updated] = await db
    .update(lessonSteps)
    .set({ title: input.title, type: payload.type, payloadJson: payload, updatedAt: new Date() })
    .where(eq(lessonSteps.id, input.stepId))
    .returning();

  await syncMarkdownAssetForStep({
    lessonId: step.lessonId,
    courseId: course.id,
    schoolId: course.schoolId,
    actorId: scope.userId,
    stepId: updated.id,
    title: input.title,
    payload,
  });

  await db
    .update(lessons)
    .set({ revision: lesson.revision + 1, updatedAt: new Date() })
    .where(eq(lessons.id, step.lessonId));

  return AutosaveResultDTOSchema.parse({
    ok: true,
    lessonId: step.lessonId,
    courseId: course.id,
    stepId: updated.id,
    savedAt: toIso(updated.updatedAt),
  });
}

export async function duplicateLessonStep(stepId: string): Promise<AutosaveResultDTO> {
  const scope = await assertActiveTeacher();
  const { step } = await getScopedStep(stepId, scope);

  return addLessonStep({
    lessonId: step.lessonId,
    type: step.type as "content" | "task" | "quiz",
    title: `${step.title} 副本`,
    payload: lessonStepPayloadSchema.parse(step.payloadJson),
    afterRank: step.rank,
  });
}

export async function archiveLessonStep(stepId: string): Promise<AutosaveResultDTO> {
  const scope = await assertActiveTeacher();
  const { step, lesson, course } = await getScopedStep(stepId, scope);
  const [updated] = await db
    .update(lessonSteps)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(lessonSteps.id, stepId))
    .returning();

  await db
    .update(lessons)
    .set({ revision: lesson.revision + 1, updatedAt: new Date() })
    .where(eq(lessons.id, step.lessonId));

  return AutosaveResultDTOSchema.parse({
    ok: true,
    lessonId: step.lessonId,
    courseId: course.id,
    stepId: updated.id,
    savedAt: toIso(updated.updatedAt),
  });
}

export async function reorderLessonStep(input: ReorderLessonStepInput): Promise<AutosaveResultDTO> {
  const scope = await assertActiveTeacher();
  const { step, lesson, course } = await getScopedStep(input.stepId, scope);
  const rank = input.beforeRank && input.afterRank
    ? createRankBetween(input.beforeRank, input.afterRank)
    : input.beforeRank
      ? createRankAfter(input.beforeRank)
      : input.afterRank
        ? createRankBetween("0", input.afterRank)
        : createInitialRank();

  const [updated] = await db
    .update(lessonSteps)
    .set({ rank, updatedAt: new Date() })
    .where(eq(lessonSteps.id, input.stepId))
    .returning();

  await db
    .update(lessons)
    .set({ revision: lesson.revision + 1, updatedAt: new Date() })
    .where(eq(lessons.id, step.lessonId));

  return AutosaveResultDTOSchema.parse({
    ok: true,
    lessonId: step.lessonId,
    courseId: course.id,
    stepId: updated.id,
    savedAt: toIso(updated.updatedAt),
  });
}

export async function publishLesson(input: { lessonId: string; expectedRevision?: number }): Promise<PublishResultDTO> {
  const scope = await assertActiveTeacher();
  const { lesson, course } = await getScopedLesson(input.lessonId, scope);

  if (input.expectedRevision && input.expectedRevision !== lesson.revision) {
    throw new Error("CONFLICT");
  }

  const readiness = await getLessonPublishReadinessDTO({ lessonId: input.lessonId });
  if (!readiness.canPublish) {
    throw new Error("PUBLISH_BLOCKED");
  }

  const editor = await getLessonEditorDTO(input.lessonId);
  const stepRows = await db.query.lessonSteps.findMany({
    where: eq(lessonSteps.lessonId, lesson.id),
    orderBy: (step, { asc }) => [asc(step.rank)],
  });
  const votingContext = await getVotingPluginContext({
    actorId: scope.userId,
    schoolId: course.schoolId,
    stepRows,
    stepDtos: editor.steps.filter((step) => !step.archivedAt).map((step) => ({ id: step.id, payload: step.payload })),
  });
  const latestVersion = await db
    .select({ value: sql<number>`coalesce(max(${publishedLessonVersions.version}), 0)` })
    .from(publishedLessonVersions)
    .where(eq(publishedLessonVersions.lessonId, input.lessonId));
  const version = (latestVersion[0]?.value ?? 0) + 1;
  const frozenSteps = editor.steps.filter((step) => !step.archivedAt).map((step) => {
    if (!isVotingBuiltInSource(step.payload)) {
      return step;
    }

    const contract = resolveVotingExecutableContract({
      stepId: step.id,
      payload: step.payload,
      plugin: votingContext.pluginById.get(step.payload.builtInSource!.pluginId) ?? null,
      extension: votingContext.extensionByStepId.get(step.id) ?? null,
    });

    if (!contract.ok) {
      throw new Error("PUBLISH_BLOCKED");
    }

    return {
      ...step,
      pluginContract: contract.contract,
    };
  });
  const snapshotJson = {
    lesson: editor.lesson,
    course: editor.course,
    steps: frozenSteps,
    materials: editor.materials,
    publishedAt: new Date().toISOString(),
  };
  const [published] = await db
    .insert(publishedLessonVersions)
    .values({ lessonId: input.lessonId, version, snapshotJson, publishedById: scope.userId })
    .returning();

  await db
    .update(lessons)
    .set({
      publishedVersionId: published.id,
      status: "published",
      revision: lesson.revision + 1,
      updatedAt: new Date(),
    })
    .where(eq(lessons.id, input.lessonId));

  return PublishResultDTOSchema.parse({
    ok: true,
    lessonId: input.lessonId,
    courseId: lesson.courseId,
    version,
    publishedVersionId: published.id,
    publishedAt: toIso(published.publishedAt),
  });
}

/**
 * 根据 draft snapshotJson.steps 中的 payload 为每个草稿步骤派生显示标题。
 * content 类步骤有 title 字段，task/quiz 类通过 prompt/question 派生。
 */
function deriveDraftStepTitle(step: LessonStepPayload): string {
  switch (step.type) {
    case "content":
      return step.title;
    case "task":
      return step.prompt;
    case "quiz":
      return step.question;
    default:
      return "lesson-step";
  }
}

/**
 * Phase 64 Plan 02 — 读取当前课时最新的 pending AI 草稿，与活跃步骤做
 * 索引对齐 diff，返回审校 UI 所需的完整 DTO。
 *
 * 没有 pending 草稿时返回 hasPendingDraft=false、draftSteps=[]、diffRows=[]，
 * 以便调用方无需在 DAL 外做空值分支。
 */
export async function getLessonDraftReviewDTO(input: { lessonId: string }): Promise<LessonDraftReviewDTO> {
  const scope = await assertActiveTeacher();
  const { lesson, course } = await getScopedLesson(input.lessonId, scope);

  // 查最新 pending 草稿（D-01 只使用最新 pending 版本）
  const draftRows = await db.query.draftLessonVersions.findMany({
    where: and(
      eq(draftLessonVersions.lessonId, lesson.id),
      eq(draftLessonVersions.status, "pending"),
    ),
    orderBy: desc(draftLessonVersions.version),
  });
  const draft = draftRows[0] ?? null;

  // 查活跃步骤（未归档，rank 升序）
  const stepRows = await db.query.lessonSteps.findMany({
    where: and(eq(lessonSteps.lessonId, lesson.id), isNull(lessonSteps.archivedAt)),
    orderBy: (step, { asc }) => [asc(step.rank)],
  });

  // 构建 liveSteps DTO（遵循既有 DTO 构建模式）
  const liveSteps: LessonStepDTO[] = stepRows.flatMap((step) => {
    const parsed = lessonStepPayloadSchema.safeParse(step.payloadJson);
    if (!parsed.success) {
      return [];
    }
    const hydrated = hydrateTeachingDesign(parsed.data);
    return [
      {
        id: step.id,
        lessonId: step.lessonId,
        type: step.type as "content" | "task" | "quiz",
        title: step.title,
        rank: step.rank,
        payload: hydrated.payload,
        teachingDesignStatus: hydrated.teachingDesignStatus,
        needsTeachingDesignRefinement: hydrated.needsTeachingDesignRefinement,
        teachingDesignFallbackReason: hydrated.teachingDesignFallbackReason,
        archivedAt: nullableIso(step.archivedAt),
        updatedAt: toIso(step.updatedAt),
      },
    ] as unknown as LessonStepDTO[];
  });

  if (!draft) {
    // 没有 pending 草稿 → 返回空 diff 的 DTO
    return LessonDraftReviewDTOSchema.parse({
      lesson: await getLessonSummaryDTO(lesson),
      liveSteps,
      draftSteps: [],
      draftMeta: {
        draftVersionId: "none",
        version: 0,
        source: "ai",
        status: "pending",
        createdAt: toIso(new Date(0)),
        stepCount: 0,
      },
      diffRows: [],
      hasPendingDraft: false,
    });
  }

  // 解析 snapshotJson 中的步骤数组
  const snapshotStepsRaw = (draft.snapshotJson as { steps?: unknown[] } | null)?.steps;
  if (!Array.isArray(snapshotStepsRaw)) {
    throw new Error("DRAFT_SNAPSHOT_INVALID");
  }

  const draftStepsPayload: LessonStepPayload[] = [];
  for (const raw of snapshotStepsRaw) {
    const parsed = lessonStepPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      continue;
    }
    draftStepsPayload.push(parsed.data);
  }

  // 将 draft payload 映射为 DTO 形状（合成 id/rank/archivedAt 为 null 等字段）
  const draftSteps: LessonStepDTO[] = draftStepsPayload.map((payload, index) => {
    const hydrated = hydrateTeachingDesign(payload);
    const stepType = payload.type as "content" | "task" | "quiz";
    const title = deriveDraftStepTitle(payload);
    return {
      id: `draft-step-${index}`,
      lessonId: lesson.id,
      type: stepType,
      title,
      rank: `draft-${String(index).padStart(2, "0")}`,
      payload: hydrated.payload,
      teachingDesignStatus: hydrated.teachingDesignStatus,
      needsTeachingDesignRefinement: hydrated.needsTeachingDesignRefinement,
      teachingDesignFallbackReason: hydrated.teachingDesignFallbackReason,
      archivedAt: null,
      updatedAt: toIso(draft.createdAt),
    } as unknown as LessonStepDTO;
  });

  // 调用 Plan 01 的纯 diff 函数
  const diffRows = buildLessonDraftDiffRows(liveSteps, draftSteps);

  return LessonDraftReviewDTOSchema.parse({
    lesson: await getLessonSummaryDTO(lesson),
    liveSteps,
    draftSteps,
    draftMeta: {
      draftVersionId: draft.id,
      version: draft.version,
      source: draft.source,
      status: draft.status as "pending",
      createdAt: toIso(draft.createdAt),
      stepCount: draftStepsPayload.length,
    },
    diffRows,
    hasPendingDraft: true,
  });
}

/**
 * Phase 64 Plan 02 — 将 AI 草稿的步骤应用到活跃 lessonSteps。
 *
 * 事务内保证原子性：
 * 1. 归档所有活跃 lessonSteps（设置 archivedAt）
 * 2. 从草稿 snapshotJson.steps 插入新步骤（带 LexoRank 排序）
 * 3. 更新 lessons 行（aiDraftAppliedAt、latestDraftVersionId、revision、updatedAt）
 * 4. 更新 draftLessonVersions 行（status = 'applied'）
 *
 * 权限：必须通过 assertActiveTeacher + getScopedLesson 验证。
 * 不接受非 pending 状态的草稿。
 */
export async function applyDraftToLiveLesson(input: {
  lessonId: string;
  draftVersionId: string;
  editedSteps?: Array<{ title: string; description?: string; content?: string }>;
}): Promise<ApplyDraftResultDTO> {
  const scope = await assertActiveTeacher();
  const { lesson, course } = await getScopedLesson(input.lessonId, scope);

  // 加载指定 draft 行
  const draft = await db.query.draftLessonVersions.findFirst({
    where: eq(draftLessonVersions.id, input.draftVersionId),
  });
  if (!draft) {
    throw new Error("DRAFT_NOT_FOUND");
  }
  if (draft.status !== "pending") {
    throw new Error("DRAFT_NOT_PENDING");
  }

  // 解析 snapshotJson 中的步骤
  const snapshotStepsRaw = (draft.snapshotJson as { steps?: unknown[] } | null)?.steps;
  if (!Array.isArray(snapshotStepsRaw)) {
    throw new Error("DRAFT_SNAPSHOT_INVALID");
  }

  const draftStepsPayload: LessonStepPayload[] = [];
  for (const raw of snapshotStepsRaw) {
    const parsed = lessonStepPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      continue;
    }
    draftStepsPayload.push(parsed.data);
  }

  // 如果提供了编辑后的步骤，按索引合并（D-13: title/description/content 仅覆盖这些字段）
  if (input.editedSteps && input.editedSteps.length > 0) {
    for (let i = 0; i < input.editedSteps.length && i < draftStepsPayload.length; i++) {
      const edit = input.editedSteps[i]!;
      const step = draftStepsPayload[i]!;
      // 覆盖可编辑字段
      if (edit.title) {
        if (step.type === "content") {
          (step as { title: string }).title = edit.title;
        }
        // task/quiz 步骤的 title 来源于 prompt/question，不直接覆盖
      }
      if (step.type === "content" && edit.content) {
        (step as { body: string }).body = edit.content;
      }
    }
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    // 1. 归档所有活跃 lessonSteps
    await tx
      .update(lessonSteps)
      .set({ archivedAt: now, updatedAt: now })
      .where(and(eq(lessonSteps.lessonId, lesson.id), isNull(lessonSteps.archivedAt)));

    // 2. 插入新步骤（带 LexoRank 排序）
    let prevRank: string | null = null;
    for (let i = 0; i < draftStepsPayload.length; i++) {
      const payload = draftStepsPayload[i]!;
      const stepRank: string = i === 0 ? createInitialRank() : createRankAfter(prevRank!);
      const stepType = payload.type as "content" | "task" | "quiz";
      const title = deriveDraftStepTitle(payload);

      await tx.insert(lessonSteps).values({
        id: crypto.randomUUID(),
        lessonId: lesson.id,
        type: stepType,
        title,
        rank: stepRank,
        payloadJson: payload,
        createdAt: now,
        updatedAt: now,
      });

      prevRank = stepRank;
    }

    // 3. 更新 lessons 行（回链 draft 来源）
    await tx
      .update(lessons)
      .set({
        aiDraftAppliedAt: now,
        latestDraftVersionId: input.draftVersionId,
        revision: lesson.revision + 1,
        updatedAt: now,
      })
      .where(eq(lessons.id, lesson.id));

    // 4. 更新 draftLessonVersions 状态
    await tx
      .update(draftLessonVersions)
      .set({ status: "applied" })
      .where(eq(draftLessonVersions.id, input.draftVersionId));
  });

  return ApplyDraftResultDTOSchema.parse({
    lessonId: lesson.id,
    courseId: course.id,
    draftVersionId: input.draftVersionId,
    appliedStepCount: draftStepsPayload.length,
  });
}

/**
 * Phase 64 Plan 02 — 安全丢弃 AI 草稿。
 *
 * 仅标记 draftLessonVersions 行（status='discarded', archivedAt=now），
 * 绝不写入 lessonSteps 或 lessons 表（D-08）。
 *
 * 权限：必须通过 assertActiveTeacher + getScopedLesson 验证。
 * 不接受非 pending 状态的草稿。
 */
export async function discardDraftLessonVersion(input: {
  lessonId: string;
  draftVersionId: string;
}): Promise<DiscardDraftResultDTO> {
  const scope = await assertActiveTeacher();
  const { lesson } = await getScopedLesson(input.lessonId, scope);

  // 加载指定 draft 行
  const draft = await db.query.draftLessonVersions.findFirst({
    where: eq(draftLessonVersions.id, input.draftVersionId),
  });
  if (!draft) {
    throw new Error("DRAFT_NOT_FOUND");
  }
  if (draft.status !== "pending") {
    throw new Error("DRAFT_NOT_PENDING");
  }

  const now = new Date();

  // 仅更新 draftLessonVersions 行（不涉及 lessonSteps 或 lessons）
  await db
    .update(draftLessonVersions)
    .set({ status: "discarded", archivedAt: now })
    .where(eq(draftLessonVersions.id, input.draftVersionId));

  return DiscardDraftResultDTOSchema.parse({
    lessonId: lesson.id,
    draftVersionId: input.draftVersionId,
    discardedAt: toIso(now),
  });
}

/**
 * 把命令传入的整课 steps 作为内联 snapshotJson 单条原子写入 draftLessonVersions。
 *
 * 不变式（DRAFT-01 / D-01）：本函数**只** insert(draftLessonVersions)，绝不
 * insert/update live `lessons` 或 `lessonSteps`。授权由 Plan 04 handler 完成，DAL
 * 接收已授权的 createdById（不自行解析 actor）。version 取同 lessonId 既有 draft 的
 * max(version)+1（无既存从 1 起，仿 publishLesson）。source 硬编码 "ai"（D-04，本相位
 * 只写 ai）。唯一约束 (lessonId, sourceCommandId) 冲突向上抛——DAL 不 try/catch 静默
 * （DRAFT-02 幂等终判在 handler 层）。
 */
export async function persistDraftLessonVersion(input: {
  lessonId: string;
  steps: LessonStepPayload[];
  sourceCommandId: string;
  createdById: string;
}): Promise<{ draftVersionId: string; version: number; stepCount: number }> {
  const latestVersion = await db
    .select({ value: sql<number>`coalesce(max(${draftLessonVersions.version}), 0)` })
    .from(draftLessonVersions)
    .where(eq(draftLessonVersions.lessonId, input.lessonId));
  const version = (latestVersion[0]?.value ?? 0) + 1;

  const [draft] = await db
    .insert(draftLessonVersions)
    .values({
      lessonId: input.lessonId,
      version,
      source: "ai",
      sourceCommandId: input.sourceCommandId,
      createdById: input.createdById,
      snapshotJson: { steps: input.steps },
    })
    .returning();

  return {
    draftVersionId: draft.id,
    version,
    stepCount: input.steps.length,
  };
}
