---
name: gsd:remove-phase
description: 从路线图中移除未来阶段并重新编号后续阶段
argument-hint: <phase-number>
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
---
<objective>
从路线图中移除未开始的阶段并重新编号后续阶段，维护干净的线性序列。干净地移除不需要的工作，避免用已取消/已延迟标记污染上下文。

输出：阶段已删除，后续阶段已重新编号，git 提交作为历史记录。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/remove-phase.md
</execution_context>

<context>
阶段：$ARGUMENTS

路线图和状态在工作流内部通过 `init phase-op` 和定向读取来解析。
</context>

<process>
从头到尾执行 @~/.claude/get-shit-done/workflows/remove-phase.md 中的 remove-phase 工作流。
保留所有验证门控（未来阶段检查、工作检查）、重新编号逻辑和提交。
</process>
