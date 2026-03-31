---
name: gsd:new-milestone
description: 开始新的里程碑周期 — 更新 PROJECT.md 并路由到需求阶段
argument-hint: "[里程碑名称，例如 'v1.1 通知系统']"
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
  - AskUserQuestion
---
<objective>
开始新的里程碑：提问 → 研究（可选） → 需求 → 路线图。

等同于 new-project 的棕地版本。项目已存在，PROJECT.md 有历史记录。收集"下一步做什么"，更新 PROJECT.md，然后运行需求 → 路线图周期。

**创建/更新：**
- `.planning/PROJECT.md` — 更新为新里程碑目标
- `.planning/research/` — 领域研究（可选，仅限新功能）
- `.planning/REQUIREMENTS.md` — 本里程碑的范围化需求
- `.planning/ROADMAP.md` — 阶段结构（继续编号）
- `.planning/STATE.md` — 为新里程碑重置

**之后：** `/gsd:plan-phase [N]` 开始执行。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/new-milestone.md
@~/.claude/get-shit-done/references/questioning.md
@~/.claude/get-shit-done/references/ui-brand.md
@~/.claude/get-shit-done/templates/project.md
@~/.claude/get-shit-done/templates/requirements.md
</execution_context>

<context>
里程碑名称：$ARGUMENTS（可选 - 如未提供将提示输入）

项目和里程碑上下文在工作流内部解析（`init new-milestone`），通过 `<files_to_read>` 块委派给子 agent。
</context>

<process>
端到端执行 @~/.claude/get-shit-done/workflows/new-milestone.md 工作流。
保留所有工作流门控（验证、提问、研究、需求、路线图审批、提交）。
</process>
