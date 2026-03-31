<purpose>
执行小型、临时任务，同时具备 GSD 保障（原子提交、STATE.md 跟踪）。快速模式生成 gsd-planner（快速模式）+ gsd-executor，在 `.planning/quick/` 中跟踪任务，并更新 STATE.md 的"已完成快速任务"表。

使用 `--discuss` 标志：在规划之前进行轻量级讨论阶段。呈现假设、澄清灰色地带、在 CONTEXT.md 中捕获决策，使规划器将其视为锁定的。

使用 `--full` 标志：启用计划检查（最多 2 次迭代）和执行后验证，在不需要完整里程碑流程的情况下提供质量保障。

使用 `--research` 标志：在规划之前生成一个专注的研究代理。调查实现方案、库选项和陷阱。当你不确定如何处理任务时使用。

标志可组合：`--discuss --research --full` 提供讨论 + 研究 + 计划检查 + 验证。
</purpose>

<required_reading>
在开始之前，读取调用提示的 execution_context 引用的所有文件。
</required_reading>

<available_agent_types>
有效的 GSD 子代理类型（使用确切名称——不要回退到 'general-purpose'）：
- gsd-phase-researcher — 为阶段研究技术方案
- gsd-planner — 从阶段范围创建详细计划
- gsd-plan-checker — 在执行前审查计划质量
- gsd-executor — 执行计划任务、提交、创建 SUMMARY.md
- gsd-verifier — 验证阶段完成情况、检查质量关卡
</available_agent_types>

<process>
**步骤 1：解析参数并获取任务描述**

从 `$ARGUMENTS` 中解析：
- `--full` 标志 → 存储为 `$FULL_MODE`（true/false）
- `--discuss` 标志 → 存储为 `$DISCUSS_MODE`（true/false）
- `--research` 标志 → 存储为 `$RESEARCH_MODE`（true/false）
- 剩余文本 → 如果非空则用作 `$DESCRIPTION`

如果解析后 `$DESCRIPTION` 为空，交互式提示用户：

```
AskUserQuestion(
  header: "快速任务",
  question: "你想做什么？",
  followUp: null
)
```

将回复存储为 `$DESCRIPTION`。

如果仍为空，重新提示："请提供任务描述。"

根据激活的标志显示横幅：

如果 `$DISCUSS_MODE` 且 `$RESEARCH_MODE` 且 `$FULL_MODE`：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 快速任务（讨论 + 研究 + 完整模式）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ 已启用讨论 + 研究 + 计划检查 + 验证
```

如果 `$DISCUSS_MODE` 且 `$FULL_MODE`（无研究）：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 快速任务（讨论 + 完整模式）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ 已启用讨论 + 计划检查 + 验证
```

如果 `$DISCUSS_MODE` 且 `$RESEARCH_MODE`（无完整模式）：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 快速任务（讨论 + 研究）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ 已启用讨论 + 研究
```

如果 `$RESEARCH_MODE` 且 `$FULL_MODE`（无讨论）：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 快速任务（研究 + 完整模式）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ 已启用研究 + 计划检查 + 验证
```

如果仅 `$DISCUSS_MODE`：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 快速任务（讨论）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ 已启用讨论阶段——在规划前呈现灰色地带
```

如果仅 `$RESEARCH_MODE`：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 快速任务（研究）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ 已启用研究阶段——在规划前调查方案
```

如果仅 `$FULL_MODE`：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 快速任务（完整模式）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ 已启用计划检查 + 验证
```

---

**步骤 2：初始化**

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init quick "$DESCRIPTION")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
AGENT_SKILLS_PLANNER=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-planner 2>/dev/null)
AGENT_SKILLS_EXECUTOR=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-executor 2>/dev/null)
AGENT_SKILLS_CHECKER=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-checker 2>/dev/null)
AGENT_SKILLS_VERIFIER=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-verifier 2>/dev/null)
```

解析 JSON 获取：`planner_model`、`executor_model`、`checker_model`、`verifier_model`、`commit_docs`、`branch_name`、`quick_id`、`slug`、`date`、`timestamp`、`quick_dir`、`task_dir`、`roadmap_exists`、`planning_exists`。

