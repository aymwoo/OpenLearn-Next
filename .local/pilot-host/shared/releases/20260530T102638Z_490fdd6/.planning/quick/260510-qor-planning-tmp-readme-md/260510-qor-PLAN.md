---
phase: quick
plan: 260510-qor
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/tmp/docs-work-manifest.json
  - README.md
autonomous: true
requirements:
  - QUICK-260510-QOR
must_haves:
  truths:
    - "`.planning/tmp` 不再保留过期的临时规划产物。"
    - "`README.md` 是否保留有明确结论，最终目录状态能直接体现该结论。"
    - "清理范围只包含已确认的临时产物：`.planning/tmp` 与根目录 `README.md` 草稿，不误伤其它 planning 文档。"
  artifacts:
    - path: ".planning/tmp/docs-work-manifest.json"
      provides: "待清理的临时 docs 队列清单"
    - path: "README.md"
      provides: "待删除的根目录生成草稿"
  key_links:
    - from: ".planning/tmp/docs-work-manifest.json"
      to: "README.md"
      via: "docs 临时 manifest 与根目录草稿的联合清理判断"
      pattern: "README\\.md|tmp|temporary"
---

<objective>
清理 `.planning/tmp`，并删除根目录 `README.md` 生成草稿，使临时 docs 产物完全收尾。

Purpose: 避免临时目录长期堆积过期产物，同时移除一次性生成的根目录 README 草稿，防止后续把它误认为正式仓库文档。

Output: 一个被清理后的 `.planning/tmp`，以及删除后的根目录 `README.md` 草稿不再出现在工作区中。
</objective>

<execution_context>
@/home/wuxf/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/wuxf/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@AGENTS.md
@.planning/STATE.md
@.planning/tmp/docs-work-manifest.json

当前已知事实：
- `.planning/tmp` 当前仅发现 `docs-work-manifest.json`。
- 仓库内未发现 `.planning/tmp/README.md`。
- 根目录 `README.md` 带有 `<!-- generated-by: gsd-doc-writer -->` 头注释，属于一次性生成草稿。
- `docs-work-manifest.json` 记录的是 docs 生成队列，不是项目正式状态来源。

约束：
- 本次 quick 只处理已确认的临时产物：`.planning/tmp` 与根目录 `README.md`。
- 不改动 `docs/`、其它 `.planning/quick/` 目录或 phase 目录。
</context>

<tasks>

<task type="auto">
  <name>Task 1: 审核 docs 临时 manifest 与根目录 README 草稿</name>
  <files>.planning/tmp/docs-work-manifest.json, README.md</files>
  <action>检查 `docs-work-manifest.json` 是否仍被当前 GSD / docs 流程作为活跃输入；如果它只是一次性临时队列且没有后续消费者，则将其视为待删除对象。同步确认根目录 `README.md` 是否属于 `gsd-doc-writer` 生成草稿：若是一次性产物且仓库此前并无正式跟踪版本，则直接纳入本次清理范围，避免后续误认为正式项目文档。</action>
  <verify>
    <automated>bash -lc 'test ! -e .planning/tmp/docs-work-manifest.json || rg -n "canonical_queue|review_queue|gap_queue" .planning/tmp/docs-work-manifest.json; test ! -e README.md || rg -n "generated-by: gsd-doc-writer|OpenLearn Next" README.md'</automated>
  </verify>
  <done>对 `docs-work-manifest.json` 与根目录 `README.md` 草稿的去留都有明确结论，且结论可直接指导下一步清理。</done>
</task>

<task type="auto">
  <name>Task 2: 执行清理并验证最终目录状态</name>
  <files>.planning/tmp/docs-work-manifest.json, README.md</files>
  <action>按 Task 1 的结论清理 `.planning/tmp` 和根目录 `README.md`：删除已失效的临时 manifest；在 `.planning/tmp` 为空时一并移除空目录；删除未跟踪的根目录 `README.md` 生成草稿。完成后验证 `.planning/tmp` 不存在，且根目录 `README.md` 不再出现在工作区中。</action>
  <verify>
    <automated>node -e "const fs=require('fs');process.exit(fs.existsSync('.planning/tmp')||fs.existsSync('README.md')?1:0)"</automated>
  </verify>
  <done>`.planning/tmp` 与根目录 `README.md` 草稿都已完成清理，最终状态是不再残留这两类临时 docs 产物。</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| `.planning/tmp` -> 正式 planning 文档 | 临时产物不能冒充长期事实来源。 |
| 根目录 `README.md` 草稿 -> 正式仓库文档 | 一次性生成草稿不能被误认为仓库正式入口文档。 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-260510-qor-01 | Tampering | `.planning/tmp` 与根目录 `README.md` | mitigate | 只删除已确认的临时产物，禁止触碰其它 planning 文档或正式 docs。 |
| T-260510-qor-02 | Repudiation | README 草稿去留结论 | mitigate | 用最终工作区状态表达结论：根目录 `README.md` 被删除，不再留下“是否保留”歧义。 |
| T-260510-qor-03 | Denial of service | 后续 docs 流程 | mitigate | 先核对 `docs-work-manifest.json` 是否仍有活跃消费者，再删除过期临时文件，避免误删仍在用的输入。 |
| T-260510-qor-04 | Information disclosure | 生成草稿内容 | accept | 根目录 `README.md` 作为一次性生成草稿直接删除，不再保留任何误导性入口文档。 |
</threat_model>

<verification>
依次验证：
- `bash -lc 'test ! -e .planning/tmp/docs-work-manifest.json || rg -n "canonical_queue|review_queue|gap_queue" .planning/tmp/docs-work-manifest.json; test ! -e README.md || rg -n "generated-by: gsd-doc-writer|OpenLearn Next" README.md'`
- `node -e "const fs=require('fs');process.exit(fs.existsSync('.planning/tmp')||fs.existsSync('README.md')?1:0)"`
</verification>

<success_criteria>
- `.planning/tmp` 中不再残留过期临时清单。
- 根目录 `README.md` 生成草稿被明确删除，不留“之后再决定”。
- 最终状态可被自动验证为 `.planning/tmp` 与根目录 `README.md` 都不存在。
</success_criteria>

<output>
完成后创建 `.planning/quick/260510-qor-planning-tmp-readme-md/260510-qor-SUMMARY.md`。
</output>
