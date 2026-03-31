# 探索模板

用于 `.planning/phases/XX-name/DISCOVERY.md` 的模板 - 为库/方案决策进行的浅层调研。

**用途：** 在计划阶段的强制探索环节中回答"我们应该使用哪个库/方案"的问题。

对于深度生态系统调研（"专家如何构建这个"），请使用 `/gsd:research-phase`，它会生成 RESEARCH.md。

---

## 文件模板

```markdown
---
phase: XX-name
type: discovery
topic: [discovery-topic]
---

<session_initialization>
在开始探索之前，确认今天的日期：
!`date +%Y-%m-%d`

在搜索"当前"或"最新"信息时使用此日期。
示例：如果今天是 2025-11-22，搜索"2025"而不是"2024"。
</session_initialization>

<discovery_objective>
探索 [topic] 以指导 [phase name] 的实施。

目的：[此探索促成什么决策/实施]
范围：[边界]
输出：包含建议的 DISCOVERY.md
</discovery_objective>

<discovery_scope>
<include>
- [需要回答的问题]
- [需要调查的领域]
- [需要的特定比较]
</include>

<exclude>
- [本次探索范围之外的内容]
- [推迟到实施阶段的内容]
</exclude>
</discovery_scope>

<discovery_protocol>

**来源优先级：**
1. **Context7 MCP** - 用于库/框架文档（最新的、权威的）
2. **官方文档** - 用于平台特定的或未被索引的库
3. **WebSearch** - 用于比较、趋势、社区模式（需验证所有发现）

**质量检查清单：**
在完成探索之前，验证：
- [ ] 所有声明都有权威来源（Context7 或官方文档）
- [ ] 否定性声明（"X 不可能"）已通过官方文档验证
- [ ] API 语法/配置来自 Context7 或官方文档（绝不仅凭 WebSearch）
- [ ] WebSearch 的发现已与权威来源交叉验证
- [ ] 已检查最近的更新/变更日志是否有破坏性变更
- [ ] 已考虑替代方案（不只是找到的第一个解决方案）

**置信度等级：**
- HIGH：Context7 或官方文档确认
- MEDIUM：WebSearch + Context7/官方文档确认
- LOW：仅有 WebSearch 或仅有训练知识（标记待验证）

</discovery_protocol>


<output_structure>
创建 `.planning/phases/XX-name/DISCOVERY.md`：

```markdown
# [Topic] 探索

## 摘要
[2-3 段执行摘要 - 调研了什么、发现了什么、建议什么]

## 主要建议
[做什么以及为什么 - 要具体且可操作]

## 考虑过的替代方案
[还评估了什么以及为什么未被选择]

## 关键发现

### [类别 1]
- [发现及来源 URL 和与我们案例的相关性]

### [类别 2]
- [发现及来源 URL 和相关性]

## 代码示例
[相关的实现模式（如适用）]

## 元数据

<metadata>
<confidence level="high|medium|low">
[为什么是这个置信度等级 - 基于来源质量和验证]
</confidence>

<sources>
- [使用的主要权威来源]
</sources>

<open_questions>
[无法确定的内容或需要在实施期间验证的内容]
</open_questions>

<validation_checkpoints>
[如果置信度为 LOW 或 MEDIUM，列出实施期间需要验证的具体事项]
</validation_checkpoints>
</metadata>
```
</output_structure>

<success_criteria>
- 所有范围内的问题都已用权威来源回答
- 质量检查清单项目已完成
- 有明确的主要建议
- 低置信度的发现已标记验证检查点
- 准备好为 PLAN.md 的创建提供信息
</success_criteria>

<guidelines>
**何时使用探索：**
- 技术选择不明确（库 A 还是库 B）
- 不熟悉的集成需要最佳实践
- 需要调查 API/库
- 单个决策待定

**何时不使用：**
- 已建立的模式（CRUD、使用已知库的认证）
- 实施细节（推迟到执行阶段）
- 从现有项目上下文就能回答的问题

**何时使用 RESEARCH.md：**
- 小众/复杂领域（3D、游戏、音频、着色器）
- 需要生态系统知识，而不仅仅是库的选择
- "专家如何构建这个"类型的问题
- 使用 `/gsd:research-phase` 处理这些情况
</guidelines>
</output>
