# Phase 06 UI spec: Resource, plugin, MCP, AI, and theme foundations

**Status:** Ready for planning  
**Phase:** 06-resource-ai-rag-mcp-plugin-and-theme-foundations  
**Source:** `DESIGN.md`, Stitch project `5322129002350954765`, and Phase 06 context

## UI boundary

Phase 06 user-facing UI is intentionally minimal. It updates the existing
`/resources` card library into a DTO-backed teacher resource center and may add
compact admin/developer status panels for AI, RAG, MCP, plugin, and theme
registries. It must not implement a plugin marketplace, full theme editor,
provider console, live RAG search UI, file upload flow, or AI chat surface.

## Visual requirements

- Use Simplified Chinese UI copy.
- Use existing `Button`, `Card`, `Badge`, and `Skeleton` primitives where
  possible.
- Follow `DESIGN.md`: Lexend, no 1px divider lines, tonal surface layering,
  ambient shadows, rounded shells, and glass/gradient primary actions.
- Resource cards must show title, link/type, owner/scope, grade, subject,
  textbook source/version, volume/chapter/unit labels, visibility, and RAG
  eligibility.
- Admin/developer status panels must read as safety registries: “已禁用”,
  “待审批”, “仅记录审计”, “声明式配置”, and similar audit-first copy.
- Interactive controls must keep at least 44px hit targets.

## Copy constraints

- Upload copy must not imply real file upload. Use “登记链接资源” or “新增链接资源”,
  not “上传资源”.
- AI copy must not imply generation is live. Use “Agent 能力注册”, “提案待审批”,
  and “暂无真实模型调用”.
- RAG copy must not imply search is live. Use “Qdrant-ready 过滤边界” and
  “暂不生成 embedding”.
- Plugin copy must reinforce safety: “声明式 manifest”, “系统 allowlist action”,
  “kill-switch”, and “禁止任意代码执行”.
- Theme copy must reinforce tokens: “CSS 变量”, “Lexend”, “无分割线 tonal surface”,
  and “禁止任意 CSS/脚本”.

## Verification expectations

`pnpm verify:phase6` must check that UI source files avoid `border-b`, `border-t`,
`divide-`, and direct imports from `@/db`, `@/db/schema`, or `@/lib/dal` inside UI
components.

## UI-SPEC complete

This contract is sufficient for Phase 06 planning.
