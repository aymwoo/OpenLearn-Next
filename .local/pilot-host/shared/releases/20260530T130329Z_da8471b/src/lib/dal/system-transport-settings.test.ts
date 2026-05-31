import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("system transport settings dal", () => {
  const source = readFileSync(
    "src/lib/dal/system-transport-settings.ts",
    "utf8",
  );

  it("keeps deploy authority above the product toggle and restricts mutation to developer or super_admin", () => {
    expect(source).toContain("activeRoles.includes(\"developer\") || activeRoles.includes(\"super_admin\")");
    expect(source).toContain("deployAllowsRedis &&");
    expect(source).toContain("redisReachable &&");
    expect(source).toContain("classroomTransportMode === \"redis_fanout\"");
    expect(source).toContain("SYSTEM_TRANSPORT_SETTINGS_UNAUTHORIZED");
  });

  it("anchors the global truth in a typed singleton table instead of cookie-based settings", () => {
    expect(source).toContain("systemTransportSettings");
    expect(source).toContain("id: \"default\"");
    expect(source).not.toContain("theme-cookie");
  });
});
