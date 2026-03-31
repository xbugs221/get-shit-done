<purpose>
通过汇总阶段验证、检查跨阶段集成和评估需求覆盖率来验证里程碑是否达到了其完成定义。读取已有的 VERIFICATION.md 文件（各阶段在 execute-phase 期间已验证），汇总技术债务和延期差距，然后生成集成检查器进行跨阶段连接检查。
</purpose>

<required_reading>
在开始之前，请先读取调用提示的 execution_context 中引用的所有文件。
</required_reading>

<available_agent_types>
有效的 GSD 子代理类型（使用精确名称 — 不要回退到 'general-purpose'）：
- gsd-integration-checker — 检查跨阶段集成
</available_agent_types>

<process>

## 0. 初始化里程碑上下文

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init milestone-op)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
AGENT_SKILLS_CHECKER=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-integration-checker 2>/dev/null)
```

从初始化 JSON 中提取：`milestone_version`、`milestone_name`、`phase_count`、`completed_phases`、`commit_docs`。

解析集成检查器模型：
```bash
integration_checker_model=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" resolve-model gsd-integration-checker --raw)
```

## 1. 确定里程碑范围

```bash
# 获取里程碑中的阶段（按数字排序，处理小数）
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" phases list
```

- 从参数中解析版本或从 ROADMAP.md 检测当前版本
- 确定范围内所有阶段目录
- 从 ROADMAP.md 提取里程碑完成定义
- 从 REQUIREMENTS.md 提取映射到此里程碑的需求

## 2. 读取所有阶段验证

对于每个阶段目录，读取 VERIFICATION.md：

```bash
# 对于每个阶段，使用 find-phase 解析目录（处理已归档的阶段）
PHASE_INFO=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" find-phase 01 --raw)
# 从 JSON 中提取目录，然后从该目录读取 VERIFICATION.md
# 对 ROADMAP.md 中的每个阶段编号重复此操作
```

从每个 VERIFICATION.md 中提取：
- **状态：** passed | gaps_found
- **关键差距：**（如有 — 这些是阻塞项）
- **非关键差距：** 技术债务、延期项、警告
- **发现的反模式：** TODO、存根、占位符
- **需求覆盖：** 哪些需求已满足/被阻塞

如果某个阶段缺少 VERIFICATION.md，将其标记为"未验证阶段" — 这是一个阻塞项。

## 3. 生成集成检查器

收集阶段上下文后：

从 REQUIREMENTS.md 可追溯性表中提取 `MILESTONE_REQ_IDS` — 分配给此里程碑各阶段的所有 REQ-ID。

```
Task(
  prompt="检查跨阶段集成和端到端流程。

Phases: {phase_dirs}
Phase exports: {来自 SUMMARY}
API routes: {已创建的路由}

Milestone Requirements:
{MILESTONE_REQ_IDS — 列出每个 REQ-ID 及其描述和分配的阶段}

必须将每个集成发现映射到受影响的需求 ID（如适用）。

验证跨阶段连接和端到端用户流程。
${AGENT_SKILLS_CHECKER}",
  subagent_type="gsd-integration-checker",
  model="{integration_checker_model}"
)
```

## 4. 收集结果

合并：
- 阶段级差距和技术债务（来自步骤 2）
- 集成检查器的报告（连接差距、中断流程）

## 5. 检查需求覆盖（3 源交叉引用）

必须为每个需求交叉引用三个独立来源：

### 5a. 解析 REQUIREMENTS.md 可追溯性表

提取映射到里程碑阶段的所有 REQ-ID：
- 需求 ID、描述、分配的阶段、当前状态、勾选状态（`[x]` vs `[ ]`）

### 5b. 解析阶段 VERIFICATION.md 需求表

对于每个阶段的 VERIFICATION.md，提取展开的需求表：
- 需求 | 来源计划 | 描述 | 状态 | 证据
- 将每个条目映射回其 REQ-ID

### 5c. 提取 SUMMARY.md 前置元数据交叉检查

对于每个阶段的 SUMMARY.md，从 YAML 前置元数据中提取 `requirements-completed`：
```bash
for summary in .planning/phases/*-*/*-SUMMARY.md; do
  [ -e "$summary" ] || continue
  node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" summary-extract "$summary" --fields requirements_completed --pick requirements_completed
