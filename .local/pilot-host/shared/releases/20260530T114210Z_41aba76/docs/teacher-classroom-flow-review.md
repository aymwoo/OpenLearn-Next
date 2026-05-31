# 教师上课流程回顾

## Phase 11 implemented state

- `src/components/authoring/lesson-step-editor.tsx` 已通过 `autosaveLessonStepAction` 和显式 `保存步骤` 动作持久化 content/task/quiz payload。
- `src/lib/dal/classroom.ts` 已提供 `ensureClassroomParticipant` 与 `updateClassroomParticipantConnection`，用于晚加入、重连和心跳更新。
- `src/actions/classroom-actions.ts` 已提供 `touchClassroomPresenceAction`，学生运行时会在 connected / reconnecting 流程中更新 presence。
- `src/lib/dal/learning.ts` 已实现 server-side locked runtime enforcement：学生端优先使用 `forcedStepId`，并在 DTO 中返回 `disabledStepIds` / `teacherRecommendedStepId`。
- `src/app/api/classroom/[sessionId]/events/route.ts` 继续使用 `no-store` SSE event-stream + polling snapshot；这是当前 `cacheComponents` 约束下可构建的实现。

### 明确不在 Phase 11 范围内

- production pub/sub realtime infrastructure
- full gradebook or session-scoped grading model
- advanced branching classroom flows
- fully interactive teacher-side live event stream UI beyond current snapshot/refresh model

> 下文“发现的问题/需要优先改进”保留为 Phase 11 之前的回顾背景，不再代表当前已修复项。

## 流程全景

```
创建课时(Editor) → 发布(Publish) → 启动课堂(Launch) → 实时授课(Control) → SSE广播 → 学生端接收 → 批改(Review)
```

---

## 一、课时编排（Editor）

### 页面入口

**`src/app/(teacher)/teacher/editor/page.tsx`** — Server Component，加载两项数据：
- `getTeacherAuthoringOverview()` — 教师所属学校的所有课程、班级、课时概览
- `getLessonEditorDTO(firstLesson.id)` — 首个课时的完整编辑器状态

### 组件树

```
LessonEditorSurface (server, src/components/surfaces/lesson-editor-surface.tsx)
├── 左侧栏：课程/班级信息、课时列表、步骤轨道
├── 主区域：课时标题、指标、LessonAuthoringWorkspace
│   └── LessonAuthoringWorkspace (client, src/components/authoring/)
│       ├── 步骤轨道：按 rank 排序的步骤列表
│       │   ├── 新增内容/任务/测验 按钮 → addLessonStepAction()
│       │   ├── 复制/归档/上移/下移 按钮
│       │   └── 移步使用 reorderLessonStepAction(beforeRank, afterRank)
│       └── LessonStepEditor (server, src/components/authoring/)
│           └── 根据 step.type 渲染不同表单：
│               ├── content：正文 textarea + 教师备注 textarea
│               ├── task：任务说明 textarea + 提交类型 input
│               └── quiz：题目 textarea + 选项 textarea + 解析 textarea
└── 右侧栏：设置面板 + AuthoringStatusPanel
    └── AuthoringStatusPanel (server, src/components/authoring/)
        ├── 自动保存状态（装饰性，非真实状态）
        ├── 发布就绪检查：标题 + 目标 + 至少 1 个未归档步骤
        └── <form action={publish}> → publishLessonAction({ lessonId, expectedRevision })
```

### DAL 层关键函数 (`src/lib/dal/lesson-authoring.ts`)

| 函数 | 行号 | 功能 |
|------|------|------|
| `assertActiveTeacher()` | 90-107 | 验证当前用户为活跃教师，返回 `{ userId, schoolIds[] }` |
| `createCourseForTeacher()` | 252-262 | 创建课程，状态 "draft" |
| `createLessonDraft()` | 264-281 | 创建课时，状态 "draft"，revision: 1 |
| `updateLessonDraft()` | 283-308 | 更新标题/目标，递增 revision，乐观并发（expectedRevision） |
| `addLessonStep()` | 339-359 | 创建步骤，计算 LexoRank，递增 lesson revision |
| `updateLessonStep()` | 361-377 | 更新步骤，递增 lesson revision |
| `reorderLessonStep()` | 409-432 | 使用 `createRankBetween`/`createRankAfter`/`createRankBefore` 计算新 rank |
| `duplicateLessonStep()` | 379-390 | 复制源步骤到其后 |
| `archiveLessonStep()` | 392-407 | 软删除（设置 archivedAt） |
| `publishLesson()` | 434-477 | 创建完整 JSON 快照到 `publishedLessonVersions`，更新 lesson 状态为 "published" |

### LexoRank 排序 (`src/lib/ranking/lexorank.ts`)