**如果 `roadmap_exists` 为 false：** 错误——快速模式需要一个有 ROADMAP.md 的活动项目。请先运行 `/gsd:new-project`。

快速任务可以在阶段中途运行——验证仅检查 ROADMAP.md 是否存在，不检查阶段状态。

---

**步骤 2.5：处理快速任务分支**

**如果 `branch_name` 为空/null：** 跳过，继续在当前分支上操作。

**如果 `branch_name` 已设置：** 在任何规划提交之前检出快速任务分支：

```bash
git checkout -b "$branch_name" 2>/dev/null || git checkout "$branch_name"
```

此次运行的所有快速任务提交都保留在该分支上。用户之后自行处理合并/变基。

---

**步骤 3：创建任务目录**

```bash
mkdir -p "${task_dir}"
```

---

**步骤 4：创建快速任务目录**

为此快速任务创建目录：

```bash
QUICK_DIR=".planning/quick/${quick_id}-${slug}"
mkdir -p "$QUICK_DIR"
```

向用户报告：
```
正在创建快速任务 ${quick_id}: ${DESCRIPTION}
目录：${QUICK_DIR}
```

存储 `$QUICK_DIR` 以在编排中使用。

---

**步骤 4.5：讨论阶段（仅当 `$DISCUSS_MODE` 时）**

如果不是 `$DISCUSS_MODE`，完全跳过此步骤。

显示横幅：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 讨论快速任务
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ 正在呈现灰色地带：${DESCRIPTION}
```

**4.5a. 识别灰色地带**

分析 `$DESCRIPTION` 以识别 2-4 个灰色地带——会改变结果且用户应参与决定的实现决策。

使用领域感知启发式方法生成阶段特定的（而非通用的）灰色地带：
- 用户**看到**的东西 → 布局、密度、交互、状态
- 用户**调用**的东西 → 响应、错误、认证、版本
- 用户**运行**的东西 → 输出格式、标志、模式、错误处理
- 用户**阅读**的东西 → 结构、语气、深度、流程
- 正在被**组织**的东西 → 标准、分组、命名、例外

每个灰色地带应是具体的决策点，而非模糊的类别。例如："加载行为"而非"UX"。

**4.5b. 展示灰色地带**

```
AskUserQuestion(
  header: "灰色地带",
  question: "哪些方面需要在规划前澄清？",
  options: [
    { label: "${area_1}", description: "${why_it_matters_1}" },
    { label: "${area_2}", description: "${why_it_matters_2}" },
    { label: "${area_3}", description: "${why_it_matters_3}" },
    { label: "全部清楚", description: "跳过讨论——我知道我要什么" }
  ],
  multiSelect: true
)
```

如果用户选择"全部清楚" → 跳到步骤 5（不写入 CONTEXT.md）。

**4.5c. 讨论选定的领域**

对于每个选定的领域，通过 AskUserQuestion 提出 1-2 个聚焦问题：

```
AskUserQuestion(
  header: "${area_name}",
  question: "${关于此领域的具体问题}",
  options: [
    { label: "${具体选择_1}", description: "${这意味着什么}" },
    { label: "${具体选择_2}", description: "${这意味着什么}" },
    { label: "${具体选择_3}", description: "${这意味着什么}" },
    { label: "你来决定", description: "由 Claude 自行裁量" }
  ],
  multiSelect: false
)
```

规则：
- 选项必须是具体的选择，而非抽象的类别
- 当你有明确意见时，高亮推荐的选择
- 如果用户选择"其他"并输入自由文本，切换到纯文本后续跟进（按 questioning.md 的自由文本规则）
- 如果用户选择"你来决定"，在 CONTEXT.md 中记录为 Claude 自行裁量
- 每个领域最多 2 个问题——这是轻量级的，不是深度调研

将所有决策收集到 `$DECISIONS` 中。

**4.5d. 写入 CONTEXT.md**

写入 `${QUICK_DIR}/${quick_id}-CONTEXT.md`，使用标准上下文模板结构：

```markdown
# 快速任务 ${quick_id}: ${DESCRIPTION} - 上下文

**收集时间：** ${date}
**状态：** 准备规划

<domain>
## 任务边界

