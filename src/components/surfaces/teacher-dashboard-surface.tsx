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
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function TeacherDashboardSurface() {
  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 pb-12 pt-3">
      <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 max-w-[68rem] space-y-3">
            <Badge variant="accent" className="bg-surface-container-lowest text-primary">
              教师指挥台
            </Badge>
            <div className="space-y-2">
              <h1 className="max-w-5xl text-[2.5rem] font-semibold tracking-[-0.03em] text-on-surface sm:text-[2.85rem]">
                今天把《编程基础：让角色动起来》编排成可运行课堂
              </h1>
              <p className="max-w-4xl text-sm leading-7 text-on-surface-variant sm:text-base">
                你今天有 3 节课、12 份待批改作业，以及一节正在进行中的培优班直播。先盯住课堂节奏，
                再处理需要在今天闭环的批改与通知。
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[22rem] xl:grid-cols-1">
            <div className="rounded-[1.5rem] bg-surface-container-lowest px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">今日节奏</p>
              <p className="mt-2 text-2xl font-semibold text-on-surface">3 节课 / 1 节直播中</p>
              <p className="mt-1 text-sm text-on-surface-variant">下一节英语课 14:00 开始，当前课堂建议 5 分钟后切换练习。</p>
            </div>
            <div className="rounded-[1.5rem] bg-error-container px-4 py-4 text-on-error-container">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">需要今天处理的风险项</p>
                  <p className="mt-1 text-sm leading-6">5 名学生作业逾期，12 份批改待完成，建议先清理高风险名单。</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          <QuickAction icon={<FileCheck className="size-5" />} label="发布作业" />
          <QuickAction icon={<Video className="size-5" />} label="开始会议" />
          <QuickAction icon={<UploadCloud className="size-5" />} label="上传资料" tone="warm" />
          <QuickAction icon={<Megaphone className="size-5" />} label="发送通知" tone="neutral" />
          <QuickAction icon={<PenTool className="size-5" />} label="备课笔记" />
        </div>
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(340px,0.82fr)]">
        <div className="space-y-5">
          <Card className="rounded-[2rem] bg-surface-container-lowest p-6 sm:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">Co-primary module</p>
                <h2 className="mt-2 text-[1.5rem] font-semibold text-on-surface">今日课表与运行节奏</h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-on-surface-variant">
                  保持上午直播、下午英语课和批改闭环在同一视野里。这里展示的是今天必须推进的课堂节奏，
                  不再把主信息压缩到狭窄侧栏中。
                </p>
              </div>
              <Link href="#" className="text-sm font-medium text-primary transition hover:opacity-80">
                查看完整日历
              </Link>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="relative flex flex-col before:absolute before:inset-y-2 before:left-[7px] before:w-[2px] before:bg-surface-container-highest/70">
                <TimelineItem
                  time="08:00 - 09:30"
                  title="高二物理（理综班）"
                  subtitle="教室 302 · 已完成板书讲解与小测回收"
                  status="past"
                />
                <TimelineItem
                  time="10:00 - 11:30"
                  title="高一数学（培优班）"
                  subtitle="函数与极限复习 · 当前处于讲授后半程"
                  status="current"
                  location="在线教室 A"
                  people="40 / 42 在线"
                />
                <TimelineItem
                  time="14:00 - 15:30"
                  title="英语阅读训练（九年级）"
                  subtitle="需要在 13:40 前完成预习材料推送"
                  status="future"
                />
              </div>

              <div className="grid gap-3 self-start">
                <CompactStatCard
                  title="本周学生参与度"
                  value="86%"
                  trend={
                    <span className="flex items-center gap-1 text-sm font-medium text-green-700">
                      <TrendingUp className="size-4" /> +4%
                    </span>
                  }
                />
                <CompactStatCard
                  title="平均出勤率"
                  value="94%"
                  trend={
                    <span className="flex items-center gap-1 rounded-full bg-surface-container-low px-3 py-1 text-sm font-medium text-on-surface-variant">
                      <Minus className="size-3" /> 稳定
                    </span>
                  }
                />
                <CompactStatCard
                  title="待处理作业"
                  value="12"
                  trend={<Badge className="bg-error-container text-on-error-container">需今日完成</Badge>}
                  valueTone="text-primary"
                />
              </div>
            </div>
          </Card>

          <Card className="rounded-[2rem] bg-surface-container-lowest p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">今日优先事项</p>
                <h3 className="mt-2 text-[1.35rem] font-semibold text-on-surface">先处理高风险，再推进常规动作</h3>
              </div>
              <Badge className="bg-surface-container-low text-on-surface-variant">提醒与动作保持同屏</Badge>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <PriorityCard
                title="批改闭环"
                detail="12 份作业中有 5 份已逾期，建议先批九年级培优班。"
                action="进入批改"
              />
              <PriorityCard
                title="课前准备"
                detail="英语课预习包尚未发送，13:40 前需完成资料推送。"
                action="发送预习包"
              />
              <PriorityCard
                title="家校沟通"
                detail="2 名学生连续两周未按时提交，需要同步班主任。"
                action="发送通知"
              />
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden rounded-[2rem] bg-surface-container-lowest p-0">
          <div className="relative flex flex-col gap-3 bg-linear-135 from-primary to-primary-container p-6 text-on-primary sm:p-7">
            <Badge className="w-fit bg-white/18 text-white hover:bg-white/24">
              正在直播
            </Badge>
            <div className="max-w-[20rem] space-y-2">
              <p className="text-sm text-on-primary/80">Live classroom stage</p>
              <h3 className="text-[1.8rem] font-semibold tracking-[-0.02em]">高一数学（培优班）</h3>
              <p className="text-sm leading-6 text-on-primary/85">当前在函数与极限复习环节，建议 5 分钟后切换到课堂练习。</p>
            </div>
            <Button variant="secondary" className="absolute right-5 top-5 min-h-10 px-3 text-primary/90 sm:right-6 sm:top-6">
              <MoreHorizontal className="size-5" />
            </Button>
          </div>

          <div className="flex flex-col gap-4 bg-surface-container-lowest p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <LiveMetric label="章节内容" value="第二章：函数及其表示方法" icon={<BookOpen className="size-4 text-primary" />} />
              <LiveMetric label="在线人数" value="40 / 42" icon={<Users className="size-4 text-tertiary" />} />
              <LiveMetric label="持续时间" value="45 分钟" icon={<Clock className="size-4 text-[#bc6c25]" />} />
            </div>

            <section className="rounded-[1.35rem] bg-surface-container-low p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-surface-container-lowest p-3 text-primary">
                    <MonitorPlay className="size-5" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-on-surface">屏幕共享已开启</p>
                    <p className="mt-1 text-sm text-on-surface-variant">正在演示《函数图像变化_v2.pdf》</p>
                  </div>
                </div>
                <Button variant="secondary" className="min-h-10 bg-error-container px-4 text-on-error-container hover:bg-error-container/90">
                  停止共享
                </Button>
              </div>
            </section>

            <section className="rounded-[1.35rem] bg-surface-container-low p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-on-surface-variant">课堂流转建议</p>
                  <p className="mt-1 text-base font-semibold text-on-surface">5 分钟后切换到课堂练习，保持当前讲解节奏。</p>
                </div>
                <Button variant="tertiary" className="min-h-10 self-start px-3 sm:self-center">
                  <ArrowUpRight className="size-5" />
                </Button>
              </div>
            </section>
          </div>
        </Card>
      </section>
    </div>
  )
}

