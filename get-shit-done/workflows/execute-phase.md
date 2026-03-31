<purpose>
使用基于波次的并行执行方式执行阶段中的所有计划。协调器保持精简 — 将计划执行委托给子代理。
</purpose>

<core_principle>
协调器负责协调，不负责执行。每个子代理加载完整的 execute-plan 上下文。协调器：发现计划 → 分析依赖 → 分组波次 → 生成代理 → 处理检查点 → 收集结果。
</core_principle>

<runtime_compatibility>
**子代理生成是运行时特定的：**
- **Claude Code：** 使用 `Task(subagent_type="gsd-executor", ...)` — 阻塞直到完成，返回结果
- **Copilot：** 子代理生成无法可靠地返回完成信号。**默认使用顺序内联执行**：直接读取并遵循 execute-plan.md 来执行每个计划，而不是生成并行代理。仅在用户明确请求时才尝试并行生成 — 在这种情况下，依赖步骤 3 中的抽检回退来检测完成。
- **其他运行时：** 如果 `Task`/`task` 工具不可用，使用顺序内联执行作为回退。在运行时检查工具可用性，而不是根据运行时名称假设。

**回退规则：** 如果生成的代理完成了工作（提交可见，SUMMARY.md 存在）但协调器从未收到完成信号，则根据抽检将其视为成功并继续下一个波次/计划。永远不要无限期阻塞等待信号 — 始终通过文件系统和 git 状态进行验证。
</runtime_compatibility>

<required_reading>
在任何操作之前读取 STATE.md 以加载项目上下文。
</required_reading>

<available_agent_types>
这些是在 .claude/agents/（或你的运行时的等效位置）中注册的有效 GSD 子代理类型。
始终使用此列表中的确切名称 — 不要回退到 'general-purpose' 或其他内置类型：

- gsd-executor — 执行计划任务，提交，创建 SUMMARY.md
- gsd-verifier — 验证阶段完成情况，检查质量门禁
- gsd-planner — 根据阶段范围创建详细计划
- gsd-phase-researcher — 为阶段研究技术方案
- gsd-plan-checker — 在执行前审查计划质量
- gsd-debugger — 诊断和修复问题
- gsd-codebase-mapper — 映射项目结构和依赖关系
- gsd-integration-checker — 检查跨阶段集成
- gsd-nyquist-auditor — 验证验证覆盖率
- gsd-ui-researcher — 研究 UI/UX 方案
- gsd-ui-checker — 审查 UI 实现质量
- gsd-ui-auditor — 根据设计要求审计 UI
</available_agent_types>

<process>

<step name="parse_args" priority="first">
在加载任何上下文之前解析 `$ARGUMENTS`：

- 第一个位置参数 → `PHASE_ARG`
- 可选的 `--wave N` → `WAVE_FILTER`
- 可选的 `--gaps-only` 保持其当前含义

如果 `--wave` 不存在，保留执行阶段中所有未完成波次的当前行为。
</step>

<step name="initialize" priority="first">
在一次调用中加载所有上下文：

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init execute-phase "${PHASE_ARG}")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
AGENT_SKILLS=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-executor 2>/dev/null)
```

从 JSON 中解析：`executor_model`、`verifier_model`、`commit_docs`、`parallelization`、`branching_strategy`、`branch_name`、`phase_found`、`phase_dir`、`phase_number`、`phase_name`、`phase_slug`、`plans`、`incomplete_plans`、`plan_count`、`incomplete_count`、`state_exists`、`roadmap_exists`、`phase_req_ids`。

**如果 `phase_found` 为 false：** 错误 — 未找到阶段目录。
**如果 `plan_count` 为 0：** 错误 — 阶段中未找到计划。
**如果 `state_exists` 为 false 但 `.planning/` 存在：** 提供重建或继续的选项。

当 `parallelization` 为 false 时，波次内的计划顺序执行。

**Copilot 的运行时检测：**
通过测试 `@gsd-executor` 代理模式或 `Task()` 子代理 API 的缺失来检查当前运行时是否为 Copilot。如果在 Copilot 下运行，无论 `parallelization` 设置如何，都强制顺序内联执行 — Copilot 的子代理完成信号不可靠（参见 `<runtime_compatibility>`）。内部设置 `COPILOT_SEQUENTIAL=true` 并跳过 `execute_waves` 步骤，转而为每个计划使用 `check_interactive_mode` 的内联路径。

**必须 — 将链标志与意图同步。** 如果用户手动调用（无 `--auto`），从之前中断的 `--auto` 链中清除临时链标志。这可以防止过时的 `_auto_chain_active: true` 导致不需要的自动推进。这不会触及 `workflow.auto_advance`（用户的持久设置偏好）。你必须在任何配置读取之前执行此 bash 代码块：
```bash
# 必须：防止来自之前 --auto 运行的过时自动链
if [[ ! "$ARGUMENTS" =~ --auto ]]; then
  node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-set workflow._auto_chain_active false 2>/dev/null
