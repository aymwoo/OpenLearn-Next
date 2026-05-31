import { z } from "zod";

export const RuntimeDatabaseDialectSchema = z.enum(["sqlite", "postgresql"]);

export const RuntimeDatabaseOwnershipSchema = z.object({
  sourceOfTruth: z.literal("classroom-session-write-path"),
  persistence: z.literal("sqlite"),
  posture: z.literal("default-only"),
  notes: z.array(z.string()).default([]),
});

export const RuntimeDatabaseWriteEnvelopeSchema = z.object({
  sessionId: z.string().min(1),
  operation: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
});

export const RuntimeDatabaseReadEnvelopeSchema = z.object({
  sessionId: z.string().min(1),
  resource: z.string().min(1),
});

export const RuntimeDatabaseReadResultSchema = z.object({
  sessionId: z.string().min(1),
  resource: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
});

export interface RuntimeDatabaseAdapter {
  readonly id: string;
  readonly dialect: z.infer<typeof RuntimeDatabaseDialectSchema>;
  readonly ownership: z.infer<typeof RuntimeDatabaseOwnershipSchema>;
  describeOwnership(): z.infer<typeof RuntimeDatabaseOwnershipSchema>;
  read(envelope: z.infer<typeof RuntimeDatabaseReadEnvelopeSchema>): Promise<z.infer<typeof RuntimeDatabaseReadResultSchema>>;
  write(envelope: z.infer<typeof RuntimeDatabaseWriteEnvelopeSchema>): Promise<void>;
}

export type RuntimeDatabaseDialect = z.infer<typeof RuntimeDatabaseDialectSchema>;
export type RuntimeDatabaseOwnership = z.infer<typeof RuntimeDatabaseOwnershipSchema>;
export type RuntimeDatabaseWriteEnvelope = z.infer<typeof RuntimeDatabaseWriteEnvelopeSchema>;
export type RuntimeDatabaseReadEnvelope = z.infer<typeof RuntimeDatabaseReadEnvelopeSchema>;
export type RuntimeDatabaseReadResult = z.infer<typeof RuntimeDatabaseReadResultSchema>;
