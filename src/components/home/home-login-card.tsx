"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signInAction } from "@/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RoleIntent = "teacher" | "student";

const roleTabs = [
  { label: "学生登录", value: "student" },
  { label: "教师登录", value: "teacher" },
] as const;

export function HomeLoginCard() {
  const [roleIntent, setRoleIntent] = useState<RoleIntent>("student");
  const [rememberMe, setRememberMe] = useState(false);
  const [state, formAction, isPending] = useActionState(signInAction, {});
  const error = state.error;

  return (
    <div className="rounded-[0.75rem] bg-surface-container-lowest p-8 shadow-[0_8px_32px_rgba(44,47,49,0.06)]">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-on-surface">欢迎回来</h2>
        <p className="mt-2 text-sm text-on-surface-variant">请登录您的账户继续学习</p>
      </div>

      <div className="mb-6 flex rounded-[0.5rem] bg-surface-container-low p-1">
        {roleTabs.map((role) => {
          const active = roleIntent === role.value;

          return (
            <button
              key={role.value}
              type="button"
              aria-pressed={active}
              onClick={() => setRoleIntent(role.value)}
              className={cn(
                "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-surface-container-lowest text-primary shadow-[0_2px_10px_rgba(44,47,49,0.08)]"
                  : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              {role.label}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-error-container px-4 py-3 text-sm font-medium text-on-error-container">
          {error}
        </p>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="roleIntent" value={roleIntent} />
        <input type="hidden" name="rememberMe" value={rememberMe ? "true" : "false"} />

        <div>
          <label className="mb-1 block text-[0.75rem] font-medium text-on-surface-variant" htmlFor="home-email">
            邮箱地址
          </label>
          <input
            id="home-email"
            name="email"
            type="email"
            required
            className="w-full rounded-lg bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/70 focus:bg-surface-container-lowest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/20"
            placeholder="请输入邮箱地址"
          />
        </div>

        <div>
          <label className="mb-1 block text-[0.75rem] font-medium text-on-surface-variant" htmlFor="home-password">
            密码
          </label>
          <input
            id="home-password"
            name="password"
            type="password"
            required
            className="w-full rounded-lg bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/70 focus:bg-surface-container-lowest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/20"
            placeholder="••••••••"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-[0.75rem] text-on-surface-variant">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="size-4 rounded border border-outline-variant bg-surface-container-low text-primary"
            />
            <span>记住我</span>
          </label>
          <Link href="#" className="text-[0.75rem] text-primary transition-colors hover:text-primary-container">
            忘记密码？
          </Link>
        </div>

        <Button
          className="flex w-full items-center justify-center py-3 font-medium disabled:opacity-70"
          type="submit"
          disabled={isPending}
        >
          {isPending ? "登录中..." : "登录账户"}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-on-surface-variant">
          还没有账户？ <Link href="#" className="font-medium text-primary hover:underline">立即注册</Link>
        </p>
      </div>
    </div>
  );
}