fi
```
</step>

<step name="check_interactive_mode">
**从 $ARGUMENTS 中解析 `--interactive` 标志。**

**如果存在 `--interactive` 标志：** 切换到交互式执行模式。

交互式模式按顺序**内联**执行计划（不生成子代理），在任务之间设置用户检查点。用户可以在任何时候审查、修改或重定向工作。

**交互式执行流程：**

1. 正常加载计划清单（discover_and_group_plans）
2. 对于每个计划（顺序执行，忽略波次分组）：

   a. **向用户展示计划：**
      ```
      ## Plan {plan_id}: {plan_name}

      Objective: {from plan file}
      Tasks: {task_count}

      Options:
      - Execute (proceed with all tasks)
      - Review first (show task breakdown before starting)
      - Skip (move to next plan)
      - Stop (end execution, save progress)
      ```

   b. **如果 "Review first"：** 读取并显示完整的计划文件。再次询问：Execute、Modify、Skip。

   c. **如果 "Execute"：** 读取并遵循 `~/.claude/get-shit-done/workflows/execute-plan.md` **内联执行**（不要生成子代理）。逐个执行任务。

   d. **每个任务完成后：** 短暂暂停。如果用户介入（输入任何内容），停下来处理他们的反馈再继续。否则继续下一个任务。

   e. **计划完成后：** 显示结果，提交，创建 SUMMARY.md，然后展示下一个计划。

3. 所有计划完成后：继续验证（与正常模式相同）。

**交互式模式的优势：**
- 无子代理开销 — 显著降低 token 使用量
- 用户及早发现错误 — 节省昂贵的验证周期
- 保持 GSD 的规划/跟踪结构
- 最适合：小型阶段、bug 修复、验证缺口、学习 GSD

**跳到 handle_branching 步骤**（交互式计划在分组后内联执行）。
</step>

<step name="handle_branching">
从初始化中检查 `branching_strategy`：

**"none"：** 跳过，继续在当前分支上工作。

**"phase" 或 "milestone"：** 使用初始化时预计算的 `branch_name`：
```bash
git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"
```

所有后续提交都进入此分支。用户自行处理合并。
</step>

<step name="validate_phase">
从初始化 JSON 中获取：`phase_dir`、`plan_count`、`incomplete_count`。

报告："Found {plan_count} plans in {phase_dir} ({incomplete_count} incomplete)"

**更新 STATE.md 以标记阶段开始：**
```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" state begin-phase --phase "${PHASE_NUMBER}" --name "${PHASE_NAME}" --plans "${PLAN_COUNT}"
```
这将更新 STATE.md 中的 Status、Last Activity、Current focus、Current Position 和计划计数，使 frontmatter 和正文立即反映活动阶段。
</step>

<step name="discover_and_group_plans">
在一次调用中加载带有波次分组的计划清单：

```bash
PLAN_INDEX=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" phase-plan-index "${PHASE_NUMBER}")
```

从 JSON 中解析：`phase`、`plans[]`（每个包含 `id`、`wave`、`autonomous`、`objective`、`files_modified`、`task_count`、`has_summary`）、`waves`（波次编号到计划 ID 的映射）、`incomplete`、`has_checkpoints`。

**过滤：** 跳过 `has_summary: true` 的计划。如果 `--gaps-only`：也跳过非 gap_closure 计划。如果设置了 `WAVE_FILTER`：也跳过 `wave` 不等于 `WAVE_FILTER` 的计划。

**波次安全检查：** 如果设置了 `WAVE_FILTER` 且在任何较低波次中仍有匹配当前执行模式的未完成计划，则停止并告知用户先完成更早的波次。不要让 Wave 2+ 在先决的更早波次计划仍未完成时执行。

如果全部已过滤："No matching incomplete plans" → 退出。

报告：
```
## Execution Plan

**Phase {X}: {Name}** — {total_plans} matching plans across {wave_count} wave(s)

