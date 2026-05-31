import "server-only";

import { cookies } from "next/headers";

export const ACTIVE_THEME_COOKIE = "activeThemeId" as const;

export async function getActiveThemeId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_THEME_COOKIE)?.value ?? null;
}

export async function setActiveThemeId(themeId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_THEME_COOKIE, themeId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

export async function clearActiveThemeId(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_THEME_COOKIE);
}
