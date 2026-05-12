import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const homeLoginCardSource = readFileSync("src/components/home/home-login-card.tsx", "utf8");

describe("HomeLoginCard", () => {
  it("uses studentNumber copy for student login", () => {
    expect(homeLoginCardSource).toContain("{roleIntent === 'student' ? '学号' : '邮箱地址'}");
    expect(homeLoginCardSource).toContain("placeholder={roleIntent === 'student' ? '请输入学号' : 'teacher@openlearn.dev'}");
  });
});