使用 62 字符字母表（`0-9A-Za-z`）实现标准 LexoRank：
- `createInitialRank()` — 字母表中间字符（首个元素）
- `createRankAfter(rank)` — 在给定 rank 后插入
- `createRankBetween(left, right)` — 在两个 rank 之间插入

**优势：** 拖拽重排只需更新移动步骤的 rank，无需级联更新其他行。

### 步骤负载类型 (`src/lib/dto/lesson-authoring.ts`)

| 类型 | Schema | 核心字段 |
|------|--------|---------|
| `content` | `contentStepPayloadSchema` | body, teacherNotes, materialRefs |
| `task` | `taskStepPayloadSchema` | prompt, submissionType (text/image/file/link), successCriteria, retryPolicy |
| `quiz` | `quizStepPayloadSchema` | question, options[], correctOptionIndex, explanation, retryPolicy, revealCorrectAnswer |

---

## 二、发布（Publish）

### publishLesson() — `dal/lesson-authoring.ts:434-477`

1. 检查 `expectedRevision` 冲突
2. 调用 `getLessonEditorDTO` 获取完整编辑器状态
3. 查询 `publishedLessonVersions` 的 `max(version)`，自动递增版本号
4. 构建 `snapshotJson`：课时 + 课程 + 步骤（排除已归档）+ 材料 + 发布时间戳
5. 插入 `publishedLessonVersions`
6. 更新 lesson：设置 `publishedVersionId`、`status: "published"`、递增 revision

**关键属性：** 已发布的快照是不可变的。对草稿的后续编辑不会影响已发布的内容，直到再次发布。

---

## 三、课堂启动（Launch）

### launchClassroomSession() — `dal/classroom.ts:169-243`

1. 验证课时已发布且 `publishedVersionId` 匹配
2. 验证班级通过 `courseClasses` 与课时课程关联
3. 获取班级的学生成员。如果为空 → 抛出 `CLASSROOM_EMPTY_ROSTER`
4. 加载已发布的快照，按 rank 排序步骤，取首步为 `activeStepId`
5. **在数据库事务中：**
   - 插入 `classroomSessions` 行：`{ lessonId, publishedVersionId, classId, teacherId, activeStepId, locked: false, status: "live", version: 1 }`
   - 为每个学生插入 `classroomParticipants` 行：`connectionState: "offline"`、`currentStepId: firstStep`
   - 插入 `classroomEvents` 行：`type: "launched"`、`version: 1`
6. 通过 `getClassroomSnapshotDTO()` 返回完整快照 DTO

---

## 四、实时授课控制（Control Panel）

### 组件：`src/components/classroom/classroom-control-panel.tsx` (262 行)

Client Component，接收 `initialSnapshot: ClassroomSnapshotDTO`。

| 操作 | 调用的 Server Action | DAL 函数 | 机制 |
|------|---------------------|---------|------|
| 切换步骤 | `changeClassroomStepAction` | `changeClassroomActiveStep()` | 更新 `activeStepId`，递增 version，插入 event |
| 锁定/解锁 | `changeClassroomModeAction` | `changeClassroomMode()` | 切换 `locked`，递增 version，插入 event |
| 结束课堂 | `endClassroomSessionAction` | `endClassroomSession()` | 设置 `status: "ended"`、`endedAt` |

**乐观并发控制：** 所有操作通过 `WHERE version = expectedVersion` 的 UPDATE 传递 `expectedVersion`，防止竞态条件。版本冲突时显示 `ClassroomConflictPanel`，带有"刷新课堂快照"按钮。

**面板布局：**
```
ClassroomControlPanel
├── Hero banner：课时标题、班级名称、版本、出勤率、模式、状态
├── 步骤轨道：可点击的步骤卡片 + "进入下一环节"按钮
├── 模式切换：锁定跟随 / 自由浏览
├── 结束课堂按钮（红色）
├── 工具按钮（纯装饰）：随机点名、快速测速、随堂小测、目标共享
└── ClassroomRosterPanel：学生连接状态、最后在线时间
```

---

## 五、SSE 实时广播

### 路由：`src/app/api/classroom/[sessionId]/events/route.ts` (83 行)

**基于轮询的 SSE 实现**（非真正推送）：

1. 创建 `ReadableStream`
2. 内部每 **2000ms** （`CLASSROOM_SSE_POLL_INTERVAL_MS`）fetch `/api/classroom/[sessionId]/snapshot`
3. 当 `snapshot.version > lastVersion` 时 → 发送 `snapshot` 事件及完整快照 JSON
4. 无版本变化 → 发送心跳注释（`: keepalive`）
5. 快照状态为 "ended" → 关闭流
6. Fetch 返回 401/403/404 → 关闭流
7. 流遵守 `AbortSignal` — 客户端断开停止轮询

### 快照端点：`src/app/api/classroom/[sessionId]/snapshot/route.ts` (35 行)

