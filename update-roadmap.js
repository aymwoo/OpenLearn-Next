const fs = require('fs');
const content = fs.readFileSync('.planning/ROADMAP.md', 'utf8');

const regex = /(### Phase 8: Stitch MCP Integration[\s\S]*?\*\*Plans\*\*:\s*)(.*)/;
const replacement = `$12 plans\n- [ ] 08-01-PLAN.md — Refactor Home Page using Stitch design.\n- [ ] 08-02-PLAN.md — Refactor Teacher Dashboard using Stitch design.`;

const updated = content.replace(regex, replacement);
fs.writeFileSync('.planning/ROADMAP.md', updated);
