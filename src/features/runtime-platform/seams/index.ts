export * from "./database/contract";
export * from "./event-bus/contract";
export * from "./transport/contract";
export * from "./transport/gateway";
export * from "./transport/ws-envelope";
export * from "./transport/ws-auth";

export { sqliteRuntimeDatabaseAdapter } from "./database/sqlite-adapter";
export { defaultRuntimeEventBusAdapter } from "./event-bus/default-adapter";
export { sseRuntimeTransportAdapter } from "./transport/sse-adapter";
export { wsRuntimeTransportAdapter } from "./transport/ws-adapter";
export { classroomWebSocketTransportServer } from "./transport/ws-server";

export const runtimePlatformSeams = {
  database: {
    defaultAdapter: "sqliteRuntimeDatabaseAdapter",
  },
  eventBus: {
    defaultAdapter: "defaultRuntimeEventBusAdapter",
  },
  transport: {
    defaultAdapter: "sseRuntimeTransportAdapter",
    supportedAdapters: ["sseRuntimeTransportAdapter", "wsRuntimeTransportAdapter"],
  },
} as const;
