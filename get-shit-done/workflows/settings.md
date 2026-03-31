<purpose>
通过多问题提示交互式配置 GSD 工作流 agent（调研、计划检查、验证器）和模型配置文件选择。将用户偏好更新到 .planning/config.json。可选地将设置保存为全局默认值（~/.gsd/defaults.json）供未来项目使用。
</purpose>

<required_reading>
在开始之前，阅读调用提示的 execution_context 中引用的所有文件。
</required_reading>

<process>

<step name="ensure_and_load_config">
确保配置存在并加载当前状态：

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-ensure-section
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" state load)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

如果缺失则创建包含默认值的 `.planning/config.json` 并加载当前配置值。
</step>

<step name="read_current">
```bash
cat .planning/config.json
```

解析当前值（如不存在则默认为 `true`）：
- `workflow.research` — 在 plan-phase 期间生成调研员
- `workflow.plan_check` — 在 plan-phase 期间生成计划检查器
- `workflow.verifier` — 在 execute-phase 期间生成验证器
- `workflow.nyquist_validation` — 在 plan-phase 期间调研验证架构（默认：如果缺失则为 true）
- `workflow.ui_phase` — 为前端阶段生成 UI-SPEC.md 设计规范（默认：如果缺失则为 true）
- `workflow.ui_safety_gate` — 在规划前端阶段前提示运行 /gsd:ui-phase（默认：如果缺失则为 true）
- `model_profile` — 每个 agent 使用的模型（默认：`balanced`）
- `git.branching_strategy` — 分支策略（默认：`"none"`）
</step>

<step name="present_settings">
使用 AskUserQuestion 并预选当前值：

```
AskUserQuestion([
  {
    question: "agent 使用哪个模型配置？",
    header: "模型",
    multiSelect: false,
    options: [
      { label: "质量优先", description: "所有环节使用 Opus，验证除外（最高成本）" },
      { label: "均衡（推荐）", description: "规划使用 Opus，调研/执行/验证使用 Sonnet" },
      { label: "预算优先", description: "编写使用 Sonnet，调研/验证使用 Haiku（最低成本）" },
      { label: "继承", description: "所有 agent 使用当前会话模型（适合 OpenRouter、本地模型或运行时模型切换）" }
    ]
  },
  {
    question: "是否生成计划调研员？（在规划前调研领域）",
    header: "调研",
    multiSelect: false,
    options: [
      { label: "是", description: "在规划前调研阶段目标" },
      { label: "否", description: "跳过调研，直接规划" }
    ]
  },
  {
    question: "是否生成计划检查器？（在执行前验证计划）",
    header: "计划检查",
    multiSelect: false,
    options: [
      { label: "是", description: "验证计划是否满足阶段目标" },
      { label: "否", description: "跳过计划验证" }
    ]
  },
  {
    question: "是否生成执行验证器？（验证阶段完成情况）",
    header: "验证器",
    multiSelect: false,
    options: [
      { label: "是", description: "在执行后验证必须项" },
      { label: "否", description: "跳过执行后验证" }
    ]
  },
  {
    question: "是否自动推进流水线？（discuss → plan → execute 自动执行）",
    header: "自动",
    multiSelect: false,
    options: [
      { label: "否（推荐）", description: "在各阶段之间手动 /clear + 粘贴" },
      { label: "是", description: "通过 Task() 子 agent 链接各阶段（相同隔离）" }
    ]
  },
  {
    question: "是否启用 Nyquist 验证？（在规划期间调研测试覆盖率）",
    header: "Nyquist",
    multiSelect: false,
    options: [
      { label: "是（推荐）", description: "在 plan-phase 期间调研自动化测试覆盖率。在计划中添加验证需求。如果任务缺少自动化验证则阻止批准。" },
      { label: "否", description: "跳过验证调研。适合快速原型开发或无测试阶段。" }
    ]
  },
  // 注意：Nyquist 验证依赖于调研输出。如果调研被禁用，
  // plan-phase 会自动跳过 Nyquist 步骤（没有 RESEARCH.md 可提取）。
  {
    question: "是否启用 UI 阶段？（为前端阶段生成 UI-SPEC.md 设计规范）",
    header: "UI 阶段",
    multiSelect: false,
    options: [
      { label: "是（推荐）", description: "在规划前端阶段前生成 UI 设计规范。锁定间距、排版、颜色和文案。" },
      { label: "否", description: "跳过 UI-SPEC 生成。适合纯后端项目或 API 阶段。" }
    ]
  },
  {
    question: "是否启用 UI 安全关卡？（在规划前端阶段前提示运行 /gsd:ui-phase）",
    header: "UI 关卡",
    multiSelect: false,
    options: [
      { label: "是（推荐）", description: "当检测到前端指标时，plan-phase 会先请求运行 /gsd:ui-phase。" },
      { label: "否", description: "无提示 — plan-phase 在不检查 UI-SPEC 的情况下继续。" }
    ]
  },
  {
    question: "Git 分支策略？",
    header: "分支",
    multiSelect: false,
    options: [
      { label: "无（推荐）", description: "直接提交到当前分支" },
      { label: "按阶段", description: "为每个阶段创建分支 (gsd/phase-{N}-{name})" },
      { label: "按里程碑", description: "为整个里程碑创建分支 (gsd/{version}-{name})" }
    ]
  },
  {
    question: "是否启用上下文窗口警告？（当上下文即将用尽时注入提醒消息）",
    header: "上下文警告",
    multiSelect: false,
    options: [
      { label: "是（推荐）", description: "当上下文使用率超过 65% 时警告。帮助避免丢失工作。" },
      { label: "否", description: "禁用警告。允许 Claude 自然达到自动压缩。适合长时间无人值守的运行。" }
    ]
  },
  {
    question: "在提问前先调研最佳实践？（在 new-project 和 discuss-phase 期间进行网络搜索）",
    header: "调研问题",
    multiSelect: false,
    options: [
      { label: "否（推荐）", description: "直接提问。更快，使用更少的 token。" },
      { label: "是", description: "在每组问题前搜索网络了解最佳实践。问题更有针对性但使用更多 token。" }
    ]
  },
  {
    question: "在自主模式下跳过 discuss-phase？（使用 ROADMAP 阶段目标作为规格说明）",
    header: "跳过讨论",
    multiSelect: false,
    options: [
      { label: "否（推荐）", description: "在每个阶段前运行智能讨论 — 发现灰色地带并捕获决策。" },
      { label: "是", description: "在 /gsd:autonomous 中跳过讨论 — 直接链接到规划。最适合后端/管道工作，阶段描述即规格说明。" }
    ]
  }
])
```
</step>

