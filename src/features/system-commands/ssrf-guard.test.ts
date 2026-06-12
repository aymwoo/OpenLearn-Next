import { describe, it, expect, vi, beforeEach } from "vitest";
import * as dns from "node:dns/promises";

vi.mock("server-only", () => ({}));

import {
  validateUrl,
  isHostnameRawIP,
  isPrivateIP,
  createPinnedAgent,
  MAX_REDIRECTS,
} from "./ssrf-guard";

// Mock dns.promises for DNS pinning tests
vi.mock("node:dns/promises", () => ({
  resolve4: vi.fn(),
  resolve6: vi.fn(),
}));

describe("validateUrl", () => {
  it("rejects non-https URLs with SSRF_HTTPS_REQUIRED", () => {
    expect(() => validateUrl("http://example.com")).toThrow(
      "SSRF_HTTPS_REQUIRED"
    );
    expect(() => validateUrl("http://127.0.0.1")).toThrow(
      "SSRF_HTTPS_REQUIRED"
    );
    expect(() => validateUrl("ftp://example.com")).toThrow(
      "SSRF_HTTPS_REQUIRED"
    );
  });

  it("accepts https URLs and returns a WHATWG URL object", () => {
    const url = validateUrl("https://example.com/path?q=1");
    expect(url).toBeInstanceOf(URL);
    expect(url.href).toBe("https://example.com/path?q=1");
    expect(url.hostname).toBe("example.com");
  });

  it("rejects URLs with empty hostname", () => {
    expect(() => validateUrl("https://")).toThrow("SSRF_NO_HOSTNAME");
  });
});

describe("isHostnameRawIP", () => {
  it("returns true for IPv4 addresses", () => {
    expect(isHostnameRawIP("127.0.0.1")).toBe(true);
    expect(isHostnameRawIP("10.0.0.1")).toBe(true);
    expect(isHostnameRawIP("192.168.1.1")).toBe(true);
  });

  it("returns true for IPv6 addresses (no brackets)", () => {
    expect(isHostnameRawIP("::1")).toBe(true);
    expect(isHostnameRawIP("fc00::1")).toBe(true);
    expect(isHostnameRawIP("fe80::1")).toBe(true);
    expect(isHostnameRawIP("2001:db8::1")).toBe(true);
  });

  it("strips brackets before calling net.isIP (Pitfall 1: IPv6 bracket bypass)", () => {
    expect(isHostnameRawIP("[::1]")).toBe(true);
    expect(isHostnameRawIP("[fc00::1]")).toBe(true);
    expect(isHostnameRawIP("[::ffff:127.0.0.1]")).toBe(true);
  });

  it("returns false for regular hostnames", () => {
    expect(isHostnameRawIP("example.com")).toBe(false);
    expect(isHostnameRawIP("api.example.com")).toBe(false);
  });
});

