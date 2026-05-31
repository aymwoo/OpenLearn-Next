---
type: quick
slug: 260511-mdi-teacher-schedule-import
scope: /teacher/schedule/import
autonomous: true
files_modified:
  - src/features/schedule/import/index.ts
  - src/features/schedule/import/template.ts
  - src/features/schedule/import/template.test.ts
  - src/app/(teacher)/teacher/schedule/import/template/route.ts
  - src/app/(teacher)/teacher/schedule/import/template/route.test.ts
  - src/components/surfaces/schedule-import-review-surface.tsx
  - src/components/surfaces/schedule-import-review-surface.test.tsx
must_haves:
  truths:
    - 教师在 /teacher/schedule/import 可以直接下载可导入的课程表模板。
    - 模板列严格匹配当前导入 DTO 与审核/解析逻辑，不依赖手写猜测。
    - 下载的模板自带至少一行合法示例，能说明 weekday 数值和可选 roomLabel 的填写方式。
  artifacts:
    - path: src/features/schedule/import/template.ts
      provides: 导入模板列顺序、示例行与 CSV 文本生成能力
    - path: src/app/(teacher)/teacher/schedule/import/template/route.ts
      provides: /teacher/schedule/import/template 下载入口
    - path: src/components/surfaces/schedule-import-review-surface.tsx
      provides: 导入页模板下载入口
  key_links:
    - from: src/features/schedule/shared/dto/import.ts
      to: src/features/schedule/import/template.ts
      via: 复用现有导入字段 contract
    - from: src/app/(teacher)/teacher/schedule/import/template/route.ts
      to: src/features/schedule/import/template.ts
      via: GET 响应输出 CSV
    - from: src/components/surfaces/schedule-import-review-surface.tsx
      to: /teacher/schedule/import/template
      via: hero 区最小 CTA
---

<objective>
为 `/teacher/schedule/import` 增加“导入模板下载”能力，只覆盖模板列推导、下载 route 和最小 UI 接入。

Purpose: 让教师拿到与当前导入校验/解析逻辑完全一致的模板，减少首轮导入失败。
Output: 可下载 CSV 模板、模板生成测试、导入页入口回归测试。
</objective>

<context>
@.planning/STATE.md
@src/app/(teacher)/teacher/schedule/import/page.tsx
@src/components/surfaces/schedule-import-review-surface.tsx
@src/features/schedule/import/server.ts
@src/features/schedule/shared/dto/import.ts

<interfaces>
From `src/features/schedule/shared/dto/import.ts`:

```ts
export const ScheduleImportDraftRowInputSchema = z.object({
  sourceRowKey: z.string().min(1),
  termName: z.string().min(1),
  weekday: z.number().int().min(0).max(6),
  bellSlotLabel: z.string().min(1),
  className: z.string().min(1),
  courseTitle: z.string().min(1),
  teacherName: z.string().min(1),
  roomLabel: z.string().nullable().default(null),
});
```

From `src/features/schedule/import/server.ts`:

```ts
// draft 阶段依赖 className / courseTitle / teacherName / bellSlotLabel 做映射；
// weekday 必须是 0-6；roomLabel 可空。
```

