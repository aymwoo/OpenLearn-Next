import "server-only";

import { isIP } from "node:net";
import { promises as dns } from "node:dns";
import { Agent } from "undici";

export const MAX_REDIRECTS = 5;

/**
 * Private IPv4 address ranges as integer bounds.
 * Covers: 0.0.0.0/8, 10.0.0.0/8, 127.0.0.0/8, 169.254.0.0/16,
 * 172.16.0.0/12, 192.168.0.0/16, 100.64.0.0/10 (CGNAT).
 * Source: RFC 1918, RFC 6598, RFC 6890, RFC 5735.
 */
const PRIVATE_IPV4_RANGES: ReadonlyArray<{
  readonly start: number;
  readonly end: number;
}> = [
  { start: 0x00000000, end: 0x00ffffff }, // 0.0.0.0/8
  { start: 0x0a000000, end: 0x0affffff }, // 10.0.0.0/8
  { start: 0x7f000000, end: 0x7fffffff }, // 127.0.0.0/8
  { start: 0xa9fe0000, end: 0xa9feffff }, // 169.254.0.0/16
  { start: 0xac100000, end: 0xac1fffff }, // 172.16.0.0/12
  { start: 0xc0a80000, end: 0xc0a8ffff }, // 192.168.0.0/16
  { start: 0x64400000, end: 0x647fffff }, // 100.64.0.0/10
];

/**
 * Convert a dotted-quad IPv4 string to an unsigned 32-bit integer.
 * Uses >>> 0 to convert the 32-bit signed integer to unsigned.
 */
function ip4ToInt(ip: string): number {
  return (
    (ip
      .split(".")
      .reduce((acc, octet) => (acc << 8) + Number.parseInt(octet, 10), 0) >>>
    0
  ));
}

/**
 * Check if an IPv4 address (dotted-quad string) falls within any
 * of the private/reserved ranges.
 */
function isPrivateIPv4(ip: string): boolean {
  if (isIP(ip) !== 4) return false;
  const num = ip4ToInt(ip);
  return PRIVATE_IPV4_RANGES.some(
    (range) => num >= range.start && num <= range.end,
  );
}

/**
 * Strip enclosing brackets from an IPv6 literal like "[::1]".
 */
function stripBrackets(host: string): string {
  if (host.startsWith("[") && host.endsWith("]")) {
    return host.slice(1, -1);
  }
  return host;
}

/**
 * Extract the IPv4 dotted quad trailing an IPv4-mapped IPv6 address
 * (e.g. "::ffff:127.0.0.1" -> "127.0.0.1"). Returns null if the
 * address is not IPv4-mapped.
 */
function extractMappedIPv4(ip: string): string | null {
  const match = ip.match(/^::ffff:(?<ipv4>\d+\.\d+\.\d+\.\d+)$/i);
  return match?.groups?.ipv4 ?? null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Enforce HTTPS-only protocol before any network I/O (D-12).
 * Returns a WHATWG URL object on success.
 *
 * @throws {Error} "SSRF_HTTPS_REQUIRED" if protocol is not https:
 * @throws {Error} "SSRF_NO_HOSTNAME"  if the parsed URL has an empty hostname
 */
export function validateUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("SSRF_NO_HOSTNAME");
  }

  if (url.protocol !== "https:") {
    throw new Error("SSRF_HTTPS_REQUIRED");
  }
  if (!url.hostname) {
    throw new Error("SSRF_NO_HOSTNAME");
  }
  return url;
}

/**
 * Pre-flight IP detection: checks whether a hostname is already
 * a raw IP address (Pitfall 1 — strips brackets before calling net.isIP()).
 *
 * Returns true if the hostname is an IPv4 or IPv6 address.
 */
export function isHostnameRawIP(hostname: string): boolean {
  const stripped = stripBrackets(hostname);
  return isIP(stripped) !== 0;
}

/**
 * Comprehensive private/loopback/reserved IP check.
 *
 * Supports:
 *   - IPv4:    integer-range check against 7 private/CGNAT/loopback ranges
 *   - IPv6:    ::1 (loopback), fc00::/7 (ULA), fe80::/10 (link-local),
 *              ::ffff:a.b.c.d (IPv4-mapped — delegates to isPrivateIPv4)
 *   - Bracket-stripped IPv6 literals like "[::1]"
 *   - Non-IP hostnames: returns false (will be DNS-resolved later)
 */
