// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ClassroomSessionHistoryPanel } from './classroom-session-history-panel'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/classroom',
  useSearchParams: () => new URLSearchParams('sessionId=session-live'),
}))

describe('ClassroomSessionHistoryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a Chinese empty state when there is no classroom history', () => {
    render(<ClassroomSessionHistoryPanel sessions={[]} selectedSessionId={null} />)

    expect(screen.getByText('课堂记录')).toBeTruthy()
    expect(screen.getByText('还没有课堂记录')).toBeTruthy()
    expect(screen.getByText('开始并结束一节课堂后，这里会保留你的课堂复盘入口。')).toBeTruthy()
  })

  it('reopens ended sessions in the same /classroom route context', async () => {
    render(
      <ClassroomSessionHistoryPanel
        selectedSessionId="session-ended"
        sessions={[
          {
            id: 'session-live',
            lessonId: 'lesson-1',
            lessonTitle: '古诗导读',
            classId: 'class-1',
            className: '一班',
            updatedAt: '2026-05-14T08:10:00.000Z',
            startedAt: '2026-05-14T08:00:00.000Z',
            endedAt: null,
            locked: false,
            version: 2,
            status: 'live',
          },
          {
            id: 'session-ended',
            lessonId: 'lesson-2',
            lessonTitle: '小组讨论',
            classId: 'class-1',
            className: '一班',
            updatedAt: '2026-05-14T09:10:00.000Z',
            startedAt: '2026-05-14T09:00:00.000Z',
            endedAt: '2026-05-14T09:40:00.000Z',
            locked: true,
            version: 4,
            status: 'ended',
          },
        ]}
      />,
    )

    expect(screen.getByRole('button', { name: /小组讨论/ })).toBeTruthy()
    expect(screen.getByText('已结束')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /古诗导读/ }))

    expect(pushMock).toHaveBeenCalledWith('/classroom?sessionId=session-live')
  })
})
