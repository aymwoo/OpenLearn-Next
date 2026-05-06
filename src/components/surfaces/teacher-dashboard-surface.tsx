import Link from 'next/link'
import {
  ArrowUpRight,
  FileCheck,
  Video,
  UploadCloud,
  Megaphone,
  PenTool,
  AlertTriangle,
  MoreHorizontal,
  BookOpen,
  Users,
  Clock,
  MonitorPlay,
  TrendingUp,
  Minus
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function TeacherDashboardSurface() {
  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 pb-12 pt-3">
      <header className="flex flex-col gap-2 px-1">
        <h1 className="text-[2.5rem] font-semibold tracking-[-0.02em] text-on-surface">
          早安，张老师！
        </h1>
        <p className="text-base text-on-surface-variant">
          今日：<span className="text-primary font-medium">3节课</span>，
          <span className="text-primary font-medium">12份作业</span>待批改。
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <ActionCard
          icon={<FileCheck className="size-6" />}
          title="发布作业"
          color="text-primary"
          bgColor="bg-primary/10"
        />
        <ActionCard
          icon={<Video className="size-6" />}
          title="开始会议"
          color="text-primary"
          bgColor="bg-primary/10"
        />
        <ActionCard
          icon={<UploadCloud className="size-6" />}
          title="上传资料"
          color="text-orange-500"
          bgColor="bg-orange-500/10"
        />
        <ActionCard
          icon={<Megaphone className="size-6" />}
          title="发送通知"
          color="text-on-surface-variant"
          bgColor="bg-surface-container-high"
        />
        <ActionCard
          icon={<PenTool className="size-6" />}
          title="备课笔记"
          color="text-primary"
          bgColor="bg-primary/10"
        />
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="flex flex-col gap-6 rounded-[2rem] bg-surface-container-lowest p-6 shadow-[0_16px_40px_rgba(44,47,49,0.05)] sm:p-7">
          <div className="flex items-center justify-between">
            <h2 className="text-[1.35rem] font-semibold text-on-surface">今日课表</h2>
            <Link href="#" className="text-sm font-medium text-primary transition hover:opacity-80">
              查看完整日历
            </Link>
          </div>

          <div className="relative flex flex-col before:absolute before:inset-y-2 before:left-[7px] before:w-[2px] before:bg-surface-container-highest/70">
            <TimelineItem
              time="08:00 - 09:30"
              title="高二物理 (理综班)"
              subtitle="教室 302"
              status="past"
            />
            <TimelineItem
              time="10:00 - 11:30"
              title="高一数学 (培优班)"
              subtitle="函数与极限复习"
              status="current"
              location="在线教室 A"
              people="42人"
            />
            <TimelineItem
              time="14:00 - 15:30"
              title="英语 (即将开始)"
              status="future"
            />
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <div className="rounded-[2rem] bg-surface-container-low p-5 sm:p-6">
            <h2 className="mb-5 text-[1.35rem] font-semibold text-on-surface">数据概览</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                title="本周学生参与度"
                value="86%"
                trend={<span className="text-green-600 flex items-center text-sm font-medium"><TrendingUp className="size-4 mr-1" /> +4%</span>}
              />
              <StatCard
                title="平均出勤率"
                value="94%"
                trend={<span className="text-on-surface-variant flex items-center text-sm bg-surface-container-high px-2 py-0.5 rounded-md font-medium"><Minus className="size-3 mr-1" /> 稳定</span>}
              />
              <StatCard
                title="待处理作业"
                value={<span className="text-primary">12</span>}
                trend={<span className="text-red-500 text-sm bg-red-50 px-2 py-0.5 rounded-md font-medium">需今日完成</span>}
              />
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-[1.35rem] bg-[#fff2df] px-4 py-3 text-sm font-medium text-[#bc6c25]">
              <AlertTriangle className="size-5 shrink-0" />
              <span>待办提醒：5 个学生作业逾期。《高中数学：微积分初步》</span>
            </div>
          </div>

          <div className="mt-[-0.125rem] overflow-hidden rounded-[2rem] bg-surface-container-lowest shadow-[0_16px_40px_rgba(44,47,49,0.05)]">
            <div className="relative flex flex-col gap-3 bg-gradient-to-r from-primary to-primary-container p-8 text-on-primary">
              <Badge className="w-fit bg-white/20 text-white hover:bg-white/30 border-none rounded-full px-3 py-1 text-xs tracking-wider">
                正在直播
              </Badge>
              <h3 className="text-[1.75rem] font-semibold mt-2">高一数学 (培优班)</h3>
              <button className="absolute right-6 top-6 rounded-full bg-white/10 p-2 transition-colors hover:bg-white/20">
                <MoreHorizontal className="size-6" />
              </button>
            </div>

            <div className="flex flex-col gap-8 bg-surface-container-lowest p-8">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs text-on-surface-variant mb-2">章节内容</p>
                  <p className="text-sm font-medium text-on-surface flex items-center gap-2">
                    <BookOpen className="size-4 text-primary" /> 第二章：函数及其表示方法
                  </p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant mb-2">在线人数</p>
                  <p className="text-sm font-medium text-on-surface flex items-center gap-2">
                    <Users className="size-4 text-[#10b981]" /> 40 / 42
                  </p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant mb-2">持续时间</p>
                  <p className="text-sm font-medium text-on-surface flex items-center gap-2">
                    <Clock className="size-4 text-[#f59e0b]" /> 45 分钟
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4 rounded-[1.25rem] bg-surface-container-low p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary">
                    <MonitorPlay className="size-6" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-on-surface">屏幕共享已开启</p>
                    <p className="text-sm text-on-surface-variant mt-0.5">正在演示 &quot;函数宣布_v2.pdf&quot;</p>
                  </div>
                </div>
                <button className="whitespace-nowrap rounded-full bg-[#fef2f2] px-5 py-2.5 text-sm font-medium text-[#ef4444] transition-colors hover:bg-[#fee2e2]">
                  停止共享
                </button>
              </div>

              <div className="flex items-center justify-between rounded-[1.25rem] bg-surface-container-low px-5 py-4">
                <div>
                  <p className="text-sm text-on-surface-variant">课堂流转建议</p>
                  <p className="mt-1 text-base font-semibold text-on-surface">5 分钟后切换到课堂练习，保持当前讲解节奏。</p>
                </div>
                <button className="hidden rounded-full bg-surface-container-lowest p-3 text-primary shadow-[0_10px_28px_rgba(44,47,49,0.05)] sm:inline-flex">
                  <ArrowUpRight className="size-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function ActionCard({ icon, title, color, bgColor }: { icon: React.ReactNode, title: string, color: string, bgColor: string }) {
  return (
    <button className="flex flex-col items-center justify-center gap-4 rounded-[1.5rem] bg-surface-container-lowest p-6 shadow-[0_12px_32px_rgba(44,47,49,0.05)] transition-transform hover:-translate-y-1 border-none">
      <div className={`p-4 rounded-full ${bgColor} ${color}`}>
        {icon}
      </div>
      <span className="text-sm font-medium text-on-surface">{title}</span>
    </button>
  )
}

function StatCard({ title, value, trend }: { title: string, value: React.ReactNode, trend: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-[1.5rem] bg-surface-container-lowest p-6 shadow-[0_12px_32px_rgba(44,47,49,0.05)] border-none">
      <p className="text-sm text-on-surface-variant font-medium">{title}</p>
      <div className="text-[2rem] font-semibold text-on-surface tracking-tight">
        {value}
      </div>
      <div className="mt-1">
        {trend}
      </div>
    </div>
  )
}

function TimelineItem({ 
  time, 
  title, 
  subtitle, 
  status,
  location,
  people
}: { 
  time: string, 
  title: string, 
  subtitle?: string, 
  status: 'past' | 'current' | 'future',
  location?: string,
  people?: string
}) {
  return (
    <div className={`relative pb-6 pl-8 ${status === 'future' ? 'opacity-50' : ''}`}>
      <div className={`absolute left-0 top-1.5 h-4 w-4 rounded-full border-[3px] border-surface-container-low ${status === 'current' ? 'bg-primary ring-4 ring-primary/20' : 'bg-surface-container-highest'}`} />

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-on-surface-variant">{time}</span>
          {status === 'current' && (
            <Badge className="bg-primary/10 text-primary border-none hover:bg-primary/20 px-2 py-0">进行中</Badge>
          )}
        </div>

        <div className={`rounded-[1.25rem] p-5 ${status === 'current' ? 'bg-surface-container-lowest shadow-[0_12px_32px_rgba(44,47,49,0.05)]' : 'bg-surface-container-low'}`}>
          <h4 className="text-base font-semibold text-on-surface">{title}</h4>
          {subtitle && <p className="text-sm text-on-surface-variant mt-1">{subtitle}</p>}

          {(location || people) && (
            <div className="flex gap-2 mt-4">
              {location && <Badge className="bg-surface-container-low text-on-surface-variant border-none">{location}</Badge>}
              {people && <Badge className="bg-surface-container-low text-on-surface-variant border-none">{people}</Badge>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
