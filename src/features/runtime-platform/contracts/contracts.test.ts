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
        kind: "runtime-bootstrap",
        sentAt: "2026-05-15T00:00:00Z",
        capabilityContext: {
          actorId: "teacher-1",
          actorScope: "teacher",
          grantedCapabilities: ["runtime:ready"],
        },
        payload: {
          classroomSessionId: "classroom-1",
          stepId: "step-1",
          resumeFromLatest: true,
        },
      }),
    ).toMatchObject({ kind: "runtime-bootstrap" });

    expect(
      contracts.TeachingBridgeResultEnvelopeSchema.parse({
        version: "v2",
        messageId: "msg-1",
        correlationId: "corr-1",
        runtimeInstanceId: "runtime-1",
        kind: "host-action-result",
        requestKind: "runtime-submit",
        status: "ok",
        result: {
          requestKind: "runtime-submit",
          sessionId: "runtime-session-1",
          runtimeSessionId: "runtime-step-session-1",
          classroomSessionId: "classroom-1",
          lessonId: "lesson-1",
          actorId: "student-1",
          stateVersion: 2,
          bridgeTargets: ["classroom-evidence", "task-submission"],
          submittedAt: "2026-05-15T00:00:01Z",
          proofSummary: {
            title: "已提交互动结果",
            submittedStateLabel: "已提交",
            bridgeTargets: ["classroom-evidence", "task-submission"],
            inspectorHref: "/settings/labs/runtime-inspector?sessionId=runtime-step-session-1",
            summary: {
              interactionCount: 1,
            },
          },
          persistedAt: "2026-05-15T00:00:02Z",
        },
      }),
    ).toMatchObject({ requestKind: "runtime-submit", status: "ok" });

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
        permissions: ["lesson:write:suggestion"],
        lifecycle: {
          ownerType: "host",
          installScope: "school",
          initialState: "installed",
          mountMode: "session-bootstrap",
        },
        runtime: {
          version: "v2",
          runtimeId: "runtime-html-courseware",
          runtimeVersion: "2026.05.0",
          kind: "html-courseware",
          displayName: "HTML Courseware",
          stateSchemaVersion: "state-v1",
          entry: {
            sandbox: "iframe",
            bootstrap: "/runtime/html-courseware",
          },
          bootstrap: {
            contextMode: "minimal",
            resumeStrategy: "latest-or-create",
            capabilitySnapshot: "session-scoped",
          },
          submitTarget: {
            primary: "classroom-evidence",
            additional: ["task-submission"],
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

  it("includes typed bootstrap, save, submit, and teacher-control contracts", () => {
    expect(contracts.RuntimeBootstrapRequestSchema).toBeDefined();
    expect(contracts.RuntimeSaveRequestSchema).toBeDefined();
    expect(contracts.RuntimeSubmitRequestSchema).toBeDefined();
    expect(contracts.RuntimeTeacherControlRequestSchema).toBeDefined();
    expect(contracts.RuntimeTeacherControlResultSchema).toBeDefined();
  });

  it("exposes governance contracts for reason codes and lifecycle state", () => {
    expect(contracts.GovernanceDeniedReasonSchema.parse("not_allowlisted")).toBe("not_allowlisted");
    expect(contracts.PluginLifecycleStateSchema.parse("failed")).toBe("failed");
    expect(contracts.GovernanceLifecycleStateSchema.parse("active")).toBe("active");
    expect(
      contracts.GovernanceDecisionEnvelopeSchema.parse({
        decision: "denied",
        reason: "capability_missing",
        action: "runtime-submit",
        actor: {
          schoolId: "school-1",
          actorId: "teacher-1",
          actorScope: "teacher",
          capabilities: ["runtime:submission:create"],
          hostPermissions: ["host:classroom:read"],
        },
        capabilitySummary: {
          requestedCapabilities: ["runtime:submission:create"],
          grantedCapabilities: [],
          requiredPermission: "host:classroom:read",
        },
        lifecycle: {
          state: "enabled",
          blocked: true,
          killSwitchEnabled: false,
          internalSubstate: "failed",
          reasonCode: "activation_failed",
          recommendedRecoveryAction: "retry",
        },
        targetSchoolId: "school-1",
      }),
    ).toMatchObject({ reason: "capability_missing" });
  });
});
