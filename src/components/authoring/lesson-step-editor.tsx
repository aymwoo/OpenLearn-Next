"use client";

import { useRouter } from "next/navigation";
import { Clock3, Eye, FileText } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { autosaveLessonStepAction, saveQuizSampleLessonStepAction, saveVotingLessonStepAction, uploadLessonMarkdownAssetAction } from "@/actions/lesson-authoring-actions";
import {
  lessonStepEditorResetRequestEvent,
  lessonStepEditorSaveRequestEvent,
} from "@/components/authoring/editor-command-events";
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { lessonStepPayloadSchema, type LessonStepDTO, type LessonStepPayload } from "@/lib/dto/lesson-authoring";
import { BUILT_IN_TEACHING_STEP_DEFINITIONS, ClassroomVotingAuthoringConfigSchema, QuizSampleAuthoringConfigSchema } from "@/lib/dto/resource-ai";

type LessonStepEditorProps = {
  step: LessonStepDTO | null;
  schoolId?: string;
  courseId?: string;
  className?: string;
  onCancel?: () => void;
};

const savingCopy = "正在保存...";
const savedCopy = "已保存";
const restoredCopy = "已恢复到最近一次保存的内容。";
const validationCopy = "输入内容不完整，请检查后再保存。";
const conflictCopy = "检测到更新冲突，请刷新后再试。";
const previewLabel = "实时预览";
const fieldClassName =
  "w-full rounded-none border-0 bg-surface-container-high px-4 py-3 text-on-surface outline-none transition focus-visible:bg-surface-container-lowest focus-visible:outline-2 focus-visible:outline-primary/20";

const submissionTypeLabels = {
  text: "文字",
  image: "图片",
  file: "文件",
  link: "链接",
} as const;

type EditorState = {
  title: string;
  contentBody: string;
  teacherNotes: string;
   markdownSource: string;
   markdownTitle: string;
   markdownRenderMode: "document" | "reveal";
   markdownMermaidEnabled: boolean;
   markdownAssetResourceId: string;
   markdownAssetMaterialId: string;
  taskPrompt: string;
  submissionType: "text" | "image" | "file" | "link";
  successCriteria: string;
  quizQuestion: string;
  quizOptions: string;
  correctOptionIndex: string;
  explanation: string;
  materialRefsText: string;
  votingPrompt: string;
  votingOptions: Array<{ id: string; label: string }>;
  votingAllowMultiple: boolean;
  votingAnonymousResults: boolean;
  votingShowLiveResults: boolean;
  votingParticipationWindowSeconds: string;
  votingResultsDisplay: "bar" | "column" | "compact";
  homeworkTitle: string;
  homeworkDescription: string;
  homeworkAttachmentUrl: string;
};

type VotingValidationState = {
  general: string | null;
  fallback: string | null;
  fields: {
    prompt?: string;
    options?: string;
    optionLabels?: Record<number, string>;
    participationWindowSeconds?: string;
  };
};

type QuizSampleValidationState = {
  general: string | null;
  fallback: string | null;
  fields: {
    prompt?: string;
    options?: string;
    correctOption?: string;
    optionLabels?: Record<number, string>;
  };
};

const classroomVotingDefinition = BUILT_IN_TEACHING_STEP_DEFINITIONS.find((item) => item.builtInKey === "classroomVoting");
const classroomVotingDefaultConfig = classroomVotingDefinition?.authoringContract?.defaultConfig;

if (!classroomVotingDefaultConfig || !classroomVotingDefinition?.authoringContract) {
  throw new Error("Classroom voting authoring contract missing");
}

const guaranteedVotingDefaultConfig = ClassroomVotingAuthoringConfigSchema.parse(classroomVotingDefaultConfig);
const quizSampleDefinition = BUILT_IN_TEACHING_STEP_DEFINITIONS.find((item) => item.builtInKey === "quizSample");

if (!quizSampleDefinition?.authoringContract) {
  throw new Error("Quiz sample authoring contract missing");
}

const quizSampleDefaultConfig = QuizSampleAuthoringConfigSchema.parse(quizSampleDefinition?.authoringContract?.defaultConfig);

function isClassroomVotingStep(step: LessonStepDTO) {
  return step.type === "quiz"
    && step.payload.type === "quiz"
    && step.payload.builtInSource?.builtInKey === "classroomVoting";
}

function isQuizSampleStep(step: LessonStepDTO) {
  return step.type === "quiz"
    && step.payload.type === "quiz"
    && step.payload.builtInSource?.builtInKey === "quizSample";
}

function isHomeworkStep(step: LessonStepDTO) {
  return step.type === "task"
    && (step.payload as { builtInSource?: { builtInKey?: string } }).builtInSource?.builtInKey === "homework";
}

function getPersistedVotingConfig(step: LessonStepDTO) {
  const persisted = step.pluginAuthoring?.persistedConfigJson as { executableConfig?: unknown } | undefined;
  const parsed = ClassroomVotingAuthoringConfigSchema.safeParse(persisted?.executableConfig);
  if (parsed.success) {
    return { config: parsed.data, fallback: null as string | null };
  }

  return {
    config: classroomVotingDefaultConfig,
    fallback: step.pluginAuthoring?.fallbackMessage ?? null,
  };
}

function resolveVotingSeed(step: LessonStepDTO) {
  const seed = isClassroomVotingStep(step)
    ? getPersistedVotingConfig(step).config
    : guaranteedVotingDefaultConfig;

  if (!seed) {
    throw new Error("Voting seed missing");
  }

  return seed;
}

function getPersistedQuizSampleConfig(step: LessonStepDTO) {
  const persisted = step.pluginAuthoring?.persistedConfigJson as { executableConfig?: unknown } | undefined;
  const parsed = QuizSampleAuthoringConfigSchema.safeParse(persisted?.executableConfig);

  if (parsed.success) {
    return { config: parsed.data, fallback: null as string | null };
  }

  return {
    config: quizSampleDefaultConfig,
    fallback: step.pluginAuthoring?.fallbackMessage ?? null,
  };
}

function buildQuizSampleValidation(state: EditorState): QuizSampleValidationState {
  const options = state.quizOptions
    .split("\n")
    .map((line, index) => ({ index, label: line.trim() }))
    .filter((option) => option.label.length > 0);

      const optionLabels: Record<number, string> = {};

  const selected = state.correctOptionIndex.trim();
  const enabledLetters = options.map((option) => String.fromCharCode(65 + option.index));

  return {
    general: null,
    fallback: null,
    fields: {
      prompt: state.quizQuestion.trim() ? undefined : "请填写题干。",
      options: options.length >= 2 ? undefined : "至少启用 2 个有效选项。",
      correctOption: selected && enabledLetters.includes(selected) ? undefined : "正确答案必须命中已启用选项。",
      optionLabels: Object.values(optionLabels).length > 0 ? optionLabels : undefined,
    },
  };
}

function hasQuizSampleValidationErrors(validation: QuizSampleValidationState) {
  return Boolean(
    validation.fields.prompt
      || validation.fields.options
      || validation.fields.correctOption
      || (validation.fields.optionLabels && Object.keys(validation.fields.optionLabels).length > 0),
  );
}

