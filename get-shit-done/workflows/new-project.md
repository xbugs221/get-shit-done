<purpose>
通过统一流程初始化新项目：提问、研究（可选）、需求、路线图。这是任何项目中最有杠杆效应的时刻——在此阶段深入提问意味着更好的计划、更好的执行、更好的成果。一个工作流带你从想法到准备规划。
</purpose>

<required_reading>
在开始之前，阅读调用提示的 execution_context 中引用的所有文件。
</required_reading>

<available_agent_types>
有效的 GSD 子代理类型（使用精确名称——不要回退到 'general-purpose'）：
- gsd-project-researcher — 研究项目级技术决策
- gsd-research-synthesizer — 综合并行研究代理的发现
- gsd-roadmapper — 创建分阶段执行路线图
</available_agent_types>

<auto_mode>

## 自动模式检测

检查 $ARGUMENTS 中是否存在 `--auto` 标志。

**如果是自动模式：**

- 跳过棕地映射提议（假设为绿地项目）
- 跳过深度提问（从提供的文档中提取上下文）
- 配置：YOLO 模式为隐含的（跳过该问题），但先询问粒度/git/代理（步骤 2a）
- 配置完成后：使用智能默认值自动运行步骤 6-9：
  - 研究：始终进行
  - 需求：包含提供文档中的所有基本功能和特性
  - 需求审批：自动批准
  - 路线图审批：自动批准

**文档要求：**
自动模式需要一个想法文档——可以是：

- 文件引用：`/gsd:new-project --auto @prd.md`
- 在提示中粘贴/撰写的文本

如果未提供文档内容，报错：

```
错误：--auto 需要一个想法文档。

用法：
  /gsd:new-project --auto @your-idea.md
  /gsd:new-project --auto [在此粘贴或撰写你的想法]

该文档应描述你想要构建的内容。
```

</auto_mode>

<process>

## 1. 设置

**必须的第一步——在任何用户交互之前执行这些检查：**

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init new-project)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
AGENT_SKILLS_RESEARCHER=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-project-researcher 2>/dev/null)
AGENT_SKILLS_SYNTHESIZER=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-synthesizer 2>/dev/null)
AGENT_SKILLS_ROADMAPPER=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-roadmapper 2>/dev/null)
```

从 JSON 中解析以下字段：`researcher_model`、`synthesizer_model`、`roadmapper_model`、`commit_docs`、`project_exists`、`has_codebase_map`、`planning_exists`、`has_existing_code`、`has_package_file`、`is_brownfield`、`needs_codebase_map`、`has_git`、`project_path`。

**如果 `project_exists` 为 true：**报错——项目已初始化。请使用 `/gsd:progress`。

**如果 `has_git` 为 false：**初始化 git：

```bash
git init
```

## 2. 棕地提议

**如果是自动模式：**跳至步骤 4（假设为绿地项目，从提供的文档中合成 PROJECT.md）。

**如果 `needs_codebase_map` 为 true**（来自 init——检测到现有代码但没有代码库映射）：

使用 AskUserQuestion：

- header："代码库"
- question："我检测到此目录中有现有代码。你想先映射代码库吗？"
- options：
  - "先映射代码库" — 运行 /gsd:map-codebase 了解现有架构（推荐）
  - "跳过映射" — 继续项目初始化

**如果选择"先映射代码库"：**

```
先运行 `/gsd:map-codebase`，然后返回 `/gsd:new-project`
```

退出命令。

**如果选择"跳过映射"或 `needs_codebase_map` 为 false：**继续步骤 3。

## 2a. 自动模式配置（仅自动模式）

**如果是自动模式：**在处理想法文档之前预先收集配置设置。

YOLO 模式是隐含的（auto = YOLO）。询问剩余的配置问题：

**第 1 轮——核心设置（3 个问题，无模式问题）：**

```
AskUserQuestion([
  {
    header: "粒度",
    question: "范围应该切分到多细的阶段？",
    multiSelect: false,
    options: [
      { label: "粗粒度（推荐）", description: "更少、更宽泛的阶段（3-5 个阶段，每个 1-3 个计划）" },
      { label: "标准", description: "均衡的阶段大小（5-8 个阶段，每个 3-5 个计划）" },
      { label: "细粒度", description: "更多聚焦的阶段（8-12 个阶段，每个 5-10 个计划）" }
    ]
  },
  {
    header: "执行方式",
    question: "并行运行计划？",
    multiSelect: false,
    options: [
      { label: "并行（推荐）", description: "独立的计划同时运行" },
      { label: "顺序", description: "一次运行一个计划" }
    ]
  },
  {
    header: "Git 跟踪",
    question: "将规划文档提交到 git？",
    multiSelect: false,
    options: [
      { label: "是（推荐）", description: "规划文档纳入版本控制" },
      { label: "否", description: "保持 .planning/ 仅在本地（添加到 .gitignore）" }
    ]
  }
])
```

**第 2 轮——工作流代理（与步骤 5 相同）：**

```
AskUserQuestion([
  {
    header: "研究",
    question: "在规划每个阶段前进行研究？（增加 token/时间）",
    multiSelect: false,
    options: [
      { label: "是（推荐）", description: "调研领域、发现模式、发掘潜在问题" },
      { label: "否", description: "直接从需求进行规划" }
    ]
  },
  {
    header: "计划检查",
    question: "验证计划能否达成目标？（增加 token/时间）",
    multiSelect: false,
    options: [
      { label: "是（推荐）", description: "在执行开始前发现差距" },
      { label: "否", description: "不验证直接执行计划" }
    ]
  },
  {
    header: "验证器",
    question: "每个阶段后验证工作是否满足需求？（增加 token/时间）",
    multiSelect: false,
    options: [
      { label: "是（推荐）", description: "确认交付物与阶段目标匹配" },
      { label: "否", description: "信任执行，跳过验证" }
    ]
  },
  {
    header: "AI 模型",
    question: "规划代理使用哪些 AI 模型？",
    multiSelect: false,
    options: [
      { label: "均衡（推荐）", description: "大部分代理使用 Sonnet——质量/成本比佳" },
      { label: "高质量", description: "研究/路线图使用 Opus——更高成本，更深分析" },
      { label: "经济", description: "尽可能使用 Haiku——最快，成本最低" },
      { label: "继承", description: "所有代理使用当前会话模型（OpenCode /model）" }
    ]
  }
])
```

创建 `.planning/config.json` 包含所有设置（CLI 自动填充剩余默认值）：

```bash
mkdir -p .planning
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-new-project '{"mode":"yolo","granularity":"[selected]","parallelization":true|false,"commit_docs":true|false,"model_profile":"quality|balanced|budget|inherit","workflow":{"research":true|false,"plan_check":true|false,"verifier":true|false,"nyquist_validation":true|false,"auto_advance":true}}'
```

**如果 commit_docs = 否：**将 `.planning/` 添加到 `.gitignore`。

**提交 config.json：**

```bash
mkdir -p .planning
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "chore: add project config" --files .planning/config.json
```

**将自动推进链标志持久化到配置（在上下文压缩后仍然有效）：**

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-set workflow._auto_chain_active true
```

