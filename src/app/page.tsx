import Link from "next/link";
import { Search, Bell, ShoppingCart } from "lucide-react";

export default function HomePage() {
  return (
    <main className="h-screen w-full overflow-hidden flex flex-col bg-surface text-on-surface">
      {/* TopNavBar (Shared Component) */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-sm shadow-primary-container/5 border-b border-surface-container flex items-center justify-between px-6 py-3 max-w-full mx-auto">
        <div className="flex items-center gap-8">
          <div className="text-2xl font-bold tracking-tighter text-primary">
            OpenLear-Next
          </div>
          <div className="hidden md:flex gap-6">
            <Link href="#" className="font-['Lexend'] text-sm font-medium tracking-tight text-on-surface-variant hover:text-primary transition-colors">
              探索课程
            </Link>
            <Link href="#" className="font-['Lexend'] text-sm font-medium tracking-tight text-on-surface-variant hover:text-primary transition-colors">
              名师阵容
            </Link>
            <Link href="#" className="font-['Lexend'] text-sm font-medium tracking-tight text-on-surface-variant hover:text-primary transition-colors">
              学习路径
            </Link>
            <Link href="#" className="font-['Lexend'] text-sm font-medium tracking-tight text-on-surface-variant hover:text-primary transition-colors">
              教育社区
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full transition-all duration-200 scale-95 active:scale-90">
            <Search className="w-6 h-6" />
          </button>
          <button className="text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full transition-all duration-200 scale-95 active:scale-90">
            <Bell className="w-6 h-6" />
          </button>
          <button className="text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full transition-all duration-200 scale-95 active:scale-90">
            <ShoppingCart className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 w-full pt-16 flex flex-col md:flex-row items-center justify-center p-6 md:p-12 gap-12 bg-gradient-to-br from-surface to-surface-container-low">
        {/* Left: Brand Messaging & Image */}
        <div className="flex-1 max-w-2xl flex flex-col items-center text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-[2.5rem] lg:text-[3.5rem] leading-tight font-bold text-on-surface">
              重塑学习体验 <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">赋能未来</span>
            </h1>
            <p className="text-[1.125rem] text-on-surface-variant max-w-lg mx-auto leading-relaxed">
              加入OpenLear-Next，探索世界级课程，连接全球顶尖导师。我们致力于为您提供最优质的在线教育体验。
            </p>
          </div>
          <div className="w-full max-w-md rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(44,47,49,0.06)] relative border border-surface-container-high">
            <img 
              alt="Educational platform preview" 
              className="w-full h-64 object-cover" 
              src="https://lh3.googleusercontent.com/aida/ADBb0ugP27qcIEohg7CcCRSTkSjgvjIUdHb53d_DcYiK5VYCZ5tmCj7Vd7jITllQpCO_xLdOnG2teyM_G9MzW6RP_Un_uUUW6ArzGQANCxlFkcvjXhaaab01zgjSD-rhAm-OhXkT3UQMjEooRC9hG-JrIndknbsp-6sg_IVAftIn9_aExM4FREQWBLl-NhR-G2wCxIYilYuJCLGXOGi135LlnAjfUwWMVj6F0NeChlo2zlAC5Y328QzgvqslmZk"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 text-left">
              <span className="text-xs font-semibold bg-secondary-container text-on-secondary-container px-2 py-1 rounded-full mb-2 inline-block">Featured</span>
              <h3 className="text-lg font-bold text-white">数据科学基础</h3>
            </div>
          </div>
        </div>

        {/* Right: Login Card */}
        <div className="w-full max-w-md bg-surface-container-lowest rounded-xl p-8 shadow-[0_8px_32px_rgba(44,47,49,0.06)] border border-surface-container">
          <div className="text-center mb-8">
            <h2 className="text-[1.75rem] font-bold text-on-surface mb-2">欢迎回来</h2>
            <p className="text-[1rem] text-on-surface-variant">请登录您的账户继续学习</p>
          </div>

          {/* Role Tabs */}
          <div className="flex bg-surface-container-low p-1 rounded-lg mb-6">
            <button className="flex-1 py-2 text-sm font-medium rounded-md bg-surface-container-lowest text-primary shadow-sm">
              学生登录
            </button>
            <button className="flex-1 py-2 text-sm font-medium rounded-md text-on-surface-variant hover:text-on-surface transition-colors">
              导师登录
            </button>
          </div>

          <form className="space-y-4">
            <div>
              <label className="text-sm font-medium text-on-surface-variant block mb-1">邮箱地址</label>
              <input 
                className="w-full bg-surface-container-low border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg px-4 py-3 text-on-surface transition-all" 
                placeholder="name@example.com" 
                type="email" 
              />
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface-variant block mb-1">密码</label>
              <input 
                className="w-full bg-surface-container-low border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg px-4 py-3 text-on-surface transition-all" 
                placeholder="••••••••" 
                type="password" 
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input className="rounded text-primary focus:ring-primary border-outline-variant bg-surface-container-low" type="checkbox" />
                <span className="text-sm font-medium text-on-surface-variant">记住我</span>
              </label>
              <Link href="#" className="text-sm font-medium text-primary hover:text-primary-container transition-colors">
                忘记密码？
              </Link>
            </div>
            <button 
              className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary py-3 rounded-full font-medium hover:opacity-90 transition-opacity active:scale-[0.98]" 
              type="submit"
            >
              登录账户
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[1rem] text-on-surface-variant text-sm">
              还没有账户？ <Link href="#" className="text-primary font-medium hover:underline">立即注册</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
