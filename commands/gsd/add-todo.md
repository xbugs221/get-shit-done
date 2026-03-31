---
name: gsd:add-todo
description: 从当前对话上下文中捕获想法或任务作为待办
argument-hint: [optional description]
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

<objective>
将 GSD 会话中浮现的想法、任务或问题捕获为结构化待办事项，以便后续处理。

路由到 add-todo 工作流，处理目录创建、内容提取、领域推断、重复检测、待办文件创建、STATE.md 更新和 Git 提交。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/add-todo.md
</execution_context>

<context>
参数：$ARGUMENTS（可选的待办描述）

状态在工作流内通过 `init todos` 和目标读取解析。
</context>

<process>
**遵循 add-todo 工作流**，来自 `@~/.claude/get-shit-done/workflows/add-todo.md`。

工作流处理：目录检查 → 领域检查 → 内容提取（参数或对话）→ 领域推断 → 重复检查 → slug 文件创建 → STATE.md 更新 → Git 提交。
</process>
