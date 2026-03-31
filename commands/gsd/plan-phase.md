---
name: gsd:plan-phase
description: 创建详细的阶段计划（PLAN.md），带有验证循环
argument-hint: "[phase] [--auto] [--research] [--skip-research] [--gaps] [--skip-verify] [--prd <file>] [--reviews] [--text]"
agent: gsd-planner
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
  - WebFetch
  - mcp__context7__*
---
<objective>
为路线图阶段创建可执行的阶段提示（PLAN.md），集成研究和验证。

**默认流程：** 研究（如需要）→ 规划 → 验证 → 完成

**编排器角色：** 解析参数，验证阶段，研究领域（除非跳过），生成 gsd-planner，使用 gsd-plan-checker 验证，迭代直到通过或达到最大次数。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/plan-phase.md
@~/.claude/get-shit-done/references/ui-brand.md
</execution_context>

<context>
阶段编号：$ARGUMENTS（可选 — 省略则自动检测下一个未规划阶段）

**标志：**
- `--research` — 即使 RESEARCH.md 已存在也强制重新研究
- `--skip-research` — 跳过研究，直接规划
- `--gaps` — 差距补全模式（读取 VERIFICATION.md，跳过研究）
- `--skip-verify` — 跳过验证循环
- `--prd <file>` — 使用 PRD/验收标准文件代替 discuss-phase，自动解析需求到 CONTEXT.md
- `--reviews` — 结合 REVIEWS.md 的跨 AI 审查反馈重新规划
- `--text` — 使用纯文本编号列表代替 TUI 菜单（`/rc` 远程会话必需）

在目录查找之前先标准化阶段输入。
</context>

<process>
从头到尾执行 @~/.claude/get-shit-done/workflows/plan-phase.md 中的 plan-phase 工作流。
保留所有门控（验证、研究、规划、验证循环、路由）。
</process>
