/**
 * AI Tools 公共 barrel —— 收口 typed tool 层可见面（AGENT-02 / T-62-05）。
 *
 * 只 re-export 工具的公共面：`createDraftLessonStepTool` 工厂。
 *
 * **刻意不导出** `prompts`（内部 prompt 编排 helper）等内部模块 —— 收窄公共面，
 * 调用方只能拿到经闭包注入 teacherId 的 tool 工厂，无法触达内部 prompt 拼装逻辑。
 *
 * 注意：本模块经由 lesson-draft（`import "server-only"`）传递性绑定 server-only 边界，
 * 不应被 client/edge/plugin import（no-leak.test.ts A 组静态证明）。
 */

export { createDraftLessonStepTool } from "./lesson-draft";
export type { CreateDraftLessonStepToolDeps } from "./lesson-draft";
