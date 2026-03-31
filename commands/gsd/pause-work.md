---
name: gsd:pause-work
description: 在阶段中途暂停工作时创建上下文交接文件
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
创建 `.continue-here.md` 交接文件，跨会话保留完整工作状态。

路由到 pause-work 工作流，处理：
- 检测当前阶段
- 状态收集（位置、已完成工作、剩余工作、决策、阻碍项）
- 创建交接文件
- WIP Git 提交
- 恢复说明
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/pause-work.md
</execution_context>

<context>
状态和阶段进度在工作流内通过定向读取收集。
</context>

<process>
遵循 `@~/.claude/get-shit-done/workflows/pause-work.md` 中的 pause-work 工作流。

工作流处理：阶段目录检测 → 用户澄清状态收集 → 带时间戳的交接文件编写 → Git 提交 → 恢复说明确认。
</process>
