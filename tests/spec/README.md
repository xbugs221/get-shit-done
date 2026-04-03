# Spec 验收测试

这个目录存放从 OpenSpec change 场景推导出的验收型测试。

规则：
- 每个测试都应反映真实用户工作流或系统契约。
- 在实现落地之前，测试允许失败；它们是 apply 阶段的固定靶标。
- 测试应聚焦外部可见行为，而不是内部 helper 细节。

当前变更：
- `linear-spec-fix-runner`：确定性的 spec-fix runner，具有固定 pane 布局、逐阶段 commit 和有上限的 review 重试
- `spec-fix-openspec-integration`：让 spec-fix workflow 与 OpenSpec runtime 状态树、change 校验和 archive 生命周期保持一致
- `autonomous-spec-fix-orchestrator`：将 spec-fix 改为自然语言单入口、自动推进并按阶段自动提交的修复编排器
