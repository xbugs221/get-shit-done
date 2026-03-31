---
name: gsd:thread
description: 管理持久化上下文线程，用于跨会话工作
argument-hint: [name | description]
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
创建、列出或恢复持久化上下文线程。线程是轻量级的跨会话知识存储，
用于跨越多个会话但不属于任何特定阶段的工作。
</objective>

<process>

**解析 $ARGUMENTS 以确定模式：**

<mode_list>
**如果没有参数或 $ARGUMENTS 为空：**

列出所有线程：
```bash
ls .planning/threads/*.md 2>/dev/null
```

对每个线程，读取前几行以显示标题和状态：
```
## 活跃线程

| 线程 | 状态 | 最后更新 |
|--------|--------|-------------|
| fix-deploy-key-auth | OPEN | 2026-03-15 |
| pasta-tcp-timeout | RESOLVED | 2026-03-12 |
| perf-investigation | IN PROGRESS | 2026-03-17 |
```

如果不存在线程：`未找到线程。使用 /gsd:thread <description> 创建。`
</mode_list>

<mode_resume>
**如果 $ARGUMENTS 匹配已有线程名（文件存在）：**

恢复线程 — 将其上下文加载到当前会话：
```bash
cat ".planning/threads/${THREAD_NAME}.md"
```

显示线程内容并询问用户下一步想做什么。
如果线程状态为 `OPEN`，将其更新为 `IN PROGRESS`。
</mode_resume>

<mode_create>
**如果 $ARGUMENTS 是新描述（没有匹配的线程文件）：**

1. 从描述生成 slug：
   ```bash
   SLUG=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" generate-slug "$ARGUMENTS")
   ```

2. 创建线程目录和文件：
   ```bash
   mkdir -p .planning/threads
   cat > ".planning/threads/${SLUG}.md" << 'EOF'
   # 线程：{description}

   ## 状态：OPEN

   ## 目标

   {description}

   ## 上下文

   *创建于 {today's date} 的对话中。*

   ## 参考资料

   - *（添加链接、文件路径或 issue 编号）*

   ## 下一步

   - *（下一个会话应首先做什么）*
   EOF
   ```

3. 如果当前对话中有相关上下文（代码片段、错误信息、调查结果），
   提取并添加到上下文部分。

4. 提交：
   ```bash
   node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs: create thread — ${ARGUMENTS}" --files ".planning/threads/${SLUG}.md"
   ```

5. 报告：
   ```
   ## 🧵 线程已创建

   线程：{slug}
   文件：.planning/threads/{slug}.md

   恢复命令：/gsd:thread {slug}
   ```
</mode_create>

</process>

<notes>
- 线程独立于路线图存在，不属于任何阶段
- 比 /gsd:pause-work 更轻量 — 没有阶段状态和计划上下文
- 核心价值在于上下文和下一步 — 冷启动的会话可以立即接续工作
- 成熟的线程可通过 /gsd:add-phase 或 /gsd:add-backlog 提升为阶段或待办
- 线程文件存放在 .planning/threads/ — 不与阶段或其他 GSD 结构冲突
</notes>
