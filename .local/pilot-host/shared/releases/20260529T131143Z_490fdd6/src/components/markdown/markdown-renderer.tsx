'use client'

import { useEffect, useId, useMemo, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import mermaid from 'mermaid'
import Reveal from 'reveal.js'

import type { ClassroomSlideStateDTO } from '@/lib/dto/classroom'
import type { LessonStepDTO } from '@/lib/dto/lesson-authoring'

type RevealDeck = Awaited<ReturnType<InstanceType<typeof Reveal>['initialize']>>
type MarkdownStepLike = LessonStepDTO | { payload: Extract<LessonStepDTO['payload'], { type: 'content' }>; title: string }

type MarkdownRendererProps = {
  step: MarkdownStepLike
  slideState?: ClassroomSlideStateDTO | null
  locked?: boolean
  isTeacher?: boolean
  onSlideChange?: (slideIndex: number) => void
}

function splitRevealSlides(source: string) {
  return source
    .split(/^---$/m)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function MarkdownRenderer({ step, slideState, locked = false, isTeacher = false, onSlideChange }: MarkdownRendererProps) {
  if (step.payload.type !== 'content') {
    return null
  }

  const markdown = step.payload.markdown
  const mermaidId = useId()
  const revealRef = useRef<HTMLDivElement | null>(null)
  const revealDeckRef = useRef<RevealDeck | null>(null)

  const source = markdown?.source ?? step.payload.body
  const renderMode = markdown?.renderMode ?? 'document'
  const slides = useMemo(() => splitRevealSlides(source), [source])

  useEffect(() => {
    if (!markdown?.mermaidEnabled || renderMode !== 'document') {
      return
    }

    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' })
    const nodes = document.querySelectorAll(`[data-mermaid-root="${mermaidId}"] .language-mermaid`)
    nodes.forEach((node, index) => {
      const parent = node.parentElement
      const text = node.textContent?.trim()
      if (!parent || !text) return
      void mermaid.render(`${mermaidId}-${index}`, text).then(({ svg }) => {
        parent.innerHTML = svg
      }).catch(() => {
        parent.textContent = text
      })
    })
  }, [markdown?.mermaidEnabled, mermaidId, renderMode, source])

  useEffect(() => {
    if (renderMode !== 'reveal' || !revealRef.current) {
      return
    }

    const deck = new Reveal(revealRef.current, {
      embedded: true,
      controls: isTeacher || !locked,
      keyboardCondition: 'focused',
      progress: true,
      touch: isTeacher || !locked,
    })

    revealDeckRef.current = deck
    void deck.initialize().then(() => {
      if (typeof slideState?.slideIndex === 'number') {
        deck.slide(slideState.slideIndex)
      }
      deck.on('slidechanged', (event: unknown) => {
        const nextIndex = typeof event === 'object' && event !== null && 'indexh' in event && typeof (event as { indexh?: unknown }).indexh === 'number'
          ? (event as { indexh: number }).indexh
          : 0
        onSlideChange?.(nextIndex)
      })
    })

    return () => {
      void deck.destroy()
      revealDeckRef.current = null
    }
  }, [isTeacher, locked, onSlideChange, renderMode, slideState?.slideIndex])

  useEffect(() => {
    if (renderMode !== 'reveal' || !revealDeckRef.current || typeof slideState?.slideIndex !== 'number') {
      return
    }

    const indices = revealDeckRef.current.getIndices()
    if (indices.h !== slideState.slideIndex) {
      revealDeckRef.current.slide(slideState.slideIndex)
    }
  }, [renderMode, slideState?.slideIndex])

  if (renderMode === 'reveal') {
    return (
      <div className="rounded-[1.5rem] bg-surface-container-low p-4">
        <div className="reveal" ref={revealRef}>
          <div className="slides">
            {slides.map((slide, index) => (
              <section key={`${index}-${slide.slice(0, 12)}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{slide}</ReactMarkdown>
              </section>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div data-mermaid-root={mermaidId} className="prose prose-neutral max-w-none text-on-surface">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
    </div>
  )
}
