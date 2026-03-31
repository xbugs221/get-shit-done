<internal_workflow>

**这是一个内部工作流——不是面向用户的命令。**

不存在 `/gsd:transition` 命令。此工作流在自动推进期间由
`execute-phase` 自动调用，或在阶段验证后由编排器内联调用。
不应告知用户运行 `/gsd:transition`。

**用于阶段推进的有效用户命令：**
- `/gsd:discuss-phase {N}` — 在规划之前讨论阶段
- `/gsd:plan-phase {N}` — 规划阶段
- `/gsd:execute-phase {N}` — 执行阶段
- `/gsd:progress` — 查看路线图进度

</internal_workflow>

<required_reading>

**立即阅读以下文件：**

1. `.planning/STATE.md`
2. `.planning/PROJECT.md`
3. `.planning/ROADMAP.md`
4. 当前阶段的计划文件（`*-PLAN.md`）
5. 当前阶段的摘要文件（`*-SUMMARY.md`）

</required_reading>

<purpose>

将当前阶段标记为完成并推进到下一阶段。这是进度跟踪和 PROJECT.md 演进自然发生的节点。

"规划下一阶段" = "当前阶段已完成"

</purpose>

<process>

<step name="load_project_state" priority="first">

在过渡之前，读取项目状态：

```bash
cat .planning/STATE.md 2>/dev/null || true
cat .planning/PROJECT.md 2>/dev/null || true
```

解析当前位置以验证我们正在过渡正确的阶段。
注意过渡后可能需要更新的累积上下文。

</step>

<step name="verify_completion">

检查当前阶段是否有所有计划摘要：

```bash
(ls .planning/phases/XX-current/*-PLAN.md 2>/dev/null || true) | sort
(ls .planning/phases/XX-current/*-SUMMARY.md 2>/dev/null || true) | sort
```

**验证逻辑：**

- 统计 PLAN 文件数量
- 统计 SUMMARY 文件数量
- 如果数量匹配：所有计划已完成
- 如果数量不匹配：未完成

<config-check>

```bash
cat .planning/config.json 2>/dev/null || true
```

</config-check>

**检查此阶段的验证欠债：**

```bash
# 统计当前阶段的未完成项
OUTSTANDING=""
for f in .planning/phases/XX-current/*-UAT.md .planning/phases/XX-current/*-VERIFICATION.md; do
  [ -f "$f" ] || continue
  grep -q "result: pending\|result: blocked\|status: partial\|status: human_needed\|status: diagnosed" "$f" && OUTSTANDING="$OUTSTANDING\n$(basename $f)"
done
```

**如果 OUTSTANDING 非空：**

附加到完成确认消息中（无论何种模式）：

```
此阶段的未完成验证项：
{列出文件名}

这些将作为欠债结转。查看：`/gsd:audit-uat`
```

这不会阻止过渡——它确保用户在确认之前看到欠债。

**如果所有计划已完成：**

<if mode="yolo">

```
⚡ 自动批准：过渡阶段 [X] → 阶段 [X+1]
阶段 [X] 完成——所有 [Y] 个计划已完成。

正在标记完成并推进...
```

直接进入 cleanup_handoff 步骤。

</if>

<if mode="interactive" OR="custom with gates.confirm_transition true">

询问："阶段 [X] 完成——所有 [Y] 个计划已完成。准备好标记完成并进入阶段 [X+1] 了吗？"

等待确认后继续。

</if>

**如果计划未完成：**

**安全护栏：always_confirm_destructive 在此适用。**
跳过未完成的计划是破坏性操作——无论何种模式都必须提示。

展示：

```
阶段 [X] 有未完成的计划：
- {phase}-01-SUMMARY.md ✓ 已完成
- {phase}-02-SUMMARY.md ✗ 缺失
- {phase}-03-SUMMARY.md ✗ 缺失

⚠️ 安全护栏：跳过计划需要确认（破坏性操作）

选项：
1. 继续当前阶段（执行剩余计划）
2. 仍然标记为完成（跳过剩余计划）
3. 查看剩余内容
```

等待用户决定。

</step>

<step name="cleanup_handoff">

检查遗留的交接文件：

```bash
ls .planning/phases/XX-current/.continue-here*.md 2>/dev/null || true
```

如果找到，删除它们——阶段已完成，交接已过期。

</step>

<step name="update_roadmap_and_state">

**将 ROADMAP.md 和 STATE.md 的更新委托给 gsd-tools：**

```bash
TRANSITION=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" phase complete "${current_phase}")
```

