# fixed-spec-fix-runner Specification

## Purpose
定义一个确定性的 spec-fix runner，用固定六 pane mux 布局推进小型修复工作流，并强制阶段闸门、逐阶段提交、有限 review 回环和按角色配置 provider/runtime。
## Requirements
### Requirement: Runner 启动固定的 spec-fix 会话
系统 MUST 提供 `spec-fix start` 入口，用于创建新的 fix 工作区、记录用户原始问题、写入持久化工作流状态，并创建固定的六 pane mux window。

#### Scenario: 使用 zellij 启动新的 spec-fix run
- **WHEN** 用户运行 `gsd-tools spec-fix start --mux zellij --problem "Login loop on callback"`
- **THEN** 系统创建 `.planning/fixes/<id>/`
- **AND** 写入包含原始问题内容的 `PROBLEM.md`
- **AND** 写入 `workflow.json`，其中阶段为 `problem-captured`、mux 为 `zellij`、review 轮次为 `0`
- **AND** 按固定顺序创建六个 pane：`lazygit`、`analysis`、`proposal-review`、`coding`、`code-review`、`archive`
- **AND** 创建第一个 commit，subject 为 `问题：Login loop on callback`

### Requirement: Runner 强制执行线性阶段闸门
系统 MUST 通过固定的线性状态机推进 spec-fix 工作流，且只有 runner 或其 hook 可以解锁下一阶段。

#### Scenario: Analysis 完成后解锁 proposal review
- **WHEN** analysis 阶段结束，且其 completion hook 校验通过必需产物
- **THEN** runner 将 analysis 阶段的 commit hash 记录到 `workflow.json`
- **AND** 将当前阶段更新为 `analysis-done`
- **AND** 解锁 proposal-review
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
系统 MUST 在每次成功阶段切换后生成独立 commit，并由 runner 统一控制 commit message 模式。

#### Scenario: Proposal review 生成阶段 commit
- **WHEN** proposal review 通过校验
- **THEN** runner 使用 proposal-review 阶段的固定 message 模式创建 commit
- **AND** 将该 commit hash 记录到 `workflow.json`
- **AND** 只有在 commit 成功后才推进到下一阶段

### Requirement: 用户可以检查工作流状态和输出
系统 MUST 提供 `spec-fix status <id>` 命令，用于输出当前阶段、review 轮次、第 3 次 review 自动通过状态、commit hash、mux 元数据、agent provider 解析结果和关联的 OpenSpec change。

#### Scenario: 用户检查一个在第 3 次 review 后自动通过的工作流
- **WHEN** 用户对一个第 3 次 review 后自动通过的工作流运行 `gsd-tools spec-fix status <id>`
- **THEN** 输出中显示当前阶段已进入 archive 前后的通过态
- **AND** 包含 `review_attempt: 3`
- **AND** 包含 `accepted_after_round_3`
- **AND** 列出每个已完成阶段最新的 commit hash
- **AND** 显示 mux 类型、pane 元数据、agent provider 解析结果和关联的 OpenSpec change 名称
