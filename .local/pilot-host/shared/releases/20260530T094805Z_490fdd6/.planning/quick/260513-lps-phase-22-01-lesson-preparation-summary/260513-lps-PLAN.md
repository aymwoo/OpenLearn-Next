# Quick Plan

1. 为 `LessonEditorDTO` 增加 typed `preparationSummary` contract，并在 `getLessonEditorDTO()` 内基于现有 publish readiness、teaching design、material refs 和 evidence prompt 聚合开课前摘要。
2. 在现有 editor shell 内渲染 `阻断项 / 需关注 / 建议完善` 三层准备摘要，并新增指向 `/teacher/launch` 的 handoff，同时保留现有 preview/save/publish 行为。
3. 扩展 DAL 与 authoring UI focused tests，验证 preparation summary 的分桶语义和 editor header/status surface 的回归。
