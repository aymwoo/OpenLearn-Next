"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type ToastTone = "success" | "error";

type ToastOptions = {
  title: string;
  description?: string;
  duration?: number;
  tone?: ToastTone;
};

type ToastRecord = Required<Pick<ToastOptions, "title" | "duration">> & {
  id: number;
  description?: string;
  tone: ToastTone;
};

type ToastContextValue = {
  toast: (options: ToastOptions) => void;
  success: (title: string, options?: Omit<ToastOptions, "title" | "tone">) => void;
  error: (title: string, options?: Omit<ToastOptions, "title" | "tone">) => void;
};

const TOAST_DURATION_MS = 3200;

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextIdRef = useRef(0);
  const timeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    const timeoutId = timeoutsRef.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutsRef.current.delete(id);
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, duration = TOAST_DURATION_MS, tone = "success" }: ToastOptions) => {
      const id = nextIdRef.current + 1;
      nextIdRef.current = id;

      setToasts((current) => [...current, { id, title, description, duration, tone }].slice(-3));

      const timeoutId = setTimeout(() => {
        dismiss(id);
      }, duration);
      timeoutsRef.current.set(id, timeoutId);
    },
    [dismiss],
  );

  useEffect(() => {
    return () => {
      for (const timeoutId of timeoutsRef.current.values()) {
        clearTimeout(timeoutId);
      }
      timeoutsRef.current.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, options) => toast({ title, ...options, tone: "success" }),
      error: (title, options) => toast({ title, ...options, tone: "error" }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3" aria-live="polite" aria-atomic="true">
        {toasts.map((item) => (
          <ToastCard key={item.id} toast={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}

function ToastCard({ toast, onDismiss }: { toast: ToastRecord; onDismiss: (id: number) => void }) {
  const isSuccess = toast.tone === "success";

  return (
    <section
      role="status"
      className={cn(
        "pointer-events-auto rounded-[1.75rem] border border-white/40 px-4 py-3 shadow-[0_20px_50px_rgba(44,47,49,0.12)] backdrop-blur-md",
        isSuccess ? "bg-surface-container-lowest/95 text-on-surface" : "bg-error-container/95 text-on-error-container",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 grid size-9 shrink-0 place-items-center rounded-full",
            isSuccess ? "bg-primary/12 text-primary" : "bg-on-error-container/12 text-on-error-container",
          )}
        >
          {isSuccess ? <CheckCircle2 className="size-4.5" aria-hidden /> : <AlertCircle className="size-4.5" aria-hidden />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{toast.title}</p>
          {toast.description ? <p className={cn("mt-1 text-sm", isSuccess ? "text-on-surface-variant" : "text-on-error-container/85")}>{toast.description}</p> : null}
        </div>

        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-full transition-colors",
            isSuccess ? "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface" : "hover:bg-black/10",
          )}
          aria-label="关闭提示"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}
