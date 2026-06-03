// Phase 68 close-gate — headless auth stub (Option A: tsconfig `paths` remap).
//
// The verify:phase68 runner exercises the REAL governance gate end-to-end, but the
// gate's session-injection path (governance-gate -> assertActiveTeacher ->
// getCurrentUserDTO -> auth()) cannot run NextAuth headlessly (no request, no cookies).
//
// Instead of touching production `src/lib/auth/auth.ts`, the runner is launched with a
// dedicated tsconfig (`tsconfig.verify-phase68.json`) whose `paths` remaps the specifier
// `@/lib/auth/auth` to THIS file. Only `auth()` is stubbed — it returns a session for the
// seeded teacher; everything else (memberships DAL, governance projection, allowlist,
// gate, write-bus, audit writes) runs for real against the seeded throwaway libsql DB.
//
// SEEDED_TEACHER_ID is duplicated in the runner; keep both in sync.

export const SEEDED_TEACHER_ID = "teacher-68-05";

// Mirrors the shape consumed by getCurrentUserDTO (session.user.id only).
export const auth = async () => ({ user: { id: SEEDED_TEACHER_ID } });

// Defensive no-op mirrors of the production module's other exports, so that any module
// in the loaded graph importing them resolves to a defined value (none are invoked at
// import time in the runner's code path).
export const handlers = {} as Record<string, unknown>;
export const signIn = async () => undefined;
export const signOut = async () => undefined;
export const authorizeCredentials = async () => null;
