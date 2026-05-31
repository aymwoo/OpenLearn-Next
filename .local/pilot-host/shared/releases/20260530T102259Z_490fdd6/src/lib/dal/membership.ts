import "server-only";
import { db } from "@/db";
import { memberships } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MembershipDTOSchema, type MembershipDTO } from "@/lib/dto/membership";

export async function getUserMembershipsDTO(userId: string): Promise<MembershipDTO[]> {
  const records = await db.query.memberships.findMany({
    where: eq(memberships.userId, userId),
  });

  const validMemberships: MembershipDTO[] = [];

  for (const record of records) {
    const result = MembershipDTOSchema.safeParse(record);
    if (result.success) {
      validMemberships.push(result.data);
    } else {
      console.error("Failed to parse Membership DTO:", result.error);
    }
  }

  return validMemberships;
}
