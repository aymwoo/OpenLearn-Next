import { ClassroomSnapshotDTOSchema } from "@/lib/dto/classroom";
import { recordTransportConsumerTrace } from "@/features/runtime-platform/seams";

const CLASSROOM_SSE_POLL_INTERVAL_MS = 2000;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const cookie = request.headers.get("cookie");
  const origin = new URL(request.url).origin;
  const snapshotUrl = `${origin}/api/classroom/${sessionId}/snapshot`;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let lastVersion = 0;
      let lastUpdatedAt = "";

        const fetchSnapshot = async () => {
          try {
          const res = await fetch(snapshotUrl, {
            headers: cookie ? { Cookie: cookie } : {},
            cache: "no-store",
          });

          if (!res.ok) {
            // Stop polling if unauthorized or ended
            if (res.status === 401 || res.status === 403 || res.status === 404) {
              controller.close();
            }
            return;
          }

          const data = await res.json();
          const parsed = ClassroomSnapshotDTOSchema.safeParse(data);

          if (parsed.success) {
            const snapshot = parsed.data;
            const snapshotAdvanced = snapshot.version > lastVersion
              || (snapshot.version === lastVersion && snapshot.updatedAt > lastUpdatedAt);

            if (snapshotAdvanced) {
              const payload = JSON.stringify(snapshot);
              controller.enqueue(encoder.encode(`event: snapshot\nid: ${snapshot.version}\ndata: ${payload}\n\n`));
              void recordTransportConsumerTrace({
                sessionId,
                correlationId: `classroom:${sessionId}:snapshot:${snapshot.version}:${snapshot.updatedAt}`,
                adapterId: "transport-sse-adapter",
                adapterMode: "sse",
                traceType: "snapshot",
                status: "emitted",
                snapshotVersion: snapshot.version,
                detail: {
                  status: snapshot.status,
                },
              });
              lastVersion = snapshot.version;
              lastUpdatedAt = snapshot.updatedAt;
            } else {
              controller.enqueue(encoder.encode(`: keepalive\n\n`));
              void recordTransportConsumerTrace({
                sessionId,
                correlationId: `classroom:${sessionId}:keepalive:${lastVersion}:${lastUpdatedAt}`,
                adapterId: "transport-sse-adapter",
                adapterMode: "sse",
                traceType: "keepalive",
                status: "emitted",
                snapshotVersion: lastVersion,
                detail: {},
              });
            }
            
            if (snapshot.status === "ended") {
              void recordTransportConsumerTrace({
                sessionId,
                correlationId: `classroom:${sessionId}:stream_closed:${snapshot.version}`,
                adapterId: "transport-sse-adapter",
                adapterMode: "sse",
                traceType: "stream_closed",
                status: "closed",
                snapshotVersion: snapshot.version,
                detail: {
                  reason: "classroom-ended",
                },
              });
              controller.close();
            }
          }
        } catch {
          void recordTransportConsumerTrace({
            sessionId,
            correlationId: `classroom:${sessionId}:stream_failed:${lastVersion}`,
            adapterId: "transport-sse-adapter",
            adapterMode: "sse",
            traceType: "stream_failed",
            status: "failed",
            snapshotVersion: lastVersion,
            detail: {
              source: "snapshot-fetch",
            },
          });
          console.warn("[classroom-events] snapshot fetch failed; retrying on next poll");
        }
      };

      // Initial fetch
      await fetchSnapshot();

      // Start polling
      const timer = setInterval(async () => {
        if (request.signal.aborted) {
          clearInterval(timer);
          controller.close();
          return;
        }
        await fetchSnapshot();
      }, CLASSROOM_SSE_POLL_INTERVAL_MS);

      request.signal.addEventListener("abort", () => {
        clearInterval(timer);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      "Connection": "keep-alive",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
