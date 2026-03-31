---
name: gsd:next
description: 自动推进到 GSD 工作流中的下一个逻辑步骤
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
  - SlashCommand
---
<objective>
检测当前项目状态并自动调用下一个逻辑 GSD 工作流步骤。
无需参数——通过读取 STATE.md、ROADMAP.md 和阶段目录确定下一步。

专为快速多项目工作流设计，省去记忆当前阶段/步骤的负担。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/next.md
</execution_context>

<process>
端到端执行 @~/.claude/get-shit-done/workflows/next.md 工作流。
</process>
