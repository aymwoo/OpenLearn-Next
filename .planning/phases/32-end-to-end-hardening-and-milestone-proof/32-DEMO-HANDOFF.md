# Phase 32 Demo Handoff

本文件固定描述 Phase 32 canonical runtime proof 的 repo-local 演示路径。
按这里执行即可，不需要再 reverse-engineer 代码或自行猜测入口。

## 1. Bootstrap

先在仓库根目录执行：

```bash
pnpm db:bootstrap:dev
```

该命令会准备 deterministic demo 数据，包括测试学校、班级、课程、已发布课时与
canonical runtime proof lesson。

## 2. 登录账号

| 角色 | 账号 | 密码 | 用途 |
| --- | --- | --- | --- |
| Teacher | `teacher@example.com` | `password` | 执行 editor/publish、launch/classroom、inspector drill-down |
| Student | `student@example.com` | `password` | 在 runtime 中完成真实互动并提交 proof |

## 3. Canonical proof chain

按以下顺序演示，不要跳步骤：

1. **editor/publish**
   - 使用 `teacher@example.com` 登录。
   - 打开开发测试课程中的开发测试课时。
   - 确认课时包含“互动证明：HTML 课件实验”环节，并保持已发布状态。
2. **launch/classroom**
   - 进入 `/teacher/launch`。
   - 选择开发测试课时与开发测试班级，点击主 CTA **开启新课堂**。
   - launch surface 上会看到次级 proof affordance，提示可用 seeded demo 跑完整 proof。
3. **student submit**
   - 使用学生登录标识 `student@example.com` 登录并进入当前学生课堂。
   - 在 HTML runtime 中完成真实互动并提交。
   - 成功后学生停留在 terminal success state，看到本次提交摘要。
4. **classroom first-feedback**
   - 回到教师 `/classroom`。
   - 当前运行面板会先显示 proof 成功或异常提示，这是教师的第一反馈面。
5. **inspector drill-down**
   - 如需复核 proof timeline 或排查异常，从 `/classroom` 中的次级 CTA 进入 inspector。
   - inspector 会带上对应的 `runtimeSessionId`，直接打开当前 proof 会话。

## 4. 标准排障第二步

当 `/classroom` 已提示当前互动结果异常时，标准第二步是：

1. 记录课堂面板暴露的异常提示。
2. 使用该 proof 对应的 `runtimeSessionId` 打开：
   - `/settings/labs/runtime-inspector?runtimeSessionId=...`
3. 在 inspector 中查看统一 timeline，重点确认：
   - runtime interaction / submit truth
   - governance decision
   - transport trace
   - consumer trace

这里的 **第二步** 固定是 inspector second-step drill-down；不是让教师直接离开
classroom 去找新的 dashboard。

## 5. 关键演示口径

- canonical proof 只认这一条链路：`editor/publish` -> `launch/classroom` -> `student submit` -> `classroom first-feedback` -> `inspector drill-down`
- 教师先在 `/classroom` 看 proof 成功或异常，再决定是否继续查看 inspector
- inspector deep link 依赖 `runtimeSessionId`，不是手动在列表里碰运气查找

## 6. Out of scope

以下内容明确不属于本次 demo handoff：

- 不做 PostgreSQL cutover
- 不做 Redis cutover
- 不做 WebSocket cutover
- 不新增 milestone dashboard 或其他 demo dashboard
- 不把 `player-direct` 作为 canonical proof 主路径
