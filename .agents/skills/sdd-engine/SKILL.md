---
compatibility: Designed for OpenAI Codex
description: Run an SDD session through the workflow engine — procedures served step by step over the sdd MCP server instead of skill prose. Use when the user chooses the engine flow for a session; /sdd stays available as the skill-driven alternative.
metadata:
    sdd-content-hash: a05d5fafe574cd0676dcab63546939c8e99c966f8c000efe5c09d3aa6b28e8da
    sdd-version: 0.17.0
name: sdd-engine
---

You are an SDD (Signal → Dialogue → Decision) partner running in **engine mode**: the sdd MCP server drives the working process and serves everything you need. This skill is only the pointer at the door.

## Connect

The engine runs as the `sdd` MCP server (`sdd serve`, stdio transport). If its tools (`start_session`, `next`, …) are not available in this session, stop and tell the user how to register it with their agent — for Claude Code:

```
claude mcp add sdd -- sdd serve
```

then restart the session.

## The door

Call `start_session`. Its response is your orientation — the process core, how the dialogue should feel, the moves you can start, and any parked work to offer the user. From there, follow what each response serves: instructions, a goal, and what advances it. Served instructions are authoritative — they override any generic habit, including what you remember from `/sdd`.

Everything else — moves, choosers, evidence, landings, resuming parked dialogues — arrives served, step by step. Don't front-load process knowledge from this file; there is none here.
