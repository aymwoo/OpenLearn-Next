import {
  PLUGIN_ACTION_ALLOWLIST,
  PLUGIN_ACTION_PERMISSION_REQUIREMENTS,
} from "@/server/plugins/registry";
import type { ExecutableActionCatalogRow } from "@/features/platform-core/actions/contracts";

import type {
  PlatformAiActionDescriptor,
  PlatformAiCapabilityDescriptor,
  PlatformAiCommandDescriptor,
  PlatformAiDescriptorCatalog,
} from "./contracts";
import {
  PlatformAiActionDescriptorSchema,
  PlatformAiCapabilityDescriptorSchema,
  PlatformAiCommandDescriptorSchema,
  PlatformAiDescriptorCatalogSchema,
} from "./contracts";
import { listStaticActionCatalog } from "../actions/static-catalog";
import {
  PlatformPluginGovernanceCommandTypes,
  QuizTransportCommandTypes,
} from "../commands/contracts";
import { RuntimeCapabilityValues } from "@/features/runtime-platform/contracts/permissions";

const PLATFORM_AI_CONTRACT_VERSION = "phase-54.v1";

type PlatformAiCommandMetadata = {
  title: string;
  description: string;
  delegationPosture: PlatformAiCommandDescriptor["delegationPosture"];
  approvalPosture: PlatformAiCommandDescriptor["approvalPosture"];
  stability: PlatformAiCommandDescriptor["stability"];
  implementationVersion: string;
};

type PlatformAiActionMetadata = {
  title: string;
  description: string;
  delegationPosture: PlatformAiActionDescriptor["delegationPosture"];
  approvalPosture: PlatformAiActionDescriptor["approvalPosture"];
  stability: PlatformAiActionDescriptor["stability"];
  implementationVersion: string;
};

type PlatformAiCapabilityMetadata = {
  title: string;
  description: string;
  delegationPosture: PlatformAiCapabilityDescriptor["delegationPosture"];
  approvalPosture: PlatformAiCapabilityDescriptor["approvalPosture"];
  stability: PlatformAiCapabilityDescriptor["stability"];
  implementationVersion: string;
};

