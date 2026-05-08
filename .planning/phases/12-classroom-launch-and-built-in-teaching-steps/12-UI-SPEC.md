---
phase: 12
slug: classroom-launch-and-built-in-teaching-steps
status: approved
shadcn_initialized: false
preset: none
created: 2026-05-08
---

# Phase 12 — UI Design Contract

> Visual and interaction contract for the dedicated classroom launch surface,
> inline launch preview, built-in teaching-step entry points, and built-in
> plugin labeling in management surfaces.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | Tailwind primitives + minimal Radix slot patterns |
| Icon library | lucide-react |
| Font | Lexend |

This phase must extend the existing teacher-side visual system rather than
introduce a new page language. The launch page is a preparation surface, not a
marketing hero. It keeps one dominant stage at the top, then moves into compact
tonal work panels below.

---

## Phase surfaces

Phase 12 locks three connected UI zones.

1. Dedicated classroom launch page: new classroom launch is the primary path,
   while resume remains visible but clearly secondary.
2. Inline launch preview: lesson step order, summary, duration, and material
   cues stay on the same page as lesson and class selection.
3. Built-in teaching-step exposure: authoring and plugin management surfaces
   must clearly distinguish system-provided teaching steps from base schema
   types and removable extensions.

Desktop remains the visual quality bar. On mobile, preserve the primary launch
CTA, current lesson or class context, and the resumable classroom notice before
secondary metrics or preview depth.

---

## Layout contract

### Dedicated launch page

- Keep one gradient top stage only.
- Use the top stage for page title, status framing, and 2-3 key metrics.
- Put the launch form in the primary column.
- Put resume guidance and operational tips in the secondary column or a lower-
  emphasis sibling card.
- Never let resume visually compete with the new-launch CTA.

### Inline preview

- Keep preview on the same route and page as the launch form.
- Render preview only after a lesson is selected.
- Show step order as a vertical rhythm, not a dense data table.
- Each step row must show: order, step title, step family, estimated duration,
  and one short summary line.
- Material cues must appear as small chips or inline metadata, not as a nested
  document browser.

### Authoring built-in steps

- Keep base step buttons (`内容`, `任务`, `测验`) visible as the first group.
- Add a second first-level group labeled `内置教学环节` directly in the same
  action area.
- Built-in steps must be direct actions, not hidden behind a second chooser.
- The built-in group should feel system-native through labeling and tonal
  grouping, not through a separate visual language.

### Built-in plugin management

- Built-in plugin cards must show `系统内置` and `默认开启` before any secondary
  metadata.
- Disable deletion affordances for built-in plugins.
- Keep enable/disable controls available, but visually frame them as runtime
  toggles instead of ownership actions.

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Inline icon gaps, status dot offsets |
| sm | 8px | Chip spacing, compact metadata gaps |
| md | 16px | Default control spacing, stacked field gaps |
| lg | 24px | Card padding, section gutters inside tonal panels |
| xl | 32px | Primary column gaps, hero-to-body spacing |
| 2xl | 48px | Large module separation on desktop |
| 3xl | 64px | Reserved for page-level breathing room only |

Exceptions: none

Additional spacing rules for this phase:

- Launch form field stacks use `md` gaps.
- Preview step rows use `md` internal padding and `sm` metadata gaps.
- Resume panel must sit at least `lg` away from the primary launch form on
  desktop.
- Built-in step groups in authoring use `lg` separation between base and built-
  in sections.

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.7 |
| Label | 14px | 500 | 1.5 |
| Heading | 32px | 600 | 1.1 |
| Display | 48px | 600 | 1.02 |

Typography rules for this phase:

- Top-stage title may use `Display` only once per page.
- Preview and management cards use `Heading` at card-entry level only when the
  card is a primary working surface.
- Step summaries, helper text, and resume guidance stay in `Body` and must not
  drop below 14px.
- Built-in labels such as `系统内置` and `默认开启` use `Label` weight and
  rounded-chip treatment.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#f5f7f9` | App canvas, launch page background, preview frame floor |
| Secondary (30%) | `#eef1f3` | Section panels, grouped controls, preview rails, management shells |
| Accent (10%) | `#0050d4` to `#7b9cff` | Primary CTA, active launch state, selected rows, gradient top stage |
| Destructive | `#b31b25` | End classroom, irreversible disable messaging, delete hidden or locked states |

Accent reserved for: primary launch CTA, selected lesson or class state,
current preview focus, system-built-in status emphasis, and active authoring
selection only.

Color rules for this phase:

- Do not turn every built-in teaching-step chip blue. Use blue only for active
  or primary emphasis.
- Resume messaging stays tonal by default and may use a small success or live
  indicator, but it must not become a second hero.
- Plugin built-in labels may use accent-tinted chips, while non-built-in status
  stays neutral.
- Keep semantic warning and risk controls out of the primary blue system.

---

## Interaction contract

### Launch flow

- Primary CTA copy is always tied to creating a new classroom.
- CTA remains disabled until both lesson and class are selected.
- When a live classroom exists, show recovery as a secondary action or linked
  panel with lower visual weight.
- Error feedback appears inline near the launch form in a semantic container,
  not as a toast-only path.

### Preview behavior

- Preview updates immediately after lesson selection.
- Preview must not navigate away or open a modal by default.
- If no lesson is selected, show a calm placeholder that explains what preview
  becomes available after selection.

### Authoring behavior

- `新增步骤` remains the conceptual entry point.
- Base schema types and built-in teaching steps remain in one action zone with
  clear sectional separation.
- Built-in step actions must preserve the current quick-add rhythm and avoid
  an extra configuration gate before insertion.

### Plugin management behavior

- Built-in plugin cards must communicate non-deletable state before the user
  attempts a destructive action.
- If disabled, built-in plugins still remain visible as system-provided entries.
- Built-in and third-party plugins can share one list, but the first scan must
  reveal which cards are system-provided.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | 开启新课堂 |
| Empty state heading | 还没有可开课的已发布课时 |
| Empty state body | 先在教学编排页发布至少一个课时，再回到这里选择班级并启动课堂。 |
| Error state | 开课未成功，请检查课时与班级是否仍可用后重试。 |
| Destructive confirmation | 停用内置环节: 停用后教师将暂时无法在编排页直接使用该教学环节，但已存在的数据不会被删除。 |

Additional copy rules:

- Prefer short operational verbs over abstract nouns.
- Resume copy must read as recovery guidance, not as the main task.
- Built-in teaching-step names stay in Simplified Chinese and match the seeded
  first-party set exactly: `教师讲授`、`问卷调查`、`学生探究`、`课堂测验`、`评价`.
- Plugin labels must use explicit system language such as `系统内置` and
  `默认开启`; avoid vague wording like `官方推荐`.

---

## Accessibility and responsive rules

This phase reuses the shared ghost-focus field and rounded-full button contract.

- Use existing ghost-focus select and input states for launch form controls.
- Preserve visible focus outlines on all launch, preview, and toggle controls.
- Do not encode built-in versus third-party state by color alone; pair it with
  text labels.
- On mobile, stack launch form above preview and collapse secondary metrics
  before collapsing the primary CTA.
- If preview becomes long on mobile, keep the first three steps visible and let
  the rest continue naturally in-page; do not hide the preview behind tabs.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not required |
| Third-party registry | none | not applicable |

This phase should continue using repository-local primitives and existing safe
plugin rendering boundaries. No new third-party UI registry dependency is
approved for this phase.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-05-08
