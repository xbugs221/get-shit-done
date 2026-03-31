---
name: gsd:fast
description: 内联执行简单任务 — 无子代理、无规划开销
argument-hint: "[任务描述]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
---

<objective>
在当前上下文中直接执行简单任务，无需子代理或 PLAN.md。
适用于太小而不值得规划的任务：修正拼写、配置变更、小型重构、简单添加。

不是 /gsd:quick 的替代品 — 需要调研、多步规划或验证的任务请用 /gsd:quick。
/gsd:fast 适用于一句话描述、2 分钟内完成的任务。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/fast.md
</execution_context>

<process>
端到端执行 @~/.claude/get-shit-done/workflows/fast.md 中的 fast 工作流。
</process>
</output>
