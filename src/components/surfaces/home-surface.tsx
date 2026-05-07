import Image from 'next/image'
import Link from 'next/link'
import { Bell, Search, ShoppingCart } from 'lucide-react'
import { HomeLoginCard } from '@/components/home/home-login-card'

const navItems = ['探索课程', '名师阵容', '学习路径', '教育社区'] as const

const featuredPreview = {
  alt: '一张现代教育工作台的三维插画，画面中有展示数据面板的笔记本电脑、悬浮的几何图形与学习图标，整体以明亮的白灰色调和蓝色点缀呈现未来课堂氛围。',
  src: 'https://lh3.googleusercontent.com/aida/ADBb0ugP27qcIEohg7CcCRSTkSjgvjIUdHb53d_DcYiK5VYCZ5tmCj7Vd7jITllQpCO_xLdOnG2teyM_G9MzW6RP_Un_uUUW6ArzGQANCxlFkcvjXhaaab01zgjSD-rhAm-OhXkT3UQMjEooRC9hG-JrIndknbsp-6sg_IVAftIn9_aExM4FREQWBLl-NhR-G2wCxIYilYuJCLGXOGi135LlnAjfUwWMVj6F0NeChlo2zlAC5Y328QzgvqslmZk',
} as const

const navIconClassName =
  'rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface'

export function HomeSurface() {
  return (
    <main className="min-h-screen bg-linear-to-br from-[#f8f9fb] to-[#f2f4f6] text-on-surface">
      <nav className="fixed inset-x-0 top-0 z-50 bg-white/80 backdrop-blur-xl shadow-[0_8px_24px_rgba(44,47,49,0.05)]">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-3 md:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold tracking-[-0.04em] text-primary md:text-2xl">
              开放学习
            </Link>

            <div className="hidden items-center gap-6 md:flex">
              {navItems.map((item) => (
                <a
                  key={item}
                  href="#"
                  className="text-sm font-medium tracking-tight text-on-surface-variant transition-colors hover:text-primary"
                >
                  {item}
                </a>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-on-surface-variant md:gap-4">
            <button type="button" aria-label="搜索" className={navIconClassName}>
              <Search className="size-4" aria-hidden />
            </button>
            <button type="button" aria-label="通知" className={navIconClassName}>
              <Bell className="size-4" aria-hidden />
            </button>
            <button type="button" aria-label="购物车" className={navIconClassName}>
              <ShoppingCart className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </nav>

      <section className="mx-auto flex min-h-screen w-full max-w-[1520px] flex-col justify-center gap-10 px-6 pb-10 pt-28 md:px-12 lg:flex-row lg:items-center lg:gap-16 lg:px-16">
        <section className="flex flex-1 flex-col items-center space-y-8 text-center lg:basis-2/3">
          <div className="w-full max-w-[52rem] space-y-4">
            <h1 className="text-[2.75rem] font-bold leading-[1.1] tracking-[-0.04em] text-on-surface sm:text-[3rem] md:text-[3.5rem]">
              重塑学习体验
              <br />
              <span className="bg-linear-to-r from-primary to-[#08658f] bg-clip-text text-transparent">
                赋能未来
              </span>
            </h1>
            <p className="mx-auto max-w-[44rem] text-base leading-7 text-on-surface-variant">
              加入开放学习，探索高质量课程，连接优质教师与学习资源，开启更清晰、更沉浸的未来课堂体验。
            </p>
          </div>

          <div className="relative w-full max-w-[48rem] overflow-hidden rounded-[1rem] bg-surface-container-lowest shadow-[0_8px_32px_rgba(44,47,49,0.06)]">
            <Image
              src={featuredPreview.src}
              alt={featuredPreview.alt}
              width={960}
              height={416}
              className="h-64 w-full object-cover md:h-72 lg:h-80"
            />
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent p-4 text-left">
              <span className="inline-block rounded-full bg-secondary/20 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                精选课程
              </span>
              <h2 className="mt-2 text-lg font-semibold text-white">数据科学基础</h2>
            </div>
          </div>
        </section>

        <div className="w-full lg:basis-1/3 lg:max-w-[28rem] lg:min-w-[22rem] xl:max-w-[30rem]">
          <HomeLoginCard />
        </div>
      </section>
    </main>
  )
}
