# 主题系统设计

## 架构总览

主题系统设计为**服务端 per-school 主题注册表**，分为三层：

```
ThemeTokenRegistry (JSON) → DAL (注册/查询) → CSS Variables → DOM
                              ↓
                       themeAuditLogs (审计追踪)
```

系统允许学校注册包含颜色、表面色、圆角半径和排版的自定义主题令牌。这些令牌被验证是否符合设计系统约束，编译为 CSS 自定义属性，并在运行时应用于 DOM。

---

## 文件清单

| 文件 | 职责 |
|------|------|
| `src/db/schema.ts:615-632` | 数据库表定义：`themeTokenRegistries`、`themeAuditLogs` |
| `src/lib/dto/resource-ai.ts:161-178` | Zod schema 和 TS 类型：`ThemeTokenRegistry`、`ThemeRegistryDTO` |
| `src/server/themes/tokens.ts` | 验证规则、CSS 变量编译、设计系统守卫 |
| `src/lib/dal/themes.ts` | 主题注册表和审计日志的数据库读写 |
| `src/lib/cache-policy.ts:18-19` | 缓存标签：`themeRegistry`、`theme(id)` |
| `src/app/globals.css` | 通过 Tailwind `@theme` 块定义的静态默认主题 |
| `src/app/layout.tsx` | 根布局（无主题注入） |

---

## 主题数据结构

### ThemeTokenRegistrySchema (resource-ai.ts:161-167)

```typescript
z.object({
  colors: z.record(z.string(), z.string()).optional(),
  // 示例：{ primary: "#005da7", on-primary: "#ffffff" }

  surfaces: z.record(z.string(), z.string()).optional(),
  // 示例：{ surface: "#f5f6f7", surface-container-low: "#eff1f2" }

  radius: z.record(z.string(), z.string()).optional(),
  // 示例：{ shell: "2rem" }

  typography: z.record(z.string(), z.string()).optional(),
  // 示例：{ fontFamily: "Lexend" }
})
```

所有四个顶层类别都是可选的。值是扁平的 `string → string` 映射。**不支持 light/dark 双模式** — 单个 `ThemeTokenRegistry` 仅代表一种配色方案。

### ThemeRegistryDTO (resource-ai.ts:169-178)

包装元数据：`id`、`schoolId`、`name`、`tokenJson`、`validationStatus`（"valid" / "invalid" / "pending"）、`createdAt`、`updatedAt`。

---

## 数据库 Schema

### themeTokenRegistries (schema.ts:615-623)

| 列名 | 类型 | 备注 |
|------|------|------|
| id | text PK (UUID) | 自动生成 |
| schoolId | text FK → schools.id | 级联删除 |
| name | text NOT NULL | 人类可读标签 |
| tokenJson | text (JSON 模式) NOT NULL | ThemeTokenRegistry 对象 |
| validationStatus | text enum: "valid" / "invalid" / "pending" | 默认 "pending" |
| createdAt | integer (timestamp_ms) | 自动生成 |
| updatedAt | integer (timestamp_ms) | 自动生成 |

**注意：** `(schoolId, name)` 没有唯一约束 — 学校可以注册重复名称的主题。

### themeAuditLogs (schema.ts:625-632)

| 列名 | 类型 | 备注 |
|------|------|------|
| id | text PK (UUID) | 自动生成 |
| themeId | text FK → themeTokenRegistries.id | 级联删除 |
| action | text NOT NULL | 例如 "register" |
| payloadJson | text (JSON 模式) NOT NULL | 快照 |
| actorId | text FK → users.id (nullable) | 操作者 |
| createdAt | integer (timestamp_ms) | 自动生成 |

---

## 验证系统

### 设计系统守卫 (tokens.ts:3-14)

```typescript
DESIGN_SYSTEM_GUARDS = {
  fontFamily: "Lexend",
  noLineSurfaces: true,          // 已声明但从未执行
  simplifiedChinese: true,       // 已声明但从未执行
  permittedSurfaceRoles: [
    "surface",
    "surface-container-low",
    "surface-container-lowest",
    "primary",
    "primary-container",
  ],
}
```

### validateThemeTokens() (tokens.ts:16-32)

- 如果存在 `typography.fontFamily` 且不是 `"Lexend"` → 返回 `false`
- 如果任何 surface 键不在 `permittedSurfaceRoles` 中 → 返回 `false`
- 否则 → 返回 `true`
- **colors 和 radius 完全不验证** — 任何键值对都被接受

### compileThemeTokensToCssVariables() (tokens.ts:34-62)

| Token 类别 | CSS 变量前缀 | 示例 |
|-----------|-------------|------|
| `colors.*` | `--color-` | `colors.primary` → `--color-primary` |
| `surfaces.*` | `--surface-` | `surfaces.surface` → `--surface-surface` |
| `radius.*` | `--radius-` | `radius.shell` → `--radius-shell` |
| `typography.*` | `--typography-` | `typography.fontFamily` → `--typography-fontFamily` |

**命名不匹配：** 编译器将 `surfaces.surface` 映射到 `--surface-surface`，但 `globals.css` 和 Tailwind 使用 `--color-surface-*`。`colors.primary` 映射到 `--color-primary`（匹配），但 surface 令牌将无法按预期工作。

