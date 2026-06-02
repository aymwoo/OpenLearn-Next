# Pitfalls Research

**Domain:** 在既有 SQLite-first / DAL-only / migration-centralized / governed-plugin 单体平台上新增「声明式插件自有数据模型 + Marketplace 生命周期 + 互动答题统计样板」
**Researched:** 2026-06-02
**Confidence:** HIGH（grounded in existing repo schema + PROJECT.md 约束；非纯训练数据推测）

> **给 roadmap 作者的阅读说明**：本里程碑不是从零造插件系统。冻结的 `v2.4` 已经在 `src/db/schema.ts` 落地了 `pluginRegistrations`（含 `dbNamespace` / `pluginKey` / `sourceType` / `installSource` / `lifecycleState` / `uninstalledAt` / `uninstallRetentionMode: retain|cleanup`）、固定外键扩展表（`plugin_ext_lesson` / `plugin_ext_lesson_step` / `plugin_ext_resource`）以及一个**通用 key + payloadJson 袋子** `plugin_owned_business_data`（`(schoolId, pluginId, key)` 唯一）。`v3.0` 已落地 Command Bus / governed action registry / plugin lifecycle governance / governance audit。下面的 pitfalls 全部是在**这套已存在的接缝**上继续做时最容易翻车的点。Phase 标签用主题命名，便于 roadmap 映射，不绑定 phase 编号。

---

## Critical Pitfalls

### Pitfall 1: 把「插件自有数据」继续塞进通用 `plugin_owned_business_data` JSON 袋子，再在上面做统计

**What goes wrong:**
互动答题的每条作答记录被写成 `plugin_owned_business_data` 里一行 `payloadJson`（或一个 key 下的大 JSON 数组）。做「每题正确率 / 选项分布 / 未作答人数」时，必须全表扫描 + 在应用层 `JSON.parse` 聚合，无法用 SQL `GROUP BY` / 索引。40 人 × 多题 × 多课堂下读取路径退化为 O(全校插件数据) 扫描，且无法保证「一人一题最新作答」唯一性。

**Why it happens:**
通用袋子表「现成、不用写迁移」，看起来满足「插件自有数据」需求，于是样板插件直接复用它，省掉为答题设计真正的关系结构。

**How to avoid:**
- 区分两类存储：**(1) 低频、形态自由的插件配置/扩展** 可用 `plugin_ext_*` / 袋子；**(2) 高频、要统计、要唯一约束的业务事实**（答题记录）必须有**声明式但结构化**的插件自有表：固定列（`pluginId`、`schoolId`、`classroomSessionId`、`questionRef`、`studentId`、`choice`、`isCorrect`、`attemptNo`、`isLatest`、`createdAt`），由主仓库迁移生成、带覆盖统计查询的复合索引。
- 答题记录沿用既有 `taskSubmissions` 的 **append-only + `isLatest`** 语义，而不是覆盖写 JSON。
- 统计列（正确率、选项分布）必须能由 `GROUP BY` 直接算，不依赖应用层解析 JSON。

**Warning signs:**
统计 DAL 里出现 `rows.map(r => JSON.parse(r.payloadJson))`、`.filter()` 聚合；答题写入用 `upsert` 覆盖同一行；统计页随课堂规模变慢。

**Phase to address:** Phase A（声明式插件数据 schema 契约）+ Phase D（答题样板数据模型）

---

### Pitfall 2: 插件数据隔离只靠 `pluginId`，漏掉 `schoolId` / 课堂维度，导致跨租户、跨课程数据泄漏

**What goes wrong:**
统计/读取 DAL 只 `where pluginId = ?`，没有同时 `schoolId` + `classroomSession`/`course` 约束。结果 A 校或 A 班的答题统计里混入 B 校/B 班数据；或一个 schoolId 安装的同一 pluginKey 读到了别校的 `plugin_owned_*` 行。已有唯一索引是 `(schoolId, pluginId, key)`，但**查询方如果不带 schoolId 就绕过了隔离意图**。

**Why it happens:**
插件维度（pluginId）被当成「足够细」的隔离键，开发者忘记 OpenLearn 的真相隔离一直是 **school + course/class 双层**；样板插件 demo 阶段只有一个 school，bug 不暴露。

