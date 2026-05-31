import { z } from "zod";

import type { GovernanceDashboardPluginLifecycleRow } from "@/features/platform-core/actions/registry";

export const OperatorHonestySectionSchema = z
  .object({
    id: z.enum(["trustBoundary", "impactScope", "nextStep"]),
    label: z.string().min(1),
    content: z.string().min(1),
  })
  .strict();

export const OperatorHonestyCardSchema = z
  .object({
    title: z.string().min(1),
    tone: z.enum(["degraded", "failed"]),
    sections: z
      .array(OperatorHonestySectionSchema)
      .length(3),
  })
  .strict();

export type OperatorHonestyCard = z.infer<typeof OperatorHonestyCardSchema>;

export function createOperatorHonestyCard(input: {
  title: string;
  tone?: OperatorHonestyCard["tone"];
  trustedFacts: string;
  untrustedFacts: string;
  impactScope: string;
  nextStep: string;
}): OperatorHonestyCard {
  return OperatorHonestyCardSchema.parse({
    title: input.title,
    tone: input.tone ?? "degraded",
    sections: [
      {
        id: "trustBoundary",
        label: "仍可信什么 / 已不可信什么",
        content: `仍可信什么：${input.trustedFacts} 已不可信什么：${input.untrustedFacts}`,
      },
      {
        id: "impactScope",
        label: "影响范围",
        content: input.impactScope,
      },
      {
        id: "nextStep",
        label: "推荐下一步",
        content: input.nextStep,
      },
    ],
  });
}

export function toPluginLifecycleHonestyCard(
  plugin: GovernanceDashboardPluginLifecycleRow,
): OperatorHonestyCard | null {
  const hasHonestyPosture = Boolean(
    plugin.blocked || plugin.reasonCode || plugin.recommendedRecoveryAction || plugin.killSwitchEnabled,
  );

  if (!hasHonestyPosture) {
    return null;
  }

  const trustedFacts = "课堂 session、已落库 evidence 与现有治理读模型仍可信。";

  const untrustedFacts = plugin.recommendedRecoveryAction
    ? `该插件 action 不能继续按当前姿态执行（reason: ${plugin.reasonCode ?? plugin.recommendedRecoveryAction}）。`
    : `该插件当前姿态不可视为完全可执行（reason: ${plugin.reasonCode ?? "governance_blocked"}）。`;

  const impactScope = plugin.killSwitchEnabled
    ? "影响范围：当前课堂及引用同插件姿态的课堂。"
    : "影响范围：当前课堂及引用同版本插件的课堂。";

  const nextStep = plugin.recommendedRecoveryAction
    ? `推荐下一步：进入插件治理详情，按 reason-gated 流程执行 ${plugin.recommendedRecoveryAction}。`
    : "推荐下一步：进入插件治理详情，查看 blocked diagnostics 与恢复入口。";

  return createOperatorHonestyCard({
    title: plugin.killSwitchEnabled ? "当前插件处于降级或挂起姿态" : "当前插件不能视为完全健康",
    tone: plugin.reasonCode === "activation_failed" ? "failed" : "degraded",
    trustedFacts,
    untrustedFacts,
    impactScope,
    nextStep,
  });
}
