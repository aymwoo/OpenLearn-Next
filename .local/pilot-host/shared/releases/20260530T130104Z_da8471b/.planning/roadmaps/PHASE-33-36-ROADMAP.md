# Phase 33-36 详细规划：WebSocket + Redis + 沙箱隔离

## 技术选型确认

| 组件 | 技术 | 原因 |
|------|------|------|
| WebSocket | `ws` | 轻量级、高性能、广泛使用 |
| Redis Client | `ioredis` | 功能完整、支持集群、连接池 |
| JS 沙箱 | `isolated-vm` | V8 isolate 级别隔离，优于 iframe |
| Python 沙箱 | `Pyodide` | WebAssembly 浏览器内运行 |
| 消息协议 | JSON over WebSocket | 与现有 SSE 协议兼容 |

---

## Phase 33: WebSocket 实时传输层

### 33-01: WebSocket 基础设施

**新增文件**：
```
src/features/runtime-platform/seams/transport/
├── websocket-adapter.ts    # WebSocket 传输适配器
├── ws-connection-manager.ts # 连接生命周期管理
├── ws-message-envelope.ts   # 双向消息信封
├── ws-auth-handshake.ts     # 握手认证
└── adapter-gateway.ts      # 自动选择传输层
```

**核心实现**：

```typescript
// ws-message-envelope.ts
export const WSMessageKindSchema = z.enum([
  "runtime.event",           // 运行时事件（服务端 → 客户端）
  "runtime.command",         // 运行时命令（客户端 → 服务端）
  "classroom.snapshot",      // 课堂快照同步
  "teacher.control",         // 教师控制命令
  "keepalive.pong",          // 保活响应
  "error",                   // 错误消息
]);

export const WSMessageEnvelopeSchema = z.object({
  id: z.string().uuid(),
  kind: WSMessageKindSchema,
  sessionId: z.string().min(1),
  timestamp: z.string().datetime(),
  payload: z.record(z.string(), z.unknown()),
  correlationId: z.string().optional(),
});
```

**ws-connection-manager.ts**：
- 连接池管理（按 sessionId 索引）
- 心跳检测（30s 超时）
- 自动重连（指数退避）
- 连接数限制（per-school）

**ws-auth-handshake.ts**：
```typescript
// 握手协议
// 1. 客户端: ws://host/api/ws/classroom/{sessionId}
// 2. 服务端验证 cookie 中的 session
// 3. 握手成功返回 { ok: true, transportMode: "websocket", lease: 3600 }
// 4. lease 过期前 5 分钟续约
```

**adapter-gateway.ts**：
```typescript
// 自动选择最佳传输层
function resolveTransportAdapter(sessionId: string): RuntimeTransportAdapter {
  // 1. 检查客户端 WebSocket 支持
  // 2. 检查服务端 WebSocket 可用性
  // 3. 返回 websocket 或降级到 sse
}
```

### 33-02: 双向消息流

**服务端 → 客户端**：
```typescript
// 事件消息
{
  id: "uuid",
  kind: "runtime.event",
  sessionId: "classroom-123",
  timestamp: "2026-05-17T10:00:00Z",
  payload: {
    type: "runtime.ready",
    runtimeSessionId: "runtime-456",
    // ...事件数据
  }
}
```

**客户端 → 服务端**：
```typescript
// 命令消息
{
  id: "uuid",
  kind: "runtime.command",
  sessionId: "classroom-123",
  timestamp: "2026-05-17T10:00:00Z",
  payload: {
    action: "runtime-interaction",
    runtimeSessionId: "runtime-456",
    // ...命令数据
  }
}
```

### 33-03: API 路由

**新增**：
```
src/app/api/ws/classroom/[sessionId]/route.ts  # WebSocket 升级端点
```

**现有 SSE 端点保持兼容**：
```
src/app/api/classroom/[sessionId]/events/route.ts  # 降级选项
```

### 33-04: 性能指标

| 指标 | 目标 |
|------|------|
| 消息延迟 P99 | < 100ms |
| 并发连接数 | 10,000/school |
| 消息吞吐量 | 1,000 msg/s |
| 断线重连时间 | < 3s |

