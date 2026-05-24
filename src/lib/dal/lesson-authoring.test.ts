import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstCourses = vi.fn();
const findManyCourses = vi.fn();
const findFirstLessons = vi.fn();
const findManyLessons = vi.fn();
const findFirstLessonSteps = vi.fn();
const findManyLessonSteps = vi.fn();
const findManyLessonMaterials = vi.fn();
const findFirstPublishedLessonVersions = vi.fn();
const findManyCourseEnrollments = vi.fn();
const findManyCourseClasses = vi.fn();
const findManyClasses = vi.fn();
const findManyClassMembers = vi.fn();
const findManyPluginRegistrations = vi.fn();
const listPluginStepExtensions = vi.fn();
const selectCourseClassNames = vi.fn();
const selectWhere = vi.fn();
const insertReturning = vi.fn();
const insertValues = vi.fn(() => ({ returning: insertReturning }));
const updateReturning = vi.fn();
const updateWhere = vi.fn(() => ({ returning: updateReturning }));
const updateSet = vi.fn(() => ({ where: updateWhere }));
const getCurrentUserDTO = vi.fn();
const getUserMembershipsDTO = vi.fn();

const ownedCourse = {
  id: "course-owned",
  schoolId: "school-1",
  ownerId: "teacher-1",
  title: "我的课程",
  subject: "科学",
  grade: "七年级",
  status: "draft",
  updatedAt: new Date("2026-05-09T08:00:00.000Z"),
};

const ownedLesson = {
  id: "lesson-owned",
  courseId: "course-owned",
  title: "我的课时",
  objective: "观察现象",
  status: "draft",
  revision: 1,
  publishedVersionId: null,
  updatedAt: new Date("2026-05-09T08:30:00.000Z"),
};

vi.mock("server-only", () => ({}));

vi.mock("@/db", () => ({
  db: {
    insert: () => ({ values: insertValues }),
    update: () => ({ set: updateSet }),
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: () => selectCourseClassNames(),
        }),
        where: () => selectWhere(),
      }),
    }),
    query: {
      courses: { findFirst: findFirstCourses, findMany: findManyCourses },
      lessons: { findFirst: findFirstLessons, findMany: findManyLessons },
      lessonSteps: { findFirst: findFirstLessonSteps, findMany: findManyLessonSteps },
      courseEnrollments: { findMany: findManyCourseEnrollments },
      courseClasses: { findMany: findManyCourseClasses },
      classes: { findMany: findManyClasses },
      classMembers: { findMany: findManyClassMembers },
      lessonMaterials: { findMany: findManyLessonMaterials },
      publishedLessonVersions: { findFirst: findFirstPublishedLessonVersions },
      pluginRegistrations: { findMany: findManyPluginRegistrations },
    },
  },
}));

vi.mock("@/lib/dal/auth", () => ({
  getCurrentUserDTO,
}));

vi.mock("@/lib/dal/membership", () => ({
  getUserMembershipsDTO,
}));

vi.mock("@/lib/dal/plugin-data", () => ({
  listPluginStepExtensions,
}));

const source = readFileSync("src/lib/dal/lesson-authoring.ts", "utf8");
const dtoSource = readFileSync("src/lib/dto/lesson-authoring.ts", "utf8");

