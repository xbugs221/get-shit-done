---
name: gsd:add-tests
description: 根据 UAT 标准和实现为已完成的阶段生成测试
argument-hint: "<phase> [additional instructions]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - AskUserQuestion
argument-instructions: |
  将参数解析为阶段编号（整数、小数或字母后缀），加上可选的自由文本指令。
  示例：/gsd:add-tests 12
  示例：/gsd:add-tests 12 focus on edge cases in the pricing module
---
<objective>
为已完成的阶段生成单元测试和端到端测试，使用其 SUMMARY.md、CONTEXT.md 和 VERIFICATION.md 作为规格说明。

分析实现文件并分类为 TDD（单元测试）、E2E（浏览器测试）或 Skip，向用户展示测试计划获取批准后，按 RED-GREEN 惯例生成测试。

输出：测试文件以 `test(phase-{N}): add unit and E2E tests from add-tests command` 提交。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/add-tests.md
</execution_context>

<context>
阶段：$ARGUMENTS

@.planning/STATE.md
@.planning/ROADMAP.md
</context>

<process>
端到端执行 @~/.claude/get-shit-done/workflows/add-tests.md 中的 add-tests 工作流。
保留所有工作流关卡（分类审批、测试计划审批、RED-GREEN 验证、缺口报告）。
</process>
