## Context

当前实现里，GSD 的 `spec-fix` runner 已经拥有独立的运行时状态机：它会创建 `.planning/fixes/<id>/`、生成 `PROBLEM.md` 和 `workflow.json`，并在状态文件中记录 `change_name`、阶段、commit、pane 与 provider 解析结果。但这个 `change_name` 目前只是一个关联标签，不会被 runner 用来读取 OpenSpec 的真实状态，也不会校验该 change 是否存在于仓库状态树中。

与此同时，精简后的 OpenSpec 已经被收缩为 runtime-only CLI，并通过 `.openspec-root.json` + `stateRoot` 机制支持将状态树从默认 `openspec/` 迁移到嵌套的 `.planning/openspec/`。这意味着当前仓库终于可以把：

- GSD 运行态：`.planning/config.json`、`.planning/fixes/`
- OpenSpec 声明态：`changes/`、`specs/`、`archive/`

放在同一棵 `.planning/` 树下，同时避免 GSD 自己硬编码 OpenSpec 路径。

这个变更的目标不是重写 OpenSpec，也不是让 GSD 直接 import `../OpenSpec` 源码；目标是为当前仓库定义一个稳定的协同契约，让 `spec-fix` runner 在需要时只通过 OpenSpec runtime 的 JSON 命令面完成 change 校验、状态读取和归档协调。

## Goals / Non-Goals

**Goals:**
- 明确当前仓库的目标布局为 `.planning/fixes` + `.planning/openspec`。
- 让 `spec-fix start` 在创建 workspace 前校验关联 OpenSpec change 是否存在。
- 让 `spec-fix status` 同时输出 workflow 状态和 OpenSpec artifact 进度。
- 让 archive 阶段与 OpenSpec archive 保持原子性的“先成功归档 change，再标记 workflow archived”契约。
- 保持 GSD 与 OpenSpec 的职责边界：GSD 管流程，OpenSpec 管声明态工件。

**Non-Goals:**
- 不在本次设计中改写 OpenSpec CLI 本身，也不向其增加新的专有子命令。
- 不让 GSD 直接 import `../OpenSpec` 源码模块并复制 `stateRoot` 解析逻辑。
- 不自动创建 OpenSpec change；`spec-fix` 只消费一个已存在的 change。
- 不重新设计 `spec-fix` 的 pane 布局、阶段顺序、review 回环或 provider 配置。

## Decisions

### 1. 将仓库内 OpenSpec 状态树固定迁移到 `.planning/openspec`

仓库根新增 `.openspec-root.json`，其内容固定为：

```json
{
  "stateRoot": ".planning/openspec"
}
```

迁移后，OpenSpec 的 `changes/`、`specs/`、`schemas/`、`config.yaml` 与 `changes/archive/` 全部位于 `.planning/openspec/` 下；GSD 自己的 `config.json`、`fixes/` 等运行态文件继续保留在 `.planning/` 根下。

这样做的原因是：

- 用户只需要记住 `.planning/` 这一棵项目状态树。
- OpenSpec 依然保持自洽的子树，不会把配置和工件散落到多个目录。
- `spec-fix` 的运行态和 OpenSpec 的声明态可以并排存在，而不是一个在 `.planning/`、一个在仓库根 `openspec/`。

Alternatives considered:
- 继续把 OpenSpec 保持在仓库根 `openspec/`：不采用。这样无法兑现“统一状态树”的目标，也会让协同逻辑长期停留在半耦合状态。
- 把 OpenSpec 文件打散到 `.planning/` 顶层：不采用。OpenSpec 自身已经定义了 `changes/specs/schemas/config` 的子树契约，没有必要拆散。

### 2. GSD 只通过 OpenSpec runtime CLI 交互，不复制 `stateRoot` 解析逻辑

GSD 新增一个薄封装 helper，统一调用以下命令：

- `openspec status --change <name> --json`
- `openspec instructions apply --change <name> --json`
- `openspec archive <name> --yes`

状态根目录、变更目录和归档目录的解析由 OpenSpec runtime 自己负责，GSD 只消费 JSON 与退出码。

这样做的原因是：

- `stateRoot` 解析规则已经由 OpenSpec 定义，包括默认路径、相对路径校验和嵌套目录支持。
- 如果 GSD 再实现一套 locator/path 解析，将来很容易和 OpenSpec 的真正规则漂移。
- 通过 CLI JSON 契约交互，可以维持仓库间的弱耦合，避免把 `../OpenSpec` 源码直接变成运行时依赖。

Alternatives considered:
- 在 GSD 中复制 `.openspec-root.json` 解析：不采用。规则重复会在后续 OpenSpec 演进时产生双维护成本。
- 直接 import OpenSpec 源码：不采用。当前仓库不应该依赖邻居仓库源码路径，也不需要把 GSD 与 OpenSpec 绑定到同一个 Node 模块生命周期。

### 3. `spec-fix start` 必须显式绑定并验证一个现有的 OpenSpec change

`spec-fix start` 必须要求 `--change <name>`。runner 在创建 `.planning/fixes/<id>/`、写 `workflow.json` 和启动 mux 之前，先调用 `openspec status --change <name> --json` 校验 change 存在且能被当前仓库 state root 正常解析。

