---
name: gsd:review-backlog
description: 审查待办事项并将其提升到活跃里程碑
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
审查所有 999.x 待办事项，可选择将其提升到活跃里程碑序列中或移除过时条目。
</objective>

<process>

1. **列出待办事项：**
   ```bash
   ls -d .planning/phases/999* 2>/dev/null || echo "No backlog items found"
   ```

2. **读取 ROADMAP.md** 并提取所有 999.x 阶段条目：
   ```bash
   cat .planning/ROADMAP.md
   ```
   展示每个待办事项及其描述、已积累的上下文（CONTEXT.md、RESEARCH.md）和创建日期。

3. **向用户展示列表：**
   - 对于每个待办事项展示：阶段编号、描述、已积累的产物
   - 每项选项：**提升**（移至活跃）、**保留**（留在待办）、**移除**（删除）

4. **提升项目：**
   - 找到下一个顺序阶段编号
   - 重命名目录：
     ```bash
     NEW_NUM=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" phase add "${DESCRIPTION}" --raw)
     ```
   - 将已积累的产物移至新的阶段目录
   - 更新 ROADMAP.md：将条目从 `## Backlog` 移至活跃阶段列表
   - 移除 `(BACKLOG)` 标记，添加 `**Depends on:**` 字段

5. **移除项目：**
   - 删除阶段目录
   - 从 ROADMAP.md 的 `## Backlog` 部分移除条目

6. **提交更改：**
   ```bash
   node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs: review backlog — promoted N, removed M" --files .planning/ROADMAP.md
   ```

7. **报告摘要：**
   ```
   ## 📋 待办审查完成

   已提升：{已提升项目及其新阶段编号的列表}
   已保留：{仍在待办中的项目列表}
   已移除：{已删除项目的列表}
   ```

</process>