**How to avoid:**
- 所有插件数据表强制 `schoolId notNull` + cascade（schema 已这么做，要守住），**且 DAL 每个读写都必须显式带 schoolId + 课堂/课程 scope**，由 DAL 层而非调用方注入。
- 把「插件数据访问」收口到专用 DAL（如 `lib/dal/plugin-data.ts`），统一从认证 session 推导 schoolId，禁止把 schoolId 当成可由插件/前端传入的自由参数。
- 统计读取必须 scope 到 `classroomSessionId`（或 publishedLessonVersion + class），而不是「该插件所有数据」。

**Warning signs:**
DAL 查询里 schoolId 来自请求体而非 session；测试只在单 school 跑；统计接口签名只接受 `pluginId` 不接受 classroom/course scope。

**Phase to address:** Phase A（schema 隔离不变量）+ Phase E（统计读取路径，必须带 scope）+ close gate 的隔离测试

---

### Pitfall 3: 声明式 schema → 迁移之间出现「动态 DDL / 动态 SQL」偷渡，突破 no-dynamic-table 红线

**What goes wrong:**
为了让插件「声明自己的表」很灵活，实现成：读取插件 manifest 的字段声明 → 运行时拼 `CREATE TABLE` / `ALTER TABLE` / 动态列。这直接违反 PROJECT.md 明令 Out of Scope 的「runtime manifest 驱动动态建表、动态执行 SQL migration、schema-per-plugin」，并打开 SQL 注入与不可审计 schema 漂移。

**Why it happens:**
「声明式数据模型」被错误理解为「插件运行时定义表结构」。真实约束是：声明式 = 插件**在源码内声明** schema，但**物理表与迁移由主仓库统一生成并 code review**，不是运行时生成。

**How to avoid:**
- 明确两段式：插件 schema 以 **代码内的 Drizzle 声明**（编译期）存在 → 走主仓库 `drizzle-kit generate` + 提交的 SQL 迁移 + code review。运行时**只有数据 CRUD，没有任何 DDL**。
- 在 manifest 里只允许声明「逻辑数据形态/版本号 + 映射到哪张已迁移的物理表」，绝不允许声明可直接转成 DDL 的列定义被运行时执行。
- 加一条 lint/test 守卫：仓库内禁止运行时 `CREATE TABLE` / `ALTER TABLE` / 字符串拼接 SQL（除迁移文件外）。

**Warning signs:**
代码里出现根据 manifest 拼接表名/列名的 SQL；出现 `db.run(sql.raw(...))` 带插件输入；新表不在迁移文件而是运行时出现。

**Phase to address:** Phase A（确立「声明在代码、迁移在主仓库、运行时只 CRUD」契约）+ close gate 静态扫描

---

### Pitfall 4: 升级时把声明式 schema 变更做成有损/不可逆迁移，丢失已有答题数据

**What goes wrong:**
插件 v1→v2 改了数据形态。迁移直接 `DROP`/重建插件表，或改列类型导致 SQLite 走「重建表」路径时丢行；或 `payloadJson` 结构变了但旧行没回填，统计读到一半旧一半新数据，正确率算错。SQLite 对 `ALTER` 支持有限（不能改列类型/加约束），开发者容易用「建新表 + copy + drop 旧表」，一旦 copy 漏字段就静默丢数据。

**Why it happens:**
插件数据被当成「可丢的缓存」而非「学生真实学习证据」。升级在 demo 数据上测，没有「升级前有真实作答」的样本。

**How to avoid:**
- 插件数据迁移遵循 **expand → migrate → contract**（先加列/新表并双写或回填，验证后再删旧），禁止单步 destructive 迁移。
- 每个插件 schema 带显式 `dataVersion`，升级路径必须有**前向迁移 + 数据回填脚本 + 行数/校验和断言**（迁移前后行数对账）。
- close gate 必须包含「带真实答题数据做一次插件升级，断言统计结果与 0 行丢失」的可重复测试。
- 复用 `v3.1` 已建立的 backup/restore drill：升级前自动备份插件数据表。

**Warning signs:**
迁移文件里有 `DROP TABLE plugin_*` 不带数据迁移；升级测试只在空表上跑；没有 `dataVersion` 字段；没有升级前后行数对账。

