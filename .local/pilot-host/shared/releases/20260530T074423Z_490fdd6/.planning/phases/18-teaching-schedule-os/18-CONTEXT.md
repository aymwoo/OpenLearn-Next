# Phase 18: Teaching schedule OS - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段交付一个生产级教学课表系统，不是单纯“上传课表文件”。系统必须围绕
`Import Layer -> Normalized Schedule Model -> Runtime Daily Agenda Engine`
三层架构构建，并覆盖：课表导入、标准化课表模型、每日议程生成、运行时调课、
节假日/非教学日、提醒通知、AI 日程建议，以及插件安全扩展边界。

本阶段不允许 UI、AI 助手、插件或提醒系统直接读取或写入原始导入行数据；
也不允许 AI 直接执行课表变更。所有课表变更必须保留学校范围权限校验、审计、
人工确认和显式缓存失效。

</domain>

<decisions>
## Implementation Decisions

### 导入层与审核流
- **D-01:** 首发课表导入固定采用“审核台两阶段”流程：先进入 staging/import review，再由人工批准写入 normalized schedule model。
- **D-02:** 导入审核粒度固定为“按行审核”，每条课表记录都必须能展示校验结果、映射结果与冲突原因，而不是只给整文件结论。
- **D-03:** Import Layer 必须保留 source metadata、row-level validation、conflict/dedup 结果和审批状态，不能把原始导入直接暴露给运行时 agenda 或 UI 视图。

### Runtime daily agenda 主输出
- **D-04:** Runtime Daily Agenda Engine 首发以“教师个人日程”作为第一主视图，而不是先做学校运营总视图。
- **D-05:** 教师个人日程卡片首发最优先展示 `时间 / 班级 / 地点 / 状态`，确保教师先看懂今天什么时候给谁上课、在哪上、是否已变更。
- **D-06:** 与教案、课程内容、课时入口的联动可以存在，但不能压过运行时调度信息成为第一层主信息。

### 调课与 override 规则
- **D-07:** 首发调课能力以“单次覆盖（single-instance override）”为主，而不是整周批量替换。
- **D-08:** 单次覆盖首发必须支持：`代课`、`停课`、`换时间/教室`。
- **D-09:** 所有 override 必须保留原始 schedule lineage、明确生效日期和审计记录，不能把覆盖后的结果直接回写成新的基础 recurring schedule。

### 提醒与 AI 边界
- **D-10:** 首发 AI 日程助手只产出建议，不直接执行课表变更，也不直接生成自动落库的调课结果。
- **D-11:** AI 助手首发聚焦于：导入映射建议、冲突解释、调课建议；所有 schedule-affecting writes 仍需人工确认。
- **D-12:** 首发提醒系统优先覆盖 `开课前提醒` 与 `调课变更提醒`，不把家长/学生对外通知作为第一优先级。

### 沿用的既有约束
- **D-13:** 所有 schedule 相关读写继续严格走 `DAL + Server Actions`，复用现有 school-scoped Auth/RBAC + DTO 边界。
- **D-14:** 任何 schedule 变更都必须显式 cache invalidation，不能依赖隐式更新或仅靠客户端本地状态。
- **D-15:** 插件扩展继续沿用 allowlisted action / hook 模型，不新增任意脚本执行、直接 DB 访问或绕过核心 API 的能力。
- **D-16:** schedule 相关 UI 继续遵守 Stitch 项目 `5322129002350954765` 与 `DESIGN.md`：简体中文、Lexend、无 1px 分割线、tonal layering。

### the agent's Discretion
- normalized schedule schema 的具体表拆分方式、daily agenda DTO 形状、提醒触发时间窗口、AI 建议的 proposal payload 结构、以及 schedule surfaces 的具体布局，可以在不违背上述锁定决策的前提下由 researcher 和 planner 收敛。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and schedule scope
- `.planning/PROJECT.md` — 固定技术路线、DAL + Server Actions、缓存、安全与设计约束，以及当前项目上下文。
- `.planning/REQUIREMENTS.md` — `SCHEDULE-01` 到 `SCHEDULE-09` 的正式需求来源。
- `.planning/ROADMAP.md` — Phase 18 的目标、成功标准、6 个 plan 槽位，以及三层架构边界。
- `.planning/STATE.md` — 已锁定的 teacher/data/plugin/theme 决策，以及 Phase 18 的三层架构决策。

