import { compileThemeTokensToCssVariables } from "@/server/themes/tokens";
import { getActiveThemeForCurrentActor } from "@/lib/dal/themes";
import { getActiveThemeId } from "@/lib/theme-cookie";

function toSafeCss(value: string) {
  return value.replace(/[<>{};]/g, "").trim();
}

export async function ThemeInjector() {
  const activeThemeId = await getActiveThemeId();
  if (!activeThemeId) {
    return null;
  }

  const theme = await getActiveThemeForCurrentActor(activeThemeId);
  if (!theme) {
    return null;
  }

  const cssVariables = compileThemeTokensToCssVariables(theme.tokenJson);
  const rules = Object.entries(cssVariables)
    .filter(([key, value]) => /^--[a-z0-9-]+$/.test(key) && value)
    .map(([key, value]) => `${key}: ${toSafeCss(value)};`)
    .join(" ");

  if (!rules) {
    return null;
  }

  return <style id="theme-injector" dangerouslySetInnerHTML={{ __html: `:root { ${rules} }` }} />;
}
