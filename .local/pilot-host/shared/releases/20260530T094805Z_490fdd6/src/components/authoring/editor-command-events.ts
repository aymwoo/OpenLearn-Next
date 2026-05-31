export const lessonStepEditorSaveRequestEvent = "lesson-step-editor:save-request";
export const lessonStepEditorResetRequestEvent = "lesson-step-editor:reset-request";

export function dispatchLessonStepEditorCommand(eventName: string) {
  if (typeof window === "undefined") return false;

  const event = new CustomEvent(eventName, {
    bubbles: true,
    cancelable: true,
  });

  window.dispatchEvent(event);
  return event.defaultPrevented;
}
