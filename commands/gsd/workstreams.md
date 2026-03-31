---
description: 管理并行工作流 — 列出、创建、切换、状态、进度、完成和恢复
---

# /gsd:workstreams

管理并行工作流，用于并发里程碑工作。

## 用法

`/gsd:workstreams [subcommand] [args]`

### 子命令

| 命令 | 描述 |
|---------|-------------|
| `list` | 列出所有工作流及其状态 |
| `create <name>` | 创建新工作流 |
| `status <name>` | 查看单个工作流的详细状态 |
| `switch <name>` | 设置活跃工作流 |
| `progress` | 所有工作流的进度概览 |
| `complete <name>` | 归档已完成的工作流 |
| `resume <name>` | 恢复某个工作流中的工作 |

## 第一步：解析子命令

解析用户输入以确定操作。未给出子命令时默认为 `list`。

## 第二步：执行操作

### list
运行：`node "$GSD_TOOLS" workstream list --raw --cwd "$CWD"`
以表格格式显示工作流的名称、状态、当前阶段和进度。

### create
运行：`node "$GSD_TOOLS" workstream create <name> --raw --cwd "$CWD"`
创建后显示新工作流路径并建议：`/gsd:new-milestone --ws <name>`

### status
运行：`node "$GSD_TOOLS" workstream status <name> --raw --cwd "$CWD"`
显示详细的阶段分解和状态信息。

### switch
运行：`node "$GSD_TOOLS" workstream set <name> --raw --cwd "$CWD"`
同时设置 `GSD_WORKSTREAM` 环境变量。

### progress
运行：`node "$GSD_TOOLS" workstream progress --raw --cwd "$CWD"`
显示所有工作流的进度概览。

### complete
运行：`node "$GSD_TOOLS" workstream complete <name> --raw --cwd "$CWD"`
将工作流归档到 milestones/。

### resume
将工作流设置为活跃状态并建议使用 `/gsd:resume-work --ws <name>`。

## 第三步：显示结果

将 gsd-tools 的 JSON 输出格式化为人类可读的显示，在所有路由建议中包含 `${GSD_WS}` 标志。
