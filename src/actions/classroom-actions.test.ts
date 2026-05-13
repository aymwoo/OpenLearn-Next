import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync("src/actions/classroom-actions.ts", "utf8");
const clientSource = readFileSync("src/components/learning/classroom-runtime-client.tsx", "utf8");

describe("classroom presence actions", () => {
  it("validates touchClassroomPresenceAction input before DAL writes", () => {
    expect(source).toContain("export async function touchClassroomPresenceAction");
    expect(source).toContain("TouchClassroomPresenceInputSchema.safeParse");
    expect(source).toContain("updateClassroomParticipantConnection");
  });

  it("keeps version conflict feedback with latest snapshot recovery", () => {
    expect(source).toContain("VERSION_CONFLICT");
    expect(source).toContain("latest: result.snapshot");
    expect(source).toContain("课堂状态已经被更新。请先恢复最新状态，再继续操作。");
  });

  it("wires connected and reconnecting presence touches in the student runtime", () => {
    expect(clientSource).toContain("touchClassroomPresenceAction");
    expect(clientSource).toContain("touchPresence('connected'");
    expect(clientSource).toContain("touchPresence('reconnecting'");
  });

  it("validates evidence and intervention action input before DAL writes", () => {
    expect(source).toContain("export async function recordClassroomEvidenceAction");
    expect(source).toContain("export async function recordClassroomInterventionAction");
    expect(source).toContain("RecordClassroomEvidenceInputSchema.safeParse");
    expect(source).toContain("RecordClassroomInterventionInputSchema.safeParse");
    expect(source).toContain("recordClassroomEvidence(");
    expect(source).toContain("recordClassroomIntervention(");
  });

  it("invalidates classroom cache after evidence and intervention writes", () => {
    expect(source).toContain("updateTag(cacheTags.classroom(parsed.data.sessionId))");
  });

  it("maps evidence and intervention authorization failures to structured action errors", () => {
    expect(source).toContain("CLASSROOM_EVIDENCE_UNAUTHORIZED");
    expect(source).toContain("CLASSROOM_INTERVENTION_UNAUTHORIZED");
    expect(source).toContain("UNAUTHORIZED");
  });

  it("adds a dedicated student quick-response action that keeps the classroom evidence write path", () => {
    expect(source).toContain("export async function submitStudentQuickResponseAction");
    expect(source).toContain("StudentQuickResponseInputSchema.safeParse");
    expect(source).toContain("recordStudentQuickResponse");
    expect(source).toContain("updateTag(cacheTags.classroom(parsed.data.sessionId))");
    expect(source).toContain("updateTag(cacheTags.progress(parsed.data.lessonId, result.studentId))");
    expect(source).toContain("updateTag(cacheTags.submission(parsed.data.lessonId, result.studentId))");
  });
});
