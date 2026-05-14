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
  href: "/help/plugins" | "/help/themes" | "/help/actions-interfaces" | "/help/schedule" | "/help/auth" | "/help/dal" | "/help/classroom" | "/help/actions";
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


export type FaqItem = {
  question: string;
  answer: string;
};

export type FaqCategory = {
  title: string;
  items: FaqItem[];
};

export type HelpFaqContent = FaqCategory[];

export const helpFaqContent: HelpFaqContent = [
  {
    title: "认证问题",
    items: [
      {
        question: "登录失败",
        answer: "请检查用户名和密码是否正确。如果忘记密码，请联系管理员重置。另外请确认您的账号会员状态是否有效，过期或被禁用的账号将无法登录。",
      },
      {
        question: "无权限访问",
        answer: "这通常意味着您缺少教师角色或未处于有效会员状态。请联系学校管理员确认您的账号已开通教师权限且会员在有效期内。",
      },
      {
        question: "Session 过期",
        answer: "JWT token 过期后需要重新登录。请在登录页面重新输入凭据。如果频繁过期，请检查浏览器时间设置是否正确，或尝试清除浏览器缓存后重试。",
      },
    ],
  },
  {
    title: "课堂问题",
    items: [
      {
        question: "课堂启动失败",
        answer: "请确认课时已发布且班级已有学生名单。检查步骤：1) 进入课时编辑确认发布状态；2) 检查班级学生名单是否为空；3) 确认您的账号有该班级的教学权限。",
      },
      {
        question: "学生看不到课堂",
        answer: "请检查以下两点：1) 学生是否已在班级中 Enrollment 状态为激活；2) 课堂状态是否为已开始或进行中。如果问题持续，请联系管理员检查班级配置。",
      },
      {
        question: "SSE 连接断开",
        answer: "实时连接断开后会尝试自动重连。如果频繁断开，请检查网络稳定性或尝试刷新页面。长时间断开可能影响师生互动实时性，但不会丢失已提交的内容。",
      },
    ],
  },
  {
    title: "课件与内容问题",
    items: [
      {
        question: "无法创建课件",
        answer: "请确认您拥有教师权限。创建课件需要在有效会员状态下进行。如权限正常但仍无法创建，请联系管理员检查系统配置。",
      },
      {
        question: "步骤排序失效",
        answer: "步骤排序使用 LexoRank 系统，不支持手动拖拽修改序号。如需调整步骤顺序，请联系系统管理员处理。",
      },
      {
        question: "发布失败",
        answer: "发布失败通常由验证错误引起。请检查所有必填字段是否完整，课件内容是否符合格式要求。错误信息会指出具体问题所在。",
      },
    ],
  },
  {
    title: "课表问题",
    items: [
      {
        question: "课表扩展无反应",
        answer: "课表 AI 扩展当前只会生成 proposal（建议），不会直接修改运行中的课表。您需要审批通过后才会生效。这是 proposal-only 的设计边界。",
      },
      {
        question: "导入失败",
        answer: "请检查 CSV 格式是否符合要求。常见问题：列名不匹配、日期格式错误、必填字段缺失。建议先下载模板，按模板格式填写后再导入。",
      },
    ],
  },
  {
    title: "插件与主题问题",
    items: [
      {
        question: "插件不生效",
        answer: "请检查：1) 插件是否已启用；2) 插件是否在学校范围内激活；3) 您的账号是否有使用该插件的权限。插件需要管理员在插件市场中启用后才能使用。",
      },
      {
        question: "主题切换无效",
        answer: "主题切换可能受以下因素影响：浏览器 cookie 被阻止、CDN 缓存未更新、本地浏览器缓存。尝试清除浏览器缓存和 Cookie 后重新登录。如问题持续，请联系管理员检查主题配置。",
      },
    ],
  },
];
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
  {
    href: "/help/auth",
    title: "认证系统",
    summary: "解释 Auth.js v5 拆分配置、Proxy 保护层、JWT 策略与 school-scoped memberships 访问控制。",
    coverage: ["auth.config.ts 拆分", "NextAuth proxy", "JWT session", "memberships 角色"],
    includesCodeExamples: true,
  },
  {
    href: "/help/dal",
    title: "数据访问层 (DAL)",
    summary: "覆盖 DAL 设计原则、层内划分、各模块职责边界与典型调用模式。",
    coverage: ["DAL 分层原则", "模块划分", "auth 与 memberships", "learning 与 classroom", "lesson/course authoring"],
    includesCodeExamples: false,
  },
  {
    href: "/help/classroom",
    title: "课堂系统",
    summary: "覆盖 Classroom/Session 的实时架构、SSE 推送、两极模式、在线状态追踪与过程性评价记录链路。",
    coverage: ["Session 生命周期", "locked/unlocked 模式", "SSE 实时推送", "Presence 追踪", "证据与干预", "形成性评价"],
    includesCodeExamples: false,
  },
  {
    href: "/help/schedule",
    title: "课表系统",
    summary: "覆盖课表运行时、跨 session 趋势、调课操作、导入审批与 proposal-only 扩展边界，是 Phase 26 cross-session trends 的核心事实来源。",
    coverage: ["教师课表 runtime", "跨 session 趋势 (7/14/30 day)", "调课 override", "校历管理", "proposal-only 边界", "schedule.assistant hook"],
    includesCodeExamples: false,
  },
  {
    href: "/help/actions",
    title: "Server Actions 层",
    summary: "覆盖所有 Server Actions 的输入验证、错误映射、缓存失效模式与认证检查通用做法。",
    coverage: [
      "Zod 输入验证",
      "错误映射 (TEACHER_AUTH_REQUIRED -> UNAUTHORIZED)",
      "updateTag 缓存失效",
      "assertActiveTeacher 认证模式",
      "lesson-authoring-actions (11 actions)",
      "classroom-actions (11 actions)",
      "learning-actions (4 actions)",
      "class-management-actions (6 actions)",
      "course-authoring-actions (2 actions)",
      "plugin-actions (7 actions)",
      "theme-actions (2 actions)",
      "auth-actions (2 actions)",
      "schedule re-exports (12 actions)",
    ],
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
  "/help/auth": {
    href: "/help/auth",
    title: "认证系统指南",
    summary: "Auth.js v5 拆分配置模式、Proxy 保护层、JWT 策略与 school-scoped memberships 角色访问控制的完整链路。",
    audience: "面向要理解认证架构、保护路由、或接入当前角色的开发者。",
    factSources: [
      "src/lib/auth/auth.config.ts",
      "src/lib/auth/auth.ts",
      "src/proxy.ts",
      "src/db/schema.ts",
      "src/lib/dal/auth.ts",
      "src/lib/dal/membership.ts",
    ],
    coverage: [
      "auth.config.ts: edge-safe, 无 DB 依赖",
      "NextAuth(authConfig).auth proxy 保护层",
      "JWT session strategy + credentials provider",
      "school-scoped memberships 与角色（teacher/student/admin）",
      "getCurrentUserDTO / getUserMembershipsDTO DAL",
    ],
    caution: [
      "auth.config.ts 不得引入 Drizzle ORM 或 db 导入，否则 Proxy 层会报错。",
      "Proxy 保护路由：/teacher、/student、/classroom、/admin。",
      "credentials provider 不支持 OAuth providers（accounts 表仅用于 OAuth）。",
    ],
    relatedLinks: [
      { href: "/teacher", label: "教师端", summary: "受 Proxy 保护的教师路由示例。" },
      { href: "/student", label: "学生端", summary: "受 Proxy 保护的学生路由示例。" },
      { href: "/classroom", label: "课堂", summary: "受 Proxy 保护的课堂路由示例。" },
    ],
    sections: [
      {
        title: "这页适合什么时候读",
        paragraphs: [
          "当你需要理解认证流程的层次、为什么 auth.config.ts 不能 import Drizzle、或者想确认 Proxy 保护层是如何拦截未登录请求的，直接看这页。",
          "这页面向开发者，不面向终端用户；重点是架构决策、文件职责边界和 DAL session helpers，而不是登录页 UI。",
        ],
      },
      {
        title: "当前可用",
        stateLabel: "当前可用",
        paragraphs: [
          "当前认证系统基于 Auth.js v5，使用拆分配置模式：`auth.config.ts` 只包含 providers、pages 和 `authorized` callback（无 DB 依赖，edge-safe）；`auth.ts` 是完整实例，包含 DrizzleAdapter、CredentialsProvider 和 JWT strategy。",
          "Proxy 层（`src/proxy.ts`）使用 `NextAuth(authConfig).auth` 保护 `/teacher`、`/student`、`/classroom`、`/admin`。它在 Edge Runtime 执行，只依赖 authConfig，不引入任何 DAL 或 DB。",
          "Session 策略为 JWT。`jwt` callback 将用户 ID 和 roles 写入 token；`session` callback 将其传递到 `session.user.id` 和 `session.user.roles`。",
          "角色通过 school-scoped memberships 确定：教师和学生都属于某个学校（schoolId），通过 `memberships.role` 字段（teacher/student/admin）区分。",
        ],
        bullets: [
          "`auth.config.ts` 是唯一可以在 Edge Runtime 执行的 Auth.js 配置层。",
          "Proxy matcher 排除了 `/api`、`/_next`、favicon.ico，其他所有路由都经过认证检查。",
          "未登录用户访问受保护路由会重定向到 signIn page（`/`）。",
          "JWT token 包含 id 和 roles，session 只传递 user.id 和 user.roles。",
          "credentials provider 使用 bcryptjs 比对密码，不支持 Social Login。",
        ],
      },
      {
        title: "配置拆分原则",
        paragraphs: [
          "`auth.config.ts` 与 `auth.ts` 的拆分是刻意为之的设计决策，不是随意分割。",
          "`auth.config.ts` 必须保持 DB-free，原因：它在 Edge Runtime 的 `src/proxy.ts` 中执行，而 Edge Function 不能使用 Node.js 专用数据库驱动。",
          "`auth.ts` 包含 DrizzleAdapter（需要同步 db 连接）、CredentialsProvider 实现（需要 bcryptjs）和完整的 JWT callbacks。它只在 Server Actions 和 Route Handlers 中使用。",
          "如果在 `auth.config.ts` 中引入 Drizzle ORM，Proxy 层会在构建或运行时失败，因为 Edge Runtime 无法解析 `better-sqlite3` 或 Drizzle 的 Node.js 专用导入。",
        ],
      },
      {
        title: "Proxy 保护层运行机制",
        paragraphs: [
          "`src/proxy.ts` 导出一个默认的 NextAuth 中间件函数：`export default NextAuth(authConfig).auth`。",
          "它的 `config.matcher` 排除 `/api`、`/_next` 和 `favicon.ico`，对其他所有请求执行 `authorized` callback。",
          "`authorized` callback 调用 `isAuthorizedRouteAccess()`，检查：1. 路由是否受保护；2. 用户是否已登录；3. 用户是否有所需角色。",
          "Proxy 层只做路由拦截和基础角色校验；具体的 school scope 和权限细化由后续 DAL 层处理。",
        ],
        codeExample: {
          title: "proxy.ts 核心结构",
          language: "ts",
          code: `import NextAuth from "next-auth";
import { authConfig } from "./lib/auth/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};`,
        },
      },
      {
        title: "Credentials 登录流程",
        paragraphs: [
          "用户提交 email（教师邮箱或学生学号）、password 和 roleIntent（teacher/student）。",
          "`authorizeCredentials()` 先通过 roleIntent 确定查询字段：teacher 用 email，student 用 studentNumber。",
          "然后查询 users 表、用 bcrypt.compare 验证密码，再用 memberships 表确认用户在该角色下有 active membership。",
          "如果验证失败返回 null，NextAuth 会拒绝登录。成功则返回包含 id、name、email 和 roles 的 user 对象。",
        ],
        codeExample: {
          title: "authorizeCredentials 流程",
          language: "ts",
          code: `export async function authorizeCredentials(credentials) {
  const roleIntent = normalizeRoleIntent(credentials.roleIntent);
  const loginId = roleIntent === "student"
    ? credentials.studentNumber
    : credentials.email;

  const user = await db.select().from(users)
    .where(roleIntent === "student"
      ? eq(users.studentNumber, loginId)
      : eq(users.email, loginId))
    .limit(1);

  const isValid = await bcrypt.compare(credentials.password, user.password);

  if (!isValid) return null;

  const activeMemberships = await db.select({ id: memberships.id })
    .from(memberships)
    .where(and(
      eq(memberships.userId, user.id),
      eq(memberships.role, roleIntent),
      eq(memberships.status, "active")
    ));

  if (activeMemberships.length === 0) return null;

  return { id: user.id, name: user.name, email: user.email, roles: [roleIntent] };
}`,
        },
      },
      {
        title: "DAL session helpers",
        paragraphs: [
          "`getCurrentUserDTO()` 从 `auth()` 获取当前 session，提取 user.id，然后查询 users 表返回 UserDTO。它是 Server Actions 中获取当前登录用户的推荐入口。",
          "`getUserMembershipsDTO()` 查询当前用户的所有 memberships，返回包含 schoolId、role、status 的 MembershipDTO 数组。",
          "`getCurrentUserSchoolIds()` 组合以上两个 helper，返回当前用户在 active memberships 中所属的所有 schoolId 列表。",
          "这些 helpers 都标记为 `server-only`，不能在前端代码中使用。",
        ],
        codeExample: {
          title: "getCurrentUserDTO 实现",
          language: "ts",
          code: `export async function getCurrentUserDTO(): Promise<UserDTO | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userRecord = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!userRecord) return null;

  return UserDTOSchema.parse(userRecord);
}`,
        },
      },
      {
        title: "使用边界",
        stateLabel: "使用边界",
        paragraphs: [
          "当前认证系统不支持 OAuth providers（Google、GitHub 等）。accounts 表结构存在，但 credentials provider 是唯一的登录方式。",
          "Proxy 层只能识别 teacher/student/admin 三种角色，不能识别更细粒度的 permission（如 schedule:write:proposal）。",
          "Session 是 JWT，不是数据库 session。JWT 内容只有 id 和 roles，不包含 memberships 详情。",
          "用户切换学校（multi-school）场景需要自行实现，当前 DAL 没有处理。",
        ],
        bullets: [
          "不支持 Social Login 和 OAuth 自动注册。",
          "不能在前端直接读取 session，必须通过 Server Actions。",
          "没有 session 过期刷新机制，JWT TTL 由 NextAuth 内部控制。",
        ],
      },
      {
        title: "后续扩展",
        stateLabel: "后续扩展",
        paragraphs: [
          "未来可以考虑支持 OAuth providers、session 持久化策略、multi-school 切换 UI 或更细粒度的 permission system。",
          "但这些都还不属于当前代码库中已落地的能力，帮助中心不会将它们写成可直接使用的接口。",
        ],
      },
    ],
  },
  "/help/schedule": {
    href: "/help/schedule",
    title: "课表系统指南",
    summary: "覆盖课表 runtime、跨 session 趋势、调课 override、校历管理与 proposal-only 扩展边界，是 Phase 26 cross-session trends 的核心事实来源。",
    audience: "面向要理解教师课表运行时、跨 session 趋势数据、schedule 扩展 proposal-only 边界与 DAL 层职责划分的开发者。",
    introLabel: "Phase 26 核心事实来源",
    factSources: [
      "src/features/schedule/assistant/actions.ts",
      "src/features/schedule/import/actions.ts",
      "src/features/schedule/operations/actions.ts",
      "src/features/schedule/reminders/actions.ts",
      "src/lib/dal/schedule-assistant.ts",
      "src/lib/dal/schedule-operations.ts",
      "src/features/schedule/runtime/server.ts",
      ".planning/phases/26-cross-session-trends-and-stitch-productization/26-CONTEXT.md",
    ],
    coverage: [
      "TeacherDailyAgendaDTO / ClassDailyAgendaCardDTO runtime 读模型",
      "跨 session 趋势：7/14/30 day patterns、class-level aggregations",
      "Student-level breakdown：participation buckets (active/normal/attention/unevaluated)",
      "调课 override (create/update/revokeScheduleOverrideAction)",
      "校历管理 (saveHolidayCalendarDateAction / removeHolidayCalendarDateAction)",
      "Import/draft/approve 审批链路",
      "schedule.assistant proposal 与 proposal-only 边界",
      "schedule assistant DAL (createScheduleAssistantProposal / approve/reject)",
      "schedule operations DAL (createScheduleOverride / revokeOverride / holiday dates)",
    ],
    caution: [
      "schedule 扩展只能产出 proposal/draft/annotation，不能直接写 runtime schedule。",
      "跨 session 趋势的 participation buckets 只是一种信息聚合表达，不等于学生评价结论。",
      "调课 override 的 effectiveDate 是单日有效，不是整个学段修改。",
      "导入审批链路中的 approve 仍然受 school scope 与状态机约束，不是任意放行。",
    ],
    relatedLinks: [
      { href: "/teacher/schedule", label: "教师课表", summary: "查看产品里课表 runtime 的真实使用面。" },
      { href: "/teacher/trends", label: "跨 session 趋势", summary: "Phase 26 新增的班级与学生级别趋势分析入口。" },
      { href: "/help/actions-interfaces", label: "Actions / Interfaces", summary: "如果你从插件角度接入 schedule.assistant hook，可回看 proposal-only 边界说明。" },
      { href: "/help/plugins", label: "插件开发", summary: "如果你在写 manifest 和 schedule.assistant 相关的插件，可回看 registry allowlist。" },
    ],
    sections: [
      {
        title: "这页适合什么时候读",
        paragraphs: [
          "当你需要理解课表系统的完整层次——从 runtime 读模型到 DAL 层职责划分，或者要接入 Phase 26 新增的跨 session 趋势数据，这页是当前代码库的事实来源汇总。",
          "它覆盖了 assistant、operations、import、reminders 四个 action 分支，以及 schedule-assistant 和 schedule-operations 两个 DAL 层。不是 API 手册，而是帮助你在代码里找路的参考索引。",
        ],
      },
      {
        title: "课表运行时读模型",
        stateLabel: "当前可用",
        paragraphs: [
          "教师课表 runtime 的核心 DTO 是 `TeacherDailyAgendaDTO` 和 `ClassDailyAgendaCardDTO`，由 `src/features/schedule/runtime/server.ts` 中的 `getTeacherDailyAgendaDTO()` 和 `getClassDailyAgendaDTO()` 产出。",
          "这两个函数都使用 `loadAgendaRuntimeRecords()` 加载同一条数据链：`scheduleTerm` -> `scheduleTeachingAssignment` -> `scheduleRecurringEntry` -> `scheduleOverride` -> `scheduleHolidayDate`，再按 bellSlot 聚合出最终 agenda cards 和 weekly schedule grid。",
          "读模型同时支持 teacher view 和 admin_school view；前者只看当前教师自己的课，后者可以看整个学校的课表。权限校验走 `assertScheduleTeacherScope()`，学校范围由 memberships 决定。",
        ],
        bullets: [
          "`TeacherDailyAgendaDTO.viewMode` 区分 `teacher` 与 `admin_school`，决定是否包含所有教师的数据。",
          "`ClassDailyAgendaCardDTO` 是班级课表的读模型，比教师版少 `lessonLink` 字段。",
          "Override 覆盖规则：同一个 `recurringEntryId` 在同一 date 只能有一个 active override，覆盖后的 bellSlot/room/teacher 都以 override 为准。",
          "Holiday 日期的 `dayType` 决定是否渲染为停课：只有 `teaching` 和 `make_up` 是正常上课日，`holiday` 和 `non_teaching` 会把当天全部标为停课。",
        ],
      },
      {
        title: "跨 session 趋势（Phase 26）",
        stateLabel: "当前可用",
        paragraphs: [
          "Phase 26 新增的 cross-session trends 在 `src/features/schedule/runtime/server.ts` 的 `getTeacherDailyAgendaDTO()` 基础上，通过 `TeacherDailyAgendaDTO` 的 session-first 记录来支撑趋势聚合。",
          "当前趋势以 session 为单位，聚合周期支持 7 day、14 day、30 day 三种 patterns。Class-level aggregation 给出班级维度的参与度/完成率趋势，student-level breakdown 再拆解到单个学生的 participation buckets。",
          "Participation buckets 当前分为四档：`active`（持续参与）、`normal`（正常参与）、`attention`（需要关注）、`unevaluated`（未进入评价）。这四种状态是信息标签，不是评价结论——它们描述的是参与行为趋势，不是学生能力判断。",
        ],
        bullets: [
          "跨 session 趋势的数据来源是 `classroomSession` 表的 session records，不是另起一套 analytics snapshot。",
          "7/14/30 day patterns 是时间窗口配置，不是固定报表；实际显示哪些窗口由 UI 层决定。",
          "Class-level 与 student-level 的聚合使用相同的 session evidence base，保持与 single-session recap 一致的 truth source。",
          "Phase 26 产品上 `/teacher/trends` 是 cross-session trends 的入口，同时接受从 `/classroom` recap 的 deep-link 进入（`/teacher/trends?classId=&sessionId=&view=sessions`）。",
        ],
      },
      {
        title: "schedule.assistant 与 proposal-only 边界",
        stateLabel: "当前可用",
        paragraphs: [
          "`src/features/schedule/assistant/actions.ts` 输出三个 Server Action：`createScheduleAssistantProposalAction`、`approveScheduleAssistantProposalAction`、`rejectScheduleAssistantProposalAction`。",
          "proposal 有三种类型：`import_mapping`（导入映射建议）、`conflict_explanation`（冲突说明）、`override_suggestion`（调课建议）。proposal 创建后状态为 `pending`，审批后变为 `draft_created`，拒绝后变为 `rejected`。",
          "Proposal-only 边界是硬约束：schedule 扩展只能产出 proposal/draft/annotation，不能直接写入 runtime schedule。`src/features/schedule/assistant/server.ts` 中的 `createScheduleAssistantProposal()` 只做 DB insert 和审计日志，不触发任何 runtime schedule mutation。",
          "审批通过后的 `draft_created` 状态意味着系统已准备好一份 draft，但真正写入 runtime 仍需通过 `schedule/operations` 层的受控 action，而不是插件直接写。",
        ],
        bullets: [
          "proposal 的 `draftPayloadJson` 字段存储原始 proposal 内容，审批通过后由后续链路消费。",
          "当前 proposal 只支持 `pending -> draft_created` / `rejected` 两种终态，没有 `approved` 直接生效的路径。",
          "`schedule.assistant` hook 是 `schedule.assistant` anchor 的消费者，不是 runtime schedule 的直接修改者。",
          "帮助中心不提供 proposal -> runtime write 的自动链路说明，因为这当前不是已开放的 contract。",
        ],
      },
      {
        title: "schedule operations DAL",
        stateLabel: "当前可用",
        paragraphs: [
          "`src/lib/dal/schedule-operations.ts`（实际导出来自 `src/features/schedule/operations/server.ts`）提供调课 override 和校历管理的核心 DAL 函数。",
          "调课 override 有三种 action：`substitute`（代课）、`cancel`（停课）、`move`（换时段/换教室）。每种 action 都有对应的 payload 约束——`substitute` 必须有 `substituteTeacherId`，`move` 必须有 `replacementBellSlotId` 或 `replacementRoomLabel`。",
          "Override 的 effectiveDate 是单日有效，不影响其他日期。`revokeScheduleOverride()` 可以撤销一个 active override，撤销时必须提供 reason 并记入审计。",
          "校历管理通过 `saveHolidayCalendarDate()` 和 `removeHolidayCalendarDate()` 操作 `scheduleHolidayDate` 表。Holiday 日期关联到 `scheduleHolidayCalendar`，后者关联到 school。一个 school 默认有一个默认校历，由 `ensureDefaultHolidayCalendar()` 在首次写入时自动创建。",
        ],
        bullets: [
          "createScheduleOverride 要求 `substituteTeacherId`（代课）或 `replacementBellSlotId`/`replacementRoomLabel`（换时段/换教室）二选一，`cancel` 不需要额外字段。",
          "override 状态机：`active` -> `revoked`；没有其他中间态。",
          "holiday date 的 `dayType` 枚举：`holiday`（放假）、`non_teaching`（非教学日）、`make_up`（补课）、`teaching`（上课日）。",
          "holiday date 操作会级联清除相关缓存 tag，保持 runtime 读模型与 DB 变更一致。",
        ],
      },
      {
        title: "import / draft / approve 审批链路",
        stateLabel: "当前可用",
        paragraphs: [
          "`src/features/schedule/import/actions.ts` 处理课表数据导入的完整链路：`draftScheduleImportAction` -> `approveScheduleImportAction` -> `setPrimaryScheduleImportBatchAction`。",
          "Draft 阶段对输入做规范化：中文字段名转英文、时间字符串规范化（`HH:mm`）、空字符串转 null。规范后数据通过 `ScheduleImportDraftInputSchema` 校验，写入 `scheduleImportBatch` 表。",
          "Approve 阶段检查阻断项（如冲突时间），若有阻断则返回 `APPROVE_IMPORT_BLOCKED` 错误和具体 issues。阻断项解决后才能继续审批。",
          "审批通过后可通过 `setPrimaryScheduleImportBatchAction` 将该批次设为主课表，覆盖学校当前的主课表配置。",
        ],
        bullets: [
          "导入行的 `weekday` 字段支持中文数字和阿拉伯数字，自动归一化为整数。",
          "导入时间格式支持 `HH:mm` 和 `H:mm` 两种写法，自动补零规范化。",
          "approve 阻断时会返回具体冲突项列表，帮助教师定位问题行。",
          "setPrimary 后旧主课表不会自动归档，仍保留在 DB 中供历史查询。",
        ],
      },
      {
        title: "reminders DAL",
        stateLabel: "当前可用",
        paragraphs: [
          "`src/features/schedule/reminders/actions.ts` 提供提醒规则的保存、重试和刷新：`saveScheduleReminderRuleAction`、`retryScheduleReminderDispatchAction`、`refreshScheduleReminderCenterAction`。",
          "提醒规则保存在 `scheduleReminderRule` 表，与 school scope 关联。当前首发允许的提醒类型、对象和渠道有限制，超出范围的写入会触发 `SCHEDULE_REMINDER_BLOCKED` 错误。",
          "`retryScheduleReminderDispatch()` 用于重新触发一个失败的 dispatch 记录，保持幂等性。",
        ],
        bullets: [
          "提醒规则写入后通过 `invalidateScheduleReminderTags()` 清除相关缓存。",
          "当前首发只支持受限的提醒类型/对象/渠道，具体范围由 `ScheduleReminderRuleInputSchema` 约束。",
          "dispatch retry 不会无限重试，受调度策略控制。",
        ],
      },
      {
        title: "使用边界",
        stateLabel: "使用边界",
        paragraphs: [
          "schedule 系统当前的分层很清晰：runtime 读模型在 `schedule/runtime/server.ts`，proposal 在 `schedule/assistant`，operations 在 `schedule/operations`，import 在 `schedule/import`，reminders 在 `schedule/reminders`。每一层都有自己的 DAL 和 Server Action，不能跨层调用。",
          "Proposal-only 边界是硬约束。`schedule.assistant` 的任何 hook consumer 只能产出 proposal/draft/annotation，不能绕过这个边界直接写 runtime schedule。",
          "跨 session 趋势的 buckets 是行为标签，不是评价结论。不要把 `attention` bucket 等同于"学生有问题"，也不要把 `active` 等同于"学生表现优秀"。",
        ],
        bullets: [
          "不要在插件里直接调用 `createScheduleOverride()` / `saveHolidayCalendarDate()` 等 runtime write DAL。",
          "不要把跨 session 趋势的聚合结果当成确定性结论使用，它只是辅助判断的信息。",
          "import 审批阻断时，issues 列表只描述冲突，不自动解决冲突。",
          "Reminder dispatch retry 有策略限制，不要在循环里重试失败任务。",
        ],
      },
      {
        title: "后续扩展",
        stateLabel: "后续扩展",
        paragraphs: [
          "未来可能补充：proposal 自动审批链路、跨 session 趋势的 richer aggregation rules、reminder 的 richer channel 支持、import 的 conflict auto-resolve。",
          "这些扩展当前不在已落地的 contract 里，帮助内容会继续把已交付能力和未来扩展分开展示。",
        ],
      },
    ],
  },
};
"/help/dal": {
  href: "/help/dal",
  title: "数据访问层 (DAL) 开发指南",
  summary: "理解 DAL 如何在 UI/Server Actions 与 Drizzle ORM 之间分层，所有数据库访问都必须经过 DAL 而不是绕过。",
  audience: "面向要扩展或维护 DAL 模块、编写新 Server Action、或理解数据如何在层间流转的开发者。",
  factSources: [
    "src/lib/dal/auth.ts",
    "src/lib/dal/membership.ts",
    "src/lib/dal/learning.ts",
    "src/lib/dal/classroom.ts",
    "src/lib/dal/lesson-authoring.ts",
    "src/lib/dal/course-authoring.ts",
    "src/lib/dal/class-management.ts",
    "src/lib/dal/plugins.ts",
    "src/lib/dal/themes.ts",
    "src/lib/dal/mcp.ts",
  ],
  coverage: [
    "DAL 层职责边界与设计原则",
    "模块划分：auth、memberships、learning、classroom、lesson/course authoring、plugins、themes、mcp",
    "assertActiveTeacher / assertActiveStudent 模式",
    "school scope 校验",
    "append-only 提交记录",
    "LexoRank 排序",
  ],
  caution: [
    "UI 组件和 Server Actions 禁止直接导入 db 并操作数据库。",
    "所有 foreign key 关系使用 onDelete: cascade，删除时注意级联影响。",
    "taskSubmissions 和 quizAttempts 是 append-only，不允许 update 只允许 insert 新行并标 isLatest。",
    "LexoRank 只用于 step 排序，禁止使用整数 position 列。",
  ],
  relatedLinks: [
    { href: "/help/plugins", label: "插件开发", summary: "plugins.ts 中的 plugin hook 与 permission 校验依赖 DAL 完成 school scope 校验。" },
    { href: "/help/themes", label: "主题开发", summary: "themes.ts 中主题注册后通过 DAL 持久化，切换时写入 cookie 由 runtime 消费。" },
    { href: "/help/actions-interfaces", label: "Actions 与 Interfaces", summary: "Server Action 是 DAL 的直接调用方，理解 DAL 有助于正确使用 Actions。" },
  ],
  sections: [
    {
      title: "这页适合什么时候读",
      paragraphs: [
        "当你要新增一个 DAL 函数、编写调用数据库的 Server Action、或者需要确认某个数据访问应该落在哪个 DAL 模块时，直接看这页。",
        "本页不重复 Drizzle schema 或具体 table 定义，只说明 DAL 层的设计约定、各模块职责和典型调用模式。",
      ],
    },
    {
      title: "当前可用",
      stateLabel: "当前可用",
      paragraphs: [
        "DAL 是数据访问的唯一入口，所有 DB 操作必须通过 DAL 而不是直接从 Server Action 或 UI 调用 drizzle。",
        "每个 DAL 文件专注一个业务域：auth/memberships 管理用户与会话、learning 管理学生进度与提交、classroom 管理课堂 session 与采证、lesson-authoring 管理课时与 step 排序、course-authoring 管理课程卡片与聚合查询、class-management 管理班级名册与批量导入、plugins 管理插件注册与 hook 分发、themes 管理主题 token 与运行时状态、mcp 管理 MCP server 注册与 capability。",
        "每个 DAL 模块通过 `assertActiveTeacher()` 或 `assertActiveStudent()` 获取当前 actor scope，并以 schoolId 校验权限边界。所有查询默认带上 school scope 过滤，除非函数签名明确说明可跨校。",
      ],
      bullets: [
        "auth.ts：`getCurrentUserDTO()` 从 Auth.js session 解析当前用户，`getCurrentUserSchoolIds()` 查询用户所在学校列表。",
        "membership.ts：`getUserMembershipsDTO()` 返回用户的 school memberships，含 role 和 status，用于 school scope 校验。",
        "learning.ts：学生进度记录（`markStepProgress`）、任务提交（`submitTaskAttempt`，append-only）、测验作答（`submitQuizAttempt`，append-only）、教师反馈（`saveAttemptFeedback`）。",
        "classroom.ts：课堂 session 管理（`launchClassroomSession`、`changeClassroomActiveStep`、`endClassroomSession`）、采证记录（`recordClassroomEvidence`、`recordStudentQuickResponse`）、formative evaluation（`recordStudentFormativeEvaluation`）。",
        "lesson-authoring.ts：`assertActiveTeacher()` 获取教师 scope；课时 CRUD、step 增删排序（LexoRank）、发布快照（`publishLesson`）与准备度检查（`getLessonPublishReadinessDTO`）。",
        "course-authoring.ts：课程聚合查询（`getTeacherCourseCenterDTO`、`getTeacherCourseDetailDTO`）、创建与更新（`createCourseForTeacherScoped`、`updateCourseForTeacherScoped`）。",
        "class-management.ts：班级名册导入导出（`importClassesForTeacher`、`importClassRosterForTeacher`）、学生密码重置（`resetStudentPasswordsForTeacher`）。",
        "plugins.ts：`registerPluginManifest()`、`setPluginEnabled()`、`runPluginHook()` 做 plugin hook 分发，含 school scope、kill switch 与 permission 校验。",
        "themes.ts：`registerThemeTokens()`、`getValidThemesForSchool()`、`getCurrentActorThemeRuntimeState()` 管理主题 registry 与运行时。",
        "mcp.ts：`registerMcpServer()`、`setMcpCapabilityEnabled()`、`recordMcpAudit()` 管理 MCP server 注册与审计日志。",
      ],
    },
    {
      title: "DAL 设计原则",
      paragraphs: [
        "每个 DAL 文件是自包含的业务模块，不跨文件 join 业务无关的 table。所有跨域组合在调用方或上方 Server Action 层做 aggregation。",
        "DAL 函数签名分为 query（只读，返回 DTO）和 mutation（写操作，返回 MutationResult）。query 可以带 cache hint（`cacheLife`/`cacheTag`），mutation 不做 cache。",
        "所有 mutation 函数接收原始 input（未校验的 JS object），内部调用 Zod schema 做 parse 并 transform，确保 DB 操作前已完成校验。",
        "school scope 校验在 DAL 入口做，不在调用方做。函数签名应显式传入 schoolId 或从 actor membership 推导，而不是隐式依赖全局状态。",
        "错误使用 throw Error(message) 而非业务 Result type，调用方通过 catch 检测错误字符串做分支。错误 message 应简短、机器可读，如 `TEACHER_AUTH_REQUIRED`、`COURSE_NOT_FOUND`。",
      ],
    },
    {
      title: "append-only 提交记录",
      paragraphs: [
        "`taskSubmissions` 和 `quizAttempts` 是 append-only 表。写入时在同一个 transaction 内：先将同 publishedVersionId+stepId+studentId 的旧记录标 isLatest=false，再插入新行 isLatest=true。",
        "这样保留完整尝试历史，同时 latest read model 始终指向最新一条。禁止做 update 操作修改已存在的 attempt 记录。",
        "reading 时过滤 isLatest=true 拿到当前最新结果；history 页面不过滤，拿到所有历史。",
      ],
    },
    {
      title: "LexoRank 排序",
      paragraphs: [
        "课时内的 step 顺序使用 LexoRank rank 字符串（`lessonSteps.rank`），不是整数 position。",
        "新增 step 时用 `createRankAfter(lastRank)` 或 `createRankBetween(before, after)` 计算 rank；拖拽排序时算出目标区间内的中间值。",
        "禁止在 DAL 或 Server Action 中直接交换 integer position，这会触发级联更新。",
      ],
    },
    {
      title: "使用边界",
      stateLabel: "使用边界",
      paragraphs: [
        "不要绕过 DAL 直接导入 db 并在 Server Action 中写 drizzle 查询。这会绕过 school scope 校验、audit 日志和 cache policy。",
        "不要在 DAL 函数内部做 auth 判断后又允许 null return 而不抛错。所有需要权限的函数在拿不到 scope 时应抛出 `TEACHER_AUTH_REQUIRED` 或 `INACCESSIBLE_LESSON_MESSAGE`。",
        "append-only 表（taskSubmissions、quizAttempts）禁止做 update，只做 insert 并更新 isLatest 标记。",
        "不要在 lesson-authoring 或 classroom 等教师侧 DAL 中直接使用 studentId 做 scope 校验，应该先通过 course/class membership 推导 school scope 再过滤。",
      ],
    },
    {
      title: "后续扩展",
      stateLabel: "后续扩展",
      paragraphs: [
        "未来可能将更多聚合查询下沉到 DAL 并增加 cache hint，提升 dashboard 类页面的加载性能。",
        "未来可能为 classroom session 增加更多 real-time 事件类型（如 `step_completed`、`evidence_captured`），目前只有 `launched`、`active_step_changed`、`lock_mode_changed`、`slide_changed`、`ended`。",
        "未来可能为 MCP capability 增加 more granular role-based access control。",
      ],
    },
  ],
};

  "/help/classroom": {
    href: "/help/classroom",
    title: "课堂系统指南",
    summary: "覆盖 Classroom/Session 的实时架构、SSE 推送、两极模式、在线状态追踪与过程性评价记录链路。",
    audience: "面向要理解课堂实时系统架构、Session 生命周期、SSE 推送机制与过程性评价设计的开发者。",
    factSources: [
      "src/lib/dal/classroom.ts",
      "src/actions/classroom-actions.ts",
      "src/app/api/classroom/[sessionId]/events/route.ts",
      "src/components/classroom/",
    ],
    coverage: [
      "Session 生命周期：launched → live → ended",
      "locked/unlocked 两极模式与教师控课",
      "SSE 轮询推送 ClassroomSnapshot 的运行机制",
      "Presence 追踪：touchClassroomPresenceAction 与 connectionState",
      "课堂证据与干预记录链路",
      "学生形成性评价（participationLevel + tags + observationNote）",
    ],
    caution: [
      "SSE 当前是轮询模式（每 2 秒），不是 WebSocket 双向通道。",
      "Session 状态只能由教师侧 Server Actions 变更，学生端只能追踪 presence。",
      "证据与干预记录都经过 DAL 校验，不是任意写入路径。",
      "形成性评价记录在 classroomEvidence 表中，kind 为 formative-evaluation。",
    ],
    relatedLinks: [
      { href: "/classroom", label: "课堂控制台", summary: "教师进入课堂、控制步骤、查看在线状态。" },
      { href: "/teacher/review", label: "教师回顾", summary: "查看课堂后的学生提交、反馈与跟进。" },
    ],
    sections: [
      {
        title: "这页适合什么时候读",
        paragraphs: [
          "当你需要理解课堂实时系统是如何工作的、Session 在各个阶段之间如何转换、或者 SSE 推送的具体机制时，直接看这页。",
          "本页聚焦 Classroom/Session 的核心 contract，不覆盖教师端 UI 组件的详细实现或课程编排的完整链路。",
        ],
      },
      {
        title: "Session 生命周期",
        stateLabel: "当前可用",
        paragraphs: [
          "Session 共有三种状态：`offline`（未启动）、`live`（进行中）和 `ended`（已结束）。状态转换只能由教师触发，学生只能被动加入已 live 的 session。",
          "启动路径：`launchClassroomSession()` 在一个事务中创建 session、插入所有学生为 participants、并写入第一条 `launched` 事件。第一个 activeStep 来自已发布课时的第一个步骤。",
          "结束路径：`endClassroomSession()` 将 session 状态更新为 `ended` 并写入 `ended` 事件，之后不能再进行步骤切换或模式变更。",
        ],
        bullets: [
          "`classroomSessions.status` 控制状态，不能从外部绕过 Server Action 直接写库。",
          "Session 有 `version` 字段用于乐观并发控制，每次状态变更都会递增。",
          "进行中的 Session 在浏览器刷新后可以继续，教师重启控制台会恢复最新 snapshot。",
        ],
      },
      {
        title: "locked / unlocked 两极模式",
        stateLabel: "当前可用",
        paragraphs: [
          "`locked = true` 时，教师控制当前步骤，学生端不允许自由切换步骤。教师通过 `changeClassroomStepAction()` 推进课堂，所有学生收到 SSE 推送后同步到同一步骤。",
          "`locked = false`（unlocked）时，学生可以自行在已发布步骤范围内导航，教师仍能看到每个学生的当前位置和在线状态，但不会推送步骤切换事件。",
          "模式切换通过 `changeClassroomModeAction()` 进行，会写入 `lock_mode_changed` 事件并递增 session version。",
        ],
        bullets: [
          "locked 模式适合新授课或全班同步活动。",
          "unlocked 模式适合自主探究或差异化练习环节。",
          "切换模式不需要教师切换页面，在同一个控制面板内即可完成。",
          "学生进入 session 时的初始 currentStepId 为 session.activeStepId，后续可自行更新（在 unlocked 时）。",
        ],
      },
      {
        title: "SSE 实时推送机制",
        stateLabel: "当前可用",
        paragraphs: [
          "SSE 端点为 `GET /api/classroom/[sessionId]/events`，运行在 Edge Runtime。它不是 WebSocket，而是基于 HTTP 的 Server-Sent Events，采用轮询 snapshot 的方式实现近实时同步。",
          "轮询间隔为 2 秒（`CLASSROOM_SSE_POLL_INTERVAL_MS = 2000`）。每次轮询请求 `/api/classroom/[sessionId]/snapshot`，比对 version 是否增加。若 version 增加则推送完整 ClassroomSnapshot；若 session 已 ended 则关闭流。",
          "客户端在建立 SSE 连接时携带 cookie 以便通过 Auth.js 校验身份。教师和学生的 SSE 端点返回相同的 snapshot 结构，但 UI 消费层面根据角色展示不同信息。",
        ],
        bullets: [
          "SSE 是单向通道，客户端不能通过 SSE 发送指令。",
          "所有状态变更（步骤切换、模式切换、Presence 更新）都通过 Server Actions 写入 DB，SSE 只是通知客户端拉取最新 snapshot。",
          "session ended 后 SSE 流自动关闭，客户端收到 ended 事件后跳转到 recap 页面。",
        ],
      },
      {
        title: "Presence 追踪",
        stateLabel: "当前可用",
        paragraphs: [
          "学生进入课堂后，通过 `touchClassroomPresenceAction()` 定期更新自己的在线状态和当前步骤。连接状态分为 `connected`、`reconnecting` 和 `offline` 三种。",
          "`updateClassroomParticipantConnection()` 会写入 `presence_changed` 类型的 timeline entry，用于记录学生进出课堂的时刻和当时所在的步骤。",
          "Presence 数据用于教师判断学生是否跟随课堂、是否需要关注掉线或落后的学生。`buildParticipantAttention()` 函数综合连接状态、步骤进度和提交情况，判断是否需要教师关注。",
        ],
        bullets: [
          "学生离开页面时不会立即标记为 offline，浏览器 beforeunload 事件触发最后的 presence 更新。",
          "教师端看到的 `needsAttention` 判断基于 connectionState + progressLabel + submissionCount 综合计算。",
          "Presence 数据不直接用于形成性评价，只作为辅助判断信号。",
        ],
      },
      {
        title: "课堂证据与干预记录",
        stateLabel: "当前可用",
        paragraphs: [
          "`recordClassroomEvidence()` 是证据记录的统一入口，支持多种 sourceType：`student-quick-response`（学生快速回应）、`student-submission`（任务/测验提交）、`teacher-observation`（教师课堂观察）。",
          "证据会同时写入 `classroomEvidence` 表和 `classroomTimeline` 表（entryType 为 `evidence_captured`）。这样既保留原始证据内容，又生成一条时间线记录供教师和学生查看。",
          "`recordClassroomIntervention()` 写入 `intervention_noted` 类型的 timeline entry，用于记录教师对全班或个别学生的干预措施（如调整进度、个别辅导提示等）。干预记录的 visibility 为 `teacher-only`。",
        ],
        bullets: [
          "证据写入前会校验 session 状态和参与者身份，学生不能为他人记录证据。",
          "evidenceType 用于区分证据的类别（如 observation / response / submission），不影响写入路径但影响后续查询和 UI 展示。",
          "干预记录 targetScope 可为 `student` 或 `class`，但不能对全班指定个别学生（防止误用）。",
        ],
      },
      {
        title: "学生形成性评价",
        stateLabel: "当前可用",
        paragraphs: [
          "`recordStudentFormativeEvaluation()` 写入 kind 为 `formative-evaluation` 的 classroomEvidence 记录，内容包含 `participationLevel`（积极参与 / 正常参与 / 需要关注 / 未评价）、`tags`（标签数组）和 `observationNote`（观察备注）。",
          "形成性评价只能由教师写入，写入前会通过 `getTeacherSessionScope()` 验证教师身份和学生是否在 session 中。",
          "查询端通过 `listStudentFormativeEvaluationEntries()` 或 `getClassroomStudentDetailDTO()` 中的 evaluationEntries 字段获取某个学生在某次课堂中的所有评价记录，按时间倒序排列。",
        ],
        bullets: [
          "latestParticipationLevel 出现在学生详情和 session recap 中，用于快速判断是否需要跟进。",
          "participationLevel 与 needsFollowUp 挂钩：若为 `attention` 或 evidence 存在但无 evaluation 时，needsFollowUp 为 true。",
          "当前 evaluationEntries 只从 classroomEvidence 表中读取，不涉及独立的 evaluation 表。",
        ],
      },
      {
        title: "使用边界",
        stateLabel: "使用边界",
        paragraphs: [
          "Classroom 系统是教师主导的实时同步课堂，不是开放的学生自主系统。所有状态变更路径都经过 Server Actions 与 DAL 校验，不能绕过。",
        ],
        bullets: [
          "SSE 是轮询模式，最小间隔 2 秒，不能做到毫秒级实时。",
          "学生不能主动切换 locked 模式下的步骤，只有教师可以。",
          "evidence 和 intervention 写入都有权限校验，不能跨 session 或跨学校记录。",
          "当前没有 classroom-to-classroom 通信或多课堂联动的 contract。",
        ],
      },
      {
        title: "后续扩展",
        stateLabel: "后续扩展",
        paragraphs: [
          "未来可能补充更细粒度的 attention 信号（如注视率、手动标记）、实时问答或投票功能、跨课堂联动的 session 管理，但这些当前仍属于后续扩展范畴。",
        ],
      },
    ],
  },
};
