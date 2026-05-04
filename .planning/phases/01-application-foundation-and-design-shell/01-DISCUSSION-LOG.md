# Phase 1: Application foundation and design shell - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-04
**Phase:** 01-application-foundation-and-design-shell
**Areas discussed:** Shell depth, Role entry, Demo content, Mobile priority

---

## Shell depth

| Option | Description | Selected |
|--------|-------------|----------|
| High-fidelity static | All mapped pages look like real product shells with static cards, states, and placeholders ready for future data. | ✓ |
| Structural only | Route, navigation, layout skeleton, and empty states only. | |
| Hero-first | Home and teacher dashboard high fidelity; the rest lightweight. | |

**User's choice:** High-fidelity static
**Notes:** Must include navigation active states, dashboard cards, editor/player/classroom chrome, and subtle demo copy. Home, teacher dashboard, and editor are the highest-fidelity priorities.

---

## Role entry

| Option | Description | Selected |
|--------|-------------|----------|
| Demo navigable | Public home can navigate into teacher, student, classroom, and admin shells for verification. | ✓ |
| Login-gated look | Show a protected-auth feeling before real auth exists. | |
| Landing only | Home only shows role entry copy without navigable route shells. | |

**User's choice:** Demo navigable
**Notes:** Include a role switcher for static preview. Teacher is the primary journey. Admin entry exists but remains low-emphasis.

---

## Demo content

| Option | Description | Selected |
|--------|-------------|----------|
| Science class | Good for experiments and classroom control. | |
| Chinese class | Strong Simplified Chinese education context. | |
| Math class | Good for exercises and progress but visually abstract. | |
| Other: 信息科技 | User-provided subject area. | ✓ |

**User's choice:** 信息科技
**Notes:** Topic is programming basics for middle school. Tone should feel like real teacher preparation. Example steps should cover 导入, 讲授, 练习, 总结.

---

## Mobile priority

| Option | Description | Selected |
|--------|-------------|----------|
| Core shells responsive | All major shells usable, with complex panels downgraded to stacked/drawer layouts. | |
| Home/dashboard only | Prioritize home and dashboards; complex editor/classroom routes can recommend desktop. | ✓ |
| Full parity | Mobile fully equals desktop across all shells. | |

**User's choice:** Home/dashboard only
**Notes:** Editor and classroom console should show readable preview plus desktop-recommended copy. Student player should be readable on mobile. Mobile navigation should use top glass nav with overflow.

---

## the agent's Discretion

No major area was delegated fully to the agent.

## Deferred Ideas

None.