CLI 处理：
- 将阶段复选框标记为 `[x]` 已完成，附上今天的日期
- 将计划计数更新为最终值（例如，"3/3 plans complete"）
- 更新进度表（状态 → 已完成，添加日期）
- 将 STATE.md 推进到下一阶段（当前阶段、状态 → 准备规划、当前计划 → 未开始）
- 检测这是否是里程碑中的最后一个阶段

从结果中提取：`completed_phase`、`plans_executed`、`next_phase`、`next_phase_name`、`is_last_phase`。

</step>

<step name="archive_prompts">

如果为该阶段生成了提示，它们保持原位。
create-meta-prompts 中的 `completed/` 子文件夹模式处理归档。

</step>

<step name="evolve_project">

演进 PROJECT.md 以反映已完成阶段的经验教训。

**阅读阶段摘要：**

```bash
cat .planning/phases/XX-current/*-SUMMARY.md
```

**评估需求变更：**

1. **需求已验证？**
   - 是否有 Active 需求在此阶段交付？
   - 移至 Validated，附上阶段引用：`- ✓ [需求] — 阶段 X`

2. **需求已失效？**
   - 是否有 Active 需求被发现不必要或错误？
   - 移至 Out of Scope，附上原因：`- [需求] — [失效原因]`

3. **需求已浮现？**
   - 在构建过程中是否发现了新需求？
   - 添加到 Active：`- [ ] [新需求]`

4. **需要记录的决策？**
   - 从 SUMMARY.md 文件中提取决策
   - 添加到关键决策表中，如果已知则附上结果

5. **"这是什么"仍然准确？**
   - 如果产品发生了有意义的变化，更新描述
   - 保持其准确且及时

**更新 PROJECT.md：**

在文件中内联编辑。更新"最后更新"页脚：

```markdown
---
*最后更新：[日期] 阶段 [X] 之后*
```

**演进示例：**

之前：

```markdown
### Active

- [ ] JWT 认证
- [ ] 实时同步 < 500ms
- [ ] 离线模式

### Out of Scope

- OAuth2 — v1 不需要这么复杂
```

之后（阶段 2 交付了 JWT 认证，发现需要速率限制）：

```markdown
### Validated

- ✓ JWT 认证 — 阶段 2

### Active

- [ ] 实时同步 < 500ms
- [ ] 离线模式
- [ ] 同步端点的速率限制

### Out of Scope

- OAuth2 — v1 不需要这么复杂
```

**步骤完成条件：**

- [ ] 已审查阶段摘要以获取经验教训
- [ ] 已验证的需求从 Active 移出
- [ ] 已失效的需求移至 Out of Scope 并附上原因
- [ ] 浮现的需求已添加到 Active
- [ ] 新决策已记录并附上理由
- [ ] 如果产品有变化则更新了"这是什么"
- [ ] "最后更新"页脚反映了此次过渡

</step>

<step name="update_current_position_after_transition">

**注意：** 基本位置更新（当前阶段、状态、当前计划、最后活动）已在 update_roadmap_and_state 步骤中由 `gsd-tools phase complete` 处理。

通过阅读 STATE.md 验证更新是否正确。如果进度条需要更新，使用：

```bash
PROGRESS=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" progress bar --raw)
```

使用结果更新 STATE.md 中的进度条行。

**步骤完成条件：**

- [ ] 阶段编号已递增到下一阶段（由 phase complete 完成）
- [ ] 计划状态已重置为"未开始"（由 phase complete 完成）
- [ ] 状态显示"准备规划"（由 phase complete 完成）
- [ ] 进度条反映已完成的计划总数

</step>

<step name="update_project_reference">

更新 STATE.md 中的项目引用部分。

```markdown
## Project Reference

See: .planning/PROJECT.md (updated [today])

**核心价值：** [PROJECT.md 中的当前核心价值]
**当前焦点：** [下一阶段名称]
```

更新日期和当前焦点以反映过渡。

</step>

<step name="review_accumulated_context">

审查并更新 STATE.md 中的累积上下文部分。

**决策：**

- 记录此阶段的近期决策（最多 3-5 条）
- 完整日志保存在 PROJECT.md 的关键决策表中

**阻碍/关注点：**

- 审查已完成阶段的阻碍
- 如果在此阶段已解决：从列表中移除
- 如果对未来仍有关：保留并加上"阶段 X"前缀
- 从已完成阶段的摘要中添加任何新的关注点

**示例：**

之前：

