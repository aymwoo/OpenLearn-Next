import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 66-07 端到端闭环回归：AI LessonAgent 起草全链路单测级 e2e。
 *
 * 覆盖闭环：enable（mock registry flag ON）→ trigger（draftLessonWithAgentAction）
 * → run + persist（真实 Command Bus 经真实 lesson-draft handler 两段派发）→ review accept
 * （applyDraftLessonVersionAction 经真实 bus 派发 lesson.draft.accept）→ publish
 * （applyDraftToLiveLesson DAL 写入抵达）。
 *
 * 隔离边界（TEST-ONLY，绝不改生产源）：
 * - `@/db`：in-memory 命令存储 fake，承载真实生产 store（lesson-agent.ts / producer）的
 *   findFirst / insert / update 调用 —— 这是 action 路径下唯一可注入点（action 不透传 deps）。
 * - `drizzle-orm` 的 `eq`：替换为可读取 `{__eqValue}` 的轻量谓词，供 fake 匹配 id/dedupeKey。
 * - `appendPlatformEvents`：捕获每次落账事件并返回空 dispatches（短路 publish），断言
 *   `lesson.draft.accepted` 事件 `version` ≥ 1（绝不为 0）。
 * - 启用经 `getAgentRegistryDTO` mock 返回 enabled=true fixture —— 绝不翻动 seed 默认或生产开关。
 */

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({ updateTag: vi.fn() }));

// `eq(column, value)` → 轻量谓词；fake 仅读 __eqValue 匹配 id 或 dedupeKey。
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: (_column: unknown, value: unknown) => ({ __eqValue: value }),
  };
});

type CommandRow = {
  id: string;
  actorId: string;
  schoolId: string;
  commandType: string;
  status: string;
  dedupeKey: string;
  actorScope: string;
  scopeJson: unknown;
  payloadJson: unknown;
  correlationJson: unknown;
  auditSummaryJson: unknown;
  latestAttemptNumber: number;
  resultSummaryJson: Record<string, unknown> | null;
  failureDetailJson: Record<string, unknown> | null;
};

type AttemptRow = {
  commandId: string;
  attemptNumber: number;
  status: string;
  resultSummaryJson: Record<string, unknown> | null;
  failureDetailJson: Record<string, unknown> | null;
};

type CapturedEvent = {
  eventType: string;
  category: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
};

const store = vi.hoisted(() => {
  const commands: CommandRow[] = [];
  const attempts: AttemptRow[] = [];
  const events: CapturedEvent[] = [];
  return { commands, attempts, events };
});

// in-memory @/db fake：承载生产 PlatformCommandStore 的全部 drizzle 调用形状。
vi.mock("@/db", () => {
  const matchValue = (where: { __eqValue?: unknown } | undefined) => where?.__eqValue;

  const db = {
    query: {
      platformCommands: {
        findFirst: async ({ where }: { where?: { __eqValue?: unknown } } = {}) => {
          const value = matchValue(where);
          return store.commands.find((row) => row.id === value || row.dedupeKey === value) ?? undefined;
        },
      },
      platformCommandAttempts: {
        findMany: async ({ where }: { where?: { __eqValue?: unknown } } = {}) => {
          const value = matchValue(where);
          return store.attempts.filter((row) => row.commandId === value);
        },
      },
    },
    insert: (_table: unknown) => ({
      values: (vals: Record<string, unknown>) => {
        // 经字段形状区分目标表（不依赖 schema 引用相等，规避 hoist 约束）。
        const isCommand = "commandType" in vals;
        const apply = () => {
          if (isCommand) {
            const row: CommandRow = {
              ...(vals as unknown as CommandRow),
              // insert 期不含 result/failure 摘要；由后续 updateCommandSummary 经 update() 回填。
              resultSummaryJson: null,
              failureDetailJson: null,
            };
            store.commands.push(row);
            return [row];
          }
          store.attempts.push(vals as unknown as AttemptRow);
          return [vals];
        };
        return {
          returning: async () => apply(),
          // 部分调用（attempts）直接 await values()，不取 returning。
          then: (resolve: (value: unknown) => unknown) => resolve(apply()),
        };
      },
    }),
    update: (_table: unknown) => ({
      set: (vals: Record<string, unknown>) => ({
        where: async (cond: { __eqValue?: unknown }) => {
          const row = store.commands.find((candidate) => candidate.id === cond?.__eqValue);
          if (row) Object.assign(row, vals);
          return undefined;
        },
      }),
    }),
  };

  return { db };
});

