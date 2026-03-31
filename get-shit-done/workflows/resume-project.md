<trigger>
在以下情况使用此工作流：
- 在现有项目上开始新会话
- 用户说 "continue"、"what's next"、"where were we"、"resume"
- .planning/ 已存在时的任何规划操作
- 用户离开项目一段时间后返回
</trigger>

<purpose>
立即恢复完整的项目上下文，使"我们进行到哪了？"能得到即时、完整的回答。
</purpose>

<required_reading>
@~/.claude/get-shit-done/references/continuation-format.md
</required_reading>

<process>

<step name="initialize">
一次调用加载所有上下文：

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init resume)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

从 JSON 中解析：`state_exists`、`roadmap_exists`、`project_exists`、`planning_exists`、`has_interrupted_agent`、`interrupted_agent_id`、`commit_docs`。

**如果 `state_exists` 为 true：** 继续到 load_state
**如果 `state_exists` 为 false 但 `roadmap_exists` 或 `project_exists` 为 true：** 提议重建 STATE.md
**如果 `planning_exists` 为 false：** 这是一个新项目 - 路由到 /gsd:new-project
</step>

<step name="load_state">

读取并解析 STATE.md，然后读取 PROJECT.md：

```bash
cat .planning/STATE.md
cat .planning/PROJECT.md
```

**从 STATE.md 提取：**

- **项目引用**：核心价值和当前焦点
- **当前位置**：阶段 X / Y，计划 A / B，状态
- **进度**：可视化进度条
- **近期决策**：影响当前工作的关键决策
- **待办事项**：会话中捕获的想法
- **阻塞项/关注点**：延续的问题
- **会话连续性**：上次停止的位置，任何恢复文件

**从 PROJECT.md 提取：**

- **这是什么**：当前准确的描述
- **需求**：已验证的、活跃的、范围外的
- **关键决策**：包含结果的完整决策日志
- **约束**：实现的硬性限制

</step>

<step name="check_incomplete_work">
查找需要关注的未完成工作：

```bash
# 检查结构化交接（首选 — 机器可读）
cat .planning/HANDOFF.json 2>/dev/null || true

# 检查 continue-here 文件（计划中途恢复）
ls .planning/phases/*/.continue-here*.md 2>/dev/null || true

# 检查有计划但无总结的情况（未完成的执行）
for plan in .planning/phases/*/*-PLAN.md; do
  [ -e "$plan" ] || continue
  summary="${plan/PLAN/SUMMARY}"
  [ ! -f "$summary" ] && echo "Incomplete: $plan"
done 2>/dev/null || true

# 检查中断的 agent（使用来自 init 的 has_interrupted_agent 和 interrupted_agent_id）
if [ "$has_interrupted_agent" = "true" ]; then
  echo "Interrupted agent: $interrupted_agent_id"
fi
```

**如果 HANDOFF.json 存在：**

- 这是主要的恢复来源 — 来自 `/gsd:pause-work` 的结构化数据
- 解析 `status`、`phase`、`plan`、`task`、`total_tasks`、`next_action`
- 检查 `blockers` 和 `human_actions_pending` — 立即呈现这些
- 检查 `completed_tasks` 中的 `in_progress` 项 — 这些需要优先处理
- 将 `uncommitted_files` 与 `git status` 进行比对 — 标记差异
- 使用 `context_notes` 恢复思维模型
- 标记："找到结构化交接 — 从任务 {task}/{total_tasks} 恢复"
- **成功恢复后，删除 HANDOFF.json**（这是一次性工件）

**如果存在 .continue-here 文件（备选方案）：**

- 这是计划中途的恢复点
- 读取文件以获取具体的恢复上下文
- 标记："找到计划中途检查点"

**如果存在有 PLAN 但无 SUMMARY 的情况：**

- 执行已开始但未完成
- 标记："找到未完成的计划执行"

**如果发现中断的 agent：**

- 子 agent 已启动但会话在完成前结束
- 读取 agent-history.json 获取任务详情
- 标记："找到中断的 agent"
  </step>

<step name="present_status">
向用户展示完整的项目状态：

```
╔══════════════════════════════════════════════════════════════╗
║  项目状态                                                      ║
╠══════════════════════════════════════════════════════════════╣
║  正在构建: [来自 PROJECT.md "这是什么" 的一句话描述]            ║
║                                                               ║
║  阶段: [X] / [Y] - [阶段名称]                                ║
║  计划: [A] / [B] - [状态]                                     ║
║  进度: [██████░░░░] XX%                                       ║
║                                                               ║
║  最近活动: [日期] - [发生了什么]                               ║
╚══════════════════════════════════════════════════════════════╝

[如果发现未完成的工作:]
⚠️  检测到未完成的工作：
    - [.continue-here 文件或未完成的计划]

[如果发现中断的 agent:]
⚠️  检测到中断的 agent：
    Agent ID: [id]
    任务: [来自 agent-history.json 的任务描述]
    中断时间: [时间戳]

    恢复方式: Task 工具（使用 agent ID 的 resume 参数）

[如果存在待办事项:]
📋 [N] 个待办事项 — /gsd:check-todos 查看

[如果存在阻塞项:]
⚠️  遗留的关注点：
    - [阻塞项 1]
    - [阻塞项 2]

[如果对齐状态不是 ✓:]
⚠️  简要对齐: [状态] - [评估]
```

</step>

