import {
  PlatformCommandPayloadSchemas,
  type PlatformCommandDefinition,
  type PlatformCommandType,
} from "./contracts";

export function createPlatformCommandDefinition<TType extends PlatformCommandType>(
  input: PlatformCommandDefinition<TType>,
): PlatformCommandDefinition<TType> {
  return input;
}

const unsupportedAuthorize: PlatformCommandDefinition["authorize"] = async () => {
  throw new Error("PLATFORM_COMMAND_HANDLER_NOT_IMPLEMENTED");
};

const unsupportedExecute: PlatformCommandDefinition["execute"] = async () => {
  throw new Error("PLATFORM_COMMAND_HANDLER_NOT_IMPLEMENTED");
};

export const platformCommandRegistry = {
  "plugin.install": createPlatformCommandDefinition({
    commandType: "plugin.install",
    payloadSchema: PlatformCommandPayloadSchemas["plugin.install"],
    dedupe: "required",
    authorize: unsupportedAuthorize,
    execute: unsupportedExecute,
  }),
  "plugin.enable": createPlatformCommandDefinition({
    commandType: "plugin.enable",
    payloadSchema: PlatformCommandPayloadSchemas["plugin.enable"],
    dedupe: "required",
    authorize: unsupportedAuthorize,
    execute: unsupportedExecute,
  }),
  "plugin.disable": createPlatformCommandDefinition({
    commandType: "plugin.disable",
    payloadSchema: PlatformCommandPayloadSchemas["plugin.disable"],
    dedupe: "required",
    authorize: unsupportedAuthorize,
    execute: unsupportedExecute,
  }),
  "plugin.retry": createPlatformCommandDefinition({
    commandType: "plugin.retry",
    payloadSchema: PlatformCommandPayloadSchemas["plugin.retry"],
    dedupe: "required",
    authorize: unsupportedAuthorize,
    execute: unsupportedExecute,
  }),
  "plugin.suspend": createPlatformCommandDefinition({
    commandType: "plugin.suspend",
    payloadSchema: PlatformCommandPayloadSchemas["plugin.suspend"],
    dedupe: "required",
    authorize: unsupportedAuthorize,
    execute: unsupportedExecute,
  }),
  "plugin.resume": createPlatformCommandDefinition({
    commandType: "plugin.resume",
    payloadSchema: PlatformCommandPayloadSchemas["plugin.resume"],
    dedupe: "required",
    authorize: unsupportedAuthorize,
    execute: unsupportedExecute,
  }),
  "plugin.uninstall.preflight": createPlatformCommandDefinition({
    commandType: "plugin.uninstall.preflight",
    payloadSchema: PlatformCommandPayloadSchemas["plugin.uninstall.preflight"],
    dedupe: "optional",
    authorize: unsupportedAuthorize,
    execute: unsupportedExecute,
  }),
  "plugin.uninstall": createPlatformCommandDefinition({
    commandType: "plugin.uninstall",
    payloadSchema: PlatformCommandPayloadSchemas["plugin.uninstall"],
    dedupe: "required",
    authorize: unsupportedAuthorize,
    execute: unsupportedExecute,
  }),
  "plugin.kill_switch.set": createPlatformCommandDefinition({
    commandType: "plugin.kill_switch.set",
    payloadSchema: PlatformCommandPayloadSchemas["plugin.kill_switch.set"],
    dedupe: "required",
    authorize: unsupportedAuthorize,
    execute: unsupportedExecute,
  }),
} satisfies Record<PlatformCommandType, PlatformCommandDefinition>;
