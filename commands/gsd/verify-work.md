---
name: gsd:verify-work
description: 通过对话式用户验收测试验证已构建的功能
argument-hint: "[phase number, e.g., '4']"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Edit
  - Write
  - Task
---
<objective>
通过对话式测试（含持久状态）从用户视角验证已构建功能。每次一个测试，纯文本响应。发现问题时自动诊断、规划修复方案并准备执行。

输出：{phase_num}-UAT.md 跟踪所有测试结果。如发现问题：已诊断的缺口、已验证的修复计划，供 /gsd:execute-phase 执行。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/verify-work.md
@~/.claude/get-shit-done/templates/UAT.md
</execution_context>

<context>
阶段：$ARGUMENTS（可选）
- 如果提供：测试指定阶段（例如 "4"）
- 如果未提供：检查活跃会话或提示输入阶段

上下文文件在工作流内部解析（`init verify-work`），通过 `<files_to_read>` 块委派。
</context>

<process>
端到端执行 @~/.claude/get-shit-done/workflows/verify-work.md，保留所有工作流门禁（会话管理、测试展示、诊断、修复规划、路由）。
</process>