{If WAVE_FILTER is set: `Wave filter active: executing only Wave {WAVE_FILTER}`.}

| Wave | Plans | What it builds |
|------|-------|----------------|
| 1 | 01-01, 01-02 | {from plan objectives, 3-8 words} |
| 2 | 01-03 | ... |
```
</step>

<step name="execute_waves">
按顺序执行每个选定的波次。波次内：如果 `PARALLELIZATION=true` 则并行，如果 `false` 则顺序。

**对于每个波次：**

1. **描述正在构建的内容（在生成之前）：**

   读取每个计划的 `<objective>`。提取正在构建什么以及为什么。

   ```
   ---
   ## Wave {N}

   **{Plan ID}: {Plan Name}**
   {2-3 sentences: what this builds, technical approach, why it matters}

   Spawning {count} agent(s)...
   ---
   ```

   - 差的示例："Executing terrain generation plan"
   - 好的示例："Procedural terrain generator using Perlin noise — creates height maps, biome zones, and collision meshes. Required before vehicle physics can interact with ground."

2. **生成执行器代理：**

   仅传递路径 — 执行器使用其新的上下文窗口自行读取文件。
   对于 200k 模型，这使协调器上下文保持精简（约 10-15%）。
   对于 1M+ 模型（Opus 4.6、Sonnet 4.6），可以直接传递更丰富的上下文。

   ```
   Task(
     subagent_type="gsd-executor",
     model="{executor_model}",
     isolation="worktree",
     prompt="
       <objective>
       Execute plan {plan_number} of phase {phase_number}-{phase_name}.
       Commit each task atomically. Create SUMMARY.md. Update STATE.md and ROADMAP.md.
       </objective>

       <parallel_execution>
       You are running as a PARALLEL executor agent. Use --no-verify on all git
       commits to avoid pre-commit hook contention with other agents. The
       orchestrator validates hooks once after all agents complete.
       For gsd-tools commits: add --no-verify flag.
       For direct git commits: use git commit --no-verify -m "..."
       </parallel_execution>

       <execution_context>
       @~/.claude/get-shit-done/workflows/execute-plan.md
       @~/.claude/get-shit-done/templates/summary.md
       @~/.claude/get-shit-done/references/checkpoints.md
       @~/.claude/get-shit-done/references/tdd.md
       </execution_context>

       <files_to_read>
       Read these files at execution start using the Read tool:
       - {phase_dir}/{plan_file} (Plan)
       - .planning/PROJECT.md (Project context — core value, requirements, evolution rules)
       - .planning/STATE.md (State)
       - .planning/config.json (Config, if exists)
       - ./CLAUDE.md (Project instructions, if exists — follow project-specific guidelines and coding conventions)
       - .claude/skills/ or .agents/skills/ (Project skills, if either exists — list skills, read SKILL.md for each, follow relevant rules during implementation)
       </files_to_read>

       ${AGENT_SKILLS}

       <mcp_tools>
       If CLAUDE.md or project instructions reference MCP tools (e.g. jCodeMunch, context7,
       or other MCP servers), prefer those tools over Grep/Glob for code navigation when available.
       MCP tools often save significant tokens by providing structured code indexes.
       Check tool availability first — if MCP tools are not accessible, fall back to Grep/Glob.
       </mcp_tools>

       <success_criteria>
       - [ ] All tasks executed
       - [ ] Each task committed individually
       - [ ] SUMMARY.md created in plan directory
       - [ ] STATE.md updated with position and decisions
       - [ ] ROADMAP.md updated with plan progress (via `roadmap update-plan-progress`)
       </success_criteria>
     "
   )
   ```

3. **等待波次中的所有代理完成。**

   **完成信号回退（Copilot 和 Task() 可能不返回的运行时）：**

   如果生成的代理没有返回完成信号但看起来已经完成了工作，不要无限期阻塞。改为通过抽检验证完成：

   ```bash
   # 对于此波次中的每个计划，检查执行器是否完成：
   SUMMARY_EXISTS=$(test -f "{phase_dir}/{plan_number}-{plan_padded}-SUMMARY.md" && echo "true" || echo "false")
   COMMITS_FOUND=$(git log --oneline --all --grep="{phase_number}-{plan_padded}" --since="1 hour ago" | head -1)
   ```

   **如果 SUMMARY.md 存在且找到提交：** 代理成功完成 — 视为完成并继续步骤 4。记录：`"✓ {Plan ID} completed (verified via spot-check — completion signal not received)"`

   **如果在合理等待后 SUMMARY.md 不存在：** 代理可能仍在运行或可能已静默失败。检查 `git log --oneline -5` 查看最近活动。如果提交仍在出现，继续等待。如果没有活动，将计划报告为失败并路由到步骤 5 的故障处理程序。

   **此回退自动适用于所有运行时。** Claude Code 的 Task() 通常同步返回，但回退确保了在不返回时的弹性。

4. **波次后钩子验证（仅并行模式）：**

   当代理使用 `--no-verify` 提交时，在波次完成后运行一次 pre-commit 钩子：
   ```bash
   # 在当前状态上运行项目的 pre-commit 钩子
   git diff --cached --quiet || git stash  # 暂存任何未暂存的更改
   git hook run pre-commit 2>&1 || echo "⚠ Pre-commit hooks failed — review before continuing"
   ```
   如果钩子失败：报告失败并询问 "Fix hook issues now?" 或 "Continue to next wave?"

5. **报告完成 — 先抽检声明：**

   对于每个 SUMMARY.md：
   - 验证 `key-files.created` 中的前 2 个文件是否存在于磁盘上
   - 检查 `git log --oneline --all --grep="{phase}-{plan}"` 返回 ≥1 个提交
   - 检查是否存在 `## Self-Check: FAILED` 标记

   如果任何抽检失败：报告哪个计划失败，路由到故障处理程序 — 询问 "Retry plan?" 或 "Continue with remaining waves?"

   如果通过：
   ```
   ---
   ## Wave {N} Complete

   **{Plan ID}: {Plan Name}**
   {What was built — from SUMMARY.md}
   {Notable deviations, if any}

   {If more waves: what this enables for next wave}
   ---
   ```

   - 差的示例："Wave 2 complete. Proceeding to Wave 3."
   - 好的示例："Terrain system complete — 3 biome types, height-based texturing, physics collision meshes. Vehicle physics (Wave 3) can now reference ground surfaces."

