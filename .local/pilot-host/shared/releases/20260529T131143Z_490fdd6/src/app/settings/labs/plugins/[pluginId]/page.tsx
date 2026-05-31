import { notFound } from "next/navigation";

import { PluginLifecycleOperatorSurface } from "@/components/surfaces/plugin-lifecycle-operator-surface";
import { getPluginLifecycleOperatorDetailDTO } from "@/lib/dal/plugin-governance-operator";

export default async function PluginLifecycleOperatorDetailPage({
  params,
}: {
  params: Promise<{ pluginId: string }>;
}) {
  const { pluginId } = await params;

  try {
    const detail = await getPluginLifecycleOperatorDetailDTO({ pluginId });

    return (
      <main className="min-h-screen bg-surface px-4 py-6 text-on-surface sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <PluginLifecycleOperatorSurface
            schoolId={detail.schoolId}
            dashboard={detail.dashboard}
            focusedPluginId={detail.focusedPluginId}
          />
        </div>
      </main>
    );
  } catch (error) {
    if (error instanceof Error && error.message === "PLUGIN_GOVERNANCE_OPERATOR_NOT_FOUND") {
      notFound();
    }

    throw error;
  }
}
