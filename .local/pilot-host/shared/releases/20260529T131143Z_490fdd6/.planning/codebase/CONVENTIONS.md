# Coding Conventions

**Analysis Date:** 2026-05-24

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `ClassroomCard.tsx`)
- DAL/Modules: kebab-case (e.g., `classroom.ts`, `plugin-migration.ts`)
- Tests: co-located with source, `*.test.ts` or `*.spec.ts` suffix
- DTO Schemas: PascalCase schema objects (e.g., `ClassroomSessionDTOSchema`)

**Functions:**
- camelCase for functions and methods
- Verb prefixes for actions: `get`, `create`, `update`, `delete`, `record`, `assert`
- DAL functions: `getXxxDTO`, `ensureXxx`, `createXxx`, `updateXxx`

**Variables:**
- camelCase for local variables
- UPPER_SNAKE_CASE for constants
- Type prefixes avoided in favor of TypeScript inference

**Types:**
- PascalCase for types, interfaces, and Zod schemas
- Suffix `InputSchema` for input DTOs
- Suffix `DTO` or `DTOSchema` for output/transfer objects
- Suffix `Input` for raw input types

## Code Style

**Formatting:**
- Tool: Prettier
- Key settings: single quotes, semi-colons, 2-space indent

**Linting:**
- Tool: ESLint
- Path alias: `@` maps to `src/`

## Import Organization

**Order:**
1. `"server-only"` - server-only marker (must be first)
2. Node built-ins (`node:fs`, `node:path`)
3. External packages (`zod`, `drizzle-orm`)
4. Internal `@/` aliases (db, lib, features, actions)
5. Relative imports (for co-located files)

**Path Aliases:**
```typescript
import { db } from "@/db";
import { SomeSchema } from "@/lib/dto/some-module";
import { helperFn } from "@/lib/utils";
```

## DTO + Zod Validation Pattern

**Schema Definition Location:** `src/lib/dto/`

**Pattern:**
```typescript
// src/lib/dto/example.ts
import { z } from "zod";

export const CreateExampleInputSchema = z.object({
  name: z.string().min(1),
  value: z.number().optional(),
});

export type CreateExampleInput = z.infer<typeof CreateExampleInputSchema>;
export type CreateExampleDTO = CreateExampleInput; // Reuse or map to separate DTO
```

**DAL Usage:**
```typescript
// src/lib/dal/example.ts
import "server-only";

export async function someOperation(rawInput: unknown) {
  // 1. Always validate raw input with Zod first
  const input = SomeInputSchema.parse(rawInput);

  // 2. Use typed input for business logic
  const result = await db.insert(examples).values(input);

  // 3. Return typed DTO
  return result;
}
```

**Key Files:**
- `src/lib/dal/classroom.ts` - Classroom domain DAL
- `src/lib/dal/learning.ts` - Learning progress DAL
- `src/lib/dal/lesson-authoring.ts` - Lesson authoring DAL
- `src/lib/dto/classroom.ts` - Classroom DTOs and schemas
- `src/lib/dto/learning.ts` - Learning DTOs and schemas
- `src/lib/dto/lesson-authoring.ts` - Lesson authoring DTOs and schemas

## LexoRank Step Ordering

**Location:** `src/lib/ranking/lexorank.ts`

**Purpose:** Order lesson steps without integer positions. Prevents cascade updates when reordering.

**API:**
```typescript
import { createInitialRank, createRankAfter, createRankBefore, createRankBetween } from "@/lib/ranking/lexorank";

// Initial rank for first step
const first = createInitialRank(); // "U" (midpoint of alphabet)

// Add after existing rank
const next = createRankAfter(existingRank);

// Add before existing rank
const prev = createRankBefore(existingRank);

// Insert between two ranks
const between = createRankBetween(leftRank, rightRank);
```

**Usage in Schema:**
```typescript
// lessonSteps table uses rank column (not position integer)
rank: text("rank").notNull(),
```

**Important:** Never use integer columns for ordering steps. Always use LexoRank strings.

## Append-Only Submissions Pattern

**Tables:** `taskSubmissions`, `quizAttempts`, `runtimeStepStates`, `runtimeStepSessions`

**Pattern:**
```typescript
async function submitTask(rawInput: unknown) {
  const input = SubmitTaskInputSchema.parse(rawInput);

  return db.transaction(async (tx) => {
    // 1. Clear isLatest on previous submissions
    await tx.update(taskSubmissions)
      .set({ isLatest: false })
      .where(
        and(
          eq(taskSubmissions.publishedVersionId, input.publishedVersionId),
          eq(taskSubmissions.stepId, input.stepId),
          eq(taskSubmissions.studentId, input.studentId),
          eq(taskSubmissions.isLatest, true)
        )
      );

    // 2. Insert new row with isLatest: true
    const [newSubmission] = await tx.insert(taskSubmissions)
      .values({ ...input, isLatest: true })
      .returning();

    return newSubmission;
  });
}
```

**Key Files:**
- `src/db/schema.ts` - Tables with `isLatest` column
- `src/lib/dal/learning.ts` - Task/quiz submission DAL functions

## Error Handling

**Patterns:**
- Custom error messages for domain errors (e.g., `INACCESSIBLE_LESSON_MESSAGE`)
- Zod validation errors bubble up naturally
- DAL throws on constraint violations
- Server Actions return `{ success: false, error: "..." }` for client handling

**Server Actions:**
```typescript
// Return structured error result
return { success: false, error: "课时暂不可学习" };
```

## Comments

**When to Comment:**
- Domain invariants: `// LexoRank ensures ordering without cascade updates`
- Complex queries: explain Why not What
- TODO markers for known issues

**JSDoc/TSDoc:**
- Use for public API surfaces (DAL exports, exported types)
- Include parameter descriptions for complex functions

## Module Design

**Exports:**
- DAL: Named exports only, no default export
- DTOs: Named exports (schema + type)
- Utils: Named exports, grouped by domain

**Barrel Files:**
- DTOs in `src/lib/dto/` use index.ts re-exports where logical
- Features use `shared/` for cross-module contracts

## Git Commit Convention

**Format:**
```
type(scope): description
```

**Types:**
- `fix` - Bug fixes
- `feat` - New features
- `docs` - Documentation only
- `test` - Test additions/modifications
- `refactor` - Code restructuring without behavior change
- `chore` - Build/tooling changes

**Examples from this repo:**
```
fix(46): close migration governance review gaps
feat(45-02): make phase45 verification behavior first
docs(54-03): complete ai-native contract exposure plan
test(45-02): add real sqlite cascade regression coverage
```

---

*Convention analysis: 2026-05-24*