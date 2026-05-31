---
quick_id: 260510-idr
title: 将 radius-card 二级卡片圆角语义扩展到其他教师端 surfaces
status: in_progress
created_at: 2026-05-10
---

# Quick Task 260510-idr Plan

## Goal

把教师端其他 surface 中仍然手写的二级卡片圆角收敛到 `radius-card`
语义，减少相同层级继续混用 `1.4rem`、`1.5rem`、`3xl` 的情况。

## Tasks

1. 盘点教师端 surface 中仍使用手写二级卡片圆角的模块。
2. 复用 `teacherSurfaceRhythm.card` 替换这些同层级 surface。
3. 运行定向 lint，补充 quick summary 与 `.planning/STATE.md`。
