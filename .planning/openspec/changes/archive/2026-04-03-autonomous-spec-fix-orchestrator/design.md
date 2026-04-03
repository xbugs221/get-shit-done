## Context

当前 `spec-fix` 已经具备 fix workspace、阶段状态机、逐阶段 commit、固定 mux 布局和有限 review 回环这些骨架能力，但它仍然是“人工驱动的 runner”：用户必须先创建 OpenSpec change，再用 `complete-stage` 手工把流程往前推。这会把本该由工具承担的流程责任暴露给用户，也让 mux pane 只剩“展示 prompt”的作用，无法形成真正的自动修复编排。

目标形态是把 `spec-fix` 变成“自然语言单入口的自动执行器”：用户输入 bug 描述后，runner 自己完成分析、方案审查、编码、测试、代码审查、回环修复和归档提交。OpenSpec 继续保留，但退到后台，作为运行期产物和归档同步层，而不是启动门槛。

## Goals / Non-Goals

**Goals:**
- 提供单次启动的自然语言入口，不再要求 `--change` 指向预先存在的 OpenSpec change。
- 让 runner 自动执行 analysis、proposal-review、coding、code-review、archive 全流程，并在成功阶段后自动 commit。
- 保留 fix workspace、`workflow.json`、阶段产物和固定 commit 规则，作为可审计、可恢复的内部执行模型。
- 在提供 `zellij` 或 `tmux` 观察界面时，让 pane 真正运行 agent 命令，而不是只停留在 prompt + shell。
- 将 OpenSpec change 的创建、同步和归档迁移到 runner 内部按需处理。
- 提供可重复、可确定的验收测试路径，覆盖自动成功和 review 回环重试两类主流程。

**Non-Goals:**
- 不支持用户自定义阶段图、无限重试规则或任意 pane 布局。
- 不要求首版支持用户手动接管每个阶段的推进。
- 不把真实外部 agent 服务的可用性当作验收测试前提。
- 不在本提案中重做整个 GSD 其他 workflow 的入口语义。

## Decisions

### 1. 将 `spec-fix` 改为单命令同步编排器，默认跑完整条流程

新的主入口形态为 `gsd-tools spec-fix --problem "..."`，可额外接受 `--mux zellij|tmux` 等观察参数。默认行为不是“搭工作台后等待人工推进”，而是在同一个 runner 进程里持续执行到 `archived` 或 `blocked`，同时流式输出阶段日志。

这样做可以把用户接口压缩成一次自然语言输入，也能保证 commit、回环重试和 OpenSpec 同步都由一个统一控制点负责。

Alternatives considered:
- 保持 `spec-fix start` + `complete-stage` 双阶段命令：不采用。它继续要求用户承担流程控制责任。
- 把执行器做成完全后台 daemon，只返回 run id：首版不采用。异步进程管理和恢复复杂度更高，收益不如先把同步编排跑通。

### 2. 保留 `workflow.json` 状态机，但把它从用户界面降级为内部审计与恢复层

runner 继续在 `.planning/fixes/<id>/workflow.json` 中记录当前阶段、提交哈希、review 次数、阻塞原因、OpenSpec 同步状态和执行日志索引。`status` 命令读取这个文件向用户展示进度，但正常路径下用户不需要直接编辑或驱动它。

Alternatives considered:
- 完全移除状态文件，只靠命令输出和 git 历史：不采用。长流程失败恢复、OpenSpec 同步状态和 review attempt 都需要显式持久化。
- 让用户通过修改 `workflow.json` 驱动流程：不采用。会破坏状态机约束和可审计性。

### 3. 引入统一的阶段执行器契约，让 pane 和无 pane 模式共用同一套任务执行

每个阶段都必须通过统一的执行器接口接收：阶段角色、prompt 文件、provider/runtime 解析结果、fix 工作区路径、上游产物路径。无 mux 模式下，runner 直接启动这些阶段命令并收集退出码与输出；mux 模式下，runner 仍使用同样的命令，只是把它们注入固定 pane 中运行。

这使 mux 从“交互前台”降为“观察和调试界面”，不会再决定工作流能否推进。

