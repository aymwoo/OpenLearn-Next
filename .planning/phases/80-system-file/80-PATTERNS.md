# Phase 80: system.file - Pattern Map

**Mapped:** 2026-06-13
**Files analyzed:** 19 (13 new + 6 modified)
**Analogs found:** 19 / 19

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/app/api/system/file/upload/route.ts` | API Route (POST multipart) | streaming/CRUD | `src/app/api/classroom/[sessionId]/events/route.ts` (SSE stream) + `src/features/system-commands/facade.ts` (dispatchSystemCommand) | partial — stream pattern matches, Binary Bypass is novel in API route |
| `src/app/api/system/file/download/route.ts` | API Route (GET stream) | streaming | `src/app/api/classroom/[sessionId]/events/route.ts` (SSE stream) | partial — stream output pattern match |
| `src/app/api/system/file/delete/route.ts` | API Route (POST → Command Bus) | CRUD | `src/features/system-commands/facade.ts` (dispatchSystemCommand) | role-match — wraps facade dispatch |
| `src/app/api/system/file/list/route.ts` | API Route (GET) | request-response | `src/app/api/classroom/[sessionId]/snapshot/route.ts` (GET + DAL read) | exact — pure DAL read API route |
| `src/app/api/system/file/metadata/route.ts` | API Route (GET) | request-response | `src/app/api/classroom/[sessionId]/snapshot/route.ts` (GET + DAL read) | exact — pure DAL read API route |
| `src/features/system-commands/file-path-guard.ts` | utility | transform | `src/features/system-commands/ssrf-guard.ts` (multi-layer IP/domain validation) | role-match — multi-layer validation guard |
| `src/lib/dal/files.ts` | DAL/service | CRUD | `src/lib/dal/plugin-data.ts` (upsert + get + list patterns) | role-match — same DAL Drizzle CRUD patterns |
| `src/lib/file-storage/storage-path.ts` | utility | transform | `src/lib/cache-policy.ts` (deterministic path/identifier builder) | partial — string builder pattern match |
| `src/lib/file-storage/quota-check.ts` | utility (Transform stream) | streaming | `src/features/system-commands/ssrf-guard.ts` (bounds checking pattern) | partial — guard/constrant pattern match |
| `src/lib/file-storage/mime-fallback.ts` | utility | transform | — (no direct analog, simple lookup table) | — |
| `src/scripts/gc-files.ts` | script | batch | `scripts/verify-phase32-end-to-end.ts` (Node.js CLI script pattern) | role-match — standalone script with fs + DB |
| `src/features/system-commands/handler.ts` | handler (authorize + execute) | CRUD | `handler.ts` existing `systemConfigHandler` (authorize + execute + get) | exact — same file, same pattern, new entries |
| `src/features/system-commands/facade.ts` | facade | request-response | `facade.ts` existing `dispatchSystemCommand` (system.config.* branches) | exact — same file, new branch |
| `src/features/system-commands/audit.ts` | audit utility | request-response | `audit.ts` existing `writeSystemCommandAudit` (commandType union) | exact — same file, extend union |
| `src/features/platform-core/commands/contracts.ts` | model/contracts | CRUD | `contracts.ts` existing `SystemCommandTypes` + `SystemConfigSetPayloadSchema` | exact — same file, new type + payload |
| `src/features/platform-core/commands/registry.ts` | registry | request-response | `registry.ts` existing `platformCommandRegistry` entries | exact — same file, new registry entries |
| `src/lib/dto/resource-ai.ts` | DTO/schema | request-response | `resource-ai.ts` existing `SystemCommandConfigSchema` + `SystemCommandDiscriminatedSchema` | exact — same file, new schema + variant |
| `src/features/runtime-platform/contracts/permissions.ts` | contracts | request-response | `permissions.ts` existing `GovernanceDeniedReasonValues` | exact — same file, new reason codes |
| `src/db/schema.ts` | model/schema | CRUD | `db/schema.ts` existing `taskSubmissions` (append-only isLatest) | exact — same file, new table |

## Pattern Assignments

---

### `src/db/schema.ts` (model, new `pluginFiles` table)

**Analog:** `src/db/schema.ts` lines 674-707 (`taskSubmissions` append-only isLatest pattern)

**Imports pattern** (line 1):
```typescript
import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from "drizzle-orm/sqlite-core";
```

**Append-only isLatest + reference pattern** (lines 674-707):
```typescript
export const taskSubmissions = sqliteTable(
  "taskSubmission",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    publishedVersionId: text("publishedVersionId")
      .notNull()
      .references(() => publishedLessonVersions.id, { onDelete: "cascade" }),
    // ...
    isLatest: integer("isLatest", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("taskSubmissions_attempt_unique").on(...),
    index("taskSubmissions_latest_idx").on(
      table.publishedVersionId, table.stepId, table.studentId, table.isLatest
    ),
  ]
);
```

**Key pattern to copy:** `isLatest: integer("isLatest", { mode: "boolean" }).notNull().default(true)` + `$defaultFn(() => crypto.randomUUID())` for `id` + `createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date())`

**Table shape** (per RESEARCH.md lines 535-564):
```typescript
export const pluginFiles = sqliteTable(
  "pluginFile",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    schoolId: text("schoolId").notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    pluginId: text("pluginId").notNull()
      .references(() => pluginRegistrations.id, { onDelete: "cascade" }),
    operation: text("operation", { enum: ["upload", "delete"] }).notNull(),
    sha256: text("sha256"),           // null for delete operations
    fileName: text("fileName").notNull(),
    mimeType: text("mimeType"),
    diskPath: text("diskPath"),       // relative path from FILE_STORAGE_ROOT
    sizeBytes: integer("sizeBytes"),
    isLatest: integer("isLatest", { mode: "boolean" }).notNull().default(true),
    previousRowId: text("previousRowId"),  // append-only chain
    createdAt: integer("createdAt", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("pluginFiles_school_plugin_latest_idx")
      .on(table.schoolId, table.pluginId, table.isLatest),
    index("pluginFiles_sha256_idx").on(table.sha256),
    uniqueIndex("pluginFiles_school_plugin_sha256_upload_unique")
      .on(table.schoolId, table.pluginId, table.sha256),
  ],
);
```

---

### `src/lib/dto/resource-ai.ts` (DTO, new `SystemCommandFileSchema` + discriminated union variant)

**Analog:** `src/lib/dto/resource-ai.ts` lines 760-852 (SYSTEM_COMMAND_REASONS + SystemCommandConfigSchema + discriminated union)

**SYSTEM_COMMAND_REASONS extension** (lines 766-770):
```typescript
export const SYSTEM_COMMAND_REASONS = [
  "SYSTEM_COMMAND_DOMAIN_INVALID",
  "SYSTEM_COMMAND_METHOD_INVALID",
  "SYSTEM_COMMAND_KEY_INVALID",
] as const;
```
Add: `"SYSTEM_COMMAND_PATH_INVALID"`, `"SYSTEM_COMMAND_OPERATION_INVALID"` to this array.

**PATH validation pattern** (lines 793-794):
```typescript
const PATH_PATTERN = /^[a-zA-Z0-9_\-./]+$/;  // safe path chars only, no %00 and ..
```

**SystemCommandFileSchema pattern** (mirror lines 825-834 SystemCommandConfigSchema):
```typescript
export const SystemCommandFileSchema = z.strictObject({
  allowedPaths: z
    .array(
      z.string().min(1).regex(PATH_PATTERN, {
        message: "SYSTEM_COMMAND_PATH_INVALID",
      }),
    )
    .min(1, { message: "SYSTEM_COMMAND_PATH_INVALID" }),
  allowedOperations: z
    .array(
      z.enum(["upload", "download", "delete", "list", "metadata"]),
    )
    .min(1),
  maxSingleFileSize: z.number().int().positive().optional(),
  maxTotalStorage: z.number().int().positive().optional(),
});
```

**Discriminated union extension** (lines 845-852):
```typescript
export const SystemCommandDiscriminatedSchema = z.discriminatedUnion("command", [
  z.strictObject({ command: z.literal("system.http.request") }).merge(
    SystemCommandHttpRequestSchema,
  ),
  z.strictObject({ command: z.literal("system.config") }).merge(
    SystemCommandConfigSchema,
  ),
  // NEW:
  z.strictObject({ command: z.literal("system.file") }).merge(
    SystemCommandFileSchema,
  ),
]);
```

---

### `src/features/runtime-platform/contracts/permissions.ts` (contracts, new deny reason codes)

**Analog:** `permissions.ts` lines 32-44

**Add to GovernanceDeniedReasonValues:**
```typescript
export const GovernanceDeniedReasonValues = [
  "not_allowlisted",
  "capability_missing",
  "permission_denied",
  "lifecycle_blocked",
  "school_mismatch",
  "kill_switch",
  "unsupported_action",
  "domain_not_allowed",
  "method_not_allowed",
  "private_ip_blocked",
  "config_key_denied",
  // NEW:
  "path_not_allowed",
  "operation_not_allowed",
  "quota_exceeded",
] as const;
```

---

### `src/features/platform-core/commands/contracts.ts` (contracts, extend SystemCommandTypes + add payload schema)

**Analog:** `contracts.ts` lines 39, 255-281, 303 (`SystemCommandTypes` + `SystemConfigSetPayloadSchema` + `SystemCommandSchema`)

**SystemCommandTypes extension** (line 39):
```typescript
export const SystemCommandTypes = ["system.http.request", "system.config.set", "system.file.upload", "system.file.delete"] as const;
```

**New payload schema** (mirror lines 255-281 SystemConfigSetPayloadSchema):
```typescript
const SystemFileDeletePayloadSchema = z.strictObject({
  fileId: z.string().min(1),
});
```

**SystemCommandSchema extension** (mirror lines 303-390, add new variants):
```typescript
PlatformCommandEnvelopeSchema.extend({
  type: z.literal("system.file.upload"),
  payload: SystemFileDeletePayloadSchema,  // metadata-only payload
}),
PlatformCommandEnvelopeSchema.extend({
  type: z.literal("system.file.delete"),
  payload: SystemFileDeletePayloadSchema,
}),
```

**Add to PlatformCommandPayloadSchemas** (line 282-304):
```typescript
"system.file.upload": SystemFileDeletePayloadSchema,
"system.file.delete": SystemFileDeletePayloadSchema,
```

---

### `src/features/platform-core/commands/registry.ts` (registry, new entries)

**Analog:** `registry.ts` lines 153-171 (system.http.request + system.config.set registry entries)

**Registration pattern** (lines 153-161):
```typescript
"system.http.request": createPlatformCommandDefinition({
  commandType: "system.http.request",
  payloadSchema: PlatformCommandPayloadSchemas["system.http.request"],
  dedupe: "required",
  authorize: async (input: { command: PlatformCommand }) => {
    await systemHttpRequestHandler["system.http.request"].authorize(input);
  },
  execute: systemHttpRequestHandler["system.http.request"].execute,
}),
```

**Copy pattern for system.file.upload / system.file.delete:**
```typescript
import { systemFileHandler } from "@/features/system-commands/handler";

