## Why

当前 `spec-fix` runner 的运行态已经稳定落在 `.planning/fixes/<id>/workflow.json`，但它只把 OpenSpec change 当作一个字符串字段保存，没有校验该 change 是否真实存在，也不会读取 OpenSpec 的 artifact 完成状态，更不会在 archive 阶段和 OpenSpec 归档保持一致。与此同时，本地精简后的 OpenSpec 已支持通过 `.openspec-root.json` 将状态树迁移到 `.planning/openspec`，现在正好可以把 GSD 运行态与 OpenSpec 声明态放进同一棵 `.planning/` 树下，并定义清楚二者的桥接契约。

## What Changes

- 修改 `spec-fix` runner，使其在 `start`、`status` 和 `archive` 路径上都通过 OpenSpec runtime 校验并读取关联 change，而不是把 `change_name` 当作不透明字符串。
- 新增一个 OpenSpec runtime bridge 能力，用统一契约解析仓库级 OpenSpec `stateRoot`，支持默认 `openspec/` 和嵌套 `.planning/openspec/` 两种布局。
- 将当前仓库的目标状态树明确为：GSD 运行态保留在 `.planning/fixes/` 与 `.planning/config.json`，OpenSpec 声明态迁移到 `.planning/openspec/`。
- 修改 `spec-fix status` 输出，使其同时展示 workflow 状态与关联 OpenSpec change 的 artifact 完成度、`applyRequires`、状态根目录和变更目录。
- 修改 archive 语义：`spec-fix` 的 archive 完成前必须先让关联 OpenSpec change 成功归档；若 OpenSpec change 未就绪或归档失败，则 workflow 保持未归档状态。
- **BREAKING** `spec-fix start` 不再接受默认的占位 change 名；调用方必须显式指定一个已存在的 OpenSpec change。

## Capabilities

### New Capabilities
- `openspec-runtime-bridge`: 为 GSD 提供基于 OpenSpec runtime 的状态根解析、change 校验和 JSON 状态查询能力。

### Modified Capabilities
- `fixed-spec-fix-runner`: 调整 `spec-fix` 的 start/status/archive 行为，使其与关联 OpenSpec change 保持一致的生命周期和可观察性。

## Impact

- `get-shit-done/bin/lib/spec-fix.cjs` 的启动、状态输出与 archive 完成逻辑
- GSD 内部用于调用外部 CLI 的 helper/错误处理层
- 当前仓库的 OpenSpec 状态树布局与相关文档
- `tests/spec/` 下围绕 OpenSpec state root、change 校验和归档协同的验收测试
