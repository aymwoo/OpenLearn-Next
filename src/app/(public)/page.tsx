import { HomeInlineLoginPanel } from '@/components/home/home-inline-login-panel'

function DevHomeFallback() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07111f] px-6 py-12 text-white md:px-10 lg:px-14">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(129,140,248,0.24),_transparent_28%),radial-gradient(circle_at_80%_18%,_rgba(45,212,191,0.22),_transparent_24%),radial-gradient(circle_at_50%_100%,_rgba(59,130,246,0.18),_transparent_40%)]" />
      <div className="absolute left-[-12rem] top-28 h-80 w-80 rounded-full bg-[#7c3aed]/18 blur-3xl" />
      <div className="absolute right-[-8rem] top-10 h-72 w-72 rounded-full bg-[#22d3ee]/18 blur-3xl" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1520px] flex-col gap-8">
        <nav className="rounded-full bg-white/8 px-5 py-4 shadow-[0_20px_60px_rgba(2,6,23,0.24)] ring-1 ring-white/10 backdrop-blur-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <a href="/" className="text-lg font-semibold tracking-[-0.04em] text-white">
              OpenLearn Next
            </a>
            <a
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white/90"
            >
              前往登录
            </a>
          </div>
        </nav>

        <section className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_420px] xl:items-start">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/8 px-4 py-2 text-sm text-white/78 ring-1 ring-white/10 backdrop-blur-xl">
              Dev Fast Path
            </div>
            <div className="space-y-5">
              <p className="text-sm font-medium uppercase tracking-[0.32em] text-cyan-200/80">AI-native Learning Stage</p>
              <h1 className="max-w-[52rem] text-[3.2rem] font-semibold leading-[0.96] tracking-[-0.06em] text-white sm:text-[4rem] lg:text-[5.6rem]">
                把课堂从平面流程
                <span className="block text-white/55">升级成有节奏的学习现场</span>
              </h1>
              <p className="max-w-[44rem] text-base leading-8 text-slate-300 sm:text-lg">
                开发环境使用轻量首页壳层，保留品牌氛围与关键信息，但避免完整营销首页首编拖慢本地启动。完整首页实现仍保留在代码中，可在非开发环境继续使用。
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <article className="rounded-[1.9rem] bg-white/6 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.18)] ring-1 ring-white/8 backdrop-blur-xl">
                <p className="text-sm text-white/58">课堂节奏</p>
                <p className="mt-3 text-xl font-semibold tracking-[-0.03em] text-white">导入、互动、练习、总结一体编排</p>
              </article>
              <article className="rounded-[1.9rem] bg-white/6 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.18)] ring-1 ring-white/8 backdrop-blur-xl">
                <p className="text-sm text-white/58">师生协同</p>
                <p className="mt-3 text-xl font-semibold tracking-[-0.03em] text-white">教师广播课堂进度，学生跟随或自由浏览</p>
              </article>
              <article className="rounded-[1.9rem] bg-white/6 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.18)] ring-1 ring-white/8 backdrop-blur-xl">
                <p className="text-sm text-white/58">AI 助教</p>
                <p className="mt-3 text-xl font-semibold tracking-[-0.03em] text-white">教案、练习、反馈与资源协同产出</p>
              </article>
            </div>
          </div>

          <div className="xl:pt-0">
            <HomeInlineLoginPanel />
          </div>
        </section>
      </div>
    </main>
  )
}

export default async function HomePage() {
  if (process.env.NODE_ENV === 'development') {
    return <DevHomeFallback />
  }

  const { HomeSurface } = await import('@/components/surfaces/home-surface')
  return <HomeSurface />
}
