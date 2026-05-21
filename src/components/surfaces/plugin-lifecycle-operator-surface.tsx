"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  preflightUninstallPluginAction,
  setPluginEnabledAction,
  setPluginKillSwitchAction,
  uninstallPluginAction,
} from "@/actions/plugin-actions";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getNativeDialogClassName, useNativeDialogBackdropClose } from "@/components/ui/native-dialog";
import type { PreflightUninstallPluginResult } from "@/lib/dal/plugins";
import type { PluginRegistrationDTO } from "@/lib/dto/resource-ai";
import { cn } from "@/lib/utils";

type Props = {
  schoolId: string | null;
  plugins: PluginRegistrationDTO[];
};

type ExternalLifecycleState = "installed" | "enabled" | "active" | "suspended" | "uninstalled";

type LifecycleCopy = {
  state: ExternalLifecycleState;
  title: string;
  detail: string;
  badge: string;
};

const lifecycleCopyMap: Record<PluginRegistrationDTO["lifecycleState"], LifecycleCopy> = {
  installed: {
    state: "installed",
    title: "已安装",
    detail: "已进入治理范围，但还未启用到可执行 catalog。",
    badge: "已安装",
  },
  enabled: {
    state: "enabled",
    title: "已启用",
    detail: "管理员已允许该插件参与系统；只有满足治理条件后才会进入可执行 catalog。",
    badge: "已启用",
  },
  disabled: {
    state: "installed",
    title: "已安装",
    detail: "当前未启用；恢复后才会重新参与治理与执行。",
    badge: "已安装",
  },
  suspended: {
    state: "suspended",
    title: "已挂起",
    detail: "已被总开关或风险控制阻断；需要显式恢复动作，系统不会自动恢复。",
    badge: "已挂起",
  },
  mounted: {
    state: "active",
    title: "运行中",
    detail: "内部 mounted 仅作为诊断子状态存在，对外统一显示为运行中。",
    badge: "运行中",
  },
  ready: {
    state: "active",
    title: "运行中",
    detail: "内部 ready 仅作为诊断子状态存在，对外统一显示为运行中。",
    badge: "运行中",
  },
  failed: {
    state: "suspended",
    title: "已挂起",
    detail: "外部不暴露 failed 第六态；请从治理诊断查看失败原因并显式恢复。",
    badge: "已挂起",
  },
};

const preflightTileLabels = [
  ["lessons", "lessonExtCount"],
  ["lesson steps", "stepExtCount"],
  ["resources", "resourceExtCount"],
  ["plugin-owned data", "ownedBusinessCount"],
] as const;

function isUninstallBlocked(plugin: PluginRegistrationDTO) {
  return plugin.sourceType === "default" || plugin.nonDeletable;
}

function isExecutablePlugin(plugin: PluginRegistrationDTO) {
  return !plugin.killSwitchEnabled && (plugin.lifecycleState === "mounted" || plugin.lifecycleState === "ready");
}

function getPrimaryActionLabel(plugin: PluginRegistrationDTO) {
  if (plugin.lifecycleState === "installed" || plugin.lifecycleState === "disabled") {
    return "启用插件";
  }

  if (plugin.lifecycleState === "suspended" || plugin.lifecycleState === "failed") {
    return "恢复启用";
  }

  return "停用插件";
}

function getPrimaryActionEnabled(plugin: PluginRegistrationDTO) {
  return plugin.lifecycleState === "installed"
    || plugin.lifecycleState === "disabled"
    || plugin.lifecycleState === "suspended"
    || plugin.lifecycleState === "failed";
}

function getDiagnosticReason(plugin: PluginRegistrationDTO) {
  if (plugin.killSwitchEnabled || plugin.lifecycleState === "suspended") {
    return { reasonCode: "kill_switch", recovery: "resume" };
  }

  if (plugin.lifecycleState === "failed") {
    return { reasonCode: "activation_failed", recovery: "retry" };
  }

  if (plugin.lifecycleState === "installed" || plugin.lifecycleState === "disabled") {
    return { reasonCode: "not_enabled", recovery: "enable" };
  }

  return { reasonCode: "dependency_missing", recovery: "reconcile" };
}

