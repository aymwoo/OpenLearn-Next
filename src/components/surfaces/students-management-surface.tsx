import { Download, Filter, Pencil, Plus, Search, Trash2, Upload, UsersRound } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const filters = [
  {
    label: '年级',
    options: ['全部年级', '七年级', '八年级', '九年级'],
  },
  {
    label: '班级',
    options: ['全部班级', '1 班', '2 班', '3 班'],
  },
  {
    label: '状态',
    options: ['在读', '请假', '转学', '毕业'],
  },
] as const

const students = [
  { name: '林语堂', id: '20230701042', grade: '九年级', className: '3 班', login: '2026-05-06 09:15', status: '在读', tone: 'success' as const },
  { name: '陈可馨', id: '20230701089', grade: '八年级', className: '1 班', login: '2026-05-05 16:42', status: '请假', tone: 'default' as const },
  { name: '王晓明', id: '20230701015', grade: '九年级', className: '2 班', login: '2026-05-06 08:30', status: '在读', tone: 'success' as const },
  { name: '李华', id: '20230701102', grade: '七年级', className: '5 班', login: '2026-05-03 11:20', status: '转学', tone: 'accent' as const },
] as const

const stats = [
  { label: '总学生人数', value: '1,248', detail: '较上学期 +4.2%' },
  { label: '今日出勤率', value: '98.5%', detail: '更新于 09:30' },
  { label: '平均班级人数', value: '42', detail: '符合标准配比' },
  { label: '待核对信息', value: '12', detail: '需要尽快处理' },
] as const

export function StudentsManagementSurface() {
  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 pb-12 pt-3">
      <section className="overflow-hidden rounded-[var(--radius-shell)] bg-surface-container-low shadow-ambient">
        <div className="bg-linear-135 from-primary to-primary-container px-5 py-6 text-on-primary sm:px-6 sm:py-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <Badge variant="accent" className="bg-white/15 text-white">学生管理</Badge>
              <h1 className="mt-4 text-[2.4rem] font-semibold tracking-[-0.02em] text-white">查看并管理所有班级的学生信息</h1>
              <p className="mt-3 text-base leading-8 text-on-primary/85">页面参考 Stitch 的学生管理屏幕，保留当前静态样例数据，只优化筛选栏、列表布局和右侧统计卡。</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" className="gap-2 bg-white/92 text-base text-primary shadow-none hover:bg-white">
                <Upload className="size-5" aria-hidden />
                批量导入
              </Button>
              <Button className="gap-2 bg-white/15 text-base text-white hover:bg-white/20">
                <Plus className="size-5" aria-hidden />
                新增学生
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <div className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient sm:p-6">
            <div className="grid gap-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.1fr)]">
              {filters.map((group) => (
                <div key={group.label} className="rounded-[1.5rem] bg-surface-container-lowest p-4 shadow-ambient">
                  <p className="text-sm text-on-surface-variant">{group.label}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.options.map((option, index) => (
                      <Badge key={option} className={index === 0 ? 'bg-primary/10 text-primary' : 'bg-surface-container-low text-on-surface-variant'}>
                        {option}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex min-h-[132px] flex-col justify-between rounded-[1.5rem] bg-surface-container-lowest p-4 shadow-ambient">
                <div className="flex items-center gap-3 rounded-full bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                  <Search className="size-4 text-primary" aria-hidden />
                  快速搜索姓名、学号或班级
                </div>
                <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <Filter className="size-4 text-primary" aria-hidden />
                  筛选条件会在学生管理视图中保留
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" className="min-h-10 px-4 text-sm shadow-none">全选</Button>
                <Badge className="bg-surface-container-lowest text-on-surface-variant">已选择 0 名学生</Badge>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <Button variant="secondary" className="min-h-10 px-4 text-sm shadow-none">批量操作</Button>
                <Button variant="secondary" className="min-h-10 px-4 text-sm shadow-none">批量导出</Button>
                <Button variant="secondary" className="min-h-10 bg-error-container px-4 text-sm text-on-error-container hover:bg-error-container/90">批量删除</Button>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {students.map((student) => (
                <article key={student.id} className="grid gap-4 rounded-[1.5rem] bg-surface-container-lowest p-5 shadow-ambient lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,0.7fr))_auto] lg:items-center">
                  <div className="flex items-center gap-4">
                    <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                      {student.name.slice(0, 1)}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-on-surface">{student.name}</h2>
                      <p className="mt-1 text-sm text-on-surface-variant">学号 {student.id}</p>
                    </div>
                  </div>
                  <MetaCell label="年级" value={student.grade} />
                  <MetaCell label="班级" value={student.className} />
                  <MetaCell label="最近登录" value={student.login} />
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">状态</p>
                    <Badge variant={student.tone} className="mt-2 w-fit">{student.status}</Badge>
                  </div>
                  <div className="flex items-center gap-2 lg:justify-end">
                    <Button variant="secondary" className="min-h-10 px-3 text-on-surface-variant shadow-none hover:text-on-surface">
                      <Pencil className="size-4" aria-hidden />
                    </Button>
                    <Button variant="secondary" className="min-h-10 bg-error-container px-3 text-on-error-container shadow-none hover:bg-error-container/90">
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-3 text-sm text-on-surface-variant sm:flex-row sm:items-center sm:justify-between">
              <p>显示 1 到 10，共 1,248 名学生</p>
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((page) => (
                  <span key={page} className={page === 1 ? 'grid size-10 place-items-center rounded-full bg-primary text-on-primary' : 'grid size-10 place-items-center rounded-full bg-surface-container-lowest shadow-ambient'}>{page}</span>
                ))}
                <span className="px-2">...</span>
                <span className="grid size-10 place-items-center rounded-full bg-surface-container-lowest shadow-ambient">125</span>
              </div>
            </div>
          </div>
        </div>

        <aside className="grid gap-4 self-start">
          {stats.map((stat) => (
            <Card key={stat.label} className="rounded-[var(--radius-shell)] bg-surface-container-lowest p-5">
              <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                <span className="rounded-full bg-surface-container-low p-2 text-primary">
                  <UsersRound className="size-4" aria-hidden />
                </span>
                {stat.label}
              </div>
              <p className="mt-3 text-[2rem] font-semibold text-on-surface">{stat.value}</p>
              <p className="mt-2 text-sm text-on-surface-variant">{stat.detail}</p>
            </Card>
          ))}

          <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient">
            <p className="text-sm text-on-surface-variant">快捷操作</p>
            <div className="mt-4 grid gap-3">
              <Button variant="secondary" className="min-h-12 justify-between rounded-[1.5rem] bg-surface-container-lowest px-4 py-4 text-left text-on-surface shadow-none">
                导出学生名册
                <Download className="size-4 text-primary" aria-hidden />
              </Button>
              <Button variant="secondary" className="min-h-12 justify-between rounded-[1.5rem] bg-surface-container-lowest px-4 py-4 text-left text-on-surface shadow-none">
                导出缺勤名单
                <Download className="size-4 text-primary" aria-hidden />
              </Button>
            </div>
          </section>
        </aside>
      </section>
    </div>
  )
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">{label}</p>
      <p className="mt-2 text-sm font-medium text-on-surface">{value}</p>
    </div>
  )
}
