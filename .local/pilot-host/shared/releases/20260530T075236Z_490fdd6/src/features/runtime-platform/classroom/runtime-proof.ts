const CANONICAL_RUNTIME_PROOF_STEP_RANK = "b5";

export function getCanonicalRuntimeProofStepDefinition() {
  return {
    type: "task" as const,
    title: "互动证明：HTML 课件实验",
    rank: CANONICAL_RUNTIME_PROOF_STEP_RANK,
    payload: {
      type: "task" as const,
      runtime: {
        kind: "html-courseware",
        entry: {
          sandbox: "iframe" as const,
          bootstrap: "/runtime/html-courseware/pilot",
        },
        submitTarget: {
          primary: "classroom-evidence" as const,
          additional: ["task-submission" as const],
        },
      },
      prompt: "在 HTML 互动课件中完成观察、填写结论，并提交结构化证明结果。",
      successCriteria: "成功完成互动输入并提交观察摘要，教师可在课堂面板立即看到完成反馈。",
    },
  };
}

export function getCanonicalRuntimeProofSnapshotStep(lessonId: string) {
  const definition = getCanonicalRuntimeProofStepDefinition();

  return {
    id: `canonical-runtime-proof-${lessonId}`,
    lessonId,
    type: definition.type,
    title: definition.title,
    rank: definition.rank,
    payload: definition.payload,
  };
}
