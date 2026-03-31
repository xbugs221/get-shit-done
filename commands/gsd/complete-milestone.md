---
type: prompt
name: gsd:complete-milestone
description: 归档已完成的里程碑并为下一个版本做准备
argument-hint: <version>
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
将里程碑 {{version}} 标记为完成，归档到 milestones/，更新 ROADMAP.md 和 REQUIREMENTS.md。

输出：里程碑已归档（路线图 + 需求），PROJECT.md 已演进，git 已打标签。
</objective>

<execution_context>
**立即加载以下文件：**

- @~/.claude/get-shit-done/workflows/complete-milestone.md（主工作流）
- @~/.claude/get-shit-done/templates/milestone-archive.md（归档模板）
</execution_context>

<context>
**项目文件：**
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/PROJECT.md`

**用户输入：** 版本号 {{version}}（例如 "1.0"、"1.1"、"2.0"）
</context>

<process>

**按照 complete-milestone.md 工作流执行：**

0. **检查审计：**
   - 查找 `.planning/v{{version}}-MILESTONE-AUDIT.md`
   - 缺失或过期：建议先运行 `/gsd:audit-milestone`
   - 审计状态为 `gaps_found`：建议先运行 `/gsd:plan-milestone-gaps`
   - 审计状态为 `passed`：继续步骤 1

   ```markdown
   ## 预检查

   {如果没有审计文件:}
   ⚠ 未找到里程碑审计。请先运行 `/gsd:audit-milestone` 以验证需求覆盖率和集成。

   {如果审计存在差距:}
   ⚠ 里程碑审计发现差距。运行 `/gsd:plan-milestone-gaps` 或继续执行并接受为技术债务。

   {如果审计通过:}
   ✓ 里程碑审计通过。继续完成操作。
   ```

1. **验证就绪状态：** 检查所有阶段是否有 SUMMARY.md，展示范围和统计数据，等待确认。

2. **收集统计数据：** 统计阶段/计划/任务数，计算 git 范围、文件变更、代码行数，提取时间线。

3. **提取成果：** 读取所有阶段 SUMMARY.md，提取 4-6 个关键成果，提交审批。

4. **归档里程碑：** 创建 `.planning/milestones/v{{version}}-ROADMAP.md`，填写归档模板，将 ROADMAP.md 更新为带链接的单行摘要。

5. **归档需求：** 创建 `.planning/milestones/v{{version}}-REQUIREMENTS.md`，记录需求结果（已验证/已调整/已放弃），删除 `.planning/REQUIREMENTS.md`。

6. **更新 PROJECT.md：** 添加"当前状态"和"下一里程碑目标"部分，归档旧内容到 `<details>` 中（v1.1+）。

7. **提交并打标签：**
   - 暂存：MILESTONES.md、PROJECT.md、ROADMAP.md、STATE.md、归档文件
   - 提交：`chore: archive v{{version}} milestone`
   - 标签：`git tag -a v{{version}} -m "[里程碑摘要]"`
   - 询问是否推送标签

8. **后续步骤：** `/gsd:new-milestone` — 开始下一个里程碑

</process>

<success_criteria>
- 里程碑已归档到 `.planning/milestones/v{{version}}-ROADMAP.md`
- 需求已归档到 `.planning/milestones/v{{version}}-REQUIREMENTS.md`
- `.planning/REQUIREMENTS.md` 已删除
- ROADMAP.md 已折叠为单行条目
- PROJECT.md 已更新，Git 标签已创建，提交成功
- 用户知道后续步骤
</success_criteria>

<critical_rules>
- **先加载工作流：** 执行前先阅读 complete-milestone.md
- **验证完成状态：** 所有阶段必须有 SUMMARY.md
- **用户确认：** 在验证关卡处等待批准
- **先归档再删除：** 创建归档文件后才可更新/删除原始文件
- **单行摘要：** ROADMAP.md 中折叠的里程碑为带链接的单行
- **全新需求：** 下一个里程碑从 `/gsd:new-milestone` 开始
</critical_rules>
