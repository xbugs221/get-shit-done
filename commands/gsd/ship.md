---
name: gsd:ship
description: 创建 PR、运行评审，并在验证通过后准备合并
argument-hint: "[phase number or milestone, e.g., '4' or 'v1.0']"
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
  - Write
  - AskUserQuestion
---
<objective>
连接本地完成 → 已合并 PR。在 /gsd:verify-work 通过后，推送分支、创建 PR、可选触发评审并跟踪合并。关闭 计划 → 执行 → 验证 → 交付 的循环。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/ship.md
</execution_context>

<process>
从头到尾执行 @~/.claude/get-shit-done/workflows/ship.md 中的 ship 工作流。
</process>