// ...
"system.file.upload": createPlatformCommandDefinition({
  commandType: "system.file.upload",
  payloadSchema: PlatformCommandPayloadSchemas["system.file.upload"],
  dedupe: "required",
  authorize: async (input: { command: PlatformCommand }) => {
    await systemFileHandler["system.file.upload"].authorize(input);
  },
  execute: systemFileHandler["system.file.upload"].execute,
}),
"system.file.delete": createPlatformCommandDefinition({
  commandType: "system.file.delete",
  payloadSchema: PlatformCommandPayloadSchemas["system.file.delete"],
  dedupe: "required",
  authorize: async (input: { command: PlatformCommand }) => {
    await systemFileHandler["system.file.delete"].authorize(input);
  },
  execute: systemFileHandler["system.file.delete"].execute,
}),
```

**Note:** `system.file.download`, `system.file.list`, `system.file.metadata` are pure DAL reads — they do NOT go through Command Bus and thus have NO registry entries (mirroring `system.config.get` which is excluded from registry per line 40 comment).

**Add to `satisfies Record` typing:** Extend the `satisfies Record<PlatformCommandType, PlatformCommandDefinition>` at line 171 to include new types.

---

### `src/features/system-commands/handler.ts` (handler, new `systemFileHandler`)

**Analog:** `handler.ts` existing `systemConfigHandler` (lines 800-1190) — authorize + execute + get patterns

**Import pattern** (lines 1-14):
```typescript
import "server-only";
import { z } from "zod";
import { db } from "@/db";
import { pluginRegistrations } from "@/db/schema";
import { PluginManifestSchema } from "@/lib/dto/resource-ai";
import { eq, and } from "drizzle-orm";
import {
  PlatformCommandExecutionError,
  type PlatformCommand,
  type PlatformCommandExecutionResult,
} from "@/features/platform-core/commands/contracts";
import { writeSystemCommandAudit } from "./audit";
```

**Authorize pattern** — manifest re-parse + first-match-wins (copy from lines 125-327, adapting to file operations):

Authorize for system.file.* operations:
1. Query `pluginRegistrations` by `pluginId` + `schoolId`
2. `PluginManifestSchema.parse(row.manifestJson)`
3. Filter for `entry.command === "system.file"`
4. First-match-wins: iterate entries, check `allowedPaths` (path prefix match) + `allowedOperations` (contains the operation verb)
5. Audit before throw on deny

**Path matching function** (mirror `matchConfigKey` lines 824-831):
```typescript
function matchFilePath(pattern: string, filePath: string): boolean {
  // Prefix match: "documents/" matches "documents/report.pdf"
  // Ensure trailing "/" for directory prefix or exact match
  if (pattern.endsWith("/")) {
    return filePath.startsWith(pattern);
  }
  return filePath === pattern;  // exact match for single file
}
```

**Authorize pattern for file operations** (mirror `systemConfigSetAuthorize` lines 936-1003):
```typescript
async function systemFileAuthorize({
  command,
  operationType,
}: {
  command: PlatformCommand;
  operationType: "upload" | "download" | "delete" | "list" | "metadata";
}): Promise<void> {
  // 1. Query pluginRegistrations for manifest
  // 2. Parse manifest
  // 3. Filter for command === "system.file" entries
  // 4. First-match-wins on allowedPaths + allowedOperations
  // 5. denySystemCommand-style audit-before-throw
}
```

**Execute pattern for upload** (metadata write, mirror `systemConfigSetExecute` lines 1014-1067):
```typescript
async function systemFileUploadExecute({
  command,
  attemptNumber: _attemptNumber,
}: {
  command: PlatformCommand;
  attemptNumber: number;
}): Promise<PlatformCommandExecutionResult> {
  // Insert into pluginFiles table with operation="upload"
  // Uses crypto.randomUUID() for id
  // Returns fileId to caller
}
```

**Execute pattern for delete** (append-only soft delete, mirror `pluginDataUpsertHandler.execute` in plugin-data.ts lines 138-210):
```typescript
async function systemFileDeleteExecute({
  command,
  attemptNumber: _attemptNumber,
}: {
  command: PlatformCommand;
  attemptNumber: number;
}): Promise<PlatformCommandExecutionResult> {
  // Transaction:
  // 1. Update existing row: isLatest = false
  // 2. Insert new row: operation="delete", isLatest=true, sha256=null
  // 3. Write allowed audit
}
```

**Export pattern** (mirror lines 1187-1190):
```typescript
export const systemFileHandler = {
  "system.file.upload": { authorize: systemFileUploadAuthorize, execute: systemFileUploadExecute },
  "system.file.delete": { authorize: systemFileDeleteAuthorize, execute: systemFileDeleteExecute },
};
```

**Deny helper pattern** (mirror `denySystemConfig` lines 868-924):
Create a `denySystemFile` helper that writes audit before throwing `PlatformCommandExecutionError`. The `commandType` parameter should accept `"system.file.upload" | "system.file.delete"`.

---

### `src/features/system-commands/facade.ts` (facade, new system.file.* branches)

**Analog:** `facade.ts` existing `dispatchSystemCommand` — lines 173-341 (system.config.set/get branches)

**New branches pattern** (mirror lines 218-316):

For `system.file.upload` (metadata-only, through Command Bus):
```typescript
if (input.commandType === "system.file.upload") {
  // Build commandId, dedupeKey
  // Build envelope with type: "system.file.upload"
  // payload: { fileId, sha256, fileName, mimeType, size, diskPath }
  // dispatchPlatformCommand(envelope, { ... })
  // return { success, data, commandId, attemptNumber }
}
```

For `system.file.delete` (through Command Bus):
```typescript
if (input.commandType === "system.file.delete") {
  // Similar pattern to system.config.set
  // payload: { fileId }
}
```

**Facade input type extension:** Add optional fields: `fileId?: string`, `fileMeta?: { sha256, fileName, mimeType, size, diskPath }`

**Fallthrough pattern** (line 320-341): The existing unknown commandType audit+throw pattern handles everything not in the if/else branches.

---

### `src/features/system-commands/audit.ts` (audit, extend commandType union)

**Analog:** `audit.ts` lines 1-70

**commandType union extension** (line 18):
```typescript
// BEFORE:
commandType: "system.http.request" | "system.config.set" | "system.config.get";
// AFTER:
commandType: "system.http.request" | "system.config.set" | "system.config.get" | "system.file.upload" | "system.file.delete";
```

No other changes needed — the `writeSystemCommandAudit` function is fully parameterized on `commandType`.

---

### `src/app/api/system/file/upload/route.ts` (API Route, POST multipart + stream)

**Analog:** Hybrid pattern — `src/app/api/classroom/[sessionId]/events/route.ts` (SSE stream) + `src/features/system-commands/facade.ts` (dispatchSystemCommand)

**Imports pattern:**
```typescript
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { NextRequest } from "next/server";
import { dispatchSystemCommand } from "@/features/system-commands/facade";
import { sanitizeFilePath } from "@/features/system-commands/file-path-guard";
import { QuotaTransform } from "@/lib/file-storage/quota-check";
import { buildStoragePath } from "@/lib/file-storage/storage-path";
import { getFileBySha256 } from "@/lib/dal/files";
```

**Route handler pattern** (mirror `api/health/route.ts` export pattern):
```typescript
export async function POST(request: NextRequest) {
  // 1. Auth: extract actorId from session
  // 2. Parse multipart stream
  // 3. SHA-256 pipeline + QuotaTransform + fs.createWriteStream
  // 4. On success: dispatchSystemCommand("system.file.upload", { fileMeta })
  // 5. Return structured response
  // 6. On error: cleanup partial file, return structured error (413/507)
}
```

**Error response structure** (per D-12):
```typescript
return Response.json(
  {
    error: "QUOTA_EXCEEDED",
    usage: bytesWritten,
    quota: maxBytes,
    exceeded: bytesWritten - maxBytes,
  },
  { status: 507 }
);
```

**Runtime declaration:**
```typescript
export const runtime = "nodejs";  // Required for stream.pipeline, fs.createWriteStream
```

---

### `src/app/api/system/file/download/route.ts` (API Route, GET streaming download)

**Analog:** `src/app/api/classroom/[sessionId]/events/route.ts` (stream pattern) + `src/app/api/classroom/[sessionId]/snapshot/route.ts` (DAL read + error handling)

**Imports pattern:**
```typescript
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { NextRequest } from "next/server";
import { getFileRecord } from "@/lib/dal/files";
import { resolveStoragePath } from "@/lib/file-storage/storage-path";
import { getMimeType } from "@/lib/file-storage/mime-fallback";
```

**Route handler pattern:**
```typescript
export async function GET(request: NextRequest) {
  // 1. Parse fileId from query params
  // 2. DAL read: get file record
  // 3. Resolve file path on disk
  // 4. Parse Range header
  // 5. Create readStream with range options
  // 6. Return streaming Response with Content-Type + Content-Disposition
}
```

**Response pattern:**
```typescript
const stream = createReadStream(diskPath, { start, end });
return new Response(ReadableStream from stream, {
  status: isRange ? 206 : 200,
  headers: {
    "Content-Type": mimeType,
    "Content-Disposition": `attachment; filename="${fileName}"`,
    "Content-Length": String(contentLength),
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-cache",
  },
});
```

**Runtime declaration:**
```typescript
export const runtime = "nodejs";
```

---

### `src/app/api/system/file/delete/route.ts` (API Route, POST → Command Bus)

**Analog:** `src/features/system-commands/facade.ts` (dispatchSystemCommand call) + `src/features/system-commands/handler.ts:systemConfigSetExecute`

**Imports pattern:**
```typescript
import type { NextRequest } from "next/server";
import { dispatchSystemCommand } from "@/features/system-commands/facade";
```

**Route handler pattern:**
```typescript
export async function POST(request: NextRequest) {
  const { fileId } = await request.json();
  // Call dispatchSystemCommand("system.file.delete", { fileId, ... })
  const result = await dispatchSystemCommand({
    commandType: "system.file.delete",
    pluginKey,
    actorId,
    fileId,
  });
  return Response.json(result);
}
```

---

### `src/app/api/system/file/list/route.ts` (API Route, GET pure DAL read)

**Analog:** `src/app/api/classroom/[sessionId]/snapshot/route.ts` — pure DAL read GET route with error handling

**Imports pattern:**
```typescript
import type { NextRequest } from "next/server";
import { listFiles } from "@/lib/dal/files";
```

**Route handler pattern** (copy snapshot route pattern, lines 3-47):
```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const prefix = searchParams.get("prefix") ?? "";
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);

  try {
    const result = await listFiles({ schoolId, pluginId, prefix, cursor, limit });
    return Response.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    // Error handling mirroring snapshot/route.ts lines 16-46
    return Response.json({ error: "..." }, { status: 500 });
  }
}
```

---

### `src/app/api/system/file/metadata/route.ts` (API Route, GET pure DAL read)

**Analog:** `src/app/api/classroom/[sessionId]/snapshot/route.ts` — pure DAL read GET route

Same pattern as list route but single file lookup: `getFileMetadata({ schoolId, pluginId, fileId })`.

---

### `src/features/system-commands/file-path-guard.ts` (utility, path traversal defense)

**Analog:** `src/features/system-commands/ssrf-guard.ts` — multi-layer validation guard, lines 1-60

**Imports pattern:**
```typescript
import { resolve } from "node:path";
```

**Multi-layer validation pattern** (mirror `isPrivateIPv4` -> DNS pinning -> HTTPS-only layers):
```typescript
const STORAGE_ROOT = process.env.FILE_STORAGE_ROOT || "data/files";
const ABSOLUTE_STORAGE_ROOT = resolve(STORAGE_ROOT);

