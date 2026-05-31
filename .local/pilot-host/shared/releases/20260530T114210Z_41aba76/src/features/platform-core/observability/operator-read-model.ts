import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  platformCommands,
  platformEventDispatches,
  platformEvents,
} from "@/db/schema";
import {
  toPlatformCommandOperatorSummaryDTO,
  toPlatformCommandOperatorTimelineEventDTO,
  type PlatformCommandOperatorDetailDTO,
  type PlatformCommandOperatorSummaryDTO,
} from "./dto";

export type PlatformCommandOperatorRow = PlatformCommandOperatorSummaryDTO;

export async function listOperatorVisiblePlatformCommands(input: {
  schoolIds: string[];
  limit: number;
}): Promise<PlatformCommandOperatorSummaryDTO[]> {
  if (input.schoolIds.length === 0) {
    return [];
  }

  const rows = await db.query.platformCommands.findMany({
    where: inArray(platformCommands.schoolId, input.schoolIds),
    orderBy: [desc(platformCommands.updatedAt), desc(platformCommands.createdAt)],
    limit: input.limit,
  });

  return rows.map((row) => toPlatformCommandOperatorSummaryDTO(row));
}

export async function getPlatformCommandWithTimeline(input: {
  commandId: string;
  schoolIds: string[];
}): Promise<PlatformCommandOperatorDetailDTO> {
  if (input.schoolIds.length === 0) {
    return {
      command: null,
      timeline: [],
    };
  }

  const command = await db.query.platformCommands.findFirst({
    where: and(
      eq(platformCommands.id, input.commandId),
      inArray(platformCommands.schoolId, input.schoolIds),
    ),
  });

  if (!command) {
    return {
      command: null,
      timeline: [],
    };
  }

  const [events, dispatches] = await Promise.all([
    db.query.platformEvents.findMany({
      where: eq(platformEvents.commandId, command.id),
      orderBy: [
        asc(platformEvents.attemptNumber),
        asc(platformEvents.eventOrdinal),
        asc(platformEvents.createdAt),
      ],
    }),
    db.query.platformEventDispatches.findMany({
      where: eq(platformEventDispatches.commandId, command.id),
      orderBy: [
        asc(platformEventDispatches.attemptNumber),
        asc(platformEventDispatches.createdAt),
      ],
    }),
  ]);

  const dispatchesByEventId = new Map<string, typeof dispatches>();
  for (const dispatch of dispatches) {
    const bucket = dispatchesByEventId.get(dispatch.eventId) ?? [];
    bucket.push(dispatch);
    dispatchesByEventId.set(dispatch.eventId, bucket);
  }

  return {
    command: toPlatformCommandOperatorSummaryDTO(command),
    timeline: events.map((event) =>
      toPlatformCommandOperatorTimelineEventDTO({
        event,
        dispatches: dispatchesByEventId.get(event.id) ?? [],
      }),
    ),
  };
}
