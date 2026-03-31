<purpose>

自主驱动所有剩余的里程碑阶段。对于每个未完成的阶段：讨论 → 规划 → 执行，使用 Skill() 扁平调用。仅在需要明确用户决策时暂停（灰色地带接受、阻塞因素、验证请求）。每个阶段后重新读取 ROADMAP.md 以捕获动态插入的阶段。

</purpose>

<required_reading>

在开始之前，读取调用提示的 execution_context 中引用的所有文件。

</required_reading>

<process>

<step name="initialize" priority="first">

## 1. 初始化

从 `$ARGUMENTS` 中解析 `--from N` 标志：

```bash
FROM_PHASE=""
if echo "$ARGUMENTS" | grep -qE '\-\-from\s+[0-9]'; then
  FROM_PHASE=$(echo "$ARGUMENTS" | grep -oE '\-\-from\s+[0-9]+\.?[0-9]*' | awk '{print $2}')
fi
```

通过里程碑级别的 init 进行引导：

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init milestone-op)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

从 JSON 中解析：`milestone_version`、`milestone_name`、`phase_count`、`completed_phases`、`roadmap_exists`、`state_exists`、`commit_docs`。

**如果 `roadmap_exists` 为 false：** 错误 — "No ROADMAP.md found. Run `/gsd:new-milestone` first."
**如果 `state_exists` 为 false：** 错误 — "No STATE.md found. Run `/gsd:new-milestone` first."

显示启动横幅：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► AUTONOMOUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Milestone: {milestone_version} — {milestone_name}
 Phases: {phase_count} total, {completed_phases} complete
```

如果设置了 `FROM_PHASE`，显示：`Starting from phase ${FROM_PHASE}`

</step>

<step name="discover_phases">

## 2. 发现阶段

运行阶段发现：

```bash
ROADMAP=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" roadmap analyze)
```

解析 JSON `phases` 数组。

**过滤为未完成的阶段：** 仅保留 `disk_status !== "complete"` 或 `roadmap_complete === false` 的阶段。

**应用 `--from N` 过滤器：** 如果提供了 `FROM_PHASE`，额外过滤掉 `number < FROM_PHASE` 的阶段（使用数字比较 — 处理小数阶段如 "5.1"）。

**按 `number` 数字升序排序。**

**如果没有剩余的未完成阶段：**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► AUTONOMOUS ▸ COMPLETE 🎉
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 All phases complete! Nothing left to do.
```

正常退出。

**显示阶段计划：**

```
## Phase Plan

| # | Phase | Status |
|---|-------|--------|
| 5 | Skill Scaffolding & Phase Discovery | In Progress |
| 6 | Smart Discuss | Not Started |
| 7 | Auto-Chain Refinements | Not Started |
| 8 | Lifecycle Orchestration | Not Started |
```

**获取每个阶段的详细信息：**

```bash
DETAIL=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" roadmap get-phase ${PHASE_NUM})
```

从每个中提取 `phase_name`、`goal`、`success_criteria`。存储以在 execute_phase 和过渡消息中使用。

</step>

<step name="execute_phase">

## 3. 执行阶段

对于当前阶段，显示进度横幅：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► AUTONOMOUS ▸ Phase {N}/{T}: {Name} [████░░░░] {P}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

其中 N = 当前阶段编号（来自路线图，例如 6），T = 里程碑总阶段数（来自初始化步骤中解析的 `phase_count`，例如 8），P = 目前已完成的所有里程碑阶段的百分比。P 的计算方式为：（最新 `roadmap analyze` 中 `disk_status` 为 "complete" 的阶段数 / T × 100）。进度条使用 █ 表示已填充，░ 表示空（8 个字符宽）。

**3a. 智能讨论**

检查此阶段是否已存在 CONTEXT.md：

```bash
PHASE_STATE=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init phase-op ${PHASE_NUM})
```

从 JSON 中解析 `has_context`。

