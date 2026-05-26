import { getHealthPayload } from "@/lib/ops/release-status";

export async function GET() {
  const payload = await getHealthPayload();

  return Response.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
