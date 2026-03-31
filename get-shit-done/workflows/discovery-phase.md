<purpose>
在适当的深度级别执行发现。
生成 DISCOVERY.md（用于级别 2-3），为 PLAN.md 的创建提供信息。

从 plan-phase.md 的 mandatory_discovery 步骤调用，带有深度参数。

注意：如需全面的生态系统研究（"专家如何构建这个"），请改用 /gsd:research-phase，它会生成 RESEARCH.md。
</purpose>

<depth_levels>
**此工作流支持三个深度级别：**

| 级别 | 名称         | 时间      | 输出                                       | 适用场景                                      |
| ----- | ------------ | --------- | -------------------------------------------- | ----------------------------------------- |
| 1     | 快速验证 | 2-5 分钟   | 无文件，使用已验证的知识继续     | 单个库，确认当前语法 |
| 2     | 标准     | 15-30 分钟 | DISCOVERY.md                                 | 在选项间做选择，新的集成 |
| 3     | 深度调研    | 1+ 小时   | 带验证关卡的详细 DISCOVERY.md  | 架构决策，新问题   |

**深度在路由到此处之前由 plan-phase.md 确定。**
</depth_levels>

<source_hierarchy>
**强制要求：先 Context7 后 WebSearch**

Claude 的训练数据有 6-18 个月的滞后。务必验证。

1. **首先使用 Context7 MCP** - 当前文档，无幻觉
2. **官方文档** - 当 Context7 覆盖不足时
3. **WebSearch 最后** - 仅用于比较和趋势

参见 ~/.claude/get-shit-done/templates/discovery.md `<discovery_protocol>` 获取完整协议。
</source_hierarchy>

<process>

<step name="determine_depth">
检查从 plan-phase.md 传递的深度参数：
- `depth=verify` → 级别 1（快速验证）
- `depth=standard` → 级别 2（标准发现）
- `depth=deep` → 级别 3（深度调研）

路由到下方对应的级别工作流。
</step>

<step name="level_1_quick_verify">
**级别 1：快速验证（2-5 分钟）**

适用于：单个已知库，确认语法/版本仍然正确。

**流程：**

1. 在 Context7 中解析库：

   ```
   mcp__context7__resolve-library-id with libraryName: "[library]"
   ```

2. 获取相关文档：

   ```
   mcp__context7__get-library-docs with:
   - context7CompatibleLibraryID: [来自步骤 1]
   - topic: [具体关注点]
   ```

3. 验证：

   - 当前版本符合预期
   - API 语法未更改
   - 近期版本无破坏性变更

4. **如果验证通过：** 返回 plan-phase.md 并确认。无需 DISCOVERY.md。

5. **如果发现问题：** 升级到级别 2。

**输出：** 口头确认继续，或升级到级别 2。
</step>

<step name="level_2_standard">
**级别 2：标准发现（15-30 分钟）**

适用于：在选项间做选择，新的外部集成。

**流程：**

1. **确定需要发现什么：**

   - 存在哪些选项？
   - 关键比较标准是什么？
   - 我们的具体用例是什么？

2. **对每个选项使用 Context7：**

   ```
   对于每个库/框架：
   - mcp__context7__resolve-library-id
   - mcp__context7__get-library-docs (mode: "code" 用于 API, "info" 用于概念)
   ```

3. **官方文档**用于 Context7 缺少的内容。

4. **WebSearch** 用于比较：

   - "[选项 A] vs [选项 B] {current_year}"
   - "[选项] known issues"
   - "[选项] with [我们的技术栈]"

5. **交叉验证：** 任何 WebSearch 发现 → 使用 Context7/官方文档确认。

6. **创建 DISCOVERY.md** 使用 ~/.claude/get-shit-done/templates/discovery.md 结构：

   - 带推荐的摘要
   - 每个选项的关键发现
   - 来自 Context7 的代码示例
   - 置信度（级别 2 应为中高）

7. 返回 plan-phase.md。

**输出：** `.planning/phases/XX-name/DISCOVERY.md`
</step>

<step name="level_3_deep_dive">
**级别 3：深度调研（1+ 小时）**

适用于：架构决策，新问题，高风险选择。

**流程：**

1. **界定发现范围** 使用 ~/.claude/get-shit-done/templates/discovery.md：

   - 定义明确的范围
   - 定义包含/排除边界
   - 列出需要回答的具体问题

