'use client'

import Link from 'next/link'
import { Activity, BarChart3, Circle, LayoutList, ListOrdered } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ClassroomSnapshotDTO, ClassroomStepDTO } from '@/lib/dto/classroom'
import { cn } from '@/lib/utils'

import {
  getRecentLiveAnswerEvents,
  type LiveAnswerAggregate,
  type LiveAnswerDashboardState,
  useLiveAnswerStore,
} from './live-answer-dashboard-store'

type LiveAnswerDashboardSurfaceProps = {
  sessionId: string
  classroomStatus: ClassroomSnapshotDTO['status']
  activeStepId: string
  steps: ClassroomStepDTO[]
  connectionState: 'connected' | 'reconnecting' | 'fallback' | 'closed'
}

function formatAnswerPreview(value: unknown) {
  if (Array.isArray(value)) {
    return value.join('、')
  }

  if (typeof value === 'string') {
    return value.trim().length > 0 ? value : '未作答'
  }

  if (value === null || value === undefined) {
    return '未作答'
  }

  return String(value)
}

function getQuestionLabel(step?: ClassroomStepDTO) {
  if (!step) {
    return '当前题目'
  }

  if (step.type === 'quiz' && step.payload && typeof step.payload === 'object' && 'question' in step.payload) {
    const question = step.payload.question
    if (typeof question === 'string' && question.trim().length > 0) {
      return question
    }
  }

  return step.title
}

