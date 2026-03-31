---
type: prompt
name: gsd:milestone-summary
description: 从里程碑产物生成全面的项目总结，用于团队入职和评审
argument-hint: "[version]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
---

<objective>
为团队入职和项目评审生成结构化里程碑总结。读取已完成的里程碑产物（ROADMAP、REQUIREMENTS、CONTEXT、SUMMARY、VERIFICATION），生成概览：构建了什么、如何构建以及为什么。

目的：使新成员通过一份文档理解已完成的项目。
输出：MILESTONE_SUMMARY 写入 `.planning/reports/`，内联展示，可选交互式问答。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/milestone-summary.md
</execution_context>

<context>
**项目文件：**
- `.planning/ROADMAP.md`、`PROJECT.md`、`STATE.md`、`RETROSPECTIVE.md`
- `.planning/milestones/v{version}-ROADMAP.md`（如已归档）
- `.planning/milestones/v{version}-REQUIREMENTS.md`（如已归档）
- `.planning/phases/*-*/`（SUMMARY.md、VERIFICATION.md、CONTEXT.md、RESEARCH.md）

**用户输入：** 版本：$ARGUMENTS（可选 — 默认为当前/最新里程碑）
</context>

<process>
端到端执行 @~/.claude/get-shit-done/workflows/milestone-summary.md 里程碑总结工作流。
</process>

<success_criteria>
- 里程碑版本已解析（来自参数、STATE.md 或归档扫描）
- 已读取所有可用产物
- 总结写入 `.planning/reports/MILESTONE_SUMMARY-v{version}.md`
- 7 个章节已生成（概述、架构、阶段、决策、需求、技术债务、入门指南）
- 总结已内联展示并提供交互式问答
- STATE.md 已更新
</success_criteria>