2. **全面的 Context7 研究：**

   - 所有相关库
   - 相关模式和概念
   - 如需要，每个库多个主题

3. **深入阅读官方文档：**

   - 架构指南
   - 最佳实践部分
   - 迁移/升级指南
   - 已知限制

4. **WebSearch 获取生态系统上下文：**

   - 他人如何解决类似问题
   - 生产环境经验
   - 陷阱和反模式
   - 近期变更/公告

5. **交叉验证所有发现：**

   - 每个 WebSearch 声明 → 使用权威来源验证
   - 标记哪些是已验证的 vs 假设的
   - 标记矛盾之处

6. **创建全面的 DISCOVERY.md：**

   - 来自 ~/.claude/get-shit-done/templates/discovery.md 的完整结构
   - 带来源归属的质量报告
   - 按发现的置信度
   - 如果任何关键发现置信度为低 → 添加验证检查点

7. **置信度关卡：** 如果整体置信度为低，在继续之前展示选项。

8. 返回 plan-phase.md。

**输出：** `.planning/phases/XX-name/DISCOVERY.md`（全面的）
</step>

<step name="identify_unknowns">
**适用于级别 2-3：** 定义我们需要学习什么。

问：在规划此阶段之前，我们需要了解什么？

- 技术选择？
- 最佳实践？
- API 模式？
- 架构方案？
  </step>

<step name="create_discovery_scope">
使用 ~/.claude/get-shit-done/templates/discovery.md。

包含：

- 明确的发现目标
- 限定的包含/排除列表
- 来源偏好（官方文档、Context7、当前年份）
- DISCOVERY.md 的输出结构
  </step>

<step name="execute_discovery">
运行发现：
- 使用网络搜索获取当前信息
- 使用 Context7 MCP 获取库文档
- 优先使用当前年份的来源
- 按模板组织发现结果
</step>

<step name="create_discovery_output">
写入 `.planning/phases/XX-name/DISCOVERY.md`：
- 带推荐的摘要
- 带来源的关键发现
- 适用时的代码示例
- 元数据（置信度、依赖项、开放问题、假设）
</step>

<step name="confidence_gate">
创建 DISCOVERY.md 后，检查置信度级别。

如果置信度为低：
使用 AskUserQuestion：

- header: "低置信度"
- question: "发现置信度为低：[原因]。你希望如何继续？"
- options:
  - "深入研究" - 在规划之前进行更多研究
  - "继续进行" - 接受不确定性，带注意事项进行规划
  - "暂停" - 我需要考虑一下

如果置信度为中：
内联："发现完成（中等置信度）。[简要原因]。继续规划？"

如果置信度为高：
直接继续，仅注明："发现完成（高置信度）。"
</step>

<step name="open_questions_gate">
如果 DISCOVERY.md 有 open_questions：

内联展示：
"发现中的开放问题：

- [问题 1]
- [问题 2]

这些可能影响实施。确认并继续？（yes / 先解决）"

如果"先解决"：收集用户对问题的输入，更新发现。
</step>

<step name="offer_next">
```
发现完成：.planning/phases/XX-name/DISCOVERY.md
推荐：[一句话]
置信度：[级别]

下一步？

1. 讨论阶段上下文 (/gsd:discuss-phase [current-phase])
2. 创建阶段计划 (/gsd:plan-phase [current-phase])
3. 深化发现（深入研究）
4. 审查发现

```

注意：DISCOVERY.md 不会单独提交。它将随阶段完成一起提交。
</step>

</process>

<success_criteria>
**级别 1（快速验证）：**
- 已咨询 Context7 获取库/主题信息
- 当前状态已验证或问题已升级
- 口头确认继续（无文件）

**级别 2（标准）：**
- 已为所有选项咨询 Context7
- WebSearch 发现已交叉验证
- 已创建带推荐的 DISCOVERY.md
- 置信度为中或更高
- 准备好为 PLAN.md 创建提供信息

**级别 3（深度调研）：**
- 已定义发现范围
- 已全面咨询 Context7
- 所有 WebSearch 发现已与权威来源验证
- 已创建带全面分析的 DISCOVERY.md
- 带来源归属的质量报告
- 如有低置信度发现 → 已定义验证检查点
- 置信度关卡已通过
- 准备好为 PLAN.md 创建提供信息
</success_criteria>
</output>
