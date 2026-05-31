# Codebase Concerns

**Analysis Date:** 2026-05-24

## Security Considerations

### Auth.js Split Pattern Risk

**Area:** `src/lib/auth/`
**Risk:** `auth.config.ts` 是 edge-compatible 的纯配置层，但 `auth.ts` 包含 `DrizzleAdapter` 和完整数据库访问。Route handlers 和 Server Actions 只能导入 `auth.ts`，不能直接导入 `auth.config.ts` 以避免循环依赖或边界违规。

**Files:**
- `src/lib/auth/auth.config.ts` - 纯配置，无 DB 依赖
- `src/lib/auth/auth.ts` - 包含 DrizzleAdapter 的完整实例
- `src/proxy.ts` - 仅导入 `authConfig` 的边缘代理

**Mitigation:** 项目使用 split pattern 确保 proxy 层 DB-free。

---

### Governance Audit Authority

**Area:** Plugin lifecycle + permissions
**Risk:** 插件操作（enable/disable/suspend/resume/uninstall/kill_switch）通过 `invokePluginHostAction` 进行权限检查，denial reasons 包括：`not_allowlisted`, `capability_missing`, `permission_denied`, `lifecycle_blocked`, `school_mismatch`, `kill_switch`。

**Files:**
- `src/features/runtime-platform/host-actions/plugin-host.ts`
- `src/features/runtime-platform/contracts/permissions.ts`
- `src/features/platform-core/commands/producers/plugin-governance.ts`

**Current Mitigation:** 所有 governance actions 通过 `dispatchPluginGovernanceCommand` 记录到 `governanceAudits` 表。

---

### MCP Credential Management

**Area:** `src/lib/dal/mcp.ts`
**Risk:** `assertNoSecretMaterial()` 验证 credential refs 不包含敏感数据，但实际存储的是 reference strings 而非 secrets。

**Files:**
- `src/lib/dal/mcp.ts`
- `src/server/mcp/registry.ts`

**Recommendation:** 定期检查 `mcpCredentialRefs` 表确保无 secrets 泄漏。

---

### Kill Switch Per-School

**Area:** Plugin system
**Risk:** `killSwitchEnabled` 可以按学校禁用插件，这是全局级别的阻断机制。

**Files:**
- `src/features/runtime-platform/host-actions/plugin-host.ts:221-254`

**Impact:** 开启 kill switch 后，除 `read-lifecycle` 外的所有操作都会被拒绝。

---

## Performance Considerations

### Next.js 16 Explicit Caching

**Area:** `next.config.ts` + `src/lib/cache-policy.ts`
**Risk:** `cacheComponents: true` 启用组件级缓存。`routeCacheBoundaries` 定义了哪些区域是 static/dynamic 的边界。

**Files:**
- `next.config.ts:4` - `cacheComponents: true`
- `src/lib/cache-policy.ts` - 完整 cache tag 和 boundary 定义
- `src/app/(teacher)/route.ts`, `src/app/(student)/route.ts` 等

**Current Config:**
```typescript
// next.config.ts
cacheComponents: true,
reactStrictMode: false,  // 关闭严格模式以提高性能
```

**Key Cache Tags:**
- `teacher-courses:${actorId}`
- `course:${courseId}`
- `lesson:${lessonId}`, `steps:${lessonId}`
- `classroom:${sessionId}`
- `progress:${lessonId}:${userId}`
- `submission:${lessonId}:${userId}`

**Challenge:** 用户特定的动态数据（progress, submissions）必须在 `<Suspense>` 下流式传输，不能使用 `"use cache"`。

---

### Classroom SSE Polling

**Area:** `src/app/api/classroom/[sessionId]/events/route.ts`
**Risk:** 每 2 秒轮询一次 snapshot（`CLASSROOM_SSE_POLL_INTERVAL_MS = 2000`），在高并发教室场景下可能产生大量请求。

**Files:**
- `src/app/api/classroom/[sessionId]/events/route.ts:4`

**Pattern:**
1. 每 2 秒 fetch 一次 `/api/classroom/${sessionId}/snapshot`
2. 版本变化时发送 `event: snapshot`
3. 否则发送 `: keepalive`
4. `status === "ended"` 时关闭流

**Scaling Concern:** 每个活跃教室每秒 1 次 fetch，100 个教室 = 100 RPS。

