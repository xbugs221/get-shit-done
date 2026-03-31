<purpose>
执行阶段提示（PLAN.md）并创建结果总结（SUMMARY.md）。
</purpose>

<required_reading>
在任何操作前读取 STATE.md 以加载项目上下文。
读取 config.json 以获取规划行为设置。

@~/.claude/get-shit-done/references/git-integration.md
</required_reading>

<available_agent_types>
有效的 GSD 子 agent 类型（使用确切名称 — 不要回退到 'general-purpose'）：
- gsd-executor — 执行计划任务、提交、创建 SUMMARY.md
</available_agent_types>

<process>

<step name="init_context" priority="first">
加载执行上下文（仅路径以最小化编排器上下文）：

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init execute-phase "${PHASE}")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

从 init JSON 中提取：`executor_model`、`commit_docs`、`sub_repos`、`phase_dir`、`phase_number`、`plans`、`summaries`、`incomplete_plans`、`state_path`、`config_path`。

如果 `.planning/` 缺失：报错。
</step>

<step name="identify_plan">
```bash
# 使用来自 INIT JSON 的 plans/summaries，或列出文件
(ls .planning/phases/XX-name/*-PLAN.md 2>/dev/null || true) | sort
(ls .planning/phases/XX-name/*-SUMMARY.md 2>/dev/null || true) | sort
```

找到第一个没有对应 SUMMARY 的 PLAN。支持小数阶段（`01.1-hotfix/`）：

```bash
PHASE=$(echo "$PLAN_PATH" | grep -oE '[0-9]+(\.[0-9]+)?-[0-9]+')
# 如需要，可通过 gsd-tools config-get 获取配置设置
```

<if mode="yolo">
自动批准：`⚡ 执行 {phase}-{plan}-PLAN.md [阶段 Z 的计划 X / Y]` → parse_segments。
</if>

<if mode="interactive" OR="custom with gates.execute_next_plan true">
展示计划识别结果，等待确认。
</if>
</step>

<step name="record_start_time">
```bash
PLAN_START_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
PLAN_START_EPOCH=$(date +%s)
```
</step>

<step name="parse_segments">
```bash
grep -n "type=\"checkpoint" .planning/phases/XX-name/{phase}-{plan}-PLAN.md
```

**按检查点类型路由：**

| 检查点 | 模式 | 执行方式 |
|--------|------|----------|
| 无 | A（自主） | 单个子 agent：完整计划 + SUMMARY + 提交 |
| 仅验证 | B（分段） | 检查点之间的段落。在 none/human-verify 之后 → 子 AGENT。在 decision/human-action 之后 → 主上下文 |
| 决策 | C（主） | 完全在主上下文中执行 |

**模式 A：** init_agent_tracking → 启动 Task(subagent_type="gsd-executor", model=executor_model, isolation="worktree")，提示为：在 [路径] 执行计划，自主模式，所有任务 + SUMMARY + 提交，遵循偏差/认证规则，报告：计划名称、任务、SUMMARY 路径、提交哈希 → 追踪 agent_id → 等待 → 更新追踪 → 报告。

**模式 B：** 逐段执行。自主段落：为分配的任务启动子 agent（不包含 SUMMARY/提交）。检查点：主上下文。所有段落完成后：汇总，创建 SUMMARY，提交。参见 segment_execution。

**模式 C：** 在主上下文中使用标准流程执行（step name="execute"）。

每个子 agent 的全新上下文保持峰值质量。主上下文保持精简。
</step>

<step name="init_agent_tracking">
```bash
if [ ! -f .planning/agent-history.json ]; then
  echo '{"version":"1.0","max_entries":50,"entries":[]}' > .planning/agent-history.json
fi
rm -f .planning/current-agent-id.txt
if [ -f .planning/current-agent-id.txt ]; then
  INTERRUPTED_ID=$(cat .planning/current-agent-id.txt)
  echo "Found interrupted agent: $INTERRUPTED_ID"
fi
```

如果中断：询问用户是恢复（Task `resume` 参数）还是重新开始。

