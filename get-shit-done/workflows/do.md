<purpose>
分析用户的自由文本并路由到最合适的 GSD 命令。这是一个调度器 — 它自身从不执行工作。将用户意图匹配到最佳命令，确认路由，然后移交。
</purpose>

<required_reading>
在开始之前，请先读取调用提示的 execution_context 中引用的所有文件。
</required_reading>

<process>

<step name="validate">
**检查输入。**

如果 `$ARGUMENTS` 为空，使用 AskUserQuestion 询问：

```
你想做什么？描述任务、bug 或想法，我会将其路由到正确的 GSD 命令。
```

等待回复后再继续。
</step>

<step name="check_project">
**检查项目是否存在。**

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" state load 2>/dev/null)
```

跟踪 `.planning/` 是否存在 — 某些路由需要它，某些不需要。
</step>

<step name="route">
**将意图匹配到命令。**

根据以下路由规则评估 `$ARGUMENTS`。应用**第一个匹配的**规则：

| 如果文本描述的是... | 路由到 | 原因 |
|--------------------------|----------|-----|
| 启动新项目、"set up"、"initialize" | `/gsd:new-project` | 需要完整的项目初始化 |
| 映射或分析现有代码库 | `/gsd:map-codebase` | 代码库发现 |
| bug、错误、崩溃、失败或某些损坏 | `/gsd:debug` | 需要系统性调查 |
| 探索、研究、比较或"X 是怎么工作的" | `/gsd:research-phase` | 规划前的领域研究 |
| 讨论愿景、"X 应该怎么做"、头脑风暴 | `/gsd:discuss-phase` | 需要上下文收集 |
| 复杂任务：重构、迁移、多文件架构、系统重新设计 | `/gsd:add-phase` | 需要完整的阶段与规划/构建周期 |
| 规划特定阶段或"plan phase N" | `/gsd:plan-phase` | 直接规划请求 |
| 执行阶段或"build phase N"、"run phase N" | `/gsd:execute-phase` | 直接执行请求 |
| 自动运行所有剩余阶段 | `/gsd:autonomous` | 完全自主执行 |
| 对已有工作的审查或质量关注 | `/gsd:verify-work` | 需要验证 |
| 查看进度、状态、"我在哪里" | `/gsd:progress` | 状态检查 |
| 恢复工作、"接着上次继续" | `/gsd:resume-work` | 会话恢复 |
| 笔记、想法或"记得要..." | `/gsd:add-todo` | 记录以备后用 |
| 添加测试、"写测试"、"测试覆盖" | `/gsd:add-tests` | 测试生成 |
| 完成里程碑、发布、上线 | `/gsd:complete-milestone` | 里程碑生命周期 |
| 具体的、可操作的小任务（添加功能、修复错别字、更新配置） | `/gsd:quick` | 自包含的单次执行 |

**需要 `.planning/` 目录：** 除 `/gsd:new-project`、`/gsd:map-codebase`、`/gsd:help` 和 `/gsd:join-discord` 外的所有路由。如果项目不存在且路由需要它，建议先运行 `/gsd:new-project`。

**歧义处理：** 如果文本可以合理匹配多个路由，使用 AskUserQuestion 向用户展示前 2-3 个选项。例如：

```
"重构认证系统" 可以是：
1. /gsd:add-phase — 完整规划周期（推荐用于多文件重构）
2. /gsd:quick — 快速执行（如果范围小且明确）

哪种方式更合适？
```
</step>

<step name="display">
**显示路由决策。**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 路由中
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**输入：** {$ARGUMENTS 的前 80 个字符}
**路由到：** {选择的命令}
**原因：** {一行解释}
```
</step>

<step name="dispatch">
**调用选择的命令。**

运行选定的 `/gsd:*` 命令，将 `$ARGUMENTS` 作为参数传递。

如果选择的命令需要阶段编号但文本中未提供，从上下文中提取或使用 AskUserQuestion 询问。

调用命令后停止。被调度的命令从此处接管所有工作。
</step>

</process>

<success_criteria>
- [ ] 输入已验证（非空）
- [ ] 意图匹配到恰好一个 GSD 命令
- [ ] 歧义已通过用户问题解决（如需要）
- [ ] 对需要项目的路由检查了项目是否存在
- [ ] 调度前显示路由决策
- [ ] 使用适当参数调用命令
- [ ] 未直接执行任何工作 — 仅作为调度器
</success_criteria>
</output>