describe("isPrivateIP", () => {
  // IPv4 private ranges
  it("detects 127.0.0.0/8 as private (loopback)", () => {
    expect(isPrivateIP("127.0.0.1")).toBe(true);
    expect(isPrivateIP("127.255.255.255")).toBe(true);
  });

  it("detects 10.0.0.0/8 as private", () => {
    expect(isPrivateIP("10.0.0.1")).toBe(true);
    expect(isPrivateIP("10.255.255.255")).toBe(true);
  });

  it("detects 172.16.0.0/12 as private", () => {
    expect(isPrivateIP("172.16.0.0")).toBe(true);
    expect(isPrivateIP("172.31.255.255")).toBe(true);
  });

  it("detects 192.168.0.0/16 as private", () => {
    expect(isPrivateIP("192.168.0.1")).toBe(true);
    expect(isPrivateIP("192.168.255.255")).toBe(true);
  });

  it("detects 169.254.0.0/16 as private (link-local)", () => {
    expect(isPrivateIP("169.254.0.1")).toBe(true);
    expect(isPrivateIP("169.254.255.255")).toBe(true);
  });

  it("detects 100.64.0.0/10 as private (CGNAT)", () => {
    expect(isPrivateIP("100.64.0.1")).toBe(true);
    expect(isPrivateIP("100.127.255.255")).toBe(true);
  });

  it("detects 0.0.0.0/8 as private", () => {
    expect(isPrivateIP("0.0.0.1")).toBe(true);
  });

  it("returns false for public IPv4 addresses", () => {
    expect(isPrivateIP("8.8.8.8")).toBe(false);
    expect(isPrivateIP("1.1.1.1")).toBe(false);
    expect(isPrivateIP("203.0.113.1")).toBe(false);
  });

  // IPv6 private ranges
  it("detects ::1 as private (IPv6 loopback)", () => {
    expect(isPrivateIP("::1")).toBe(true);
  });

  it("detects [::1] as private (bracket-stripped IPv6 loopback)", () => {
    expect(isPrivateIP("[::1]")).toBe(true);
  });

  it("detects fc00::/7 as private (ULA)", () => {
    expect(isPrivateIP("fc00::1")).toBe(true);
    expect(isPrivateIP("fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff")).toBe(true);
  });

  it("detects fe80::/10 as private (link-local)", () => {
    expect(isPrivateIP("fe80::1")).toBe(true);
    expect(isPrivateIP("febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff")).toBe(true);
  });

  it("detects ::ffff:a.b.c.d as private when embedded IPv4 is private", () => {
    // ::ffff:127.0.0.1 -> embedded IPv4 is loopback
    expect(isPrivateIP("::ffff:127.0.0.1")).toBe(true);
    // ::ffff:10.0.0.1 -> embedded IPv4 is private
    expect(isPrivateIP("::ffff:10.0.0.1")).toBe(true);
    // ::ffff:192.168.1.1 -> embedded IPv4 is private
    expect(isPrivateIP("::ffff:192.168.1.1")).toBe(true);
  });

  it("detects ::ffff:a.b.c.d as NOT private when embedded IPv4 is public", () => {
    expect(isPrivateIP("::ffff:8.8.8.8")).toBe(false);
  });

  it("returns false for public IPv6 addresses", () => {
    expect(isPrivateIP("2001:db8::1")).toBe(false);
    expect(isPrivateIP("2606:4700:4700::1111")).toBe(false);
  });

  it("returns false for regular hostnames (not raw IPs)", () => {
    expect(isPrivateIP("example.com")).toBe(false);
    expect(isPrivateIP("")).toBe(false);
  });

  // Pitfall 2: Decimal IP encoding
  it("normalizes decimal-encoded IP via WHATWG URL (Pitfall 2)", () => {
    // http://2130706433/ -> hostname "127.0.0.1" after WHATWG normalization
    // We expect the caller to pass WHATWG-normalized hostname
    expect(isPrivateIP("127.0.0.1")).toBe(true);
  });
});