进入步骤 4（跳过步骤 3 和 5）。

## 3. 深度提问

**如果是自动模式：**跳过（已在步骤 2a 中处理）。改为从提供的文档中提取项目上下文并进入步骤 4。

**显示阶段横幅：**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 提问
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**开启对话：**

内联提问（自由形式，不使用 AskUserQuestion）：

"你想要构建什么？"

等待他们的回复。这为你提供了提出有针对性的后续问题所需的上下文。

**提问前研究模式：**检查 `.planning/config.json`（或 init 上下文中的配置）中是否启用了 `workflow.research_before_questions`。启用时，在就某个主题领域提问前：

1. 对用户描述的内容进行简短的网络搜索以了解最佳实践
2. 在提问时自然地提及关键发现（例如，"大多数类似项目使用 X——你也是这么想的，还是有不同的考虑？"）
3. 这使问题更有见地，但不改变对话流程

禁用时（默认），像之前一样直接提问。

**跟随话题线索：**

根据他们的回答，提出深入挖掘其回答的后续问题。使用 AskUserQuestion 提供探究他们提到内容的选项——解释、澄清、具体示例。

持续跟进话题。每个答案都会打开新的话题线索。询问关于：

- 什么让他们兴奋
- 什么问题触发了这个想法
- 模糊术语的具体含义
- 实际看起来是什么样的
- 什么已经确定了

参考 `questioning.md` 中的技巧：

- 挑战模糊性
- 将抽象变具体
- 发现隐含假设
- 找到边界情况
- 揭示动机

**检查上下文（在脑中进行，不要说出来）：**

在提问过程中，默默检查 `questioning.md` 中的上下文清单。如果还有遗漏，自然地穿插问题。不要突然切换到清单模式。

**决策关口：**

当你能写出清晰的 PROJECT.md 时，使用 AskUserQuestion：

- header："准备好了？"
- question："我觉得我理解你想要的了。准备好创建 PROJECT.md 了吗？"
- options：
  - "创建 PROJECT.md" — 让我们继续
  - "继续探讨" — 我想分享更多 / 多问我一些

如果选择"继续探讨"——询问他们想补充什么，或找到遗漏并自然地探究。

