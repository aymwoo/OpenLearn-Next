"use client";

import { useMemo, useRef, useState, useTransition } from "react";

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

type LifecycleCopy = {
  title: string;
  detail: string;
};

const lifecycleCopyMap: Record<PluginRegistrationDTO["lifecycleState"], LifecycleCopy> = {
  installed: {
    title: "已安装，待启用",
    detail: "已进入学校治理范围，但尚未恢复运行。",
  },
  enabled: {
    title: "已启用",
    detail: "运行能力可用，保留统一审计。",
  },
  disabled: {
    title: "已停用，数据仍保留",
    detail: "已停止运行，数据与历史记录仍保留。",
  },
  suspended: {
    title: "已挂起 / 总开关开启",
    detail: "已被总开关或风险控制阻断，请人工确认后恢复。",
  },
  mounted: {
    title: "已挂载（活跃态)",
    detail: "运行准备阶段，仍属于活跃态。",
  },
  ready: {
    title: "已就绪（活跃态)",
    detail: "运行能力已准备，可继续执行 hook。",
  },
  failed: {
    title: "异常失败",
    detail: "当前运行未成功，请先恢复或继续排查。",
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

function getPrimaryActionLabel(plugin: PluginRegistrationDTO) {
  if (plugin.lifecycleState === "installed" || plugin.lifecycleState === "disabled") {
    return "启用插件";
  }

  if (plugin.lifecycleState === "suspended") {
    return "重新启用";
  }

  if (plugin.lifecycleState === "failed") {
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

export function PluginLifecycleOperatorSurface({ schoolId, plugins }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();
  const [inlineError, setInlineError] = useState<Record<string, string | null>>({});
  const [preflightResults, setPreflightResults] = useState<Record<string, PreflightUninstallPluginResult>>({});
  const [dialogPluginId, setDialogPluginId] = useState<string | null>(null);

  const dialogPlugin = useMemo(
    () => plugins.find((plugin) => plugin.id === dialogPluginId) ?? null,
    [dialogPluginId, plugins],
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

    startTransition(async () => {
      const result = await uninstallPluginAction({
        pluginId: dialogPlugin.id,
        schoolId,
      });

      if (!result.success) {
        setInlineError((current) => ({
          ...current,
          [dialogPlugin.id]: result.error ?? "PLUGIN_DELETE_FAILED",
        }));
        return;
      }

      closeDialog();
    });
  };

  if (!plugins.length) {
    return (
      <div className={cn(teacherSurfaceRhythm.cardInset, "p-4 text-sm leading-6 text-on-surface-variant")}>
        当前学校还没有可管理的插件生命周期项。完成插件注册或默认插件 reconcile 后，这里会显示 install、启用状态、总开关与卸载限制。插件市场继续负责发现，不负责删除。
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3">
        {plugins.map((plugin) => {
          const lifecycleCopy = lifecycleCopyMap[plugin.lifecycleState];
          const preflight = preflightResults[plugin.id];
          const blocked = isUninstallBlocked(plugin);
          const canOpenDialog = Boolean(preflight && !preflight.blocked);

          return (
            <article key={plugin.id} className={cn(teacherSurfaceRhythm.cardInset, "p-4")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-on-surface">{plugin.name}</p>
                    {plugin.builtIn ? <Badge className="bg-primary/10 text-primary">系统内置</Badge> : null}
                    {plugin.defaultEnabled ? <Badge className="bg-surface-container-low text-on-surface">默认开启</Badge> : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge className="bg-surface-container-low text-on-surface-variant">Key: {plugin.pluginKey}</Badge>
                    <Badge className="bg-surface-container-low text-on-surface-variant">NS: {plugin.dbNamespace}</Badge>
                    <Badge className="bg-surface-container-low text-on-surface-variant">Source: {plugin.sourceType}</Badge>
                    <Badge className="bg-surface-container-low text-on-surface-variant">Install: {plugin.installSource}</Badge>
                  </div>
                  <p className="mt-3 text-sm font-medium text-on-surface">{lifecycleCopy.title}</p>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">{lifecycleCopy.detail}</p>
                  {plugin.killSwitchEnabled ? (
                    <p className="mt-2 text-sm leading-6 text-[#bc6c25]">立即阻断该插件的运行能力，保留数据与历史记录。</p>
                  ) : null}
                  {blocked ? (
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">该插件由系统提供，可启用或停用，但不会作为可删除扩展处理。</p>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">停用 ≠ 卸载；卸载会移除注册记录并级联清理插件数据。</p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
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

                {plugin.lifecycleState === "suspended" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-10 px-4 text-sm shadow-none"
                    onClick={() => submitKillSwitch(plugin, false)}
                    disabled={isPending}
                  >
                    保持停用
                  </Button>
                ) : null}
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
                              ? "存在依赖，继续卸载将删除这些关联数据。"
                              : "可继续卸载。"}
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

      <dialog
        ref={dialogRef}
        className={getNativeDialogClassName("lg", "min-w-[20rem]")}
        onClick={handleBackdropClose}
      >
        <div className="w-full p-6">
          <h2 className="text-lg font-semibold text-on-surface">卸载插件</h2>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
            卸载插件：这会移除当前学校下该插件的注册记录，并级联清理该插件拥有的数据；默认插件不可删除。仅当 preflight 明确显示可继续且你确认后才执行。
          </p>

          {dialogPlugin && preflightResults[dialogPlugin.id] ? (
            <div className="mt-4 rounded-[1.25rem] bg-surface-container-low px-4 py-4 text-sm leading-6 text-on-surface-variant">
              <p className="font-medium text-on-surface">{dialogPlugin.name}</p>
              <p className="mt-2">{dialogPlugin.sourceType} · {dialogPlugin.pluginKey}</p>
              <p className="mt-2">依赖总数：{preflightResults[dialogPlugin.id].totalCount}</p>
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
