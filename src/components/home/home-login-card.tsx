"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { signInAction } from "@/actions/auth-actions";
import { TestAccountHint } from "@/app/(auth)/login/TestAccountHint";

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
  const [state, formAction, isPending] = useActionState(signInAction, {});
  const error = state.error;
  const copy = useMemo(() => roleCopy[roleIntent], [roleIntent]);

  return (
    <div className="w-full max-w-[28rem] justify-self-center rounded-xl border border-surface-container bg-surface-container-lowest p-8 shadow-[0_8px_32px_rgba(44,47,49,0.06)] lg:justify-self-start lg:pl-8">
      <div className="mb-8 text-center">
        <h2 className="mb-2 text-[1.75rem] font-bold text-on-surface">欢迎回来</h2>
        <p className="text-[1rem] text-on-surface-variant">请选择教师或学生入口继续登录</p>
      </div>

      <div className="mb-3 flex rounded-lg bg-surface-container-low p-1">
        {(["teacher", "student"] as const).map((role) => {
          const active = roleIntent === role;

          return (
            <button
              key={role}
              type="button"
              onClick={() => setRoleIntent(role)}
              className={
                active
                  ? "flex-1 rounded-md bg-surface-container-lowest py-2 text-center text-sm font-medium text-primary shadow-sm transition-colors"
                  : "flex-1 rounded-md py-2 text-center text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface"
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

        <div>
          <label className="mb-1 block text-sm font-medium text-on-surface-variant" htmlFor="home-email">
            邮箱地址
          </label>
          <input
            id="home-email"
            name="email"
            type="email"
            required
            className="w-full rounded-lg border-transparent bg-surface-container-low px-4 py-3 text-on-surface transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
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
            className="w-full rounded-lg border-transparent bg-surface-container-low px-4 py-3 text-on-surface transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="••••••••"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2">
            <input className="rounded border-outline-variant bg-surface-container-low text-primary focus:ring-primary" type="checkbox" />
            <span className="text-sm font-medium text-on-surface-variant">记住我</span>
          </label>
          <Link href="#" className="text-sm font-medium text-primary transition-colors hover:text-primary-container">
            忘记密码？
          </Link>
        </div>

        <button
          className="flex w-full items-center justify-center rounded-full bg-gradient-to-r from-primary to-primary-container py-3 font-medium text-on-primary transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-70"
          type="submit"
          disabled={isPending}
        >
          {isPending ? "登录中..." : copy.submit}
        </button>
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
