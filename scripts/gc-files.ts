import { existsSync, statSync, unlinkSync } from "node:fs";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { pluginFiles } from "@/db/schema";
import { resolveStoragePath } from "@/lib/file-storage/storage-path";

/**
 * GC（垃圾回收）脚本 — 扫描所有已软删除（isLatest=false）的 upload 行，
 * 检查物理文件是否存在，若存在则删除并输出统计信息。
 *
 * 使用方式:
 *   npx tsx scripts/gc-files.ts          # 执行 GC
 *   npx tsx scripts/gc-files.ts --dry-run # 仅预览，不删除
 *
 * 设计决策:
 *   - D-08: 手动脚本触发，不使用定时任务
 *   - D-09: 软删除 — system.file.delete 标记 isLatest=false；物理清除由此脚本执行
 *   - D-10: 仅输出统计信息，不写 governanceAudit（运维操作非插件操作）
 *   - T-80-22: 仅删除 pluginFiles diskPath 引用的文件，不进行任意文件系统扫描
 *   - T-80-23: 仅删除 isLatest=false 的行——活跃文件（isLatest=true）不受影响
 */

interface DeletableRow {
  id: string;
  diskPath: string | null;
  fileName: string;
  sizeBytes: number | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

async function main(): Promise<void> {
  const isDryRun = process.argv.includes("--dry-run");

  console.log(
    isDryRun
      ? "[gc-files] DRY RUN mode — 仅预览，不实际删除\n"
      : "[gc-files] 开始垃圾回收...\n",
  );

  // 1. 查询所有待回收文件：operation="upload" 且 isLatest=false
  //    这些是被软删除的 upload 行——系统仅标记了 isLatest=false（D-09），
  //    原始文件仍在磁盘上。
  const rows = (await db
    .select({
      id: pluginFiles.id,
      diskPath: pluginFiles.diskPath,
      fileName: pluginFiles.fileName,
      sizeBytes: pluginFiles.sizeBytes,
    })
    .from(pluginFiles)
    .where(
      and(
        eq(pluginFiles.operation, "upload"),
        eq(pluginFiles.isLatest, false),
      ),
    )) as DeletableRow[];

  const scanned = rows.length;
  console.log(`扫描行数: ${scanned}`);

  if (scanned === 0) {
    console.log("无可回收文件。");
    return;
  }

  let deletedCount = 0;
  let freedBytes = 0;
  const skippedRows: string[] = [];

  // 2. 遍历检查
  for (const row of rows) {
    // diskPath 可能为 null（理论上 upload 行应有值，但防御性检查）
    if (!row.diskPath) {
      skippedRows.push(`  [跳过] ${row.id}: diskPath 为空 (fileName: ${row.fileName})`);
      continue;
    }

    const absolutePath = resolveStoragePath(row.diskPath);

    // 3. 检查物理文件是否存在（T-80-22: 仅删除已知 diskPath 引用的文件）
    if (!existsSync(absolutePath)) {
      // 文件已不存在——可能已被之前的 GC 运行或手动清理
      skippedRows.push(`  [跳过] ${row.id}: 文件不存在 (${absolutePath})`);
      continue;
    }

    // 记录文件大小
    let fileSize = 0;
    try {
      fileSize = statSync(absolutePath).size;
    } catch {
      skippedRows.push(`  [跳过] ${row.id}: stat 失败 (${absolutePath})`);
      continue;
    }

    // 4. 物理删除
    if (isDryRun) {
      console.log(
        `  [DRY RUN] 将删除: ${absolutePath} (${formatBytes(fileSize)}) — ${row.fileName}`,
      );
      deletedCount++;
      freedBytes += fileSize;
    } else {
      try {
        unlinkSync(absolutePath);
        deletedCount++;
        freedBytes += fileSize;
        console.log(
          `  [已删除] ${absolutePath} (${formatBytes(fileSize)}) — ${row.fileName}`,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        skippedRows.push(`  [错误] ${row.id}: unlink 失败 (${absolutePath}): ${message}`);
      }
    }
  }

  // 5. 统计输出（D-10）
  console.log("");
  console.log("====== GC 统计 ======");
  console.log(`Scanned: ${scanned}`);
  console.log(`Deleted: ${deletedCount}`);
  console.log(`Freed: ${formatBytes(freedBytes)}`);

  if (skippedRows.length > 0) {
    console.log("\n以下行被跳过:");
    for (const skip of skippedRows) {
      console.log(skip);
    }
  }

  if (isDryRun) {
    console.log("\n[gc-files] DRY RUN 完成——未实际删除任何文件。");
  } else {
    console.log("\n[gc-files] GC 完成。");
  }
}

main().catch((err) => {
  console.error("[gc-files] 执行失败:", err);
  process.exit(1);
});
