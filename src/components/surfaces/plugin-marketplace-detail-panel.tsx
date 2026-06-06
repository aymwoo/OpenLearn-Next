"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  installMarketplacePluginAction,
  preflightPluginUpgradeAction,
  preflightUninstallPluginAction,
  recoverMarketplacePluginAction,
  uninstallPluginAction,
  upgradePluginAction,
} from "@/actions/plugin-actions";
import type { MarketplaceExternalRow } from "@/features/platform-core/actions/registry";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  PluginUpgradeExecutionResult,
  PluginUpgradePreflightResult,
  PreflightUninstallPluginResult,
} from "@/lib/dal/plugins";

type Props = {
  schoolId: string;
  rows: MarketplaceExternalRow[];
};

const rejectReasonLabels: Record<string, string> = {
  PLUGIN_MANIFEST_INVALID: "Manifest 校验失败，当前目录条目未通过治理校验。",
  PLUGIN_DATA_MODEL_INVALID: "Data Model 校验失败，声明数据结构不合法。",
  PLUGIN_KEY_CONFLICT: "插件标识冲突，学校中已有同名 pluginKey。",
  PLUGIN_DB_NAMESPACE_CONFLICT: "数据命名空间冲突，当前 namespace 已被占用。",
  PLUGIN_ACTIVE_CLASSROOM_BLOCKED: "当前有课堂正在占用该插件，升级或卸载已被硬阻断。",
  PLUGIN_UPGRADE_VERSION_INVALID: "目标版本不合法，或不高于当前版本。",
  VERIFY_FAILED: "升级未完成，系统已保持旧版本继续可用。",
};

function getRejectReasonLabel(reason: string | null) {
  if (!reason) {
    return null;
  }

  return rejectReasonLabels[reason] ?? `治理校验未通过：${reason}`;
}

