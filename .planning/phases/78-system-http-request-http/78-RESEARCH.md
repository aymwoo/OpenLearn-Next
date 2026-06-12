# Phase 78: system.http.request HTTP 代理 - Research

**Researched:** 2026-06-12
**Domain:** Secure HTTP proxy with SSRF protection, manifest-based domain/method whitelisting, governance audit integration
**Confidence:** HIGH

## Summary

Phase 78 implements the `system.http.request` handler -- the first system command that allows plugins to make outbound HTTPS requests through a governed proxy. The handler replaces the current stub in `platformCommandRegistry` (registry.ts:155-160) with real `authorize` and `execute` functions.

The implementation follows a multi-layered defense model: (1) HTTPS-only enforcement before DNS resolution, (2) runtime manifest whitelist re-parsing from `pluginRegistrations.manifestJson` on every `authorize()` call, (3) strict subdomain wildcard + method matching, (4) DNS pinning via undici `Agent.connect.lookup` to eliminate TOCTOU windows, (5) comprehensive IP validation covering IPv4 private ranges, IPv6 private ranges, IPv4-mapped IPv6, and decimal-encoded IP bypass, (6) manual redirect chain re-validation (max 5 hops), (7) response body size hard truncation at 5MB, (8) governance audit on every call.

All SSRF defenses are implemented in `ssrf-guard.ts` with zero external dependencies -- using only Node.js built-in `node:dns`, `node:net`, and undici `Agent`. Governance audit records use the existing `governanceAudits` table with the 4 new reason codes added in Phase 77.

**Primary recommendation:** Create `src/features/system-commands/` with three modules (handler.ts, ssrf-guard.ts, audit.ts). Import undici `Agent` as a direct dependency. Wire handler into `platformCommandRegistry` replacing inline stubs. IP validation must handle decimal/hex/octal IP notation, IPv4-mapped IPv6, and bare IPv6 loopback before DNS resolution.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Manifest whitelist validation | API / Backend | -- | `authorize()` reads `pluginRegistrations.manifestJson` from DB, parses with Zod, matches domain+method |
| HTTPS-only enforcement | API / Backend | -- | `ssrf-guard.ts` checks URL protocol before any network I/O |
| DNS resolution + SSRF IP check | API / Backend | -- | undici `Agent.connect.lookup` callback performs resolve + validate + pin atomically |
| HTTP proxy execution | API / Backend | -- | `execute()` uses native `fetch` with pinned undici Agent as dispatcher |
| Response body size truncation | API / Backend | -- | Stream accumulation with byte counter; destroy stream at 5MB |
| Redirect chain re-validation | API / Backend | -- | Manual loop with `redirect: "manual"`, re-validates each hop |
| Governance audit writing | Database / Storage | -- | Direct insert into `governanceAudits` table via Drizzle |

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SYS-01 | 插件可通过 `system.http.request` 经白名单域名+方法代理 HTTP 调用 | Sections below cover manifest matching, SSRF guard pattern, HTTPS-only enforcement, response size limit, audit integration |

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** New feature directory `src/features/system-commands/` (sibling to `platform-core`)
- **D-02:** Three-module split: `handler.ts` (authorize + execute), `ssrf-guard.ts` (DNS pinning + IP detection + HTTPS-only), `audit.ts` (governance audit helper)
- **D-03:** Export pattern: `handler.ts` exports `{ "system.http.request": { authorize, execute } }` object
- **D-04:** `authorize()` queries `pluginRegistrations.manifestJson` per call, parses with `PluginManifestSchema`, extracts `systemCommands`, matches `system.http.request` entries
- **D-05:** First-match-wins: iterate manifest entries, first domain+method match passes (short-circuit)
- **D-06:** Wildcard matching: `*.example.com` matches `api.example.com` but NOT `a.b.example.com` nor bare `example.com`
- **D-07:** New `writeSystemCommandAudit()` helper in `audit.ts`, writes to `governanceAudits` table
- **D-08:** Audit fields: `action` = `system.http.request`, `decision` = `allowed`|`denied`, `reasonCode`, `actorId`, `schoolId`, `pluginId`, `payloadJson` with `{ url, method, domain }`
- **D-09:** DNS pinning via undici Agent `connect.lookup` callback only -- single DNS resolution + IP detection + pin
- **D-10:** Manual redirect loop: `maxRedirections: 0`, handle 3xx responses, re-validate domain+SSRF+HTTPS per hop, max 5 hops
- **D-11:** New undici `Agent` instance per `execute()` call (not shared)
- **D-12:** HTTPS-only enforced in `ssrf-guard.ts` before DNS resolution
- **D-13:** Response body size 5MB hard truncation at undici response stream level