export function sanitizeFilePath(rawPath: string): string | null {
  // Layer 1: Double URI decode (catches %2e%2e%2f and %252f)
  let decoded = rawPath;
  for (let pass = 0; pass < 2; pass++) {
    try { decoded = decodeURIComponent(decoded); } catch { return null; }
  }

  // Layer 2: Reject null bytes
  if (decoded.includes("\x00")) return null;

  // Layer 3: Reject parent references
  if (decoded.includes("..")) return null;

  // Layer 4: Absolute resolve + prefix verification
  const resolved = resolve(ABSOLUTE_STORAGE_ROOT, decoded);
  if (!resolved.startsWith(ABSOLUTE_STORAGE_ROOT + "/") && resolved !== ABSOLUTE_STORAGE_ROOT) {
    return null;
  }
  return resolved;
}
```

---

### `src/lib/dal/files.ts` (DAL, file metadata CRUD)

**Analog:** `src/lib/dal/plugin-data.ts` — Drizzle DAL with upsert + get + list patterns, lines 1-20 (imports), 408-468 (getPluginExtension), 471-512 (listPluginStepExtensions)

**Imports pattern** (lines 1-8):
```typescript
import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pluginFiles } from "@/db/schema";
```

**List pattern (cursor-based)** (mirror listPluginStepExtensions lines 471-511):
```typescript
export async function listFiles(input: {
  schoolId: string;
  pluginId: string;
  prefix: string;
  cursor?: string;
  limit: number;
}): Promise<{ files: FileRecord[]; nextCursor: string | null }> {
  const rows = await db.query.pluginFiles.findMany({
    where: and(
      eq(pluginFiles.schoolId, input.schoolId),
      eq(pluginFiles.pluginId, input.pluginId),
      eq(pluginFiles.isLatest, true),
    ),
    // prefix filtering applied post-query or via SQL LIKE
    orderBy: { createdAt: "desc" },
    limit: input.limit + 1,
  });
  // cursor-based pagination
  const hasMore = rows.length > input.limit;
  // ...
}
```

**Get by SHA256 (幂等 check)**:
```typescript
export async function getFileBySha256(schoolId: string, pluginId: string, sha256: string) {
  return db.query.pluginFiles.findFirst({
    where: and(
      eq(pluginFiles.schoolId, schoolId),
      eq(pluginFiles.pluginId, pluginId),
      eq(pluginFiles.sha256, sha256),
      eq(pluginFiles.isLatest, true),
      eq(pluginFiles.operation, "upload"),
    ),
  });
}
```

---

### `src/lib/file-storage/storage-path.ts` (utility, path builder)

**No direct analog** — simple utility pattern, no auth/error handling needed.

```typescript
import { resolve, join } from "node:path";

