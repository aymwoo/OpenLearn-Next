# Phase 59: Deploy, Release & Recovery Baseline - Research

**Researched:** 2026-05-26
**Domain:** single-node pilot deployment, release gating, backup/restore, rollback discipline
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Deploy topology and environment baseline
- **D-59-01:** Phase 59 的官方试点部署基线固定为 **single-node dual-process**：同一台主机上运行 `web` 与 `worker` 两个长期进程，而不是把容器编排或平台托管当成主路线。
- **D-59-02:** `web` 继续复用现有 `server.ts` / `pnpm start`，`worker` 继续复用现有 `src/server/workers/async-task-worker.ts` / `pnpm worker:start`；Phase 59 不重写服务宿主。
- **D-59-03:** Redis 在 Phase 59 中的正式地位固定为：**BullMQ worker 的正式依赖，classroom Redis fanout 继续保持 optional / deploy-authoritative posture**。缺失 Redis 时不能把 worker 假装 ready，但 fanout 仍允许 degraded-visible 而非 release blocker。
- **D-59-04:** Phase 59 的官方 deploy artifact 主路线固定为 **systemd + shell scripts**；不把 Docker/compose 作为主交付物，也不接受“只写文档不交付可执行基线”。
- **D-59-05:** env discipline 必须通过正式 env schema 与 `.env.example` 收敛；敏感配置不能继续散落在 source 中的 `process.env` 约定或只存在 `.env.local`。

### Release gate and traceability posture
- **D-59-06:** 每次 pilot release 的唯一主记录固定为 **Git SHA + release manifest**；manifest 必须串起 release 时间、目标环境、migration、gate 结果与操作者，而不是只靠 git tag 或外部平台日志。
- **D-59-07:** 发布前 hard gate 固定包含：`lint`、`typecheck`、`build`、关键测试 / phase verifier、migration gate、post-deploy health/ready gate；这些任一失败都不能算作 release 完成。
- **D-59-08:** migration 必须属于正式 release gate，而不是部署后补跑或由 operator 手工执行的松散步骤。
- **D-59-09:** 如果 migration 或 post-deploy `health/ready` 失败，官方默认动作固定为 **立即回滚到上一个 green release**；不能允许失败 release 带病停留在线上观察。
- **D-59-10:** rollback 必须绑定上一份 green release manifest 与 post-rollback verification，满足 `55-FAILURE-RECOVERY-MATRIX.md` 中的 rollback trigger/post-rollback verification 语义。

### Health and readiness contract
- **D-59-11:** `health` 与 `ready` 采用明确分工：`health = process alive`，`ready = safe to receive pilot traffic`；Phase 59 不做 only-ready 模型，也不让两者都承担同样的全量检查。
- **D-59-12:** `/api/ready` 的 blocking 子系统固定包括：`SQLite / DB`、`web app runtime`、`worker/BullMQ posture`。这些任何一项不 green，都必须让系统 not-ready。
- **D-59-13:** Redis fanout 不进入 Phase 59 的 ready hard gate；它继续保持 optional posture，但必须在 health/ready 响应中以 **non-blocking degraded** 的方式诚实暴露。
- **D-59-14:** health/ready 的返回内容必须服务于 release gate 与 restore verification：不仅给 pass/fail，还要明确组件级 posture，避免 operator/release owner 只能看到布尔值却无法解释失败原因。

### Backup, restore, and recovery baseline
- **D-59-15:** Phase 59 的官方备份对象固定为 **SQLite + 上传/运行资产 + env template**。只备份 SQLite 不足以支撑单校试点恢复；但真实 secrets 不进入备份快照。
- **D-59-16:** SAFE-03 的 restore drill 验收最低标准固定为：**post-restore health/ready green + 样板链路 smoke 通过**；不能只做 DB restore 或 only-health smoke。
- **D-59-17:** 如果 restore drill 或 post-restore smoke 失败，该结果必须被视为 **release blocker**，不能仅记录风险后继续把当前基线宣称为 pilot-ready。
- **D-59-18:** backup / restore posture 必须继续以 SQLite + DAL 作为 canonical truth 中心设计；Redis、WebSocket、BullMQ 都只能在恢复后重新附着，不能反过来决定恢复是否成功。

