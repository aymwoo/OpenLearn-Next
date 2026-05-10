import Link from 'next/link'
import { ArrowRight, Orbit, Sparkles, Timer, Users2, Waypoints } from 'lucide-react'
import { HomeLoginCard } from '@/components/home/home-login-card'
import { surfaceWidths } from '@/components/surfaces/surface-widths'

const navItems = ['场景课堂', '学习节奏', '教师工作台', 'AI 协作'] as const

const featureCards = [
  {
    title: '节奏驱动',
    description: '把导入、讲授、互动、练习与总结编排成有张力的课堂舞台。',
    icon: Orbit,
  },
  {
    title: '师生共屏',
    description: '教师控制课堂进度，学生端实时跟随或切换到自由探索模式。',
    icon: Users2,
  },
  {
    title: 'Agent 协作',
    description: '让教案、题目、反馈与资源推荐从单点生成变成协同产出。',
    icon: Sparkles,
  },
] as const

const learningRhythms = [
  { label: '课堂启动', detail: '3 分钟完成导入、分组与目标投屏', icon: Timer },
  { label: '路径编排', detail: '按教学意图组合步骤，不再被固定模板束缚', icon: Waypoints },
] as const

export function HomeSurface() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07111f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(129,140,248,0.24),_transparent_28%),radial-gradient(circle_at_80%_18%,_rgba(45,212,191,0.22),_transparent_24%),radial-gradient(circle_at_50%_100%,_rgba(59,130,246,0.18),_transparent_40%)]" />
      <div className="absolute left-[-12rem] top-28 h-80 w-80 rounded-full bg-[#7c3aed]/18 blur-3xl" />
      <div className="absolute right-[-8rem] top-10 h-72 w-72 rounded-full bg-[#22d3ee]/18 blur-3xl" />

      <div className={`relative z-10 ${surfaceWidths.publicShell} flex flex-col px-6 pb-12 pt-6 md:px-10 lg:px-14`}>
        <nav className="rounded-full bg-white/8 px-5 py-4 shadow-[0_20px_60px_rgba(2,6,23,0.24)] ring-1 ring-white/10 backdrop-blur-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full bg-linear-to-br from-[#8b5cf6] via-[#3b82f6] to-[#2dd4bf] text-sm font-semibold text-white shadow-[0_12px_30px_rgba(59,130,246,0.3)]">
                OL
              </div>
              <div>
                <p className="text-sm text-white/60">OpenLearn Next</p>
                <p className="text-base font-semibold tracking-[-0.03em] text-white">未来课堂操作系统</p>
              </div>
            </div>

            <div className="hidden items-center gap-6 lg:flex">
              {navItems.map((item) => (
                <a key={item} href="#" className="text-sm text-white/72 transition-colors hover:text-white">
                  {item}
                </a>
              ))}
            </div>

            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white/90"
            >
              进入系统
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </nav>

        <section className="grid flex-1 gap-8 py-8 lg:py-12 xl:grid-cols-[minmax(0,1.2fr)_420px] xl:items-start">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/8 px-4 py-2 text-sm text-white/78 ring-1 ring-white/10 backdrop-blur-xl">
              <Sparkles className="size-4 text-cyan-300" aria-hidden />
              重新定义课堂的空间感、节奏感与协作方式
            </div>

            <div className="space-y-5">
              <p className="text-sm font-medium uppercase tracking-[0.32em] text-cyan-200/80">AI-native Learning Stage</p>
              <h1 className={`${surfaceWidths.heroTitle} text-[3.2rem] font-semibold leading-[0.96] tracking-[-0.06em] text-white sm:text-[4rem] lg:text-[5.6rem]`}>
                把课堂从平面流程
                <span className="block text-white/55">升级成有节奏的学习现场</span>
              </h1>
              <p className={`${surfaceWidths.heroBody} text-base leading-8 text-slate-300 sm:text-lg`}>
                这不是传统教育后台的浅色仪表盘，而是一套更像导演台的学习操作系统。教师编排课堂，学生跟随节奏，AI 团队持续补位，让每一节课都像一次被精心设计的现场体验。
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-linear-to-r from-[#7c3aed] via-[#2563eb] to-[#2dd4bf] px-6 py-3 text-sm font-semibold text-white shadow-[0_24px_70px_rgba(37,99,235,0.32)] transition hover:scale-[1.01]"
              >
                立即进入体验
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <p className="text-sm text-white/62">适合教师、学生与教学管理者同时在线协作</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_280px]">
              <div className="overflow-hidden rounded-[2rem] bg-white/8 p-6 shadow-[0_28px_80px_rgba(2,6,23,0.3)] ring-1 ring-white/10 backdrop-blur-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-white/58">实时课堂画布</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">一个老师视角，驱动全班学习节奏</h2>
                  </div>
                  <div className="rounded-full bg-cyan-300/12 p-3 text-cyan-200">
                    <Orbit className="size-5" aria-hidden />
                  </div>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.5rem] bg-[#09192f] p-4">
                    <p className="text-[0.7rem] uppercase tracking-[0.22em] text-white/42">课堂进度</p>
                    <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">08</p>
                    <p className="mt-2 text-sm text-slate-400">导入到总结共 8 个原子步骤</p>
                  </div>
                  <div className="rounded-[1.5rem] bg-[#0d203b] p-4">
                    <p className="text-[0.7rem] uppercase tracking-[0.22em] text-white/42">协作 Agent</p>
                    <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">05</p>
                    <p className="mt-2 text-sm text-slate-400">教案、练习、反馈、总结与资源联动</p>
                  </div>
                  <div className="rounded-[1.5rem] bg-[#11162c] p-4">
                    <p className="text-[0.7rem] uppercase tracking-[0.22em] text-white/42">学生在线</p>
                    <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">126</p>
                    <p className="mt-2 text-sm text-slate-400">支持锁定跟随与自由浏览双模式</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-[1.3fr_0.7fr]">
                  <div className="rounded-[1.5rem] bg-white/6 p-4">
                    <p className="text-sm text-white/58">课堂波形</p>
                    <div className="mt-4 flex h-28 items-end gap-2">
                      {[28, 48, 35, 70, 54, 88, 40, 62, 94, 58, 76, 46].map((height, index) => (
                        <div
                          key={index}
                          className="flex-1 rounded-full bg-linear-to-t from-cyan-300/35 via-blue-400/60 to-fuchsia-400/80"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] bg-linear-to-br from-white/10 to-white/4 p-4">
                    <p className="text-sm text-white/58">当前模式</p>
                    <p className="mt-4 text-2xl font-semibold tracking-[-0.05em] text-white">锁定跟随</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">教师一键广播当前步骤，学生端同步进入学习任务。</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                {learningRhythms.map(({ label, detail, icon: Icon }) => (
                  <div
                    key={label}
                    className="rounded-[1.75rem] bg-white/8 p-5 shadow-[0_20px_60px_rgba(2,6,23,0.24)] ring-1 ring-white/10 backdrop-blur-2xl"
                  >
                    <div className="flex size-11 items-center justify-center rounded-full bg-white/10 text-cyan-200">
                      <Icon className="size-5" aria-hidden />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold tracking-[-0.03em] text-white">{label}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="xl:pt-12">
            <HomeLoginCard />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {featureCards.map(({ title, description, icon: Icon }) => (
            <article
              key={title}
              className="rounded-[1.9rem] bg-white/6 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.18)] ring-1 ring-white/8 backdrop-blur-xl"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-white/10 text-cyan-200">
                <Icon className="size-5" aria-hidden />
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-white">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
