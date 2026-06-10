# Phase 75: 第二个 External 插件 + Marketplace 泛化验证 — 研究

**日期:** 2026-06-10
**状态:** 研究完成

## 研究摘要

本阶段核心目标：构建 homework（作业）插件，把它推过 marketplace 完整生命周期（install → authoring → classroom runtime → semver upgrade → uninstall → 重装恢复），在过程中发现并修复 quiz-only 隐式假设，使 marketplace 从「被 quiz 验证过」升级为「多插件类型可重复使用」的通用基础设施。

## 1. 现有代码架构分析

### 1.1 Plugin 接入链路（关键路径）

```
插件 data-model.ts 声明
    ↓
compile-plugin-data-model.ts 编译
    ↓ 生成
    ├── src/db/schema/generated/plugin-owned/{pluginKey}.ts  (Drizzle schema)
    └── src/db/schema/generated/plugin-owned/data-access-allowlist.ts  (白名单)
    ↓ 运行时消费
    ├── allowlist.ts → getAccessEntry() → resolvePluginTable()
    ├── governance-gate.ts → 治理判定（lifecycle/kill-switch/school）
    └── plugin-data.ts → dispatchPluginDataAccess facade → 5 动词操作
```

### 1.2 关键文件清单

| 文件 | 角色 | homework 影响 |
|------|------|---------------|
| `src/plugins/quiz-sample/data-model.ts` | quiz dataModel 声明 | homework data-model.ts 的直接模板 |
| `scripts/compile-plugin-data-model.ts` | 编译脚本 | homework 需接入同一条编译链路 |
| `src/db/schema/generated/plugin-owned/data-access-allowlist.ts` | 自动生成的白名单 | 目前只有 `"quiz"` key |
| `src/features/platform-core/plugin-data-access/allowlist.ts` | 白名单消费层 | 零硬编码，按 pluginKey 动态查找 |
| `src/lib/dto/plugin-data-model.ts` | dataModel meta-schema | 无 quiz 硬编码，通用 schema |
| `src/lib/plugins/external-catalog.ts` | 外部插件目录 | 仅含 quiz 条目，需新增 homework |
| `src/lib/dal/plugins.ts` | 插件 DAL（install/upgrade/uninstall） | 通用逻辑，不需修改 |
| `src/components/authoring/lesson-step-editor.tsx` | 步骤编辑器 | 需新增 homework 步骤类型 |
| `src/components/learning/classroom-runtime-client.tsx` | 学生端渲染器 | 需新增 homework step card |
| `src/lib/dto/draft-guardrails.ts` | GuardrailStepType | 目前 `"content" \| "task" \| "quiz"` |

### 1.3 Quiz-Only 假设识别（泛化修复目标）

#### 1.3.1 编译链 — 白名单生成（低风险，自动解决）

- **`data-access-allowlist.ts`** 是自动生成的，目前只包含 `"quiz"` key。homework 接入编译链后自动追加 `"homework"` key，**非代码假设**。

#### 1.3.2 Allowlist 别名映射（需扩展）

- **`src/features/platform-core/plugin-data-access/allowlist.ts:83-85`**：
  ```ts
  const PLUGIN_DATA_ACCESS_ALIASES = {
    "builtin-teaching-step-quiz-sample": "quiz",
  } as const;
  ```
  若 homework 使用不同的 pluginId 前缀（如 `"builtin-teaching-step-homework"`），需在此添加别名映射。

#### 1.3.3 External Catalog 硬编码（需扩展）

- **`src/lib/plugins/external-catalog.ts`**：`EXTERNAL_MARKETPLACE_CATALOG` 数组目前只有 quiz 条目。需新增 homework 条目（含 manifest + dataModel）。

#### 1.3.4 Step Type 系统（最大泛化挑战）

