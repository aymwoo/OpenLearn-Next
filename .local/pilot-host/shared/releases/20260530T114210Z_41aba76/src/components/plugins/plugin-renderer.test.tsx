import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/plugins/plugin-renderer.tsx", "utf8");
const widgetSource = readFileSync("src/components/plugins/widgets/index.tsx", "utf8");
const stepSuggestionSource = readFileSync("src/components/plugins/widgets/step-suggestion-widget.tsx", "utf8");
const annotationSource = readFileSync("src/components/plugins/widgets/lesson-annotation-widget.tsx", "utf8");
const notificationSource = readFileSync("src/components/plugins/widgets/notification-stub-widget.tsx", "utf8");

describe("plugin renderer safety", () => {
  it("routes known proposal types to local widgets", () => {
    expect(widgetSource).toContain('case "stepSuggestion"');
    expect(widgetSource).toContain('case "lessonAnnotation"');
    expect(widgetSource).toContain('case "notificationStub"');
    expect(widgetSource).toContain("return null");
  });

  it("passes actorId to plugin DAL calls and short-circuits when actor is missing", () => {
    expect(source).toContain("getCurrentUserDTO");
    expect(source).toContain("const resolvedActorId");
    expect(source).toContain("if (!resolvedActorId?.trim() || !schoolId.trim())");
    expect(source).toContain("getEnabledPluginsForAnchor({");
    expect(source).toContain("actorId: resolvedActorId");
    expect(source).toContain("runPluginHook({");
  });

  it("keeps widget rendering free of raw HTML or scripts", () => {
    for (const snippet of [source, widgetSource, stepSuggestionSource, annotationSource, notificationSource]) {
      expect(snippet).not.toContain("dangerouslySetInnerHTML");
      expect(snippet).not.toContain("<script");
      expect(snippet).not.toContain("eval(");
    }
  });
});
