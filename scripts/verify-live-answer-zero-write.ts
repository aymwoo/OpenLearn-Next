import { readFileSync } from "node:fs";

const source = readFileSync(
  "src/components/classroom/live-answer-dashboard-surface.tsx",
  "utf8",
);

const forbiddenPatterns = [
  /update[A-Z]/,
  /delete[A-Z]/,
  /grade[A-Z]/,
  /from ['\"]@\/actions\//,
];

for (const pattern of forbiddenPatterns) {
  if (pattern.test(source)) {
    console.error(`LIVE_ANSWER_ZERO_WRITE_GUARD_FAILED: ${pattern}`);
    process.exit(1);
  }
}

console.log("LIVE_ANSWER_ZERO_WRITE_GUARD_PASSED");
