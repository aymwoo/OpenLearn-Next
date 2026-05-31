---
phase: quick-260507-tcl-stitch
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/surfaces/class-management-surface.tsx
autonomous: true
requirements: []

must_haves:
  truths:
    - "Filter pills show individual options: 在读, 请假, 男, 女 instead of generic 全部状态/全部性别"
    - "Bulk actions show download and delete icons matching Stitch"
    - "Student avatars remain text initials but match Stitch circular styling"
    - "Hero section, class info, metrics, and buttons remain unchanged"
  artifacts:
    - path: "src/components/surfaces/class-management-surface.tsx"
      provides: "Updated student list section with Stitch filter pills and bulk actions"
  key_links:
    - from: "FilterPill components"
      to: "individual status/gender options"
      via: "selection state per chip"
    - from: "Bulk actions"
      to: "Download/Trash2 icons"
      via: "IconButton wrapper"
---

<objective>
将班级管理页面的学生名册区域（filter pills、批量操作、学生行样式）对齐 Stitch 屏幕 `154c66ef0dc643a7a3edd7ed520fc999` 的设计模式。Hero 区域（班级信息、指标、按钮）和整体页面布局保持不变。
</objective>

<execution_context>
@/home/wuxf/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/wuxf/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
<interfaces>
<!-- Key types and components used in this plan. Extracted from codebase. -->

From src/components/ui/badge.tsx:
```typescript
export function Badge({ variant = 'default', className, ...props }: BadgeProps)
// variants: 'default' | 'success' | 'accent'
// default: 'bg-surface-container-low text-on-surface-variant'
// success: 'bg-tertiary-container/70 text-tertiary'
// accent: 'bg-primary-container/20 text-primary'
```

From src/components/ui/button.tsx:
```typescript
export function Button({ variant, className, ...props }: ButtonProps)
// variants: 'default' | 'secondary' | 'ghost'
```

Current data contracts in class-management-surface.tsx:
```typescript
const students = [
  { avatar: "陈", name: "陈宇", idNumber: "202309001", gender: "男",
    enrollmentDate: "2023年9月1日", status: "在读", statusTone: "success" },
  // ... same pattern for 3 students
];

const classSummary = {
  averageGrade, homeroomTeacher, nextSession, room, totalStudents
};
```

Current internal components: Metric, FilterPill, MetaText, IconButton, PaginationButton
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace filter pills with individual selectable chips and update bulk actions</name>
  <files>src/components/surfaces/class-management-surface.tsx</files>
  <action>
=== Filter Pills ===

Replace the two generic FilterPill calls:
```
<FilterPill label="全部状态" />
<FilterPill label="全部性别" />
```
with individual selectable filter chips matching Stitch design:
- Status chips: "在读", "请假"
- Gender chips: "男", "女"

Implementation:
1. Change `FilterPill` to accept an optional `active` prop (boolean, default false).
2. Add `useState` for `activeStatus: string | null` and `activeGender: string | null`.
3. Render status chips and gender chips as separate groups within the existing filter bar container.
4. When a chip is clicked, toggle it (click active chip → deselect; click inactive chip → activate, deactivating sibling).
5. Active chip styling: use `bg-primary/10 text-primary ring-1 ring-primary/20` (tonal highlight matching DESIGN.md no-line philosophy). Inactive: keep current `bg-surface-container-high text-on-surface` style.

=== Bulk Actions ===

Replace bulk action buttons:
- Keep "批量操作：" label
- First button: Download icon (already imported) — no change to icon, just update aria-label from "导出" to "下载" if needed
- Second button: Replace `EllipsisVertical` with `Trash2` icon, aria-label "删除"
- Add `Trash2` to the lucide-react import

=== Self-check before completing ===
- The hero section at the top (lines 64–109) is NOT modified
- The `classSummary` and `students` data objects are NOT modified
- `Metric`, `MetaText`, `PaginationButton` helpers are NOT modified
</action>
<verify>
<automated>grep -n "全部状态\|全部性别" src/components/surfaces/class-management-surface.tsx; echo "Exit: $?" — should return exit 1 (no matches)</automated>
</verify>
<done>
Filter bar shows individual chips: 在读, 请假, 男, 女. Chips toggle active state on click. Bulk actions show Download + Trash2 icons. Hero section intact.
</done>
</task>

<task type="auto">
  <name>Task 2: Polish student avatar styling to match Stitch proportions</name>
  <files>src/components/surfaces/class-management-surface.tsx</files>
  <action>
=== Student Avatar Styling ===

Adjust the text-initial avatar in each student row (line 193) to match Stitch's circular avatar proportions while keeping text initials (no images).

Current:
```tsx
<div className="grid size-7 place-items-center rounded-full bg-surface-container-highest text-xs font-semibold text-on-surface-variant">
  {student.avatar}
</div>
```

Changes:
1. Increase avatar from `size-7` (28px) to `size-9` (36px) — matches Stitch's visual weight for student avatars.
2. Adjust font size from `text-xs` to `text-sm` for better readability of Chinese initials at this size.
3. Use `bg-primary/10 text-primary` instead of `bg-surface-container-highest text-on-surface-variant` — gives avatars a subtle branded accent matching Stitch's colored initial approach.
4. Keep `rounded-full`, `place-items-center`, and `font-semibold`.

=== Verification ===
- No other structural or layout changes to the page
- The table grid, pagination, search bar, and header stay identical
</action>
<verify>
<automated>grep -n "size-7.*rounded-full.*avatar" src/components/surfaces/class-management-surface.tsx; echo "Old avatar still present: $?" — should return exit 1</automated>
</verify>
<done>
Student avatar uses size-9 (36px) circle with primary-tinted background, text-sm Chinese initial. Matches Stitch visual weight.
</done>
</task>

</tasks>

<verification>
### Quick Verification Steps

1. **Visual check:** Open the class management page and confirm:
   - Filter bar shows 4 individual chips: 在读, 请假, 男, 女 (not "全部状态"/"全部性别")
   - Clicking a chip toggles its active state, sibling chips deselect
   - Bulk actions show Download + Trash2 (not EllipsisVertical)
   - Student avatars are 36px circles with primary-tinted background

2. **Regression check:** Hero section (班级名、班主任、指标、按钮) is unchanged.
</verification>

<success_criteria>
- [ ] Filter chips display individual status/gender options with toggle behavior
- [ ] Bulk actions show Download + Delete (Trash2) icons
- [ ] Student avatars are 36px circles with primary-tinted background and Chinese initials
- [ ] Hero section, class summary data, metrics, and top buttons are unchanged
- [ ] No new lint errors introduced
</success_criteria>

<output>
After completion, create `.planning/quick/260507-tcl-stitch/260507-tcl-SUMMARY.md`
</output>
