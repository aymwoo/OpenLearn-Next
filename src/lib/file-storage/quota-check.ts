import { Transform } from "node:stream";

/**
 * 流式配额检查 Transform。
 * 在流的 _transform 中累计字节数，超限时立刻 callback(error) 中断流。
 */
export class QuotaTransform extends Transform {
  private bytesWritten = 0;

  constructor(
    private readonly maxBytes: number,
    private readonly label: string = "file_upload",
  ) {
    super();
  }

  _transform(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null, data?: Buffer) => void) {
    this.bytesWritten += chunk.length;
    if (this.bytesWritten > this.maxBytes) {
      callback(new Error(`QUOTA_EXCEEDED:${this.label}`));
      return;
    }
    this.push(chunk);
    callback();
  }

  getTotalBytes(): number {
    return this.bytesWritten;
  }
}
