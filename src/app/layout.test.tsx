import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync("src/app/layout.tsx", "utf8");

describe("RootLayout hydration guard", () => {
  it("adds a hydration warning guard only on the root html element", () => {
    expect(source).toContain('<html lang="zh-CN" suppressHydrationWarning>');
    expect(source).not.toContain("<body suppressHydrationWarning");
  });

  it("keeps the existing lang, font, and ThemeInjector structure", () => {
    expect(source).toContain('lang="zh-CN"');
    expect(source).toContain('<body className={lexend.variable}>');
    expect(source).toContain('<Suspense fallback={null}>');
    expect(source).toContain("<ThemeInjector />");
  });
});
