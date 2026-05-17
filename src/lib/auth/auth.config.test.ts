import { describe, expect, it } from "vitest";

import { authConfig, isAuthorizedRouteAccess } from "./auth.config";

describe("isAuthorizedRouteAccess", () => {
  it("allows authenticated requests through proxy when roles metadata is unavailable", () => {
    expect(
      isAuthorizedRouteAccess({
        isLoggedIn: true,
        pathname: "/teacher",
        roles: [],
      })
    ).toBe(true);
  });

  it("blocks logged-in students from teacher routes", () => {
    expect(
      isAuthorizedRouteAccess({
        isLoggedIn: true,
        pathname: "/teacher",
        roles: ["student"],
      })
    ).toBe(false);
  });

  it("blocks logged-in teachers from student routes", () => {
    expect(
      isAuthorizedRouteAccess({
        isLoggedIn: true,
        pathname: "/student/player",
        roles: ["teacher"],
      })
    ).toBe(false);
  });

  it("allows matching role routes and shared classroom access", () => {
    expect(
      isAuthorizedRouteAccess({
        isLoggedIn: true,
        pathname: "/teacher/review",
        roles: ["teacher"],
      })
    ).toBe(true);

    expect(
      isAuthorizedRouteAccess({
        isLoggedIn: true,
        pathname: "/classroom",
        roles: ["student"],
      })
    ).toBe(true);
  });
});

describe("authConfig", () => {
  it("enables trustHost for Auth.js routes", () => {
    expect(authConfig.trustHost).toBe(true);
  });
});
