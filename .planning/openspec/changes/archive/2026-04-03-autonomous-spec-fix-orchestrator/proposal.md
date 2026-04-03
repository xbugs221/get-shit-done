## Why

当前的 `spec-fix` runner 仍然要求用户先准备 OpenSpec change，并通过 `complete-stage` 手工推进 analysis、proposal-review、coding、code-review、archive 各阶段。这和目标体验相反：用户真正需要的是只输入一段自然语言 bug 描述，然后由工具按既定流程自动分析、实现、评审、回环修复并提交结果。

## What Changes

- 将 `spec-fix` 的主入口改为自然语言问题驱动，启动时不再要求用户先创建 OpenSpec change。
- 将 `spec-fix` 从“手工阶段 runner”改为“自动执行编排器”，默认按 analysis -> proposal-review -> coding -> code-review -> archive 顺序持续推进。
- 保留 fix workspace、状态机和逐阶段 commit，但这些都转为内部机制，不再要求用户显式调用 `complete-stage`。
- 让 mux pane 从“展示 prompt 并停在 shell”变成“直接执行预设 agent 命令并输出进度”；不打开 mux 时也应能以非交互方式完整运行。
- 将 OpenSpec 集成从“启动前置依赖”改为“执行期间按需生成/同步、归档时自动处理”的后台行为。
- 增加面向自动编排流程的验收测试，覆盖单命令启动、自动回环重试、自动提交和失败时的阻塞输出。

## Capabilities

### New Capabilities
- 无

### Modified Capabilities
- `fixed-spec-fix-runner`: 将启动入口从手工阶段 runner 改为自然语言单入口的自动编排执行器。
- `openspec-runtime-bridge`: 将 OpenSpec 从启动前置校验改为内部按需创建、同步和归档的运行时桥接能力。

## Impact

- `get-shit-done/bin/gsd-tools.cjs` 的 `spec-fix` 命令面
- `get-shit-done/bin/lib/spec-fix.cjs` 的状态机、执行器、mux 注入和提交流程
- `.planning/fixes/<id>/` 下的工作区布局与状态持久化
- OpenSpec runtime 集成逻辑与归档时机
- `tests/spec/` 下的 spec-fix 验收测试与测试说明
- 用户文档中对 `spec-fix` 使用方式和输出语义的描述
