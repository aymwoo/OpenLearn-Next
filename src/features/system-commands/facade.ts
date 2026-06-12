import "server-only";

import { createHash } from "node:crypto";

import { assertActionExecutable } from "@/features/platform-core/plugin-data-access/governance-gate";
import { writeSystemCommandAudit } from "./audit";

/**
 * 系统命令的统一入口 facade（Phase 79, D-03/D-04/D-16）。
 *
 * 镜像 `dispatchPluginDataAccess` 的三段式结构：
 *   1. 治理门前置 —— assertActionExecutable（lifecycle + kill-switch + school scope）
 *   2. 判别派发 —— 路由到对应 handler（system.config.set / system.config.get 待 79-02 实现）
 *   3. 结果返回
 *
 * 核心安全不变式（T-79-04）：
 *   - schoolId 由 governance-gate 从认证 session 派生注入，facade 层级不接受 schoolId 参数
 *   - 治理门被拒绝时 facade 不触达任何数据
 *   - 所有拒绝点先写 system command audit 再抛错
 */
export async function dispatchSystemCommand(input: {
  /** 命令类型，对应 manifest systemCommands 中的 command 字段 */
  commandType: string;
  /** 发起调用的插件 key */
  pluginKey: string;
  /** 由认证 session 派生的 actor ID */
  actorId: string;
  /** config 操作的 key（system.config.set / system.config.get 时使用） */
  configKey?: string;
  /** config 操作的 value（system.config.set 时使用） */
  configValue?: unknown;
}) {
  const correlationId = buildSystemCommandCorrelationId({
    commandType: input.commandType,
    pluginKey: input.pluginKey,
    actorId: input.actorId,
  });

  // -------------------------------------------------------------------
  // ① 治理门前置
  // -------------------------------------------------------------------
  // assertActionExecutable 的 verb 已泛化为 string（Phase 79, D-01/D-02），
  // commandType 作为 verb 传入，治理门执行 lifecycle/kill-switch/school scope 检查。
  // schoolId 由治理门从认证 session 派生注入（T-79-04），绝不从 payload 读取。
  let schoolId: string;
  let projectionRow;
  try {
    const gateResult = await assertActionExecutable({
      actorId: input.actorId,
      pluginKey: input.pluginKey,
      verb: input.commandType,
      correlationId,
    });
    schoolId = gateResult.schoolId;
    projectionRow = gateResult.projectionRow;
  } catch (error) {
    // assertActionExecutable 内部已写 denial audit + throw。
    // facade 不重写 audit，直接透传错误。
    throw error;
  }

  // -------------------------------------------------------------------
  // ② 判别派发
  // -------------------------------------------------------------------
  // system.config.set / system.config.get 的具体实现由 Phase 79 Plan 02 完成。
  // 当前阶段仅建立 facade 三段式骨架，判别派发抛出明确错误。
  if (
    input.commandType === "system.config.set" ||
    input.commandType === "system.config.get"
  ) {
    throw new Error("system.config handler not yet wired — Phase 79 Plan 02");
  }

  // system.http.request 已由 Phase 78 经 Command Bus 实现，不经过本 facade。
  // 若到达此处则为未知 commandType → 走审计记录后抛错。
  const reasonCode = "config_key_denied";
  await writeSystemCommandAudit({
    pluginId: projectionRow?.pluginId ?? null,
    schoolId,
    commandId: null,
    actorId: input.actorId,
    actorScope: "plugin",
    lifecycleState: projectionRow?.lifecycle?.internalSubstate ?? "ready",
    correlationId,
    decision: "denied",
    reasonCode,
    payloadJson: {
      commandType: input.commandType,
      pluginKey: input.pluginKey,
      configKey: input.configKey ?? "",
    },
    commandType: "system.config.get" as const,
  });

  throw new Error(`Unsupported system command: ${input.commandType}`);

  // -------------------------------------------------------------------
  // ③ 结果返回（79-02 完成后扩展）
  // -------------------------------------------------------------------
}

/**
 * 由 commandType + actorId + pluginKey 稳定派生 correlationId。
 *
 * 与 buildFacadeCorrelationId 镜像：使用 sha256 确保确定性、不可逆、不含敏感 payload。
 * configKey / configValue 不参与 hash——避免信息泄漏（T-79-05）。
 */
function buildSystemCommandCorrelationId(input: {
  commandType: string;
  pluginKey: string;
  actorId: string;
}): string {
  const base = `system-cmd:${input.commandType}:${input.actorId}:${input.pluginKey}`;
  return createHash("sha256").update(base).digest("hex");
}
