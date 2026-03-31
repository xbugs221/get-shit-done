<purpose>
为里程碑中间发现的紧急工作插入一个小数阶段，位于现有整数阶段之间。使用小数编号（72.1、72.2 等）来保持已规划阶段的逻辑顺序，同时容纳紧急插入而不需要重新编号整个路线图。
</purpose>

<required_reading>
在开始之前，阅读调用提示的 execution_context 中引用的所有文件。
</required_reading>

<process>

<step name="parse_arguments">
解析命令参数：
- 第一个参数：要在其后插入的整数阶段编号
- 其余参数：阶段描述

示例：`/gsd:insert-phase 72 Fix critical auth bug`
-> after = 72
-> description = "Fix critical auth bug"

如果缺少参数：

```
错误：阶段编号和描述都是必需的
用法：/gsd:insert-phase <after> <description>
示例：/gsd:insert-phase 72 Fix critical auth bug
```

退出。

验证第一个参数是否为整数。
</step>

<step name="init_context">
加载阶段操作上下文：

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init phase-op "${after_phase}")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

从初始化 JSON 检查 `roadmap_exists`。如果为 false：
```
错误：未找到路线图 (.planning/ROADMAP.md)
```
退出。
</step>

<step name="insert_phase">
**将阶段插入委托给 gsd-tools：**

```bash
RESULT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" phase insert "${after_phase}" "${description}")
```

CLI 处理以下内容：
- 验证目标阶段是否存在于 ROADMAP.md 中
- 计算下一个小数阶段编号（检查磁盘上现有的小数阶段）
- 从描述生成 slug
- 创建阶段目录（`.planning/phases/{N.M}-{slug}/`）
- 在 ROADMAP.md 中目标阶段之后插入阶段条目，带有 (INSERTED) 标记

从结果中提取：`phase_number`、`after_phase`、`name`、`slug`、`directory`。
</step>

<step name="update_project_state">
更新 STATE.md 以反映插入的阶段：

1. 读取 `.planning/STATE.md`
2. 在 "## Accumulated Context" → "### Roadmap Evolution" 下添加条目：
   ```
   - Phase {decimal_phase} inserted after Phase {after_phase}: {description} (URGENT)
   ```

如果 "Roadmap Evolution" 部分不存在，则创建它。
</step>

<step name="completion">
呈现完成摘要：

```
Phase {decimal_phase} 已插入到 Phase {after_phase} 之后：
- 描述：{description}
- 目录：.planning/phases/{decimal-phase}-{slug}/
- 状态：尚未规划
- 标记：(INSERTED) - 表示紧急工作

路线图已更新：.planning/ROADMAP.md
项目状态已更新：.planning/STATE.md

---

## 下一步

**Phase {decimal_phase}: {description}** -- 紧急插入

`/gsd:plan-phase {decimal_phase}`

<sub>`/clear` 先清理 -> 全新的上下文窗口</sub>

---

**其他可用操作：**
- 审查插入影响：检查 Phase {next_integer} 的依赖关系是否仍然合理
- 审查路线图

---
```
</step>

</process>

<anti_patterns>

- 不要将此用于里程碑末尾的计划工作（使用 /gsd:add-phase）
- 不要在 Phase 1 之前插入（小数 0.1 没有意义）
- 不要重新编号现有阶段
- 不要修改目标阶段的内容
- 不要创建计划（那是 /gsd:plan-phase 的工作）
- 不要提交更改（由用户决定何时提交）
</anti_patterns>

<success_criteria>
阶段插入完成的标志：

- [ ] `gsd-tools phase insert` 已成功执行
- [ ] 阶段目录已创建
- [ ] 路线图已更新，包含新的阶段条目（包括 "(INSERTED)" 标记）
- [ ] STATE.md 已更新路线图演变记录
- [ ] 用户已被告知后续步骤和依赖影响
</success_criteria>
</output>
