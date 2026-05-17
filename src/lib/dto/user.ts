import { z } from "zod";
import { MembershipRoleSchema, WorkspaceRoleSchema } from "@/lib/dto/membership";

export const UserDTOSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
});

export const CurrentActorDTOSchema = UserDTOSchema.extend({
  activeMembershipRoles: z.array(MembershipRoleSchema),
  workspaceRoles: z.array(WorkspaceRoleSchema),
  schoolIds: z.array(z.string()),
});

export type UserDTO = z.infer<typeof UserDTOSchema>;
export type CurrentActorDTO = z.infer<typeof CurrentActorDTOSchema>;
