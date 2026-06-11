import { quizDataModel } from "../../../plugins/quiz-sample/data-model";
import { homeworkDataModel } from "../../../plugins/homework/data-model";

import type { PluginDataModel } from "@/lib/dto/plugin-data-model";
import type { PluginManifest } from "@/lib/dto/resource-ai";

export type ExternalMarketplaceCatalogEntry = {
  pluginKey: string;
  displayName: string;
  manifest: PluginManifest;
  dataModel: PluginDataModel;
};

export function buildExternalQuizManifest(version: string): PluginManifest {
  return {
    id: "external-marketplace.quiz-sample",
    version,
    manifestVersion: 2,
    permissions: ["lesson:write:suggestion"],
    anchors: ["lesson.sidebar"],
    actions: ["suggestBuiltInTeachingStep", "insertBuiltInTeachingStepTemplate"],
    builtIn: false,
    defaultEnabled: false,
    nonDeletable: false,
    governance: {
      manifestVersion: 2,
      contractVersion: "v2",
      dependencies: [],
      requestedCapabilities: ["runtime:submission:create"],
      permissions: ["lesson:write:suggestion"],
      lifecycle: {
        ownerType: "plugin-manager",
        installScope: "school",
        initialState: "installed",
        mountMode: "manual",
      },
    },
  };
}

export function buildExternalHomeworkManifest(version: string): PluginManifest {
  return {
    id: "external-marketplace.homework",
    version,
    manifestVersion: 2,
    permissions: ["lesson:write:suggestion"],
    anchors: ["lesson.sidebar"],
    actions: ["suggestBuiltInTeachingStep", "insertBuiltInTeachingStepTemplate"],
    builtIn: false,
    defaultEnabled: false,
    nonDeletable: false,
    governance: {
      manifestVersion: 2,
      contractVersion: "v2",
      dependencies: [],
      requestedCapabilities: ["runtime:submission:create"],
      permissions: ["lesson:write:suggestion"],
      lifecycle: {
        ownerType: "plugin-manager",
        installScope: "school",
        initialState: "installed",
        mountMode: "manual",
      },
    },
  };
}

export const EXTERNAL_MARKETPLACE_CATALOG = [
  {
    pluginKey: "external-marketplace.quiz-sample",
    displayName: "互动答题（外部插件）",
    manifest: buildExternalQuizManifest("1.0.0"),
    dataModel: structuredClone(quizDataModel) as unknown as PluginDataModel,
  },
  {
    pluginKey: "external-marketplace.quiz-sample",
    displayName: "互动答题（外部插件）",
    manifest: buildExternalQuizManifest("1.1.0"),
    dataModel: structuredClone(quizDataModel) as unknown as PluginDataModel,
  },
  {
    pluginKey: "external-marketplace.homework",
    displayName: "课堂作业（外部插件）",
    manifest: buildExternalHomeworkManifest("1.0.0"),
    dataModel: structuredClone(homeworkDataModel) as unknown as PluginDataModel,
  },
] as const satisfies readonly ExternalMarketplaceCatalogEntry[];

export function listExternalMarketplaceCatalog() {
  return [...EXTERNAL_MARKETPLACE_CATALOG];
}

export function getExternalMarketplaceCatalogEntry(pluginKey: string, version?: string) {
  return EXTERNAL_MARKETPLACE_CATALOG.find((entry) => {
    if (entry.pluginKey !== pluginKey) {
      return false;
    }

    return version ? entry.manifest.version === version : true;
  }) ?? null;
}
