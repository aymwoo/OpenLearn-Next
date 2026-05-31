---
phase: quick
plan: 260512-md-plugin-classroom-sync
status: complete
---

# Quick summary

已完成：Markdown 课件能力已经作为现有 lesson step 体系内的正式教学内容落地，支持 Mermaid、RevealJS、教师编辑上传，以及课堂中的教师端广播与学生端跟随同步。

## What changed

1. `src/lib/dto/lesson-authoring.ts`、`src/lib/dto/resource-ai.ts` 与相关 DAL 现在支持 `markdownDeck`、`renderMode`、`mermaidEnabled` 等 contract，并把 Markdown 课件作为 built-in teaching step 暴露给编排器。
2. `src/components/authoring/lesson-step-editor.tsx` 提供 Markdown 文件上传、源码编辑、文档/Reveal 模式切换和预览。
3. `src/components/markdown/markdown-renderer.tsx`、`src/components/classroom/classroom-control-panel.tsx`、`src/components/learning/classroom-runtime-client.tsx` 与 classroom DAL 一起实现教师 slide state 广播、学生端 locked/unlocked 跟随和安全渲染边界。

## Verification

- `./node_modules/.bin/vitest run src/components/markdown/markdown-renderer.test.tsx src/components/authoring/lesson-step-editor.test.tsx src/components/classroom/classroom-roster-panel.test.tsx src/components/learning/student-step-cards.test.ts`
- `./node_modules/.bin/vitest run src/lib/dal/plugins.builtins.test.ts src/lib/dto/learning.test.ts`
