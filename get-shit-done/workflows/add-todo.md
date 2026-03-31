<purpose>
将 GSD 会话中出现的想法、任务或问题捕获为结构化的待办事项以供后续处理。实现"想法 → 捕获 → 继续"的工作流，不丢失上下文。
</purpose>

<required_reading>
在开始之前，读取调用提示的 execution_context 中引用的所有文件。
</required_reading>

<process>

<step name="init_context">
加载待办事项上下文：

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init todos)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

从初始化 JSON 中提取：`commit_docs`、`date`、`timestamp`、`todo_count`、`todos`、`pending_dir`、`todos_dir_exists`。

确保目录存在：
```bash
mkdir -p .planning/todos/pending .planning/todos/done
```

记录 todos 数组中的现有区域，以在 infer_area 步骤中保持一致性。
</step>

<step name="extract_content">
**带参数时：** 使用参数作为标题/焦点。
- `/gsd:add-todo Add auth token refresh` → title = "Add auth token refresh"

**不带参数时：** 分析最近的对话以提取：
- 讨论的具体问题、想法或任务
- 提到的相关文件路径
- 技术细节（错误消息、行号、约束条件）

整理为：
- `title`：3-10 个单词的描述性标题（优先使用动词开头）
- `problem`：问题所在或为什么需要这样做
- `solution`：方案提示或 "TBD"（如果只是一个想法）
- `files`：对话中提到的相关路径及行号
</step>

<step name="infer_area">
从文件路径推断区域：

| 路径模式 | 区域 |
|--------------|------|
| `src/api/*`, `api/*` | `api` |
| `src/components/*`, `src/ui/*` | `ui` |
| `src/auth/*`, `auth/*` | `auth` |
| `src/db/*`, `database/*` | `database` |
| `tests/*`, `__tests__/*` | `testing` |
| `docs/*` | `docs` |
| `.planning/*` | `planning` |
| `scripts/*`, `bin/*` | `tooling` |
| 无文件或不明确 | `general` |

如果步骤 2 中存在类似匹配的区域，则使用已有区域。
</step>

<step name="check_duplicates">
```bash
# 在现有待办事项中搜索标题中的关键词
grep -l -i "[key words from title]" .planning/todos/pending/*.md 2>/dev/null || true
```

如果发现潜在重复：
1. 读取现有待办事项
2. 比较范围

如果有重叠，使用 AskUserQuestion：
- header: "Duplicate?"
- question: "Similar todo exists: [title]. What would you like to do?"
- options:
  - "Skip" — 保留现有待办事项
  - "Replace" — 用新上下文更新现有内容
  - "Add anyway" — 创建为单独的待办事项
</step>

<step name="create_file">
使用初始化上下文中的值：`timestamp` 和 `date` 已经可用。

为标题生成 slug：
```bash
slug=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" generate-slug "$title" --raw)
```

写入 `.planning/todos/pending/${date}-${slug}.md`：

```markdown
---
created: [timestamp]
title: [title]
area: [area]
files:
  - [file:lines]
---

## Problem

[问题描述 - 足够的上下文让未来的 Claude 在数周后仍能理解]

## Solution

[方案提示或 "TBD"]
```
</step>

<step name="update_state">
如果 `.planning/STATE.md` 存在：

1. 使用初始化上下文中的 `todo_count`（或者如果计数已变化则重新运行 `init todos`）
2. 更新 "## Accumulated Context" 下的 "### Pending Todos"
</step>

<step name="git_commit">
提交待办事项和任何更新的状态：

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs: capture todo - [title]" --files .planning/todos/pending/[filename] .planning/STATE.md
```

工具自动遵守 `commit_docs` 配置和 gitignore。

确认："Committed: docs: capture todo - [title]"
</step>

<step name="confirm">
```
Todo saved: .planning/todos/pending/[filename]

  [title]
  Area: [area]
  Files: [count] referenced

---

Would you like to:

1. Continue with current work
2. Add another todo
3. View all todos (/gsd:check-todos)
```
</step>

</process>

<success_criteria>
- [ ] 目录结构存在
- [ ] 待办事项文件已创建，包含有效的 frontmatter
- [ ] Problem 部分有足够的上下文供未来的 Claude 理解
- [ ] 已检查并解决重复项
- [ ] 区域与现有待办事项保持一致
- [ ] 如果 STATE.md 存在则已更新
- [ ] 待办事项和状态已提交到 git
</success_criteria>