**追踪协议：** 启动时：将 agent_id 写入 `current-agent-id.txt`，追加到 agent-history.json：`{"agent_id":"[id]","task_description":"[desc]","phase":"[phase]","plan":"[plan]","segment":[num|null],"timestamp":"[ISO]","status":"spawned","completion_timestamp":null}`。完成时：status → "completed"，设置 completion_timestamp，删除 current-agent-id.txt。清理：如果 entries > max_entries，移除最旧的 "completed"（永不移除 "spawned"）。

对模式 A/B 在启动前运行。模式 C：跳过。
</step>

<step name="segment_execution">
仅模式 B（仅验证检查点）。模式 A/C 跳过。

1. 解析段落映射：检查点位置和类型
2. 每个段落：
   - 子 agent 路由：为分配的任务启动 gsd-executor。提示为：任务范围、计划路径、读取完整计划以获取上下文、执行分配的任务、追踪偏差、不包含 SUMMARY/提交。通过 agent 协议追踪。
   - 主上下文路由：使用标准流程执行任务（step name="execute"）
3. 所有段落完成后：汇总文件/偏差/决策 → 创建 SUMMARY.md → 提交 → 自检：
   - 验证 key-files.created 在磁盘上存在，使用 `[ -f ]`
   - 检查 `git log --oneline --all --grep="{phase}-{plan}"` 返回 ≥1 个提交
   - 在 SUMMARY 末尾追加 `## Self-Check: PASSED` 或 `## Self-Check: FAILED`

   **已知 Claude Code 缺陷（classifyHandoffIfNeeded）：** 如果任何段落 agent 报告 "failed" 且错误为 `classifyHandoffIfNeeded is not defined`，这是 Claude Code 运行时缺陷 — 不是真正的失败。运行抽检；如果通过，视为成功。




</step>

<step name="load_prompt">
```bash
cat .planning/phases/XX-name/{phase}-{plan}-PLAN.md
```
这就是执行指令。严格遵循。如果计划引用了 CONTEXT.md：在整个过程中尊重用户的愿景。

**如果计划包含 `<interfaces>` 块：** 这些是预提取的类型定义和契约。直接使用它们 — 不要重新读取源文件来发现类型。规划器已经提取了你需要的内容。
</step>

<step name="previous_phase_check">
```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" phases list --type summaries --raw
# 从 JSON 结果中提取倒数第二个总结
```
如果前一个 SUMMARY 有未解决的"遇到的问题"或"下一阶段准备就绪"阻塞项：AskUserQuestion(header="前期问题", options: "仍然继续" | "先解决" | "审查前期")。
</step>

<step name="execute">
偏差是正常的 — 按以下规则处理。

1. 从提示中读取 @context 文件
2. **MCP 工具：** 如果 CLAUDE.md 或项目指令引用了 MCP 工具（例如用于代码导航的 jCodeMunch），在可用时优先使用它们而非 Grep/Glob。如果 MCP 工具不可访问则回退到 Grep/Glob。
3. 每个任务：
   - **强制 read_first 门控：** 如果任务有 `<read_first>` 字段，你必须在进行任何编辑之前读取所有列出的文件。这不是可选的。不要因为你"已经知道"文件内容就跳过 — 读取它们。read_first 文件为任务建立事实依据。
   - `type="auto"`：如果 `tdd="true"` → TDD 执行。使用偏差规则 + 认证门控进行实现。验证完成标准。提交（参见 task_commit）。记录哈希用于总结。
   - `type="checkpoint:*"`：停止 → checkpoint_protocol → 等待用户 → 仅在确认后继续。
   - **强制 acceptance_criteria 检查：** 完成每个任务后，如果有 `<acceptance_criteria>`，在进入下一个任务之前验证每个标准。使用 grep、文件读取或 CLI 命令确认每个标准。如果任何标准未通过，在继续之前修复实现。不要跳过标准或标记为"稍后验证"。
3. 运行 `<verification>` 检查
4. 确认 `<success_criteria>` 已满足
5. 在总结中记录偏差
</step>

<authentication_gates>

## 认证门控

执行过程中的认证错误不是失败 — 而是预期的交互点。

**指标：** "Not authenticated"、"Unauthorized"、401/403、"Please run {tool} login"、"Set {ENV_VAR}"

