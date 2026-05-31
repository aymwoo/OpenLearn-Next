// @vitest-environment jsdom

import { readFileSync } from 'node:fs'

import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ClassroomRecentSessionTrendDTO } from '@/lib/dto/classroom'
import { TeacherTrendsSurface } from './teacher-trends-surface'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const source = readFileSync('src/components/surfaces/teacher-trends-surface.tsx', 'utf8')

afterEach(() => {
  cleanup()
})

const trend: ClassroomRecentSessionTrendDTO = {
  view: 'sessions',
  window: {
    kind: 'latest-ended-sessions',
    limit: 4,
  },
  classSummary: {
    classId: 'class-1',
    className: '七年级一班',
    view: 'sessions',
    windowSize: 4,
    sessionCount: 3,
    averageCompletionRate: 0.82,
    averageSubmissionRate: 0.74,
    totalFollowUpSignalsCount: 5,
    totalPendingFeedbackCount: 3,
    latestEndedAt: '2026-05-14T09:00:00.000Z',
    trendLabel: '需关注',
  },
  sessionPoints: [
    {
      sessionId: 'session-3',
      lessonId: 'lesson-3',
      lessonTitle: '函数图像复盘',
      classId: 'class-1',
      className: '七年级一班',
      startedAt: '2026-05-14T08:00:00.000Z',
      endedAt: '2026-05-14T08:40:00.000Z',
      completionRate: 0.7,
      submissionRate: 0.6,
      followUpSignalsCount: 3,
      pendingFeedbackCount: 2,
      attentionCount: 2,
      unevaluatedCount: 1,
      trendLabel: '需关注',
      primaryRecapHref: '/classroom?sessionId=session-3&recapTab=students',
      secondaryReviewHref: '/teacher/review?lessonId=lesson-3&filter=needs_feedback',
    },
    {
      sessionId: 'session-2',
      lessonId: 'lesson-2',
      lessonTitle: '实验记录整理',
      classId: 'class-1',
      className: '七年级一班',
      startedAt: '2026-05-13T08:00:00.000Z',
      endedAt: '2026-05-13T08:40:00.000Z',
      completionRate: 0.83,
      submissionRate: 0.78,
      followUpSignalsCount: 1,
      pendingFeedbackCount: 1,
      attentionCount: 1,
      unevaluatedCount: 0,
      trendLabel: '稳定',
      primaryRecapHref: '/classroom?sessionId=session-2&recapTab=students',
      secondaryReviewHref: null,
    },
    {
      sessionId: 'session-1',
      lessonId: 'lesson-1',
      lessonTitle: '导学任务讲解',
      classId: 'class-1',
      className: '七年级一班',
      startedAt: '2026-05-12T08:00:00.000Z',
      endedAt: '2026-05-12T08:40:00.000Z',
      completionRate: 0.92,
      submissionRate: 0.84,
      followUpSignalsCount: 0,
      pendingFeedbackCount: 0,
      attentionCount: 0,
      unevaluatedCount: 0,
      trendLabel: '上升',
      primaryRecapHref: '/classroom?sessionId=session-1&recapTab=students',
      secondaryReviewHref: null,
    },
  ],
  studentSummaries: [
    {
      studentId: 'student-1',
      studentName: '韩梅梅',
      latestParticipationLabel: '需要关注',
      needsFollowUpSessions: 3,
      unevaluatedSessions: 1,
      missingSubmissionSessions: 2,
      pendingFeedbackSessions: 1,
      primarySignalLabel: '需关注',
      primaryRecapHref: '/classroom?sessionId=session-3&recapTab=students&studentId=student-1',
      secondaryReviewHref: '/teacher/review?lessonId=lesson-3&filter=needs_feedback&studentId=student-1',
    },
  ],
  selectedSessionId: 'session-3',
  selectedDetail: {
    session: {
      sessionId: 'session-3',
      lessonId: 'lesson-3',
      lessonTitle: '函数图像复盘',
      classId: 'class-1',
      className: '七年级一班',
      startedAt: '2026-05-14T08:00:00.000Z',
      endedAt: '2026-05-14T08:40:00.000Z',
      completionRate: 0.7,
      submissionRate: 0.6,
      followUpSignalsCount: 3,
      pendingFeedbackCount: 2,
      attentionCount: 2,
      unevaluatedCount: 1,
      trendLabel: '需关注',
      primaryRecapHref: '/classroom?sessionId=session-3&recapTab=students',
      secondaryReviewHref: '/teacher/review?lessonId=lesson-3&filter=needs_feedback',
    },
    summary: '七年级一班 在本次课堂中有 3 个需优先查看的趋势信号。',
    keySignals: ['3 个课堂信号需要跟进', '2 项待反馈提交', '1 名学生仍处于未评价'],
    impactedStudents: [
      {
        studentId: 'student-1',
        studentName: '韩梅梅',
        participationLabel: '需要关注',
        needsFollowUp: true,
        pendingFeedbackCount: 1,
        keySignals: ['课堂表现被标记为需要关注', '仍有 2 个关键提交未完成'],
        primaryRecapHref: '/classroom?sessionId=session-3&recapTab=students&studentId=student-1',
        secondaryReviewHref: '/teacher/review?lessonId=lesson-3&filter=needs_feedback&studentId=student-1',
      },
    ],
    primaryRecapHref: '/classroom?sessionId=session-3&recapTab=students',
    secondaryReviewHref: '/teacher/review?lessonId=lesson-3&filter=needs_feedback',
  },
}

