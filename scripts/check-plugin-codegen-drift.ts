import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function readSnapshot(filePath: string): string | null {
  const absolutePath = path.join(process.cwd(), filePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : null;
}

function main() {
  const targets = process.argv.slice(2);

  if (targets.length === 0) {
    console.error("Usage: check-plugin-codegen-drift <file> [file...]");
    process.exit(1);
  }

  const before = new Map(targets.map((filePath) => [filePath, readSnapshot(filePath)]));

  execFileSync("pnpm", ["plugin:compile"], {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV ?? "test",
    },
  });

  const drifted: string[] = [];
  for (const filePath of targets) {
    const prior = before.get(filePath) ?? null;
    const after = readSnapshot(filePath);
    if (prior !== after) {
      drifted.push(filePath);
    }
  }

  if (drifted.length > 0) {
    console.error("Plugin codegen drift detected in:");
    for (const filePath of drifted) {
      console.error(`- ${filePath}`);
    }
    process.exit(1);
  }

  console.log(`Plugin codegen drift check passed for ${targets.length} file(s).`);
}

main();
