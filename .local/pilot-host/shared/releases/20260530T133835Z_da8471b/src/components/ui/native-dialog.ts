import { useCallback, type MouseEvent, type RefObject } from "react";
import type { ClassValue } from "clsx";

import { cn } from "@/lib/utils";

export const nativeDialogWidths = {
  sm: "w-[min(28rem,calc(100vw-2rem))]",
  md: "w-[min(32rem,calc(100vw-2rem))]",
  lg: "w-[min(36rem,calc(100vw-2rem))]",
  xl: "w-[min(48rem,calc(100vw-2rem))]",
  "2xl": "w-[min(72rem,calc(100vw-2rem))]",
} as const;

export type NativeDialogWidth = keyof typeof nativeDialogWidths;

export function getNativeDialogClassName(width: NativeDialogWidth, ...classNames: ClassValue[]) {
  return cn(
    "m-auto border-none rounded-[var(--radius-shell)] bg-surface-container-lowest p-0 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm",
    nativeDialogWidths[width],
    ...classNames,
  );
}

export function isNativeDialogBackdropClick(event: MouseEvent<HTMLDialogElement>, dialog: HTMLDialogElement | null) {
  return event.target === dialog;
}

export function useNativeDialogBackdropClose(
  dialogRef: RefObject<HTMLDialogElement | null>,
  onClose: () => void,
) {
  return useCallback(
    (event: MouseEvent<HTMLDialogElement>) => {
      if (isNativeDialogBackdropClick(event, dialogRef.current)) {
        onClose();
      }
    },
    [dialogRef, onClose],
  );
}