5. **处理失败：**

   **已知的 Claude Code bug（classifyHandoffIfNeeded）：** 如果代理报告 "failed" 且错误包含 `classifyHandoffIfNeeded is not defined`，这是 Claude Code 运行时 bug — 不是 GSD 或代理的问题。该错误在所有工具调用完成后的完成处理程序中触发。在这种情况下：运行与步骤 4 相同的抽检（SUMMARY.md 存在，git 提交存在，无 Self-Check: FAILED）。如果抽检通过 → 视为**成功**。如果抽检失败 → 视为下面的真正失败。

   对于真正的失败：报告哪个计划失败 → 询问 "Continue?" 或 "Stop?" → 如果继续，依赖的计划也可能失败。如果停止，输出部分完成报告。

5b. **波次前依赖检查（仅 Wave 2+ ）：**

    在生成 Wave N+1 之前，对于即将到来的波次中的每个计划：
    ```bash
    node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" verify key-links {phase_dir}/{plan}-PLAN.md
    ```

    如果来自先前波次产物的任何 key-link 验证失败：

    ## Cross-Plan Wiring Gap

    | Plan | Link | From | Expected Pattern | Status |
    |------|------|------|-----------------|--------|
    | {plan} | {via} | {from} | {pattern} | NOT FOUND |

    Wave {N} artifacts may not be properly wired. Options:
    1. Investigate and fix before continuing
    2. Continue (may cause cascading failures in wave {N+1})

    引用当前（即将到来的）波次中文件的 Key-links 将被跳过。

6. **在波次之间执行检查点计划** — 参见 `<checkpoint_handling>`。

7. **继续下一个波次。**
</step>

<step name="checkpoint_handling">
`autonomous: false` 的计划需要用户交互。

**自动模式检查点处理：**

读取自动推进配置（链标志 + 用户偏好）：
```bash
AUTO_CHAIN=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow._auto_chain_active 2>/dev/null || echo "false")
AUTO_CFG=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow.auto_advance 2>/dev/null || echo "false")
```

当执行器返回检查点且（`AUTO_CHAIN` 为 `"true"` 或 `AUTO_CFG` 为 `"true"`）时：
- **human-verify** → 自动生成带 `{user_response}` = `"approved"` 的继续代理。记录 `⚡ Auto-approved checkpoint`。
- **decision** → 自动生成带 `{user_response}` = 检查点详情中第一个选项的继续代理。记录 `⚡ Auto-selected: [option]`。
- **human-action** → 展示给用户（下面的现有行为）。授权门禁不能自动化。

