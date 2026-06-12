import "server-only";
import { z } from "zod";
import { db } from "@/db";
import { pluginRegistrations, pluginOwnedBusinessData } from "@/db/schema";
import { PluginManifestSchema } from "@/lib/dto/resource-ai";
import { eq, and, sql } from "drizzle-orm";
import {
  PlatformCommandExecutionError,
  type PlatformCommand,
  type PlatformCommandExecutionResult,
} from "@/features/platform-core/commands/contracts";
import { validateUrl, createPinnedAgent, MAX_REDIRECTS } from "./ssrf-guard";
import { writeSystemCommandAudit } from "./audit";
import type { SystemCommandHttpRequestSchema } from "@/lib/dto/resource-ai";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SystemHttpRequestCommand = Extract<PlatformCommand, { type: "system.http.request" }>;

/** Matched manifest entry for system.http.request — returned by authorize, consumed by execute for redirect re-validation. */
type MatchedHttpRequestEntry = {
  command: "system.http.request";
  allowedDomains: string[];
  allowedMethods: string[];
};

// ---------------------------------------------------------------------------
// Header allowlist filtering (RESEARCH.md Open Question #1 RESOLVED)
// ---------------------------------------------------------------------------

/** Explicitly allowed header names (lowercase). */
const ALLOWED_HEADER_NAMES = new Set([
  "authorization",
  "content-type",
  "accept",
  "user-agent",
]);

/** Reserved X-* prefixes that must be blocked even though they match the X-* pattern. */
const BLOCKED_X_HEADER_PREFIXES = ["x-forwarded-", "x-real-ip"];

/**
 * Filter headers against the allowlist.
 *
 * - ALLOW: Authorization, Content-Type, Accept, User-Agent, X-* (non-reserved)
 * - BLOCK: Host (set by undici), Cookie, Proxy-Authorization, X-Forwarded-*, X-Real-IP, and all others
 */
function filterHeaders(headers: Record<string, string>): Record<string, string> {
  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    // Block: Host (set by undici), Cookie, Proxy-Authorization
    if (lowerKey === "host" || lowerKey === "cookie" || lowerKey === "proxy-authorization") {
      continue;
    }
    // Block: reserved X-* prefixes
    if (BLOCKED_X_HEADER_PREFIXES.some((prefix) => lowerKey.startsWith(prefix))) {
      continue;
    }
    // Allow: explicit allowed headers OR X-* headers (non-reserved)
    if (ALLOWED_HEADER_NAMES.has(lowerKey) || lowerKey.startsWith("x-")) {
      filtered[key] = value;
    }
    // Everything else is silently dropped
  }
  return filtered;
}

// ---------------------------------------------------------------------------
// Domain matching (D-06)
// ---------------------------------------------------------------------------

/**
 * Match a manifest domain pattern against a hostname.
 *
 * D-06 rules:
 * - `*.example.com` matches `api.example.com` (exactly one subdomain level)
 * - `*.example.com` does NOT match `a.b.example.com` (multi-level)
 * - `*.example.com` does NOT match bare `example.com`
 * - Plain domain patterns use exact string match
 */