循环直到选择"创建 PROJECT.md"。

## 4. 编写 PROJECT.md

**如果是自动模式：**从提供的文档中合成。没有显示"准备好了？"关口——直接进行提交。

将所有上下文综合到 `.planning/PROJECT.md`，使用 `templates/project.md` 中的模板。

**对于绿地项目：**

将需求初始化为假设：

```markdown
## 需求

### 已验证

（暂无——发布后验证）

### 活跃

- [ ] [需求 1]
- [ ] [需求 2]
- [ ] [需求 3]

### 超出范围

- [排除项 1] — [原因]
- [排除项 2] — [原因]
```

所有活跃需求在发布并验证之前都是假设。

**对于棕地项目（代码库映射存在）：**

从现有代码推断已验证的需求：

1. 读取 `.planning/codebase/ARCHITECTURE.md` 和 `STACK.md`
2. 识别代码库已有的功能
3. 这些成为初始已验证集合

```markdown
## 需求

### 已验证

- ✓ [现有功能 1] — 已存在
- ✓ [现有功能 2] — 已存在
- ✓ [现有功能 3] — 已存在

### 活跃

- [ ] [新需求 1]
- [ ] [新需求 2]

### 超出范围

- [排除项 1] — [原因]
```

**关键决策：**

用提问阶段做出的决策进行初始化：

```markdown
## 关键决策

| 决策 | 理由 | 结果 |
|------|------|------|
| [提问中的选择] | [原因] | — 待定 |
```

**最后更新页脚：**

```markdown
---
*最后更新：[日期] 初始化后*
```

**演进部分**（包含在 PROJECT.md 末尾、页脚之前）：

```markdown
## 演进

本文档在阶段转换和里程碑边界时更新。

**每次阶段转换后**（通过 `/gsd:transition`）：
1. 需求失效？→ 移至超出范围并注明原因
2. 需求验证通过？→ 移至已验证并注明阶段引用
3. 出现新需求？→ 添加到活跃
4. 有决策要记录？→ 添加到关键决策
5. "这是什么"仍然准确吗？→ 如有偏差则更新

**每个里程碑后**（通过 `/gsd:complete-milestone`）：
1. 全面审查所有部分
2. 核心价值检查——仍然是正确的优先级吗？
3. 审计超出范围——原因仍然有效吗？
4. 用当前状态更新上下文
```

不要压缩。捕获所有收集到的信息。

**提交 PROJECT.md：**

```bash
mkdir -p .planning
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs: initialize project" --files .planning/PROJECT.md
```

## 5. 工作流偏好

**如果是自动模式：**跳过——配置已在步骤 2a 中收集。进入步骤 5.5。

**检查全局默认值**，位于 `~/.gsd/defaults.json`。如果文件存在，提供使用已保存默认值的选项：

```
AskUserQuestion([
  {
    question: "使用你保存的默认设置？（来自 ~/.gsd/defaults.json）",
    header: "默认值",
    multiSelect: false,
    options: [
      { label: "是（推荐）", description: "使用保存的默认值，跳过设置问题" },
      { label: "否", description: "手动配置设置" }
    ]
  }
])
```

如果选择"是"：读取 `~/.gsd/defaults.json`，使用这些值创建 config.json，直接跳至下方**提交 config.json**。

如果选择"否"或 `~/.gsd/defaults.json` 不存在：继续下面的问题。

**第 1 轮——核心工作流设置（4 个问题）：**

```
questions: [
  {
    header: "模式",
    question: "你想要怎样的工作方式？",
    multiSelect: false,
    options: [
      { label: "YOLO（推荐）", description: "自动批准，直接执行" },
      { label: "交互式", description: "每步确认" }
    ]
  },
  {
    header: "粒度",
    question: "范围应该切分到多细的阶段？",
    multiSelect: false,
    options: [
      { label: "粗粒度", description: "更少、更宽泛的阶段（3-5 个阶段，每个 1-3 个计划）" },
      { label: "标准", description: "均衡的阶段大小（5-8 个阶段，每个 3-5 个计划）" },
      { label: "细粒度", description: "更多聚焦的阶段（8-12 个阶段，每个 5-10 个计划）" }
    ]
  },
  {
    header: "执行方式",
    question: "并行运行计划？",
    multiSelect: false,
    options: [
      { label: "并行（推荐）", description: "独立的计划同时运行" },
      { label: "顺序", description: "一次运行一个计划" }
    ]
  },
  {
    header: "Git 跟踪",
    question: "将规划文档提交到 git？",
    multiSelect: false,
    options: [
      { label: "是（推荐）", description: "规划文档纳入版本控制" },
      { label: "否", description: "保持 .planning/ 仅在本地（添加到 .gitignore）" }
    ]
  }
]
```

