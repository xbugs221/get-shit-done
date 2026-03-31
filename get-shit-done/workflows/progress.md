<purpose>
检查项目进度，总结近期工作和待办事项，然后智能路由到下一个操作——执行现有计划或创建下一个计划。在继续工作前提供态势感知。
</purpose>

<required_reading>
在开始之前，阅读调用提示的 execution_context 中引用的所有文件。
</required_reading>

<process>

<step name="init_context">
**加载进度上下文（仅路径）：**

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init progress)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

从 init JSON 中提取：`project_exists`、`roadmap_exists`、`state_exists`、`phases`、`current_phase`、`next_phase`、`milestone_version`、`completed_count`、`phase_count`、`paused_at`、`state_path`、`roadmap_path`、`project_path`、`config_path`。

```bash
DISCUSS_MODE=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow.discuss_mode 2>/dev/null || echo "discuss")
```

如果 `project_exists` 为 false（不存在 `.planning/` 目录）：

```
未找到规划结构。

运行 /gsd:new-project 开始新项目。
```

退出。

如果缺少 STATE.md：建议 `/gsd:new-project`。

**如果缺少 ROADMAP.md 但存在 PROJECT.md：**

这意味着里程碑已完成并归档。进入**路由 F**（里程碑间歇期）。

如果同时缺少 ROADMAP.md 和 PROJECT.md：建议 `/gsd:new-project`。
</step>

<step name="load">
**使用 gsd-tools 的结构化提取：**

不读取完整文件，而是使用针对性工具仅获取报告所需的数据：
- `ROADMAP=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" roadmap analyze)`
- `STATE=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" state-snapshot)`

这最大限度减少编排器的上下文使用。
</step>

<step name="analyze_roadmap">
**获取全面的路线图分析（替代手动解析）：**

```bash
ROADMAP=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" roadmap analyze)
```

返回结构化 JSON，包含：
- 所有阶段的磁盘状态（complete/partial/planned/empty/no_directory）
- 每个阶段的目标和依赖
- 每个阶段的计划和摘要数量
- 汇总统计：总计划数、摘要数、进度百分比
- 当前和下一个阶段的识别

使用此数据代替手动读取/解析 ROADMAP.md。
</step>

<step name="recent">
**收集近期工作上下文：**

- 找到最近的 2-3 个 SUMMARY.md 文件
- 使用 `summary-extract` 高效解析：
  ```bash
  node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" summary-extract <path> --fields one_liner
  ```
- 这显示了"我们最近在做什么"
  </step>

<step name="position">
**从 init 上下文和路线图分析中解析当前位置：**

- 使用 `$ROADMAP` 中的 `current_phase` 和 `next_phase`
- 注意 `$STATE` 中的 `paused_at`（如果工作被暂停）
- 统计待处理待办事项：使用 `init todos` 或 `list-todos`
- 检查活跃的调试会话：`(ls .planning/debug/*.md 2>/dev/null || true) | grep -v resolved | wc -l`
  </step>

<step name="report">
**从 gsd-tools 生成进度条，然后呈现丰富的状态报告：**

```bash
# 获取格式化的进度条
PROGRESS_BAR=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" progress bar --raw)
```

呈现：

```
# [项目名称]

**进度：**{PROGRESS_BAR}
**配置：**[quality/balanced/budget/inherit]
**讨论模式：**{DISCUSS_MODE}

## 近期工作
- [阶段 X，计划 Y]：[完成内容 - 来自 summary-extract 的一行摘要]
- [阶段 X，计划 Z]：[完成内容 - 来自 summary-extract 的一行摘要]

## 当前位置
阶段 [N] / [总计]：[阶段名称]
计划 [M] / [阶段总计]：[状态]
上下文：[✓ 如果有 has_context | - 如果没有]

## 已做出的关键决策
- [从 $STATE.decisions[] 提取]
- [例如 jq -r '.decisions[].decision' from state-snapshot]

## 阻塞/问题
- [从 $STATE.blockers[] 提取]
- [例如 jq -r '.blockers[].text' from state-snapshot]

## 待处理待办
- [数量] 待处理 — /gsd:check-todos 查看

## 活跃调试会话
- [数量] 活跃 — /gsd:debug 继续
（仅在数量 > 0 时显示此部分）

## 下一步
[来自路线图分析的下一个阶段/计划目标]
```