---

## Phase 34: 插件热加载与沙箱隔离

### 34-01: isolated-vm 集成

**新增文件**：
```
src/features/runtime-platform/plugins/sandbox/
├── isolate-sandbox.ts       # V8 Isolate 沙箱
├── v8-context-manager.ts    # V8 上下文管理
├── sandbox-factory.ts       # 沙箱工厂
└── capability-enforcer.ts   # 沙箱能力限制
```

**isolated-vm 核心配置**：
```typescript
import * as ivm from 'isolated-vm';

export class IsolateSandbox {
  private isolate: ivm.Isolate;
  private context: ivm.Context;

  constructor(timeout: number = 5000, memoryLimit: number = 128) {
    this.isolate = new ivm.Isolate({ memoryLimit }); // MB
    this.context = this.isolate.createContext();
  }

  // 执行插件代码
  async execute(code: string, capabilities: string[]): Promise<unknown> {
    const script = await this.isolate.compileScript(code);

    // 设置能力限制
    const allowedModules = this.resolveAllowedModules(capabilities);

    // 在隔离环境中执行
    const result = await script.runContext(this.context, {
      timeout,
      memoryLimit,
    });

    return result;
  }

  // 清理资源
  dispose(): void {
    this.context.release();
    this.isolate.dispose();
  }
}
```

**能力映射**：
```typescript
// 沙箱能力 → 可用模块
const SANDBOX_CAPABILITY_MODULES = {
  'sandbox:http': ['fetch'],
  'sandbox:storage': ['localStorage', 'sessionStorage'],
  'sandbox:ai': ['@ai/sdk'],
  'sandbox:math': ['mathjs'],
  // ...
};
```

### 34-02: Pyodide Python 沙箱

**新增文件**：
```
src/features/runtime-platform/plugins/sandbox/
├── pyodide-sandbox.ts       # Pyodide 沙箱
├── python-runtime.ts        # Python 运行时包装
└── pyodide-bridge.ts        # Pyodide ↔ JS 桥接
```

**Pyodide 集成**：
```typescript
// pyodide-sandbox.ts
export class PyodideSandbox {
  private pyodide: PyodideInterface | null = null;
  private isLoading = false;

  async initialize(): Promise<void> {
    if (this.pyodide) return;

    this.isLoading = true;
    try {
      // 加载 Pyodide (WebAssembly)
      this.pyodide = await loadPyodide({
        indexURL: "/cdn/pyodide/", // 或内联
      });
    } finally {
      this.isLoading = false;
    }
  }

  async execute(
    code: string,
    capabilities: string[],
    timeout: number = 10000
  ): Promise<unknown> {
    if (!this.pyodide) {
      await this.initialize();
    }

    // 设置 Python 路径和可用模块
    this.setupPythonEnvironment(capabilities);

    // 执行代码（带超时）
    const result = await this.runWithTimeout(
      this.pyodide.runPythonAsync(code),
      timeout
    );

    return result;
  }

  private setupPythonEnvironment(capabilities: string[]): void {
    // 根据能力加载对应的 Python 包
    if (capabilities.includes('sandbox:math')) {
      this.pyodide!.runPython(`
        import math
        import random
      `);
    }
    // ...
  }
}
```

**Bridge 实现**：
```typescript
// pyodide-bridge.ts
// JS → Python 调用桥接

export function createPyodideBridge(sandbox: PyodideSandbox) {
  return {
    // JS 调用 Python 函数
    callFunction: async (name: string, args: unknown[]) => {
      return sandbox.execute(`
        result = ${name}(${args.map(serialize).join(',')})
        print(serialize_json(result))
      `);
    },

    // Python 注册回调到 JS
    registerCallback: (name: string, fn: Function) => {
      // 通过 pyodide.ffi 创建回调
    },
  };
}
```

### 34-03: 插件生命周期与热加载

