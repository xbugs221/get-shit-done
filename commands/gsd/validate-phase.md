---
name: gsd:validate-phase
description: 回顾性审计并填补已完成阶段的奈奎斯特验证缺口
argument-hint: "[phase number]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - AskUserQuestion
---
<objective>
审计已完成阶段的奈奎斯特验证覆盖率。三种状态：
- (A) VALIDATION.md 已存在 — 审计并填补缺口
- (B) 无 VALIDATION.md，但 SUMMARY.md 存在 — 从产物中重建
- (C) 阶段未执行 — 退出并提供指引

输出：更新后的 VALIDATION.md + 生成的测试文件。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/validate-phase.md
</execution_context>

<context>
阶段：$ARGUMENTS — 可选，默认为最后完成的阶段。
</context>

<process>
执行 @~/.claude/get-shit-done/workflows/validate-phase.md，保留所有工作流门禁。
</process>
