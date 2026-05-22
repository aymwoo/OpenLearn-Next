import "server-only";

import type {
  PlatformAiActionDescriptor,
  PlatformAiCapabilityDescriptor,
  PlatformAiCommandDescriptor,
  PlatformAiDescriptorCatalog,
} from "./contracts";
import {
  buildPlatformDescriptorCatalog,
  projectPlatformActionDescriptors,
  projectPlatformCapabilityDescriptors,
  projectPlatformCommandDescriptors,
} from "./registry";

export async function listPlatformCommands(): Promise<PlatformAiCommandDescriptor[]> {
  return projectPlatformCommandDescriptors();
}

export async function listPlatformActions(): Promise<PlatformAiActionDescriptor[]> {
  return projectPlatformActionDescriptors();
}

export async function listPlatformCapabilities(): Promise<PlatformAiCapabilityDescriptor[]> {
  return projectPlatformCapabilityDescriptors();
}

export async function readPlatformAiDescriptorCatalog(): Promise<PlatformAiDescriptorCatalog> {
  return buildPlatformDescriptorCatalog();
}
