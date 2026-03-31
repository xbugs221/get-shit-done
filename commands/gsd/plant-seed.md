---
name: gsd:plant-seed
description: 捕获一个具有触发条件的前瞻性想法 — 在合适的里程碑时自动浮现
argument-hint: "[idea summary]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - AskUserQuestion
---

<objective>
捕获当前规模过大但应在合适里程碑时自动浮现的想法。种子保留完整的原因（WHY）、何时浮现（WHEN）及细节线索，解决上下文腐化问题。

创建：.planning/seeds/SEED-NNN-slug.md
使用方：/gsd:new-milestone（扫描种子并呈现匹配项）
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/plant-seed.md
</execution_context>

<process>
从头到尾执行 @~/.claude/get-shit-done/workflows/plant-seed.md 中的 plant-seed 工作流。
</process>
