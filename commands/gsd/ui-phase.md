---
name: gsd:ui-phase
description: 为前端阶段生成 UI 设计契约（UI-SPEC.md）
argument-hint: "[phase]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
  - WebFetch
  - AskUserQuestion
  - mcp__context7__*
---
<objective>
为前端阶段创建 UI 设计契约（UI-SPEC.md）。
协调 gsd-ui-researcher 和 gsd-ui-checker。
流程：验证 → 研究 UI → 校验 UI-SPEC → 完成
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/ui-phase.md
@~/.claude/get-shit-done/references/ui-brand.md
</execution_context>

<context>
阶段编号：$ARGUMENTS — 可选，省略则自动检测下一个未规划的阶段。
</context>

<process>
端到端执行 @~/.claude/get-shit-done/workflows/ui-phase.md，保留所有工作流门禁。
</process>
