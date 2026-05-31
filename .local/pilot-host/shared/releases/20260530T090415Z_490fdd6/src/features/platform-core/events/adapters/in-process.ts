import "server-only";

import { db } from "@/db";
import { governanceAudits } from "@/db/schema";
import type { PlatformEventPublicationPort } from "@/features/platform-core/events/contracts";
import { selectOutcomeEvents } from "@/features/platform-core/events/subscribers";
import { defaultPersistedPlatformEventBus } from "@/features/platform-core/events/bus";

let hasRegisteredDefaultSubscriber = false;

function registerDefaultGovernanceAuditSubscriber() {
  if (hasRegisteredDefaultSubscriber) {
    return;
  }

  defaultPersistedPlatformEventBus.registerSubscriber({
    id: "platform-governance-audit-subscriber",
    selector: selectOutcomeEvents(),
    handle: async ({ event, commandId, correlationId }) => {
      if (event.aggregateType !== "plugin") {
        return;
      }

      const payload = event.payload as Record<string, unknown>;
      const invalidationTags = Array.isArray(payload.invalidationTags)
        ? payload.invalidationTags.filter((tag): tag is string => typeof tag === "string")
        : [];
      const resultSummary = payload.resultSummary && typeof payload.resultSummary === "object"
        ? payload.resultSummary as Record<string, unknown>
        : null;
      const failureAttribution = payload.failureAttribution && typeof payload.failureAttribution === "object"
        ? payload.failureAttribution as Record<string, unknown>
        : null;

      await db.insert(governanceAudits).values({
        targetType: "plugin",
        targetId: event.aggregateId,
        pluginId: event.aggregateId,
        schoolId: null,
        commandId,
        action: `platform_event.${event.eventType}`,
        decision: event.category === "outcome" && event.eventType === "platform.command.failed" ? "denied" : "allowed",
        reasonCode:
          typeof payload.reasonCode === "string"
            ? payload.reasonCode
            : null,
        actorId: null,
        actorScope: null,
        lifecycleState:
          resultSummary && typeof resultSummary.lifecycleState === "string"
            ? resultSummary.lifecycleState as "installed" | "enabled" | "mounted" | "ready" | "suspended" | "disabled" | "failed"
            : null,
        killSwitchEnabled: false,
        requestedCapabilitiesJson: [],
        grantedCapabilitiesJson: [],
        requiredPermission: null,
        correlationId,
        payloadJson: {
          eventType: event.eventType,
          category: event.category,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          audit: event.audit,
          invalidationTags,
          resultSummary,
          failureAttribution,
        },
      });
    },
  });

  hasRegisteredDefaultSubscriber = true;
}

export function createInProcessPlatformEventAdapter(): PlatformEventPublicationPort {
  registerDefaultGovernanceAuditSubscriber();
  return defaultPersistedPlatformEventBus;
}

export const defaultInProcessPlatformEventAdapter = createInProcessPlatformEventAdapter();