**Phase to address:** Phase A（迁移安全契约 + dataVersion）+ Phase F（marketplace 升级生命周期）+ close gate 升级数据完整性测试

---

### Pitfall 5: 卸载时「保留 vs 清理」治理语义含糊，造成误删学生证据或留下幽灵数据

**What goes wrong:**
schema 已有 `uninstallRetentionMode: retain|cleanup` 和 `uninstalledAt`，但生命周期实现没把它当成**带审计的治理决策**：要么卸载直接 cascade 删掉所有答题记录（老师课后复盘数据没了，且不可逆）；要么标记卸载但数据永久滞留、重装同 pluginKey 时与旧数据串味（`dbNamespace`/`pluginKey` 复用导致脏读）。

**Why it happens:**
卸载被当成「删一行 registration」。但插件自有数据是真实教学证据，删除是高 blast-radius 治理动作，需要明确策略、确认与审计——这层常被省略。

**How to avoid:**
- 卸载分两阶段：**soft uninstall（停用 + 标记 `uninstalledAt` + 锁写）** 与 **数据处置（retain 归档 / cleanup 删除）**，二者都必须写 `governanceAudit`，带 actor、reason、retentionMode。
- `cleanup` 必须显式确认 + 影响面提示（将删除 N 条作答、影响 M 个课堂复盘），不能是默认静默行为；`retain` 必须保证数据被隔离/只读，重装时不被新安装隐式读到。
- 重装同 `pluginKey` 必须是**新 registration 身份**（或显式数据接管流程），避免靠 namespace 复用静默继承旧数据。
- cascade delete 约束（项目硬约束）要在「确实选择 cleanup」时才触发，不能因为卸载就无条件 cascade。

**Warning signs:**
卸载路径直接 `delete pluginRegistration`（靠 FK cascade 连带删数据）而没读 `uninstallRetentionMode`；retain 模式下数据仍可被新安装读到；卸载/清理没有 governance audit 行。

**Phase to address:** Phase F（marketplace 卸载 + 数据保留/清理治理）+ close gate 卸载治理审计测试

---

### Pitfall 6: 在 no-arbitrary-code 约束下为追求「灵活数据访问」而偷偷打开任意执行/注入面

**What goes wrong:**
为了让插件「灵活查询自有数据」，提供了一个看似声明式、实则图灵完备的查询接口：允许插件传入原始 SQL 片段、`where` 字符串、自定义聚合表达式、JSONPath/动态字段名，再由 host 拼接执行。等于在没有 `eval` 的字面下，重新打开了 SQL 注入 + 跨插件越权读取面。

**Why it happens:**
红线只写了「无 `eval`、无直连 DB」，团队以为「不直连 DB」就安全，但通过 host 转发任意查询字符串本质等价于直连。「灵活」需求压力下，受控 action 退化成「执行用户给的查询」。

**How to avoid:**
- 插件对数据的访问必须是**白名单化的具名 action / 参数化查询**（如 `recordAnswer(questionRef, choice)`、`getQuestionStats(classroomSessionId)`），参数全部 Zod 校验、强类型、绑定参数化，**绝不接受 SQL 片段 / 自由字段名 / 自由 where**。
- 所有插件数据访问经 Command Bus + governed action registry（`v3.0` 已有），带权限检查与审计，host 只暴露有限动词，不暴露「查询执行器」。
- 字段名/表名永远来自服务端常量映射，绝不来自插件输入。

**Warning signs:**
出现 `executeQuery(sql)` / `find(where: string)` 类插件 API；action payload 里有 `sql` / `filter` / `orderBy` 自由字符串；host 用模板字符串拼 SQL；权限校验放在插件侧而非 host 侧。

**Phase to address:** Phase B（受控插件数据访问 action 契约）+ Phase C（治理边界/权限）+ close gate 注入与越权测试

---

### Pitfall 7: 把 Marketplace 做成失控大工程，scope creep 到商店运营层 / 多插件类型 / 多 Agent

**What goes wrong:**
「Marketplace」一词诱导团队去做评分评论、付费计费、公开开发者门户、自动审核流水线、多种插件类型、AI Agent 扩张——而 PROJECT.md 明确把这些列为 Out of Scope，本轮只要 **受治理的 发布→安装→升级→卸载 核心闭环 + 一个答题样板**。结果里程碑无法收口，红线和数据正确性反而没守住。

