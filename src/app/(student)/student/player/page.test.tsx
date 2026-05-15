// @vitest-environment jsdom

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const runtimeClientSource = readFileSync("src/components/learning/classroom-runtime-client.tsx", "utf8");
const playerPageSource = readFileSync("src/app/(student)/student/player/page.tsx", "utf8");

describe("StudentPlayerPage", () => {
  it("keeps the route split between shell loading and a separate personal slot", () => {
    expect(playerPageSource).toContain("assertStudentCanOpenPlayer");
    expect(playerPageSource).toContain("getStudentPlayerShellDTO");
    expect(playerPageSource).toContain("getStudentPlayerPersonalDTO");
    expect(playerPageSource).toContain("<Suspense fallback={<PlayerPersonalFallback shell={shell} />}>\n");
    expect(playerPageSource).toContain("<PlayerPersonalLoader lessonId={shell.lessonId} selectedStepId={params?.stepId ?? null} shell={shell} scope={scope} />");
    expect(playerPageSource).not.toContain("getStudentPlayerDTO(");
  });

  it("preserves locked or unlocked runtime copy and resume priority in the classroom client", () => {
    expect(runtimeClientSource).toContain("runtime.forcedStepId ?? personal.progress.resumeStepId ?? shell.steps[0]?.id ?? null");
    expect(runtimeClientSource).toContain("player.runtime.forcedStepId ?? player.progress.resumeStepId");
    expect(runtimeClientSource).toContain("老师已开启锁定跟随，你将停留在当前步骤。");
    expect(runtimeClientSource).toContain("老师已开放自由浏览，你可以回看已开放步骤。");
    expect(runtimeClientSource).toContain("前往老师推荐步骤");
  });
});