- **`GuardrailStepType`** (`src/lib/dto/draft-guardrails.ts:34`)：目前 `"content" | "task" | "quiz"`。homework 可以使用现有 `"quiz"` type + 不同 `builtInKey`（如 `quizSample` 的做法），也可以引入新的 step type。**推荐复用现有 type 体系**（`"task"` 语义最接近 homework），避免 GuardrailStepType 扩展的连锁影响。

- **`lesson-step-editor.tsx`**：`isQuizSampleStep()` 通过 `builtInKey === "quizSample"` 区分。homework 应采用相同模式：`type === "task"` + `builtInKey === "homework"`。

- **`classroom-runtime-client.tsx`**：`CurrentStepRenderer` 按 `step.type` 分发渲染。homework 需新增条件分支。

#### 1.3.5 DTO / Schema 层（通用性良好）

- **`PluginDataModelSchema`** 是通用 meta-schema：`{ pluginKey, tables }`，无 quiz 硬编码。
- **`COLUMN_TYPES`** 白名单：`text | integer | boolean | timestamp | enum`，homework 字段（标题、描述、分数、评语）均可表达。
- **`OWNED_TABLE_PREFIX`**：`"plugin_owned_"` 是通用约定，homework 三表名称自然符合。

#### 1.3.6 不构成泛化问题的 quiz 特有逻辑（保留）

- 5 题型枚举 (`single_choice | multi_choice | true_false | fill_blank | ordering`)
- `QuestionTypeSchema` 答题统计
- `submitQuizSampleAnswerAction` / `submitQuizAttemptAction`
- `QuizSampleStepCard` / `QuizStepCard` 组件

这些是 quiz 业务逻辑，与 marketplace 泛化无关。

## 2. 技术决策建议

### 2.1 homework 数据模型设计

**三表结构**（对标 quiz 双表）：

```ts
// plugins/homework/data-model.ts
export const homeworkDataModel = {
  pluginKey: "homework",
  tables: [
    {
      name: "plugin_owned_homework_assignments",
      columns: [
        { name: "classroomSession", type: "text", notNull: true },
        { name: "title", type: "text", notNull: true },
        { name: "description", type: "text", notNull: false },
        { name: "attachmentUrl", type: "text", notNull: false },
      ],
      indexes: [{ columns: ["classroomSession"] }],
    },
    {
      name: "plugin_owned_homework_submissions",
      columns: [
        { name: "classroomSession", type: "text", notNull: true },
        { name: "student", type: "text", notNull: true },
        { name: "assignment", type: "text", notNull: true },
        { name: "content", type: "text", notNull: true },
        { name: "attachmentUrl", type: "text", notNull: false },
      ],
      uniques: [{ columns: ["classroomSession", "student", "assignment"] }],
      indexes: [{ columns: ["classroomSession", "assignment"] }],
    },
    {
      name: "plugin_owned_homework_grades",
      columns: [
        { name: "classroomSession", type: "text", notNull: true },
        { name: "student", type: "text", notNull: true },
        { name: "submission", type: "text", notNull: true },
        { name: "score", type: "integer", notNull: false },
        { name: "comment", type: "text", notNull: false },
      ],
      uniques: [{ columns: ["classroomSession", "student", "submission"] }],
      indexes: [{ columns: ["classroomSession", "submission"] }],
    },
  ],
};
```

关键设计点：
- **assignments 无 uniques**：教师可对同一 classroom session 创建多个作业（不同 step），不需要去重
- **submissions 有 uniques** → append-only 注入：`attemptNo` + `isLatest`
- **grades 有 uniques** → append-only 注入：教师可多次修改分数/评语
- `schoolId` 不声明（编译器强制注入）
- `id`、`pluginId`、`createdAt`、`updatedAt` 不声明（编译器固定注入）

### 2.2 homework Step Type 策略

**推荐方案：复用 `"task"` step type + `builtInKey = "homework"`**

理由：
- 避免扩展 `GuardrailStepType`（减少连锁变更）
- `"task"` 语义（学生提交作业）与 homework 天然契合
- 与 `quizSample` 的 `"quiz"` type + `builtInKey` 区分模式一致
- 编辑器/播放器通过 `builtInKey` 区分 homework 特有 UI

