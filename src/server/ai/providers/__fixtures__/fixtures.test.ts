import { describe, expect, it, vi } from "vitest";

// 防止未来夹具引入 server-only 传递依赖时测试环境报错。
vi.mock("server-only", () => ({}));

import {
  makeApiCallError,
  makeOkObjectModel,
  makeOkTextModel,
  makeThrowingModel,
} from "./mock-model";
import { makeMockRedis } from "./mock-redis";

const noopCall = {} as never;

describe("mock-model 夹具", () => {
  it("makeOkTextModel().doGenerate 返回含 text 的 content", async () => {
    const model = makeOkTextModel("你好");
    const result = await model.doGenerate(noopCall);
    expect(result.finishReason.unified).toBe("stop");
    expect(result.content).toEqual([{ type: "text", text: "你好" }]);
  });

  it("makeOkObjectModel().doGenerate 返回可解析的 JSON 文本", async () => {
    const model = makeOkObjectModel({ ok: true, n: 1 });
    const result = await model.doGenerate(noopCall);
    const textPart = result.content.find((c) => c.type === "text");
    expect(textPart).toBeDefined();
    expect(JSON.parse((textPart as { text: string }).text)).toEqual({
      ok: true,
      n: 1,
    });
  });

  it("makeThrowingModel().doGenerate 抛出注入的错误", async () => {
    const boom = new Error("boom");
    const model = makeThrowingModel(boom);
    await expect(model.doGenerate(noopCall)).rejects.toBe(boom);
  });

  it("makeApiCallError 设置 statusCode 与 retry-after", () => {
    const err = makeApiCallError({ status: 429, retryAfter: "3" });
    expect(err.statusCode).toBe(429);
    expect(err.isRetryable).toBe(true);
    expect(err.responseHeaders?.["retry-after"]).toBe("3");
  });
});

describe("mock-redis 夹具", () => {
  it("eval 对同一 key 自增并返回固定 ttl", async () => {
    const redis = makeMockRedis({ ttl: 42 });
    await expect(redis.eval("lua", 1, "rl:teacher:1", 60)).resolves.toEqual([
      1, 42,
    ]);
    await expect(redis.eval("lua", 1, "rl:teacher:1", 60)).resolves.toEqual([
      2, 42,
    ]);
  });

  it("ttl 未指定时回退到 eval 入参 windowSec", async () => {
    const redis = makeMockRedis();
    await expect(redis.eval("lua", 1, "rl:global", 60)).resolves.toEqual([
      1, 60,
    ]);
  });

  it("failConnect 时 connect() reject，quit() 始终 resolve", async () => {
    const redis = makeMockRedis({ failConnect: true });
    await expect(redis.connect()).rejects.toThrow(/connection refused/);
    await expect(redis.quit()).resolves.toBe("OK");
  });
});