describe('TeacherTrendsSurface', () => {
  it('renders all available recent sessions when fewer than four ended sessions exist', () => {
    render(
      <TeacherTrendsSurface
        trend={trend}
        filters={{ classId: 'class-1', lessonId: null, studentId: null, sessionId: null, view: 'sessions', limit: 4 }}
      />, 
    )

    expect(screen.getByText('最近 3 次已结束课堂')).toBeTruthy()
    expect(screen.getAllByText('函数图像复盘').length).toBeGreaterThan(0)
    expect(screen.getByText('实验记录整理')).toBeTruthy()
    expect(screen.getByText('导学任务讲解')).toBeTruthy()
  })

  it('keeps anomaly detail inline-first and sends the primary CTA back to classroom recap', () => {
    render(
      <TeacherTrendsSurface
        trend={trend}
        filters={{ classId: 'class-1', lessonId: null, studentId: null, sessionId: 'session-3', view: 'sessions', limit: 4 }}
      />,
    )

    expect(screen.getAllByText('Session summary').length).toBeGreaterThan(0)
    expect(screen.getByText('Impacted students')).toBeTruthy()
    expect(screen.getAllByText('韩梅梅').length).toBeGreaterThan(0)
    expect(screen.getByText('3 个课堂信号需要跟进')).toBeTruthy()
    expect(screen.getByRole('link', { name: '回到课堂复盘' }).getAttribute('href')).toBe(
      '/classroom?sessionId=session-3&recapTab=students',
    )
    expect(screen.getByRole('link', { name: '进入反馈跟进' }).getAttribute('href')).toBe(
      '/teacher/review?lessonId=lesson-3&filter=needs_feedback',
    )
  })

  it('keeps the review CTA secondary-only when feedback follow-up does not exist', () => {
    render(
      <TeacherTrendsSurface
        trend={{
          ...trend,
          selectedSessionId: 'session-2',
          selectedDetail: {
            ...trend.selectedDetail!,
            session: trend.sessionPoints[1],
            summary: '七年级一班 在本次课堂中有 1 个需优先查看的趋势信号。',
            keySignals: ['1 个课堂信号需要跟进'],
            impactedStudents: [],
            primaryRecapHref: '/classroom?sessionId=session-2&recapTab=students',
            secondaryReviewHref: null,
          },
        }}
        filters={{ classId: 'class-1', lessonId: null, studentId: null, sessionId: 'session-2', view: 'sessions', limit: 4 }}
      />,
    )

    expect(screen.getByRole('link', { name: '回到课堂复盘' }).getAttribute('href')).toBe(
      '/classroom?sessionId=session-2&recapTab=students',
    )
    expect(screen.queryByRole('link', { name: '进入反馈跟进' })).toBeNull()
  })

  it('keeps the responsive analytics layout contract without horizontal scroll wrappers', () => {
    expect(source).toContain('surfaceWidths.workspace')
    expect(source).toContain('surfaceWidths.heroBody')
    expect(source).toContain('teacherSurfaceRhythm.stack')
    expect(source).toContain('grid gap-4 md:grid-cols-2')
    expect(source).toContain('xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.4fr)]')
    expect(source).not.toContain('overflow-x-auto')
  })
})
