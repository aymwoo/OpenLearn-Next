# Phase 10: Global Visual Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or
> execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives
> considered.

**Date:** 2026-05-06
**Phase:** 10-global-visual-polish
**Areas discussed:** 统一层级策略, Teacher 页密度, 渐变与玻璃感, 响应式打磨重点

---

## 统一层级策略

| Option | Description | Selected |
|--------|-------------|----------|
| 先收敛系统 | Standardize the visual system first, then let pages follow it. | ✓ |
| 先逐页修正 | Patch visual issues one page at a time. | |
| 混合推进 | Set a few global rules, then mostly patch pages. | |

**User's choice:** 先收敛系统
**Notes:**
- Standardize both shared primitives and common page/container patterns.
- Prefer tightening existing `Button` and `Card` APIs over adding many new
  variants.
- Remove local special cases where possible.
- Shared rules win unless Stitch alignment explicitly requires an exception.
- Allow only a small exception whitelist for semantic or hero-like surfaces.

---

## Teacher 页密度

| Option | Description | Selected |
|--------|-------------|----------|
| 紧凑驾驶舱 | Make teacher pages feel like a compact operating workspace. | ✓ |
| 舒展陈列页 | Keep a more spacious showcase feel. | |
| 核心区紧凑 | Tighten only the most important regions. | |

**User's choice:** 紧凑驾驶舱
**Notes:**
- Fix the dashboard by expanding the primary information width, not by shrinking
  the copy to fit the current layout.
- Treat live classroom state and today's task rhythm as co-primary concerns.
- Apply this density language across teacher-facing pages, not only the
  dashboard.
- Keep whitespace, but make it more disciplined.
- Reduce the number of visual card types.
- Prefer shorter, more information-dense teacher copy.
- Time rhythm and live classroom blocks should form a dual-focus structure.

---

## 渐变与玻璃感

| Option | Description | Selected |
|--------|-------------|----------|
| 克制使用 | Reserve gradient and glass for high-value moments. | ✓ |
| 中度扩散 | Spread them into more key cards and states. | |
| 广泛铺开 | Make them the dominant style across many modules. | |

**User's choice:** 克制使用
**Notes:**
- Use at most one true gradient hero per page.
- Keep glass treatment mainly in navigation and floating layers.
- Keep semantic colors for error and warning states.
- Make primary CTAs consistently strong and clearly gradient-based.
- Teacher high-frequency pages can be brighter than calmer list or settings
  pages.
- Keep secondary and tertiary actions refined, but still behind primary actions.
- Hero usage depends on page type and should not be forced onto every page.

---

## 响应式打磨重点

| Option | Description | Selected |
|--------|-------------|----------|
| 桌面优先，移动不坏 | Desktop is the release bar; mobile must remain stable and usable. | ✓ |
| 全端同等要求 | Desktop, tablet, and mobile all get equal polish depth. | |
| 桌面+平板优先 | Prioritize desktop and tablet together. | |

**User's choice:** 桌面优先，移动不坏
**Notes:**
- Mobile may use collapses or reduced simultaneous information density.
- High-frequency pages should preserve primary actions, active state, and
  current context first.
- Responsive acceptance is stability-first: no overflow, no broken layout, and
  no collapsed hierarchy.

---

## the agent's Discretion

- Exact extraction boundaries for shared section/container patterns.
- Exact breakpoint tactics per page, as long as desktop remains the quality bar
  and mobile keeps key context intact.

## Deferred Ideas

None.