校验通过后，runner 在 `workflow.json` 中除了已有的 `change_name` 外，还应记录稳定的 OpenSpec 链接元数据，例如：

- `state_root`
- `change_dir`
- 最近一次读取到的 `apply_requires`
- 最近一次读取到的 artifact 状态摘要

这样可以让 workflow 成为“这次 run 关联了哪个 OpenSpec change、当时它处于什么状态”的可审计记录。

Alternatives considered:
- 保留当前默认的占位 change 名：不采用。它会制造伪关联，导致 workflow 看似有 change，实际并无对应工件。
- 在 start 时自动创建 OpenSpec change：不采用。本次的目标是桥接运行态与声明态，而不是让 runner 接管 propose 生命周期。

### 4. `spec-fix status` 输出 workflow 与 OpenSpec 双视图

`spec-fix status` 返回结果中新增 `openspec` 字段，用于展示：

- 解析后的 `state_root`
- `change_name`
- `change_dir`
- `is_complete`
- `apply_requires`
- 各 artifact 的 `status`、`outputPath` 与缺失依赖

runner 在读取 `workflow.json` 后，实时调用 `openspec status --change ... --json` 获取这部分信息；若 OpenSpec 查询失败，则 `spec-fix status` 应保留 workflow 输出，但显式报告 OpenSpec 读取错误。

这样用户只看一个命令就能知道：

- fix 流程现在处在哪个阶段
- 关联的 OpenSpec proposal/design/spec/tasks 走到了哪一步

Alternatives considered:
- 只显示 `change_name`：不采用。它不足以支撑真正的协同，也无法让用户在一个视图里完成排障。
- 只在 `workflow.json` 里缓存 OpenSpec 状态，不实时查询：不采用。缓存会很快过期，不适合作为最终展示源。

### 5. archive 阶段以 OpenSpec archive 成功为前置条件

当用户完成 `spec-fix complete-stage <id> --stage archive` 时，runner 必须先：

1. 校验 archive 工件 `SUMMARY.md`
2. 调用 `openspec archive <change_name> --yes`
3. 只有当 OpenSpec archive 成功后，才创建 GSD 的 archive 阶段 commit、更新 `workflow.json` 并把 `current_stage` 置为 `archived`

如果 OpenSpec change 未完成、validation 失败或 archive 命令报错，则 runner 必须中止当前阶段，不得把 workflow 标记为已归档。

这样做可以保证用户不会得到“GSD 已归档，但 OpenSpec change 仍停留在 active changes”这种裂脑状态。

Alternatives considered:
- 先归档 workflow，再让用户手动 archive OpenSpec change：不采用。会让两套状态轻易失一致。
- archive 阶段完全不触碰 OpenSpec：不采用。这会让“协同”只剩下展示层，而没有生命周期保证。

## Risks / Trade-offs

- [Risk] `spec-fix status` 变成依赖外部 CLI 调用，失败路径更多
  Mitigation：把 OpenSpec 读取错误显式包进状态输出，不吞掉失败原因，也不覆盖 workflow 原始状态。
- [Risk] archive 阶段增加了 OpenSpec archive 的失败面，导致流程更严格
  Mitigation：这是有意的 fail-closed 行为，宁可阻塞归档，也不要制造双状态不一致。
- [Risk] `.planning/openspec` 迁移会影响现有文档和脚本中的固定路径
  Mitigation：统一通过 `.openspec-root.json` 与文档迁移说明替换硬编码路径。
- [Risk] `spec-fix start` 强制要求 `--change` 会打破现有默认行为
  Mitigation：这是显式的 breaking change，但能彻底消除假关联和占位 change 名带来的误导。

## Migration Plan

1. 在仓库根新增 `.openspec-root.json`，将 `stateRoot` 指向 `.planning/openspec`。
2. 将当前仓库的 `openspec/` 状态树整体移动到 `.planning/openspec/`。
3. 为 GSD 增加统一的 OpenSpec CLI bridge helper，并补充错误处理。
4. 修改 `spec-fix start`，强制要求显式 `--change`，并在 workspace 创建前做 OpenSpec 校验。
5. 修改 `spec-fix status`，增加 OpenSpec 双视图输出。
6. 修改 archive 阶段，将 `openspec archive` 设为 workflow 归档前置条件。
7. 更新文档和验收测试，覆盖默认根、嵌套根、缺失 change、状态输出和 archive 协同。

Rollback strategy:

- 删除 `.openspec-root.json` 并将 OpenSpec 状态树移回仓库根 `openspec/`
- 回退 GSD 中的 OpenSpec bridge helper 与 `spec-fix` 行为修改
- 已经归档的 OpenSpec change 与 fix workspace 保持原状，不自动反向迁移

## Open Questions

- `spec-fix start` 将来是否需要提供显式的“帮我创建并绑定一个新 change”模式，还是始终保持只绑定已有 change？
- `spec-fix status` 是否要同时暴露 `openspec instructions apply --json` 的摘要，还是先只展示 `status` 信息？
