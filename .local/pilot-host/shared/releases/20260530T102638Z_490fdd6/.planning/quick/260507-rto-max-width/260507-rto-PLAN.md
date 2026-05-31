---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/surfaces/home-surface.tsx
  - src/components/home/home-login-card.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "首页在桌面端呈现左侧约三分之二、右侧约三分之一的主布局，而不是近似对半分。"
    - "首页左侧标题、说明和 featured image 不再被过窄的 max-width 压缩。"
    - "右侧登录卡仍保留现有登录交互，但宽度与外层栏位匹配，不再显得过窄。"
  artifacts:
    - path: "src/components/surfaces/home-surface.tsx"
      provides: "首页左右栏比例与主舞台宽度修正"
    - path: "src/components/home/home-login-card.tsx"
      provides: "登录卡宽度与内部排版约束修正"
  key_links:
    - from: "src/components/surfaces/home-surface.tsx"
      to: "src/components/home/home-login-card.tsx"
      via: "首页右栏容器嵌入"
      pattern: "HomeLoginCard"
---

<objective>
修正首页首屏左右栏比例与局部过窄的 max-width 约束，让页面更接近目标视觉：左侧内容区占三分之二，右侧登录区占三分之一。

Purpose: 用最小范围的布局调整解决当前首页“主区不够展开、局部组件过窄”的问题，同时保持现有 Stitch 风格和登录链路不变。
Output: 更新 `HomeSurface` 的双栏宽度分配与内容宽度限制，并同步修正 `HomeLoginCard` 的容器宽度表现。
</objective>

<context>
@.planning/STATE.md
@AGENTS.md
@src/components/surfaces/home-surface.tsx
@src/components/home/home-login-card.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: 调整首页主舞台为左 2/3、右 1/3 的桌面双栏比例</name>
  <files>src/components/surfaces/home-surface.tsx</files>
  <action>将首页首屏容器从当前偏平均的 `flex-1 + max-w-md` 组合，改成更明确的桌面端 2/3 : 1/3 分栏。优先在 `lg` 断点使用稳定的 basis / max-width 组合，让左侧 hero 区明显更宽、右侧登录区保持独立窄栏；移动端和中等屏幕继续保留纵向堆叠或自然收缩。同步移除或放宽左侧标题说明段落、featured image 容器上不必要的狭窄宽度上限，避免继续出现 `max-w-lg`、`max-w-md` 一类把主视觉压成窄列的问题；保持导航、文案层级、图片覆层和现有 Stitch 风格不变，不新增新的区块或抽象。</action>
  <verify>
    <automated>npx eslint src/components/surfaces/home-surface.tsx</automated>
  </verify>
  <done>桌面端首页形成清晰的左宽右窄布局，左侧主文案和图片区域宽度明显展开，且页面结构仍与当前首页首屏一致。</done>
</task>

<task type="auto">
  <name>Task 2: 放宽登录卡及其内部内容的过窄宽度限制</name>
  <files>src/components/home/home-login-card.tsx, src/components/surfaces/home-surface.tsx</files>
  <action>检查 `HomeLoginCard` 外层容器与卡片内部是否存在让表单显得过窄的宽度约束，并做最小修正：让卡片宽度服从右栏容器、在桌面端占满可用栏宽，不再被额外的 `max-width` 或不合理内边距压缩；保留 `useActionState(signInAction)`、role tab、remember-me、submit button 和现有表单结构，不改变认证语义，不引入视觉风格漂移。若宽度问题主要来自 `HomeSurface` 右栏包装层，则在该包装层一并收敛修复，避免组件内外出现重复宽度限制。</action>
  <verify>
    <automated>npx eslint src/components/home/home-login-card.tsx src/components/surfaces/home-surface.tsx && npm run typecheck</automated>
  </verify>
  <done>登录卡在右侧栏位内自然展开，输入框与按钮不再呈现过窄观感，且登录交互与类型检查保持通过。</done>
</task>

</tasks>

<verification>
- 首页桌面端左右栏呈现约 2/3 与 1/3 的稳定比例。
- 左侧说明文本与 featured image 不再被狭窄 max-width 压缩。
- 右侧登录卡仍可正常切换角色并提交，且 scoped eslint 与 typecheck 通过。
</verification>

<success_criteria>
访问首页时，主舞台布局明显变为左宽右窄，原本过窄的文案、图片和登录卡宽度限制已被修正，且改动范围仍限定在首页相关两个组件内。</success_criteria>

<output>
After completion, create `.planning/quick/260507-rto-max-width/260507-rto-SUMMARY.md`
</output>