**第 2 轮——工作流代理：**

这些会在规划/执行期间生成额外的代理。它们增加 token 和时间消耗，但提升质量。

| 代理 | 运行时机 | 功能 |
|------|----------|------|
| **研究员** | 规划每个阶段前 | 调研领域、发现模式、发掘潜在问题 |
| **计划检查器** | 计划创建后 | 验证计划是否确实能达成阶段目标 |
| **验证器** | 阶段执行后 | 确认必要交付物已完成 |

对重要项目推荐全部启用。快速实验可以跳过。

```
questions: [
  {
    header: "研究",
    question: "在规划每个阶段前进行研究？（增加 token/时间）",
    multiSelect: false,
    options: [
      { label: "是（推荐）", description: "调研领域、发现模式、发掘潜在问题" },
      { label: "否", description: "直接从需求进行规划" }
    ]
  },
  {
    header: "计划检查",
    question: "验证计划能否达成目标？（增加 token/时间）",
    multiSelect: false,
    options: [
      { label: "是（推荐）", description: "在执行开始前发现差距" },
      { label: "否", description: "不验证直接执行计划" }
    ]
  },
  {
    header: "验证器",
    question: "每个阶段后验证工作是否满足需求？（增加 token/时间）",
    multiSelect: false,
    options: [
      { label: "是（推荐）", description: "确认交付物与阶段目标匹配" },
      { label: "否", description: "信任执行，跳过验证" }
    ]
  },
  {
    header: "AI 模型",
    question: "规划代理使用哪些 AI 模型？",
    multiSelect: false,
    options: [
      { label: "均衡（推荐）", description: "大部分代理使用 Sonnet——质量/成本比佳" },
      { label: "高质量", description: "研究/路线图使用 Opus——更高成本，更深分析" },
      { label: "经济", description: "尽可能使用 Haiku——最快，成本最低" },
      { label: "继承", description: "所有代理使用当前会话模型（OpenCode /model）" }
    ]
  }
]
```

创建 `.planning/config.json` 包含所有设置（CLI 自动填充剩余默认值）：

```bash
mkdir -p .planning
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-new-project '{"mode":"[yolo|interactive]","granularity":"[selected]","parallelization":true|false,"commit_docs":true|false,"model_profile":"quality|balanced|budget|inherit","workflow":{"research":true|false,"plan_check":true|false,"verifier":true|false,"nyquist_validation":[false if granularity=coarse, true otherwise]}}'
```

**注意：**随时运行 `/gsd:settings` 来更新模型配置、工作流代理、分支策略和其他偏好。

**如果 commit_docs = 否：**

- 在 config.json 中设置 `commit_docs: false`
- 将 `.planning/` 添加到 `.gitignore`（如果不存在则创建）

**如果 commit_docs = 是：**

- 无需额外的 gitignore 条目

**提交 config.json：**

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "chore: add project config" --files .planning/config.json
```

## 5.1. 子仓库检测

**检测多仓库工作区：**

检查是否有包含独立 `.git` 文件夹的目录（工作区内的独立仓库）：

```bash
find . -maxdepth 1 -type d -not -name ".*" -not -name "node_modules" -exec test -d "{}/.git" \; -print
```

**如果发现子仓库：**

去掉 `./` 前缀获取目录名（如 `./backend` → `backend`）。

使用 AskUserQuestion：

- header："多仓库工作区"
- question："我检测到此工作区中有独立的 git 仓库。哪些目录包含 GSD 应该提交的代码？"
- multiSelect: true
- options：每个检测到的目录一个选项
  - "[目录名]" — 独立 git 仓库

**如果用户选择了一个或多个目录：**

- 在 config.json 中将 `planning.sub_repos` 设置为选定的目录名数组（如 `["backend", "frontend"]`）
- 自动将 `planning.commit_docs` 设为 `false`（多仓库工作区中规划文档保留在本地）
- 如果尚未添加，将 `.planning/` 添加到 `.gitignore`

配置更改保存在本地——由于多仓库模式下 `commit_docs` 为 `false`，无需提交。

**如果未发现子仓库或用户未选择：**继续，不更改配置。

## 5.5. 解析模型配置

使用 init 中的模型：`researcher_model`、`synthesizer_model`、`roadmapper_model`。

## 6. 研究决策

**如果是自动模式：**默认选择"先研究"，不询问。

使用 AskUserQuestion：

- header："研究"
- question："在定义需求之前研究领域生态系统？"
- options：
  - "先研究（推荐）" — 发现标准技术栈、预期功能、架构模式
  - "跳过研究" — 我对这个领域很熟悉，直接进入需求

**如果选择"先研究"：**

显示阶段横幅：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 研究中
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

正在研究 [领域] 生态系统...
```

