<purpose>
提取下游代理所需的实施决策 — 使用代码库优先的分析和假设浮现方法，而非访谈式提问。

你是思考伙伴，不是访谈者。深入分析代码库，基于证据提出你的判断，仅在真正不确定时才向用户确认。
</purpose>

<available_agent_types>
有效的 GSD 子代理类型（使用精确名称 — 不要回退到 'general-purpose'）：
- gsd-assumptions-analyzer — 分析代码库以浮现实施假设
</available_agent_types>

<downstream_awareness>
**CONTEXT.md 提供给：**

1. **gsd-phase-researcher** — 读取 CONTEXT.md 以了解要研究什么
2. **gsd-planner** — 读取 CONTEXT.md 以了解哪些决策已锁定

**你的工作：** 足够清晰地捕获决策，使下游代理无需再次询问用户即可执行。输出与 discuss 模式相同 — 相同的 CONTEXT.md 格式。
</downstream_awareness>

<philosophy>
**假设模式理念：**

用户是远见者，不是代码库考古学家。他们需要足够的上下文来评估你的假设是否符合他们的意图 — 而不是回答你通过阅读代码就能搞清楚的问题。

- 先读代码库，再形成判断，仅对真正不明确的地方提问
- 每个假设必须引用证据（文件路径、发现的模式）
- 每个假设必须说明如果判断错误的后果
- 最小化用户交互：约 2-4 次纠正 vs 约 15-20 个问题
</philosophy>

<scope_guardrail>
**关键：不得范围蔓延。**

阶段边界来自 ROADMAP.md 且是固定的。讨论澄清的是如何实施已确定范围的内容，而不是是否添加新功能。

当用户建议范围蔓延时：
"[功能 X] 将是一个新能力 — 那应该是它自己的阶段。
要我记录到路线图待办列表中吗？现在，让我们专注于 [阶段领域]。"

将想法记录在"延期想法"中。不要丢失它，也不要执行它。
</scope_guardrail>

<answer_validation>
**重要：答案验证** — 每次 AskUserQuestion 调用后，检查响应是否为空或仅包含空白。如果是：
1. 使用相同参数重试一次
2. 如果仍为空，将选项以纯文本编号列表呈现

**文本模式（配置中 `workflow.text_mode: true` 或 `--text` 标志）：**
当文本模式激活时，完全不使用 AskUserQuestion。将每个问题以纯文本编号列表呈现，并要求用户输入选择编号。
</answer_validation>

<process>

<step name="initialize" priority="first">
从参数获取阶段编号（必需）。

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init phase-op "${PHASE}")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
AGENT_SKILLS_ANALYZER=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-assumptions-analyzer 2>/dev/null)
```

解析 JSON 获取：`commit_docs`、`phase_found`、`phase_dir`、`phase_number`、`phase_name`、
`phase_slug`、`padded_phase`、`has_research`、`has_context`、`has_plans`、`has_verification`、
`plan_count`、`roadmap_exists`、`planning_exists`。

**如果 `phase_found` 为 false：**
```
阶段 [X] 未在路线图中找到。

