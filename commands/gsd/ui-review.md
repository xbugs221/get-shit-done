---
name: gsd:ui-review
description: 对已实现的前端代码进行回顾性六支柱视觉审计
argument-hint: "[phase]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
  - AskUserQuestion
---
<objective>
执行回顾性六支柱视觉审计，生成 {phase_num}-UI-REVIEW.md，包含分级评估（每个支柱 1-4 分）。适用于任何项目。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/ui-review.md
@~/.claude/get-shit-done/references/ui-brand.md
</execution_context>

<context>
阶段：$ARGUMENTS — 可选，默认为最后完成的阶段。
</context>

<process>
端到端执行 @~/.claude/get-shit-done/workflows/ui-review.md，保留所有工作流门禁。
</process>
