import { connection } from "next/server";

export async function GET() {
  await connection();
  const payload = {
    kind: "health" as const,
    ok: true,
    process: "alive" as const,
    checkedAt: new Date().toISOString(),
  };

  return Response.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
