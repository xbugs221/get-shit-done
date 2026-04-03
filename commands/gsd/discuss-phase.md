---
name: gsd:discuss-phase
description: 在规划之前通过自适应提问收集阶段上下文。使用 --auto 跳过交互式提问（Claude 选择推荐默认值）。
argument-hint: "<phase> [--auto] [--batch] [--analyze] [--text]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
  - Task
  - mcp__context7__resolve-library-id
  - mcp__context7__query-docs
---

<objective>
给出 CONTEXT.md 确保下游能理解需要调查什么以及哪些选择已确定。

**工作原理：**

1. 加载先前上下文（PROJECT.md、REQUIREMENTS.md、STATE.md、之前的 CONTEXT.md）
2. 扫描代码库中可复用的资产和模式
3. 分析阶段 — 跳过之前已决定的灰色地带
4. 展示剩余灰色地带 — 用户选择要讨论哪些
5. 深入探讨每个选定领域直到满意
6. 创建 CONTEXT.md，包含指导研究和规划的决策

**输出：** `{phase_num}-CONTEXT.md` — 决策足够清晰，下游代理无需再询问用户即可执行
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/discuss-phase.md
@~/.claude/get-shit-done/workflows/discuss-phase-assumptions.md
@~/.claude/get-shit-done/templates/context.md
</execution_context>

<context>
阶段编号：$ARGUMENTS（必填）

上下文文件在工作流中通过 `init phase-op` 和路线图/状态工具调用来解析。
</context>

<process>
**模式路由：**
```bash
DISCUSS_MODE=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow.discuss_mode 2>/dev/null || echo "discuss")
```

如果 `DISCUSS_MODE` 为 `"assumptions"`：读取并执行 @~/.claude/get-shit-done/workflows/discuss-phase-assumptions.md。

如果 `DISCUSS_MODE` 为 `"discuss"`（或未设置/其他值）：读取并执行 @~/.claude/get-shit-done/workflows/discuss-phase.md。

**强制要求：** execution_context 中的文件就是指令本身。在执行前先读取工作流文件。本命令文件中的 objective 和 success_criteria 只是摘要 — 工作流文件包含完整的逐步流程。不要根据摘要即兴发挥。
</process>

<success_criteria>

- 先前上下文已加载（不重复询问已决定的问题）
- 通过智能分析识别灰色地带
- 用户选择了要讨论的领域
- 每个选定领域探讨到满意
- 范围蔓延被重定向到延期想法
- CONTEXT.md 记录的是决策，而非模糊愿景
- 用户知道后续步骤
</success_criteria>
</output>
