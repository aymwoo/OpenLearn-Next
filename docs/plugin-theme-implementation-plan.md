# 插件系统 + 主题插件实现方案

## Phase 11 implemented state

- `setPluginEnabled(true)` 已能在插件启用时自动注册 `manifest.theme`，并刷新 plugin/theme cache tags。
- `src/actions/theme-actions.ts` 已提供 `setActiveThemeAction` 与 `registerThemeTokensAction`。
- `src/lib/theme-cookie.ts` 已提供 `activeThemeId` cookie 读写；`src/components/theme/theme-injector.tsx` 会在根布局按当前 actor + school scope 注入主题变量。
- `compileThemeTokensToCssVariables()` 现在输出 `--color-surface-container-low` 这类变量，不再输出 `--surface-*`。
- `PluginRenderer`、settings 主题选择器、labs 插件管理 UI 已接入现有页面。

### 明确不在 Phase 11 范围内

- shared theme marketplace / discovery
- light/dark variant expansion
- arbitrary plugin JS or remote execution
- external marketplace integration

> 下文保留为实施方案与设计推演记录；当前仓库状态以上述实现为准。

## 背景

当前插件系统骨架存在但不可用（无法启用插件、权限未执行、无 UI 集成）。主题系统有存储和验证层，但运行时应用链路完全缺失（`compileThemeTokensToCssVariables` 从未被调用）。

目标：打通插件系统全链路（注册 → 启用 → Hook 执行 → UI 渲染 → 审计），并支持主题插件更换站点视觉主题。

## 架构总览

```
Plugin Registration → Enable (+ auto-register theme tokens) → Hook Execution → PluginRenderer (RSC) → Widget
                                                                                        ↓
Theme Plugin:  manifest.theme → setPluginEnabled(true) → registerThemeTokens() → ThemeInjector reads cookie → CSS vars → DOM
```

### 关键设计决策

1. **基于 Cookie 的主题持久化** — 无需数据库迁移，per-user 偏好，有效期 1 年。无 cookie 或主题无效时，globals.css 中的默认主题生效
2. **Server Component PluginRenderer** — Hook 在 SSR 阶段执行，完全访问数据库，避免客户端瀑布请求
3. **基于 FormData 的 Server Actions** — 表单驱动的 toggle/selector 模式，无需额外的客户端组件来管理状态
4. **修复 CSS 变量命名** — Surface 令牌从 `--surface-*` 改为 `--color-*` 以匹配 Tailwind 和 globals.css 约定
5. **启用时自动注册主题** — `setPluginEnabled(true)` 时若 manifest 包含 `theme` 字段，自动调用 `registerThemeTokens()`

---

## 实施步骤

### 步骤 1：修复插件 DAL — 启用 API + 学校隔离 + 锚点查询

**文件：`src/lib/dal/plugins.ts`**

**A. 新增 `setPluginEnabled()`：**
```typescript
export async function setPluginEnabled(pluginId: string, enabled: boolean) {
  // 先获取插件以读取其 manifest
  const plugin = await db.query.pluginRegistrations.findFirst({
    where: eq(pluginRegistrations.id, pluginId),
  });
  if (!plugin) throw new Error("Plugin not found");

  const [record] = await db
    .update(pluginRegistrations)
    .set({ enabled, updatedAt: new Date() })
    .where(eq(pluginRegistrations.id, pluginId))
    .returning();

  // 如果插件声明了主题，启用时自动注册主题令牌
  if (enabled) {
    try {
      const manifest = PluginManifestSchema.parse(plugin.manifestJson);
      if (manifest.theme) {
        await registerThemeTokens(plugin.schoolId, `${plugin.name} theme`, manifest.theme);
      }
    } catch {
      // Manifest 解析失败 — 跳过主题注册
    }
  }

  return record;
}
```

**B. 新增 `getEnabledPluginsForAnchor()`：**
```typescript
export async function getEnabledPluginsForAnchor(schoolId: string, hookAnchor: string) {
  const plugins = await db.query.pluginRegistrations.findMany({
    where: and(
      eq(pluginRegistrations.schoolId, schoolId),
      eq(pluginRegistrations.enabled, true),
      eq(pluginRegistrations.killSwitchEnabled, false),
    ),
  });

  return plugins.filter(p => {
    try {
      const manifest = PluginManifestSchema.parse(p.manifestJson);
      return manifest.anchors.includes(hookAnchor as any);
    } catch {
      return false;
    }
  });
}
```

**C. 添加学校隔离到 `runPluginHook()`：**
- 新增 `schoolId` 参数
- 验证 `plugin.schoolId === schoolId`
- 不匹配时：记录被拒绝的审计并返回 null

**D. 移除冗余的 manifest 重新解析：**
- 删除 `dal/plugins.ts:62` 中的 `PluginManifestSchema.parse(plugin.manifestJson)` — 注册时已验证
- 直接使用已存储的 manifest 字段进行锚点/动作匹配

**文件：`src/actions/plugin-actions.ts`**

