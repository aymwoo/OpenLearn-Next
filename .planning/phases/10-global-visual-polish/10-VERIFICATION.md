---
phase: 10-global-visual-polish
verified: 2026-05-06T23:24:51Z
status: human_needed
score: 8/8 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/8
  gaps_closed:
    - "User navigates the application and sees no 1px divider lines, only surface tonal layering."
    - "Shell/login entry surfaces and classroom launch inputs use one shared DESIGN.md-compliant ghost-focus interaction language."
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "桌面端全局视觉走查"
    expected: "首页、教师端、课堂、学生端、资源页、设置页都不再出现 1px divider line，glass 只主要出现在浮动导航/浮层。"
    why_human: "是否真正符合 DESIGN.md 的整体气质、层级与一致性，仍需人工视觉判断。"
  - test: "登录与课堂 launch 焦点交互检查"
    expected: "输入框、toggle、select 都表现为 ghost-focus/no-line 语言，没有默认 checkbox chrome 或旧 ring 回退。"
    why_human: "键盘 focus、hover、pressed 的真实观感无法仅靠静态代码完全确认。"
  - test: "响应式稳定性检查"
    expected: "teacher / student / player / settings 在 tablet/mobile 下无明显 overflow、层级坍塌或主 CTA 丢失。"
    why_human: "Phase 10 明确包含 responsive polish，需实际 viewport 观察。"
---

# Phase 10: Global Visual Polish Verification Report

