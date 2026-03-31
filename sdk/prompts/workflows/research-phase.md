<purpose>
研究如何实现某个阶段。生成供规划者使用的 RESEARCH.md。
无头 SDK 变体 — 无需交互式提示即可自主运行。
</purpose>

<process>

<step name="resolve_model">
使用 SDK 会话提供的模型配置。无交互式模型选择。
</step>

<step name="validate_phase">
使用上下文文件验证阶段是否存在于路线图中。如果未找到：通过事件流报告错误。
</step>

<step name="check_existing_research">
检查此阶段的 RESEARCH.md 是否已存在。如果存在且未请求强制刷新：使用现有的，跳过研究。
</step>

<step name="gather_phase_context">
从注入的上下文文件加载阶段上下文：
- 上下文文件（CONTEXT.md）— 用户决策
- 需求文件（REQUIREMENTS.md）— 项目需求
- 状态文件（STATE.md）— 项目决策和历史
</step>

<step name="spawn_researcher">
使用阶段研究者代理定义执行研究。提供：
- 阶段编号和名称
- 阶段描述和目标
- 要读取的上下文文件
- RESEARCH.md 的输出路径

研究者调查阶段的技术领域，识别标准技术栈、模式、陷阱，并编写 RESEARCH.md。
</step>

<step name="handle_return">
处理研究者结果：
- **研究完成** — 研究文件已写入，继续下一阶段步骤
- **研究受阻** — 记录阻塞项，报告到事件流
- **研究不确定** — 记录发现，使用可用上下文继续
</step>

</process>
