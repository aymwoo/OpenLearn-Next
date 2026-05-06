const fs = require('fs');

const uatFile = '.planning/phases/08-stitch-mcp-integration/08-UAT.md';
let content = fs.readFileSync(uatFile, 'utf8');

// Update frontmatter status
content = content.replace(/^status:.*$/m, 'status: diagnosed');

// Replace gaps section manually
const gapsRegex = /## Gaps\n\n([\s\S]*)$/;

const newGaps = `- truth: |\n    Visit the teacher dashboard (\`/teacher\`). It should be wrapped in a 'floor' container with appropriate padding and surface background, adhering to the "no-line" boundary principle.\n  status: failed\n  reason: "User reported: fail: 布局混乱，\\"今天把'编程基础：让角色动起来'编排成可运行课堂\\"这部分宽度不够"\n  severity: major\n  test: 2\n  root_cause: "Text '今天把...' has fixed or narrow wrapping that limits its width incorrectly, causing layout confusion."\n  artifacts:\n    - path: "src/components/surfaces/teacher-dashboard-surface.tsx"\n      issue: "Grid layout xl:grid-cols-[1.15fr_0.85fr] or max-w-3xl on h1 limits width incorrectly."\n  missing:\n    - "Adjust the grid layout or max-width classes in TeacherDashboardSurface to ensure the title has enough width."\n  debug_session: .planning/debug/teacher-dashboard-layout.md\n`;

content = content.replace(gapsRegex, '## Gaps\n\n' + newGaps);

fs.writeFileSync(uatFile, content);
