import { z } from "zod";

import {
  SchoolScopedActorConstraintSchema,
  type HostActionPermission,
  type RuntimeActorScope,
  type SchoolScopedActorConstraint,
} from "../contracts/permissions";

export const GuardedHostActionContextSchema = z.object({
  actor: SchoolScopedActorConstraintSchema,
});

export const GuardedHostActionEnvelopeSchema = <TInput extends z.ZodTypeAny>(inputSchema: TInput) =>
  z.object({
    actor: SchoolScopedActorConstraintSchema,
    input: inputSchema,
  });

type GuardWrapperOptions<TInput extends z.ZodTypeAny, TOutput> = {
  inputSchema: TInput;
  actorScopes: readonly RuntimeActorScope[];
  requiredPermission?: HostActionPermission;
  execute: (context: { actor: SchoolScopedActorConstraint; input: z.infer<TInput> }) => Promise<TOutput>;
};

function assertActorScope(actor: SchoolScopedActorConstraint, allowedScopes: readonly RuntimeActorScope[]) {
  if (!allowedScopes.includes(actor.actorScope)) {
    throw new Error("HOST_ACTION_UNAUTHORIZED_ACTOR_SCOPE");
  }
}

function assertSchoolScope(actor: SchoolScopedActorConstraint) {
  if (!actor.schoolId.trim()) {
    throw new Error("HOST_ACTION_SCHOOL_SCOPE_REQUIRED");
  }
}

function assertPermission(actor: SchoolScopedActorConstraint, requiredPermission?: HostActionPermission) {
  if (!requiredPermission) {
    return;
  }

  if (!actor.hostPermissions.includes(requiredPermission)) {
    throw new Error("HOST_ACTION_PERMISSION_REQUIRED");
  }
}

export function createGuardedHostAction<TInput extends z.ZodTypeAny, TOutput>({
  inputSchema,
  actorScopes,
  requiredPermission,
  execute,
}: GuardWrapperOptions<TInput, TOutput>) {
  return async (envelope: { actor: SchoolScopedActorConstraint; input: z.input<TInput> }) => {
    const parsedActor = SchoolScopedActorConstraintSchema.parse(envelope.actor);
    const parsedInput = inputSchema.parse(envelope.input);

    assertActorScope(parsedActor, actorScopes);
    assertSchoolScope(parsedActor);
    assertPermission(parsedActor, requiredPermission);

    return execute({
      actor: parsedActor,
      input: parsedInput,
    });
  };
}

export const hostActionGuardUtils = {
  assertActorScope,
  assertSchoolScope,
};

export type GuardedHostActionContext = z.infer<typeof GuardedHostActionContextSchema>;