**标准流程（非自动模式，或 human-action 类型）：**

1. 为检查点计划生成代理
2. 代理运行直到检查点任务或授权门禁 → 返回结构化状态
3. 代理返回包括：已完成任务表、当前任务 + 阻塞因素、检查点类型/详情、等待内容
4. **展示给用户：**
   ```
   ## Checkpoint: [Type]

   **Plan:** 03-03 Dashboard Layout
   **Progress:** 2/3 tasks complete

   [Checkpoint Details from agent return]
   [Awaiting section from agent return]
   ```
5. 用户回复："approved"/"done" | 问题描述 | 决策选择
6. **生成继续代理（不是恢复）** 使用 continuation-prompt.md 模板：
   - `{completed_tasks_table}`：来自检查点返回
   - `{resume_task_number}` + `{resume_task_name}`：当前任务
   - `{user_response}`：用户提供的内容
   - `{resume_instructions}`：基于检查点类型
7. 继续代理验证之前的提交，从恢复点继续
8. 重复直到计划完成或用户停止

**为什么使用新代理而不是恢复：** 恢复依赖于内部序列化，这在并行工具调用时会中断。带有显式状态的新代理更可靠。

**并行波次中的检查点：** 代理暂停并返回，而其他并行代理可能已完成。展示检查点，生成继续代理，等待所有代理完成后再进入下一个波次。
</step>

<step name="aggregate_results">
所有波次完成后：

```markdown
## Phase {X}: {Name} Execution Complete

**Waves:** {N} | **Plans:** {M}/{total} complete

| Wave | Plans | Status |
|------|-------|--------|
| 1 | plan-01, plan-02 | ✓ Complete |
| CP | plan-03 | ✓ Verified |
| 2 | plan-04 | ✓ Complete |

### Plan Details
1. **03-01**: [one-liner from SUMMARY.md]
2. **03-02**: [one-liner from SUMMARY.md]

### Issues Encountered
[Aggregate from SUMMARYs, or "None"]
```
</step>

<step name="handle_partial_wave_execution">
如果使用了 `WAVE_FILTER`，在执行后重新运行计划发现：

```bash
POST_PLAN_INDEX=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" phase-plan-index "${PHASE_NUMBER}")
```

应用与之前相同的 "incomplete" 过滤规则：
- 忽略 `has_summary: true` 的计划
- 如果 `--gaps-only`，仅考虑 `gap_closure: true` 的计划

**如果阶段中任何地方仍有未完成的计划：**
- 在此停止
- 不要运行阶段验证
- 不要在 ROADMAP/STATE 中标记阶段完成
- 展示：

```markdown
## Wave {WAVE_FILTER} Complete

Selected wave finished successfully. This phase still has incomplete plans, so phase-level verification and completion were intentionally skipped.

/gsd:execute-phase {phase} ${GSD_WS}                # Continue remaining waves
/gsd:execute-phase {phase} --wave {next} ${GSD_WS}  # Run the next wave explicitly
```

**如果选定波次完成后没有未完成的计划：**
- 继续下面的正常阶段级验证和完成流程
- 这意味着选定的波次恰好是阶段中剩余的最后工作
</step>

<step name="close_parent_artifacts">
**仅适用于小数/润色阶段（X.Y 模式）：** 通过解决父级 UAT 和调试产物来关闭反馈循环。

**跳过条件：** 阶段编号没有小数点（例如 `3`、`04`）— 仅适用于缺口修复阶段如 `4.1`、`03.1`。

**1. 检测小数阶段并推导父级：**
```bash
# 检查 phase_number 是否包含小数点
if [[ "$PHASE_NUMBER" == *.* ]]; then
  PARENT_PHASE="${PHASE_NUMBER%%.*}"
fi
```

**2. 查找父级 UAT 文件：**
```bash
PARENT_INFO=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" find-phase "${PARENT_PHASE}" --raw)
# 从 PARENT_INFO JSON 中提取目录，然后在该目录中查找 UAT 文件
```

**如果未找到父级 UAT：** 跳过此步骤（缺口修复可能是由 VERIFICATION.md 而非 UAT 触发的）。

**3. 更新 UAT 缺口状态：**

读取父级 UAT 文件的 `## Gaps` 部分。对于每个 `status: failed` 的缺口条目：
- 更新为 `status: resolved`