export function PluginMarketplaceDetailPanel({ schoolId, rows }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedPluginKey, setSelectedPluginKey] = useState<string | null>(rows[0]?.pluginKey ?? null);
  const [inlineMessages, setInlineMessages] = useState<Record<string, string | null>>({});
  const [upgradeResults, setUpgradeResults] = useState<Record<string, PluginUpgradeExecutionResult | null>>({});
  const [upgradePreflights, setUpgradePreflights] = useState<Record<string, PluginUpgradePreflightResult | null>>({});
  const [uninstallPreflights, setUninstallPreflights] = useState<Record<string, PreflightUninstallPluginResult | null>>({});
  const [cleanupDrafts, setCleanupDrafts] = useState<Record<string, string>>({});

  const selectedRow = useMemo(
    () => rows.find((row) => row.pluginKey === selectedPluginKey) ?? rows[0] ?? null,
    [rows, selectedPluginKey],
  );

  if (!selectedRow) {
    return null;
  }

  const upgradePreflight = upgradePreflights[selectedRow.pluginKey] ?? selectedRow.upgrade.preflight ?? null;
  const uninstallPreflight = uninstallPreflights[selectedRow.pluginKey] ?? null;
  const upgradeResult = upgradeResults[selectedRow.pluginKey] ?? null;

  const runAction = (pluginKey: string, fn: () => Promise<void>) => {
    setInlineMessages((current) => ({ ...current, [pluginKey]: null }));
    startTransition(async () => {
      await fn();
    });
  };

  return (
    <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-on-surface-variant">Detail / Confirmation Layer</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-on-surface">同页预检、升级与卸载决策</h2>
          <p className="mt-3 text-sm leading-7 text-on-surface-variant">
            先看真实治理摘要与影响面，再决定安装、升级、保留卸载或 cleanup。所有反馈都在页内原位展示。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {rows.map((row) => (
            <button
              key={row.pluginKey}
              type="button"
              className={row.pluginKey === selectedRow.pluginKey
                ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
                : "rounded-full bg-surface-container-lowest px-4 py-2 text-sm font-medium text-on-surface-variant"}
              onClick={() => setSelectedPluginKey(row.pluginKey)}
            >
              {row.displayName}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-[1.75rem] bg-surface-container-lowest p-5 shadow-ambient">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-lg font-semibold text-on-surface">{selectedRow.displayName}</p>
          <Badge className="bg-primary/10 text-primary">{selectedRow.availableVersion}</Badge>
          <Badge className="bg-surface-container-low text-on-surface-variant">
            {selectedRow.posture === "not-installed"
              ? "未安装"
              : selectedRow.posture === "installed-usable"
                ? "已安装可用"
                : selectedRow.posture === "upgrade-available"
                  ? "可升级"
                  : selectedRow.posture === "retained-recoverable"
                    ? "已卸载但可恢复"
                    : "被 active classroom 阻断"}
          </Badge>
          {upgradeResult && "failureDetail" in upgradeResult && upgradeResult.failureDetail === "VERIFY_FAILED" ? (
            <Badge className="bg-error-container text-on-error-container">升级失败</Badge>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <GovernanceTile label="Version" value={selectedRow.currentVersion ? `${selectedRow.currentVersion} -> ${selectedRow.availableVersion}` : selectedRow.availableVersion} />
          <GovernanceTile label="Permissions" value={selectedRow.requestedPermissions.length ? selectedRow.requestedPermissions.join(", ") : "无"} />
          <GovernanceTile label="Data Model" value={selectedRow.declaredDataTables.length ? selectedRow.declaredDataTables.join(", ") : "无声明表"} />
          <GovernanceTile label="Namespace" value={selectedRow.dbNamespace} />
          <GovernanceTile label="Source" value={selectedRow.sourceType} />
        </div>

        {inlineMessages[selectedRow.pluginKey] ? (
          <div className="mt-4 rounded-[1.25rem] bg-error-container px-4 py-4 text-sm leading-6 text-on-error-container">
            {inlineMessages[selectedRow.pluginKey]}
          </div>
        ) : null}

        {selectedRow.installRejectReason ? (
          <div className="mt-4 rounded-[1.25rem] bg-error-container px-4 py-4 text-sm leading-6 text-on-error-container">
            {getRejectReasonLabel(selectedRow.installRejectReason)}
          </div>
        ) : null}

        {selectedRow.posture === "active-blocked" ? (
          <div className="mt-4 rounded-[1.25rem] bg-error-container/70 px-4 py-4 text-sm text-on-surface">
            <p className="font-semibold text-on-surface">受影响课堂 / Session</p>
            <div className="mt-3 grid gap-3">
              {selectedRow.activeSessions.map((session) => (
                <div key={session.sessionId} className="rounded-[1rem] bg-surface-container-lowest px-4 py-3">
                  classroom `{session.classId}` · lesson `{session.lessonId}` · session `{session.sessionId}` · {session.status}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button asChild variant="secondary">
                <a href="/settings/labs">查看受影响课堂</a>
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.refresh()}>
                稍后重试
              </Button>
            </div>
          </div>
        ) : null}

        {upgradePreflight ? (
          <div className="mt-4 rounded-[1.25rem] bg-surface-container-low px-4 py-4">
            <p className="text-sm font-semibold text-on-surface">升级预检</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <GovernanceTile label="当前版本" value={upgradePreflight.currentVersion} />
              <GovernanceTile label="目标版本" value={upgradePreflight.targetVersion} />
              <GovernanceTile label="真实 owned data" value={upgradePreflight.hasOwnedQuizData ? "存在" : "无"} />
              <GovernanceTile label="阻断" value={upgradePreflight.blockers.length ? upgradePreflight.blockers.join(", ") : "无"} />
            </div>
            <div className="mt-4 grid gap-3">
              {upgradePreflight.stages.map((stage) => {
                const resultStage = upgradeResult && "stages" in upgradeResult
                  ? upgradeResult.stages.find((item) => item.name === stage)
                  : null;
                const statusLabel = resultStage
                  ? resultStage.status === "completed"
                    ? "已完成"
                    : resultStage.status === "failed"
                      ? "失败"
                      : "未开始"
                  : "待执行";

                return (
                  <div key={stage} className="flex min-h-14 items-center justify-between rounded-[1rem] bg-surface-container-lowest px-4 py-3">
                    <span className="font-medium text-on-surface">{stage === "backfill" ? "Backfill" : stage === "verify" ? "Verify" : "Cutover"}</span>
                    <span className="text-sm text-on-surface-variant">{statusLabel}</span>
                  </div>
                );
              })}
            </div>
            {upgradeResult && "failureDetail" in upgradeResult && upgradeResult.failureDetail === "VERIFY_FAILED" ? (
              <p className="mt-4 rounded-[1rem] bg-error-container px-4 py-3 text-sm leading-6 text-on-error-container">
                升级未完成，系统已保持旧版本继续可用。
              </p>
            ) : null}
          </div>
        ) : null}

        {selectedRow.installedPluginId && uninstallPreflight ? (
          <div className="mt-4 rounded-[1.25rem] bg-surface-container-low px-4 py-4">
            <p className="text-sm font-semibold text-on-surface">卸载影响与 cleanup 确认</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <GovernanceTile label="Lessons" value={String(uninstallPreflight.lessonExtCount)} />
              <GovernanceTile label="Steps" value={String(uninstallPreflight.stepExtCount)} />
              <GovernanceTile label="Resources" value={String(uninstallPreflight.resourceExtCount)} />
              <GovernanceTile label="Plugin Data" value={String(uninstallPreflight.ownedBusinessCount + uninstallPreflight.ownedQuestionCount + uninstallPreflight.ownedResponseCount)} />
            </div>
            <div className="mt-4 rounded-[1rem] bg-surface-container-lowest px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">Confirmation Token</p>
              <p className="mt-2 font-mono text-sm text-on-surface">{uninstallPreflight.cleanupConfirmationToken}</p>
              <input
                value={cleanupDrafts[selectedRow.pluginKey] ?? ""}
                onChange={(event) => {
                  const nextValue = event.currentTarget.value;
                  setCleanupDrafts((current) => ({ ...current, [selectedRow.pluginKey]: nextValue }));
                }}
                placeholder="输入 confirmation token"
                className="mt-3 min-h-13 w-full rounded-[1rem] bg-surface px-4 py-3 text-sm text-on-surface outline-none"
              />
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3">
          {selectedRow.posture === "not-installed" ? (
            <Button
              type="button"
              disabled={pending}
              onClick={() => runAction(selectedRow.pluginKey, async () => {
                const result = await installMarketplacePluginAction({
                  schoolId,
                  pluginKey: selectedRow.pluginKey,
                  version: selectedRow.availableVersion,
                });

                setInlineMessages((current) => ({
                  ...current,
                  [selectedRow.pluginKey]: result.success
                    ? "已安装，可继续启用课堂使用。"
                    : getRejectReasonLabel(result.error ?? null),
                }));

                if (result.success) {
                  router.refresh();
                }
              })}
            >
              安装插件
            </Button>
          ) : null}

          {selectedRow.posture === "retained-recoverable" ? (
            <Button
              type="button"
              disabled={pending}
              onClick={() => runAction(selectedRow.pluginKey, async () => {
                const result = await recoverMarketplacePluginAction({
                  schoolId,
                  pluginKey: selectedRow.pluginKey,
                  version: selectedRow.availableVersion,
                });

                setInlineMessages((current) => ({
                  ...current,
                  [selectedRow.pluginKey]: result.success
                    ? "这是一次重新安装，但历史保留数据已被恢复接管。"
                    : getRejectReasonLabel(result.error ?? null),
                }));

                if (result.success) {
                  router.refresh();
                }
              })}
            >
              重新安装并恢复
            </Button>
          ) : null}

          {selectedRow.posture === "upgrade-available" && selectedRow.installedPluginId ? (
            <>
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => runAction(selectedRow.pluginKey, async () => {
                  const result = await preflightPluginUpgradeAction({
                    schoolId,
                    pluginId: selectedRow.installedPluginId!,
                    targetVersion: selectedRow.availableVersion,
                  });

                  if (!result.success) {
                    setInlineMessages((current) => ({ ...current, [selectedRow.pluginKey]: getRejectReasonLabel(result.error ?? null) }));
                    return;
                  }

                  setUpgradePreflights((current) => ({
                    ...current,
                    [selectedRow.pluginKey]: (result.data ?? null) as PluginUpgradePreflightResult | null,
                  }));
                })}
              >
                查看升级预检
              </Button>
              <Button
                type="button"
                disabled={pending}
                onClick={() => runAction(selectedRow.pluginKey, async () => {
                  const result = await upgradePluginAction({
                    schoolId,
                    pluginId: selectedRow.installedPluginId!,
                    targetVersion: selectedRow.availableVersion,
                  });

                  setUpgradeResults((current) => ({
                    ...current,
                    [selectedRow.pluginKey]: (result.data ?? null) as PluginUpgradeExecutionResult | null,
                  }));
                  setInlineMessages((current) => ({
                    ...current,
                    [selectedRow.pluginKey]: result.success
                      ? (result.data && "verifyPassed" in result.data && result.data.verifyPassed
                          ? "升级完成，已切换到新版本。"
                          : "升级未完成，系统已保持旧版本继续可用。")
                      : getRejectReasonLabel(result.error ?? null),
                  }));

                  if (result.success && result.data && "verifyPassed" in result.data && result.data.verifyPassed) {
                    router.refresh();
                  }
                })}
              >
                开始升级
              </Button>
            </>
          ) : null}

          {selectedRow.installedPluginId ? (
            <>
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => runAction(selectedRow.pluginKey, async () => {
                  const result = await preflightUninstallPluginAction({
                    schoolId,
                    pluginId: selectedRow.installedPluginId!,
                  });

                  if (!result.success) {
                    setInlineMessages((current) => ({ ...current, [selectedRow.pluginKey]: getRejectReasonLabel(result.error ?? null) }));
                    return;
                  }

                  setUninstallPreflights((current) => ({
                    ...current,
                    [selectedRow.pluginKey]: (result.data ?? null) as PreflightUninstallPluginResult | null,
                  }));
                })}
              >
                卸载并保留数据
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={pending || !uninstallPreflight}
                onClick={() => runAction(selectedRow.pluginKey, async () => {
                  const wantsCleanup = cleanupDrafts[selectedRow.pluginKey] === uninstallPreflight?.cleanupConfirmationToken;
                  const result = await uninstallPluginAction({
                    schoolId,
                    pluginId: selectedRow.installedPluginId!,
                    retentionMode: wantsCleanup ? "cleanup" : "retain",
                    confirmationToken: wantsCleanup ? uninstallPreflight?.cleanupConfirmationToken : undefined,
                  });

                  setInlineMessages((current) => ({
                    ...current,
                    [selectedRow.pluginKey]: result.success
                      ? wantsCleanup
                        ? "cleanup 已确认，真实插件数据已按影响面清理。"
                        : "插件已卸载，历史数据仍保留，可稍后重新安装并恢复。"
                      : getRejectReasonLabel(result.error ?? null),
                  }));

                  if (result.success) {
                    router.refresh();
                  }
                })}
              >
                确认 cleanup
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function GovernanceTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] bg-surface-container-low px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">{label}</p>
      <p className="mt-2 text-sm leading-6 text-on-surface">{value}</p>
    </div>
  );
}
