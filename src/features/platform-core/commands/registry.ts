import {
  PlatformCommandPayloadSchemas,
  type PlatformCommandDefinition,
  type PlatformCommandType,
} from "./contracts";
import { pluginCommandHandlers } from "./handlers/plugins";
import { lessonDraftCommandHandlers } from "./handlers/lesson-draft";
import { pluginDataInsertHandler, pluginDataUpsertHandler } from "./handlers/plugin-data";
import { quizAnswerReceivedHandler } from "./handlers/quiz-answer-received";

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
  "plugin.upgrade.preflight": createPlatformCommandDefinition({
    commandType: "plugin.upgrade.preflight",
    payloadSchema: PlatformCommandPayloadSchemas["plugin.upgrade.preflight"],
    dedupe: "optional",
    authorize: pluginCommandHandlers["plugin.upgrade.preflight"].authorize,
    execute: pluginCommandHandlers["plugin.upgrade.preflight"].execute,
  }),
  "plugin.upgrade": createPlatformCommandDefinition({
    commandType: "plugin.upgrade",
    payloadSchema: PlatformCommandPayloadSchemas["plugin.upgrade"],
    dedupe: "required",
    authorize: pluginCommandHandlers["plugin.upgrade"].authorize,
    execute: pluginCommandHandlers["plugin.upgrade"].execute,
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
  "plugin.data.insert": createPlatformCommandDefinition({
    commandType: "plugin.data.insert",
    payloadSchema: PlatformCommandPayloadSchemas["plugin.data.insert"],
    dedupe: "required",    // dedupe 键基于声明 uniques + command.id（replay-safe，写入唯一权威）
    authorize: pluginDataInsertHandler.authorize,
    execute: pluginDataInsertHandler.execute,
  }),
  "plugin.data.upsert": createPlatformCommandDefinition({
    commandType: "plugin.data.upsert",
    payloadSchema: PlatformCommandPayloadSchemas["plugin.data.upsert"],
    dedupe: "required",    // upsert 同 dedupe 键二次写：旧行 isLatest=false、新行 attemptNo+1（append-only）
    authorize: pluginDataUpsertHandler.authorize,
    execute: pluginDataUpsertHandler.execute,
  }),
  "quiz.answer.received": createPlatformCommandDefinition({
    commandType: "quiz.answer.received",
    payloadSchema: PlatformCommandPayloadSchemas["quiz.answer.received"],
    dedupe: "required",
    authorize: quizAnswerReceivedHandler.authorize,
    execute: quizAnswerReceivedHandler.execute,
  }),
  "system.http.request": createPlatformCommandDefinition({
    commandType: "system.http.request",
    payloadSchema: PlatformCommandPayloadSchemas["system.http.request"],
    dedupe: "required",
    // TODO Phase 78: validate manifest allowedDomains + allowedMethods against request payload
    authorize: async () => {},
    // TODO Phase 78: HTTP proxy implementation with SSRF protection
    execute: async () => {
      throw new Error("system.http.request handler not implemented — Phase 78");
    },
  }),
  "system.config.set": createPlatformCommandDefinition({
    commandType: "system.config.set",
    payloadSchema: PlatformCommandPayloadSchemas["system.config.set"],
    dedupe: "required",
    // TODO Phase 79: validate manifest allowedKeys against configKey, schoolId injection
    authorize: async () => {},
    // TODO Phase 79: KV config write via Command Bus producer
    execute: async () => {
      throw new Error("system.config.set handler not implemented — Phase 79");
    },
  }),
} satisfies Record<PlatformCommandType, PlatformCommandDefinition>;
