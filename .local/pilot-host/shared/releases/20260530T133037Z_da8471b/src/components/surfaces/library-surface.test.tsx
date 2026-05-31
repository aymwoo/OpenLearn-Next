// @vitest-environment jsdom

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LibrarySurface } from "./library-surface";

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("lucide-react", () => ({
  BookMarked: () => <span>BookMarked</span>,
  Search: () => <span>Search</span>,
  Link: () => <span>Link</span>,
}));

describe("LibrarySurface", () => {
  it("shows knowledge source business truth without task-center internals", () => {
    const { container } = render(
      <LibrarySurface
        mode="resources"
        resources={[
          {
            id: "resource-1",
            schoolId: "school-1",
            ownerId: "teacher-1",
            courseId: null,
            title: "变量小抄",
            visibility: "school",
            classification: "worksheet",
            ragEligible: true,
            url: "https://example.com/resource-1",
            knowledgeSourceStatus: "processing",
            knowledgeSourceError: null,
            indexedChunkCount: 3,
            failedChunkCount: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          {
            id: "resource-2",
            schoolId: "school-1",
            ownerId: "teacher-1",
            courseId: null,
            title: "古诗任务单",
            visibility: "course",
            classification: "textbook",
            ragEligible: true,
            url: null,
            knowledgeSourceStatus: "failed",
            knowledgeSourceError: "RESOURCE_SOURCE_EMPTY",
            indexedChunkCount: 0,
            failedChunkCount: 2,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ]}
      />,
    );

    expect(screen.getByText("RAG 处理中")).toBeTruthy();
    expect(screen.getByText("RAG 处理失败")).toBeTruthy();
    expect(screen.getByText(/已索引分块: 3/)).toBeTruthy();
    expect(screen.getByText(/失败说明: RESOURCE_SOURCE_EMPTY/)).toBeTruthy();
    expect(container.textContent).not.toContain("taskId");
    expect(container.textContent).not.toContain("queueJobId");
    expect(container.textContent).not.toContain("重试");
  });
});