**Why it happens:**
marketplace 是个天然「平台梦」放大器；加上历史上 `v2.4` 冻结过，团队有「这次一次做全」的冲动。`v3.0` 之后的 Agent/Skill/Capability 扩张诱惑也常被打包进来。

**How to avoid:**
- 把本里程碑成功定义钉死为**一个垂直切片**：单一「互动答题」样板插件，跑通 声明数据 → 安装 → 老师配置 → 学生作答 → 统计复盘 → 升级 → 卸载治理，全程不破红线。其余一律推迟。
- 复用既有 governed marketplace surface（已存在），不重建商店 UI/运营层。
- 每个 phase 必须挂靠真实答题课堂路径（延续 `v3.1` 的「样板优先、避免 infra-first 漂移」decision）。
- 任何「顺便支持第二种插件类型/多 Agent/计费/评论」提案直接打到 Out of Scope backlog。

**Warning signs:**
出现 ratings/reviews/billing/developer-portal/审核流水线 任务；同时追多个插件类型；phase 标题里出现「通用」「平台化」而非具体答题链路；任务无法挂到「老师配置→学生作答→统计」上。

**Phase to address:** Phase 0 / roadmap 定义阶段（scope 锁定）+ 每个 phase 的 success criteria 挂靠样板链路

---

### Pitfall 8: 统计读取 / 课堂写入路径绕过 DAL / Command Bus，形成第二真相源

**What goes wrong:**
为了「快」，答题写入直接走 WebSocket 消息落库、或统计页直接读 Redis/内存聚合、或插件 host 自己持有一份计数。结果出现两套数字：课堂实时面板与课后统计面对不上；Redis/WS 被无意中变成业务真相源，违反 PROJECT.md「SQLite + DAL 唯一 durable truth，Redis/WS/BullMQ 不成为真相源」。

**Why it happens:**
实时课堂场景天然诱导「在传输层就地统计」；统计与实时面板由不同人/不同 phase 实现，各自取数，缺少单一聚合源。

**How to avoid:**
- **唯一写路径**：学生作答 → Command Bus / Server Action → DAL → SQLite（append-only + `isLatest`）。WebSocket 只做投递/通知，不是落库权威；任何实时计数都从 SQLite 投影或由权威写后广播。
- **唯一读路径**：统计与课后复盘都从同一 DAL 聚合函数取数（同一 SQL 真相），实时面板与复盘共用同一聚合源，避免两套口径。
- 缓存遵循项目约束：写后 `updateTag` / 失效，统计读用显式 cache tag（如 `quizStats:${classroomSessionId}`），写入答题时失效。

**Warning signs:**
答题落库发生在 WS handler 里且不经 DAL；统计来自 Redis/内存而非 SQLite；实时面板和复盘页数字不一致；存在两个地方各自累加正确率。

**Phase to address:** Phase D（答题写入路径，单一 DAL 写真相）+ Phase E（统计读取，单一聚合源 + 缓存失效）

---

### Pitfall 9: `dbNamespace` / `pluginKey` 命名冲突与重装/升级时的身份漂移

**What goes wrong:**
schema 有 `(schoolId, pluginKey)` 和 `(schoolId, dbNamespace)` 唯一索引，但安装流程没在**安装时**校验冲突、或不同 school 间 namespace 复用却共享物理表（因为物理表是全局的，靠行级 `schoolId` 隔离）。两个插件声称同一 namespace / 同一逻辑表，统计与清理时互相串数据；卸载 A 误清 B。

**Why it happens:**
namespace 被当成「装饰性命名」，没被当成隔离主键的一部分参与所有读写与清理决策；物理表全局共享这点容易被忽视。

**How to avoid:**
- 安装审核（install governance）必须校验 `pluginKey` + `dbNamespace` 在 school 内唯一，冲突即拒绝并给出明确原因。
- 物理表全局共享时，**每一行**都靠 `(schoolId, pluginId)` 隔离；清理/统计/迁移所有路径都必须带这两个维度，namespace 只作为人类可读标识与冲突校验键，不作为隔离的唯一依据。
- 升级/重装保持稳定 `pluginId` 身份；新装产生新 `pluginId`，不靠 pluginKey 字符串相等隐式接管旧数据。

