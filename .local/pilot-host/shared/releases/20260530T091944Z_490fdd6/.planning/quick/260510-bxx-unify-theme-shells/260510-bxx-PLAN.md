---
phase: quick
plan: 260510-bxx
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/shell/aurora-shell.tsx
  - src/components/shell/student-shell.tsx
  - src/components/shell/teacher-sidebar-shell.tsx
  - src/app/(student)/student/layout.tsx
  - src/app/settings/layout.tsx
  - src/app/(teacher)/teacher/page.tsx
autonomous: true
requirements:
  - QUICK-unify-theme-shells
---

<objective>
将教师端、学生端、设置页统一到首页刚完成的新主题风格，优先统一外部舞台层而不是重写各业务 surface。
</objective>

<success_criteria>
- [ ] 教师端壳层继承首页的深色 aurora 背景与玻璃 framing
- [ ] 学生端拥有同主题导航与外层舞台，但内部学习卡片继续保持浅色阅读层
- [ ] 设置页通过同一教师壳层自然继承新主题
</success_criteria>