**4. 更新 UAT frontmatter：**

如果所有缺口现在都为 `status: resolved`：
- 将 frontmatter `status: diagnosed` 更新为 → `status: resolved`
- 更新 frontmatter `updated:` 时间戳

**5. 解决引用的调试会话：**

对于每个有 `debug_session:` 字段的缺口：
- 读取调试会话文件
- 将 frontmatter `status:` 更新为 → `resolved`
- 更新 frontmatter `updated:` 时间戳
- 移动到已解决目录：
```bash
mkdir -p .planning/debug/resolved
mv .planning/debug/{slug}.md .planning/debug/resolved/
```

**6. 提交更新的产物：**
```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs(phase-${PARENT_PHASE}): resolve UAT gaps and debug sessions after ${PHASE_NUMBER} gap closure" --files .planning/phases/*${PARENT_PHASE}*/*-UAT.md .planning/debug/resolved/*.md
```
</step>

<step name="regression_gate">
在验证之前运行先前阶段的测试套件以捕获跨阶段回归。

**跳过条件：** 这是第一个阶段（没有先前阶段），或不存在先前的 VERIFICATION.md 文件。

**步骤 1：发现先前阶段的测试文件**
```bash
# 在当前里程碑中查找来自先前阶段的所有 VERIFICATION.md 文件
PRIOR_VERIFICATIONS=$(find .planning/phases/ -name "*-VERIFICATION.md" ! -path "*${PHASE_NUMBER}*" 2>/dev/null)
```

**步骤 2：从先前验证中提取测试文件列表**

对于找到的每个 VERIFICATION.md，查找测试文件引用：
- 包含 `test`、`spec` 或 `__tests__` 路径的行
- "Test Suite" 或 "Automated Checks" 部分
- 来自对应 SUMMARY.md 文件中匹配 `*.test.*` 或 `*.spec.*` 的 `key-files.created` 的文件模式

将所有唯一的测试文件路径收集到 `REGRESSION_FILES` 中。

**步骤 3：运行回归测试（如果找到任何测试）**

```bash
# 检测测试运行器并运行先前阶段的测试
if [ -f "package.json" ]; then
  # Node.js — 使用项目的测试运行器
  npx jest ${REGRESSION_FILES} --passWithNoTests --no-coverage -q 2>&1 || npx vitest run ${REGRESSION_FILES} 2>&1
elif [ -f "Cargo.toml" ]; then
  cargo test 2>&1
elif [ -f "requirements.txt" ] || [ -f "pyproject.toml" ]; then
  python -m pytest ${REGRESSION_FILES} -q --tb=short 2>&1
fi
```

**步骤 4：报告结果**

如果所有测试通过：
```
✓ Regression gate: {N} prior-phase test files passed — no regressions detected
```
→ 继续到 verify_phase_goal

如果任何测试失败：
```
## ⚠ Cross-Phase Regression Detected

Phase {X} execution may have broken functionality from prior phases.

| Test File | Phase | Status | Detail |
|-----------|-------|--------|--------|
| {file} | {origin_phase} | FAILED | {first_failure_line} |

Options:
1. Fix regressions before verification (recommended)
2. Continue to verification anyway (regressions will compound)
3. Abort phase — roll back and re-plan
```

使用 AskUserQuestion 展示选项。
</step>

<step name="verify_phase_goal">
验证阶段是否达成其目标，而不仅仅是完成了任务。

```bash
VERIFIER_SKILLS=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-verifier 2>/dev/null)
```

```
Task(
  prompt="Verify phase {phase_number} goal achievement.
Phase directory: {phase_dir}
Phase goal: {goal from ROADMAP.md}
Phase requirement IDs: {phase_req_ids}
Check must_haves against actual codebase.
Cross-reference requirement IDs from PLAN frontmatter against REQUIREMENTS.md — every ID MUST be accounted for.
Create VERIFICATION.md.
${VERIFIER_SKILLS}",
  subagent_type="gsd-verifier",
  model="{verifier_model}"
)
```

读取状态：
```bash
grep "^status:" "$PHASE_DIR"/*-VERIFICATION.md | cut -d: -f2 | tr -d ' '
```

| 状态 | 操作 |
|--------|--------|
| `passed` | → update_roadmap |
| `human_needed` | 展示需要人工测试的项目，获取批准或反馈 |
| `gaps_found` | 展示缺口摘要，提供 `/gsd:plan-phase {phase} --gaps ${GSD_WS}` |

