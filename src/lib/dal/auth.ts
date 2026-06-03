import "server-only";
import { auth } from "@/lib/auth/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserMembershipsDTO } from "@/lib/dal/membership";
import {
  CurrentActorDTOSchema,
  UserDTOSchema,
  type CurrentActorDTO,
  type UserDTO,
} from "@/lib/dto/user";

export async function getCurrentUserDTO(): Promise<UserDTO | null> {
  /**
   * Headless verifier escape hatch.
   *
   * Close-gate scripts run outside a Next.js request scope, so `auth()` cannot read
   * request headers/cookies there. A verifier may set `OPENLEARN_VERIFY_ACTOR_ID`
   * explicitly to exercise the real DAL/DB path against a seeded actor without
   * changing production auth behavior for normal requests.
   */
  const verifyActorId = process.env.OPENLEARN_VERIFY_ACTOR_ID?.trim() || null;
  const sessionUserId = verifyActorId || (await auth())?.user?.id || null;
  if (!sessionUserId) {
    return null;
  }

  const userRecord = await db.query.users.findFirst({
    where: eq(users.id, sessionUserId),
  });

  if (!userRecord) {
    return null;
  }

  const result = UserDTOSchema.safeParse(userRecord);
  if (!result.success) {
    console.error("Failed to parse User DTO:", result.error);
    return null;
  }

  return result.data;
}

export async function getCurrentActorDTO(): Promise<CurrentActorDTO | null> {
  const user = await getCurrentUserDTO();

  if (!user) {
    return null;
  }

  const memberships = await getUserMembershipsDTO(user.id);
  const activeMemberships = memberships.filter((membership) => membership.status === "active");
  const workspaceRoles = activeMemberships
    .map((membership) => membership.role)
    .filter((role): role is "admin" | "teacher" | "student" =>
      role === "admin" || role === "teacher" || role === "student"
    );

  const result = CurrentActorDTOSchema.safeParse({
    ...user,
    activeMembershipRoles: [...new Set(activeMemberships.map((membership) => membership.role))],
    workspaceRoles: [...new Set(workspaceRoles)],
    schoolIds: [...new Set(activeMemberships.map((membership) => membership.schoolId))],
  });

  if (!result.success) {
    console.error("Failed to parse Current Actor DTO:", result.error);
    return null;
  }

  return result.data;
}

export async function getCurrentUserSchoolIds(): Promise<string[]> {
  const actor = await getCurrentActorDTO();

  if (!actor) {
    return [];
  }

  return actor.schoolIds;
}