</step>

<step name="route">
**根据验证后的数量确定下一步操作。**

**步骤 1：统计当前阶段的计划、摘要和问题**

列出当前阶段目录中的文件：

```bash
(ls -1 .planning/phases/[current-phase-dir]/*-PLAN.md 2>/dev/null || true) | wc -l
(ls -1 .planning/phases/[current-phase-dir]/*-SUMMARY.md 2>/dev/null || true) | wc -l
(ls -1 .planning/phases/[current-phase-dir]/*-UAT.md 2>/dev/null || true) | wc -l
```

说明："此阶段有 {X} 个计划，{Y} 个摘要。"

**步骤 1.5：检查未处理的 UAT 差距**

检查状态为"diagnosed"（有需要修复的差距）的 UAT.md 文件。

```bash
# 检查已诊断的 UAT（有差距）或部分完成的（不完整的）测试
grep -l "status: diagnosed\|status: partial" .planning/phases/[current-phase-dir]/*-UAT.md 2>/dev/null || true
```

跟踪：
- `uat_with_gaps`：状态为"diagnosed"的 UAT.md 文件（差距需要修复）
- `uat_partial`：状态为"partial"的 UAT.md 文件（不完整的测试）

**步骤 1.6：跨阶段健康检查**

使用 CLI 扫描当前里程碑中所有阶段的未完成验证债务（CLI 通过 `getMilestonePhaseFilter` 尊重里程碑边界）：

```bash
DEBT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" audit-uat --raw 2>/dev/null)
```

从 JSON 解析 `summary.total_items` 和 `summary.total_files`。

跟踪：`outstanding_debt` — 来自审计的 `summary.total_items`。

**如果 outstanding_debt > 0：**在进度报告输出（`report` 步骤中）添加警告部分，放在"## 下一步"和路由建议之间：

```markdown
## 验证债务（{N} 个文件跨越先前阶段）

| 阶段 | 文件 | 问题 |
|------|------|------|
| {phase} | {filename} | {pending_count} 待处理，{skipped_count} 已跳过，{blocked_count} 已阻塞 |
| {phase} | {filename} | human_needed — {count} 项 |

审查：`/gsd:audit-uat ${GSD_WS}` — 全面跨阶段审计
恢复测试：`/gsd:verify-work {phase} ${GSD_WS}` — 重新测试特定阶段
```

这是一个警告，而非阻塞——路由正常继续。债务可见，以便用户做出明智选择。

**步骤 2：根据数量进行路由**

| 条件 | 含义 | 操作 |
|------|------|------|
| uat_partial > 0 | UAT 测试不完整 | 进入**路由 E.2** |
| uat_with_gaps > 0 | UAT 差距需要修复计划 | 进入**路由 E** |
| summaries < plans | 存在未执行的计划 | 进入**路由 A** |
| summaries = plans 且 plans > 0 | 阶段完成 | 进入步骤 3 |
| plans = 0 | 阶段尚未规划 | 进入**路由 B** |

---

**路由 A：存在未执行的计划**

找到第一个没有对应 SUMMARY.md 的 PLAN.md。
读取其 `<objective>` 部分。

```
---

## ▶ 下一步

**{phase}-{plan}：[计划名称]** — [来自 PLAN.md 的目标摘要]

`/gsd:execute-phase {phase} ${GSD_WS}`

<sub>`/clear` 先清理 → 全新上下文窗口</sub>

---
```

---

**路由 B：阶段需要规划**

