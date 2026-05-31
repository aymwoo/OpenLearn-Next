import { z } from "zod";

export const RUNTIME_CONTRACT_VERSION = "v2" as const;

export const RuntimeContractVersionSchema = z.literal(RUNTIME_CONTRACT_VERSION);

export type RuntimeContractVersion = z.infer<typeof RuntimeContractVersionSchema>;
