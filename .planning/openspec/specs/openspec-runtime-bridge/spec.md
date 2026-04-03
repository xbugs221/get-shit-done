# openspec-runtime-bridge Specification

## Purpose
TBD - created by archiving change spec-fix-openspec-integration. Update Purpose after archive.
## Requirements
### Requirement: GSD 必须通过 OpenSpec runtime 解析项目状态根
GSD SHALL 通过 OpenSpec runtime 的既有定位规则解析项目级 OpenSpec 状态根，而不是在仓库内硬编码 `./openspec` 路径。

#### Scenario: 仓库未配置 locator 时回退到默认根目录
- **WHEN** 仓库根目录不存在 `.openspec-root.json`
- **AND** GSD 需要查询关联 OpenSpec change
- **THEN** GSD 通过 OpenSpec runtime 解析默认状态根 `openspec/`
- **AND** 不会在 GSD 侧实现另一套独立的默认路径规则

#### Scenario: 仓库使用 `.planning/openspec` 作为嵌套状态根
- **WHEN** 仓库根目录存在 `.openspec-root.json`
- **AND** 其 `stateRoot` 为 `.planning/openspec`
- **THEN** GSD 通过 OpenSpec runtime 读取位于 `.planning/openspec/changes/` 下的 change
- **AND** 不会把仓库根 `openspec/` 当作优先路径

### Requirement: GSD 必须通过 OpenSpec JSON 契约读取 change 元数据
GSD SHALL 通过 OpenSpec 的 JSON 命令面读取关联 change 的状态与归档结果，并将这些结果用于 workflow 校验与状态展示。

#### Scenario: 读取 change 状态用于 workflow 展示
- **WHEN** `spec-fix status <id>` 需要展示关联 OpenSpec change
- **THEN** GSD 调用 `openspec status --change <name> --json`
- **AND** 读取 `isComplete`、`applyRequires` 和各 artifact 的 `status`
- **AND** 将这些结果作为 `spec-fix status` 输出的一部分返回给用户

#### Scenario: 读取归档结果用于 workflow 归档判定
- **WHEN** workflow 进入 archive 阶段
- **THEN** GSD 调用 `openspec archive <name> --yes`
- **AND** 只有当该命令成功完成时，才允许 workflow 进入 `archived`

