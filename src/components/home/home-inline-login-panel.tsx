"use client"

import dynamic from 'next/dynamic'

const HomeLoginCard = dynamic(
  () => import('@/components/home/home-inline-login-card').then((module) => module.HomeInlineLoginCard),
  {
    ssr: false,
    loading: () => (
      <section className="rounded-[2rem] bg-white/8 p-2 shadow-[0_30px_90px_rgba(2,6,23,0.32)] ring-1 ring-white/10 backdrop-blur-2xl xl:pt-0">
        <div className="rounded-[1.6rem] bg-[#0b1728]/92 px-6 py-6 text-white sm:px-7 sm:py-7">
          <p className="text-sm text-white/56">统一入口</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">进入你的课堂现场</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">登录表单加载中，稍后可直接在首页选择学生或教师身份登录。</p>
          <div className="mt-6 grid grid-cols-2 gap-2 rounded-[1.15rem] bg-white/6 p-1">
            <div className="rounded-[0.95rem] bg-white px-4 py-3 text-sm font-medium text-slate-950 shadow-[0_12px_30px_rgba(255,255,255,0.16)]">学生登录</div>
            <div className="rounded-[0.95rem] px-4 py-3 text-sm font-medium text-white/64">教师登录</div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-[1.1rem] border border-white/10 bg-white/6 px-4 py-3 text-left">
              <div className="text-sm font-medium text-white">一键填入学生测试账号</div>
              <div className="mt-1 text-[0.78rem] leading-5 text-slate-300">student@example.com / password</div>
            </div>
            <div className="rounded-[1.1rem] border border-white/10 bg-white/6 px-4 py-3 text-left">
              <div className="text-sm font-medium text-white">一键填入教师测试账号</div>
              <div className="mt-1 text-[0.78rem] leading-5 text-slate-300">teacher@example.com / password</div>
            </div>
          </div>
        </div>
      </section>
    ),
  },
)

export function HomeInlineLoginPanel() {
  return <HomeLoginCard />
}