---

## DAL 层 (dal/themes.ts)

三个函数，均标记为 `server-only`：

### registerThemeTokens(schoolId, name, tokenJson) — (行 9-25)

1. `ThemeTokenRegistrySchema.parse(tokenJson)` — Zod 解析
2. `validateThemeTokens(parsedTokens)` — 设计系统验证
3. 在 `themeTokenRegistries` 中插入行及计算出的 `validationStatus`
4. 写入审计日志条目（action: "register"）
5. 返回记录

### getThemeRegistryDTO(themeId) — (行 27-43)

按 ID 获取单个主题，返回 `ThemeRegistryDTO | null`。将 DB 时间戳字段转换为 Unix 毫秒数。

### recordThemeAudit(themeId, action, payloadJson, actorId?) — (行 45-54)

插入 `themeAuditLogs`。仅供内部调用（由 `registerThemeTokens` 使用）。

---

## 当前默认主题 (globals.css)

唯一生效的主题是 `globals.css` 中通过 Tailwind v4 `@theme` 块硬编码的静态默认值（行 3-26）：

```css
@theme {
  --color-surface: #f5f6f7;
  --color-surface-container-low: #eff1f2;
  --color-surface-container-lowest: #ffffff;
  --color-primary: #005da7;
  --color-primary-container: #68abff;
  --color-on-primary: #ffffff;
  --color-on-surface: #2c2f30;
  --color-on-surface-variant: #595c5d;
  --color-outline-variant: #abadae;
  --color-tertiary: #386700;
  --color-tertiary-container: #a4fd4c;
  --color-error: #b31b25;
  --shadow-ambient: 0 16px 48px rgba(44, 47, 48, 0.06);
  --radius-shell: 2rem;
  /* ... 间距令牌 ... */
}
```

组件的 `body` 选择器使用这些变量：
```css
body {
  background: var(--color-surface);
  color: var(--color-on-surface);
  font-family: var(--font-lexend), sans-serif;
}
```

整个应用中的组件引用这些令牌的 Tailwind 工具类（例如 `bg-surface`、`text-on-surface`、`shadow-ambient`）。

---

## 发现的问题

### 致命 — 功能缺失

| 问题 | 详情 |
|------|------|
| **`compileThemeTokensToCssVariables` 从未被调用** | 该函数在 `tokens.ts` 中定义，在 `themes.ts` 中导入，但调用次数为零 |
| **没有 `theme-actions.ts`** | actions 目录中没有主题文件；DAL 无法从客户端组件调用 |
| **没有 API 路由** | 没有 `/api/theme` 端点用于主题 CRUD 操作 |
| **没有主题选择 UI** | `/settings/labs` 有静态模拟数据；没有功能性主题选择器 |
| **没有运行时应用机制** | 无 cookie 持久化，无 `<style>` 注入，根布局中无 ThemeInjector |
| **没有"活动主题"概念** | 没有 cookie、localStorage 或用户偏好列来跟踪用户正在使用哪个主题 |

### 高 — 设计问题

| 问题 | 详情 |
|------|------|
| **CSS 变量命名不一致** | 编译器产生 `--surface-*`，但 `globals.css` 使用 `--color-surface-*` |
| **不支持 light/dark 变体** | `ThemeTokenRegistry` 是单个扁平映射；无法定义分离的浅色和深色令牌集 |
| **`noLineSurfaces` / `simplifiedChinese` 从未执行** | 在守卫中声明但 `validateThemeTokens()` 从未检查 |
| **`compileThemeTokensToCssVariables` 导入但未使用** | `dal/themes.ts` 第 7 行的死导入 |

### 中 — 数据完整性

| 问题 | 详情 |
|------|------|
| **主题名称无唯一约束** | `(schoolId, name)` 在数据库中不唯一 |
| **colors 和 radius 无验证** | `validateThemeTokens()` 中接受任何键值对 |
| **缓存标签已定义但未使用** | `themeRegistry` 和 `theme()` 缓存标签存在但未被任何重验证逻辑调用 |

---

## 推荐修复方案

| 优先级 | 修复 | 描述 |
|--------|------|------|
| P0 | 修复 CSS 变量命名 | 将 `compileThemeTokensToCssVariables` 中的 `--surface-*` 改为 `--color-*` |
| P0 | 构建主题注入管线 | 创建基于 cookie 的持久化 + ThemeInjector 服务器组件 + 接入根布局 |
| P0 | 创建主题 actions 层 | `theme-actions.ts`：`setActiveThemeAction`、`registerThemeTokensAction` |
| P1 | 构建设置 UI | 将静态外观卡片替换为功能性主题选择器 |
| P1 | 添加主题列表 DAL | `listThemesBySchool(schoolId)` 用于检索某学校的所有主题 |
| P2 | 支持 light/dark 变体 | 扩展 `ThemeTokenRegistry` 以支持 `light` 和 `dark` 子对象 |
| P2 | 执行所有守卫 | 在验证中添加 `noLineSurfaces` 和 `simplifiedChinese` 检查 |
| P3 | 添加唯一约束 | 在 `themeTokenRegistries` 上为 `(schoolId, name)` 添加唯一索引 |
