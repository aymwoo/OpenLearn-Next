---
phase: 58-operator-recovery-and-production-surfaces
reviewed: 2026-05-26T04:44:12Z
depth: standard
files_reviewed: 25
files_reviewed_list:
  - src/lib/dto/classroom-incident-list.ts
  - src/lib/dto/classroom-incident-operator.ts
  - src/lib/dto/operator-honesty.ts
  - src/lib/dto/runtime-inspector.ts
  - src/lib/dto/async-task-operator.ts
  - src/lib/dal/classroom-incident-list.ts
  - src/lib/dal/classroom-incident-operator.ts
  - src/lib/dal/classroom-incident-operator-actions.ts
  - src/actions/operator-posture-recovery-actions.ts
  - src/actions/operator-classroom-recovery-actions.ts
  - src/app/settings/labs/incidents/[sessionId]/page.tsx
  - src/app/settings/labs/commands/[commandId]/page.tsx
  - src/app/settings/labs/incidents/page.tsx
  - src/app/settings/labs/page.tsx
  - src/components/classroom/classroom-control-panel.tsx
  - src/components/surfaces/platform-command-operator-detail-surface.tsx
  - src/components/surfaces/plugin-lifecycle-operator-surface.tsx
  - src/components/surfaces/classroom-incident-operator-surface.tsx
  - src/components/surfaces/classroom-incident-list-surface.tsx
  - src/components/surfaces/settings-surface.tsx
  - src/components/surfaces/runtime-inspector-surface.tsx
  - src/components/surfaces/async-task-operator-surface.tsx
  - scripts/verify-phase58-operator-recovery-and-surfaces.ts
  - scripts/proof-phase58-operator-recovery.ts
  - package.json
findings:
  critical: 4
  warning: 1
  info: 0
  total: 5
status: issues_found
---

# Phase 58: Code Review Report

**Reviewed:** 2026-05-26T04:44:12Z  
**Depth:** standard  
**Files Reviewed:** 25  
**Status:** issues_found

## Summary

本次审查覆盖了 Phase 58 的 incident/operator surface、对应 Server Action、DTO/DAL 与 close-gate 脚本。结论不是“实现完成”，而是：当前改动里存在多处会直接导致错误行为的缺陷，包括错误 incident 判定、失效的 plugin drill-down 路由、admin/developer 无法执行宣称支持的轻恢复动作，以及 incident detail 路由在 not-found/forbidden 情况下会抛 500。

## Critical Issues

### CR-01 [BLOCKER]: 只要存在 runtime session 就会把课堂误判为 degraded incident

**File:** `src/lib/dal/classroom-incident-list.ts:194-207`  
**Issue:** `posture` 的降级分支直接以 `runtimeRow` 是否存在为条件。`runtimeStepSessions` 是正常 runtime bootstrap 后就会存在的会话记录，不是异常信号；因此只要课堂跑过 runtime，就会被标成 `degraded` / `multi_classroom`，把健康课堂错误地推进 incident list。  
**Fix:** 改为基于真实异常证据（failed command、denied governance、problem task、明确 degraded transport/runtime signal）判定，而不是基于 runtime session 是否存在。

```ts
const posture: ClassroomIncidentPosture =
  latestCommand?.status === "failed" || latestGovernance?.decision === "denied"
    ? "failed"
    : pluginAudit?.decision === "denied"
      ? "blocked"
      : problemTask || hasDegradedRuntimeSignal
        ? "degraded"
        : "healthy";
```

### CR-02 [BLOCKER]: plugin 相关链接与 revalidatePath 指向不存在的路由

**File:** `src/lib/dal/classroom-incident-list.ts:170-176`, `src/lib/dal/classroom-incident-operator.ts:98-103`, `src/components/surfaces/plugin-lifecycle-operator-surface.tsx:264-265`  
**Issue:** Phase 58 新增的 incident/plugin/operator 流程持续生成 `/settings/labs/plugins/...` 与 `/settings/labs/plugins/.../actions/...`，但仓库里并没有对应 App Router 页面。结果是：incident chip / related card / action next hop 会跳到 404，而且 recovery action 的 `revalidatePath()` 也不会刷新真实存在的 plugin surface。  
**Fix:** 要么补齐真正的 `/settings/labs/plugins/...` 路由；要么统一改为当前真实存在的 plugin governance 页面，并把 href/revalidatePath 抽成一个共享 helper，避免继续写出死链。

