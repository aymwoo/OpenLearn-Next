---
phase: 80
slug: system-file
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-13
---

# Phase 80 — system.file 安全审查

> 文件存储代理子系统安全契约：威胁注册、已接受风险及审计追踪。

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| schema.ts → SQLite | pluginFiles 表定义，数据存储边界 | 文件元数据（sha256、fileName、mimeType、sizeBytes、diskPath） |
| DAL → SQLite | 数据访问层是 DB 的唯一入口；所有查询强制 schoolId+pluginId | 文件记录（CRUD） |
| API Route → 文件系统 | sanitizeFilePath 消毒所有路径后文件系统写入 | 二进制文件内容 |
| 上传流 → 磁盘 | QuotaTransform 在 stream pipeline 中拦截超限流量 | 文件字节流 |
| HTTP Request → Upload Route | 不可信 multipart 数据进入——路径穿越防护 + 配额检查 + SHA-256 验证 | multipart 文件 + 表单字段 |
| HTTP Request → Download Route | 不可信 fileId query param——DAL 强制施加 schoolId+pluginId 双重隔离 | fileId |
| HTTP Request → Delete/List/Metadata Routes | 不可信 fileId/prefix——DAL/facade 层强制施加权限隔离 | fileId、prefix、cursor |
| API Route → Command Bus | upload 仅传元数据（Binary Bypass 不变式） | fileId、sha256、fileName、mimeType、sizeBytes、diskPath |
| facade → governance gate | assertActionExecutable 从认证 session 派生 schoolId（T-79-04） | actorId、pluginKey、commandType |
| facade → Command Bus | enveloped 命令只有元数据；二进制从不进入 Bus | 命令信封 |
| handler authorize → manifest | PluginManifestSchema.parse 每次请求重新解析 manifest | manifest JSON |
| handler → DAL | execute 通过 DAL 访问 pluginFiles，支持 schoolId+pluginId 隔离 | 文件记录 |
| CLI → 文件系统 | GC 脚本手动运行，操作员直接访问文件系统 | 文件路径 |
| CLI → SQLite | GC 脚本连接本地 SQLite 数据库 | 文件行记录 |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-80-01 | Tampering | pluginFiles.sha256 uniqueIndex | mitigate | uniqueIndex on (schoolId, pluginId, sha256) 确保相同内容同插件同校不会产生重复记录；operation="upload" 的行 sha256 NOT NULL，operation="delete" 的行 sha256=NULL | closed |
| T-80-02 | Info Disclosure | pluginFiles.diskPath | mitigate | diskPath 仅存储 FILE_STORAGE_ROOT 下的相对路径；跨插件/跨校物理隔离由 schoolId/pluginId 双重 FK 施加，在 DAL 查询时强制双重 filter | closed |
| T-80-03 | Elevation | SystemCommandFileSchema.allowedPaths PATH_PATTERN | mitigate | PATH_PATTERN `/^[a-zA-Z0-9_\-./]+$/` 拒绝对 manifest 声明的 %00 和 .. 注入；路径穿越的完整防护在 file-path-guard.ts（Plan 02）中实现 | closed |
| T-80-04 | Elevation | SystemCommandDiscriminatedSchema | mitigate | Zod discriminatedUnion 的 "command" 字段仅接受已知字面量；未知 command 被 Zod 自动拒绝，无法通过 manifest 解析 | closed |
| T-80-05 | Tampering | sanitizeFilePath | mitigate | 四层防护：双重 decodeURIComponent（捕获 %2e%2e%2f 和 %252f 变体）→ null byte 拒绝 → .. 拒绝 → path.resolve 前缀验证（确保解析路径在 ABSOLUTE_STORAGE_ROOT 内） | closed |
| T-80-06 | Elevation | DAL 双重隔离 | mitigate | 所有 DAL 查询的 where 子句强制包含 and(eq(schoolId), eq(pluginId))；绝不信任调用者传入的 schoolId/pluginId 而不加过滤 | closed |
| T-80-07 | Denial of Service | QuotaTransform | mitigate | stream.Transform 在 _transform 回调中立即检测 bytesWritten > maxBytes 并 error；pipeline 的 catch 处理清理部分写入文件 | closed |
| T-80-08 | Info Disclosure | diskPath | mitigate | diskPath 仅存储相对路径；resolveStoragePath 在 FILE_STORAGE_ROOT 下解析，不暴露系统绝对路径给调用者 | closed |
| T-80-09 | Tampering | softDeleteFile 事务 | mitigate | UPDATE isLatest=false + INSERT new row 在同一 Drizzle 事务中执行；操作失败时整个事务回滚，不会出现不一致状态 | closed |
| T-80-10 | Elevation | systemFileAuthorize first-match-wins | mitigate | 每次请求重新解析 PluginManifestSchema.parse(row.manifestJson)；遍历 fileEntries 并在第一条同时匹配 allowedPaths 前缀和 allowedOperations 的条目处授权；无匹配时 audit-before-throw | closed |
| T-80-11 | Elevation | facade schoolId injection | mitigate | schoolId 由 assertActionExecutable 从认证 session 注入（T-79-04 不变式）；facade 不接受 schoolId 作为输入参数 | closed |
| T-80-12 | Repudiation | writeSystemCommandAudit | mitigate | 所有 deny（在 handler authorize 中）和所有 allow（在 handler execute 中）在执行结果操作之前写入审计记录；关联到 commandId 和 correlationId 以支持追溯 | closed |
| T-80-13 | Information Disclosure | upload metadata payload | mitigate | Binary Bypass 不变式：Command Bus 的 payload 仅包含元数据（fileId、sha256、fileName、mimeType、sizeBytes、diskPath）——原始二进制数据绝不进入 Bus payload | closed |
| T-80-14 | Denial of Service | dedupeKey | mitigate | 所有 system.file.* 命令使用 dedupe: "required"（registry.ts 声明），使用相同的 dedupeKey 防止重放攻击 | closed |
| T-80-15 | Tampering | upload multipart parsing | mitigate | 文件名经过 sanitizeFilePath 四层消毒；SHA-256 在服务端独立计算（不信任客户端提供的 hash）；流式管道在 error 时 fs.unlink 清理部分文件 | closed |
| T-80-16 | Tampering | upload 幂等竞态 | mitigate | fs.createWriteStream(path, { flags: "wx" }) 独占创建；EEXIST → 检查已存在文件 SHA-256 匹配；不匹配时清理 + 返回 409（冲突） | closed |
| T-80-17 | Denial of Service | upload QuotaTransform | mitigate | QuotaTransform 在超过 maxBytes 时立即中断流；pipeline 的 error handler 清理部分写入文件；单文件 50MB + 总计 500MB/插件/校 双重上限 | closed |
| T-80-18 | Elevation | download fileId injection | mitigate | getFileRecord 强制执行 schoolId+pluginId 双重 where 条件；diskPath 由 resolveStoragePath 在 FILE_STORAGE_ROOT 下解析——即使 fileId 被伪造也无法访问其他插件/学校的文件 | closed |
| T-80-19 | Elevation | delete fileId cross-plugin | mitigate | dispatchSystemCommand facade 调用 assertActionExecutable → schoolId 从 session 派生；handler execute 的 softDeleteFile 施加 schoolId+pluginId 双重检查 | closed |
| T-80-20 | Information Disclosure | download Content-Disposition | mitigate | 始终设置 Content-Disposition: attachment（触发下载，不内联渲染）；Cache-Control: private, no-cache（防止代理缓存） | closed |
| T-80-21 | Information Disclosure | metadata MIME sniffing | mitigate | Content-Type 使用 DB 记录的 mimeType（上传时从 multipart Content-Type 头提取），不进行文件内容嗅探 | closed |
| T-80-22 | Tampering | gc-files.ts diskPath injection | mitigate | diskPath 使用 resolveStoragePath 在 FILE_STORAGE_ROOT 下解析；仅删除已知的 pluginFiles diskPath 引用的文件——不进行任意文件系统扫描 | closed |
| T-80-23 | Denial of Service | gc-files.ts 批量删除 | mitigate | 仅删除 isLatest=false 的行——活跃文件（isLatest=true）不受影响；--dry-run 允许在删除前预览 | closed |
| T-80-24 | Repudiation | gc-files.ts 审计 | accept | D-10 明确声明不写 governanceAudit——GC 是运维操作，非插件操作；运维日志应通过操作系统日志捕获 | closed |
| T-80-SC | Tampering | npm/pip/cargo installs | mitigate | 无新包安装——仅使用 Node.js 内置模块和已有的 drizzle-orm + zod 项目依赖 | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-80-01 | T-80-24 | GC 脚本不写 governanceAudit——GC 是运维操作，非插件操作。运维审计通过操作系统日志记录（syslog/journald）。D-10 决策明确排除 governanceAudit 写入。 | Wu Xiangfeng | 2026-06-13 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-13 | 25 | 25 | 0 | gsd-security-auditor (plan-time threat model) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-13