### Claude's Discretion

- Request/response header whitelist (security vs. utility balance)
- Whether timeout and size can be overridden per-request from manifest defaults
- IP detection implementation details in `ssrf-guard.ts`

### Deferred Ideas (OUT OF SCOPE)

None.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| undici `Agent` | 7.x (project dependency) | HTTP dispatcher with `connect.lookup` DNS interception | Only way to intercept DNS resolution in native `fetch`; zero-additional-dependency SSRF defense [VERIFIED: npm registry] |
| `node:dns` (promises) | Node.js 24 built-in | DNS resolution (`resolve4`, `resolve6`) | Built-in, no dependency; used in `connect.lookup` callback to resolve hostname [CITED: nodejs.org/api/dns.html] |
| `node:net` | Node.js 24 built-in | `isIP()` for IP family detection | Built-in; critical for bracket-stripping before IPv6 validation [CITED: nodejs.org/api/net.html] |
| Zod 4.x | Project existing | Schema validation for manifest re-parsing | Already used; `PluginManifestSchema.parse()` and `SystemCommandDiscriminatedSchema` already defined [CITED: project source] |
| Drizzle ORM | Project existing | Database access for `pluginRegistrations` query + `governanceAudits` insert | Already used; existing `governanceAudits` table schema ready [CITED: project source] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `WHATWG URL` (global) | Node.js 24 built-in | URL parsing, protocol extraction, hostname normalization | Standardize URL before all checks; catches scheme smuggling [CITED: nodejs.org/api/url.html] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| undici `Agent.connect.lookup` | `ssrf-guard` npm package | ssrf-guard requires Node >= 24 and wraps the same undici API. Adds dependency for minimal abstraction gain. D-09 explicitly chose `connect.lookup`-only |
| undici `Agent.connect.lookup` | Undici `interceptors.dns` | Newer API (v7+) but `connect.lookup` callback is battle-tested across Node 20-24. Callback approach chosen for maximum compatibility [CITED: github.com/nodejs/undici/discussions/3721] |
| Manual redirect loop | `maxRedirections: 5` with auto-follow | Auto-follow skips per-hop SSRF re-validation -- violates D-10 safety requirement |

**Installation:**
```bash
pnpm add undici  # Add as direct dependency (currently transitive via vitest/jsdom)
```

**Version verification:** undici exists on npm registry (latest: 8.4.1), no suspicious postinstall scripts, official repo: `github.com/nodejs/undici`. Project currently has 7.27.2 as transitive dependency.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| undici | npm | ~7 yrs | >500M/wk | github.com/nodejs/undici | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
Plugin Code (sandboxed)
  │
  │ system.http.request({url, method, headers?, body?, maxResponseSize?, timeout?})
  ▼
dispatchPlatformCommand (bus.ts:241)
  │ validate → resolveDedupe → persist → ▼
  │
  ▼
