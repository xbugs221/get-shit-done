---
name: gsd:new-workspace
description: 创建包含仓库副本和独立 .planning/ 的隔离工作区
argument-hint: "--name <名称> [--repos repo1,repo2] [--path /目标路径] [--strategy worktree|clone] [--branch 分支名] [--auto]"
allowed-tools:
  - Read
  - Bash
  - Write
  - AskUserQuestion
---
<context>
**标志：**
- `--name`（必需） — 工作区名称
- `--repos` — 逗号分隔的仓库路径或名称。省略则从当前目录下的子 git 仓库中交互式选择
- `--path` — 目标目录，默认 `~/gsd-workspaces/<name>`
- `--strategy` — `worktree`（默认，轻量级）或 `clone`（完全独立）
- `--branch` — 检出分支，默认 `workspace/<name>`
- `--auto` — 跳过交互式问题，使用默认值
</context>

<objective>
创建工作区目录，包含指定 git 仓库的副本（worktree 或 clone），并带独立 `.planning/` 用于隔离 GSD 会话。

**使用场景：**
- 多仓库编排：在仓库子集上并行工作，具有隔离的 GSD 状态
- 功能分支隔离：为当前仓库创建带独立 `.planning/` 的 worktree

**创建：**
- `<path>/WORKSPACE.md` — 工作区清单
- `<path>/.planning/` — 独立规划目录
- `<path>/<repo>/` — 每个仓库的 git worktree 或 clone

**此命令之后：** `cd` 进入工作区并运行 `/gsd:new-project`。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/new-workspace.md
@~/.claude/get-shit-done/references/ui-brand.md
</execution_context>

<process>
端到端执行 @~/.claude/get-shit-done/workflows/new-workspace.md 工作流。
保留所有工作流门控（验证、审批、提交、路由）。
</process>