**如果 has_context 为 true：** 跳过讨论 — 上下文已收集。显示：

```
Phase ${PHASE_NUM}: Context exists — skipping discuss.
```

继续到 3b。

**如果 has_context 为 false：** 检查是否通过设置禁用了讨论：

```bash
SKIP_DISCUSS=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow.skip_discuss 2>/dev/null || echo "false")
```

**如果 SKIP_DISCUSS 为 `true`：** 完全跳过讨论 — 路线图阶段描述即为规格说明。显示：

```
Phase ${PHASE_NUM}: Discuss skipped (workflow.skip_discuss=true) — using ROADMAP phase goal as spec.
```

编写最小化的 CONTEXT.md 以便下游 plan-phase 有有效输入。获取阶段详情：

```bash
DETAIL=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" roadmap get-phase ${PHASE_NUM})
```

从 JSON 中提取 `goal` 和 `requirements`。编写 `${phase_dir}/${padded_phase}-CONTEXT.md`：

```markdown
# Phase {PHASE_NUM}: {Phase Name} - Context

**Gathered:** {date}
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

{goal from ROADMAP phase description}

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss phase was skipped per user setting. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

</decisions>

<code_context>
## Existing Code Insights

Codebase context will be gathered during plan-phase research.

</code_context>

<specifics>
## Specific Ideas

No specific requirements — discuss phase skipped. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
```

