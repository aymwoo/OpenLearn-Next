import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { asyncWorkerHeartbeats } from "@/db/schema";

type AsyncWorkerHeartbeatStatus = "ready" | "stopping" | "stopped";

type AsyncWorkerHeartbeatInput = {
  instanceId: string;
  status: AsyncWorkerHeartbeatStatus;
  queueNames: string[];
  signal?: string | null;
  detail?: Record<string, unknown>;
};

async function upsertHeartbeatRecord(input: AsyncWorkerHeartbeatInput) {
  const existing = await db.query.asyncWorkerHeartbeats.findFirst({
    where: eq(asyncWorkerHeartbeats.instanceId, input.instanceId),
  });
  const now = new Date();
  const nextValues = {
    status: input.status,
    queueNamesJson: input.queueNames,
    lastSeenAt: now,
    startedAt:
      input.status === "ready"
        ? existing?.startedAt ?? now
        : existing?.startedAt ?? null,
    stoppedAt: input.status === "stopped" ? now : null,
    lastSignal: input.signal ?? null,
    detailJson: input.detail ?? {},
    updatedAt: now,
  } as const;

  if (!existing) {
    const [created] = await db
      .insert(asyncWorkerHeartbeats)
      .values({
        id: crypto.randomUUID(),
        instanceId: input.instanceId,
        ...nextValues,
        createdAt: now,
      })
      .returning();

    return created;
  }

  const [updated] = await db
    .update(asyncWorkerHeartbeats)
    .set(nextValues)
    .where(eq(asyncWorkerHeartbeats.id, existing.id))
    .returning();

  return updated;
}

export async function upsertAsyncWorkerHeartbeat(input: Omit<AsyncWorkerHeartbeatInput, "status"> & {
  status?: Extract<AsyncWorkerHeartbeatStatus, "ready">;
}) {
  return upsertHeartbeatRecord({
    ...input,
    status: input.status ?? "ready",
  });
}

export async function markAsyncWorkerHeartbeatStopping(
  input: Omit<AsyncWorkerHeartbeatInput, "status">,
) {
  return upsertHeartbeatRecord({
    ...input,
    status: "stopping",
  });
}

export async function markAsyncWorkerHeartbeatStopped(
  input: Omit<AsyncWorkerHeartbeatInput, "status">,
) {
  return upsertHeartbeatRecord({
    ...input,
    status: "stopped",
  });
}

export async function listAsyncWorkerHeartbeats() {
  return db.query.asyncWorkerHeartbeats.findMany({
    orderBy: [desc(asyncWorkerHeartbeats.updatedAt)],
  });
}