```markdown
### Blockers/Concerns

- ⚠️ [阶段 1] 数据库架构未对常用查询建立索引
- ⚠️ [阶段 2] 不稳定网络下的 WebSocket 重连行为未知
```

之后（如果数据库索引在阶段 2 中已解决）：

```markdown
### Blockers/Concerns

- ⚠️ [阶段 2] 不稳定网络下的 WebSocket 重连行为未知
```

**步骤完成条件：**

- [ ] 近期决策已记录（完整日志在 PROJECT.md 中）
- [ ] 已解决的阻碍已从列表中移除
- [ ] 未解决的阻碍保留并附阶段前缀
- [ ] 已完成阶段的新关注点已添加

</step>

<step name="update_session_continuity_after_transition">

更新 STATE.md 中的会话连续性部分以反映过渡完成。

**格式：**

```markdown
Last session: [today]
Stopped at: Phase [X] complete, ready to plan Phase [X+1]
Resume file: None
```

**步骤完成条件：**

- [ ] 最后会话时间戳更新为当前日期和时间
- [ ] 停止位置描述了阶段完成和下一阶段
- [ ] 恢复文件确认为 None（过渡不使用恢复文件）

</step>

<step name="offer_next_phase">

**强制要求：在展示下一步之前验证里程碑状态。**

**使用 `gsd-tools phase complete` 的过渡结果：**

`gsd-tools phase complete` 结果中的 `is_last_phase` 字段直接告诉你：
- `is_last_phase: false` → 还有更多阶段 → 进入**路线 A**
- `is_last_phase: true` → 最后一个阶段已完成 → **先检查工作流碰撞**

`next_phase` 和 `next_phase_name` 字段提供下一阶段的详情。

如果需要额外上下文，使用：
```bash
ROADMAP=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" roadmap analyze)
```

这将返回所有阶段及其目标、磁盘状态和完成信息。

---

**工作流碰撞检查（当 `is_last_phase: true` 时）：**

在路由到路线 B 之前，检查其他工作流是否仍在活动中。
这防止了一个工作流在其他工作流仍在处理阶段时推进或完成里程碑。

**如果不在工作流模式下则跳过此检查**（即 `GSD_WORKSTREAM` 未设置/平面模式）。
在平面模式下，直接进入**路线 B**。

```bash
# 仅在工作流模式下检查
if [ -n "$GSD_WORKSTREAM" ]; then
  WS_LIST=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" workstream list --raw)
fi
```

解析 JSON 结果。输出格式为 `{ mode, workstreams: [...] }`。
每个工作流条目包含：`name`、`status`、`current_phase`、`phase_count`、`completed_phases`。

过滤掉当前工作流（`$GSD_WORKSTREAM`）和状态包含"milestone complete"或"archived"（不区分大小写）的工作流。
剩余条目是**其他活动工作流**。

- **如果存在其他活动工作流** → 进入**路线 B1**
- **如果没有其他活动工作流**（或平面模式） → 进入**路线 B**

---

**路线 A：里程碑中还有更多阶段**

阅读 ROADMAP.md 获取下一阶段的名称和目标。

**检查下一阶段是否有 CONTEXT.md：**

```bash
ls .planning/phases/*[X+1]*/*-CONTEXT.md 2>/dev/null || true
```

**如果下一阶段存在：**

<if mode="yolo">

**如果 CONTEXT.md 存在：**

```
阶段 [X] 已标记完成。

下一步：阶段 [X+1] — [名称]

⚡ 自动继续：详细规划阶段 [X+1]
```

退出技能并调用 SlashCommand("/gsd:plan-phase [X+1] --auto ${GSD_WS}")

**如果 CONTEXT.md 不存在：**

```
阶段 [X] 已标记完成。

下一步：阶段 [X+1] — [名称]

⚡ 自动继续：先讨论阶段 [X+1]
```

退出技能并调用 SlashCommand("/gsd:discuss-phase [X+1] --auto ${GSD_WS}")

</if>

<if mode="interactive" OR="custom with gates.confirm_transition true">

**如果 CONTEXT.md 不存在：**

```
## ✓ 阶段 [X] 完成

---

## ▶ 接下来

**阶段 [X+1]: [名称]** — [ROADMAP.md 中的目标]

`/gsd:discuss-phase [X+1] ${GSD_WS}` — 收集上下文并澄清方案

<sub>先执行 `/clear` → 刷新上下文窗口</sub>

---

**其他可用操作：**
- `/gsd:plan-phase [X+1] ${GSD_WS}` — 跳过讨论，直接规划
- `/gsd:research-phase [X+1] ${GSD_WS}` — 调查未知事项

---
```

