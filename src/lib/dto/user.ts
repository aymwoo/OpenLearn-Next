import { z } from "zod";

export const UserDTOSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
});

export type UserDTO = z.infer<typeof UserDTOSchema>;
