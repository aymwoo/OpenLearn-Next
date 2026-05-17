export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const url = new URL(request.url);
  const actor = url.searchParams.get("actor");

  return Response.json(
    {
      sessionId,
      transport: "websocket",
      upgradeRequired: true,
      actor,
      rollbackSurface: `/api/classroom/${sessionId}/events`,
      message:
        "该端点仅接受通过鉴权握手的 WebSocket upgrade 请求；普通 HTTP GET 仅返回说明信息。",
    },
    {
      status: 426,
      headers: {
        "Cache-Control": "no-store",
        "X-OpenLearn-Transport": "websocket",
        Upgrade: "websocket",
      },
    },
  );
}
