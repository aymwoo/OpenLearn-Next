import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import * as contracts from "./index";
import {
  PluginLifecycleOwnershipSchema,
  RuntimeManifestV2Schema,
} from "./descriptors";

const bannedTokens = ["db.", "updateTag(", '"use server"', "server-only"] as const;

const contractFiles = [
  "src/features/runtime-platform/contracts/bridge.ts",
  "src/features/runtime-platform/contracts/events.ts",
  "src/features/runtime-platform/contracts/permissions.ts",
  "src/features/runtime-platform/contracts/descriptors.ts",
  "src/features/runtime-platform/contracts/version.ts",
  "src/features/runtime-platform/contracts/index.ts",
] as const;

describe("runtime-platform contracts", () => {
  it("exposes the equivalent in-repo contract boundary via a single barrel", () => {
    expect(contracts.bridge.TeachingBridgeMessageEnvelopeSchema).toBeDefined();
    expect(contracts.events.RuntimeEventEnvelopeSchema).toBeDefined();
    expect(contracts.permissions.RuntimeCapabilitySchema).toBeDefined();
    expect(contracts.descriptors.RuntimeDescriptorSchema).toBeDefined();
    expect(contracts.version.RUNTIME_CONTRACT_VERSION).toBe("v2");
  });

  it("parses minimal bridge, event, permission, and descriptor contract samples", () => {
    expect(
      contracts.TeachingBridgeMessageEnvelopeSchema.parse({
        version: "v2",
        messageId: "msg-1",
        runtimeInstanceId: "runtime-1",
        kind: "runtime-ready",
        sentAt: "2026-05-15T00:00:00Z",
        capabilityContext: {
          actorId: "teacher-1",
          actorScope: "teacher",
          grantedCapabilities: ["runtime:ready"],
        },
        payload: {},
      }),
    ).toMatchObject({ kind: "runtime-ready" });

    expect(
      contracts.RuntimeEventEnvelopeSchema.parse({
        version: "v2",
        eventId: "evt-1",
        runtimeInstanceId: "runtime-1",
        type: "runtime.ready",
        actor: {
          actorId: "teacher-1",
          actorScope: "teacher",
        },
        occurredAt: "2026-05-15T00:00:00Z",
        delivery: {
          channel: "sse",
          deliveryKey: "session-1:evt-1",
        },
        payload: {},
      }),
    ).toMatchObject({ type: "runtime.ready" });

    expect(
      contracts.SchoolScopedActorConstraintSchema.parse({
        schoolId: "school-1",
        actorId: "teacher-1",
        actorScope: "teacher",
        capabilities: ["runtime:event:emit"],
        hostPermissions: ["host:classroom:read"],
      }),
    ).toMatchObject({ schoolId: "school-1" });

    expect(
      RuntimeManifestV2Schema.parse({
        manifestVersion: 2,
        contractVersion: "v2",
        pluginId: "html-courseware",
        runtime: {
          version: "v2",
          runtimeId: "runtime-html-courseware",
          kind: "html-courseware",
          displayName: "HTML Courseware",
          entry: {
            sandbox: "iframe",
            bootstrap: "/runtime/html-courseware",
          },
          requestedCapabilities: ["runtime:submission:create"],
        },
      }),
    ).toMatchObject({ manifestVersion: 2 });

    expect(
      PluginLifecycleOwnershipSchema.parse({
        ownerType: "host",
        installScope: "school",
        lifecycleState: "enabled",
      }),
    ).toMatchObject({ lifecycleState: "enabled" });
  });

  it("fails loudly when implementation-only tokens leak into the contracts root", () => {
    for (const file of contractFiles) {
      const source = readFileSync(file, "utf8");

      for (const token of bannedTokens) {
        expect(source).not.toContain(token);
      }
    }
  });
});
