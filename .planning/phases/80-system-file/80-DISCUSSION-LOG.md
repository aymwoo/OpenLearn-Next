# Phase 80: system.file 文件存储代理 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-13
**Phase:** 80-system.file 文件存储代理
**Areas discussed:** 上传接口形式, 存储根目录配置, 删除与 GC 策略, 配额超限处理

---

## 上传接口形式

| Option | Description | Selected |
|--------|-------------|----------|
| multipart/form-data | 标准 HTTP 文件上传，支持流式传输，适合 50MB 大文件 | ✓ |
| JSON base64 | 文件编码为 base64 放入 JSON body，~33% 膨胀 | |

**User's choice:** multipart/form-data（推荐）
**Notes:** 插件发送 FormData，API Route 直接读取流写入磁盘，Node.js 内置支持

| Option | Description | Selected |
|--------|-------------|----------|
| /api/system/file/upload | 独立 API Route，通过 session 认证 | ✓ |
| /api/plugins/[pluginKey]/files | 按插件分组路径 | |

**User's choice:** /api/system/file/upload（推荐）

| Option | Description | Selected |
|--------|-------------|----------|
| 上传时传 fileName | FormData 中附带 fileName，服务端提取 ext，原始文件名存元数据表 | ✓ |
| 不传文件名 | 只返回 SHA-256，文件名由插件管理 | |

**User's choice:** 上传时传 fileName（推荐）

| Option | Description | Selected |
|--------|-------------|----------|
| 幂等返回已有文件 | SHA-256 相同时不重复写磁盘，直接返回已有 fileId | ✓ |
| 允许重复存储 | 每次上传独立元数据行，引用计数 | |

**User's choice:** 幂等返回已有文件（推荐）

---

## 存储根目录配置

| Option | Description | Selected |
|--------|-------------|----------|
| 环境变量 FILE_STORAGE_ROOT | 通过环境变量配置，默认 data/files/ | ✓ |
| 固定路径 data/files/ | 硬编码不可配置 | |

**User's choice:** 环境变量 FILE_STORAGE_ROOT（推荐）

| Option | Description | Selected |
|--------|-------------|----------|
| 不分桶 | {schoolId}/{pluginKey}/{sha256}.{ext}，SHA-256 天然均匀分布 | ✓ |
| 按日期分桶 | 加入 YYYY-MM 层级 | |

**User's choice:** 不分桶（推荐）

| Option | Description | Selected |
|--------|-------------|----------|
| 首次写入时懒创建 | 上传时 mkdir recursive | ✓ |
| 启动时预创建 | server.ts 启动时校验 | |

**User's choice:** 首次写入时懒创建（推荐）

---

## 删除与 GC 策略

| Option | Description | Selected |
|--------|-------------|----------|
| BullMQ 定时任务 + 30 天保留 | 定期扫描 isLatest=false 超期记录 | |
| 手动脚本触发 | scripts/gc-files.ts 手动执行 | ✓ |
| 立即物理删除 | delete 时直接清除 | |

**User's choice:** 手动脚本触发

| Option | Description | Selected |
|--------|-------------|----------|
| 软删除 + 单文件删除 | 标记 isLatest=false，单文件操作 | ✓ |
| 硬删除 + 批量删除 | 直接物理清除，支持批量 | |

**User's choice:** 软删除 + 单文件删除（推荐）

| Option | Description | Selected |
|--------|-------------|----------|
| 基础 GC + 日志输出 | 输出统计信息，不写审计 | ✓ |
| 完整 GC + 审计 | dry-run 模式、过滤、审计日志 | |

**User's choice:** 基础 GC + 日志输出（推荐）

| Option | Description | Selected |
|--------|-------------|----------|
| 暂不提供恢复 | 不暴露 restore API | ✓ |
| 提供 restore API | system.file.restore 命令 | |

**User's choice:** 暂不提供恢复（推荐）

---

## 配额超限处理

| Option | Description | Selected |
|--------|-------------|----------|
| 拒绝 + 结构化错误 | HTTP 413/507 + 当前用量、配额上限、超出量 | ✓ |
| 拒绝 + 简单错误 | 仅说明超限，不暴露细节 | |

**User's choice:** 拒绝 + 结构化错误（推荐）

| Option | Description | Selected |
|--------|-------------|----------|
| 通过接口返回配额查询 | metadata/quota 接口返回用量统计 | ✓ |
| 不上传时才知道 | 不上传无法自查 | |

**User's choice:** 通过接口返回配额查询（推荐）

| Option | Description | Selected |
|--------|-------------|----------|
| 系统默认 + 环境变量覆盖 | 硬编码默认 + FILE_QUOTA_* 环境变量 | ✓ |
| 数据库配置表 | 独立 schoolPluginQuotas 表 | |

**User's choice:** 系统默认 + 环境变量覆盖（推荐）

| Option | Description | Selected |
|--------|-------------|----------|
| 流式检查 | 接收流时累计字节，超限立即中断 | ✓ |
| 上传完成后检查 | 先完整接收再检查 | |

**User's choice:** 流式检查（推荐）

---

## Claude's Discretion

以下领域由 Claude/下游 agent 自行决定：
- API Route 内部调用 dispatchSystemCommand 的适配方式
- 流式 SHA-256 计算的实现细节
- Range 请求解析策略（单 range，HTTP 206）
- List 分页方式（cursor-based）
- 路径穿越防护的具体实现
- manifest SystemCommandFileSchema 的 shape
- 新增 deny reason 码

## Deferred Ideas

None — 讨论保持在 Phase 80 范围内。