${DESCRIPTION}

</domain>

<decisions>
## 实现决策

### ${area_1_name}
- ${讨论中的决策}

### ${area_2_name}
- ${讨论中的决策}

### Claude 自行裁量
${用户说"你来决定"的领域或未讨论的领域}

</decisions>

<specifics>
## 具体想法

${讨论中的任何具体引用或示例}

[如果没有："没有具体要求——开放接受标准方案"]

</specifics>

<canonical_refs>
## 规范引用

${讨论中引用的任何规范、ADR 或文档}

[如果没有："无外部规范——需求已完全在上述决策中捕获"]

</canonical_refs>
```

注意：快速任务 CONTEXT.md 省略了 `<code_context>` 和 `<deferred>` 部分（无代码库侦察，无阶段范围可推迟）。保持精简。`<canonical_refs>` 部分在引用了外部文档时包含——仅在没有外部文档适用时省略。

报告：`上下文已捕获：${QUICK_DIR}/${quick_id}-CONTEXT.md`

---

**步骤 4.75：研究阶段（仅当 `$RESEARCH_MODE` 时）**

如果不是 `$RESEARCH_MODE`，完全跳过此步骤。

显示横幅：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 研究快速任务
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ 正在调查方案：${DESCRIPTION}
```

生成单个专注的研究者（不像完整阶段那样 4 个并行研究者——快速任务需要有针对性的研究，而非广泛的领域调查）：

```
Task(
  prompt="
<research_context>

**模式：** quick-task
**任务：** ${DESCRIPTION}
**输出：** ${QUICK_DIR}/${quick_id}-RESEARCH.md

<files_to_read>
- .planning/STATE.md（项目状态——已构建的内容）
- .planning/PROJECT.md（项目上下文）
- ./CLAUDE.md（如果存在——项目特定指南）
${DISCUSS_MODE ? '- ' + QUICK_DIR + '/' + quick_id + '-CONTEXT.md (用户决策——研究应与之对齐)' : ''}
</files_to_read>

${AGENT_SKILLS_PLANNER}

</research_context>

<focus>
这是快速任务，不是完整阶段。研究应简洁且有针对性：
1. 此特定任务的最佳库/模式
2. 常见陷阱及如何避免
3. 与现有代码库的集成点
4. 规划前值得了解的任何约束或注意事项

不要产出完整的领域调查。目标是 1-2 页可操作的发现。
</focus>

<output>
将研究写入：${QUICK_DIR}/${quick_id}-RESEARCH.md
使用标准研究格式但保持精简——跳过不适用的部分。
返回：## RESEARCH COMPLETE 附文件路径
</output>
",
  subagent_type="gsd-phase-researcher",
  model="{planner_model}",
  description="研究：${DESCRIPTION}"
)
```

研究者返回后：
1. 验证研究文件存在于 `${QUICK_DIR}/${quick_id}-RESEARCH.md`
2. 报告："研究完成：${QUICK_DIR}/${quick_id}-RESEARCH.md"

如果研究文件未找到，警告但继续："研究代理未产出输出——在没有研究的情况下继续规划。"

---

**步骤 5：生成规划器（快速模式）**

**如果 `$FULL_MODE`：** 使用 `quick-full` 模式，约束更严格。

**如果不是 `$FULL_MODE`：** 使用标准 `quick` 模式。

