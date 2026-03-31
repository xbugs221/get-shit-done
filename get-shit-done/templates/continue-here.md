# 继续点模板

复制并填写此结构，用于 `.planning/phases/XX-name/.continue-here.md`：

```yaml
---
phase: XX-name
task: 3
total_tasks: 7
status: in_progress
last_updated: 2025-01-15T14:30:00Z
---
```

```markdown
<current_state>
[我们现在到哪了？当前的直接上下文是什么？]
</current_state>

<completed_work>
[本次会话完成了什么 - 要具体]

- Task 1: [名称] - 完成
- Task 2: [名称] - 完成
- Task 3: [名称] - 进行中，[已完成的部分]
</completed_work>

<remaining_work>
[本阶段剩余什么]

- Task 3: [名称] - [还需要做什么]
- Task 4: [名称] - 未开始
- Task 5: [名称] - 未开始
</remaining_work>

<decisions_made>
[关键决策及原因 - 以便下次会话不会重新讨论]

- 决定使用 [X] 因为 [原因]
- 选择 [方案] 而非 [替代方案] 因为 [原因]
</decisions_made>

<blockers>
[任何卡住的或等待外部因素的事项]

- [阻碍 1]：[状态/变通方案]
</blockers>

<context>
[心理状态、"感觉"、任何有助于顺利恢复的信息]

[你在想什么？计划是什么？
这是"从你离开的地方精确继续"的上下文。]
</context>

<next_action>
[恢复时要做的第一件事]

从以下开始：[具体操作]
</next_action>
```

<yaml_fields>
必需的 YAML 前置元数据：

- `phase`：目录名（例如 `02-authentication`）
- `task`：当前任务编号
- `total_tasks`：阶段中的任务总数
- `status`：`in_progress`、`blocked`、`almost_done`
- `last_updated`：ISO 时间戳
</yaml_fields>

<guidelines>
- 要足够具体，使得一个全新的 Claude 实例能立即理解
- 包含决策的原因，而不仅仅是结果
- `<next_action>` 应该无需阅读其他任何内容即可执行
- 此文件在恢复后会被删除 - 它不是永久存储
</guidelines>
</output>