简单的 GET 端点，调用 `getClassroomSnapshotDTO()` 并返回 JSON。错误映射：
- `TEACHER_AUTH_REQUIRED` → 401
- `CLASSROOM_PARTICIPANT_REQUIRED` → 403
- `CLASSROOM_ENDED` → 404

---

## 六、学生端播放器（Player）

### 架构：Shell/Personal 双层分离

```
StudentPlayerPage (async server component)
└── PlayerSurface (server-rendered shell)
    ├── 课时标题/目标/步骤数（静态，可缓存数小时）
    └── Suspense fallback={PlayerPersonalFallback}
         └── PlayerPersonalLoader (async)
              └── ClassroomRuntimeClient (client component, 367 行)
                   ├── SSE EventSource → /api/classroom/[sessionId]/events
                   ├── Durable fetch → /api/classroom/[sessionId]/snapshot
                   ├── 锁定模式：forcedStepId = activeStepId，其他步骤 disabled
                   ├── 自由模式：teacherRecommendedStepId 显示"老师推荐"标记
                   ├── ContentStepCard → markStepProgressAction
                   ├── TaskStepCard → submitTaskAttemptAction
                   └── QuizStepCard → submitQuizAttemptAction
```

### 三种步骤交互

| 类型 | 组件 | 交互 |
|------|------|------|
| content | `ContentStepCard` | 阅读正文 → 点击"已完成阅读" → 更新 `lessonStepProgress` |
| task | `TaskStepCard` | 文本输入 → 提交 → append-only `taskSubmissions`（isLatest 模式） |
| quiz | `QuizStepCard` | 选择选项 → 提交 → 服务端判题 → `quizAttempts` + `outcomeJson` |

### SSE 连接流程 (`ClassroomRuntimeClient`)

1. 挂载时，检查 `personal.runtime.classroomSessionId` — 若存在，初始连接状态为 "reconnecting"
2. 创建 `EventSource` 连接到 `/api/classroom/${sessionId}/events`
3. 收到 `snapshot` 事件 → 解析 JSON → 验证 `ClassroomSnapshotDTOSchema` → 对 `/api/classroom/${sessionId}/snapshot` 做 durable fetch 获取权威状态
4. `applySnapshot()`：
   - 若 `locked`：`forcedStepId = snapshot.activeStepId`，锁定所有其他步骤
   - 若 unlocked：`teacherRecommendedStepId = snapshot.activeStepId`
5. 当前步骤优先级：forcedStepId > resumeStepId > firstStep
6. SSE 失败 → 状态变为 "snapshot_fallback" → 显示"重新连接课堂"按钮

---

## 七、教师批改（Review）

### 页面：`src/app/(teacher)/teacher/review/page.tsx`

接收查询参数：`lessonId`、`studentId`、`filter`

### `getTeacherLessonReviewDTO()` — `dal/learning.ts:768-798`

- 获取所有能访问课程的学生
- 构建每个学生的复习数据（进度、提交、测验尝试、反馈状态）
- 支持状态筛选："all"、"not_started"、"in_progress"、"completed"、"needs_feedback"

### `TeacherReviewSurface` (`src/components/learning/teacher-review-surface.tsx`, 272 行)

```
TeacherReviewSurface
├── 筛选按钮（全部/未开始/进行中/已完成/需要反馈）
├── 概览指标（各状态学生数）
├── 学生列表 → 点击进入 StudentDetail
│   ├── 进度分解（not_started/in_progress/completed/skipped 数量）
│   ├── 最新任务提交 + 测验尝试 + 反馈状态
│   ├── 尝试历史（任务 + 测验合并，按 attemptNo 排序）
│   └── FeedbackComposer（每项最新提交一个反馈）
└── FeedbackComposer (client, src/components/learning/)
    ├── textarea（最大 200 字符，实时字数统计）
    ├── 提交 → sendAttemptFeedbackAction
    └── 显示最新反馈或"教师还未留下反馈"
```

---

## 数据库核心表

### classroomSessions (schema.ts:383-415)

| 列名 | 类型 | 备注 |
|------|------|------|
| activeStepId | text FK → lessonSteps.id | 教师当前激活的步骤 |
| locked | integer (boolean) | 锁定模式（强制跟随）开关 |
| status | text enum: "live" / "ended" | |
| version | integer | 单调递增，用于 SSE 变更检测 |

### classroomParticipants (schema.ts:417-443)

| 列名 | 类型 | 备注 |
|------|------|------|
| studentId | text FK → users.id | |
| connectionState | text enum: "connected" / "reconnecting" / "offline" | 初始 "offline"，从不更新 |
| currentStepId | text FK → lessonSteps.id | |

### taskSubmissions (schema.ts:285-324) — Append-only