function buildVotingValidation(state: EditorState): VotingValidationState {
  const optionLabels: Record<number, string> = {};
  state.votingOptions.forEach((option, index) => {
    if (!option.label.trim()) optionLabels[index] = "请填写选项内容。";
  });

  const validOptions = state.votingOptions.filter((option) => option.label.trim()).length;
  const windowValue = Number(state.votingParticipationWindowSeconds);

  return {
    general: null,
    fallback: null,
    fields: {
      prompt: state.votingPrompt.trim() ? undefined : "请填写投票题目。",
      options: validOptions >= 2 && state.votingOptions.length <= 6 ? undefined : "请先填写投票题目和至少 2 个选项。",
      optionLabels: Object.keys(optionLabels).length > 0 ? optionLabels : undefined,
      participationWindowSeconds:
        Number.isFinite(windowValue) && windowValue >= 15 && windowValue <= 600
          ? undefined
          : "参与时长需在 15 到 600 秒之间。",
    },
  };
}

function hasVotingValidationErrors(validation: VotingValidationState) {
  return Boolean(
    validation.fields.prompt
      || validation.fields.options
      || validation.fields.participationWindowSeconds
      || (validation.fields.optionLabels && Object.keys(validation.fields.optionLabels).length > 0),
  );
}

function getFieldError(fieldErrors: Record<string, string[] | undefined>, ...keys: string[]) {
  for (const key of keys) {
    const message = fieldErrors[key]?.[0];
    if (message) {
      return message;
    }
  }

  return undefined;
}

function getOptionLabelFieldErrors(fieldErrors: Record<string, string[] | undefined>) {
  const optionLabels: Record<number, string> = {};

  for (const [key, messages] of Object.entries(fieldErrors)) {
    const match = key.match(/(?:^|\.)options\.(\d+)\.label$/);
    if (!match || !messages?.[0]) {
      continue;
    }

    optionLabels[Number(match[1])] = messages[0];
  }

  return Object.keys(optionLabels).length > 0 ? optionLabels : undefined;
}

function materialRefsToText(step: LessonStepDTO) {
  const refs = "materialRefs" in step.payload ? step.payload.materialRefs : [];
  return refs.map((ref) => ref.url ?? ref.title).join("\n");
}

function buildInitialState(step: LessonStepDTO): EditorState {
  const votingSeed = resolveVotingSeed(step);
  const quizSampleSeed = isQuizSampleStep(step) ? getPersistedQuizSampleConfig(step).config : quizSampleDefaultConfig;

  return {
    title: step.title,
    contentBody: step.payload.type === "content" ? step.payload.body : "",
    teacherNotes: step.payload.type === "content" ? step.payload.teacherNotes ?? "" : "",
    markdownSource: step.payload.type === "content" ? step.payload.markdown?.source ?? "" : "",
    markdownTitle: step.payload.type === "content" ? step.payload.markdown?.asset.title ?? step.title : step.title,
    markdownRenderMode: step.payload.type === "content" ? step.payload.markdown?.renderMode ?? "document" : "document",
    markdownMermaidEnabled: step.payload.type === "content" ? step.payload.markdown?.mermaidEnabled ?? false : false,
    markdownAssetResourceId: step.payload.type === "content" ? step.payload.markdown?.asset.resourceId ?? "" : "",
    markdownAssetMaterialId: step.payload.type === "content" ? step.payload.markdown?.asset.materialId ?? "" : "",
    taskPrompt: step.payload.type === "task" ? step.payload.prompt : "",
    submissionType: step.payload.type === "task" ? step.payload.submissionType : "text",
    successCriteria: step.payload.type === "task" ? step.payload.successCriteria ?? "" : "",
    quizQuestion: isQuizSampleStep(step) ? quizSampleSeed.prompt : step.payload.type === "quiz" ? step.payload.question : "",
    quizOptions: isQuizSampleStep(step)
      ? quizSampleSeed.options.map((option) => option.enabled ? option.label : "").join("\n")
      : step.payload.type === "quiz" ? step.payload.options.join("\n") : "",
    correctOptionIndex: isQuizSampleStep(step)
      ? quizSampleSeed.correctOption
      : step.payload.type === "quiz" && typeof step.payload.correctOptionIndex === "number"
        ? String(step.payload.correctOptionIndex)
        : "",
    explanation: step.payload.type === "quiz" ? step.payload.explanation ?? "" : "",
    materialRefsText: materialRefsToText(step),
    votingPrompt: votingSeed.prompt,
    votingOptions: votingSeed.options.map((option) => ({ ...option })),
    votingAllowMultiple: votingSeed.allowMultiple,
    votingAnonymousResults: votingSeed.anonymousResults,
    votingShowLiveResults: votingSeed.showLiveResults,
    votingParticipationWindowSeconds: String(votingSeed.participationWindowSeconds),
    votingResultsDisplay: votingSeed.resultsDisplay,
      homeworkTitle: isHomeworkStep(step) ? step.title : "",
      homeworkDescription: isHomeworkStep(step) && step.payload.type === "task" ? step.payload.prompt : "",
      homeworkAttachmentUrl: isHomeworkStep(step) && step.payload.type === "task" ? (step.payload.materialRefs?.[0]?.url ?? "") : "",
  };
}

function parseMaterialRefs(text: string, fallback: LessonStepDTO["payload"]) {
  const nextLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (nextLines.length === 0) {
    return "materialRefs" in fallback ? fallback.materialRefs : [];
  }

  return nextLines.map((line) => ({
    title: line,
    kind: "link",
    url: line.startsWith("http://") || line.startsWith("https://") ? line : undefined,
  }));
}

function parsePreviewMaterialRefs(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      title: line,
      url: line.startsWith("http://") || line.startsWith("https://") ? line : undefined,
    }));
}

function buildPayload(state: EditorState, step: LessonStepDTO): LessonStepPayload {
  const materialRefs = parseMaterialRefs(state.materialRefsText, step.payload);
  const builtInSource = step.payload.builtInSource;
  const markdown = state.markdownSource.trim() && state.markdownAssetResourceId.trim() && state.markdownAssetMaterialId.trim()
    ? {
        asset: {
          resourceId: state.markdownAssetResourceId.trim(),
          materialId: state.markdownAssetMaterialId.trim(),
          title: state.markdownTitle.trim() || state.title.trim(),
        },
        source: state.markdownSource.trim(),
        renderMode: state.markdownRenderMode,
        mermaidEnabled: state.markdownMermaidEnabled,
      }
    : undefined;

  if (step.type === "content" && step.payload.type === "content") {
    return {
      type: "content",
      title: state.title.trim(),
      body: state.contentBody.trim(),
      teacherNotes: state.teacherNotes.trim() || undefined,
      materialRefs,
      markdown,
      builtInSource,
    };
  }

  if (step.type === "task" && step.payload.type === "task") {
    if (isHomeworkStep(step)) {
      const homeworkMaterialRefs = state.homeworkAttachmentUrl.trim()
        ? [{ title: state.homeworkAttachmentUrl.trim(), kind: "link" as const, url: state.homeworkAttachmentUrl.trim() }]
        : [];
      return {
        type: "task",
        prompt: state.homeworkDescription.trim(),
        submissionType: "text" as const,
        successCriteria: undefined,
        allowRetry: step.payload.allowRetry,
        retryPolicy: step.payload.retryPolicy,
        materialRefs: homeworkMaterialRefs,
        builtInSource,
      };
    }
    return {
      type: "task",
      prompt: state.taskPrompt.trim(),
      submissionType: state.submissionType,
      successCriteria: state.successCriteria.trim() || undefined,
      allowRetry: step.payload.allowRetry,
      retryPolicy: step.payload.retryPolicy,
      materialRefs,
      builtInSource,
    };
  }

  const options = state.quizOptions
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    type: "quiz",
    question: state.quizQuestion.trim(),
    options,
    materialRefs,
    correctOptionIndex: state.correctOptionIndex.trim() ? Number(state.correctOptionIndex.trim()) : undefined,
    explanation: state.explanation.trim() || undefined,
    allowRetry: step.payload.type === "quiz" ? step.payload.allowRetry : undefined,
    retryPolicy: step.payload.type === "quiz" ? step.payload.retryPolicy : undefined,
    revealCorrectAnswer: step.payload.type === "quiz" ? step.payload.revealCorrectAnswer : undefined,
    builtInSource,
  };
}

