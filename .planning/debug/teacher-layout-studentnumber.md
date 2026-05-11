---
status: fixing
trigger: /gsd-debug 排查并修复运行时报错：select user.studentNumber 失败，发生在 getCurrentUserDTO -> TeacherLayoutContent。重点确认最近 /teacher/classes 改造新增的 users.studentNumber 字段是否已进入 schema 但未同步到 SQLite，并在最小正确范围内修复当前环境，让应用恢复可运行。
created: 2026-05-11
updated: 2026-05-11
---

## Symptoms

- Expected: 教师端布局可正常加载，`getCurrentUserDTO -> TeacherLayoutContent` 不应因读取用户信息报错。
- Actual: 运行时报错，`select user.studentNumber` 失败。
- Error Messages: `select user.studentNumber` 失败，发生在 `getCurrentUserDTO -> TeacherLayoutContent`。
- Timeline: 与最近 `/teacher/classes` 改造后新增 `users.studentNumber` 字段相关。
- Reproduction: 访问教师端布局，触发 `getCurrentUserDTO()` 查询当前用户。

## Current Focus

- hypothesis: `src/db/schema.ts` 已新增 `users.studentNumber`，但当前 `local.db` 的 `user` 表未同步该列，导致 Drizzle 查询整行时访问不存在字段。
- test: 检查 schema 与 `local.db` 的 `PRAGMA table_info('user')` 是否不一致，并在最小范围内补齐列后验证查询可执行。
- expecting: `user` 表缺少 `studentNumber`，补列后查询恢复。
- next_action: 为当前本地 SQLite 添加 `studentNumber` 列与唯一索引，并验证表结构。

## Evidence

- timestamp: 2026-05-11 `src/db/schema.ts` 第 10 行已声明 `studentNumber: text("studentNumber").unique()`。
- timestamp: 2026-05-11 `src/lib/dal/auth.ts` 通过 `db.query.users.findFirst()` 读取整行用户记录。
- timestamp: 2026-05-11 `sqlite3 local.db "PRAGMA table_info('user');"` 显示当前仅有 `id,name,email,emailVerified,image,password`，缺少 `studentNumber`。

## Eliminated

- hypothesis: `TeacherLayoutContent` 本身新增了直接读取 `studentNumber` 的逻辑。
  reason: 布局只调用 `getCurrentUserDTO()`，真正失败点在底层 `users` 表结构不匹配。

## Resolution

- root_cause: `src/db/schema.ts` 已新增 `users.studentNumber`，但当前开发库 `local.db` 的 `user` 表未执行同步，导致 `getCurrentUserDTO()` 通过 Drizzle 读取整行时生成 `select user.studentNumber` 并命中不存在列。
- fix: 在当前环境对 `local.db` 执行最小 schema 修复，补充 `user.studentNumber` 列并创建唯一索引 `user_studentNumber_unique`。
- verification: `sqlite3 local.db "PRAGMA table_info('user'); PRAGMA index_list('user');"` 已显示 `studentNumber` 字段和唯一索引；`pnpm exec drizzle-kit push` 返回 `No changes detected`。
- files_changed: `.planning/debug/teacher-layout-studentnumber.md`
