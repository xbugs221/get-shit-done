<purpose>
列出所有待处理的待办事项，允许选择，加载所选待办事项的完整上下文，并路由到适当的操作。
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

从初始化 JSON 中提取：`todo_count`、`todos`、`pending_dir`。

如果 `todo_count` 为 0：
```
No pending todos.

Todos are captured during work sessions with /gsd:add-todo.

---

Would you like to:

1. Continue with current phase (/gsd:progress)
2. Add a todo now (/gsd:add-todo)
```

退出。
</step>

<step name="parse_filter">
检查参数中的区域过滤器：
- `/gsd:check-todos` → 显示全部
- `/gsd:check-todos api` → 仅过滤 area:api
</step>

<step name="list_todos">
使用初始化上下文中的 `todos` 数组（如果指定了区域则已过滤）。

解析并显示为编号列表：

```
Pending Todos:

1. Add auth token refresh (api, 2d ago)
2. Fix modal z-index issue (ui, 1d ago)
3. Refactor database connection pool (database, 5h ago)

---

Reply with a number to view details, or:
- `/gsd:check-todos [area]` to filter by area
- `q` to exit
```

将创建时间戳格式化为相对时间。
</step>

<step name="handle_selection">
等待用户回复一个数字。

如果有效：加载选中的待办事项，继续处理。
如果无效："Invalid selection. Reply with a number (1-[N]) or `q` to exit."
</step>

<step name="load_context">
完整读取待办事项文件。显示：

```
## [title]

**Area:** [area]
**Created:** [date] ([relative time] ago)
**Files:** [list or "None"]

### Problem
[problem section content]

### Solution
[solution section content]
```

如果 `files` 字段有条目，读取并简要概述每个文件。
</step>

<step name="check_roadmap">
检查路线图（可使用初始化进度或直接检查文件是否存在）：

如果 `.planning/ROADMAP.md` 存在：
1. 检查待办事项的区域是否匹配即将到来的阶段
2. 检查待办事项的文件是否与某个阶段的范围重叠
3. 记录任何匹配项以用于操作选项
</step>

<step name="offer_actions">
**如果待办事项映射到路线图阶段：**

使用 AskUserQuestion：
- header: "Action"
- question: "This todo relates to Phase [N]: [name]. What would you like to do?"
- options:
  - "Work on it now" — 移至已完成，开始工作
  - "Add to phase plan" — 在规划阶段 [N] 时包含
  - "Brainstorm approach" — 在决定前先思考方案
  - "Put it back" — 返回列表

**如果没有路线图匹配：**

使用 AskUserQuestion：
- header: "Action"
- question: "What would you like to do with this todo?"
- options:
  - "Work on it now" — 移至已完成，开始工作
  - "Create a phase" — 以此范围执行 /gsd:add-phase
  - "Brainstorm approach" — 在决定前先思考方案
  - "Put it back" — 返回列表
</step>

<step name="execute_action">
**Work on it now：**
```bash
mv ".planning/todos/pending/[filename]" ".planning/todos/done/"
```
更新 STATE.md 待办事项计数。展示问题/解决方案上下文。开始工作或询问如何继续。

**Add to phase plan：**
在阶段规划笔记中记录待办事项引用。保留在待处理中。返回列表或退出。

**Create a phase：**
显示：`/gsd:add-phase [description from todo]`
保留在待处理中。用户在新的上下文窗口中运行命令。

**Brainstorm approach：**
保留在待处理中。开始讨论问题和方案。

**Put it back：**
返回 list_todos 步骤。
</step>

<step name="update_state">
在任何改变待办事项数量的操作之后：

重新运行 `init todos` 获取更新的计数，然后更新 STATE.md 中 "### Pending Todos" 部分（如果存在）。
</step>

<step name="git_commit">
如果待办事项被移至 done/，提交更改：

```bash
git rm --cached .planning/todos/pending/[filename] 2>/dev/null || true
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs: start work on todo - [title]" --files .planning/todos/done/[filename] .planning/STATE.md
```

工具自动遵守 `commit_docs` 配置和 gitignore。

确认："Committed: docs: start work on todo - [title]"
</step>

</process>

<success_criteria>
- [ ] 所有待处理的待办事项已列出，包含标题、区域和时间
- [ ] 如果指定了区域过滤器则已应用
- [ ] 选中待办事项的完整上下文已加载
- [ ] 已检查路线图上下文以匹配阶段
- [ ] 提供了适当的操作选项
- [ ] 选中的操作已执行
- [ ] 如果待办事项数量变化则 STATE.md 已更新
- [ ] 如果待办事项移至 done/ 则更改已提交到 git
</success_criteria>
