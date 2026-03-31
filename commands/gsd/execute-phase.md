---
name: gsd:execute-phase
description: 使用基于波次的并行化执行阶段中的所有计划
argument-hint: "<phase-number> [--wave N] [--gaps-only] [--interactive]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
  - TodoWrite
  - AskUserQuestion
---
<objective>
使用基于波次的并行执行来执行阶段中的所有计划。

协调器保持精简：发现计划、分析依赖关系、按波次分组、生成子代理、收集结果。每个子代理加载完整的 execute-plan 上下文并处理自己的计划。

标志处理规则：
- 标志仅在其字面标记出现在 `$ARGUMENTS` 中时才激活
- 未出现在 `$ARGUMENTS` 中的标志视为未激活

上下文预算：协调器约 15%，每个子代理 100% 全新。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-phase.md
@~/.claude/get-shit-done/references/ui-brand.md
</execution_context>

<context>
阶段：$ARGUMENTS

**可选标志（仅在 `$ARGUMENTS` 中出现时才激活）：**
- `--wave N` — 仅执行波次 `N`，用于控制节奏或配额管理
- `--gaps-only` — 仅执行差距修复计划（frontmatter 中 `gap_closure: true`）。在 verify-work 创建修复计划后使用
- `--interactive` — 按顺序内联执行（不用子代理），任务间设用户检查点。更低 token 用量，适合小型阶段、bug 修复和验证差距

阶段验证/完成仅在所选波次完成后没有未完成计划时才执行。

上下文文件在工作流内部通过 `gsd-tools init execute-phase` 和每个子代理的 `<files_to_read>` 块来解析。
</context>

<process>
端到端执行 @~/.claude/get-shit-done/workflows/execute-phase.md 中的 execute-phase 工作流。
保留所有工作流关卡（波次执行、检查点处理、验证、状态更新、路由）。
</process>
</output>