function QuickAction({
  icon,
  label,
  tone = 'primary',
}: {
  icon: React.ReactNode
  label: string
  tone?: 'primary' | 'neutral' | 'warm'
}) {
  const toneClass =
    tone === 'warm'
      ? 'bg-[#fff2df] text-[#bc6c25]'
      : tone === 'neutral'
        ? 'bg-surface-container-low text-on-surface-variant'
        : 'bg-primary/10 text-primary'

  return (
    <button className="flex min-h-28 flex-col items-start justify-between rounded-[1.5rem] bg-surface-container-lowest p-4 text-left transition hover:-translate-y-0.5">
      <div className={`rounded-full p-3 ${toneClass}`}>
        {icon}
      </div>
      <div>
        <span className="text-sm font-semibold text-on-surface">{label}</span>
        <p className="mt-1 text-xs text-on-surface-variant">保持教学动作集中在同一工作台里。</p>
      </div>
    </button>
  )
}

function CompactStatCard({
  title,
  value,
  trend,
  valueTone,
}: {
  title: string
  value: React.ReactNode
  trend: React.ReactNode
  valueTone?: string
}) {
  return (
    <div className="rounded-[1.4rem] bg-surface-container-low p-4">
      <p className="text-sm font-medium text-on-surface-variant">{title}</p>
      <div className={`mt-3 text-[1.85rem] font-semibold tracking-tight text-on-surface ${valueTone ?? ''}`}>
        {value}
      </div>
      <div className="mt-3">{trend}</div>
    </div>
  )
}

function PriorityCard({ title, detail, action }: { title: string; detail: string; action: string }) {
  return (
    <div className="rounded-[1.5rem] bg-surface-container-low p-4">
      <p className="text-sm font-semibold text-on-surface">{title}</p>
      <p className="mt-2 text-sm leading-6 text-on-surface-variant">{detail}</p>
      <Button variant="tertiary" className="mt-4 min-h-10 px-0 text-sm">
        {action}
      </Button>
    </div>
  )
}

function LiveMetric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[1.2rem] bg-surface-container-low p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">{label}</p>
      <p className="mt-3 flex items-center gap-2 text-sm font-medium text-on-surface">
        {icon}
        {value}
      </p>
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
            <Badge className="bg-primary/10 px-2 py-0 text-primary hover:bg-primary/20">进行中</Badge>
          )}
        </div>

        <div className={`rounded-[1.25rem] p-5 ${status === 'current' ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}`}>
          <h4 className="text-base font-semibold text-on-surface">{title}</h4>
          {subtitle && <p className="text-sm text-on-surface-variant mt-1">{subtitle}</p>}

          {(location || people) && (
            <div className="mt-4 flex gap-2">
              {location && <Badge className="bg-surface-container-low text-on-surface-variant">{location}</Badge>}
              {people && <Badge className="bg-surface-container-low text-on-surface-variant">{people}</Badge>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
