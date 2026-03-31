---
name: gsd:list-phase-assumptions
description: 在规划前展示 Claude 对阶段方案的假设
argument-hint: "[phase]"
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
---

<objective>
分析指定阶段，展示 Claude 关于技术方案、实现顺序、范围边界、风险领域和依赖关系的假设。

目的：在规划开始前暴露假设，便于用户尽早纠正。
输出：仅对话输出（不创建文件），以"你觉得怎么样？"结束。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/list-phase-assumptions.md
</execution_context>

<context>
阶段编号：$ARGUMENTS（必填）

项目状态和路线图在工作流内部通过针对性读取加载。
</context>

<process>
1. 验证阶段编号参数（缺失或无效时报错）
2. 检查阶段是否存在于路线图中
3. 按 list-phase-assumptions.md 工作流执行：
   - 分析路线图描述
   - 展示五方面假设：技术方案、实现顺序、范围、风险、依赖关系
   - 提示"你觉得怎么样？"
4. 收集反馈并提供后续步骤
</process>

<success_criteria>
- 阶段已根据路线图验证
- 五个方面的假设已展示
- 已提示用户反馈
- 用户知道后续步骤（讨论上下文、规划阶段或纠正假设）
</success_criteria>
