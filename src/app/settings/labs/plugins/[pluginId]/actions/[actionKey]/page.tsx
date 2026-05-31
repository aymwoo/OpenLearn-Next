import { notFound } from "next/navigation";

import { PluginLifecycleOperatorSurface } from "@/components/surfaces/plugin-lifecycle-operator-surface";
import { getPluginActionLifecycleOperatorDetailDTO } from "@/lib/dal/plugin-governance-operator";

export default async function PluginActionLifecycleOperatorDetailPage({
  params,
}: {
  params: Promise<{ pluginId: string; actionKey: string }>;
}) {
  const { pluginId, actionKey } = await params;
  let detail;

  try {
    detail = await getPluginActionLifecycleOperatorDetailDTO({ pluginId, actionKey });
  } catch (error) {
    if (error instanceof Error && error.message === "PLUGIN_GOVERNANCE_OPERATOR_NOT_FOUND") {
      notFound();
    }

    throw error;
  }

  return (
    <main className="min-h-screen bg-surface px-4 py-6 text-on-surface sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <PluginLifecycleOperatorSurface
          schoolId={detail.schoolId}
          dashboard={detail.dashboard}
          focusedPluginId={detail.focusedPluginId}
          focusedActionKey={detail.focusedActionKey}
        />
      </div>
    </main>
  );
}
