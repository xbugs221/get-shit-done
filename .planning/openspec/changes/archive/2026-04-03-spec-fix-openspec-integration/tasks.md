## 1. 状态树与 bridge 契约

- [x] 1.1 在仓库根增加 `.openspec-root.json`，并将 OpenSpec 状态树迁移到 `.planning/openspec/`
- [x] 1.2 为 GSD 增加统一的 OpenSpec runtime bridge helper，封装 `status --json`、`instructions apply --json` 和 `archive --yes` 调用
- [x] 1.3 在 `workflow.json` 中持久化稳定的 OpenSpec 链接元数据，而不是只保存一个不透明的 `change_name`
- [x] 1.4 运行并通过 OpenSpec state root / runtime bridge 对应的验收测试

## 2. Runner 生命周期协同

- [x] 2.1 修改 `spec-fix start`，强制要求显式 `--change`，并在创建 workspace 前校验关联 OpenSpec change
- [x] 2.2 修改 `spec-fix status`，把 workflow 状态与 OpenSpec artifact 进度合并输出
- [x] 2.3 修改 archive 阶段，在 workflow 归档前调用并验证 `openspec archive <change> --yes`
- [x] 2.4 运行并通过 `spec-fix` 与 OpenSpec 生命周期协同对应的验收测试

## 3. 文档与迁移

- [x] 3.1 更新工作流文档，说明 `.planning/fixes` 与 `.planning/openspec` 的职责边界
- [x] 3.2 更新用户命令文档，说明 `spec-fix start` 的显式 `--change` 要求和 archive 联动语义
- [x] 3.3 运行并通过本变更对应的验收测试脚本
