"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { signInAction } from "@/actions/auth-actions";
import { TestAccountHint } from "@/app/(auth)/login/TestAccountHint";
import { Button } from "@/components/ui/button";
import {
  ghostTextFieldClassName,
  ghostToggleClassName,
} from "@/components/ui/ghost-field";
import { cn } from "@/lib/utils";

type RoleIntent = "teacher" | "student";

const roleCopy: Record<RoleIntent, { tab: string; submit: string; helper: string }> = {
  teacher: {
    tab: "教师登录",
    submit: "登录教师工作台",
    helper: "登录后进入教师工作台与备课入口",
  },
  student: {
    tab: "学生登录",
    submit: "登录学生学习台",
    helper: "登录后进入学生学习与课堂入口",
  },
};

export function HomeLoginCard() {
  const [roleIntent, setRoleIntent] = useState<RoleIntent>("teacher");
  const [rememberMe, setRememberMe] = useState(false);
  const [state, formAction, isPending] = useActionState(signInAction, {});
  const error = state.error;
  const copy = useMemo(() => roleCopy[roleIntent], [roleIntent]);

  return (
    <div className="w-full max-w-[28rem] justify-self-center rounded-[2rem] bg-surface-container-lowest p-8 shadow-ambient lg:justify-self-start lg:pl-8">
      <div className="mb-8 text-center">
        <h2 className="mb-2 text-[1.75rem] font-bold text-on-surface">欢迎回来</h2>
        <p className="text-[1rem] text-on-surface-variant">请选择教师或学生入口继续登录</p>
      </div>

      <div className="mb-3 flex rounded-full bg-surface-container-low p-1.5">
        {(["teacher", "student"] as const).map((role) => {
          const active = roleIntent === role;

          return (
            <button
              key={role}
              type="button"
              onClick={() => setRoleIntent(role)}
              className={
                active
                  ? "flex-1 rounded-full bg-surface-container-lowest py-2.5 text-center text-sm font-medium text-primary shadow-ambient transition-colors"
                  : "flex-1 rounded-full py-2.5 text-center text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface"
              }
            >
              {roleCopy[role].tab}
            </button>
          );
        })}
      </div>

      <p className="mb-6 text-center text-sm text-on-surface-variant">{copy.helper}</p>

      {error && (
        <p className="mb-4 rounded-xl bg-error-container px-4 py-3 text-sm font-medium text-on-error-container">
          {error}
        </p>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="roleIntent" value={roleIntent} />
        <input type="hidden" name="rememberMe" value={rememberMe ? "true" : "false"} />

        <div>
          <label className="mb-1 block text-sm font-medium text-on-surface-variant" htmlFor="home-email">
            邮箱地址
          </label>
          <input
            id="home-email"
            name="email"
            type="email"
            required
            className={ghostTextFieldClassName}
            placeholder="name@example.com"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-on-surface-variant" htmlFor="home-password">
            密码
          </label>
          <input
            id="home-password"
            name="password"
            type="password"
            required
            className={ghostTextFieldClassName}
            placeholder="••••••••"
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-pressed={rememberMe}
            onClick={() => setRememberMe((value) => !value)}
            className={cn(ghostToggleClassName, rememberMe && "text-primary")}
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-6 items-center justify-center rounded-full bg-surface-container-high text-xs font-semibold text-on-surface-variant transition-colors",
                rememberMe && "bg-primary text-on-primary",
              )}
            >
              {rememberMe ? "✓" : "记"}
            </span>
            <span>记住我</span>
          </button>
          <Link href="#" className="text-sm font-medium text-primary transition-colors hover:text-primary-container">
            忘记密码？
          </Link>
        </div>

        <Button
          className="flex w-full items-center justify-center py-3 font-medium disabled:opacity-70"
          type="submit"
          disabled={isPending}
        >
          {isPending ? "登录中..." : copy.submit}
        </Button>
      </form>

      <TestAccountHint
        roleIntent={roleIntent}
        emailInputId="home-email"
        passwordInputId="home-password"
      />

      <div className="mt-6 text-center">
        <p className="text-[1rem] text-sm text-on-surface-variant">
          还没有账户？ <Link href="#" className="font-medium text-primary hover:underline">立即注册</Link>
        </p>
      </div>
    </div>
  );
}
