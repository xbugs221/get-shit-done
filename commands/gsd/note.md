---
name: gsd:note
description: 零摩擦的想法捕获。追加、列出或将笔记提升为待办事项。
argument-hint: "<文本> | list | promote <N> [--global]"
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
---
<objective>
零摩擦想法捕获——一次 Write 调用，一行确认。

三个子命令：
- **append**（默认）：保存带时间戳的笔记文件，无提问无格式化
- **list**：显示项目和全局范围的所有笔记
- **promote**：将笔记转换为结构化待办事项

内联运行——不使用 Task、AskUserQuestion 或 Bash。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/note.md
@~/.claude/get-shit-done/references/ui-brand.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
端到端执行 @~/.claude/get-shit-done/workflows/note.md 工作流。
根据参数捕获笔记、列出笔记或提升为待办事项。
</process>