---

### Transport Mode

**Area:** `systemTransportSettings` 表
**Risk:** 当前支持 `local_only` 和 `redis_fanout` 两种模式。`local_only` 模式下 SSE 轮询是唯一选择。

**Files:**
- `src/db/schema.ts:86-99` - systemTransportSettings 表定义
- `src/lib/dal/system-transport-settings.ts`

**Migration Path:** 启用 `redis_fanout` 模式后可用 pub/sub 替代轮询。

---

## Extensibility (Plugin System)

### Plugin Lifecycle State Machine

**Area:** `src/lib/dal/plugins.ts`
**Risk:** 插件状态机：`installed -> enabled -> mounted -> ready`（及反向：`suspended`, `disabled`, `failed`）。每个转换必须记录到 `pluginLifecycleTransitions` 表。

**Files:**
- `src/lib/dal/plugins.ts` - 完整的生命周期管理 DAL
- `src/features/runtime-platform/seams/plugin-lifecycle.ts`

**Key Constraint:** `PLUGIN_KEY_CONFLICT`, `PLUGIN_DB_NAMESPACE_CONFLICT`, `PLUGIN_DB_NAMESPACE_FROZEN` 错误码。

---

### MCP Server Integration

**Area:** `src/lib/dal/mcp.ts`
**Risk:** MCP servers 有自己的 credential management 和 capability allowlisting。capabilities 默认 disabled。

**Files:**
- `src/lib/dal/mcp.ts` - MCP server DAL
- `src/server/mcp/registry.ts`

**Pattern:**
```typescript
// 能力默认禁用
seeds = createMcpCapabilitySeed(server.id, schoolId);
for (const seed of seeds) {
  await db.insert(mcpCapabilities).values({ ... enabled: false });
}
```

---

### Plugin DB Namespace

**Area:** `src/lib/dal/plugins.ts:31-45`
**Risk:** `deriveDbNamespace()` 生成插件数据库命名空间，格式：`p_${normalized_key}`。

**Files:**
- `src/lib/dal/plugins.ts:31-45`

**Constraint:** 命名空间最长 48 字符，禁止 `.` 和 `-` 字符。

---

## Data Consistency

### Append-Only Pattern

**Area:** `taskSubmissions`, `quizAttempts`, `runtimeStepStates`, `runtimeStepSessions`
**Risk:** 这些表是 append-only 的，写操作必须在同一个事务中：
1. 将旧的 `isLatest` 标为 `false`
2. 插入新行 `isLatest: true`

**Files:**
- `src/lib/dal/learning.ts` - taskSubmissions + quizAttempts
- `src/features/runtime-platform/classroom/runtime-session.ts` - runtimeStepStates + runtimeStepSessions

**Pattern from `runtime-session.ts:399-408`:**
```typescript
// 先清除旧 isLatest
await tx.update(runtimeStepSessions)
  .set({ isLatest: false })
  .where(eq(runtimeStepSessions.sessionId, input.sessionId));
// 再插入新行
await tx.insert(runtimeStepSessions).values({
  ...,
  isLatest: true,
});
```

**Violation Risk:** 直接 UPDATE 而不遵循 append-only 会破坏历史追踪。

---

### Transaction Boundary

**Area:** DAL 层
**Risk:** 涉及多表的写操作必须使用事务（`db.transaction()`）。

**Files:**
- `src/lib/dal/classroom.ts` - 教室会话操作
- `src/lib/dal/learning.ts` - 学习记录操作

**Pattern:**
```typescript
await db.transaction(async (tx) => {
  await tx.update(...).where(...);
  await tx.insert(...).values(...);
});
```

---

### Classroom Session State

**Area:** `src/lib/dal/classroom.ts`
**Risk:** `runtimeStepStates` 和 `runtimeStepSessions` 的 append-only 模式必须在事务中执行。

**Files:**
- `src/features/runtime-platform/classroom/runtime-session.ts:193-449`

---

## Theme System

### Theme Token Registry

**Area:** `src/lib/theme-layout/route-surface-registry.ts`
**Risk:** 主题 tokens 存储在 `themeTokenRegistries` 表，按学校隔离。主题必须通过 `validationStatus: "valid"` 验证。

