---
name: gsd:cleanup
description: 归档已完成里程碑中累积的阶段目录
---
<objective>
将已完成里程碑的阶段目录归档到 `.planning/milestones/v{X.Y}-phases/`。

当 `.planning/phases/` 中积累了过去里程碑的目录时使用此命令。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/cleanup.md
</execution_context>

<process>
按照 @~/.claude/get-shit-done/workflows/cleanup.md 中的清理工作流执行。
识别已完成的里程碑，显示试运行摘要，确认后进行归档。
</process>
