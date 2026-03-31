# 调试模板

`.planning/debug/[slug].md` 的模板 — 用于跟踪活跃的调试会话。

---

## 文件模板

```markdown
---
status: gathering | investigating | fixing | verifying | awaiting_human_verify | resolved
trigger: "[用户原始输入]"
created: [ISO 时间戳]
updated: [ISO 时间戳]
---

## 当前焦点
<!-- 每次更新时覆盖 - 始终反映当前状态 -->

hypothesis: [当前正在测试的假设]
test: [如何测试]
expecting: [结果为真/假分别意味着什么]
next_action: [下一步立即要做的事]

## 症状
<!-- 在收集阶段写入，之后不可修改 -->

expected: [预期行为]
actual: [实际行为]
errors: [错误信息（如有）]
reproduction: [如何复现]
started: [何时出现问题 / 一直存在]

## 已排除
<!-- 仅追加 - 防止 /clear 后重复调查 -->

- hypothesis: [被证伪的假设]
  evidence: [证伪的证据]
  timestamp: [排除时间]

## 证据
<!-- 仅追加 - 调查过程中发现的事实 -->

- timestamp: [发现时间]
  checked: [检查了什么]
  found: [观察到什么]
  implication: [这意味着什么]

## 解决方案
<!-- 随着理解深入而覆盖更新 -->

root_cause: [找到之前为空]
fix: [应用之前为空]
verification: [验证之前为空]
files_changed: []
```

---

<section_rules>

**前置元数据（status、trigger、timestamps）：**
- `status`：覆盖更新 - 反映当前阶段
- `trigger`：不可修改 - 用户原始输入，永不更改
- `created`：不可修改 - 仅设置一次
- `updated`：覆盖更新 - 每次变更时更新

**当前焦点：**
- 每次更新时完全覆盖
- 始终反映 Claude 当前正在做什么
- 如果 Claude 在 /clear 后读取此内容，能准确知道从哪里继续
- 字段：hypothesis、test、expecting、next_action

**症状：**
- 在初始收集阶段写入
- 收集完成后不可修改
- 作为我们要修复问题的参考基准
- 字段：expected、actual、errors、reproduction、started

**已排除：**
- 仅追加 - 永不删除条目
- 防止上下文重置后重新调查已排除的方向
- 每条记录包含：假设、证伪证据、时间戳
- 对跨 /clear 边界的效率至关重要

**证据：**
- 仅追加 - 永不删除条目
- 调查过程中发现的事实
- 每条记录包含：时间戳、检查内容、发现内容、含义
- 为根因分析构建论据

**解决方案：**
- 随着理解深入而覆盖更新
- 在尝试修复过程中可能多次更新
- 最终状态展示已确认的根因和已验证的修复
- 字段：root_cause、fix、verification、files_changed

</section_rules>

<lifecycle>

**创建：** 调用 /gsd:debug 时立即创建
- 从用户输入创建文件并设置 trigger
- 将 status 设为 "gathering"
- 当前焦点：next_action = "gather symptoms"
- 症状：为空，待填写

**症状收集期间：**
- 随着用户回答问题更新症状部分
- 每次提问时更新当前焦点
- 完成后：status → "investigating"

**调查期间：**
- 每次假设时覆盖更新当前焦点
- 每次发现时追加到证据
- 假设被证伪时追加到已排除
- 更新前置元数据中的时间戳

**修复期间：**
- status → "fixing"
- 确认根因后更新 Resolution.root_cause
- 应用修复后更新 Resolution.fix
- 更新 Resolution.files_changed

**验证期间：**
- status → "verifying"
- 将验证结果更新到 Resolution.verification
- 如果验证失败：status → "investigating"，重新尝试

**自检通过后：**
- status -> "awaiting_human_verify"
- 在检查点中请求用户明确确认
- 暂不将文件移至已解决状态

**解决时：**
- status → "resolved"
- 将文件移至 .planning/debug/resolved/（仅在用户确认修复后）

</lifecycle>

<resume_behavior>

当 Claude 在 /clear 后读取此文件时：

1. 解析前置元数据 → 了解状态
2. 读取当前焦点 → 准确知道之前在做什么
3. 读取已排除 → 知道哪些不要重试
4. 读取证据 → 知道已经了解了什么
5. 从 next_action 继续

此文件就是调试大脑。Claude 应该能够从任何中断点完美恢复。

</resume_behavior>

<size_constraint>

保持调试文件简洁：
- 证据条目：每条 1-2 行，只记录事实
- 已排除：简短 - 假设 + 为何失败
- 不要写叙述性文字 - 只用结构化数据

如果证据增长过多（10+ 条），考虑是否在兜圈子。检查已排除部分以确保没有重复走老路。

</size_constraint>