const STORAGE_ROOT = process.env.FILE_STORAGE_ROOT || "data/files";

export function buildStoragePath(schoolId: string, pluginKey: string, sha256: string, extension: string): string {
  return resolve(join(STORAGE_ROOT, schoolId, pluginKey, `${sha256}.${extension}`));
}

export function resolveStoragePath(relativePath: string): string {
  return resolve(join(STORAGE_ROOT, relativePath));
}
```

---

### `src/lib/file-storage/quota-check.ts` (utility, stream Transform for quota)

**No direct analog** — Node.js Transform pattern (from RESEARCH.md code examples lines 412-425).

```typescript
import { Transform } from "node:stream";

export class QuotaTransform extends Transform {
  private bytesWritten = 0;

  constructor(
    private readonly maxBytes: number,
    private readonly label: string = "file_upload",
  ) {
    super();
  }

  _transform(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null, data?: Buffer) => void) {
    this.bytesWritten += chunk.length;
    if (this.bytesWritten > this.maxBytes) {
      callback(new Error(`QUOTA_EXCEEDED:${this.label}`));
      return;
    }
    this.push(chunk);
    callback();
  }

  getTotalBytes(): number {
    return this.bytesWritten;
  }
}
```

---

### `src/lib/file-storage/mime-fallback.ts` (utility, MIME lookup)

**No direct analog** — simple key-value lookup.

```typescript
const EXTENSION_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".json": "application/json",
  ".txt": "text/plain",
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
};