const PLATFORM_COMMAND_METADATA = {
  "plugin.install": {
    title: "Install plugin",
    description: "Install a plugin through the platform command bus.",
    delegationPosture: "operator-delegated",
    approvalPosture: "operator-review-required",
    stability: "beta",
    implementationVersion: "phase-51-command-bus",
  },
  "plugin.upgrade.preflight": {
    title: "Run plugin upgrade preflight",
    description: "Run upgrade preflight checks before a plugin upgrade command.",
    delegationPosture: "operator-delegated",
    approvalPosture: "operator-review-required",
    stability: "beta",
    implementationVersion: "phase-52-uninstall-governance",
  },
  "plugin.upgrade": {
    title: "Upgrade plugin",
    description: "Upgrade a plugin through the platform command bus.",
    delegationPosture: "operator-delegated",
    approvalPosture: "operator-review-required",
    stability: "beta",
    implementationVersion: "phase-52-uninstall-governance",
  },
  "plugin.enable": {
    title: "Enable plugin",
    description: "Enable an installed plugin through the platform command bus.",
    delegationPosture: "operator-delegated",
    approvalPosture: "operator-review-required",
    stability: "beta",
    implementationVersion: "phase-51-command-bus",
  },
  "plugin.disable": {
    title: "Disable plugin",
    description: "Disable a plugin through the platform command bus.",
    delegationPosture: "operator-delegated",
    approvalPosture: "operator-review-required",
    stability: "beta",
    implementationVersion: "phase-51-command-bus",
  },
  "plugin.reconcile": {
    title: "Reconcile plugin",
    description: "Reconcile plugin lifecycle state through the platform command bus.",
    delegationPosture: "operator-delegated",
    approvalPosture: "operator-review-required",
    stability: "beta",
    implementationVersion: "phase-52-governance-recovery",
  },
  "plugin.retry": {
    title: "Retry plugin command",
    description: "Retry a previously failed plugin command through the platform command bus.",
    delegationPosture: "operator-delegated",
    approvalPosture: "operator-review-required",
    stability: "beta",
    implementationVersion: "phase-52-governance-recovery",
  },
  "plugin.suspend": {
    title: "Suspend plugin",
    description: "Suspend a plugin through the platform command bus.",
    delegationPosture: "operator-delegated",
    approvalPosture: "operator-review-required",
    stability: "beta",
    implementationVersion: "phase-52-governance-recovery",
  },
  "plugin.resume": {
    title: "Resume plugin",
    description: "Resume a suspended plugin through the platform command bus.",
    delegationPosture: "operator-delegated",
    approvalPosture: "operator-review-required",
    stability: "beta",
    implementationVersion: "phase-52-governance-recovery",
  },
  "plugin.uninstall.preflight": {
    title: "Run plugin uninstall preflight",
    description: "Run uninstall preflight checks before a plugin uninstall command.",
    delegationPosture: "operator-delegated",
    approvalPosture: "operator-review-required",
    stability: "beta",
    implementationVersion: "phase-52-uninstall-governance",
  },
  "plugin.uninstall": {
    title: "Uninstall plugin",
    description: "Uninstall a plugin through the platform command bus.",
    delegationPosture: "operator-delegated",
    approvalPosture: "operator-review-required",
    stability: "beta",
    implementationVersion: "phase-52-uninstall-governance",
  },
  "plugin.kill_switch.set": {
    title: "Set plugin kill switch",
    description: "Toggle the plugin kill switch through the platform command bus.",
    delegationPosture: "operator-delegated",
    approvalPosture: "operator-review-required",
    stability: "beta",
    implementationVersion: "phase-52-uninstall-governance",
  },
  "quiz.answer.received": {
    title: "Publish quiz answer received",
    description: "Bridge a persisted quiz submission into the classroom transport layer.",
    delegationPosture: "host-only",
    approvalPosture: "no-human-approval",
    stability: "beta",
    implementationVersion: "phase-73-live-answer-dashboard",
  },
} satisfies Record<
  | (typeof PlatformPluginGovernanceCommandTypes)[number]
  | (typeof QuizTransportCommandTypes)[number],
  PlatformAiCommandMetadata
>;

const PLATFORM_ACTION_METADATA = {
  addStepSuggestion: {
    title: "Add step suggestion",
    description: "Create a lesson step suggestion from the static action catalog.",
    delegationPosture: "allowed-with-approval",
    approvalPosture: "teacher-approval-required",
    stability: "stable",
    implementationVersion: "phase-52-static-catalog",
  },
  annotateLesson: {
    title: "Annotate lesson",
    description: "Create a lesson annotation from the static action catalog.",
    delegationPosture: "allowed-with-approval",
    approvalPosture: "teacher-approval-required",
    stability: "stable",
    implementationVersion: "phase-52-static-catalog",
  },
  createNotificationStub: {
    title: "Create notification stub",
    description: "Create a notification stub from the static action catalog.",
    delegationPosture: "allowed-with-approval",
    approvalPosture: "teacher-approval-required",
    stability: "stable",
    implementationVersion: "phase-52-static-catalog",
  },
  suggestBuiltInTeachingStep: {
    title: "Suggest built-in teaching step",
    description: "Suggest a built-in teaching step using the static action catalog.",
    delegationPosture: "allowed-with-approval",
    approvalPosture: "teacher-approval-required",
    stability: "stable",
    implementationVersion: "phase-52-static-catalog",
  },
  insertBuiltInTeachingStepTemplate: {
    title: "Insert built-in teaching step template",
    description: "Insert a built-in teaching step template from the static action catalog.",
    delegationPosture: "allowed-with-approval",
    approvalPosture: "teacher-approval-required",
    stability: "stable",
    implementationVersion: "phase-52-static-catalog",
  },
  createScheduleOverrideProposal: {
    title: "Create schedule override proposal",
    description: "Create a schedule override proposal from the static action catalog.",
    delegationPosture: "allowed-with-approval",
    approvalPosture: "teacher-approval-required",
    stability: "stable",
    implementationVersion: "phase-52-static-catalog",
  },
  createScheduleReminderDraft: {
    title: "Create schedule reminder draft",
    description: "Create a schedule reminder draft from the static action catalog.",
    delegationPosture: "allowed-with-approval",
    approvalPosture: "teacher-approval-required",
    stability: "stable",
    implementationVersion: "phase-52-static-catalog",
  },
  annotateScheduleConflict: {
    title: "Annotate schedule conflict",
    description: "Annotate a schedule conflict from the static action catalog.",
    delegationPosture: "allowed-with-approval",
    approvalPosture: "teacher-approval-required",
    stability: "stable",
    implementationVersion: "phase-52-static-catalog",
  },
} satisfies Record<(typeof PLUGIN_ACTION_ALLOWLIST)[number], PlatformAiActionMetadata>;

