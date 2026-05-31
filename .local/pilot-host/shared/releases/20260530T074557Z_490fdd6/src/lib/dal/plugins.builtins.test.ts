import { beforeEach, describe, expect, it, vi } from "vitest";

const findManyPluginRegistrations = vi.fn();
const findFirstPluginRegistration = vi.fn();
const assertActiveTeacher = vi.fn();
const getUserMembershipsDTO = vi.fn();
const dispatchPluginAction = vi.fn();
const insertReturning = vi.fn();
const insertValues = vi.fn();
const insert = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/db", () => ({
  db: {
    insert,
    query: {
      pluginRegistrations: {
        findMany: findManyPluginRegistrations,
        findFirst: findFirstPluginRegistration,
      },
    },
  },
}));

vi.mock("@/lib/dal/lesson-authoring", () => ({
  assertActiveTeacher,
}));

vi.mock("@/lib/dal/membership", () => ({
  getUserMembershipsDTO,
}));

vi.mock("@/lib/dal/themes", () => ({
  registerThemeTokens: vi.fn(),
}));

vi.mock("@/server/plugins/registry", () => ({
  dispatchPluginAction,
  PLUGIN_ACTION_PERMISSION_REQUIREMENTS: {
    addStepSuggestion: "lesson:write:suggestion",
    annotateLesson: "lesson:write:suggestion",
    createNotificationStub: "lesson:write:suggestion",
    suggestBuiltInTeachingStep: "lesson:write:suggestion",
    insertBuiltInTeachingStepTemplate: "lesson:write:suggestion",
  },
}));

function createBuiltInPlugin(overrides: Record<string, unknown> = {}) {
  return {
    id: "plugin-built-in-1",
    schoolId: "school-1",
    name: "教师讲授",
    pluginKey: "built-in-direct-instruction",
    dbNamespace: "built_in_direct_instruction",
    sourceType: "default",
    installSource: "bootstrap",
    enabled: true,
    killSwitchEnabled: false,
    lifecycleState: "enabled",
    createdAt: new Date(),
    updatedAt: new Date(),
    manifestJson: {
      id: "built-in-direct-instruction",
      version: "1.0.0",
      manifestVersion: 2,
      anchors: ["lesson.sidebar"],
      permissions: ["lesson:write:suggestion"],
      actions: ["suggestBuiltInTeachingStep", "insertBuiltInTeachingStepTemplate"],
      builtIn: true,
      defaultEnabled: true,
      nonDeletable: true,
      governance: {
        manifestVersion: 2,
        contractVersion: "v2",
        requestedCapabilities: [],
        permissions: ["lesson:write:suggestion"],
        lifecycle: {
          ownerType: "host",
          installScope: "school",
          initialState: "installed",
          mountMode: "manual",
        },
      },
    },
    ...overrides,
  };
}