**新增文件**：
```
src/features/runtime-platform/plugins/
├── loader/
│   ├── plugin-loader.ts       # 动态加载器
│   ├── manifest-resolver.ts   # manifest 解析
│   ├── code-loader.ts         # 代码获取（本地/远程）
│   └── dependency-resolver.ts # 依赖解析
├── lifecycle/
│   ├── lifecycle-manager.ts   # 状态机
│   ├── state-transitions.ts   # 状态转换定义
│   └── transition-auditor.ts # 转换审计
└── registry/
    ├── plugin-registry.ts     # 插件注册表
    ├── capability-registry.ts # 能力注册表
    └── version-manager.ts     # 版本管理
```

**状态机**：
```
┌───────────┐   install   ┌───────────┐
│           │────────────▶│ installed │
│           │             └─────┬─────┘
│           │                   │ enable
│           │◀──────────────────┘
│           │   disable
│           │
│           │   mount      ┌───────────┐
│           │─────────────▶│  mounted  │─────────────▶┌────────┐
│           │              └─────┬─────┘              │ ready  │
│           │                    │                    └────┬───┘
│           │◀──────────────────┘                           │
│           │   unmount                                     │
│           │                                               │
│           │   suspend      ┌───────────┐                 │
│           │──────────────▶│ suspended │◀────────────────┘
│           │               └───────────┘      resume
│           │
│           │   fail      ┌───────────┐
│           └─────────────▶│  failed  │
└───────────┘              └───────────┘

所有转换通过 auditLog 记录
```

**热加载流程**：
```typescript
// plugin-loader.ts
export async function loadPlugin(pluginId: string): Promise<LoadedPlugin> {
  const manifest = await resolveManifest(pluginId);

  // 确定沙箱类型
  const sandbox = manifest.runtime.type === 'python'
    ? createPyodideSandbox()
    : createIsolateSandbox();

  // 加载代码
  const code = await loadPluginCode(manifest);

  // 实例化
  const instance = await sandbox.execute(code, manifest.capabilities);

  // 注册到生命周期管理器
  return registerPluginInstance(pluginId, instance, sandbox);
}
```

### 34-04: 安全策略

**新增文件**：
```
src/features/runtime-platform/plugins/security/
├── sandbox-policy-engine.ts  # 策略引擎
├── resource-limits.ts        # 资源限制
├── network-guard.ts          # 网络访问控制
└── audit-logger.ts           # 安全审计
```

**资源限制**：
```typescript
// resource-limits.ts
export const PLUGIN_RESOURCE_LIMITS = {
  javascript: {
    maxMemoryMB: 128,
    maxExecutionTimeMs: 5000,
    maxCpuTimeMs: 1000,
    maxConnections: 10,
    allowedModules: ['fetch', 'crypto'],
    disallowedGlobals: ['eval', 'Function'],
  },
  python: {
    maxMemoryMB: 256,
    maxExecutionTimeMs: 10000,
    maxCpuTimeMs: 5000,
    allowedPackages: ['math', 'random', 'json', 're'],
    disallowedModules: ['os', 'sys', 'subprocess'],
  },
} as const;

// 每学校配额
export const SCHOOL_PLUGIN_QUOTAS = {
  maxPluginsPerSchool: 50,
  maxConcurrentPlugins: 10,
  maxTotalMemoryMB: 1024,
};
```

---

## Phase 35: Redis 事件总线与集群支持

### 35-01: ioredis 适配器

**新增文件**：
```
src/features/runtime-platform/seams/event-bus/
├── adapters/
│   ├── memory-adapter.ts      # 开发/测试用
│   └── redis-adapter.ts       # Redis pub/sub
├── redis/
│   ├── connection-pool.ts     # 连接池管理
│   ├── pub-sub-manager.ts     # 发布订阅管理
│   └── cluster-topology.ts    # 集群拓扑
└── reliability/
    ├── retry-queue.ts         # 重试队列
    ├── dead-letter-queue.ts   # 死信队列
    └── circuit-breaker.ts     # 熔断器
```

