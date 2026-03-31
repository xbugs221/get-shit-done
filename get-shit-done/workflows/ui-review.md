<purpose>
对已实现的前端代码进行回溯式六维视觉审计。独立命令，适用于任何项目——无论是否由 GSD 管理。输出带评分的 UI-REVIEW.md，包含可操作的发现。
</purpose>

<required_reading>
@~/.claude/get-shit-done/references/ui-brand.md
</required_reading>

<available_agent_types>
有效的 GSD 子代理类型（使用确切名称——不要回退到 'general-purpose'）：
- gsd-ui-auditor — 根据设计要求审计 UI
</available_agent_types>

<process>

## 0. 初始化

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init phase-op "${PHASE_ARG}")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
AGENT_SKILLS_UI_REVIEWER=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-ui-reviewer 2>/dev/null)
```

解析：`phase_dir`、`phase_number`、`phase_name`、`phase_slug`、`padded_phase`、`commit_docs`。

```bash
UI_AUDITOR_MODEL=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" resolve-model gsd-ui-auditor --raw)
```

显示横幅：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► UI 审计 — 阶段 {N}: {name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 1. 检测输入状态

```bash
SUMMARY_FILES=$(ls "${PHASE_DIR}"/*-SUMMARY.md 2>/dev/null)
UI_SPEC_FILE=$(ls "${PHASE_DIR}"/*-UI-SPEC.md 2>/dev/null | head -1)
UI_REVIEW_FILE=$(ls "${PHASE_DIR}"/*-UI-REVIEW.md 2>/dev/null | head -1)
```

**如果 `SUMMARY_FILES` 为空：** 退出 — "阶段 {N} 未执行。请先运行 /gsd:execute-phase {N}。"

**如果 `UI_REVIEW_FILE` 非空：** 使用 AskUserQuestion：
- header: "已有 UI 审查"
- question: "阶段 {N} 的 UI-REVIEW.md 已存在。"
- options:
  - "重新审计 — 运行全新审计"
  - "查看 — 显示当前审查并退出"

如果选择"查看"：显示文件，退出。
如果选择"重新审计"：继续。

## 2. 收集上下文路径

为审计者构建文件列表：
- 阶段目录中的所有 SUMMARY.md 文件
- 阶段目录中的所有 PLAN.md 文件
- UI-SPEC.md（如果存在——审计基准）
- CONTEXT.md（如果存在——锁定的决策）

## 3. 生成 gsd-ui-auditor

```
◆ 正在生成 UI 审计者...
```

构建提示：

```markdown
Read ~/.claude/agents/gsd-ui-auditor.md for instructions.

<objective>
对阶段 {phase_number}: {phase_name} 进行六维视觉审计
{如果 UI-SPEC 存在: "根据 UI-SPEC.md 设计合约进行审计。"}
{如果没有 UI-SPEC: "根据抽象的六维标准进行审计。"}
</objective>

<files_to_read>
- {summary_paths}（执行摘要）
- {plan_paths}（执行计划——预期的内容）
- {ui_spec_path}（UI 设计合约——审计基准，如果存在）
- {context_path}（用户决策，如果存在）
</files_to_read>

${AGENT_SKILLS_UI_REVIEWER}

<config>
phase_dir: {phase_dir}
padded_phase: {padded_phase}
</config>
```

省略空的文件路径。

```
Task(
  prompt=ui_audit_prompt,
  subagent_type="gsd-ui-auditor",
  model="{UI_AUDITOR_MODEL}",
  description="UI 审计阶段 {N}"
)
```

## 4. 处理返回结果

**如果包含 `## UI REVIEW COMPLETE`：**

显示评分摘要：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► UI 审计完成 ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**阶段 {N}: {Name}** — 总分: {score}/24

| 维度 | 评分 |
|--------|-------|
| 文案 | {N}/4 |
| 视觉 | {N}/4 |
| 色彩 | {N}/4 |
| 排版 | {N}/4 |
| 间距 | {N}/4 |
| 体验设计 | {N}/4 |

优先修复项：
1. {fix}
2. {fix}
3. {fix}

完整审查：{path to UI-REVIEW.md}

───────────────────────────────────────────────────────────────

## ▶ 下一步

- `/gsd:verify-work {N}` — UAT 测试
- `/gsd:plan-phase {N+1}` — 规划下一阶段

<sub>先执行 /clear → 刷新上下文窗口</sub>

───────────────────────────────────────────────────────────────
```

## 5. 提交（如果已配置）

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs(${padded_phase}): UI audit review" --files "${PHASE_DIR}/${PADDED_PHASE}-UI-REVIEW.md"
```

</process>

<success_criteria>
- [ ] 阶段已验证
- [ ] 找到 SUMMARY.md 文件（执行已完成）
- [ ] 已处理现有审查（重新审计/查看）
- [ ] 使用正确的上下文生成了 gsd-ui-auditor
- [ ] 在阶段目录中创建了 UI-REVIEW.md
- [ ] 向用户显示了评分摘要
- [ ] 展示了下一步操作
</success_criteria>
</output>
