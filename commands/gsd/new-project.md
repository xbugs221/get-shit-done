---
name: gsd:new-project
description: 通过深度上下文收集和 PROJECT.md 初始化新项目
argument-hint: "[--auto]"
allowed-tools:
  - Read
  - Bash
  - Write
  - Task
  - AskUserQuestion
---
<context>
**标志：**
- `--auto` — 自动模式。配置问题之后，无需交互即可运行研究 → 需求 → 路线图。期望通过 @ 引用提供创意文档。
</context>

<objective>
统一流程初始化新项目：提问 → 研究（可选） → 需求 → 路线图。

**创建：**
- `.planning/PROJECT.md` — 项目上下文
- `.planning/config.json` — 工作流偏好设置
- `.planning/research/` — 领域研究（可选）
- `.planning/REQUIREMENTS.md` — 范围化需求
- `.planning/ROADMAP.md` — 阶段结构
- `.planning/STATE.md` — 项目记忆

**此命令之后：** `/gsd:plan-phase 1` 开始执行。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/new-project.md
@~/.claude/get-shit-done/references/questioning.md
@~/.claude/get-shit-done/references/ui-brand.md
@~/.claude/get-shit-done/templates/project.md
@~/.claude/get-shit-done/templates/requirements.md
</execution_context>

<process>
端到端执行 @~/.claude/get-shit-done/workflows/new-project.md 工作流。
保留所有工作流门控（验证、审批、提交、路由）。
</process>
