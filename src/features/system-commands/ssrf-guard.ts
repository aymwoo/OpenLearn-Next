import "server-only";

export const MAX_REDIRECTS = 5;

// Placeholder implementations — will be fully implemented in GREEN phase

export function validateUrl(_rawUrl: string): URL {
  throw new Error("Not implemented");
}

export function isHostnameRawIP(_hostname: string): boolean {
  throw new Error("Not implemented");
}

export function isPrivateIP(_hostnameOrIP: string): boolean {
  throw new Error("Not implemented");
}

export function createPinnedAgent(_hostname: string, _timeout: number): unknown {
  throw new Error("Not implemented");
}
