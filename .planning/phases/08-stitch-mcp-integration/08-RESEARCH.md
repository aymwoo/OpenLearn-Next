# Research: Phase 8 - Stitch MCP Integration

## 1. Domain Overview
The goal is to use the `stitch` tools (specifically `stitch_get_project`, `stitch_list_screens`, `stitch_get_screen`, `stitch_list_design_systems`) within the AI agent's execution phase to pull down the design metadata from project `5322129002350954765` and refactor the Next.js UI (`/` and `/teacher`) to match.

## 2. Technical Approach
Because the AI agent performs this *during* execution, no application-level code needs to be written to connect to an MCP server. Instead, the planner must write tasks that instruct the executor agent to:
1. Use `stitch_get_project` with name `projects/5322129002350954765` or `stitch_list_screens` with `projectId: "5322129002350954765"`.
2. Inspect the screen data for Home and Teacher Dashboard.
3. Edit the local `src/app/page.tsx` (Home) and `src/app/teacher/page.tsx` (Dashboard) components, as well as `src/components/ui/` components if necessary.
4. Apply the `DESIGN.md` rules (no 1px dividers, tonal surfaces, Lexend font, gradients).

## 3. Tool Usage Pattern
- The executor will need explicit instructions in `<action>` to call `stitch` tools to fetch screen data before making edits.
- The `read_first` field in the planner must point to `DESIGN.md`, `src/app/page.tsx`, and `src/app/teacher/page.tsx`.

## 4. Risks & Mitigations
- **Risk:** AI agent might invent a generic UI if it fails to call Stitch.
- **Mitigation:** The action criteria MUST require the executor to use the `stitch` tool outputs as the basis for the DOM structure and CSS variables.
