<purpose>
生成会话后总结文档，记录已完成的工作、达成的成果以及估算的资源使用情况。将 SESSION_REPORT.md 写入 .planning/reports/，供人工审查和利益相关方共享。
</purpose>

<required_reading>
在开始之前，阅读调用提示的 execution_context 中引用的所有文件。
</required_reading>

<process>

<step name="gather_session_data">
从可用来源收集会话数据：

1. **STATE.md** — 当前阶段、里程碑、进度、阻塞项、决策
2. **Git 日志** — 本次会话中的提交记录（最近 24 小时或自上次报告以来）
3. **计划/总结文件** — 已执行的计划、已编写的总结
4. **ROADMAP.md** — 里程碑上下文和阶段目标

```bash
# 获取最近的提交记录（最近 24 小时）
git log --oneline --since="24 hours ago" --no-merges 2>/dev/null || echo "No recent commits"

# 统计变更的文件数
git diff --stat HEAD~10 HEAD 2>/dev/null | tail -1 || echo "No diff available"
```

读取 `.planning/STATE.md` 以获取：
- 当前里程碑和阶段
- 进度百分比
- 活跃的阻塞项
- 最近的决策

读取 `.planning/ROADMAP.md` 以获取里程碑名称和目标。

检查是否存在历史报告：
```bash
ls -la .planning/reports/SESSION_REPORT*.md 2>/dev/null || echo "No previous reports"
```
</step>

<step name="estimate_usage">
通过可观察的信号估算 token 用量：

- 工具调用次数无法直接获取，因此根据 git 活动和文件操作进行估算
- 注意：这是一个**估算值** — 精确的 token 计数需要 API 级别的检测工具，而钩子无法提供

估算启发式规则：
- 每次提交 ≈ 1 个计划周期（调研 + 计划 + 执行 + 验证）
- 每个计划文件 ≈ 2,000-5,000 token 的 agent 上下文
- 每个总结文件 ≈ 1,000-2,000 token 的生成内容
- 子 agent 的启动使每种 agent 类型的开销约乘以 ~1.5 倍
</step>

<step name="generate_report">
创建报告目录和文件：

```bash
mkdir -p .planning/reports
```

写入 `.planning/reports/SESSION_REPORT.md`（如果已存在历史报告则使用 `.planning/reports/YYYYMMDD-session-report.md`）：

```markdown
# GSD 会话报告

**生成时间：** [时间戳]
**项目：** [来自 PROJECT.md 标题或目录名]
**里程碑：** [N] — [来自 ROADMAP.md 的里程碑名称]

---

## 会话摘要

**持续时间：** [根据第一次和最后一次提交的时间戳估算，或"单次会话"]
**阶段进度：** [来自 STATE.md]
**已执行计划数：** [本次会话中编写的总结数量]
**提交次数：** [来自 git log 的计数]

## 已完成的工作

### 涉及的阶段
[列出已处理的阶段及简要说明完成了什么]

### 关键成果
[具体交付物的项目符号列表：创建的文件、实现的功能、修复的缺陷]

### 已做出的决策
[来自 STATE.md 的决策表，如果本次会话有新增的话]

## 变更的文件

[已修改、创建、删除的文件摘要 — 来自 git diff stat]

## 阻塞项与待办事项

[来自 STATE.md 的活跃阻塞项]
[会话期间创建的任何 TODO 事项]

## 估算的资源使用

| 指标 | 估算值 |
|------|--------|
| 提交次数 | [N] |
| 变更文件数 | [N] |
| 已执行计划数 | [N] |
| 启动的子 agent 数 | [估算值] |

> **注意：** Token 和成本估算需要 API 级别的检测工具。
> 这些指标仅反映可观察的会话活动。

---

*由 `/gsd:session-report` 生成*
```
</step>

<step name="display_result">
向用户展示：

```
## 会话报告已生成

📄 `.planning/reports/[文件名].md`

### 要点
- **提交次数：** [N]
- **变更文件数：** [N]
- **阶段进度：** [X]%
- **已执行计划数：** [N]
```

如果这是第一份报告，提示：
```
💡 在每次会话结束时运行 `/gsd:session-report`，以积累项目活动的历史记录。
```
</step>

</process>

<success_criteria>
- [ ] 从 STATE.md、git log 和计划文件中收集了会话数据
- [ ] 报告已写入 .planning/reports/
- [ ] 报告包含工作摘要、成果和文件变更
- [ ] 文件名包含日期以防止覆盖
- [ ] 向用户展示了结果摘要
</success_criteria>