export function LessonStepEditor({ step, schoolId, courseId, className, onCancel }: LessonStepEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [stateByStepId, setStateByStepId] = useState<Record<string, EditorState>>({});
  const [votingValidationByStepId, setVotingValidationByStepId] = useState<Record<string, VotingValidationState>>({});
  const [quizSampleValidationByStepId, setQuizSampleValidationByStepId] = useState<Record<string, QuizSampleValidationState>>({});
  const pendingStep = step;
  const pendingState = pendingStep ? stateByStepId[pendingStep.id] ?? buildInitialState(pendingStep) : null;
  const latestStepRef = useRef<LessonStepDTO | null>(null);
  const latestStateRef = useRef<EditorState | null>(null);
  const latestVotingValidationRef = useRef<VotingValidationState | null>(null);
  const latestQuizSampleValidationRef = useRef<QuizSampleValidationState | null>(null);

  const stepTypeLabel = useMemo(() => {
    if (!step) return "";
    if (isHomeworkStep(step)) return "作业";
    return step.type === "content" ? "内容" : step.type === "task" ? "任务" : "测验";
  }, [step]);
  const builtInSourceLabel = useMemo(() => {
    if (!step?.payload.builtInSource) return null;
    return `内置环节 · ${step.payload.builtInSource.pluginName}`;
  }, [step]);

  useEffect(() => {
    if (!pendingStep || !pendingState) {
      return;
    }

    function handleSaveRequest(event: Event) {
      event.preventDefault();
      saveStep();
    }

    function handleResetRequest(event: Event) {
      event.preventDefault();
      resetStep();
    }

    window.addEventListener(lessonStepEditorSaveRequestEvent, handleSaveRequest);
    window.addEventListener(lessonStepEditorResetRequestEvent, handleResetRequest);

    return () => {
      window.removeEventListener(lessonStepEditorSaveRequestEvent, handleSaveRequest);
      window.removeEventListener(lessonStepEditorResetRequestEvent, handleResetRequest);
    };
  }, [pendingState, pendingStep, resetStep, saveStep]);

  if (!pendingStep || !pendingState) {
    return (
      <Card className={`bg-surface-container-low p-5 shadow-none ${className ?? ""}`.trim()}>
        <h3 className="text-2xl font-semibold">新增内容 / 新增任务 / 新增测验</h3>
        <p className="mt-3 text-on-surface-variant">选择左侧步骤，或先新增一个学习活动。</p>
      </Card>
    );
  }

  const activeStep = pendingStep;
  const activeState = pendingState;

  const activeVotingValidation = votingValidationByStepId[activeStep.id] ?? {
    general: null,
    fallback: isClassroomVotingStep(activeStep) ? getPersistedVotingConfig(activeStep).fallback : null,
    fields: {},
  };
  const activeQuizSampleValidation = quizSampleValidationByStepId[activeStep.id] ?? {
    general: null,
    fallback: isQuizSampleStep(activeStep) ? getPersistedQuizSampleConfig(activeStep).fallback : null,
    fields: {},
  };
  latestStepRef.current = activeStep;
  latestStateRef.current = activeState;
  latestVotingValidationRef.current = activeVotingValidation;
  latestQuizSampleValidationRef.current = activeQuizSampleValidation;
  const previewMaterialRefs = parsePreviewMaterialRefs(activeState.materialRefsText);
  const previewTitle = activeState.title.trim() || activeStep.title;
  const previewDescription = getPreviewDescription(activeStep, activeState);
  const previewSupport = getPreviewSupport(activeStep, activeState);
  const previewDuration = getPreviewDuration(activeStep.type);
  const primaryMaterial = previewMaterialRefs[0] ?? null;
  const remainingMaterialCount = Math.max(previewMaterialRefs.length - 1, 0);

  function updateField<Key extends keyof EditorState>(key: Key, value: EditorState[Key]) {
    setStateByStepId((prev) => ({
      ...prev,
      [activeStep.id]: {
        ...activeState,
        [key]: value,
      },
    }));

    if (isClassroomVotingStep(activeStep)) {
      setVotingValidationByStepId((prev) => ({
        ...prev,
        [activeStep.id]: {
          ...((prev[activeStep.id] ?? {
            general: null,
            fallback: activeVotingValidation.fallback,
            fields: {},
          }) as VotingValidationState),
          general: null,
          fields: {},
        },
      }));
      setStatus((currentStatus) => (currentStatus === "配置未通过校验，请先修正红色标记字段。" ? null : currentStatus));
    }

    if (isQuizSampleStep(activeStep)) {
      setQuizSampleValidationByStepId((prev) => ({
        ...prev,
        [activeStep.id]: {
          ...((prev[activeStep.id] ?? {
            general: null,
            fallback: activeQuizSampleValidation.fallback,
            fields: {},
          }) as QuizSampleValidationState),
          general: null,
          fields: {},
        },
      }));
      setStatus((currentStatus) => (currentStatus === "当前题目配置不完整，请补全题干、有效选项和正确答案后再继续。" ? null : currentStatus));
    }
  }

  function updateVotingValidation(next: VotingValidationState) {
    setVotingValidationByStepId((prev) => ({
      ...prev,
      [activeStep.id]: next,
    }));
  }

  function saveStep() {
    const currentStep = latestStepRef.current;
    const currentState = latestStateRef.current;
    const currentVotingValidation = latestVotingValidationRef.current;
    const currentQuizSampleValidation = latestQuizSampleValidationRef.current;
    if (!currentStep || !currentState || !currentVotingValidation || !currentQuizSampleValidation) {
      setStatus(validationCopy);
      return;
    }

    const isVotingStep = isClassroomVotingStep(currentStep);

    if (isVotingStep) {
      const clientValidation = buildVotingValidation(currentState);
      clientValidation.fallback = currentVotingValidation.fallback;
      if (hasVotingValidationErrors(clientValidation)) {
        clientValidation.general = "配置未通过校验，请先修正红色标记字段。";
        updateVotingValidation(clientValidation);
        setStatus("配置未通过校验，请先修正红色标记字段。");
        return;
      }
    }

    setStatus(savingCopy);
    startTransition(async () => {
      let nextState = currentState;

      if (
        currentStep.type === 'content' &&
        currentState.markdownSource.trim() &&
        !currentState.markdownAssetResourceId.trim() &&
        schoolId &&
        courseId
      ) {
        const uploaded = await uploadLessonMarkdownAssetAction({
          schoolId,
          courseId,
          title: currentState.markdownTitle.trim() || currentState.title.trim(),
          source: currentState.markdownSource.trim(),
        })

        if (!uploaded.ok || !uploaded.data || typeof uploaded.data !== 'object' || !('id' in uploaded.data)) {
          setStatus(validationCopy)
          return
        }

        nextState = {
          ...currentState,
          markdownAssetResourceId: String(uploaded.data.id),
          markdownAssetMaterialId: crypto.randomUUID(),
        }
        setStateByStepId((prev) => ({
          ...prev,
          [currentStep.id]: nextState,
        }))
      }

      if (isVotingStep) {
        const result = await saveVotingLessonStepAction({
          stepId: currentStep.id,
          title: nextState.title.trim(),
          pluginId: currentStep.payload.builtInSource!.pluginId,
          expectedUpdatedAt: currentStep.updatedAt,
          executableConfig: {
            prompt: nextState.votingPrompt.trim(),
            options: nextState.votingOptions.map((option) => ({ id: option.id, label: option.label.trim() })),
            allowMultiple: nextState.votingAllowMultiple,
            anonymousResults: nextState.votingAnonymousResults,
            showLiveResults: nextState.votingShowLiveResults,
            participationWindowSeconds: Number(nextState.votingParticipationWindowSeconds),
            resultsDisplay: nextState.votingResultsDisplay,
          },
        });

        if (result.ok) {
          updateVotingValidation({ general: null, fallback: null, fields: {} });
          setStatus("投票配置已保存，发布检查已同步刷新。");
          router.refresh();
          return;
        }

        const nextValidation: VotingValidationState = {
          general: result.message || "配置未通过校验，请先修正红色标记字段。",
          fallback: currentVotingValidation.fallback,
          fields: {},
        };
        if (result.fieldErrors) {
          nextValidation.fields.prompt = getFieldError(result.fieldErrors, "executableConfig.prompt", "prompt");
          nextValidation.fields.options = getFieldError(result.fieldErrors, "executableConfig.options", "options");
          nextValidation.fields.optionLabels = getOptionLabelFieldErrors(result.fieldErrors);
          nextValidation.fields.participationWindowSeconds = getFieldError(
            result.fieldErrors,
            "executableConfig.participationWindowSeconds",
            "participationWindowSeconds",
          );
        }
        updateVotingValidation(nextValidation);
        setStatus(result.error === "CONFLICT" ? "检测到更新冲突，请刷新课时后重新应用修改。" : (result.message || validationCopy));
        return;
      }

      if (isQuizSampleStep(currentStep)) {
        const clientValidation = buildQuizSampleValidation(nextState);
        clientValidation.fallback = currentQuizSampleValidation.fallback;
        if (hasQuizSampleValidationErrors(clientValidation)) {
          clientValidation.general = "当前题目配置不完整，请补全题干、有效选项和正确答案后再继续。";
          setQuizSampleValidationByStepId((prev) => ({ ...prev, [currentStep.id]: clientValidation }));
          setStatus(clientValidation.general);
          return;
        }

        const options = nextState.quizOptions
          .split("\n")
          .slice(0, 4)
          .map((line, index) => ({
            slot: String.fromCharCode(65 + index) as "A" | "B" | "C" | "D",
            label: line.trim(),
            enabled: Boolean(line.trim()),
          }));

        const result = await saveQuizSampleLessonStepAction({
          stepId: currentStep.id,
          title: nextState.title.trim(),
          pluginId: currentStep.payload.builtInSource!.pluginId,
          expectedUpdatedAt: currentStep.updatedAt,
          executableConfig: {
            prompt: nextState.quizQuestion.trim(),
            options,
            correctOption: nextState.correctOptionIndex.trim() as "A" | "B" | "C" | "D",
          },
        });

        if (result.ok) {
          setQuizSampleValidationByStepId((prev) => ({
            ...prev,
            [currentStep.id]: { general: null, fallback: null, fields: {} },
          }));
          setStatus("题目配置已保存，开课时会冻结为本次 session 的题目快照。");
          router.refresh();
          return;
        }

        const nextValidation: QuizSampleValidationState = {
          general: result.message || "当前题目配置不完整，请补全题干、有效选项和正确答案后再继续。",
          fallback: currentQuizSampleValidation.fallback,
          fields: {},
        };
        if (result.fieldErrors) {
          nextValidation.fields.prompt = getFieldError(result.fieldErrors, "executableConfig.prompt", "prompt");
          nextValidation.fields.options = getFieldError(result.fieldErrors, "executableConfig.options", "options");
          nextValidation.fields.correctOption = getFieldError(result.fieldErrors, "executableConfig.correctOption", "correctOption");
          nextValidation.fields.optionLabels = getOptionLabelFieldErrors(result.fieldErrors);
        }
        setQuizSampleValidationByStepId((prev) => ({ ...prev, [currentStep.id]: nextValidation }));
        setStatus(result.error === "CONFLICT" ? "检测到更新冲突，请刷新课时后重新应用修改。" : nextValidation.general);
        return;
      }

      const nextPayload = buildPayload(nextState, currentStep)
      const parsedPayload = lessonStepPayloadSchema.safeParse(nextPayload)

      if (!parsedPayload.success || !nextState.title.trim()) {
        setStatus(validationCopy)
        return
      }

      const result = await autosaveLessonStepAction({
        stepId: currentStep.id,
        title: nextState.title.trim(),
        payload: parsedPayload.data,
      });

      if (result.ok) {
        setStatus(savedCopy);
        return;
      }

      setStatus(result.error === "CONFLICT" ? conflictCopy : result.message || validationCopy);
    });
  }

  function resetStep() {
    setStateByStepId((prev) => ({
      ...prev,
      [activeStep.id]: buildInitialState(activeStep),
    }));
    setStatus(restoredCopy);
  }

  async function importMarkdownFile(file: File) {
    const source = await file.text();
    updateField("markdownSource", source);
    updateField("markdownTitle", file.name.replace(/\.md$/i, "") || activeState.title);

    if (!schoolId || !courseId) {
      return;
    }

    const result = await uploadLessonMarkdownAssetAction({
      schoolId,
      courseId,
      title: file.name.replace(/\.md$/i, "") || activeState.title,
      source,
    });

    if (result.ok && result.data && typeof result.data === "object" && "id" in result.data) {
      updateField("markdownAssetResourceId", String(result.data.id));
      updateField("markdownAssetMaterialId", crypto.randomUUID());
      setStatus("Markdown 已导入，可继续保存步骤。");
    }
  }

  return (
    <div className={`flex h-full min-h-0 flex-col ${className ?? ""}`.trim()}>
      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[minmax(0,1.35fr)_minmax(22rem,1fr)]">
        <div className="flex min-h-0 flex-col bg-surface-container-lowest p-5 md:p-6">
          <div className="mb-5 pr-12">
            <p className="text-sm text-on-surface-variant">Nimbus 编辑面板</p>
            <h2 id="lesson-step-editor-modal-title" className="mt-2 text-2xl font-bold tracking-tight text-on-surface">
              编辑教学环节
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              更新环节信息，右侧将实时预览展示效果。
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4">
            {builtInSourceLabel ? (
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">步骤来源</span>
                <span className="rounded-full bg-surface-container-low px-3 py-1 font-medium text-on-surface-variant">{builtInSourceLabel}</span>
                <span className="rounded-full bg-surface-container-low px-3 py-1 font-medium text-on-surface-variant">{activeStep.payload.builtInSource?.builtInKey}</span>
              </div>
            ) : null}

            <div className="min-h-0 flex-1">
              <div className="grid gap-3">
                <label className="grid gap-2" htmlFor="lesson-step-title">
                  <span className="text-sm font-semibold uppercase tracking-wide text-on-surface">标题</span>
                  <input
                    id="lesson-step-title"
                    className={fieldClassName}
                    value={activeState.title}
                    onChange={(event) => updateField("title", event.target.value)}
                  />
                </label>

                {activeStep.type === "content" && (
                  <>
                    <label className="grid gap-2" htmlFor="lesson-step-body">
                      <span className="text-sm font-semibold uppercase tracking-wide text-on-surface">正文</span>
                      <textarea
                        id="lesson-step-body"
                        className={`${fieldClassName} min-h-28`}
                        value={activeState.contentBody}
                        onChange={(event) => updateField("contentBody", event.target.value)}
                      />
                    </label>
                    <label className="grid gap-2" htmlFor="lesson-step-teacher-notes">
                      <span className="text-sm font-semibold uppercase tracking-wide text-on-surface">教师提示</span>
                      <textarea
                        id="lesson-step-teacher-notes"
                        className={`${fieldClassName} min-h-20`}
                        value={activeState.teacherNotes}
                        onChange={(event) => updateField("teacherNotes", event.target.value)}
                      />
                    </label>
                    <label className="grid gap-2" htmlFor="lesson-step-markdown-title">
                      <span className="text-sm font-semibold uppercase tracking-wide text-on-surface">Markdown 标题</span>
                      <input
                        id="lesson-step-markdown-title"
                        className={fieldClassName}
                        value={activeState.markdownTitle}
                        onChange={(event) => updateField("markdownTitle", event.target.value)}
                      />
                    </label>
                    <label className="grid gap-2" htmlFor="lesson-step-markdown-mode">
                      <span className="text-sm font-semibold uppercase tracking-wide text-on-surface">Markdown 渲染模式</span>
                      <select
                        id="lesson-step-markdown-mode"
                        className={fieldClassName}
                        value={activeState.markdownRenderMode}
                        onChange={(event) => updateField("markdownRenderMode", event.target.value as EditorState["markdownRenderMode"])}
                      >
                        <option value="document">document</option>
                        <option value="reveal">reveal</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-3 rounded-none bg-surface-container-high px-4 py-3 text-sm text-on-surface">
                      <input
                        type="checkbox"
                        checked={activeState.markdownMermaidEnabled}
                        onChange={(event) => updateField("markdownMermaidEnabled", event.target.checked)}
                      />
                      启用 Mermaid 渲染
                    </label>
                    <label className="grid gap-2" htmlFor="lesson-step-markdown-source">
                      <span className="text-sm font-semibold uppercase tracking-wide text-on-surface">Markdown 源码</span>
                      <textarea
                        id="lesson-step-markdown-source"
                        className={`${fieldClassName} min-h-28`}
                        value={activeState.markdownSource}
                        onChange={(event) => updateField("markdownSource", event.target.value)}
                        placeholder="可直接粘贴 markdown 文档，或通过下方上传 .md 文件。"
                      />
                    </label>
                    <label className="grid gap-2" htmlFor="lesson-step-markdown-file">
                      <span className="text-sm font-semibold uppercase tracking-wide text-on-surface">上传 Markdown 文件</span>
                      <input
                        id="lesson-step-markdown-file"
                        type="file"
                        accept=".md,text/markdown"
                        className={fieldClassName}
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (file) {
                            void importMarkdownFile(file)
                          }
                        }}
                      />
                    </label>
                  </>
                )}

                {isHomeworkStep(activeStep) ? (
                  <div className="grid gap-3 rounded-none bg-surface-container-low p-4" aria-label="作业配置">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-on-surface">作业配置</h3>
                      <p className="mt-1 text-sm text-on-surface-variant">设置作业标题、描述与可选附件链接</p>
                    </div>
                    <label className="grid gap-2" htmlFor="lesson-step-homework-title">
                      <span className="text-sm font-semibold uppercase tracking-wide text-on-surface">作业标题</span>
                      <input
                        id="lesson-step-homework-title"
                        className={fieldClassName}
                        value={activeState.homeworkTitle}
                        placeholder="输入作业标题"
                        onChange={(event) => updateField("homeworkTitle", event.target.value)}
                      />
                    </label>
                    <label className="grid gap-2" htmlFor="lesson-step-homework-description">
                      <span className="text-sm font-semibold uppercase tracking-wide text-on-surface">作业描述</span>
                      <textarea
                        id="lesson-step-homework-description"
                        className={`${fieldClassName} min-h-24`}
                        value={activeState.homeworkDescription}
                        placeholder="描述作业要求…"
                        onChange={(event) => updateField("homeworkDescription", event.target.value)}
                      />
                    </label>
                    <label className="grid gap-2" htmlFor="lesson-step-homework-attachment">
                      <span className="text-sm font-semibold uppercase tracking-wide text-on-surface">附件链接</span>
                      <input
                        id="lesson-step-homework-attachment"
                        className={fieldClassName}
                        value={activeState.homeworkAttachmentUrl}
                        placeholder="附件链接（可选）"
                        onChange={(event) => updateField("homeworkAttachmentUrl", event.target.value)}
                      />
                    </label>
                  </div>
                ) : activeStep.type === "task" && activeStep.payload.type === "task" && (
                  <>
                    <label className="grid gap-2" htmlFor="lesson-step-task-prompt">
                      <span className="text-sm font-semibold uppercase tracking-wide text-on-surface">任务说明</span>
                      <textarea
                        id="lesson-step-task-prompt"
                        className={`${fieldClassName} min-h-28`}
                        value={activeState.taskPrompt}
                        onChange={(event) => updateField("taskPrompt", event.target.value)}
                      />
                    </label>
                    <label className="grid gap-2" htmlFor="lesson-step-submission-type">
                      <span className="text-sm font-semibold uppercase tracking-wide text-on-surface">提交要求</span>
                      <select
                        id="lesson-step-submission-type"
                        className={fieldClassName}
                        value={activeState.submissionType}
                        onChange={(event) => updateField("submissionType", event.target.value as EditorState["submissionType"])}
                      >
                        <option value="text">text</option>
                        <option value="image">image</option>
                        <option value="file">file</option>
                        <option value="link">link</option>
                      </select>
                    </label>
                    <label className="grid gap-2" htmlFor="lesson-step-success-criteria">
                      <span className="text-sm font-semibold uppercase tracking-wide text-on-surface">成功标准</span>
                      <textarea
                        id="lesson-step-success-criteria"
                        className={`${fieldClassName} min-h-20`}
                        value={activeState.successCriteria}
                        onChange={(event) => updateField("successCriteria", event.target.value)}
                      />
                    </label>
                  </>
                )}

                {activeStep.type === "quiz" && activeStep.payload.type === "quiz" && (
                  isClassroomVotingStep(activeStep) ? (
                    <div className="grid gap-3 rounded-none bg-surface-container-low p-4" aria-label="课堂投票配置">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-on-surface">课堂投票配置</h3>
                        <p className="mt-1 text-sm text-on-surface-variant">
                          {activeVotingValidation.fallback
                            ? activeVotingValidation.fallback
                            : step.pluginAuthoring?.persistedConfigJson
                              ? "已载入已保存的课堂投票配置。"
                              : "已载入课堂投票默认配置，可按本节课需要修改。"}
                        </p>
                        {activeVotingValidation.general ? <p className="mt-2 text-sm text-[#b31b25]">{activeVotingValidation.general}</p> : null}
                      </div>
                      <label className="grid gap-2" htmlFor="lesson-step-voting-prompt">
                        <span className="text-sm font-semibold uppercase tracking-wide text-on-surface">投票题目</span>
                        <textarea
                          id="lesson-step-voting-prompt"
                          aria-describedby={activeVotingValidation.fields.prompt ? "lesson-step-voting-prompt-error" : undefined}
                          className={`${fieldClassName} min-h-24`}
                          value={activeState.votingPrompt}
                          onChange={(event) => updateField("votingPrompt", event.target.value)}
                        />
                      </label>
                      {activeVotingValidation.fields.prompt ? (
                        <span id="lesson-step-voting-prompt-error" className="text-sm text-[#b31b25]">
                          {activeVotingValidation.fields.prompt}
                        </span>
                      ) : null}
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold uppercase tracking-wide text-on-surface">投票选项</span>
                          <Button
                            type="button"
                            variant="secondary"
                            className="px-3"
                            onClick={() => updateField("votingOptions", [...activeState.votingOptions, { id: crypto.randomUUID(), label: "" }].slice(0, 6))}
                            disabled={activeState.votingOptions.length >= 6}
                          >
                            新增选项
                          </Button>
                        </div>
                        {activeState.votingOptions.map((option, index) => (
                          <div key={option.id} className="grid gap-2">
                            <div className="flex gap-2">
                              <input
                                aria-label={`投票选项 ${index + 1}`}
                                className={fieldClassName}
                                value={option.label}
                                onChange={(event) => updateField("votingOptions", activeState.votingOptions.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))}
                              />
                              <Button
                                type="button"
                                variant="tertiary"
                                className="px-3"
                                disabled={activeState.votingOptions.length <= 2}
                                onClick={() => updateField("votingOptions", activeState.votingOptions.filter((_, itemIndex) => itemIndex !== index))}
                              >
                                删除
                              </Button>
                            </div>
                            {activeVotingValidation.fields.optionLabels?.[index] ? <span className="text-sm text-[#b31b25]">{activeVotingValidation.fields.optionLabels[index]}</span> : null}
                          </div>
                        ))}
                        {activeVotingValidation.fields.options ? <span className="text-sm text-[#b31b25]">{activeVotingValidation.fields.options}</span> : null}
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="flex items-center gap-3 rounded-none bg-surface-container-high px-4 py-3 text-sm text-on-surface">
                          <input
                            type="checkbox"
                            checked={activeState.votingAllowMultiple}
                            onChange={(event) => updateField("votingAllowMultiple", event.target.checked)}
                          />
                          允许多选
                        </label>
                        <label className="grid gap-2" htmlFor="lesson-step-voting-window">
                          <span className="text-sm font-semibold uppercase tracking-wide text-on-surface">参与时长（秒）</span>
                          <input
                            id="lesson-step-voting-window"
                            inputMode="numeric"
                            aria-describedby={activeVotingValidation.fields.participationWindowSeconds ? "lesson-step-voting-window-error" : undefined}
                            className={fieldClassName}
                            value={activeState.votingParticipationWindowSeconds}
                            onChange={(event) => updateField("votingParticipationWindowSeconds", event.target.value)}
                          />
                        </label>
                        {activeVotingValidation.fields.participationWindowSeconds ? (
                          <span id="lesson-step-voting-window-error" className="text-sm text-[#b31b25]">
                            {activeVotingValidation.fields.participationWindowSeconds}
                          </span>
                        ) : null}
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <label className="flex items-center gap-3 rounded-none bg-surface-container-high px-4 py-3 text-sm text-on-surface">
                          <input
                            type="checkbox"
                            checked={activeState.votingAnonymousResults}
                            onChange={(event) => updateField("votingAnonymousResults", event.target.checked)}
                          />
                          匿名结果
                        </label>
                        <label className="flex items-center gap-3 rounded-none bg-surface-container-high px-4 py-3 text-sm text-on-surface">
                          <input
                            type="checkbox"
                            checked={activeState.votingShowLiveResults}
                            onChange={(event) => updateField("votingShowLiveResults", event.target.checked)}
                          />
                          实时结果
                        </label>
                        <label className="grid gap-2" htmlFor="lesson-step-voting-results-display">
                          <span className="text-sm font-semibold uppercase tracking-wide text-on-surface">结果展示</span>
                          <select
                            id="lesson-step-voting-results-display"
                            className={fieldClassName}
                            value={activeState.votingResultsDisplay}
                            onChange={(event) => updateField("votingResultsDisplay", event.target.value as EditorState["votingResultsDisplay"])}
                          >
                            <option value="bar">bar</option>
                            <option value="column">column</option>
                            <option value="compact">compact</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  ) : isQuizSampleStep(activeStep) ? (
                    <div className="grid gap-4 rounded-[1.5rem] bg-surface-container-low p-5" aria-label="互动单选题插件专属配置">
                      <div className="grid gap-3 rounded-[1.25rem] bg-surface-container-lowest p-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">Sample Plugin</span>
                          <span className="rounded-full bg-surface-container-high px-3 py-1 font-medium text-on-surface-variant">单选题</span>
                          <span className="rounded-full bg-surface-container-high px-3 py-1 font-medium text-on-surface-variant">2–4 个选项</span>
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-on-surface">互动单选题 · 插件专属配置</h3>
                          <p className="mt-1 text-sm text-on-surface-variant">课堂开始时会冻结为本次 session 的题目快照</p>
                          {activeQuizSampleValidation.fallback ? (
                            <p className="mt-2 text-sm text-[#b31b25]">{activeQuizSampleValidation.fallback}</p>
                          ) : null}
                          {activeQuizSampleValidation.general ? (
                            <p className="mt-2 text-sm text-[#b31b25]">{activeQuizSampleValidation.general}</p>
                          ) : null}
                        </div>
                      </div>

                      <label className="grid gap-2" htmlFor="lesson-step-quiz-question">
                        <span className="text-sm font-semibold uppercase tracking-wide text-on-surface">题干</span>
                        <textarea
                          id="lesson-step-quiz-question"
                          aria-describedby={activeQuizSampleValidation.fields.prompt ? "lesson-step-quiz-question-error" : undefined}
                          className={`${fieldClassName} min-h-24 rounded-[1.25rem]`}
                          value={activeState.quizQuestion}
                          onChange={(event) => updateField("quizQuestion", event.target.value)}
                        />
                      </label>
                      {activeQuizSampleValidation.fields.prompt ? (
                        <span id="lesson-step-quiz-question-error" className="text-sm text-[#b31b25]">{activeQuizSampleValidation.fields.prompt}</span>
                      ) : null}

                      <div className="grid gap-3 rounded-[1.25rem] bg-surface-container-lowest p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold uppercase tracking-wide text-on-surface">选项 A-D</span>
                          <span className="text-xs text-on-surface-variant">至少 2 个选项 / 未启用槽位不可作答</span>
                        </div>
                        {activeState.quizOptions.split("\n").slice(0, 4).map((line, index) => (
                          <div key={`quiz-sample-option-${index}`} className="grid gap-2">
                            <div className="flex items-center gap-3 rounded-[1rem] bg-surface-container-high px-3 py-2">
                              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-container text-sm font-semibold text-on-surface">
                                {String.fromCharCode(65 + index)}
                              </span>
                              <input
                                aria-label={`选项 ${String.fromCharCode(65 + index)}`}
                                className="w-full rounded-none border-0 bg-transparent text-on-surface outline-none"
                                value={line}
                                placeholder="未启用"
                                onChange={(event) => {
                                  const nextLines = activeState.quizOptions.split("\n").slice(0, 4);
                                  while (nextLines.length < 4) nextLines.push("");
                                  nextLines[index] = event.target.value;
                                  updateField("quizOptions", nextLines.join("\n"));
                                }}
                              />
                            </div>
                            {activeQuizSampleValidation.fields.optionLabels?.[index] ? (
                              <span className="text-sm text-[#b31b25]">{activeQuizSampleValidation.fields.optionLabels[index]}</span>
                            ) : null}
                          </div>
                        ))}
                        {activeQuizSampleValidation.fields.options ? (
                          <span className="text-sm text-[#b31b25]">{activeQuizSampleValidation.fields.options}</span>
                        ) : null}
                      </div>

                      <label className="grid gap-2" htmlFor="lesson-step-correct-option-index">
                        <span className="text-sm font-semibold uppercase tracking-wide text-on-surface">正确答案</span>
                        <select
                          id="lesson-step-correct-option-index"
                          aria-describedby={activeQuizSampleValidation.fields.correctOption ? "lesson-step-correct-option-error" : undefined}
                          className={`${fieldClassName} rounded-[1.25rem]`}
                          value={activeState.correctOptionIndex}
                          onChange={(event) => updateField("correctOptionIndex", event.target.value)}
                        >
                          <option value="">请选择正确答案</option>
                          {activeState.quizOptions
                            .split("\n")
                            .slice(0, 4)
                            .map((line, index) => ({ label: line.trim(), slot: String.fromCharCode(65 + index) }))
                            .filter((option) => option.label)
                            .map((option) => (
                              <option key={option.slot} value={option.slot}>{option.slot}</option>
                            ))}
                        </select>
                      </label>
                      {activeQuizSampleValidation.fields.correctOption ? (
                        <span id="lesson-step-correct-option-error" className="text-sm text-[#b31b25]">{activeQuizSampleValidation.fields.correctOption}</span>
                      ) : null}

                      <div className="grid gap-2 rounded-[1.25rem] bg-surface-container-lowest p-4 text-sm text-on-surface-variant">
                        <p>至少 2 个选项</p>
                        <p>正确答案必须命中已启用选项</p>
                        <p>已开课会话不会同步后续修改</p>
                      </div>
                    </div>
                  ) : (
                  <>
                    <label className="grid gap-2" htmlFor="lesson-step-quiz-question">
                      <span className="text-sm font-semibold uppercase tracking-wide text-on-surface">题目</span>
                      <textarea
                        id="lesson-step-quiz-question"
                        className={`${fieldClassName} min-h-24`}
                        value={activeState.quizQuestion}
                        onChange={(event) => updateField("quizQuestion", event.target.value)}
                      />
                    </label>
                    <label className="grid gap-2" htmlFor="lesson-step-quiz-options">
                      <span className="text-sm font-semibold uppercase tracking-wide text-on-surface">选项</span>
                      <textarea
                        id="lesson-step-quiz-options"
                        className={`${fieldClassName} min-h-20`}
                        value={activeState.quizOptions}
                        onChange={(event) => updateField("quizOptions", event.target.value)}
                      />
                    </label>
                    <label className="grid gap-2" htmlFor="lesson-step-correct-option-index">
                      <span className="text-sm font-semibold uppercase tracking-wide text-on-surface">正确答案序号</span>
                      <input
                        id="lesson-step-correct-option-index"
                        inputMode="numeric"
                        className={fieldClassName}
                        value={activeState.correctOptionIndex}
                        onChange={(event) => updateField("correctOptionIndex", event.target.value)}
                      />
                    </label>
                    <label className="grid gap-2" htmlFor="lesson-step-explanation">
                      <span className="text-sm font-semibold uppercase tracking-wide text-on-surface">答案说明</span>
                      <textarea
                        id="lesson-step-explanation"
                        className={`${fieldClassName} min-h-20`}
                        value={activeState.explanation}
                        onChange={(event) => updateField("explanation", event.target.value)}
                      />
                    </label>
                  </>
                  )
                )}

                <label className="grid gap-2" htmlFor="lesson-step-materials">
                  <span className="text-sm font-semibold uppercase tracking-wide text-on-surface">引用材料</span>
                  <textarea
                    id="lesson-step-materials"
                    className={`${fieldClassName} min-h-20`}
                    value={activeState.materialRefsText}
                    onChange={(event) => updateField("materialRefsText", event.target.value)}
                    placeholder="每行一个材料标题或链接"
                  />
                </label>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <div aria-live="polite" className="mr-auto self-center text-sm text-on-surface-variant">
                 {isPending ? savingCopy : status}
               </div>
               <Button type="button" variant="tertiary" className="px-6" disabled={isPending} onClick={onCancel}>
                 取消
               </Button>
               <Button type="button" onClick={saveStep} disabled={isPending} className="px-6">
                 {isPending
                   ? (isClassroomVotingStep(activeStep)
                     ? "正在保存投票配置..."
                     : isQuizSampleStep(activeStep)
                       ? "正在保存题目配置..."
                       : isHomeworkStep(activeStep)
                         ? "正在保存作业..."
                         : savingCopy)
                   : (isClassroomVotingStep(activeStep)
                     ? "保存投票配置"
                     : isQuizSampleStep(activeStep)
                       ? "保存题目配置"
                       : isHomeworkStep(activeStep)
                         ? "保存作业"
                         : "保存步骤")}
               </Button>
             </div>
          </div>
        </div>

        <Card aria-label={previewLabel} role="region" className="relative hidden min-h-full overflow-hidden rounded-none bg-surface-container-low p-5 shadow-none md:flex md:flex-col">
          <div className="absolute inset-0 bg-gradient-to-b from-surface-container-low to-surface opacity-60" />
          <div className="relative flex items-center justify-between gap-3">
            <h4 className="flex items-center gap-2 text-lg font-semibold text-on-surface">
              <Eye className="size-5 text-primary" aria-hidden />
              {previewLabel}
            </h4>
            <span className="rounded-full bg-surface-container-highest px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-on-surface-variant">
              学生视图
            </span>
          </div>

          <div className="relative mt-5 flex min-h-0 flex-1 items-stretch justify-center">
            <div className="group relative w-full overflow-hidden rounded-[1.75rem] bg-surface-container-lowest p-5 shadow-[0_16px_64px_-16px_rgba(44,47,48,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-tertiary-fixed" />
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
                    环节预览
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-1 text-xs font-medium text-on-surface-variant">
                  <Clock3 className="size-3.5" aria-hidden />
                  {previewDuration}
                </span>
              </div>

              <h5 className="mt-3 text-xl font-bold leading-tight text-on-surface">{previewTitle}</h5>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-on-surface-variant">{previewDescription}</p>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">{stepTypeLabel}</span>
                {builtInSourceLabel ? (
                  <span className="rounded-full bg-surface-container-low px-3 py-1 font-medium text-on-surface-variant">{builtInSourceLabel}</span>
                ) : null}
              </div>

               <p className="mt-3 text-sm leading-6 text-on-surface">{previewSupport}</p>

               {isQuizSampleStep(activeStep) ? (
                 <div className="mt-4 grid gap-3 rounded-[1.25rem] bg-surface-container p-4">
                   <div className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">正式答题卡预览</div>
                   {activeState.quizOptions
                     .split("\n")
                     .slice(0, 4)
                     .map((line, index) => ({ slot: String.fromCharCode(65 + index), label: line.trim() }))
                     .filter((option) => option.label)
                     .map((option) => (
                       <div key={option.slot} className="flex items-center gap-3 rounded-[1rem] bg-surface-container-low px-4 py-3">
                         <span className="grid size-10 place-items-center rounded-full bg-surface-container-high text-sm font-semibold text-on-surface">{option.slot}</span>
                         <span className="text-sm text-on-surface">{option.label}</span>
                       </div>
                     ))}
                 </div>
               ) : null}

              {activeStep.type === "content" && activeState.markdownSource.trim() ? (
                <div className="mt-4 rounded-[1.25rem] bg-surface-container p-4">
                  <MarkdownRenderer
                    step={{
                      title: previewTitle,
                      payload: {
                        type: 'content',
                        title: previewTitle,
                        body: activeState.contentBody,
                        teacherNotes: activeState.teacherNotes || undefined,
                        materialRefs: previewMaterialRefs.map((item) => ({ title: item.title, kind: 'link', url: item.url })),
                        markdown: activeState.markdownAssetResourceId && activeState.markdownAssetMaterialId ? {
                          asset: {
                            resourceId: activeState.markdownAssetResourceId,
                            materialId: activeState.markdownAssetMaterialId,
                            title: activeState.markdownTitle || previewTitle,
                          },
                          source: activeState.markdownSource,
                          renderMode: activeState.markdownRenderMode,
                          mermaidEnabled: activeState.markdownMermaidEnabled,
                        } : undefined,
                      },
                    }}
                  />
                </div>
              ) : null}

              <div className="mt-4 flex items-center gap-3 border-l-4 border-secondary bg-surface-container-low p-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary-container text-on-secondary-container">
                  <FileText className="size-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium text-on-surface">
                    {primaryMaterial?.title ?? "未关联资源"}
                  </p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {primaryMaterial ? `${previewMaterialRefs.length} 个资源${remainingMaterialCount > 0 ? ` · 另有 ${remainingMaterialCount} 项` : ""}` : "预览将同步展示补充说明或资料摘要"}
                  </p>
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 h-1 bg-linear-90 from-primary to-primary-container opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

  function getPreviewDescription(step: LessonStepDTO, state: EditorState) {
  if (step.type === "content") {
    return state.contentBody.trim() || "在这里补充教学内容，右侧学生视图会同步展示正文摘要。";
  }

  if (step.type === "task") {
    return state.taskPrompt.trim() || "描述学生需要完成的任务、提交要求与课堂互动节奏。";
  }

  if (isClassroomVotingStep(step)) {
    return state.votingPrompt.trim() || "系统已载入默认投票模板。请补充题目和至少 2 个选项后保存。";
  }

  if (isQuizSampleStep(step)) {
    return state.quizQuestion.trim() || "请填写题干、至少 2 个选项，并指定正确答案后再保存；保存后学生端才能在开课时冻结为课堂题目。";
  }

  if (isHomeworkStep(step)) {
    return state.homeworkDescription.trim() || state.homeworkTitle.trim() || "设置作业标题和描述，学生将在课堂中看到作业卡片。";
  }

  return state.quizQuestion.trim() || "填写测验题目后，右侧会即时展示题目摘要与作答提示。";
}

