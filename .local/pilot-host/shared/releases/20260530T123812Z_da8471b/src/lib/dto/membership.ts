import { z } from "zod";

export const MembershipRoleSchema = z.enum([
  "admin",
  "teacher",
  "student",
  "super_admin",
  "school_admin",
  "parent",
  "developer",
  "ai_agent",
]);

export const WorkspaceRoleSchema = z.enum(["admin", "teacher", "student"]);

export const MembershipDTOSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  role: MembershipRoleSchema,
  status: z.string(),
});

export type MembershipRole = z.infer<typeof MembershipRoleSchema>;
export type MembershipDTO = z.infer<typeof MembershipDTOSchema>;
export type WorkspaceRole = z.infer<typeof WorkspaceRoleSchema>;
