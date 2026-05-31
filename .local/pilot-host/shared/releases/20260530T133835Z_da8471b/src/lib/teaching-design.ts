import {
  type LessonStepPayload,
  type TeachingDesign,
  type TeachingDesignFallbackReason,
  type TeachingDesignInput,
  type TeachingDesignStatus,
} from "@/lib/dto/lesson-authoring";

type TeachingDesignResolution = {
  teachingDesign: TeachingDesign;
  teachingDesignStatus: TeachingDesignStatus;
  needsTeachingDesignRefinement: boolean;
  teachingDesignFallbackReason: TeachingDesignFallbackReason | null;
};

const LEGACY_TEACHING_DESIGN_DEFAULTS: Record<LessonStepPayload["type"], TeachingDesign> = {
  content: {
    activityIntent: "explain",
    estimatedMinutes: 12,
    activityMode: "mini-lecture",
    evidenceExpectation: {
      evidenceType: "observation",
      prompt: "关注学生是否能跟随讲解理解核心概念。",
      required: false,
      checklist: [],
      tags: ["legacy-default", "content"],
      studentVisibility: "teacher-only",
    },
  },
  task: {
    activityIntent: "practice",
    estimatedMinutes: 15,
    activityMode: "independent",
    evidenceExpectation: {
      evidenceType: "submission",
      prompt: "收集学生任务完成情况与关键产出。",
      required: true,
      checklist: [],
      tags: ["legacy-default", "task"],
      studentVisibility: "teacher-only",
    },
  },
  quiz: {
    activityIntent: "check",
    estimatedMinutes: 8,
    activityMode: "assessment",
    evidenceExpectation: {
      evidenceType: "quiz-response",
      prompt: "记录学生对关键问题的即时作答情况。",
      required: true,
      checklist: [],
      tags: ["legacy-default", "quiz"],
      studentVisibility: "teacher-only",
    },
  },
};

function hasCompleteTeachingDesign(input: TeachingDesignInput | undefined): input is TeachingDesign {
  return Boolean(
    input?.activityIntent
      && input.estimatedMinutes
      && input.activityMode
      && input.evidenceExpectation?.evidenceType
      && input.evidenceExpectation.prompt
      && typeof input.evidenceExpectation.required === "boolean"
      && input.evidenceExpectation.checklist
      && input.evidenceExpectation.tags
      && input.evidenceExpectation.studentVisibility,
  );
}

export function getLegacyTeachingDesign(type: LessonStepPayload["type"]): TeachingDesign {
  return structuredClone(LEGACY_TEACHING_DESIGN_DEFAULTS[type]);
}

export function resolveTeachingDesignInput(
  type: LessonStepPayload["type"],
  input: TeachingDesignInput | undefined,
): TeachingDesignResolution {
  const fallback = getLegacyTeachingDesign(type);

  if (!input) {
    return {
      teachingDesign: fallback,
      teachingDesignStatus: "inferred",
      needsTeachingDesignRefinement: true,
      teachingDesignFallbackReason: `legacy-${type}-default` as TeachingDesignFallbackReason,
    };
  }

  const teachingDesign: TeachingDesign = {
    activityIntent: input.activityIntent ?? fallback.activityIntent,
    estimatedMinutes: input.estimatedMinutes ?? fallback.estimatedMinutes,
    activityMode: input.activityMode ?? fallback.activityMode,
    evidenceExpectation: {
      evidenceType: input.evidenceExpectation?.evidenceType ?? fallback.evidenceExpectation.evidenceType,
      prompt: input.evidenceExpectation?.prompt ?? fallback.evidenceExpectation.prompt,
      required: input.evidenceExpectation?.required ?? fallback.evidenceExpectation.required,
      checklist: input.evidenceExpectation?.checklist ?? fallback.evidenceExpectation.checklist,
      tags: input.evidenceExpectation?.tags ?? fallback.evidenceExpectation.tags,
      studentVisibility: input.evidenceExpectation?.studentVisibility ?? fallback.evidenceExpectation.studentVisibility,
    },
  };

  if (hasCompleteTeachingDesign(input)) {
    return {
      teachingDesign,
      teachingDesignStatus: "explicit",
      needsTeachingDesignRefinement: false,
      teachingDesignFallbackReason: null,
    };
  }

  return {
    teachingDesign,
    teachingDesignStatus: "needs-refinement",
    needsTeachingDesignRefinement: true,
    teachingDesignFallbackReason: "partial-teaching-design",
  };
}
