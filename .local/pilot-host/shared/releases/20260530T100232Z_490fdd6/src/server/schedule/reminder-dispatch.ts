import { assertNoSecretMaterial } from "@/server/mcp/registry";

export const ALLOWED_SCHEDULE_REMINDER_CHANNELS = ["wecom-notify", "dingtalk-notify"] as const;

export function isSupportedScheduleReminderChannel(channel: string) {
  return (ALLOWED_SCHEDULE_REMINDER_CHANNELS as readonly string[]).includes(channel);
}

export async function dispatchScheduleReminder(input: { channel: string; payload: Record<string, unknown> }) {
  if (!isSupportedScheduleReminderChannel(input.channel)) {
    throw new Error("SCHEDULE_REMINDER_BLOCKED");
  }

  assertNoSecretMaterial(input.payload);

  if (input.payload.simulateFailure === true) {
    return {
      status: "failed" as const,
      failureReason: "模拟发送失败",
    };
  }

  return {
    status: "sent" as const,
    failureReason: null,
  };
}
