---
name: gsd:audit-milestone
description: 在归档之前审计里程碑完成情况与原始意图的一致性
argument-hint: "[version]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Task
  - Write
---
<objective>
验证里程碑是否达成其完成定义。检查需求覆盖率、跨阶段集成和端到端流程。

**此命令本身就是编排器。** 读取现有 VERIFICATION.md 文件（阶段已在 execute-phase 期间验证），汇总技术债务和延期缺口，然后启动集成检查器进行跨阶段连接检查。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/audit-milestone.md
</execution_context>

<context>
版本：$ARGUMENTS（可选——默认为当前里程碑）

核心规划文件在工作流内解析（`init milestone-op`），仅在需要时加载。

**已完成的工作：**
Glob: .planning/phases/*/*-SUMMARY.md
Glob: .planning/phases/*/*-VERIFICATION.md
</context>

<process>
端到端执行 @~/.claude/get-shit-done/workflows/audit-milestone.md 中的 audit-milestone 工作流。
保留所有工作流关卡（范围确定、验证读取、集成检查、需求覆盖、路由）。
</process>