### 2.3 泛化修复优先级

| 优先级 | 修复项 | 说明 |
|--------|--------|------|
| P0 | external-catalog.ts 添加 homework 条目 | install 的前置条件 |
| P0 | homework data-model.ts 创建 + 编译链接入 | 生成 Drizzle schema + allowlist |
| P1 | allowlist alias 映射扩展 | 若 homework pluginId 前缀不同于 quiz |
| P2 | lesson-step-editor.tsx 支持 homework 步骤 | authoring 阶段 |
| P2 | classroom-runtime-client.tsx 支持 homework 渲染 | runtime 阶段 |
| P3 | GuardrailStepType 扩展（如需新 type） | 仅当复用 task 不可行时 |

### 2.4 Marketplace 生命周期验证路径

homework 将按以下顺序通过 marketplace 全链路：

1. **Install**：`preflightExternalPluginInstall` → 编译 dataModel → 生成表 + allowlist → 安装记录写入
2. **Authoring**：教师创建 homework 步骤 → 发布 lesson
3. **Classroom Runtime**：学生在课堂中提交作业
4. **Semver Upgrade**：homework v1.0.0 → v1.1.0（含真实 schema change）
5. **Uninstall + 重装恢复**：retain 软禁用 → cleanup → 同 pluginKey 重装

### 2.5 跨插件回归策略

每次修改后执行：
```bash
pnpm vitest run src/plugins/quiz-sample/
pnpm vitest run src/plugins/homework/
```

关键里程碑检查点：
- install 通过后：quiz + homework 双绿
- classroom runtime 通过后：quiz + homework 双绿
- upgrade 通过后：quiz + homework 双绿（含迁移后数据完整性）

## 3. 风险与注意事项

1. **编译脚本兼容性**：`compile-plugin-data-model.ts` 已支持多插件，但需确认 barrel export 正确追加 homework 表到 `generated/index.ts`
2. **Drizzle migration 生成**：homework 新表需要生成 migration，走 migration-first 流程
3. **Auth 鉴权**：homework Server Actions 需通过 auth split 鉴权（教师/学生角色区分）
4. **Cache tags**：homework 写入后需调用 `updateTag()` 确保缓存一致性
5. **手表名长度**：`plugin_owned_homework_assignments` 等表名长度正常，在 SQLite 限制内
6. **Zod v4 + drizzle-zod 兼容性**：`validateInsertPayload` 使用的 `createInsertSchema` 在 homework 表上需验证一致行为

## 4. 研究结论

**可行性：高。** marketplace 基础设施的核心路径（allowlist 消费层、dataModel meta-schema、编译脚本、治理 gate）已经是 pluginKey 驱动的通用设计。泛化修复主要集中在外围：catalog 注册、step type 系统、UI 组件。homework 作为第二个非 quiz 插件类型，是验证 marketplace 通用性的理想候选——与 quiz 差异足够大（三表 vs 双表、人工批改 vs 自动判分），但复用完全相同的受治理数据访问路径。

## Validation Architecture

### Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | vitest |
| Config file | `vitest.config.ts`（项目根目录，`@` → `src/` 路径别名） |
| Quick run command | `pnpm vitest run src/plugins/homework/` |
| Full suite command | `pnpm test run`（全量 vitest 单次运行） |
| Cross-plugin regression | `pnpm vitest run src/plugins/quiz-sample/ && pnpm vitest run src/plugins/homework/` |
| Estimated quick runtime | ~5-10 秒（homework 插件单测） |
| Estimated full runtime | ~30-60 秒（全量 suite） |

### Sampling Rate

