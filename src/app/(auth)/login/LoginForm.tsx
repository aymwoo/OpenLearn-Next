"use client";

import { useActionState } from "react";

import { signInAction } from "@/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { ghostTextFieldClassName } from "@/components/ui/ghost-field";
import { TestAccountHint } from "./TestAccountHint";

type RoleIntent = "teacher" | "student";

type LoginFormProps = {
  initialError?: string;
  roleIntent?: RoleIntent;
};

const roleCopy: Record<RoleIntent, { submit: string; helper: string }> = {
  student: {
    submit: "登录学生学习台",
    helper: "默认学生入口，登录后会直接进入学生首页。",
  },
  teacher: {
    submit: "登录教师工作台",
    helper: "教师入口会保留角色语义，登录后直接进入教师首页。",
  },
};

export function LoginForm({ initialError, roleIntent = "student" }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(signInAction, {
    error: initialError,
  });
  const error = state.error;
  const copy = roleCopy[roleIntent];

  return (
    <>
      {error && (
        <p className="mt-6 rounded-[var(--radius-card)] bg-error-container px-4 py-3 text-sm font-medium text-on-error-container">
          {error}
        </p>
      )}
      <form action={formAction} className="mt-8 grid gap-4">
        <input type="hidden" name="roleIntent" value={roleIntent} />
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
            className={ghostTextFieldClassName}
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
            className={ghostTextFieldClassName}
          />
        </div>
        <p className="text-sm leading-6 text-on-surface-variant">{copy.helper}</p>
        <Button
          type="submit"
          disabled={isPending}
          className="mt-4 min-h-12 w-full px-6 text-base disabled:opacity-70"
        >
          {isPending ? "登录中..." : copy.submit}
        </Button>
      </form>
      <TestAccountHint roleIntent={roleIntent} />
    </>
  );
}
