---
name: gsd:do
description: 自动将自由文本路由到正确的 GSD 命令
argument-hint: "<描述你想做什么>"
allowed-tools:
  - Read
  - Bash
  - AskUserQuestion
---
<objective>
分析自然语言输入，分派到最合适的 GSD 命令。

作为智能调度器 — 自身不执行工作。将意图匹配到最佳 GSD 命令，确认后交接。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/do.md
@~/.claude/get-shit-done/references/ui-brand.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
端到端执行 @~/.claude/get-shit-done/workflows/do.md 中的 do 工作流。
将用户意图路由到最佳 GSD 命令并调用它。
</process>
</output>
