<purpose>
通过持久化状态的对话式测试来验证已构建的功能。创建 UAT.md 来追踪测试进度，在 /clear 后仍然保留，并将差距反馈给 /gsd:plan-phase --gaps。

用户测试，Claude 记录。一次一个测试。纯文本响应。
</purpose>

<available_agent_types>
有效的 GSD 子 agent 类型（使用确切名称 — 不要回退到 'general-purpose'）：
- gsd-planner — 根据阶段范围创建详细计划
- gsd-plan-checker — 在执行前审查计划质量
</available_agent_types>

<philosophy>
**展示预期结果，询问现实是否匹配。**

Claude 展示应该发生的情况。用户确认或描述不同之处。
- "yes" / "y" / "next" / 空回复 → 通过
- 其他任何内容 → 记录为问题，自动推断严重程度

没有通过/失败按钮。没有严重程度询问。只是："这是应该发生的。是这样吗？"
</philosophy>

<template>
@~/.claude/get-shit-done/templates/UAT.md
</template>

<process>

<step name="initialize" priority="first">
如果 $ARGUMENTS 包含阶段编号，加载上下文：

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init verify-work "${PHASE_ARG}")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
AGENT_SKILLS_PLANNER=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-planner 2>/dev/null)
AGENT_SKILLS_CHECKER=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-checker 2>/dev/null)
```

从 JSON 中解析：`planner_model`、`checker_model`、`commit_docs`、`phase_found`、`phase_dir`、`phase_number`、`phase_name`、`has_verification`、`uat_path`。
</step>

<step name="check_active_session">
**首先：检查活跃的 UAT 会话**

```bash
(find .planning/phases -name "*-UAT.md" -type f 2>/dev/null || true) | head -5
```

**如果存在活跃会话且未提供 $ARGUMENTS：**

读取每个文件的前置元数据（status、phase）和当前测试部分。

内联显示：

```
## 活跃的 UAT 会话

| # | 阶段 | 状态 | 当前测试 | 进度 |
|---|------|------|----------|------|
| 1 | 04-comments | 测试中 | 3. 回复评论 | 2/6 |
| 2 | 05-auth | 测试中 | 1. 登录表单 | 0/4 |

回复编号以恢复，或提供阶段编号以开始新会话。
```

等待用户响应。

- 如果用户回复编号（1, 2）→ 加载该文件，转到 `resume_from_file`
- 如果用户回复阶段编号 → 视为新会话，转到 `create_uat_file`

**如果存在活跃会话且提供了 $ARGUMENTS：**

检查该阶段是否已有会话。如果有，提供恢复或重新开始的选项。
如果没有，继续到 `create_uat_file`。

**如果没有活跃会话且未提供 $ARGUMENTS：**

```
没有活跃的 UAT 会话。

