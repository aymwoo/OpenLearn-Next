import { describe, expect, it } from "vitest";

import {
  createInitialRank,
  createRankAfter,
  createRankBefore,
  createRankBetween,
} from "./lexorank";

describe("lexorank helper", () => {
  it("creates a non-empty initial rank", () => {
    expect(createInitialRank()).toMatch(/\S+/);
  });

  it("creates ranks before and after an existing rank", () => {
    const rank = createInitialRank();

    expect(createRankBefore(rank) < rank).toBe(true);
    expect(createRankAfter(rank) > rank).toBe(true);
  });

  it("creates a rank between two neighbors", () => {
    const left = createInitialRank();
    const right = createRankAfter(left);
    const between = createRankBetween(left, right);

    expect(left < between).toBe(true);
    expect(between < right).toBe(true);
  });

  it("supports repeated between insertions", () => {
    let left = createInitialRank();
    const right = createRankAfter(left);

    for (let index = 0; index < 8; index += 1) {
      const next = createRankBetween(left, right);
      expect(left < next).toBe(true);
      expect(next < right).toBe(true);
      left = next;
    }
  });

  it("rejects invalid rank ordering", () => {
    expect(() => createRankBetween("z", "0")).toThrow("Invalid rank");
  });
});