创建研究目录：

```bash
mkdir -p .planning/research
```

**确定里程碑上下文：**

检查这是绿地项目还是后续里程碑：

- 如果 PROJECT.md 中没有"已验证"需求 → 绿地项目（从零开始构建）
- 如果存在"已验证"需求 → 后续里程碑（在现有应用上添加功能）

显示启动指示器：

```
◆ 正在并行启动 4 个研究员...
  → 技术栈研究
  → 功能研究
  → 架构研究
  → 常见陷阱研究
```

使用路径引用并行启动 4 个 gsd-project-researcher 代理：

```
Task(prompt="<research_type>
项目研究 — [领域]的技术栈维度。
</research_type>

<milestone_context>
[绿地 或 后续]

绿地：研究从零构建 [领域] 的标准技术栈。
后续：研究为现有 [领域] 应用添加 [目标功能] 所需的内容。不要重新研究现有系统。
</milestone_context>

<question>
[领域]的 2025 标准技术栈是什么？
</question>

<files_to_read>
- {project_path}（项目上下文和目标）
</files_to_read>

${AGENT_SKILLS_RESEARCHER}

<downstream_consumer>
你的 STACK.md 将输入到路线图创建中。请给出明确建议：
- 具体的库及版本
- 每个选择的清晰理由
- 不应使用什么及原因
</downstream_consumer>

<quality_gate>
- [ ] 版本是最新的（通过 Context7/官方文档验证，而非训练数据）
- [ ] 理由解释了"为什么"，而非仅仅是"是什么"
- [ ] 每个建议都分配了置信度
</quality_gate>

<output>
写入：.planning/research/STACK.md
使用模板：~/.claude/get-shit-done/templates/research-project/STACK.md
</output>
", subagent_type="gsd-project-researcher", model="{researcher_model}", description="技术栈研究")

Task(prompt="<research_type>
项目研究 — [领域]的功能维度。
</research_type>

<milestone_context>
[绿地 或 后续]

绿地：[领域]产品有哪些功能？什么是基本功能，什么是差异化功能？
后续：[目标功能]通常是如何工作的？预期行为是什么？
</milestone_context>

<question>
[领域]产品有哪些功能？什么是基本功能，什么是差异化功能？
</question>

<files_to_read>
- {project_path}（项目上下文）
</files_to_read>

${AGENT_SKILLS_RESEARCHER}

<downstream_consumer>
你的 FEATURES.md 将输入到需求定义中。请清晰分类：
- 基本功能（必须有否则用户会离开）
- 差异化功能（竞争优势）
- 反功能（刻意不构建的东西）
</downstream_consumer>

<quality_gate>
- [ ] 分类清晰（基本功能 vs 差异化功能 vs 反功能）
- [ ] 标注了每个功能的复杂度
- [ ] 识别了功能间的依赖关系
</quality_gate>

<output>
写入：.planning/research/FEATURES.md
使用模板：~/.claude/get-shit-done/templates/research-project/FEATURES.md
</output>
", subagent_type="gsd-project-researcher", model="{researcher_model}", description="功能研究")

Task(prompt="<research_type>
项目研究 — [领域]的架构维度。
</research_type>

<milestone_context>
[绿地 或 后续]

绿地：[领域]系统通常是如何构建的？主要组件有哪些？
后续：[目标功能]如何与现有 [领域] 架构集成？
</milestone_context>

<question>
[领域]系统通常是如何构建的？主要组件有哪些？
</question>

<files_to_read>
- {project_path}（项目上下文）
</files_to_read>

${AGENT_SKILLS_RESEARCHER}

<downstream_consumer>
你的 ARCHITECTURE.md 为路线图中的阶段结构提供参考。请包含：
- 组件边界（什么与什么通信）
- 数据流（信息如何流动）
- 建议的构建顺序（组件间的依赖关系）
</downstream_consumer>

<quality_gate>
- [ ] 组件边界定义清晰
- [ ] 数据流方向明确
- [ ] 标注了构建顺序的影响
</quality_gate>

<output>
写入：.planning/research/ARCHITECTURE.md
使用模板：~/.claude/get-shit-done/templates/research-project/ARCHITECTURE.md
</output>
", subagent_type="gsd-project-researcher", model="{researcher_model}", description="架构研究")

Task(prompt="<research_type>
项目研究 — [领域]的常见陷阱维度。
</research_type>

<milestone_context>
[绿地 或 后续]

绿地：[领域]项目常犯哪些错误？关键性失误有哪些？
后续：为 [领域] 添加 [目标功能] 时常见的错误有哪些？
</milestone_context>

<question>
[领域]项目常犯哪些错误？关键性失误有哪些？
</question>

<files_to_read>
- {project_path}（项目上下文）
</files_to_read>

${AGENT_SKILLS_RESEARCHER}

<downstream_consumer>
你的 PITFALLS.md 防止路线图/规划中的错误。对每个陷阱需要：
- 预警信号（如何早期发现）
- 预防策略（如何避免）
- 应该由哪个阶段来解决
</downstream_consumer>

<quality_gate>
- [ ] 陷阱是特定于此领域的（非通用建议）
- [ ] 预防策略可操作
- [ ] 在相关处包含了阶段映射
</quality_gate>

<output>
写入：.planning/research/PITFALLS.md
使用模板：~/.claude/get-shit-done/templates/research-project/PITFALLS.md
</output>
", subagent_type="gsd-project-researcher", model="{researcher_model}", description="常见陷阱研究")
```