```
Task(
  prompt="
<planning_context>

**模式：** ${FULL_MODE ? 'quick-full' : 'quick'}
**目录：** ${QUICK_DIR}
**描述：** ${DESCRIPTION}

<files_to_read>
- .planning/STATE.md（项目状态）
- ./CLAUDE.md（如果存在——遵循项目特定指南）
${DISCUSS_MODE ? '- ' + QUICK_DIR + '/' + quick_id + '-CONTEXT.md (用户决策——已锁定，不要重新讨论)' : ''}
${RESEARCH_MODE ? '- ' + QUICK_DIR + '/' + quick_id + '-RESEARCH.md (研究发现——用于指导实现选择)' : ''}
</files_to_read>

${AGENT_SKILLS_PLANNER}

**项目技能：** 检查 .claude/skills/ 或 .agents/skills/ 目录（如果任一存在）——读取 SKILL.md 文件，计划应考虑项目技能规则

</planning_context>

<constraints>
- 创建一个包含 1-3 个聚焦任务的单一计划
- 快速任务应是原子的和自包含的
${RESEARCH_MODE ? '- 研究发现可用——使用它们来指导库/模式选择' : '- 无研究阶段'}
${FULL_MODE ? '- 目标 ~40% 上下文使用量（为验证而结构化）' : '- 目标 ~30% 上下文使用量（简单、聚焦）'}
${FULL_MODE ? '- 必须在计划前言中生成 `must_haves`（truths、artifacts、key_links）' : ''}
${FULL_MODE ? '- 每个任务必须有 `files`、`action`、`verify`、`done` 字段' : ''}
</constraints>

<output>
将计划写入：${QUICK_DIR}/${quick_id}-PLAN.md
返回：## PLANNING COMPLETE 附计划路径
</output>
",
  subagent_type="gsd-planner",
  model="{planner_model}",
  description="快速计划：${DESCRIPTION}"
)
```

规划器返回后：
1. 验证计划存在于 `${QUICK_DIR}/${quick_id}-PLAN.md`
2. 提取计划数量（快速任务通常为 1）
3. 报告："计划已创建：${QUICK_DIR}/${quick_id}-PLAN.md"

如果计划未找到，错误："规划器未能创建 ${quick_id}-PLAN.md"

---

**步骤 5.5：计划检查循环（仅当 `$FULL_MODE` 时）**

如果不是 `$FULL_MODE`，完全跳过此步骤。

显示横幅：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 检查计划
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ 正在生成计划检查器...
```

检查器提示：

```markdown
<verification_context>
**模式：** quick-full
**任务描述：** ${DESCRIPTION}

<files_to_read>
- ${QUICK_DIR}/${quick_id}-PLAN.md（待验证的计划）
</files_to_read>

${AGENT_SKILLS_CHECKER}

**范围：** 这是快速任务，不是完整阶段。跳过需要 ROADMAP 阶段目标的检查。
</verification_context>

<check_dimensions>
- 需求覆盖：计划是否涵盖了任务描述？
- 任务完整性：任务是否有 files、action、verify、done 字段？
- 关键链接：引用的文件是否真实存在？
- 范围合理性：对于快速任务（1-3 个任务）大小是否合适？
- must_haves 推导：must_haves 是否可追溯到任务描述？

跳过：跨计划依赖（单一计划）、ROADMAP 对齐
${DISCUSS_MODE ? '- 上下文合规性：计划是否遵守了 CONTEXT.md 中锁定的决策？' : '- 跳过：上下文合规性（无 CONTEXT.md）'}
</check_dimensions>

<expected_output>
- ## VERIFICATION PASSED — 所有检查通过
- ## ISSUES FOUND — 结构化问题列表
</expected_output>
```

```
Task(
  prompt=checker_prompt,
  subagent_type="gsd-plan-checker",
  model="{checker_model}",
  description="检查快速计划：${DESCRIPTION}"
)
```

**处理检查器返回：**

- **`## VERIFICATION PASSED`：** 显示确认，继续到步骤 6。
- **`## ISSUES FOUND`：** 显示问题，检查迭代次数，进入修订循环。

**修订循环（最多 2 次迭代）：**

跟踪 `iteration_count`（初始计划 + 检查后从 1 开始）。

**如果 iteration_count < 2：**

显示：`正在发回规划器修订... (迭代 ${N}/2)`

修订提示：

```markdown
<revision_context>
**模式：** quick-full（修订）

<files_to_read>
- ${QUICK_DIR}/${quick_id}-PLAN.md（现有计划）
</files_to_read>

${AGENT_SKILLS_PLANNER}

**检查器问题：** ${来自检查器的结构化问题}

</revision_context>

<instructions>
进行有针对性的更新以解决检查器问题。
除非问题是根本性的，否则不要从头重新规划。
返回更改了什么。
</instructions>
```

```
Task(
  prompt=revision_prompt,
  subagent_type="gsd-planner",
  model="{planner_model}",
  description="修订快速计划：${DESCRIPTION}"
)
```

