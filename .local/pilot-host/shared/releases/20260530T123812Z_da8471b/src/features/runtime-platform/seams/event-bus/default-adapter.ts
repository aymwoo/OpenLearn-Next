import {
  RuntimeEventBusOwnershipSchema,
  RuntimeEventEnvelopeSchema,
  type RuntimeEventBusAdapter,
  type RuntimeEventBusOwnership,
  type RuntimeEventEnvelope,
  type RuntimeEventHandler,
} from "./contract";

const ownership: RuntimeEventBusOwnership = RuntimeEventBusOwnershipSchema.parse({
  sourceOfTruth: "classroom-session-write-path",
  delivery: "in-process",
  posture: "default-only",
  notes: [
    "Event delivery is in-process only for Phase 27.",
    "Publishing does not move truth ownership away from the SQLite-backed classroom/session path.",
  ],
});

class DefaultRuntimeEventBusAdapter implements RuntimeEventBusAdapter {
  readonly id = "event-bus-default-adapter";
  readonly ownership = ownership;
  private readonly subscribers = new Map<string, Set<RuntimeEventHandler>>();

  describeOwnership(): RuntimeEventBusOwnership {
    return this.ownership;
  }

  async publish(event: RuntimeEventEnvelope): Promise<void> {
    const parsed = RuntimeEventEnvelopeSchema.parse(event);
    const handlers = this.subscribers.get(parsed.topic);

    if (!handlers || handlers.size === 0) {
      return;
    }

    await Promise.all([...handlers].map((handler) => handler(parsed)));
  }

  subscribe(topic: string, handler: RuntimeEventHandler): () => void {
    const listeners = this.subscribers.get(topic) ?? new Set<RuntimeEventHandler>();
    listeners.add(handler);
    this.subscribers.set(topic, listeners);

    return () => {
      const current = this.subscribers.get(topic);

      if (!current) {
        return;
      }

      current.delete(handler);

      if (current.size === 0) {
        this.subscribers.delete(topic);
      }
    };
  }
}

export const defaultRuntimeEventBusAdapter = new DefaultRuntimeEventBusAdapter();
