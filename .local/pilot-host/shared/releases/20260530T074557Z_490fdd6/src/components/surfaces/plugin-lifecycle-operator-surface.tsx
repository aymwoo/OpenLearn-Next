"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  preflightUninstallPluginAction,
  reconcilePluginForOperatorAction,
  retryPluginForOperatorAction,
  setPluginEnabledForOperatorAction,
  setPluginKillSwitchAction,
  transitionPluginLifecycleAction,
  uninstallPluginAction,
} from "@/actions/plugin-actions";
import { runOperatorPostureRecoveryAction } from "@/actions/operator-posture-recovery-actions";
import type { GovernanceDashboardBundle } from "@/features/platform-core/actions/registry";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getNativeDialogClassName,
  useNativeDialogBackdropClose,
} from "@/components/ui/native-dialog";
import type { PreflightUninstallPluginResult } from "@/lib/dal/plugins";
import { toPluginLifecycleHonestyCard } from "@/lib/dto/operator-honesty";
import { cn } from "@/lib/utils";

type Props = {
  schoolId: string | null;
  dashboard: GovernanceDashboardBundle;
  focusedPluginId?: string;
  focusedActionKey?: string;
};

const lifecycleBadgeTone = {
  installed: "default",
  enabled: "default",
  active: "accent",
  suspended: "default",
  uninstalled: "default",
} as const;

const lifecycleLabel = {
  installed: "已安装",
  enabled: "已启用",
  active: "运行中",
  suspended: "已挂起",
  uninstalled: "已卸载",
} as const;

const recoveryActionLabel = {
  enable: "启用插件",
  retry: "重试恢复",
  resume: "解除挂起",
  reconcile: "运行 reconcile",
  confirm_cleanup: "确认 cleanup",
} as const;

const preflightTileLabels = [
  ["lessons", "lessonExtCount"],
  ["lesson steps", "stepExtCount"],
  ["resources", "resourceExtCount"],
  ["plugin-owned data", "ownedBusinessCount"],
] as const;

function getPrimaryActionLabel(
  row: GovernanceDashboardBundle["pluginLifecycleRows"][number],
) {
  if (row.recommendedRecoveryAction) {
    return recoveryActionLabel[row.recommendedRecoveryAction];
  }

  if (row.reasonCode === "not_enabled" || row.reasonCode === "not_installed") {
    return "启用插件";
  }

  if (row.reasonCode === "activation_failed") {
    return "重试恢复";
  }

  if (row.reasonCode === "kill_switch") {
    return "解除挂起";
  }

  if (row.lifecycleState === "enabled") {
    return "停用插件";
  }

  return row.lifecycleState === "active" ? "停用插件" : "启用插件";
}

function showPrimaryLifecycleAction(
  row: GovernanceDashboardBundle["pluginLifecycleRows"][number],
) {
  return row.lifecycleState !== "uninstalled";
}

function shouldEnablePlugin(
  row: GovernanceDashboardBundle["pluginLifecycleRows"][number],
) {
  return row.lifecycleState !== "active" && row.lifecycleState !== "enabled";
}

function getRecoveryReason(
  row: GovernanceDashboardBundle["pluginLifecycleRows"][number],
) {
  return row.reasonCode ?? row.recommendedRecoveryAction ?? "operator_recovery";
}