规划器返回后 → 再次生成检查器，递增 iteration_count。

**如果 iteration_count >= 2：**

显示：`已达最大迭代次数。剩余 ${N} 个问题：` + 问题列表

提供选项：1) 强制继续，2) 中止

---

**步骤 6：生成执行器**

使用计划引用生成 gsd-executor：

```
Task(
  prompt="
执行快速任务 ${quick_id}。

<files_to_read>
- ${QUICK_DIR}/${quick_id}-PLAN.md（计划）
- .planning/STATE.md（项目状态）
- ./CLAUDE.md（项目指令，如果存在）
- .claude/skills/ 或 .agents/skills/（项目技能，如果任一存在——列出技能，读取每个的 SKILL.md，在实现过程中遵循相关规则）
</files_to_read>

${AGENT_SKILLS_EXECUTOR}

<constraints>
- 执行计划中的所有任务
- 每个任务原子提交
- 在此处创建摘要：${QUICK_DIR}/${quick_id}-SUMMARY.md
- 不要更新 ROADMAP.md（快速任务与计划中的阶段分开）
</constraints>
",
  subagent_type="gsd-executor",
  model="{executor_model}",
  isolation="worktree",
  description="执行：${DESCRIPTION}"
)
```

执行器返回后：
1. 验证摘要存在于 `${QUICK_DIR}/${quick_id}-SUMMARY.md`
2. 从执行器输出中提取提交哈希
3. 报告完成状态

**已知 Claude Code 缺陷（classifyHandoffIfNeeded）：** 如果执行器报告"失败"并带有错误 `classifyHandoffIfNeeded is not defined`，这是 Claude Code 运行时缺陷——不是真正的失败。检查摘要文件是否存在且 git log 显示了提交。如果是，视为成功。

如果摘要未找到，错误："执行器未能创建 ${quick_id}-SUMMARY.md"

注意：对于产生多个计划的快速任务（罕见情况），按 execute-phase 模式以并行批次生成执行器。

---

**步骤 6.5：验证（仅当 `$FULL_MODE` 时）**

如果不是 `$FULL_MODE`，完全跳过此步骤。

显示横幅：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 验证结果
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ 正在生成验证器...
```

```
Task(
  prompt="验证快速任务目标达成情况。
任务目录：${QUICK_DIR}
任务目标：${DESCRIPTION}

<files_to_read>
- ${QUICK_DIR}/${quick_id}-PLAN.md（计划）
</files_to_read>

${AGENT_SKILLS_VERIFIER}

根据实际代码库检查 must_haves。在 ${QUICK_DIR}/${quick_id}-VERIFICATION.md 创建 VERIFICATION.md。",
  subagent_type="gsd-verifier",
  model="{verifier_model}",
  description="验证：${DESCRIPTION}"
)
```

读取验证状态：
```bash
grep "^status:" "${QUICK_DIR}/${quick_id}-VERIFICATION.md" | cut -d: -f2 | tr -d ' '
```

存储为 `$VERIFICATION_STATUS`。

| 状态 | 操作 |
|--------|--------|
| `passed` | 存储 `$VERIFICATION_STATUS = "Verified"`，继续到步骤 7 |
| `human_needed` | 显示需要人工检查的项，存储 `$VERIFICATION_STATUS = "Needs Review"`，继续 |
| `gaps_found` | 显示差距摘要，提供选项：1) 重新运行执行器修复差距，2) 按原样接受。存储 `$VERIFICATION_STATUS = "Gaps"` |

---

**步骤 7：更新 STATE.md**

用快速任务完成记录更新 STATE.md。

**7a. 检查"已完成快速任务"部分是否存在：**

读取 STATE.md 并检查是否有 `### Quick Tasks Completed` 部分。

**7b. 如果部分不存在，创建它：**

在 `### Blockers/Concerns` 部分之后插入：

**如果 `$FULL_MODE`：**
```markdown
### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
```

**如果不是 `$FULL_MODE`：**
```markdown
### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
```

**注意：** 如果表格已存在，匹配其现有列格式。如果对已有不带 Status 列的快速任务的项目添加 `--full`，则在表头和分隔行中添加 Status 列，并为新行的前任留空 Status。