done
```

### 5d. 状态判定矩阵

对于每个 REQ-ID，使用所有三个来源确定状态：

| VERIFICATION.md 状态 | SUMMARY 前置元数据 | REQUIREMENTS.md | → 最终状态 |
|------------------------|---------------------|-----------------|----------------|
| passed                 | listed              | `[x]`           | **satisfied**  |
| passed                 | listed              | `[ ]`           | **satisfied**（更新勾选框） |
| passed                 | missing             | any             | **partial**（手动验证） |
| gaps_found             | any                 | any             | **unsatisfied** |
| missing                | listed              | any             | **partial**（验证缺口） |
| missing                | missing             | any             | **unsatisfied** |

### 5e. 失败关卡和孤立检测

**必需：** 任何 `unsatisfied` 需求必须强制里程碑审计状态为 `gaps_found`。

**孤立检测：** 存在于 REQUIREMENTS.md 可追溯性表中但在所有阶段 VERIFICATION.md 文件中都缺失的需求，必须标记为孤立。孤立需求视为 `unsatisfied` — 它们已分配但从未被任何阶段验证。

## 5.5. Nyquist 合规性发现

如果 `workflow.nyquist_validation` 被明确设置为 `false`（缺失 = 启用），则跳过。

```bash
NYQUIST_CONFIG=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow.nyquist_validation --raw 2>/dev/null)
```

如果为 `false`：完全跳过。

对于每个阶段目录，检查 `*-VALIDATION.md`。如果存在，解析前置元数据（`nyquist_compliant`、`wave_0_complete`）。

按阶段分类：

| 状态 | 条件 |
|--------|-----------|
| COMPLIANT | `nyquist_compliant: true` 且所有任务为绿色 |
| PARTIAL | VALIDATION.md 存在，`nyquist_compliant: false` 或红色/待处理 |
| MISSING | 无 VALIDATION.md |

添加到审计 YAML：`nyquist: { compliant_phases, partial_phases, missing_phases, overall }`

仅进行发现 — 从不自动调用 `/gsd:validate-phase`。

## 6. 汇总为 v{version}-MILESTONE-AUDIT.md

创建 `.planning/v{version}-v{version}-MILESTONE-AUDIT.md`，内容如下：

```yaml
---
milestone: {version}
audited: {timestamp}
status: passed | gaps_found | tech_debt
scores:
  requirements: N/M
  phases: N/M
  integration: N/M
  flows: N/M
gaps:  # 关键阻塞项
  requirements:
    - id: "{REQ-ID}"
      status: "unsatisfied | partial | orphaned"
      phase: "{分配的阶段}"
      claimed_by_plans: ["{引用此需求的计划文件}"]
      completed_by_plans: ["{SUMMARY 标记为完成的计划文件}"]
      verification_status: "passed | gaps_found | missing | orphaned"
      evidence: "{具体证据或缺乏证据}"
  integration: [...]
  flows: [...]
tech_debt:  # 非关键，已延期
  - phase: 01-auth
    items:
      - "TODO: add rate limiting"
      - "Warning: no password strength validation"
  - phase: 03-dashboard
    items:
      - "Deferred: mobile responsive layout"
