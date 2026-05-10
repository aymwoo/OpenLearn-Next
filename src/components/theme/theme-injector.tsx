import { Fragment } from "react";

import { getCurrentActorThemeRuntimeState } from "@/lib/dal/themes";
import { compileThemeTokensToCssVariables } from "@/server/themes/tokens";

function toSafeCss(value: string) {
  return value.replace(/[<>{};]/g, "").trim();
}

export async function ThemeInjector() {
  const { layoutRuntime, themeRuntime, themeSource } = await getCurrentActorThemeRuntimeState();
  const cssVariables = themeRuntime ? themeRuntime.cssVariables : compileThemeTokensToCssVariables({});
  const rules = Object.entries(cssVariables)
    .filter(([key, value]) => /^--[a-z0-9-]+$/.test(key) && value)
    .map(([key, value]) => `${key}: ${toSafeCss(value)};`)
    .join(" ");

  return (
    <Fragment>
      <meta
        id="theme-layout-runtime"
        data-theme-layout-runtime={JSON.stringify(layoutRuntime)}
        data-theme-layout-source={themeSource}
      />
      {rules ? <style id="theme-injector" dangerouslySetInnerHTML={{ __html: `:root { ${rules} }` }} /> : null}
    </Fragment>
  );
}
