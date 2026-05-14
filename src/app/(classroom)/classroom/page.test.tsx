import { describe, expect, it } from 'vitest'

describe('classroom page route posture', () => {
  it('keeps ended/history recap inside /classroom with server-side recap selection', async () => {
    const source = await import('node:fs').then((fs) => fs.readFileSync('src/app/(classroom)/classroom/page.tsx', 'utf8'))

    expect(source).toContain('getClassroomSessionRecapDTO')
    expect(source).toContain("activeSession?.status === 'ended'")
    expect(source).toContain('consoleData.sessionEntries.find')
    expect(source).not.toContain('/teacher/review')
    expect(source).not.toContain('/teacher/analytics')
  })
})
