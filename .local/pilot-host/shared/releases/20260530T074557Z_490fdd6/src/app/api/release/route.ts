import { connection } from "next/server";

import { getReleasePayload } from "@/lib/ops/release-status";

export async function GET() {
  await connection();
  const payload = await getReleasePayload();

  return Response.json(payload, {
    status: payload.available ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
