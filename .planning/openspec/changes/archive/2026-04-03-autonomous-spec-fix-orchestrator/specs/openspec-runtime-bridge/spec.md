## MODIFIED Requirements

### Requirement: GSD 必须通过 OpenSpec runtime 解析项目状态根
GSD SHALL 在 `spec-fix` 运行期间按需通过 OpenSpec runtime 的既有定位规则解析项目级状态根，而不是把 OpenSpec change 作为启动前置条件。

#### Scenario: 启动 autonomous spec-fix 时尚未存在关联 change
- **WHEN** 用户运行 `gsd-tools spec-fix --problem "Login loop on callback"`
- **AND** 当前仓库中尚不存在关联的 OpenSpec change
- **THEN** GSD 不会因为缺少 change 而拒绝启动 workflow
- **AND** 只有在 runner 需要创建或同步内部 OpenSpec 产物时，才解析 OpenSpec 状态根

#### Scenario: 仓库使用 `.planning/openspec` 作为嵌套状态根时创建内部 change
- **WHEN** 仓库根目录存在 `.openspec-root.json`
- **AND** 其 `stateRoot` 为 `.planning/openspec`
- **AND** autonomous spec-fix 在运行中决定创建内部 OpenSpec change
- **THEN** GSD 通过 OpenSpec runtime 在 `.planning/openspec/changes/` 下创建该 change
- **AND** 不会把仓库根 `openspec/` 当作优先路径

### Requirement: GSD 必须通过 OpenSpec JSON 契约读取并维护 change 元数据
GSD SHALL 通过 OpenSpec 的 JSON 命令面读取、创建、同步和归档 autonomous spec-fix 关联的内部 change 元数据，并将这些结果用于 workflow 状态展示与归档决策。

#### Scenario: Workflow 运行中同步内部 change 状态
- **WHEN** autonomous spec-fix 已为当前 workflow 创建内部 OpenSpec change
- **THEN** GSD 调用 OpenSpec 命令读取 change 状态与 artifact 完成情况
- **AND** 将同步结果记录到 `workflow.json` 和 `spec-fix status` 输出中

#### Scenario: Workflow 归档时自动归档内部 change
- **WHEN** workflow 进入 archive 阶段
- **AND** 当前 workflow 已存在内部 OpenSpec change
- **THEN** GSD 自动调用 OpenSpec archive 命令归档该 change
- **AND** 只有当该命令成功完成时，才允许 workflow 进入 `archived`