**协议：**
1. 识别认证门控（不是缺陷）
2. 停止任务执行
3. 创建动态 checkpoint:human-action，包含确切的认证步骤
4. 等待用户完成认证
5. 验证凭据有效
6. 重试原始任务
7. 正常继续

**示例：** `vercel --yes` → "Not authenticated" → 要求用户执行 `vercel login` 的检查点 → 用 `vercel whoami` 验证 → 重试部署 → 继续

**在总结中：** 记录为正常流程，放在"## 认证门控"下，而非偏差。

</authentication_gates>

<deviation_rules>

## 偏差规则

你会发现计划外的工作。自动应用，全部追踪到总结中。

| 规则 | 触发条件 | 操作 | 权限 |
|------|----------|------|------|
| **1: 缺陷** | 行为异常、错误、查询错误、类型错误、安全漏洞、竞态条件、泄漏 | 修复 → 测试 → 验证 → 追踪 `[Rule 1 - Bug]` | 自动 |
| **2: 缺失关键项** | 缺少必要项：错误处理、验证、认证、CSRF/CORS、速率限制、索引、日志 | 添加 → 测试 → 验证 → 追踪 `[Rule 2 - Missing Critical]` | 自动 |
| **3: 阻塞项** | 阻止完成：缺失依赖、类型错误、导入异常、缺失环境/配置/文件、循环依赖 | 修复阻塞 → 验证可继续 → 追踪 `[Rule 3 - Blocking]` | 自动 |
| **4: 架构性** | 结构性变更：新数据库表、模式变更、新服务、切换库、破坏性 API、新基础设施 | 停止 → 展示决策（见下文）→ 追踪 `[Rule 4 - Architectural]` | 询问用户 |

**规则 4 格式：**
```
⚠️ 需要架构性决策

当前任务: [任务名称]
发现: [触发原因]
提议变更: [修改内容]
必要原因: [理由]
影响范围: [影响什么]
替代方案: [其他方法]

继续执行提议的变更？(yes / 不同方案 / 推迟)
```

**优先级：** 规则 4（停止）> 规则 1-3（自动）> 不确定 → 规则 4
**边界情况：** 缺失验证 → R2 | 空指针崩溃 → R1 | 新表 → R4 | 新列 → R1/2
**启发式：** 影响正确性/安全性/完成度？→ R1-3。可能影响？→ R4。

</deviation_rules>

<deviation_documentation>

## 记录偏差

总结必须包含偏差部分。没有偏差？→ `## 计划偏差\n\n无 - 计划完全按原样执行。`

每个偏差：**[Rule N - 类别] 标题** — 发现于：任务 X | 问题 | 修复 | 修改的文件 | 验证 | 提交哈希

结尾：**偏差总计：** N 个自动修复（分类明细）。**影响：** 评估。

</deviation_documentation>

<tdd_plan_execution>
## TDD 执行

对于 `type: tdd` 计划 — 红-绿-重构：

1. **基础设施**（仅第一个 TDD 计划）：检测项目、安装框架、配置、验证空测试套件
2. **红色：** 读取 `<behavior>` → 编写失败测试 → 运行（必须失败）→ 提交：`test({phase}-{plan}): add failing test for [feature]`
3. **绿色：** 读取 `<implementation>` → 最小代码 → 运行（必须通过）→ 提交：`feat({phase}-{plan}): implement [feature]`
4. **重构：** 清理代码 → 测试必须通过 → 提交：`refactor({phase}-{plan}): clean up [feature]`

错误处理：红色阶段没有失败 → 检查测试/已有功能。绿色阶段没有通过 → 调试，迭代。重构破坏 → 撤销。

参见 `~/.claude/get-shit-done/references/tdd.md` 了解结构。
</tdd_plan_execution>

<precommit_failure_handling>
## Pre-commit 钩子失败处理

你的提交可能触发 pre-commit 钩子。自动修复钩子会透明地处理自身 — 文件会被自动修复并重新暂存。

**如果作为并行执行器 agent 运行（由 execute-phase 启动）：**
对所有提交使用 `--no-verify`。当多个 agent 同时提交时，pre-commit 钩子会导致构建锁争用（例如 Rust 项目中的 cargo 锁冲突）。编排器在所有 agent 完成后统一验证。

**如果作为唯一执行器运行（顺序模式）：**
如果提交被钩子阻塞：

