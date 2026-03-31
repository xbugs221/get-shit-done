---
name: gsd:pr-branch
description: 通过过滤 .planning/ 提交创建干净的 PR 分支 — 为代码审查做好准备
argument-hint: "[target branch, default: main]"
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---

<objective>
从当前分支过滤 .planning/ 提交，创建适合 PR 的干净分支。审查者只看到代码变更，不会被 PLAN.md、SUMMARY.md、STATE.md 等规划产物干扰。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/pr-branch.md
</execution_context>

<process>
从头到尾执行 @~/.claude/get-shit-done/workflows/pr-branch.md 中的 pr-branch 工作流。
</process>
