// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import TeacherTrendsPage from './page'

const getClassroomConsoleDTO = vi.fn()
const getTeacherRecentSessionTrendDTO = vi.fn()
const teacherTrendsSurface = vi.fn()

vi.mock('@/lib/dal/classroom', () => ({
  getClassroomConsoleDTO: () => getClassroomConsoleDTO(),
  getTeacherRecentSessionTrendDTO: (...args: unknown[]) => getTeacherRecentSessionTrendDTO(...args),
}))

vi.mock('@/components/surfaces/teacher-trends-surface', () => ({
  TeacherTrendsSurface: (props: unknown) => {
    teacherTrendsSurface(props)
    return <div>teacher trends surface</div>
  },
}))

describe('TeacherTrendsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getClassroomConsoleDTO.mockResolvedValue({
      sessionEntries: [
        {
          id: 'session-1',
          classId: 'class-1',
        },
      ],
      publishedLessons: [],
    })
    getTeacherRecentSessionTrendDTO.mockResolvedValue({
      classSummary: { classId: 'class-1', className: '七年级一班' },
      sessionPoints: [],
    })
  })

  it('defaults to the first available class-first recent-session trends view', async () => {
    render(await TeacherTrendsPage({ searchParams: Promise.resolve({}) }))

    expect(getTeacherRecentSessionTrendDTO).toHaveBeenCalledWith({
      classId: 'class-1',
      lessonId: undefined,
      studentId: undefined,
      sessionId: undefined,
      view: 'sessions',
      limit: 4,
    })
    expect(screen.getByText('teacher trends surface')).toBeTruthy()
    expect(teacherTrendsSurface).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          classId: 'class-1',
          view: 'sessions',
          limit: 4,
        }),
      }),
    )
  })

  it('passes explicit drill-down params through the trends route contract', async () => {
    render(
      await TeacherTrendsPage({
        searchParams: Promise.resolve({
          classId: 'class-2',
          lessonId: 'lesson-9',
          studentId: 'student-3',
          sessionId: 'session-9',
          view: 'sessions',
          limit: '3',
        }),
      }),
    )

    expect(getTeacherRecentSessionTrendDTO).toHaveBeenCalledWith({
      classId: 'class-2',
      lessonId: 'lesson-9',
      studentId: 'student-3',
      sessionId: 'session-9',
      view: 'sessions',
      limit: 3,
    })
  })
})
