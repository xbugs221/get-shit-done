---
name: gsd:map-codebase
description: 使用并行映射 agent 分析代码库，生成 .planning/codebase/ 文档
argument-hint: "[可选：要映射的特定区域，例如 'api' 或 'auth']"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Write
  - Task
---

<objective>
使用并行的 gsd-codebase-mapper agent 分析现有代码库，生成结构化文档。

每个 agent 探索一个关注领域并**直接写入** `.planning/codebase/`。编排器仅接收确认信息，保持上下文最小化。

输出：`.planning/codebase/` 文件夹，包含 7 个代码库状态文档。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/map-codebase.md
</execution_context>

<context>
关注领域：$ARGUMENTS（可选——指示 agent 关注特定子系统）

**如果存在则加载项目状态：** 检查 .planning/STATE.md，已初始化则加载上下文。

**适用时机：**

- 初始化前的棕地项目（先理解现有代码）
- 重大变更后刷新代码库映射
- 熟悉陌生的代码库
- 重大重构前理解当前状态

**可跳过：** 无代码的绿地项目、简单代码库（少于 5 个文件）
</context>

<process>
1. 检查 .planning/codebase/ 是否已存在（提供刷新或跳过选项）
2. 创建 .planning/codebase/ 目录结构
3. 生成 4 个并行 gsd-codebase-mapper agent：
   - Agent 1：技术关注 → STACK.md、INTEGRATIONS.md
   - Agent 2：架构关注 → ARCHITECTURE.md、STRUCTURE.md
   - Agent 3：质量关注 → CONVENTIONS.md、TESTING.md
   - Agent 4：关切关注 → CONCERNS.md
4. 等待完成，收集确认信息
5. 验证所有 7 个文档存在且有行数统计
6. git提交
</process>

<success_criteria>

- [ ] .planning/codebase/ 目录已创建
- [ ] 所有 7 个文档已由映射 agent 写入
- [ ] 文档遵循模板结构
- [ ] 并行 agent 无错误完成
</success_criteria>
