import { notFound } from "next/navigation";

import { PlatformCommandOperatorDetailSurface } from "@/components/surfaces/platform-command-operator-detail-surface";
import { getPlatformCommandWithTimeline } from "@/features/platform-core/observability/operator-read-model";
import { getCurrentUserSchoolIds } from "@/lib/dal/auth";

export default async function PlatformCommandOperatorDetailPage({
  params,
}: {
  params: Promise<{ commandId: string }>;
}) {
  const { commandId } = await params;
  const schoolIds = await getCurrentUserSchoolIds();
  const detail = await getPlatformCommandWithTimeline({
    commandId,
    schoolIds,
  });

  if (!detail.command) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-surface px-4 py-6 text-on-surface sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <PlatformCommandOperatorDetailSurface detail={detail} />
      </div>
    </main>
  );
}
