---
name: gsd:remove-workspace
description: 移除 GSD 工作区并清理工作树
argument-hint: "<workspace-name>"
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---
<context>
**参数：**
- `<workspace-name>`（必需）— 要移除的工作区名称
</context>

<objective>
确认后移除工作区目录。对于工作树策略，先对每个成员仓库运行 `git worktree remove`。如有未提交更改则拒绝操作。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/remove-workspace.md
@~/.claude/get-shit-done/references/ui-brand.md
</execution_context>

<process>
从头到尾执行 @~/.claude/get-shit-done/workflows/remove-workspace.md 中的 remove-workspace 工作流。
</process>
