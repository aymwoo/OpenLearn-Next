---
+type: quick
+slug: 260512-md-plugin-classroom-sync
+scope: /teacher/editor,/teacher/classroom,/student/player
+autonomous: true
+files_modified:
+  - .planning/quick/260512-md-plugin-classroom-sync/260512-md-plugin-classroom-sync-PLAN.md
+must_haves:
+  truths:
+    - markdown 文档必须作为现有 lesson step 体系内可发布、可预览、可进入课堂运行的教学内容扩展，而不是绕过课时流程独立挂一个页面。
+    - 渲染只开放受控能力：GitHub Flavored Markdown、Mermaid、RevealJS；不允许任意脚本执行。
+    - 教师广播到学生端时，必须复用现有 classroom session 的 activeStepId + locked 同步链路，学生端不能本地控制放映进度。
+    - 上传 markdown 文件、解析 frontmatter/文档内容、缓存失效、发布快照与学生 runtime 都必须走现有 DAL + Server Actions 边界。
+  artifacts:
+    - path: src/lib/dto/lesson-authoring.ts
+      provides: markdown step payload schema 与 lesson step contract 扩展
+    - path: src/lib/dal/lesson-authoring.ts
+      provides: markdown step 持久化、预览、发布快照校验
+    - path: src/components/authoring/lesson-authoring-workspace.tsx
+      provides: 教师在编排器中新增 markdown 内容插件步骤入口
+    - path: src/components/authoring/lesson-step-editor.tsx
+      provides: markdown 文件上传、文档源码编辑、渲染模式配置
+    - path: src/components/learning/classroom-runtime-client.tsx
+      provides: 学生端 markdown/reveal 放映同步与 locked 禁止本地操作
+    - path: src/components/classroom/classroom-control-panel.tsx
+      provides: 教师端 markdown/reveal 广播控制与课堂步进控制整合
+  key_links:
+    - from: src/lib/dto/lesson-authoring.ts
+      to: src/lib/dal/lesson-authoring.ts
+      via: markdown step payload parse / publish readiness / preview dto
+    - from: src/lib/dal/lesson-authoring.ts
+      to: src/lib/dal/classroom.ts
+      via: 已发布 markdown step 进入 published snapshot 并被 classroom runtime 读取
+    - from: src/lib/dal/classroom.ts
+      to: src/components/learning/classroom-runtime-client.tsx
+      via: classroom snapshot 中 activeStepId / locked / version 驱动学生端同步
+    - from: src/components/classroom/classroom-control-panel.tsx
+      to: src/actions/classroom-actions.ts
+      via: 教师广播控制沿用 change step / change mode server action
---

<objective>
新增一个 markdown 内容插件，用于添加到教学流程中，并遵循仓库现有插件规范与课堂同步边界。

Purpose: 让教师把 markdown 文档作为正式教学步骤插入课时流程，支持 Mermaid 与 RevealJS 播放，支持上传 markdown 文件，并在课堂广播时将学生端锁定到教师当前放映状态。
Output: quick task 边界、主要实现模块、需要补充的澄清点，以及后续实现所依据的最小文件落点。
</objective>

<context>
@src/lib/dto/lesson-authoring.ts
@src/lib/dal/lesson-authoring.ts
@src/components/authoring/lesson-authoring-workspace.tsx
@src/components/authoring/lesson-step-editor.tsx
@src/lib/dal/classroom.ts
@src/actions/classroom-actions.ts
@src/components/classroom/classroom-control-panel.tsx
@src/components/learning/classroom-runtime-client.tsx
@src/lib/dal/plugins.ts
@src/server/plugins/registry.ts

当前仓库现状：
- 学校级 plugin system 目前是 manifest + hook anchor + allowlisted proposal action，主要产出建议或模板，不直接承载学生运行时 widget。
- 教学流程运行、发布快照、学生端播放，全部围绕 lesson step payload -> published snapshot -> classroom session 这条链路。
- classroom locked/unlocked 已存在，activeStepId 会广播给学生端；但还没有“步骤内页码 / slide index”级别的同步状态。

结论：
- “markdown 内容插件”在实现上应当是一个遵循现有插件规范注册的 built-in teaching plugin，同时它真正落地为新的 lesson step payload / renderer 能力。
- 若只做学校插件 proposal，而不扩展 lesson step/runtime contract，则无法满足上传、发布、课堂广播、学生锁定同步这些要求。
</context>

<tasks>
<task type="auto" tdd="true">
  <name>Task 1: 扩展课时步骤 contract，纳入 markdown 播放能力</name>
  <files>src/lib/dto/lesson-authoring.ts, src/lib/dal/lesson-authoring.ts, src/lib/dal/learning.ts, src/lib/dal/classroom.ts</files>
  <behavior>
    - Test 1: lesson step payload schema 接受新的 markdown step 类型或 content 子类型，并校验 markdown 源、renderMode、reveal 配置、mermaid 开关等字段
    - Test 2: 发布快照与教师预览会保留 markdown 配置，学生 runtime 可读取
    - Test 3: 现有 content/task/quiz 兼容不回归
  </behavior>
  <action>最小扩展现有 lesson step schema；优先保持 step 主类型稳定，若能用 `content` 子模式承载则不要新开完全独立 runtime 体系。</action>