- **每个 task commit 后：** 运行 `pnpm vitest run src/plugins/homework/` + `pnpm vitest run src/plugins/quiz-sample/`
- **每个 plan wave 后：** 运行 `pnpm test run` 全量 suite
- **`/gsd:verify-work` 前：** 全量 suite 必须全绿（quiz + homework 双绿）
- **关键里程碑检查点：** install 通过后 / classroom runtime 通过后 / upgrade 通过后 → 运行跨插件回归命令
- **最大反馈延迟：** ~60 秒（全量 suite）

### Marketplace Lifecycle 验证矩阵

| 阶段 | 自动化验证 | 手动验证 |
|------|-----------|----------|
| Install | vitest: manifest 校验 + preflight + allowlist 注册 + Drizzle schema 生成 | — |
| Authoring | vitest: 步骤创建/编辑/保存 + LexoRank 排序 | 教师端 UI：步骤编辑器交互验证 |
| Classroom Runtime | vitest: 提交/读取 DAL 操作 + append-only 写入 | 学生端 UI：播放器中提交流程；教师端：classroom tab 批改交互 |
| Semver Upgrade | vitest: backfill → verify → cutover 三阶段 + 数据零丢失断言 | 迁移后手动确认 quiz homework 数据完整性 |
| Uninstall + 重装 | vitest: retain 软禁用 + cleanup token + 重装后功能正常 | — |

### Wave 0 测试桩需求

执行前需就位的测试基础设施：

- [ ] `src/plugins/homework/__tests__/` 目录 — homework 插件测试目录
- [ ] `src/plugins/homework/__tests__/data-model.test.ts` — dataModel 声明 + meta-schema 校验
- [ ] `src/plugins/homework/__tests__/dal-operations.test.ts` — 5 动词 DAL 操作（create/read/update/delete/list）
- [ ] `src/plugins/homework/__tests__/lifecycle.test.ts` — install → upgrade → uninstall 生命周期
- [ ] `src/plugins/homework/__tests__/cross-plugin-regression.test.ts` — quiz + homework 双绿回归
- [ ] 跨插件回归脚本：`pnpm verify:phase75`（alias: `pnpm vitest run src/plugins/quiz-sample/ && pnpm vitest run src/plugins/homework/`）

### 手动验证项

| 行为 | 原因 | 验证步骤 |
|------|------|----------|
| 教师 homework 步骤编辑器 | 富文本编辑器 + LexoRank 拖拽交互难以自动化 | 创建 lesson → 添加 homework 步骤 → 填写标题/描述 → 保存 → 拖拽排序 |
| 学生 homework 提交流程 | 播放器内 step card 渲染 + 多次提交交互 | 进入 classroom → 查看作业描述 → 输入答案 → 提交 → 重新提交 |
| 教师批改面板 | classroom tab 切换 + 学生列表 + 评分表单交互 | 打开 /classroom → 切换到 "作业提交" tab → 选择学生 → 打分 + 评语 → 保存 |
| Upgrade 迁移后数据完整性 | 真实数据迁移的完整性需人工确认 | upgrade v1.0.0 → v1.1.0 → 确认已有 assignments/submissions/grades 不丢失 |
| Uninstall 重装恢复 | 清理确认 token 交互 + 重装后功能回归 | uninstall → cleanup confirm → 同 pluginKey 重装 → 创建新作业验证功能正常 |

### 跨插件回归检查点

```
Timeline:
  Wave 1 (Install + Data Model)
    ├─ 检查点 A: homework install 通过 → quiz 全绿 ✓
    └─ 检查点 B: homework dataModel 编译生成 → quiz 全绿 ✓
  Wave 2 (Authoring + Runtime)
    ├─ 检查点 C: homework 步骤编辑器可用 → quiz + homework 双绿 ✓
    └─ 检查点 D: classroom runtime 提交可用 → quiz + homework 双绿 ✓
  Wave 3 (Upgrade + Uninstall)
    ├─ 检查点 E: upgrade 迁移完成 → quiz + homework 双绿（数据零丢失） ✓
    └─ 检查点 F: uninstall + 重装 → quiz + homework 双绿 ✓
```

## RESEARCH COMPLETE
