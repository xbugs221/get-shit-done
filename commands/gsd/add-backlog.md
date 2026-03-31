---
name: gsd:add-backlog
description: 将想法添加到待办停车场（使用 999.x 编号）
argument-hint: <description>
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
使用 999.x 编号将待办事项添加到路线图。待办事项是尚未进入主动规划的无序想法，存在于正常阶段序列之外，随时间积累上下文。
</objective>

<process>

1. **读取 ROADMAP.md** 查找现有待办条目：
   ```bash
   cat .planning/ROADMAP.md
   ```

2. **查找下一个待办编号：**
   ```bash
   NEXT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" phase next-decimal 999 --raw)
   ```
   如果不存在 999.x 阶段，则从 999.1 开始。

3. **创建阶段目录：**
   ```bash
   SLUG=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" generate-slug "$ARGUMENTS")
   mkdir -p ".planning/phases/${NEXT}-${SLUG}"
   touch ".planning/phases/${NEXT}-${SLUG}/.gitkeep"
   ```

4. **添加到 ROADMAP.md** 的 `## Backlog` 部分下（不存在则在末尾创建）：

   ```markdown
   ## Backlog

   ### Phase {NEXT}: {description} (BACKLOG)

   **目标：** [已捕获，留待未来规划]
   **需求：** 待定
   **计划：** 0 个计划

   计划：
   - [ ] 待定（准备好后使用 /gsd:review-backlog 提升）
   ```

5. **提交：**
   ```bash
   node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs: add backlog item ${NEXT} — ${ARGUMENTS}" --files .planning/ROADMAP.md ".planning/phases/${NEXT}-${SLUG}/.gitkeep"
   ```

6. **报告：**
   ```
   ## 📋 已添加待办事项

   阶段 {NEXT}: {description}
   目录：.planning/phases/{NEXT}-{slug}/

   此事项存放在待办停车场中。
   使用 /gsd:discuss-phase {NEXT} 进一步探索。
   使用 /gsd:review-backlog 将事项提升到活跃里程碑。
   ```

</process>

<notes>
- 999.x 编号使待办事项不会进入活跃阶段序列
- 阶段目录立即创建，供 /gsd:discuss-phase 和 /gsd:plan-phase 使用
- 无 `Depends on:` 字段——待办事项按定义无序
- 编号可不连续（999.1、999.3）——始终使用 next-decimal
</notes>