export function getMimeType(fileName: string, dbMimeType?: string | null): string {
  if (dbMimeType && dbMimeType.length > 0) return dbMimeType;
  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  return EXTENSION_TO_MIME[ext] ?? "application/octet-stream";
}
```

---

### `src/scripts/gc-files.ts` (script, GC cleanup)

**Analog:** `scripts/verify-phase32-end-to-end.ts` — standalone Node.js CLI script with fs + db access

**Imports pattern** (lines 1-2):
```typescript
import { existsSync, statSync, unlinkSync } from "node:fs";
```

**GC script pattern:**
```typescript
// Standalone script — imports from project via relative path or tsconfig paths
// 1. Connect to db
// 2. Query pluginFiles WHERE isLatest = false (deleted rows)
// 3. For each: check if physical file exists, stat it, unlink it
// 4. Output statistics: deleted count, freed bytes
// 5. Does NOT write governanceAudit (operational, not plugin action)
```

---

## Shared Patterns

### Governance Gate (applies to all system.file.* operations that go through Command Bus)

**Source:** `src/features/system-commands/facade.ts` lines 199-213
**Apply to:** facade dispatch for system.file.upload (metadata) and system.file.delete

```typescript
// ① 治理门前置
let schoolId: string;
let projectionRow;
try {
  const gateResult = await assertActionExecutable({
    actorId: input.actorId,
    pluginKey: input.pluginKey,
    verb: input.commandType,
    correlationId,
  });
  schoolId = gateResult.schoolId;
  projectionRow = gateResult.projectionRow;
} catch (error) {
  throw error;  // gate already wrote denial audit
}
```

### Command Bus Envelope (applies to system.file.upload + system.file.delete)

**Source:** `src/features/system-commands/facade.ts` lines 242-281
**Apply to:** facade dispatch for all system.file.* operations that go through Command Bus

```typescript
const commandId = buildSystemCommandId({
  commandType: "system.file.upload",
  correlationId,
});
const dedupeKey = buildSystemCommandDedupeKey({
  commandType: "system.file.upload",
  schoolId,
  pluginId: projectionRow.pluginId,
  configKey: fileId,  // or sha256 for upload
});

