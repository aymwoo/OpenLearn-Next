import {
  PLUGIN_ACTION_ALLOWLIST,
  PLUGIN_ACTION_PERMISSION_REQUIREMENTS,
} from "@/server/plugins/registry";

import {
  ActionDescriptorSchema,
  ExecutableActionCatalogRowSchema,
  type ActionDescriptor,
  type ExecutableActionCatalogRow,
} from "./contracts";

type StaticActionKey = (typeof PLUGIN_ACTION_ALLOWLIST)[number];

type StaticActionDescriptorSourceInput = Omit<ActionDescriptor, "actionKey" | "requiredPermission" | "implementationSource"> & {
  actionKey: StaticActionKey;
};

const STATIC_ACTION_DESCRIPTOR_SOURCE = [
  {
    actionKey: "addStepSuggestion",
    ownerType: "external-plugin",
    ownerPluginKey: null,
    inputSchemaKey: "plugin-action.payload.generic",
    sideEffectClass: "proposal",
  },
  {
    actionKey: "annotateLesson",
    ownerType: "external-plugin",
    ownerPluginKey: null,
    inputSchemaKey: "plugin-action.payload.generic",
    sideEffectClass: "annotation",
  },
  {
    actionKey: "createNotificationStub",
    ownerType: "default-plugin",
    ownerPluginKey: null,
    inputSchemaKey: "plugin-action.payload.generic",
    sideEffectClass: "notification-stub",
  },
  {
    actionKey: "suggestBuiltInTeachingStep",
    ownerType: "built-in",
    ownerPluginKey: "builtin-teaching-step-catalog",
    inputSchemaKey: "plugin-action.payload.built-in-teaching-step-suggestion",
    sideEffectClass: "proposal",
  },
  {
    actionKey: "insertBuiltInTeachingStepTemplate",
    ownerType: "built-in",
    ownerPluginKey: "builtin-teaching-step-catalog",
    inputSchemaKey: "plugin-action.payload.built-in-teaching-step-template",
    sideEffectClass: "teaching-step-template",
  },
  {
    actionKey: "createScheduleOverrideProposal",
    ownerType: "external-plugin",
    ownerPluginKey: null,
    inputSchemaKey: "plugin-action.payload.schedule-override-proposal",
    sideEffectClass: "schedule-proposal",
  },
  {
    actionKey: "createScheduleReminderDraft",
    ownerType: "external-plugin",
    ownerPluginKey: null,
    inputSchemaKey: "plugin-action.payload.schedule-reminder-draft",
    sideEffectClass: "schedule-reminder",
  },
  {
    actionKey: "annotateScheduleConflict",
    ownerType: "external-plugin",
    ownerPluginKey: null,
    inputSchemaKey: "plugin-action.payload.schedule-conflict-annotation",
    sideEffectClass: "schedule-annotation",
  },
] as const satisfies readonly StaticActionDescriptorSourceInput[];

export function buildStaticActionCatalog(
  source: readonly ActionDescriptor[],
): ExecutableActionCatalogRow[] {
  const seen = new Set<string>();

  return source.map((entry) => {
    const descriptor = ActionDescriptorSchema.parse(entry);
    if (seen.has(descriptor.actionKey)) {
      throw new Error(`Duplicate static action descriptor key: ${descriptor.actionKey}`);
    }

    seen.add(descriptor.actionKey);
    return ExecutableActionCatalogRowSchema.parse({
      ...descriptor,
      catalogView: "executable",
    });
  });
}

export function listStaticActionCatalog(): ExecutableActionCatalogRow[] {
  const descriptorSource = PLUGIN_ACTION_ALLOWLIST.map((actionKey) => {
    const sourceEntry = STATIC_ACTION_DESCRIPTOR_SOURCE.find((entry) => entry.actionKey === actionKey);

    if (!sourceEntry) {
      throw new Error(`Missing static action descriptor metadata for ${actionKey}`);
    }

    return ActionDescriptorSchema.parse({
      ...sourceEntry,
      requiredPermission: PLUGIN_ACTION_PERMISSION_REQUIREMENTS[actionKey] ?? null,
      implementationSource: "main-repo-static-implementation",
    });
  });

  return buildStaticActionCatalog(descriptorSource);
}
