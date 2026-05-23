import "server-only";

import { readExecutableActionCatalog } from "@/features/platform-core/actions/registry";
import type {
  PlatformAiActionDescriptor,
  PlatformAiCapabilityDescriptor,
  PlatformAiCommandDescriptor,
  PlatformAiDescriptorCatalog,
} from "./contracts";
import {
  buildPlatformDescriptorCatalog,
  projectGovernedPlatformActionDescriptors,
  projectPlatformActionDescriptors,
  projectPlatformCapabilityDescriptors,
  projectPlatformCommandDescriptors,
} from "./registry";

type PlatformAiReadScope = {
  actorId: string;
  schoolId: string;
};

export async function listPlatformCommands(): Promise<PlatformAiCommandDescriptor[]> {
  return projectPlatformCommandDescriptors();
}

export async function listPlatformActions(
  scope?: PlatformAiReadScope,
): Promise<PlatformAiActionDescriptor[]> {
  if (!scope) {
    return projectPlatformActionDescriptors();
  }

  const executableCatalog = await readExecutableActionCatalog(scope);
  return projectGovernedPlatformActionDescriptors(executableCatalog);
}

export async function listPlatformCapabilities(): Promise<PlatformAiCapabilityDescriptor[]> {
  return projectPlatformCapabilityDescriptors();
}

export async function readPlatformAiDescriptorCatalog(
  scope?: PlatformAiReadScope,
): Promise<PlatformAiDescriptorCatalog> {
  if (!scope) {
    return buildPlatformDescriptorCatalog();
  }

  return [
    ...projectPlatformCommandDescriptors(),
    ...await listPlatformActions(scope),
    ...projectPlatformCapabilityDescriptors(),
  ];
}