- 每个任务步骤每个学生多个 `attemptNo` 行
- `isLatest` 布尔值：事务中新行插入前清除旧 `isLatest`
- 部分唯一索引：`(publishedVersionId, stepId, studentId, isLatest)` WHERE `isLatest = 1`

### quizAttempts (schema.ts:326-356) — 相同的 Append-only 模式

- 额外存储 `outcomeJson`（isCorrect, correctOptionIndex, explanation）

---

## 发现的问题

### P0 — 阻断性

#### 1. 步骤编辑器 autosave 未实现
**`src/components/authoring/lesson-step-editor.tsx:33-83`**

所有输入框使用 `defaultValue`（非受控组件），没有 `onChange` 处理器，没有 `autosaveLessonStepAction` 调用。教师在编辑器中修改步骤内容**不会持久化到数据库**。只有轨道上的按钮（新增/复制/归档/排序）能触发保存。

### P1 — 功能缺失

#### 2. 学生连接状态永为 "offline"
**`dal/classroom.ts` 启动逻辑**

`connectionState` 在 `launchClassroomSession()` 时初始化为 "offline"，但整个代码库中**没有任何代码更新它**。无心跳端点，SSE 连接时无状态更新。教师端的 roster 面板永远显示所有学生为"未连接"。

#### 3. 教师控制台不使用 SSE
**`classroom-control-panel.tsx`**

教师端依赖手动操作后的 `router.refresh()` 获取最新数据。不监听 SSE 流。教师无法被动观察学生连接状态或实时课堂信号。"实时"控制本质上是请求-响应模式。

#### 4. 锁定模式无服务端强制
**`ClassroomRuntimeClient` vs 服务端路由**

`disabledStepIds` 仅在 UI 层生效（链接变为 `<div>`）。学生可通过直接访问 URL `/student/player?lessonId=X&stepId=Y` 完全绕过锁定。服务端 `getStudentPlayerPersonalDTO` 未校验请求的 `stepId` 是否在锁定状态下被禁用。

#### 5. 提交未关联课堂会话
**Schema：`taskSubmissions` / `quizAttempts`**

两个表都以 `publishedVersionId` 为作用域，没有 `sessionId` 列。无法区分课堂实时提交 vs. 自学提交。`getTeacherLessonReviewDTO` 聚合所有数据，无法按会话维度进行分析。

### P2 — 设计缺陷

#### 6. SSE 是轮询而非推送
**`events/route.ts`**

每 2 秒 fetch 快照端点。无服务端推送机制（无 Redis pub/sub、无 EventEmitter）。2 秒延迟在互动课堂中可能不够及时。

#### 7. 学生无法中途加入课堂
参与者由 `launchClassroomSession()` 一次性创建。课堂启动后，新加入班级的学生不会出现在 `classroomParticipants` 中。访问快照端点将得到 403。

#### 8. SSE 错误处理静默
**`events/route.ts:51-53`**

Fetch 错误无日志、无错误追踪。静默重试下一个 2 秒间隔。

### P3 — UI 占位

#### 9. 工具按钮为纯装饰
**`classroom-control-panel.tsx:217-221`**

"随机点名"、"快速测速"、"随堂小测"、"目标共享"四个按钮无 `onClick` handler。纯视觉占位。

#### 10. 多个页面使用硬编码数据

| 组件 | 行数 | 硬编码内容 |
|------|------|-----------|
| `TeacherDashboardSurface` | 341 | 所有指标、时间线、班级数据 |
| `StudentsManagementSurface` | 197 | 所有学生、统计、筛选、分页 |
| `AdminSurface` | 87 | 所有安全/AI/插件/主题文本 |
| `SettingsSurface` | 286 | 所有设置选项、开关、座位图 |
| `LessonEditorSurface` | 169 | "45 分钟"时长 |
| `AuthoringStatusPanel` | 53 | 保存状态文本 |

---

## 架构评价

### 设计亮点

- **Shell/Personal 双层分离 + Suspense**：课时结构（shell）可独立缓存，学生专属数据（personal）流式加载
- **LexoRank 无级联排序**：避免整数排序的 O(n) 更新问题
- **Append-only 提交 + isLatest**：保留完整尝试历史，维护简洁
- **发布快照不可变**：编辑不影响已发布版本
- **DAL 层严格鉴权**：`assertActiveTeacher`/`assertActiveStudent` 在每个 DAL 操作前校验
- **乐观并发控制**：classroom 操作使用 expectedVersion 防止竞态

### 需要优先改进

1. **步骤编辑器 autosave** — 最关键的缺失功能
2. **学生心跳机制** — 让教师可见真实连接状态
3. **锁定模式服务端强制** — 安全漏洞
4. **提交关联 sessionId** — 区分课内/课外数据
5. **SSE 升级为真正推送** — 或至少添加学生连接事件