export function PluginLifecycleOperatorSurface({
  schoolId,
  dashboard,
  focusedPluginId,
  focusedActionKey,
}: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();
  const [inlineError, setInlineError] = useState<Record<string, string | null>>({});
  const [preflightResults, setPreflightResults] = useState<Record<string, PreflightUninstallPluginResult>>({});
  const [dialogPluginId, setDialogPluginId] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(Boolean(focusedPluginId));
  const [cleanupIntent, setCleanupIntent] = useState<Record<string, boolean>>({});
  const [cleanupConfirmed, setCleanupConfirmed] = useState<Record<string, boolean>>({});
  const [detailConfirm, setDetailConfirm] = useState<{
    pluginId: string;
    action: "resume" | "suspend" | "fallback";
  } | null>(null);

  const dialogPlugin = useMemo(
    () => dashboard.pluginLifecycleRows.find((plugin) => plugin.pluginId === dialogPluginId) ?? null,
    [dashboard.pluginLifecycleRows, dialogPluginId],
  );
  const dialogPreflight = dialogPlugin
    ? preflightResults[dialogPlugin.pluginId] ?? {
        pluginId: dialogPlugin.pluginId,
        schoolId: schoolId ?? "",
        blocked: dialogPlugin.uninstall.blocked,
        reason: dialogPlugin.uninstall.reasonCode,
        lessonExtCount: dialogPlugin.uninstall.preflightSummary.lessonExtCount,
        stepExtCount: dialogPlugin.uninstall.preflightSummary.stepExtCount,
        resourceExtCount: dialogPlugin.uninstall.preflightSummary.resourceExtCount,
        ownedBusinessCount: dialogPlugin.uninstall.preflightSummary.ownedBusinessCount,
        totalCount: dialogPlugin.uninstall.preflightSummary.totalCount,
        impactedLessonIds: [],
        impactedLessonStepIds: [],
        impactedResourceIds: [],
        impactedBusinessKeys: [],
        cleanupConfirmationToken: dialogPlugin.uninstall.cleanupConfirmationToken,
      } satisfies PreflightUninstallPluginResult
    : null;

  const visiblePluginRows = useMemo(() => {
    if (!focusedPluginId) {
      return dashboard.pluginLifecycleRows;
    }

    return dashboard.pluginLifecycleRows.filter((plugin) => plugin.pluginId === focusedPluginId);
  }, [dashboard.pluginLifecycleRows, focusedPluginId]);

  const executablePlugins = useMemo(
    () => visiblePluginRows.filter((plugin) => plugin.executableActionCatalog.length > 0),
    [visiblePluginRows],
  );
  const diagnosticPlugins = useMemo(
    () => visiblePluginRows
      .map((plugin) => ({
        ...plugin,
        executableActionCatalog: focusedActionKey
          ? plugin.executableActionCatalog.filter((action) => action.actionKey === focusedActionKey)
          : plugin.executableActionCatalog,
        blockedActionDiagnostics: focusedActionKey
          ? plugin.blockedActionDiagnostics.filter((action) => action.actionKey === focusedActionKey)
          : plugin.blockedActionDiagnostics,
      }))
      .filter((plugin) => plugin.blockedActionDiagnostics.length > 0 || plugin.blocked),
    [focusedActionKey, visiblePluginRows],
  );

  const closeDialog = () => {
    dialogRef.current?.close();
    setDialogPluginId(null);
  };

  const handleBackdropClose = useNativeDialogBackdropClose(dialogRef, closeDialog);

  const submitToggle = (
    plugin: GovernanceDashboardBundle["pluginLifecycleRows"][number],
  ) => {
    if (!schoolId) return;

    setInlineError((current) => ({ ...current, [plugin.pluginId]: null }));
    startTransition(async () => {
      const result = await setPluginEnabledForOperatorAction({
        pluginId: plugin.pluginId,
        schoolId,
        enabled: shouldEnablePlugin(plugin),
      });

      if (!result.success) {
        setInlineError((current) => ({
          ...current,
          [plugin.pluginId]: result.error ?? "PLUGIN_SET_ENABLED_FAILED",
        }));
      } else {
        router.refresh();
      }
    });
  };

  const submitRecoveryAction = (
    plugin: GovernanceDashboardBundle["pluginLifecycleRows"][number],
  ) => {
    if (!schoolId || !plugin.recommendedRecoveryAction) return;

    if (plugin.recommendedRecoveryAction === "resume") {
      setDetailConfirm({ pluginId: plugin.pluginId, action: "resume" });
      return;
    }

    setInlineError((current) => ({ ...current, [plugin.pluginId]: null }));
    startTransition(async () => {
      const reason = getRecoveryReason(plugin);

        const result = plugin.recommendedRecoveryAction === "enable"
          ? await setPluginEnabledForOperatorAction({
              pluginId: plugin.pluginId,
              schoolId,
              enabled: true,
            })
        : plugin.recommendedRecoveryAction === "resume"
          ? await transitionPluginLifecycleAction({
              pluginId: plugin.pluginId,
              schoolId,
              targetState: "enabled",
              reason,
            })
          : plugin.recommendedRecoveryAction === "retry"
            ? await retryPluginForOperatorAction({
                pluginId: plugin.pluginId,
                schoolId,
                commandId: `plugin.retry:${plugin.pluginId}`,
                reason,
              })
          : plugin.recommendedRecoveryAction === "reconcile"
              ? await reconcilePluginForOperatorAction({
                  pluginId: plugin.pluginId,
                  schoolId,
                  reason,
                  targetState: "enabled",
                })
              : await setPluginEnabledForOperatorAction({
                  pluginId: plugin.pluginId,
                  schoolId,
                  enabled: shouldEnablePlugin(plugin),
                });

      if (!result.success) {
        setInlineError((current) => ({
          ...current,
          [plugin.pluginId]: result.error ?? "PLUGIN_RECOVERY_ACTION_FAILED",
        }));
      } else {
        router.refresh();
      }
    });
  };

  const submitHighRiskRecoveryAction = (
    plugin: GovernanceDashboardBundle["pluginLifecycleRows"][number],
    action: "resume" | "suspend" | "fallback",
  ) => {
    if (!schoolId) return;

    setInlineError((current) => ({ ...current, [plugin.pluginId]: null }));
    startTransition(async () => {
      const result = await runOperatorPostureRecoveryAction({
        scope: "plugin",
        pluginId: plugin.pluginId,
        schoolId,
        recoveryAction: action,
        reason: action === "resume"
          ? getRecoveryReason(plugin)
          : action === "suspend"
            ? "operator_suspend"
            : "operator_fallback",
        revalidatePaths: [`/settings/labs/plugins/${plugin.pluginId}`, "/settings/labs"],
      });

      if (!result.success) {
        setInlineError((current) => ({
          ...current,
          [plugin.pluginId]: result.error,
        }));
        return;
      }

      setDetailConfirm(null);
      router.refresh();
    });
  };

  const submitKillSwitch = (
    plugin: GovernanceDashboardBundle["pluginLifecycleRows"][number],
    killSwitchEnabled: boolean,
  ) => {
    setInlineError((current) => ({ ...current, [plugin.pluginId]: null }));
    startTransition(async () => {
      const result = await setPluginKillSwitchAction({
        pluginId: plugin.pluginId,
        killSwitchEnabled,
      });

      if (!result.success) {
        setInlineError((current) => ({
          ...current,
          [plugin.pluginId]: result.error ?? "PLUGIN_KILL_SWITCH_FAILED",
        }));
      } else {
        router.refresh();
      }
    });
  };

  const runPreflight = (
    plugin: GovernanceDashboardBundle["pluginLifecycleRows"][number],
  ) => {
    if (!schoolId) return;

    setInlineError((current) => ({ ...current, [plugin.pluginId]: null }));
    startTransition(async () => {
      const result = await preflightUninstallPluginAction({
        pluginId: plugin.pluginId,
        schoolId,
      });

      if (!result.success || !result.data) {
        setInlineError((current) => ({
          ...current,
          [plugin.pluginId]: result.error ?? "PLUGIN_UNINSTALL_PREFLIGHT_FAILED",
        }));
        return;
      }

      setPreflightResults((current) => ({
        ...current,
        [plugin.pluginId]: result.data as PreflightUninstallPluginResult,
      }));
    });
  };

  const openDialog = (pluginId: string) => {
    setDialogPluginId(pluginId);
    dialogRef.current?.showModal();
  };

  const confirmUninstall = () => {
    if (!schoolId || !dialogPlugin) return;

    const wantsCleanup = cleanupIntent[dialogPlugin.pluginId] === true;
    if (wantsCleanup && !cleanupConfirmed[dialogPlugin.pluginId]) {
      setInlineError((current) => ({
        ...current,
        [dialogPlugin.pluginId]: "CLEANUP_CONFIRMATION_REQUIRED",
      }));
      return;
    }

    startTransition(async () => {
        const result = await uninstallPluginAction({
          pluginId: dialogPlugin.pluginId,
          schoolId,
          retentionMode: wantsCleanup ? "cleanup" : "retain",
          confirmationToken: wantsCleanup
            ? dialogPreflight?.cleanupConfirmationToken
            : undefined,
        });

      if (!result.success) {
        setInlineError((current) => ({
          ...current,
          [dialogPlugin.pluginId]: result.error ?? "PLUGIN_DELETE_FAILED",
        }));
        return;
      }

      closeDialog();
      router.refresh();
    });
  };

  if (!visiblePluginRows.length) {
    return (
      <div className={cn(teacherSurfaceRhythm.cardInset, "p-4 text-sm leading-6 text-on-surface-variant")}>
        还没有可治理的插件。完成插件注册或默认插件 reconcile 后，这里会显示可执行 actions、生命周期状态与阻塞原因。下一步先安装插件，或运行默认插件同步。
      </div>
    );
  }

  return (
    <>
      <div className="rounded-[1.75rem] bg-surface-container-low p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[52rem]">
            <p className="text-sm text-on-surface-variant">插件治理工作台</p>
            <h2 className="mt-2 text-[1.75rem] font-semibold leading-tight text-on-surface">
              当前可执行 actions 与治理诊断
            </h2>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              默认首屏只显示 executable action catalog。blocked diagnostics 只会出现在显式的治理诊断入口中，避免普通调用面看到内部阻塞细节。
            </p>
          </div>
          <div className="inline-flex rounded-full bg-surface-container-lowest p-1">
            <button
              type="button"
              className={cn(
                "min-h-11 rounded-full px-4 text-sm font-semibold transition",
                !showDiagnostics ? "bg-primary text-on-primary" : "text-on-surface-variant",
              )}
              onClick={() => setShowDiagnostics(false)}
            >
              可执行 actions
            </button>
            <button
              type="button"
              className={cn(
                "min-h-11 rounded-full px-4 text-sm font-semibold transition",
                showDiagnostics ? "bg-primary text-on-primary" : "text-on-surface-variant",
              )}
              onClick={() => setShowDiagnostics(true)}
            >
              查看治理诊断
            </button>
          </div>
        </div>
      </div>

      {!showDiagnostics ? (
        <div className="mt-4 grid gap-3">
          {executablePlugins.map((plugin) => (
            <article key={plugin.pluginId} className={cn(teacherSurfaceRhythm.cardInset, "p-4")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-on-surface">{plugin.name}</p>
                    <Badge variant={lifecycleBadgeTone[plugin.lifecycleState]}>
                      {lifecycleLabel[plugin.lifecycleState]}
                    </Badge>
                    {plugin.builtIn ? (
                      <Badge className="bg-primary/10 text-primary">系统内置</Badge>
                    ) : null}
                    {plugin.defaultEnabled ? (
                      <Badge className="bg-surface-container-low text-on-surface">默认开启</Badge>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                    当前 badge、action badge 与治理状态全部来自统一 read model，不再回退到 raw plugin DTO 本地推断。
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge className="bg-surface-container-low text-on-surface-variant">
                      owner: {plugin.pluginKey}
                    </Badge>
                    <Badge className="bg-surface-container-low text-on-surface-variant">
                      namespace: {plugin.dbNamespace}
                    </Badge>
                    <Badge className="bg-surface-container-low text-on-surface-variant">
                      source: {plugin.sourceType}
                    </Badge>
                    <Badge className="bg-surface-container-low text-on-surface-variant">
                      install: {plugin.installSource}
                    </Badge>
                    {plugin.executableActionCatalog.map((action) => (
                      <Badge
                        key={`${plugin.pluginId}-${action.actionKey}`}
                        className="bg-surface-container-low text-on-surface-variant"
                      >
                        action: {action.actionKey}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}

          {!executablePlugins.length ? (
            <div className={cn(teacherSurfaceRhythm.cardInset, "p-4 text-sm leading-6 text-on-surface-variant")}>
              当前没有可执行 actions。请切换到“查看治理诊断”定位阻断原因，并执行明确的恢复动作。
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {diagnosticPlugins.map((plugin) => {
            const preflight = preflightResults[plugin.pluginId] ?? {
              pluginId: plugin.pluginId,
              schoolId: schoolId ?? "",
              blocked: plugin.uninstall.blocked,
              reason: plugin.uninstall.reasonCode,
              lessonExtCount: plugin.uninstall.preflightSummary.lessonExtCount,
              stepExtCount: plugin.uninstall.preflightSummary.stepExtCount,
              resourceExtCount: plugin.uninstall.preflightSummary.resourceExtCount,
              ownedBusinessCount: plugin.uninstall.preflightSummary.ownedBusinessCount,
              totalCount: plugin.uninstall.preflightSummary.totalCount,
              impactedLessonIds: [],
              impactedLessonStepIds: [],
              impactedResourceIds: [],
              impactedBusinessKeys: [],
              cleanupConfirmationToken: plugin.uninstall.cleanupConfirmationToken,
            } satisfies PreflightUninstallPluginResult;
            const canOpenDialog = !preflight.blocked;
            const activeDetailConfirm = detailConfirm?.pluginId === plugin.pluginId ? detailConfirm : null;

            return (
              <article key={plugin.pluginId} className={cn(teacherSurfaceRhythm.cardInset, "p-4")}>
                {(() => {
                  const honestyCard = toPluginLifecycleHonestyCard(plugin);

                  return honestyCard ? (
                    <div className="mb-4 rounded-[1.25rem] bg-[#fff7ed] px-4 py-4 text-[#9a3412]">
                      <p className="text-xs uppercase tracking-[0.18em]">degraded honesty</p>
                      <h3 className="mt-2 text-sm font-semibold">{honestyCard.title}</h3>
                      <div className="mt-3 grid gap-3 text-sm leading-6">
                        {honestyCard.sections.map((section) => (
                          <p key={section.id}>
                            <span className="font-medium">{section.label}：</span>
                            {section.content}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-on-surface">{plugin.name}</p>
                      <Badge variant={lifecycleBadgeTone[plugin.lifecycleState]}>
                        {lifecycleLabel[plugin.lifecycleState]}
                      </Badge>
                      {plugin.builtIn ? (
                        <Badge className="bg-primary/10 text-primary">系统内置</Badge>
                      ) : null}
                      {plugin.defaultEnabled ? (
                        <Badge className="bg-surface-container-low text-on-surface">默认开启</Badge>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge className="bg-surface-container-low text-on-surface-variant">
                        action key: {plugin.blockedActionDiagnostics[0]?.actionKey ?? "—"}
                      </Badge>
                      <Badge className="bg-surface-container-low text-on-surface-variant">
                        owner: {plugin.pluginKey}
                      </Badge>
                      <Badge className="bg-surface-container-low text-on-surface-variant">
                        namespace: {plugin.dbNamespace}
                      </Badge>
                      <Badge className="bg-surface-container-low text-on-surface-variant">
                        source: {plugin.sourceType}
                      </Badge>
                      <Badge className="bg-surface-container-low text-on-surface-variant">
                        install: {plugin.installSource}
                      </Badge>
                      <Badge className="bg-surface-container-low text-on-surface-variant">
                        lifecycle: {plugin.lifecycleState}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm font-medium text-on-surface">
                      {lifecycleLabel[plugin.lifecycleState]}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                      reason code: {plugin.reasonCode ?? "none"} · 恢复动作：
                      {plugin.recommendedRecoveryAction
                        ? recoveryActionLabel[plugin.recommendedRecoveryAction]
                        : "无"}
                    </p>
                     {plugin.builtIn || plugin.nonDeletable ? (
                       <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                         该插件由系统提供，可启用或停用，但不会作为可删除扩展处理。
                       </p>
                     ) : plugin.lifecycleState === "uninstalled" ? (
                       <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                         该插件处于 retain-uninstall 审计态；历史数据保留，但不会作为当前可执行扩展参与治理动作。
                       </p>
                     ) : (
                       <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                         停用 ≠ 卸载。卸载默认 retain；只有显式选择 cleanup 并确认后才会进入清理分支。
                       </p>
                     )}
                  </div>
                </div>

                {showPrimaryLifecycleAction(plugin) ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-10 px-4 text-sm shadow-none"
                      onClick={() =>
                        plugin.recommendedRecoveryAction
                          ? submitRecoveryAction(plugin)
                          : submitToggle(plugin)
                      }
                      disabled={isPending || !schoolId}
                    >
                      {getPrimaryActionLabel(plugin)}
                    </Button>

                    {plugin.lifecycleState === "active" ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-10 px-4 text-sm shadow-none"
                        onClick={() => setDetailConfirm({ pluginId: plugin.pluginId, action: "fallback" })}
                        disabled={isPending}
                      >
                        切换到降级姿态
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                {activeDetailConfirm ? (
                  <div className="mt-4 rounded-[1.25rem] bg-surface-container-low px-4 py-4">
                    <h3 className="text-sm font-semibold text-on-surface">
                      {activeDetailConfirm.action === "resume"
                        ? "恢复运行姿态"
                        : activeDetailConfirm.action === "suspend"
                          ? "暂停当前姿态"
                          : "切换到降级姿态"}
                    </h3>
                    <div className="mt-3 grid gap-3 text-sm leading-6 text-on-surface-variant">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em]">影响范围</p>
                        <p className="mt-1">
                          {activeDetailConfirm.action === "resume"
                            ? "会让当前插件重新进入可执行姿态，并刷新当前 detail surface 与治理列表。"
                            : activeDetailConfirm.action === "suspend"
                              ? "会把当前插件切换到 suspended posture，阻止继续放大异常影响。"
                              : "会打开 kill switch，强制 operator 改走降级路径继续观察系统状态。"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em]">姿态变化</p>
                        <p className="mt-1">
                          {activeDetailConfirm.action === "resume"
                            ? "姿态变化：恢复到 enabled。"
                            : activeDetailConfirm.action === "suspend"
                              ? "姿态变化：切换到 suspended。"
                              : "姿态变化：切换到 fallback / kill-switch posture。"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em]">将写入的审计记录</p>
                        <p className="mt-1">
                          {activeDetailConfirm.action === "fallback"
                            ? "将写入的审计记录：plugin.kill_switch.set command、recovery audit 与 task history。"
                            : `将写入的审计记录：plugin.${activeDetailConfirm.action} command、recovery audit 与 task history。`}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        type="button"
                        onClick={() => submitHighRiskRecoveryAction(plugin, activeDetailConfirm.action)}
                        disabled={isPending || !schoolId}
                      >
                        {`确认${activeDetailConfirm.action === "resume"
                          ? "解除挂起"
                          : activeDetailConfirm.action === "suspend"
                            ? "暂停当前姿态"
                            : "切换到降级姿态"}`}
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => setDetailConfirm(null)}>
                        取消
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 rounded-[1.5rem] bg-surface-container-low px-4 py-4">
                  <p className="text-sm font-semibold text-on-surface">运行保护与卸载</p>
                  {plugin.builtIn || plugin.nonDeletable ? (
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                      当前不可卸载：默认插件与 nonDeletable posture 仅显示只读阻断说明。
                    </p>
                  ) : (
                    <div className="mt-3 grid gap-3">
                      <div className="flex flex-wrap gap-3">
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-10 px-4 text-sm shadow-none"
                          onClick={() => runPreflight(plugin)}
                          disabled={isPending || !schoolId}
                        >
                          查看卸载影响
                        </Button>
                        {canOpenDialog ? (
                          <Button
                            type="button"
                            variant="secondary"
                            className="min-h-10 px-4 text-sm shadow-none"
                            onClick={() => openDialog(plugin.pluginId)}
                          >
                            打开卸载确认
                          </Button>
                        ) : null}
                      </div>

                      <div className="rounded-[1.25rem] bg-surface-container-lowest px-4 py-4">
                        <p className="text-sm font-semibold text-on-surface">卸载前检查</p>
                        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                          {preflight.totalCount > 0
                            ? "retain 为默认姿态；如需 cleanup，必须显式确认 lesson / lesson step / resource / plugin-owned data 的影响数量。"
                            : "可继续卸载；默认 retain，不会自动清理数据。"}
                        </p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          {preflightTileLabels.map(([label, key]) => (
                            <div key={label} className="rounded-[1rem] bg-surface-container-low px-3 py-3">
                              <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">
                                {label}
                              </p>
                              <p className="mt-2 text-lg font-semibold text-on-surface">
                                {preflight[key]}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {inlineError[plugin.pluginId] ? (
                  <p className="mt-3 rounded-[1rem] bg-error-container px-3 py-3 text-sm text-on-error-container">
                    {inlineError[plugin.pluginId]}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      <dialog
        ref={dialogRef}
        className={getNativeDialogClassName("lg", "min-w-[20rem]")}
        onClick={handleBackdropClose}
      >
        <div className="w-full p-6">
          <h2 className="text-lg font-semibold text-on-surface">卸载插件</h2>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
            卸载默认采用 retain posture：移除当前学校下该插件的注册记录，但默认保留历史数据。只有在你显式选择 cleanup 并确认后，才会清理受影响数据；默认插件不可删除。
          </p>

          {dialogPlugin ? (
            <div className="mt-4 rounded-[1.25rem] bg-surface-container-low px-4 py-4 text-sm leading-6 text-on-surface-variant">
              <p className="font-medium text-on-surface">{dialogPlugin.name}</p>
              <p className="mt-2">
                {dialogPlugin.sourceType} · {dialogPlugin.pluginKey}
              </p>
              <p className="mt-2">
                namespace: {dialogPlugin.dbNamespace} · install: {dialogPlugin.installSource}
              </p>
              <p className="mt-2">
                依赖总数：{dialogPreflight?.totalCount ?? dialogPlugin.uninstall.preflightSummary.totalCount}
              </p>
              <p className="mt-2">
                lesson: {dialogPreflight?.lessonExtCount ?? dialogPlugin.uninstall.preflightSummary.lessonExtCount} · lesson step: {dialogPreflight?.stepExtCount ?? dialogPlugin.uninstall.preflightSummary.stepExtCount}
              </p>
              <p className="mt-2">
                resource: {dialogPreflight?.resourceExtCount ?? dialogPlugin.uninstall.preflightSummary.resourceExtCount} · plugin-owned data: {dialogPreflight?.ownedBusinessCount ?? dialogPlugin.uninstall.preflightSummary.ownedBusinessCount}
              </p>

              <div className="mt-4 rounded-[1rem] bg-surface-container-lowest px-4 py-4">
                <p className="text-sm font-semibold text-on-surface">卸载姿态</p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  retain 为默认姿态；cleanup 需要显式 opt-in 与确认。
                </p>
                <label className="mt-3 flex items-start gap-3 text-sm text-on-surface">
                  <input
                    aria-label="改为 cleanup 卸载"
                    type="checkbox"
                    checked={cleanupIntent[dialogPlugin.pluginId] === true}
                    onChange={(event) => {
                      const checked = event.currentTarget.checked;
                      setCleanupIntent((current) => ({
                        ...current,
                        [dialogPlugin.pluginId]: checked,
                      }));
                      if (!checked) {
                        setCleanupConfirmed((current) => ({
                          ...current,
                          [dialogPlugin.pluginId]: false,
                        }));
                      }
                    }}
                  />
                  <span>
                    改为 cleanup 卸载，清理 lesson / lesson step / resource / plugin-owned data。
                  </span>
                </label>
                {cleanupIntent[dialogPlugin.pluginId] ? (
                  <label className="mt-3 flex items-start gap-3 text-sm text-on-surface">
                    <input
                      aria-label="我已确认 cleanup"
                      type="checkbox"
                      checked={cleanupConfirmed[dialogPlugin.pluginId] === true}
                      onChange={(event) => {
                        const checked = event.currentTarget.checked;
                        setCleanupConfirmed((current) => ({
                          ...current,
                          [dialogPlugin.pluginId]: checked,
                        }));
                      }}
                    />
                    <span>
                      我已确认 cleanup 会删除以上分类数据，并且这是显式的破坏性操作。
                    </span>
                  </label>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={closeDialog}>
              取消
            </Button>
            <Button
              type="button"
              onClick={confirmUninstall}
              disabled={isPending || !dialogPlugin}
            >
              确认卸载插件
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