// 捕获型事件落账：推入共享数组，返回空 dispatches → publishPersistedIfNeeded 短路。
vi.mock("@/features/platform-core/events/ledger", () => ({
  appendPlatformEvents: vi.fn(async (input: { events: CapturedEvent[] }) => {
    for (const event of input.events ?? []) {
      store.events.push(event);
    }
    return { events: [], dispatches: [] };
  }),
}));

// 真实 registry 同时引用 plugin handlers，其链路（@/lib/dal/auth → next-auth）在 vitest 下
// 无法解析。Stub plugin handler 模块 → 保持真实 bus + 真实 registry + 真实 lesson-draft handler。
vi.mock("@/features/platform-core/commands/handlers/plugins", () => ({
  pluginCommandHandlers: new Proxy(
    {},
    {
      get: () => ({
        authorize: async () => {},
        execute: async () => ({
          resultSummary: null,
          invalidation: { tags: [] },
          emittedEvents: [],
          failureEvent: null,
          failureAttribution: null,
        }),
      }),
    },
  ),
}));

// in-process 适配器：避免 import 期触达真实 db；publishPersisted 永不被调用（dispatches 空）。
vi.mock("@/features/platform-core/events/adapters/in-process", () => ({
  defaultInProcessPlatformEventAdapter: {
    id: "in-process-default",
    publishPersisted: vi.fn(async () => undefined),
    subscribe: vi.fn(() => () => undefined),
  },
}));

const dalMocks = vi.hoisted(() => ({
  assertActiveTeacher: vi.fn(),
  persistDraftLessonVersion: vi.fn(),
  applyDraftToLiveLesson: vi.fn(),
  discardDraftLessonVersion: vi.fn(),
}));

// DAL 全量 stub（action + handler import 并集）：捕获写入，避免加载真实 db/server-only。
vi.mock("@/lib/dal/lesson-authoring", () => ({
  assertActiveTeacher: dalMocks.assertActiveTeacher,
  persistDraftLessonVersion: dalMocks.persistDraftLessonVersion,
  applyDraftToLiveLesson: dalMocks.applyDraftToLiveLesson,
  discardDraftLessonVersion: dalMocks.discardDraftLessonVersion,
  addLessonStep: vi.fn(),
  archiveLesson: vi.fn(),
  archiveLessonStep: vi.fn(),
  createLessonDraft: vi.fn(),
  duplicateLesson: vi.fn(),
  duplicateLessonStep: vi.fn(),
  getLessonPublishReadinessDTO: vi.fn(),
  publishLesson: vi.fn(),
  reorderLessonStep: vi.fn(),
  saveVotingLessonStepConfig: vi.fn(),
  updateLessonDraft: vi.fn(),
  updateLessonStep: vi.fn(),
}));

vi.mock("@/lib/dal/resources", () => ({ createTeacherResource: vi.fn() }));

const ragMocks = vi.hoisted(() => ({ getAgentRegistryDTO: vi.fn() }));
vi.mock("@/lib/dal/ai-rag", () => ({ getAgentRegistryDTO: ragMocks.getAgentRegistryDTO }));

const toolMocks = vi.hoisted(() => ({ createDraftLessonStepTool: vi.fn() }));
vi.mock("@/server/ai/tools", () => ({ createDraftLessonStepTool: toolMocks.createDraftLessonStepTool }));

import { draftLessonWithAgentAction } from "@/actions/lesson-agent-actions";
import { applyDraftLessonVersionAction } from "@/actions/lesson-authoring-actions";

/** enabled=true 的 LessonAgent registry fixture —— 经 mock 注入，绝不翻动 seed 默认。 */
function lessonAgentRegistryRow(enabled: boolean) {
  return {
    id: "agent-lesson",
    agentKey: "LessonAgent",
    displayName: "AI 课程助手",
    capabilityManifestJson: {},
    featureFlag: "lesson_agent_enabled",
    enabled,
  };
}

const CONTENT_STEP = {
  type: "content" as const,
  title: "AI 导入",
  body: "AI 生成的导入正文",
  materialRefs: [] as unknown[],
};

