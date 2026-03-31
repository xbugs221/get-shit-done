---
type: prompt
name: gsd:forensics
description: 针对失败的 GSD 工作流进行事后调查 — 分析 git 历史、产物和状态以诊断问题原因
argument-hint: "[问题描述]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
---

<objective>
调查 GSD 工作流执行期间出了什么问题。分析 git 历史、`.planning/` 产物和文件系统状态以检测异常并生成结构化诊断报告。

输出：取证报告保存到 `.planning/forensics/`，内联展示，可选创建 issue。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/forensics.md
</execution_context>

<context>
**数据来源：**
- `git log`（提交、模式、时间间隔）
- `git status` / `git diff`（未提交的工作、冲突）
- `.planning/STATE.md`（当前位置、会话历史）
- `.planning/ROADMAP.md`（阶段范围和进度）
- `.planning/phases/*/`（PLAN.md、SUMMARY.md、VERIFICATION.md、CONTEXT.md）
- `.planning/reports/SESSION_REPORT.md`（上次会话结果）

**用户输入：** $ARGUMENTS（可选 — 如未提供将询问）
</context>

<process>
读取并端到端执行 @~/.claude/get-shit-done/workflows/forensics.md 中的取证工作流。
</process>

<success_criteria>
- 从所有可用数据来源收集了证据
- 至少检查了 4 种异常类型（卡死循环、缺失产物、遗弃的工作、崩溃/中断）
- 结构化取证报告已写入 `.planning/forensics/report-{timestamp}.md`
- 报告已内联展示，包含发现、异常和建议
- 提供了交互式调查选项和创建 GitHub issue 的选项
</success_criteria>

<critical_rules>
- **只读调查：** 不修改项目源文件，仅写入取证报告和更新 STATE.md
- **脱敏处理：** 从报告中删除绝对路径、API 密钥、令牌
- **发现基于证据：** 每个异常必须引用具体的提交、文件或状态数据
- **无证据不推测：** 数据不足时如实说明，不捏造根因
</critical_rules>
</output>