**Warning signs:**
安装时不校验 namespace 冲突；清理 SQL 只按 namespace 不按 pluginId；测试只覆盖单插件；不同 school 间数据出现串读。

**Phase to address:** Phase C（安装审核/治理边界，含命名冲突校验）+ Phase F（升级/重装身份稳定性）

---

### Pitfall 10: 默认/样板插件走特例后门，没真正复用插件数据治理模型

**What goes wrong:**
互动答题样板为了赶进度，直接读写 core 表或用 built-in 特权路径，而不是走「声明式插件自有表 + 受控 action + 治理生命周期」。结果插件架构「看起来成立」，但唯一的样板根本没验证这条路，红线/隔离/卸载治理全是空跑。这正是 PROJECT.md Key Decision 警告的：「默认插件必须复用正式插件数据治理模型，只有系统模块自己走通，插件架构才算真实成立。」

**Why it happens:**
样板由内部团队实现，天然有「我是自己人，可以走捷径」的特权倾向；core 表读写更熟更快。

**How to avoid:**
- 样板答题插件**必须**通过与第三方完全相同的路径：声明式数据表（主仓库迁移）、受控 action（Command Bus + governance）、生命周期（安装/升级/卸载）。
- close gate 显式断言：样板插件不直接 import core DB client、不写 core 表、所有数据访问经 governed action 审计可见。
- 把「样板即第一个真实第三方」当作验收口径，而不是「样板是内置特例」。

**Warning signs:**
样板代码 import `src/db` 直接读写；样板有不经 governance 的快捷写路径；样板数据进了 core 表而非插件自有表；审计里看不到样板的 action。

**Phase to address:** Phase D（样板必须走治理路径实现）+ close gate（无后门断言）

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| 答题记录塞进 `plugin_owned_business_data` JSON 袋子 | 不用写新迁移，立刻能存 | 统计无法用 SQL 聚合/索引，规模化退化，唯一性无保障 | **Never**（高频可统计业务事实必须结构化表） |
| 卸载直接靠 FK cascade 删数据 | 实现简单，一删干净 | 不可逆删除真实学习证据、无治理审计、违反 retain 语义 | **Never**（必须显式 retention 决策 + 审计） |
| 升级用 drop+recreate 插件表 | SQLite ALTER 限制下最省事 | 静默丢数据、统计错算、不可回滚 | 仅当表确认无真实数据且有备份（基本=never on prod） |
| 统计直接读 Redis/内存计数 | 实时快 | 第二真相源、与复盘对不上 | 仅作为 SQLite 投影上的非权威缓存，且可重建 |
| 样板插件走 core 表特例 | demo 快 | 插件架构未被真实验证，红线空跑 | **Never**（样板=第一个真实第三方） |
| host 提供通用查询接口给插件「灵活取数」 | 一个接口满足所有插件 | 等价 SQL 注入/越权面，破红线 | **Never**（只暴露白名单具名 action） |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Drizzle + SQLite 迁移 | 用 `drizzle-kit push` 改插件表/运行时 DDL | `generate` 出可 review 的 SQL 迁移，运行时只 CRUD，无 DDL |
| Command Bus / governed action registry（v3.0） | 插件数据访问绕过 bus 直接调 DAL/DB | 所有插件数据读写经 governed action，带权限+审计 |
| WebSocket classroom transport（v2.2） | 在 WS handler 里就地落库/统计 | WS 只投递；落库经 DAL，统计从 SQLite 投影 |
| `governanceAudit` / `pluginActionAudit` 表 | 卸载/清理/升级不写审计 | 每个生命周期治理动作写审计（actor/reason/decision/retentionMode） |
| Next.js 16 cache | 答题写入后不失效统计 tag | 写后 `updateTag('quizStats:${sessionId}')`；读用显式 tag |
| backup/restore drill（v3.1） | 升级/清理前不备份插件数据 | 复用既有 drill，在 destructive 生命周期动作前自动备份 |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| JSON 袋子上做答题聚合 | 统计页随课堂数变慢、CPU 高 | 结构化表 + `(classroomSessionId, questionRef)` 覆盖索引 + SQL `GROUP BY` | 40 人 × 多题 × 5 并发课堂即可显现 |
| 统计每次全量扫描插件全部数据 | 复盘页 P95 上升 | 查询 scope 到 classroomSession，复合索引，缓存 tag | 历史课堂累积后 |
| 缺 `isLatest` / 每次作答插入但聚合不去重 | 正确率分母被重复作答放大 | append-only + `isLatest` 标记 + 唯一索引 `(session, question, student)` 上 latest | 学生多次提交时立刻错 |
| 卸载 cleanup 在大表上同步 cascade 删 | 卸载请求超时/锁库 | 大批量清理走 async task（既有 BullMQ 平台）+ 分批 | 数据量大的 school |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| host 转发插件传入的 SQL/where/字段名 | SQL 注入、跨插件/跨校越权读取 | 仅白名单具名 action + 参数化 + Zod；字段名服务端常量映射 |
| schoolId 由插件/前端传入 | 跨租户数据读写 | schoolId 由认证 session 推导，DAL 注入，非自由参数 |
| 插件读写不带 classroom/course scope | 跨课程数据泄漏 | 统计/读取强制 scope，DAL 校验权限 |
| 安装不审核 manifest 权限/命名冲突 | 恶意/冲突插件落地 | 安装审核：Zod 校验 manifest、权限白名单、namespace 唯一 |
| 卸载/清理无审计、无确认 | 误删/不可追责删除学习证据 | 治理审计 + 影响面确认 + retention 显式决策 |
| 运行时动态建表/DDL | schema 漂移、不可审计、注入 | 声明在代码、迁移在主仓库 review、运行时无 DDL |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| 卸载时不提示数据影响面 | 老师误删全部作答与复盘 | 卸载前明确「将删除 N 条作答、影响 M 个课堂复盘」+ retain/cleanup 选择 |
| 统计「未作答人数」口径不清 | 分母含/不含未到课学生，老师误判 | 明确定义：作答/未作答相对「该课堂在册参与者」，UI 注明口径 |
| 实时面板与课后复盘数字不一致 | 老师不信任统计 | 同一 DAL 聚合源，单一口径 |
| 升级后旧课堂统计悄悄变样 | 老师对历史复盘失去信任 | 升级保持历史数据不变 + dataVersion 可追溯 |