export function LiveAnswerDashboardSurface({
  sessionId,
  classroomStatus,
  activeStepId,
  steps,
  connectionState,
}: LiveAnswerDashboardSurfaceProps) {
  const bindSession = useLiveAnswerStore((state: LiveAnswerDashboardState) => state.bindSession)
  const setSelectedQuestionId = useLiveAnswerStore((state: LiveAnswerDashboardState) => state.setSelectedQuestionId)
  const setRecentLimit = useLiveAnswerStore((state: LiveAnswerDashboardState) => state.setRecentLimit)
  const selectedQuestionId = useLiveAnswerStore((state: LiveAnswerDashboardState) => state.selectedQuestionId)
  const recentLimit = useLiveAnswerStore((state: LiveAnswerDashboardState) => state.recentLimit)
  const aggregates = useLiveAnswerStore((state: LiveAnswerDashboardState) => state.aggregates)
  const events = useLiveAnswerStore((state: LiveAnswerDashboardState) => state.events)

  const [activeView, setActiveView] = useState<'aggregation' | 'recent-stream'>('aggregation')

  useEffect(() => {
    bindSession(sessionId)
  }, [bindSession, sessionId])

  const quizSteps = useMemo(
    () => steps.filter((step) => step.type === 'quiz'),
    [steps],
  )
  const aggregateList = useMemo<LiveAnswerAggregate[]>(
    () => (Object.values(aggregates) as LiveAnswerAggregate[]).sort((left, right) => right.lastReceivedAt - left.lastReceivedAt),
    [aggregates],
  )
  const selectedAggregate = selectedQuestionId
    ? aggregates[selectedQuestionId] ?? null
    : aggregateList[0] ?? null
  const selectedStep = quizSteps.find((step) => step.id === (selectedAggregate?.questionId ?? activeStepId))
  const recentEvents = useMemo(
    () => getRecentLiveAnswerEvents(events, recentLimit),
    [events, recentLimit],
  )

  useEffect(() => {
    if (!selectedQuestionId && (aggregateList[0]?.questionId ?? activeStepId)) {
      setSelectedQuestionId(aggregateList[0]?.questionId ?? activeStepId)
    }
  }, [activeStepId, aggregateList, selectedQuestionId, setSelectedQuestionId])

  if (classroomStatus === 'ended') {
    return (
      <Card className="bg-surface-container-lowest p-5 sm:p-6">
        <p className="text-sm text-on-surface-variant">实时作答</p>
        <h3 className="mt-2 text-2xl font-semibold text-on-surface">课堂已结束</h3>
        <p className="mt-3 text-sm leading-7 text-on-surface-variant">
          当前课堂已结束，实时面板不再继续接收作答事件。完整统计已经沉淀到课后回顾中。
        </p>
        <Button asChild variant="secondary" className="mt-5 min-h-[44px] px-5">
          <Link href={`/classroom?sessionId=${sessionId}&recapTab=students`}>跳转到 recap</Link>
        </Button>
      </Card>
    )
  }

  return (
    <Card className="bg-surface-container-lowest p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <Activity className="size-4 text-primary" aria-hidden />
            <span>作答实时监控</span>
          </div>
          <h3 className="mt-2 text-2xl font-semibold text-on-surface">老师侧实时作答面板</h3>
          <p className="mt-2 text-sm leading-7 text-on-surface-variant">
            只读聚合作答流，不触发任何写操作。学生提交后，最新答案会实时折叠进当前题目的分布统计。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={connectionState === 'connected' ? 'success' : 'default'}>
            {connectionState === 'connected'
              ? '实时连接正常'
              : connectionState === 'fallback'
                ? '已回退到 fallback'
                : connectionState === 'reconnecting'
                  ? '正在重连'
                  : '连接已关闭'}
          </Badge>
          <Badge className="bg-surface-container-low text-on-surface-variant">
            最新答案 {aggregateList.reduce((total, item) => total + item.totalResponses, 0)} 条
          </Badge>
        </div>
      </div>

      {aggregateList.length === 0 ? (
        <div className="mt-5 rounded-[1.6rem] bg-surface-container-low p-6 text-center shadow-ambient">
          <Circle className="mx-auto size-7 text-primary/60" aria-hidden />
          <h4 className="mt-3 text-lg font-semibold text-on-surface">暂无作答数据</h4>
          <p className="mt-2 text-sm leading-7 text-on-surface-variant">
            当前课堂还没有收到任何学生作答。一旦学生开始提交，选项分布和最近作答流水会在这里实时刷新。
          </p>
        </div>
      ) : (
        <Tabs
          defaultValue="aggregation"
          value={activeView}
          onValueChange={(value) => setActiveView(value as 'aggregation' | 'recent-stream')}
          className="mt-5"
        >
          <TabsList className="flex flex-wrap gap-2 rounded-[1.1rem] bg-surface-container-low p-1">
            <TabsTrigger
              value="aggregation"
              className={cn(
                'inline-flex min-h-[40px] items-center gap-2 rounded-[1rem] px-4 text-sm font-medium transition-colors',
                activeView === 'aggregation'
                  ? 'bg-surface text-primary shadow-ambient'
                  : 'text-on-surface-variant hover:bg-surface-container-lowest',
              )}
            >
              <BarChart3 className="size-4" aria-hidden />
              按题分布
            </TabsTrigger>
            <TabsTrigger
              value="recent-stream"
              className={cn(
                'inline-flex min-h-[40px] items-center gap-2 rounded-[1rem] px-4 text-sm font-medium transition-colors',
                activeView === 'recent-stream'
                  ? 'bg-surface text-primary shadow-ambient'
                  : 'text-on-surface-variant hover:bg-surface-container-lowest',
              )}
            >
              <ListOrdered className="size-4" aria-hidden />
              作答流水
            </TabsTrigger>
          </TabsList>

          <TabsContent value="aggregation" className="mt-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              {aggregateList.map((item) => {
                const step = quizSteps.find((candidate) => candidate.id === item.questionId)
                const isActive = (selectedAggregate?.questionId ?? activeStepId) === item.questionId

                return (
                  <button
                    key={item.questionId}
                    type="button"
                    className={cn(
                      'rounded-full px-4 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-primary text-white'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high',
                    )}
                    onClick={() => setSelectedQuestionId(item.questionId)}
                  >
                    {getQuestionLabel(step)}
                  </button>
                )
              })}
            </div>

            {selectedAggregate ? (
              <div className="rounded-[1.6rem] bg-surface-container-low p-5 shadow-ambient">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm text-on-surface-variant">当前题目</p>
                    <h4 className="mt-2 text-xl font-semibold text-on-surface">
                      {getQuestionLabel(selectedStep)}
                    </h4>
                  </div>
                  <Badge className="bg-surface-container-lowest text-on-surface-variant">
                    {selectedAggregate.totalResponses} 人已作答
                  </Badge>
                </div>
                <div className="mt-5 grid gap-3">
                  {selectedAggregate.buckets.map((bucket: { label: string; count: number }) => {
                    const width = selectedAggregate.totalResponses > 0
                      ? `${Math.max(8, Math.round((bucket.count / selectedAggregate.totalResponses) * 100))}%`
                      : '0%'

                    return (
                      <div key={bucket.label} className="rounded-[1.2rem] bg-surface-container-lowest p-4">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium text-on-surface">{bucket.label}</span>
                          <span className="text-on-surface-variant">{bucket.count} 人</span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container-low">
                          <div className="h-full rounded-full bg-linear-135 from-primary to-primary-container" style={{ width }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="recent-stream" className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 text-sm text-on-surface-variant">
                <LayoutList className="size-4" aria-hidden />
                最近 {recentLimit} 条
              </span>
              {[5, 20, 50].map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={recentLimit === value ? 'primary' : 'secondary'}
                  className="min-h-[40px] px-4 text-sm"
                  onClick={() => setRecentLimit(value as 5 | 20 | 50)}
                >
                  {value}
                </Button>
              ))}
            </div>

            <div className="grid gap-3">
              {recentEvents.map((event) => {
                const step = quizSteps.find((candidate) => candidate.id === event.questionId)
                return (
                  <div key={event.correlationId} className="rounded-[1.2rem] bg-surface-container-low p-4 shadow-ambient">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-on-surface">{getQuestionLabel(step)}</p>
                        <p className="mt-1 text-sm text-on-surface-variant">
                          学生 {event.studentId} · {formatAnswerPreview(event.payload)}
                        </p>
                      </div>
                      <span className="text-xs text-on-surface-variant">
                        {new Date(event.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </Card>
  )
}