1. `git commit` 命令失败并输出钩子错误
2. 阅读错误 — 它会告诉你确切是哪个钩子以及什么失败了
3. 修复问题（类型错误、lint 违规、密钥泄露等）
4. `git add` 修复后的文件
5. 重试提交
6. 每次提交预算 1-2 次重试
</precommit_failure_handling>

<task_commit>
## 任务提交协议

每个任务完成后（验证通过，完成标准满足），立即提交。

**1. 检查：** `git status --short`

**2. 逐个暂存**（永远不要使用 `git add .` 或 `git add -A`）：
```bash
git add src/api/auth.ts
git add src/types/user.ts
```

**3. 提交类型：**

| 类型 | 何时使用 | 示例 |
|------|----------|------|
| `feat` | 新功能 | feat(08-02): create user registration endpoint |
| `fix` | 缺陷修复 | fix(08-02): correct email validation regex |
| `test` | 仅测试（TDD 红色阶段） | test(08-02): add failing test for password hashing |
| `refactor` | 无行为变更（TDD 重构阶段） | refactor(08-02): extract validation to helper |
| `perf` | 性能优化 | perf(08-02): add database index |
| `docs` | 文档 | docs(08-02): add API docs |
| `style` | 格式化 | style(08-02): format auth module |
| `chore` | 配置/依赖 | chore(08-02): add bcrypt dependency |

**4. 格式：** `{type}({phase}-{plan}): {description}` 加上关键变更的项目符号列表。

<sub_repos_commit_flow>
**子仓库模式：** 如果 `sub_repos` 已配置（来自 init 上下文的非空数组），使用 `commit-to-subrepo` 替代标准 git commit。这会根据路径前缀将文件路由到正确的子仓库。

```bash
node ~/.claude/get-shit-done/bin/gsd-tools.cjs commit-to-subrepo "{type}({phase}-{plan}): {description}" --files file1 file2 ...
```

该命令按子仓库前缀分组文件并原子性地提交到每个仓库。返回 JSON：`{ committed: true, repos: { "backend": { hash: "abc", files: [...] }, ... } }`。

记录响应中每个仓库的哈希值用于 SUMMARY 追踪。

**如果 `sub_repos` 为空或未设置：** 使用下面的标准 git 提交流程。
</sub_repos_commit_flow>

**5. 记录哈希：**
```bash
TASK_COMMIT=$(git rev-parse --short HEAD)
TASK_COMMITS+=("Task ${TASK_NUM}: ${TASK_COMMIT}")
```

**6. 检查未追踪的生成文件：**
```bash
git status --short | grep '^??'
```
如果运行脚本或工具后出现新的未追踪文件，对每个文件决定：
- **提交它** — 如果它是源文件、配置或有意的工件
- **添加到 .gitignore** — 如果它是生成的/运行时输出（构建产物、`.env` 文件、缓存文件、编译输出）
- 不要让生成的文件处于未追踪状态

</task_commit>

<step name="checkpoint_protocol">
遇到 `type="checkpoint:*"` 时：先尽可能自动化一切。检查点仅用于验证/决策。

显示：`检查点: [类型]` 框 → 进度 {X}/{Y} → 任务名称 → 类型特定内容 → `你的操作: [信号]`

| 类型 | 内容 | 恢复信号 |
|------|------|----------|
| human-verify (90%) | 已构建的内容 + 验证步骤（命令/URL） | "approved" 或描述问题 |
| decision (9%) | 需要的决策 + 上下文 + 带优缺点的选项 | "Select: option-id" |
| human-action (1%) | 已自动化的内容 + 一个手动步骤 + 验证计划 | "done" |

响应后：如有指定则验证。通过 → 继续。失败 → 通知，等待。等待用户 — 不要臆造完成。

参见 ~/.claude/get-shit-done/references/checkpoints.md 了解详情。
</step>

<step name="checkpoint_return_for_orchestrator">
当通过 Task 启动并遇到检查点时：返回结构化状态（无法直接与用户交互）。

**必须返回：** 1) 已完成任务表（哈希 + 文件） 2) 当前任务（什么在阻塞） 3) 检查点详情（面向用户的内容） 4) 等待中（需要用户提供什么）