---
```

加上包含需求、阶段、集成、技术债务表格的完整 markdown 报告。

**状态值：**
- `passed` — 所有需求已满足，无关键差距，技术债务最少
- `gaps_found` — 存在关键阻塞项
- `tech_debt` — 无阻塞项但累积的延期项需要审查

## 7. 展示结果

根据状态进行路由（参见 `<offer_next>`）。

</process>

<offer_next>
直接输出此 markdown（不作为代码块）。根据状态进行路由：

---

**如果 passed：**

## ✓ 里程碑 {version} — 审计通过

**得分：** {N}/{M} 需求已满足
**报告：** .planning/v{version}-MILESTONE-AUDIT.md

所有需求已覆盖。跨阶段集成已验证。端到端流程完成。

───────────────────────────────────────────────────────────────

## ▶ 下一步

**完成里程碑** — 归档并打标签

/gsd:complete-milestone {version}

<sub>/clear 先执行 → 全新上下文窗口</sub>

───────────────────────────────────────────────────────────────

---

**如果 gaps_found：**

## ⚠ 里程碑 {version} — 发现差距

**得分：** {N}/{M} 需求已满足
**报告：** .planning/v{version}-MILESTONE-AUDIT.md

### 未满足的需求

{对于每个未满足的需求：}
- **{REQ-ID}: {描述}** (阶段 {X})
  - {原因}

### 跨阶段问题

{对于每个集成差距：}
- **{from} → {to}:** {问题}

### 中断的流程

{对于每个流程差距：}
- **{流程名称}:** 在 {步骤} 处中断

### Nyquist 覆盖率

| 阶段 | VALIDATION.md | 合规 | 操作 |
|-------|---------------|-----------|--------|
| {phase} | exists/missing | true/false/partial | `/gsd:validate-phase {N}` |

需要验证的阶段：对每个标记的阶段运行 `/gsd:validate-phase {N}`。

───────────────────────────────────────────────────────────────

## ▶ 下一步

**规划差距关闭** — 创建阶段以完成里程碑

/gsd:plan-milestone-gaps

<sub>/clear 先执行 → 全新上下文窗口</sub>

───────────────────────────────────────────────────────────────

**其他可用操作：**
- cat .planning/v{version}-MILESTONE-AUDIT.md — 查看完整报告
- /gsd:complete-milestone {version} — 继续进行（接受技术债务）

───────────────────────────────────────────────────────────────

---

**如果 tech_debt（无阻塞项但累积了债务）：**

## ⚡ 里程碑 {version} — 技术债务审查

**得分：** {N}/{M} 需求已满足
**报告：** .planning/v{version}-MILESTONE-AUDIT.md

所有需求已满足。无关键阻塞项。累积的技术债务需要审查。

### 按阶段的技术债务

{对于每个有债务的阶段：}
**阶段 {X}：{name}**
- {项 1}
- {项 2}

### 总计：{N} 项分布在 {M} 个阶段

───────────────────────────────────────────────────────────────

## ▶ 选项

**A. 完成里程碑** — 接受债务，在待办列表中跟踪

/gsd:complete-milestone {version}

**B. 规划清理阶段** — 在完成前处理债务

/gsd:plan-milestone-gaps

<sub>/clear 先执行 → 全新上下文窗口</sub>

───────────────────────────────────────────────────────────────
</offer_next>

<success_criteria>
- [ ] 已确定里程碑范围
- [ ] 已读取所有阶段 VERIFICATION.md 文件
- [ ] 已为每个阶段提取 SUMMARY.md `requirements-completed` 前置元数据
- [ ] 已解析 REQUIREMENTS.md 可追溯性表中所有里程碑 REQ-ID
- [ ] 已完成 3 源交叉引用（VERIFICATION + SUMMARY + 可追溯性）
- [ ] 已检测孤立需求（在可追溯性中但在所有 VERIFICATION 中缺失）
- [ ] 已汇总技术债务和延期差距
- [ ] 已生成带里程碑需求 ID 的集成检查器
- [ ] 已创建带结构化需求差距对象的 v{version}-MILESTONE-AUDIT.md
- [ ] 已执行失败关卡 — 任何未满足的需求强制 gaps_found 状态
- [ ] 已扫描所有里程碑阶段的 Nyquist 合规性（如启用）
- [ ] 已标记缺少 VALIDATION.md 的阶段并建议 validate-phase
- [ ] 已展示结果并提供可操作的后续步骤
</success_criteria>
</output>
