"use client"

import { useEffect, useMemo, useState } from "react"

import {
  createRuntimeBridgeMessageId,
  parseRuntimeBridgeMessage,
  RUNTIME_HOST_BRIDGE_CHANNEL,
} from "@/features/runtime-platform/host"
import type { TeachingBridgeResultEnvelope } from "@/features/runtime-platform/contracts/bridge"

type ExamQuestion = {
  id: string
  type: "single-choice" | "multi-choice" | "true-false" | "fill-blank" | "subjective"
  title: string
  options?: { id: string; text: string }[]
  score: number
}

type ExamState = {
  examId: string
  questions: ExamQuestion[]
  answers: Record<string, string | string[]>
  currentIndex: number
  submitted: boolean
  timeLimit?: number
  startedAt?: string
}

type RuntimeBridgeContext = {
  classroomSessionId: string
  stepId: string
  lessonId?: string
  publishedVersionId?: string
  sessionId?: string
  runtimeVersion?: string
}

type TerminalSubmitState = {
  title: string
  submittedStateLabel: string
  summary: Record<string, unknown>
}

const DEFAULT_STATE: ExamState = {
  examId: "",
  questions: [],
  answers: {},
  currentIndex: 0,
  submitted: false,
}

function postToHost(message: Record<string, unknown>) {
  window.parent.postMessage(message, "*")
}

function syncHeight() {
  postToHost({
    channel: RUNTIME_HOST_BRIDGE_CHANNEL,
    kind: "runtime-height-change",
    runtimeInstanceId: "exam-runtime",
    sentAt: new Date().toISOString(),
    height: document.documentElement.scrollHeight,
  })
}