<step name="update_config">
将新设置合并到现有 config.json：

```json
{
  ...existing_config,
  "model_profile": "quality" | "balanced" | "budget" | "inherit",
  "workflow": {
    "research": true/false,
    "plan_check": true/false,
    "verifier": true/false,
    "auto_advance": true/false,
    "nyquist_validation": true/false,
    "ui_phase": true/false,
    "ui_safety_gate": true/false,
    "text_mode": true/false,
    "research_before_questions": true/false,
    "discuss_mode": "discuss" | "assumptions",
    "skip_discuss": true/false
  },
  "git": {
    "branching_strategy": "none" | "phase" | "milestone",
    "quick_branch_template": <string|null>
  },
  "hooks": {
    "context_warnings": true/false,
    "workflow_guard": true/false
  }
}
```

将更新后的配置写入 `.planning/config.json`。
</step>

<step name="save_as_defaults">
询问是否将这些设置保存为未来项目的全局默认值：

```
AskUserQuestion([
  {
    question: "是否将这些设置保存为所有新项目的默认设置？",
    header: "默认值",
    multiSelect: false,
    options: [
      { label: "是", description: "新项目将使用这些设置启动（保存到 ~/.gsd/defaults.json）" },
      { label: "否", description: "仅应用于此项目" }
    ]
  }
])
```

如果选择"是"：将相同的配置对象（不含项目特定字段如 `brave_search`）写入 `~/.gsd/defaults.json`：

```bash
mkdir -p ~/.gsd
```

将以下内容写入 `~/.gsd/defaults.json`：
```json
{
  "mode": <当前值>,
  "granularity": <当前值>,
  "model_profile": <当前值>,
  "commit_docs": <当前值>,
  "parallelization": <当前值>,
  "branching_strategy": <当前值>,
  "quick_branch_template": <当前值>,
  "workflow": {
    "research": <当前值>,
    "plan_check": <当前值>,
    "verifier": <当前值>,
    "auto_advance": <当前值>,
    "nyquist_validation": <当前值>,
    "ui_phase": <当前值>,
    "ui_safety_gate": <当前值>,
    "skip_discuss": <当前值>
  }
}
```
</step>

<step name="confirm">
显示：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 设置已更新
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| 设置                 | 值    |
|----------------------|-------|
| 模型配置             | {quality/balanced/budget/inherit} |
| 计划调研员           | {开/关} |
| 计划检查器           | {开/关} |
| 执行验证器           | {开/关} |
| 自动推进             | {开/关} |
| Nyquist 验证         | {开/关} |
| UI 阶段              | {开/关} |
| UI 安全关卡          | {开/关} |
| Git 分支             | {无/按阶段/按里程碑} |
| 跳过讨论             | {开/关} |
| 上下文警告           | {开/关} |
| 保存为默认值         | {是/否} |

这些设置适用于未来的 /gsd:plan-phase 和 /gsd:execute-phase 运行。

快捷命令：
- /gsd:set-profile <profile> — 切换模型配置
- /gsd:plan-phase --research — 强制调研
- /gsd:plan-phase --skip-research — 跳过调研
- /gsd:plan-phase --skip-verify — 跳过计划检查
```
</step>

</process>

<success_criteria>
- [ ] 已读取当前配置
- [ ] 向用户展示了 10 项设置（配置文件 + 8 个工作流开关 + git 分支）
- [ ] 配置已更新 model_profile、workflow 和 git 部分
- [ ] 已提供将设置保存为全局默认值的选项（~/.gsd/defaults.json）
- [ ] 已向用户确认变更
</success_criteria>
</output>
