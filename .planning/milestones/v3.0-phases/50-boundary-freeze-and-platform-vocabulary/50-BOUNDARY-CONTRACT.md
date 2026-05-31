# Phase 50 Boundary Contract

本文件冻结 `v3.0` 第一阶段平台内核的术语、命令入口边界与真相源姿态；它是边界 contract，不是实现设计。

## Frozen Vocabulary

command = authoritative mutation request
action = discoverable capability unit
event = after-fact fact
task = deferred execution / orchestration unit
runtime transport = delivery mechanism

以上术语在后续 Phase 51-54 中保持单义：`command` 负责承载可校验、可授权、可审计的 durable mutation 请求；`action` 负责暴露可发现的能力单元；`event` 只代表命令成功后已经发生的事实；`task` 只代表延后执行或编排单元；`runtime transport` 只代表实时交付机制。本 contract 不定义 command bus、action registry、event outbox 或 task runtime 的实现方案。

## Command Entry Boundary

`Server Actions`、`plugin host`、`async task processors` 都是 future `PlatformCommand` producers。

只要这些入口发起 durable mutation，它们未来都必须汇入同一条 `PlatformCommand` execution boundary。现有直调 DAL、registry 或其他 service seam 的路径从本 contract 起只允许以兼容适配器姿态存在，不再被视为长期 authoritative seam。本节只冻结 producer 边界，不规定 command bus、handler registry、outbox 或 runtime wiring 的实现细节。

## Canonical Truth Posture

SQLite + DAL = canonical truth
BullMQ / Redis / WebSocket = delivery / orchestration substrate only

`runtime transport` 不是 platform event bus。课堂实时链路、queue dispatch、fanout、worker orchestration 与 transport delivery 都不能升格为平台级真相源，也不能替代 platform facts 的 durable truth。`runtimeEventOutbox`、runtime event seam、BullMQ queue job、Redis fanout 与 WebSocket transport 只服务 delivery / orchestration posture；后续平台事件事实层必须与这些 runtime substrate 严格分层。
