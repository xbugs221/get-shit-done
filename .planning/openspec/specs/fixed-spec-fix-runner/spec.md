# fixed-spec-fix-runner Specification

## Purpose
定义一个确定性的 spec-fix runner，用固定六 pane mux 布局推进小型修复工作流，并强制阶段闸门、逐阶段提交、有限 review 回环和按角色配置 provider/runtime。
## Requirements
### Requirement: Runner 启动固定的 spec-fix 会话
系统 MUST 提供以自然语言问题为核心输入的 `spec-fix` 入口，用于创建新的 fix 工作区、记录用户原始问题、写入持久化工作流状态，并在请求 mux 观察界面时创建固定的六 pane mux 会话；启动时不得要求用户预先创建 OpenSpec change。

#### Scenario: 在没有预建 OpenSpec change 的情况下启动自动 spec-fix run
- **WHEN** 当前仓库中还没有与该 bug 对应的 OpenSpec change
- **AND** 用户运行 `gsd-tools spec-fix --problem "Login loop on callback"`
- **THEN** 系统创建 `.planning/fixes/<id>/`
- **AND** 写入包含原始问题内容的 `PROBLEM.md`
- **AND** 写入 `workflow.json`，其中阶段为自动执行中的初始状态
- **AND** 不会因为缺少预建 OpenSpec change 而拒绝启动

#### Scenario: 请求 zellij 观察界面时创建固定六 pane 并直接执行阶段命令
- **WHEN** 用户运行 `gsd-tools spec-fix --mux zellij --problem "Login loop on callback"`
- **THEN** runner 按固定顺序创建六个 pane：`lazygit`、`analysis`、`proposal-review`、`coding`、`code-review`、`archive`
- **AND** 非 `lazygit` pane 会直接执行各自阶段命令，而不是只打印 prompt 后停在 shell
- **AND** 创建第一个 commit，subject 为 `问题：Login loop on callback`

### Requirement: Runner 强制执行线性阶段闸门
系统 MUST 通过固定的线性状态机自动推进 spec-fix 工作流，且只有 runner 可以在阶段校验通过并成功提交后解锁下一阶段。

#### Scenario: Analysis 完成后由 runner 自动进入 proposal review
- **WHEN** analysis 阶段命令结束，且其产物校验通过
- **THEN** runner 将 analysis 阶段的 commit hash 记录到 `workflow.json`
- **AND** 自动将当前阶段推进到 proposal-review 的执行态
- **AND** 在前置阶段未通过校验并完成 commit 前，后续阶段保持锁定

### Requirement: Coding 改进回环必须有上限且保持增量
系统 MUST 允许 code review 将工作流带回 coding 做增量改进，并且在第 3 次 review 完成后自动视为通过。

#### Scenario: 第一次 code review 失败后返回 coding
- **WHEN** code review 第一次未通过
- **THEN** runner 将结构化 review 反馈保存到 fix 工作区
- **AND** 将 `review_attempt` 增加到 `1`
- **AND** 将工作流带回 `coding-redo`
- **AND** 不会从 analysis 或 proposal review 重新开始整个工作流

#### Scenario: 第三次 code review 后自动通过并进入 archive
- **WHEN** code review 完成第 3 轮，且仍有残余 review 意见
- **THEN** runner 将 `review_attempt` 记录为 `3`
- **AND** 将最终 review 结论记录为 `accepted_after_round_3`
- **AND** 解锁 archive
- **AND** 不再回退到 coding

### Requirement: Agent provider 可以独立配置
系统 MUST 支持对 analysis、proposal-review、coding、code-review、archive 这 5 个 agent 分别配置 provider/runtime。

#### Scenario: 从配置中解析 5 个 agent 的 provider
- **WHEN** `.planning/config.json` 中配置 `workflow.spec_fix_agent_providers`
- **THEN** runner 分别为 5 个 agent 解析对应 provider/runtime
- **AND** 将解析后的结果写入 `workflow.json`
- **AND** 在创建 pane 命令时使用各自 agent 的 provider/runtime，而不是单一全局值

