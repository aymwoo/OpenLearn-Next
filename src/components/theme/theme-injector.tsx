import { Fragment } from "react";

import { getActiveThemeRuntimeForCurrentActor } from "@/lib/dal/themes";
import { compileThemeTokensToCssVariables } from "@/server/themes/tokens";
import { DEFAULT_THEME_LAYOUT_RUNTIME } from "@/server/themes/tokens";
import { getActiveThemeId } from "@/lib/theme-cookie";

function toSafeCss(value: string) {
  return value.replace(/[<>{};]/g, "").trim();
}

export async function ThemeInjector() {
  const activeThemeId = await getActiveThemeId();
  const themeRuntime = activeThemeId ? await getActiveThemeRuntimeForCurrentActor(activeThemeId) : null;
  const cssVariables = themeRuntime ? themeRuntime.cssVariables : compileThemeTokensToCssVariables({});
  const rules = Object.entries(cssVariables)
    .filter(([key, value]) => /^--[a-z0-9-]+$/.test(key) && value)
    .map(([key, value]) => `${key}: ${toSafeCss(value)};`)
    .join(" ");

  const layoutRuntime = themeRuntime?.layoutRuntime ?? DEFAULT_THEME_LAYOUT_RUNTIME;

  return (
    <Fragment>
      <meta
        id="theme-layout-runtime"
        data-theme-layout-runtime={JSON.stringify(layoutRuntime)}
        data-theme-layout-source={themeRuntime ? "active-theme" : "default"}
      />
      {rules ? <style id="theme-injector" dangerouslySetInnerHTML={{ __html: `:root { ${rules} }` }} /> : null}
    </Fragment>
  );
}