export function isPrivateIP(hostnameOrIP: string): boolean {
  const stripped = stripBrackets(hostnameOrIP);
  const family = isIP(stripped);

  if (family === 4) {
    return isPrivateIPv4(stripped);
  }

  if (family === 6) {
    // IPv6 loopback
    if (stripped === "::1") return true;

    // IPv4-mapped IPv6 — extract and check the embedded IPv4
    const mappedV4 = extractMappedIPv4(stripped);
    if (mappedV4) {
      return isPrivateIPv4(mappedV4);
    }

    // ULA — fc00::/7 (covers first hextet fc00–fdff)
    const ulaHextet = stripped.split(":")[0] ?? "";
    if (
      ulaHextet.length >= 2 &&
      (ulaHextet.startsWith("fc") || ulaHextet.startsWith("fd"))
    ) {
      return true;
    }

    // Link-local — fe80::/10
    if (/^fe[89ab]/i.test(stripped)) {
      // fe80::/10 means the first hex chars are "fe8", "fe9", "fea", or "feb"
      const firstHextet = stripped.split(":")[0] ?? "";
      if (
        firstHextet.length >= 3 &&
        (firstHextet.startsWith("fe8") ||
          firstHextet.startsWith("fe9") ||
          firstHextet.startsWith("fea") ||
          firstHextet.startsWith("feb"))
      ) {
        return true;
      }
    }

    return false;
  }

  // Not a raw IP — will be DNS-resolved later
  return false;
}

/**
 * Create an undici Agent with DNS-pinned connect.lookup for SSRF defense (D-09).
 *
 * Resolution strategy (Open Question #3 RESOLVED):
 *   1. Resolve BOTH IPv4 (resolve4) and IPv6 (resolve6) via Promise.allSettled.
 *   2. Validate all resolved addresses against their respective private ranges.
 *   3. If ANY address is private -> callback("SSRF_PRIVATE_IP_BLOCKED").
 *   4. If all addresses are safe -> pin to the first safe address.
 *      Prefer IPv4 for compatibility; fallback to IPv6 if no IPv4 available.
 *   5. If BOTH families fail -> callback("SSRF_DNS_NO_ADDRESS").
 *
 * If the hostname is already a raw IP:
 *   - validate with isPrivateIP; throw if private
 *   - otherwise create agent that pins to the raw IP directly via connect.lookup
 *
 * @param hostname - the hostname (or raw IP) to connect to
 * @param timeout  - bodyTimeout in ms (default 30s from handler)
 * @returns undici Agent with pinned DNS resolution
 */
export function createPinnedAgent(hostname: string, timeout: number): Agent {
  // Pre-flight: if hostname is already a raw IP, validate directly
  if (isHostnameRawIP(hostname)) {
    const stripped = stripBrackets(hostname);
    if (isPrivateIP(stripped)) {
      throw new Error("SSRF_PRIVATE_IP_BLOCKED");
    }
    // IP is safe — pin directly in connect.lookup
    const family = isIP(stripped) === 6 ? 6 : 4;
    return new Agent({
      connect: {
        lookup(_h: string, _o: unknown, callback: (err: Error | null, address: string | null, family: number) => void) {
          callback(null, stripped, family);
        },
      },
      bodyTimeout: timeout,
      headersTimeout: 10000,
    });
  }

  // Hostname path — DNS resolve + validate + pin atomically
  return new Agent({
    connect: {
      lookup(
        _h: string,
        _o: unknown,
        callback: (err: Error | null, address: string | null, family: number) => void,
      ) {
        Promise.allSettled([
          dns.resolve4(hostname),
          dns.resolve6(hostname),
        ])
          .then(([v4Result, v6Result]) => {
            const addresses: Array<{ addr: string; family: number }> = [];

            if (v4Result.status === "fulfilled") {
              for (const addr of v4Result.value) {
                addresses.push({ addr, family: 4 });
              }
            }
            if (v6Result.status === "fulfilled") {
              for (const addr of v6Result.value) {
                addresses.push({ addr, family: 6 });
              }
            }

            if (addresses.length === 0) {
              return callback(new Error("SSRF_DNS_NO_ADDRESS"), null, 0);
            }

            // Validate ALL addresses — block if ANY is private
            for (const { addr } of addresses) {
              if (isPrivateIP(addr)) {
                return callback(new Error("SSRF_PRIVATE_IP_BLOCKED"), null, 0);
              }
            }

            // All addresses safe — prefer IPv4, fallback to IPv6
            const v4Addr = addresses.find((a) => a.family === 4);
            if (v4Addr) {
              callback(null, v4Addr.addr, 4);
            } else {
              const v6Addr = addresses[0];
              callback(null, v6Addr.addr, 6);
            }
          })
          .catch((err: Error) => {
            callback(err, null, 0);
          });
      },
    },
    bodyTimeout: timeout,
    headersTimeout: 10000,
  });
}