```ts
function buildPluginOperatorHref(pluginId: string, actionKey?: string) {
  const base = `/settings/plugins?pluginId=${encodeURIComponent(pluginId)}`;
  return actionKey
    ? `${base}&actionKey=${encodeURIComponent(actionKey)}`
    : base;
}
```

### CR-03 [BLOCKER]: admin/developer 在 incident 页面点 retry/reconcile 会因为 classroom 权限校验直接失败

**File:** `src/actions/operator-classroom-recovery-actions.ts:25-33`, `src/lib/dto/classroom-incident-list.ts:3`, `src/lib/dal/classroom-incident-operator.ts:63-76`  
**Issue:** incident surface 明确允许 `admin` / `developer` 进入 operator 流程，但 `runOperatorClassroomRecoveryAction()` 为了拿 `activeStepId` 调用了 `getClassroomSnapshotDTO()`。这个 DTO 只允许课堂 teacher 或 participant 读取，因此非任课 teacher 的 admin/developer 会拿到 `TEACHER_AUTH_REQUIRED` / `CLASSROOM_PARTICIPANT_REQUIRED`，导致宣称可用的 light recovery 实际不可用。  
**Fix:** 为 operator recovery 建立专用的 server-owned DAL seam：按 operator scope 校验可见性，再直接从 classroom session 读取 `activeStepId`，不要复用面向 teacher/student 的 classroom snapshot DTO。

```ts
const session = await getOperatorVisibleClassroomSession({
  classroomSessionId: parsed.data.classroomSessionId,
});

const result = await runCurrentVotingRecoveryAction({
  sessionId: session.id,
  stepId: session.activeStepId,
  recoveryAction: parsed.data.action,
});
```

### CR-04 [BLOCKER]: incident detail 路由把 not found / forbidden 直接变成 500

**File:** `src/app/settings/labs/incidents/[sessionId]/page.tsx:9-14`, `src/lib/dal/classroom-incident-operator.ts:67-76`  
**Issue:** DAL 会在 session 不存在或无权限时抛 `CLASSROOM_INCIDENT_NOT_FOUND`，但页面没有像 command detail route 那样调用 `notFound()` 或做安全降级。任何过期链接、错误 sessionId、或越权访问都会直接炸成服务器错误页。  
**Fix:** 在 route 层显式捕获 `CLASSROOM_INCIDENT_NOT_FOUND` 并映射到 `notFound()`；其余错误再交给 error boundary。

```ts
import { notFound } from "next/navigation";

try {
  const detail = await getClassroomIncidentOperatorDTO({ classroomSessionId: sessionId });
  return <ClassroomIncidentOperatorSurface detail={detail} />;
} catch (error) {
  if (error instanceof Error && error.message === "CLASSROOM_INCIDENT_NOT_FOUND") {
    notFound();
  }
  throw error;
}
```

## Warnings

### WR-01 [WARNING]: recovery audit payload 写入了错误的 lessonId / publishedVersionId

**File:** `src/actions/classroom-actions.ts:418-427`  
**Issue:** `runCurrentVotingRecoveryAction()` 在 teacher-control payload 里把 `lessonId` 和 `publishedVersionId` 都写成了 `sessionId`。当前 host action 主要靠 `classroomSessionId + stepId` 继续执行，所以功能未必立刻炸掉，但持久化下来的 recovery payload 已经自相矛盾，后续审计、timeline、诊断读取这份 payload 时会得到错误身份信息。  
**Fix:** 传入并校验真实 `lessonId` / `publishedVersionId`，或在 server action 内通过专用 DAL seam 先解析 session identity，再写入 payload。

```ts
export async function runCurrentVotingRecoveryAction(input: {
  sessionId: string;
  stepId: string;
  lessonId: string;
  publishedVersionId: string;
  recoveryAction: VotingRecoveryAction;
}) {
  // ...
  payload: {
    classroomSessionId: input.sessionId,
    lessonId: input.lessonId,
    publishedVersionId: input.publishedVersionId,
    stepId: input.stepId,
    command,
  }
}
```

---

_Reviewed: 2026-05-26T04:44:12Z_  
_Reviewer: the agent (gsd-code-reviewer)_  
_Depth: standard_
