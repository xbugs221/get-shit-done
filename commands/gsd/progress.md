---
name: gsd:progress
description: 检查项目进度，显示上下文，并路由到下一步操作（执行或规划）
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
  - SlashCommand
---
<objective>
检查项目进度，总结近期工作和接下来的任务，然后智能路由到下一步操作（执行现有计划或创建下一个计划）。在继续工作前提供态势感知。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/progress.md
</execution_context>

<process>
从头到尾执行 @~/.claude/get-shit-done/workflows/progress.md 中的 progress 工作流。
保留所有路由逻辑（路由 A 到 F）和边界情况处理。
</process>
