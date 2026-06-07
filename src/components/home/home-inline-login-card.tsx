"use client"

import { useActionState, useState } from 'react'

import { signInAction } from '@/actions/auth-actions'

type RoleIntent = 'teacher' | 'student'

const roleTabs = [
  { label: '学生登录', value: 'student' },
  { label: '教师登录', value: 'teacher' },
] as const

const quickFillAccounts = [
  {
    label: '一键填入学生测试账号',
    description: 'student@example.com / password',
    roleIntent: 'student' as const,
    email: 'student@example.com',
    password: 'password',
  },
  {
    label: '一键填入教师测试账号',
    description: 'teacher@example.com / password',
    roleIntent: 'teacher' as const,
    email: 'teacher@example.com',
    password: 'password',
  },
] as const

export function HomeInlineLoginCard() {
  const [roleIntent, setRoleIntent] = useState<RoleIntent>('student')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [state, formAction, isPending] = useActionState(signInAction, {})

  function fillQuickAccount(nextAccount: (typeof quickFillAccounts)[number]) {
    setRoleIntent(nextAccount.roleIntent)
    setEmail(nextAccount.email)
    setPassword(nextAccount.password)
  }

  return (
    <section className="rounded-[2rem] bg-white/8 p-2 shadow-[0_30px_90px_rgba(2,6,23,0.32)] ring-1 ring-white/10 backdrop-blur-2xl">
      <div className="rounded-[1.6rem] bg-[#0b1728]/92 px-6 py-6 text-white sm:px-7 sm:py-7">
        <p className="text-sm text-white/56">统一入口</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">进入你的课堂现场</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">直接在首页选择学生或教师身份登录，并可一键填入测试账号继续调试。</p>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-[1.15rem] bg-white/6 p-1">
          {roleTabs.map((role) => {
            const active = roleIntent === role.value
            return (
              <button
                key={role.value}
                type="button"
                aria-pressed={active}
                onClick={() => setRoleIntent(role.value)}
                className={active
                  ? 'rounded-[0.95rem] bg-white px-4 py-3 text-sm font-medium text-slate-950 shadow-[0_12px_30px_rgba(255,255,255,0.16)]'
                  : 'rounded-[0.95rem] px-4 py-3 text-sm font-medium text-white/64 transition hover:bg-white/8 hover:text-white'}
              >
                {role.label}
              </button>
            )
          })}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {quickFillAccounts.map((account) => (
            <button
              key={account.label}
              type="button"
              aria-label={account.label}
              onClick={() => fillQuickAccount(account)}
              className="rounded-[1.1rem] border border-white/10 bg-white/6 px-4 py-3 text-left transition hover:bg-white/10 hover:border-white/14"
            >
              <div className="text-sm font-medium text-white">{account.label}</div>
              <div className="mt-1 text-[0.78rem] leading-5 text-slate-300">{account.description}</div>
            </button>
          ))}
        </div>

        {state.error ? (
          <p className="mt-4 rounded-[1.1rem] bg-rose-400/14 px-4 py-3 text-sm font-medium text-rose-100 ring-1 ring-rose-200/10">
            {state.error}
          </p>
        ) : null}

        <form action={formAction} className="mt-6 space-y-4">
          <input type="hidden" name="roleIntent" value={roleIntent} />

          <div>
            <label className="mb-2 block text-[0.75rem] font-medium uppercase tracking-[0.18em] text-white/46" htmlFor="home-inline-email">
              {roleIntent === 'student' ? '学号' : '邮箱地址'}
            </label>
            <input
              id="home-inline-email"
              name="email"
              type="text"
              autoComplete={roleIntent === 'student' ? 'username' : 'email'}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-[1.15rem] bg-white/6 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/32 focus:bg-white/10 focus:ring-2 focus:ring-cyan-300/30"
              placeholder={roleIntent === 'student' ? '请输入学号' : 'teacher@openlearn.dev'}
            />
          </div>

          <div>
            <label className="mb-2 block text-[0.75rem] font-medium uppercase tracking-[0.18em] text-white/46" htmlFor="home-inline-password">
              密码
            </label>
            <input
              id="home-inline-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-[1.15rem] bg-white/6 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/32 focus:bg-white/10 focus:ring-2 focus:ring-cyan-300/30"
              placeholder="••••••••"
            />
          </div>

          <button
            className="flex w-full items-center justify-center rounded-full bg-linear-to-r from-[#7c3aed] via-[#2563eb] to-[#2dd4bf] px-6 py-3 text-sm font-semibold text-white shadow-[0_24px_56px_rgba(37,99,235,0.32)] transition hover:scale-[1.01] disabled:opacity-70"
            type="submit"
            disabled={isPending}
          >
            {isPending ? '登录中...' : '进入控制台'}
          </button>
        </form>
      </div>
    </section>
  )
}
