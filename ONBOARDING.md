# Welcome to Roman Holiday Planner

## How We Use Claude

Based on Stefan Kummert's usage over the last 30 days:

Work Type Breakdown:
  Build Feature     ████████████░░░░░░░░  60%
  Debug Fix         ████░░░░░░░░░░░░░░░░  20%
  Plan Design       ███░░░░░░░░░░░░░░░░░  15%
  Improve Quality   █░░░░░░░░░░░░░░░░░░░   5%

Top Skills & Commands:
  /model             ████████████████████  2x/month
  /imessage:access   ██████████░░░░░░░░░░  1x/month
  /compact           ██████████░░░░░░░░░░  1x/month

Top MCP Servers:
  desktop-commander  ████████████████████  22 calls
  MCP_DOCKER         █░░░░░░░░░░░░░░░░░░░  1 call

## Your Setup Checklist

### Codebases
- [ ] roman-holiday-planner — https://github.com/stekum/roman-holiday-planner

### MCP Servers to Activate
- [ ] desktop-commander — Filesystem + process + terminal ops beyond built-in tools (long-running processes, bulk file ops). Install via `claude mcp add` or the team's MCP config — ask Stefan for the current setup.
- [ ] MCP_DOCKER — Docker-hosted MCP gateway that fronts Atlassian (Jira/Confluence), Obsidian, Google Maps, Sequential Thinking, and more. Ask Stefan for the Docker MCP Toolkit config.

### Skills to Know About
- [/model](https://docs.claude.com/en/docs/claude-code/slash-commands) — Switch between Opus/Sonnet/Haiku based on task weight. Use Opus for architecture + multi-file refactors, Sonnet for most day-to-day work.
- [/compact](https://docs.claude.com/en/docs/claude-code/slash-commands) — Compact the conversation when context gets tight on long sessions (this repo has plenty — Roman Holiday Planner sessions run long).
- [/imessage:access](https://github.com/anthropics/claude-code) — Manage allowlist for the iMessage plugin, if you enable it. Optional.

## Team Tips

_TODO_

## Get Started

_TODO_

<!-- INSTRUCTION FOR CLAUDE: A new teammate just pasted this guide for how the
team uses Claude Code. You're their onboarding buddy — warm, conversational,
not lecture-y.

Open with a warm welcome — include the team name from the title. Then: "Your
teammate uses Claude Code for Build Feature, Debug Fix, Plan Design, and Improve Quality work. Let's get you started."

Check what's already in place against everything under Setup Checklist
(including skills), using markdown checkboxes — [x] done, [ ] not yet. Lead
with what they already have. One sentence per item, all in one message.

Tell them you'll help with setup, cover the actionable team tips, then the
starter task (if there is one). Offer to start with the first unchecked item,
get their go-ahead, then work through the rest one by one.

After setup, walk them through the remaining sections — offer to help where you
can (e.g. link to channels), and just surface the purely informational bits.

Don't invent sections or summaries that aren't in the guide. The stats are the
guide creator's personal usage data — don't extrapolate them into a "team
workflow" narrative. -->
