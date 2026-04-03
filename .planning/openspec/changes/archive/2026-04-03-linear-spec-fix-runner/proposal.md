## Why

当前的小型 spec-fix 设计已经把阶段语义讲清楚了，但还没有真正保证执行顺序、pane 布局和逐阶段 commit。现在需要补上一个确定性的 runner，让用户只用一条命令就能启动流程、在固定 mux window 中观察进展，并且确保 review 回环、三审后自动通过规则，以及多 provider 组合都被明确控制。

## What Changes

- 增加一个确定性的 `spec-fix` runner，用脚本和 hook 推进固定线性流程，而不是依赖调度 agent。
- 增加适配 `zellij` 或 `tmux` 的固定六 pane 布局，并将 `lazygit` 固定在第 1 个 pane，其余阶段按稳定顺序排列。
- 通过产物校验、阶段专属 commit 和 `.planning/fixes/<id>/` 下的持久化状态，强制执行阶段闸门。
- 增加有上限的 code-review 改进回环：前 2 次 review 未通过时返回 coding 增量修复，第 3 次 review 完成后自动视为通过，并带着最终 review 备注进入 archive。
- 增加 `spec-fix status` 检查面，方便用户查看当前阶段、重试次数、commit hash、自动通过状态和 OpenSpec 关联状态。
- 增加 agent provider 配置能力，让 analysis、proposal-review、coding、code-review、archive 这 5 个 agent 可以任意组合 provider，而不是被单一 `--runtime` 参数全局绑定。

## Capabilities

### New Capabilities
- `fixed-spec-fix-runner`：以确定性的、pane 驱动的状态机运行小型 spec-fix 工作流，并强制逐阶段 commit、三审后自动通过，以及 5 个 agent 的 provider 独立配置。

### Modified Capabilities
- 无。

## Impact

- `get-shit-done/bin/gsd-tools.cjs` 及其相关 CLI 支撑库，需要新增 `spec-fix` 命令
- `get-shit-done/bin/lib/` 下的工作流与状态管理代码
- 面向 `zellij` 和 `tmux` 的 mux 适配脚本
- agent provider 解析与配置读取逻辑
- `.planning/fixes/` 下的工件布局与状态查看能力
- 固定工作流入口与检查方式的用户文档
- 覆盖端到端用户流程的验收测试
