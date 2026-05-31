import { describe, expect, it } from "vitest";

import { getNativeDialogClassName, isNativeDialogBackdropClick } from "./native-dialog";

type BackdropClickEvent = Parameters<typeof isNativeDialogBackdropClick>[0];

describe("getNativeDialogClassName", () => {
  it("merges the shared shell with the selected width token", () => {
    const className = getNativeDialogClassName("lg", "min-w-[20rem]", "open:zoom-in-95");

    expect(className).toContain("m-auto");
    expect(className).toContain("border-none");
    expect(className).toContain("w-[min(36rem,calc(100vw-2rem))]");
    expect(className).toContain("min-w-[20rem]");
    expect(className).toContain("open:zoom-in-95");
  });

  it("only treats the dialog element itself as a backdrop click", () => {
    const dialog = {} as HTMLDialogElement;
    const innerElement = {};
    const dialogEvent = { target: dialog } as unknown as BackdropClickEvent;
    const innerEvent = { target: innerElement } as unknown as BackdropClickEvent;

    expect(isNativeDialogBackdropClick(dialogEvent, dialog)).toBe(true);
    expect(isNativeDialogBackdropClick(innerEvent, dialog)).toBe(false);
  });
});