export function PluginLifecycleOperatorSurface({ schoolId, plugins }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();
  const [inlineError, setInlineError] = useState<Record<string, string | null>>({});
  const [preflightResults, setPreflightResults] = useState<Record<string, PreflightUninstallPluginResult>>({});
  const [dialogPluginId, setDialogPluginId] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [cleanupIntent, setCleanupIntent] = useState<Record<string, boolean>>({});
  const [cleanupConfirmed, setCleanupConfirmed] = useState<Record<string, boolean>>({});

  const dialogPlugin = useMemo(
    () => plugins.find((plugin) => plugin.id === dialogPluginId) ?? null,
    [dialogPluginId, plugins],
  );

  const executablePlugins = useMemo(
    () => plugins.filter(isExecutablePlugin),
    [plugins],
  );
  const diagnosticPlugins = useMemo(
    () => plugins.filter((plugin) => !isExecutablePlugin(plugin)),
    [plugins],
  );

  const closeDialog = () => {
    dialogRef.current?.close();
    setDialogPluginId(null);
  };

  const handleBackdropClose = useNativeDialogBackdropClose(dialogRef, closeDialog);

  const submitToggle = (plugin: PluginRegistrationDTO) => {
    if (!schoolId) return;

    setInlineError((current) => ({ ...current, [plugin.id]: null }));
    startTransition(async () => {
      const result = await setPluginEnabledAction({
        pluginId: plugin.id,
        schoolId,
        enabled: getPrimaryActionEnabled(plugin),
      });

      if (!result.success) {
        setInlineError((current) => ({ ...current, [plugin.id]: result.error ?? "PLUGIN_SET_ENABLED_FAILED" }));
      } else {
        router.refresh();
      }
    });
  };

  const submitKillSwitch = (plugin: PluginRegistrationDTO, killSwitchEnabled: boolean) => {
    setInlineError((current) => ({ ...current, [plugin.id]: null }));
    startTransition(async () => {
      const result = await setPluginKillSwitchAction({
        pluginId: plugin.id,
        killSwitchEnabled,
      });

      if (!result.success) {
        setInlineError((current) => ({ ...current, [plugin.id]: result.error ?? "PLUGIN_KILL_SWITCH_FAILED" }));
      } else {
        router.refresh();
      }
    });
  };

  const runPreflight = (plugin: PluginRegistrationDTO) => {
    if (!schoolId) return;

    setInlineError((current) => ({ ...current, [plugin.id]: null }));
    startTransition(async () => {
      const result = await preflightUninstallPluginAction({
        pluginId: plugin.id,
        schoolId,
      });

      if (!result.success || !result.data) {
        setInlineError((current) => ({ ...current, [plugin.id]: result.error ?? "PLUGIN_UNINSTALL_PREFLIGHT_FAILED" }));
        return;
      }

      setPreflightResults((current) => ({ ...current, [plugin.id]: result.data as PreflightUninstallPluginResult }));
    });
  };

  const openDialog = (pluginId: string) => {
    setDialogPluginId(pluginId);
    dialogRef.current?.showModal();
  };

  const confirmUninstall = () => {
    if (!schoolId || !dialogPlugin) return;

    const wantsCleanup = cleanupIntent[dialogPlugin.id] === true;
    if (wantsCleanup && !cleanupConfirmed[dialogPlugin.id]) {
      setInlineError((current) => ({
        ...current,
        [dialogPlugin.id]: "CLEANUP_CONFIRMATION_REQUIRED",
      }));
      return;
    }

    startTransition(async () => {
      const result = await uninstallPluginAction({
        pluginId: dialogPlugin.id,
        schoolId,
        retentionMode: wantsCleanup ? "cleanup" : "retain",
      });

      if (!result.success) {
        setInlineError((current) => ({
          ...current,
          [dialogPlugin.id]: result.error ?? "PLUGIN_DELETE_FAILED",
        }));
        return;
      }

      closeDialog();
      router.refresh();
    });
  };

  if (!plugins.length) {
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
            <h2 className="mt-2 text-[1.75rem] font-semibold leading-tight text-on-surface">当前可执行 actions 与治理诊断</h2>
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
          {executablePlugins.map((plugin) => {
            const lifecycleCopy = lifecycleCopyMap[plugin.lifecycleState];

            return (
              <article key={plugin.id} className={cn(teacherSurfaceRhythm.cardInset, "p-4")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-on-surface">{plugin.name}</p>
                      <Badge variant="accent">{lifecycleCopy.badge}</Badge>
                      {plugin.builtIn ? <Badge className="bg-primary/10 text-primary">系统内置</Badge> : null}
                      {plugin.defaultEnabled ? <Badge className="bg-surface-container-low text-on-surface">默认开启</Badge> : null}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-on-surface-variant">{lifecycleCopy.detail}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {plugin.manifestJson.actions.map((actionKey) => (
                        <Badge key={actionKey} className="bg-surface-container-low text-on-surface-variant">action: {actionKey}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {!executablePlugins.length ? (
            <div className={cn(teacherSurfaceRhythm.cardInset, "p-4 text-sm leading-6 text-on-surface-variant")}>
              当前没有可执行 actions。请切换到“查看治理诊断”定位阻断原因，并执行明确的恢复动作。
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {diagnosticPlugins.map((plugin) => {
            const lifecycleCopy = lifecycleCopyMap[plugin.lifecycleState];
            const preflight = preflightResults[plugin.id];
            const blocked = isUninstallBlocked(plugin);
            const canOpenDialog = Boolean(preflight && !preflight.blocked);
            const diagnostic = getDiagnosticReason(plugin);

            return (
              <article key={plugin.id} className={cn(teacherSurfaceRhythm.cardInset, "p-4")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-on-surface">{plugin.name}</p>
                      <Badge variant={lifecycleCopy.state === "active" ? "accent" : "default"}>{lifecycleCopy.badge}</Badge>
                      {plugin.builtIn ? <Badge className="bg-primary/10 text-primary">系统内置</Badge> : null}
                      {plugin.defaultEnabled ? <Badge className="bg-surface-container-low text-on-surface">默认开启</Badge> : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge className="bg-surface-container-low text-on-surface-variant">action key: {plugin.manifestJson.actions[0] ?? "—"}</Badge>
                      <Badge className="bg-surface-container-low text-on-surface-variant">owner: {plugin.pluginKey}</Badge>
                      <Badge className="bg-surface-container-low text-on-surface-variant">lifecycle: {lifecycleCopy.state}</Badge>
                    </div>
                    <p className="mt-3 text-sm font-medium text-on-surface">{lifecycleCopy.title}</p>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">{lifecycleCopy.detail}</p>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">reason code: {diagnostic.reasonCode} · 恢复动作：{diagnostic.recovery}</p>
                    {(plugin.lifecycleState === "mounted" || plugin.lifecycleState === "ready" || plugin.lifecycleState === "failed") ? (
                      <p className="mt-2 text-xs leading-5 text-on-surface-variant">internal diagnostic only: {plugin.lifecycleState}</p>
                    ) : null}
                    {blocked ? (
                      <p className="mt-2 text-sm leading-6 text-on-surface-variant">该插件由系统提供，可启用或停用，但不会作为可删除扩展处理。</p>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-on-surface-variant">停用 ≠ 卸载。卸载默认 retain；只有显式选择 cleanup 并确认后才会进入清理分支。</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  {plugin.lifecycleState === "suspended" ? (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-10 px-4 text-sm shadow-none"
                        onClick={() => submitKillSwitch(plugin, false)}
                        disabled={isPending}
                      >
                        解除挂起
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-10 px-4 text-sm shadow-none"
                        onClick={() => submitToggle(plugin)}
                        disabled={isPending || !schoolId}
                      >
                        保持停用
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-10 px-4 text-sm shadow-none"
                        onClick={() => submitToggle(plugin)}
                        disabled={isPending || !schoolId}
                      >
                        {getPrimaryActionLabel(plugin)}
                      </Button>

                      {(plugin.lifecycleState === "enabled" || plugin.lifecycleState === "mounted" || plugin.lifecycleState === "ready") ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-10 px-4 text-sm shadow-none"
                          onClick={() => submitKillSwitch(plugin, true)}
                          disabled={isPending}
                        >
                          紧急挂起
                        </Button>
                      ) : null}
                    </>
                  )}
                </div>

                <div className="mt-4 rounded-[1.5rem] bg-surface-container-low px-4 py-4">
                  <p className="text-sm font-semibold text-on-surface">运行保护与卸载</p>
                  {blocked ? (
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">当前不可卸载：默认插件与 nonDeletable posture 仅显示只读阻断说明。</p>
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
                            onClick={() => openDialog(plugin.id)}
                          >
                            打开卸载确认
                          </Button>
                        ) : null}
                      </div>

                      {preflight ? (
                        <div className="rounded-[1.25rem] bg-surface-container-lowest px-4 py-4">
                          <p className="text-sm font-semibold text-on-surface">卸载前检查</p>
                          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                            {preflight.blocked
                              ? "已阻断，当前不可卸载。"
                              : preflight.totalCount > 0
                                ? "retain 为默认姿态；如需 cleanup，必须显式确认 lesson / lesson step / resource / plugin-owned data 的影响数量。"
                                : "可继续卸载；默认 retain，不会自动清理数据。"}
                          </p>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {preflightTileLabels.map(([label, key]) => (
                              <div key={label} className="rounded-[1rem] bg-surface-container-low px-3 py-3">
                                <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">{label}</p>
                                <p className="mt-2 text-lg font-semibold text-on-surface">{preflight[key]}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {inlineError[plugin.id] ? (
                  <p className="mt-3 rounded-[1rem] bg-error-container px-3 py-3 text-sm text-on-error-container">
                    {inlineError[plugin.id]}
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

          {dialogPlugin && preflightResults[dialogPlugin.id] ? (
            <div className="mt-4 rounded-[1.25rem] bg-surface-container-low px-4 py-4 text-sm leading-6 text-on-surface-variant">
              <p className="font-medium text-on-surface">{dialogPlugin.name}</p>
              <p className="mt-2">{dialogPlugin.sourceType} · {dialogPlugin.pluginKey}</p>
              <p className="mt-2">依赖总数：{preflightResults[dialogPlugin.id].totalCount}</p>
              <p className="mt-2">lesson: {preflightResults[dialogPlugin.id].lessonExtCount} · lesson step: {preflightResults[dialogPlugin.id].stepExtCount}</p>
              <p className="mt-2">resource: {preflightResults[dialogPlugin.id].resourceExtCount} · plugin-owned data: {preflightResults[dialogPlugin.id].ownedBusinessCount}</p>

              <div className="mt-4 rounded-[1rem] bg-surface-container-lowest px-4 py-4">
                <p className="text-sm font-semibold text-on-surface">卸载姿态</p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">retain 为默认姿态；cleanup 需要显式 opt-in 与确认。</p>
                <label className="mt-3 flex items-start gap-3 text-sm text-on-surface">
                  <input
                    aria-label="改为 cleanup 卸载"
                    type="checkbox"
                    checked={cleanupIntent[dialogPlugin.id] === true}
                    onChange={(event) => {
                      const checked = event.currentTarget.checked;
                      setCleanupIntent((current) => ({ ...current, [dialogPlugin.id]: checked }));
                      if (!checked) {
                        setCleanupConfirmed((current) => ({ ...current, [dialogPlugin.id]: false }));
                      }
                    }}
                  />
                  <span>改为 cleanup 卸载，清理 lesson / lesson step / resource / plugin-owned data。</span>
                </label>
                {cleanupIntent[dialogPlugin.id] ? (
                  <label className="mt-3 flex items-start gap-3 text-sm text-on-surface">
                    <input
                      aria-label="我已确认 cleanup"
                      type="checkbox"
                      checked={cleanupConfirmed[dialogPlugin.id] === true}
                      onChange={(event) => {
                        const checked = event.currentTarget.checked;
                        setCleanupConfirmed((current) => ({ ...current, [dialogPlugin.id]: checked }));
                      }}
                    />
                    <span>我已确认 cleanup 会删除以上分类数据，并且这是显式的破坏性操作。</span>
                  </label>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={closeDialog}>取消</Button>
            <Button type="button" onClick={confirmUninstall} disabled={isPending || !dialogPlugin}>确认卸载插件</Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