describe("built-in plugin template resolution", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    insert.mockReturnValue({
      values: insertValues,
    });
    insertValues.mockReturnValue({
      returning: insertReturning,
    });
    insertReturning.mockResolvedValue([{}]);

    assertActiveTeacher.mockResolvedValue({
      userId: "teacher-1",
      schoolIds: ["school-1"],
    });
    getUserMembershipsDTO.mockResolvedValue([
      {
        schoolId: "school-1",
        status: "active",
      },
    ]);
  });

  it("returns a template proposal for an enabled built-in with the template action", async () => {
    const plugin = createBuiltInPlugin();
    findFirstPluginRegistration.mockResolvedValue(plugin);
    dispatchPluginAction.mockReturnValue({
      proposalType: "builtInTeachingStepTemplate",
      payload: {
        builtInKey: "directInstruction",
        pluginName: "教师讲授",
        title: "教师讲授",
        summary: "面向全班进行重点讲授。",
        stepType: "content",
        initialTitle: "教师讲授",
        initialPayload: {
          type: "content",
          title: "教师讲授",
          body: "聚焦本课重点。",
          teacherNotes: "先讲结论，再做示范。",
          materialRefs: [],
        },
      },
    });

    const { getBuiltInTeachingStepTemplateForSchool } = await import("./plugins");
    const template = await getBuiltInTeachingStepTemplateForSchool({
      actorId: "teacher-1",
      schoolId: "school-1",
      pluginId: "plugin-built-in-1",
    });

    expect(template).toMatchObject({
      pluginName: "教师讲授",
      stepType: "content",
      initialTitle: "教师讲授",
    });
    expect(dispatchPluginAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "insertBuiltInTeachingStepTemplate",
        pluginId: "plugin-built-in-1",
      }),
    );
  });

  it("returns null when the built-in plugin is disabled", async () => {
    findFirstPluginRegistration.mockResolvedValue(
      createBuiltInPlugin({
        enabled: false,
      }),
    );

    const { getBuiltInTeachingStepTemplateForSchool } = await import("./plugins");
    const template = await getBuiltInTeachingStepTemplateForSchool({
      actorId: "teacher-1",
      schoolId: "school-1",
      pluginId: "plugin-built-in-1",
    });

    expect(template).toBeNull();
    expect(dispatchPluginAction).not.toHaveBeenCalled();
  });

  it("returns null when the built-in manifest does not declare template insertion", async () => {
    findFirstPluginRegistration.mockResolvedValue(
      createBuiltInPlugin({
        manifestJson: {
          id: "built-in-direct-instruction",
          version: "1.0.0",
          manifestVersion: 2,
          anchors: ["lesson.sidebar"],
          permissions: ["lesson:write:suggestion"],
          actions: ["suggestBuiltInTeachingStep"],
          builtIn: true,
          defaultEnabled: true,
          nonDeletable: true,
          governance: {
            manifestVersion: 2,
            contractVersion: "v2",
            requestedCapabilities: [],
            permissions: ["lesson:write:suggestion"],
            lifecycle: {
              ownerType: "host",
              installScope: "school",
              initialState: "installed",
              mountMode: "manual",
            },
          },
        },
      }),
    );

    const { getBuiltInTeachingStepTemplateForSchool } = await import("./plugins");
    const template = await getBuiltInTeachingStepTemplateForSchool({
      actorId: "teacher-1",
      schoolId: "school-1",
      pluginId: "plugin-built-in-1",
    });

    expect(template).toBeNull();
    expect(dispatchPluginAction).not.toHaveBeenCalled();
  });

  it("only lists enabled built-ins whose hook returns a template proposal", async () => {
    const plugin = createBuiltInPlugin();
    findManyPluginRegistrations.mockResolvedValue([plugin]);
    findFirstPluginRegistration.mockResolvedValue(plugin);
    dispatchPluginAction.mockReturnValue({
      proposalType: "builtInTeachingStepTemplate",
      payload: {
        builtInKey: "directInstruction",
        pluginName: "教师讲授",
        title: "教师讲授",
        summary: "面向全班进行重点讲授。",
        stepType: "content",
        initialTitle: "教师讲授",
        initialPayload: {
          type: "content",
          title: "教师讲授",
          body: "聚焦本课重点。",
          teacherNotes: "先讲结论，再做示范。",
          materialRefs: [],
        },
      },
    });

    const { listBuiltInTeachingStepTemplates } = await import("./plugins");
    const templates = await listBuiltInTeachingStepTemplates({
      actorId: "teacher-1",
      schoolId: "school-1",
    });

    expect(templates).toHaveLength(1);
    expect(templates[0]).toMatchObject({
      pluginId: "plugin-built-in-1",
      pluginName: "教师讲授",
    });
  });

  it("hides suspended, failed, and kill-switched built-ins from template lists", async () => {
    findManyPluginRegistrations.mockResolvedValue([
      createBuiltInPlugin({ id: "plugin-ready", name: "教师讲授" }),
      createBuiltInPlugin({ id: "plugin-suspended", lifecycleState: "suspended", name: "停用插件" }),
      createBuiltInPlugin({ id: "plugin-failed", lifecycleState: "failed", name: "失败插件" }),
      createBuiltInPlugin({ id: "plugin-killed", killSwitchEnabled: true, name: "熔断插件" }),
    ]);
    dispatchPluginAction.mockImplementation(({ pluginId }: { pluginId: string }) => ({
      proposalType: "builtInTeachingStepTemplate",
      payload: {
        builtInKey: pluginId === "plugin-ready" ? "directInstruction" : "survey",
        pluginName: pluginId === "plugin-ready" ? "教师讲授" : "不可用插件",
        title: pluginId === "plugin-ready" ? "教师讲授" : "不可用插件",
        summary: "summary",
        stepType: "content",
        initialTitle: "title",
        initialPayload: {
          type: "content",
          title: "title",
          body: "body",
          materialRefs: [],
        },
      },
    }));

    const { listBuiltInTeachingStepTemplates } = await import("./plugins");
    const templates = await listBuiltInTeachingStepTemplates({ actorId: "teacher-1", schoolId: "school-1" });

    expect(templates).toHaveLength(1);
    expect(templates[0]?.pluginId).toBe("plugin-ready");
    expect(dispatchPluginAction).toHaveBeenCalledTimes(1);
  });

  it("supports the markdown built-in teaching definition", async () => {
    const { BUILT_IN_TEACHING_STEP_DEFINITIONS } = await import("@/lib/dto/resource-ai");

    expect(BUILT_IN_TEACHING_STEP_DEFINITIONS.some((definition) => definition.builtInKey === "markdownDeck")).toBe(true);
  });

  it("supports the html courseware built-in teaching definition with a local runtime descriptor", async () => {
    const { BUILT_IN_TEACHING_STEP_DEFINITIONS } = await import("@/lib/dto/resource-ai");

    const definition = BUILT_IN_TEACHING_STEP_DEFINITIONS.find((item) => item.builtInKey === "htmlCourseware");

    expect(definition).toBeTruthy();
    expect(definition?.initialPayload.type).toBe("task");
    expect(definition?.initialPayload.runtime).toMatchObject({
      kind: "html-courseware",
      entry: {
        sandbox: "iframe",
        bootstrap: "/runtime/html-courseware/pilot",
      },
    });
  });

  it("supports the classroom voting built-in teaching definition with a strict authoring contract", async () => {
    const { BUILT_IN_TEACHING_STEP_DEFINITIONS } = await import("@/lib/dto/resource-ai");

    const definition = BUILT_IN_TEACHING_STEP_DEFINITIONS.find((item) => item.builtInKey === "classroomVoting");

    expect(definition).toBeTruthy();
    expect(definition?.stepType).toBe("quiz");
    expect(definition?.authoringContract).toMatchObject({
      kind: "classroom-voting",
      contractVersion: "v1",
      runtimeContractVersion: "v2",
      publicMetadata: {
        builtInKey: "classroomVoting",
        pluginKey: "builtin-teaching-step-classroom-voting",
        pluginName: "课堂投票",
        stepType: "quiz",
      },
    });
    expect(definition?.authoringContract?.defaultConfig.options).toHaveLength(3);
  });

  it("hides the classroom voting built-in when the plugin contract version is incompatible", async () => {
    const votingPlugin = createBuiltInPlugin({
      id: "plugin-voting",
      name: "课堂投票",
      pluginKey: "builtin-teaching-step-classroom-voting",
      manifestJson: {
        id: "builtin-teaching-step-classroom-voting",
        version: "1.0.0",
        manifestVersion: 1,
        anchors: ["lesson.sidebar"],
        permissions: ["lesson:write:suggestion"],
        actions: ["suggestBuiltInTeachingStep", "insertBuiltInTeachingStepTemplate"],
        builtIn: true,
        defaultEnabled: true,
        nonDeletable: true,
      },
    });

    findManyPluginRegistrations.mockResolvedValue([votingPlugin]);

    const { listBuiltInTeachingStepTemplates } = await import("./plugins");
    const templates = await listBuiltInTeachingStepTemplates({
      actorId: "teacher-1",
      schoolId: "school-1",
    });

    expect(templates).toEqual([]);
    expect(dispatchPluginAction).not.toHaveBeenCalled();
  });

  it("rejects manifest v2 runtime entries that point to remote bootstrap URLs", async () => {
    const { PluginManifestSchema } = await import("@/lib/dto/resource-ai");

    expect(() =>
      PluginManifestSchema.parse({
        id: "plugin-remote",
        version: "2.0.0",
        manifestVersion: 2,
        anchors: ["lesson.sidebar"],
        permissions: ["lesson:write:suggestion"],
        actions: ["suggestBuiltInTeachingStep"],
        governance: {
          manifestVersion: 2,
          contractVersion: "v2",
          permissions: ["lesson:write:suggestion"],
          requestedCapabilities: ["runtime:ready"],
          lifecycle: {
            ownerType: "host",
            installScope: "school",
            initialState: "installed",
            mountMode: "manual",
          },
          runtime: {
            version: "v2",
            runtimeId: "remote-runtime",
            runtimeVersion: "2026.05.0",
            kind: "html-courseware",
            displayName: "Remote Runtime",
            stateSchemaVersion: "state-v1",
            entry: {
              sandbox: "iframe",
              bootstrap: "https://example.com/runtime.js",
            },
            bootstrap: {
              contextMode: "minimal",
              resumeStrategy: "latest-or-create",
              capabilitySnapshot: "session-scoped",
            },
            submitTarget: {
              primary: "classroom-evidence",
              additional: [],
            },
            requestedCapabilities: ["runtime:ready"],
          },
        },
      }),
    ).toThrowError(/local-only|remote URL/);
  });
});