**Files:**
- `src/lib/dal/themes.ts` - 主题管理 DAL
- `src/lib/theme-layout/route-surface-registry.ts` - 路由表面注册表
- `src/db/schema.ts` - themeTokenRegistries 表

**Key Types:**
- `ThemeTokenRegistry` - token JSON 结构
- `ThemeLayoutRuntime` - 布局运行时配置
- `ThemeResolvedRuntimeDTO` - 解析后的主题 DTO

---

### Theme Route Surface Resolution

**Area:** `src/lib/theme-layout/route-surface-registry.ts:352-454`
**Risk:** `resolveTeacherThemeRouteSurface()` 使用硬编码的正则表达式路径匹配，没有集中的路径注册表。

**Files:**
- `src/lib/theme-layout/route-surface-registry.ts:352-454`

**Pattern:**
```typescript
if (/^\/teacher\/courses\/[^/]+\/lessons(?:\/.*)?$/.test(pathname)) {
  return "/teacher/courses/[courseId]/lessons";
}
```

**Fragility:** 新增路由需要手动添加匹配规则。

---

### SSR Theme Persistence

**Area:** `src/lib/theme-cookie.ts`
**Risk:** 主题通过 cookie 在 SSR 时持久化，但客户端 hydration 可能有短暂的闪烁。

**Files:**
- `src/lib/theme-cookie.ts`

---

## Known Fragile Areas

### Classroom SSE Error Handling

**Area:** `src/app/api/classroom/[sessionId]/events/route.ts:86-100`
**Risk:** `fetchSnapshot` 失败时仅记录 warning 并重试，不主动关闭流。

**Files:**
- `src/app/api/classroom/[sessionId]/events/route.ts`

**Pattern:**
```typescript
} catch {
  console.warn("[classroom-events] snapshot fetch failed; retrying on next poll");
}
```

**Fix Approach:** 可考虑增加连续失败计数，达到阈值后主动关闭流。

---

### LexoRank Step Ordering

**Area:** `src/lib/ranking/lexorank.ts`
**Risk:** Steps 使用 LexoRank 字符串而非整数位置。拖拽排序必须通过 `lexorank.ts` 处理。

**Files:**
- `src/lib/ranking/lexorank.ts`

**Constraint:** 禁止使用整数 position 列进行排序，会导致所有相关行的 cascade 更新。

---

### Shell Surface Resolver

**Area:** `src/lib/theme-layout/shell-surface-resolver.ts`
**Risk:** 表面解析器根据路由解析 shell 配置，硬编码的路径匹配可能遗漏边界情况。

**Files:**
- `src/lib/theme-layout/shell-surface-resolver.ts`
- `src/lib/theme-layout/shell-surface-resolver.test.ts`

---

## Scaling Limits

### Current Transport Mode

**Limit:** `local_only` 模式下所有 SSE 连接在单实例处理。`redis_fanout` 未启用。

**Files:**
- `src/db/schema.ts:86-99` - systemTransportSettings 表

**Scaling Path:** 切换到 `redis_fanout` 模式后可用 Redis pub/sub 分发事件。

---

### Classroom Session Participants

**Limit:** 每个教室的 SSE 广播可能包含多个参与者，未见participant上限控制。

**Files:**
- `src/app/api/classroom/[sessionId]/events/route.ts`

---

## Test Coverage Gaps

### Governance Audit Coverage

**Area:** Plugin lifecycle transitions
**What's not tested:** `pluginLifecycleTransitions` 表写入的完整性验证。

**Files:**
- `src/lib/dal/plugins.ts`

**Priority:** Medium

---

### Append-Only Pattern Enforcement

**Area:** DAL 层
**What's not tested:** 是否有 test 确保 append-only 表不接受直接 UPDATE。

**Files:**
- `src/lib/dal/learning.ts`
- `src/features/runtime-platform/classroom/runtime-session.ts`

**Risk:** 未来的 refactor 可能意外破坏 append-only 约束。

**Priority:** High

---

### MCP Capability Seeds

**Area:** `src/lib/dal/mcp.ts`
**What's not tested:** `createMcpCapabilitySeed` 的具体 seeds 内容和覆盖率。

**Files:**
- `src/server/mcp/registry.ts`

**Priority:** Low

---

*Concerns audit: 2026-05-24*