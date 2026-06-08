import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("classroom WS events", () => {
  it("keeps quiz.answer.received on a dedicated websocket server kind", () => {
    const envelopeSource = readFileSync(
      "src/features/runtime-platform/seams/transport/ws-envelope.ts",
      "utf8",
    );
    const adapterSource = readFileSync(
      "src/features/runtime-platform/seams/transport/ws-adapter.ts",
      "utf8",
    );

    expect(envelopeSource).toContain('"quiz.answer.received"');
    expect(adapterSource).toContain('if (kind === "quiz.answer.received")');
  });

  it("delivers quiz.answer.received only to teacher scoped sockets", () => {
    const registrySource = readFileSync(
      "src/features/runtime-platform/seams/transport/ws-connection-registry.ts",
      "utf8",
    );

    expect(registrySource).toContain('envelope.kind === "quiz.answer.received"');
    expect(registrySource).toContain("connection.owner.actorScope !== \"teacher\"");
  });

  it("bridges durable quiz submissions into transport through the command producer", () => {
    const dalSource = readFileSync("src/lib/dal/classroom.ts", "utf8");
    const commandSource = readFileSync(
      "src/features/platform-core/commands/handlers/quiz-answer-received.ts",
      "utf8",
    );

    expect(dalSource).toContain("produceQuizAnswerReceived({");
    expect(commandSource).toContain('kind: command.type');
    expect(commandSource).toContain('channel: "classroom-runtime"');
  });
});
