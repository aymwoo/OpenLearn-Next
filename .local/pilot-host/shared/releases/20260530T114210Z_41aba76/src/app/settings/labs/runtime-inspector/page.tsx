import { RuntimeInspectorSurface } from "@/components/surfaces/runtime-inspector-surface";
import { getRuntimeInspectorDTO } from "@/lib/dal/runtime-inspector";

type RuntimeInspectorPageSearchParams = {
  runtimeSessionId?: string;
};

export default async function RuntimeInspectorPage({
  searchParams,
}: {
  searchParams?: Promise<RuntimeInspectorPageSearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const inspector = await getRuntimeInspectorDTO({
    runtimeSessionId: resolvedSearchParams.runtimeSessionId,
  });

  return <RuntimeInspectorSurface inspector={inspector} />;
}
