---
status: resolved
trigger: /gsd-debug 排查并修复运行时报错：select user.studentNumber 失败，发生在 getCurrentUserDTO -> TeacherLayoutContent。重点确认最近 /teacher/classes 改造新增的 users.studentNumber 字段是否已进入 schema 但未同步到 SQLite，并在最小正确范围内修复当前环境，让应用恢复可运行。
created: 2026-05-11
updated: 2026-05-14T16:30:00Z
---

## Current Focus

hypothesis: 已关闭。该问题已被定位为本地 SQLite schema 漂移，并已完成环境级最小修复。
test: 对照已有 resolution 记录，确认 `user.studentNumber` 列与唯一索引已经补齐，当前 debug 条目应从 fixing 收口到 resolved。
expecting: debug 条目反映“已解决的环境问题”，而不是继续显示 fixing。
next_action: none

## Symptoms

- expected: 教师端布局可正常加载，`getCurrentUserDTO -> TeacherLayoutContent` 不应因读取用户信息报错。
- actual: 运行时报错，`select user.studentNumber` 失败。
- errors: `select user.studentNumber` 失败，发生在 `getCurrentUserDTO -> TeacherLayoutContent`。
- reproduction: 访问教师端布局，触发 `getCurrentUserDTO()` 查询当前用户。

## Evidence

- timestamp: 2026-05-11
  checked: `src/db/schema.ts`
  found: `users.studentNumber` 已在 schema 中声明。
  implication: 代码预期该列存在，问题优先怀疑本地 DB 未同步。

- timestamp: 2026-05-11
  checked: `src/lib/dal/auth.ts`
  found: `getCurrentUserDTO()` 通过 Drizzle 查询整行用户记录。
  implication: 一旦数据库缺列，整行查询会直接触发 SQL 报错。

- timestamp: 2026-05-11
  checked: `sqlite3 local.db "PRAGMA table_info('user');"`
  found: 当前开发库最初仅有 `id,name,email,emailVerified,image,password`，缺少 `studentNumber`。
  implication: 根因是 schema 与本地 SQLite 结构不一致，不是 TeacherLayoutContent 自身逻辑问题。

## Eliminated

- hypothesis: `TeacherLayoutContent` 本身新增了直接读取 `studentNumber` 的逻辑。
  reason: 布局只调用 `getCurrentUserDTO()`；真正失败点在底层 `users` 表结构不匹配。

## Resolution

root_cause:
  `src/db/schema.ts` 已新增 `users.studentNumber`，但当前开发库 `local.db` 的 `user` 表未执行同步，导致 `getCurrentUserDTO()` 通过 Drizzle 读取整行时生成 `select user.studentNumber` 并命中不存在列。
fix:
  在当前环境对 `local.db` 执行最小 schema 修复，补充 `user.studentNumber` 列并创建唯一索引 `user_studentNumber_unique`。
verification:
  `sqlite3 local.db "PRAGMA table_info('user'); PRAGMA index_list('user');"` 已显示 `studentNumber` 字段和唯一索引；`pnpm exec drizzle-kit push` 返回 `No changes detected`。
files_changed:
  - `.planning/debug/teacher-layout-studentnumber.md`
