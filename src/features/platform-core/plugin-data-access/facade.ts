import "server-only";

import { createHash } from "node:crypto";

import {
  producePluginDataInsert,
  producePluginDataUpsert,
} from "@/features/platform-core/commands/producers/plugin-data";

import { PluginDataAccessError } from "./allowlist";
import type { PluginDataAccessInput } from "./contracts";
import { assertActionExecutable } from "./governance-gate";
import {
  aggregate,
  count,
  getByIndex,
  type ReadVerbAuditContext,
} from "./read-verbs";

/**
 * 受治理数据访问的**唯一公开入口**（Phase 68, D-01 五动词判别派发）。
 *
 * `dispatchPluginDataAccess` 是五动词（insert/upsert/getByIndex/count/aggregate）的单一
 * facade：先过治理门（`assertActionExecutable`，lifecycle/kill-switch/越校在任何数据触达
 * 前被拒），再按 `input.verb` 判别派发——
 * - 写动词（insert/upsert）→ 经 Command Bus 的 producer（落库唯一权威），**不**直连 DAL 写；
 * - 读动词（getByIndex/count/aggregate）→ 受治理 read-verbs（直连受治理 DAL），**不**经 producer。
 *
 * 不变式：
 * - **schoolId 唯一权威**：由治理门从认证 session 派生注入，facade **绝不**读取 `input.schoolId`
 *   （契约层亦不可表达）；payload 若携带 schoolId 由白名单/读路径拒为 `cross_school_rejected`。
 * - **治理前置**：gate 抛错时 producer/read 均不被调用（治理失败即终止，不触达数据）。
 * - **actor scope = "plugin"**：动词执行代表受治理插件行为，写命令 actor 与读审计上下文统一以
 *   "plugin" scope 落库（对齐 governance-gate 的审计语义）。
 */

/** 动词执行以 "plugin" actor scope 派发/审计——代表受治理插件行为而非裸用户操作。 */
const FACADE_ACTOR_SCOPE = "plugin" as const;

/** facade 写分支的 producer source 标识。 */
const FACADE_SOURCE = "host-action" as const;

export async function dispatchPluginDataAccess(input: PluginDataAccessInput) {
  // 1) 治理门前置：schoolId 由认证 session 派生注入，绝不取 input.schoolId（SC2 / D-11）。
  const correlationId = buildFacadeCorrelationId(input);
  const { schoolId, projectionRow } = await assertActionExecutable({
    actorId: input.actor,
    pluginKey: input.pluginKey,
    verb: input.verb,
    correlationId,
  });

  // 2) 派生读审计上下文（read-verbs 自身不调治理门，由 facade 注入）。
  const auditContext: ReadVerbAuditContext = {
    pluginId: projectionRow.pluginId,
    actorId: input.actor,
    actorScope: FACADE_ACTOR_SCOPE,
    lifecycleState: projectionRow.lifecycle.internalSubstate ?? "ready",
    killSwitchEnabled: projectionRow.lifecycle.killSwitchEnabled,
    correlationId,
  };

  // 3) 判别派发（D-01）：写经 Command Bus producer、读直连受治理 DAL。
  switch (input.verb) {
    case "insert":
      return producePluginDataInsert({
        actor: { actorId: input.actor, actorScope: FACADE_ACTOR_SCOPE },
        scope: { schoolId, pluginId: projectionRow.pluginId },
        payload: { pluginKey: input.pluginKey, table: input.table, values: input.values },
        correlation: { correlationId, producer: "dispatchPluginDataAccess" },
        source: FACADE_SOURCE,
      });
    case "upsert":
      return producePluginDataUpsert({
        actor: { actorId: input.actor, actorScope: FACADE_ACTOR_SCOPE },
        scope: { schoolId, pluginId: projectionRow.pluginId },
        payload: { pluginKey: input.pluginKey, table: input.table, values: input.values },
        correlation: { correlationId, producer: "dispatchPluginDataAccess" },
        source: FACADE_SOURCE,
      });
    case "getByIndex":
      return getByIndex({
        schoolId,
        pluginKey: input.pluginKey,
        table: input.table,
        index: input.index,
        eq: input.eq,
        audit: auditContext,
      });
    case "count":
      return count({
        schoolId,
        pluginKey: input.pluginKey,
        table: input.table,
        index: input.index,
        eq: input.eq,
        audit: auditContext,
      });
    case "aggregate":
      return aggregate({
        schoolId,
        pluginKey: input.pluginKey,
        table: input.table,
        groupBy: input.groupBy,
        audit: auditContext,
      });
    default:
      // 判别联合穷尽——运行时兜底（理论不可达），不暴露未知动词。
      throw new PluginDataAccessError(
        "invalid_payload_rejected",
        `unsupported data-access verb: ${(input as { verb?: string }).verb ?? "unknown"}`,
      );
  }
}

/** 由动词 + actor + 目标插件/表稳定派生 correlationId（治理审计 / producer 关联复用）。 */
function buildFacadeCorrelationId(input: PluginDataAccessInput): string {
  const base = `plugin-data-access:${input.verb}:${input.actor}:${input.pluginKey}:${input.table}`;
  return createHash("sha256").update(base).digest("hex");
}
