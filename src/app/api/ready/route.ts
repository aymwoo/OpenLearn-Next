import { getReadyPayload } from "@/lib/ops/release-status";

export async function GET() {
  const payload = await getReadyPayload();

  return Response.json(payload, {
    status: payload.ok ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
