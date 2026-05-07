import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync("src/lib/dal/classroom.ts", "utf8");
const actionSource = readFileSync("src/actions/classroom-actions.ts", "utf8");
const routeSource = readFileSync("src/app/api/classroom/[sessionId]/snapshot/route.ts", "utf8");
const eventsSource = readFileSync("src/app/api/classroom/[sessionId]/events/route.ts", "utf8");

describe("classroom DAL reliability", () => {
  it("creates and reuses participant rows for authorized late joiners", () => {
    expect(source).toContain("export async function ensureClassroomParticipant");
    expect(source).toContain('connectionState: "reconnecting"');
    expect(source).toContain("onConflictDoNothing");
    expect(source).toContain("CLASSROOM_PARTICIPANT_REQUIRED");
    expect(source).toContain('eq(classMembers.role, "student")');
  });

  it("updates connection state, current step, and last seen timestamps", () => {
    expect(source).toContain("export async function updateClassroomParticipantConnection");
    expect(source).toContain("lastSeenAt: new Date()");
    expect(source).toContain("currentStepId");
    expect(source).toContain("connectionState: input.connectionState");
  });

  it("keeps snapshot route no-store and maps auth errors to safe messages", () => {
    expect(routeSource).toContain('"Cache-Control": "no-store"');
    expect(routeSource).toContain("当前用户不在课堂名单中");
    expect(routeSource).toContain("课堂已结束");
  });

  it("keeps SSE polling no-store without route-side updateTag writes", () => {
    expect(eventsSource).toContain('cache: "no-store"');
    expect(eventsSource).toContain('"Cache-Control": "no-store"');
    expect(eventsSource).toContain("console.warn");
    expect(eventsSource).not.toContain("updateTag(");
  });

  it("exposes presence touch action with zod validation", () => {
    expect(actionSource).toContain("touchClassroomPresenceAction");
    expect(actionSource).toContain("TouchClassroomPresenceInputSchema.safeParse");
    expect(actionSource).toContain("updateClassroomParticipantConnection");
    expect(actionSource).toContain("connectionState");
  });
});
