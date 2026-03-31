---
name: gsd:settings
description: 配置 GSD 工作流开关和模型配置
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

<objective>
交互式配置 GSD 工作流代理和模型配置。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/settings.md
</execution_context>

<process>
**遵循 settings 工作流**，来自 `@~/.claude/get-shit-done/workflows/settings.md`。

该工作流处理所有逻辑：
1. 如果缺失则使用默认值创建配置文件
2. 读取当前配置
3. 交互式 5 问提示（模型、研究、plan_check、验证器、分支策略）
4. 回答解析和配置合并
5. 文件写入和确认信息显示
</process>