const PLATFORM_CAPABILITY_METADATA = {
  "runtime:ready": {
    title: "Runtime ready",
    description: "Indicates the runtime can enter the ready posture for lesson execution.",
    delegationPosture: "host-only",
    approvalPosture: "no-human-approval",
    stability: "stable",
    implementationVersion: "runtime-capabilities-2026.05",
  },
  "runtime:event:emit": {
    title: "Runtime event emit",
    description: "Allows runtime code to emit machine-readable runtime events.",
    delegationPosture: "host-only",
    approvalPosture: "no-human-approval",
    stability: "stable",
    implementationVersion: "runtime-capabilities-2026.05",
  },
  "runtime:state:save": {
    title: "Runtime state save",
    description: "Allows runtime code to persist runtime state snapshots.",
    delegationPosture: "host-only",
    approvalPosture: "no-human-approval",
    stability: "stable",
    implementationVersion: "runtime-capabilities-2026.05",
  },
  "runtime:submission:create": {
    title: "Runtime submission create",
    description: "Allows runtime code to create lesson task submissions.",
    delegationPosture: "host-only",
    approvalPosture: "no-human-approval",
    stability: "stable",
    implementationVersion: "runtime-capabilities-2026.05",
  },
  "runtime:host-action:request": {
    title: "Runtime host action request",
    description: "Allows runtime code to request guarded host actions.",
    delegationPosture: "host-only",
    approvalPosture: "no-human-approval",
    stability: "stable",
    implementationVersion: "runtime-capabilities-2026.05",
  },
} satisfies Record<(typeof RuntimeCapabilityValues)[number], PlatformAiCapabilityMetadata>;

export function projectPlatformCommandDescriptors(): PlatformAiCommandDescriptor[] {
  return [...PlatformPluginGovernanceCommandTypes, ...QuizTransportCommandTypes].map((commandType) => {
    const metadata = PLATFORM_COMMAND_METADATA[commandType];

    return PlatformAiCommandDescriptorSchema.parse({
      kind: "command",
      key: `command:${commandType}`,
      title: metadata.title,
      description: metadata.description,
      inputSchemaKey: `platform-command.payload.${commandType}`,
      requiredCapabilities: [],
      requiredPermission: null,
      sideEffectClass: "platform-write",
      implementationSource: "platform-command-bus",
      delegationPosture: metadata.delegationPosture,
      approvalPosture: metadata.approvalPosture,
      stability: metadata.stability,
      contractVersion: PLATFORM_AI_CONTRACT_VERSION,
      implementationVersion: metadata.implementationVersion,
    });
  });
}