**7c. 向表格追加新行：**

使用初始化中的 `date`：

**如果 `$FULL_MODE`（或表格有 Status 列）：**
```markdown
| ${quick_id} | ${DESCRIPTION} | ${date} | ${commit_hash} | ${VERIFICATION_STATUS} | [${quick_id}-${slug}](./quick/${quick_id}-${slug}/) |
```

**如果不是 `$FULL_MODE`（且表格无 Status 列）：**
```markdown
| ${quick_id} | ${DESCRIPTION} | ${date} | ${commit_hash} | [${quick_id}-${slug}](./quick/${quick_id}-${slug}/) |
```

**7d. 更新"最后活动"行：**

使用初始化中的 `date`：
```
Last activity: ${date} - Completed quick task ${quick_id}: ${DESCRIPTION}
```

使用 Edit 工具原子地进行这些更改。

---

**步骤 8：最终提交和完成**

暂存并提交快速任务制品：

构建文件列表：
- `${QUICK_DIR}/${quick_id}-PLAN.md`
- `${QUICK_DIR}/${quick_id}-SUMMARY.md`
- `.planning/STATE.md`
- 如果 `$DISCUSS_MODE` 且上下文文件存在：`${QUICK_DIR}/${quick_id}-CONTEXT.md`
- 如果 `$RESEARCH_MODE` 且研究文件存在：`${QUICK_DIR}/${quick_id}-RESEARCH.md`
- 如果 `$FULL_MODE` 且验证文件存在：`${QUICK_DIR}/${quick_id}-VERIFICATION.md`

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs(quick-${quick_id}): ${DESCRIPTION}" --files ${file_list}
```

获取最终提交哈希：
```bash
commit_hash=$(git rev-parse --short HEAD)
```

显示完成输出：

**如果 `$FULL_MODE`：**
```
---

GSD > 快速任务完成（完整模式）

快速任务 ${quick_id}: ${DESCRIPTION}

${RESEARCH_MODE ? '研究：' + QUICK_DIR + '/' + quick_id + '-RESEARCH.md' : ''}
摘要：${QUICK_DIR}/${quick_id}-SUMMARY.md
验证：${QUICK_DIR}/${quick_id}-VERIFICATION.md (${VERIFICATION_STATUS})
提交：${commit_hash}

---

准备好下一个任务：/gsd:quick ${GSD_WS}
```

**如果不是 `$FULL_MODE`：**
```
---

GSD > 快速任务完成

快速任务 ${quick_id}: ${DESCRIPTION}

${RESEARCH_MODE ? '研究：' + QUICK_DIR + '/' + quick_id + '-RESEARCH.md' : ''}
摘要：${QUICK_DIR}/${quick_id}-SUMMARY.md
提交：${commit_hash}

---

准备好下一个任务：/gsd:quick ${GSD_WS}
```

</process>

<success_criteria>
- [ ] ROADMAP.md 验证通过
- [ ] 用户提供了任务描述
- [ ] 从参数中解析了 `--full`、`--discuss` 和 `--research` 标志（如果存在）
- [ ] 生成了 slug（小写、连字符、最大 40 字符）
- [ ] 生成了快速 ID（YYMMDD-xxx 格式，2 秒 Base36 精度）
- [ ] 在 `.planning/quick/YYMMDD-xxx-slug/` 创建了目录
- [ ] (--discuss) 识别并展示了灰色地带，决策捕获在 `${quick_id}-CONTEXT.md` 中
- [ ] (--research) 生成了研究代理，创建了 `${quick_id}-RESEARCH.md`
- [ ] 规划器创建了 `${quick_id}-PLAN.md`（使用 --discuss 时遵守 CONTEXT.md 决策，使用 --research 时利用 RESEARCH.md 发现）
- [ ] (--full) 计划检查器验证了计划，修订循环上限为 2 次
- [ ] 执行器创建了 `${quick_id}-SUMMARY.md`
- [ ] (--full) 验证器创建了 `${quick_id}-VERIFICATION.md`
- [ ] STATE.md 已更新快速任务行（使用 --full 时包含 Status 列）
- [ ] 制品已提交
</success_criteria>
</output>
