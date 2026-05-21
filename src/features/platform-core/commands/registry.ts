import {
  PlatformCommandPayloadSchemas,
  type PlatformCommandDefinition,
  type PlatformCommandType,
} from "./contracts";
import { pluginCommandHandlers } from "./handlers/plugins";

export function createPlatformCommandDefinition<TType extends PlatformCommandType>(
  input: PlatformCommandDefinition<TType>,
): PlatformCommandDefinition<TType> {
  return input;
}

export const platformCommandRegistry = {
  "plugin.install": createPlatformCommandDefinition({
    commandType: "plugin.install",
    payloadSchema: PlatformCommandPayloadSchemas["plugin.install"],
    dedupe: "required",
    authorize: pluginCommandHandlers["plugin.install"].authorize,
    execute: pluginCommandHandlers["plugin.install"].execute,
  }),
  "plugin.enable": createPlatformCommandDefinition({
    commandType: "plugin.enable",
    payloadSchema: PlatformCommandPayloadSchemas["plugin.enable"],
    dedupe: "required",
    authorize: pluginCommandHandlers["plugin.enable"].authorize,
    execute: pluginCommandHandlers["plugin.enable"].execute,
  }),
  "plugin.disable": createPlatformCommandDefinition({
    commandType: "plugin.disable",
    payloadSchema: PlatformCommandPayloadSchemas["plugin.disable"],
    dedupe: "required",
    authorize: pluginCommandHandlers["plugin.disable"].authorize,
    execute: pluginCommandHandlers["plugin.disable"].execute,
  }),
  "plugin.reconcile": createPlatformCommandDefinition({
    commandType: "plugin.reconcile",
    payloadSchema: PlatformCommandPayloadSchemas["plugin.reconcile"],
    dedupe: "required",
    authorize: pluginCommandHandlers["plugin.reconcile"].authorize,
    execute: pluginCommandHandlers["plugin.reconcile"].execute,
  }),
  "plugin.retry": createPlatformCommandDefinition({
    commandType: "plugin.retry",
    payloadSchema: PlatformCommandPayloadSchemas["plugin.retry"],
    dedupe: "required",
    authorize: pluginCommandHandlers["plugin.retry"].authorize,
    execute: pluginCommandHandlers["plugin.retry"].execute,
  }),
  "plugin.suspend": createPlatformCommandDefinition({
    commandType: "plugin.suspend",
    payloadSchema: PlatformCommandPayloadSchemas["plugin.suspend"],
    dedupe: "required",
    authorize: pluginCommandHandlers["plugin.suspend"].authorize,
    execute: pluginCommandHandlers["plugin.suspend"].execute,
  }),
  "plugin.resume": createPlatformCommandDefinition({
    commandType: "plugin.resume",
    payloadSchema: PlatformCommandPayloadSchemas["plugin.resume"],
    dedupe: "required",
    authorize: pluginCommandHandlers["plugin.resume"].authorize,
    execute: pluginCommandHandlers["plugin.resume"].execute,
  }),
  "plugin.uninstall.preflight": createPlatformCommandDefinition({
    commandType: "plugin.uninstall.preflight",
    payloadSchema: PlatformCommandPayloadSchemas["plugin.uninstall.preflight"],
    dedupe: "optional",
    authorize: pluginCommandHandlers["plugin.uninstall.preflight"].authorize,
    execute: pluginCommandHandlers["plugin.uninstall.preflight"].execute,
  }),
  "plugin.uninstall": createPlatformCommandDefinition({
    commandType: "plugin.uninstall",
    payloadSchema: PlatformCommandPayloadSchemas["plugin.uninstall"],
    dedupe: "required",
    authorize: pluginCommandHandlers["plugin.uninstall"].authorize,
    execute: pluginCommandHandlers["plugin.uninstall"].execute,
  }),
  "plugin.kill_switch.set": createPlatformCommandDefinition({
    commandType: "plugin.kill_switch.set",
    payloadSchema: PlatformCommandPayloadSchemas["plugin.kill_switch.set"],
    dedupe: "required",
    authorize: pluginCommandHandlers["plugin.kill_switch.set"].authorize,
    execute: pluginCommandHandlers["plugin.kill_switch.set"].execute,
  }),
} satisfies Record<PlatformCommandType, PlatformCommandDefinition>;
