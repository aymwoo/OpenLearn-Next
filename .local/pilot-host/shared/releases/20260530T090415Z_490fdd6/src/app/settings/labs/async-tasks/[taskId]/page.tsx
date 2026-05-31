import { AsyncTaskOperatorDetailSurface } from "@/components/surfaces/async-task-operator-detail-surface";
import { getAsyncTaskOperatorDetailDTO } from "@/lib/dal/async-task-operator";

export default async function AsyncTaskOperatorDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  const detail = await getAsyncTaskOperatorDetailDTO({ taskId });

  return <AsyncTaskOperatorDetailSurface detail={detail} />;
}