所有 4 个代理完成后，启动合成器创建 SUMMARY.md：

```
Task(prompt="
<task>
将研究输出综合到 SUMMARY.md 中。
</task>

<files_to_read>
- .planning/research/STACK.md
- .planning/research/FEATURES.md
- .planning/research/ARCHITECTURE.md
- .planning/research/PITFALLS.md
</files_to_read>

${AGENT_SKILLS_SYNTHESIZER}

<output>
写入：.planning/research/SUMMARY.md
使用模板：~/.claude/get-shit-done/templates/research-project/SUMMARY.md
写入后提交。
</output>
", subagent_type="gsd-research-synthesizer", model="{synthesizer_model}", description="综合研究")
```

显示研究完成横幅和关键发现：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 研究完成 ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 关键发现

**技术栈：**[来自 SUMMARY.md]
**基本功能：**[来自 SUMMARY.md]
**注意事项：**[来自 SUMMARY.md]

文件：`.planning/research/`
```

**如果选择"跳过研究"：**继续步骤 7。

## 7. 定义需求

显示阶段横幅：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 定义需求
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**加载上下文：**

读取 PROJECT.md 并提取：

- 核心价值（必须工作的那一件事）
- 声明的约束（预算、时间线、技术限制）
- 任何明确的范围边界

**如果研究存在：**读取 research/FEATURES.md 并提取功能分类。

**如果是自动模式：**

- 自动包含所有基本功能（用户预期这些功能）
- 包含提供文档中明确提到的功能
- 自动推迟文档中未提及的差异化功能
- 跳过按分类的 AskUserQuestion 循环
- 跳过"还有补充吗？"问题
- 跳过需求审批关口
- 直接生成 REQUIREMENTS.md 并提交

**按分类呈现功能（仅交互模式）：**

```
以下是 [领域] 的功能：

## 认证
**基本功能：**
- 邮箱/密码注册
- 邮箱验证
- 密码重置
- 会话管理

**差异化功能：**
- 魔术链接登录
- OAuth（Google、GitHub）
- 双因素认证

**研究笔记：**[任何相关笔记]

---

## [下一个分类]
...
```

**如果没有研究：**改为通过对话收集需求。

询问："用户需要能做的主要事情是什么？"

对每个提到的功能：

- 提出澄清问题使其具体化
- 探究相关功能
- 分组到各分类

**确定每个分类的范围：**

对每个分类，使用 AskUserQuestion：

- header："[分类]"（最多 12 个字符）
- question："哪些 [分类] 功能属于 v1？"
- multiSelect: true
- options：
  - "[功能 1]" — [简要描述]
  - "[功能 2]" — [简要描述]
  - "[功能 3]" — [简要描述]
  - "v1 不包含" — 推迟整个分类

跟踪响应：

- 选中的功能 → v1 需求
- 未选中的基本功能 → v2（用户预期这些功能）
- 未选中的差异化功能 → 超出范围

**识别遗漏：**

使用 AskUserQuestion：

- header："补充"
- question："有研究遗漏的需求吗？（你的特有功能）"
- options：
  - "没有，研究已覆盖" — 继续
  - "有，让我补充一些" — 记录补充内容

**验证核心价值：**

将需求与 PROJECT.md 中的核心价值进行交叉检查。如果发现差距，提出来。

**生成 REQUIREMENTS.md：**

创建 `.planning/REQUIREMENTS.md`，包含：

- v1 需求按分类分组（复选框、REQ-ID）
- v2 需求（推迟的）
- 超出范围（明确排除并说明理由）
- 可追溯性部分（空的，由路线图填充）

**REQ-ID 格式：**`[分类]-[编号]`（AUTH-01、CONTENT-02）

**需求质量标准：**

好的需求应当是：

- **具体且可测试的：**"用户可以通过邮件链接重置密码"（而非"处理密码重置"）
- **以用户为中心的：**"用户可以 X"（而非"系统做 Y"）
- **原子的：**每个需求一个功能（而非"用户可以登录并管理个人资料"）
- **独立的：**与其他需求的依赖最小化

拒绝模糊的需求。追求具体性：

- "处理认证" → "用户可以使用邮箱/密码登录并保持跨会话登录状态"
- "支持分享" → "用户可以通过链接分享帖子，链接在接收者的浏览器中打开"

**展示完整需求列表（仅交互模式）：**

显示每个需求（而非数量统计）供用户确认：

```
## v1 需求

