# 领域陷阱研究

**领域:** system.file（本地文件存储代理）+ system.notification（应用内通知推送）
**研究日期:** 2026-06-13
**置信度:** HIGH（基于 2026 CVE 实际案例 + Node.js 安全最佳实践 + 现有代码库治理模型分析 + 文件系统 TOCTOU 学术共识）

> **给 roadmap 作者的阅读说明**：
> 本里程碑在 v4.3 已落地的 `dispatchSystemCommand` facade、`assertActionExecutable` 治理门、`writeSystemCommandAudit` 审计函、`SystemCommandDiscriminatedSchema` manifest 声明体系之上，扩展两个新命令类型。Pitfalls 覆盖：文件存储安全的路径穿越/TOCTOU/配额问题、通知系统的跨校隐私/频率控制/投递保证、以及两者与既有 Command Bus / 治理审计链路的集成陷阱。v4.3 的 7 个陷阱（SSRF/manifest TOCTOU/KV 隔离/审计缺口/schema 兼容/资源耗尽/治理门异构化）已进入 baseline，以下所有陷阱均针对 **v4.4 新增命令的特有风险**。

---

## Critical Pitfalls

### Pitfall 1: system.file — 路径穿越攻击（Path Traversal）

**故障表现:**
插件通过构造 `../`、`..%2F`、`%2e%2e%2f` 等编码变体，突破 `{schoolId}/{pluginId}/` 的隔离目录边界，读写系统敏感文件（`.env`、数据库文件、其他学校/插件数据）。

**根本原因:**
用户可控的 filename 或路径片段被直接拼接到文件系统路径中。Node.js 的 `path.resolve()` 会规范化 `..`，但如果先 resolve 再检查 `startsWith`，中间任何 `await` 点后文件系统状态都可能已改变。URL 编码攻击可绕过简单的字符串过滤。

**在这个系统中的具体风险:**
- v4.3 已建立的 SSRF 防护在 HTTP 层面拦截内网访问，但**文件系统层面**没有类似的路径边界防护。
- 插件通过 `system.file.upload/download/delete` 传入的 path 参数可能包含编码的穿越序列。
- 如果存储目录路径基于可预测的模式（如 `/data/files/{schoolId}/{pluginKey}/`），攻击者知道目录结构后可以精确构造穿越路径。
- SQLite 数据库文件在同一文件系统上，路径穿越可导致直接读取 `local.db`。

**实际 CVE 验证:**
- **CVE-2025-23084**（Node.js path.join）：Windows 下 `path.join` 对盘符的处理可导致穿越
- **CVE-2024-21891**：Node.js Permission Model 路径穿越绕过
- **h3 serveStatic** 安全公告（GHSA-wr4h-v87w-p3r7）：百分号编码的 `%2e%2e` 绕过 path normalization

**预防措施:**

1. **双步校验法**: 所有用户提供的路径组件，先用 `path.resolve(storageRoot, userPath)` 规范化，然后调用 `fs.realpath()` 消解所有符号链接后再验证结果以 `storageRoot + path.sep` 开头。

