---
name: gsd:research-phase
description: 研究如何实现某个阶段（独立命令 — 通常请改用 /gsd:plan-phase）
argument-hint: "[phase]"
allowed-tools:
  - Read
  - Bash
  - Task
---

<objective>
研究如何实现某个阶段。使用阶段上下文生成 gsd-phase-researcher 子代理。

**注意：** 这是独立研究命令。大多数工作流中请使用 `/gsd:plan-phase`（自动集成研究功能）。

**适用场景：**
- 想先研究但还不想规划
- 规划完成后需要重新研究
- 需要先调查阶段可行性

**编排器角色：** 解析阶段、根据路线图验证、检查现有研究、收集上下文、生成研究者代理、呈现结果。

**为何使用子代理：** 研究会快速消耗上下文（WebSearch、Context7 查询、来源验证）。全新的 200k 上下文用于调查，主上下文保持精简。
</objective>

<available_agent_types>
有效的 GSD 子代理类型（使用确切名称）：
- gsd-phase-researcher — 为某个阶段研究技术方案
</available_agent_types>

<context>
阶段编号：$ARGUMENTS（必需）

在步骤 1 中先规范化阶段输入，然后再进行任何目录查找。
</context>

<process>

## 0. 初始化上下文

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init phase-op "$ARGUMENTS")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

从初始化 JSON 中提取：`phase_dir`、`phase_number`、`phase_name`、`phase_found`、`commit_docs`、`has_research`、`state_path`、`requirements_path`、`context_path`、`research_path`。

解析研究者模型：
```bash
RESEARCHER_MODEL=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" resolve-model gsd-phase-researcher --raw)
```

## 1. 验证阶段

```bash
PHASE_INFO=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" roadmap get-phase "${phase_number}")
```

**`found` 为 false：** 报错并退出。**`found` 为 true：** 提取 `phase_number`、`phase_name`、`goal`。

## 2. 检查现有研究

```bash
ls .planning/phases/${PHASE}-*/RESEARCH.md 2>/dev/null
```

**如果存在：** 提供选项：1) 更新研究，2) 查看现有内容，3) 跳过。等待回应。

**如果不存在：** 继续。

## 3. 收集阶段上下文

使用 INIT 中的路径（不要在编排器上下文中内联文件内容）：
- `requirements_path`
- `context_path`
- `state_path`

展示摘要，包含阶段描述和研究者将加载的文件。

## 4. 生成 gsd-phase-researcher 代理

研究模式：ecosystem（默认）、feasibility、implementation、comparison。

```markdown
<research_type>
阶段研究 — 调查如何良好地实现特定阶段。
</research_type>

<key_insight>
核心问题是："有什么是我不知道自己不知道的？"

对于这个阶段，发现：
- 既定的架构模式是什么？
- 哪些库构成标准技术栈？
- 人们通常会遇到什么问题？
- 什么是当前最先进的方案 vs Claude 训练数据认为的最先进方案？
- 什么不应该手动实现？
</key_insight>

<objective>
研究阶段 {phase_number}: {phase_name} 的实现方案
模式：ecosystem
</objective>

<files_to_read>
- {requirements_path}（需求文档）
- {context_path}（来自 discuss-phase 的阶段上下文，如果存在）
- {state_path}（之前的项目决策和阻碍）
</files_to_read>

<additional_context>
**阶段描述：** {phase_description}
</additional_context>

<downstream_consumer>
你的 RESEARCH.md 将被 `/gsd:plan-phase` 加载，它使用以下特定章节：
- `## Standard Stack` → 规划使用这些库
- `## Architecture Patterns` → 任务结构遵循这些模式
- `## Don't Hand-Roll` → 任务绝不为列出的问题构建自定义方案
- `## Common Pitfalls` → 验证步骤检查这些问题
- `## Code Examples` → 任务操作引用这些模式

要给出明确建议，而非探索性建议。用"使用 X"而不是"考虑 X 或 Y"。
</downstream_consumer>

<quality_gate>
在声明完成之前，验证：
- [ ] 所有领域都已调查（不只是部分）
- [ ] 否定性声明已通过官方文档验证
- [ ] 关键声明有多个来源
- [ ] 置信度已诚实标注
- [ ] 章节名称与 plan-phase 期望的一致
</quality_gate>

<output>
写入到：.planning/phases/${PHASE}-{slug}/${PHASE}-RESEARCH.md
</output>
```

```
Task(
  prompt=filled_prompt,
  subagent_type="gsd-phase-researcher",
  model="{researcher_model}",
  description="研究阶段 {phase}"
)
```

## 5. 处理代理返回

**`## RESEARCH COMPLETE`：** 显示摘要，提供选项：规划阶段、深入挖掘、查看完整内容、完成。

**`## CHECKPOINT REACHED`：** 呈现给用户，获取回应，生成继续代理。

**`## RESEARCH INCONCLUSIVE`：** 展示已尝试的内容，提供选项：添加上下文、尝试不同模式、手动操作。

## 6. 生成继续代理

```markdown
<objective>
继续阶段 {phase_number}: {phase_name} 的研究
</objective>

<prior_state>
<files_to_read>
- .planning/phases/${PHASE}-{slug}/${PHASE}-RESEARCH.md（现有研究）
</files_to_read>
</prior_state>

<checkpoint_response>
**类型：** {checkpoint_type}
**回应：** {user_response}
</checkpoint_response>
```

```
Task(
  prompt=continuation_prompt,
  subagent_type="gsd-phase-researcher",
  model="{researcher_model}",
  description="继续研究阶段 {phase}"
)
```

</process>

<success_criteria>
- [ ] 阶段已根据路线图验证
- [ ] 已检查现有研究
- [ ] gsd-phase-researcher 已带上下文生成
- [ ] 检查点已正确处理
- [ ] 用户知道下一步操作
</success_criteria>