检查阶段目录中是否存在 `{phase_num}-CONTEXT.md`。

检查当前阶段是否有 UI 指示：

```bash
PHASE_SECTION=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" roadmap get-phase "${CURRENT_PHASE}" 2>/dev/null)
PHASE_HAS_UI=$(echo "$PHASE_SECTION" | grep -qi "UI hint.*yes" && echo "true" || echo "false")
```

**如果 CONTEXT.md 存在：**

```
---

## ▶ 下一步

**阶段 {N}：{名称}** — {来自 ROADMAP.md 的目标}
<sub>✓ 上下文已收集，准备规划</sub>

`/gsd:plan-phase {phase-number} ${GSD_WS}`

<sub>`/clear` 先清理 → 全新上下文窗口</sub>

---
```

**如果 CONTEXT.md 不存在且阶段有 UI（`PHASE_HAS_UI` 为 `true`）：**

```
---

## ▶ 下一步

**阶段 {N}：{名称}** — {来自 ROADMAP.md 的目标}

`/gsd:discuss-phase {phase}` — 收集上下文并明确方法

<sub>`/clear` 先清理 → 全新上下文窗口</sub>

---

**其他可选操作：**
- `/gsd:ui-phase {phase}` — 生成 UI 设计契约（推荐用于前端阶段）
- `/gsd:plan-phase {phase}` — 跳过讨论，直接规划
- `/gsd:list-phase-assumptions {phase}` — 查看 Claude 的假设

---
```

**如果 CONTEXT.md 不存在且阶段没有 UI：**

```
---

## ▶ 下一步

**阶段 {N}：{名称}** — {来自 ROADMAP.md 的目标}

`/gsd:discuss-phase {phase} ${GSD_WS}` — 收集上下文并明确方法

<sub>`/clear` 先清理 → 全新上下文窗口</sub>

---

**其他可选操作：**
- `/gsd:plan-phase {phase} ${GSD_WS}` — 跳过讨论，直接规划
- `/gsd:list-phase-assumptions {phase} ${GSD_WS}` — 查看 Claude 的假设

---
```

---

**路由 E：UAT 差距需要修复计划**

UAT.md 存在且有差距（已诊断的问题）。用户需要规划修复。

```
---

## ⚠ 发现 UAT 差距

**{phase_num}-UAT.md** 有 {N} 个差距需要修复。

`/gsd:plan-phase {phase} --gaps ${GSD_WS}`

<sub>`/clear` 先清理 → 全新上下文窗口</sub>

---

**其他可选操作：**
- `/gsd:execute-phase {phase} ${GSD_WS}` — 执行阶段计划
- `/gsd:verify-work {phase} ${GSD_WS}` — 运行更多 UAT 测试

---
```

---

**路由 E.2：UAT 测试不完整（部分）**

UAT.md 存在且 `status: partial`——测试会话在所有项目解决前就结束了。

```
---

## UAT 测试未完成

**{phase_num}-UAT.md** 有 {N} 个未解决的测试（待处理、阻塞或已跳过）。

`/gsd:verify-work {phase} ${GSD_WS}` — 从上次中断处恢复测试

<sub>`/clear` 先清理 → 全新上下文窗口</sub>

---

**其他可选操作：**
- `/gsd:audit-uat ${GSD_WS}` — 全面跨阶段 UAT 审计
- `/gsd:execute-phase {phase} ${GSD_WS}` — 执行阶段计划

---
```

---

**步骤 3：检查里程碑状态（仅在阶段完成时）**

读取 ROADMAP.md 并识别：
1. 当前阶段编号
2. 当前里程碑部分中所有的阶段编号

统计总阶段数并识别最高阶段编号。

说明："当前阶段是 {X}。里程碑有 {N} 个阶段（最高：{Y}）。"

**根据里程碑状态进行路由：**

