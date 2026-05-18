"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { subscribeClassroomSocket } from "./classroom-ws-client";

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
    const applySnapshot = (version: number, status: "live" | "ended") => {
      if (version <= latestVersionRef.current) {
        return;
      }

      latestVersionRef.current = version;
      router.refresh();

      if (status !== "live") {
        subscription.close();
      }
    };

    const subscription = subscribeClassroomSocket({
      sessionId,
      actorScope: 'teacher',
      onSnapshot(snapshot, envelope) {
        if (envelope.kind !== 'classroom.snapshot') {
          return;
        }

        applySnapshot(snapshot.version, snapshot.status);
      },
      onFallbackSnapshot(snapshot) {
        applySnapshot(snapshot.version, snapshot.status);
      },
    });

    return () => {
      subscription.close();
    };
  }, [router, sessionId]);

  return null;
}
