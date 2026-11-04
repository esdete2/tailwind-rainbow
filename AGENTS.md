# AGENTS.md

This project uses SDD (Signal → Dialogue → Decision): decisions and
signals live in a graph under `.sdd/graph/`, managed by the `sdd` CLI.

- Run `sdd view --layout='active:as-list'` for the current state.
- Use the SDD CLI for project records; do not use its MCP server.
- Work with the graph through dialogue using the SDD skill — `/sdd` in
  Claude Code, or the `sdd` skill in Codex.
- Skills are rendered per agent and committed under `.claude/skills/`
  (Claude Code) and `.agents/skills/` (Codex). Don't edit them by hand;
  regenerate with `sdd init`.

<!-- Add project-specific, agent-neutral guidance below. -->

## Code comments

Write comments for a reader who has no access to the conversation or change history. Describe the current contract, non-obvious constraints, or durable design rationale. Do not narrate edits, contrast with previous behavior, or preserve discussion details merely because they motivated the current change; put that information in commit messages or decision records (such as SDD) instead. Include a distinction only when it helps callers or maintainers understand the current code. Omit comments that merely restate obvious code.

## Naming

Name methods, functions, and tests after their enduring responsibility or behavior—not the change that introduced them. Keep names concise; put scenario details in test cases when practical.
