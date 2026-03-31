<purpose>
创建结构化的 `.planning/HANDOFF.json` 和 `.continue-here.md` 交接文件，以便在会话之间保留完整的工作状态。JSON 提供机器可读的状态供 `/gsd:resume-work` 使用；markdown 提供人类可读的上下文。
</purpose>

<required_reading>
在开始之前，阅读调用提示的 execution_context 中引用的所有文件。
</required_reading>

<process>

<step name="detect">
从最近修改的文件中查找当前阶段目录：

```bash
# 查找最近有工作的阶段目录
(ls -lt .planning/phases/*/PLAN.md 2>/dev/null || true) | head -1 | grep -oP 'phases/\K[^/]+' || true
```

如果未检测到活跃阶段，询问用户正在暂停哪个阶段的工作。
</step>

<step name="gather">
**收集完整的交接状态：**

1. **当前位置**：哪个阶段、哪个计划、哪个任务
2. **已完成的工作**：本次会话完成了什么
3. **剩余工作**：当前计划/阶段还剩什么
4. **已做的决策**：关键决策及其理由
5. **阻塞项/问题**：任何卡住的地方
6. **待处理的人工操作**：需要手动干预的事项（MCP 设置、API 密钥、审批、手动测试）
7. **后台进程**：任何作为工作流一部分正在运行的服务器/监视器
8. **已修改的文件**：已变更但未提交的内容

如果需要，通过对话式提问向用户询问澄清信息。

**同时检查 SUMMARY.md 文件是否有虚假完成：**
```bash
# 检查现有总结中是否有占位符内容
grep -l "To be filled\|placeholder\|TBD" .planning/phases/*/*.md 2>/dev/null || true
```
将包含占位符内容的总结报告为未完成项。
</step>

<step name="write_structured">
**将结构化交接写入 `.planning/HANDOFF.json`：**

```bash
timestamp=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" current-timestamp full --raw)
```

```json
{
  "version": "1.0",
  "timestamp": "{timestamp}",
  "phase": "{phase_number}",
  "phase_name": "{phase_name}",
  "phase_dir": "{phase_dir}",
  "plan": {current_plan_number},
  "task": {current_task_number},
  "total_tasks": {total_task_count},
  "status": "paused",
  "completed_tasks": [
    {"id": 1, "name": "{task_name}", "status": "done", "commit": "{short_hash}"},
    {"id": 2, "name": "{task_name}", "status": "done", "commit": "{short_hash}"},
    {"id": 3, "name": "{task_name}", "status": "in_progress", "progress": "{what_done}"}
  ],
  "remaining_tasks": [
    {"id": 4, "name": "{task_name}", "status": "not_started"},
    {"id": 5, "name": "{task_name}", "status": "not_started"}
  ],
  "blockers": [
    {"description": "{blocker}", "type": "technical|human_action|external", "workaround": "{if any}"}
  ],
  "human_actions_pending": [
    {"action": "{what needs to be done}", "context": "{why}", "blocking": true}
  ],
  "decisions": [
    {"decision": "{what}", "rationale": "{why}", "phase": "{phase_number}"}
  ],
  "uncommitted_files": [],
  "next_action": "{恢复时的第一个具体操作}",
  "context_notes": "{思维状态、方法、你当时在想什么}"
}
```
</step>

<step name="write">
**将交接写入 `.planning/phases/XX-name/.continue-here.md`：**

```markdown
---
phase: XX-name
task: 3
total_tasks: 7
status: in_progress
last_updated: [来自 current-timestamp 的时间戳]
---

<current_state>
[我们现在到哪了？即时上下文]
</current_state>

<completed_work>

- 任务 1: [名称] - 已完成
- 任务 2: [名称] - 已完成
- 任务 3: [名称] - 进行中，[已完成的部分]
</completed_work>

<remaining_work>

- 任务 3: [剩余内容]
- 任务 4: 未开始
- 任务 5: 未开始
</remaining_work>

<decisions_made>

- 决定使用 [X] 因为 [原因]
- 选择 [方案] 而非 [替代方案] 因为 [原因]
</decisions_made>

<blockers>
- [阻塞项 1]: [状态/变通方案]
</blockers>

<context>
[思维状态，你当时在想什么，计划]
</context>

<next_action>
从以下开始: [恢复时的第一个具体操作]
</next_action>
```

要足够具体，让一个全新的 Claude 能立即理解。

使用 `current-timestamp` 填写 last_updated 字段。你可以使用 init todos（提供时间戳）或直接调用：
```bash
timestamp=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" current-timestamp full --raw)
```
</step>

<step name="commit">
```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "wip: [phase-name] paused at task [X]/[Y]" --files .planning/phases/*/.continue-here.md .planning/HANDOFF.json
```
</step>

<step name="confirm">
```
✓ 交接已创建：
  - .planning/HANDOFF.json（结构化，机器可读）
  - .planning/phases/[XX-name]/.continue-here.md（人类可读）

当前状态：

- 阶段: [XX-name]
- 任务: 第 [X] 个，共 [Y] 个
- 状态: [进行中/已阻塞]
- 阻塞项: [数量]（{human_actions_pending 数量} 个需要人工操作）
- 已作为 WIP 提交

恢复请运行: /gsd:resume-work

```
</step>

</process>

<success_criteria>
- [ ] .continue-here.md 在正确的阶段目录中创建
- [ ] 所有部分都填写了具体内容
- [ ] 已作为 WIP 提交
- [ ] 用户知道文件位置以及如何恢复
</success_criteria>
