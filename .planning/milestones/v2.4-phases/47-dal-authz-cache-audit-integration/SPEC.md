# Phase 47 Specification: DAL, Auth, Cache & Audit Integration

## 1. 交付目标与背景 (Overview)

在 **Phase 45** 和 **Phase 46** 中，我们完成了插件的物理扩展表、独立业务数据表设计与安全迁移割接（DML-only / Naming 强治理）。
为了确保插件数据既安全隔离又高度受控，我们需要在 **Phase 47** 中将插件数据完整接入主系统的治理框架，对读写授权、防越权跨校读取、Next.js 16 显式缓存组件更新以及安全审计日志进行深度集成：
1. **DAL & Server Actions 唯一通道 (DAL Enforcement)**：
   - 严禁任何产品及运行时路径绕过 DAL 直接操作插件扩展表。
2. **多租户隔离与强角色鉴权 (Tenancy & Role Enforcement)**：
   - 强力校验当前 actor 的实际学校租户身份与目标实体的归属，从根本上防止通过篡改 `schoolId` 造成的跨校数据越权漏洞。
   - 插件写入时不仅要核查其在 manifest 中的自声明权限，还要强制核查 actor 的真实系统角色与操作能力。
3. **Next.js 16 显式缓存生命周期绑定 (Cache Invalidation & Revalidation)**：
   - 在 DML 写入（upsert/delete 等操作）后，必须使用 `"use cache"` 相关的 cache API 精准失效对应的缓存 tag。
   - 失效包含两个层级：一个是插件扩展数据的缓存 tag `plugin:ext:${schoolId}:${pluginId}:${entityId}`，另一个是被影响的系统核心实体缓存 tag `course:${courseId}` 或 `lesson:${lessonId}`，确保 UI 数据的一致性。
4. **统一治理与安全审计轨迹 (Audit & Governance Logging)**：
   - 将插件的每一次 install、reconcile、lifecycle transition 以及 DAL 层关键数据写入事件，完整落库记录于 `pluginActionAudit` 或 `governanceAudit` 中，为合规性与排障提供强力事实依据。

---

## 2. 需求 Traceability 与范围 (Requirements Coverage)

本阶段完全覆盖 v2.4 需求文档中的 5 项安全与 DAL 集成规约：
* **SAFE-01**：插件数据读写继续强制通过 DAL + Server Actions，而不是开放插件直连数据库。
* **SAFE-02**：插件数据写入在执行时同时校验插件声明权限与当前 actor 的真实能力，而不是只校验 manifest 自声明权限。
* **SAFE-03**：插件数据读写默认带学校范围约束，防止跨学校读取或写入污染。
* **SAFE-04**：插件数据 mutation 会同时失效插件自身 cache tag 与受影响核心实体的 cache tag。
* **SAFE-05**：插件安装、生命周期切换和关键数据写入会进入统一审计 / governance 轨迹。

---

## 3. 核心方案与架构设计 (Architectural Principles)

### A. 级联 Cache Tag 刷新架构 (Cascading Cache Revalidation)
当下 OpenLearn Next 广泛使用 Next.js 16 的 Cache Components 功能。
当插件调用 DAL 执行写入操作时，我们设计级联刷新机制：
```typescript
// 1. 刷新插件本身的扩展数据缓存
revalidateTag(`plugin:ext:${schoolId}:${pluginId}:${entityId}`);

// 2. 自动定位核心实体的父级关联并进行失效
if (entityType === "lesson") {
  const lesson = await getLessonById(entityId);
  revalidateTag(`lesson:${entityId}`);
  revalidateTag(`course:${lesson.courseId}`);
}
```

### B. 插件权限校验切面 (Authz Enforcement Layer)
在 `src/lib/dal/plugin-data.ts` 中新增权限校验，判断插件自身的自声明权限（manifest）和操作人的真实系统权限：
- 解析对应插件的安装声明记录 `manifestJson.permissions`。
- 如果插件尝试修改 core entity 扩展，但 manifest 并没有声明对应的 `lesson:write` 权限，直接拦截抛出 `PLUGIN_MANIFEST_PERMISSION_DENIED`。
- 如果操作人是非活动教师或不属于该学校，直接拦截抛出 `TEACHER_AUTH_REQUIRED`。

### C. 统一安全审计日志 (Unified Governance Audit Log)
任何对插件扩展和业务数据的 mutation，都会将事件原子写入主系统的 `pluginActionAudit` 或 `governanceAudit`：
- **`pluginActionAudit`**：记录由用户或插件触发的数据修改事件（例如，修改提醒时间、修改考试配置），包含操作人、插件 ID、实体、变更内容概括。
- **`governanceAudit`**：记录平台或系统在决定是否允许某项插件操作时的决策日志（例如，鉴权通过/不通过决策）。

---

## 4. UAT 验收标准 (User Acceptance Criteria)

| 编号 | UAT 测试场景 | 预期成功行为 |
|---|---|---|
| **UAT-47-01** | **跨学校读取与写入强拦截** | 当 actor 属于学校 A，但尝试读取或写入学校 B 的插件数据时，DAL 抛出 `SCHOOL_CROSS_BOUNDARY_FORBIDDEN`，彻底阻断越权。 |
| **UAT-47-02** | **插件自声明权限 (Manifest) 穿透拦截** | 模拟某插件未在 `manifestJson` 中声明对 `lessonStep` 的扩展写权限，但在 DAL 中尝试调用 `upsertPluginExtension`，系统校验拦截并抛出 `PLUGIN_MANIFEST_PERMISSION_DENIED`。 |
| **UAT-47-03** | **Next.js 级联 Cache 自动失效** | 执行物理扩展数据写入后，断言 `revalidateTag` 以精准的 key 被链式触发，包含插件 tag 和核心实体 tag，杜绝脏数据。 |
| **UAT-47-04** | **治理与安全审计痕迹追踪** | 成功写入插件数据或变更插件状态后，去 `pluginActionAudit` 和 `governanceAudit` 物理表能精准查询到这一行为的审计记录。 |
| **UAT-47-05** | **一键 Close Gate 自动化锁定** | 运行 `verify:phase47`，全自动化完成对本阶段全部安全、鉴权、缓存、审计及级联回归校验。 |

---

## 5. 完结验证与 Close Gate 规划

完结 Phase 47 时，需建立 `verify:phase47` 验证脚手架：
- 静态分析 `src/lib/dal/plugin-data.ts` 源码以断言没有直连 DB 的 bypass 路径，确认权限校验与 `revalidateTag` 级联调用真实存在。
- 运行完整 Vitest 集成测试，验证安全隔离与 Cache 刷新逻辑。
- 链式触发 `verify:phase44` 至 `verify:phase46`，确保零退化。