function matchDomain(pattern: string, hostname: string): boolean {
  if (pattern.startsWith("*.")) {
    const baseDomain = pattern.slice(2);
    if (hostname === baseDomain) return false; // D-06: wildcard does NOT match bare domain
    const suffix = `.${baseDomain}`;
    if (!hostname.endsWith(suffix)) return false;
    const prefix = hostname.slice(0, -suffix.length);
    // Strict single-level: no dots in prefix (D-06)
    return prefix.length > 0 && !prefix.includes(".");
  }
  return hostname === pattern;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function successResult(summary: Record<string, unknown>): PlatformCommandExecutionResult {
  return {
    resultSummary: summary,
    invalidation: { tags: [] },
    emittedEvents: [],
    failureEvent: null,
    failureAttribution: null,
  };
}

// ---------------------------------------------------------------------------
// authorize
// ---------------------------------------------------------------------------

/**
 * Validate the plugin's manifest whitelist against the request's url and method.
 *
 * D-04: Re-parses pluginRegistrations.manifestJson on every call.
 * D-05: First-match-wins across system.http.request entries.
 * D-06: Wildcard *.example.com matches api.example.com only (strict single-level).
 *
 * Returns the matched manifest entry so execute() can re-validate redirect targets.
 * Throws PlatformCommandExecutionError on deny — audit is written BEFORE throw.
 */
async function authorize({
  command,
}: {
  command: PlatformCommand;
}): Promise<MatchedHttpRequestEntry> {
  const sysCmd = command as SystemHttpRequestCommand;
  const payload = sysCmd.payload;
  const pluginId = command.scope.pluginId;
  const schoolId = command.scope.schoolId;

  // D-04: Query pluginRegistrations for manifestJson
  const row = await db.query.pluginRegistrations.findFirst({
    where: and(
      eq(pluginRegistrations.id, pluginId),
      eq(pluginRegistrations.schoolId, schoolId),
    ),
  });

  if (!row) {
    await writeSystemCommandAudit({
      pluginId,
      schoolId,
      commandId: command.id,
      actorId: command.actor.actorId,
      actorScope: command.actor.actorScope,
      lifecycleState: "ready",
      correlationId: command.correlation.correlationId,
      decision: "denied",
      reasonCode: "not_allowlisted",
      payloadJson: { url: payload.url, method: payload.method },
      commandType: "system.http.request" as const,
    });
    throw new PlatformCommandExecutionError({
      message: "Plugin registration not found",
      failureAttribution: {
        scope: "plugin",
        pluginId,
        reasonCode: "not_allowlisted",
        recommendedRecoveryAction: "install_plugin",
      },
      failureEvent: {
        eventType: "platform.command.failed",
        category: "outcome",
        aggregateType: "plugin",
        aggregateId: pluginId,
        payload: {
          commandType: "system.http.request",
          reasonCode: "not_allowlisted",
          failureAttribution: {
            scope: "plugin",
            pluginId,
            reasonCode: "not_allowlisted",
            recommendedRecoveryAction: "install_plugin",
          },
        },
        audit: command.audit,
      },
    });
  }

  // D-04: Parse manifest
  const manifest = PluginManifestSchema.parse(row.manifestJson);
  const systemCommands = manifest.systemCommands ?? [];
  const lifecycleState = row.lifecycleState ?? "ready";

  // Filter for system.http.request entries
  const httpEntries = systemCommands.filter(
    (entry): entry is typeof entry & { command: "system.http.request" } =>
      entry.command === "system.http.request",
  );

  if (httpEntries.length === 0) {
    await writeSystemCommandAudit({
      pluginId,
      schoolId,
      commandId: command.id,
      actorId: command.actor.actorId,
      actorScope: command.actor.actorScope,
      lifecycleState,
      correlationId: command.correlation.correlationId,
      decision: "denied",
      reasonCode: "not_allowlisted",
      payloadJson: { url: payload.url, method: payload.method },
      commandType: "system.http.request" as const,
    });
    throw new PlatformCommandExecutionError({
      message: "system.http.request not allowlisted in plugin manifest",
      failureAttribution: {
        scope: "plugin",
        pluginId,
        reasonCode: "not_allowlisted",
        recommendedRecoveryAction: "update_manifest",
      },
      failureEvent: {
        eventType: "platform.command.failed",
        category: "outcome",
        aggregateType: "plugin",
        aggregateId: pluginId,
        payload: {
          commandType: "system.http.request",
          reasonCode: "not_allowlisted",
          failureAttribution: {
            scope: "plugin",
            pluginId,
            reasonCode: "not_allowlisted",
            recommendedRecoveryAction: "update_manifest",
          },
        },
        audit: command.audit,
      },
    });
  }

  // Extract hostname from payload.url (D-12: HTTPS-only via validateUrl)
  const parsedUrl = validateUrl(payload.url);
  const hostname = parsedUrl.hostname;

  // D-05: First-match-wins — iterate entries, short-circuit on first match
  for (const entry of httpEntries) {
    // Check method
    if (!entry.allowedMethods.includes(payload.method as typeof entry.allowedMethods[number])) {
      continue; // Try next entry
    }

    // Check domain whitelist
    for (const pattern of entry.allowedDomains) {
      if (matchDomain(pattern, hostname)) {
        // MATCH FOUND — authorize passes
        return {
          command: "system.http.request" as const,
          allowedDomains: entry.allowedDomains,
          allowedMethods: entry.allowedMethods as string[],
        };
      }
    }
  }

  // No match found — domain_not_allowed (if method matched on any entry but domain didn't)
  // or method_not_allowed (if domain matched but method didn't)
  // Determine which reason code is more specific
  let reasonCode: string = "domain_not_allowed";
  // Check if any entry's allowedMethods includes the method — if so, it's a domain issue
  const methodMatchedAny = httpEntries.some((e) =>
    e.allowedMethods.includes(payload.method as typeof e.allowedMethods[number]),
  );

  if (!methodMatchedAny) {
    // Check if any entry's allowedDomains matches the hostname
    const domainMatchedAny = httpEntries.some((e) =>
      e.allowedDomains.some((p) => matchDomain(p, hostname)),
    );
    if (domainMatchedAny) {
      reasonCode = "method_not_allowed";
    }
  }

  await writeSystemCommandAudit({
    pluginId,
    schoolId,
    commandId: command.id,
    actorId: command.actor.actorId,
    actorScope: command.actor.actorScope,
    lifecycleState,
    correlationId: command.correlation.correlationId,
    decision: "denied",
    reasonCode,
    payloadJson: { url: payload.url, method: payload.method, domain: hostname },
    commandType: "system.http.request" as const,
  });

  throw new PlatformCommandExecutionError({
    message: `Denied: ${reasonCode}`,
    failureAttribution: {
      scope: "plugin",
      pluginId,
      reasonCode,
      recommendedRecoveryAction:
        reasonCode === "method_not_allowed"
          ? "update_manifest_allowed_methods"
          : "update_manifest_allowed_domains",
    },
    failureEvent: {
      eventType: "platform.command.failed",
      category: "outcome",
      aggregateType: "plugin",
      aggregateId: pluginId,
      payload: {
        commandType: "system.http.request",
        reasonCode,
        failureAttribution: {
          scope: "plugin",
          pluginId,
          reasonCode,
          recommendedRecoveryAction:
            reasonCode === "method_not_allowed"
              ? "update_manifest_allowed_methods"
              : "update_manifest_allowed_domains",
        },
      },
      audit: command.audit,
    },
  });
}

// ---------------------------------------------------------------------------
// execute
// ---------------------------------------------------------------------------

/**
 * Execute the system.http.request command: SSRF-safe HTTPS proxying with
 * manual redirect handling and per-hop manifest re-validation (D-10).
 *
 * Steps:
 * 0. Filter request/response headers through allowlist
 * 1. Validate URL (HTTPS-only)
 * 2. Resolve timeout and maxResponseSize
 * 3. Execute with redirect loop, per-hop manifest re-validation
 * 4. Handle 3xx redirects (manual)
 * 5. Accumulate response body with 5MB truncation
 * 6. Return success result or throw PlatformCommandExecutionError
 */
async function execute({
  command,
  attemptNumber: _attemptNumber,
}: {
  command: PlatformCommand;
  attemptNumber: number;
}): Promise<PlatformCommandExecutionResult> {
  const sysCmd = command as SystemHttpRequestCommand;
  const payload = sysCmd.payload;
  const pluginId = command.scope.pluginId;
  const schoolId = command.scope.schoolId;

  // Obtain matched entry for redirect re-validation
  const matchedEntry = await authorize({ command });

  // Query lifecycle state for audit
  const row = await db.query.pluginRegistrations.findFirst({
    where: and(
      eq(pluginRegistrations.id, pluginId),
      eq(pluginRegistrations.schoolId, schoolId),
    ),
  });
  const lifecycleState = row?.lifecycleState ?? "ready";

  // Step 2: Timeout and size limits
  const timeout = payload.timeout ?? 30000;
  const maxResponseSize = payload.maxResponseSize ?? 5 * 1024 * 1024;
  const effectiveMaxSize = Math.min(maxResponseSize, 5 * 1024 * 1024);

  // Step 3: Filter request headers
  const filteredRequestHeaders = payload.headers
    ? filterHeaders(payload.headers)
    : undefined;

  try {
    const result = await executeRequest(
      payload.url,
      payload.method,
      filteredRequestHeaders,
      payload.body,
      0,
      matchedEntry,
      command,
      timeout,
      effectiveMaxSize,
    );

    // Success — write audit
    await writeSystemCommandAudit({
      pluginId,
      schoolId,
      commandId: command.id,
      actorId: command.actor.actorId,
      actorScope: command.actor.actorScope,
      lifecycleState,
      correlationId: command.correlation.correlationId,
      decision: "allowed",
      payloadJson: { url: payload.url, method: payload.method, domain: result.finalUrl },
      commandType: "system.http.request" as const,
    });

    return successResult({
      status: result.status,
      body: result.body,
      headers: result.headers,
      finalUrl: result.finalUrl,
      redirectCount: result.redirectCount,
    });
  } catch (error) {
    // If already a PlatformCommandExecutionError, re-throw (audit already written)
    if (error instanceof PlatformCommandExecutionError) {
      throw error;
    }

    // Map error to reason code
    let reasonCode = "upstream_error";
    const message =
      error instanceof Error ? error.message : String(error);

    if (message.startsWith("SSRF_")) {
      reasonCode = "private_ip_blocked";
    } else if (message.startsWith("HTTPS_REQUIRED")) {
      reasonCode = "domain_not_allowed";
    } else if (message.includes("RESPONSE_SIZE_EXCEEDED")) {
      reasonCode = "response_size_exceeded";
    } else if (message.includes("timeout") || message.includes("AbortError")) {
      reasonCode = "timeout";
    } else if (message.includes("REDIRECT_DENIED")) {
      reasonCode = "redirect_denied";
    }

    await writeSystemCommandAudit({
      pluginId,
      schoolId,
      commandId: command.id,
      actorId: command.actor.actorId,
      actorScope: command.actor.actorScope,
      lifecycleState,
      correlationId: command.correlation.correlationId,
      decision: "denied",
      reasonCode,
      payloadJson: {
        url: payload.url,
        method: payload.method,
        error: message.slice(0, 500),
      },
      commandType: "system.http.request" as const,
    });

    throw new PlatformCommandExecutionError({
      message: `system.http.request failed: ${message}`,
      failureAttribution: {
        scope: "plugin",
        pluginId,
        reasonCode,
        recommendedRecoveryAction:
          reasonCode === "timeout"
            ? "retry_with_longer_timeout"
            : "contact_plugin_developer",
      },
      failureEvent: {
        eventType: "platform.command.failed",
        category: "outcome",
        aggregateType: "plugin",
        aggregateId: pluginId,
        payload: {
          commandType: "system.http.request",
          reasonCode,
          failureAttribution: {
            scope: "plugin",
            pluginId,
            reasonCode,
            recommendedRecoveryAction:
              reasonCode === "timeout"
                ? "retry_with_longer_timeout"
                : "contact_plugin_developer",
          },
        },
        audit: command.audit,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// executeRequest — manual redirect loop with per-hop re-validation
// ---------------------------------------------------------------------------

async function executeRequest(
  currentUrl: string,
  method: string,
  headers: Record<string, string> | undefined,
  body: string | undefined,
  redirectCount: number,
  matchedEntry: MatchedHttpRequestEntry,
  command: PlatformCommand,
  timeout: number,
  maxSize: number,
): Promise<{
  status: number;
  body: string;
  headers: Record<string, string>;
  finalUrl: string;
  redirectCount: number;
}> {
  if (redirectCount > MAX_REDIRECTS) {
    await writeSystemCommandAudit({
      pluginId: command.scope.pluginId,
      schoolId: command.scope.schoolId,
      commandId: command.id,
      actorId: command.actor.actorId,
      actorScope: command.actor.actorScope,
      lifecycleState: "ready",
      correlationId: command.correlation.correlationId,
      decision: "denied",
      reasonCode: "redirect_denied",
      payloadJson: { url: currentUrl, redirectCount },
      commandType: "system.http.request" as const,
    });
    throw new PlatformCommandExecutionError({
      message: `Redirect denied: exceeded ${MAX_REDIRECTS} hops`,
      failureAttribution: {
        scope: "plugin",
        pluginId: command.scope.pluginId,
        reasonCode: "redirect_denied",
        recommendedRecoveryAction: "reduce_redirect_chain",
      },
      failureEvent: {
        eventType: "platform.command.failed",
        category: "outcome",
        aggregateType: "plugin",
        aggregateId: command.scope.pluginId,
        payload: {
          commandType: "system.http.request",
          reasonCode: "redirect_denied",
          failureAttribution: {
            scope: "plugin",
            pluginId: command.scope.pluginId,
            reasonCode: "redirect_denied",
            recommendedRecoveryAction: "reduce_redirect_chain",
          },
        },
        audit: command.audit,
      },
    });
  }

  // Step 1: Validate URL (HTTPS-only via ssrf-guard)
  const parsedUrl = validateUrl(currentUrl);
  const targetHostname = parsedUrl.hostname;

  // Per-hop manifest re-validation (D-10 — THIS IS THE CHECKER FIX)
  // Verify redirect target against manifest whitelist BEFORE any network request
  const redirectMethod = redirectCount === 0 ? method : "GET";

  // Check allowedMethods
  if (!matchedEntry.allowedMethods.includes(redirectMethod)) {
    await writeSystemCommandAudit({
      pluginId: command.scope.pluginId,
      schoolId: command.scope.schoolId,
      commandId: command.id,
      actorId: command.actor.actorId,
      actorScope: command.actor.actorScope,
      lifecycleState: "ready",
      correlationId: command.correlation.correlationId,
      decision: "denied",
      reasonCode: "method_not_allowed",
      payloadJson: {
        url: currentUrl,
        method: redirectMethod,
        domain: targetHostname,
        redirectCount,
      },
      commandType: "system.http.request" as const,
    });
    throw new PlatformCommandExecutionError({
      message: `Redirect target method not in manifest allowedMethods: ${redirectMethod}`,
      failureAttribution: {
        scope: "plugin",
        pluginId: command.scope.pluginId,
        reasonCode: "method_not_allowed",
        recommendedRecoveryAction: "update_manifest_allowed_methods",
      },
      failureEvent: {
        eventType: "platform.command.failed",
        category: "outcome",
        aggregateType: "plugin",
        aggregateId: command.scope.pluginId,
        payload: {
          commandType: "system.http.request",
          reasonCode: "method_not_allowed",
          failureAttribution: {
            scope: "plugin",
            pluginId: command.scope.pluginId,
            reasonCode: "method_not_allowed",
            recommendedRecoveryAction: "update_manifest_allowed_methods",
          },
        },
        audit: command.audit,
      },
    });
  }

  // Check allowedDomains against redirect target
  const domainAllowed = matchedEntry.allowedDomains.some((pattern) =>
    matchDomain(pattern, targetHostname),
  );
  if (!domainAllowed) {
    await writeSystemCommandAudit({
      pluginId: command.scope.pluginId,
      schoolId: command.scope.schoolId,
      commandId: command.id,
      actorId: command.actor.actorId,
      actorScope: command.actor.actorScope,
      lifecycleState: "ready",
      correlationId: command.correlation.correlationId,
      decision: "denied",
      reasonCode: "domain_not_allowed",
      payloadJson: {
        url: currentUrl,
        method: redirectMethod,
        domain: targetHostname,
        redirectCount,
      },
      commandType: "system.http.request" as const,
    });
    throw new PlatformCommandExecutionError({
      message: `Redirect target domain not in manifest whitelist: ${targetHostname}`,
      failureAttribution: {
        scope: "plugin",
        pluginId: command.scope.pluginId,
        reasonCode: "domain_not_allowed",
        recommendedRecoveryAction: "update_manifest_allowed_domains",
      },
      failureEvent: {
        eventType: "platform.command.failed",
        category: "outcome",
        aggregateType: "plugin",
        aggregateId: command.scope.pluginId,
        payload: {
          commandType: "system.http.request",
          reasonCode: "domain_not_allowed",
          failureAttribution: {
            scope: "plugin",
            pluginId: command.scope.pluginId,
            reasonCode: "domain_not_allowed",
            recommendedRecoveryAction: "update_manifest_allowed_domains",
          },
        },
        audit: command.audit,
      },
    });
  }

  // Create DNS-pinned Agent per D-11 (IPv4+IPv6, per-hop)
  const agent = createPinnedAgent(targetHostname, timeout);

  // Build fetch options
  const fetchOptions: RequestInit & { dispatcher?: unknown } = {
    dispatcher: agent,
    redirect: "manual" as RequestRedirect, // D-10: no auto-follow
    method: redirectMethod,
    signal: AbortSignal.timeout(timeout),
  };

  // Apply filtered headers (if any survived filtering)
  if (headers && Object.keys(headers).length > 0) {
    fetchOptions.headers = headers;
  }
  if (body && redirectMethod !== "GET") {
    fetchOptions.body = body;
  }

  const response = await fetch(currentUrl, fetchOptions as RequestInit);

  // Handle 3xx redirects (D-10 — manual loop)
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) {
      await writeSystemCommandAudit({
        pluginId: command.scope.pluginId,
        schoolId: command.scope.schoolId,
        commandId: command.id,
        actorId: command.actor.actorId,
        actorScope: command.actor.actorScope,
        lifecycleState: "ready",
        correlationId: command.correlation.correlationId,
        decision: "denied",
        reasonCode: "redirect_denied",
        payloadJson: { url: currentUrl, statusCode: response.status, redirectCount },
        commandType: "system.http.request" as const,
      });
      throw new PlatformCommandExecutionError({
        message: `Redirect without Location header (status ${response.status})`,
        failureAttribution: {
          scope: "plugin",
          pluginId: command.scope.pluginId,
          reasonCode: "redirect_denied",
          recommendedRecoveryAction: "contact_plugin_developer",
        },
        failureEvent: {
          eventType: "platform.command.failed",
          category: "outcome",
          aggregateType: "plugin",
          aggregateId: command.scope.pluginId,
          payload: {
            commandType: "system.http.request",
            reasonCode: "redirect_denied",
            failureAttribution: {
              scope: "plugin",
              pluginId: command.scope.pluginId,
              reasonCode: "redirect_denied",
              recommendedRecoveryAction: "contact_plugin_developer",
            },
          },
          audit: command.audit,
        },
      });
    }

    const nextUrl = new URL(location, currentUrl).href;
    // For redirects, strip body and headers, switch to GET
    return executeRequest(
      nextUrl,
      "GET",
      undefined,
      undefined,
      redirectCount + 1,
      matchedEntry,
      command,
      timeout,
      maxSize,
    );
  }

  // Step 6: Accumulate response body with size limit (D-13)
  let bodyText = "";
  if (response.body) {
    const reader = response.body.getReader();
    let bytesRead = 0;
    const chunks: Uint8Array[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        bytesRead += value.length;
        if (bytesRead > maxSize) {
          await reader.cancel("RESPONSE_SIZE_EXCEEDED");
          throw new Error("RESPONSE_SIZE_EXCEEDED: response body exceeds max size");
        }

        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    // Concatenate and decode
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    bodyText = new TextDecoder("utf-8").decode(combined);
  }

  // Step 7: Filter response headers
  const rawResponseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    rawResponseHeaders[key] = value;
  });
  const responseHeaders = filterHeaders(rawResponseHeaders);

  return {
    status: response.status,
    body: bodyText,
    headers: responseHeaders,
    finalUrl: currentUrl,
    redirectCount,
  };
}

// ---------------------------------------------------------------------------
// Export — system.http.request
// ---------------------------------------------------------------------------

export const systemHttpRequestHandler = {
  "system.http.request": { authorize, execute },
};

// ---------------------------------------------------------------------------
// system.config — KV configuration (Phase 79)
// ---------------------------------------------------------------------------

// ── Types ──

type SystemConfigSetCommand = Extract<PlatformCommand, { type: "system.config.set" }>;

// ── Zod schemas ──

/** Phase 79 (D-12): configKey must not contain colon (triple-prefix isolation guard). */
const ConfigKeySchema = z.string().min(1).max(256)
  .refine((k) => !k.includes(":"), "config key must not contain colon");

// ── Key matching (D-11) ──

/**
 * Match a manifest allowedKey pattern against a config key.
 *
 * D-11 rules:
 * - `prefix:*` matches `prefix:key` (exactly one segment after prefix)
 * - `prefix:*` does NOT match `prefix:sub:key` (no deep nesting)
 * - Plain patterns use exact string match
 */
function matchConfigKey(pattern: string, key: string): boolean {
  if (pattern.endsWith(":*")) {
    const prefix = pattern.slice(0, -2);
    // prefix:* matches prefix:oneLevel — no deeper colons
    return key.startsWith(prefix + ":") && !key.slice(prefix.length + 1).includes(":");
  }
  return pattern === key;
}

// ── Helpers ──

/** Shared manifest lookup + parse for system.config authorize. */
async function resolveSystemConfigManifestEntry(
  pluginId: string,
  schoolId: string,
): Promise<{
  row: typeof pluginRegistrations.$inferSelect;
  manifest: z.infer<typeof PluginManifestSchema>;
  configEntries: z.infer<typeof PluginManifestSchema>["systemCommands"] extends (infer E)[] | undefined
    ? Extract<E, { command: "system.config" }>[]
    : never;
}> {
  const row = await db.query.pluginRegistrations.findFirst({
    where: and(
      eq(pluginRegistrations.id, pluginId),
      eq(pluginRegistrations.schoolId, schoolId),
    ),
  });

  if (!row) {
    throw { code: "registration_not_found" } as const;
  }

  const manifest = PluginManifestSchema.parse(row.manifestJson);
  const systemCommands = manifest.systemCommands ?? [];
  const configEntries = systemCommands.filter(
    (entry): entry is typeof entry & { command: "system.config" } =>
      entry.command === "system.config",
  );

  return { row, manifest, configEntries };
}

/** Build a PlatformCommandExecutionError for system.config with audit-before-throw. */
async function denySystemConfig(params: {
  pluginId: string;
  schoolId: string;
  commandId: string | null;
  actorId: string;
  actorScope: string;
  lifecycleState: string;
  correlationId: string;
  reasonCode: string;
  configKey: string;
  commandType: "system.config.set" | "system.config.get";
  recommendedRecoveryAction: string;
}): Promise<never> {
  await writeSystemCommandAudit({
    pluginId: params.pluginId,
    schoolId: params.schoolId,
    commandId: params.commandId,
    actorId: params.actorId,
    actorScope: params.actorScope,
    lifecycleState: params.lifecycleState,
    correlationId: params.correlationId,
    decision: "denied",
    reasonCode: params.reasonCode,
    payloadJson: { configKey: params.configKey },
    commandType: params.commandType,
  });

  throw new PlatformCommandExecutionError({
    message: `system.config denied: ${params.reasonCode}`,
    failureAttribution: {
      scope: "plugin",
      pluginId: params.pluginId,
      reasonCode: params.reasonCode,
      recommendedRecoveryAction: params.recommendedRecoveryAction,
    },
    failureEvent: {
      eventType: "platform.command.failed",
      category: "outcome",
      aggregateType: "plugin",
      aggregateId: params.pluginId,
      payload: {
        commandType: params.commandType,
        reasonCode: params.reasonCode,
        failureAttribution: {
          scope: "plugin",
          pluginId: params.pluginId,
          reasonCode: params.reasonCode,
          recommendedRecoveryAction: params.recommendedRecoveryAction,
        },
      },
      audit: {
        delegatedActor: null,
        approval: null,
      },
    },
  });
}

// ── system.config.set — authorize ──

/**
 * system.config.set authorize (Phase 79 D-05/D-10).
 *
 * Mirror of system.http.request authorize: re-parse manifestJson, extract
 * system.config entries, match allowedKeys against configKey. Returns void
 * (unlike http.request which returns MatchedEntry for redirect re-validation).
 *
 * All deny paths write audit BEFORE throw.
 */
async function systemConfigSetAuthorize({
  command,
}: {
  command: PlatformCommand;
}): Promise<void> {
  const sysCmd = command as SystemConfigSetCommand;
  const configKey = sysCmd.payload.configKey;
  const pluginId = command.scope.pluginId;
  const schoolId = command.scope.schoolId;

  try {
    const { row, configEntries } = await resolveSystemConfigManifestEntry(pluginId, schoolId);
    const lifecycleState = row.lifecycleState ?? "ready";

    if (configEntries.length === 0) {
      return void (await denySystemConfig({
        pluginId, schoolId, commandId: command.id,
        actorId: command.actor.actorId,
        actorScope: command.actor.actorScope,
        lifecycleState,
        correlationId: command.correlation.correlationId,
        reasonCode: "config_key_denied",
        configKey,
        commandType: "system.config.set",
        recommendedRecoveryAction: "update_manifest_allowed_keys",
      }));
    }

    // D-10: Iterate entries, first-match-wins
    for (const entry of configEntries) {
      for (const allowedKey of entry.allowedKeys) {
        if (matchConfigKey(allowedKey, configKey)) {
          return; // authorized
        }
      }
    }

    // No match
    return void (await denySystemConfig({
      pluginId, schoolId, commandId: command.id,
      actorId: command.actor.actorId,
      actorScope: command.actor.actorScope,
      lifecycleState,
      correlationId: command.correlation.correlationId,
      reasonCode: "config_key_denied",
      configKey,
      commandType: "system.config.set",
      recommendedRecoveryAction: "update_manifest_allowed_keys",
    }));
  } catch (e) {
    if ((e as { code?: string }).code === "registration_not_found") {
      return void (await denySystemConfig({
        pluginId, schoolId, commandId: command.id,
        actorId: command.actor.actorId,
        actorScope: command.actor.actorScope,
        lifecycleState: "ready",
        correlationId: command.correlation.correlationId,
        reasonCode: "not_allowlisted",
        configKey,
        commandType: "system.config.set",
        recommendedRecoveryAction: "install_plugin",
      }));
    }
    if (e instanceof PlatformCommandExecutionError) throw e;
    throw e;
  }
}

// ── system.config.set — execute ──

/**
 * system.config.set execute (Phase 79 D-09).
 *
 * Writes to pluginOwnedBusinessData with triple-prefix isolation
 * ({schoolId}:{pluginId}:{configKey}) using ON CONFLICT DO UPDATE for atomic
 * upsert. Writes allowed audit on success.
 */
async function systemConfigSetExecute({
  command,
  attemptNumber: _attemptNumber,
}: {
  command: PlatformCommand;
  attemptNumber: number;
}): Promise<PlatformCommandExecutionResult> {
  const sysCmd = command as SystemConfigSetCommand;
  const configKey = sysCmd.payload.configKey;
  const configValue = sysCmd.payload.configValue;
  const pluginId = command.scope.pluginId;
  const schoolId = command.scope.schoolId;

  // Construct isolation key: {schoolId}:{pluginId}:{configKey}
  const storageKey = `${schoolId}:${pluginId}:${configKey}`;

  await db
    .insert(pluginOwnedBusinessData)
    .values({
      schoolId,
      pluginId,
      key: storageKey,
      payloadJson: configValue,
    })
    .onConflictDoUpdate({
      target: [
        pluginOwnedBusinessData.schoolId,
        pluginOwnedBusinessData.pluginId,
        pluginOwnedBusinessData.key,
      ],
      set: {
        payloadJson: sql`excluded.payloadJson`,
        updatedAt: sql`excluded.updatedAt`,
      },
    });

  await writeSystemCommandAudit({
    pluginId,
    schoolId,
    commandId: command.id,
    actorId: command.actor.actorId,
    actorScope: command.actor.actorScope,
    lifecycleState: "ready",
    correlationId: command.correlation.correlationId,
    decision: "allowed",
    payloadJson: {
      configKey,
      byteLength: JSON.stringify(configValue).length,
    },
    commandType: "system.config.set",
  });

  return successResult({ configKey, pluginId, schoolId });
}

// ── system.config.get — authorize ──

/**
 * system.config.get authorize (Phase 79 D-06/D-10).
 *
 * Same manifest re-parse + allowedKeys matching as set authorize.
 * Uses the same resolveSystemConfigManifestEntry helper.
 * All deny paths write audit BEFORE throw.
 */
async function systemConfigGetAuthorize({
  pluginId,
  schoolId,
  configKey,
  actorId,
  actorScope,
  correlationId,
}: {
  pluginId: string;
  schoolId: string;
  configKey: string;
  actorId: string;
  actorScope: string;
  correlationId: string;
}): Promise<void> {
  // Pre-validate configKey shape (D-12)
  ConfigKeySchema.parse(configKey);

  try {
    const { row, configEntries } = await resolveSystemConfigManifestEntry(pluginId, schoolId);
    const lifecycleState = row.lifecycleState ?? "ready";

    if (configEntries.length === 0) {
      return void (await denySystemConfig({
        pluginId, schoolId,
        commandId: null, // get has no command record
        actorId, actorScope, lifecycleState,
        correlationId,
        reasonCode: "config_key_denied",
        configKey,
        commandType: "system.config.get",
        recommendedRecoveryAction: "update_manifest_allowed_keys",
      }));
    }

    for (const entry of configEntries) {
      for (const allowedKey of entry.allowedKeys) {
        if (matchConfigKey(allowedKey, configKey)) {
          return; // authorized
        }
      }
    }

    return void (await denySystemConfig({
      pluginId, schoolId,
      commandId: null,
      actorId, actorScope, lifecycleState,
      correlationId,
      reasonCode: "config_key_denied",
      configKey,
      commandType: "system.config.get",
      recommendedRecoveryAction: "update_manifest_allowed_keys",
    }));
  } catch (e) {
    if ((e as { code?: string }).code === "registration_not_found") {
      return void (await denySystemConfig({
        pluginId, schoolId,
        commandId: null,
        actorId, actorScope,
        lifecycleState: "ready",
        correlationId,
        reasonCode: "not_allowlisted",
        configKey,
        commandType: "system.config.get",
        recommendedRecoveryAction: "install_plugin",
      }));
    }
    if (e instanceof PlatformCommandExecutionError) throw e;
    throw e;
  }
}

// ── system.config.get — execute ──

/**
 * system.config.get execute (Phase 79 D-06/D-07).
 *
 * Pure DAL read from pluginOwnedBusinessData with triple-prefix isolation.
 * Does NOT go through Command Bus. Does NOT write audit.
 * Returns payloadJson or null if key not found.
 */
async function systemConfigGetExecute({
  pluginId,
  schoolId,
  configKey,
}: {
  pluginId: string;
  schoolId: string;
  configKey: string;
}): Promise<unknown | null> {
  const storageKey = `${schoolId}:${pluginId}:${configKey}`;

  const row = await db.query.pluginOwnedBusinessData.findFirst({
    where: and(
      eq(pluginOwnedBusinessData.schoolId, schoolId),
      eq(pluginOwnedBusinessData.pluginId, pluginId),
      eq(pluginOwnedBusinessData.key, storageKey),
    ),
    columns: { payloadJson: true },
  });

  return row?.payloadJson ?? null;
}

// ── Export — system.config ──

// Named exports for facade direct call (system.config.get does not go through Command Bus)
export { systemConfigGetAuthorize, systemConfigGetExecute };

export const systemConfigHandler = {
  "system.config.set": { authorize: systemConfigSetAuthorize, execute: systemConfigSetExecute },
  "system.config.get": { authorize: systemConfigGetAuthorize, execute: systemConfigGetExecute },
};
