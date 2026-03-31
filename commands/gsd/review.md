---
name: gsd:review
description: 请求外部 AI CLI 对阶段计划进行跨 AI 同行评审
argument-hint: "--phase N [--gemini] [--claude] [--codex] [--all]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---

<objective>
调用外部 AI CLI（Gemini、Claude、Codex）独立评审阶段计划。
生成结构化 REVIEWS.md，可通过 /gsd:plan-phase --reviews 反馈到规划中。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/review.md
</execution_context>

<context>
阶段编号：从 $ARGUMENTS 中提取（必需）

**标志：**
- `--gemini` — Gemini CLI 评审
- `--claude` — Claude CLI 评审（独立会话）
- `--codex` — Codex CLI 评审
- `--all` — 所有可用 CLI
</context>

<process>
从头到尾执行 @~/.claude/get-shit-done/workflows/review.md 中的评审工作流。
</process>
