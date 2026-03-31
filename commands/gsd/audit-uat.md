---
name: gsd:audit-uat
description: 跨阶段审计所有未完成的 UAT 和验证事项
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
---
<objective>
扫描所有阶段中待处理、已跳过、已阻塞和需人工处理的 UAT 事项。与代码库交叉引用检测过时文档，生成按优先级排列的人工测试计划。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/audit-uat.md
</execution_context>

<context>
核心规划文件在工作流内通过 CLI 加载。

**范围：**
Glob: .planning/phases/*/*-UAT.md
Glob: .planning/phases/*/*-VERIFICATION.md
</context>
