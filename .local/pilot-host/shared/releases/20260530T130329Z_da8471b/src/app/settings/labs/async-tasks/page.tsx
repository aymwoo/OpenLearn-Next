import { AsyncTaskOperatorSurface } from "@/components/surfaces/async-task-operator-surface";
import { getAsyncTaskOperatorOverviewDTO } from "@/lib/dal/async-task-operator";

export default async function AsyncTaskOperatorPage() {
  const overview = await getAsyncTaskOperatorOverviewDTO();

  return <AsyncTaskOperatorSurface overview={overview} />;
}
