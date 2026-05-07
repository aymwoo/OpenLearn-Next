import { ClassroomSnapshotDTOSchema } from "@/lib/dto/classroom";

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
            if (snapshot.version > lastVersion) {
              const payload = JSON.stringify(snapshot);
              controller.enqueue(encoder.encode(`event: snapshot\nid: ${snapshot.version}\ndata: ${payload}\n\n`));
              lastVersion = snapshot.version;
            } else {
              controller.enqueue(encoder.encode(`: keepalive\n\n`));
            }
            
            if (snapshot.status === "ended") {
              controller.close();
            }
          }
        } catch {
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
