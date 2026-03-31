---
name: gsd:insert-phase
description: 在现有阶段之间插入紧急工作作为小数阶段（例如 72.1）
argument-hint: <after> <description>
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
为执行过程中发现的紧急工作插入小数阶段（72.1、72.2 等），保留逻辑顺序，无需重新编号整个路线图。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/insert-phase.md
</execution_context>

<context>
参数：$ARGUMENTS（格式：<在哪个阶段之后> <描述>）

路线图和状态通过 `init phase-op` 和工具调用在工作流内部解析。
</context>

<process>
执行 @~/.claude/get-shit-done/workflows/insert-phase.md 中的插入阶段工作流。
保留所有验证关卡（参数解析、阶段验证、小数计算、路线图更新）。
</process>
</output>