export default function ExamRuntimePage() {
  const [runtimeInstanceId, setRuntimeInstanceId] = useState<string | null>(null)
  const [bridgeContext, setBridgeContext] = useState<RuntimeBridgeContext | null>(null)
  const [status, setStatus] = useState("等待宿主 bootstrap...")
  const [exam, setExam] = useState<ExamState>(DEFAULT_STATE)
  const [lastFailedAction, setLastFailedAction] = useState<"runtime-save" | "runtime-submit" | null>(null)
  const [terminalSubmitState, setTerminalSubmitState] = useState<TerminalSubmitState | null>(null)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  const isTerminalSubmitState = terminalSubmitState !== null

  const currentQuestion = exam.questions[exam.currentIndex]
  const progress = exam.questions.length > 0 ? (exam.currentIndex + 1) / exam.questions.length : 0
  const answeredCount = Object.keys(exam.answers).length

  const summary = useMemo(() => ({
    examId: exam.examId,
    questionCount: exam.questions.length,
    answeredCount,
    currentIndex: exam.currentIndex + 1,
    timeLeft,
    submitted: exam.submitted,
  }), [exam.examId, exam.questions.length, answeredCount, exam.currentIndex, timeLeft, exam.submitted])

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const message = parseRuntimeBridgeMessage(event.data)
      if (!message || message.channel !== RUNTIME_HOST_BRIDGE_CHANNEL) return

      if (message.kind === "runtime-bootstrap" && "bootstrap" in message) {
        const bootstrap = message.bootstrap as { stepSummary?: { stepId?: string; payload?: { runtime?: { exam?: ExamState["questions"]; timeLimit?: number } } }; classroomSummary?: { classroomSessionId?: string }; lessonSummary?: { lessonId?: string; publishedVersionId?: string }; sessionId?: string; runtimeVersion?: string; latestStateSummary?: { summary?: ExamState } } | null

        setRuntimeInstanceId(message.runtimeInstanceId)
        setBridgeContext({
          classroomSessionId: bootstrap?.classroomSummary?.classroomSessionId ?? "preview-classroom-session",
          lessonId: bootstrap?.lessonSummary?.lessonId,
          publishedVersionId: bootstrap?.lessonSummary?.publishedVersionId,
          stepId: bootstrap?.stepSummary?.stepId ?? "preview-step",
          sessionId: bootstrap?.sessionId,
          runtimeVersion: bootstrap?.runtimeVersion,
        })
        setStatus("已收到宿主 bootstrap，正在加载考试...")

        const latestState = bootstrap?.latestStateSummary?.summary as ExamState | undefined
        if (latestState && latestState.examId) {
          setExam({
            examId: latestState.examId,
            questions: latestState.questions,
            answers: latestState.answers ?? {},
            currentIndex: latestState.currentIndex ?? 0,
            submitted: latestState.submitted ?? false,
            timeLimit: latestState.timeLimit,
            startedAt: latestState.startedAt,
          })
          if (latestState.timeLimit && latestState.startedAt) {
            const elapsed = (Date.now() - new Date(latestState.startedAt).getTime()) / 1000
            setTimeLeft(Math.max(0, latestState.timeLimit * 60 - elapsed))
          }
        } else {
          const payload = bootstrap?.stepSummary?.payload as { runtime?: { exam?: ExamState["questions"]; timeLimit?: number } } | undefined
          const questions = payload?.runtime?.exam ?? []
          const timeLimit = payload?.runtime?.timeLimit
          setExam({
            examId: payload?.runtime?.exam?.[0]?.id ?? "exam-" + Date.now(),
            questions,
            answers: {},
            currentIndex: 0,
            submitted: false,
            timeLimit,
            startedAt: timeLimit ? new Date().toISOString() : undefined,
          })
          if (timeLimit) {
            setTimeLeft(timeLimit * 60)
          }
        }

        postToHost({
          channel: RUNTIME_HOST_BRIDGE_CHANNEL,
          version: "v2",
          messageId: createRuntimeBridgeMessageId(),
          correlationId: createRuntimeBridgeMessageId(),
          runtimeInstanceId: message.runtimeInstanceId,
          kind: "runtime-ready",
          sentAt: new Date().toISOString(),
          capabilityContext: {
            actorId: "exam-runtime",
            actorScope: "student",
            grantedCapabilities: ["runtime:ready", "runtime:state:save", "runtime:submission:create"],
          },
          payload: {
            classroomSessionId: bridgeContext?.classroomSessionId ?? "preview-classroom-session",
            lessonId: bridgeContext?.lessonId,
            publishedVersionId: bridgeContext?.publishedVersionId,
            stepId: bridgeContext?.stepId,
            sessionId: bridgeContext?.sessionId,
            runtimeVersion: bridgeContext?.runtimeVersion,
            readyState: "ready",
            metadata: { surface: (message as { surface?: string }).surface },
          },
        })

        syncHeight()
        return
      }

      if (message.kind === "host-action-result") {
        const envelope = message as TeachingBridgeResultEnvelope
        if (envelope.requestKind === "runtime-save") {
          setLastFailedAction(envelope.status === "ok" ? null : "runtime-save")
          setStatus(envelope.status === "ok" ? "答题进度已保存" : "保存失败，请重试")
          return
        }
        if (envelope.requestKind === "runtime-submit") {
          if (envelope.status === "ok" && envelope.result?.requestKind === "runtime-submit") {
            setLastFailedAction(null)
            setTerminalSubmitState({
              title: envelope.result.proofSummary.title,
              submittedStateLabel: envelope.result.proofSummary.submittedStateLabel,
              summary: envelope.result.proofSummary.summary,
            })
            setStatus("考试已提交")
          } else {
            setLastFailedAction("runtime-submit")
            setStatus("提交失败，请重试")
          }
          return
        }
      }
    }

    window.addEventListener("message", handleMessage)

    postToHost({
      channel: RUNTIME_HOST_BRIDGE_CHANNEL,
      kind: "runtime-frame-ready",
      runtimeInstanceId: "exam-runtime",
      sentAt: new Date().toISOString(),
      metadata: { runtime: "exam-plugin" },
    })
    syncHeight()

    return () => window.removeEventListener("message", handleMessage)
  }, [bridgeContext])

  const handleSelectAnswer = (questionId: string, answer: string | string[]) => {
    if (exam.submitted) return
    setExam((prev) => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: answer },
    }))
    syncHeight()
  }

  const handleToggleMultiAnswer = (questionId: string, optionId: string) => {
    if (exam.submitted) return
    setExam((prev) => {
      const current = prev.answers[questionId]
      const currentArr = Array.isArray(current) ? current : []
      const newArr = currentArr.includes(optionId)
        ? currentArr.filter((id) => id !== optionId)
        : [...currentArr, optionId]
      return {
        ...prev,
        answers: { ...prev.answers, [questionId]: newArr },
      }
    })
    syncHeight()
  }

  const handleFillBlank = (questionId: string, text: string) => {
    if (exam.submitted) return
    setExam((prev) => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: text },
    }))
  }

  const handleSave = () => {
    if (!runtimeInstanceId || !bridgeContext || exam.submitted) return
    setLastFailedAction(null)
    setStatus("正在保存答题进度...")
    postToHost({
      channel: RUNTIME_HOST_BRIDGE_CHANNEL,
      version: "v2",
      messageId: createRuntimeBridgeMessageId(),
      correlationId: createRuntimeBridgeMessageId(),
      runtimeInstanceId,
      kind: "runtime-save",
      sentAt: new Date().toISOString(),
      capabilityContext: {
        actorId: "exam-runtime",
        actorScope: "student",
        grantedCapabilities: ["runtime:state:save"],
      },
      payload: {
        classroomSessionId: bridgeContext.classroomSessionId,
        lessonId: bridgeContext.lessonId,
        publishedVersionId: bridgeContext.publishedVersionId,
        sessionId: bridgeContext.sessionId,
        runtimeVersion: bridgeContext.runtimeVersion,
        stepId: bridgeContext.stepId,
        stateSchemaVersion: "exam-v1",
        state: exam,
        summary: {
          examId: exam.examId,
          questionCount: exam.questions.length,
          answeredCount: Object.keys(exam.answers).length,
          currentIndex: exam.currentIndex,
        },
      },
    })
  }

  const handleSubmit = () => {
    if (!runtimeInstanceId || !bridgeContext || exam.submitted) return
    setExam((prev) => ({ ...prev, submitted: true }))
    setLastFailedAction(null)
    setStatus("正在提交试卷...")
    postToHost({
      channel: RUNTIME_HOST_BRIDGE_CHANNEL,
      version: "v2",
      messageId: createRuntimeBridgeMessageId(),
      correlationId: createRuntimeBridgeMessageId(),
      runtimeInstanceId,
      kind: "runtime-submit",
      sentAt: new Date().toISOString(),
      capabilityContext: {
        actorId: "exam-runtime",
        actorScope: "student",
        grantedCapabilities: ["runtime:submission:create"],
      },
      payload: {
        classroomSessionId: bridgeContext.classroomSessionId,
        lessonId: bridgeContext.lessonId,
        publishedVersionId: bridgeContext.publishedVersionId,
        sessionId: bridgeContext.sessionId,
        runtimeVersion: bridgeContext.runtimeVersion,
        stepId: bridgeContext.stepId,
        stateSchemaVersion: "exam-v1",
        state: { ...exam, submitted: true },
        summary: {
          examId: exam.examId,
          questionCount: exam.questions.length,
          answeredCount: Object.keys(exam.answers).length,
          submitted: true,
        },
        submittedAt: new Date().toISOString(),
      },
    })
  }

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || exam.submitted) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer)
          if (!exam.submitted) {
            handleSubmit()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeft, exam.submitted])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const currentAnswer = currentQuestion ? exam.answers[currentQuestion.id] : undefined

  return (
    <main className="min-h-screen bg-[#f4f7fb] p-4 text-[#10233f] sm:p-6">
      <div className="mx-auto max-w-4xl space-y-4 rounded-[28px] bg-white p-6 shadow-[0_24px_80px_rgba(16,35,63,0.12)]">
        <section className="rounded-[24px] bg-[linear-gradient(135deg,#10233f,#1d4ed8)] p-5 text-white">
          <p className="text-xs uppercase tracking-[0.18em] text-white/70">考试插件</p>
          <h1 className="mt-3 text-3xl font-semibold">在线考试</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/80">
            共 {exam.questions.length} 题，已作答 {answeredCount} 题
            {timeLeft !== null && !exam.submitted && (
              <span className="ml-4 text-yellow-200">剩余时间：{formatTime(timeLeft)}</span>
            )}
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4 rounded-[24px] bg-[#f8fbff] p-5">
            {isTerminalSubmitState && (
              <div className="rounded-[20px] bg-[#ecfdf3] p-4 text-[#0f5132] shadow-[inset_0_0_0_1px_rgba(15,81,50,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">考试已完成</p>
                <h2 className="mt-2 text-xl font-semibold">{terminalSubmitState.title}</h2>
                <p className="mt-2 text-sm leading-7">你的考试结果已提交，请等待老师批阅。</p>
              </div>
            )}

            {lastFailedAction && !isTerminalSubmitState && (
              <div className="rounded-[20px] bg-[#fef2f2] p-4 text-[#991b1b] shadow-[inset_0_0_0_1px_rgba(153,27,27,0.08)]">
                <p className="text-sm font-semibold">
                  {lastFailedAction === "runtime-submit"
                    ? "提交失败，请重试"
                    : "保存失败，请重试"}
                </p>
              </div>
            )}

            {!isTerminalSubmitState && currentQuestion && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#5b6b82]">
                    第 {exam.currentIndex + 1} / {exam.questions.length} 题
                    <span className="ml-2 text-xs">（{currentQuestion.score} 分）</span>
                  </span>
                  <span className="text-sm text-[#5b6b82]">{currentQuestion.type === "single-choice" ? "单选" : currentQuestion.type === "multi-choice" ? "多选" : currentQuestion.type === "true-false" ? "判断" : currentQuestion.type === "fill-blank" ? "填空" : "简答"}</span>
                </div>

                <p className="text-lg font-medium leading-relaxed">{currentQuestion.title}</p>

                {currentQuestion.type === "single-choice" && currentQuestion.options && (
                  <div className="space-y-2">
                    {currentQuestion.options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectAnswer(currentQuestion.id, opt.id)}
                        className={`w-full rounded-[16px] border-0 px-4 py-3 text-left text-sm transition-colors ${
                          currentAnswer === opt.id
                            ? "bg-[#1d4ed8] text-white"
                            : "bg-white shadow-[inset_0_0_0_1px_rgba(16,35,63,0.08)] hover:bg-[#f0f4ff]"
                        }`}
                      >
                        {opt.text}
                      </button>
                    ))}
                  </div>
                )}

                {currentQuestion.type === "multi-choice" && currentQuestion.options && (
                  <div className="space-y-2">
                    {currentQuestion.options.map((opt) => {
                      const selected = Array.isArray(currentAnswer) && currentAnswer.includes(opt.id)
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleToggleMultiAnswer(currentQuestion.id, opt.id)}
                          className={`w-full rounded-[16px] border-0 px-4 py-3 text-left text-sm transition-colors ${
                            selected
                              ? "bg-[#1d4ed8] text-white"
                              : "bg-white shadow-[inset_0_0_0_1px_rgba(16,35,63,0.08)] hover:bg-[#f0f4ff]"
                          }`}
                        >
                          {opt.text}
                        </button>
                      )
                    })}
                  </div>
                )}

                {currentQuestion.type === "true-false" && (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleSelectAnswer(currentQuestion.id, "true")}
                      className={`flex-1 rounded-[16px] border-0 px-4 py-3 text-sm transition-colors ${
                        currentAnswer === "true"
                          ? "bg-[#1d4ed8] text-white"
                          : "bg-white shadow-[inset_0_0_0_1px_rgba(16,35,63,0.08)] hover:bg-[#f0f4ff]"
                      }`}
                    >
                      正确
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectAnswer(currentQuestion.id, "false")}
                      className={`flex-1 rounded-[16px] border-0 px-4 py-3 text-sm transition-colors ${
                        currentAnswer === "false"
                          ? "bg-[#1d4ed8] text-white"
                          : "bg-white shadow-[inset_0_0_0_1px_rgba(16,35,63,0.08)] hover:bg-[#f0f4ff]"
                      }`}
                    >
                      错误
                    </button>
                  </div>
                )}

                {currentQuestion.type === "fill-blank" && (
                  <input
                    type="text"
                    value={String(currentAnswer ?? "")}
                    onChange={(e) => handleFillBlank(currentQuestion.id, e.target.value)}
                    className="w-full rounded-[16px] border-0 bg-white px-4 py-3 text-sm shadow-[inset_0_0_0_1px_rgba(16,35,63,0.08)] outline-none"
                    placeholder="请输入答案"
                  />
                )}

                {currentQuestion.type === "subjective" && (
                  <textarea
                    value={String(currentAnswer ?? "")}
                    onChange={(e) => handleSelectAnswer(currentQuestion.id, e.target.value)}
                    className="w-full rounded-[16px] border-0 bg-white px-4 py-3 text-sm shadow-[inset_0_0_0_1px_rgba(16,35,63,0.08)] outline-none min-h-32"
                    placeholder="请输入答案"
                  />
                )}
              </div>
            )}

            {!isTerminalSubmitState && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setExam((prev) => ({ ...prev, currentIndex: Math.max(0, prev.currentIndex - 1) }))}
                  disabled={exam.currentIndex === 0}
                  className="rounded-full bg-[#10233f] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  上一题
                </button>
                <button
                  type="button"
                  onClick={() => setExam((prev) => ({ ...prev, currentIndex: Math.min(prev.questions.length - 1, prev.currentIndex + 1) }))}
                  disabled={exam.currentIndex >= exam.questions.length - 1}
                  className="rounded-full bg-[#10233f] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  下一题
                </button>
              </div>
            )}
          </div>

          <aside className="space-y-4 rounded-[24px] bg-[#f8fbff] p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#5b6b82]">状态</p>
              <p className="mt-3 text-sm leading-7 text-[#10233f] whitespace-pre-line">{status}</p>
            </div>

            <div className="rounded-[20px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(16,35,63,0.08)]">
              <p className="text-sm font-semibold">答题进度</p>
              <div className="mt-3 h-2 w-full rounded-full bg-[#e8edf5]">
                <div
                  className="h-2 rounded-full bg-[#1d4ed8] transition-all"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <dl className="mt-3 space-y-2 text-sm text-[#5b6b82]">
                <div className="flex items-center justify-between gap-4">
                  <dt>已作答</dt>
                  <dd>{answeredCount} / {exam.questions.length}</dd>
                </div>
                {timeLeft !== null && !exam.submitted && (
                  <div className="flex items-center justify-between gap-4">
                    <dt>剩余时间</dt>
                    <dd className={timeLeft < 300 ? "text-red-500" : ""}>{formatTime(timeLeft)}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="flex flex-wrap gap-2">
              {exam.questions.map((q, i) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setExam((prev) => ({ ...prev, currentIndex: i }))}
                  className={`size-8 rounded-full text-xs font-semibold transition-colors ${
                    i === exam.currentIndex
                      ? "bg-[#1d4ed8] text-white"
                      : exam.answers[q.id]
                        ? "bg-[#d8ffaf] text-[#335e00]"
                        : "bg-white shadow-[inset_0_0_0_1px_rgba(16,35,63,0.08)]"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            {!isTerminalSubmitState && (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={exam.submitted}
                  className="rounded-full bg-[#dbeafe] px-4 py-3 text-sm font-semibold text-[#1d4ed8] disabled:opacity-50"
                >
                  保存进度
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={exam.submitted}
                  className="rounded-full bg-[#1d4ed8] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  提交试卷
                </button>
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  )
}
