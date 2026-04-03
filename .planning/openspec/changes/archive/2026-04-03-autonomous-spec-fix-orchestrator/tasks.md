## 1. CLI 与状态机入口重构

- [x] 1.1 将 `spec-fix` 主入口改为接受自然语言问题并启动自动执行，而不是要求用户先创建 OpenSpec change
- [x] 1.2 为 autonomous workflow 增加执行态、阻塞态和 OpenSpec 同步态字段，并保持 `workflow.json` 可恢复
- [x] 1.3 将旧的 `start` / `complete-stage` 路径降级为兼容或调试入口，避免成为主交互路径

## 2. 自动执行编排器

- [x] 2.1 抽离统一的阶段执行器契约，让无 mux 和 mux 模式都能运行同一套阶段命令
- [x] 2.2 实现 analysis -> proposal-review -> coding -> code-review -> archive 的自动推进与阶段校验
- [x] 2.3 实现 code-review 自动回退到 coding 的增量修复回环，并在第 3 次 review 后自动通过
- [x] 2.4 在每个成功阶段后自动创建固定格式 commit，并把 commit hash 写入状态文件

## 3. Mux 与 OpenSpec 后台集成

- [x] 3.1 让 `zellij` / `tmux` pane 直接执行阶段命令，而不是只显示 prompt 后停在 shell
- [x] 3.2 将 OpenSpec 集成改为按需惰性创建、同步和归档，而不是启动前校验预建 change
- [x] 3.3 在 `spec-fix status` 中暴露自动执行进度、阻塞原因和 OpenSpec 同步状态

## 4. 验收测试与文档

- [x] 4.1 增加确定性 fixture 执行模式，支持验收测试覆盖自动成功和三轮 review 回环场景
- [x] 4.2 运行并通过 `tests/spec/autonomous-spec-fix-orchestrator.test.cjs`
- [x] 4.3 更新用户文档，说明 `spec-fix` 的单命令自然语言入口和自动推进语义
