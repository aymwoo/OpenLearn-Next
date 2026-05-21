import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  getCanonicalRuntimeProofStepDefinition,
  getCanonicalRuntimeProofSnapshotStep,
} from "./runtime-proof";

const source = readFileSync("src/features/runtime-platform/classroom/runtime-session.ts", "utf8");

describe("runtime session service", () => {
  it("exports one canonical runtime proof step from the dev bootstrap path", () => {
    const definition = getCanonicalRuntimeProofStepDefinition();
    const snapshotStep = getCanonicalRuntimeProofSnapshotStep("lesson-proof");
    const definitionRuntime = (definition.payload as { runtime: Record<string, unknown> }).runtime;
    const snapshotRuntime = (snapshotStep.payload as { runtime: Record<string, unknown> }).runtime;

    expect(definition.type).toBe("task");
    expect(definitionRuntime).toMatchObject({
      kind: "html-courseware",
      entry: {
        sandbox: "iframe",
        bootstrap: "/runtime/html-courseware/pilot",
      },
      submitTarget: {
        primary: "classroom-evidence",
        additional: ["task-submission"],
      },
    });
    expect(snapshotStep).toMatchObject({
      lessonId: "lesson-proof",
      type: "task",
      payload: expect.any(Object),
    });
    expect(snapshotRuntime).toMatchObject({
      kind: "html-courseware",
      entry: expect.objectContaining({
        bootstrap: "/runtime/html-courseware/pilot",
      }),
    });
  });

  it("creates or resumes latest runtime session by identity", () => {
    expect(source).toContain("export async function createOrResumeRuntimeSession");
    expect(source).toContain("resumeFromLatest");
    expect(source).toContain("eq(runtimeStepSessions.classroomSessionId, identity.classroomSessionId)");
    expect(source).toContain("eq(runtimeStepSessions.runtimeVersion, identity.runtimeVersion)");
    expect(source).toContain("eq(runtimeStepSessions.isLatest, true)");
  });

  it("creates a new runtime session when runtime version changes", () => {
    expect(source).toContain("runtimeVersion: identity.runtimeVersion");
    expect(source).toContain("await db.insert(runtimeStepSessions).values({");
    expect(source).toContain("await db.update(runtimeStepSessions)");
    expect(source).toContain(".set({ isLatest: false })");
  });

  it("only accepts semantic interaction events instead of raw clickstream", () => {
    expect(source).toContain("RAW_INTERACTION_PATTERNS");
    expect(source).toContain("RUNTIME_INTERACTION_SEMANTIC_EVENT_REQUIRED");
    expect(source).toContain('"click"');
    expect(source).toContain('"pointer"');
    expect(source).toContain('"dom"');
  });

  it("keeps save separate from formal task and quiz submissions", () => {
    const saveStart = source.indexOf("export async function saveRuntimeState");
    const submitStart = source.indexOf("export async function submitRuntimeState");
    const saveSource = source.slice(saveStart, submitStart);

    expect(saveSource).toContain("runtime.state.saved");
    expect(saveSource).not.toContain("recordRuntimeTaskSubmission");
    expect(saveSource).not.toContain("recordRuntimeQuizAttempt");
    expect(saveSource).not.toContain("recordRuntimeProgressCompletion");
  });

  it("bridges submit back to durable classroom and learning truth", () => {
    expect(source).toContain("recordRuntimeClassroomEvidence");
    expect(source).toContain("recordRuntimeTaskSubmission");
    expect(source).toContain("recordRuntimeQuizAttempt");
    expect(source).toContain("recordRuntimeProgressCompletion");
    expect(source).toContain("runtime.submission.created");
  });

  it("returns runtimeSessionId and a structured proof summary from runtime submit", () => {
    expect(source).toContain("runtimeSessionId: runtimeSession.sessionId");
    expect(source).toContain("classroomSessionId: context.session.id");
    expect(source).toContain("submittedAt");
    expect(source).toContain("proofSummary");
    expect(source).toContain("submittedStateLabel");
    expect(source).toContain("/settings/labs/runtime-inspector?runtimeSessionId=");
  });

  it("persists runtime lifecycle transitions and governance audit writes", () => {
    expect(source).toContain("runtimeLifecycleTransitions");
    expect(source).toContain("createRuntimeGovernanceAudit");
    expect(source).toContain("updateRuntimeLifecycleState");
    expect(source).toContain('nextState: "ready"');
    expect(source).toContain("governanceAudits");
  });

  it("publishes runtime events through the transport gateway after durable writes", () => {
    expect(source).toContain("publishTransportEvent");
    expect(source).toContain("publishRuntimeTransportEvent");
    expect(source).toContain("truthRefType: \"runtime-session\"");
    expect(source).toContain("kind: eventType");
    expect(source).not.toContain("sseRuntimeTransportAdapter.deliver");
  });
});
