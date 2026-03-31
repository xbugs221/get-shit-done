<purpose>
创建一个隔离的工作区目录，包含 git 仓库副本（工作树或克隆）和独立的 `.planning/` 目录。支持多仓库编排和单仓库特性分支隔离。
</purpose>

<required_reading>
在开始之前，阅读调用提示的 execution_context 中引用的所有文件。
</required_reading>

<process>

## 1. 初始化

**强制第一步 — 执行 init 命令：**

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init new-workspace)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

从 JSON 中解析：`default_workspace_base`、`child_repos`、`child_repo_count`、`worktree_available`、`is_git_repo`、`cwd_repo_name`、`project_root`。

## 2. 解析参数

从 $ARGUMENTS 中提取：
- `--name` → `WORKSPACE_NAME`（必填）
- `--repos` → `REPO_LIST`（逗号分隔的路径或名称）
- `--path` → `TARGET_PATH`（默认为 `$default_workspace_base/$WORKSPACE_NAME`）
- `--strategy` → `STRATEGY`（默认为 `worktree`）
- `--branch` → `BRANCH_NAME`（默认为 `workspace/$WORKSPACE_NAME`）
- `--auto` → 跳过交互式问题

**如果缺少 `--name` 且不是 `--auto`：**

使用 AskUserQuestion：
- header: "工作区名称"
- question: "这个工作区应该叫什么？"
- requireAnswer: true

## 3. 选择仓库

**如果提供了 `--repos`：** 解析逗号分隔的值。对每个值：
- 如果是绝对路径，直接使用
- 如果是相对路径或名称，相对于 `$project_root` 解析
- 特殊情况：`.` 表示当前仓库（使用 `$project_root`，命名为 `$cwd_repo_name`）

**如果未提供 `--repos` 且不是 `--auto`：**

**如果 `child_repo_count` > 0：**

展示子仓库供选择：

使用 AskUserQuestion：
- header: "选择仓库"
- question: "哪些仓库应包含在工作区中？"
- options: 按名称列出 `child_repos` 数组中的每个子仓库
- multiSelect: true

**如果 `child_repo_count` 为 0 且 `is_git_repo` 为 true：**

使用 AskUserQuestion：
- header: "当前仓库"
- question: "未找到子仓库。使用当前仓库创建工作区？"
- options:
  - "是 — 使用当前仓库创建工作区" → 使用当前仓库
  - "取消" → 退出

**如果 `child_repo_count` 为 0 且 `is_git_repo` 为 false：**

错误：
```
在当前目录中未找到 git 仓库，且这不是一个 git 仓库。

请从包含 git 仓库的目录运行此命令，或显式指定仓库：
  /gsd:new-workspace --name my-workspace --repos /path/to/repo1,/path/to/repo2
```
退出。

**如果 `--auto` 且未提供 `--repos`：**

错误：
```
错误: --auto 需要 --repos 来指定要包含的仓库。

用法：
  /gsd:new-workspace --name my-workspace --repos repo1,repo2 --auto
```
退出。

## 4. 选择策略

**如果提供了 `--strategy`：** 使用它（验证：必须是 `worktree` 或 `clone`）。

**如果未提供 `--strategy` 且不是 `--auto`：**

使用 AskUserQuestion：
- header: "策略"
- question: "仓库应如何复制到工作区？"
- options:
  - "工作树（推荐）— 轻量级，与源仓库共享 .git 对象" → `worktree`
  - "克隆 — 完全独立的副本，与源仓库无关联" → `clone`

**如果 `--auto`：** 默认使用 `worktree`。

## 5. 验证

在创建任何内容之前，进行验证：

1. **目标路径** — 必须不存在或为空：
```bash
if [ -d "$TARGET_PATH" ] && [ "$(ls -A "$TARGET_PATH" 2>/dev/null)" ]; then
  echo "错误: 目标路径已存在且不为空: $TARGET_PATH"
  echo "请选择不同的 --name 或 --path。"
  exit 1
fi
```

2. **源仓库存在且是 git 仓库** — 对每个仓库路径：
```bash
if [ ! -d "$REPO_PATH/.git" ]; then
  echo "错误: 不是 git 仓库: $REPO_PATH"
  exit 1
fi
```

3. **工作树可用性** — 如果策略为 `worktree` 且 `worktree_available` 为 false：
```
错误: git 不可用。请安装 git 或使用 --strategy clone。
```

一次性报告所有验证错误，而不是逐个报告。

## 6. 创建工作区

```bash
mkdir -p "$TARGET_PATH"
```

### 对每个仓库：

**工作树策略：**
```bash
cd "$SOURCE_REPO_PATH"
git worktree add "$TARGET_PATH/$REPO_NAME" -b "$BRANCH_NAME" 2>&1
```

如果 `git worktree add` 因分支已存在而失败，尝试使用带时间戳的分支：
```bash
TIMESTAMP=$(date +%Y%m%d%H%M%S)
git worktree add "$TARGET_PATH/$REPO_NAME" -b "${BRANCH_NAME}-${TIMESTAMP}" 2>&1
```

如果仍然失败，报告错误并继续处理剩余的仓库。

**克隆策略：**
```bash
git clone "$SOURCE_REPO_PATH" "$TARGET_PATH/$REPO_NAME" 2>&1
cd "$TARGET_PATH/$REPO_NAME"
git checkout -b "$BRANCH_NAME" 2>&1
```

追踪结果：哪些仓库成功了，哪些失败了，使用了什么分支。

## 7. 编写 WORKSPACE.md

在 `$TARGET_PATH/WORKSPACE.md` 写入工作区清单：

```markdown
# 工作区: $WORKSPACE_NAME

创建时间: $DATE
策略: $STRATEGY

## 成员仓库

| 仓库 | 来源 | 分支 | 策略 |
|------|------|------|------|
| $REPO_NAME | $SOURCE_PATH | $BRANCH | $STRATEGY |
...对每个仓库...

## 备注

[添加关于此工作区用途的说明]
```

## 8. 初始化 .planning/

```bash
mkdir -p "$TARGET_PATH/.planning"
```

## 9. 报告和后续步骤

**如果所有仓库都成功：**

```
工作区已创建: $TARGET_PATH

  仓库数: $REPO_COUNT
  策略: $STRATEGY
  分支: $BRANCH_NAME

后续步骤：
  cd $TARGET_PATH
  /gsd:new-project    # 在工作区中初始化 GSD
```

**如果部分仓库失败：**

```
工作区已创建，$TOTAL_COUNT 个仓库中有 $SUCCESS_COUNT 个成功: $TARGET_PATH

  成功: repo1, repo2
  失败: repo3 (分支已存在), repo4 (不是 git 仓库)

后续步骤：
  cd $TARGET_PATH
  /gsd:new-project    # 在工作区中初始化 GSD
```

**提供初始化 GSD 的选项（如果不是 `--auto`）：**

使用 AskUserQuestion：
- header: "初始化 GSD"
- question: "要在新工作区中初始化 GSD 项目吗？"
- options:
  - "是 — 运行 /gsd:new-project" → 告诉用户先 `cd $TARGET_PATH`，然后运行 `/gsd:new-project`
  - "否 — 我稍后再设置" → 完成

</process>

<success_criteria>
- [ ] 在目标路径创建了工作区目录
- [ ] 所有指定的仓库已复制（工作树或克隆）到工作区
- [ ] WORKSPACE.md 清单已写入，包含正确的仓库表
- [ ] `.planning/` 目录已在工作区根目录初始化
- [ ] 用户已被告知工作区路径和后续步骤
</success_criteria>
