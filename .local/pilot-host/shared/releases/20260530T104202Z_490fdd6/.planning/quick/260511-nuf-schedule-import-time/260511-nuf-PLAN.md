---
type: quick
slug: 260511-nuf-schedule-import-time
scope: /teacher/schedule/import
autonomous: true
files_modified:
  - src/features/schedule/shared/dto/import.ts
  - src/features/schedule/import/template.ts
  - src/features/schedule/import/template.test.ts
  - src/features/schedule/import/actions.ts
  - src/features/schedule/import/index.ts
  - src/app/(teacher)/teacher/schedule/import/template/route.test.ts
  - src/features/schedule/import/server.ts
  - src/features/schedule/import/server.test.ts
must_haves:
  truths:
    - 新增 `bellSlotStartTime`（选填，HH:mm 格式）和 `bellSlotEndTime`（选填，HH:mm 格式）两个导入字段
    - 当导入行提供了时间时，`ensureBellSlot` 直接使用；未提供时保持现有自动计算逻辑
    - 模板新增两列：`上课开始时间` 与 `上课结束时间`，示例值为 `08:00` / `08:45`
    - 中文字段映射表同步新增两项
  artifacts:
    - path: src/features/schedule/shared/dto/import.ts
      provides: `bellSlotStartTime` 和 `bellSlotEndTime` 两个可选字段
    - path: src/features/schedule/import/template.ts
      provides: 新增中文列名、常量映射与示例行
    - path: src/features/schedule/import/server.ts
      provides: `ensureBellSlot` 使用导入行时间的能力
  key_links:
    - from: src/features/schedule/shared/dto/import.ts
      to: src/features/schedule/import/template.ts
      via: 模板列与 DTO 英文字段对齐
    - from: src/features/schedule/import/server.ts
      to: src/db/schema.ts
      via: scheduleBellSlot.startsAt/endsAt 写入
---

<objective>
在课程表导入模板中增加上课时间字段（`bellSlotStartTime` 和 `bellSlotEndTime`，均为选填），并修改导入 server 逻辑，在提供时间时直接使用，未提供时保持现有自动计算。

Purpose: 让教师在导入时直接指定上课时间，减少课后手动调整 bell slot 的操作。
Output: 新增时间字段的 DTO、模板、映射表、server 写入逻辑与全套回归测试。
</objective>

<context>
@src/features/schedule/shared/dto/import.ts
@src/features/schedule/import/template.ts
@src/features/schedule/import/server.ts
@src/features/schedule/import/actions.ts
@src/db/schema.ts (scheduleBellSlot: startsAt, endsAt)

当前 `ensureBellSlot` 在找不到 slot 时自动计算：`startsAt = "0${sortOrder}:00"`, `endsAt = "0${sortOrder}:45"`，只依赖 `bellSlotLabel`。
新增需求：当导入行包含 `bellSlotStartTime` / `bellSlotEndTime`（HH:mm 格式）时，直接使用；不提供时保持现有自动逻辑。
约束：字段为选填（可空）；`ScheduleImportDraftRowInputSchema` 新增字段但不影响现有必填字段。
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: 在 DTO 中新增时间字段</name>
  <files>src/features/schedule/shared/dto/import.ts, src/features/schedule/import/template.ts, src/features/schedule/import/template.test.ts, src/features/schedule/import/index.ts</files>
  <behavior>
    - Test 1: `ScheduleImportDraftRowInputSchema` 新增 `bellSlotStartTime` 和 `bellSlotEndTime` 为可选字符串
    - Test 2: 模板 CSV 表头新增两列：`上课开始时间,上课结束时间`，位于 `节次标签` 之后
    - Test 3: 示例行包含 `08:00` / `08:45`
    - Test 4: 中文映射表同步新增两项
  </behavior>
  <action>
    1. 在 `ScheduleImportDraftRowInputSchema` 中新增两个可选字段：`bellSlotStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).nullable().optional()` 与 `bellSlotEndTime` 同格式
    2. 在 template.ts 的 `scheduleImportTemplateColumns` 末尾添加两个字段（接在 bellSlotLabel 后）
    3. 在 `scheduleImportTemplateChineseHeaders` 末尾添加两列中文名
    4. 在 `SCHEDULE_IMPORT_COLUMN_MAP` 末尾添加映射
    5. 在 `scheduleImportTemplateSampleRows` 的示例行补充示例时间
    6. 更新 barrel export
  </action>
  <verify>
    <automated>pnpm vitest run src/features/schedule/import/template.test.ts</automated>
  </verify>
  <done>DTO 与模板生成器已支持时间字段。</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: 修改 server 写入逻辑使用导入时间</name>
  <files>src/features/schedule/import/server.ts, src/features/schedule/import/server.test.ts</files>
  <behavior>
    - Test 1: 当行数据包含 `bellSlotStartTime` 和 `bellSlotEndTime` 时，`ensureBellSlot` 直接使用这两个值
    - Test 2: 当行数据不包含时间时，保持现有自动计算逻辑（`startsAt = "07+N":00"`）
    - Test 3: 时间格式校验在 DTO 层完成（HH:mm 正则）
  </behavior>
  <action>
    修改 `ensureBellSlot` 函数签名，增加可选参数 `startTime?: string | null` 和 `endTime?: string | null`。当参数有值时直接使用，不再做自动计算；无值时保持现有 sortOrder-based 自动逻辑。
    调用处 `draftScheduleImport` 中，从每行 `row` 取 `bellSlotStartTime` / `bellSlotEndTime` 传入。
  </action>
  <verify>
    <automated>pnpm vitest run src/features/schedule/import/server.test.ts</automated>
  </verify>
  <done>导入 server 现在能使用教师提供的上课时间。</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: 更新 actions 层映射与 route 测试</name>
  <files>src/features/schedule/import/actions.ts, src/app/(teacher)/teacher/schedule/import/template/route.test.ts</files>
  <behavior>
    - Test 1: `transformChineseKeys` 映射表已包含新增中文字段映射
    - Test 2: route 测试断言覆盖新增两列的输出
  </behavior>
  <action>
    在 actions.ts 的 `transformChineseKeys` 调用的映射常量（`SCHEDULE_IMPORT_COLUMN_MAP`）已通过 barrel 导出更新，无需手动追加。
    更新 route.test.ts 的 mock 与断言，验证 CSV 输出包含新增两列。
  </action>
  <verify>
    <automated>pnpm vitest run src/features/schedule/import/</automated>
  </verify>
  <done>Actions 与 route 测试覆盖新增时间字段。</done>
</task>

</tasks>

<verification>
1. `pnpm vitest run src/features/schedule/import/template.test.ts`
2. `pnpm vitest run src/features/schedule/import/server.test.ts`
3. `pnpm vitest run src/features/schedule/import/`
4. `pnpm vitest run "src/app/(teacher)/teacher/schedule/import/template/route.test.ts"`
</verification>

<success_criteria>
- [x] `ScheduleImportDraftRowInputSchema` 新增 `bellSlotStartTime` 和 `bellSlotEndTime`
- [x] 模板 CSV 表头新增两列：上课开始时间、上课结束时间
- [x] `ensureBellSlot` 在提供时间时直接使用，否则自动计算
- [x] 所有相关测试通过
</success_criteria>