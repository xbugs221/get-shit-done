<purpose>
调研如何实现某个阶段。使用阶段上下文生成 gsd-phase-researcher。

独立的调研命令。对于大多数工作流，请使用自动集成调研的 `/gsd:plan-phase`。
</purpose>

<available_agent_types>
有效的 GSD 子代理类型（使用确切名称——不要回退到 'general-purpose'）：
- gsd-phase-researcher — 为某个阶段调研技术方案
</available_agent_types>

<process>

## 步骤 0：解析模型配置

@~/.claude/get-shit-done/references/model-profile-resolution.md

解析以下模型：
- `gsd-phase-researcher`

## 步骤 1：规范化和验证阶段

@~/.claude/get-shit-done/references/phase-argument-parsing.md

```bash
PHASE_INFO=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" roadmap get-phase "${PHASE}")
```

如果 `found` 为 false：报错并退出。

## 步骤 2：检查现有调研

```bash
ls .planning/phases/${PHASE}-*/RESEARCH.md 2>/dev/null || true
```

如果存在：提供更新/查看/跳过选项。

## 步骤 3：收集阶段上下文

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init phase-op "${PHASE}")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
# 提取：phase_dir、padded_phase、phase_number、state_path、requirements_path、context_path
AGENT_SKILLS_RESEARCHER=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-researcher 2>/dev/null)
```

## 步骤 4：生成调研员

```
Task(
  prompt="<objective>
调研阶段 {phase}: {name} 的实现方案
</objective>

<files_to_read>
- {context_path}（来自 /gsd:discuss-phase 的用户决策）
- {requirements_path}（项目需求）
- {state_path}（项目决策和历史）
</files_to_read>

${AGENT_SKILLS_RESEARCHER}

<additional_context>
阶段描述：{description}
</additional_context>

<output>
写入到：.planning/phases/${PHASE}-{slug}/${PHASE}-RESEARCH.md
</output>",
  subagent_type="gsd-phase-researcher",
  model="{researcher_model}"
)
```

## 步骤 5：处理返回

- `## RESEARCH COMPLETE` — 显示摘要，提供选项：规划/深入调研/审查/完成
- `## CHECKPOINT REACHED` — 呈现给用户，生成延续
- `## RESEARCH INCONCLUSIVE` — 显示尝试次数，提供选项：添加上下文/尝试不同模式/手动

</process>
</output>
