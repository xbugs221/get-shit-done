<purpose>
执行阶段计划（PLAN.md）并创建结果摘要（SUMMARY.md）。
无头 SDK 变体 — 无需交互式检查点或用户提示即可自主运行。
</purpose>

<process>

<step name="init_context" priority="first">
从会话注入的上下文文件加载执行上下文。提取：阶段目录、阶段编号、计划、摘要、未完成的计划、状态路径、配置路径。

如果规划目录缺失：通过事件流报告错误。
</step>

<step name="identify_plan">
找到第一个没有匹配 SUMMARY 的 PLAN。支持小数阶段（例如 `01.1-hotfix/`）。

自主进行 — 无需用户确认。
</step>

<step name="record_start_time">
记录计划开始时间戳以跟踪持续时间。
</step>

<step name="parse_segments">
检查计划中的检查点类型：

**按检查点类型路由：**

| 检查点 | 模式 | 执行方式 |
|--------|------|----------|
| 无 | A（自主） | 执行完整计划 + SUMMARY |
| 仅验证 | B（分段） | 自主执行各段；记录验证结果而非暂停 |
| 决策 | C（主要） | 基于可用上下文自主做出决策 |

在无头模式下，所有检查点类型均自主处理：
- **human-verify** 检查点：运行自动化验证，记录结果，继续
- **decision** 检查点：选择推荐选项（第一个选项），记录选择，继续
- **human-action** 检查点：如果需要凭证/认证则记录为阻塞项；否则以尽力自动化方式继续
</step>

<step name="load_prompt">
读取 PLAN.md 文件。这就是执行指令。严格遵循。

**如果计划包含 `<interfaces>` 块：**直接使用预提取的类型定义 — 不要重新读取源文件来发现类型。
</step>

<step name="execute">
偏差是正常的 — 按以下规则处理。

1. 从提示中读取上下文文件
2. 对于每个任务：
   - **强制 read_first 门控：**如果任务有 `<read_first>` 字段，在进行编辑之前必须读取所有列出的文件。
   - `type="auto"`：按偏差规则实现。验证完成标准。
   - `type="checkpoint:*"`：按上述 parse_segments 路由自主处理。
   - **强制 acceptance_criteria 检查：**完成每个任务后，在进入下一个任务之前验证每个标准。
3. 运行 `<verification>` 检查
4. 确认 `<success_criteria>` 已满足
5. 在摘要中记录偏差
</step>

<authentication_gates>
执行期间的认证错误是交互点，不是失败。

**指示符：**"Not authenticated"、"Unauthorized"、401/403、"Please run {tool} login"、"Set {ENV_VAR}"

**无头协议：**
1. 识别认证门控
2. 将认证需求记录为阻塞事件
3. 继续处理剩余的非阻塞任务
4. 在摘要中报告被阻塞的任务
</authentication_gates>

<deviation_rules>
| 规则 | 触发条件 | 操作 | 权限 |
|------|----------|------|------|
| **1: Bug** | 行为异常、错误、类型错误、安全漏洞 | 内联修复，跟踪 `[Rule 1 - Bug]` | 自动 |
| **2: 缺失关键项** | 缺少错误处理、验证、认证、CSRF/CORS | 内联添加，跟踪 `[Rule 2 - Missing Critical]` | 自动 |
| **3: 阻塞项** | 阻止完成：缺少依赖、类型错误、导入损坏 | 修复阻塞项，跟踪 `[Rule 3 - Blocking]` | 自动 |
| **4: 架构性** | 结构变更：新数据库表、模式变更、新服务 | 记录为阻塞事件；不要自主进行架构变更 | 报告 |
</deviation_rules>

<step name="verification_failure_gate">
如果验证失败，自主尝试修复：
1. 分析失败原因
2. 尝试修复（预算：2 次尝试）
3. 如果修复成功：继续
4. 如果修复耗尽：记录失败，继续处理剩余任务，在摘要中报告
</step>

<step name="create_summary">
创建 SUMMARY.md，包含：
- 前置信息：阶段、计划、子系统、标签、依赖图、技术栈、关键文件、关键决策、持续时间、完成时间戳
- 实质性的一行摘要（不要含糊）
- 任务完成详情
- 偏差文档
- 来自认证门控或架构决策的任何阻塞项
</step>

</process>

<success_criteria>
- PLAN.md 中的所有任务已完成（或阻塞项已记录）
- 所有验证通过（或失败已记录）
- SUMMARY.md 已创建且包含实质性内容
- 偏差已跟踪和记录
</success_criteria>
