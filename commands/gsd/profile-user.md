---
name: gsd:profile-user
description: 生成开发者行为画像并创建 Claude 可发现的产物
argument-hint: "[--questionnaire] [--refresh]"
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
从会话分析（或问卷）生成开发者行为画像，并生成个性化产物（USER-PROFILE.md、/gsd:dev-preferences、CLAUDE.md 章节）。

路由到 profile-user 工作流，编排完整流程：同意门控、会话分析或问卷回退、画像生成、结果展示和产物选择。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/profile-user.md
@~/.claude/get-shit-done/references/ui-brand.md
</execution_context>

<context>
来自 $ARGUMENTS 的标志：
- `--questionnaire` -- 跳过会话分析，使用纯问卷路径
- `--refresh` -- 即使画像已存在也重新构建，备份旧画像，显示差异
</context>

<process>
从头到尾执行 profile-user 工作流，处理：
1. 初始化和现有画像检测
2. 会话分析前的同意门控
3. 会话扫描和数据充分性检查
4. 会话分析（profiler agent）或问卷回退
5. 跨项目拆分解决
6. 写入 USER-PROFILE.md
7. 报告卡和亮点展示
8. 产物选择（dev-preferences、CLAUDE.md 章节）
9. 顺序生成产物
10. 摘要及刷新差异（如适用）
</process>
