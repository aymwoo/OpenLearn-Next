# Phase 48 Specification: Lifecycle & Uninstall Semantics

## 1. 交付目标与背景 (Overview)

在 **Phase 47** 完美闭环了插件数据的读写鉴权、级联缓存失效及物理审计事务后，**Phase 48** 聚焦于规范和实现插件生命周期（Lifecycle）管理和安全卸载（Uninstall）语义：
1. **一致的生命周期状态转换规则 (Consistent Lifecycle Transition Matrix)**：
   - 系统定义插件的五个核心生命周期状态（`installed`、`enabled`、`disabled`、`suspended`、`failed`），并通过严谨的状态迁移校验机进行状态流转约束，杜绝非法流转。
2. **物理事务级状态迁移落库 (Transactional Lifecycle Transitions)**：
   - 任何生命周期的状态变更必须通过物理事务原子提交，在更新 `pluginRegistrations` 表状态的同时，自动写入状态演进流水表 `pluginLifecycleTransitions`，并且在 `pluginActionAudits` 与 `governanceAudits` 中同步持久化审计线索。
3. **严苛的前置卸载依赖预检 (Uninstall Preflight Inspection)**：
   - 插件被卸载前，系统自动运行 preflight 流程，全面评估卸载带来的数据破坏范围。
   - 预检范围：判断是否仍被关联的课时、步骤、资源及独立业务数据表引用，并向操作员反馈受影响实体的列表及计数。
   - 强阻断规则：系统级默认插件（`sourceType === "default"`）被严格禁止卸载。
4. **强物理事务数据彻底清理 (Transactional Full Cleanup on Uninstall)**：
   - 一旦卸载流程被确认并触发，将在事务中物理清除该插件的所有注册信息，利用底层 schema 设计的 `onDelete: "cascade"` 外键约束，干净地物理级联级抹除该插件在 `pluginLessonExtensions`、`pluginLessonStepExtensions`、`pluginResourceExtensions` 及 `pluginOwnedBusinessData` 中的所有垃圾数据。
5. **统一的前端操作切面 (UI Hint)**：
   - 提供直观的生命周期动作控制及卸载确认（配合卸载预检提示），保证操作员知晓数据清理后果。

---

## 2. 需求 Traceability 与范围 (Requirements Coverage)

本阶段完全覆盖 v2.4 需求文档中的 4 项生命周期与卸载安全规约：
* **LIFE-01**：学校操作员可以清楚区分 install、enable、disable、suspend/kill switch 与 uninstall 五种生命周期语义。
* **LIFE-02**：停用或挂起插件会停止其运行时能力，但默认保留该插件已拥有的数据与历史记录。
* **LIFE-03**：卸载插件前，系统会给出 preflight 结果，明确是否仍被核心实体、已发布内容或历史记录依赖。
* **LIFE-04**：默认插件可以沿用同一生命周期模型被启用或停用，但不能被删除。

---

## 3. 核心方案与架构设计 (Architectural Principles)

### A. 状态流转矩阵模型 (Lifecycle State Machine Matrix)
在 `src/lib/dal/plugins.ts` 中维护合法的生命周期转换机制。允许的过渡路径如下：
- `installed` -> `enabled` | `disabled`
- `enabled` -> `disabled` | `suspended` | `failed`
- `disabled` -> `enabled` | `suspended`
- `suspended` -> `enabled` | `disabled` (只允许管理员手动解除挂起)
- `failed` -> `installed` (可执行重新安装或重新检测)

非允许的非法流转直接被 DAL 拦截并抛出 `LIFECYCLE_ILLEGAL_TRANSITION` 异常。

### B. 物理级联卸载与外键安全 (Cascading Database Uninstall)
我们在 Drizzle Schema 中定义的所有插件扩展及自有业务表均采用了 onDelete `cascade`：
```typescript
export const pluginLessonExtensions = sqliteTable("pluginLessonExtension", {
  // ...
  pluginId: text("pluginId").notNull().references(() => pluginRegistrations.id, { onDelete: "cascade" }),
});
```
因此在卸载（Uninstall）时，DAL 在事务中仅需删除 `pluginRegistrations` 主表记录，SQLite 会自动实现高效的扩展数据物理级联清理，完全避免出现脏关联数据。

### C. 默认插件卸载强拦截 (Block Uninstall for Default Plugins)
对于 `sourceType === "default"` 的默认插件，在 `preflightUninstallPlugin` 及 `uninstallPlugin` API 中执行强制断言：
```typescript
if (plugin.sourceType === "default") {
  throw new Error("UNINSTALL_BLOCKED_DEFAULT_PLUGIN");
}
```
保证内置核心样板插件不被误删。

---

## 4. UAT 验收标准 (User Acceptance Criteria)

| 编号 | UAT 测试场景 | 预期成功行为 |
|---|---|---|
| **UAT-48-01** | **非法生命周期状态流转强拦截** | 当尝试把处于 `installed` 状态的插件直接流转到 `suspended` 状态时，校验拦截器抛出 `LIFECYCLE_ILLEGAL_TRANSITION`。 |
| **UAT-48-02** | **状态流转双表持久化与物理事务** | 执行合法的生命周期切换后，数据库事务同步更新 `pluginRegistrations`、插入一条 `pluginLifecycleTransitions` 演进凭证，且 `pluginActionAudits` 有本次修改审计。 |
| **UAT-48-03** | **默认插件强制禁止卸载预检与操作** | 对内置的默认插件（如 steps built-ins）调用预检或卸载时，直接抛出 `UNINSTALL_BLOCKED_DEFAULT_PLUGIN`，杜绝核心默认插件被误删。 |
| **UAT-48-04** | **非默认插件卸载预检及级联物理清理** | 预检非默认插件时能正确查询出其所关联的 lesson/step/resource 扩展记录总计数。确认执行卸载后，主表注册被删，且对应的物理扩展表所有行被 cascade 物理清理。 |
| **UAT-48-05** | **一键 Close Gate 自动化回归** | 运行 `verify:phase48` 脚本，全自动化覆盖上述 lifecycle 及卸载断言，且先前所有阶段（44-47）零退化。 |

---

## 5. 完结验证与 Close Gate 规划

完结 Phase 48 时，需建立 `verify:phase48` 验证脚手架：
- 静态分析确认状态流转转换校验、默认插件阻断、生命周期审计及 Preflight 功能。
- 执行完整的 Vitest 覆盖，确认非法的 Lifecycle Transition 被正确抛出，卸载动作引发 cascade 清理，以及默认插件拦截成功。
- 链式触发 `verify:phase44` 至 `verify:phase47` 获得全盘通过。