Alternatives considered:
- 继续让 pane 只显示 prompt，用户自己运行 agent：不采用。无法满足自动推进目标。
- 为 mux 和无 mux 各写一套完全独立的执行逻辑：不采用。会导致状态机和错误处理重复分叉。

### 4. 将 OpenSpec 改为惰性内部产物，而非启动前提

`spec-fix` 启动时允许没有任何现成 OpenSpec change。runner 在分析和 proposal 产物足够稳定后，按规范自动生成或同步一个内部 change，并在 `workflow.json` 中记录其名称、路径和同步状态。若整个 fix 失败于早期阶段，允许 workflow 根本没有关联的 change。归档阶段若存在内部 change，则由 runner 自动归档；若不存在，则 workflow 仍可闭环完成。

Alternatives considered:
- 启动前仍强制用户提供 `--change`：不采用。违背单入口目标。
- 完全取消 OpenSpec 落盘：不采用。会丢掉规范沉淀和归档价值。

### 5. 自动提交仍按阶段边界发生，review 回环保持三轮上限

analysis、proposal-review、coding、code-review、archive 这些阶段一旦各自通过校验，runner 立即创建固定 message 模式的 commit，并把 hash 写回状态文件。code review 若给出 `changes_requested`，runner 自动回到 coding 进行增量修复；第三次 review 结束后即便仍有残余意见，也必须转为 `accepted_after_round_3` 并继续归档。

Alternatives considered:
- 只在最终完成时生成单个 squash commit：不采用。会损失阶段审计和回溯价值。
- review 失败后回到 analysis：不采用。与增量修复的目标不符。

### 6. 为验收测试增加内建 fixture 执行模式，隔离外部 agent 依赖

验收测试需要验证“自动推进”和“自动回环”，但不能依赖真实外部模型服务。因此 runner 需要一个仅测试使用的确定性 fixture 模式，用来模拟成功执行、一次通过、以及连续三轮 `changes_requested` 等行为。

Alternatives considered:
- 在测试中直接调用真实 provider：不采用。不可重复且会引入外部网络波动。
- 只做单元测试，不做端到端验收：不采用。无法验证用户真实工作流。

## Risks / Trade-offs

- [长流程在单进程内执行，失败后恢复逻辑更复杂] -> 将每个阶段完成点和 OpenSpec 同步点都持久化到 `workflow.json`，允许从最近稳定阶段恢复。
- [mux 注入真实命令后，终端差异可能带来平台问题] -> 把执行器契约和 mux 适配层严格分离，先保证无 mux 模式稳定，再让 mux 复用同一命令。
- [自动创建 OpenSpec change 可能产生命名冲突或半成品] -> 使用 fix id 派生稳定名称，并显式记录 `openspec_sync_state`，失败时可安全重试或保留为未归档工件。
- [三轮后自动通过可能掩盖残余问题] -> 在 archive 摘要和状态输出中明确标注 `accepted_after_round_3`。
- [测试 fixture 模式可能和真实执行器行为漂移] -> 只在阶段结果和退出码层面模拟，不复制业务逻辑分支。

## Migration Plan

1. 调整 `spec-fix` CLI，增加自然语言单入口，并将旧的 `start`/`complete-stage` 标为兼容或调试路径。
2. 重构 runner，把阶段推进从外部命令触发改为内部执行循环。
3. 抽离统一阶段执行器契约，并让无 mux 与 mux 模式都走同一执行路径。
4. 增加 OpenSpec 惰性创建、同步状态记录与归档联动。
5. 更新 `status` 输出，暴露自动执行进度、阻塞原因和 OpenSpec 同步状态。
6. 增加自动成功、三轮 review 回环、无预建 OpenSpec 三类验收测试。

Rollback strategy:
- 保留 fix workspace 和已有 commit，不回滚历史执行结果。
- 若自动编排器不稳定，可临时回退到旧的手工推进命令路径，但不删除已写入的状态字段。

## Open Questions

- 首版是否保留 `spec-fix start` 作为显式兼容别名，还是直接切到 `spec-fix --problem ...`？
- 自动创建的 OpenSpec change 何时最合适：analysis 完成后，还是 proposal-review 通过后？
- 用户是否需要一个显式的 `--no-mux` 默认值，还是直接把“无 mux 自动执行”作为标准行为？
