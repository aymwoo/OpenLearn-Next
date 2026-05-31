---
phase: quick
plan: 260510-bxx
status: complete
---

# Quick summary

已完成：统一教师端、学生端、设置页的外部主题壳层，使其对齐首页的新视觉语言。

- 新增 `AuroraShell` 作为首页同款深色 aurora 背景与 glow backdrop。
- 教师端 `TeacherSidebarShell` 改为在 aurora 舞台上承载现有 sidebar 与内容层，页面头部切换为深色 hero 卡片。
- 学生端新增 `StudentShell`，统一使用深色玻璃导航和外层 framing，同时保留内部学习卡片的浅色 tonal 阅读层。
- 设置页通过现有教师壳层自动继承同一主题舞台，无需重写内部业务 surface。

验证：`pnpm typecheck`
