import { connection } from "next/server";

import { getReadyPayload } from "@/lib/ops/release-status";

export async function GET() {
  await connection();
  const payload = await getReadyPayload();
  const blockingComponents = [
    payload.components.db,
    payload.components.web,
    payload.components.worker,
  ];
  const hasBlockingFailure = blockingComponents.some(
    (component) => component.blocking && component.posture !== "green",
  );

  return Response.json(payload, {
    status: hasBlockingFailure ? 503 : 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