const envelope = {
  id: commandId,
  type: "system.file.upload" as const,
  actor: { actorId: input.actorId, actorScope: "plugin" as const },
  scope: { schoolId, pluginId: projectionRow.pluginId },
  payload: { fileId, sha256, fileName, mimeType, size, diskPath },
  correlation: { correlationId, causationId: null, producer: "dispatchSystemCommand" },
  audit: { delegatedActor: null, approval: null },
  dedupeKey,
};

const result = await dispatchPlatformCommand(envelope, {
  definitions: platformCommandRegistry,
  store: systemCommandStore,
  publicationPort: defaultInProcessPlatformEventAdapter,
});
```

### Audit-Before-Throw (applies to all handler authorize deny paths)

**Source:** `src/features/system-commands/handler.ts` lines 868-924 (`denySystemConfig` + `writeSystemCommandAudit`)
**Apply to:** handler.ts all deny paths for system.file operations

Pattern: always call `writeSystemCommandAudit` with `decision: "denied"` BEFORE throwing `PlatformCommandExecutionError`.

### Append-Only isLatest (applies to system.file.delete)

**Source:** `src/features/platform-core/commands/handlers/plugin-data.ts` lines 150-210 (upsert transaction pattern)
**Apply to:** handler.ts systemFileDeleteExecute

```typescript
await db.transaction(async (tx) => {
  // 1. Update isLatest=false on current row
  await tx
    .update(pluginFiles)
    .set({ isLatest: false })
    .where(and(eq(pluginFiles.id, fileId), eq(pluginFiles.isLatest, true)));
  
  // 2. Insert new delete row with isLatest=true
  await tx.insert(pluginFiles).values({
    id: crypto.randomUUID(),
    schoolId, pluginId,
    operation: "delete",
    sha256: null,
    fileName: previousRow.fileName,
    mimeType: null,
    diskPath: null,
    sizeBytes: null,
    isLatest: true,
    previousRowId: fileId,
  });
  
  // 3. Write allowed audit in same transaction
  await writePluginDataAccessAudit({ tx, ... });
});
```

### Error Response Format (applies to all API Routes)

**Source:** `src/app/api/classroom/[sessionId]/snapshot/route.ts` lines 15-45
**Apply to:** all system/file API routes

```typescript
return Response.json(
  { error: "ERROR_CODE", message: "用户可读消息" },
  { status: 403, headers: { "Cache-Control": "no-store" } }
);
```

For quota errors (D-12):
```typescript
return Response.json(
  { error: "QUOTA_EXCEEDED", usage: currentBytes, quota: maxBytes, exceeded: exceeded },
  { status: 507 }
);
```

### SchoolId Injection (applies to all operations)

**Source:** `src/features/system-commands/facade.ts` line 169 (T-79-04 invariant)
**Apply to:** all system.file operations — schoolId NEVER comes from payload

The `schoolId` is derived from `assertActionExecutable` which extracts it from the authenticated session. The facade never accepts `schoolId` as an input parameter. All DAL queries and file system paths use this schoolId.

---

## No Analog Found

All 19 files have strong or good analogs in the existing codebase. There are no files with no analog.

Files with only partial/role-match analogs:
- `src/lib/file-storage/quota-check.ts` — novel Node.js `Transform` stream pattern, but the multi-layer guard pattern from `ssrf-guard.ts` provides the architectural approach
- `src/lib/file-storage/mime-fallback.ts` — trivial key-value lookup, no complex analog needed
- `src/lib/file-storage/storage-path.ts` — simple path builder, no complex analog needed
- `src/scripts/gc-files.ts` — standalone script pattern matches other scripts in `scripts/`

---

## Metadata

**Analog search scope:** `src/features/system-commands/`, `src/features/platform-core/commands/`, `src/features/runtime-platform/contracts/`, `src/lib/dal/`, `src/lib/dto/`, `src/db/`, `src/app/api/`, `scripts/`
**Files scanned:** ~25 files
**Pattern extraction date:** 2026-06-13
