---
name: gsd:check-todos
description: 列出待处理的待办事项并选择一个来处理
argument-hint: [area filter]
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

<objective>
列出所有待处理的待办事项，支持选择并加载完整上下文，路由到适当操作。

路由到 check-todos 工作流，处理按领域过滤的列表、交互式选择、路线图关联检查、操作路由（立即处理、添加到阶段、头脑风暴、创建阶段）及 STATE.md 更新。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/check-todos.md
</execution_context>

<context>
参数：$ARGUMENTS（可选的领域过滤器）

待办状态和路线图关联在工作流内使用 `init todos` 和目标读取加载。
</context>

<process>
**遵循 check-todos 工作流**，来自 `@~/.claude/get-shit-done/workflows/check-todos.md`。

工作流处理：待办检查 → 领域过滤 → 交互式选择 → 完整上下文加载 → 路线图关联 → 操作执行 → STATE.md 更新 → Git 提交。
</process>
