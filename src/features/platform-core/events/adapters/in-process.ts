import type { PlatformEventPublicationPort } from "@/features/platform-core/events/contracts";
import { defaultPersistedPlatformEventBus } from "@/features/platform-core/events/bus";

export function createInProcessPlatformEventAdapter(): PlatformEventPublicationPort {
  return defaultPersistedPlatformEventBus;
}

export const defaultInProcessPlatformEventAdapter = createInProcessPlatformEventAdapter();
