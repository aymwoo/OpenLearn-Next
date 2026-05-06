# Context: Phase 9 - Core Page Alignment

**Goal:** Align all mapped Stitch pages to their corresponding application routes, including newly added management and settings routes.

## Canonical refs

- `DESIGN.md`
- `.planning/PROJECT.md`
- `.planning/ROADMAP.md`
- Stitch project `5322129002350954765`

## Decisions captured

### Route mapping decisions

- `/classroom` uses `课堂教学流程运行管理 - OpenLear-Next` as the primary visual source.
- `课堂教学运行管理 - 优化版` is a supplement for `/classroom`, not a separate route.
- `/student` uses `学生学习页面 - OpenLear-Next` as the primary visual source.
- `学生仪表盘 - 高紧凑版 - OpenLear-Next` is a secondary reference for `/student` density and modules.
- `/settings/labs` is the new route for `实验室布局管理 - 高密度版 V3`.

### Stitch screen to route mapping

- `/` ← `79dd3433e6c44f0792e0ada2ebf71337`
- `/teacher` ← `a626d1e742dc4ba1b652b72e11998c06`
- `/classroom` ← `f94d06cb39984749ac9b64d4e2a8cd13`
- `/teacher/editor` ← `2917c44804c84c5994623c02d83757f9`
- `/student` ← `e171b701a8fe4f5cb16c2ed0cec2c3e1`
- `/student/player` ← `724cbf9dfc0d41c5b1ca252c6ba61627`
- `/resources` ← `f1b238f663d741089dd4b547a4f5c1f1`
- `/courses` ← `ee3e5cf987614f32be7d4ee1cbfc223f`
- `/teacher/review` ← `cd93ed3b58494edea851005d436cfdba`
- `/teacher/students` ← `527341c7cb484c878b5bb28479834dc7`
- `/settings` ← `7166a22a0ada4280a66c61295ff545cb`
- `/settings/labs` ← `53d4eefe1ae94deaa35d626d60f458fb`

## Notes

- Existing `src/app/page.tsx` is the currently rendered homepage entry and remains the route target for `/`.
- New routes should preserve the existing route-group structure where appropriate, for example `src/app/(teacher)/teacher/students/page.tsx` for `/teacher/students`.
- All implementations must prefer tonal separation over 1px lines and keep Lexend-based hierarchy consistent with `DESIGN.md`.
