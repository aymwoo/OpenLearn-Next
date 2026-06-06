"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { subscribeClassroomSocket } from "./classroom-ws-client";

export function ClassroomLiveSnapshotRefresh({
  sessionId,
  initialVersion,
  initialUpdatedAt,
}: {
  sessionId: string;
  initialVersion: number;
  initialUpdatedAt: string;
}) {
  const router = useRouter();
  const latestVersionRef = useRef(initialVersion);
  const latestUpdatedAtRef = useRef(initialUpdatedAt);

  const shouldRefreshForSnapshot = (version: number, updatedAt: string) => {
    if (version > latestVersionRef.current) {
      return true;
    }

    return version === latestVersionRef.current && updatedAt > latestUpdatedAtRef.current;
  };

  useEffect(() => {
    latestVersionRef.current = initialVersion;
    latestUpdatedAtRef.current = initialUpdatedAt;
  }, [initialUpdatedAt, initialVersion]);

  useEffect(() => {
    const applySnapshot = (version: number, updatedAt: string, status: "live" | "ended") => {
      if (!shouldRefreshForSnapshot(version, updatedAt)) {
        return;
      }

      latestVersionRef.current = version;
      latestUpdatedAtRef.current = updatedAt;
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

        applySnapshot(snapshot.version, snapshot.updatedAt, snapshot.status);
      },
      onFallbackSnapshot(snapshot) {
        applySnapshot(snapshot.version, snapshot.updatedAt, snapshot.status);
      },
    });

    return () => {
      subscription.close();
    };
  }, [router, sessionId]);

  return null;
}