describe("lesson authoring DAL boundary", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    getCurrentUserDTO.mockResolvedValue({ id: "teacher-1" });
    getUserMembershipsDTO.mockResolvedValue([
      { schoolId: "school-1", role: "teacher", status: "active" },
    ]);

    findManyCourses.mockResolvedValue([
      ownedCourse,
      {
        id: "course-foreign",
        schoolId: "school-1",
        ownerId: "teacher-2",
        title: "同校其他教师课程",
        subject: "历史",
        grade: "七年级",
        status: "published",
        updatedAt: new Date("2026-05-09T09:00:00.000Z"),
      },
    ]);

    findFirstCourses.mockResolvedValue(ownedCourse);
    findFirstLessons.mockResolvedValue(ownedLesson);
    findManyLessons.mockResolvedValue([ownedLesson]);

    findManyLessonSteps.mockResolvedValue([{ id: "step-1", lessonId: "lesson-owned", archivedAt: null }]);
    findFirstLessonSteps.mockResolvedValue({ id: "step-last", lessonId: "lesson-owned", rank: "a0" });
    findManyLessonMaterials.mockResolvedValue([]);
    findFirstPublishedLessonVersions.mockResolvedValue(null);
    findManyCourseEnrollments.mockResolvedValue([{ id: "enrollment-1", courseId: "course-owned" }]);
    findManyCourseClasses.mockResolvedValue([{ courseId: "course-owned", classId: "class-1" }]);
    findManyClasses.mockResolvedValue([{ id: "class-1", schoolId: "school-1", name: "七年级一班" }]);
    findManyClassMembers.mockResolvedValue([{ id: "member-1", classId: "class-1", role: "student" }]);
    findManyPluginRegistrations.mockResolvedValue([
      {
        id: "plugin-1",
        schoolId: "school-1",
        pluginKey: "builtin-teaching-step-direct-instruction",
        name: "教师讲授",
        enabled: true,
        killSwitchEnabled: false,
        lifecycleState: "ready",
        manifestJson: { builtIn: true, manifestVersion: 2, governance: { contractVersion: "v2" } },
      },
    ]);
    listPluginStepExtensions.mockResolvedValue([]);
    selectCourseClassNames.mockResolvedValue([{ className: "七年级一班" }]);
    selectWhere.mockResolvedValue([{ value: 0 }]);
    insertReturning.mockResolvedValue([
      {
        id: "step-created",
        lessonId: "lesson-owned",
        updatedAt: new Date("2026-05-10T08:45:00.000Z"),
      },
    ]);
    updateReturning.mockResolvedValue([]);
  });

  it("is server-only and enforces teacher authorization", () => {
    expect(source.trimStart().startsWith('import "server-only";')).toBe(true);
    expect(source).toContain("assertActiveTeacher");
    expect(source).toContain("getUserMembershipsDTO");
    expect(source).toContain("TEACHER_AUTH_REQUIRED");
  });

  it("validates payloads and DTOs", () => {
    expect(source).toContain("lessonStepPayloadSchema.parse");
    expect(source).toContain("LessonEditorDTOSchema.parse");
    expect(source).toContain("preparationSummary");
  });

  it("uses rank reorder and stable published snapshots", () => {
    expect(source).toContain("createRankBetween");
    expect(source).toContain("publishedLessonVersions");
    expect(source).toContain("snapshotJson");
  });

  it("keeps markdown asset and material references inside the published snapshot chain", () => {
    expect(source).toContain("async function syncMarkdownAssetForStep");
    expect(source).toContain('classification: "markdown"');
    expect(source).toContain('kind: "markdown"');
    expect(source).toContain("content: input.payload.markdown.source");
    expect(source).toContain("url: asset.resourceId");
    expect(source).toContain("note: input.payload.markdown.renderMode");
    expect(source).toContain("materials: editor.materials");
    expect(source).toContain("const frozenSteps = editor.steps.filter((step) => !step.archivedAt).map((step) => {");
  });

  it("persists updated lesson step payloads and bumps lesson revision", () => {
    expect(source).toContain("export async function updateLessonStep");
    expect(source).toContain("lessonStepPayloadSchema.parse(input.payload)");
    expect(source).toContain("revision: lesson.revision + 1");
    expect(source).toContain("await getScopedStep");
    expect(source).toContain("getLessonEditorDTO");
  });

  it("extends content, task, and quiz payload schemas with an optional runtime descriptor", () => {
    expect(dtoSource).toContain('import { RuntimeDescriptorSchema } from "@/features/runtime-platform/contracts/descriptors";');
    expect(dtoSource).toContain("runtime: RuntimeDescriptorSchema.optional()");
  });

  it("enforces course ownership for lesson authoring reads and writes", () => {
    expect(source).toContain("course.ownerId !== scope.userId");
    expect(source).toContain("courseRows.filter((course) => course.ownerId === scope.userId)");
  });

  it("resolves editor classes from linked class ids instead of class name matching", () => {
    expect(source).toContain("async function getCourseClassDtos");
    expect(source).toContain("db.query.courseClasses.findMany");
    expect(source).not.toContain("courseDto.classLabels.includes(classDto.name)");
  });

  it("preserves built-in provenance when adding a built-in teaching step", async () => {
    const { addLessonStep } = await import("./lesson-authoring");

    await addLessonStep({
      lessonId: "lesson-owned",
      type: "content",
      title: "教师讲授",
      payload: {
        type: "content",
        title: "教师讲授",
        body: "讲授牛顿第一定律",
        materialRefs: [],
        builtInSource: {
          pluginId: "plugin-1",
          builtInKey: "directInstruction",
          pluginName: "教师讲授",
        },
      },
    });

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        payloadJson: expect.objectContaining({
          builtInSource: {
            pluginId: "plugin-1",
            builtInKey: "directInstruction",
            pluginName: "教师讲授",
          },
        }),
      })
    );
  });

  it("freezes the full runtime descriptor into the published snapshot", async () => {
    const { publishLesson } = await import("./lesson-authoring");

    const runtimeStepRows = [
      {
        id: "step-runtime",
        lessonId: "lesson-owned",
        type: "task",
        title: "交互实验",
        rank: "a1",
        payloadJson: {
          type: "task",
          prompt: "提交你的实验结果",
          submissionType: "text",
          materialRefs: [],
          runtime: {
            version: "v2",
            runtimeId: "runtime-html-courseware",
            runtimeVersion: "2026.05.0",
            kind: "html-courseware",
            displayName: "HTML 实验",
            stateSchemaVersion: "state-v1",
            entry: {
              sandbox: "iframe",
              bootstrap: "/runtime/html-courseware",
            },
            bootstrap: {
              contextMode: "minimal",
              resumeStrategy: "latest-or-create",
              capabilitySnapshot: "session-scoped",
            },
            submitTarget: {
              primary: "classroom-evidence",
              additional: ["task-submission"],
            },
            requestedCapabilities: ["runtime:submission:create"],
          },
        },
        archivedAt: null,
        updatedAt: new Date("2026-05-09T08:40:00.000Z"),
      },
    ];

    findManyLessonSteps
      .mockResolvedValueOnce(runtimeStepRows)
      .mockResolvedValueOnce(runtimeStepRows)
      .mockResolvedValueOnce(runtimeStepRows)
      .mockResolvedValueOnce(runtimeStepRows);
    insertReturning.mockResolvedValueOnce([
      {
        id: "published-version-1",
        publishedAt: new Date("2026-05-10T09:00:00.000Z"),
      },
    ]);

    await publishLesson({ lessonId: "lesson-owned" });

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshotJson: expect.objectContaining({
          steps: [
            expect.objectContaining({
              payload: expect.objectContaining({
                runtime: expect.objectContaining({
                  runtimeId: "runtime-html-courseware",
                  runtimeVersion: "2026.05.0",
                  stateSchemaVersion: "state-v1",
                  submitTarget: {
                    primary: "classroom-evidence",
                    additional: ["task-submission"],
                  },
                }),
              }),
            }),
          ],
        }),
      }),
    );
  });

  it("freezes the canonical html courseware pilot descriptor into the published snapshot chain", async () => {
    const { getCanonicalRuntimeProofSnapshotStep } = await import("@/features/runtime-platform/classroom/runtime-proof");
    const snapshotStep = getCanonicalRuntimeProofSnapshotStep("lesson-owned");

    expect(snapshotStep).toMatchObject({
      lessonId: "lesson-owned",
      type: "task",
      title: expect.stringContaining("HTML"),
      payload: expect.objectContaining({
        runtime: expect.objectContaining({
          kind: "html-courseware",
          entry: expect.objectContaining({
            bootstrap: "/runtime/html-courseware/pilot",
          }),
          submitTarget: {
            primary: "classroom-evidence",
            additional: ["task-submission"],
          },
        }),
      }),
    });
  });

  it("keeps editor/publish continuity tied to the canonical proof runtime title", async () => {
    const { getCanonicalRuntimeProofStepDefinition } = await import("@/features/runtime-platform/classroom/runtime-proof");
    const definition = getCanonicalRuntimeProofStepDefinition();

    expect(definition.title).toBe("互动证明：HTML 课件实验");
    expect(definition.payload).toMatchObject({
      runtime: expect.objectContaining({
        kind: "html-courseware",
        entry: expect.objectContaining({
          bootstrap: "/runtime/html-courseware/pilot",
        }),
      }),
    });
  });

  it("returns structured readiness blocking issues for draft completeness and plugin availability", async () => {
    const dal = (await import("./lesson-authoring")) as Record<string, unknown>;
    expect(typeof dal.getLessonPublishReadinessDTO).toBe("function");

    findFirstLessons.mockResolvedValueOnce({
      ...ownedLesson,
      title: "",
      objective: "",
    });
    findManyLessonSteps.mockResolvedValueOnce([]);

    const missingFields = await (dal.getLessonPublishReadinessDTO as (input: { lessonId: string }) => Promise<{
      canPublish: boolean;
      blockingIssues: Array<{ code: string }>;
    }> )({ lessonId: "lesson-owned" });

    expect(missingFields.canPublish).toBe(false);
    expect(missingFields.blockingIssues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "LESSON_TITLE_REQUIRED",
        "LESSON_OBJECTIVE_REQUIRED",
        "NO_ACTIVE_STEPS",
      ])
    );

    findFirstLessons.mockResolvedValueOnce(ownedLesson);
    findManyLessonSteps.mockResolvedValueOnce([
      {
        id: "step-invalid",
        lessonId: "lesson-owned",
        type: "content",
        title: "坏数据",
        rank: "a0",
        payloadJson: { type: "content", title: "", body: "" },
        archivedAt: null,
        updatedAt: new Date("2026-05-09T08:31:00.000Z"),
      },
      {
        id: "step-built-in",
        lessonId: "lesson-owned",
        type: "content",
        title: "教师讲授",
        rank: "a1",
        payloadJson: {
          type: "content",
          title: "教师讲授",
          body: "讲授内容",
          materialRefs: [],
          builtInSource: {
            pluginId: "plugin-missing",
            builtInKey: "directInstruction",
            pluginName: "教师讲授",
          },
        },
        archivedAt: null,
        updatedAt: new Date("2026-05-09T08:32:00.000Z"),
      },
    ]);
    findManyPluginRegistrations.mockResolvedValueOnce([
      {
        id: "plugin-1",
        schoolId: "school-1",
        enabled: true,
        killSwitchEnabled: false,
        manifestJson: { builtIn: true },
      },
    ]);

    const readiness = await (dal.getLessonPublishReadinessDTO as (input: { lessonId: string }) => Promise<{
      canPublish: boolean;
      blockingIssues: Array<{ code: string; stepId?: string | null }>;
    }> )({ lessonId: "lesson-owned" });

    expect(readiness.canPublish).toBe(false);
    expect(readiness.blockingIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "STEP_PAYLOAD_INVALID", stepId: "step-invalid" }),
        expect.objectContaining({ code: "BUILT_IN_PLUGIN_UNAVAILABLE", stepId: "step-built-in" }),
      ])
    );
  });

  it("blocks publish when classroom voting config is missing, invalid, disabled, or incompatible", async () => {
    const dal = (await import("./lesson-authoring")) as Record<string, unknown>;

    const votingStep = {
      id: "step-voting",
      lessonId: "lesson-owned",
      type: "quiz",
      title: "课堂投票",
      rank: "a1",
      payloadJson: {
        type: "quiz",
        question: "你更支持哪种方案？",
        options: ["方案 A", "方案 B", "需要更多信息"],
        explanation: "请根据课堂讨论选择。",
        allowRetry: false,
        retryPolicy: "none",
        revealCorrectAnswer: false,
        builtInSource: {
          pluginId: "plugin-voting",
          builtInKey: "classroomVoting",
          pluginName: "课堂投票",
        },
      },
      archivedAt: null,
      updatedAt: new Date("2026-05-24T10:00:00.000Z"),
    };

    findManyLessonSteps.mockResolvedValue(votingStep ? [votingStep] : []);

    findManyPluginRegistrations.mockResolvedValue([
      {
        id: "plugin-voting",
        schoolId: "school-1",
        pluginKey: "builtin-teaching-step-classroom-voting",
        name: "课堂投票",
        enabled: true,
        killSwitchEnabled: false,
        lifecycleState: "ready",
        manifestJson: {
          builtIn: true,
          manifestVersion: 2,
          governance: { contractVersion: "v2" },
        },
      },
    ]);
    listPluginStepExtensions.mockResolvedValue([]);

    const missingConfig = await (dal.getLessonPublishReadinessDTO as (input: { lessonId: string }) => Promise<{
      canPublish: boolean;
      blockingIssues: Array<{ code: string; stepId?: string | null }>;
    }> )({ lessonId: "lesson-owned" });

    expect(missingConfig.canPublish).toBe(false);
    expect(missingConfig.blockingIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "VOTING_PLUGIN_CONFIG_MISSING", stepId: "step-voting" }),
      ])
    );

    findManyPluginRegistrations.mockResolvedValue([
      {
        id: "plugin-voting",
        schoolId: "school-1",
        pluginKey: "builtin-teaching-step-classroom-voting",
        name: "课堂投票",
        enabled: true,
        killSwitchEnabled: false,
        lifecycleState: "ready",
        manifestJson: {
          builtIn: true,
          manifestVersion: 2,
          governance: { contractVersion: "v2" },
        },
      },
    ]);
    listPluginStepExtensions.mockResolvedValue([
      {
        lessonStepId: "step-voting",
        payloadJson: {
          kind: "classroom-voting",
          contractVersion: "v1",
          runtimeContractVersion: "v2",
          executableConfig: {
            prompt: "",
            options: [{ id: "a", label: "A" }],
          },
        },
      },
    ]);

    const invalidConfig = await (dal.getLessonPublishReadinessDTO as (input: { lessonId: string }) => Promise<{
      canPublish: boolean;
      blockingIssues: Array<{ code: string; stepId?: string | null }>;
    }> )({ lessonId: "lesson-owned" });

    expect(invalidConfig.canPublish).toBe(false);
    expect(invalidConfig.blockingIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "VOTING_PLUGIN_CONFIG_INVALID", stepId: "step-voting" }),
      ])
    );

    findManyPluginRegistrations.mockResolvedValue([
      {
        id: "plugin-voting",
        schoolId: "school-1",
        pluginKey: "builtin-teaching-step-classroom-voting",
        name: "课堂投票",
        enabled: false,
        killSwitchEnabled: true,
        lifecycleState: "suspended",
        manifestJson: {
          builtIn: true,
          manifestVersion: 2,
          governance: { contractVersion: "v2" },
        },
      },
    ]);
    listPluginStepExtensions.mockResolvedValue([
      {
        lessonStepId: "step-voting",
        payloadJson: {
          kind: "classroom-voting",
          contractVersion: "v1",
          runtimeContractVersion: "v2",
          executableConfig: {
            prompt: "请选择你的判断",
            options: [
              { id: "a", label: "方案 A" },
              { id: "b", label: "方案 B" },
            ],
            allowMultiple: false,
            anonymousResults: true,
            showLiveResults: true,
            participationWindowSeconds: 90,
            resultsDisplay: "bar",
          },
        },
      },
    ]);

    const disabledPlugin = await (dal.getLessonPublishReadinessDTO as (input: { lessonId: string }) => Promise<{
      canPublish: boolean;
      blockingIssues: Array<{ code: string; stepId?: string | null }>;
    }> )({ lessonId: "lesson-owned" });

    expect(disabledPlugin.canPublish).toBe(false);
    expect(disabledPlugin.blockingIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "VOTING_PLUGIN_DISABLED", stepId: "step-voting" }),
      ])
    );

    findManyPluginRegistrations.mockResolvedValue([
      {
        id: "plugin-voting",
        schoolId: "school-1",
        pluginKey: "builtin-teaching-step-classroom-voting",
        name: "课堂投票",
        enabled: true,
        killSwitchEnabled: false,
        lifecycleState: "ready",
        manifestJson: {
          builtIn: true,
          manifestVersion: 1,
        },
      },
    ]);
    listPluginStepExtensions.mockResolvedValue([
      {
        lessonStepId: "step-voting",
        payloadJson: {
          kind: "classroom-voting",
          contractVersion: "v1",
          runtimeContractVersion: "v2",
          executableConfig: {
            prompt: "请选择你的判断",
            options: [
              { id: "a", label: "方案 A" },
              { id: "b", label: "方案 B" },
            ],
            allowMultiple: false,
            anonymousResults: true,
            showLiveResults: true,
            participationWindowSeconds: 90,
            resultsDisplay: "bar",
          },
        },
      },
    ]);

    const incompatiblePlugin = await (dal.getLessonPublishReadinessDTO as (input: { lessonId: string }) => Promise<{
      canPublish: boolean;
      blockingIssues: Array<{ code: string; stepId?: string | null }>;
    }> )({ lessonId: "lesson-owned" });

    expect(incompatiblePlugin.canPublish).toBe(false);
    expect(incompatiblePlugin.blockingIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "VOTING_PLUGIN_INCOMPATIBLE", stepId: "step-voting" }),
      ])
    );
  });

  it("freezes classroom voting executable config into the published snapshot instead of rereading draft extensions", async () => {
    const { publishLesson } = await import("./lesson-authoring");

    const votingStepRows = [
      {
        id: "step-voting",
        lessonId: "lesson-owned",
        type: "quiz",
        title: "课堂投票",
        rank: "a1",
        payloadJson: {
          type: "quiz",
          question: "你更支持哪种方案？",
          options: ["方案 A", "方案 B", "需要更多信息"],
          explanation: "请根据课堂讨论选择。",
          allowRetry: false,
          retryPolicy: "none",
          revealCorrectAnswer: false,
          builtInSource: {
            pluginId: "plugin-voting",
            builtInKey: "classroomVoting",
            pluginName: "课堂投票",
          },
        },
        archivedAt: null,
        updatedAt: new Date("2026-05-24T10:00:00.000Z"),
      },
    ];

    findManyLessonSteps.mockResolvedValue(votingStepRows);
    findManyPluginRegistrations.mockResolvedValue([
      {
        id: "plugin-voting",
        schoolId: "school-1",
        pluginKey: "builtin-teaching-step-classroom-voting",
        name: "课堂投票",
        enabled: true,
        killSwitchEnabled: false,
        lifecycleState: "ready",
        manifestJson: {
          builtIn: true,
          manifestVersion: 2,
          governance: { contractVersion: "v2" },
        },
      },
    ]);
    listPluginStepExtensions.mockResolvedValue([
      {
        lessonStepId: "step-voting",
        payloadJson: {
          kind: "classroom-voting",
          contractVersion: "v1",
          runtimeContractVersion: "v2",
          executableConfig: {
            prompt: "请选择你当前更认可的判断。",
            options: [
              { id: "option-a", label: "我支持方案 A" },
              { id: "option-b", label: "我支持方案 B" },
              { id: "option-c", label: "我还想再讨论" },
            ],
            allowMultiple: false,
            anonymousResults: true,
            showLiveResults: true,
            participationWindowSeconds: 90,
            resultsDisplay: "bar",
          },
        },
      },
    ]);
    insertReturning.mockResolvedValueOnce([
      {
        id: "published-version-voting",
        publishedAt: new Date("2026-05-24T10:10:00.000Z"),
      },
    ]);

    await publishLesson({ lessonId: "lesson-owned" });

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshotJson: expect.objectContaining({
          steps: [
            expect.objectContaining({
              id: "step-voting",
              pluginContract: {
                kind: "classroom-voting",
                contractVersion: "v1",
                runtimeContractVersion: "v2",
                pluginId: "plugin-voting",
                publicMetadata: {
                  builtInKey: "classroomVoting",
                  pluginKey: "builtin-teaching-step-classroom-voting",
                  pluginName: "课堂投票",
                  stepType: "quiz",
                },
                executableConfig: expect.objectContaining({
                  prompt: "请选择你当前更认可的判断。",
                  options: expect.arrayContaining([
                    expect.objectContaining({ id: "option-a", label: "我支持方案 A" }),
                  ]),
                }),
              },
            }),
          ],
        }),
      })
    );
  });

  it("builds a teacher preview DTO with ordered active steps, materials, and built-in source labels", async () => {
    const dal = (await import("./lesson-authoring")) as Record<string, unknown>;
    expect(typeof dal.getTeacherLessonPreviewDTO).toBe("function");

    findManyLessonSteps.mockResolvedValueOnce([
      { id: "step-built-in", lessonId: "lesson-owned", archivedAt: null },
      { id: "step-task", lessonId: "lesson-owned", archivedAt: null },
    ]);
    findManyLessonSteps.mockResolvedValueOnce([
      {
        id: "step-archived",
        lessonId: "lesson-owned",
        type: "task",
        title: "已归档",
        rank: "a0",
        payloadJson: {
          type: "task",
          prompt: "旧任务",
          submissionType: "text",
          materialRefs: [],
        },
        archivedAt: new Date("2026-05-09T08:20:00.000Z"),
        updatedAt: new Date("2026-05-09T08:20:00.000Z"),
      },
      {
        id: "step-built-in",
        lessonId: "lesson-owned",
        type: "content",
        title: "教师讲授",
        rank: "a1",
        payloadJson: {
          type: "content",
          title: "教师讲授",
          body: "讲授内容",
          materialRefs: [],
          builtInSource: {
            pluginId: "plugin-1",
            builtInKey: "directInstruction",
            pluginName: "教师讲授",
          },
        },
        archivedAt: null,
        updatedAt: new Date("2026-05-09T08:21:00.000Z"),
      },
      {
        id: "step-task",
        lessonId: "lesson-owned",
        type: "task",
        title: "课堂任务",
        rank: "a2",
        payloadJson: {
          type: "task",
          prompt: "记录你的发现",
          submissionType: "text",
          materialRefs: [],
        },
        archivedAt: null,
        updatedAt: new Date("2026-05-09T08:22:00.000Z"),
      },
    ]);
    findManyLessonMaterials.mockResolvedValueOnce([
      {
        id: "material-1",
        lessonId: "lesson-owned",
        stepId: null,
        title: "牛顿第一定律讲义",
        kind: "link",
        url: "https://example.com/lesson.pdf",
        note: "课前阅读",
      },
    ]);

    const preview = await (dal.getTeacherLessonPreviewDTO as (input: { lessonId: string }) => Promise<{
      lesson: { id: string };
      steps: Array<{ id: string; builtInSourceLabel: string | null }>;
      materials: Array<{ id: string }>;
    }> )({ lessonId: "lesson-owned" });

    expect(preview.lesson.id).toBe("lesson-owned");
    expect(preview.steps.map((step) => step.id)).toEqual(["step-built-in", "step-task"]);
    expect(preview.steps[0]?.builtInSourceLabel).toBe("教师讲授");
    expect(preview.materials.map((material) => material.id)).toEqual(["material-1"]);
  }, 20_000);

  it("returns only teacher-owned courses and lessons in the authoring overview", async () => {
    const { getTeacherAuthoringOverview } = await import("./lesson-authoring");

    const overview = await getTeacherAuthoringOverview();

    expect(overview.courses.map((course) => course.id)).toEqual(["course-owned"]);
    expect(overview.lessons.map((lesson) => lesson.id)).toEqual(["lesson-owned"]);
  }, 20_000);

  it("keeps legacy content, task, and quiz payloads readable without teachingDesign", async () => {
    const dal = (await import("./lesson-authoring")) as Record<string, unknown>;

    const legacySteps = [
      {
        id: "step-content",
        lessonId: "lesson-owned",
        type: "content",
        title: "讲授",
        rank: "a1",
        payloadJson: {
          type: "content",
          title: "讲授",
          body: "牛顿第一定律",
          materialRefs: [],
        },
        archivedAt: null,
        updatedAt: new Date("2026-05-09T08:21:00.000Z"),
      },
      {
        id: "step-task",
        lessonId: "lesson-owned",
        type: "task",
        title: "练习",
        rank: "a2",
        payloadJson: {
          type: "task",
          prompt: "写下你的观察",
          submissionType: "text",
          materialRefs: [],
        },
        archivedAt: null,
        updatedAt: new Date("2026-05-09T08:22:00.000Z"),
      },
      {
        id: "step-quiz",
        lessonId: "lesson-owned",
        type: "quiz",
        title: "检测",
        rank: "a3",
        payloadJson: {
          type: "quiz",
          question: "惯性是什么？",
          options: ["保持原运动状态", "受力大小"],
        },
        archivedAt: null,
        updatedAt: new Date("2026-05-09T08:23:00.000Z"),
      },
    ];

    findManyLessonSteps.mockResolvedValueOnce(legacySteps).mockResolvedValueOnce(legacySteps);

    const preview = await (dal.getTeacherLessonPreviewDTO as (input: { lessonId: string }) => Promise<{
      steps: Array<{
        payload: { teachingDesign?: { activityIntent: string; estimatedMinutes: number; activityMode: string } };
        teachingDesignStatus: string;
        teachingDesignFallbackReason: string | null;
      }>;
    }>)({ lessonId: "lesson-owned" });

    expect(preview.steps.map((step) => step.payload.teachingDesign?.activityIntent)).toEqual([
      "explain",
      "practice",
      "check",
    ]);
    expect(preview.steps.map((step) => step.payload.teachingDesign?.estimatedMinutes)).toEqual([12, 15, 8]);
    expect(preview.steps.map((step) => step.payload.teachingDesign?.activityMode)).toEqual([
      "mini-lecture",
      "independent",
      "assessment",
    ]);
    expect(preview.steps.map((step) => step.teachingDesignStatus)).toEqual([
      "inferred",
      "inferred",
      "inferred",
    ]);
    expect(preview.steps.map((step) => step.teachingDesignFallbackReason)).toEqual([
      "legacy-content-default",
      "legacy-task-default",
      "legacy-quiz-default",
    ]);
  });

  it("returns stable teaching design markers in editor and preview DTOs", async () => {
    const dal = (await import("./lesson-authoring")) as Record<string, unknown>;

    const explicitTeachingDesign = {
      activityIntent: "practice",
      estimatedMinutes: 18,
      activityMode: "group",
      evidenceExpectation: {
        evidenceType: "artifact",
        prompt: "提交小组实验记录",
        required: true,
        checklist: ["包含实验现象"],
        tags: ["实验"],
        studentVisibility: "teacher-only",
      },
    };

    const explicitSteps = [
      {
        id: "step-explicit",
        lessonId: "lesson-owned",
        type: "task",
        title: "分组实验",
        rank: "a1",
        payloadJson: {
          type: "task",
          prompt: "完成实验并记录现象",
          submissionType: "text",
          materialRefs: [],
          teachingDesign: explicitTeachingDesign,
          builtInSource: {
            pluginId: "plugin-1",
            builtInKey: "directInstruction",
            pluginName: "教师讲授",
          },
        },
        archivedAt: null,
        updatedAt: new Date("2026-05-09T08:25:00.000Z"),
      },
    ];

    findManyLessonSteps.mockResolvedValueOnce(explicitSteps).mockResolvedValueOnce(explicitSteps);

    const preview = await (dal.getTeacherLessonPreviewDTO as (input: { lessonId: string }) => Promise<{
      steps: Array<{
        payload: { teachingDesign: { activityMode: string; evidenceExpectation: { prompt: string } } };
        teachingDesignStatus: string;
        needsTeachingDesignRefinement: boolean;
        teachingDesignFallbackReason: string | null;
      }>;
    }>)({ lessonId: "lesson-owned" });

    expect(preview.steps[0]?.payload.teachingDesign.activityMode).toBe("group");
    expect(preview.steps[0]?.payload.teachingDesign.evidenceExpectation.prompt).toBe("提交小组实验记录");
    expect(preview.steps[0]?.teachingDesignStatus).toBe("explicit");
    expect(preview.steps[0]?.needsTeachingDesignRefinement).toBe(false);
    expect(preview.steps[0]?.teachingDesignFallbackReason).toBeNull();

    findManyLessonSteps
      .mockResolvedValueOnce(explicitSteps)
      .mockResolvedValueOnce(explicitSteps)
      .mockResolvedValueOnce(explicitSteps);

    const editor = await (dal.getLessonEditorDTO as (lessonId: string) => Promise<{
      steps: Array<{
        payload: { teachingDesign: { activityIntent: string } };
        teachingDesignStatus: string;
      }>;
      preparationSummary: {
        activeStepCount: number;
        totalEstimatedMinutes: number;
        materialCueCount: number;
        evidenceReadyStepCount: number;
        launchHref: string;
        blockingIssues: Array<{ code: string }>;
        attentionIssues: Array<{ code: string; stepId?: string | null }>;
        advisoryIssues: Array<{ code: string; stepId?: string | null }>;
      };
    }>)("lesson-owned");

    expect(editor.steps[0]?.payload.teachingDesign.activityIntent).toBe("practice");
    expect(editor.steps[0]?.teachingDesignStatus).toBe("explicit");
    expect(editor.preparationSummary.activeStepCount).toBe(1);
    expect(editor.preparationSummary.totalEstimatedMinutes).toBe(18);
    expect(editor.preparationSummary.materialCueCount).toBe(0);
    expect(editor.preparationSummary.evidenceReadyStepCount).toBe(1);
    expect(editor.preparationSummary.launchHref).toBe("/teacher/launch?courseId=course-owned&lessonId=lesson-owned");
    expect(editor.preparationSummary.blockingIssues).toEqual([]);
    expect(editor.preparationSummary.advisoryIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "MATERIAL_CUES_MISSING", stepId: "step-explicit" }),
      ])
    );
  });

  it("fills missing teaching-design fields and marks partial payloads for refinement", async () => {
    const dal = (await import("./lesson-authoring")) as Record<string, unknown>;

    const partialSteps = [
      {
        id: "step-partial",
        lessonId: "lesson-owned",
        type: "task",
        title: "半配置练习",
        rank: "a1",
        payloadJson: {
          type: "task",
          prompt: "完成实验并记录现象",
          submissionType: "text",
          materialRefs: [],
          teachingDesign: {
            activityIntent: "apply",
            evidenceExpectation: {
              prompt: "补充实验结果截图",
            },
          },
        },
        archivedAt: null,
        updatedAt: new Date("2026-05-09T08:26:00.000Z"),
      },
    ];

    findManyLessonSteps.mockResolvedValueOnce(partialSteps).mockResolvedValueOnce(partialSteps);

    const preview = await (dal.getTeacherLessonPreviewDTO as (input: { lessonId: string }) => Promise<{
      steps: Array<{
        payload: {
          teachingDesign: {
            activityIntent: string;
            estimatedMinutes: number;
            activityMode: string;
            evidenceExpectation: { evidenceType: string; prompt: string; required: boolean };
          };
        };
        teachingDesignStatus: string;
        needsTeachingDesignRefinement: boolean;
        teachingDesignFallbackReason: string | null;
      }>;
    }>)({ lessonId: "lesson-owned" });

    expect(preview.steps[0]?.payload.teachingDesign.activityIntent).toBe("apply");
    expect(preview.steps[0]?.payload.teachingDesign.estimatedMinutes).toBe(15);
    expect(preview.steps[0]?.payload.teachingDesign.activityMode).toBe("independent");
    expect(preview.steps[0]?.payload.teachingDesign.evidenceExpectation.evidenceType).toBe("submission");
    expect(preview.steps[0]?.payload.teachingDesign.evidenceExpectation.prompt).toBe("补充实验结果截图");
    expect(preview.steps[0]?.payload.teachingDesign.evidenceExpectation.required).toBe(true);
    expect(preview.steps[0]?.teachingDesignStatus).toBe("needs-refinement");
    expect(preview.steps[0]?.needsTeachingDesignRefinement).toBe(true);
    expect(preview.steps[0]?.teachingDesignFallbackReason).toBe("partial-teaching-design");
  });

  it("preserves built-in provenance alongside inferred teaching design defaults", async () => {
    const dal = (await import("./lesson-authoring")) as Record<string, unknown>;

    const builtInSteps = [
      {
        id: "step-built-in",
        lessonId: "lesson-owned",
        type: "content",
        title: "教师讲授",
        rank: "a1",
        payloadJson: {
          type: "content",
          title: "教师讲授",
          body: "讲授内容",
          materialRefs: [],
          builtInSource: {
            pluginId: "plugin-1",
            builtInKey: "directInstruction",
            pluginName: "教师讲授",
          },
        },
        archivedAt: null,
        updatedAt: new Date("2026-05-09T08:21:00.000Z"),
      },
    ];

    findManyLessonSteps.mockResolvedValueOnce(builtInSteps).mockResolvedValueOnce(builtInSteps);

    const preview = await (dal.getTeacherLessonPreviewDTO as (input: { lessonId: string }) => Promise<{
      steps: Array<{
        builtInSourceLabel: string | null;
        payload: { builtInSource?: { pluginId: string }; teachingDesign?: { activityIntent: string } };
      }>;
    }>)({ lessonId: "lesson-owned" });

    expect(preview.steps[0]?.builtInSourceLabel).toBe("教师讲授");
    expect(preview.steps[0]?.payload.builtInSource?.pluginId).toBe("plugin-1");
    expect(preview.steps[0]?.payload.teachingDesign?.activityIntent).toBe("explain");
  });

  it("grades preparation gaps into blocking, attention, and advisory buckets inside the editor DTO", async () => {
    const dal = (await import("./lesson-authoring")) as Record<string, unknown>;

    findManyLessonSteps
      .mockResolvedValueOnce([
        {
          id: "step-refine",
          lessonId: "lesson-owned",
          type: "task",
          title: "分组实验",
          rank: "a1",
          payloadJson: {
            type: "task",
            prompt: "完成实验并记录现象",
            submissionType: "text",
            materialRefs: [],
            teachingDesign: {
              activityIntent: "apply",
              evidenceExpectation: {
                prompt: "上传实验截图",
              },
            },
          },
          archivedAt: null,
          updatedAt: new Date("2026-05-09T08:26:00.000Z"),
        },
        {
          id: "step-inferred",
          lessonId: "lesson-owned",
          type: "content",
          title: "教师讲授",
          rank: "a2",
          payloadJson: {
            type: "content",
            title: "教师讲授",
            body: "讲授内容",
            materialRefs: [],
          },
          archivedAt: null,
          updatedAt: new Date("2026-05-09T08:27:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "step-refine",
          lessonId: "lesson-owned",
          type: "task",
          title: "分组实验",
          rank: "a1",
          payloadJson: {
            type: "task",
            prompt: "完成实验并记录现象",
            submissionType: "text",
            materialRefs: [],
            teachingDesign: {
              activityIntent: "apply",
              evidenceExpectation: {
                prompt: "上传实验截图",
              },
            },
          },
          archivedAt: null,
          updatedAt: new Date("2026-05-09T08:26:00.000Z"),
        },
        {
          id: "step-inferred",
          lessonId: "lesson-owned",
          type: "content",
          title: "教师讲授",
          rank: "a2",
          payloadJson: {
            type: "content",
            title: "教师讲授",
            body: "讲授内容",
            materialRefs: [],
          },
          archivedAt: null,
          updatedAt: new Date("2026-05-09T08:27:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "step-refine",
          lessonId: "lesson-owned",
          type: "task",
          title: "分组实验",
          rank: "a1",
          payloadJson: {
            type: "task",
            prompt: "完成实验并记录现象",
            submissionType: "text",
            materialRefs: [],
            teachingDesign: {
              activityIntent: "apply",
              evidenceExpectation: {
                prompt: "上传实验截图",
              },
            },
          },
          archivedAt: null,
          updatedAt: new Date("2026-05-09T08:26:00.000Z"),
        },
        {
          id: "step-inferred",
          lessonId: "lesson-owned",
          type: "content",
          title: "教师讲授",
          rank: "a2",
          payloadJson: {
            type: "content",
            title: "教师讲授",
            body: "讲授内容",
            materialRefs: [],
          },
          archivedAt: null,
          updatedAt: new Date("2026-05-09T08:27:00.000Z"),
        },
      ]);

    const editor = await (dal.getLessonEditorDTO as (lessonId: string) => Promise<{
      preparationSummary: {
        evidenceReadyStepCount: number;
        blockingIssues: Array<{ code: string }>;
        attentionIssues: Array<{ code: string; stepId?: string | null }>;
        advisoryIssues: Array<{ code: string; stepId?: string | null }>;
      };
    }>)("lesson-owned");

    expect(editor.preparationSummary.evidenceReadyStepCount).toBe(1);
    expect(editor.preparationSummary.blockingIssues).toEqual([]);
    expect(editor.preparationSummary.attentionIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "TEACHING_DESIGN_NEEDS_REFINEMENT", stepId: "step-refine" }),
      ])
    );
    expect(editor.preparationSummary.advisoryIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "TEACHING_DESIGN_INFERRED", stepId: "step-inferred" }),
        expect.objectContaining({ code: "MATERIAL_CUES_MISSING", stepId: "step-refine" }),
        expect.objectContaining({ code: "MATERIAL_CUES_MISSING", stepId: "step-inferred" }),
        expect.objectContaining({ code: "EVIDENCE_EXPECTATION_MISSING", stepId: "step-inferred" }),
      ])
    );
    expect(editor.preparationSummary.advisoryIssues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "TEACHING_DESIGN_INFERRED", stepId: "step-refine" }),
      ])
    );
  });
});
