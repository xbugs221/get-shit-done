---
name: gsd:autonomous
description: 自主运行所有剩余阶段——每个阶段执行 讨论→计划→执行
argument-hint: "[--from N]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
  - Task
---
<objective>
自主执行所有剩余的里程碑阶段，每个阶段执行：讨论 → 计划 → 执行。仅在需要用户决策时暂停（灰色地带接受、阻塞问题、验证请求）。

使用 ROADMAP.md 阶段发现和 Skill() 扁平调用执行每个阶段命令。所有阶段完成后：里程碑审计 → 完成 → 清理。

**产出：** STATE.md、ROADMAP.md（每阶段后更新），阶段产物（CONTEXT.md、PLAN、SUMMARY）。完成后执行里程碑完成和清理。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/autonomous.md
@~/.claude/get-shit-done/references/ui-brand.md
</execution_context>

<context>
可选标志：`--from N` — 从阶段 N 开始，而非从第一个未完成的阶段。

项目上下文、阶段列表和状态在工作流内使用 init 命令解析（`gsd-tools.cjs init milestone-op`、`gsd-tools.cjs roadmap analyze`），无需预先加载。
</context>

<process>
端到端执行 @~/.claude/get-shit-done/workflows/autonomous.md 中的自主工作流。
保留所有工作流关卡（阶段发现、逐阶段执行、阻塞处理、进度显示）。
</process>
