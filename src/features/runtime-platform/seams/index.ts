export * from "./database/contract";
export * from "./event-bus/contract";
export * from "./transport/contract";
export * from "./transport/gateway";

export { sqliteRuntimeDatabaseAdapter } from "./database/sqlite-adapter";
export { defaultRuntimeEventBusAdapter } from "./event-bus/default-adapter";
export { sseRuntimeTransportAdapter } from "./transport/sse-adapter";

export const runtimePlatformSeams = {
  database: {
    defaultAdapter: "sqliteRuntimeDatabaseAdapter",
  },
  eventBus: {
    defaultAdapter: "defaultRuntimeEventBusAdapter",
  },
  transport: {
    defaultAdapter: "sseRuntimeTransportAdapter",
  },
} as const;
