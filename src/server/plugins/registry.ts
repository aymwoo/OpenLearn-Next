import { PluginActionInput } from "@/lib/dto/resource-ai";

export const PLUGIN_HOOK_ANCHORS = ["dashboard.widget", "lesson.sidebar"] as const;
export const PLUGIN_ACTION_ALLOWLIST = ["addStepSuggestion", "annotateLesson", "createNotificationStub"] as const;
export const PLUGIN_ACTION_PERMISSION_REQUIREMENTS = {
  addStepSuggestion: "lesson:write:suggestion",
  annotateLesson: "lesson:write:annotation",
  createNotificationStub: "notification:create:stub",
} as const;

export function dispatchPluginAction(input: PluginActionInput) {
  switch (input.action) {
    case "addStepSuggestion":
      return { proposalType: "stepSuggestion", payload: input.payload };
    case "annotateLesson":
      return { proposalType: "lessonAnnotation", payload: input.payload };
    case "createNotificationStub":
      return { proposalType: "notificationStub", payload: input.payload };
    default:
      return { proposalType: "unknown", payload: input.payload, denied: true };
  }
}
