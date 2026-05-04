import "server-only";
import { auth } from "@/lib/auth/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { UserDTOSchema, type UserDTO } from "@/lib/dto/user";

export async function getCurrentUserDTO(): Promise<UserDTO | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const userRecord = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
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