提交最小化上下文：

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs(${PADDED_PHASE}): auto-generated context (discuss skipped)" --files "${phase_dir}/${padded_phase}-CONTEXT.md"
```

继续到 3b。

**如果 SKIP_DISCUSS 为 `false`（或未设置）：** 为此阶段执行 smart_discuss 步骤。

smart_discuss 完成后，验证上下文是否已写入：

```bash
PHASE_STATE=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init phase-op ${PHASE_NUM})
```

检查 `has_context`。如果为 false → 转到 handle_blocker："Smart discuss for phase ${PHASE_NUM} did not produce CONTEXT.md."

**3a.5. UI 设计契约（前端阶段）**

检查此阶段是否有前端指标以及 UI-SPEC 是否已存在：

```bash
PHASE_SECTION=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" roadmap get-phase ${PHASE_NUM} 2>/dev/null)
echo "$PHASE_SECTION" | grep -iE "UI|interface|frontend|component|layout|page|screen|view|form|dashboard|widget" > /dev/null 2>&1
HAS_UI=$?
UI_SPEC_FILE=$(ls "${PHASE_DIR}"/*-UI-SPEC.md 2>/dev/null | head -1)
```

检查 UI 阶段工作流是否启用：

```bash
UI_PHASE_CFG=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow.ui_phase 2>/dev/null || echo "true")
```

**如果 `HAS_UI` 为 0（发现前端指标）且 `UI_SPEC_FILE` 为空（无 UI-SPEC 存在）且 `UI_PHASE_CFG` 不为 `false`：**

显示：

```
Phase ${PHASE_NUM}: Frontend phase detected — generating UI design contract...
```

```
Skill(skill="gsd:ui-phase", args="${PHASE_NUM}")
```

验证 UI-SPEC 是否已创建：

```bash
UI_SPEC_FILE=$(ls "${PHASE_DIR}"/*-UI-SPEC.md 2>/dev/null | head -1)
```

**如果 ui-phase 后 `UI_SPEC_FILE` 仍为空：** 显示警告 `Phase ${PHASE_NUM}: UI-SPEC generation did not produce output — continuing without design contract.` 并继续到 3b。

**如果 `HAS_UI` 为 1（无前端指标）或 `UI_SPEC_FILE` 不为空（UI-SPEC 已存在）或 `UI_PHASE_CFG` 为 `false`：** 静默跳到 3b。

**3b. 规划**

```
Skill(skill="gsd:plan-phase", args="${PHASE_NUM}")
```

验证计划是否产生输出 — 重新运行 `init phase-op` 并检查 `has_plans`。如果为 false → 转到 handle_blocker："Plan phase ${PHASE_NUM} did not produce any plans."

**3c. 执行**

```
Skill(skill="gsd:execute-phase", args="${PHASE_NUM} --no-transition")
```

**3d. 执行后路由**

execute-phase 返回后，读取验证结果：

```bash
VERIFY_STATUS=$(grep "^status:" "${PHASE_DIR}"/*-VERIFICATION.md 2>/dev/null | head -1 | cut -d: -f2 | tr -d ' ')
```

其中 `PHASE_DIR` 来自步骤 3a 中已执行的 `init phase-op` 调用。如果变量不在作用域内，重新获取：

```bash
PHASE_STATE=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init phase-op ${PHASE_NUM})
```

从 JSON 中解析 `phase_dir`。

**如果 VERIFY_STATUS 为空**（无 VERIFICATION.md 或无 status 字段）：

转到 handle_blocker："Execute phase ${PHASE_NUM} did not produce verification results."

**如果 `passed`：**

显示：
```
Phase ${PHASE_NUM} ✅ ${PHASE_NAME} — Verification passed
```

继续到 iterate 步骤。

**如果 `human_needed`：**

从 VERIFICATION.md 读取 human_verification 部分以获取需要手动测试的计数和项目。

显示项目，然后通过 AskUserQuestion 询问用户：
- **question:** "Phase ${PHASE_NUM} has items needing manual verification. Validate now or continue to next phase?"
- **options:** "Validate now" / "Continue without validation"

选择 **"Validate now"** 时：展示来自 VERIFICATION.md human_verification 部分的具体项目。用户审查后，询问：
- **question:** "Validation result?"
- **options:** "All good — continue" / "Found issues"

选择 "All good — continue" 时：显示 `Phase ${PHASE_NUM} ✅ Human validation passed` 并继续到 iterate 步骤。

选择 "Found issues" 时：转到 handle_blocker，将用户报告的问题作为描述。

选择 **"Continue without validation"** 时：显示 `Phase ${PHASE_NUM} ⏭ Human validation deferred` 并继续到 iterate 步骤。

**如果 `gaps_found`：**

从 VERIFICATION.md 读取缺口摘要（分数和缺失项目）。显示：
```
⚠ Phase ${PHASE_NUM}: ${PHASE_NAME} — Gaps Found
Score: {N}/{M} must-haves verified
```

通过 AskUserQuestion 询问用户：
- **question:** "Gaps found in phase ${PHASE_NUM}. How to proceed?"
- **options:** "Run gap closure" / "Continue without fixing" / "Stop autonomous mode"

选择 **"Run gap closure"** 时：执行缺口修复循环（限制：1 次尝试）：

```
Skill(skill="gsd:plan-phase", args="${PHASE_NUM} --gaps")
```

验证缺口计划是否已创建 — 重新运行 `init phase-op ${PHASE_NUM}` 并检查 `has_plans`。如果没有新的缺口计划 → 转到 handle_blocker："Gap closure planning for phase ${PHASE_NUM} did not produce plans."

重新执行：
```
Skill(skill="gsd:execute-phase", args="${PHASE_NUM} --no-transition")
```

重新读取验证状态：
```bash
VERIFY_STATUS=$(grep "^status:" "${PHASE_DIR}"/*-VERIFICATION.md 2>/dev/null | head -1 | cut -d: -f2 | tr -d ' ')
```

如果 `passed` 或 `human_needed`：正常路由（如上所述继续或询问用户）。

如果重试后仍为 `gaps_found`：显示 "Gaps persist after closure attempt." 并通过 AskUserQuestion 询问：
- **question:** "Gap closure did not fully resolve issues. How to proceed?"
- **options:** "Continue anyway" / "Stop autonomous mode"

选择 "Continue anyway" 时：继续到 iterate 步骤。
选择 "Stop autonomous mode" 时：转到 handle_blocker。

这将缺口修复限制为 1 次自动重试以防止无限循环。

选择 **"Continue without fixing"** 时：显示 `Phase ${PHASE_NUM} ⏭ Gaps deferred` 并继续到 iterate 步骤。

选择 **"Stop autonomous mode"** 时：转到 handle_blocker，描述为 "User stopped — gaps remain in phase ${PHASE_NUM}"。

**3d.5. UI 审查（前端阶段）**

> 在任何成功的执行路由之后运行（passed、human_needed 已接受、或 gaps 已推迟/接受）— 在继续到 iterate 步骤之前。

检查此阶段是否有 UI-SPEC（在步骤 3a.5 中创建或预先存在的）：

```bash
UI_SPEC_FILE=$(ls "${PHASE_DIR}"/*-UI-SPEC.md 2>/dev/null | head -1)
```

检查 UI 审查是否启用：

```bash
UI_REVIEW_CFG=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow.ui_review 2>/dev/null || echo "true")
```

**如果 `UI_SPEC_FILE` 不为空且 `UI_REVIEW_CFG` 不为 `false`：**

显示：

```
Phase ${PHASE_NUM}: Frontend phase with UI-SPEC — running UI review audit...
```

```
Skill(skill="gsd:ui-review", args="${PHASE_NUM}")
```

显示审查结果摘要（如果生成了 UI-REVIEW.md 则显示分数）。无论分数如何都继续到 iterate 步骤 — UI 审查是建议性的，不阻塞流程。

**如果 `UI_SPEC_FILE` 为空或 `UI_REVIEW_CFG` 为 `false`：** 静默跳到 iterate 步骤。

</step>

<step name="smart_discuss">

## 智能讨论

为当前阶段运行智能讨论。以批量表格形式提出灰色地带答案建议 — 用户按区域接受或覆盖。产出与常规 discuss-phase 相同的 CONTEXT.md 输出。

> **注意：** 智能讨论是 `gsd:discuss-phase` 技能的自主优化变体。它产出相同的 CONTEXT.md 输出，但使用批量表格建议而非逐个提问。原始的 `discuss-phase` 技能保持不变（按 CTRL-03）。未来的里程碑可能会将其提取到单独的技能文件中。

**输入：** 来自 execute_phase 的 `PHASE_NUM`。运行 init 获取阶段路径：

```bash
PHASE_STATE=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init phase-op ${PHASE_NUM})
```

从 JSON 中解析：`phase_dir`、`phase_slug`、`padded_phase`、`phase_name`。

---

### 子步骤 1：加载先前上下文

读取项目级别和先前阶段的上下文以避免重新询问已决定的问题。

**读取项目文件：**

```bash
cat .planning/PROJECT.md 2>/dev/null || true
cat .planning/REQUIREMENTS.md 2>/dev/null || true
cat .planning/STATE.md 2>/dev/null || true
```

从中提取：
- **PROJECT.md** — 愿景、原则、不可协商项、用户偏好
- **REQUIREMENTS.md** — 验收标准、约束、必须有 vs 最好有
- **STATE.md** — 当前进度、已记录的决策

**读取所有先前的 CONTEXT.md 文件：**

```bash
(find .planning/phases -name "*-CONTEXT.md" 2>/dev/null || true) | sort
```

对于阶段编号 < 当前阶段的每个 CONTEXT.md：
- 读取 `<decisions>` 部分 — 这些是锁定的偏好
- 读取 `<specifics>` — 特定的参考或 "我想要像 X 那样" 的时刻
- 记录模式（例如 "用户一贯偏好极简 UI"、"用户拒绝了冗长输出"）

**构建内部 prior_decisions 上下文**（不写入文件）：

```
<prior_decisions>
## Project-Level
- [来自 PROJECT.md 的关键原则或约束]
- [来自 REQUIREMENTS.md 的影响此阶段的需求]

## From Prior Phases
### Phase N: [Name]
- [与当前阶段相关的决策]
- [建立模式的偏好]
</prior_decisions>
```

如果没有先前上下文，继续但不使用 — 这对早期阶段来说是预期的。

---

### 子步骤 2：侦察代码库

轻量级代码库扫描，为灰色地带识别和提议提供信息。保持在约 5% 上下文以内。

**检查现有的代码库映射：**

```bash
ls .planning/codebase/*.md 2>/dev/null || true
```

**如果代码库映射存在：** 读取最相关的映射（根据阶段类型选择 CONVENTIONS.md、STRUCTURE.md、STACK.md）。提取可重用组件、已建立的模式、集成点。跳到下面的构建上下文。

**如果没有代码库映射，进行定向搜索：**

从阶段目标中提取关键术语。搜索相关文件：

```bash
grep -rl "{term1}\|{term2}" src/ app/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null | head -10 || true
ls src/components/ src/hooks/ src/lib/ src/utils/ 2>/dev/null || true
```

读取 3-5 个最相关的文件以了解现有模式。

**构建内部 codebase_context**（不写入文件）：
- **可重用资产** — 此阶段可使用的现有组件、hooks、工具函数
- **已建立的模式** — 代码库的状态管理、样式、数据获取方式
- **集成点** — 新代码连接的位置（路由、导航、providers）

---

### 子步骤 3：分析阶段并生成建议

**获取阶段详情：**

```bash
DETAIL=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" roadmap get-phase ${PHASE_NUM})
```

从 JSON 响应中提取 `goal`、`requirements`、`success_criteria`。

**基础设施检测 — 在生成灰色地带之前先检查：**

当以下所有条件都为真时，阶段为纯基础设施：
1. 目标关键词匹配："scaffolding"、"plumbing"、"setup"、"configuration"、"migration"、"refactor"、"rename"、"restructure"、"upgrade"、"infrastructure"
2. 且成功标准全部为技术性的："file exists"、"test passes"、"config valid"、"command runs"
3. 且没有描述面向用户的行为（没有 "users can"、"displays"、"shows"、"presents"）

**如果仅为基础设施：** 跳过子步骤 4。直接跳到子步骤 5 使用最小化的 CONTEXT.md。显示：

```
Phase ${PHASE_NUM}: Infrastructure phase — skipping discuss, writing minimal context.
```

对 CONTEXT.md 使用这些默认值：
- `<domain>`：来自路线图目标的阶段边界
- `<decisions>`：单个 "### Claude's Discretion" 子部分 — "All implementation choices are at Claude's discretion — pure infrastructure phase"
- `<code_context>`：代码库侦察发现的内容
- `<specifics>`："No specific requirements — infrastructure phase"
- `<deferred>`："None"

**如果不是基础设施 — 生成灰色地带建议：**

从阶段目标确定领域类型：
- 用户**看到**的内容 → 视觉：布局、交互、状态、密度
- 用户**调用**的内容 → 接口：契约、响应、错误、认证
- 用户**运行**的内容 → 执行：调用、输出、行为模式、标志
- 用户**阅读**的内容 → 内容：结构、语气、深度、流程
- 正在被**组织**的内容 → 组织：标准、分组、例外、命名

检查 prior_decisions — 跳过在先前阶段中已决定的灰色地带。

生成 **3-4 个灰色地带**，每个包含**约 4 个问题**。对于每个问题：
- **预选推荐答案**，基于：先前决策（一致性）、代码库模式（重用）、领域惯例（标准方法）、路线图成功标准
- 每个问题生成 **1-2 个替代方案**
- 在相关时**注明**先前决策上下文（"You decided X in Phase N"）和代码上下文（"Component Y exists with Z variants"）

---

### 子步骤 4：按区域展示建议

**逐个**展示灰色地带。对于每个区域（第 M 个，共 N 个）：

显示表格：

```
### Grey Area {M}/{N}: {Area Name}

| # | Question | ✅ Recommended | Alternative(s) |
|---|----------|---------------|-----------------|
| 1 | {question} | {answer} — {rationale} | {alt1}; {alt2} |
| 2 | {question} | {answer} — {rationale} | {alt1} |
| 3 | {question} | {answer} — {rationale} | {alt1}; {alt2} |
| 4 | {question} | {answer} — {rationale} | {alt1} |
```

然后通过 **AskUserQuestion** 提示用户：
- **header:** "Area {M}/{N}"
- **question:** "Accept these answers for {Area Name}?"
- **options:** 动态构建 — 始终 "Accept all" 在前，然后 "Change Q1" 到 "Change QN" 对应每个问题（最多 4 个），最后 "Discuss deeper"。显式选项上限为 6 个（AskUserQuestion 自动添加 "Other"）。

**选择 "Accept all" 时：** 记录此区域的所有推荐答案。进入下一个区域。

**选择 "Change QN" 时：** 使用 AskUserQuestion 展示该特定问题的替代方案：
- **header:** "{Area Name}"
- **question:** "Q{N}: {question text}"
- **options:** 列出 1-2 个替代方案加 "You decide"（映射为 Claude's Discretion）

记录用户的选择。重新显示更新后的表格并反映更改。重新展示完整的接受提示，以便用户可以进行其他更改或接受。

**选择 "Discuss deeper" 时：** 仅对此区域切换到交互模式 — 使用 AskUserQuestion 逐个提问，每个问题 2-3 个具体选项加 "You decide"。4 个问题后，提示：
- **header:** "{Area Name}"
- **question:** "More questions about {area name}, or move to next?"
- **options:** "More questions" / "Next area"

如果 "More questions"，再问 4 个。如果 "Next area"，显示此区域已捕获答案的最终摘要表格并继续。

**选择 "Other"（自由文本）时：** 解释为具体的更改请求或一般反馈。纳入区域的决策中，重新显示更新后的表格，重新展示接受提示。

**范围蔓延处理：** 如果用户提到阶段领域之外的内容：

```
"{Feature} sounds like a new capability — that belongs in its own phase.
I'll note it as a deferred idea.

Back to {current area}: {return to current question}"
```

内部跟踪推迟的想法以包含在 CONTEXT.md 中。

---

### 子步骤 5：编写 CONTEXT.md

所有区域解决后（或基础设施跳过后），编写 CONTEXT.md 文件。

**文件路径：** `${phase_dir}/${padded_phase}-CONTEXT.md`

使用**完全相同**的结构（与 discuss-phase 输出相同）：

```markdown
# Phase {PHASE_NUM}: {Phase Name} - Context

**Gathered:** {date}
**Status:** Ready for planning

<domain>
## Phase Boundary

{Domain boundary statement from analysis — what this phase delivers}

</domain>

<decisions>
## Implementation Decisions

### {Area 1 Name}
- {Accepted/chosen answer for Q1}
- {Accepted/chosen answer for Q2}
- {Accepted/chosen answer for Q3}
- {Accepted/chosen answer for Q4}

### {Area 2 Name}
- {Accepted/chosen answer for Q1}
- {Accepted/chosen answer for Q2}
...

### Claude's Discretion
{Any "You decide" answers collected — note Claude has flexibility here}

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- {From codebase scout — components, hooks, utilities}

### Established Patterns
- {From codebase scout — state management, styling, data fetching}

### Integration Points
- {From codebase scout — where new code connects}

</code_context>

<specifics>
## Specific Ideas

{Any specific references or "I want it like X" from discussion}
{If none: "No specific requirements — open to standard approaches"}

</specifics>

<deferred>
## Deferred Ideas

{Ideas captured but out of scope for this phase}
{If none: "None — discussion stayed within phase scope"}

</deferred>
```

写入文件。

**提交：**

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs(${PADDED_PHASE}): smart discuss context" --files "${phase_dir}/${padded_phase}-CONTEXT.md"
```

显示确认：

```
Created: {path}
Decisions captured: {count} across {area_count} areas
```

</step>

<step name="iterate">

## 4. 迭代

每个阶段完成后，重新读取 ROADMAP.md 以捕获在执行中途插入的阶段（小数阶段如 5.1）：

```bash
ROADMAP=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" roadmap analyze)
```

使用与 discover_phases 相同的逻辑重新过滤未完成的阶段：
- 保留 `disk_status !== "complete"` 或 `roadmap_complete === false` 的阶段
- 如果最初提供了 `--from N` 过滤器则应用
- 按编号升序排序

重新读取 STATE.md：

```bash
cat .planning/STATE.md
```

检查 Blockers/Concerns 部分中的阻塞因素。如果发现阻塞因素，转到 handle_blocker 并附带阻塞因素描述。

如果仍有未完成的阶段：继续到下一个阶段，循环回 execute_phase。

如果所有阶段完成，继续到 lifecycle 步骤。

</step>

<step name="lifecycle">

## 5. 生命周期

所有阶段完成后，运行里程碑生命周期序列：审计 → 完成 → 清理。

显示生命周期过渡横幅：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► AUTONOMOUS ▸ LIFECYCLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 All phases complete → Starting lifecycle: audit → complete → cleanup
 Milestone: {milestone_version} — {milestone_name}
```

**5a. 审计**

```
Skill(skill="gsd:audit-milestone")
```

审计完成后，检测结果：

```bash
AUDIT_FILE=".planning/v${milestone_version}-MILESTONE-AUDIT.md"
AUDIT_STATUS=$(grep "^status:" "${AUDIT_FILE}" 2>/dev/null | head -1 | cut -d: -f2 | tr -d ' ')
```

**如果 AUDIT_STATUS 为空**（无审计文件或无 status 字段）：

转到 handle_blocker："Audit did not produce results — audit file missing or malformed."

**如果 `passed`：**

显示：
```
Audit ✅ passed — proceeding to complete milestone
```

继续到 5b（无用户暂停 — 按 CTRL-01）。

**如果 `gaps_found`：**

从审计文件读取缺口摘要。显示：
```
⚠ Audit: Gaps Found
```

通过 AskUserQuestion 询问用户：
- **question:** "Milestone audit found gaps. How to proceed?"
- **options:** "Continue anyway — accept gaps" / "Stop — fix gaps manually"

选择 **"Continue anyway"** 时：显示 `Audit ⏭ Gaps accepted — proceeding to complete milestone` 并继续到 5b。

选择 **"Stop"** 时：转到 handle_blocker，描述为 "User stopped — audit gaps remain. Run /gsd:audit-milestone to review, then /gsd:complete-milestone when ready."

**如果 `tech_debt`：**

从审计文件读取技术债务摘要。显示：
```
⚠ Audit: Tech Debt Identified
```

展示摘要，然后通过 AskUserQuestion 询问用户：
- **question:** "Milestone audit found tech debt. How to proceed?"
- **options:** "Continue with tech debt" / "Stop — address debt first"

选择 **"Continue with tech debt"** 时：显示 `Audit ⏭ Tech debt acknowledged — proceeding to complete milestone` 并继续到 5b。

选择 **"Stop"** 时：转到 handle_blocker，描述为 "User stopped — tech debt to address. Run /gsd:audit-milestone to review details."

**5b. 完成里程碑**

```
Skill(skill="gsd:complete-milestone", args="${milestone_version}")
```

complete-milestone 返回后，验证是否产出输出：

```bash
ls .planning/milestones/v${milestone_version}-ROADMAP.md 2>/dev/null || true
```

如果归档文件不存在，转到 handle_blocker："Complete milestone did not produce expected archive files."

**5c. 清理**

```
Skill(skill="gsd:cleanup")
```

清理会显示其试运行并内部询问用户批准 — 这是按 CTRL-01 可接受的暂停，因为它是关于文件删除的明确决策。

**5d. 最终完成**

显示最终完成横幅：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► AUTONOMOUS ▸ COMPLETE 🎉
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Milestone: {milestone_version} — {milestone_name}
 Status: Complete ✅
 Lifecycle: audit ✅ → complete ✅ → cleanup ✅

 Ship it! 🚀
```

</step>

<step name="handle_blocker">

## 6. 处理阻塞因素

当任何阶段操作失败或检测到阻塞因素时，通过 AskUserQuestion 展示 3 个选项：

**提示：** "Phase {N} ({Name}) encountered an issue: {description}"

**选项：**
1. **"Fix and retry"** — 为此阶段重新运行失败的步骤（讨论、规划或执行）
2. **"Skip this phase"** — 标记阶段为跳过，继续到下一个未完成的阶段
3. **"Stop autonomous mode"** — 显示目前的进度摘要并正常退出

**选择 "Fix and retry" 时：** 循环回 execute_phase 中失败的步骤。如果重试后同一步骤再次失败，重新展示这些选项。

**选择 "Skip this phase" 时：** 记录 `Phase {N} ⏭ {Name} — Skipped by user` 并继续到 iterate。

**选择 "Stop autonomous mode" 时：** 显示进度摘要：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► AUTONOMOUS ▸ STOPPED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Completed: {list of completed phases}
 Skipped: {list of skipped phases}
 Remaining: {list of remaining phases}

 Resume with: /gsd:autonomous --from {next_phase}
```

</step>

</process>

<success_criteria>
- [ ] 所有未完成的阶段按顺序执行（每个阶段经历 smart discuss → ui-phase → plan → execute → ui-review）
- [ ] 智能讨论以表格形式提出灰色地带答案建议，用户按区域接受或覆盖
- [ ] 阶段之间显示进度横幅
- [ ] Execute-phase 使用 --no-transition 调用（自主模式管理过渡）
- [ ] 执行后验证读取 VERIFICATION.md 并根据状态路由
- [ ] 验证通过 → 自动继续到下一个阶段
- [ ] 需要人工验证 → 提示用户验证或跳过
- [ ] 发现缺口 → 向用户提供缺口修复、继续或停止的选项
- [ ] 缺口修复限制为 1 次重试（防止无限循环）
- [ ] Plan-phase 和 execute-phase 失败路由到 handle_blocker
- [ ] 每个阶段后重新读取 ROADMAP.md（捕获插入的阶段）
- [ ] 每个阶段前检查 STATE.md 中的阻塞因素
- [ ] 阻塞因素通过用户选择处理（重试 / 跳过 / 停止）
- [ ] 显示最终完成或停止摘要
- [ ] 所有阶段完成后，调用 lifecycle 步骤（而非手动建议）
- [ ] 审计前显示生命周期过渡横幅
- [ ] 通过 Skill(skill="gsd:audit-milestone") 调用审计
- [ ] 审计结果路由：passed → 自动继续，gaps_found → 用户决定，tech_debt → 用户决定
- [ ] 审计技术失败（无文件/无状态）路由到 handle_blocker
- [ ] 通过带 ${milestone_version} 参数的 Skill() 调用 complete-milestone
- [ ] 通过 Skill() 调用清理 — 内部确认可接受（CTRL-01）
- [ ] 生命周期后显示最终完成横幅
- [ ] 进度条使用阶段编号 / 里程碑总阶段数（而非在未完成阶段中的位置）
- [ ] 智能讨论以 CTRL-03 注释记录与 discuss-phase 的关系
- [ ] 前端阶段在规划前生成 UI-SPEC（步骤 3a.5），如果尚不存在
- [ ] 前端阶段在成功执行后进行 UI 审查审计（步骤 3d.5），如果 UI-SPEC 存在
- [ ] UI 阶段和 UI 审查遵循 workflow.ui_phase 和 workflow.ui_review 配置开关
- [ ] UI 审查是建议性的（非阻塞）— 无论分数如何阶段都继续到 iterate
</success_criteria>
