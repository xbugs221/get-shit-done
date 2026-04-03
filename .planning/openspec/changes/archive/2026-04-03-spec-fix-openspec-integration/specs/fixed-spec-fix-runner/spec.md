## MODIFIED Requirements

### Requirement: Runner 启动固定的 spec-fix 会话
系统 MUST 提供 `spec-fix start` 入口，用于创建新的 fix 工作区、记录用户原始问题、校验并关联一个已存在的 OpenSpec change、写入持久化工作流状态，并创建固定的六 pane mux window。

#### Scenario: 使用嵌套 OpenSpec 状态根启动新的 spec-fix run
- **WHEN** 仓库根目录存在 `.openspec-root.json`
- **AND** 其 `stateRoot` 为 `.planning/openspec`
- **AND** OpenSpec change `callback-login-loop` 已存在
- **AND** 用户运行 `gsd-tools spec-fix start --mux zellij --problem "Login loop on callback" --change callback-login-loop`
- **THEN** 系统创建 `.planning/fixes/<id>/`
- **AND** 写入包含原始问题内容的 `PROBLEM.md`
- **AND** 写入 `workflow.json`，其中阶段为 `problem-captured`、`change_name` 为 `callback-login-loop`
- **AND** 在 workflow 中记录解析后的 OpenSpec 状态根 `.planning/openspec`
- **AND** 按固定顺序创建六个 pane：`lazygit`、`analysis`、`proposal-review`、`coding`、`code-review`、`archive`
- **AND** 创建第一个 commit，subject 为 `问题：Login loop on callback`

#### Scenario: 关联的 OpenSpec change 不存在时拒绝启动
- **WHEN** 用户运行 `gsd-tools spec-fix start --mux tmux --problem "Login loop on callback" --change missing-change`
- **AND** 当前仓库状态树中不存在名为 `missing-change` 的 OpenSpec change
- **THEN** runner 在创建 `.planning/fixes/<id>/` 之前就终止启动
- **AND** 输出中明确说明缺失的是关联 OpenSpec change
- **AND** 不会留下半成品 fix workspace

### Requirement: 用户可以检查工作流状态和输出
系统 MUST 提供 `spec-fix status <id>` 命令，用于输出当前阶段、review 轮次、第 3 次 review 自动通过状态、commit hash、mux 元数据、agent provider 解析结果、关联的 OpenSpec change 以及该 change 的 artifact 完成状态。

#### Scenario: 用户检查一个在第 3 次 review 后自动通过的工作流
- **WHEN** 用户对一个第 3 次 review 后自动通过的工作流运行 `gsd-tools spec-fix status <id>`
- **AND** 该 workflow 关联的 OpenSpec change 位于 `.planning/openspec/changes/callback-login-loop`
- **THEN** 输出中显示当前阶段已进入 archive 前后的通过态
- **AND** 包含 `review_attempt: 3`
- **AND** 包含 `accepted_after_round_3`
- **AND** 列出每个已完成阶段最新的 commit hash
- **AND** 显示 mux 类型、pane 元数据、agent provider 解析结果和关联的 OpenSpec change 名称
- **AND** 显示解析后的 OpenSpec 状态根、change 目录、`applyRequires` 与 proposal/design/specs/tasks 的完成状态

## ADDED Requirements

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