**ioredis 配置**：
```typescript
// connection-pool.ts
import Redis from 'ioredis';

export const createRedisClient = (options?: Redis.RedisOptions) => {
  const client = new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB ?? '0'),
    keyPrefix: 'openlearn:',

    // 连接池配置
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    connectTimeout: 10000,

    // 懒连接
    lazyConnect: true,
  });

  // 事件处理
  client.on('error', (err) => {
    console.error('[Redis] connection error:', err);
    metrics.increment('redis.connection.error');
  });

  client.on('reconnecting', () => {
    console.warn('[Redis] reconnecting...');
    metrics.increment('redis.connection.reconnecting');
  });

  return client;
};

// 集群模式
export const createRedisCluster = () => {
  return new Redis.Cluster(
    process.env.REDIS_NODES!.split(','),
    {
      // 集群配置
      scaleReads: 'slave',
      maxRedirections: 3,
    }
  );
};
```

### 35-02: Pub/Sub 实现

**redis-adapter.ts**：
```typescript
// pub-sub-manager.ts
export class RedisPubSubAdapter implements RuntimeEventBusAdapter {
  private publisher: Redis;
  private subscribers: Map<string, Redis>;

  constructor() {
    this.publisher = createRedisClient();
    this.subscribers = new Map();
  }

  // 发布事件
  async publish(topic: string, event: RuntimeEvent): Promise<void> {
    const channel = `openlearn:events:${topic}`;
    const message = JSON.stringify({
      id: crypto.randomUUID(),
      topic,
      event,
      timestamp: Date.now(),
    });

    await this.publisher.publish(channel, message);

    // 记录指标
    metrics.gauge('redis.events.published', 1, { topic });
  }

  // 订阅事件
  async subscribe(
    topic: string,
    handler: (event: RuntimeEvent) => Promise<void>
  ): Promise<Unsubscribe> {
    const subscriber = createRedisClient();
    const channel = `openlearn:events:${topic}`;

    await subscriber.subscribe(channel);

    subscriber.on('message', async (ch, message) => {
      if (ch !== channel) return;

      try {
        const parsed = JSON.parse(message);
        await handler(parsed.event);
      } catch (err) {
        console.error('[Redis] message handler error:', err);
        // 重试或放入死信队列
      }
    });

    this.subscribers.set(topic, subscriber);

    return () => {
      subscriber.unsubscribe(channel);
      subscriber.quit();
      this.subscribers.delete(topic);
    };
  }

  // 集群模式支持
  async subscribeWithCluster(
    topic: string,
    handler: (event: RuntimeEvent) => Promise<void>
  ): Promise<Unsubscribe> {
    // 使用 Redis Streams 实现跨节点订阅
    const streamKey = `openlearn:streams:${topic}`;

    // 创建消费者组
    await this.publisher.xgroup(
      'CREATE',
      streamKey,
      'consumers',
      'MKSTREAM'
    );

    // 持续消费
    const runConsumer = async () => {
      while (true) {
        const results = await this.publisher.xreadgroup(
          'GROUP', 'consumers', 'consumer-1',
          'COUNT', '10',
          'BLOCK', '5000',
          'STREAMS', streamKey,
          '>'
        );

        for (const [stream, messages] of results) {
          for (const [id, fields] of messages) {
            const event = JSON.parse(fields[1]);
            await handler(event);
            // 确认消息
            await this.publisher.xack(streamKey, 'consumers', id);
          }
        }
      }
    };

    runConsumer().catch(console.error);

    return () => {
      // 清理消费者
    };
  }
}
```

### 35-03: 可靠性机制