export function projectPlatformActionDescriptors(): PlatformAiActionDescriptor[] {
  const staticCatalog = listStaticActionCatalog();

  return PLUGIN_ACTION_ALLOWLIST.map((actionKey) => {
    const descriptor = staticCatalog.find((entry) => entry.actionKey === actionKey);
    const metadata = PLATFORM_ACTION_METADATA[actionKey];

    if (!descriptor) {
      throw new Error(`Missing static action descriptor truth for ${actionKey}`);
    }

    return PlatformAiActionDescriptorSchema.parse({
      kind: "action",
      key: `action:${descriptor.actionKey}`,
      title: metadata.title,
      description: metadata.description,
      inputSchemaKey: descriptor.inputSchemaKey,
      requiredCapabilities: [],
      requiredPermission: descriptor.requiredPermission,
      sideEffectClass: descriptor.sideEffectClass,
      implementationSource: descriptor.implementationSource,
      delegationPosture: metadata.delegationPosture,
      approvalPosture: metadata.approvalPosture,
      stability: metadata.stability,
      contractVersion: PLATFORM_AI_CONTRACT_VERSION,
      implementationVersion: metadata.implementationVersion,
      sourceDescriptor: {
        actionKey: descriptor.actionKey,
        ownerType: descriptor.ownerType,
        ownerPluginKey: descriptor.ownerPluginKey,
        inputSchemaKey: descriptor.inputSchemaKey,
        requiredPermission: PLUGIN_ACTION_PERMISSION_REQUIREMENTS[actionKey] ?? null,
        sideEffectClass: descriptor.sideEffectClass,
        implementationSource: descriptor.implementationSource,
      },
    });
  });
}

export function projectGovernedPlatformActionDescriptors(
  executableCatalog: readonly ExecutableActionCatalogRow[],
): PlatformAiActionDescriptor[] {
  return executableCatalog
    .filter((row) => PLUGIN_ACTION_ALLOWLIST.includes(row.actionKey as (typeof PLUGIN_ACTION_ALLOWLIST)[number]))
    .map((descriptor) => {
      const metadata = PLATFORM_ACTION_METADATA[descriptor.actionKey as (typeof PLUGIN_ACTION_ALLOWLIST)[number]];

      return PlatformAiActionDescriptorSchema.parse({
        kind: "action",
        key: `action:${descriptor.actionKey}`,
        title: metadata.title,
        description: metadata.description,
        inputSchemaKey: descriptor.inputSchemaKey,
        requiredCapabilities: [],
        requiredPermission: descriptor.requiredPermission,
        sideEffectClass: descriptor.sideEffectClass,
        implementationSource: descriptor.implementationSource,
        delegationPosture: metadata.delegationPosture,
        approvalPosture: metadata.approvalPosture,
        stability: metadata.stability,
        contractVersion: PLATFORM_AI_CONTRACT_VERSION,
        implementationVersion: metadata.implementationVersion,
        sourceDescriptor: {
          actionKey: descriptor.actionKey,
          ownerType: descriptor.ownerType,
          ownerPluginKey: descriptor.ownerPluginKey,
          inputSchemaKey: descriptor.inputSchemaKey,
          requiredPermission: descriptor.requiredPermission,
          sideEffectClass: descriptor.sideEffectClass,
          implementationSource: descriptor.implementationSource,
        },
      });
    });
}

export function projectPlatformCapabilityDescriptors(): PlatformAiCapabilityDescriptor[] {
  return RuntimeCapabilityValues.map((capability) => {
    const metadata = PLATFORM_CAPABILITY_METADATA[capability];

    return PlatformAiCapabilityDescriptorSchema.parse({
      kind: "capability",
      key: `capability:${capability}`,
      title: metadata.title,
      description: metadata.description,
      inputSchemaKey: "capability-input.none",
      requiredCapabilities: [],
      requiredPermission: null,
      sideEffectClass: "event-emission",
      implementationSource: "runtime-capability-registry",
      delegationPosture: metadata.delegationPosture,
      approvalPosture: metadata.approvalPosture,
      stability: metadata.stability,
      contractVersion: PLATFORM_AI_CONTRACT_VERSION,
      implementationVersion: metadata.implementationVersion,
    });
  });
}

export function buildPlatformDescriptorCatalog(): PlatformAiDescriptorCatalog {
  return PlatformAiDescriptorCatalogSchema.parse([
    ...projectPlatformCommandDescriptors(),
    ...projectPlatformActionDescriptors(),
    ...projectPlatformCapabilityDescriptors(),
  ]);
}