**E. 新增 `setPluginEnabledAction()`：**
```typescript
export async function setPluginEnabledAction(formData: FormData) {
  const pluginId = String(formData.get("pluginId"));
  const enabled = formData.get("enabled") === "true";

  const parsed = SetEnabledSchema.safeParse({ pluginId, enabled });
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const result = await setPluginEnabled(parsed.data.pluginId, parsed.data.enabled);
    updateTag(cacheTags.pluginRegistry);
    updateTag(cacheTags.plugin(parsed.data.pluginId));
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

---

### 步骤 2：修复主题 CSS + 构建注入管线

**文件：`src/server/themes/tokens.ts`（第 46 行）**

- `compileThemeTokensToCssVariables()`：将 `--surface-*` 改为 `--color-*`

**新建：`src/lib/theme-cookie.ts`**
```typescript
import "server-only";
import { cookies } from "next/headers";

export async function getActiveThemeId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("activeThemeId")?.value ?? null;
}
```

**新建：`src/components/theme/theme-injector.tsx`**
```tsx
import { getActiveThemeId } from "@/lib/theme-cookie";
import { getThemeRegistryDTO } from "@/lib/dal/themes";
import { compileThemeTokensToCssVariables } from "@/server/themes/tokens";

export async function ThemeInjector() {
  const themeId = await getActiveThemeId();
  if (!themeId) return null;

  const theme = await getThemeRegistryDTO(themeId);
  if (!theme || theme.validationStatus !== "valid") return null;

  const cssVars = compileThemeTokensToCssVariables(theme.tokenJson);
  const css = `:root {\n${Object.entries(cssVars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n")}\n}`;

  return <style id="theme-injector" dangerouslySetInnerHTML={{ __html: css }} />;
}
```

**文件：`src/app/layout.tsx`**

- 导入 `<ThemeInjector />`
- 添加到 `<body>` 末尾（在 `{children}` 之后）以确保覆盖 CSS 包

---

### 步骤 3：创建 PluginRenderer + Widget 组件

**新建 Widget 组件（`src/components/plugins/widgets/`）：**

**`step-suggestion-widget.tsx`：**
```tsx
type Props = { payload: Record<string, any> };
export function StepSuggestionWidget({ payload }: Props) {
  return (
    <Card className="p-4 bg-surface-container-lowest">
      <div className="flex items-start gap-3">
        <Lightbulb className="size-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-on-surface">{payload.title ?? "步骤建议"}</p>
          <p className="mt-1 text-sm text-on-surface-variant">{payload.description ?? payload.body ?? ""}</p>
        </div>
      </div>
    </Card>
  );
}
```

**`lesson-annotation-widget.tsx`：** — MessageSquare 图标 + 注解内容卡片

**`notification-stub-widget.tsx`：** — Bell 图标 + 通知消息行

**`index.tsx`：** — `PluginWidget` 分发器组件，根据 `proposalType` 选择 Widget：
- `stepSuggestion` → `StepSuggestionWidget`
- `lessonAnnotation` → `LessonAnnotationWidget`
- `notificationStub` → `NotificationStubWidget`
- `default` → `null`

**新建：`src/components/plugins/plugin-renderer.tsx`**

接受 `anchor` + `schoolId` + 可选的 `contextPayload` 的 Server Component：
1. 调用 `getEnabledPluginsForAnchor(schoolId, anchor)`
2. 遍历每个插件的每个动作，调用 `runPluginHook()`
3. 为非拒绝的结果渲染 `PluginWidget`
4. 无结果时返回 null

---

### 步骤 4：将 PluginRenderer 接入页面

**文件：`src/app/(teacher)/teacher/page.tsx`**
- 改为 async
- 获取用户 + 会员资格 → 提取 schoolId
- 在 `TeacherDashboardSurface` 下方添加 `<PluginRenderer anchor="dashboard.widget" schoolId={schoolId} />`

**文件：`src/app/(student)/student/page.tsx`**
- 相同方法，在 `StudentDashboardSurface` 下方添加

**文件：`src/app/(teacher)/teacher/editor/page.tsx`**
- 添加 `<PluginRenderer anchor="lesson.sidebar" schoolId={schoolId} contextPayload={{ lessonId, courseId }} />`

---

### 步骤 5：扩展 PluginManifest 以支持主题

**文件：`src/lib/dto/resource-ai.ts`**

- `PluginManifestSchema` 新增可选字段：`theme: ThemeTokenRegistrySchema.optional()`

**文件：`src/lib/dal/themes.ts`**

- 新增 `getValidThemesForSchool(schoolId)` — 查询某学校所有 `validationStatus = "valid"` 的主题

---

### 步骤 6：构建设置 UI（主题选择器 + 插件管理）

**新建：`src/actions/theme-actions.ts`**

```typescript
"use server";

