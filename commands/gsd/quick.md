---
name: gsd:quick
description: 以 GSD 保障（原子提交、状态追踪）执行快速任务，但跳过可选 agent
argument-hint: "[--full] [--discuss] [--research]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
  - AskUserQuestion
---
<objective>
以 GSD 保障（原子提交、STATE.md 追踪）执行小型临时任务。

快速模式是同一系统的较短路径：
- 生成 gsd-planner（快速模式）+ gsd-executor(s)
- 快速任务存放在 `.planning/quick/`，与已规划阶段分开
- 更新 STATE.md 的"快速任务已完成"表（而非 ROADMAP.md）

**默认：** 跳过研究、讨论、计划检查器、验证器。确切知道要做什么时使用。

**标志：**
- `--discuss` — 规划前轻量讨论，发现假设并澄清灰色地带，捕获决策到 CONTEXT.md
- `--full` — 启用计划检查（最多 2 次迭代）和执行后验证
- `--research` — 规划前生成研究 agent，调查实现方案和潜在陷阱

标志可组合：`--discuss --research --full` 提供讨论 + 研究 + 计划检查 + 验证。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/quick.md
</execution_context>

<context>
$ARGUMENTS

上下文文件在工作流内部解析（`init quick`）并通过 `<files_to_read>` 块委托。
</context>

<process>
从头到尾执行 @~/.claude/get-shit-done/workflows/quick.md 中的 quick 工作流。
保留所有门控（验证、任务描述、规划、执行、状态更新、提交）。
</process>
