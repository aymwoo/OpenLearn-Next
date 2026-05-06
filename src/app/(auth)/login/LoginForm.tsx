"use client";

import { useActionState } from "react";

import { signInAction } from "@/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { TestAccountHint } from "./TestAccountHint";

type LoginFormProps = {
  initialError?: string;
};

export function LoginForm({ initialError }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(signInAction, {
    error: initialError,
  });
  const error = state.error;
  const inputClassName =
    "rounded-full bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/70 focus:bg-surface-container-lowest focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary/20";

  return (
    <>
      {error && (
        <p className="mt-6 rounded-[var(--radius-card)] bg-error-container px-4 py-3 text-sm font-medium text-on-error-container">
          {error}
        </p>
      )}
      <form action={formAction} className="mt-8 grid gap-4">
        <div className="grid gap-2">
          <label htmlFor="email" className="text-sm font-medium text-on-surface">
            邮箱
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            className={inputClassName}
          />
        </div>
        <div className="grid gap-2">
          <label
            htmlFor="password"
            className="text-sm font-medium text-on-surface"
          >
            密码
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className={inputClassName}
          />
        </div>
        <Button
          type="submit"
          disabled={isPending}
          className="mt-4 min-h-12 w-full px-6 text-base disabled:opacity-70"
        >
          {isPending ? "登录中..." : "登录"}
        </Button>
      </form>
      <TestAccountHint />
    </>
  );
}