export async function setActiveThemeAction(formData: FormData) {
  const raw = formData.get("themeId");
  const themeId = raw ? String(raw) : null;

  const cookieStore = await cookies();
  if (themeId) {
    cookieStore.set("activeThemeId", themeId, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  } else {
    cookieStore.delete("activeThemeId");
  }
  revalidatePath("/", "layout");
  return { success: true };
}

export async function registerThemeTokensAction(data: { schoolId: string; name: string; tokenJson: any }) {
  // 验证 + 调用 DAL + 重验证
}
```

**文件：`src/components/surfaces/settings-surface.tsx`**

**通用设置（`GeneralSettingsSurface`）：**
- 改为 async
- 获取 `themes = await getValidThemesForSchool(schoolId)` 和 `activeThemeId = await getActiveThemeId()`
- 将静态浅色/深色/自动卡片替换为动态主题选择器：
  - "默认主题" 卡片 — `<form action={setActiveThemeAction}>`（无 hidden input = 重置为默认）
  - 遍历 `themes` — 每个主题一张卡片，包含 `<input type="hidden" name="themeId" value={theme.id} />`
  - 活动主题以高亮边框/阴影显示

**实验室设置（`LabsSettingsSurface`）：**
- 改为 async，获取插件列表
- 新增"插件管理" Section：
  - 列出已注册的插件，显示名称、状态、kill-switch 状态
  - 启用/禁用切换按钮（通过 `setPluginEnabledAction` 的表单操作）

---

## 验证清单

| # | 验证项 | 方法 |
|---|--------|------|
| 1 | 插件注册 | 检查 `pluginRegistrations` 表是否有行 |
| 2 | 插件启用 | 实验室页面点击启用，验证 `enabled = true` 且 `themeTokenRegistries` 出现新行 |
| 3 | 主题选择 | 设置页面选择主题，验证 DevTools 中设置了 cookie 且 CSS 变量被覆盖 |
| 4 | 恢复默认 | 选择"默认主题"，验证 cookie 被删除，globals.css 颜色恢复 |
| 5 | Widget 渲染 | 启用带有 `dashboard.widget` 锚点的插件，访问教师仪表盘，验证 Widget 可见 |
| 6 | Kill-switch | 触发 kill-switch，验证 hook 返回被拒绝 |
| 7 | 学校隔离 | 用学校 B 的用户尝试调用学校 A 的插件 hook，验证被拒绝 |
| 8 | 类型检查 | 运行 `pnpm typecheck`，验证零错误 |
| 9 | Lint | 运行 `pnpm lint`，验证零警告 |

---

## 涉及的所有文件

| 文件 | 操作 | 步骤 |
|------|------|------|
| `src/lib/dal/plugins.ts` | 新增 3 个函数，修改 `runPluginHook` 签名 | 1, 4, 5 |
| `src/actions/plugin-actions.ts` | 新增 `setPluginEnabledAction` | 1 |
| `src/actions/theme-actions.ts` | **新建** | 6 |
| `src/server/themes/tokens.ts` | 修复 CSS 变量前缀（第 46 行） | 2 |
| `src/lib/theme-cookie.ts` | **新建** | 2 |
| `src/components/theme/theme-injector.tsx` | **新建** | 2 |
| `src/app/layout.tsx` | 在 `<body>` 末尾添加 `<ThemeInjector />` | 2 |
| `src/components/plugins/widgets/step-suggestion-widget.tsx` | **新建** | 3 |
| `src/components/plugins/widgets/lesson-annotation-widget.tsx` | **新建** | 3 |
| `src/components/plugins/widgets/notification-stub-widget.tsx` | **新建** | 3 |
| `src/components/plugins/widgets/index.tsx` | **新建** | 3 |
| `src/components/plugins/plugin-renderer.tsx` | **新建** | 3 |
| `src/app/(teacher)/teacher/page.tsx` | 改为 async，添加 PluginRenderer | 4 |
| `src/app/(student)/student/page.tsx` | 改为 async，添加 PluginRenderer | 4 |
| `src/app/(teacher)/teacher/editor/page.tsx` | 添加 PluginRenderer | 4 |
| `src/lib/dto/resource-ai.ts` | PluginManifestSchema 添加 `theme` 字段 | 5 |
| `src/lib/dal/themes.ts` | 新增 `getValidThemesForSchool` | 5 |
| `src/components/surfaces/settings-surface.tsx` | 改为 async，动态主题选择器 + 插件管理 | 6 |

---

## 待解决问题（未来迭代）

1. **与外部插件注册表集成** — JSON manifest 验证是一个良好的第一层。未来的迭代应连接到外部注册表 API（例如 npm 包或学校管理的市场）
2. **沙盒化动作执行** — 当前的分发器是同步和确定性的。如果插件需要执行任意 JavaScript（未来），需要一个带资源限制的沙盒环境
3. **插件间通信** — 当前插件彼此隔离。如果两个插件需要共享数据，需要一个事件总线或共享状态层
4. **主题市场/发现** — 当前主题是每个学校手动注册的。一个共享的中心主题注册表将使主题可被发现
5. **多学校用户主题** — 当用户属于多个学校时，基于 cookie 的方法在切换学校时不会自动切换主题