## "Looks Done But Isn't" Checklist

- [ ] **声明式插件数据表:** 常漏「运行时无 DDL」证明 — 验证新表只来自提交的迁移文件，无运行时 `CREATE/ALTER`。
- [ ] **数据隔离:** 常漏跨校/跨课堂测试 — 验证有 ≥2 school、≥2 class 的隔离断言，无串读。
- [ ] **升级:** 常漏「带真实作答数据升级」 — 验证升级前后行数对账 + 统计一致 + 0 丢失。
- [ ] **卸载治理:** 常漏 retain/cleanup 两路径都有审计 — 验证 `governanceAudit` 两种 retentionMode 各有记录。
- [ ] **受控访问:** 常漏注入/越权用例 — 验证插件无法传 SQL/字段名、无法读他校他班数据。
- [ ] **样板无后门:** 常漏「样板不碰 core 表」断言 — 验证样板不 import core DB client、数据全在插件自有表。
- [ ] **单一真相源:** 常漏 WS/Redis 真相源检查 — 验证落库只经 DAL，统计只从 SQLite。
- [ ] **统计口径:** 常漏「未作答人数」分母定义 — 验证相对在册参与者且 UI 标注。

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| JSON 袋子已上线答题 | HIGH | 设计结构化表 → expand 迁移回填解析 JSON → 切读路径 → contract 删袋子用法 |
| 卸载 cascade 误删数据 | HIGH | 从 backup/restore drill 恢复；事后补 soft-uninstall + retention 流程 |
| 有损升级丢数据 | HIGH | 回滚到升级前备份；改用 expand→migrate→contract 重做 |
| host 通用查询接口已暴露 | MEDIUM | 下线接口 → 替换为白名单具名 action → 审计历史调用排查越权 |
| 第二真相源（WS/Redis 统计） | MEDIUM | 以 SQLite 聚合为唯一源重写统计 → WS/Redis 降为投影/通知 |
| 跨租户泄漏 | MEDIUM | 给所有插件 DAL 补 schoolId+scope 强约束 → 回归隔离测试 → 审计历史访问 |