platformCommandRegistry["system.http.request"]
  │
  ├─► authorize({command}) ─────────────────────────────────────┐
  │   │                                                           │
  │   │ 1. Extract scope.pluginId + payload                       │
  │   │ 2. Query pluginRegistrations WHERE id = scope.pluginId    │
  │   │    AND schoolId = scope.schoolId                          │
  │   │ 3. PluginManifestSchema.parse(row.manifestJson)           │
  │   │ 4. Find systemCommands entries with                       │
  │   │    command === "system.http.request"                      │
  │   │ 5. Match url domain against each entry's allowedDomains   │
  │   │    (strict subdomain wildcard: *.example.com)             │
  │   │ 6. Match method against entry's allowedMethods            │
  │   │ 7. First match wins (short-circuit)                       │
  │   │ 8. No match → writeSystemCommandAudit(denied,             │
  │   │    domain_not_allowed|method_not_allowed) → throw         │
  │   │                                                           │
  │   └─► PASS: returns void                                      │
  │                                                               │
  └─► execute({command, attemptNumber}) ─────────────────────────┐
      │                                                            │
      │ 1. ssrf-guard: enforce HTTPS-only (reject http://)        │
      │ 2. Parse URL → extract hostname                           │
      │ 3. Pre-flight IP check: is hostname a raw IP?             │
      │    - Strip brackets from [::1]-style IPv6                 │
      │    - net.isIP() to detect dotted quad                     │
      │    - Check decimal/hex IP encoding (2130706433 →          │
      │      127.0.0.1 via WHATWG normalization)                  │
      │    - If IP → validate against private ranges directly     │
      │ 4. Create undici Agent with connect.lookup callback:      │
      │    a. dns.resolve4/resolve6 hostname                      │
      │    b. For each resolved address:                          │
      │       - IPv4: CIDR match against private ranges           │
      │       - IPv6: check loopback (::1), ULA (fc00::/7),      │
      │         link-local (fe80::/10), IPv4-mapped (::ffff:)     │
      │    c. Any private IP → callback(Error, null, 0)           │
      │    d. All clear → callback(null, addr, family) → PIN      │
      │ 5. fetch(url, {                                           │
      │      dispatcher: agent,                                    │
      │      redirect: 'manual',   // no auto-follow              │
      │      method, headers, body,                                │
      │      signal: AbortSignal.timeout(timeout)                  │
      │    })                                                      │
      │ 6. Check response.status:                                 │
      │    - 2xx → accumulate body (5MB limit) → return success   │
      │    - 3xx → extract Location header → validate as new URL  │
      │            → goto step 1 (max 5 redirects)                │
      │    - 4xx/5xx → return status + body (still audit)         │
      │ 7. Body accumulation:                                     │
      │    - Stream response.body with for-await                   │
      │    - Accumulate chunks, enforce byte counter               │
      │    - At 5MB: response.body.destroy(), return error         │
      │ 8. writeSystemCommandAudit(allowed, payload)               │
      │ 9. Return PlatformCommandExecutionResult                   │
      │                                                            │
      └─► Result: { resultSummary: { status, body, headers } }    │
```

### Recommended Project Structure

```
src/features/system-commands/
├── handler.ts          # authorize + execute for system.http.request
├── ssrf-guard.ts       # DNS pinning, IP validation, HTTPS-only enforcement
├── audit.ts            # writeSystemCommandAudit() governance audit helper
└── handler.test.ts     # Unit tests (Phase 78 scope)
```

### Pattern 1: Handler Authorize/Execute Split

**What:** `authorize` performs manifest whitelist validation (read-only, no side effects). `execute` performs the actual HTTP request with SSRF protection.

**When to use:** Both functions are called by `dispatchPlatformCommand` in sequence: `authorize` first (throws on deny), then `execute` (writes audit on success/failure).

**Example:**
```typescript
// handler.ts
import "server-only";

export const systemHttpRequestHandler = {
  "system.http.request": {
    authorize: async ({ command }: { command: PlatformCommand }) => {
      // Re-parse manifest, match domain+method, throw on denial
    },
    execute: async ({ command, attemptNumber }: {
      command: PlatformCommand;
      attemptNumber: number;
    }): Promise<PlatformCommandExecutionResult> => {
      // HTTPS-only check, DNS pinning, fetch, body truncation, audit
    },
  },
};
```

### Pattern 2: SSRF Guard -- Pre-Flight IP Check

**What:** Before DNS resolution, check if the hostname IS already an IP address (including decimal/hex/octal encoded forms). The WHATWG URL parser normalizes `http://2130706433/` to hostname `127.0.0.1` [VERIFIED: Node.js 24 runtime test]. For IPv6 literals, strip brackets before `net.isIP()`.

**When to use:** Called at the start of `execute()` before creating the undici Agent.

```typescript
// ssrf-guard.ts
import { isIP } from "node:net";

function isHostnameRawIP(hostname: string): boolean {
  // Strip brackets from IPv6 literals like "[::1]"
  const stripped = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;
  return isIP(stripped) !== 0;
}

// IP range check using integer comparison
const PRIVATE_IPV4_RANGES = [
  { start: 0x00000000, end: 0x00FFFFFF, label: "0.0.0.0/8" },
  { start: 0x0A000000, end: 0x0AFFFFFF, label: "10.0.0.0/8" },
  { start: 0x7F000000, end: 0x7FFFFFFF, label: "127.0.0.0/8" },
  { start: 0xA9FE0000, end: 0xA9FEFFFF, label: "169.254.0.0/16" },
  { start: 0xAC100000, end: 0xAC1FFFFF, label: "172.16.0.0/12" },
  { start: 0xC0A80000, end: 0xC0A8FFFF, label: "192.168.0.0/16" },
  { start: 0x64400000, end: 0x647FFFFF, label: "100.64.0.0/10" }, // CGNAT RFC 6598
] as const;
```

### Pattern 3: DNS Pinning via undici Agent connect.lookup

**What:** The `connect.lookup` callback receives `(hostname, options, callback)`. The callback signature is `(err, address, family)`. DNS resolution + IP validation + pinning happen in a single call chain -- no second DNS resolution window exists. [CITED: github.com/nodejs/undici/discussions/3721]

**When to use:** Every `execute()` call creates a new Agent instance.

```typescript
// ssrf-guard.ts
import { Agent } from "undici";
import { promises as dns } from "node:dns";

function createPinnedAgent(hostname: string): Agent {
  return new Agent({
    connect: {
      lookup(_hostname, _options, callback) {
        dns.resolve4(hostname)
          .then((addresses) => {
            if (addresses.length === 0) {
              return callback(new Error("SSRF_DNS_NO_ADDRESS"), null, 0);
            }
            for (const addr of addresses) {
              if (isPrivateIPv4(addr)) {
                return callback(
                  new Error("SSRF_PRIVATE_IP_BLOCKED"),
                  null,
                  0
                );
              }
            }
            // Pin to the first validated address
            callback(null, addresses[0], 4);
          })
          .catch((err) => callback(err, null, 0));
      },
    },
  });
}
```

### Pattern 4: Manual Redirect Loop

**What:** Set `redirect: "manual"` in fetch options. When response status is 3xx, extract the `Location` header, parse it as a new URL, and re-run the full validation chain.

**When to use:** After each fetch response, before processing the body.

```typescript
// handler.ts (inside execute)
const MAX_REDIRECTS = 5;

async function executeRequest(
  url: string,
  method: string,
  headers: Record<string, string> | undefined,
  body: string | undefined,
  timeout: number,
  manifestEntry: SystemCommandHttpRequest,
  redirectCount: number = 0,
): Promise<{ status: number; body: string; headers: Record<string, string> }> {
  if (redirectCount > MAX_REDIRECTS) {
    throw redirectDeniedError(); // audit: redirect_denied
  }

  // Full validation chain for this URL
  validateHttpsOnly(url);
  const hostname = new URL(url).hostname;
  const agent = createPinnedAgent(hostname); // re-validate SSRF

  const response = await fetch(url, {
    dispatcher: agent,
    redirect: "manual",
    method,
    headers,
    body,
    signal: AbortSignal.timeout(timeout),
  });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) throw new Error("Redirect without Location header");
    const nextUrl = new URL(location, url).href; // resolve relative
    return executeRequest(nextUrl, "GET", undefined, undefined, timeout, manifestEntry, redirectCount + 1);
  }

  // Accumulate body with 5MB limit
  const bodyText = await accumulateBody(response.body, 5 * 1024 * 1024);
  // ... return success
}
```

### Pattern 5: Response Body Accumulation with Size Limit

**What:** Stream the response body using `for-await` on the undici `BodyReadable`, accumulating chunks and enforcing a byte limit. At the limit, destroy the stream and throw. [CITED: deepwiki.com/nodejs/undici/3.3-body-processing]

```typescript
async function accumulateBody(
  bodyStream: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<string> {
  if (!bodyStream) return "";

  const reader = bodyStream.getReader();
  const chunks: Uint8Array[] = [];
  let bytesRead = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > maxBytes) {
        await reader.cancel("RESPONSE_SIZE_EXCEEDED");
        throw new Error("Response body exceeds 5MB limit");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  // Concatenate chunks and decode
  const total = new Uint8Array(bytesRead);
  let offset = 0;
  for (const chunk of chunks) {
    total.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(total);
}
```

### Anti-Patterns to Avoid

- **DNS resolve before IP check then trust OS resolver for connection:** Creates TOCTOU window (CVE-2026-41272). Always pin in `connect.lookup`.
- **String-based hostname matching for IP detection:** Fails on decimal/hex/octal encoding. Always use `net.isIP()` after bracket stripping and check WHATWG-normalized values.
- **`redirect: "follow"`:** Skips per-hop SSRF re-validation. Always use `redirect: "manual"`.
- **Global shared Agent:** D-11 explicitly requires per-request Agent for isolation.
- **Skipping audit on deny:** Every rejection path must call `writeSystemCommandAudit` before throwing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DNS resolution for HTTP | Custom `dns.lookup` + `http.Agent` | undici `Agent.connect.lookup` | undici Agent integrates with Node.js native `fetch`; custom `http.Agent` is incompatible |
| Private IP detection (IPv4) | Regex-based hostname matching | Integer range comparison after DNS resolve | Decimal/hex/octal-encoded IPs bypass regex; integer comparison is deterministic |
| Private IP detection (IPv6) | String prefix matching | `net.isIP()` after bracket strip, then prefix check | `::ffff:127.0.0.1` requires extracting mapped IPv4; `[::1]` needs bracket strip before `net.isIP()` |
| Response body truncation | Check `Content-Length` header only | Stream accumulation with byte counter | Chunked transfer encoding has no Content-Length; Kong Response Size Limiting plugin was bypassed this way [CITED: .planning/research/STACK.md] |
| Redirect following | Built-in `redirect: "follow"` | Manual loop with per-hop re-validation | Auto-follow skips SSRF re-validation on redirect targets |
| IP range matching | Manual bitwise operations per range | Pre-computed integer range lookup table | Performance irrelevant for single-request use; table is clearer and less error-prone |

**Key insight:** The entire SSRF defense layer (DNS pinning, IP validation, HTTPS enforcement) uses zero external dependencies -- only Node.js built-in modules (`node:dns`, `node:net`, undici `Agent`). The complexity is NOT in the libraries but in covering all edge cases (IPv4-mapped IPv6, decimal IP encoding, bracket-stripped IPv6, redirect chain re-validation).

## Common Pitfalls

### Pitfall 1: IPv6 Bracket Bypass

**What goes wrong:** `URL.hostname` for `https://[::1]/` returns `[::1]` (with brackets). `net.isIP("[::1]")` returns `0` (not an IP) -- IP check never triggers, allowing SSRF to IPv6 loopback. [VERIFIED: Node.js 24 runtime test]

**Why it happens:** WHATWG URL spec preserves brackets for IPv6 in `hostname` property, but `net.isIP()` expects bracketless notation.

**How to avoid:** Strip brackets before `net.isIP()`: `hostname.replace(/^\[|\]$/g, "")`.

**Warning signs:** Pass-through of `[::1]` or `[::ffff:127.0.0.1]` without rejection.

### Pitfall 2: Decimal IP Encoding Bypass

**What goes wrong:** `http://2130706433/` is a valid URL. WHATWG parser normalizes hostname to `127.0.0.1`. If IP detection is a simple regex match on the original URL string, the decimal form bypasses it. [CITED: CVE-2026-43929, .planning/research/PITFALLS.md]

**Why it happens:** WHATWG URL parser normalizes decimal/hex/octal IP representations to dotted quad before making hostname available.

**How to avoid:** Always run IP detection on the normalized `new URL(url).hostname`, not the raw URL string. `net.isIP("127.0.0.1")` correctly returns `4`.

**Warning signs:** `http://2130706433/` accepted without rejection.

### Pitfall 3: IPv4-Mapped IPv6 Bypass

**What goes wrong:** `::ffff:127.0.0.1` is an IPv6 address that maps to an IPv4 address. Pure IPv6 range checks won't catch it as loopback.

**Why it happens:** The IPv4 is embedded in the last 32 bits of the IPv6 address. Checking only IPv6 private ranges (fc00::/7, fe80::/10) misses it.

**How to avoid:** Check for `::ffff:` prefix, extract the IPv4 part, validate against IPv4 private ranges.

**Warning signs:** `http://[::ffff:127.0.0.1]/` accepted.

### Pitfall 4: Redirect Chain Re-Validation Gap

**What goes wrong:** Initial URL passes all checks, but the 302 redirect points to `http://127.0.0.1/` or `http://169.254.169.254/latest/meta-data/`. If auto-follow is enabled, the redirect target is NOT re-validated.

**Why it happens:** D-10 explicitly prevents this with `redirect: "manual"`, but the implementation must ensure every 3xx is extracted, parsed, and fully re-validated before the next fetch.

**How to avoid:** Manual redirect loop. Each iteration: parse Location, enforce HTTPS, re-validate domain against manifest (the redirect target domain must also be in allowedDomains), re-run SSRF DNS pinning on the new hostname.

**Warning signs:** Initial request to `https://allowed.example.com` → 302 to `http://127.0.0.1/` → request succeeds.

### Pitfall 5: Audit-Before-Throw Ordering

**What goes wrong:** Denial path throws `PlatformCommandExecutionError` before writing the audit record. The bus's catch block handles the error but no audit trail exists for the denial.

**Why it happens:** Natural code flow puts `throw` last, but audit must precede throw.

**How to avoid:** Every denial path follows: `await writeSystemCommandAudit({ decision: "denied", reasonCode, ... })` → then `throw new PlatformCommandExecutionError(...)`.

**Warning signs:** Denial reason codes exist in `GovernanceDeniedReasonValues` but corresponding audit records are missing from `governanceAudits` table.

## Code Examples

Verified patterns from official sources:

### DNS Pinning Agent Creation

```typescript
// Source: github.com/nodejs/undici/discussions/3721 + STACK.md research
// Verified: Node.js 24 runtime behavior confirmed
import { Agent } from "undici";
import { promises as dns } from "node:dns";
import { isIP } from "node:net";

/**
 * Resolves hostname and validates all returned addresses against
 * private/loopback/link-local IP ranges. Pins the first valid
 * address to prevent DNS rebinding TOCTOU.
 */
export async function createSsrfSafeDispatcher(hostname: string): Promise<Agent> {
  // Pre-flight: if hostname is already an IP, validate directly
  const strippedHostname = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;

  if (isIP(strippedHostname)) {
    validateIP(strippedHostname); // throws if private
    // IP is safe -- create Agent that pins to it directly
    return new Agent({
      connect: {
        lookup(_h, _o, callback) {
          callback(null, strippedHostname, isIP(strippedHostname) === 6 ? 6 : 4);
        },
      },
    });
  }

  // DNS resolution + validation + pinning atomically
  return new Agent({
    connect: {
      lookup(_h, _o, callback) {
        dns.resolve4(hostname)
          .then((addresses) => {
            if (addresses.length === 0) {
              return callback(
                new Error("SSRF_DNS_NO_ADDRESS"),
                null,
                0
              );
            }
            for (const addr of addresses) {
              validateIP(addr); // throws if private, caught below
            }
            callback(null, addresses[0], 4);
          })
          .catch((err) => callback(err, null, 0));
        // Note: also resolve6 for IPv6 support
      },
    },
    bodyTimeout: 30_000,
    headersTimeout: 10_000,
  });
}
```

### Private IP Range Validation (IPv4)

```typescript
// Source: RFC 1918, RFC 6598, RFC 6890, RFC 5735
// Verified: Node.js net.isIP() + integer comparison correctness
import { isIP } from "node:net";

const PRIVATE_IPV4_RANGES: ReadonlyArray<{
  readonly start: number;
  readonly end: number;
  readonly label: string;
}> = [
  { start: 0x00000000, end: 0x00FFFFFF, label: "0.0.0.0/8" },       // Current network
  { start: 0x0A000000, end: 0x0AFFFFFF, label: "10.0.0.0/8" },       // RFC 1918
  { start: 0x7F000000, end: 0x7FFFFFFF, label: "127.0.0.0/8" },      // Loopback
  { start: 0xA9FE0000, end: 0xA9FEFFFF, label: "169.254.0.0/16" },   // Link-local
  { start: 0xAC100000, end: 0xAC1FFFFF, label: "172.16.0.0/12" },    // RFC 1918
  { start: 0xC0A80000, end: 0xC0A8FFFF, label: "192.168.0.0/16" },   // RFC 1918
  { start: 0x64400000, end: 0x647FFFFF, label: "100.64.0.0/10" },    // CGNAT RFC 6598
];

function ip4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

export function isPrivateIPv4(ip: string): boolean {
  if (isIP(ip) !== 4) return false;
  const num = ip4ToInt(ip);
  return PRIVATE_IPV4_RANGES.some((range) => num >= range.start && num <= range.end);
}
```

### Governance Audit Helper

```typescript
// Source: plugin-data-access/audit.ts (reference pattern)
// Pattern: writePluginDataAccessAudit -- same table, different action/fields
import { db } from "@/db";
import { governanceAudits } from "@/db/schema";

type SystemCommandAuditInput = {
  pluginId: string | null;
  schoolId: string;
  commandId: string | null;
  actorId: string;
  correlationId: string;
  decision: "allowed" | "denied";
  reasonCode?: string | null;
  payloadJson: Record<string, unknown>;
};

export async function writeSystemCommandAudit(input: SystemCommandAuditInput) {
  await db.insert(governanceAudits).values({
    targetType: "plugin",
    targetId: input.pluginId ?? "",
    pluginId: input.pluginId,
    schoolId: input.schoolId,
    commandId: input.commandId,
    action: "system.http.request",
    decision: input.decision,
    reasonCode: input.reasonCode ?? null,
    actorId: input.actorId,
    actorScope: "plugin",
    lifecycleState: "ready", // plugin must be in 'ready' state for system commands
    killSwitchEnabled: false,
    requestedCapabilitiesJson: [],
    grantedCapabilitiesJson: [],
    requiredPermission: null,
    correlationId: input.correlationId,
    payloadJson: input.payloadJson,
  });
}
```

### PlatformCommandExecutionError Throw Pattern

```typescript
// Source: handlers/plugins.ts:175-198 (throwCommandFailure pattern)
// Source: handlers/quiz-answer-received.ts:75-92
import { PlatformCommandExecutionError } from "@/features/platform-core/commands/contracts";

function throwSystemCommandFailure(input: {
  commandType: string;
  pluginId: string;
  message: string;
  reasonCode: string;
}): never {
  throw new PlatformCommandExecutionError({
    message: input.message,
    failureAttribution: {
      scope: "plugin" as const,
      pluginId: input.pluginId,
      reasonCode: input.reasonCode,
      recommendedRecoveryAction: "contact_plugin_developer",
    },
    failureEvent: {
      eventType: "platform.command.failed",
      category: "outcome" as const,
      aggregateType: "plugin",
      aggregateId: input.pluginId,
      payload: {
        commandType: input.commandType,
        reasonCode: input.reasonCode,
        failureAttribution: {
          scope: "plugin" as const,
          pluginId: input.pluginId,
          reasonCode: input.reasonCode,
          recommendedRecoveryAction: "contact_plugin_developer",
        },
      },
      audit: null,
    },
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `http.Agent` for DNS interception (node-fetch ecosystem) | undici `Agent.connect.lookup` for native `fetch` | Node.js 18+ (native fetch) | `http.Agent` is incompatible with native `fetch`; undici is the only interception point |
| Regex-based hostname matching for SSRF | DNS resolve → IP validate → pin connection | CVE-2026-41272 / CVE-2026-43929 | Regex bypasses (decimal IP, IPv6 brackets, IPv4-mapped IPv6) are fully mitigated |
| `redirect: "follow"` with trust in initial validation | `redirect: "manual"` with per-hop re-validation | D-10 design decision | Each redirect target undergoes full manifest + SSRF re-validation |

**Deprecated/outdated:**
- `http.Agent` for SSRF protection: incompatible with Node.js native `fetch`. Use undici `Agent` only.
- Regex-based `hostname.match(/^127\./)` checks: bypassed by decimal/hex encoding. Always resolve DNS and validate resolved IPs.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | v24.1.0 | -- |
| undici (bundled) | `globalThis.fetch` | Yes | 7.8.0 (bundled) | -- |
| undici (package) | `Agent` import | Transitive (7.27.2) | 7.27.2 via vitest/jsdom | Add as direct dependency with `pnpm add undici` |
| `node:dns` | DNS resolution | Yes | Built-in | -- |
| `node:net` | `isIP()` | Yes | Built-in | -- |
| pnpm | Package management | Yes | 11.5.2 | -- |
| Drizzle ORM | DB access | Yes | Project existing | -- |
| `governanceAudits` table | Audit writes | Yes | Exists in schema | -- |
| `pluginRegistrations` table | Manifest read | Yes | Exists in schema | -- |

**Missing dependencies with no fallback:**
- undici as direct dependency -- must be added with `pnpm add undici`

**Missing dependencies with fallback:**
- None -- all other dependencies are either built-in or already present

## Sources

### Primary (HIGH confidence)
- Project source code (direct read):
  - `src/features/platform-core/commands/registry.ts` -- stub handlers at lines 151-161
  - `src/features/platform-core/commands/contracts.ts` -- `SystemHttpRequestPayloadSchema` (237-244), `PlatformCommandExecutionResult` (378), `PlatformCommandExecutionError` (411), `SystemCommandTypes` (39)
  - `src/features/platform-core/commands/bus.ts` -- `dispatchPlatformCommand` pipeline (241): validate → authorize → execute → persist events
  - `src/features/platform-core/commands/handlers/plugin-data.ts` -- authorize/execute split pattern, `writePluginDataAccessAudit` reference
  - `src/features/platform-core/commands/handlers/quiz-answer-received.ts` -- simple handler pattern, error throw pattern
  - `src/features/platform-core/commands/handlers/plugins.ts` -- `throwCommandFailure` pattern (175-198)
  - `src/lib/dal/plugins.ts` -- `toPluginDTO` uses `PluginManifestSchema.parse(record.manifestJson)` (377-378), `pluginRegistrations` queries (691, 776, 985)
  - `src/db/schema.ts` -- `governanceAudits` table (1325-1352), `pluginRegistrations` table (1241-1265)
  - `src/lib/dto/resource-ai.ts` -- `SystemCommandHttpRequestSchema` (801-818), `SystemCommandDiscriminatedSchema` (845-852), `PluginManifestSchema` with `systemCommands` (854-876), `DOMAIN_PATTERN` (781-782), `SYSTEM_HTTP_METHODS` (773)
  - `src/features/runtime-platform/contracts/permissions.ts` -- `GovernanceDeniedReasonValues` with 4 new reason codes (32-44)
  - `src/features/platform-core/events/contracts.ts` -- `PlatformFailureAttributionSchema` (33-38)
- `.planning/research/STACK.md` -- DNS pinning pattern with undici Agent, private IP range table (99-107), zero-dependency SSRF defense strategy
- `.planning/research/PITFALLS.md` -- SSRF bypass vectors (Pitfall 1), redirect chain re-validation (Pitfall 1.5), audit ordering (Pitfall 4)
- `.planning/research/FEATURES.md` -- `system.http.request` table stakes definition (36-45)
- `.planning/phases/78-system-http-request-http/78-CONTEXT.md` -- all locked decisions D-01 through D-13

### Secondary (MEDIUM confidence)
- [Node.js undici Discussion #3721](https://github.com/nodejs/undici/discussions/3721) -- Agent `connect.lookup` chaining pattern, DNS interceptor availability
- [CVE-2026-41272](https://github.com/advisories/GHSA-2x8m-83vc-6wv4) -- DNS rebinding TOCTOU vulnerability in Flowise, SSRF via DNS pinning gap
- [CVE-2026-43929](https://nvd.nist.gov/vuln/detail/CVE-2026-43929) -- ssrfcheck package bypass via WHATWG URL normalization of decimal IPs
- [deepwiki.com/nodejs/undici/3.3-body-processing](https://deepwiki.com/nodejs/undici/3.3-body-processing) -- BodyReadable stream API, manual chunk accumulation
- [Node.js fetch documentation](https://nodejs.org/en/learn/getting-started/fetch) -- redirect option values, `redirect: "manual"` behavior
- [Node.js 24 runtime tests] -- Confirmed: `net.isIP("[::1]")` = 0, `new URL("http://2130706433/").hostname` = "127.0.0.1", `dns.resolve4("127.0.0.1")` rejects with ENOTFOUND, `process.versions.undici` = 7.8.0

### Tertiary (LOW confidence)
- RFC 1918, RFC 6598, RFC 6890, RFC 5735, RFC 4193, RFC 4291 -- IP range definitions (verified against multiple secondary sources)
- `ssrf-guard` npm package README -- confirmed approach but not used (D-09 chose direct undici Agent)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `lifecycleState` in audit records should be the plugin's current lifecycle state from `pluginRegistrations` | Code Examples (audit.ts) | Audit record shows incorrect lifecycle state; querying from DB in `authorize()` adds cost |
| A2 | `actorScope` for system command audits is always `"plugin"` (same as plugin data access) | Code Examples (audit.ts) | May need `"system"` scope to distinguish system-initiated actions from plugin-initiated actions |
| A3 | `recommendedRecoveryAction` for SSRF/domain/method denials is `"contact_plugin_developer"` | Code Examples (error throw) | May need more specific recovery actions per denial type |
| A4 | Manifest `maxResponseSize` and `defaultTimeout` from `SystemCommandHttpRequestSchema` are used as defaults but can be overridden by per-request payload fields | Standard Stack | If manifest fields are mandatory ceilings (not defaults), the override logic changes |
| A5 | undici is added as direct dependency; the project does not rely on the transitive version from vitest/jsdom | Environment Availability | If the transitive version is removed or changed, build breaks |
| A6 | DNS resolution in `connect.lookup` only handles IPv4 (`resolve4`); IPv6 (`resolve6`) is an enhancement | SSRF Guard Pattern | IPv6-only hosts cannot be reached if only IPv4 is resolved |
| A7 | SchoolId and pluginId for manifest query and audit are taken from `command.scope` (envelope) | Code Examples | D-04 says `command.scope.pluginId`; if scope contains wrong pluginId, validation is bypassed |

## Open Questions (RESOLVED)

1. **Header whitelist content** — RESOLVED
   - Decision: Allow `Authorization`, `Content-Type`, `Accept`, `User-Agent`, and `X-*` (excluding reserved prefixes `X-Forwarded-*`, `X-Real-IP`). Block all others including `Host`, `Cookie`, `Proxy-Authorization`.

2. **Timeout and response size override behavior** — RESOLVED
   - Decision: Manifest values are CEILINGS. Payload can request lower values but cannot exceed manifest-declared limits.

3. **IPv6 DNS resolution support** — RESOLVED
   - Decision: Include both `resolve4` and `resolve6` in `connect.lookup`. IPv4-mapped IPv6 (`::ffff:`) is a bypass vector that must be covered.

4. **Response body encoding and content-type handling** — RESOLVED
   - Decision: Use `TextDecoder` with UTF-8. For non-UTF8 content types, decode as Latin-1 (lossless byte-to-char mapping). Binary content types (`image/*`, `application/octet-stream`) are rejected with a clear error code.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- undici Agent pattern verified against Node.js 24 runtime, official GitHub, and existing research
- Architecture: HIGH -- handler/ssrf-guard/audit split verified against D-01/D-02/D-03, existing handler patterns confirmed
- Pitfalls: HIGH -- all identified pitfalls trace to specific CVE patterns or confirmed Node.js runtime behavior
- IP range coverage: MEDIUM -- ranges from RFC standards, verified against PITFALLS.md; IPv6 ranges need implementation verification
- Redirect handling: HIGH -- `redirect: "manual"` confirmed working, maxRedirects=0 behavior verified

**Research date:** 2026-06-12
**Valid until:** 2026-07-12 (30 days; undici API is stable, Node.js 24 is current LTS)