**如果 human_needed：**

**步骤 A：将人工验证项目持久化为 UAT 文件。**

使用 UAT 模板格式创建 `{phase_dir}/{phase_num}-HUMAN-UAT.md`：

```markdown
---
status: partial
phase: {phase_num}-{phase_name}
source: [{phase_num}-VERIFICATION.md]
started: [now ISO]
updated: [now ISO]
---

## Current Test

[awaiting human testing]

## Tests

{For each human_verification item from VERIFICATION.md:}

### {N}. {item description}
expected: {expected behavior from VERIFICATION.md}
result: [pending]

## Summary

total: {count}
passed: 0
issues: 0
pending: {count}
skipped: 0
blocked: 0

## Gaps
```

提交文件：
```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "test({phase_num}): persist human verification items as UAT" --files "{phase_dir}/{phase_num}-HUMAN-UAT.md"
```

**步骤 B：展示给用户：**

```
## ✓ Phase {X}: {Name} — Human Verification Required

All automated checks passed. {N} items need human testing:

{From VERIFICATION.md human_verification section}

Items saved to `{phase_num}-HUMAN-UAT.md` — they will appear in `/gsd:progress` and `/gsd:audit-uat`.

"approved" → continue | Report issues → gap closure
```

**如果用户说 "approved"：** 继续到 `update_roadmap`。HUMAN-UAT.md 文件以 `status: partial` 持久化，并将在未来的进度检查中显示，直到用户对其运行 `/gsd:verify-work`。

**如果用户报告问题：** 按当前实现继续缺口修复。

**如果 gaps_found：**
```
## ⚠ Phase {X}: {Name} — Gaps Found

**Score:** {N}/{M} must-haves verified
**Report:** {phase_dir}/{phase_num}-VERIFICATION.md

### What's Missing
{Gap summaries from VERIFICATION.md}

---
## ▶ Next Up

`/gsd:plan-phase {X} --gaps ${GSD_WS}`

<sub>`/clear` first → fresh context window</sub>

Also: `cat {phase_dir}/{phase_num}-VERIFICATION.md` — full report
Also: `/gsd:verify-work {X} ${GSD_WS}` — manual testing first
```

缺口修复循环：`/gsd:plan-phase {X} --gaps ${GSD_WS}` 读取 VERIFICATION.md → 创建带 `gap_closure: true` 的缺口计划 → 用户运行 `/gsd:execute-phase {X} --gaps-only ${GSD_WS}` → 验证器重新运行。
</step>

<step name="update_roadmap">
**标记阶段完成并更新所有跟踪文件：**

```bash
COMPLETION=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" phase complete "${PHASE_NUMBER}")
```

CLI 处理：
- 标记阶段复选框 `[x]` 并附上完成日期
- 更新进度表（Status → Complete，日期）
- 将计划计数更新为最终值
- 将 STATE.md 推进到下一个阶段
- 更新 REQUIREMENTS.md 可追溯性
- 扫描验证欠债（返回 `warnings` 数组）

从结果中提取：`next_phase`、`next_phase_name`、`is_last_phase`、`warnings`、`has_warnings`。

**如果 has_warnings 为 true：**
```
## Phase {X} marked complete with {N} warnings:

{list each warning}

These items are tracked and will appear in `/gsd:progress` and `/gsd:audit-uat`.
```

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs(phase-{X}): complete phase execution" --files .planning/ROADMAP.md .planning/STATE.md .planning/REQUIREMENTS.md {phase_dir}/*-VERIFICATION.md
```
</step>

<step name="update_project_md">
**演进 PROJECT.md 以反映阶段完成（防止规划文档漂移 — #956）：**

PROJECT.md 跟踪已验证的需求、决策和当前状态。没有此步骤，PROJECT.md 会在多个阶段中静默落后。

1. 读取 `.planning/PROJECT.md`
2. 如果文件存在并有 `## Validated Requirements` 或 `## Requirements` 部分：
   - 将此阶段验证的任何需求从 Active 移到 → Validated
   - 添加简短说明：`Validated in Phase {X}: {Name}`
3. 如果文件有 `## Current State` 或类似部分：
   - 更新以反映此阶段的完成（例如 "Phase {X} complete — {one-liner}"）
