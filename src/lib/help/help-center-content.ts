export type HelpStateLabel = "当前可用" | "使用边界" | "后续扩展";

export type HelpStateNote = {
  label: HelpStateLabel;
  summary: string;
};

export type TeacherHelpModule = {
  title: string;
  summary: string;
  href: string;
  cta: string;
};

export type DeveloperGuideCard = {
  href: "/help/plugins" | "/help/themes" | "/help/actions-interfaces";
  title: string;
  summary: string;
  coverage: string[];
  includesCodeExamples?: boolean;
};

export type HelpCodeExample = {
  title: string;
  language: string;
  code: string;
};

export type HelpGuideSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
  stateLabel?: HelpStateLabel;
  codeExample?: HelpCodeExample;
};

export type HelpGuidePage = {
  href: DeveloperGuideCard["href"];
  title: string;
  summary: string;
  audience: string;
  introLabel?: string;
  factSources: string[];
  coverage: string[];
  caution: string[];
  relatedLinks: Array<{ href: string; label: string; summary: string }>;
  sections: HelpGuideSection[];
};

export const helpStateNotes: HelpStateNote[] = [
  {
    label: "当前可用",
    summary: "只写当前代码、DAL 和 Server Actions 已经落地的能力，不把规划中的接口伪装成现状。",
  },
  {
    label: "使用边界",
    summary: "明确 school scope、allowlist、安全限制和 proposal-only 语义，避免误用。",
  },
  {
    label: "后续扩展",
    summary: "把未来可能补齐的开放点单列说明，与当前可用能力严格分开。",
  },
];

export const teacherHelpModules: TeacherHelpModule[] = [
  {
    title: "插件现在体现在哪里",
    summary: "教师侧主要通过设置页和插件市场查看、启停系统内置教学环节，不需要阅读 manifest。",
    href: "/settings/plugins",
    cta: "前往插件市场",
  },
  {
    title: "主题如何切换",
    summary: "主题切换仍然收敛在系统设置里，只有学校范围内已注册且有效的主题才会出现。",
    href: "/settings",
    cta: "查看主题设置",
  },
  {
    title: "课表扩展的当前边界",
    summary: "课表相关 AI 与插件扩展当前只会生成 proposal 或 draft，不会直接改写运行中的课表。",
    href: "/teacher/schedule",
    cta: "查看课表页面",
  },
  {
    title: "什么时候读开发者指南",
    summary: "如果你要编写插件、主题或 schedule 扩展，请直接进入开发者子页；教师区不解释底层 contract。",
    href: "/help/plugins",
    cta: "进入开发者指南",
  },
];

export const developerGuideCards: DeveloperGuideCard[] = [
  {
    href: "/help/plugins",
    title: "插件开发",
    summary: "覆盖 manifest、hook anchors、allowlisted actions、permission requirements 与 school-scoped activation path。",
    coverage: ["manifest 结构", "hook anchors", "allowlisted actions"],
    includesCodeExamples: true,
  },
  {
    href: "/help/themes",
    title: "主题开发",
    summary: "解释 manifest.theme、register/set action、ThemeInjector 与 teacher shell 的完整运行链路。",
    coverage: ["theme tokens", "layout contract", "runtime fallback"],
    includesCodeExamples: true,
  },
  {
    href: "/help/actions-interfaces",
    title: "Actions / Interfaces",
    summary: "聚焦 schedule.assistant 与 proposal-only 扩展边界，说明当前真正开放的 action 和 payload。",
    coverage: ["schedule.assistant", "proposal actions", "payload 边界"],
    includesCodeExamples: true,
  },
];

