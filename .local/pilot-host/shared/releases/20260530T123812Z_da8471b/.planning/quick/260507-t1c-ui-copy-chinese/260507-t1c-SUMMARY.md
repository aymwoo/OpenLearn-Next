---
phase: quick
plan: 1
subsystem: "ui-copy-localization"
tags:
  - "ui"
  - "copy"
  - "localization"
  - "planning"
dependencies:
  requires:
    - "existing home, class-management, settings and teacher shell surfaces"
  provides:
    - "simplified chinese user-facing copy across touched pages"
    - "project convention for chinese-first UI text"
  affects:
    - "src/components/surfaces/class-management-surface.tsx"
    - "src/components/surfaces/home-surface.tsx"
    - "src/components/home/home-login-card.tsx"
    - "src/components/surfaces/settings-surface.tsx"
    - "src/components/surfaces/settings-surface.test.tsx"
    - "src/components/shell/sidebar.tsx"
    - "src/app/(teacher)/teacher/layout.tsx"
    - "src/app/layout.tsx"
    - "src/app/(auth)/login/LoginForm.tsx"
    - "src/app/(auth)/login/TestAccountHint.tsx"
    - "src/lib/auth/auth.ts"
    - ".planning/CONVENTIONS.md"
    - ".planning/STATE.md"
key-decisions:
  - "在 init.quick 未返回 slug/task_dir 时，按现有 .planning/quick 目录模式手动补齐 260507-t1c 任务目录并继续执行。"
  - "本次仅替换用户可见英文文案，不改动现有页面结构、交互和数据流。"
  - "将简体中文设为默认界面语言，并写入 .planning/CONVENTIONS.md 与 STATE 决策记录。"
metrics:
  tasks-completed: 3
  files-modified: 13
  date-completed: "2026-05-07"
status: complete
---

# Phase quick Plan 1: Chinese UI copy alignment summary

已将当前工作区内已发现的用户可见英文文案继续替换为简体中文，并补充后续界面默认使用中文的项目约定。

## Completed Tasks

1. 统一替换首页、登录卡、登录页、班级管理页、设置页与教师端壳层中的残留英文文案。
2. 同步更新 `settings-surface.test.tsx` 中依赖用户可见文案的字符串断言。
3. 新增 `.planning/CONVENTIONS.md`，明确界面默认使用简体中文，并在 `.planning/STATE.md` 记录本次 quick 结果。

## Verification

1. `pnpm exec eslint "src/app/(auth)/login/LoginForm.tsx" "src/app/(auth)/login/TestAccountHint.tsx" "src/components/surfaces/class-management-surface.tsx" "src/components/surfaces/home-surface.tsx" "src/components/home/home-login-card.tsx" "src/components/surfaces/settings-surface.tsx" "src/components/surfaces/settings-surface.test.tsx" "src/components/shell/sidebar.tsx" "src/app/(teacher)/teacher/layout.tsx" "src/app/layout.tsx"`
2. `pnpm exec vitest run "src/components/surfaces/settings-surface.test.tsx"`

## Known gaps

1. 仓库中仍存在部分非界面文本英文，例如开发日志、控制台报错、MCP 集成名称等；本次未改动这些非用户可见或非本任务范围内容。
