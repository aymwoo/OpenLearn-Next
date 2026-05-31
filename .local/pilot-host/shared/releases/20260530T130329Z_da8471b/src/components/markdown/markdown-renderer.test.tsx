// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const {
  mermaidInitialize,
  mermaidRender,
  revealInstances,
  RevealMock,
} = vi.hoisted(() => {
  const mermaidInitialize = vi.fn();
  const mermaidRender = vi.fn().mockResolvedValue({ svg: "<svg><text>diagram</text></svg>" });
  const revealInstances: Array<{
    initialize: ReturnType<typeof vi.fn>;
    slide: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
    getIndices: ReturnType<typeof vi.fn>;
  }> = [];

  const RevealMock = vi.fn().mockImplementation(function RevealMock() {
    const instance = {
      initialize: vi.fn().mockResolvedValue(undefined),
      slide: vi.fn(),
      on: vi.fn(),
      destroy: vi.fn(),
      getIndices: vi.fn(() => ({ h: 0 })),
    };

    revealInstances.push(instance);
    return instance;
  });

  return { mermaidInitialize, mermaidRender, revealInstances, RevealMock };
});

vi.mock("mermaid", () => ({
  default: {
    initialize: mermaidInitialize,
    render: mermaidRender,
  },
}));

vi.mock("reveal.js", () => ({
  default: RevealMock,
}));

import { MarkdownRenderer } from "./markdown-renderer";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  revealInstances.length = 0;
  delete (window as typeof window & { __markdownExecuted?: number }).__markdownExecuted;
});

function createStep(overrides?: { source?: string; renderMode?: "document" | "reveal"; mermaidEnabled?: boolean }) {
  return {
    title: "Markdown 课件",
    payload: {
      type: "content" as const,
      title: "Markdown 课件",
      body: "默认内容",
      materialRefs: [],
      markdown: {
        asset: {
          resourceId: "resource-markdown-1",
          materialId: "material-markdown-1",
          title: "Markdown 课件",
        },
        source: overrides?.source ?? "# 安全课件",
        renderMode: overrides?.renderMode ?? "document",
        mermaidEnabled: overrides?.mermaidEnabled ?? false,
      },
    },
  };
}

describe("MarkdownRenderer safety", () => {
  it("does not execute raw HTML or scripts in document mode", () => {
    render(
      <MarkdownRenderer
        step={createStep({
          source: '# 安全课件\n<script>window.__markdownExecuted = 1</script>\n<img src="x" onerror="window.__markdownExecuted = 2" />',
        })}
      />,
    );

    expect(screen.getByText("安全课件")).toBeTruthy();
    expect(document.querySelector("script")).toBeNull();
    expect(document.querySelector("img")).toBeNull();
    expect((window as typeof window & { __markdownExecuted?: number }).__markdownExecuted).toBeUndefined();
  });

  it("keeps mermaid rendering in strict security mode", async () => {
    render(
      <MarkdownRenderer
        step={createStep({
          source: "```mermaid\ngraph TD\nA-->B\n```",
          mermaidEnabled: true,
        })}
      />,
    );

    await waitFor(() => {
      expect(mermaidInitialize).toHaveBeenCalledWith({
        startOnLoad: false,
        securityLevel: "strict",
      });
    });
  });

  it("does not execute raw HTML or scripts in reveal mode", async () => {
    render(
      <MarkdownRenderer
        step={createStep({
          source: "# 第一页\n<script>window.__markdownExecuted = 3</script>\n---\n## 第二页",
          renderMode: "reveal",
        })}
        slideState={{ stepId: "step-markdown", slideIndex: 1 }}
      />,
    );

    await waitFor(() => {
      expect(RevealMock).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText("第一页")).toBeTruthy();
    expect(screen.getByText("第二页")).toBeTruthy();
    expect(document.querySelector("script")).toBeNull();
    expect((window as typeof window & { __markdownExecuted?: number }).__markdownExecuted).toBeUndefined();
  });
});