使用 /gsd:progress 查看可用阶段。
```
退出工作流。

**如果 `phase_found` 为 true：** 继续到 check_existing。

**自动模式** — 如果 ARGUMENTS 中包含 `--auto`：
- 在 `check_existing` 中：自动选择"更新"（如果上下文存在）或无需提示继续
- 在 `present_assumptions` 中：跳过确认关卡，直接写入 CONTEXT.md
- 在 `correct_assumptions` 中：为每个纠正自动选择推荐选项
- 内联记录每个自动选择
- 完成后自动推进到 plan-phase
</step>

<step name="check_existing">
使用 init 中的 `has_context` 检查 CONTEXT.md 是否已存在。

```bash
ls ${phase_dir}/*-CONTEXT.md 2>/dev/null || true
```

**如果存在：**

**如果 `--auto`：** 自动选择"更新"。记录：`[auto] 上下文存在 — 使用基于假设的分析更新。`

**否则：** 使用 AskUserQuestion：
- header: "上下文"
- question: "阶段 [X] 已有上下文。你想做什么？"
- options:
  - "更新" — 重新分析代码库并刷新假设
  - "查看" — 给我看看现有内容
  - "跳过" — 按原样使用现有上下文

如果"更新"：加载现有内容，继续到 load_prior_context
如果"查看"：显示 CONTEXT.md，然后提供更新/跳过选项
如果"跳过"：退出工作流

**如果不存在：**

从 init 检查 `has_plans` 和 `plan_count`。**如果 `has_plans` 为 true：**

**如果 `--auto`：** 自动选择"继续并在之后重新规划"。记录：`[auto] 计划存在 — 继续假设分析，之后重新规划。`

**否则：** 使用 AskUserQuestion：
- header: "计划已存在"
- question: "阶段 [X] 已有 {plan_count} 个计划，在没有用户上下文的情况下创建的。你在这里的决策不会影响现有计划，除非你重新规划。"
- options:
  - "继续并在之后重新规划"
  - "查看现有计划"
  - "取消"

如果"继续并在之后重新规划"：继续到 load_prior_context。
如果"查看现有计划"：显示计划文件，然后提供"继续"/"取消"。
如果"取消"：退出工作流。

**如果 `has_plans` 为 false：** 继续到 load_prior_context。
</step>

<step name="load_prior_context">
读取项目级和先前阶段的上下文，以避免重新询问已决定的问题。

**步骤 1：读取项目级文件**
```bash
cat .planning/PROJECT.md 2>/dev/null || true
cat .planning/REQUIREMENTS.md 2>/dev/null || true
cat .planning/STATE.md 2>/dev/null || true
```

从中提取：
- **PROJECT.md** — 愿景、原则、不可妥协项、用户偏好
- **REQUIREMENTS.md** — 验收标准、约束
- **STATE.md** — 当前进度、任何标记

**步骤 2：读取所有先前的 CONTEXT.md 文件**
```bash
(find .planning/phases -name "*-CONTEXT.md" 2>/dev/null || true) | sort
```

对于每个阶段编号 < 当前阶段的 CONTEXT.md：
- 读取 `<decisions>` 部分 — 这些是已锁定的偏好
- 读取 `<specifics>` — 特定参考或"我想要类似 X"的时刻
- 记录模式（例如"用户一贯偏好最简化 UI"）

**步骤 3：构建内部 `<prior_decisions>` 上下文**

将提取的信息组织起来用于假设生成。

**如果不存在先前上下文：** 在没有的情况下继续 — 对于早期阶段这是预期的。
</step>

<step name="cross_reference_todos">
检查是否有待处理的待办事项与此阶段的范围相关。

```bash
TODO_MATCHES=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" todo match-phase "${PHASE_NUMBER}")
```

解析 JSON 获取：`todo_count`、`matches[]`。

**如果 `todo_count` 为 0：** 静默跳过。

**如果找到匹配项：** 展示匹配的待办事项，使用 AskUserQuestion（multiSelect）选择要纳入范围的相关项。

**对于选中（已纳入）的待办事项：** 存储为 `<folded_todos>` 用于 CONTEXT.md 的 `<decisions>` 部分。
**对于未选中的：** 存储为 `<reviewed_todos>` 用于 CONTEXT.md 的 `<deferred>` 部分。

**自动模式（`--auto`）：** 自动纳入所有得分 >= 0.4 的待办事项。记录选择。
</step>

<step name="scout_codebase">
对现有代码进行轻量扫描，为假设生成提供信息。

**步骤 1：检查现有的代码库映射**
```bash
ls .planning/codebase/*.md 2>/dev/null || true
```

**如果代码库映射存在：** 读取相关的（CONVENTIONS.md、STRUCTURE.md、STACK.md）。提取可复用组件、模式、集成点。跳到步骤 3。

**步骤 2：如果没有代码库映射，进行定向 grep**

从阶段目标中提取关键词，搜索相关文件。

```bash
grep -rl "{term1}\|{term2}" src/ app/ --include="*.ts" --include="*.tsx" 2>/dev/null | head -10
```

读取 3-5 个最相关的文件。

**步骤 3：构建内部 `<codebase_context>`**

识别可复用资产、已建立的模式、集成点和创造性选项。内部存储以供 deep_codebase_analysis 使用。
</step>

<step name="deep_codebase_analysis">
生成 `gsd-assumptions-analyzer` 代理以深度分析此阶段的代码库。这使原始文件内容远离主上下文窗口，保护 token 预算。

**解析校准层级（如果 USER-PROFILE.md 存在）：**

```bash
PROFILE_PATH="$HOME/.claude/get-shit-done/USER-PROFILE.md"
```

如果文件存在于 PROFILE_PATH：
- 优先级 1：读取 config.json > preferences.vendor_philosophy（项目级覆盖）
- 优先级 2：读取 USER-PROFILE.md 供应商选择/理念评分（全局）
- 优先级 3：默认为 "standard"

映射到校准层级：
- conservative 或 thorough-evaluator → full_maturity（更多替代方案，详细证据）
- opinionated → minimal_decisive（更少替代方案，果断推荐）
- pragmatic-fast 或任何其他值 → standard

如果没有 USER-PROFILE.md：calibration_tier = "standard"

**生成探索子代理：**

```
Task(subagent_type="gsd-assumptions-analyzer", prompt="""
分析阶段 {PHASE} 的代码库：{phase_name}。

阶段目标：{roadmap_description}
先前决策：{prior_decisions_summary}
代码库侦察提示：{codebase_context_summary}
校准：{calibration_tier}

你的工作：
1. 读取 ROADMAP.md 阶段 {PHASE} 描述
2. 读取早期阶段的任何先前 CONTEXT.md 文件
3. 使用 Glob/Grep 搜索相关文件：{phase_relevant_terms}
4. 读取 5-15 个最相关的源文件
5. 返回结构化假设

## 输出格式

返回以下精确结构：

## 假设

### [领域名称]（例如"技术方案"）
- **假设：** [决策声明]
  - **为什么这样做：** [来自代码库的证据 — 引用文件路径]
  - **如果错误：** [判断错误的具体后果]
  - **置信度：** Confident | Likely | Unclear

（3-5 个领域，按层级校准：
- full_maturity：3-5 个领域，每个 Likely/Unclear 项 2-3 个替代方案
- standard：3-4 个领域，每个 Likely/Unclear 项 2 个替代方案
- minimal_decisive：2-3 个领域，每项果断的单一推荐）

## 需要外部研究
[仅靠代码库不够的主题 — 库版本兼容性、
生态系统最佳实践等。如果代码库提供了足够证据则留空。]

${AGENT_SKILLS_ANALYZER}
""")
```

解析子代理的响应。提取：
- `assumptions[]` — 每个包含领域、声明、证据、后果、置信度
- `needs_research[]` — 需要外部研究的主题（可能为空）

**初始化规范引用累加器：**
- 来源 1：从 ROADMAP.md 复制此阶段的 `Canonical refs:`，展开为完整路径
- 来源 2：检查 REQUIREMENTS.md 和 PROJECT.md 中引用的规范/ADR
- 来源 3：添加代码库侦察结果中引用的任何文档
</step>

<step name="external_research">
**跳过条件：** deep_codebase_analysis 中的 `needs_research` 为空。

如果标记了研究主题，生成一个通用研究代理：

```
Task(subagent_type="general-purpose", prompt="""
为阶段 {PHASE} 研究以下主题：{phase_name}。

需要研究的主题：
{needs_research_content}

对于每个主题，返回：
- **发现：** [你了解到的内容]
- **来源：** [URL 或库文档引用]
- **置信度影响：** [这解决了哪个假设以及达到什么置信度]

对于库特定的问题使用 Context7（resolve-library-id 然后 query-docs）。
对于生态系统/最佳实践问题使用 WebSearch。
""")
```

将发现合并回假设：
- 在研究解决歧义的地方更新置信度
- 为受影响的假设添加来源归属
- 将研究发现存储到 DISCUSSION-LOG.md

**如果没有标记差距：** 完全跳过。大多数阶段会跳过此步骤。
</step>

<step name="present_assumptions">
按领域分组显示所有假设并带置信度标记。

**显示格式：**

```
## 阶段 {PHASE}：{phase_name} — 假设

基于代码库分析，以下是我的建议方案：

### {领域名称}
{置信度标记} **{假设声明}**
↳ 证据：{引用的文件路径}
↳ 如果错误：{后果}

### {领域名称 2}
...

[如果进行了外部研究：]
### 已应用的外部研究
- {主题}：{发现}（来源：{URL}）
```

**如果 `--auto`：**
- 如果所有假设都是 Confident 或 Likely：记录假设，跳到 write_context。
  记录：`[auto] 所有假设为 Confident/Likely — 进入上下文捕获。`
- 如果任何假设是 Unclear：记录警告，为每个 Unclear 项自动选择推荐的替代方案。
  记录：`[auto] {N} 个 Unclear 假设已使用推荐默认值自动解决。`
  进入 write_context。

**否则：** 使用 AskUserQuestion：
- header: "假设"
- question: "这些都正确吗？"
- options:
  - "是的，继续" — 使用这些假设作为决策写入 CONTEXT.md
  - "让我纠正一些" — 选择要更改的假设

**如果"是的，继续"：** 跳到 write_context。
**如果"让我纠正一些"：** 继续到 correct_assumptions。
</step>

<step name="correct_assumptions">
假设已在上方 present_assumptions 中显示。

展示一个 multiSelect，每个选项的标签是假设声明，描述是"如果错误"的后果：

使用 AskUserQuestion（multiSelect）：
- header: "纠正"
- question: "哪些假设需要纠正？"
- options：[每个假设一个选项，标签 = 假设声明，描述 = "如果错误：{后果}"]

对于每个选中的纠正，问一个聚焦的问题：

使用 AskUserQuestion：
- header: "{领域名称}"
- question: "对于 {假设声明}，我们应该怎么做？"
- options：[2-3 个描述用户可见结果的具体替代方案，推荐选项在前]

记录每个纠正：
- 原始假设
- 用户选择的替代方案
- 原因（如果通过"其他"自由文本提供）

所有纠正处理完后，使用更新的假设继续到 write_context。

**自动模式：** 不应到达此步骤（--auto 从 present_assumptions 跳过）。
</step>

<step name="write_context">
如需要创建阶段目录。使用标准 6 部分格式写入 CONTEXT.md。

**文件：** `${phase_dir}/${padded_phase}-CONTEXT.md`

将假设映射到 CONTEXT.md 各部分：
- 假设 → `<decisions>`（每个假设成为锁定决策：D-01、D-02 等）
- 纠正 → 覆盖 `<decisions>` 中的原始假设
- 所有假设为 Confident 的领域 → 标记为锁定决策
- 有纠正的领域 → 包含用户选择的替代方案作为决策
- 已纳入的待办事项 → 包含在 `<decisions>` 的"### 已纳入的待办事项"下

```markdown
# 阶段 {PHASE}：{phase_name} - 上下文

**收集时间：** {date}（假设模式）
**状态：** 准备好规划

<domain>
## 阶段边界

{来自 ROADMAP.md 的领域边界 — 明确的范围锚点声明}
</domain>

<decisions>
## 实施决策

### {领域名称 1}
- **D-01:** {决策 — 来自假设或纠正}
- **D-02:** {决策}

### {领域名称 2}
- **D-03:** {决策}

### Claude 自行决定
{用户确认"你来决定"或保持 Likely 置信度的假设}

### 已纳入的待办事项
{如果有待办事项被纳入范围}
</decisions>

<canonical_refs>
## 规范引用

**下游代理在规划或实施前必须阅读这些。**

{分析步骤中累积的规范引用 — 完整相对路径}

[如果没有外部规范："无外部规范 — 需求完全捕获在上述决策中"]
</canonical_refs>

<code_context>
## 现有代码洞察

### 可复用资产
{来自代码库侦察 + 探索子代理发现}

### 已建立的模式
{约束/赋能此阶段的模式}

### 集成点
{新代码与现有系统的连接处}
</code_context>

<specifics>
## 具体想法

{来自纠正或用户输入的任何特定参考}

[如果没有："无特定要求 — 开放接受标准方案"]
</specifics>

<deferred>
## 延期想法

{讨论中提到但超出范围的想法}

### 已审查的待办事项（未纳入）
{已审查但未纳入的待办事项 — 附原因}

[如果没有："无 — 分析保持在阶段范围内"]
</deferred>
```

写入文件。
</step>

<step name="write_discussion_log">
写入假设和纠正的审计记录。

**文件：** `${phase_dir}/${padded_phase}-DISCUSSION-LOG.md`

```markdown
# 阶段 {PHASE}：{phase_name} - 讨论日志（假设模式）

> **仅作审计记录。** 不作为规划、研究或执行代理的输入。
> 决策捕获在 CONTEXT.md 中 — 此日志保留分析过程。

**日期：** {ISO date}
**阶段：** {padded_phase}-{phase_name}
**模式：** assumptions
**分析的领域：** {逗号分隔的领域名称}

## 展示的假设

### {领域名称}
| 假设 | 置信度 | 证据 |
|------------|-----------|----------|
| {声明} | {Confident/Likely/Unclear} | {文件路径} |

{每个领域重复}

## 所做的纠正

{如果进行了纠正：}

### {领域名称}
- **原始假设：** {Claude 的假设}
- **用户纠正：** {用户选择的替代方案}
- **原因：** {用户的理由，如果提供}

{如果没有纠正："无纠正 — 所有假设已确认。"}

## 自动解决

{如果 --auto 且存在 Unclear 项：}
- {假设}：自动选择 {推荐选项}

{如果不适用：省略此部分}

## 外部研究

{如果进行了研究：}
- {主题}：{发现}（来源：{URL}）

{如果没有研究：省略此部分}
```

写入文件。
</step>

<step name="git_commit">
提交阶段上下文和讨论日志：

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs(${padded_phase}): capture phase context (assumptions mode)" --files "${phase_dir}/${padded_phase}-CONTEXT.md" "${phase_dir}/${padded_phase}-DISCUSSION-LOG.md"
```

确认："已提交：docs(${padded_phase}): capture phase context (assumptions mode)"
</step>

<step name="update_state">
使用会话信息更新 STATE.md：

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" state record-session \
  --stopped-at "Phase ${PHASE} context gathered (assumptions mode)" \
  --resume-file "${phase_dir}/${padded_phase}-CONTEXT.md"
```

提交 STATE.md：

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs(state): record phase ${PHASE} context session" --files .planning/STATE.md
```
</step>

<step name="confirm_creation">
展示摘要和后续步骤：

```
已创建：.planning/phases/${PADDED_PHASE}-${SLUG}/${PADDED_PHASE}-CONTEXT.md

## 已捕获的决策（假设模式）

### {领域名称}
- {关键决策}（来自假设 / 已纠正）

{每个领域重复}

[如果进行了纠正：]
## 已应用的纠正
- {领域}：{原始} → {已纠正}

[如果存在延期想法：]
## 记录以备后用
- {延期想法} — 未来阶段

---

## ▶ 下一步

**阶段 ${PHASE}：{phase_name}** — {来自 ROADMAP.md 的目标}

`/gsd:plan-phase ${PHASE}`

<sub>`/clear` 先执行 → 全新上下文窗口</sub>

---

**其他可用操作：**
- `/gsd:plan-phase ${PHASE} --skip-research` — 不做研究直接规划
- `/gsd:ui-phase ${PHASE}` — 生成 UI 设计契约（如果是前端工作）
- 继续前审查/编辑 CONTEXT.md

---
```
</step>

<step name="auto_advance">
检查自动推进触发器：

1. 从 $ARGUMENTS 解析 `--auto` 标志
2. 同步链标志：
   ```bash
   if [[ ! "$ARGUMENTS" =~ --auto ]]; then
     node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-set workflow._auto_chain_active false 2>/dev/null
   fi
   ```
3. 读取链标志和用户偏好：
   ```bash
   AUTO_CHAIN=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow._auto_chain_active 2>/dev/null || echo "false")
   AUTO_CFG=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow.auto_advance 2>/dev/null || echo "false")
   ```

**如果存在 `--auto` 标志且 `AUTO_CHAIN` 不为 true：**
```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-set workflow._auto_chain_active true
```

**如果存在 `--auto` 标志或 `AUTO_CHAIN` 为 true 或 `AUTO_CFG` 为 true：**

显示横幅：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 自动推进到规划
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

上下文已捕获（假设模式）。正在启动 plan-phase...
```

启动：`Skill(skill="gsd:plan-phase", args="${PHASE} --auto")`

处理返回：PHASE COMPLETE / PLANNING COMPLETE / INCONCLUSIVE / GAPS FOUND
（与 discuss-phase.md auto_advance 步骤的处理方式相同）

**如果既没有 `--auto` 也没有配置启用：**
路由到 confirm_creation 步骤。
</step>

</process>

<success_criteria>
- 阶段已在路线图中验证
- 已加载先前上下文（不重新询问已决定的问题）
- 通过探索子代理深度分析代码库（读取 5-15 个文件）
- 带证据和置信度的假设已浮现
- 用户已确认或纠正假设（最多约 2-4 次交互）
- 范围蔓延已重定向到延期想法
- CONTEXT.md 捕获实际决策（与 discuss 模式格式相同）
- CONTEXT.md 包含带完整文件路径的 canonical_refs（必须）
- CONTEXT.md 包含来自代码库分析的 code_context
- DISCUSSION-LOG.md 记录假设和纠正作为审计记录
- STATE.md 已使用会话信息更新
- 用户知道后续步骤
</success_criteria>
</output>
