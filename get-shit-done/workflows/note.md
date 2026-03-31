<purpose>
零摩擦的想法捕获。一次写入调用，一行确认。没有提问，没有提示。
内联运行——不使用 Task、AskUserQuestion 或 Bash。
</purpose>

<required_reading>
在开始之前，阅读调用提示的 execution_context 中引用的所有文件。
</required_reading>

<process>

<step name="storage_format">
**笔记存储格式。**

笔记以单独的 markdown 文件存储：

- **项目范围**：`.planning/notes/{YYYY-MM-DD}-{slug}.md` — 当当前目录存在 `.planning/` 时使用
- **全局范围**：`~/.claude/notes/{YYYY-MM-DD}-{slug}.md` — 没有 `.planning/` 时的回退，或当存在 `--global` 标志时使用

每个笔记文件：

```markdown
---
date: "YYYY-MM-DD HH:mm"
promoted: false
---

{笔记文本原样}
```

**`--global` 标志**：从 `$ARGUMENTS` 的任意位置去除 `--global`。存在时，无论 `.planning/` 是否存在，强制使用全局范围。

**重要**：如果 `.planning/` 不存在，不要创建它。静默回退到全局范围。
</step>

<step name="parse_subcommand">
**从 $ARGUMENTS 解析子命令（去除 --global 之后）。**

| 条件 | 子命令 |
|-----------|------------|
| 参数恰好为 `list`（不区分大小写） | **list** |
| 参数恰好为 `promote <N>`，其中 N 为数字 | **promote** |
| 参数为空（完全没有文本） | **list** |
| 其他任何情况 | **append**（文本本身就是笔记） |

**关键**：`list` 只有在作为整个参数时才是子命令。`/gsd:note list of groceries` 保存的笔记文本为"list of groceries"。`promote` 同理——只有后面恰好跟一个数字时才是子命令。
</step>

<step name="append">
**子命令：append — 创建带时间戳的笔记文件。**

1. 按上述存储格式确定范围（项目或全局）
2. 确保笔记目录存在（`.planning/notes/` 或 `~/.claude/notes/`）
3. 生成 slug：笔记文本的前约 4 个有意义的单词，小写，连字符分隔（去除开头的冠词/介词）
4. 生成文件名：`{YYYY-MM-DD}-{slug}.md`
   - 如果同名文件已存在，追加 `-2`、`-3` 等
5. 写入文件，包含 frontmatter 和笔记文本（参见存储格式）
6. 用恰好一行确认：`Noted ({scope}): {note text}`
   - 其中 `{scope}` 为 "project" 或 "global"

**约束：**
- **永远不要修改笔记文本** — 原样捕获，包括拼写错误
- **永远不要询问** — 直接写入并确认
- **时间戳格式**：使用本地时间，`YYYY-MM-DD HH:mm`（24 小时制，无秒）
</step>

<step name="list">
**子命令：list — 显示两个范围的笔记。**

1. 搜索 `.planning/notes/*.md`（如果目录存在）— 项目笔记
2. 搜索 `~/.claude/notes/*.md`（如果目录存在）— 全局笔记
3. 对于每个文件，读取 frontmatter 获取 `date` 和 `promoted` 状态
4. 将 `promoted: true` 的文件从活跃计数中排除（但仍然显示，以淡化样式）
5. 按日期排序，从 1 开始对所有活跃条目进行顺序编号
6. 如果活跃条目总数 > 20，仅显示最后 10 条，并注明省略了多少条

**显示格式：**

```
笔记：

项目 (.planning/notes/)：
  1. [2026-02-08 14:32] refactor the hook system to support async validators
  2. [已提升] [2026-02-08 14:40] add rate limiting to the API endpoints
  3. [2026-02-08 15:10] consider adding a --dry-run flag to build

全局 (~/.claude/notes/)：
  4. [2026-02-08 10:00] cross-project idea about shared config

{count} 条活跃笔记。使用 `/gsd:note promote <N>` 转换为待办事项。
```

如果某个范围没有目录或没有条目，显示：`（无笔记）`
</step>

<step name="promote">
**子命令：promote — 将笔记转换为待办事项。**

1. 运行 **list** 逻辑构建编号索引（两个范围）
2. 从编号列表中找到条目 N
3. 如果 N 无效或指向已提升的笔记，告知用户并停止
4. **需要 `.planning/` 目录** — 如果不存在，警告："待办事项需要 GSD 项目。运行 `/gsd:new-project` 来初始化一个。"
5. 确保 `.planning/todos/pending/` 目录存在
6. 生成待办事项 ID：`{NNN}-{slug}`，其中 NNN 是下一个序号（扫描 `.planning/todos/pending/` 和 `.planning/todos/done/` 中最大的现有编号，加 1，零填充到 3 位）slug 是笔记文本的前约 4 个有意义的单词
7. 从源文件中提取笔记文本（frontmatter 之后的正文）
8. 创建 `.planning/todos/pending/{id}.md`：

```yaml
---
title: "{笔记文本}"
status: pending
priority: P2
source: "promoted from /gsd:note"
created: {YYYY-MM-DD}
theme: general
---

## 目标

{笔记文本}

## 上下文

从 {原始日期} 捕获的快速笔记中提升。

## 验收标准

- [ ] {从笔记文本推导的主要标准}
```

9. 将源笔记文件标记为已提升：将其 frontmatter 更新为 `promoted: true`
10. 确认：`已提升笔记 {N} 为待办事项 {id}：{note text}`
</step>

</process>

<edge_cases>
1. **"list" 作为笔记文本**：`/gsd:note list of things` 保存笔记 "list of things"（仅当 `list` 是整个参数时才是子命令）
2. **没有 `.planning/`**：回退到全局 `~/.claude/notes/` — 在任何目录下都有效
3. **没有项目时提升**：警告待办事项需要 `.planning/`，建议 `/gsd:new-project`
4. **大量文件**：活跃条目 > 20 时 `list` 显示最后 10 条
5. **重复 slug**：如果同一日期的 slug 已被使用，在文件名后追加 `-2`、`-3` 等
6. **`--global` 位置**：从任意位置去除——`--global my idea` 和 `my idea --global` 都保存 "my idea" 到全局
7. **提升已提升的笔记**：告知用户 "笔记 {N} 已经被提升" 并停止
8. **去除标志后笔记文本为空**：视为 `list` 子命令
</edge_cases>

<success_criteria>
- [ ] Append：笔记文件已写入，包含正确的 frontmatter 和原样文本
- [ ] Append：没有询问任何问题——即时捕获
- [ ] List：两个范围都已显示，带有顺序编号
- [ ] List：已提升的笔记以淡化样式显示
- [ ] Promote：待办事项以正确格式创建
- [ ] Promote：源笔记已标记为已提升
- [ ] 全局回退：没有 `.planning/` 时也能工作
</success_criteria>
</output>