function getPreviewSupport(step: LessonStepDTO, state: EditorState) {
  if (isHomeworkStep(step)) {
    return state.homeworkAttachmentUrl.trim()
      ? `含附件链接 · ${state.homeworkDescription.slice(0, 40)}${state.homeworkDescription.length > 40 ? "…" : ""}`
      : state.homeworkDescription.slice(0, 60) || "填写作业描述后，学生会看到作业卡片和提交通道。";
  }

  if (step.type === "content") {
    return state.teacherNotes.trim() || "可在这里补充教师提示、追问方式和课堂话术。";
  }

  if (step.type === "task") {
    return state.successCriteria.trim() || `提交方式：${submissionTypeLabels[state.submissionType]}`;
  }

  if (isClassroomVotingStep(step)) {
    const optionCount = state.votingOptions.filter((option) => option.label.trim()).length;
    const selectionMode = state.votingAllowMultiple ? "多选" : "单选";
    return `${optionCount} 个选项 · ${selectionMode} · ${state.votingParticipationWindowSeconds || "90"} 秒`;
  }

  if (isQuizSampleStep(step)) {
    const lines = state.quizOptions.split("\n").map((line) => line.trim()).filter(Boolean);
    return `${lines.length} 个选项 · 正确答案 ${state.correctOptionIndex.trim() || "未设置"} · 正式答题卡预览`;
  }

  const optionCount = state.quizOptions.split("\n").map((line) => line.trim()).filter(Boolean).length;
  const correctAnswer = state.correctOptionIndex.trim() ? ` · 正确答案 ${state.correctOptionIndex.trim()}` : "";
  return state.explanation.trim() || `${optionCount} 个选项${correctAnswer}`;
}

function getPreviewDuration(type: LessonStepDTO["type"]) {
  if (type === "content") return "12 分钟";
  if (type === "task") return "15 分钟";
  return "8 分钟";
}
