<purpose>
验证 `.planning/` 目录的完整性并报告可操作的问题。检查缺失文件、无效配置、不一致状态和孤立计划。可选地修复可自动修复的问题。
</purpose>

<required_reading>
在开始之前，阅读调用提示的 execution_context 中引用的所有文件。
</required_reading>

<process>

<step name="parse_args">
**解析参数：**

检查命令参数中是否存在 `--repair` 标志。

```
REPAIR_FLAG=""
if arguments contain "--repair"; then
  REPAIR_FLAG="--repair"
fi
```
</step>

<step name="run_health_check">
**运行健康检查验证：**

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" validate health $REPAIR_FLAG
```

解析 JSON 输出：
- `status`："healthy" | "degraded" | "broken"
- `errors[]`：严重问题（code、message、fix、repairable）
- `warnings[]`：非严重问题
- `info[]`：信息性说明
- `repairable_count`：可自动修复的问题数量
- `repairs_performed[]`：使用 --repair 时执行的操作
</step>

<step name="format_output">
**格式化并显示结果：**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD 健康检查
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

状态：HEALTHY | DEGRADED | BROKEN
错误：N | 警告：N | 信息：N
```

**如果执行了修复：**
```
## 已执行的修复

- ✓ config.json：已使用默认值创建
- ✓ STATE.md：已从路线图重新生成
```

**如果存在错误：**
```
## 错误

- [E001] config.json：第 5 行 JSON 解析错误
  修复：运行 /gsd:health --repair 重置为默认值

- [E002] PROJECT.md 未找到
  修复：运行 /gsd:new-project 创建
```

**如果存在警告：**
```
## 警告

- [W002] STATE.md 引用了阶段 5，但只有阶段 1-3 存在
  修复：在更改之前手动审查 STATE.md；修复不会覆盖现有的 STATE.md

- [W005] 阶段目录 "1-setup" 不符合 NN-name 格式
  修复：重命名以匹配模式（例如 01-setup）
```

**如果存在信息：**
```
## 信息

- [I001] 02-implementation/02-01-PLAN.md 没有 SUMMARY.md
  说明：可能正在进行中
```

**页脚（如果存在可修复的问题且未使用 --repair）：**
```
---
{N} 个问题可以自动修复。运行：/gsd:health --repair
```
</step>

<step name="offer_repair">
**如果存在可修复的问题且未使用 --repair：**

询问用户是否要运行修复：

```
是否要运行 /gsd:health --repair 自动修复 {N} 个问题？
```

如果是，使用 --repair 标志重新运行并显示结果。
</step>

<step name="verify_repairs">
**如果执行了修复：**

不带 --repair 重新运行健康检查以确认问题已解决：

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" validate health
```

报告最终状态。
</step>

</process>

<error_codes>

| 代码 | 严重性 | 描述 | 可修复 |
|------|----------|-------------|------------|
| E001 | 错误 | .planning/ 目录未找到 | 否 |
| E002 | 错误 | PROJECT.md 未找到 | 否 |
| E003 | 错误 | ROADMAP.md 未找到 | 否 |
| E004 | 错误 | STATE.md 未找到 | 是 |
| E005 | 错误 | config.json 解析错误 | 是 |
| W001 | 警告 | PROJECT.md 缺少必需部分 | 否 |
| W002 | 警告 | STATE.md 引用了无效的阶段 | 否 |
| W003 | 警告 | config.json 未找到 | 是 |
| W004 | 警告 | config.json 字段值无效 | 否 |
| W005 | 警告 | 阶段目录命名不匹配 | 否 |
| W006 | 警告 | 阶段在 ROADMAP 中但没有目录 | 否 |
| W007 | 警告 | 阶段在磁盘上但不在 ROADMAP 中 | 否 |
| W008 | 警告 | config.json：workflow.nyquist_validation 缺失（默认为启用但代理可能跳过） | 是 |
| W009 | 警告 | 阶段在 RESEARCH.md 中有验证架构但没有 VALIDATION.md | 否 |
| I001 | 信息 | 计划没有 SUMMARY（可能正在进行中） | 否 |

</error_codes>

<repair_actions>

| 操作 | 效果 | 风险 |
|--------|--------|------|
| createConfig | 使用默认值创建 config.json | 无 |
| resetConfig | 删除并重新创建 config.json | 丢失自定义设置 |
| regenerateState | 当 STATE.md 缺失时从 ROADMAP 结构创建 | 丢失会话历史 |
| addNyquistKey | 向 config.json 添加 workflow.nyquist_validation: true | 无——与现有默认值匹配 |

**不可修复（风险太高）：**
- PROJECT.md、ROADMAP.md 内容
- 阶段目录重命名
- 孤立计划清理

</repair_actions>

<stale_task_cleanup>
**Windows 特定：**检查崩溃/冻结时累积的过期 Claude Code 任务目录。
这些是子代理被强制终止时留下的，会占用磁盘空间。

当 `--repair` 激活时，检测并清理：

```bash
# 检查过期的任务目录（超过 24 小时）
TASKS_DIR="$HOME/.claude/tasks"
if [ -d "$TASKS_DIR" ]; then
  STALE_COUNT=$( (find "$TASKS_DIR" -maxdepth 1 -type d -mtime +1 2>/dev/null || true) | wc -l )
  if [ "$STALE_COUNT" -gt 0 ]; then
    echo "⚠️  在 ~/.claude/tasks/ 中发现 $STALE_COUNT 个过期的任务目录"
    echo "   这些是崩溃的子代理会话留下的。"
    echo "   运行：rm -rf ~/.claude/tasks/*（安全——只影响已终止的会话）"
  fi
fi
```

作为信息诊断报告：`I002 | 信息 | 发现过期的子代理任务目录 | 是（--repair 会删除它们）`
</stale_task_cleanup>
</output>