export const helpGuidePages: Record<DeveloperGuideCard["href"], HelpGuidePage> = {
  "/help/plugins": {
    href: "/help/plugins",
    title: "插件开发指南",
    summary: "用当前 registry、schema 和 school-scoped activation path 理解插件是如何进入产品运行面的。",
    audience: "面向要编写或维护插件 manifest、hook 和 action payload 的开发者。",
    factSources: [
      "src/lib/dto/resource-ai.ts",
      "src/server/plugins/registry.ts",
      "src/actions/plugin-actions.ts",
      "src/lib/dal/plugins.ts",
    ],
    coverage: [
      "manifest 的当前字段与约束",
      "dashboard.widget / lesson.sidebar / schedule.assistant 三个 hook anchor",
      "allowlisted actions 与 permission requirements",
      "school-scoped registration 与 enable path",
    ],
    caution: [
      "不支持 arbitrary JS、eval() 或 direct DB access。",
      "插件启停和注册都必须走受控 Server Actions，而不是客户端直连。",
      "当前没有 plugin-to-plugin runtime contract。",
    ],
    relatedLinks: [
      { href: "/settings/plugins", label: "插件市场", summary: "查看产品里当前可见的内置插件与启停状态。" },
      { href: "/help/themes", label: "主题开发", summary: "如果 manifest 同时带 theme，可以继续看主题注册链路。" },
    ],
    sections: [
      {
        title: "这页适合什么时候读",
        paragraphs: [
          "当你准备新增一个受控插件、核对 manifest 字段，或者想确认插件究竟在哪一层被学校启用和审计时，直接看这页，不需要先去翻整套源码。",
          "本页只解释当前仓库已经存在的插件 contract 和运行路径；任何还未落地的 marketplace、任意脚本执行或跨插件协作能力，都会被单独放到 `后续扩展`。",
        ],
      },
      {
        title: "当前可用",
        stateLabel: "当前可用",
        paragraphs: [
          "当前插件 contract 以 `PluginManifestSchema` 为入口，真实字段和枚举值都收敛在 `src/lib/dto/resource-ai.ts`。帮助页只描述已经存在的字段：`id`、`version`、`permissions`、`anchors`、`actions`、`builtIn`、`defaultEnabled`、`nonDeletable`，以及可选的 `theme`。",
          "当前 hook anchors 只有 `dashboard.widget`、`lesson.sidebar`、`schedule.assistant` 三个；当前 action 也只限 `src/server/plugins/registry.ts` 中 allowlist 的受控动作，例如 `addStepSuggestion`、`createNotificationStub`、`createScheduleOverrideProposal`、`createScheduleReminderDraft`、`annotateScheduleConflict`。",
          "权限不是装饰字段。`PLUGIN_ACTION_PERMISSION_REQUIREMENTS` 会把 action 映射到真实 permission，例如 `createScheduleOverrideProposal -> schedule:write:proposal`，缺权限时 DAL 会拒绝执行并记审计。",
        ],
        bullets: [
          "manifest 必须是结构化 JSON，不存在任意脚本入口。",
          "actions 名称必须与 `src/server/plugins/registry.ts` 中 allowlist 精确一致。",
          "权限要求由 registry 与 DAL 共同校验，不是插件自己声明后即可绕过。",
          "`schedule.assistant` 已经是当前 contract 的正式 anchor，但不是一条任意开放的客户端直连入口。",
        ],
      },
      {
        title: "school-scoped 启用与运行链路",
        paragraphs: [
          "插件不是上传即生效。当前链路是：`registerPluginManifestAction()` 注册 manifest -> DAL `registerPluginManifest()` 写入 school-scoped plugin record -> `setPluginEnabledAction()` 在学校范围启停 -> `getEnabledPluginsForAnchor()` 按 anchor 解析当前学校可用插件 -> `runPluginHook()` 做 allowlist、权限、school scope 校验并写入审计。",
          "`runPluginHookAction()` 目前是受控的 Server Action 包装层，但它公开的 hookAnchor 输入仍然只覆盖 `dashboard.widget` 和 `lesson.sidebar`。这意味着 `schedule.assistant` 已经进入 manifest / registry / DAL contract，却仍然保持服务端受控分发，不应写成任意页面都能直接调用的公开入口。",
          "如果插件携带 `manifest.theme`，`setPluginEnabledAction()` 在启用时还会触发主题注册；但这条路径仍然属于同一个 school scope、teacher-owned DAL 和审计边界。",
        ],
        bullets: [
          "school scope 不匹配、插件被禁用、kill switch 打开、action 未列入 manifest、permission 缺失，都会进入 denied path。",
          "拒绝路径会记录 `disabled`、`kill_switch`、`school_mismatch`、`not_allowed`、`permission_denied` 等审计原因。",
          "内置教学环节插件继续走同一条 registry allowlist，不存在另一套隐式执行通道。",
        ],
      },
      {
        title: "最小示例",
        paragraphs: [
          "下面的片段只展示当前 schema 能理解的最小结构，目的是帮助你对齐 manifest 入口，而不是复制一大段模板样板。",
        ],
        codeExample: {
          title: "最小插件 manifest 片段",
          language: "json",
          code: `{
  "id": "schedule-helper",
  "version": "0.1.0",
  "permissions": ["schedule:write-proposal"],
  "anchors": ["schedule.assistant"],
  "actions": ["createScheduleOverrideProposal"],
  "defaultEnabled": false,
  "nonDeletable": false
}`,
        },
      },
      {
        title: "使用边界",
        stateLabel: "使用边界",
        paragraphs: [
          "当前插件系统是 allowlisted、school-scoped、proposal-aware 的扩展面，不是开放的任意代码执行平台。",
        ],
        bullets: [
          "没有 remote marketplace，也没有外部动态脚本加载。",
          "没有 direct DB、MCP 或 provider key access。",
          "没有 plugin-to-plugin channel，也没有任意自定义 hook bus。",
          "schedule 相关动作只能创建 proposal / draft / annotation。",
        ],
      },
      {
        title: "后续扩展",
        stateLabel: "后续扩展",
        paragraphs: [
          "未来可以继续增加更多 hook anchors、action verbs、外部分发或更清晰的 schedule.assistant UI consumer，但在当前代码里这些能力还没有开放。帮助页会继续把它们与当前 allowlist 分开展示。",
        ],
      },
    ],
  },
  "/help/themes": {
    href: "/help/themes",
    title: "主题开发指南",
    summary: "从 manifest.theme 一路串到 register/set action、ThemeInjector 和 teacher shell，说明主题是怎样被解析与生效的。",
    audience: "面向要提供品牌 token、shell layout 或 route-level theme override 的开发者。",
    factSources: [
      "src/lib/dto/resource-ai.ts",
      "src/actions/theme-actions.ts",
      "src/lib/dal/themes.ts",
      "src/components/theme/theme-injector.tsx",
      "src/server/themes/tokens.ts",
    ],
    coverage: [
      "manifest.theme 与 theme token registry",
      "registerThemeTokensAction() / setActiveThemeAction()",
      "ThemeInjector 与 teacher shell runtime",
      "layout contract、route surfaces 与 fallback",
    ],
    caution: [
      "主题仍然受学校范围约束，不是全局公开市场。",
      "layout contract 只能使用 allowlisted route surfaces、regions 和 modules。",
      "帮助中心本身也继续使用 teacher shell，而不是 docs-only layout。",
    ],
    relatedLinks: [
      { href: "/settings", label: "系统设置", summary: "查看当前用户如何切换 active theme。" },
      { href: "/help/plugins", label: "插件开发", summary: "如果主题通过插件 manifest 带入，可以回看插件注册入口。" },
    ],
    sections: [
      {
        title: "这页适合什么时候读",
        paragraphs: [
          "当你想确认一个主题到底是怎么从 `manifest.theme` 变成 teacher shell 上的真实布局和 CSS variables，这页就是当前代码库的最短路径。",
          "它面向开发者，而不是教师使用说明；所以这里会直接写 `registerThemeTokensAction()`、`setActiveThemeAction()`、`ThemeInjector` 和 `TeacherSidebarShell`，但不会扩展成完整外部设计文档站。",
        ],
      },
      {
        title: "当前可用",
        stateLabel: "当前可用",
        paragraphs: [
          "当前主题 contract 不只是一组颜色 token。`manifest.theme` 可以携带 `colors`、`surfaces`、`radius`、`typography`，也可以声明 `layout` 运行时配置；真实字段由 `ThemeTokenRegistrySchema` 约束。",
          "layout contract 当前支持 `shell`、可选 `pages` override 与 legacy-compatible `tokens`。shell 里真正受支持的字段是 `mode`、`radius`、`width`、`chrome`、`defaultRegions`；pages override 继续受 route surface allowlist 约束。",
          "主题可见性与有效性都走学校范围查询，最终只把当前 actor 可用的主题暴露给设置页和运行时。",
        ],
        bullets: [
          "`ThemeShellMode` 只允许 `left-nav`、`top-nav`、`top-nav-secondary-rail`。",
          "required regions 不能被隐藏，非法 region/module 会在 runtime 中回退。",
          "当前编译结果同时产出 CSS variables 和 `ThemeLayoutRuntime`，不是单纯的配色表。",
        ],
      },
      {
        title: "运行链路",
        paragraphs: [
          "当前运行链路固定为：`manifest.theme` -> `registerThemeTokensAction()` 或插件启用时的主题注册 -> `setActiveThemeAction()` 写入 active theme cookie -> `getCurrentActorThemeRuntimeState()` 解析当前 actor 的主题上下文 -> `compileThemeLayoutRuntime()` / `compileThemeTokensToCssVariables()` 生成运行时结果 -> `ThemeInjector` 注入 CSS variables 与 layout meta -> `TeacherSidebarShell` 按 route surface 消费 runtime。",
          "这条路径决定了主题说明必须同时覆盖 token、layout、fallback 和 shell route metadata，而不是只给一张配色表。当前没有第二条并行 runtime，也不应该在页面 JSX 中手写绕过这套链路的主题分支。",
        ],
      },
      {
        title: "layout contract 与回退规则",
        paragraphs: [
          "layout runtime 的约束不只在 schema 层，`src/server/themes/tokens.ts` 还会根据 allowlisted route surfaces、required regions 和模块白名单编译出最终 surface runtime。",
          "如果某个 page override 试图隐藏 required region、使用不受支持的 module，或者提供不合法的 shell mode，runtime 会回退到允许的默认结构，并在 summary 中保留 fallback 说明。",
          "`/help`、`/teacher`、`/settings` 等 teacher-facing 页面都继续走同一条 shell contract；帮助中心不是 docs-only layout 的例外页面。",
        ],
      },
      {
        title: "最小示例",
        paragraphs: [
          "下面示例只展示最小 token 与页面布局 override 的理解方式，便于对齐当前 schema 与 runtime 的字段命名。",
        ],
        codeExample: {
          title: "最小主题片段",
          language: "json",
          code: `{
  "theme": {
    "colors": { "primary": "#0050d4" },
    "layout": {
      "shell": {
        "mode": "left-nav",
        "radius": "rounded",
        "width": "full-width",
        "chrome": "default",
        "defaultRegions": [
          { "region": "primary-nav" },
          { "region": "page-header" },
          { "region": "main-content", "split": "60/40" }
        ]
      },
      "pages": {
        "/teacher": { "shell": { "mode": "left-nav", "width": "full-width" } }
      }
    }
  }
}`,
        },
      },
      {
        title: "使用边界",
        stateLabel: "使用边界",
        paragraphs: [
          "主题运行时不是一个无限自由的 layout engine。它只能在 allowlisted route surface、required regions 和 shell config contract 内变化。",
        ],
        bullets: [
          "默认字体仍然遵守 Lexend 视觉基线。",
          "帮助中心和教师端页面继续共享同一个 shell runtime，不存在 docs-only layout 特判。",
          "route surface fallback 继续由 runtime 统一编译，不要在页面 JSX 中手写绕路逻辑。",
          "主题生效和切换都必须继续走现有 action 与 DAL，不存在 alternate theme runtime path。",
        ],
      },
      {
        title: "后续扩展",
        stateLabel: "后续扩展",
        paragraphs: [
          "未来可以考虑更丰富的 light/dark 主题族、跨学校市场分发或更细粒度的 route modules，但这些都还不属于当前代码已提供的稳定 contract。",
        ],
      },
    ],
  },
  "/help/actions-interfaces": {
    href: "/help/actions-interfaces",
    title: "Actions 与 Interfaces 指南",
    summary: "聚焦 schedule 扩展相关 hook、proposal payload 和 allowlisted actions，明确当前只开放 proposal-only 写边界。",
    audience: "面向要为课表系统接入 assistant hook、生成 proposal 或补充 conflict annotation 的开发者。",
    introLabel: "当前接口范围",
    factSources: [
      "src/lib/dto/resource-ai.ts",
      "src/server/plugins/registry.ts",
      "src/actions/plugin-actions.ts",
      ".planning/phases/18-teaching-schedule-os/18-CONTEXT.md",
    ],
    coverage: [
      "schedule.assistant hook",
      "createScheduleOverrideProposal / createScheduleReminderDraft / annotateScheduleConflict",
      "proposal payload 与 result 语义",
      "proposal-only 边界",
    ],
    caution: [
      "当前没有 direct runtime schedule write action。",
      "本页不覆盖全系统 DAL 或 Server Actions。",
      "proposal 和 draft 仍需进入受控审批或后续处理链路。",
    ],
    relatedLinks: [
      { href: "/teacher/schedule", label: "教师课表", summary: "查看产品里课表 runtime 的真实使用面。" },
      { href: "/help/plugins", label: "插件开发", summary: "如果你从插件角度接 schedule 扩展，可回看 registry allowlist。" },
    ],
    sections: [
      {
        title: "这页为什么只写这些接口",
        paragraphs: [
          "这页不是全系统 API 目录，而是当前帮助中心里专门面向扩展开发者的边界说明。它只覆盖已经开放给插件与主题运行链路的接口面，重点是 schedule.assistant 以及与之配套的 proposal actions。",
          "如果某个 DAL、Server Action 或页面流程没有进入当前 allowlist、schema 或受控 runtime，这里就不会把它写成可直接使用的公开接口。这样可以避免把内部实现细节误读成稳定开放面。",
        ],
      },
      {
        title: "当前可用",
        stateLabel: "当前可用",
        paragraphs: [
          "当前公开给扩展层的 schedule hook 只有 `schedule.assistant`。允许动作也只限于创建调课 proposal、提醒 draft 和冲突 annotation，对应 `createScheduleOverrideProposal`、`createScheduleReminderDraft`、`annotateScheduleConflict`。",
          "这些 action 名称来自 `PluginActionSchema` 和 `src/server/plugins/registry.ts` 的 allowlist。它们返回的是 typed proposal result，而不是直接把变更写进 runtime schedule。",
          "主题链路相关的公开 mutation 也继续限定在 `registerThemeTokensAction()` 与 `setActiveThemeAction()` 这条单一路径；帮助中心不会把其他内部 helper 包装成独立开放接口。",
        ],
        bullets: [
          "hook 入口当前只有 `schedule.assistant`，没有额外的 schedule hook bus。",
          "schedule proposal actions 都要求 `schedule:write:proposal` 这一类受控 permission。",
          "帮助中心当前不提供全系统 DAL / Server Actions 索引，只覆盖插件、主题与 schedule 扩展边界。",
        ],
      },
      {
        title: "运行语义",
        paragraphs: [
          "Phase 18 已锁定 schedule 扩展为 proposal-only。所有帮助内容都必须把这一点放在最前面，因为它决定了 action 命名、payload 设计和用户心智。",
          "插件执行时的实际路径仍然是 `runPluginHookAction()` -> registry allowlist -> permission/school-scope 校验 -> typed result。返回结果更像一份待审核或待确认的建议，而不是立即生效的 runtime mutation。",
          "对于主题相关接口，真正进入页面的是 `getCurrentActorThemeRuntimeState()` 和 `compileThemeLayoutRuntime()` 产出的 runtime；开发者不应把它理解成一个可直接跳过 action 与 DAL 的自定义入口。",
        ],
      },
      {
        title: "最小示例",
        paragraphs: [
          "下面示例只展示当前 allowlist 中一个 proposal action 的 payload 与 result 形状，帮助你理解 proposal-only 接口的输入输出边界。",
        ],
        codeExample: {
          title: "proposal action payload / result 片段",
          language: "ts",
          code: `const proposalAction = {
  action: "createScheduleOverrideProposal",
  payload: {
    scheduleEntryId: "entry_001",
    proposal: {
      kind: "move",
      reason: "教师外出教研",
      proposedStartAt: "2026-05-14T10:00:00.000Z",
      proposedEndAt: "2026-05-14T10:45:00.000Z",
    },
  },
};

const proposalResult = {
  status: "proposal-created",
  proposalOnly: true,
  proposalType: "scheduleOverrideProposal",
};`,
        },
      },
      {
        title: "使用边界",
        stateLabel: "使用边界",
        paragraphs: [
          "不要把当前 schedule 扩展理解成一组通用 runtime APIs。它只开放了 proposal、draft 和 annotation 三类扩展结果。",
          "这里的 `proposal-only` 是硬边界，不是文案提醒。只要越过这条边界，帮助内容就会与当前 registry allowlist、DAL 审计和 Phase 18 verifier 冲突。",
        ],
        bullets: [
          "proposal-only：扩展只能产出建议或草案，不能直接提交 runtime schedule write。",
          "没有 direct write 到 runtime agenda、override 或 reminder state 的公开动作。",
          "没有开放全系统 DAL/Server Actions 目录。",
          "没有额外的 schedule hooks 超出 `schedule.assistant`。",
        ],
      },
      {
        title: "后续扩展",
        stateLabel: "后续扩展",
        paragraphs: [
          "未来可能补充更多 schedule-aware hooks、审批联动或 richer payload contracts，但它们当前仍然属于后续扩展，而不是已交付接口。",
        ],
      },
    ],
  },
};