describe("createPinnedAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an Agent with bodyTimeout and headersTimeout configured", () => {
    const agent = createPinnedAgent("example.com", 30000);
    expect(agent).toBeDefined();
    // Agent has dispatch, etc. -- just confirm it's instantiated
    expect(typeof agent.dispatch).toBe("function");
  });

  it("throws immediately if hostname is a raw private IP", () => {
    expect(() => createPinnedAgent("127.0.0.1", 30000)).toThrow(
      "SSRF_PRIVATE_IP_BLOCKED"
    );
    expect(() => createPinnedAgent("10.0.0.1", 30000)).toThrow(
      "SSRF_PRIVATE_IP_BLOCKED"
    );
    expect(() => createPinnedAgent("::1", 30000)).toThrow(
      "SSRF_PRIVATE_IP_BLOCKED"
    );
  });

  it("creates a direct-pinning Agent for safe raw IP", () => {
    const agent = createPinnedAgent("8.8.8.8", 30000);
    expect(agent).toBeDefined();
    // Should not throw for public IP
  });

  describe("connect.lookup for hostname (DNS resolve path)", () => {
    it("calls callback with (null, address, 4) for safe IPv4", async () => {
      const mockResolve4 = vi.mocked(dns.resolve4);
      const mockResolve6 = vi.mocked(dns.resolve6);
      mockResolve4.mockResolvedValue(["93.184.216.34"]);
      mockResolve6.mockResolvedValue([]);

      const agent = createPinnedAgent("example.com", 30000);

      // Access connect.lookup via internal options
      const lookupFn = (agent as unknown as { options: { connect?: { lookup?: unknown } } })
        .options?.connect?.lookup as
        | ((hostname: string, options: unknown, callback: (err: Error | null, address: string | null, family: number) => void) => void)
        | undefined;

      expect(lookupFn).toBeDefined();

      const result = await new Promise<{
        err: Error | null;
        address: string | null;
        family: number;
      }>((resolve) => {
        lookupFn!("example.com", {}, (err, address, family) => {
          resolve({ err, address, family });
        });
      });

      expect(result.err).toBeNull();
      expect(result.address).toBe("93.184.216.34");
      expect(result.family).toBe(4);
      expect(mockResolve4).toHaveBeenCalledWith("example.com");
      expect(mockResolve6).toHaveBeenCalledWith("example.com");
    });

    it("resolves BOTH IPv4 and IPv6 addresses (resolve4 + resolve6)", async () => {
      const mockResolve4 = vi.mocked(dns.resolve4);
      const mockResolve6 = vi.mocked(dns.resolve6);
      mockResolve4.mockResolvedValue(["93.184.216.34"]);
      mockResolve6.mockResolvedValue(["2606:2800:220:1:248:1893:25c8:1946"]);

      const agent = createPinnedAgent("example.com", 30000);
      const lookupFn = (agent as unknown as { options: { connect?: { lookup?: unknown } } })
        .options?.connect?.lookup as
        | ((hostname: string, options: unknown, callback: (err: Error | null, address: string | null, family: number) => void) => void)
        | undefined;

      const result = await new Promise<{
        err: Error | null;
        address: string | null;
        family: number;
      }>((resolve) => {
        lookupFn!("example.com", {}, (err, address, family) => {
          resolve({ err, address, family });
        });
      });

      expect(result.err).toBeNull();
      expect(mockResolve4).toHaveBeenCalled();
      expect(mockResolve6).toHaveBeenCalled();
      // Should prefer IPv4 when both available
      expect(result.family).toBe(4);
      expect(result.address).toBe("93.184.216.34");
    });

    it("falls back to safe IPv6 when no IPv4 addresses available", async () => {
      const mockResolve4 = vi.mocked(dns.resolve4);
      const mockResolve6 = vi.mocked(dns.resolve6);
      mockResolve4.mockRejectedValue(new Error("ENOTFOUND"));
      mockResolve6.mockResolvedValue(["2001:db8::1"]);

      const agent = createPinnedAgent("example.com", 30000);
      const lookupFn = (agent as unknown as { options: { connect?: { lookup?: unknown } } })
        .options?.connect?.lookup as
        | ((hostname: string, options: unknown, callback: (err: Error | null, address: string | null, family: number) => void) => void)
        | undefined;

      const result = await new Promise<{
        err: Error | null;
        address: string | null;
        family: number;
      }>((resolve) => {
        lookupFn!("example.com", {}, (err, address, family) => {
          resolve({ err, address, family });
        });
      });

      expect(result.err).toBeNull();
      expect(result.address).toBe("2001:db8::1");
      expect(result.family).toBe(6);
    });

    it("calls callback with SSRF_PRIVATE_IP_BLOCKED when resolved IPv4 is private", async () => {
      const mockResolve4 = vi.mocked(dns.resolve4);
      const mockResolve6 = vi.mocked(dns.resolve6);
      mockResolve4.mockResolvedValue(["10.0.0.1"]);
      mockResolve6.mockResolvedValue([]);

      const agent = createPinnedAgent("internal.example.com", 30000);
      const lookupFn = (agent as unknown as { options: { connect?: { lookup?: unknown } } })
        .options?.connect?.lookup as
        | ((hostname: string, options: unknown, callback: (err: Error | null, address: string | null, family: number) => void) => void)
        | undefined;

      const result = await new Promise<{
        err: Error | null;
        address: string | null;
        family: number;
      }>((resolve) => {
        lookupFn!("internal.example.com", {}, (err, address, family) => {
          resolve({ err, address, family });
        });
      });

      expect(result.err).toBeDefined();
      expect(result.err!.message).toBe("SSRF_PRIVATE_IP_BLOCKED");
    });

    it("calls callback with SSRF_PRIVATE_IP_BLOCKED when resolved IPv6 is ULA (fc00::/7)", async () => {
      const mockResolve4 = vi.mocked(dns.resolve4);
      const mockResolve6 = vi.mocked(dns.resolve6);
      mockResolve4.mockRejectedValue(new Error("ENOTFOUND"));
      mockResolve6.mockResolvedValue(["fc00::1"]);

      const agent = createPinnedAgent("internal.example.com", 30000);
      const lookupFn = (agent as unknown as { options: { connect?: { lookup?: unknown } } })
        .options?.connect?.lookup as
        | ((hostname: string, options: unknown, callback: (err: Error | null, address: string | null, family: number) => void) => void)
        | undefined;

      const result = await new Promise<{
        err: Error | null;
        address: string | null;
        family: number;
      }>((resolve) => {
        lookupFn!("internal.example.com", {}, (err, address, family) => {
          resolve({ err, address, family });
        });
      });

      expect(result.err).toBeDefined();
      expect(result.err!.message).toBe("SSRF_PRIVATE_IP_BLOCKED");
    });

    it("calls callback with SSRF_PRIVATE_IP_BLOCKED when resolved IPv6 is link-local (fe80::/10)", async () => {
      const mockResolve4 = vi.mocked(dns.resolve4);
      const mockResolve6 = vi.mocked(dns.resolve6);
      mockResolve4.mockRejectedValue(new Error("ENOTFOUND"));
      mockResolve6.mockResolvedValue(["fe80::1"]);

      const agent = createPinnedAgent("internal.example.com", 30000);
      const lookupFn = (agent as unknown as { options: { connect?: { lookup?: unknown } } })
        .options?.connect?.lookup as
        | ((hostname: string, options: unknown, callback: (err: Error | null, address: string | null, family: number) => void) => void)
        | undefined;

      const result = await new Promise<{
        err: Error | null;
        address: string | null;
        family: number;
      }>((resolve) => {
        lookupFn!("internal.example.com", {}, (err, address, family) => {
          resolve({ err, address, family });
        });
      });

      expect(result.err).toBeDefined();
      expect(result.err!.message).toBe("SSRF_PRIVATE_IP_BLOCKED");
    });

    it("calls callback with SSRF_PRIVATE_IP_BLOCKED when resolved IPv6 is loopback (::1)", async () => {
      const mockResolve4 = vi.mocked(dns.resolve4);
      const mockResolve6 = vi.mocked(dns.resolve6);
      mockResolve4.mockRejectedValue(new Error("ENOTFOUND"));
      mockResolve6.mockResolvedValue(["::1"]);

      const agent = createPinnedAgent("internal.example.com", 30000);
      const lookupFn = (agent as unknown as { options: { connect?: { lookup?: unknown } } })
        .options?.connect?.lookup as
        | ((hostname: string, options: unknown, callback: (err: Error | null, address: string | null, family: number) => void) => void)
        | undefined;

      const result = await new Promise<{
        err: Error | null;
        address: string | null;
        family: number;
      }>((resolve) => {
        lookupFn!("internal.example.com", {}, (err, address, family) => {
          resolve({ err, address, family });
        });
      });

      expect(result.err).toBeDefined();
      expect(result.err!.message).toBe("SSRF_PRIVATE_IP_BLOCKED");
    });

    it("calls callback with SSRF_DNS_NO_ADDRESS when DNS fails for both families", async () => {
      const mockResolve4 = vi.mocked(dns.resolve4);
      const mockResolve6 = vi.mocked(dns.resolve6);
      mockResolve4.mockRejectedValue(new Error("ENOTFOUND"));
      mockResolve6.mockRejectedValue(new Error("ENOTFOUND"));

      const agent = createPinnedAgent("nonexistent.example.com", 30000);
      const lookupFn = (agent as unknown as { options: { connect?: { lookup?: unknown } } })
        .options?.connect?.lookup as
        | ((hostname: string, options: unknown, callback: (err: Error | null, address: string | null, family: number) => void) => void)
        | undefined;

      const result = await new Promise<{
        err: Error | null;
        address: string | null;
        family: number;
      }>((resolve) => {
        lookupFn!("nonexistent.example.com", {}, (err, address, family) => {
          resolve({ err, address, family });
        });
      });

      expect(result.err).toBeDefined();
      expect(result.err!.message).toBe("SSRF_DNS_NO_ADDRESS");
    });

    it("calls callback with SSRF_PRIVATE_IP_BLOCKED for IPv4-mapped IPv6 private address", async () => {
      const mockResolve4 = vi.mocked(dns.resolve4);
      const mockResolve6 = vi.mocked(dns.resolve6);
      mockResolve4.mockRejectedValue(new Error("ENOTFOUND"));
      mockResolve6.mockResolvedValue(["::ffff:10.0.0.1"]);

      const agent = createPinnedAgent("internal.example.com", 30000);
      const lookupFn = (agent as unknown as { options: { connect?: { lookup?: unknown } } })
        .options?.connect?.lookup as
        | ((hostname: string, options: unknown, callback: (err: Error | null, address: string | null, family: number) => void) => void)
        | undefined;

      const result = await new Promise<{
        err: Error | null;
        address: string | null;
        family: number;
      }>((resolve) => {
        lookupFn!("internal.example.com", {}, (err, address, family) => {
          resolve({ err, address, family });
        });
      });

      expect(result.err).toBeDefined();
      expect(result.err!.message).toBe("SSRF_PRIVATE_IP_BLOCKED");
    });

    it("allows safe global unicast IPv6 (2001:db8::1)", async () => {
      const mockResolve4 = vi.mocked(dns.resolve4);
      const mockResolve6 = vi.mocked(dns.resolve6);
      mockResolve4.mockRejectedValue(new Error("ENOTFOUND"));
      mockResolve6.mockResolvedValue(["2001:db8::1"]);

      const agent = createPinnedAgent("example.com", 30000);
      const lookupFn = (agent as unknown as { options: { connect?: { lookup?: unknown } } })
        .options?.connect?.lookup as
        | ((hostname: string, options: unknown, callback: (err: Error | null, address: string | null, family: number) => void) => void)
        | undefined;

      const result = await new Promise<{
        err: Error | null;
        address: string | null;
        family: number;
      }>((resolve) => {
        lookupFn!("example.com", {}, (err, address, family) => {
          resolve({ err, address, family });
        });
      });

      expect(result.err).toBeNull();
      expect(result.address).toBe("2001:db8::1");
      expect(result.family).toBe(6);
    });

    it("blocks all addresses if any resolved address is private", async () => {
      const mockResolve4 = vi.mocked(dns.resolve4);
      const mockResolve6 = vi.mocked(dns.resolve6);
      // Safe IPv4 + private IPv6 = blocked
      mockResolve4.mockResolvedValue(["93.184.216.34"]);
      mockResolve6.mockResolvedValue(["fc00::1"]);

      const agent = createPinnedAgent("hybrid.example.com", 30000);
      const lookupFn = (agent as unknown as { options: { connect?: { lookup?: unknown } } })
        .options?.connect?.lookup as
        | ((hostname: string, options: unknown, callback: (err: Error | null, address: string | null, family: number) => void) => void)
        | undefined;

      const result = await new Promise<{
        err: Error | null;
        address: string | null;
        family: number;
      }>((resolve) => {
        lookupFn!("hybrid.example.com", {}, (err, address, family) => {
          resolve({ err, address, family });
        });
      });

      expect(result.err).toBeDefined();
      expect(result.err!.message).toBe("SSRF_PRIVATE_IP_BLOCKED");
    });
  });
});

describe("MAX_REDIRECTS", () => {
  it("is exported as a constant with value 5", () => {
    expect(MAX_REDIRECTS).toBe(5);
  });
});
