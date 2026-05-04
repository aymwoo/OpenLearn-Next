import { z } from "zod";

export const MembershipDTOSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  role: z.enum(['admin', 'teacher', 'student', 'parent', 'developer', 'ai_agent']),
  status: z.string(),
});

export type MembershipDTO = z.infer<typeof MembershipDTOSchema>;
