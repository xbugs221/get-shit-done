---
name: gsd:debug
description: 具有跨上下文重置持久化状态的系统化调试
argument-hint: [问题描述]
allowed-tools:
  - Read
  - Bash
  - Task
  - AskUserQuestion
---

<objective>
使用科学方法和子代理隔离来调试问题。

**协调器角色：** 收集症状，生成 gsd-debugger 代理，处理检查点，生成后续代理。

**为什么使用子代理：** 调查会快速消耗上下文。每次调查都有全新的 200k 上下文，主上下文保持精简用于用户交互。
</objective>

<available_agent_types>
有效的 GSD 子代理类型（使用精确名称）：
- gsd-debugger — 诊断并修复问题
</available_agent_types>

<context>
用户的问题：$ARGUMENTS

检查活跃会话：
```bash
ls .planning/debug/*.md 2>/dev/null | grep -v resolved | head -5
```
</context>

<process>

## 0. 初始化上下文

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" state load)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

从初始化 JSON 中提取 `commit_docs`。解析调试器模型：
```bash
debugger_model=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" resolve-model gsd-debugger --raw)
```

## 1. 检查活跃会话

如果存在活跃会话且没有 $ARGUMENTS：
- 列出会话及其状态、假设、下一步操作
- 用户选择编号以恢复或描述新问题

如果提供了 $ARGUMENTS 或用户描述了新问题：继续症状收集。

## 2. 收集症状（新问题时）

对每项使用 AskUserQuestion：

1. **预期行为** - 应该发生什么？
2. **实际行为** - 实际发生了什么？
3. **错误信息** - 有任何错误吗？
4. **时间线** - 什么时候开始的？之前正常吗？
5. **复现方式** - 如何触发？

全部收集完毕后，确认开始调查。

## 3. 生成 gsd-debugger 代理

```markdown
<objective>
调查问题：{slug}

**摘要：** {trigger}
</objective>

<symptoms>
预期：{expected}
实际：{actual}
错误：{errors}
复现：{reproduction}
时间线：{timeline}
</symptoms>

<mode>
symptoms_prefilled: true
goal: find_and_fix
</mode>

<debug_file>
创建：.planning/debug/{slug}.md
</debug_file>
```

```
Task(
  prompt=filled_prompt,
  subagent_type="gsd-debugger",
  model="{debugger_model}",
  description="调试 {slug}"
)
```

## 4. 处理代理返回

**`## ROOT CAUSE FOUND`：**
- 显示根因和证据摘要
- 选项："立即修复"（生成修复子代理）、"规划修复"（建议 /gsd:plan-phase --gaps）、"手动修复"

**`## CHECKPOINT REACHED`：**
- 向用户展示检查点详情并获取回复
- `human-verify` 类型：用户确认已修复则继续完成/归档，报告问题则回到调查/修复
- 生成后续代理（见步骤 5）

**`## INVESTIGATION INCONCLUSIVE`：**
- 显示已检查和已排除的内容
- 选项："继续调查"（使用额外上下文生成新代理）、"手动调查"、"添加更多上下文"（重新收集症状）

## 5. 生成后续代理（检查点之后）

当用户回复检查点时，生成全新代理：

```markdown
<objective>
继续调试 {slug}。证据在调试文件中。
</objective>

<prior_state>
<files_to_read>
- .planning/debug/{slug}.md（调试会话状态）
</files_to_read>
</prior_state>

<checkpoint_response>
**类型：** {checkpoint_type}
**回复：** {user_response}
</checkpoint_response>

<mode>
goal: find_and_fix
</mode>
```

```
Task(
  prompt=continuation_prompt,
  subagent_type="gsd-debugger",
  model="{debugger_model}",
  description="继续调试 {slug}"
)
```

</process>

<success_criteria>
- [ ] 已检查活跃会话
- [ ] 已收集症状（新问题时）
- [ ] 已生成带上下文的 gsd-debugger
- [ ] 检查点已正确处理
- [ ] 修复前已确认根因
</success_criteria>
</output>