## Pitfall-to-Phase Mapping

> Phase 标签为主题命名（v4.0 大致从 Phase 67 起），roadmap 作者可据此排序与编号。

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1 JSON 袋子做统计 | Phase A（声明式数据 schema）+ Phase D（答题模型） | 统计走 SQL `GROUP BY`、复合索引、规模化基准 |
| 2 隔离/跨租户泄漏 | Phase A（schema 不变量）+ Phase E（scope 读取） | 多 school/多 class 隔离测试无串读 |
| 3 动态 DDL 偷渡 | Phase A（声明/迁移/运行时三段契约） | 静态扫描：迁移外无 DDL/raw SQL |
| 4 有损升级丢数据 | Phase A（dataVersion+迁移安全）+ Phase F（升级生命周期） | 带真实数据升级，行数对账 0 丢失 |
| 5 卸载 retain/cleanup 治理 | Phase F（卸载治理） | 两种 retentionMode 各有 governance audit + 确认 |
| 6 灵活访问打开注入面 | Phase B（受控数据 action）+ Phase C（权限治理） | 注入/越权用例全部拒绝 |
| 7 marketplace scope creep | roadmap 定义阶段 + 各 phase success criteria | 无运营层任务；全部挂靠答题样板链路 |
| 8 第二真相源 | Phase D（写路径）+ Phase E（读路径） | 落库仅经 DAL；实时与复盘同一聚合源 |
| 9 namespace 冲突/身份漂移 | Phase C（安装审核）+ Phase F（升级身份） | 命名冲突被拒；清理仅按 pluginId+schoolId |
| 10 样板走后门 | Phase D（样板治理实现） | 断言样板不碰 core 表、动作可审计 |

**建议 phase 主题序（供 roadmap 参考）：**
- **Phase A** 声明式插件自有数据 schema + 迁移安全契约（dataVersion、隔离不变量、运行时无 DDL）— 最先，承载 1/2/3/4。
- **Phase B** 受控插件数据访问 action 契约（白名单具名动作，复用 Command Bus）— 承载 6/8 写半边。
- **Phase C** 安装审核与治理边界（manifest/权限/命名冲突）— 承载 6/9。
- **Phase D** 互动答题样板插件数据写入（治理路径、append-only+isLatest、无后门）— 承载 1/8/10。
- **Phase E** 基于插件数据的统计/复盘读取（单一聚合源、scope、缓存失效）— 承载 1/2/8。
- **Phase F** Marketplace 升级/卸载生命周期 + 数据保留/清理治理 — 承载 4/5/9。
- **close gate（verify:phase）**：迁移正确性、升级 0 丢失、隔离无串读、卸载治理审计、注入/越权拒绝、单一真相源、样板无后门，全部可重复跑通。

## Sources

- `.planning/PROJECT.md` — v4.0 milestone goal、Constraints、Out of Scope、Key Decisions（含「extension table + plugin-owned table 优先」「默认插件必须复用治理模型」「SQLite+DAL 唯一 durable truth」）。Confidence: HIGH。
- `src/db/schema.ts` L1241-1264, 1266-1351, 1811-1903 — 既有 `pluginRegistrations`（dbNamespace/lifecycleState/uninstallRetentionMode）、`pluginLifecycleTransitions`、`pluginActionAudits`、`governanceAudits`、`plugin_ext_*`、`plugin_owned_business_data`。Confidence: HIGH（一手代码）。
- `src/features/platform-core/*`、`src/features/runtime-platform/*` — 既有 Command Bus、governed action、plugin lifecycle/governance、WebSocket transport 接缝。Confidence: HIGH。
- `scripts/prepare-dev-db.ts` — 既有迁移/列存在性校验模式，佐证 migration-centralized posture。Confidence: HIGH。
- 项目历史决策（`v2.4` 冻结、`v3.0` 内核、`v3.1` 样板优先/避免 infra-first）— PROJECT.md Current State / Key Decisions。Confidence: HIGH。

---
*Pitfalls research for: 既有平台新增声明式插件数据 + marketplace 生命周期 + 答题统计样板*
*Researched: 2026-06-02*