### Existing data, caching, and runtime patterns
- `src/db/schema.ts` — 现有 schools/classes/courses/lessons/classroom 等 schema 模式；Phase 18 需要在相同 SQLite + cascade 约束下扩展 schedule domain。
- `src/lib/cache-policy.ts` — 现有 cache tags 和 route cache boundary 约束，Phase 18 必须继续走显式缓存失效。
- `src/actions/lesson-authoring-actions.ts` — 现有 Server Action + `updateTag()` + teacher scope 的写路径基线。
- `src/lib/dal/course-authoring.ts` — 现有 teacher-owned / school-scoped DTO 聚合、DAL 分层与 read model 模式。
- `src/lib/dal/classroom.ts` — 现有 runtime session / snapshot / live classroom data contract，可借鉴“运行时状态与已发布静态模型分层”的思路。

### Extension and notification boundaries
- `src/server/plugins/registry.ts` — allowlisted plugin actions 与 proposal 模型基线，Phase 18 的 schedule hooks/actions 必须延续此安全边界。
- `src/server/mcp/registry.ts` — 现有 WeCom / DingTalk notification capability seeds，可作为 schedule reminder 的外部通知边界参考。
- `DESIGN.md` — schedule surfaces 的视觉约束来源。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/db/schema.ts`：已经提供 school/class/course/lesson/classroom 等基础表与 cascade 约束，适合把 schedule domain 建在现有 school-scoped 数据层之上，而不是新起平行存储。
- `src/lib/dal/course-authoring.ts`：已有 teacher-scoped DTO 聚合、缓存标签和细粒度 read model 模式，可复用到 teacher-facing daily agenda reads。
- `src/lib/dal/classroom.ts`：已有 runtime snapshot、session 和 live state 处理模式，可借鉴来实现“normalized model -> runtime materialized agenda”的边界。
- `src/actions/lesson-authoring-actions.ts`：现有 Server Actions 展示了 teacher scope 校验、结构化输入校验和写后 `updateTag()` 的标准写法。
- `src/server/plugins/registry.ts` / `src/server/mcp/registry.ts`：已有 plugin-safe proposal 与 notification capability 种子，可扩展为 schedule reminder / assistant suggestion 的安全出口。

### Established Patterns
- 当前系统所有高风险数据都通过 `DAL + Server Actions + DTO` 暴露，这意味着 Phase 18 不能把 import rows 或 normalized schedule records 直接塞给 UI。
- 现有缓存策略要求写后显式失效 tag，说明 schedule import、override、holiday、reminder 配置都必须挂接稳定 cache tags。
- 现有 classroom runtime 已把“发布静态快照”和“运行时状态”分开处理，说明 Phase 18 也应把 normalized recurring schedule 与 per-day runtime overrides 严格分层。
- 插件和 MCP 能力目前都走 allowlisted registry 和 proposal/result contract，说明 schedule assistant 与 reminder 扩展也应继续沿用同样的边界，而不是开放任意自动动作。

### Integration Points
- `src/db/schema.ts`：新增 import staging、normalized schedule、override、holiday、audit、reminder 等表群的直接集成点。
- `src/lib/dal/`：新增或拆分 schedule DAL，承接 import review、agenda reads、override mutations、holiday management。
- `src/actions/`：新增 schedule import/review/apply、override、holiday、reminder 配置等 Server Actions。
- `src/components/surfaces/` 与 `/teacher` route 组：新增 teacher-facing daily agenda、import review、override management surface。
- `src/server/plugins/registry.ts` 与 `src/server/mcp/registry.ts`：承接 schedule reminder 与 AI/插件扩展的 allowlisted action 边界。

</code_context>

<specifics>
## Specific Ideas

- 导入入口首发更像“审核台”而不是“一键导入向导”，因为学校课表真实场景里局部错误和冲突是常态。
- 教师首发主日程视图优先是“我今天什么时候给哪个班上课、有没有变化”，不是先做复杂的学校调度大盘。
- 调课首发应把 override 限定在单次覆盖，先把代课/停课/换时间或教室这些高价值动作做稳定。
- AI 日程助手首发更像“建议器”和“解释器”，不是代替运营人员直接改课表。

</specifics>

<deferred>
## Deferred Ideas

- 每日晨间摘要提醒 — 可以作为 reminder system 的后续增强，但不是首发最优先提醒类型。
- 家长/学生外发课表提醒 — 价值明确，但会显著扩大权限、通知对象与沟通边界，后续独立扩展更合适。
- 学校级总调度大盘作为第一主视图 — 后续可以增加，但 Phase 18 首发主 runtime 视图先服务教师个人日程。

</deferred>

---

*Phase: 18-teaching-schedule-os*
*Context gathered: 2026-05-11*