**retry-queue.ts**：
```typescript
export class RetryQueue {
  private queue: Map<string, RetryItem[]> = new Map();
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async enqueue(
    topic: string,
    event: RuntimeEvent,
    options: { maxRetries: number; backoff: 'exponential' | 'linear' }
  ): Promise<void> {
    const key = `openlearn:retry:${topic}`;
    const item: RetryItem = {
      id: crypto.randomUUID(),
      event,
      attempts: 0,
      nextRetryAt: Date.now(),
      maxRetries: options.maxRetries,
      backoff: options.backoff,
    };

    await this.redis.zadd(key, item.nextRetryAt, JSON.stringify(item));
  }

  async process(queueName: string): Promise<void> {
    const key = `openlearn:retry:${queueName}`;
    const now = Date.now();

    // 获取到期的重试项
    const items = await this.redis.zrangebyscore(key, 0, now);

    for (const itemStr of items) {
      const item: RetryItem = JSON.parse(itemStr);

      try {
        await this.publishToBus(item.event);
        // 成功，删除
        await this.redis.zrem(key, itemStr);
      } catch (err) {
        // 失败，记录重试
        item.attempts++;
        item.nextRetryAt = this.calculateNextRetry(item, now);

        if (item.attempts >= item.maxRetries) {
          // 超过最大重试次数，放入死信队列
          await this.moveToDeadLetter(queueName, item);
        } else {
          // 更新重试时间
          await this.redis.zadd(key, item.nextRetryAt, JSON.stringify(item));
        }
      }
    }
  }
}
```

**circuit-breaker.ts**：
```typescript
export class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;

  constructor(
    private threshold = 5,
    private timeout = 60000 // 1分钟
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'open';
    }
  }
}
```

### 35-04: 健康检查与监控

```typescript
// health-check.ts
export async function checkRedisHealth(): Promise<HealthResult> {
  const start = Date.now();

  try {
    const pong = await redis.ping();
    const latency = Date.now() - start;

    return {
      status: 'healthy',
      latency,
      mode: redis.isCluster ? 'cluster' : 'standalone',
    };
  } catch (err) {
    return {
      status: 'unhealthy',
      error: err.message,
    };
  }
}

// 监控指标
export const REDIS_METRICS = {
  publishLatency: 'histogram',
  subscribeCount: 'gauge',
  retryQueueSize: 'gauge',
  deadLetterCount: 'gauge',
  circuitBreakerState: 'gauge',
};
```

---

## Phase 36: 运行时沙箱增强

### 36-01: isolated-vm 高级特性

**新增文件**：
```
src/features/runtime-platform/plugins/sandbox/isolate/
├── isolate-pool.ts          # Isolate 池
├── worker-thread.ts         # Worker Thread 集成
└── memory-tracker.ts        # 内存追踪
```

**Isolate 池**：
```typescript
// isolate-pool.ts
export class IsolatePool {
  private pool: Isolate[] = [];
  private borrowed: Set<Isolate> = new Set();
  private maxPoolSize: number;

  constructor(maxSize: number = 10) {
    this.maxPoolSize = maxSize;
    this.prewarm();
  }

  // 预热池
  private async prewarm(): Promise<void> {
    for (let i = 0; i < this.maxPoolSize / 2; i++) {
      this.pool.push(this.createIsolate());
    }
  }

  // 获取 Isolate
  async acquire(timeout: number = 5000): Promise<IsolateHandle> {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const isolate = this.pool.pop();
      if (isolate) {
        this.borrowed.add(isolate);
        return this.wrapIsolate(isolate);
      }

      if (this.pool.length < this.maxPoolSize) {
        const newIsolate = this.createIsolate();
        this.borrowed.add(newIsolate);
        return this.wrapIsolate(newIsolate);
      }

      await this.sleep(100);
    }

    throw new Error('Isolate pool exhausted');
  }

  // 归还 Isolate
  release(isolate: IsolateHandle): void {
    isolate.reset(); // 重置上下文而非销毁
    this.borrowed.delete(isolate.rawIsolate);
    this.pool.push(isolate.rawIsolate);
  }

  // 内存追踪
  getMemoryUsage(): { used: number; total: number } {
    return {
      used: this.pool.reduce((sum, iso) => sum + iso.usedMemory, 0),
      total: this.pool.length * 128, // MB
    };
  }
}
```

**Worker Thread 集成**：
```typescript
// worker-thread.ts
export class WorkerThreadSandbox {
  private worker: Worker;
  private pending = new Map<string, Completer>();

  constructor(scriptPath: string) {
    this.worker = new Worker(scriptPath);
    this.setupMessageHandler();
  }

  async execute(code: string): Promise<unknown> {
    const id = crypto.randomUUID();
    const completer = new Completer();

    this.pending.set(id, completer);
    this.worker.postMessage({ id, code });

    return completer.promise;
  }

  private setupMessageHandler(): void {
    this.worker.on('message', ({ id, result, error }) => {
      const completer = this.pending.get(id);
      if (!completer) return;

      this.pending.delete(id);
      if (error) {
        completer.reject(new Error(error));
      } else {
        completer.resolve(result);
      }
    });
  }
}
```

