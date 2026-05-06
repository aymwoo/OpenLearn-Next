## ROOT CAUSE FOUND

**Debug Session:** .planning/debug/teacher-dashboard-layout.md

**Root Cause:** "今天把'编程基础：让角色动起来'编排成可运行课堂" text in `TeacherDashboardSurface` has fixed or narrow wrapping that limits its width incorrectly, causing layout confusion. The grid layout `xl:grid-cols-[1.15fr_0.85fr]` or responsive wrapping may be forcing it narrower than necessary.

**Evidence Summary:**
- The text is wrapped in a `h1` with `max-w-3xl` but is inside a grid column that might be constraining it too much on smaller screens.
- User observed "布局混乱，'今天把'编程基础：让角色动起来'编排成可运行课堂'这部分宽度不够" (Layout confusion, this section's width is not enough).

**Files Involved:**
- `src/components/surfaces/teacher-dashboard-surface.tsx`: Grid layout and `max-w-` classes on the h1 may need adjustments.

**Suggested Fix Direction:** Adjust the grid layout or max-width classes in `TeacherDashboardSurface` to ensure the title has enough width.
