import { describe, expect, it } from "vitest";

import { PlatformCommandSchema } from "@/features/platform-core/commands/contracts";
import { PlatformSuccessEventSchema } from "@/features/platform-core/events/contracts";
import { RuntimeActorScopeSchema } from "@/features/runtime-platform/contracts/permissions";

import {
  PlatformApprovalMetadataSchema,
  PlatformAuditMetadataSchema,
} from "./delegation";

function pickActorScopes() {
  const [actorScope, ...remainingScopes] = RuntimeActorScopeSchema.options;
  const delegatedAgentScope = remainingScopes[0] ?? actorScope;

  return { actorScope, delegatedAgentScope };
}

describe("delegated actor + approval contract seams", () => {
  it("keeps delegated agent metadata separate from the command actor scope", () => {
    const { actorScope, delegatedAgentScope } = pickActorScopes();

    const parsed = PlatformCommandSchema.parse({
      id: "cmd_enable_1",
      type: "plugin.enable",
      actor: {
        actorId: "teacher_1",
        actorScope,
      },
      scope: {
        schoolId: "school_1",
        pluginId: "plugin_1",
      },
      payload: {
        schoolId: "school_1",
        pluginId: "plugin_1",
        enabledBy: "teacher_1",
      },
      correlation: {
        correlationId: "corr_enable_1",
        causationId: null,
        producer: "ai-agent",
      },
      audit: {
        delegatedActor: {
          delegatedAgentId: "agent_enable_1",
          delegatedAgentScope,
          delegationReason: "Teacher requested delegated execution",
          authorityPosture: "delegated-no-elevation",
        },
        approval: {
          status: "approved",
          summary: "Teacher approved delegated plugin enable command",
          reference: {
            kind: "command",
            id: "approval_cmd_1",
            summary: "Approval reference for plugin.enable",
          },
        },
      },
    });

    expect(parsed.actor.actorScope).toBe(actorScope);
    expect(parsed.audit.delegatedActor?.delegatedAgentScope).toBe(delegatedAgentScope);
    expect(parsed.audit.delegatedActor?.delegatedAgentScope).not.toBeUndefined();
  });

  it("rejects delegated metadata that implies authority elevation", () => {
    const { delegatedAgentScope } = pickActorScopes();

    const parsed = PlatformAuditMetadataSchema.safeParse({
      delegatedActor: {
        delegatedAgentId: "agent_escalation_1",
        delegatedAgentScope,
        delegationReason: "Attempted escalation",
        authorityPosture: "elevated",
      },
      approval: null,
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts approval metadata as summary plus reference seam only", () => {
    const parsed = PlatformApprovalMetadataSchema.parse({
      status: "pending",
      summary: "Waiting for teacher review",
      reference: {
        kind: "audit-log",
        id: "audit_approval_1",
        summary: "Audit reference for pending approval",
      },
    });

    expect(parsed.reference?.summary).toBe("Audit reference for pending approval");
  });

  it("rejects approval metadata carrying a full workflow snapshot object", () => {
    const parsed = PlatformSuccessEventSchema.safeParse({
      eventType: "platform.command.succeeded",
      category: "outcome",
      aggregateType: "plugin",
      aggregateId: "plugin_1",
      payload: {
        commandType: "plugin.enable",
        invalidationTags: ["plugin:plugin_1"],
        resultSummary: {
          nextState: "enabled",
        },
      },
      audit: {
        delegatedActor: null,
        approval: {
          status: "approved",
          summary: "Operator reviewed delegated command execution",
          reference: {
            kind: "command",
            id: "approval_cmd_2",
            summary: "Approval reference for command success",
            workflowSnapshot: {
              steps: ["review", "approve", "execute"],
            },
          },
        },
      },
    });

    expect(parsed.success).toBe(false);
  });
});