### 36-02: Pyodide 增强

**Python 包管理**：
```typescript
// python-package-manager.ts
export class PythonPackageManager {
  private loadedPackages = new Map<string, boolean>();

  async ensurePackages(packages: string[]): Promise<void> {
    const toLoad = packages.filter(p => !this.loadedPackages.has(p));

    if (toLoad.length === 0) return;

    // 使用 micropip 加载 PyPI 包
    await this.pyodide.runPythonAsync(`
      import micropip
      await micropip.install(${JSON.stringify(toLoad)})
    `);

    toLoad.forEach(p => this.loadedPackages.set(p, true));
  }

  async loadPrebuiltPackages(): Promise<void> {
    // 加载预编译的科学计算包
    await this.pyodide.loadPackagesFromPyPI(['numpy', 'pandas']);
  }
}
```

### 36-03: 跨沙箱通信

**Sandbox Bridge**：
```typescript
// sandbox-bridge.ts
export interface SandboxBridge {
  // 调用外部能力
  callHost(action: string, payload: unknown): Promise<unknown>;

  // 发送事件到宿主
  emit(event: string, data: unknown): void;

  // 获取配置
  getConfig(key: string): unknown;
}

export class CrossSandboxMessenger {
  private bridges = new Map<string, SandboxBridge>();

  register(sandboxId: string, bridge: SandboxBridge): void {
    this.bridges.set(sandboxId, bridge);
  }

  // 沙箱间通信（通过宿主中转）
  async sendToSandbox(
    fromSandbox: string,
    toSandbox: string,
    message: unknown
  ): Promise<unknown> {
    const fromBridge = this.bridges.get(fromSandbox);
    const toBridge = this.bridges.get(toSandbox);

    if (!fromBridge || !toBridge) {
      throw new Error('Sandbox not found');
    }

    // 通过宿主验证和转发
    return toBridge.callHost('cross-sandbox-message', {
      from: fromSandbox,
      payload: message,
    });
  }
}
```

### 36-04: 沙箱管理器

**sandbox-manager.ts**：
```typescript
export class SandboxManager {
  private sandboxes = new Map<string, SandboxInstance>();
  private quotas: SchoolQuotas;

  async createSandbox(
    pluginId: string,
    options: SandboxOptions
  ): Promise<SandboxInstance> {
    // 检查配额
    this.checkQuota(options.schoolId);

    // 创建沙箱
    const sandbox = options.runtime === 'python'
      ? new PyodideSandbox()
      : new IsolateSandbox();

    await sandbox.initialize(options.config);

    const instance: SandboxInstance = {
      id: crypto.randomUUID(),
      pluginId,
      sandbox,
      state: 'ready',
      createdAt: Date.now(),
      resourceUsage: { memory: 0, cpu: 0 },
    };

    this.sandboxes.set(instance.id, instance);
    return instance;
  }

  async execute(
    sandboxId: string,
    code: string
  ): Promise<ExecutionResult> {
    const instance = this.sandboxes.get(sandboxId);
    if (!instance) {
      throw new Error('Sandbox not found');
    }

    const startMemory = process.memoryUsage().heapUsed;

    try {
      const result = await instance.sandbox.execute(
        code,
        instance.capabilities
      );

      const endMemory = process.memoryUsage().heapUsed;

      // 更新资源使用
      instance.resourceUsage = {
        memory: (endMemory - startMemory) / 1024 / 1024, // MB
        cpu: 0, // 通过 future profiling
      };

      return { ok: true, result };
    } catch (err) {
      // 记录错误
      this.recordExecutionError(sandboxId, err);

      return {
        ok: false,
        error: err.message,
        sandboxState: instance.state,
      };
    }
  }

  async destroy(sandboxId: string): Promise<void> {
    const instance = this.sandboxes.get(sandboxId);
    if (!instance) return;

    instance.sandbox.dispose();
    this.sandboxes.delete(sandboxId);
  }
}
```