describe("66-07 AI LessonAgent 起草闭环 e2e（enable→trigger→run+persist→review→accept→publish）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.commands.length = 0;
    store.attempts.length = 0;
    store.events.length = 0;

    // 教师身份 server 派生（action + handler 共用）：userId 注入 createdById，schoolIds 通过 authorize。
    dalMocks.assertActiveTeacher.mockResolvedValue({
      userId: "teacher-1",
      schoolIds: ["school-1"],
    });

    // flag ON：经 registry mock 启用，绝不翻动 seed enabled=false 默认。
    ragMocks.getAgentRegistryDTO.mockResolvedValue([lessonAgentRegistryRow(true)]);

    // 唯一生成通道：工具确定性返回合法 content 步骤包。
    toolMocks.createDraftLessonStepTool.mockReturnValue({
      execute: vi.fn(async () => CONTENT_STEP),
    });

    // persist → 草稿版本落地（version=1）；accept → 应用至 live lesson（version=1，reach publish）。
    dalMocks.persistDraftLessonVersion.mockResolvedValue({
      draftVersionId: "draft-v1",
      version: 1,
      stepCount: 1,
    });
    dalMocks.applyDraftToLiveLesson.mockResolvedValue({
      courseId: "course-1",
      draftVersionId: "draft-v1",
      appliedStepCount: 1,
      version: 1,
    });
  });

  it("trigger→run+persist：经真实 Command Bus 两段派发并桥接出 version ≥ 1 的草稿版本", async () => {
    const result = await draftLessonWithAgentAction({
      lessonId: "lesson-1",
      stepType: "content",
      intent: "为本节课生成一个导入步骤",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // 桥接 run→persist 端到端：两条命令真实经 bus 落账，且持久化抵达 DAL。
    expect(dalMocks.persistDraftLessonVersion).toHaveBeenCalledTimes(1);
    expect(store.commands.map((row) => row.commandType).sort()).toEqual([
      "lesson.draft.persist",
      "lesson.draft.run",
    ]);

    // 草稿版本号经 resultSummary 回传，version ≥ 1（绝非 0）。
    expect(result.data.draftVersionId).toBe("draft-v1");
    expect(result.data.version).toBeGreaterThanOrEqual(1);
    expect(result.data.step).toMatchObject({ type: "content", title: "AI 导入" });

    // run + persist 域事件均落账。
    const eventTypes = store.events.map((event) => event.eventType);
    expect(eventTypes).toContain("lesson.draft.produced");
    expect(eventTypes).toContain("lesson.draft.persisted");
  });

  it("review→accept→publish：经真实 Command Bus 派发 accept，落账 version ≥ 1 的 accepted 事件并抵达 publish", async () => {
    // 先触发起草，草稿版本落地。
    const draft = await draftLessonWithAgentAction({
      lessonId: "lesson-1",
      stepType: "content",
      intent: "为本节课生成一个导入步骤",
    });
    expect(draft.ok).toBe(true);
    if (!draft.ok) return;

    store.events.length = 0; // 仅断言 accept 段落账事件。

    // 教师审校接受：经 bus 派发 lesson.draft.accept → applyDraftToLiveLesson 抵达 publish 链。
    const accepted = await applyDraftLessonVersionAction({
      lessonId: "lesson-1",
      draftVersionId: "draft-v1",
    });

    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;

    // 抵达 publish：应用草稿到 live lesson 的 DAL 被调用一次。
    expect(dalMocks.applyDraftToLiveLesson).toHaveBeenCalledTimes(1);
    expect(dalMocks.applyDraftToLiveLesson).toHaveBeenCalledWith({
      lessonId: "lesson-1",
      draftVersionId: "draft-v1",
    });

    // accept 命令真实经 bus 落账。
    expect(store.commands.some((row) => row.commandType === "lesson.draft.accept")).toBe(true);

    // 核心闭环不变式：accepted 域事件携带 version ≥ 1（绝不为 0）。
    const acceptedEvent = store.events.find((event) => event.eventType === "lesson.draft.accepted");
    expect(acceptedEvent).toBeDefined();
    const version = acceptedEvent?.payload.version as number;
    expect(version).toBeGreaterThanOrEqual(1);
    expect(version).not.toBe(0);
  });
});
