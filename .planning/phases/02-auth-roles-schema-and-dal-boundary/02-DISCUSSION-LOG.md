# Phase 2: Auth, roles, schema, and DAL boundary - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-04T23:03:03+08:00
**Phase:** 02-auth-roles-schema-and-dal-boundary
**Areas discussed:** 登录方式与入口, 角色与学校模型, 路由保护策略, DAL/DTO 边界

---

## 登录方式与入口

| Option | Description | Selected |
|--------|-------------|----------|
| 邮箱密码优先 | 最适合开源自托管和学校本地部署；OAuth 可后续接入 | ✓ |
| OAuth 优先 | 适合接第三方身份源，但首发配置复杂、依赖外部 provider | |
| 演示账号优先 | 便于试用，但不能作为真实学校登录基础 | |

**User's choice:** 邮箱密码优先
**Notes:** 首页教师/学生登录 CTA 进入 auth 时携带角色意图；注册/入校由管理员预置；登录后按真实 membership 落点。

---

## 角色与学校模型

| Option | Description | Selected |
|--------|-------------|----------|
| 管理员教师学生 | admin/teacher/student 首发可登录；parent/developer/agent 只做模型预留 | ✓ |
| 只教师学生 | 更小，但缺少学校初始化和用户管理入口 | |
| 全部角色 | 覆盖完整愿景，但超出 Phase 2/UI 范围 | |

**User's choice:** 管理员教师学生
**Notes:** 使用 School + Membership；建最小 classes/classMembers；未来角色 enum/schema 预留但默认禁用或无 UI。

---

## 路由保护策略

| Option | Description | Selected |
|--------|-------------|----------|
| 工作区全保护 | /teacher、/student、/classroom、/admin 及相关 API 需要登录；/、/courses、/resources 可公开或后续按权限细化 | ✓ |
| 全部产品路由保护 | 更安全，但课程/资源公共预览会被关掉 | |
| 只 admin 保护 | 太宽松，不符合角色工作区要求 | |

**User's choice:** 工作区全保护
**Notes:** 未登录保留 callbackUrl；角色不匹配显示权限页并支持切换/回默认工作区；proxy.ts 只做会话和粗角色路径保护。

---

## DAL/DTO 边界

| Option | Description | Selected |
|--------|-------------|----------|
| auth+org+profiles | 覆盖 auth session、user profile、school membership、class membership；课程/课时 DAL 留到 Phase 3 | ✓ |
| 只 auth DAL | 太窄，无法支持角色工作区和保护策略 | |
| 全业务 DAL | 会侵入 Phase 3-6 的课程/学习/AI 范围 | |

**User's choice:** auth+org+profiles
**Notes:** UI 只拿最小安全 DTO；Actions 负责 active context/profile/admin 预置成员写入；通过 server-only + lint/verify guard 强制 UI 不直连数据库。

## the agent's Discretion

Planner/researcher 可决定具体文件名、table column 命名、Zod schema 拆分、seed 脚本组织、测试文件组织和错误码细节。

## Deferred Ideas

- 开放注册和邀请码管理。
- OAuth/SAML/SSO provider 首发接入。
- parent/developer/AI Agent 真实工作区。
- 课程、课时、进度、提交、课堂、AI/RAG、MCP、插件、主题的完整业务数据访问。