编排器解析 → 向用户展示 → 用你已完成的任务状态启动全新的延续。你不会被恢复。在主上下文中：使用上面的 checkpoint_protocol。
</step>

<step name="verification_failure_gate">
如果验证失败：

**检查节点修复是否启用**（默认：开启）：
```bash
NODE_REPAIR=$(node "./.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow.node_repair 2>/dev/null || echo "true")
```

如果 `NODE_REPAIR` 为 `true`：调用 `@./.claude/get-shit-done/workflows/node-repair.md`，传入：
- FAILED_TASK：任务编号、名称、完成标准
- ERROR：预期结果 vs 实际结果
- PLAN_CONTEXT：相邻任务名称 + 阶段目标
- REPAIR_BUDGET：来自配置的 `workflow.node_repair_budget`（默认：2）

节点修复将自主尝试 RETRY、DECOMPOSE 或 PRUNE。只有在修复预算耗尽（ESCALATE）时才会再次到达此门控。

如果 `NODE_REPAIR` 为 `false` 或修复返回 ESCALATE：停止。展示："任务 [X] 验证失败：[名称]。预期：[标准]。实际：[结果]。已尝试修复：[已尝试内容的摘要]。" 选项：重试 | 跳过（标记为未完成）| 停止（调查）。如果跳过 → SUMMARY "遇到的问题"。
</step>

<step name="record_completion_time">
```bash
PLAN_END_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
PLAN_END_EPOCH=$(date +%s)

DURATION_SEC=$(( PLAN_END_EPOCH - PLAN_START_EPOCH ))
DURATION_MIN=$(( DURATION_SEC / 60 ))

if [[ $DURATION_MIN -ge 60 ]]; then
  HRS=$(( DURATION_MIN / 60 ))
  MIN=$(( DURATION_MIN % 60 ))
  DURATION="${HRS}h ${MIN}m"
else
  DURATION="${DURATION_MIN} min"
fi
```
</step>

<step name="generate_user_setup">
```bash
grep -A 50 "^user_setup:" .planning/phases/XX-name/{phase}-{plan}-PLAN.md | head -50
```

如果 user_setup 存在：使用模板 `~/.claude/get-shit-done/templates/user-setup.md` 创建 `{phase}-USER-SETUP.md`。每个服务包含：环境变量表、账户设置清单、仪表盘配置、本地开发说明、验证命令。状态为"未完成"。设置 `USER_SETUP_CREATED=true`。如果为空/缺失：跳过。
</step>

<step name="create_summary">
在 `.planning/phases/XX-name/` 创建 `{phase}-{plan}-SUMMARY.md`。使用 `~/.claude/get-shit-done/templates/summary.md`。

**前置元数据：** phase、plan、subsystem、tags | requires/provides/affects | tech-stack.added/patterns | key-files.created/modified | key-decisions | requirements-completed（**必须**从 PLAN.md 前置元数据中原样复制 `requirements` 数组）| duration ($DURATION)、completed ($PLAN_END_TIME date)。

标题：`# 阶段 [X] 计划 [Y]: [名称] 总结`

一句话实质性描述："使用 jose 库实现带刷新轮换的 JWT 认证" 而非 "认证已实现"

包含：持续时间、开始/结束时间、任务数、文件数。

下一步：还有更多计划 → "准备执行 {next-plan}" | 最后一个 → "阶段完成，准备进入下一步"。
</step>

<step name="update_current_position">
使用 gsd-tools 更新 STATE.md：

```bash
# 推进计划计数器（处理最后一个计划的边界情况）
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" state advance-plan

# 从磁盘状态重新计算进度条
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" state update-progress

# 记录执行指标
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" state record-metric \
  --phase "${PHASE}" --plan "${PLAN}" --duration "${DURATION}" \
  --tasks "${TASK_COUNT}" --files "${FILE_COUNT}"
```
</step>

<step name="extract_decisions_and_issues">
从 SUMMARY 中：提取决策并添加到 STATE.md：

```bash
# 从 SUMMARY key-decisions 添加每个决策
# 优先使用文件输入以确保 shell 安全文本（精确保留 `$`、`*` 等）
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" state add-decision \
  --phase "${PHASE}" --summary-file "${DECISION_TEXT_FILE}" --rationale-file "${RATIONALE_FILE}"

# 如果有阻塞项则添加
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" state add-blocker --text-file "${BLOCKER_TEXT_FILE}"
```
</step>

