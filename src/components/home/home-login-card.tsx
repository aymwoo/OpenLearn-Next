"use client"

import Link from 'next/link'
import { LockKeyhole, Sparkles, UserRound } from 'lucide-react'
import { useActionState, useState } from 'react'
import { signInAction } from '@/actions/auth-actions'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type RoleIntent = 'teacher' | 'student'

const roleTabs = [
  { label: '学生登录', value: 'student' },
  { label: '教师登录', value: 'teacher' },
] as const

export function HomeLoginCard() {
  const [roleIntent, setRoleIntent] = useState<RoleIntent>('student')
  const [rememberMe, setRememberMe] = useState(false)
  const [state, formAction, isPending] = useActionState(signInAction, {})
  const error = state.error

  return (
    <div className="rounded-[2rem] bg-white/8 p-2 shadow-[0_30px_90px_rgba(2,6,23,0.32)] ring-1 ring-white/10 backdrop-blur-2xl">
      <div className="rounded-[1.6rem] bg-[#0b1728]/92 px-6 py-6 text-white sm:px-7 sm:py-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-white/56">统一入口</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">进入你的课堂现场</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">选择角色后即可继续处理课程、课堂与学习进度。</p>
          </div>
          <div className="flex size-11 items-center justify-center rounded-full bg-linear-to-br from-fuchsia-400/30 via-blue-400/30 to-cyan-300/25 text-cyan-100">
            <Sparkles className="size-5" aria-hidden />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-[1.15rem] bg-white/6 p-1">
          {roleTabs.map((role) => {
            const active = roleIntent === role.value

            return (
              <button
                key={role.value}
                type="button"
                aria-pressed={active}
                onClick={() => setRoleIntent(role.value)}
                className={cn(
                  'rounded-[0.95rem] px-4 py-3 text-sm font-medium transition',
                  active
                    ? 'bg-white text-slate-950 shadow-[0_12px_30px_rgba(255,255,255,0.16)]'
                    : 'text-white/64 hover:bg-white/8 hover:text-white',
                )}
              >
                {role.label}
              </button>
            )
          })}
        </div>

        {error ? (
          <p className="mt-4 rounded-[1.1rem] bg-rose-400/14 px-4 py-3 text-sm font-medium text-rose-100 ring-1 ring-rose-200/10">
            {error}
          </p>
        ) : null}

        <form action={formAction} className="mt-6 space-y-4">
          <input type="hidden" name="roleIntent" value={roleIntent} />
          <input type="hidden" name="rememberMe" value={rememberMe ? 'true' : 'false'} />

          <div>
            <label className="mb-2 block text-[0.75rem] font-medium uppercase tracking-[0.18em] text-white/46" htmlFor="home-email">
              {roleIntent === 'student' ? '学号' : '邮箱地址'}
            </label>
            <div className="rounded-[1.15rem] bg-white/6 px-4 py-3 transition focus-within:bg-white/10 focus-within:ring-2 focus-within:ring-cyan-300/30">
              <div className="flex items-center gap-3">
                <UserRound className="size-4 text-white/42" aria-hidden />
                <input
                  id="home-email"
                  name="email"
                  type="text"
                  autoComplete={roleIntent === 'student' ? 'username' : 'email'}
                  required
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/32"
                  placeholder={roleIntent === 'student' ? '请输入学号' : 'teacher@openlearn.dev'}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[0.75rem] font-medium uppercase tracking-[0.18em] text-white/46" htmlFor="home-password">
              密码
            </label>
            <div className="rounded-[1.15rem] bg-white/6 px-4 py-3 transition focus-within:bg-white/10 focus-within:ring-2 focus-within:ring-cyan-300/30">
              <div className="flex items-center gap-3">
                <LockKeyhole className="size-4 text-white/42" aria-hidden />
                <input
                  id="home-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/32"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 text-[0.78rem] text-slate-300">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="size-4 rounded border-white/10 bg-white/6 accent-cyan-300"
              />
              <span>保持登录状态</span>
            </label>
            <Link href="#" className="text-cyan-200 transition hover:text-cyan-100">
              忘记密码？
            </Link>
          </div>

          <Button
            className="flex w-full items-center justify-center bg-linear-to-r from-[#7c3aed] via-[#2563eb] to-[#2dd4bf] py-3 font-medium text-white shadow-[0_24px_56px_rgba(37,99,235,0.32)] hover:shadow-[0_28px_64px_rgba(37,99,235,0.4)] disabled:opacity-70"
            type="submit"
            disabled={isPending}
          >
            {isPending ? '登录中...' : '进入控制台'}
          </Button>
        </form>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.1rem] bg-white/6 px-4 py-3">
            <p className="text-[0.72rem] uppercase tracking-[0.18em] text-white/40">Teacher</p>
            <p className="mt-2 text-sm text-slate-300">进入课程编排、课堂广播与作业反馈工作区。</p>
          </div>
          <div className="rounded-[1.1rem] bg-white/6 px-4 py-3">
            <p className="text-[0.72rem] uppercase tracking-[0.18em] text-white/40">Student</p>
            <p className="mt-2 text-sm text-slate-300">继续你的学习步骤、随堂练习与课堂回放。</p>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-slate-300">
          还没有账户？{' '}
          <Link href="#" className="font-medium text-cyan-200 transition hover:text-cyan-100">
            申请试用
          </Link>
        </div>
      </div>
    </div>
  )
}
