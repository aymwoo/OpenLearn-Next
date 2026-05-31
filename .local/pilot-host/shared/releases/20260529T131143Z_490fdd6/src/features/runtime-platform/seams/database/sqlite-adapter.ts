import {
  RuntimeDatabaseOwnershipSchema,
  RuntimeDatabaseReadEnvelopeSchema,
  RuntimeDatabaseReadResultSchema,
  RuntimeDatabaseWriteEnvelopeSchema,
  type RuntimeDatabaseAdapter,
  type RuntimeDatabaseOwnership,
  type RuntimeDatabaseReadEnvelope,
  type RuntimeDatabaseReadResult,
  type RuntimeDatabaseWriteEnvelope,
} from "./contract";

const ownership: RuntimeDatabaseOwnership = RuntimeDatabaseOwnershipSchema.parse({
  sourceOfTruth: "classroom-session-write-path",
  persistence: "sqlite",
  posture: "default-only",
  notes: [
    "Current runtime persistence remains on the existing SQLite-backed classroom/session write path.",
    "This adapter is the only exported default database posture during Phase 27.",
  ],
});

class SqliteRuntimeDatabaseAdapter implements RuntimeDatabaseAdapter {
  readonly id = "sqlite-default-adapter";
  readonly dialect = "sqlite" as const;
  readonly ownership = ownership;

  describeOwnership(): RuntimeDatabaseOwnership {
    return this.ownership;
  }

  async read(envelope: RuntimeDatabaseReadEnvelope): Promise<RuntimeDatabaseReadResult> {
    const parsed = RuntimeDatabaseReadEnvelopeSchema.parse(envelope);

    return RuntimeDatabaseReadResultSchema.parse({
      sessionId: parsed.sessionId,
      resource: parsed.resource,
      payload: {
        adapterId: this.id,
        truthOwnership: this.ownership.sourceOfTruth,
        persistence: this.ownership.persistence,
      },
    });
  }

  async write(envelope: RuntimeDatabaseWriteEnvelope): Promise<void> {
    RuntimeDatabaseWriteEnvelopeSchema.parse(envelope);
  }
}

export const sqliteRuntimeDatabaseAdapter = new SqliteRuntimeDatabaseAdapter();