**Phase Goal:** Application is visually consistent, free of legacy 1px borders,
and strictly follows `DESIGN.md`.
**Verified:** 2026-05-06T23:24:51Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | User navigates the application and sees no 1px divider lines, only surface tonal layering. | ✓ VERIFIED | `! rg -n "border-outline-variant|focus:ring|0_0_0_1px|outline-\[rgba\(0,80,212,0\.16\)\]" src/components/home/home-login-card.tsx src/components/classroom/classroom-launch-panel.tsx` returns no matches. Global scan only hit `src/components/surfaces/teacher-dashboard-surface.tsx:317`, which is a 3px timeline marker, not a 1px divider/section line. |
| 2 | All buttons and interactive elements use correct Primary Blue gradients, glassmorphism, and rounded-full styles. | ✓ VERIFIED | `src/components/ui/button.tsx` keeps the shared `bg-linear-135 from-primary to-primary-container` + `rounded-full`; `src/components/shell/glass-nav.tsx` is the glass entry point; `src/components/ui/ghost-field.ts` supplies shared rounded ghost-focus text/select/toggle controls consumed by login and launch surfaces. |
| 3 | Ambient shadows and surface elevations consistently reflect the "Luminous Academy" design language. | ✓ VERIFIED | `src/app/globals.css:21` defines `--shadow-ambient`; shared `Card`, `Button`, `GlassNav`, login card, student/settings/library surfaces all reuse ambient shadow + tonal surfaces instead of divider-led separation. |
| 4 | Shared UI primitives use one consistent primary gradient/focus treatment and avoid border-based sectioning. | ✓ VERIFIED | `src/app/globals.css`, `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/badge.tsx`, and `src/components/ui/ghost-field.ts` form one shared token/primitive layer; no legacy border/ring patterns remain in the previously failed controls. |
| 5 | Shell/login entry surfaces constrain glass to floating nav and use tonal layering with shared CTA/focus language. | ✓ VERIFIED | `src/components/shell/glass-nav.tsx` is still the main `backdrop-blur-xl` surface; `src/components/shell/route-shell.tsx` stays on `bg-surface`; `src/app/(auth)/login/LoginForm.tsx` and `src/components/home/home-login-card.tsx` both consume `ghostTextFieldClassName`, and home login now uses `ghostToggleClassName`. |
| 6 | Teacher-facing core pages use dense command-center hierarchy with reduced route-local style drift. | ✓ VERIFIED | `src/components/surfaces/teacher-dashboard-surface.tsx`, `lesson-editor-surface.tsx`, and `students-management-surface.tsx` remain dense tonal shells with shared `Button` / `Badge` / `Card` usage and no divider-line fallback. |
| 7 | Classroom/review/launch flows preserve single-hero hierarchy, semantic states, and shared ghost-focus control language. | ✓ VERIFIED | `src/components/classroom/classroom-launch-panel.tsx:77-106` uses `ghostSelectFieldClassName` for both selects; `src/components/learning/teacher-review-surface.tsx` keeps a single hero plus semantic feedback states; prior launch-panel 1px inset outline is gone. |
| 8 | Public, student, library, and settings surfaces keep page-appropriate hierarchy without reintroducing border-led separation. | ✓ VERIFIED | `src/components/surfaces/home-surface.tsx`, `student-dashboard-surface.tsx`, `library-surface.tsx`, and `settings-surface.tsx` all keep tonal shells / single-hero patterns and the border scan did not find new 1px border/divider regressions. |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/app/globals.css` | Canonical visual tokens and ghost-focus rules | ✓ VERIFIED | Primary blue, surface tiers, ambient shadow, and global focus outline remain centralized. |
| `src/components/ui/button.tsx` | Shared CTA hierarchy | ✓ VERIFIED | Primary gradient + rounded-full + shared focus remain intact. |
| `src/components/ui/card.tsx` | Shared action-layer card treatment | ✓ VERIFIED | Uses `bg-surface-container-lowest` + `shadow-ambient`. |
| `src/components/ui/badge.tsx` | Shared badge/chip semantics | ✓ VERIFIED | Default/success/accent remain centralized and substantive. |
| `src/components/ui/ghost-field.ts` | Shared ghost-focus field/select/toggle contract | ✓ VERIFIED | Exports `ghostTextFieldClassName`, `ghostSelectFieldClassName`, and `ghostToggleClassName`. |
| `src/app/(auth)/login/LoginForm.tsx` | Canonical auth consumer of shared ghost text field | ✓ VERIFIED | Imports and uses `ghostTextFieldClassName` on both inputs. |
| `src/components/home/home-login-card.tsx` | No-line remember-me control and shared entry styling | ✓ VERIFIED | Uses `ghostTextFieldClassName`, `ghostToggleClassName`, `aria-pressed`, and hidden `rememberMe` input; old checkbox border/ring pattern is removed. |
| `src/components/classroom/classroom-launch-panel.tsx` | Launch selects aligned to shared ghost-focus treatment | ✓ VERIFIED | Both selects use `ghostSelectFieldClassName`; removed prior 1px inset outline recipe. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `button.tsx` | `globals.css` | primary and focus tokens | ✓ WIRED | `from-primary to-primary-container` and shared focus utilities still depend on global tokens. |
| `card.tsx` | `globals.css` | surface and shadow tokens | ✓ WIRED | `bg-surface-container-lowest` + `shadow-ambient` resolve through global theme tokens. |
| `badge.tsx` | `globals.css` | accent/success/default tone tokens | ✓ WIRED | Badge variants map directly to tokenized surface/semantic colors. |
| `LoginForm.tsx` | `ghost-field.ts` | shared auth input classes | ✓ WIRED | Imports `ghostTextFieldClassName` and applies it to both auth inputs. |
| `home-login-card.tsx` | `ghost-field.ts` | shared text/toggle classes | ✓ WIRED | Imports and uses `ghostTextFieldClassName` + `ghostToggleClassName`. |
| `classroom-launch-panel.tsx` | `ghost-field.ts` | shared launch select classes | ✓ WIRED | Imports and uses `ghostSelectFieldClassName` for both selects. |
| `glass-nav.tsx` | `globals.css` | glass surface and ambient shadow tokens | ✓ WIRED | Uses `bg-surface/80`, `shadow-ambient`, and `backdrop-blur-xl` as the main floating glass pattern. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `src/components/home/home-login-card.tsx` | `rememberMe` | local React state + hidden input | Yes | ✓ FLOWING |
| `src/components/classroom/classroom-launch-panel.tsx` | `publishedLessons`, `selectedLessonId`, `selectedClassId` | props + local state + server action result | Yes | ✓ FLOWING |
| `src/app/(auth)/login/LoginForm.tsx` | `roleIntent` | no submitted field in standalone login form | No | ⚠️ STATIC — login page shows role intent copy, but `LoginForm` still does not submit `roleIntent`. |
| `src/components/surfaces/player-surface.tsx` | learning mode label | hardcoded string `锁定跟随`; `src/app/(student)/student/player/page.tsx` passes `player={null}` | No | ⚠️ STATIC — hero metric is visually polished but disconnected from runtime data. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Type safety after Phase 10 re-verification | `pnpm typecheck` | passed | ✓ PASS |
| Prior blocker patterns removed from login + launch controls | `! rg -n "border-outline-variant|focus:ring|0_0_0_1px|outline-\[rgba\(0,80,212,0\.16\)\]" src/components/home/home-login-card.tsx src/components/classroom/classroom-launch-panel.tsx` | no output | ✓ PASS |
| Shared ghost-field contract is actually consumed | `rg -n "ghost(Text|Select|Toggle)FieldClassName|ghostToggleClassName|ghostSelectFieldClassName" src/app src/components` | matches found in `LoginForm.tsx`, `home-login-card.tsx`, `classroom-launch-panel.tsx` | ✓ PASS |
| Global legacy-border scan | `rg -n "border(?:-[trblxy])?(?:\s|$)|border-[A-Za-z\[]|divide-|focus:ring|ring-[1248]|0_0_0_1px|outline-\[rgba\(0,80,212,0\.16\)\]" src` | only hit is `teacher-dashboard-surface.tsx:317` timeline marker (`border-[3px]`, `ring-4`) | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| `UI-04` | `10-01`..`10-06` | Application globally eliminates 1px borders, enforces correct tonal layering, shadows, and color usage strictly per `DESIGN.md`. | ? NEEDS HUMAN | Automated evidence shows the two previous blockers are fixed, shared tokens/primitives are wired, and no targeted 1px/ring regressions remain. Final visual sign-off still requires human walkthrough. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `src/app/(auth)/login/page.tsx`, `src/app/(auth)/login/LoginForm.tsx` | 52-57 / 27-63 | role intent copy exists, but form does not submit `roleIntent` | ⚠️ Warning | `/login?roleIntent=student` still looks role-aware in UI, but the standalone login form remains data-flow disconnected. |
| `src/app/(student)/student/player/page.tsx`, `src/components/surfaces/player-surface.tsx` | 65-67 / 95-98 | runtime mode shown as hardcoded `锁定跟随` | ⚠️ Warning | Student player hero metric is polished visually but can misstate actual classroom mode. |
| `src/components/home/home-login-card.tsx`, `src/app/(teacher)/teacher/layout.tsx`, `src/components/surfaces/teacher-dashboard-surface.tsx` | 122, 144 / 67-69 / 81-82 | `href="#"` placeholder links | ⚠️ Warning | Several polished surfaces still expose dead-entry placeholders. |
| `src/components/surfaces/home-surface.tsx`, `src/components/surfaces/settings-surface.tsx` | 27 / 46 | brand typo `OpenLear-Next` | ⚠️ Warning | Global polish still contains visible brand inconsistency. |
| `src/components/surfaces/teacher-dashboard-surface.tsx` | 317 | local `border-[3px]` + `ring-4` timeline marker | ℹ️ Info | Not a 1px divider, but still a local effect outside the main shared token language. |

### Human Verification Required

### 1. 桌面端全局视觉走查

**Test:** 逐页检查 `/`、`/login`、`/teacher`、`/classroom`、`/student`、`/student/player`、`/resources`、`/courses`、`/settings`。  
**Expected:** 没有 1px divider line；页面主要靠 tonal layering 分层；glass 主要只出现在浮动导航/浮层。  
**Why human:** `DESIGN.md` 的整体视觉语言与“是否看起来一致”需要人工判断。

### 2. 登录与 launch 控件交互检查

**Test:** 用键盘 Tab/Shift+Tab、鼠标 hover/click 检查登录页、首页登录卡、课堂 launch 两个 select。  
**Expected:** focus 为 ghost-outline 观感；无默认 checkbox 边框/浏览器 ring 回退；主 CTA 层级清晰。  
**Why human:** 真实 focus glow、pressed state、hover 节奏无法仅通过静态源码完全确认。

### 3. 响应式稳定性检查

**Test:** 在 mobile/tablet viewport 检查 teacher dashboard、student dashboard、player、settings。  
**Expected:** 无 overflow；主 CTA、当前上下文与状态信息优先保留；层级不坍塌。  
**Why human:** Responsive polish 属于真实布局体验问题，静态检查不能充分覆盖。

### Gaps Summary

本次是 **re-verification**。上一次验证失败的两处核心阻塞已被代码证据关闭：

1. 首页登录卡不再使用旧 checkbox 边框/ring。
2. 课堂 launch 表单不再保留 1px inset outline，本地 focus recipe 已切换到 shared ghost-field contract。

因此，Phase 10 的 **must-haves 在代码层面已全部满足**，`UI-04` 的自动化证据也基本成立。

但由于本阶段目标本质上是 **global visual polish**，最终是否达到 `DESIGN.md`
要求仍需要人工视觉走查，所以状态从之前的 `gaps_found` 更新为
`human_needed`，而不是直接 `passed`。

另外，代码里仍存在若干 **非本阶段 must-have blocker** 之外的用户可见问题：
roleIntent 数据流未贯通、player 学习模式写死、若干 `href="#"` 占位链接、
以及 `OpenLear-Next` 品牌 typo。这些不阻止本次 must-have 复核通过，但建议继续修正。

---

_Verified: 2026-05-06T23:24:51Z_  
_Verifier: the agent (gsd-verifier)_
