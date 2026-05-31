"use server";

import { revalidatePath, updateTag } from "next/cache";

import { cacheTags } from "@/lib/cache-policy";
import {
  UpdateSystemTransportSettingsInputSchema,
  type UpdateSystemTransportSettingsInput,
} from "@/lib/dto/system-transport-settings";
import { updateSystemTransportSettings } from "@/lib/dal/system-transport-settings";

function normalizeInput(input: FormData | Record<string, unknown>) {
  if (!(input instanceof FormData)) {
    return input;
  }

  return Object.fromEntries(input.entries());
}

export async function setSystemTransportModeAction(
  input: FormData | Record<string, unknown>,
) {
  const parsed = UpdateSystemTransportSettingsInputSchema.safeParse(
    normalizeInput(input),
  );
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  try {
    const result = await updateSystemTransportSettings(
      parsed.data as UpdateSystemTransportSettingsInput,
    );
    updateTag(cacheTags.systemTransport);
    revalidatePath("/settings");
    revalidatePath("/settings/labs/runtime-inspector");
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "SYSTEM_TRANSPORT_SETTINGS_UPDATE_FAILED",
    };
  }
}
