---
name: gsd:update
description: 将 GSD 更新到最新版本并显示变更日志
allowed-tools:
  - Bash
  - AskUserQuestion
---

<objective>
检查 GSD 更新，如有可用更新则安装，并显示变更内容。

工作流处理：版本检测（本地/全局）、npm 版本检查、变更日志获取与显示、用户确认及全新安装警告、执行更新与缓存清除、重启提醒。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/update.md
</execution_context>

<process>
执行 @~/.claude/get-shit-done/workflows/update.md，该工作流处理全部逻辑。
</process>
