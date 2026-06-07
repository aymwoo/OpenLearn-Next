---
phase: 61
slug: ai-provider-abstraction-layer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-31
---

# Phase 61 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: 61-RESEARCH.md §Validation Architecture (零真实 LLM 调用策略).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 + @vitest/coverage-v8 4.1.6（已安装，无需 Wave 0 安装）|
| **Config file** | `vitest.config.mts`（alias `@`→`src/`；glob `src/**/*.{test,spec}.{ts,tsx}`）|
| **Quick run command** | `pnpm vitest run src/server/ai/providers` |
| **Full suite command** | `pnpm vitest run` |
| **Estimated runtime** | ~5 秒（provider 子集，零网络）；全量另计 |

**关键测试手段（零真实 LLM 调用）：**
- `MockLanguageModelV3`（`ai/test` 导出，ai@6.0.193 已验证）注入 facade/registry 的 `resolveModel()`，覆盖文本/结构化/错误三路径。
- ioredis 限流：`vi.mock("ioredis")` 或 `ioredis-mock`（先例 `src/features/async-tasks/infra/connection.test.ts:8`）。
- `server-only`：`vi.mock("server-only", () => ({}))`（先例 `src/lib/dal/classroom.test.ts:39`）。

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run src/server/ai/providers`
- **After every plan wave:** Run `pnpm vitest run`（全量）
- **Before `/gsd-verify-work`:** 全量 green + `pnpm typecheck` + `pnpm lint` 通过
- **Max feedback latency:** ~5 秒（provider 子集）

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 61-01-01 | 01 | 1 | PROV-02 | T-61-key-leak | env 缺失即抛；key 不进 DTO | unit | `pnpm vitest run src/server/ai/providers/config.test.ts` | ❌ W0 | ⬜ pending |
| 61-01-02 | 01 | 1 | PROV-04 | — | 4 类错误映射 + retryable 正确 | unit | `pnpm vitest run src/server/ai/providers/error-mapping.test.ts` | ❌ W0 | ⬜ pending |
| 61-02-01 | 02 | 2 | PROV-01 | — | facade 文本/结构化成功；换 adapter 不改调用方 | unit | `pnpm vitest run src/server/ai/providers/facade.test.ts` | ❌ W0 | ⬜ pending |
| 61-02-02 | 02 | 2 | PROV-01 | — | registry 解析默认 provider + 测试 seam 可覆写 | unit | `pnpm vitest run src/server/ai/providers/registry.test.ts` | ❌ W0 | ⬜ pending |
| 61-03-01 | 03 | 2 | PROV-03 | T-61-dos | 超限抛 RateLimitError(retryAfter)；teacher+global 双层；Redis 不可达 fail-closed | unit | `pnpm vitest run src/server/ai/providers/rate-limit.test.ts` | ❌ W0 | ⬜ pending |
| 61-03-02 | 03 | 2 | PROV-02 | T-61-key-leak | import 图隔离：proxy/Edge route/`"use client"` 不 import provider；返回面无 key | static/unit | `pnpm vitest run src/server/ai/providers/no-leak.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task IDs 为预估映射；planner 产出 PLAN.md 后以实际 plan/wave 编号为准。*

---

## Wave 0 Requirements

- [ ] `src/server/ai/providers/config.test.ts` — PROV-02（env 读取 + 缺失抛错）
- [ ] `src/server/ai/providers/error-mapping.test.ts` — PROV-04（APICallError → 4 类 discriminated union）
- [ ] `src/server/ai/providers/facade.test.ts` — PROV-01（aiGenerateText/aiGenerateObject 成功路径）
- [ ] `src/server/ai/providers/registry.test.ts` — PROV-01（默认 provider 解析 + 测试 seam）
- [ ] `src/server/ai/providers/rate-limit.test.ts` — PROV-03（双层固定窗口 + fail-closed）
- [ ] `src/server/ai/providers/no-leak.test.ts` — PROV-02（import 图静态检查 + 返回面无 key）
- [ ] 共享夹具：`MockLanguageModelV3` 工厂 + ioredis mock helper + server-only shim
- [ ] 框架无需新装（Vitest 4.1.5 已就绪）

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 国产 OpenAI 兼容端点真实 `generateObject` 结构化兼容性 | PROV-01 | RESEARCH MEDIUM 置信度，依具体供应商（DeepSeek/通义/智谱）；CI 不打真实网络 | 接入时配 `.env.local` 真实 baseURL+key，跑一次手动冒烟脚本验证结构化输出与降级行为 |
| client bundle 不含 env key 字面值（可选强校验） | PROV-02 | 需构建产物后 grep，非单测范畴 | `pnpm build` 后 grep client chunk 不含 key 字面值（运维侧；planner 决定是否纳入） |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags（用 `vitest run`，非 watch）
- [ ] Feedback latency < 5s（provider 子集）
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
