---
name: gsd:session-report
description: 生成包含 token 用量估算、工作摘要和成果的会话报告
allowed-tools:
  - Read
  - Bash
  - Write
---
<objective>
生成结构化的 SESSION_REPORT.md，记录会话成果、已完成工作和估算的资源用量，用于会话后回顾。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/session-report.md
</execution_context>

<process>
从头到尾执行 @~/.claude/get-shit-done/workflows/session-report.md 中的 session-report 工作流。
</process>
