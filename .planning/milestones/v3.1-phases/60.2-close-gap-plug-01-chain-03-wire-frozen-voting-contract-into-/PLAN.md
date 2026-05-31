---
phase: 60.2-close-gap-plug-01-chain-03-wire-frozen-voting-contract-into-
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/dto/lesson-authoring.ts
  - src/lib/dto/classroom.ts
  - src/lib/dto/learning.ts
  - src/lib/dal/classroom.ts
  - src/lib/dal/learning.ts
  - src/components/classroom/classroom-control-panel.tsx
  - src/components/learning/quiz-step-card.tsx
  - src/components/classroom/classroom-launch-panel.test.tsx
  - src/components/classroom/classroom-control-panel.test.tsx
  - src/actions/classroom-actions.test.ts
  - src/actions/learning-actions.test.ts
  - src/lib/dal/classroom.test.ts
  - src/lib/dal/learning.test.ts
autonomous: true
requirements:
  - PLUG-01
  - CHAIN-03
must_haves:
  truths:
    - "frozen voting contract 必须从 published snapshot 进入 classroom / learning authoritative DTO。"
    - "launch/readiness 必须能拦截 frozen voting plugin 不可运行或 contract 不兼容的场景。"
    - "teacher result surface 与 student submit 必须遵守 anonymous/live/multi-select contract。"
  artifacts:
    - path: src/lib/dal/classroom.ts
      provides: "launch/readiness + teacher voting round 聚合的 frozen contract 消费"
    - path: src/lib/dal/learning.ts
      provides: "student quiz submit / runtime state 对 frozen contract 的消费"
    - path: src/components/classroom/classroom-control-panel.tsx
      provides: "teacher round control 与 result surface contract 落地"
    - path: src/components/learning/quiz-step-card.tsx
      provides: "student voting submit UI 遵守 multi-select / frozen status"
---

<objective>
补齐 milestone audit 指出的 `pluginContract` 消费缺口，让 frozen voting contract 真正控制 launch/readiness、student submit 与 teacher result surface，而不是只停留在 publish freeze。
</objective>

<tasks>
1. 在 DTO 层新增 frozen voting contract schema，并让 classroom/learning 的 snapshot step 透传该字段。
2. 在 classroom DAL 中基于 frozen contract 补 launch/readiness gate，并让 teacher voting round 聚合遵守匿名/实时结果配置。
3. 在 learning DAL 与 `QuizStepCard` 中补 multi-select / frozen round / option-id 映射约束。
4. 把 teacher 投票轮次控制从 runtime-descriptor 门禁中解耦，确保 classroom voting step 也能操作。
5. 补回归测试并执行 targeted vitest 验证。
</tasks>

<verify>
pnpm vitest run src/actions/classroom-actions.test.ts src/actions/learning-actions.test.ts src/components/classroom/classroom-launch-panel.test.tsx src/components/classroom/classroom-control-panel.test.tsx src/lib/dal/classroom.test.ts src/lib/dal/learning.test.ts
</verify>