<step name="update_session_continuity">
使用 gsd-tools 更新会话信息：

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" state record-session \
  --stopped-at "Completed ${PHASE}-${PLAN}-PLAN.md" \
  --resume-file "None"
```

保持 STATE.md 在 150 行以内。
</step>

<step name="issues_review_gate">
如果 SUMMARY "遇到的问题" ≠ "None"：yolo 模式 → 记录并继续。交互模式 → 展示问题，等待确认。
</step>

<step name="update_roadmap">
```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" roadmap update-plan-progress "${PHASE}"
```
统计磁盘上的 PLAN 与 SUMMARY 文件数。用正确的计数和状态（`In Progress` 或带日期的 `Complete`）更新进度表行。
</step>

<step name="update_requirements">
标记来自 PLAN.md 前置元数据 `requirements:` 字段的已完成需求：

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" requirements mark-complete ${REQ_IDS}
```

从计划的前置元数据中提取需求 ID（例如 `requirements: [AUTH-01, AUTH-02]`）。如果没有 requirements 字段，跳过。
</step>

<step name="git_commit_metadata">
任务代码已按任务逐个提交。提交计划元数据：

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs({phase}-{plan}): complete [plan-name] plan" --files .planning/phases/XX-name/{phase}-{plan}-SUMMARY.md .planning/STATE.md .planning/ROADMAP.md .planning/REQUIREMENTS.md
```
</step>

<step name="update_codebase_map">
如果 .planning/codebase/ 不存在：跳过。

```bash
FIRST_TASK=$(git log --oneline --grep="feat({phase}-{plan}):" --grep="fix({phase}-{plan}):" --grep="test({phase}-{plan}):" --reverse | head -1 | cut -d' ' -f1)
git diff --name-only ${FIRST_TASK}^..HEAD 2>/dev/null || true
```

仅更新结构性变更：新 src/ 目录 → STRUCTURE.md | 依赖 → STACK.md | 文件模式 → CONVENTIONS.md | API 客户端 → INTEGRATIONS.md | 配置 → STACK.md | 重命名 → 更新路径。跳过纯代码/缺陷修复/内容变更。

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "" --files .planning/codebase/*.md --amend
```
</step>

<step name="offer_next">
如果 `USER_SETUP_CREATED=true`：在顶部显示 `⚠️ 需要用户设置`，包含路径 + 环境/配置任务。

```bash
(ls -1 .planning/phases/[current-phase-dir]/*-PLAN.md 2>/dev/null || true) | wc -l
(ls -1 .planning/phases/[current-phase-dir]/*-SUMMARY.md 2>/dev/null || true) | wc -l
```

| 条件 | 路由 | 操作 |
|------|------|------|
| summaries < plans | **A: 还有更多计划** | 找到下一个没有 SUMMARY 的 PLAN。Yolo 模式：自动继续。交互模式：显示下一个计划，建议 `/gsd:execute-phase {phase}` + `/gsd:verify-work`。在此停止。 |
| summaries = plans，当前 < 最高阶段 | **B: 阶段完成** | 显示完成状态，建议 `/gsd:plan-phase {Z+1}` + `/gsd:verify-work {Z}` + `/gsd:discuss-phase {Z+1}` |
| summaries = plans，当前 = 最高阶段 | **C: 里程碑完成** | 显示横幅，建议 `/gsd:complete-milestone` + `/gsd:verify-work` + `/gsd:add-phase` |

所有路由：先 `/clear` 以获得全新上下文。
</step>

</process>

<success_criteria>

- PLAN.md 中的所有任务已完成
- 所有验证通过
- 如果前置元数据中有 user_setup 则生成 USER-SETUP.md
- 创建了包含实质性内容的 SUMMARY.md
- STATE.md 已更新（位置、决策、问题、会话）
- ROADMAP.md 已更新
- 如果代码库地图存在：地图已随执行变更更新（如无重大变更则跳过）
- 如果创建了 USER-SETUP.md：在完成输出中醒目显示
</success_criteria>