| 条件 | 含义 | 操作 |
|------|------|------|
| 当前阶段 < 最高阶段 | 还有更多阶段 | 进入**路由 C** |
| 当前阶段 = 最高阶段 | 里程碑完成 | 进入**路由 D** |

---

**路由 C：阶段完成，还有更多阶段**

读取 ROADMAP.md 获取下一个阶段的名称和目标。

检查下一个阶段是否有 UI 指示：

```bash
NEXT_PHASE_SECTION=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" roadmap get-phase "$((Z+1))" 2>/dev/null)
NEXT_HAS_UI=$(echo "$NEXT_PHASE_SECTION" | grep -qi "UI hint.*yes" && echo "true" || echo "false")
```

**如果下一个阶段有 UI（`NEXT_HAS_UI` 为 `true`）：**

```
---

## ✓ 阶段 {Z} 完成

## ▶ 下一步

**阶段 {Z+1}：{名称}** — {来自 ROADMAP.md 的目标}

`/gsd:discuss-phase {Z+1}` — 收集上下文并明确方法

<sub>`/clear` 先清理 → 全新上下文窗口</sub>

---

**其他可选操作：**
- `/gsd:ui-phase {Z+1}` — 生成 UI 设计契约（推荐用于前端阶段）
- `/gsd:plan-phase {Z+1}` — 跳过讨论，直接规划
- `/gsd:verify-work {Z}` — 继续之前先进行用户验收测试

---
```

**如果下一个阶段没有 UI：**

```
---

## ✓ 阶段 {Z} 完成

## ▶ 下一步

**阶段 {Z+1}：{名称}** — {来自 ROADMAP.md 的目标}

`/gsd:discuss-phase {Z+1} ${GSD_WS}` — 收集上下文并明确方法

<sub>`/clear` 先清理 → 全新上下文窗口</sub>

---

**其他可选操作：**
- `/gsd:plan-phase {Z+1} ${GSD_WS}` — 跳过讨论，直接规划
- `/gsd:verify-work {Z} ${GSD_WS}` — 继续之前先进行用户验收测试

---
```

---

**路由 D：里程碑完成**

```
---

## 🎉 里程碑完成

所有 {N} 个阶段已完成！

## ▶ 下一步

**完成里程碑** — 归档并准备下一个

`/gsd:complete-milestone ${GSD_WS}`

<sub>`/clear` 先清理 → 全新上下文窗口</sub>

---

**其他可选操作：**
- `/gsd:verify-work ${GSD_WS}` — 完成里程碑前先进行用户验收测试

---
```

---

**路由 F：里程碑间歇期（缺少 ROADMAP.md，存在 PROJECT.md）**

里程碑已完成并归档。准备开始下一个里程碑周期。

读取 MILESTONES.md 找到最后完成的里程碑版本。

```
---

## ✓ 里程碑 v{X.Y} 完成

准备规划下一个里程碑。

## ▶ 下一步

**开始下一个里程碑** — 提问 → 研究 → 需求 → 路线图

`/gsd:new-milestone ${GSD_WS}`

<sub>`/clear` 先清理 → 全新上下文窗口</sub>

---
```

</step>

<step name="edge_cases">
**处理边界情况：**

- 阶段完成但下一个阶段未规划 → 提供 `/gsd:plan-phase [next] ${GSD_WS}`
- 所有工作完成 → 提供里程碑完成选项
- 存在阻塞 → 在提供继续选项前高亮显示
- 存在交接文件 → 提及并提供 `/gsd:resume-work ${GSD_WS}`
  </step>

</process>

<success_criteria>

- [ ] 提供了丰富的上下文（近期工作、决策、问题）
- [ ] 当前位置清晰并带有可视化进度
- [ ] 下一步清晰说明
- [ ] 智能路由：如果计划存在则 /gsd:execute-phase，否则 /gsd:plan-phase
- [ ] 用户在任何操作前确认
- [ ] 无缝交接到适当的 gsd 命令
      </success_criteria>
</output>