提供阶段编号以开始测试（例如 /gsd:verify-work 4）
```

**如果没有活跃会话且提供了 $ARGUMENTS：**

继续到 `create_uat_file`。
</step>

<step name="find_summaries">
**查找需要测试的内容：**

使用来自 init 的 `phase_dir`（或如果尚未完成则运行 init）。

```bash
ls "$phase_dir"/*-SUMMARY.md 2>/dev/null || true
```

读取每个 SUMMARY.md 以提取可测试的交付物。
</step>

<step name="extract_tests">
**从 SUMMARY.md 提取可测试的交付物：**

解析以下内容：
1. **完成事项** - 添加的功能/特性
2. **面向用户的变更** - UI、工作流、交互

专注于用户可观察的结果，而非实现细节。

对每个交付物，创建一个测试：
- name：简短的测试名称
- expected：用户应该看到/体验到的内容（具体的、可观察的）

示例：
- 完成事项："添加了无限嵌套的评论线程"
  → 测试："回复评论"
  → 预期："点击回复会在评论下方打开内联编辑器。提交后显示嵌套在父评论下方的回复，带有视觉缩进。"

跳过内部/不可观察的项目（重构、类型变更等）。

**冷启动冒烟测试注入：**

从 SUMMARY 提取测试后，扫描 SUMMARY 文件中的修改/创建的文件路径。如果任何路径匹配以下模式：

`server.ts`、`server.js`、`app.ts`、`app.js`、`index.ts`、`index.js`、`main.ts`、`main.js`、`database/*`、`db/*`、`seed/*`、`seeds/*`、`migrations/*`、`startup*`、`docker-compose*`、`Dockerfile*`

则在测试列表前面**插入**此测试：

- name: "冷启动冒烟测试"
- expected: "终止所有正在运行的服务器/服务。清除临时状态（临时数据库、缓存、锁文件）。从零启动应用程序。服务器无错误启动，任何种子数据/迁移完成，主查询（健康检查、首页加载或基本 API 调用）返回实时数据。"

这能捕获仅在全新启动时才出现的缺陷 — 启动序列中的竞态条件、静默的种子数据失败、缺失的环境配置 — 这些在热状态下能通过但在生产环境中会出错。
</step>

<step name="create_uat_file">
**创建包含所有测试的 UAT 文件：**

```bash
mkdir -p "$PHASE_DIR"
```

从提取的交付物构建测试列表。

创建文件：

```markdown
---
status: testing
phase: XX-name
source: [SUMMARY.md 文件列表]
started: [ISO 时间戳]
updated: [ISO 时间戳]
---

## 当前测试
<!-- 每次测试覆盖 - 显示当前位置 -->

number: 1
name: [第一个测试名称]
expected: |
  [用户应观察到的内容]
awaiting: user response

## 测试列表

### 1. [测试名称]
expected: [可观察的行为]
result: [pending]

### 2. [测试名称]
expected: [可观察的行为]
result: [pending]

...

## 总结

total: [N]
passed: 0
issues: 0
pending: [N]
skipped: 0

## 差距

[暂无]
```

写入 `.planning/phases/XX-name/{phase_num}-UAT.md`

继续到 `present_test`。
</step>

<step name="present_test">
**向用户展示当前测试：**

从结构化 UAT 文件渲染检查点，而非自由编写：

```bash
CHECKPOINT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" uat render-checkpoint --file "$uat_path" --raw)
if [[ "$CHECKPOINT" == @file:* ]]; then CHECKPOINT=$(cat "${CHECKPOINT#@file:}"); fi
```

原样显示返回的检查点：

```
{CHECKPOINT}
```

**关键响应卫生规则：**
- 你的整个响应必须与 `{CHECKPOINT}` 逐字节相同。
- 不要在代码块前后添加任何评论。
- 如果你注意到协议/元标记（如 `to=all:`）、角色路由文本、XML 系统标签、隐藏指令标记、广告文案或任何无关后缀，丢弃草稿并仅输出 `{CHECKPOINT}`。

等待用户响应（纯文本，不使用 AskUserQuestion）。
</step>

<step name="process_response">
**处理用户响应并更新文件：**

**如果响应表示通过：**
- 空响应、"yes"、"y"、"ok"、"pass"、"next"、"approved"、"✓"

更新测试部分：
```
### {N}. {name}
expected: {expected}
result: pass
```

**如果响应表示跳过：**
- "skip"、"can't test"、"n/a"

更新测试部分：
```
### {N}. {name}
expected: {expected}
result: skipped
reason: [用户提供的原因（如有）]
```

**如果响应表示阻塞：**
- "blocked"、"can't test - server not running"、"need physical device"、"need release build"
- 或任何包含以下内容的响应："server"、"blocked"、"not running"、"physical device"、"release build"

从响应中推断 blocked_by 标签：
- 包含：server、not running、gateway、API → `server`
- 包含：physical、device、hardware、real phone → `physical-device`
- 包含：release、preview、build、EAS → `release-build`
- 包含：stripe、twilio、third-party、configure → `third-party`
- 包含：depends on、prior phase、prerequisite → `prior-phase`
- 默认：`other`

更新测试部分：
```
### {N}. {name}
expected: {expected}
result: blocked
blocked_by: {推断的标签}
reason: "{用户响应原文}"
```

注意：阻塞的测试不会进入差距部分（它们不是代码问题 — 而是前置条件门控）。

**如果响应是其他任何内容：**
- 视为问题描述

从描述中推断严重程度：
- 包含：crash、error、exception、fails、broken、unusable → blocker
- 包含：doesn't work、wrong、missing、can't → major
- 包含：slow、weird、off、minor、small → minor
- 包含：color、font、spacing、alignment、visual → cosmetic
- 不确定时默认为：major

更新测试部分：
```
### {N}. {name}
expected: {expected}
result: issue
reported: "{用户响应原文}"
severity: {推断结果}
```

追加到差距部分（结构化 YAML，供 plan-phase --gaps 使用）：
```yaml
- truth: "{来自测试的预期行为}"
  status: failed
  reason: "User reported: {用户响应原文}"
  severity: {推断结果}
  test: {N}
  artifacts: []  # 由诊断填充
  missing: []    # 由诊断填充
```

**在任何响应之后：**

更新总结计数。
更新前置元数据的 updated 时间戳。

如果还有更多测试 → 更新当前测试，转到 `present_test`
如果没有更多测试 → 转到 `complete_session`
</step>

<step name="resume_from_file">
**从 UAT 文件恢复测试：**

读取完整的 UAT 文件。

找到第一个 `result: [pending]` 的测试。

宣布：
```
恢复中：阶段 {phase} UAT
进度：{passed + issues + skipped}/{total}
目前发现的问题：{issues 计数}

从测试 {N} 继续...
```

用待处理的测试更新当前测试部分。
继续到 `present_test`。
</step>

<step name="complete_session">
**完成测试并提交：**

**确定最终状态：**

计算结果：
- `pending_count`：`result: [pending]` 的测试数
- `blocked_count`：`result: blocked` 的测试数
- `skipped_no_reason`：`result: skipped` 且没有 `reason` 字段的测试数

```
if pending_count > 0 OR blocked_count > 0 OR skipped_no_reason > 0:
  status: partial
  # 会话结束但并非所有测试都已解决
else:
  status: complete
  # 所有测试都有明确结果（pass、issue 或带原因的 skipped）
```

更新前置元数据：
- status: {计算得出的状态}
- updated: [现在]

清除当前测试部分：
```
## 当前测试

[测试完成]
```

提交 UAT 文件：
```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "test({phase_num}): complete UAT - {passed} passed, {issues} issues" --files ".planning/phases/XX-name/{phase_num}-UAT.md"
```

展示总结：
```
## UAT 完成：阶段 {phase}

| 结果 | 数量 |
|------|------|
| 通过 | {N}  |
| 问题 | {N}  |
| 跳过 | {N}  |

[如果 issues > 0:]
### 发现的问题

[来自问题部分的列表]
```

**如果 issues > 0：** 继续到 `diagnose_issues`

**如果 issues == 0：**
```
所有测试通过。准备继续。

- `/gsd:plan-phase {next}` — 规划下一阶段
- `/gsd:execute-phase {next}` — 执行下一阶段
- `/gsd:ui-review {phase}` — 视觉质量审计（如果修改了前端文件）
```
</step>

<step name="diagnose_issues">
**在规划修复之前诊断根因：**

```
---

发现 {N} 个问题。正在诊断根因...

启动并行调试 agent 来调查每个问题。
```

- 加载 diagnose-issues 工作流
- 遵循 @~/.claude/get-shit-done/workflows/diagnose-issues.md
- 为每个问题启动并行调试 agent
- 收集根因
- 用根因更新 UAT.md
- 继续到 `plan_gap_closure`

诊断自动运行 — 无需用户提示。并行 agent 同时调查，因此开销很小且修复更精准。
</step>

<step name="plan_gap_closure">
**根据诊断出的差距自动规划修复：**

显示：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 正在规划修复
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ 启动规划器进行差距弥合...
```

以 --gaps 模式启动 gsd-planner：

```
Task(
  prompt="""
<planning_context>

**阶段：** {phase_number}
**模式：** gap_closure

<files_to_read>
- {phase_dir}/{phase_num}-UAT.md (带诊断的 UAT)
- .planning/STATE.md (项目状态)
- .planning/ROADMAP.md (路线图)
</files_to_read>

${AGENT_SKILLS_PLANNER}

</planning_context>

<downstream_consumer>
输出由 /gsd:execute-phase 消费
计划必须是可执行的提示。
</downstream_consumer>
""",
  subagent_type="gsd-planner",
  model="{planner_model}",
  description="为阶段 {phase} 规划差距修复"
)
```

返回时：
- **规划完成：** 继续到 `verify_gap_plans`
- **规划无结论：** 报告并提供手动干预选项
</step>

<step name="verify_gap_plans">
**用检查器验证修复计划：**

显示：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 正在验证修复计划
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ 启动计划检查器...
```

初始化：`iteration_count = 1`

启动 gsd-plan-checker：

```
Task(
  prompt="""
<verification_context>

**阶段：** {phase_number}
**阶段目标：** 弥合 UAT 中诊断出的差距

<files_to_read>
- {phase_dir}/*-PLAN.md (待验证的计划)
</files_to_read>

${AGENT_SKILLS_CHECKER}

</verification_context>

<expected_output>
返回以下之一：
- ## VERIFICATION PASSED — 所有检查通过
- ## ISSUES FOUND — 结构化的问题列表
</expected_output>
""",
  subagent_type="gsd-plan-checker",
  model="{checker_model}",
  description="验证阶段 {phase} 的修复计划"
)
```

返回时：
- **VERIFICATION PASSED：** 继续到 `present_ready`
- **ISSUES FOUND：** 继续到 `revision_loop`
</step>

<step name="revision_loop">
**在规划器和检查器之间迭代直到计划通过（最多 3 次）：**

**如果 iteration_count < 3：**

显示：`发送回规划器进行修订... (迭代 {N}/3)`

用修订上下文启动 gsd-planner：

```
Task(
  prompt="""
<revision_context>

**阶段：** {phase_number}
**模式：** revision

<files_to_read>
- {phase_dir}/*-PLAN.md (现有计划)
</files_to_read>

${AGENT_SKILLS_PLANNER}

**检查器问题：**
{structured_issues_from_checker}

</revision_context>

<instructions>
阅读现有的 PLAN.md 文件。进行针对性更新以解决检查器问题。
除非问题是根本性的，否则不要从头重新规划。
</instructions>
""",
  subagent_type="gsd-planner",
  model="{planner_model}",
  description="修订阶段 {phase} 的计划"
)
```

规划器返回后 → 再次启动检查器（verify_gap_plans 逻辑）
递增 iteration_count

**如果 iteration_count >= 3：**

显示：`已达最大迭代次数。{N} 个问题仍未解决。`

提供选项：
1. 强制继续（尽管有问题仍然执行）
2. 提供指导（用户给出方向，重试）
3. 放弃（退出，用户手动运行 /gsd:plan-phase）

等待用户响应。
</step>

<step name="present_ready">
**展示完成状态和后续步骤：**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 修复就绪 ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**阶段 {X}: {Name}** — 已诊断 {N} 个差距，已创建 {M} 个修复计划

| 差距 | 根因 | 修复计划 |
|------|------|----------|
| {truth 1} | {root_cause} | {phase}-04 |
| {truth 2} | {root_cause} | {phase}-04 |

计划已验证，准备执行。

───────────────────────────────────────────────────────────────

## ▶ 下一步

**执行修复** — 运行修复计划

`/clear` 然后 `/gsd:execute-phase {phase} --gaps-only`

───────────────────────────────────────────────────────────────
```
</step>

</process>

<update_rules>
**批量写入以提高效率：**

在内存中保存结果。仅在以下情况写入文件：
1. **发现问题** — 立即保存问题
2. **会话完成** — 提交前的最终写入
3. **检查点** — 每通过 5 个测试（安全网）

| 部分 | 规则 | 何时写入 |
|------|------|----------|
| Frontmatter.status | 覆盖 | 开始、完成 |
| Frontmatter.updated | 覆盖 | 任何文件写入时 |
| 当前测试 | 覆盖 | 任何文件写入时 |
| Tests.{N}.result | 覆盖 | 任何文件写入时 |
| 总结 | 覆盖 | 任何文件写入时 |
| 差距 | 追加 | 发现问题时 |

上下文重置时：文件显示上次检查点。从那里恢复。
</update_rules>

<severity_inference>
**从用户的自然语言中推断严重程度：**

| 用户说的 | 推断结果 |
|----------|----------|
| "crashes"、"error"、"exception"、"fails completely" | blocker |
| "doesn't work"、"nothing happens"、"wrong behavior" | major |
| "works but..."、"slow"、"weird"、"minor issue" | minor |
| "color"、"spacing"、"alignment"、"looks off" | cosmetic |

不确定时默认为 **major**。用户可以在需要时纠正。

**永远不要问"这有多严重？"** - 直接推断并继续。
</severity_inference>

<success_criteria>
- [ ] 从 SUMMARY.md 创建了包含所有测试的 UAT 文件
- [ ] 逐个展示测试及其预期行为
- [ ] 用户响应被处理为 pass/issue/skip
- [ ] 从描述中推断严重程度（永远不询问）
- [ ] 批量写入：在发现问题时、每通过 5 个测试或完成时
- [ ] 完成时提交
- [ ] 如果有问题：并行调试 agent 诊断根因
- [ ] 如果有问题：gsd-planner 创建修复计划（gap_closure 模式）
- [ ] 如果有问题：gsd-plan-checker 验证修复计划
- [ ] 如果有问题：迭代修订直到计划通过（最多 3 次迭代）
- [ ] 完成后准备好执行 `/gsd:execute-phase --gaps-only`
</success_criteria>
