import { createServer } from "node:http";

import next from "next";

import { classroomWebSocketTransportServer } from "@/features/runtime-platform/seams/transport/ws-server";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);

const httpServer = createServer();
const app = next({
  dev,
  hostname,
  port,
  httpServer,
  turbopack: dev,
});
const handle = app.getRequestHandler();

app.prepare().then(() => {
  classroomWebSocketTransportServer.initialize(httpServer);

  httpServer.on("request", (req, res) => {
    void handle(req, res);
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
