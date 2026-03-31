---
name: gsd:list-workspaces
description: 列出活跃的 GSD 工作区及其状态
allowed-tools:
  - Bash
  - Read
---
<objective>
扫描 `~/gsd-workspaces/` 中包含 `WORKSPACE.md` 的工作区目录，显示名称、路径、仓库数量、策略和 GSD 项目状态的摘要表格。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/list-workspaces.md
@~/.claude/get-shit-done/references/ui-brand.md
</execution_context>

<process>
端到端执行 @~/.claude/get-shit-done/workflows/list-workspaces.md 工作流。
</process>
