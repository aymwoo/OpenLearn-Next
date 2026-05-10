import {
  BUILT_IN_TEACHING_STEP_DEFINITIONS,
  type BuiltInTeachingPluginName,
  BuiltInTeachingStepSuggestionPayloadSchema,
  BuiltInTeachingStepTemplatePayloadSchema,
  PluginActionInput,
  PluginActionResult,
  ScheduleConflictAnnotationPayloadSchema,
  ScheduleOverrideProposalPayloadSchema,
  ScheduleReminderDraftPayloadSchema,
} from "@/lib/dto/resource-ai";

export const PLUGIN_HOOK_ANCHORS = ["dashboard.widget", "lesson.sidebar", "schedule.assistant"] as const;
export const PLUGIN_ACTION_ALLOWLIST = [
  "addStepSuggestion",
  "annotateLesson",
  "createNotificationStub",
  "suggestBuiltInTeachingStep",
  "insertBuiltInTeachingStepTemplate",
  "createScheduleOverrideProposal",
  "createScheduleReminderDraft",
  "annotateScheduleConflict",
] as const;
export const PLUGIN_ACTION_PERMISSION_REQUIREMENTS = {
  addStepSuggestion: "lesson:write:suggestion",
  annotateLesson: "lesson:write:annotation",
  createNotificationStub: "notification:create:stub",
  suggestBuiltInTeachingStep: "lesson:write:suggestion",
  insertBuiltInTeachingStepTemplate: "lesson:write:suggestion",
  createScheduleOverrideProposal: "schedule:write:proposal",
  createScheduleReminderDraft: "schedule:write:proposal",
  annotateScheduleConflict: "schedule:write:proposal",
} as const;

const BUILT_IN_TEACHING_STEP_BY_NAME = new Map(
  BUILT_IN_TEACHING_STEP_DEFINITIONS.map((definition) => [definition.pluginName, definition] as const),
);

function resolveBuiltInTeachingStep(input: PluginActionInput) {
  const pluginName = typeof input.payload.pluginName === "string" ? input.payload.pluginName : null;
  if (!pluginName) {
    return null;
  }

  return BUILT_IN_TEACHING_STEP_BY_NAME.get(pluginName as BuiltInTeachingPluginName) ?? null;
}

export function dispatchPluginAction(input: PluginActionInput): PluginActionResult {
  switch (input.action) {
    case "addStepSuggestion":
      return { proposalType: "stepSuggestion", payload: input.payload };
    case "annotateLesson":
      return { proposalType: "lessonAnnotation", payload: input.payload };
    case "createNotificationStub":
      return { proposalType: "notificationStub", payload: input.payload };
    case "suggestBuiltInTeachingStep": {
      const definition = resolveBuiltInTeachingStep(input);
      if (!definition) {
        return { proposalType: "unknown", payload: input.payload, denied: true };
      }

      return {
        proposalType: "builtInTeachingStepSuggestion",
        payload: BuiltInTeachingStepSuggestionPayloadSchema.parse({
          builtInKey: definition.builtInKey,
          pluginName: definition.pluginName,
          title: definition.title,
          summary: definition.summary,
          stepType: definition.stepType,
        }),
      };
    }
    case "insertBuiltInTeachingStepTemplate": {
      const definition = resolveBuiltInTeachingStep(input);
      if (!definition) {
        return { proposalType: "unknown", payload: input.payload, denied: true };
      }

      return {
        proposalType: "builtInTeachingStepTemplate",
        payload: BuiltInTeachingStepTemplatePayloadSchema.parse(definition),
      };
    }
    case "createScheduleOverrideProposal":
      return {
        proposalType: "scheduleOverrideProposal",
        payload: ScheduleOverrideProposalPayloadSchema.parse(input.payload),
      };
    case "createScheduleReminderDraft":
      return {
        proposalType: "scheduleReminderDraft",
        payload: ScheduleReminderDraftPayloadSchema.parse(input.payload),
      };
    case "annotateScheduleConflict":
      return {
        proposalType: "scheduleConflictAnnotation",
        payload: ScheduleConflictAnnotationPayloadSchema.parse(input.payload),
      };
    default:
      return { proposalType: "unknown", payload: input.payload, denied: true };
  }
}
