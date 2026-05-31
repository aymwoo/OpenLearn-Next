---
phase: 52
slug: action-registry-plugin-lifecycle-governance
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-22
---

# Phase 52 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| static code catalog -> projected descriptor | code-owned action registry is projected into machine-readable descriptors and must not drift back into dynamic authority | action metadata, owner/source classification |
| plugin manifest metadata -> action descriptor | manifest governance fields can influence descriptors, but only through schema-validated static projection | manifest metadata, lifecycle dependencies, permissions |
| DAL truth -> governance projection | durable plugin registration truth is mapped into external lifecycle/read models and must preserve semantics | lifecycle state, uninstall metadata, dependency declarations |
| dependency graph -> action visibility | dependency and activation outcomes directly gate executable actions and recovery guidance | dependency graph, reason codes, recovery actions |
| governance projection -> host/server adapters | all runtime adapters must consume the same lifecycle/recovery contract and not widen permissions independently | lifecycle state, reasonCode, recommendedRecoveryAction |
| operator UI -> uninstall commands | destructive uninstall intent crosses from UI to server and must keep explicit confirmation semantics | retention mode, cleanup confirmation token, preflight counts |
| uninstall UI intent -> command payload | cleanup must be proven server-side instead of relying on client-local state | confirmation token, uninstall payload |
| host recovery adapter -> lifecycle mutation path | blocked plugin recovery must stay limited to reason-matched commands | host action name, reasonCode, command dispatch |
| dependency helper -> lifecycle transitions | dependency ordering moved from read model to mutation path and must fail fast instead of half-activating chains | ordered plugin ids, missing dependencies, cycles |
| server governance bundle -> client operator surface | the UI must render server-owned governance truth rather than infer lifecycle locally | dashboard bundle DTO, executable catalog, diagnostics rows |
| executable catalog -> diagnostics tab | blocked diagnostics must remain operator-only and not leak into the ordinary executable catalog | blocked rows, reason codes, lifecycle diagnostics |
| retain uninstall DB truth -> governance projection | retained uninstall metadata must remain visible through snapshot/projection and not fall back to installed/enabled semantics | `uninstalledAt`, `uninstallRetentionMode` |
| governance projection -> operator diagnostics | `uninstalled` must render as audit-only state with no primary action | lifecycle badge, uninstall summary, recovery actions |
| host/server recovery request -> command bus | `plugin.reconcile` must use the same command-bus boundary rather than a side-channel mutation path | reconcile payload, invalidation tags, audit trail |
| dependency diagnostic -> reconcile mutation | dependency failures must recover only through explicit reconcile and never auto-heal implicitly | dependency reason codes, reconcile command |
| governance read model -> operator recovery button | operator CTA dispatch must match the recommended recovery action instead of collapsing back to a generic enable toggle | recommendedRecoveryAction, server action dispatch |
| phase verifier -> future refactors | phase close gates must detect drift in `uninstalled` truth and `plugin.reconcile` wiring during later changes | verifier static guards, focused suites, close gate signal |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-52-01-01 | T | `src/server/plugins/registry.ts` | mitigate | Registry remains a code-owned static implementation catalog; descriptor projection reads it without restoring dynamic authority. Verified by `52-01-SUMMARY.md` and `52-VERIFICATION.md` artifact checks for `src/server/plugins/registry.ts`. | closed |
| T-52-01-02 | I | action catalog DTO | mitigate | Executable catalog rows and blocked diagnostics are split into separate DTO contracts so ordinary consumers do not receive blocked reason details by default. Verified by `52-01-SUMMARY.md`, `52-03-SUMMARY.md`, and `52-VERIFICATION.md` truth #2. | closed |
| T-52-01-03 | E | descriptor metadata | mitigate | Descriptor schema constrains implementation source to main-repo static implementation and rejects remote manifest execution. Verified by `52-01-SUMMARY.md` and `52-VERIFICATION.md` truth #1. | closed |
| T-52-02-01 | T | lifecycle projection mapping | mitigate | External lifecycle is fixed to installed/enabled/active/suspended/uninstalled while internal `mounted`/`ready`/`failed` remain diagnostic-only. Verified by `52-02-SUMMARY.md` and `52-VERIFICATION.md` truths #3-4. | closed |
| T-52-02-02 | D | dependency failure handling | mitigate | Dependency graph blocks only affected chains and keeps unrelated plugins runnable. Verified by `52-02-SUMMARY.md` plus `52-VERIFICATION.md` truth #5 and focused suites. | closed |
| T-52-02-03 | I | operator diagnostics | mitigate | Diagnostics expose stable reason codes and recovery actions without leaking internal stack detail. Verified by `52-02-SUMMARY.md`, `52-03-SUMMARY.md`, and `52-VERIFICATION.md` truth #3. | closed |
| T-52-02-04 | E | recovery flow | mitigate | Projection never auto-recovers; operators must use explicit `enable` / `retry` / `resume` / `reconcile` commands. Verified by `52-02-SUMMARY.md` and `52-VERIFICATION.md` truth #8. | closed |
| T-52-03-01 | I | executable catalog read API | mitigate | Ordinary catalog reads return executable rows only, while blocked diagnostics stay behind the governance/operator path. Verified by `52-03-SUMMARY.md`, `52-05-SUMMARY.md`, and `52-VERIFICATION.md` truth #2. | closed |
| T-52-03-02 | E | host/server governance adapters | mitigate | Host and server adapters consume the shared external lifecycle/read model instead of bypassing registry gating. Verified by `52-03-SUMMARY.md` and `52-VERIFICATION.md` truths #2-3. | closed |
| T-52-03-03 | T | uninstall cleanup flow | mitigate | Cleanup remains opt-in and gated by preflight plus explicit confirmation instead of a destructive default. Verified by `52-03-SUMMARY.md`, `52-04-SUMMARY.md`, and `52-VERIFICATION.md` truth #6. | closed |
| T-52-03-04 | D | operator recovery UX | mitigate | UI offers only explicit recovery actions and does not imply background auto-recovery. Verified by `52-03-SUMMARY.md`, `52-08-SUMMARY.md`, and `52-VERIFICATION.md` truth #8. | closed |
| T-52-04-01 | T | `plugin.uninstall` payload | mitigate | Cleanup requires a deterministic confirmation token that is regenerated and verified server-side before delete. Verified by `52-action-registry-plugin-lifecycle-governance-04-SUMMARY.md` and `52-VERIFICATION.md` truth #6. | closed |
| T-52-04-02 | I | retain uninstall row | mitigate | Retain keeps the registration row and writes `uninstalledAt` / `uninstallRetentionMode`, preventing silent loss of audit/governance truth. Verified by `52-action-registry-plugin-lifecycle-governance-04-SUMMARY.md`, `52-action-registry-plugin-lifecycle-governance-06-SUMMARY.md`, and `52-VERIFICATION.md` truths #4 and #6. | closed |
| T-52-04-03 | E | `plugin-host.ts` recovery gate | mitigate | Host recovery decisions are reason-code matched; dependency problems allow only reconcile and do not widen to arbitrary resume/retry. Verified by `52-action-registry-plugin-lifecycle-governance-04-SUMMARY.md`, `52-action-registry-plugin-lifecycle-governance-07-SUMMARY.md`, and `52-VERIFICATION.md` truths #5 and #8. | closed |
| T-52-04-04 | D | dependency activation ordering | mitigate | Mutation path resolves activation chains before transition and fails fast on missing or cyclic dependencies to avoid half-started states. Verified by `52-action-registry-plugin-lifecycle-governance-04-SUMMARY.md` and `52-VERIFICATION.md` truth #5. | closed |
| T-52-05-01 | I | `settings-surface.tsx` | mitigate | Server component reads `GovernanceDashboardBundle` directly and removes raw plugin DTO wiring from the page boundary. Verified by `52-action-registry-plugin-lifecycle-governance-05-SUMMARY.md` and `52-VERIFICATION.md` required artifact for `settings-surface.tsx`. | closed |
| T-52-05-02 | T | `plugin-lifecycle-operator-surface.tsx` | mitigate | Client surface no longer infers lifecycle or reason codes locally; it renders only registry/governance read-model output. Verified by `52-action-registry-plugin-lifecycle-governance-05-SUMMARY.md` and `52-VERIFICATION.md` truth #3. | closed |
| T-52-05-03 | I | diagnostics view | mitigate | Executable first view and blocked diagnostics remain split so blocked rows do not leak back into the ordinary UI. Verified by `52-action-registry-plugin-lifecycle-governance-05-SUMMARY.md` and `52-VERIFICATION.md` truth #2. | closed |
| T-52-06-01 | T | `listPluginGovernanceSnapshotRecords()` | mitigate | Snapshot read path explicitly carries `uninstalledAt` and `uninstallRetentionMode`, preserving retain uninstall metadata. Verified by `52-action-registry-plugin-lifecycle-governance-06-SUMMARY.md` and `52-VERIFICATION.md` truth #4. | closed |
| T-52-06-02 | I | `mapLifecycleState()` | mitigate | Retained uninstall rows map to `uninstalled` first and never fall back to installed/enabled semantics. Verified by `52-action-registry-plugin-lifecycle-governance-06-SUMMARY.md` and `52-VERIFICATION.md` truth #4. | closed |
| T-52-06-03 | E | `PluginLifecycleOperatorSurface` | mitigate | `uninstalled` rows are rendered as audit-only with no primary lifecycle action. Verified by `52-action-registry-plugin-lifecycle-governance-06-SUMMARY.md`, `52-UAT.md`, and `52-VERIFICATION.md` truth #4. | closed |
| T-52-07-01 | E | `plugin.reconcile` command surface | mitigate | `plugin.reconcile` is part of the command registry/bus and reuses existing audit and invalidation boundaries instead of creating a side channel. Verified by `52-action-registry-plugin-lifecycle-governance-07-SUMMARY.md` and `52-VERIFICATION.md` truth #8. | closed |
| T-52-07-02 | T | `isReasonMatchedRecoveryAction()` | mitigate | Dependency-related reason codes map only to `plugin.reconcile`, preserving exact recovery semantics. Verified by `52-action-registry-plugin-lifecycle-governance-07-SUMMARY.md` and `52-VERIFICATION.md` truths #5 and #8. | closed |
| T-52-07-03 | D | reconcile activation path | mitigate | Reconcile replay uses dependency activation chain and still throws `PLUGIN_RECONCILE_BLOCKED:*` when unresolved. Verified by `52-action-registry-plugin-lifecycle-governance-07-SUMMARY.md` and `52-VERIFICATION.md` truth #5. | closed |
| T-52-08-01 | T | `PluginLifecycleOperatorSurface` | mitigate | Diagnostics CTA dispatch is reason-aware and maps to explicit server actions rather than generic enable fallback. Verified by `52-action-registry-plugin-lifecycle-governance-08-SUMMARY.md`, `52-UAT.md`, and `52-VERIFICATION.md` truth #8. | closed |
| T-52-08-02 | I | `verify:phase52` | mitigate | Phase close gate statically guards `plugin.reconcile` and `uninstalled` truth while focused suites cover runtime behavior, preventing false-pass regressions. Verified by `52-action-registry-plugin-lifecycle-governance-08-SUMMARY.md` and `52-VERIFICATION.md` behavioral spot-checks. | closed |
| T-52-08-03 | E | dependency recovery UI | mitigate | Dependency-blocked plugins surface explicit reconcile in the operator UI and do not invent alternate recovery paths. Verified by `52-action-registry-plugin-lifecycle-governance-08-SUMMARY.md`, `52-UAT.md`, and `52-VERIFICATION.md` truths #5 and #8. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-22 | 27 | 27 | 0 | the agent (secure-phase) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-22
