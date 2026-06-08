import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("classroom dashboard access", () => {
  it("keeps /classroom live-answer as a sibling tab instead of a new route", () => {
    const pageSource = readFileSync("src/app/(classroom)/classroom/page.tsx", "utf8");
    const panelSource = readFileSync(
      "src/components/classroom/classroom-control-panel.tsx",
      "utf8",
    );

    expect(pageSource).toContain("tab?: 'control' | 'live-answer'");
    expect(panelSource).toContain("作答实时");
    expect(panelSource).toContain("<LiveAnswerDashboardSurface");
  });

  it("blocks unknown classroom session ids before rendering dashboard state", () => {
    const pageSource = readFileSync("src/app/(classroom)/classroom/page.tsx", "utf8");
    expect(pageSource).toContain("redirect('/unauthorized')");
  });
});
