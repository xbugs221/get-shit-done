<purpose>
在内联模式下执行简单任务，无需子代理开销。不创建 PLAN.md，不启动 Task，
不进行研究，不进行计划检查。只需：理解 → 执行 → 提交 → 记录。

适用任务如：修正拼写错误、更新配置值、添加缺少的导入、重命名
变量、提交未提交的工作、添加 .gitignore 条目、更新版本号。

对于需要多步骤规划或研究的任务，使用 /gsd:quick。
</purpose>

<process>

<step name="parse_task">
从 `$ARGUMENTS` 解析任务描述。

如果为空，询问：
```
快速修复是什么？（一句话）
```

存储为 `$TASK`。
</step>

<step name="scope_check">
**在做任何事之前，验证这确实是简单任务。**

任务被视为简单的条件：
- 不超过 3 个文件编辑
- 不超过 1 分钟的工作量
- 无新依赖或架构变更
- 不需要研究

如果任务看起来不简单（多文件重构、新功能、需要研究），
则提示：

```
这个任务似乎需要规划。请改用 /gsd:quick：
  /gsd:quick "{任务描述}"
```

然后停止。
</step>

<step name="execute_inline">
直接完成工作：

1. 读取相关文件
2. 进行修改
3. 验证修改有效（运行现有测试（如适用），或做简单的健全性检查）

**不创建 PLAN.md。**直接做。
</step>

<step name="commit">
原子提交更改：

```bash
git add -A
git commit -m "fix: {简要描述变更内容}"
```

使用约定式提交格式：根据情况选择 `fix:`、`feat:`、`docs:`、`chore:`、`refactor:`。
</step>

<step name="log_to_state">
如果 `.planning/STATE.md` 存在，追加到"快速任务已完成"表中。
如果表不存在，静默跳过此步骤。

```bash
# 检查 STATE.md 是否有快速任务表
if grep -q "Quick Tasks Completed" .planning/STATE.md 2>/dev/null; then
  # 追加条目——工作流处理格式
  echo "| $(date +%Y-%m-%d) | fast | $TASK | ✅ |" >> .planning/STATE.md
fi
```
</step>

<step name="done">
报告完成：

```
✅ 完成：{变更了什么}
   提交：{短哈希}
   文件：{变更文件列表}
```

不建议下一步。不进行工作流路由。只是完成。
</step>

</process>

<guardrails>
- 绝不启动 Task/子代理——在内联模式下运行
- 绝不创建 PLAN.md 或 SUMMARY.md 文件
- 绝不运行研究或计划检查
- 如果任务超过 3 个文件编辑，停止并重定向到 /gsd:quick
- 如果你不确定如何实现，停止并重定向到 /gsd:quick
</guardrails>

<success_criteria>
- [ ] 任务在当前上下文中完成（无子代理）
- [ ] 带约定式消息的原子 git 提交
- [ ] 如果 STATE.md 存在则已更新
- [ ] 总操作时间不超过 2 分钟
</success_criteria>
</output>