### the agent's Discretion
- systemd unit 的具体命名、shell script 文件名、目录布局、以及 release manifest 的字段顺序，可由 planner 在不违背 D-59-01 至 D-59-10 的前提下做最小正确收敛。
- env schema 的技术实现可采用集中式 `zod` env module、server/public split 或等价 server-owned 封装，只要满足 `.env.example`、startup validation 与敏感变量不外泄即可。
- health/ready 的 JSON shape、component label 命名、以及 non-blocking degraded 字段名可由 planner 结合现有 operator honesty vocabulary 收敛，但不能把 optional fanout 重新变成隐形状态。
- backup/restore 的具体工具链（例如脚本编排、备份文件命名、资产目录约定）可由 researcher / planner 依据当前仓库与单机试点 posture 做最小实现，但必须满足 D-59-15 至 D-59-18 的验收线。

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ENVR-01 | 环境变量必须通过正式 env schema 与 `.env.example` 收敛，避免手改常量上线。 | 采用现有 `zod@4.4.3` 构建单一 server-owned env 模块；补 `.env.example` 与 startup validation。 [VERIFIED: npm registry] [CITED: https://github.com/colinhacks/zod/blob/v4.0.1/README.md] |
| ENVR-02 | CI/CD 必须覆盖 lint、typecheck、test、build、migrate 与 health-check gate。 | 仓库已有 `lint`/`typecheck`/`test`/`build`/`db:migrate`/phase verifier 脚本，可直接编排为 GitHub Actions gate。 [CITED: /home/wuxf/Develop/OpenLearn-Next/package.json] [CITED: https://docs.github.com/en/actions/writing-workflows/about-workflows] |
| ENVR-03 | 发布必须具备 release traceability、rollout checklist 与 rollback checklist。 | 用 Git SHA + release manifest + post-deploy health/ready + rollback checklist 形成单一 release truth。 [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/59-deploy-release-recovery-baseline/59-CONTEXT.md] [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/55-pilot-scope-and-acceptance-gate/55-FAILURE-RECOVERY-MATRIX.md] |
| SAFE-03 | SQLite 与附加资产必须具备备份恢复、restore drill 与恢复后校验。 | 采用 SQLite `VACUUM INTO` 或 Online Backup API 生成一致性快照，并在 restore 后执行 `PRAGMA integrity_check` / `foreign_key_check` + app health/ready + sample smoke。 [CITED: https://www.sqlite.org/backup.html] [CITED: https://www.sqlite.org/lang_vacuum.html] [CITED: https://www.sqlite.org/pragma.html#pragma_integrity_check] |
| OPS-01 | operator 必须能按 school / classroom / lesson version / plugin / action / command / task 关联定位问题。 | health/ready 与 release manifest 需复用现有 operator honesty vocabulary、worker heartbeat、transport degraded posture，不能只给布尔值。 [CITED: /home/wuxf/Develop/OpenLearn-Next/src/lib/dto/operator-honesty.ts] [CITED: /home/wuxf/Develop/OpenLearn-Next/src/lib/dal/async-task-operator.ts] [CITED: /home/wuxf/Develop/OpenLearn-Next/src/lib/dal/system-transport-settings.ts] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- 必须继续使用 Next.js 16 App Router、React 19.2、Turbopack、Auth.js v5、Drizzle ORM、SQLite 首发。 [CITED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- UI 组件禁止直连数据库；所有读写必须经 DAL 和 Server Actions。 [CITED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- 主运行时必须是 Node.js 20.9+；Edge Runtime 仅用于 SSE。 [CITED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- Next.js 16 必须显式缓存，写后必须更新或失效 tag。 [CITED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- SQLite 是唯一首发数据库；关系必须 `cascade delete`。 [CITED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- 插件禁止 `eval()`、动态执行第三方代码、直接访问 DB 或核心 API。 [CITED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]
- 本阶段做文档产物时可直接写文件；GSD workflow 限制针对实现改码，不阻止本 research 产物写入。 [CITED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md]

## Summary

本阶段不需要重新研究“怎么托管 Next.js 应用”，而是要把**现有 custom Node server + worker + SQLite + BullMQ**收敛成可重复交付的单校试点基线。仓库已经有 `pnpm start`、`pnpm worker:start`、`pnpm db:migrate`、Vitest、phase verifier、worker heartbeat、Redis degraded posture 与 operator honesty vocabulary；但还**没有** `.env.example`、正式 env schema、GitHub Actions workflow、`/api/health`、`/api/ready`、release manifest、systemd units、deploy/rollback/backup/restore scripts。 [CITED: /home/wuxf/Develop/OpenLearn-Next/package.json] [CITED: /home/wuxf/Develop/OpenLearn-Next/src/features/async-tasks/worker/bootstrap.ts] [CITED: /home/wuxf/Develop/OpenLearn-Next/src/lib/dal/system-transport-settings.ts] [CITED: /home/wuxf/Develop/OpenLearn-Next/src/lib/dto/operator-honesty.ts] [CITED: /home/wuxf/Develop/OpenLearn-Next/next.config.ts] [CITED: /home/wuxf/Develop/OpenLearn-Next/src/app/api/classroom/[sessionId]/events/route.ts]

最关键的规划结论有三条。第一，**不要把 Docker / standalone output 当主路线**：锁定决策已经把主交付物定为 `systemd + shell scripts`，而 Next.js 官方文档明确说明 custom server 与 standalone output 不兼容。 [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/59-deploy-release-recovery-baseline/59-CONTEXT.md] [CITED: https://nextjs.org/docs/app/guides/self-hosting] [CITED: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/02-guides/custom-server.mdx]

第二，**发布 gate 必须独立于 Next build**：当前 `next.config.ts` 设了 `typescript.ignoreBuildErrors = true`，因此 `next build` 不是可靠的 type gate，必须单独执行 `pnpm typecheck`。第三，**restore 成功的定义必须是 app-level green，不是文件级 green**：SQLite 官方推荐用 Online Backup API 或 `VACUUM INTO` 备份 live DB，恢复后还要跑 `PRAGMA integrity_check` / `foreign_key_check`，再叠加 app `health/ready` 与样板 smoke。 [CITED: /home/wuxf/Develop/OpenLearn-Next/next.config.ts] [CITED: https://www.sqlite.org/backup.html] [CITED: https://www.sqlite.org/lang_vacuum.html] [CITED: https://www.sqlite.org/pragma.html#pragma_integrity_check]

**Primary recommendation:** 用“`Zod env schema + .env.example + systemd unit + shell deploy/rollback/backup/restore scripts + GitHub Actions hard gate + health/ready/release manifest`”作为 Phase 59 的唯一标准交付面。 [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/59-deploy-release-recovery-baseline/59-CONTEXT.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| env schema / startup validation | API / Backend | Frontend Server (SSR) | 变量在 Node 启动与 server-side code 生效，不能由浏览器决定。 [CITED: https://nextjs.org/docs/app/guides/self-hosting] |
| web process liveness (`/api/health`) | Frontend Server (SSR) | API / Backend | 这是 web 进程与 Next request handler 的存活检查。 [CITED: /home/wuxf/Develop/OpenLearn-Next/server.ts] |
| traffic readiness (`/api/ready`) | API / Backend | Frontend Server (SSR) | `ready` 要聚合 DB、worker posture、runtime checks，属于服务端综合判定。 [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/59-deploy-release-recovery-baseline/59-CONTEXT.md] |
| migration gate | Database / Storage | API / Backend | 迁移改变 durable schema，必须在 DB tier 先完成，再放行应用流量。 [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/59-deploy-release-recovery-baseline/59-CONTEXT.md] |
| release manifest / traceability | API / Backend | Database / Storage | manifest 是 release orchestration truth，不是前端职责。 [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/59-deploy-release-recovery-baseline/59-CONTEXT.md] |
| worker readiness | API / Backend | Database / Storage | worker posture 来自 BullMQ connection snapshot + durable heartbeat。 [CITED: /home/wuxf/Develop/OpenLearn-Next/src/lib/dal/async-task-operator.ts] [CITED: /home/wuxf/Develop/OpenLearn-Next/src/features/async-tasks/infra/heartbeat.ts] |
| fanout degraded visibility | API / Backend | Frontend Server (SSR) | Redis fanout 是 optional capability；状态需服务端探测并诚实暴露。 [CITED: /home/wuxf/Develop/OpenLearn-Next/src/lib/dal/system-transport-settings.ts] |
| SQLite backup / restore | Database / Storage | API / Backend | durable truth 在 SQLite；恢复必须 truth-first。 [CITED: /home/wuxf/Develop/OpenLearn-Next/src/db/index.ts] [CITED: https://www.sqlite.org/backup.html] |
| post-restore smoke | Frontend Server (SSR) | API / Backend | 最后验证必须从真实 app ingress 进入，证明系统可对外服务。 [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/55-pilot-scope-and-acceptance-gate/55-FAILURE-RECOVERY-MATRIX.md] |

## Standard Stack

### Core
| Library / Tool | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zod | `4.4.3` | env schema、startup validation、health payload parsing | 仓库已安装且 npm latest 仍是 `4.4.3`，可直接用 `safeParse`/`parse` 做环境变量与 contract 校验。 [VERIFIED: npm registry] [CITED: https://github.com/colinhacks/zod/blob/v4.0.1/README.md] |
| Next.js | `16.2.x` (repo `16.2.4`, latest `16.2.6`) | self-hosted web runtime | 项目已固定 Next 16；官方 self-hosting 文档直接覆盖 runtime env、deploymentId、graceful shutdown、reverse proxy。 [CITED: /home/wuxf/Develop/OpenLearn-Next/package.json] [VERIFIED: npm registry] [CITED: https://nextjs.org/docs/app/guides/self-hosting] |
| systemd service units | `260` available locally | long-running process supervision for `web` and `worker` | 锁定决策指定主交付物就是 `systemd + shell scripts`，且 systemd 原生提供 `Type=exec`、restart、start/stop timeout、`ExecStartPre/Post`。 [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/59-deploy-release-recovery-baseline/59-CONTEXT.md] [CITED: https://man7.org/linux/man-pages/man5/systemd.service.5.html] [VERIFIED: local environment] |
| sqlite3 CLI | `3.53.1` available locally | backup/restore validation and DB integrity checks | 本机可直接运行 SQLite CLI，适合 restore drill 后执行 `PRAGMA integrity_check` / `foreign_key_check`。 [VERIFIED: local environment] [CITED: https://www.sqlite.org/pragma.html#pragma_integrity_check] |
| GitHub Actions workflows | current docs | CI gate orchestration | 官方要求 workflow 文件位于 `.github/workflows/`，适合将现有 repo-local scripts 收敛成 release hard gate。 [CITED: https://docs.github.com/en/actions/writing-workflows/about-workflows] |

### Supporting
| Library / Tool | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Bash | `5.3.9` available locally | deploy/rollback/backup/restore orchestration | 用于 single-node 脚本化操作、manifest 落盘、systemctl 封装。 [VERIFIED: local environment] |
| curl | `8.20.0` available locally | post-deploy `health/ready` gate | 发布脚本与 CI 里直接探测 HTTP surfaces。 [VERIFIED: local environment] |
| tar | `1.35` available locally | runtime assets archive baseline | 当“附加资产”不适合放进 SQLite 时，用 tar 形成简单可恢复归档。 [VERIFIED: local environment] |
| BullMQ | repo `5.76.10`, latest `5.77.3` | worker runtime dependency | 本阶段不升级架构，只把现有 worker posture 纳入 ready gate。 [CITED: /home/wuxf/Develop/OpenLearn-Next/package.json] [VERIFIED: npm registry] |
| ioredis | repo `5.10.1`, latest `5.10.1` | Redis connectivity for worker/fanout checks | 用已有连接健康快照复用，不新增第二套探针。 [CITED: /home/wuxf/Develop/OpenLearn-Next/package.json] [VERIFIED: npm registry] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| local `zod` env module | `@t3-oss/env-nextjs` or similar | 本阶段不需要再引入 env abstraction；现有 `zod` 足够，且减少新增依赖面。 [ASSUMED] |
| systemd + shell | Docker Compose | Docker 可作为本机 Redis fallback，但与锁定主路线冲突，不能成为官方交付物。 [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/59-deploy-release-recovery-baseline/59-CONTEXT.md] |
| SQLite `VACUUM INTO` / backup API | 直接 `cp` 活跃数据库文件 | 官方文档明确 backup API / `VACUUM INTO` 更适合 live DB；直接复制在活跃写入时风险更高。 [CITED: https://www.sqlite.org/backup.html] [CITED: https://www.sqlite.org/lang_vacuum.html] |

**Installation:**
```bash
# No new runtime npm package is required for the baseline.
# Reuse the existing repo dependency set.
pnpm install
```

**Version verification:**
- `zod@4.4.3` is current and was published on `2026-05-04`. [VERIFIED: npm registry]
- `next@16.2.6` is current and was published on `2026-05-07`; repo is on `16.2.4`, so this phase should reuse the existing pin unless a separate upgrade phase is opened. [VERIFIED: npm registry]
- `drizzle-orm@0.45.2` was published on `2026-03-27`; repo already matches it. [VERIFIED: npm registry]
- `drizzle-kit@0.31.10` was published on `2026-03-17`; repo already matches it. [VERIFIED: npm registry]
- `bullmq@5.77.3` was published on `2026-05-25`; repo is one patch behind on `5.76.10`, but Phase 59 does not need a queue-library upgrade to meet requirements. [VERIFIED: npm registry]
- `ioredis@5.10.1` was published on `2026-03-19`; repo already matches it. [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
operator / CI / release-owner
        |
        v
deploy.sh / rollback.sh / backup.sh / restore.sh
        |
        +--> preflight: env schema parse -> fail fast
        |
        +--> build gate: lint -> typecheck -> test -> build -> verifier
        |
        +--> migrate gate: pnpm db:migrate
        |
        +--> systemd restart: openlearn-web + openlearn-worker
        |
        +--> post-deploy gate: /api/health -> /api/ready
        |                               |
        |                               +--> DB probe
        |                               +--> web runtime probe
        |                               +--> worker posture probe
        |                               +--> fanout degraded detail (non-blocking)
        |
        +--> release manifest write (git SHA, migration, actor, gate results)
        |
        +--> backup/restore drill
                |
                +--> SQLite snapshot
                +--> runtime asset archive
                +--> restore to drill target
                +--> sqlite integrity_check / foreign_key_check
                +--> /api/health + /api/ready + sample smoke
```

### Recommended Project Structure
```text
ops/
├── deploy/
│   ├── env.server.ts          # Zod env schema / startup validation entry
│   ├── deploy.sh              # release gate + systemd restart
│   ├── rollback.sh            # previous green release restore
│   ├── backup.sh              # SQLite + runtime assets backup
│   ├── restore.sh             # restore drill / real restore
│   └── verify-restore.sh      # sqlite + health/ready + sample smoke
├── releases/
│   ├── manifests/             # immutable release manifests
│   └── checklists/            # rollout / rollback checklist templates
└── systemd/
    ├── openlearn-web.service
    └── openlearn-worker.service

src/
├── app/api/health/route.ts    # process alive
├── app/api/ready/route.ts     # traffic readiness
├── app/api/release/route.ts   # version/manifest pointer (optional but useful)
└── lib/ops/                   # health/readiness/release DTO helpers

.github/
└── workflows/
    └── pilot-release.yml      # lint/typecheck/test/build/migrate/health gate
```

### Pattern 1: Zod-first env contract
**What:** 用单一 server-owned env module 在启动时 `safeParse` / `parse` 所有 server env。现有仓库已经安装 `zod`，无需新依赖。 [VERIFIED: npm registry] [CITED: /home/wuxf/Develop/OpenLearn-Next/package.json]

**When to use:** 所有 `web`、`worker`、deploy scripts、health/ready 共享的环境变量读取。 [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md]

**Example:**
```typescript
// Source: https://github.com/colinhacks/zod/blob/v4.0.1/README.md
import { z } from "zod";

const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().int().positive().default(3000),
  DB_FILE_NAME: z.string().min(1),
  AUTH_SECRET: z.string().min(1),
  ASYNC_TASKS_ENABLED: z.enum(["true", "false"]),
  BULLMQ_REDIS_URL: z.string().url().optional(),
  REDIS_FANOUT_ENABLED: z.enum(["true", "false"]).optional(),
  REDIS_URL: z.string().url().optional(),
  NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: z.string().min(1),
});

const parsed = ServerEnvSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(JSON.stringify(parsed.error.issues));
}

export const env = parsed.data;
```

### Pattern 2: Split `health` and `ready`
**What:** `health` 只回答“进程是否活着”；`ready` 才回答“是否可安全接 pilot 流量”。这是锁定决策，不要合并。 [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/59-deploy-release-recovery-baseline/59-CONTEXT.md]

**When to use:** deploy gate、rollback verification、restore drill。 [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/55-pilot-scope-and-acceptance-gate/55-FAILURE-RECOVERY-MATRIX.md]

**Example:**
```typescript
// Source anchors:
// - /home/wuxf/Develop/OpenLearn-Next/src/lib/dal/async-task-operator.ts
// - /home/wuxf/Develop/OpenLearn-Next/src/lib/dal/system-transport-settings.ts
export async function GET() {
  return Response.json({
    ok: true,
    kind: "health",
    process: "alive",
  });
}

// ready route should additionally aggregate:
// - SQLite connectivity
// - web runtime boot posture
// - worker BullMQ posture
// - fanout degraded detail (non-blocking)
```

### Pattern 3: release manifest as single release truth
**What:** 每次 release 结束时生成不可变 manifest，记录 Git SHA、环境、migration、gate 结果、操作者、回滚目标。 [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/59-deploy-release-recovery-baseline/59-CONTEXT.md]

**When to use:** rollout completed、rollback completed、restore drill completed。 [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md]

**Example:**
```json
{
  "releaseId": "2026-05-26T09-15-00Z_abc1234",
  "gitSha": "abc1234",
  "environment": "pilot-single-school",
  "migrations": {
    "command": "pnpm db:migrate",
    "status": "passed"
  },
  "gates": {
    "lint": "passed",
    "typecheck": "passed",
    "test": "passed",
    "build": "passed",
    "ready": "passed"
  },
  "operator": "user-id",
  "rollbackTarget": "previous-green-release-id"
}
```

### Pattern 4: SQLite restore = DB check + app check
**What:** restore 不是“文件解压成功”，而是 “SQLite checks + app checks + sample smoke 全绿”。 [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/59-deploy-release-recovery-baseline/59-CONTEXT.md] [CITED: https://www.sqlite.org/pragma.html#pragma_integrity_check]

**When to use:** 每次 restore drill、每次真实 restore、每次 rollback 后验证。 [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/55-pilot-scope-and-acceptance-gate/55-FAILURE-RECOVERY-MATRIX.md]

**Example:**
```bash
# Source:
# - https://www.sqlite.org/pragma.html#pragma_integrity_check
# - https://www.sqlite.org/lang_vacuum.html
sqlite3 "$DB_PATH" "PRAGMA integrity_check;"
sqlite3 "$DB_PATH" "PRAGMA foreign_key_check;"
curl -fsS "http://127.0.0.1:${PORT}/api/health"
curl -fsS "http://127.0.0.1:${PORT}/api/ready"
pnpm verify:phase57 && pnpm verify:phase58
```

### Anti-Patterns to Avoid
- **把 `next build` 当 type gate：** 当前 `next.config.ts` 已关闭 build 时类型阻断，必须单跑 `pnpm typecheck`。 [CITED: /home/wuxf/Develop/OpenLearn-Next/next.config.ts]
- **把 fanout 变成 ready blocker：** 锁定决策明确规定 fanout 只能 non-blocking degraded。 [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/59-deploy-release-recovery-baseline/59-CONTEXT.md]
- **让 worker 在无 Redis 时也显示 ready：** 当前 worker boot 明确在 `ASYNC_TASKS_ENABLED=false` 或缺失 `BULLMQ_REDIS_URL` 时不应当视为可运行。 [CITED: /home/wuxf/Develop/OpenLearn-Next/src/server/workers/async-task-worker.ts] [CITED: /home/wuxf/Develop/OpenLearn-Next/src/features/async-tasks/infra/connection.ts]
- **使用 standalone output 替代 custom server：** 官方文档指出 standalone 与 custom server 不兼容。 [CITED: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/02-guides/custom-server.mdx]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| live SQLite backup | 自己拼“暂停进程 + cp 文件 + 恢复”流程 | SQLite Online Backup API 或 `VACUUM INTO` | 官方已覆盖一致性快照语义，边界条件比手写文件复制更可靠。 [CITED: https://www.sqlite.org/backup.html] [CITED: https://www.sqlite.org/lang_vacuum.html] |
| process supervision | 自己写 while-loop restart shell daemon | `systemd` unit `Type=exec` + `Restart=` + timeout directives | systemd 原生就有启动失败检测、优雅终止、重启策略。 [CITED: https://man7.org/linux/man-pages/man5/systemd.service.5.html] |
| CI orchestration | 自己拼 ad-hoc release checklist 文档而无可执行 gate | GitHub Actions workflow + repo-local scripts | workflow YAML + 现有 `package.json` scripts 已足以形成 hard gate。 [CITED: https://docs.github.com/en/actions/writing-workflows/about-workflows] [CITED: /home/wuxf/Develop/OpenLearn-Next/package.json] |
| env validation | 散落的 `process.env.X ?? default` | centralized Zod env module | 当前仓库已出现散落 env 读取；集中 schema 更适合 startup fail-fast。 [CITED: /home/wuxf/Develop/OpenLearn-Next/server.ts] [CITED: /home/wuxf/Develop/OpenLearn-Next/src/features/async-tasks/infra/connection.ts] [CITED: /home/wuxf/Develop/OpenLearn-Next/src/features/runtime-platform/seams/transport/redis-fanout-connection.ts] |
| release traceability | 靠 tag、CI 页面、人工记忆 | manifest file bound to Git SHA | 锁定决策已要求 manifest 成为唯一主记录。 [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/59-deploy-release-recovery-baseline/59-CONTEXT.md] |

**Key insight:** 本阶段不缺“可用的底层工具”，缺的是**把现有 repo facts 变成唯一、可执行、可审计的 deploy contract**。 [CITED: /home/wuxf/Develop/OpenLearn-Next/package.json] [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/55-pilot-scope-and-acceptance-gate/55-PROOF-INVENTORY.md]

## Common Pitfalls

### Pitfall 1: `next build` 绿了，但类型其实没过
**What goes wrong:** 发布脚本只跑 `next build`，结果类型错误被 `ignoreBuildErrors` 吞掉。 [CITED: /home/wuxf/Develop/OpenLearn-Next/next.config.ts]
**Why it happens:** 当前 Next 配置明确允许 build 跳过 TS errors。 [CITED: /home/wuxf/Develop/OpenLearn-Next/next.config.ts]
**How to avoid:** CI/release gate 必须显式执行 `pnpm typecheck`。 [CITED: /home/wuxf/Develop/OpenLearn-Next/package.json]
**Warning signs:** `next build` 通过，但 `tsc --noEmit` 单跑失败。 [CITED: /home/wuxf/Develop/OpenLearn-Next/package.json]

### Pitfall 2: 把 custom server 错当成可以直接切 standalone
**What goes wrong:** 规划里要求 `.next/standalone/server.js`，却忽略项目已有 `server.ts` custom host。 [CITED: /home/wuxf/Develop/OpenLearn-Next/server.ts]
**Why it happens:** Next.js self-hosting 文档确实支持 standalone，但 custom server guide 明确说两者不兼容。 [CITED: https://nextjs.org/docs/app/guides/self-hosting] [CITED: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/02-guides/custom-server.mdx]
**How to avoid:** 继续用 `pnpm start` 运行 `server.ts`，不要在 Phase 59 夹带宿主重构。 [CITED: /home/wuxf/Develop/OpenLearn-Next/package.json] [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/59-deploy-release-recovery-baseline/59-CONTEXT.md]
**Warning signs:** 计划中出现 `output: 'standalone'`、`.next/standalone/server.js`、但又保留 `server.ts`。 [CITED: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/03-api-reference/05-config/01-next-config-js/output.mdx]

### Pitfall 3: `ready` 只看 web 进程，不看 worker posture
**What goes wrong:** web 能回 HTTP 200，但 worker 因 Redis 缺失根本没法处理 BullMQ 任务。 [CITED: /home/wuxf/Develop/OpenLearn-Next/src/server/workers/async-task-worker.ts]
**Why it happens:** 当前 worker enabled posture 依赖 `ASYNC_TASKS_ENABLED === true && BULLMQ_REDIS_URL present`。 [CITED: /home/wuxf/Develop/OpenLearn-Next/src/features/async-tasks/infra/connection.ts]
**How to avoid:** `/api/ready` 必须聚合 worker heartbeat + BullMQ connection snapshot。 [CITED: /home/wuxf/Develop/OpenLearn-Next/src/lib/dal/async-task-operator.ts]
**Warning signs:** ready payload里没有 `workerState`、`lastSeenAt`、`redisConfigured/redisReachable`。 [CITED: /home/wuxf/Develop/OpenLearn-Next/src/lib/dto/async-task-operator.ts]

### Pitfall 4: 把 optional fanout 误升格为 hard blocker
**What goes wrong:** Redis fanout degraded 导致 release 全阻断，违背 Phase 59 posture。 [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/59-deploy-release-recovery-baseline/59-CONTEXT.md]
**Why it happens:** 仓库同时存在 worker Redis 和 fanout Redis，两者语义不同。 [CITED: /home/wuxf/Develop/OpenLearn-Next/src/features/async-tasks/infra/connection.ts] [CITED: /home/wuxf/Develop/OpenLearn-Next/src/features/runtime-platform/seams/transport/redis-fanout-connection.ts]
**How to avoid:** worker Redis = blocking；fanout Redis = non-blocking degraded-visible。 [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/59-deploy-release-recovery-baseline/59-CONTEXT.md]
**Warning signs:** ready code里出现 “只要 `REDIS_URL` 不通就 not-ready”，而没有区分 `BULLMQ_REDIS_URL`。 [CITED: /home/wuxf/Develop/OpenLearn-Next/src/features/async-tasks/infra/connection.ts] [CITED: /home/wuxf/Develop/OpenLearn-Next/src/features/runtime-platform/seams/transport/redis-fanout-connection.ts]

### Pitfall 5: 只恢复 SQLite，不恢复 app-level 语义
**What goes wrong:** 数据库文件恢复了，但应用 schema、health、sample chain 没验证，仍然把 restore 视为成功。 [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/59-deploy-release-recovery-baseline/59-CONTEXT.md]
**Why it happens:** 把文件恢复误当成业务恢复。 [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/55-pilot-scope-and-acceptance-gate/55-FAILURE-RECOVERY-MATRIX.md]
**How to avoid:** restore 之后按顺序跑 SQLite integrity、health、ready、sample smoke。 [CITED: https://www.sqlite.org/pragma.html#pragma_integrity_check] [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/59-deploy-release-recovery-baseline/59-CONTEXT.md]
**Warning signs:** drill 证据只有备份文件名和恢复命令，没有校验输出。 [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/55-pilot-scope-and-acceptance-gate/55-PROOF-INVENTORY.md]

## Code Examples

Verified patterns from official sources and current codebase:

### Health + Ready route split
```typescript
// Source anchors:
// - /home/wuxf/Develop/OpenLearn-Next/server.ts
// - /home/wuxf/Develop/OpenLearn-Next/src/lib/dal/async-task-operator.ts
// - /home/wuxf/Develop/OpenLearn-Next/src/lib/dal/system-transport-settings.ts
export async function getHealthPayload() {
  return {
    ok: true,
    kind: "health",
    process: "alive",
    checkedAt: new Date().toISOString(),
  };
}

export async function getReadyPayload() {
  const worker = await getAsyncTaskOperatorOverviewDTO();
  const transport = await getSystemTransportSettings();

  return {
    ok:
      worker.platformHealth.workerState === "ready" &&
      transport.health.connectionState !== "degraded", // fanout field stays informational unless worker Redis is the blocker
    kind: "ready",
    components: {
      db: { posture: "green" },
      web: { posture: "green" },
      worker: {
        posture: worker.platformHealth.workerState,
        lastSeenAt: worker.platformHealth.workerHeartbeats[0]?.lastSeenAt ?? null,
      },
      fanout: {
        posture: transport.degraded ? "degraded" : transport.health.connectionState,
        blocking: false,
        reason: transport.degradedReason,
      },
    },
  };
}
```

### systemd service for `web`
```ini
# Source: https://man7.org/linux/man-pages/man5/systemd.service.5.html
[Unit]
Description=OpenLearn Next web
After=network.target

[Service]
Type=exec
WorkingDirectory=/srv/openlearn-next/current
ExecStart=/usr/bin/env pnpm start
Restart=on-failure
RestartSec=5s
TimeoutStartSec=30s
TimeoutStopSec=30s
EnvironmentFile=/srv/openlearn-next/shared/.env

[Install]
WantedBy=multi-user.target
```

### GitHub Actions hard gate skeleton
```yaml
# Source: https://docs.github.com/en/actions/writing-workflows/about-workflows
name: pilot-release-gate

on:
  pull_request:
  push:
    branches: [main]

jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test --run
      - run: pnpm build
      - run: pnpm db:migrate
      - run: pnpm verify:phase57 && pnpm verify:phase58
```

### SQLite backup / restore verification
```bash
# Source:
# - https://www.sqlite.org/lang_vacuum.html
# - https://www.sqlite.org/pragma.html#pragma_integrity_check
sqlite3 "$DB_PATH" "VACUUM INTO '$BACKUP_PATH'"
sqlite3 "$DB_PATH" "PRAGMA integrity_check;"
sqlite3 "$DB_PATH" "PRAGMA foreign_key_check;"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| self-hosting 时忽略 version skew | 配置 `deploymentId` 以保护 rolling deploy/version skew | Next.js current self-hosting docs | 即使单机试点先不做多实例，也应把 release version 作为正式字段保留下来。 [CITED: https://nextjs.org/docs/app/guides/self-hosting] |
| `next start` + `output: standalone` | standalone 模式应运行 `.next/standalone/server.js`，且 custom server 不兼容 | Next.js 16 docs / current guide | 当前项目不能把 standalone 当 Phase 59 主路线。 [CITED: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/03-api-reference/05-config/01-next-config-js/output.mdx] [CITED: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/02-guides/custom-server.mdx] |
| 只做文件层 SQLite copy | `VACUUM INTO` 或 Online Backup API + integrity checks | SQLite official docs current | backup/restore 方案应使用 SQLite 官方一致性语义。 [CITED: https://www.sqlite.org/backup.html] [CITED: https://www.sqlite.org/lang_vacuum.html] |

**Deprecated/outdated:**
- `next start` with `output: 'standalone'` while keeping a custom `server.ts`: invalid combination for this repo. [CITED: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/02-guides/custom-server.mdx]
- 把 `health` 和 `ready` 做成同一个全量探针：违背本 phase locked contract。 [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/59-deploy-release-recovery-baseline/59-CONTEXT.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 现有 runtime asset 未来可能需要独立文件目录而不仅是 SQLite `resources.content`。 | Open Questions / Backup posture | 若错误，planner 可能多做一个当前不必要的资产目录约束；若正确而未建，SAFE-03 会漏备份对象。 |
| A2 | `@t3-oss/env-nextjs` 等专用 env lib 不会带来超过本 phase 价值的收益。 | Standard Stack / Alternatives | 若错误，planner 可能错过一个更舒服的开发体验库，但不会阻塞 Phase 59 交付。 |

## Open Questions (RESOLVED)

All previously open questions for Phase 59 are now closed. Planner/executor must treat this section as resolved context, not an active blocker list.

1. **“附加资产”在当前 repo 中究竟包含哪些运行时文件？**
   - Resolution: 当前代码库可证实的正式恢复边界应定义为 **SQLite truth + `public/avatars/` 静态资产 + env template / release artifacts**；仓库内未发现 `uploads/`、`storage/`、`data/` 等独立运行时资产根目录。 [CITED: /home/wuxf/Develop/OpenLearn-Next/src/lib/dal/resources.ts] [CITED: /home/wuxf/Develop/OpenLearn-Next/src/db/schema.ts] [CITED: /home/wuxf/Develop/OpenLearn-Next/public/avatars/student-girl.svg] [CITED: /home/wuxf/Develop/OpenLearn-Next/public/avatars/student-boy.svg]
   - Planning implication: planner 应要求实现显式创建一个 `runtime assets root` 约定；若当前仍无 repo 外资产，则在 backup/restore scripts 与 restore drill artifact 中写明 `None yet — verified by codebase search`，并把可恢复对象固定为 SQLite、`public/avatars/`、release manifests/checklists、env template。

2. **release manifest 是否需要同时暴露 HTTP version surface？**
   - Resolution: **需要**。`Git SHA + release manifest` 仍是唯一主记录，但 Phase 59 还应提供只读的 `/api/release` informational surface，作为 operator / post-deploy / post-restore 的 HTTP 入口；它必须读取 canonical manifest pointer，而不是自行猜最新文件。 [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/59-deploy-release-recovery-baseline/59-CONTEXT.md]
   - Planning implication: deploy/rollback 计划必须定义 `current/green manifest pointer`，`/api/release` 只读取这个 canonical source。

3. **CI 发布到 pilot 环境是只做 gate，还是也要自动执行 deploy？**
   - Resolution: Phase 59 锁定为 **CI hard gate + manual or `workflow_dispatch` deploy**，不要求 CI 自动推送到 pilot 主机。 [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md] [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/59-deploy-release-recovery-baseline/59-CONTEXT.md]
   - Planning implication: GitHub Actions 负责 gate、artifact/checklist/manifest validation；正式 deploy 由 systemd + shell scripts 在单机环境执行，避免把 Phase 59 扩大成远程 CD 线路建设。

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | web/worker/build scripts | ✓ | `v24.1.0` | — |
| npm | registry / install | ✓ | `11.6.2` | — |
| pnpm | repo package manager | ✓ | `10.33.0` | npm 可临时代跑，但不应作为主流程 |
| sqlite3 CLI | backup/restore verification | ✓ | `3.53.1` | 若目标机缺失，可用 Node/libSQL helper script，但本机无需 fallback |
| systemctl | systemd unit management | ✓ | `260` | 无；锁定主路线依赖它 |
| docker | local Redis fallback / optional rehearsal | ✓ | `29.5.1` | 可不用作主部署路线 |
| redis-server | 本机 Redis server for worker/fanout rehearsal | ✗ | — | 用 Docker 跑 Redis 容器 |
| bash / curl / tar / git | shell deploy/backup/release scripts | ✓ | `5.3.9` / `8.20.0` / `1.35` / `2.54.0` | — |

**Missing dependencies with no fallback:**
- None for the locked Phase 59 deliverables on this machine. [VERIFIED: local environment]

**Missing dependencies with fallback:**
- `redis-server` missing locally; use Docker container as rehearsal fallback for worker/fanout checks. [VERIFIED: local environment]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `4.1.5` + repo-local phase verifiers [CITED: /home/wuxf/Develop/OpenLearn-Next/package.json] |
| Config file | `vitest.config.mts` [CITED: /home/wuxf/Develop/OpenLearn-Next/vitest.config.mts] |
| Quick run command | `pnpm test --run` |
| Full suite command | `pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm db:migrate && pnpm verify:phase57 && pnpm verify:phase58` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENVR-01 | env schema + `.env.example` + startup validation | unit/static | `pnpm test --run src/**/env*.test.ts scripts/verify-phase59-deploy-release.ts` | ❌ Wave 0 |
| ENVR-02 | CI gate blocks on lint/typecheck/test/build/migrate/health | workflow + verifier | `pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm db:migrate && pnpm verify:phase59` | ❌ Wave 0 |
| ENVR-03 | release manifest + rollout/rollback checklist | static/verifier | `pnpm verify:phase59` | ❌ Wave 0 |
| SAFE-03 | backup + restore drill + post-restore verification | script/integration | `bash ops/deploy/verify-restore.sh` | ❌ Wave 0 |
| OPS-01 | health/ready surface exposes component posture honestly | unit/integration | `pnpm test --run src/app/api/health/*.test.ts src/app/api/ready/*.test.ts scripts/verify-phase59-deploy-release.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test --run`
- **Per wave merge:** `pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm verify:phase59`
- **Phase gate:** `pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm db:migrate && pnpm verify:phase59 && bash ops/deploy/verify-restore.sh`

### Wave 0 Gaps
- [ ] `scripts/verify-phase59-deploy-release.ts` — covers ENVR-01 / ENVR-02 / ENVR-03 / OPS-01
- [ ] `scripts/verify-phase59-deploy-release.test.ts` — static expectations for manifest, health/ready, scripts, systemd units
- [ ] `src/app/api/health/route.ts` + tests — health surface
- [ ] `src/app/api/ready/route.ts` + tests — ready surface
- [ ] `ops/deploy/verify-restore.sh` — covers SAFE-03
- [ ] `.github/workflows/pilot-release.yml` — CI hard gate

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | health detail / release actions should stay operator-owned or internal-only; do not expose secrets in anonymous probes. [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/REQUIREMENTS.md] |
| V3 Session Management | no | Phase 59 不重做 auth/session protocol；沿用现有 Auth.js baseline。 [CITED: /home/wuxf/Develop/OpenLearn-Next/AGENTS.md] |
| V4 Access Control | yes | deploy/rollback/restore commands and detailed release metadata should be restricted to operator/release-owner workflows. [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/55-pilot-scope-and-acceptance-gate/55-FAILURE-RECOVERY-MATRIX.md] |
| V5 Input Validation | yes | env schema 用 Zod；health/ready/release payload shape 也应 schema-validated。 [VERIFIED: npm registry] [CITED: https://github.com/colinhacks/zod/blob/v4.0.1/README.md] |
| V6 Cryptography | yes | 不手写 secrets handling；备份快照不包含真实 secrets，且多实例时使用稳定的 `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`。 [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/59-deploy-release-recovery-baseline/59-CONTEXT.md] [CITED: https://nextjs.org/docs/app/guides/self-hosting] |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| detailed ready payload leaks secrets or internal topology | Information Disclosure | health/ready 仅返回 posture、reason、next step；不返回 secret values、full DSN、raw stack traces。 [CITED: /home/wuxf/Develop/OpenLearn-Next/src/lib/dto/operator-honesty.ts] |
| rollback to mismatched schema/app pair | Tampering | manifest 绑定 Git SHA + migration outcome + previous green release。 [CITED: /home/wuxf/Develop/OpenLearn-Next/.planning/phases/59-deploy-release-recovery-baseline/59-CONTEXT.md] |
| restore from corrupt/incomplete SQLite backup | Tampering | use official SQLite backup methods + `integrity_check` / `foreign_key_check`. [CITED: https://www.sqlite.org/backup.html] [CITED: https://www.sqlite.org/pragma.html#pragma_integrity_check] |
| shell script command injection via env or manifest | Elevation of Privilege | shell scripts must quote variables, use fixed command paths, and avoid eval-like expansion. [ASSUMED] |
| unauthenticated deploy triggering | Spoofing | GitHub Actions permissions minimalism + protected environments/manual approval where needed. [CITED: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions] |

## Sources

### Primary (HIGH confidence)
- `/vercel/next.js` via ctx7 CLI - self-hosting, custom server, standalone output topics. [VERIFIED: ctx7 CLI]
- `https://nextjs.org/docs/app/guides/self-hosting` - self-hosting, runtime env, deploymentId, reverse proxy, graceful shutdown. [CITED: https://nextjs.org/docs/app/guides/self-hosting]
- `https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/02-guides/custom-server.mdx` - custom server usage and standalone incompatibility. [CITED: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/02-guides/custom-server.mdx]
- `https://www.sqlite.org/backup.html` - Online Backup API semantics. [CITED: https://www.sqlite.org/backup.html]
- `https://www.sqlite.org/lang_vacuum.html` - `VACUUM INTO` backup semantics. [CITED: https://www.sqlite.org/lang_vacuum.html]
- `https://www.sqlite.org/pragma.html#pragma_integrity_check` - integrity validation after restore. [CITED: https://www.sqlite.org/pragma.html#pragma_integrity_check]
- `https://man7.org/linux/man-pages/man5/systemd.service.5.html` - `Type=exec`, restart, timeout, ExecStartPre/Post semantics. [CITED: https://man7.org/linux/man-pages/man5/systemd.service.5.html]
- `https://docs.github.com/en/actions/writing-workflows/about-workflows` - workflow basics and location. [CITED: https://docs.github.com/en/actions/writing-workflows/about-workflows]
- `https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions` - workflow syntax, `on`, permissions, dispatch patterns. [CITED: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions]
- local codebase anchors: `package.json`, `next.config.ts`, `server.ts`, `src/server/workers/async-task-worker.ts`, `src/features/async-tasks/infra/connection.ts`, `src/features/runtime-platform/seams/transport/redis-fanout-connection.ts`, `src/features/async-tasks/worker/bootstrap.ts`, `src/lib/dal/async-task-operator.ts`, `src/lib/dal/system-transport-settings.ts`, `src/lib/dal/resources.ts`, `src/db/schema.ts`. [CITED: /home/wuxf/Develop/OpenLearn-Next/package.json]

### Secondary (MEDIUM confidence)
- ctx7 CLI output for Zod examples (`/colinhacks/zod/v4.0.1`) confirming `safeParse` usage. [VERIFIED: ctx7 CLI]

### Tertiary (LOW confidence)
- none

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - almost all stack choices are locked by phase context or already present in repo and verified with registry/docs.
- Architecture: HIGH - responsibility split is anchored in current code seams and locked decisions.
- Pitfalls: HIGH - major failure modes are directly visible in `next.config.ts`, worker posture code, and official self-hosting/SQLite docs.

**Research date:** 2026-05-26
**Valid until:** 2026-06-25
