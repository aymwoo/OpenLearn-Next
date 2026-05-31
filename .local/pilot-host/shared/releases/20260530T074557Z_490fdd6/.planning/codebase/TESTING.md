# Testing Patterns

**Analysis Date:** 2026-05-24

## Test Framework

**Runner:**
- Vitest v1.x (Next.js 16 compatible)
- Config: `vitest.config.mts`

**Assertion Library:**
- Vitest built-in `expect`
- Chai-style assertions (`expect(x).to.equal(y)`)

**Run Commands:**
```bash
pnpm test              # Watch mode
pnpm test run          # Single run (CI)
npx vitest path/to/file.test.ts  # Run specific test file
```

## Test File Organization

**Location:**
- Co-located with source files (same directory)
- Tests in `src/` tree match `src/**/*.{test,spec}.{ts,tsx}`
- Scripts tests: `scripts/**/*.test.ts`

**Naming:**
- `{module}.test.ts` - Unit tests for module
- `{module}.integration.test.ts` - Integration tests
- `{module}.test.ts` alongside `{module}.ts`

**Examples:**
```
src/lib/dal/classroom.test.ts
src/lib/dal/classroom.ts

src/actions/classroom-actions.test.ts
src/actions/classroom-actions.ts
```

## Test Structure

**Suite Organization:**
```typescript
import "server-only";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock external dependencies
vi.mock("@/db", () => ({
  db: { /* mock implementation */ },
}));

describe("functionName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should do something specific", async () => {
    const result = await someFunction(input);
    expect(result).toEqual(expected);
  });

  it("should handle error case", async () => {
    await expect(someFunction(invalidInput)).rejects.toThrow("expected error");
  });
});
```

**Patterns:**
- `beforeEach` for mock reset
- `describe` blocks for grouping related tests
- `it` or `test` for individual test cases
- Async tests use `await expect().resolves/rejects`

## Mocking

**Framework:** Vitest `vi`

**Common Mocks:**
```typescript
// Mock server-only
vi.mock("server-only", () => ({}));

// Mock database
vi.mock("@/db", () => ({
  db: {
    query: {
      someTable: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(),
    update: vi.fn(() => ({ set: vi.fn() })),
  },
}));

// Mock DAL dependencies
vi.mock("@/lib/dal/some-module", () => ({
  someExportedFunction: vi.fn(),
}));

// Mock feature modules
vi.mock("@/features/some-feature/server/action", () => ({
  someAction: vi.fn(),
}));
```

**Mock Pattern for DAL Tests:**
```typescript
// src/lib/dal/classroom.test.ts
const findManyClassroomSessions = vi.fn();
const findFirstClassroomSessions = vi.fn();
// ... more mock declarations

vi.mock("@/db", () => ({
  db: {
    query: {
      classroomSessions: {
        findMany: findManyClassroomSessions,
        findFirst: findFirstClassroomSessions,
      },
      // ... other table mocks
    },
    insert: vi.fn(),
    update: vi.fn(() => ({ set: vi.fn() })),
  },
}));
```

**What to Mock:**
- Database (`@/db`)
- External services (Redis, HTTP clients)
- DAL inter-module dependencies
- Server-only modules

**What NOT to Mock:**
- Zod schemas (test actual validation)
- Pure utility functions with no side effects
- Internal helper functions (test behavior, not implementation)

## Fixtures and Factories

**Test Data:**
- Inline fixtures in test files for small datasets
- Helper factories for complex objects (co-located in test files)
- Mock data matches DTO schema shape

**Example:**
```typescript
const mockClassroomSession = {
  id: "session-1",
  lessonId: "lesson-1",
  teacherId: "teacher-1",
  status: "active",
  mode: "locked",
  createdAt: new Date().toISOString(),
};
```

## Coverage

**Target:** `src/actions/**` (actions directory)

**Configuration (vitest.config.mts):**
```typescript
coverage: {
  provider: "v8",
  reporter: ["text", "json"],
  include: ["src/actions/**"],
  exclude: [
    "src/**/*.test.**",
    "src/**/*.spec.**",
    "src/db/**",
    "src/app/api/**",
  ],
},
```

**View Coverage:**
```bash
npx vitest --coverage
```

## Test Types

**Unit Tests:**
- DAL functions with mocked DB
- Pure business logic
- Zod schema validation
- Edge cases and error paths

**Integration Tests:**
- Test files named `*.integration.test.ts`
- Test file organization with `*.test.ts` in same location
- May use real database or test containers
- Example: `src/actions/class-management-actions.integration.test.ts`

**E2E Tests:**
- Not detected in standard test suite
- May use Playwright/Cypress for full flow testing

## Common Patterns

**Async Testing:**
```typescript
it("should resolve with result", async () => {
  const result = await someAsyncFunction(input);
  expect(result).toEqual(expected);
});

it("should reject on invalid input", async () => {
  await expect(someAsyncFunction(invalidInput)).rejects.toThrow();
});
```

**Error Testing:**
```typescript
it("should throw domain error", () => {
  expect(() => createRankBefore("0")).toThrow("Invalid rank");
});
```

**Transaction Testing (Append-Only):**
```typescript
it("should mark previous submission as not latest", async () => {
  const updateSet = vi.fn();
  vi.mock("@/db", () => ({
    db: {
      update: vi.fn(() => ({ set: updateSet })),
      insert: vi.fn(),
    },
  }));

  await submitTask(validInput);

  expect(updateSet).toHaveBeenCalledWith({ isLatest: false });
});
```

## Key Test Files

**DAL Tests:**
- `src/lib/dal/classroom.test.ts` - Classroom DAL unit tests
- `src/lib/dal/learning.test.ts` - Learning progress tests
- `src/lib/dal/lesson-authoring.test.ts` - Lesson authoring tests
- `src/lib/dal/plugin-migration.test.ts` - Plugin migration tests

**Action Tests:**
- `src/actions/classroom-actions.test.ts` - Classroom server action tests
- `src/actions/class-management-actions.test.ts` - Class management tests
- `src/actions/lesson-authoring-actions.test.ts` - Lesson authoring tests

**Feature Tests:**
- `src/features/runtime-platform/` - Runtime platform tests
- `src/features/async-tasks/` - Async task tests

---

*Testing analysis: 2026-05-24*