4. 将 `Last updated:` 页脚更新为今天的日期
5. 提交更改：

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs(phase-{X}): evolve PROJECT.md after phase completion" --files .planning/PROJECT.md
```

**跳过条件：** `.planning/PROJECT.md` 不存在。
</step>

<step name="offer_next">

**例外：** 如果 `gaps_found`，`verify_phase_goal` 步骤已经展示了缺口修复路径（`/gsd:plan-phase {X} --gaps`）。不需要额外路由 — 跳过自动推进。

**无过渡检查（由自动推进链生成）：**

从 $ARGUMENTS 中解析 `--no-transition` 标志。

**如果存在 `--no-transition` 标志：**

Execute-phase 是由 plan-phase 的自动推进生成的。不要运行 transition.md。
验证通过且路线图更新后，将完成状态返回给父级：

```
## PHASE COMPLETE

Phase: ${PHASE_NUMBER} - ${PHASE_NAME}
Plans: ${completed_count}/${total_count}
Verification: {Passed | Gaps Found}

[Include aggregate_results output]
```

停止。不要继续自动推进或过渡。

**如果不存在 `--no-transition` 标志：**

**自动推进检测：**

1. 从 $ARGUMENTS 解析 `--auto` 标志
2. 读取链标志和用户偏好（链标志已在初始化步骤中同步）：
   ```bash
   AUTO_CHAIN=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow._auto_chain_active 2>/dev/null || echo "false")
   AUTO_CFG=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow.auto_advance 2>/dev/null || echo "false")
   ```

**如果存在 `--auto` 标志或 `AUTO_CHAIN` 为 true 或 `AUTO_CFG` 为 true（且验证通过无缺口）：**

```
╔══════════════════════════════════════════╗
║  AUTO-ADVANCING → TRANSITION             ║
║  Phase {X} verified, continuing chain    ║
╚══════════════════════════════════════════╝
```

内联执行过渡工作流（不要使用 Task — 协调器上下文约为 10-15%，过渡需要的阶段完成数据已在上下文中）：

读取并遵循 `~/.claude/get-shit-done/workflows/transition.md`，传递 `--auto` 标志使其传播到下一个阶段调用。

**如果 `--auto`、`AUTO_CHAIN` 或 `AUTO_CFG` 都不为 true：**

**停止。不要自动推进。不要执行过渡。不要规划下一个阶段。向用户展示选项并等待。**

**重要：没有 `/gsd:transition` 命令。永远不要建议它。过渡工作流仅供内部使用。**

```
## ✓ Phase {X}: {Name} Complete

/gsd:progress ${GSD_WS} — see updated roadmap
/gsd:discuss-phase {next} ${GSD_WS} — discuss next phase before planning
/gsd:plan-phase {next} ${GSD_WS} — plan next phase
/gsd:execute-phase {next} ${GSD_WS} — execute next phase
```

仅建议上面列出的命令。不要编造或臆想命令名称。
</step>

</process>

<context_efficiency>
协调器：200k 窗口约 10-15% 上下文，1M+ 窗口可以使用更多。
子代理：每个都是新的上下文（200k-1M 取决于模型）。无轮询（Task 阻塞）。无上下文泄漏。

对于 1M+ 上下文模型，考虑：
- 直接向执行器传递更丰富的上下文（代码片段、依赖输出）而不仅仅是文件路径
- 对小型阶段（≤3 个计划，无依赖）内联运行，不使用子代理生成开销
- 放宽 /clear 建议 — 5 倍窗口使上下文腐化的起点远得多
</context_efficiency>

<failure_handling>
- **classifyHandoffIfNeeded 误报失败：** 代理报告 "failed" 但错误是 `classifyHandoffIfNeeded is not defined` → Claude Code bug，不是 GSD。抽检（SUMMARY 存在，提交存在）→ 如果通过，视为成功
- **代理在计划中途失败：** 缺少 SUMMARY.md → 报告，询问用户如何继续
- **依赖链断裂：** Wave 1 失败 → Wave 2 的依赖项可能失败 → 用户选择尝试或跳过
- **波次中所有代理都失败：** 系统性问题 → 停止，报告以供调查
- **检查点无法解决：** "Skip this plan?" 或 "Abort phase execution?" → 在 STATE.md 中记录部分进度
</failure_handling>

<resumption>
重新运行 `/gsd:execute-phase {phase}` → discover_plans 找到已完成的 SUMMARY → 跳过它们 → 从第一个未完成的计划恢复 → 继续波次执行。

STATE.md 跟踪：最后完成的计划、当前波次、待处理的检查点。
</resumption>