<step name="determine_next_action">
根据项目状态，确定最合逻辑的下一步操作：

**如果存在中断的 agent：**
→ 首选：恢复中断的 agent（使用 resume 参数的 Task 工具）
→ 选项：重新开始（放弃 agent 工作）

**如果 HANDOFF.json 存在：**
→ 首选：从结构化交接恢复（最高优先级 — 具体的任务/阻塞项上下文）
→ 选项：丢弃交接并从文件重新评估

**如果存在 .continue-here 文件：**
→ 备选：从检查点恢复
→ 选项：在当前计划上重新开始

**如果有未完成的计划（有 PLAN 无 SUMMARY）：**
→ 首选：完成未完成的计划
→ 选项：放弃并继续前进

**如果阶段进行中，所有计划已完成：**
→ 首选：推进到下一阶段（通过内部过渡工作流）
→ 选项：审查已完成的工作

**如果阶段准备好进行规划：**
→ 检查该阶段是否存在 CONTEXT.md：

- 如果 CONTEXT.md 缺失：
  → 首选：讨论阶段愿景（用户想象它如何运作）
  → 备选：直接规划（跳过上下文收集）
- 如果 CONTEXT.md 存在：
  → 首选：规划该阶段
  → 选项：审查路线图

**如果阶段准备好执行：**
→ 首选：执行下一个计划
→ 选项：先审查计划
</step>

<step name="offer_options">
根据项目状态展示上下文相关的选项：

```
你想做什么？

[基于状态的首选操作 - 例如:]
1. 恢复中断的 agent [如果发现中断的 agent]
   或
1. 执行阶段 (/gsd:execute-phase {phase} ${GSD_WS})
   或
1. 讨论阶段 3 的上下文 (/gsd:discuss-phase 3 ${GSD_WS}) [如果 CONTEXT.md 缺失]
   或
1. 规划阶段 3 (/gsd:plan-phase 3 ${GSD_WS}) [如果 CONTEXT.md 存在或跳过了讨论选项]

[次要选项:]
2. 审查当前阶段状态
3. 检查待办事项（[N] 个待处理）
4. 审查简要对齐
5. 其他
```

**注意：** 在提供阶段规划选项时，先检查 CONTEXT.md 是否存在：

```bash
ls .planning/phases/XX-name/*-CONTEXT.md 2>/dev/null || true
```

如果缺失，建议在规划前先进行 discuss-phase。如果存在，直接提供规划选项。

等待用户选择。
</step>

<step name="route_to_workflow">
根据用户的选择，路由到相应的工作流：

- **执行计划** → 显示命令供用户在清除后运行：
  ```
  ---

  ## ▶ 下一步

  **{phase}-{plan}: [计划名称]** — [来自 PLAN.md 的目标]

  `/gsd:execute-phase {phase} ${GSD_WS}`

  <sub>`/clear` 先执行 → 全新的上下文窗口</sub>

  ---
  ```
- **规划阶段** → 显示命令供用户在清除后运行：
  ```
  ---

  ## ▶ 下一步

  **阶段 [N]: [名称]** — [来自 ROADMAP.md 的目标]

  `/gsd:plan-phase [phase-number] ${GSD_WS}`

  <sub>`/clear` 先执行 → 全新的上下文窗口</sub>

  ---

  **也可以使用：**
  - `/gsd:discuss-phase [N] ${GSD_WS}` — 先收集上下文
  - `/gsd:research-phase [N] ${GSD_WS}` — 调查未知事项

  ---
  ```
- **推进到下一阶段** → ./transition.md（内部工作流，内联调用 — 不是用户命令）
- **检查待办** → 读取 .planning/todos/pending/，展示摘要
- **审查对齐** → 读取 PROJECT.md，与当前状态比较
- **其他** → 询问需要什么
</step>

<step name="update_session">
在执行路由的工作流之前，更新会话连续性：

更新 STATE.md：

```markdown
## 会话连续性

上次会话: [现在]
停止于: 会话已恢复，继续执行 [操作]
恢复文件: [如有更新]
```

这确保了如果会话意外结束，下次恢复时能知道状态。
</step>

</process>

<reconstruction>
如果 STATE.md 缺失但其他工件存在：

"STATE.md 缺失。正在从工件中重建..."

1. 读取 PROJECT.md → 提取"这是什么"和核心价值
2. 读取 ROADMAP.md → 确定阶段，找到当前位置
3. 扫描 \*-SUMMARY.md 文件 → 提取决策、关注点
4. 计算 .planning/todos/pending/ 中的待办事项
5. 检查 .continue-here 文件 → 会话连续性

重建并写入 STATE.md，然后正常继续。

这处理以下情况：

- 项目创建于 STATE.md 引入之前
- 文件被意外删除
- 克隆仓库时没有完整的 .planning/ 状态
  </reconstruction>

<quick_resume>
如果用户说 "continue" 或 "go"：
- 静默加载状态
- 确定首选操作
- 立即执行，不展示选项

"从 [状态] 继续... [操作]"
</quick_resume>

<success_criteria>
恢复完成的标志：

- [ ] STATE.md 已加载（或重建）
- [ ] 未完成的工作已检测并标记
- [ ] 向用户展示了清晰的状态
- [ ] 提供了上下文相关的后续操作
- [ ] 用户确切了解项目的当前状态
- [ ] 会话连续性已更新
      </success_criteria>
