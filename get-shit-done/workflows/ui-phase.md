<purpose>
为前端阶段生成 UI 设计合约（UI-SPEC.md）。编排 gsd-ui-researcher 和 gsd-ui-checker，包含修订循环。在生命周期中插入 discuss-phase 和 plan-phase 之间。

UI-SPEC.md 在规划器创建任务之前锁定间距、排版、色彩、文案和设计系统决策。这防止了执行过程中临时样式决策导致的设计债务。
</purpose>

<required_reading>
@~/.claude/get-shit-done/references/ui-brand.md
</required_reading>

<available_agent_types>
有效的 GSD 子代理类型（使用确切名称——不要回退到 'general-purpose'）：
- gsd-ui-researcher — 研究 UI/UX 方案
- gsd-ui-checker — 审查 UI 实现质量
</available_agent_types>

<process>

## 1. 初始化

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init plan-phase "$PHASE")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
AGENT_SKILLS_UI=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-ui-researcher 2>/dev/null)
AGENT_SKILLS_UI_CHECKER=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-ui-checker 2>/dev/null)
```

解析 JSON 获取：`phase_dir`、`phase_number`、`phase_name`、`phase_slug`、`padded_phase`、`has_context`、`has_research`、`commit_docs`。

**文件路径：** `state_path`、`roadmap_path`、`requirements_path`、`context_path`、`research_path`。

解析 UI 代理模型：

```bash
UI_RESEARCHER_MODEL=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" resolve-model gsd-ui-researcher --raw)
UI_CHECKER_MODEL=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" resolve-model gsd-ui-checker --raw)
```

检查配置：

```bash
UI_ENABLED=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow.ui_phase 2>/dev/null || echo "true")
```

**如果 `UI_ENABLED` 为 `false`：**
```
UI 阶段在配置中已禁用。通过 /gsd:settings 启用。
```
退出工作流。

**如果 `planning_exists` 为 false：** 错误——请先运行 `/gsd:new-project`。

## 2. 解析和验证阶段

从 $ARGUMENTS 中提取阶段编号。如果未提供，检测下一个未规划的阶段。

```bash
PHASE_INFO=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" roadmap get-phase "${PHASE}")
```

**如果 `found` 为 false：** 错误，附带可用阶段列表。

## 3. 检查前置条件

**如果 `has_context` 为 false：**
```
未找到阶段 {N} 的 CONTEXT.md。
建议：先运行 /gsd:discuss-phase {N} 以捕获设计偏好。
在没有用户决策的情况下继续——UI 研究者将询问所有问题。
```
继续（非阻塞）。

**如果 `has_research` 为 false：**
```
未找到阶段 {N} 的 RESEARCH.md。
注意：技术栈决策（组件库、样式方案）将在 UI 研究中询问。
```
继续（非阻塞）。

## 4. 检查现有 UI-SPEC

```bash
UI_SPEC_FILE=$(ls "${PHASE_DIR}"/*-UI-SPEC.md 2>/dev/null | head -1)
```

**如果存在：** 使用 AskUserQuestion：
- header: "现有 UI-SPEC"
- question: "阶段 {N} 的 UI-SPEC.md 已存在。你想怎么做？"
- options:
  - "更新 — 以现有内容为基准重新运行研究者"
  - "查看 — 显示当前 UI-SPEC 并退出"
  - "跳过 — 保留当前 UI-SPEC，继续验证"

如果选择"查看"：显示文件内容，退出。
如果选择"跳过"：继续到步骤 7（检查器）。
如果选择"更新"：继续到步骤 5。

## 5. 生成 gsd-ui-researcher

显示：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► UI 设计合约 — 阶段 {N}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ 正在生成 UI 研究者...
```

构建提示：

```markdown
Read ~/.claude/agents/gsd-ui-researcher.md for instructions.

<objective>
为阶段 {phase_number}: {phase_name} 创建 UI 设计合约
回答："此阶段需要哪些视觉和交互合约？"
</objective>

<files_to_read>
- {state_path}（项目状态）
- {roadmap_path}（路线图）
- {requirements_path}（需求）
- {context_path}（来自 /gsd:discuss-phase 的用户决策）
- {research_path}（技术研究——技术栈决策）
</files_to_read>

${AGENT_SKILLS_UI}

<output>
写入到：{phase_dir}/{padded_phase}-UI-SPEC.md
模板：~/.claude/get-shit-done/templates/UI-SPEC.md
</output>

<config>
commit_docs: {commit_docs}
phase_dir: {phase_dir}
padded_phase: {padded_phase}
</config>
```

从 `<files_to_read>` 中省略空的文件路径。

```
Task(
  prompt=ui_research_prompt,
  subagent_type="gsd-ui-researcher",
  model="{UI_RESEARCHER_MODEL}",
  description="UI 设计合约阶段 {N}"
)
```

## 6. 处理研究者返回

**如果包含 `## UI-SPEC COMPLETE`：**
显示确认。继续到步骤 7。

**如果包含 `## UI-SPEC BLOCKED`：**
显示阻塞详情和选项。退出工作流。

## 7. 生成 gsd-ui-checker

显示：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 验证 UI-SPEC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ 正在生成 UI 检查器...
```

构建提示：

```markdown
Read ~/.claude/agents/gsd-ui-checker.md for instructions.

<objective>
验证阶段 {phase_number}: {phase_name} 的 UI 设计合约
检查全部 6 个维度。返回 APPROVED 或 BLOCKED。
</objective>

<files_to_read>
- {phase_dir}/{padded_phase}-UI-SPEC.md（UI 设计合约——主要输入）
- {context_path}（用户决策——检查合规性）
- {research_path}（技术研究——检查技术栈对齐）
</files_to_read>

${AGENT_SKILLS_UI_CHECKER}

<config>
ui_safety_gate: {ui_safety_gate 配置值}
</config>
```

```
Task(
  prompt=ui_checker_prompt,
  subagent_type="gsd-ui-checker",
  model="{UI_CHECKER_MODEL}",
  description="验证 UI-SPEC 阶段 {N}"
)
```

## 8. 处理检查器返回

**如果包含 `## UI-SPEC VERIFIED`：**
显示维度结果。继续到步骤 10。

**如果包含 `## ISSUES FOUND`：**
显示阻塞问题。继续到步骤 9。

## 9. 修订循环（最多 2 次迭代）

跟踪 `revision_count`（从 0 开始）。

**如果 `revision_count` < 2：**
- 递增 `revision_count`
- 使用修订上下文重新生成 gsd-ui-researcher：

```markdown
<revision>
UI 检查器发现当前 UI-SPEC.md 存在问题。

### 需要修复的问题
{粘贴检查器返回的阻塞问题}

读取现有 UI-SPEC.md，仅修复列出的问题，重新写入文件。
不要重新询问用户已经回答的问题。
</revision>
```

- 研究者返回后 → 重新生成检查器（步骤 7）

**如果 `revision_count` >= 2：**
```
已达最大修订迭代次数。剩余问题：

{列出剩余问题}

选项：
1. 强制批准 — 使用当前 UI-SPEC 继续（FLAG 变为已接受）
2. 手动编辑 — 在编辑器中打开 UI-SPEC.md，重新运行 /gsd:ui-phase
3. 放弃 — 不批准直接退出
```

使用 AskUserQuestion 进行选择。

## 10. 展示最终状态

显示：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► UI-SPEC 就绪 ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**阶段 {N}: {Name}** — UI 设计合约已批准

维度：6/6 通过
{如果有 FLAG："建议：{N}（非阻塞）"}

───────────────────────────────────────────────────────────────

## ▶ 下一步

**规划阶段 {N}** — 规划器将使用 UI-SPEC.md 作为设计上下文

`/gsd:plan-phase {N}`

<sub>先执行 /clear → 刷新上下文窗口</sub>

───────────────────────────────────────────────────────────────
```

## 11. 提交（如果已配置）

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs(${padded_phase}): UI design contract" --files "${PHASE_DIR}/${PADDED_PHASE}-UI-SPEC.md"
```

## 12. 更新状态

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" state record-session \
  --stopped-at "Phase ${PHASE} UI-SPEC approved" \
  --resume-file "${PHASE_DIR}/${PADDED_PHASE}-UI-SPEC.md"
```

</process>

<success_criteria>
- [ ] 已检查配置（如果 ui_phase 禁用则退出）
- [ ] 阶段已根据路线图验证
- [ ] 前置条件已检查（CONTEXT.md、RESEARCH.md——非阻塞警告）
- [ ] 已处理现有 UI-SPEC（更新/查看/跳过）
- [ ] 使用正确的上下文和文件路径生成了 gsd-ui-researcher
- [ ] 在正确位置创建了 UI-SPEC.md
- [ ] 使用 UI-SPEC.md 生成了 gsd-ui-checker
- [ ] 全部 6 个维度已评估
- [ ] 如果 BLOCKED 则进入修订循环（最多 2 次迭代）
- [ ] 展示了最终状态和下一步
- [ ] UI-SPEC.md 已提交（如果 commit_docs 启用）
- [ ] 状态已更新
</success_criteria>
</output>