### Requirement: 成功阶段必须始终生成 commit
系统 MUST 在每次自动完成的成功阶段后生成独立 commit，并由 runner 统一控制 commit message 模式。

#### Scenario: Coding 阶段自动生成阶段 commit
- **WHEN** coding 阶段命令成功结束，且 `artifacts/coding/IMPLEMENTATION.md` 校验通过
- **THEN** runner 使用 coding 阶段的固定 message 模式创建 commit
- **AND** 将该 commit hash 记录到 `workflow.json`
- **AND** 只有在 commit 成功后才继续进入 code-review

### Requirement: 用户可以检查工作流状态和输出
系统 MUST 提供 `spec-fix status <id>` 命令，用于输出当前执行阶段、review 轮次、自动推进状态、阻塞原因、commit hash、mux 元数据、agent provider 解析结果，以及 OpenSpec 同步状态。

#### Scenario: 用户检查一个正在自动执行的 workflow
- **WHEN** 用户对一个仍在自动执行中的 workflow 运行 `gsd-tools spec-fix status <id>`
- **THEN** 输出中显示当前阶段、已完成阶段的 commit hash 和当前是否 blocked
- **AND** 若 workflow 尚未创建内部 OpenSpec change，也会显示 OpenSpec 同步状态而不是直接报错
- **AND** 若 workflow 已进入三审后自动通过路径，则输出中包含 `accepted_after_round_3`

### Requirement: Archive 阶段必须与关联 OpenSpec change 保持一致
系统 MUST 在归档 workflow 之前先成功归档关联的 OpenSpec change；若 OpenSpec archive 失败，则 workflow 不得进入 `archived`。

#### Scenario: Archive 阶段联动归档 OpenSpec change
- **WHEN** 用户运行 `gsd-tools spec-fix complete-stage fix-001 --stage archive`
- **AND** archive 阶段工件校验通过
- **AND** 关联 OpenSpec change 已满足归档前提
- **THEN** runner 先调用 `openspec archive <change-name> --yes`
- **AND** 只有在该命令成功后才创建 archive 阶段 commit
- **AND** 将 `workflow.json` 的 `current_stage` 更新为 `archived`
- **AND** 关联 OpenSpec change 不再出现在 active changes 列表中

#### Scenario: 关联 OpenSpec change 未完成时阻止 workflow 归档
- **WHEN** 用户运行 `gsd-tools spec-fix complete-stage fix-001 --stage archive`
- **AND** 关联 OpenSpec change 仍缺少 tasks 或其他必需 artifact
- **THEN** runner 终止当前 archive 完成流程
- **AND** 保持 `workflow.json` 中的当前阶段为 archive 前状态
- **AND** 不会创建 archive 阶段 commit

### Requirement: Runner 必须自动执行完整 spec-fix 流程
系统 MUST 在用户提供自然语言问题后，自动按 analysis、proposal-review、coding、code-review、archive 的固定顺序推进 workflow，而不是要求用户逐阶段调用 `complete-stage`。

#### Scenario: 单命令自动完成一次通过的修复流程
- **WHEN** 用户运行 `gsd-tools spec-fix --problem "Login loop on callback"`
- **AND** 阶段执行器在 analysis、proposal-review、coding、code-review、archive 上都返回成功
- **THEN** runner 在一次命令执行中完成整个 workflow
- **AND** 最终将 `workflow.json` 的 `current_stage` 记录为 `archived`
- **AND** 用户不需要手工调用 `spec-fix complete-stage`

#### Scenario: Code review 要求修改时自动回到 coding
- **WHEN** 用户运行 `gsd-tools spec-fix --problem "Callback loop still happens after token refresh"`
- **AND** 第 1 次 code-review 返回 `changes_requested`
- **THEN** runner 自动将 workflow 带回 coding 做增量修复
- **AND** 将 `review_attempt` 增加到 `1`
- **AND** 不要求用户手工重新触发下一个阶段

