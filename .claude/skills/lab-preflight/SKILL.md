---
name: lab-preflight
description: Verify LAB local checkout, Claude tools, runtime, skills and browser access before development; do not redesign or mutate business data.
disable-model-invocation: true
---
# Local preflight

Read CLAUDE.md and ../../WORKFLOW.md. Run `node .claude/scripts/preflight.mjs` from
the repository root. Report cwd/branch/dirty-state, tools, configuration presence,
frontend/API checks and any blocker. Do not print credentials or raw environment.
If runtime is down, follow WORKFLOW.md; don't reset, seed or rebuild as a shortcut.
Use Playwright MCP or Desktop Browser to open http://localhost:5173 and capture the
actual page; verify its content, not only HTTP 200. Inspect `/mcp` if browser tools
are missing. A Cloud VM cannot access Windows localhost unless explicitly connected.
Preflight grants no authority to modify application code or submit business actions.