### 认证
- [ ] **AUTH-01**：用户可以使用邮箱/密码创建账户
- [ ] **AUTH-02**：用户可以登录并保持跨会话登录状态
- [ ] **AUTH-03**：用户可以从任何页面登出

### 内容
- [ ] **CONT-01**：用户可以创建文本帖子
- [ ] **CONT-02**：用户可以编辑自己的帖子

[... 完整列表 ...]

---

这是否涵盖了你要构建的内容？（是 / 调整）
```

如果选择"调整"：返回范围确定。

**提交需求：**

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs: define v1 requirements" --files .planning/REQUIREMENTS.md
```

## 8. 创建路线图

显示阶段横幅：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 创建路线图
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ 正在启动路线图规划器...
```

使用路径引用启动 gsd-roadmapper 代理：

```
Task(prompt="
<planning_context>

<files_to_read>
- .planning/PROJECT.md（项目上下文）
- .planning/REQUIREMENTS.md（v1 需求）
- .planning/research/SUMMARY.md（研究发现 - 如果存在）
- .planning/config.json（粒度和模式设置）
</files_to_read>

${AGENT_SKILLS_ROADMAPPER}

</planning_context>

<instructions>
创建路线图：
1. 从需求推导阶段（不要强加结构）
2. 将每个 v1 需求映射到恰好一个阶段
3. 为每个阶段推导 2-5 个成功标准（可观察的用户行为）
4. 验证 100% 覆盖率
5. 立即写入文件（ROADMAP.md、STATE.md、更新 REQUIREMENTS.md 可追溯性）
6. 返回 ROADMAP CREATED 及摘要

先写入文件，然后返回。这确保即使上下文丢失，产物也能持久化。
</instructions>
", subagent_type="gsd-roadmapper", model="{roadmapper_model}", description="创建路线图")
```

**处理路线图规划器返回：**

**如果返回 `## ROADMAP BLOCKED`：**

- 展示阻塞信息
- 与用户合作解决
- 解决后重新启动

**如果返回 `## ROADMAP CREATED`：**

读取创建的 ROADMAP.md 并内联精美展示：

```
---

## 提议的路线图

**[N] 个阶段** | **[X] 个需求已映射** | 所有 v1 需求已覆盖 ✓

| # | 阶段 | 目标 | 需求 | 成功标准 |
|---|------|------|------|----------|
| 1 | [名称] | [目标] | [REQ-ID] | [数量] |
| 2 | [名称] | [目标] | [REQ-ID] | [数量] |
| 3 | [名称] | [目标] | [REQ-ID] | [数量] |
...

### 阶段详情

**阶段 1：[名称]**
目标：[目标]
需求：[REQ-ID]
成功标准：
1. [标准]
2. [标准]
3. [标准]

**阶段 2：[名称]**
目标：[目标]
需求：[REQ-ID]
成功标准：
1. [标准]
2. [标准]

[... 继续列出所有阶段 ...]

---
```

**如果是自动模式：**跳过审批关口——自动批准并直接提交。

**关键：提交前请求审批（仅交互模式）：**

使用 AskUserQuestion：

- header："路线图"
- question："这个路线图结构适合你吗？"
- options：
  - "批准" — 提交并继续
  - "调整阶段" — 告诉我要改什么
  - "查看完整文件" — 显示原始 ROADMAP.md

**如果选择"批准"：**继续提交。

**如果选择"调整阶段"：**

- 获取用户的调整意见
- 使用修订上下文重新启动路线图规划器：

  ```
  Task(prompt="
  <revision>
  用户对路线图的反馈：
  [用户的意见]

  <files_to_read>
  - .planning/ROADMAP.md（需要修订的当前路线图）
  </files_to_read>

  ${AGENT_SKILLS_ROADMAPPER}

  根据反馈更新路线图。就地编辑文件。
  返回 ROADMAP REVISED 及所做的更改。
  </revision>
  ", subagent_type="gsd-roadmapper", model="{roadmapper_model}", description="修订路线图")
  ```

- 展示修订后的路线图
- 循环直到用户批准

**如果选择"查看完整文件"：**显示 `cat .planning/ROADMAP.md` 的原始内容，然后重新询问。

**在最终提交前生成或刷新项目 CLAUDE.md：**

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" generate-claude-md
```

这确保新项目在 `CLAUDE.md` 中获得默认的 GSD 工作流执行指导和当前项目上下文。

**提交路线图（审批后或自动模式）：**

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs: create roadmap ([N] phases)" --files .planning/ROADMAP.md .planning/STATE.md .planning/REQUIREMENTS.md CLAUDE.md
```

## 9. 完成

展示完成摘要：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 项目已初始化 ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**[项目名称]**

| 产物           | 位置                        |
|----------------|-----------------------------|
| 项目           | `.planning/PROJECT.md`      |
| 配置           | `.planning/config.json`     |
| 研究           | `.planning/research/`       |
| 需求           | `.planning/REQUIREMENTS.md` |
| 路线图         | `.planning/ROADMAP.md`      |
| 项目指南       | `CLAUDE.md`                 |

**[N] 个阶段** | **[X] 个需求** | 准备开始构建 ✓
```

**如果是自动模式：**

```
╔══════════════════════════════════════════╗
║  自动推进 → 讨论阶段 1                    ║
╚══════════════════════════════════════════╝
```

退出技能并调用 SlashCommand("/gsd:discuss-phase 1 --auto")

**如果是交互模式：**

检查阶段 1 是否有 UI 指示（在 ROADMAP.md 的阶段 1 详细部分查找 `**UI hint**: yes`）：

```bash
PHASE1_SECTION=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" roadmap get-phase 1 2>/dev/null)
PHASE1_HAS_UI=$(echo "$PHASE1_SECTION" | grep -qi "UI hint.*yes" && echo "true" || echo "false")
```

**如果阶段 1 有 UI（`PHASE1_HAS_UI` 为 `true`）：**

```
───────────────────────────────────────────────────────────────

## ▶ 下一步

**阶段 1：[阶段名称]** — [来自 ROADMAP.md 的目标]

/gsd:discuss-phase 1 — 收集上下文并明确方法

<sub>/clear 先清理 → 全新上下文窗口</sub>

---

**其他可选操作：**
- /gsd:ui-phase 1 — 生成 UI 设计契约（推荐用于前端阶段）
- /gsd:plan-phase 1 — 跳过讨论，直接规划

───────────────────────────────────────────────────────────────
```

**如果阶段 1 没有 UI：**

```
───────────────────────────────────────────────────────────────

## ▶ 下一步

**阶段 1：[阶段名称]** — [来自 ROADMAP.md 的目标]

/gsd:discuss-phase 1 — 收集上下文并明确方法

<sub>/clear 先清理 → 全新上下文窗口</sub>

---

**其他可选操作：**
- /gsd:plan-phase 1 — 跳过讨论，直接规划

───────────────────────────────────────────────────────────────
```

</process>

<output>

- `.planning/PROJECT.md`
- `.planning/config.json`
- `.planning/research/`（如果选择了研究）
  - `STACK.md`
  - `FEATURES.md`
  - `ARCHITECTURE.md`
  - `PITFALLS.md`
  - `SUMMARY.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `CLAUDE.md`

</output>

<success_criteria>

- [ ] 创建了 .planning/ 目录
- [ ] 初始化了 Git 仓库
- [ ] 完成了棕地检测
- [ ] 完成了深度提问（跟随话题线索，不匆忙跳过）
- [ ] PROJECT.md 捕获了完整上下文 → **已提交**
- [ ] config.json 包含工作流模式、粒度、并行化设置 → **已提交**
- [ ] 完成了研究（如果选择）——启动了 4 个并行代理 → **已提交**
- [ ] 收集了需求（来自研究或对话）
- [ ] 用户为每个分类确定了范围（v1/v2/超出范围）
- [ ] 创建了带 REQ-ID 的 REQUIREMENTS.md → **已提交**
- [ ] 启动了 gsd-roadmapper 并提供了上下文
- [ ] 路线图文件立即写入（不是草稿）
- [ ] 纳入了用户反馈（如果有）
- [ ] 创建了包含阶段、需求映射、成功标准的 ROADMAP.md
- [ ] 初始化了 STATE.md
- [ ] 更新了 REQUIREMENTS.md 可追溯性
- [ ] 生成了包含 GSD 工作流指导的 CLAUDE.md
- [ ] 用户知道下一步是 `/gsd:discuss-phase 1`

**原子提交：**每个阶段立即提交其产物。如果上下文丢失，产物仍然持久化。

</success_criteria>
</output>
