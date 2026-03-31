<purpose>
检测当前项目状态并自动推进到下一个合乎逻辑的 GSD 工作流步骤。
读取项目状态以确定：讨论 → 规划 → 执行 → 验证 → 完成的进展。
</purpose>

<required_reading>
在开始之前，阅读调用提示的 execution_context 中引用的所有文件。
</required_reading>

<process>

<step name="detect_state">
读取项目状态以确定当前位置：

```bash
# 获取状态快照
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" state json 2>/dev/null || echo "{}"
```

同时读取：
- `.planning/STATE.md` — 当前阶段、进度、计划数量
- `.planning/ROADMAP.md` — 里程碑结构和阶段列表

提取：
- `current_phase` — 哪个阶段是活跃的
- `plan_of` / `plans_total` — 计划执行进度
- `progress` — 整体百分比
- `status` — 活跃、已暂停等

如果不存在 `.planning/` 目录：
```
未检测到 GSD 项目。运行 `/gsd:new-project` 来开始。
```
退出。
</step>

<step name="determine_next_action">
根据状态应用路由规则：

**路线 1：尚无阶段 → 讨论**
如果 ROADMAP 有阶段但磁盘上不存在阶段目录：
→ 下一个操作：`/gsd:discuss-phase <first-phase>`

**路线 2：阶段存在但没有 CONTEXT.md 或 RESEARCH.md → 讨论**
如果当前阶段目录存在但既没有 CONTEXT.md 也没有 RESEARCH.md：
→ 下一个操作：`/gsd:discuss-phase <current-phase>`

**路线 3：阶段有上下文但没有计划 → 规划**
如果当前阶段有 CONTEXT.md（或 RESEARCH.md）但没有 PLAN.md 文件：
→ 下一个操作：`/gsd:plan-phase <current-phase>`

**路线 4：阶段有计划但摘要不完整 → 执行**
如果计划存在但并非全部都有匹配的摘要：
→ 下一个操作：`/gsd:execute-phase <current-phase>`

**路线 5：所有计划都有摘要 → 验证并完成**
如果当前阶段的所有计划都有摘要：
→ 下一个操作：`/gsd:verify-work` 然后 `/gsd:complete-phase`

**路线 6：阶段完成，下一阶段存在 → 推进**
如果当前阶段已完成且 ROADMAP 中存在下一阶段：
→ 下一个操作：`/gsd:discuss-phase <next-phase>`

**路线 7：所有阶段完成 → 完成里程碑**
如果所有阶段都已完成：
→ 下一个操作：`/gsd:complete-milestone`

**路线 8：已暂停 → 恢复**
如果 STATE.md 显示 paused_at：
→ 下一个操作：`/gsd:resume-work`
</step>

<step name="show_and_execute">
显示判断结果：

```
## GSD 下一步

**当前：** 阶段 [N] — [name] | [progress]%
**状态：** [状态描述]

▶ **下一步：** `/gsd:[command] [args]`
  [为什么这是下一步的一行解释]
```

然后立即通过 SlashCommand 调用确定的命令。
不要要求确认——`/gsd:next` 的意义就是零摩擦推进。
</step>

</process>

<success_criteria>
- [ ] 项目状态已正确检测
- [ ] 下一个操作已根据路由规则正确确定
- [ ] 命令已立即调用，无需用户确认
- [ ] 调用前显示了清晰的状态
</success_criteria>
</output>
