<purpose>
用于修复失败任务验证的自主修复操作器。当任务未通过完成标准时由 execute-plan 调用。在上报给用户之前，提出并尝试结构化修复方案。
</purpose>

<inputs>
- FAILED_TASK：计划中的任务编号、名称和完成标准
- ERROR：验证产生的结果——实际结果与预期结果的对比
- PLAN_CONTEXT：相邻任务和阶段目标（用于约束感知）
- REPAIR_BUDGET：剩余最大修复尝试次数（默认：2）
</inputs>

<repair_directive>
分析故障并选择恰好一种修复策略：

**RETRY** — 方法正确但执行失败。通过具体调整后重试。
- 适用场景：命令错误、缺少依赖、路径错误、环境问题、暂时性故障
- 输出：`RETRY: [重试前要进行的具体调整]`

**DECOMPOSE** — 任务粒度太粗。将其分解为更小的可验证子步骤。
- 适用场景：完成标准涵盖多个关注点、实现差距是结构性的
- 输出：`DECOMPOSE: [子任务 1] | [子任务 2] | ...`（最多 3 个子任务）
- 每个子任务必须有单一可验证的结果

**PRUNE** — 在当前约束下任务不可行。跳过并说明理由。
- 适用场景：前置条件缺失且在此处无法修复、超出范围、与先前决策矛盾
- 输出：`PRUNE: [一句话说明理由]`

**ESCALATE** — 修复预算耗尽，或这是一个架构决策（规则 4）。
- 适用场景：RETRY 已用不同方法失败超过一次，或修复需要结构性变更
- 输出：`ESCALATE: [已尝试的内容] | [需要做出的决策]`
</repair_directive>

<process>

<step name="diagnose">
仔细阅读错误和完成标准。依次判断：
1. 这是暂时性/环境问题吗？→ RETRY
2. 任务确实粒度太粗吗？→ DECOMPOSE
3. 前置条件确实缺失且在范围内无法修复吗？→ PRUNE
4. 此任务是否已尝试过 RETRY？检查 REPAIR_BUDGET。如果为 0 → ESCALATE
</step>

<step name="execute_retry">
如果选择 RETRY：
1. 应用指令中指定的具体调整
2. 重新运行任务实现
3. 重新运行验证
4. 如果通过 → 正常继续，记录 `[Node Repair - RETRY] 任务 [X]：[所做调整]`
5. 如果再次失败 → 减少 REPAIR_BUDGET，用更新后的上下文重新调用 node-repair
</step>

<step name="execute_decompose">
如果选择 DECOMPOSE：
1. 用子任务在内联位置替换失败的任务（不修改磁盘上的 PLAN.md）
2. 按顺序执行子任务，每个都有自己的验证
3. 如果所有子任务通过 → 视原始任务为成功，记录 `[Node Repair - DECOMPOSE] 任务 [X] → [N] 个子任务`
4. 如果某个子任务失败 → 为该子任务重新调用 node-repair（REPAIR_BUDGET 按子任务计算）
</step>

<step name="execute_prune">
如果选择 PRUNE：
1. 将任务标记为已跳过并注明理由
2. 记录到 SUMMARY 的"遇到的问题"中：`[Node Repair - PRUNE] 任务 [X]：[理由]`
3. 继续下一个任务
</step>

<step name="execute_escalate">
如果选择 ESCALATE：
1. 通过 verification_failure_gate 将问题上报给用户，附带完整修复历史
2. 呈现：已尝试的内容（每次 RETRY/DECOMPOSE 尝试）、阻塞是什么、可用选项
3. 等待用户指示后再继续
</step>

</process>

<logging>
所有修复操作必须记录在 SUMMARY.md 的"## 偏离计划"下：

| 类型 | 格式 |
|------|------|
| RETRY 成功 | `[Node Repair - RETRY] 任务 X：[调整] — 已解决` |
| RETRY 失败 → ESCALATE | `[Node Repair - RETRY] 任务 X：[N] 次尝试耗尽 — 已上报给用户` |
| DECOMPOSE | `[Node Repair - DECOMPOSE] 任务 X 拆分为 [N] 个子任务 — 全部通过` |
| PRUNE | `[Node Repair - PRUNE] 任务 X 已跳过：[理由]` |
</logging>

<constraints>
- REPAIR_BUDGET 每个任务默认为 2。可通过 config.json 的 `workflow.node_repair_budget` 配置。
- 永远不要修改磁盘上的 PLAN.md——分解的子任务仅存在于内存中。
- DECOMPOSE 的子任务必须比原始任务更具体，而非同义改写。
- 如果 config.json 的 `workflow.node_repair` 为 `false`，直接跳至 verification_failure_gate（用户保留原始行为）。
</constraints>
</output>
