import { describe, expect, it } from "vitest";

import {
  authConfig,
  isAuthorizedRouteAccess,
  isProtectedRouteFamily,
  protectedRouteFamilies,
} from "./auth.config";

describe("isAuthorizedRouteAccess", () => {
  it("allows authenticated requests through proxy even when role metadata is unavailable", () => {
    expect(
      isAuthorizedRouteAccess({
        isLoggedIn: true,
        pathname: "/teacher",
      })
    ).toBe(true);
  });

  it("blocks unauthenticated access to protected route families", () => {
    expect(
      isAuthorizedRouteAccess({
        isLoggedIn: false,
        pathname: "/teacher",
      })
    ).toBe(false);

    expect(
      isAuthorizedRouteAccess({
        isLoggedIn: false,
        pathname: "/api/classroom/session-1/snapshot",
      })
    ).toBe(false);
  });

  it("allows public routes and lets role checks stay in layouts or DAL", () => {
    expect(
      isAuthorizedRouteAccess({
        isLoggedIn: true,
        pathname: "/teacher/review",
      })
    ).toBe(true);

    expect(
      isAuthorizedRouteAccess({
        isLoggedIn: true,
        pathname: "/classroom",
      })
    ).toBe(true);

    expect(
      isAuthorizedRouteAccess({
        isLoggedIn: false,
        pathname: "/api/auth/session",
      })
    ).toBe(true);

    expect(
      isAuthorizedRouteAccess({
        isLoggedIn: false,
        pathname: "/",
      })
    ).toBe(true);
  });
});

describe("protectedRouteFamilies", () => {
  it("keeps protected route families explicit", () => {
    expect(protectedRouteFamilies).toEqual([
      "/teacher",
      "/student",
      "/classroom",
      "/admin",
      "/api/classroom",
    ]);
    expect(isProtectedRouteFamily("/api/classroom/session-1/events")).toBe(true);
    expect(isProtectedRouteFamily("/api/auth/session")).toBe(false);
  });
});

describe("authConfig", () => {
  it("enables trustHost for Auth.js routes", () => {
    expect(authConfig.trustHost).toBe(true);
  });
});
