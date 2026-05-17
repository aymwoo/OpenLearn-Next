"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { ClassroomSnapshotDTOSchema } from "@/lib/dto/classroom";

export function ClassroomLiveSnapshotRefresh({
  sessionId,
  initialVersion,
}: {
  sessionId: string;
  initialVersion: number;
}) {
  const router = useRouter();
  const latestVersionRef = useRef(initialVersion);

  useEffect(() => {
    latestVersionRef.current = initialVersion;
  }, [initialVersion]);

  useEffect(() => {
    const source = new EventSource(`/api/classroom/${sessionId}/events`);

    const handleSnapshot = (event: Event) => {
      if (!(event instanceof MessageEvent)) {
        return;
      }

      let data: unknown;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      const parsed = ClassroomSnapshotDTOSchema.safeParse(data);
      if (!parsed.success || parsed.data.version <= latestVersionRef.current) {
        return;
      }

      latestVersionRef.current = parsed.data.version;
      router.refresh();

      if (parsed.data.status !== "live") {
        source.close();
      }
    };

    source.addEventListener("snapshot", handleSnapshot);

    return () => {
      source.removeEventListener("snapshot", handleSnapshot);
      source.close();
    };
  }, [router, sessionId]);

  return null;
}
