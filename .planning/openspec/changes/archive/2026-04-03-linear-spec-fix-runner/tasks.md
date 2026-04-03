## 1. Runner 基础能力

- [x] 1.1 在 `gsd-tools` 中增加 `spec-fix start` 和 `spec-fix status` 的命令路由
- [x] 1.2 定义 `.planning/fixes/<id>/` 目录布局，包括 `PROBLEM.md`、`workflow.json` 和各阶段工件路径
- [x] 1.3 实现初始问题捕获 commit，并强制使用 `问题：<原文单行化版本>` 的 subject 格式
- [x] 1.4 增加 `workflow.spec_fix_agent_providers` 配置解析，并支持 5 个 agent 独立 provider/runtime 组合

## 2. Mux 创建与注入

- [x] 2.1 实现 `zellij` 适配器，按固定顺序创建六个 pane：`lazygit`、`analysis`、`proposal-review`、`coding`、`code-review`、`archive`
- [x] 2.2 实现 `tmux` 适配器，并遵守相同的 pane 顺序和 runner 契约
- [x] 2.3 预生成阶段 prompt 文件或命令载荷，并注入正确的 pane，且不允许阶段重排

## 3. 阶段闸门与重试控制

- [x] 3.1 为每个阶段实现 validator 和 completion hook，执行 `validate -> commit -> 更新 workflow state -> 解锁下一阶段`
- [x] 3.2 在 `workflow.json` 中持久化 commit hash、时间戳、mux 元数据、provider 解析结果和当前阶段
- [x] 3.3 实现有上限的 `code-review -> coding-redo` 回环，支持结构化反馈交接，并在第 3 次 review 后自动通过

## 4. 状态检查与文档

- [x] 4.1 实现 `spec-fix status <id>`，让用户可以查看阶段、重试次数、第 3 次 review 自动通过状态、commit hash、mux 元数据、provider 解析结果和关联的 OpenSpec change
- [x] 4.2 更新面向用户的工作流文档，说明固定 runner 模型、pane 顺序、有上限的重试行为和多 provider 配置
- [x] 4.3 运行并通过 fixed spec-fix runner 工作流对应的验收测试