约束：沿用 [Quick 260511-ewp] 的 `src/features/schedule/*` feature root 边界；不要把模板能力散落回旧 `src/lib/dal/*` 包装层，也不要扩散到 schedule 其它子域。
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: 依据现有导入 contract 生成模板列与示例内容</name>
  <files>src/features/schedule/import/template.ts, src/features/schedule/import/template.test.ts, src/features/schedule/import/index.ts</files>
  <behavior>
    - Test 1: 模板列顺序固定为 `sourceRowKey,termName,weekday,bellSlotLabel,className,courseTitle,teacherName,roomLabel`。
    - Test 2: 示例行满足当前 `ScheduleImportDraftRowInputSchema` 的必填/可选约束，weekday 使用数值示例而不是中文星期。
    - Test 3: CSV 文本输出包含表头、至少一行示例、中文内容可被 route 原样返回。
  </behavior>
  <action>新增 feature 级模板 helper，单一来源生成 `columns`、`sampleRows` 与 `buildScheduleImportTemplateCsv()`。模板列必须直接反映现有 DTO/解析逻辑：`weekday` 保持 0-6 数值语义，`roomLabel` 保持可空列；示例内容要选用当前审核 UI 能看懂的中文值（例如学期、班级、课程、教师、教室），但不要引入数据库查询、动态推断或 schedule 其它功能。通过 barrel export 暴露给 route 使用，避免在 UI 或 route 中重复手写列名。</action>
  <verify>
    <automated>pnpm vitest run src/features/schedule/import/template.test.ts</automated>
  </verify>
  <done>模板 contract 只有一个实现入口；任何字段变更都会先在模板测试中暴露。</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: 提供 /teacher/schedule/import/template 下载 route</name>
  <files>src/app/(teacher)/teacher/schedule/import/template/route.ts, src/app/(teacher)/teacher/schedule/import/template/route.test.ts</files>
  <behavior>
    - Test 1: GET 返回 200，body 为 Task 1 生成的 CSV 文本。
    - Test 2: 响应头包含 `text/csv; charset=utf-8` 与附件下载文件名。
    - Test 3: route 不直接拼接列名或示例值，只消费模板 helper 输出。
  </behavior>
  <action>新增最小 GET route，路径固定为 `/teacher/schedule/import/template`。route 只负责封装下载响应：返回 UTF-8 CSV、设置 `Content-Disposition` 文件名（例如 `teacher-schedule-import-template.csv`），并保持实现无状态、无 DB 读取、无额外权限分支。不要新增 xlsx 依赖，不要把模板生成为 Server Action；此 quick task 只交付最小可下载 CSV。</action>
  <verify>
    <automated>pnpm vitest run src/app/\(teacher\)/teacher/schedule/import/template/route.test.ts</automated>
  </verify>
  <done>访问模板 route 即可下载与现有导入字段一致的 CSV 文件。</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: 在导入审核页接入最小模板下载入口并补回归</name>
  <files>src/components/surfaces/schedule-import-review-surface.tsx, src/components/surfaces/schedule-import-review-surface.test.tsx</files>
  <behavior>
    - Test 1: `/teacher/schedule/import` hero 区出现“下载导入模板”入口，链接到 `/teacher/schedule/import/template`。
    - Test 2: 现有“审核通过并写入课表”CTA 的阻断逻辑保持不变。
    - Test 3: 新入口维持当前教师端 tonal card/hero 节奏，不新增独立 schedule 导航或其它功能块。
  </behavior>
  <action>在现有 `ScheduleImportReviewSurface` 顶部主动作区域增加一个次级下载入口，文案使用简体中文，布局继续复用当前 `teacherSurfaceRhythm` 与现有 Button/链接样式。只做最小接入：让教师在当前页面即可拿到模板，不调整导入审核主流程、不新增上传表单、不改 approve action。更新现有 RTL 测试，确保新增链接存在且原有禁用逻辑仍成立。</action>
  <verify>
    <automated>pnpm vitest run src/components/surfaces/schedule-import-review-surface.test.tsx src/app/\(teacher\)/teacher/schedule/import/template/route.test.ts src/features/schedule/import/template.test.ts</automated>
  </verify>
  <done>`/teacher/schedule/import` 页面可直接下载模板，且审核台现有行为无回归。</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| teacher browser → template route | 下载请求来自已登录教师页面，但本 quick task 不接收用户输入文件内容 |
| template helper → CSV response | 代码生成的中文示例文本进入可下载文件 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-mdi-01 | T | `template/route.ts` | mitigate | route 只消费本地 helper 常量，不接受 query/body 自定义列，避免响应内容被篡改 |
| T-quick-mdi-02 | I | `template.ts` sample rows | mitigate | 示例内容仅使用通用教学示例，不填入真实教师/班级敏感数据 |
| T-quick-mdi-03 | D | `/teacher/schedule/import` UI | accept | 新增仅为静态下载链接，无额外重计算或 DB 压力，风险低 |
</threat_model>

<verification>
1. 运行针对模板 helper、route、surface 的定向 Vitest。
2. 手动打开 `/teacher/schedule/import`，确认“下载导入模板”可触发 CSV 下载。
3. 打开 CSV，确认表头与示例行字段完整，`weekday` 为数值列。
</verification>

<success_criteria>
- `/teacher/schedule/import` 可见模板下载入口。
- 下载得到的 CSV 表头与 `ScheduleImportDraftRowInputSchema` 完全一致。
- 示例行可作为导入填写参考，不与现有审核/批准逻辑冲突。
- 本 quick task 不修改 schedule import 审核之外的页面、动作或子域。
</success_criteria>
