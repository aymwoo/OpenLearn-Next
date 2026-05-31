import {
  PlatformCommandPayloadSchemas,
  type PlatformCommandDefinition,
  type PlatformCommandType,
} from "./contracts";
import { pluginCommandHandlers } from "./handlers/plugins";
import { lessonDraftCommandHandlers } from "./handlers/lesson-draft";

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
  "lesson.draft.run": createPlatformCommandDefinition({
    commandType: "lesson.draft.run",
    payloadSchema: PlatformCommandPayloadSchemas["lesson.draft.run"],
    dedupe: "optional",
    authorize: lessonDraftCommandHandlers["lesson.draft.run"].authorize,
    execute: lessonDraftCommandHandlers["lesson.draft.run"].execute,
  }),
  "lesson.draft.persist": createPlatformCommandDefinition({
    commandType: "lesson.draft.persist",
    payloadSchema: PlatformCommandPayloadSchemas["lesson.draft.persist"],
    dedupe: "required",    // 命令层幂等：bus 对同 dedupeKey 复用同一 command 记录（幂等双层之第一层）
    authorize: lessonDraftCommandHandlers["lesson.draft.persist"].authorize,
    execute: lessonDraftCommandHandlers["lesson.draft.persist"].execute,
  }),
  "lesson.draft.accept": createPlatformCommandDefinition({
    commandType: "lesson.draft.accept",
    payloadSchema: PlatformCommandPayloadSchemas["lesson.draft.accept"],
    dedupe: "required",
    authorize: lessonDraftCommandHandlers["lesson.draft.accept"].authorize,
    execute: lessonDraftCommandHandlers["lesson.draft.accept"].execute,
  }),
  "lesson.draft.discard": createPlatformCommandDefinition({
    commandType: "lesson.draft.discard",
    payloadSchema: PlatformCommandPayloadSchemas["lesson.draft.discard"],
    dedupe: "required",
    authorize: lessonDraftCommandHandlers["lesson.draft.discard"].authorize,
    execute: lessonDraftCommandHandlers["lesson.draft.discard"].execute,
  }),
} satisfies Record<PlatformCommandType, PlatformCommandDefinition>;
