<purpose>
列出 ~/gsd-workspaces/ 中所有 GSD 工作区及其状态。
</purpose>

<required_reading>
在开始之前，阅读调用提示的 execution_context 中引用的所有文件。
</required_reading>

<process>

## 1. 初始化

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init list-workspaces)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

从 JSON 中解析：`workspace_base`、`workspaces`、`workspace_count`。

## 2. 显示

**如果 `workspace_count` 为 0：**

```
在 ~/gsd-workspaces/ 中未找到工作区

使用以下命令创建一个：
  /gsd:new-workspace --name my-workspace --repos repo1,repo2
```

完成。

**如果存在工作区：**

显示表格：

```
GSD 工作区 (~/gsd-workspaces/)

| 名称 | 仓库数 | 策略 | GSD 项目 |
|------|--------|------|----------|
| feature-a | 3 | worktree | 是 |
| feature-b | 2 | clone | 否 |

管理：
  cd ~/gsd-workspaces/<名称>     # 进入工作区
  /gsd:remove-workspace <名称>   # 移除工作区
```

对每个工作区显示：
- **名称** — 目录名
- **仓库数** — 来自初始化数据的计数
- **策略** — 来自 WORKSPACE.md
- **GSD 项目** — `.planning/PROJECT.md` 是否存在（是/否）

</process>