**如果 CONTEXT.md 存在：**

```
## ✓ 阶段 [X] 完成

---

## ▶ 接下来

**阶段 [X+1]: [名称]** — [ROADMAP.md 中的目标]
<sub>✓ 上下文已收集，可以规划</sub>

`/gsd:plan-phase [X+1] ${GSD_WS}`

<sub>先执行 `/clear` → 刷新上下文窗口</sub>

---

**其他可用操作：**
- `/gsd:discuss-phase [X+1] ${GSD_WS}` — 重新审视上下文
- `/gsd:research-phase [X+1] ${GSD_WS}` — 调查未知事项

---
```

</if>

---

**路线 B1：工作流已完成，其他工作流仍在活动中**

当 `is_last_phase: true` 且碰撞检查发现其他活动工作流时到达此路线。不要建议完成里程碑或推进到下一个里程碑——其他工作流仍在工作中。

**清除自动推进链标志** —— 工作流边界是自然停止点：

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-set workflow._auto_chain_active false
```

<if mode="yolo">

覆盖自动推进：不要自动继续到里程碑完成。
展示阻塞信息并停止。

</if>

展示（所有模式）：

```
## ✓ 阶段 {X}: {阶段名称} 完成

此工作流的阶段已完成。其他工作流仍在活动中：

| 工作流 | 状态 | 阶段 | 进度 |
|------------|--------|-------|----------|
| {name}     | {status} | {current_phase} | {completed_phases}/{phase_count} |
| ...        | ...    | ...   | ...      |

---

## 下一步

归档此工作流：

`/gsd:workstreams complete {current_ws_name} ${GSD_WS}`

查看总体里程碑进度：

`/gsd:workstreams progress ${GSD_WS}`

<sub>所有工作流完成后才可进行里程碑完成操作。</sub>

---
```

不要建议 `/gsd:complete-milestone` 或 `/gsd:new-milestone`。
不要自动调用任何后续斜杠命令。

**在此停止。** 用户必须显式决定下一步做什么。

---

**路线 B：里程碑完成（所有阶段已完成）**

**仅在以下情况到达此路线：**
- `is_last_phase: true` 且没有其他活动工作流（或平面模式）

**清除自动推进链标志** —— 里程碑边界是自然停止点：

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-set workflow._auto_chain_active false
```

<if mode="yolo">

```
阶段 {X} 已标记完成。

🎉 里程碑 {version} 100% 完成——所有 {N} 个阶段已完成！

⚡ 自动继续：完成里程碑并归档
```

退出技能并调用 SlashCommand("/gsd:complete-milestone {version} ${GSD_WS}")

</if>

<if mode="interactive" OR="custom with gates.confirm_transition true">

```
## ✓ 阶段 {X}: {阶段名称} 完成

🎉 里程碑 {version} 100% 完成——所有 {N} 个阶段已完成！

---

## ▶ 接下来

**完成里程碑 {version}** — 归档并准备下一个

`/gsd:complete-milestone {version} ${GSD_WS}`

<sub>先执行 `/clear` → 刷新上下文窗口</sub>

---

**其他可用操作：**
- 在归档前审查成果

---
```

</if>

</step>

</process>

<implicit_tracking>
进度跟踪是隐式的：规划阶段 N 意味着阶段 1-(N-1) 已完成。没有单独的进度步骤——前进即是进度。
</implicit_tracking>

<partial_completion>

如果用户想继续但阶段未完全完成：

```
阶段 [X] 有未完成的计划：
- {phase}-02-PLAN.md（未执行）
- {phase}-03-PLAN.md（未执行）

选项：
1. 仍然标记为完成（这些计划不需要了）
2. 将工作推迟到后续阶段
3. 留下来完成当前阶段
```

尊重用户的判断——他们知道工作是否重要。

**如果带有未完成计划标记为完成：**

- 更新 ROADMAP："2/3 plans complete"（不是 "3/3"）
- 在过渡消息中注明哪些计划被跳过

</partial_completion>

<success_criteria>

过渡完成的条件：

- [ ] 当前阶段计划摘要已验证（全部存在或用户选择跳过）
- [ ] 已删除任何过期的交接文件
- [ ] ROADMAP.md 已更新完成状态和计划计数
- [ ] PROJECT.md 已演进（需求、决策、必要时的描述）
- [ ] STATE.md 已更新（位置、项目引用、上下文、会话）
- [ ] 进度表已更新
- [ ] 用户知道下一步

</success_criteria>
</output>
