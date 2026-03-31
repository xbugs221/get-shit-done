---
name: gsd:manager
description: 用于在单个终端管理多个阶段的交互式命令中心
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
  - Task
---
<objective>
单终端里程碑管理命令中心。显示所有阶段的仪表盘及状态指示器，推荐最优下一步，并分派工作——讨论内联运行，规划/执行作为后台 agent 运行。

专为希望从单终端并行处理多阶段的高级用户设计。

**创建/更新：**
- 不直接创建文件——通过 Skill() 和后台 Task agent 分派到现有 GSD 命令
- 读取 `.planning/STATE.md`、`.planning/ROADMAP.md` 和阶段目录获取状态

**之后：** 用户退出管理，或所有阶段完成时建议进行里程碑生命周期操作。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/manager.md
@~/.claude/get-shit-done/references/ui-brand.md
</execution_context>

<context>
无需参数。需要包含 ROADMAP.md 和 STATE.md 的活跃里程碑。

项目上下文、阶段列表、依赖关系和建议通过 `gsd-tools.cjs init manager` 在工作流内部解析，无需预先加载。
</context>

<process>
端到端执行 @~/.claude/get-shit-done/workflows/manager.md 管理器工作流。
维持仪表盘刷新循环，直到用户退出或所有阶段完成。
</process>
