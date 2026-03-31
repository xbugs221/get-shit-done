---
name: gsd:resume-work
description: 从上一次会话恢复工作，完整还原上下文
allowed-tools:
  - Read
  - Bash
  - Write
  - AskUserQuestion
  - SlashCommand
---

<objective>
还原完整的项目上下文，从上一次会话无缝恢复工作。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/resume-project.md
</execution_context>

<process>
**遵循 resume-project 工作流**，来自 `@~/.claude/get-shit-done/workflows/resume-project.md`。

该工作流处理所有恢复逻辑：
1. 项目存在性验证
2. STATE.md 加载或重建
3. 检查点和未完成工作检测（.continue-here 文件、有 PLAN 但无 SUMMARY）
4. 可视化状态展示
5. 上下文感知的选项提供（在建议规划 vs 讨论之前检查 CONTEXT.md）
6. 路由到适当的下一个命令
7. 会话连续性更新
</process>