</task>

<task type="auto" tdd="true">
  <name>Task 2: 在插件规范内注册 markdown built-in 插件，并为教师编排器提供入口</name>
  <files>src/lib/dto/resource-ai.ts, src/server/plugins/registry.ts, src/lib/dal/plugins.ts, src/components/authoring/lesson-authoring-workspace.tsx</files>
  <behavior>
    - Test 1: markdown 插件以 built-in teaching plugin 形式出现，可在编排器资源库中插入模板步骤
    - Test 2: plugin availability 仍受现有 builtInSource / publish readiness 校验约束
  </behavior>
  <action>把 markdown 能力接到现有 built-in teaching template 链路，而不是新增一套脱离 manifest 的“特殊按钮”。</action>
</task>

<task type="auto" tdd="true">
  <name>Task 3: 教师编辑器支持 markdown 上传、源码编辑和 Mermaid / RevealJS 配置</name>
  <files>src/components/authoring/lesson-step-editor.tsx, src/actions/lesson-authoring-actions.ts, 相关测试文件</files>
  <behavior>
    - Test 1: 教师可粘贴或上传 `.md` 内容写入 step payload
    - Test 2: 可切换 markdown 渲染模式（document / reveal deck）和 Mermaid 支持开关
    - Test 3: 非法配置被 schema 拦截，保留现有 autosave 边界
  </behavior>
  <action>文件上传只做受控文本导入，不新增任意文件执行路径；frontmatter 只解析白名单字段。</action>
</task>

<task type="auto" tdd="true">
  <name>Task 4: 实现教师端与学生端 markdown 播放器，并把同步状态接入课堂广播</name>
  <files>src/components/classroom/classroom-control-panel.tsx, src/components/learning/classroom-runtime-client.tsx, src/actions/classroom-actions.ts, src/lib/dal/classroom.ts, 可能新增 markdown/reveal renderer 组件</files>
  <behavior>
    - Test 1: 普通 markdown 支持 Mermaid 渲染；RevealJS 模式支持 slide deck 渲染
    - Test 2: 教师在 live classroom 中切换 markdown deck 页码时，学生端跟随同步
    - Test 3: classroom locked 时学生端不能自行翻页、滚动控制或脱离当前教师广播状态
    - Test 4: classroom unlocked 时，学生仍可浏览当前已广播 markdown 步骤，但不应获得教师专属控制权
  </behavior>
  <action>在现有 `activeStepId + locked + version` 之外，为 markdown/reveal 增加最小可持久广播的“步骤内放映状态”字段，并继续走 classroom event / snapshot 链路。</action>
</task>

<task type="auto" tdd="true">
  <name>Task 5: 安全与渲染边界收口</name>
  <files>markdown renderer 相关新模块、DTO schema、测试</files>
  <behavior>
    - Test 1: 禁止 markdown 内嵌 script / raw html 执行
    - Test 2: Mermaid 与 RevealJS 初始化仅在受控 client 组件内发生
    - Test 3: 学生端不存在本地绕过 locked 的交互入口
  </behavior>
  <action>优先采用安全 markdown pipeline；对 raw HTML、任意 JS、远程动态执行保持关闭。</action>
</task>
</tasks>

<verification>
1. `pnpm vitest run src/lib/dto/lesson-authoring*.test* src/lib/dal/lesson-authoring.test.ts src/lib/dal/classroom.test.ts src/lib/dal/plugins.builtins.test.ts src/components/authoring/lesson-step-editor.test.tsx src/components/authoring/lesson-authoring-workspace.test.tsx`
2. 补充 markdown/reveal 播放器组件测试
3. 如引入依赖，再运行 `pnpm build`
</verification>

<open_questions>
1. RevealJS 同步粒度是否只需要同步 `slide index`，还是还要同步 fragment / vertical slides / autoplay 状态。
2. markdown 文件上传后的持久化形态是否接受“源码直接存 step payload”，还是必须落独立 material / asset 记录。
3. 学生端 unlocked 模式下，是否允许在当前 markdown 步骤内自由翻页，还是只允许回看教师已经播过的 slide。
4. Mermaid 图表是否需要导出图片 / 打印支持，当前需求里未明确。
</open_questions>

<success_criteria>
- [ ] markdown 能作为现有 lesson flow 中的正式教学步骤被新增、编辑、发布、预览、运行
- [ ] Mermaid 与 RevealJS 只通过受控渲染链路启用，无任意脚本执行
- [ ] 教师广播时学生端与教师放映控制同步，locked 下学生不能自行操作
- [ ] 方案遵循现有 built-in plugin、DAL、Server Actions、classroom broadcast 规范
</success_criteria>
