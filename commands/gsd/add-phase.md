---
name: gsd:add-phase
description: 在路线图中将阶段添加到当前里程碑的末尾
argument-hint: <description>
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
在路线图中将新的整数阶段添加到当前里程碑末尾。

路由到 add-phase 工作流，处理阶段编号计算、slug 目录创建、路线图更新和 STATE.md 演进跟踪。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/add-phase.md
</execution_context>

<context>
参数：$ARGUMENTS（阶段描述）

路线图和状态在工作流内通过 `init phase-op` 和目标工具调用解析。
</context>

<process>
**遵循 add-phase 工作流**，来自 `@~/.claude/get-shit-done/workflows/add-phase.md`。

工作流处理：参数验证 → 路线图检查 → 里程碑识别 → 阶段编号计算（忽略小数）→ slug 生成 → 目录创建 → 路线图插入 → STATE.md 更新。
</process>
