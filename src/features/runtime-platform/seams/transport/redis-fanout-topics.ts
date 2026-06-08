import { z } from "zod";

import type { RuntimeTransportEnvelope } from "./contract";

export const RedisFanoutSubchannelSchema = z.enum(["classroom", "runtime"]);

export type RedisFanoutSubchannel = z.infer<
  typeof RedisFanoutSubchannelSchema
>;

function getRedisFanoutNamespace() {
  const namespace = process.env.REDIS_FANOUT_NAMESPACE?.trim();
  return namespace && namespace.length > 0 ? namespace : "openlearn";
}

export function resolveRedisFanoutSubchannel(input: {
  channel: string;
  kind: string;
}): RedisFanoutSubchannel {
  if (
    input.channel.startsWith("classroom-runtime") ||
    input.kind.startsWith("quiz.") ||
    input.kind.startsWith("runtime.") ||
    input.kind.startsWith("governance.")
  ) {
    return "runtime";
  }

  return "classroom";
}

export function buildRedisFanoutTopic(input: {
  sessionId: string;
  subchannel: RedisFanoutSubchannel;
}) {
  return `${getRedisFanoutNamespace()}:classroom-session:${input.sessionId}:${input.subchannel}`;
}

export function quizAnswerReceivedTopic(classroomSessionId: string) {
  return buildRedisFanoutTopic({
    sessionId: classroomSessionId,
    subchannel: "runtime",
  });
}

export function resolveRedisFanoutTopic(envelope: RuntimeTransportEnvelope) {
  const sessionId = envelope.truthRef.classroomSessionId ?? envelope.sessionId;
  const subchannel = resolveRedisFanoutSubchannel({
    channel: envelope.channel,
    kind: envelope.kind,
  });

  return {
    sessionId,
    subchannel,
    topic: buildRedisFanoutTopic({ sessionId, subchannel }),
  };
}