---

## Phase 33-36 完整依赖关系

```
Phase 33: WebSocket 传输层
    │
    ├── 33-01 WebSocket 基础设施
    ├── 33-02 双向消息流
    ├── 33-03 API 路由
    └── 33-04 性能测试
    │
    ▼
Phase 34: 插件热加载与沙箱隔离
    │
    ├── 34-01 isolated-vm 集成
    ├── 34-02 Pyodide Python 沙箱
    ├── 34-03 插件生命周期
    ├── 34-04 安全策略
    ├── 34-05 能力协商
    └── 34-06 热加载测试
    │
    ▼
Phase 35: Redis 事件总线
    │
    ├── 35-01 ioredis 适配器
    ├── 35-02 Pub/Sub 实现
    ├── 35-03 可靠性机制
    ├── 35-04 健康检查
    └── 35-05 集群测试
    │
    ▼
Phase 36: 沙箱增强
    │
    ├── 36-01 Isolate 池
    ├── 36-02 Worker Thread
    ├── 36-03 内存追踪
    ├── 36-04 跨沙箱通信
    ├── 36-05 沙箱管理器
    └── 36-06 端到端测试
```

---

## 技术风险与缓解

| Phase | 风险 | 缓解措施 |
|-------|------|----------|
| 33 | WebSocket 连接数上限 | 连接池 + per-school 限制 |
| 33 | 消息顺序保证 | 序列号 + 重排序缓冲区 |
| 34 | isolated-vm 编译问题 | Docker 构建环境预编译 |
| 34 | Pyodide 加载延迟 | 预加载 + CDN 缓存 |
| 34 | Python 包兼容性 | 沙箱化 micropip |
| 35 | Redis 单点故障 | 集群模式 + 自动故障转移 |
| 35 | 消息丢失 | 持久化 + 确认机制 |
| 36 | 内存泄漏 | Isolate 池回收 + 监控 |
| 36 | 跨沙箱攻击 | Capability 严格验证 |

---

## 测试策略

### 单元测试
- 每个 adapter 独立测试
- 沙箱代码执行隔离验证
- 消息信封序列化/反序列化

### 集成测试
- WebSocket ↔ SSE 降级
- Redis Pub/Sub ↔ 内存适配器
- Isolate 池 ↔ 插件加载

### 压力测试
- 1000 并发连接
- 10000 msg/s 吞吐量
- 100 并发插件执行

### 安全测试
- 沙箱逃逸尝试
- Capability 绕过
- 资源耗尽攻击

---

## 成功标准

| Phase | 标准 |
|-------|------|
| 33 | WebSocket 消息延迟 < 100ms，支持降级到 SSE |
| 34 | 插件在 < 2s 内热加载，JS/Python 沙箱隔离运行 |
| 35 | Redis 集群支持，消息不丢失，P99 延迟 < 50ms |
| 36 | Isolate 池自动管理，内存使用可追踪 |

---

## 预估工时

| Phase | 开发 | 测试 | 总计 |
|-------|------|------|------|
| 33 | 2 周 | 0.5 周 | 2.5 周 |
| 34 | 3 周 | 1 周 | 4 周 |
| 35 | 2 周 | 0.5 周 | 2.5 周 |
| 36 | 2 周 | 0.5 周 | 2.5 周 |
| **总计** | **9 周** | **2 周** | **11 周** |

---

## 下一步行动

1. **Phase 33 预研**（本周）
   - 搭建 ws + Next.js WebSocket 集成
   - 设计消息信封协议
   - 验证连接管理方案

2. **Phase 34 预研**（下周三）
   - isolated-vm 编译环境配置
   - Pyodide CDN 部署测试
   - 插件 manifest 设计

3. **基础设施准备**（并行）
   - Redis Cluster 配置（测试环境）
   - 监控告警基础（Prometheus/Grafana）