2. **Filename-only 约束 + Zod 边界校验**: 如果插件只应访问自身目录下的文件，禁止路径中包含 `/`、`\`、`..`、null byte（`\0`）、以及所有经过 URL decode 后产生上述字符的模式。Zod schema 拒绝包含这些模式的输入：
   ```typescript
   const SafeFilenameSchema = z.string()
     .min(1).max(255)
     .refine(s => !s.includes('/') && !s.includes('\\') && !s.includes('\0'), "path_traversal")
     .refine(s => !s.includes('..'), "parent_reference")
     .refine(s => !s.includes('%'), "encoded_character")
     .refine(s => path.basename(s) === s, "path_not_filename_only");
   ```

4. **O_NOFOLLOW 标志**: `fs.promises.open(path, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW)`，禁止符号链接跟随。

5. **URL 编码双重防御**: 在 Zod schema 层就拒绝包含 `%` 的输入（对纯 file path 场景），不让编码值进入文件系统层。对于必须接受任何字符的场景，先 decode 再校验。

6. **文件描述符锚定**: 预先打开隔离根目录的 `Dir` fd，所有后续操作相对于该 fd 进行（利用 `*at()` 系统调用语义）。

**检测信号:**
- 单元测试中尝试 `filename="../../../etc/passwd"` 未返回错误
- 单元测试中尝试 URL 编码版本 `filename="..%2F..%2F..%2Fetc%2Fpasswd"` 未返回错误
- 审计日志中出现 `reasonCode: "path_denied"` 的审计记录

**处理阶段:**
Phase 80（system.file 核心实现）— 路径校验必须在 Zod schema 层和文件系统操作层**双重生效**，此 Trap 是所有后续文件安全的基础。

---

### Pitfall 2: system.file — TOCTOU 竞态条件（Symlink Attack + 异步窗口攻击）

**故障表现:**
攻击者利用文件操作的异步窗口：先放置合法文件通过路径校验，然后在写入前的 `await` 窗口瞬间用符号链接替换目录组件，使文件写入攻击者控制的任意路径。或：两个并发请求同时检查配额、同时写入，绕过配额限制。

**根本原因:**
文件系统操作天然非原子。Node.js 核心团队在 Permission Model 稳定化 PR（#56201）中明确承认：基于路径的安全模型**始终存在** TOCTOU 问题。任何 `await` 点之后文件系统状态都可能已改变。

**在这个系统中的具体风险:**
- Node.js 的文件操作天然是 Promise-based（`await fs.writeFile(...)`），检查与使用之间自动产生窗口。
- 恶意插件可同时发起多个请求：一个请求创建合法文件结构，另一个请求在检查通过后、写入前替换目录为符号链接。
- 配额检查（读当前用量 → 计算新用量 → 允许/拒绝 → 写入文件）的每一步之间都有窗口，多请求并发可绕过配额。

**预防措施:**

1. **文件描述符锚定（fd-anchoring）**: 预先打开用户的隔离根目录并获取 `Dir` fd（`fs.promises.open(rootDir, 'r')`）。所有后续文件操作相对于该 fd，利用操作系统级的 `*at()` 系列系统调用。一旦持有 fd，即使目录被替换为符号链接，操作仍锚定在原目录。

2. **先写临时文件，再原子 rename**: 所有写入先在不可预测的临时文件名（`crypto.randomUUID()`）下完成，然后 `fs.rename(tmpPath, targetPath)`。`rename` 在同一文件系统内是原子的——目标路径要么指向旧文件，要么指向新文件，不存在中间状态。

3. **禁止符号链接**：在 `lstat` 检查中拒绝任何 `isSymbolicLink()` 为 true 的文件。在 Zod schema 层就拒绝 mode 变更请求中包含 symlink 创建。

4. **配额操作加锁**: 同一 `(schoolId, pluginId)` 的配额检查和更新必须在串行锁下进行。直接使用 SQLite 事务 + 行级锁（`SELECT ... FOR UPDATE` 等价物），将"检查配额→更新计数→审计写入"放在同一事务中。

5. **不使用 `fs.access()` + `fs.open()` 组合**: 这是经典的 TOCTOU 范式——先检查权限再打开，中间窗口无限。直接 `open()` 并在失败时处理 `EPERM`/`EACCES` 错误。

**检测信号:**
- 并发测试：10 个并发上传请求，配额仅够 5 个 → 必须恰好 5 个成功
- 安全性测试：在路径校验通过后、写入前，替换目录为符号链接 → 文件应写入原 fd 锚定的实际目录
- `lstat` 检测到文件类型为 symbolicLink 但预期为 regular file → 被正确拒绝

**处理阶段:**
Phase 80（system.file 核心实现）— TOCTOU 防御需要在文件操作模式设计之初就确定。并发配额测试和 symlink 测试必须覆盖。

---

### Pitfall 3: system.file — 磁盘配额耗尽拒绝服务（含 Inode 耗尽）

**故障表现:**
恶意或 buggy 插件通过上传超大文件、海量空文件（inode 耗尽）、或快速写入-删除循环（配额检查绕过），耗尽服务器磁盘空间或 inode，导致整个 OpenLearn 实例不可用——SQLite 无法写入，所有功能崩溃。

**根本原因:**
本地文件系统存储不提供 per-application 的配额控制。在 SQLite 单体架构中，文件系统空间耗尽意味着数据库也无法写入，整个应用进入只读/崩溃状态。

**在这个系统中的具体风险:**
- SQLite 与文件存储共享同一磁盘 → 文件配额耗尽直接导致数据库不可写
- 插件可能通过"写入-删除-再写入"循环绕过简单的累计配额计数（如果删除操作不减少计数，或计数与实际文件大小脱节）
- 大量 0 字节或 1 字节文件可耗尽 inode（即使总字节数未达配额）

**预防措施:**

1. **插件级硬配额 + manifest 声明**: manifest 中声明 `storageQuota`（字节数，默认 50MB）。install preflight 校验该值合理（≤ 全局最大 100MB）。配额计数器存储在 `pluginOwnedBusinessData` 中。

2. **单文件大小上限**: 默认最大 10MB/文件，可通过 manifest 声明调低。在 Zod schema 层和写入流式处理时双重校验。

3. **配额操作事务化**: 在 SQLite 事务中原子执行"读取当前用量 → 检查是否超限 → 写入文件元数据 → 更新配额计数"。

4. **Inode 限制**: 额外限制每插件的最大文件数（默认 5000 个），与字节配额并行执行。

5. **全局磁盘水位告警**: 当文件系统整体使用超过 80% 时，拒绝所有 system.file 写入（仅允许 system.file.delete），防止 SQLite 不可写。

6. **写入-审计一致性**: 文件的增删操作与配额更新必须在同一逻辑事务中完成。如果写入成功但配额更新失败，下次操作前自动修复（通过扫描实际文件计算真实用量）。

**检测信号:**
- 并发配额绕过测试：10 个并发上传说通过但只有 5 个配额 → 至少 5 个被拒绝
- Inode 耗尽测试：快速创建 6000 个小文件 → 在第 5001 个被拒绝
- 全局水位测试：模拟磁盘 85% 满 → 所有 system.file.upload 被拒绝

**处理阶段:**
Phase 80（system.file 核心实现）— 配额锁必须在文件写入路径的最早节点实现。Phase 82（集成与 close gate）补充全局水位监控。

---

### Pitfall 4: system.file — 二进制数据在 JSON Command Bus 中的编码灾难

**故障表现:**
当前 Command Bus 所有 payload 经过 JSON 序列化存储（`platformCommands.payloadJson` 和 `governanceAudits.payloadJson` 均为 JSON 文本列）。若将二进制文件内容放入 Command Bus envelope：
- `JSON.stringify(Buffer)` 转换为 `{"type":"Buffer","data":[0,1,2,...]}` —— 极度膨胀（~6x 到 ~10x 体积）
- base64 编码膨胀 ~33%
- 5MB 文件的 JSON 序列化/反序列化可能阻塞事件循环数秒
- SQLite 的 JSON 文本列不适合存储大型二进制数据（journal 爆炸、查询慢）

**根本原因:**
Command Bus 设计时未考虑二进制数据路径。所有现有命令处理的都是结构化文本数据。

**在这个系统中的具体风险:**
- `platformCommands.payloadJson` 的 JSON 类型列存储 5MB 文件 → 序列化后可能达 30MB+
- 每次 platformCommand 查询都会读到这个大 JSON → 查询变慢
- 治理审计表 `governanceAudits.payloadJson` 被文件二进制数据污染
- 即使使用 base64 编码，文件体积膨胀 33%，对课件视频/图片而言不可接受

**预防措施:**

1. **元数据与内容严格分离**: 文件内容**绝不**进入 Command Bus。Command Bus 只记录文件操作的**元数据**（操作类型、文件路径、大小、SHA-256 hash、MIME type）。文件内容走独立的流式路径。

2. **上传路径**: Server Action → 治理门检查 → 配额检查 → 直接流式写入文件系统 → 记录元数据到 Command Bus（仅用于审计）

3. **下载路径**: API Route → 认证+权限检查 → 直接流式读取文件系统 → 返回 Response Stream

4. **审计记录只含元数据**: `governanceAudits.payloadJson` 中只保存 `{ operation, filePath, size, hash, mimeType }`，不含文件内容字节。

5. **临时文件隔离**: 上传文件先写入临时区域（`/tmp/openlearn-uploads/`），完成所有校验后原子 rename 到永久存储区。

**检测信号:**
- `platformCommands.payloadJson` 列中出现 `{"type":"Buffer"` 或超过 64KB 的记录 → 立即阻止
- 大文件上传性能基准：5MB 文件上传延迟不超过 2s（不含网络）
- `governanceAudits.payloadJson` 所有记录 < 4KB

**处理阶段:**
Phase 80（system.file 核心实现）— 这是架构级决策，必须在设计之初就确定分离策略。一旦错误地将文件内容放入 Command Bus，后期重构成本极高。

---

### Pitfall 5: system.file — 文件类型校验仅依赖扩展名

**故障表现:**
插件声明上传 `homework.png`，实际是含有 `<script>alert(1)</script>` 的 HTML 文件。如果文件在后续课件展示或学生端渲染时被当作图片加载，可导致存储型 XSS。或：上传伪装为 `.pdf` 的可执行文件。

**根本原因:**
仅信任文件扩展名或声明 MIME type，未验证实际文件内容（magic bytes / file signature）。

**在这个系统中的具体风险:**
- SVG 文件中的 `<script>` 标签在浏览器渲染时可执行 JavaScript
- HTML 文件被伪装为 `.png` 上传后，在课件步骤中被 `<img>` 标签加载不会执行脚本（浏览器安全策略），但被 `<iframe>` 或 `<object>` 加载时会
- 恶意 PDF 可能包含 JavaScript 或表单提交钩子

**预防措施:**

1. **Magic bytes 检测**: 上传时读取文件头若干字节（前 256 bytes），验证与声明的 MIME type 相符。使用轻量级检测而非完整文件解析。

2. **MIME type 白名单 + manifest 声明**: manifest 声明中限制允许的文件类型（如 `["image/png", "image/jpeg", "application/pdf"]`）。不在白名单的一律拒绝，无论扩展名如何。

3. **拒绝可执行内容**: SVG（`image/svg+xml`）、HTML（`text/html`）、JavaScript（`application/javascript`）、WebAssembly（`application/wasm`）**永久拒绝**——即使 manifest 声明了也不接受。

4. **双层拒绝逻辑**: Zod schema 层（拒绝危险扩展名 + MIME type）+ 文件系统层（magic bytes 检测）。

**检测信号:**
- 上传扩展名 `.png` 但内容为 `<script>alert(1)</script>` → 被拒绝，reasonCode=`file_type_denied`
- 上传 SVG 文件（声明 `image/svg+xml`）→ 被拒绝，reasonCode=`executable_content_rejected`
- 上传合法 PNG 文件 → 通过

**处理阶段:**
Phase 80（system.file 核心实现）— 文件类型校验在 upload handler 的早期（magic bytes 检测在流式读取时就完成）。

---

### Pitfall 6: system.file — 与 append-only 模式的设计冲突

**故障表现:**
项目既有的数据访问层普遍使用 append-only / isLatest 模式（taskSubmissions、quizAttempts、runtimeStepStates、pluginOwnedBusinessData）。但文件系统本体不支持 append-only 语义——同一文件名的覆盖写入会**不可逆地丢失**旧版本。

**根本原因:**
文件系统操作（write/delete）本质上是原地修改。要实现不可变性，需要额外的抽象层。

**在这个系统中的具体风险:**
- 恶意插件覆盖已存在的合法文件 → 旧版本永久丢失 → 审计记录指向不存在的文件内容
- 插件升级后新版本格式不兼容 → 学生打开的课件资源被破坏
- 数据完整性验证无法检测文件是否被篡改（因为没有 hash 锚定）

**预防措施:**

1. **内容寻址存储（Content-Addressable Storage，首选方案）**: 每个文件以其 SHA-256 内容 hash 命名，存储为 `{root}/{schoolId}/{pluginId}/blobs/{sha256}`。逻辑文件名到内容 hash 的映射维护在 `pluginOwnedBusinessData` 表中（天然支持 isLatest）。"更新" = 写入新的 hash blob + 更新映射 → 旧 blob 保留，天然不可变。

2. **映射表走既有 DAL 模式**: 文件映射使用 `pluginOwnedBusinessData` 的 append-only/isLatest 模式，写入 = insert 新行 + 清旧行 isLatest，与系统既有数据写入路径完全对齐。

3. **垃圾回收**: 定期后台任务扫描 `blobs` 目录，删除不再被任何 isLatest 映射行引用的 blob（冷引用在旧版本映射行中仍有效——依靠映射的 isLatest 追溯到旧 blob hash）。

4. **降级方案（如果内容寻址太复杂）**: 覆盖模式 + 文件版本审计在 `fileOperationLog` 中记录每次写入的前后 hash，实现"可追溯但不可恢复"的折中。

**推荐方案 1**（内容寻址）。优点是：防篡改（hash 天然校验）、天然去重（相同内容只存一份）、可追溯（旧版本保留至 GC）、与既有 append-only 模式语义对齐。

**检测信号:**
- 文件被覆盖后：旧版本可从 hash 映射的旧 isLatest 行中恢复
- 同一内容上传两次：只产生一个 blob 文件，但两条映射记录
- 文件内容校验：`sha256(blob) === filename` 始终成立

**处理阶段:**
Phase 80（system.file 核心实现）— 存储策略必须在实现之初就确定。如果先实现覆盖模式再迁移到内容寻址，成本很高（需要扫描+重新 hash 所有已有文件）。

---

### Pitfall 7: system.notification — 通知轰炸与疲劳

**故障表现:**
批改插件在 1 分钟内向教师推送 200 条批改完成通知；作业提醒插件每小时对所有学生推送相同提醒；学生在课堂考试中被非关键通知打断。

**根本原因:**
manifest 声明中和执行层均未强制频率限制。通知被视为"免费"资源，插件开发者有动机最大限度使用通知来保持用户参与。

**在这个系统中的具体风险:**
- 教师在上课期间收到大量批改通知，干扰课堂纪律
- 学生对通知产生"狼来了"效应，忽视所有通知（包括关键截止日期提醒）
- 查询通知列表随通知泛滥而急剧变慢

**预防措施:**

1. **manifest 声明频率上限**: 每个 `system.notification` 声明项包含 `maxPerMinute`（默认 10）和 `maxPerUserPerHour`（默认 5）。install preflight 校验这些值合理。

2. **执行层强制**: 使用 SQLite 直写的滑动窗口计数器（`schoolId + pluginId + notificationType + toString(now)` 粒度），而非内存计数器（多实例不共享）。超过限制的消息被拒绝并记录 `reasonCode: "rate_limited"`。

3. **通知重要性分级**: manifest 声明 `notificationType` + `priority: "urgent" | "normal" | "low"`。urgent（课堂开始、安全告警）：无频率限制但只允许少量类型。normal：适用频率限制。low（"你有新功能可用"）：用户可以全局关闭此类。

4. **课堂静默模式**: 当 `classroomSessions.status === "active"` 且用户是参与者时，low priority 通知自动推迟到课堂结束后投递。

5. **用户偏好中心**: `/settings/notifications` 页面允许按插件和通知类型细粒度控制。

**检测信号:**
- 测试：单插件在 1 秒内尝试发送 100 条同类型通知 → 超过频率上限的消息被拒绝
- 测试：向课堂活跃中的学生发送 low priority 通知 → 被入队列延迟而非立即投递
- 审计日志中 `reasonCode: "rate_limited"` 记录

**处理阶段:**
Phase 81（system.notification 实现）— 频率限制是写入路径的第一道防线（在治理门和 manifest 白名单之后）。

---

### Pitfall 8: system.notification — 跨学校隐私泄漏

**故障表现:**
通知系统通过以下路径泄漏学校 A 的数据到学校 B：
- 插件在通知 payload 中包含学校 A 的学生姓名/成绩，但 `schoolId` 校验不完整 → 通知被发送到学校 B 的用户
- 通知模板中的 `{studentName}` 来自插件数据查询，但查询未正确限定 `schoolId` → 返回了其他学校的数据
- 插件直接指定 `recipientUserId` 而不是通过系统查找 → 指定了其他学校的用户

**根本原因:**
`schoolId` 的派生和隔离不是在通知系统的每个节点都被强制执行。与 v4.3 建立的"schoolId 从 session 派生，绝不从 payload 读取"的安全不变式可能存在细微断裂。

**在这个系统中的具体风险:**
- 严重 GDPR/教育数据法规违规
- `recipientUserId` 是全局唯一的（跨所有学校），如果通知投递时不验证 userId 所属的 schoolId，插件可跨校投递
- 通知 payload 中的 `{studentName}` 等字段如果来自 `pluginOwned*` 表的查询，查询不带 `schoolId` scope 就可能返回其他学校的数据
- 两个学校安装了同一个插件 → 插件的通知配置可能混淆

**预防措施:**

1. **通知写入强制 schoolId 注入**: 与 v4.3 `dispatchSystemCommand` 一致——`schoolId` 从认证 session 派生注入，绝不从插件 payload 读取。

2. **投递时双重校验 schoolId**: `sendNotification` 执行时，验证 `recipientUserId` 所属的 `schoolId` 与通知的 `schoolId` 一致。使用 DAL 查询 `memberships` 表确认。

3. **通知 payload 内容安全**: Zod schema 限制 notification payload 只接受纯文本和数值，禁止嵌套对象和 HTML。不允许插件直接传入已渲染的用户数据——模板变量由服务端解析，在 `schoolId` scope 下查询后替换。

4. **审计记录包含完整上下文**: 每条通知的治理审计记录包含 `{ senderPluginId, schoolId, recipientUserId, notificationType, payloadHash }`。

**检测信号:**
- 学校 A 的插件尝试向学校 B 的用户发送通知 → 被拒绝 + `reasonCode: "cross_school_recipient_blocked"`
- 通知 payload 包含 HTML 标签 → Zod 校验拒绝
- 通知模板变量 `{studentName}` 解析时查询限定在当前 `schoolId`

**处理阶段:**
Phase 81（system.notification 实现）— 投递路径的 schoolId 校验。集成测试必须覆盖跨学校场景。

---

### Pitfall 9: system.notification — 投递保证过度设计

**故障表现:**
为实现"exactly-once"投递语义，引入复杂的 outbox 模式（额外的表、poller、状态机、Redis queue），导致系统复杂性大幅增加。而在 SQLite 单体架构中，app-internal 通知的投递本身就是原子的（INSERT INTO notifications 要么成功要么失败）。

**根本原因:**
混淆了"app-internal 通知"和"external delivery 通知"（email/SMS/push）的需求差异。Outbox 模式的真正价值在于保证**外部系统**的投递可靠性，而非本地数据库写入。

**在这个系统中的具体风险:**
- 引入 BullMQ outbox → 需要可靠的 Redis 连接 → 当前系统支持 local_only transport mode
- Outbox poller 的故障模式（死循环、重复投递、消息积压）需要额外的运维面
- "exactly-once" 在分布式系统中是幻觉——退化为 at-least-once + 去重

**预防措施:**

1. **明确定义投递语义为 "best-effort, database-native"**: 应用内通知 = 在 `notifications` 表中 INSERT 一行。SQLite 单实例下 INSERT 是原子操作——要么成功，要么失败。不存在"部分投递"。

2. **去重靠 database unique constraint**: 使用 `(senderPluginId, recipientUserId, idempotencyKey)` 的 unique constraint 自动去重。插件需要在调用时提供 `idempotencyKey`（如 `homework_graded_${submissionId}`），由框架保证同一 key 只投递一次。

3. **不引入 outbox 模式**: 不给当前 milestone 引入 outbox、Redis queue、Kafka 等基础设施。未来的外部通知（email/push/webhook）可以单独里程碑覆盖。

4. **通知读取 = SELECT 查询**: 用户查看通知就是数据库查询。没有"投递失败"的概念——INSERT 成功就是"已投递"。

**检测信号:**
- 团队讨论引入 Kafka/Redis/BullMQ 用于"简单通知"
- 规范中写入"exactly-once delivery guarantee"
- 通知系统开发周期预估超过 1 个 phase（3-4 天）

**处理阶段:**
Phase 81（system.notification 实现）— 在架构决策记录中明确"best-effort, no outbox"。

---

### Pitfall 10: system.notification — 通知表无限增长

**故障表现:**
没有任何过期/清理策略的通知表随时间无限增长。学校日常运行（每节课、每次批改、每次作业提醒都产生通知），3 个月即可达 50 万+ 行，查询和索引性能持续退化。

**根本原因:**
开发阶段只 INSERT 不 DELETE，未考虑长期数据生命周期。SQLite 的 VACUUM 可以回收空间，但不会自动清理业务数据。

**预防措施:**

1. **通知默认过期**: 每条通知设置 `expiresAt`（默认 `createdAt + 90 days`）。`GET /notifications` 查询默认只返回未过期 + 未 dismissed 的通知。

2. **周期性清理任务**: 通过 v2.3 Async Task Platform 已有的 BullMQ + `asyncTask` 表基础设施，注册每日凌晨清理 job：`DELETE FROM notifications WHERE expiresAt < datetime('now')`。

3. **用户 dismissed 标记**: 使用 `dismissedAt` 时间戳而非物理删除——通知不出现在列表中但审计记录永久保留。

4. **分页 + 严格 limit**: API `GET /notifications` 使用 cursor-based 分页，默认 limit=50，最大 limit=200。

5. **过期通知保留期**: 过期的通知在 30 天后才被物理删除（给用户一个宽限期可以在"已过期"视图中查看）。

**检测信号:**
- 通知表在插入测试数据 100 万行后，`GET /notifications?limit=50` 延迟 < 100ms
- `expiresAt` 字段在 schema migration 中存在
- 清理 job 注册在 `asyncTask` 表中，有 `featureArea: "notifications"` 

**处理阶段:**
Phase 81（system.notification 实现）— schema 设计时包含 `expiresAt`。Phase 82（集成与 close gate）实现清理 job。

---

### Pitfall 11: 两个新命令未复用既有的 dispatchSystemCommand facade / 治理门

**故障表现:**
为 `system.file.*` 和 `system.notification.*` 单独实现一套授权逻辑，绕过 v4.3 已建立的 `dispatchSystemCommand` facade 和 `assertActionExecutable` 治理门。导致 lifecycle/kill-switch 检查分叉、审计格式不统一、未来变更需多处同步。

**根本原因:**
开发者可能认为文件操作和通知是"不同的东西"，不适合走统一的治理路径。但实际上 v4.3 的 `assertActionExecutable` 的 `verb` 参数已泛化为 `string`，可以接受任何 commandType。`dispatchSystemCommand` 的判别分支结构天然可扩展。

**在这个系统中的具体风险:**
- 新增的 `system.file.upload` 走独立 Server Action 而非 Command Bus → governance audit 绕过
- lifecycle state machine 新增 `failed` 状态 → 只更新了 `assertActionExecutable` 那一边 → 新命令的独立授权逻辑出现行为分歧
- 操作者 dashboard 需要合并两个治理审计来源 → 增加复杂度

**预防措施:**

1. **统一入口——所有 system.* 命令都经过同一 facade**: `system.file.upload/download/delete/list/move/copy/metadata` 和 `system.notification.send` 都通过扩展 `dispatchSystemCommand` 的判别分支实现。

2. **扩展式注册**: 在 `platformCommandRegistry` 中新增 command types（`system.file.upload` 等），保持与 `system.http.request` 和 `system.config.set` 同级的注册结构。

3. **复用审计写入器**: `writeSystemCommandAudit` 的 `commandType` 参数扩展 union type，新增 `system.file.*` 和 `system.notification.send` 变体。

4. **拒因码统一管理**: 新增的拒因码（`path_denied`、`file_type_denied`、`quota_exceeded`、`cross_school_recipient_blocked`、`rate_limited` 等）统一注册在 system-commands feature 中，与 v4.3 的拒因码（`not_allowlisted`、`domain_not_allowed`、`private_ip_blocked` 等）处于同一命名空间。

**检测信号:**
- 新命令的 Server Action 直接操作文件系统而未调用 `assertActionExecutable`
- 新命令有独立的 `write*Audit` 函数而未复用 `writeSystemCommandAudit`
- 新命令的 `reasonCode` 值未出现在 `dispatchSystemCommand` 的文档/类型定义中

**处理阶段:**
Phase 80 和 81 — 在架构设计中就明确"统一 facade 扩展"策略，而不是每个命令独立实现审批。

---

## 技术债务模式

| 捷径 | 即时收益 | 长期成本 | 何时可接受 |
|------|---------|---------|-----------|
| system.file 文件内容放入 Command Bus payload | 快速打通调用链 | 性能严重退化、重构成本高（需迁移所有已有文件记录） | NEVER |
| 跳过文件类型 magic bytes 校验 | 节省 0.5 天 | XSS 风险、安全审计不通过 | NEVER |
| 文件路径硬编码（`/data/{schoolId}/{pluginKey}/`）而非 hash 存储 | 调试方便 | 同名覆盖无法追溯、去重不可能、路径信息泄漏 | NEVER |
| 通知系统不做过期清理 | 节省 0.5 天 | 性能退化、存储膨胀 | 仅 MVP 前 30 天 |
| 通知发送不验证 userId↔schoolId 关系 | 简化查询（信任插件传入的 userId） | 跨校隐私泄漏风险 | NEVER |
| system.file 不走 governance gate | 节省 1 天集成 | 治理一致性破裂、kill-switch 对文件操作无效 | NEVER |
| 覆盖模式文件存储（无版本追溯） | 简化实现 | 文件历史丢失、恶意覆盖不可恢复 | 仅 PoC 阶段（但本 milestone 不是 PoC） |

## 集成要点

| 集成点 | 常见错误 | 正确做法 |
|--------|---------|---------|
| system.file 写入与配额检查 | 配额检查和写入不在同一临界区 | 使用 per-plugin 的互斥锁或 SQLite 事务包裹"检查→写入→更新计数" |
| system.file 下载与认证 | API Route 直接返回文件不检查权限 | 先验证 session → 衍生 schoolId → 验证文件属于该 school+plugin → 再流式返回 |
| system.notification 与 manifest | 通知类型在 manifest 中无声明，插件可运行时自由发送任何类型 | 新增 `system.notification` 的 manifest declaration shape，包含 `notificationTypes` 列表 + `maxPerMinute` + `maxPerUserPerHour` |
| system.notification 与用户角色 | 向学生推送仅教师可见的管理通知 | 发送时验证 `recipientUserId` 的角色是否与通知类型的 `targetRole` 匹配 |
| system.file 与既有 Command Bus | 文件操作绕过 Command Bus 直接写数据库 | `system.file.*` 操作统一注册在 `platformCommandRegistry`，走 `dispatchSystemCommand` 入口 |
| system.notification 与课堂 session | 不检查用户是否在活跃课堂中 | 课堂进行中时，low/normal 优先级通知延迟到 `classroomSessions.status !== "active"` 后投递 |

## 性能陷阱

| 陷阱 | 症状 | 预防 | 失效阈值 |
|------|------|------|---------|
| 大文件上传阻塞事件循环 | 上传 > 1MB 文件时 API 响应变慢 | 使用流式写入（`fs.createWriteStream`），不将整个文件读入内存；上传通过 `AbortSignal` 超时控制 | 单文件 > 500KB |
| 通知表全表扫描 | `/notifications` 页面加载 > 1s | 复合索引 `(recipientUserId, dismissedAt, createdAt DESC)` + 按 `expiresAt` 过滤 | > 10 万行 |
| 内容寻址存储的文件碎片化 | 磁盘空间超出预期 | 定期 GC job 清理无引用 blob；单插件 blob 数上限 10000 | > 50000 blob/插件 |
| 并发文件写入无锁导致配额漂移 | 配额计数与实际磁盘使用量失配 | per-plugin mutex 或 SQLite 事务串行化 | 并发 > 10 请求/插件 |
| 通知发送逐条 INSERT（非 batch）| 单个事件产生 40 条通知（向全班学生）耗时 > 2s | 使用 Drizzle `db.insert().values([...])` batch insert | 单次发送 > 10 个收件人 |

## 安全错误

| 错误 | 风险 | 预防 |
|------|------|------|
| 仅文件扩展名作为类型判断 | 恶意文件伪装 | Magic bytes + MIME type 白名单双层校验 |
| 接受来自插件的绝对路径（`/etc/passwd`） | 任意文件读写 | Zod schema 拒绝以 `/` 开头或包含 `..` 的路径 |
| 通知 payload 包含 HTML 或可执行内容 | 存储型 XSS | Zod schema 限制 payload 为纯文本字符串 + 少量结构化字段 |
| manifest 不限制单文件大小 | DoS | 必须声明 `maxFileSize`（≤ 10MB），install preflight 校验 |
| 不做 schoolId → userId 的双向验证 | 跨校数据泄漏 | 发送/投递通知时，查询 `memberships` 验证关系 |
| 下载路径返回文件的绝对路径而非流 | 路径信息泄漏、SSRF | 下载使用 `Response` + `ReadableStream`，不暴露文件系统路径 |

## UX 陷阱

| 陷阱 | 用户影响 | 更好方案 |
|------|---------|---------|
| 通知不分类型全部推送 | 学生收到教师的配置管理通知 | 按 `targetRole` 过滤：仅向目标角色推送 |
| 文件上传失败只显示 "上传失败" | 教师不知道问题在哪（文件太大？格式不对？） | 返回具体拒因：`quota_exceeded` / `file_type_denied` / `file_too_large` |
| 通知标记已读后消失 | 用户想回顾之前的通知 | 提供"全部" / "未读"切换，已读通知视觉淡化但不消失 |
| 下载大文件无进度指示 | 用户以为浏览器卡死 | 返回 `Content-Length` header，让浏览器显示原生进度条 |
| 删除文件无确认 | 误删重要课件素材 | `system.file.delete` 支持 `confirmToken`（类似 plugin.uninstall 的确认 token 模式） |

## "看起来完成但并未"清单

- [ ] **system.file 路径校验**: 经常只做 `startsWith` 检查而漏掉 URL 编码攻击 — 验证测试覆盖 `%2e%2e%2f`、`..%2F`、null byte 等编码变体
- [ ] **system.file 配额**: 经常只检查不锁 — 验证并发上传测试中有且仅有配额允许数量的文件成功写入
- [ ] **system.file 二进制分离**: 经常在开发早期为了方便把 Buffer 放入 payload — 验证 `platformCommands.payloadJson` 和 `governanceAudits.payloadJson` 中无任何 Buffer/二进制引用
- [ ] **system.file 类型校验**: 经常只信任扩展名 — 验证 `.html` 伪装为 `.png` 被拒绝 + `.svg` 被拒绝
- [ ] **system.file TOCTOU**: 经常缺失并发写入竞态测试 — 验证 symlink 替换 + 配额绕过场景
- [ ] **system.notification 频率限制**: 经常只做声明不做执行层强制 — 验证滑动窗口计数器在并发推送下正确拒绝超额通知
- [ ] **system.notification schoolId 隔离**: 经常忘记在投递端再次校验 — 验证跨学校发送通知返回 `cross_school_recipient_blocked`
- [ ] **system.notification 过期**: 经常在 schema 设计时忘记 `expiresAt` — 验证 migration 包含该字段 + 默认 90 天
- [ ] **治理门复用**: 经常为"感觉不同"的文件/通知操作单独写授权 — 验证所有新操作都经过 `assertActionExecutable` 和 `dispatchSystemCommand` 入口
- [ ] **通知表索引**: 经常缺少复合索引导致查询变慢 — 验证 `EXPLAIN QUERY PLAN` 显示索引扫描而非全表扫描

## 恢复策略

| 陷阱 | 恢复成本 | 恢复步骤 |
|------|---------|---------|
| 路径穿越已发生 | HIGH | 1) 审计所有 system.file 操作日志；2) 轮换所有密钥和凭据；3) 检查是否有文件被覆盖；4) 修补校验逻辑 |
| 配额耗尽导致数据库不可写 | HIGH | 1) 手动删除超配额插件的文件；2) 临时禁用该插件（kill-switch）；3) 增加配额锁 |
| 跨校通知泄漏 | HIGH | 1) 审计 `notifications` 表找出受影响记录；2) 通知受影响学校；3) 修补 schoolId 校验 |
| 文件内容放入了 Command Bus | HIGH | 1) 迁移 `payloadJson` 中的大字段到文件存储；2) 清理 `platformCommands` 表；3) 重构相应 handler |
| 通知表无过期机制（已上线 6 个月） | MEDIUM | 1) 添加 `expiresAt` migration（存量数据设 `now + 90 days`）；2) 增量清理（每次查询时删除一批过期记录） |
| 治理门未复用（已上线） | MEDIUM | 1) 重构新命令的授权逻辑统一到 facade；2) 在 integration test 中验证 lifecycle/kill-switch 一致性 |

## 陷阱-阶段映射

| 陷阱 | 预防阶段 | 验证方式 |
|------|---------|---------|
| #1 路径穿越 | Phase 80 (system.file 核心) | 单元测试覆盖所有编码变体的路径穿越攻击 |
| #2 TOCTOU 竞态 | Phase 80 (system.file 核心) | 并发集成测试 + symlink 替换测试 |
| #3 配额耗尽 | Phase 80 (system.file 核心) | 并发配额绕过测试 + inode 耗尽测试 |
| #4 二进制/JSON 编码 | Phase 80 (system.file 核心) | 架构 review 确认无 Buffer 进入 JSON 列 + 性能基准 |
| #5 文件类型校验 | Phase 80 (system.file 核心) | 恶意文件伪装测试（magic bytes vs extension mismatch） |
| #6 append-only 冲突 | Phase 80 (system.file 核心) | 设计 review：存储策略选型决策 |
| #7 通知轰炸 | Phase 81 (system.notification) | 频率限制压力测试 |
| #8 跨校隐私泄漏 | Phase 81 (system.notification) | 跨校投递集成测试 |
| #9 投递保证过度设计 | Phase 81 (system.notification) | 架构 review 确认 "best-effort, no outbox" 决策已记录 |
| #10 通知无限增长 | Phase 81 (system.notification) | Schema check：`expiresAt` 字段存在 + 索引正确 |
| #11 治理门未复用 | Phase 80 + 81 (架构设计) | Code review 确认所有新操作经过统一 facade |

## 数据来源

- Node.js Permission Model 稳定化讨论（PR #56201）— TOCTOU 不可完全解决: https://github.com/nodejs/node/pull/56201
- CVE-2025-67124 — miniserve TOCTOU + symlink race 现实案例: https://nvd.nist.gov/vuln/detail/CVE-2025-67124
- CVE-2024-21891 — Node.js Permission Model 路径穿越绕过: https://cve.mitre.org/cgi-bin/cvename.cgi?name=2024-21891
- CVE-2025-23084 — Node.js path.join Windows 盘符穿越: https://feedly.com/cve/CVE-2025-23084
- h3 serveStatic 安全公告 — 百分号编码路径穿越: https://github.com/h3js/h3/security/advisories/GHSA-wr4h-v87w-p3r7
- Node.js Design Patterns Blog: "Path Traversal Prevention": https://nodejsdesignpatterns.com/blog/nodejs-path-traversal-security/
- TOCTOU 学术共识综述 — Dean & Hu (2004): https://www.cs.utexas.edu/~shmat/courses/cs380s_fall09/06tocttou-porter.pdf
- CVE-2025-32959 — CUBA Platform 无限制文件上传 DoS: https://avd.aquasec.com/nvd/2025/cve-2025-32959
- CWE-774 — File Descriptor Exhaustion: https://www.plexicus.ai/cwe/cwe-774-allocation-of-file-descriptors-or-handles-without-limits-or/
- WordPress Plugin Update 配额耗尽（Ticket #33571）: https://core.trac.wordpress.org/ticket/33571
- GitLab Notifications ADR-001 — 通知数据库 schema 设计: https://handbook.gitlab.com/handbook/engineering/architecture/design-documents/notifications/adr/001_database_schema/
- Dependency Track Notification Outbox ADR: https://dependencytrack.github.io/hyades/latest/architecture/decisions/011-notification-outbox/
- Appcues: "In-app notifications best practices": https://www.appcues.com/blog/in-app-notifications
- Texas State University Mobile App Communication Guidelines: https://www.mobile.txst.edu/features/communication.html
- OneSignal: "Notification Center & Engagement Strategy": https://onesignal.com/blog/what-your-notification-center-says-about-your-engagement-strategy/
- AnnounceKit: "In-App Messaging Best Practices 2026": https://announcekit.app/guides/in-app-messaging-best-practices
- OpenLearn-Next 现有代码库:
  - `dispatchSystemCommand` facade: `src/features/system-commands/facade.ts`
  - `assertActionExecutable` governance gate: `src/features/platform-core/plugin-data-access/governance-gate.ts`
  - `writeSystemCommandAudit`: `src/features/system-commands/audit.ts`
  - SSRF 防护层: `src/features/system-commands/ssrf-guard.ts`
  - `SystemCommandDiscriminatedSchema`: `src/lib/dto/resource-ai.ts` L845
  - `platformCommandRegistry`: `src/features/platform-core/commands/registry.ts`
  - `platformCommands` schema: `src/db/schema.ts` L370
  - `governanceAudits` schema: `src/db/schema.ts` L1325
  - `pluginOwnedBusinessData` schema (KV 存储复用目标): `src/db/schema.ts`
  - `asyncTasks` schema (清理 job 复用): `src/db/schema.ts` L258

---

*陷阱研究: system.file + system.notification*
*研究日期: 2026-06-13*
*项目: OpenLearn Next v4.4*
