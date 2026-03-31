<purpose>
提取下游代理所需的实施决策。分析阶段以识别灰色地带，让用户选择要讨论的内容，然后对每个选定领域进行深入探讨直到满意。

你是思考伙伴，不是访谈者。用户是远见者 — 你是构建者。你的工作是捕获将指导研究和规划的决策，而不是自己想出实施方案。
</purpose>

<downstream_awareness>
**CONTEXT.md 提供给：**

1. **gsd-phase-researcher** — 读取 CONTEXT.md 以了解要研究什么
   - "用户想要卡片式布局" → 研究者调查卡片组件模式
   - "已决定无限滚动" → 研究者研究虚拟化库

2. **gsd-planner** — 读取 CONTEXT.md 以了解哪些决策已锁定
   - "移动端下拉刷新" → 规划者将此纳入任务规格
   - "Claude 自行决定：加载骨架屏" → 规划者可以决定方案

**你的工作：** 足够清晰地捕获决策，使下游代理无需再次询问用户即可执行。

**不是你的工作：** 弄清如何实施。那是研究和规划利用你捕获的决策来完成的。
</downstream_awareness>

<philosophy>
**用户 = 创始人/远见者。Claude = 构建者。**

用户知道的：
- 他们想象中它如何运作
- 它应该看起来/感觉如何
- 什么是核心的 vs 锦上添花的
- 他们脑中的特定行为或参考

用户不知道的（也不应被问到的）：
- 代码库模式（研究者读代码）
- 技术风险（研究者识别这些）
- 实施方案（规划者解决这个）
- 成功指标（从工作中推断）

询问愿景和实施选择。为下游代理捕获决策。
</philosophy>

<scope_guardrail>
**关键：不得范围蔓延。**

阶段边界来自 ROADMAP.md 且是固定的。讨论澄清的是如何实施已确定范围的内容，而不是是否添加新功能。

**允许（澄清歧义）：**
- "帖子应该如何显示？"（布局、密度、显示的信息）
- "空状态时显示什么？"（在功能范围内）
- "下拉刷新还是手动？"（行为选择）

**不允许（范围蔓延）：**
- "我们是否也应该添加评论？"（新功能）
- "搜索/过滤呢？"（新功能）
- "也许加上书签？"（新功能）

**判断标准：** 这是在澄清我们如何实施阶段中已有的内容，还是在添加一个可以成为独立阶段的新功能？

**当用户建议范围蔓延时：**
```
"[功能 X] 将是一个新能力 — 那应该是它自己的阶段。
要我记录到路线图待办列表中吗？

现在，让我们专注于 [阶段领域]。"
```

将想法记录在"延期想法"部分。不要丢失它，也不要执行它。
</scope_guardrail>

<gray_area_identification>
灰色地带是**用户关心的实施决策** — 可以有多种方式且会改变结果的事情。

**如何识别灰色地带：**

1. **读取阶段目标** 从 ROADMAP.md
2. **理解领域** — 正在构建什么类型的东西？
   - 用户能看到的东西 → 视觉呈现、交互、状态很重要
   - 用户会调用的东西 → 接口契约、响应、错误很重要
   - 用户会运行的东西 → 调用方式、输出、行为模式很重要
   - 用户会阅读的东西 → 结构、语气、深度、流程很重要
   - 被组织的东西 → 标准、分组、异常处理很重要
3. **生成阶段特定的灰色地带** — 不是通用类别，而是此阶段的具体决策

**不要使用通用类别标签**（UI、UX、行为）。生成具体的灰色地带：

```
阶段："用户认证"
→ 会话处理、错误响应、多设备策略、恢复流程

阶段："组织照片库"
→ 分组标准、重复处理、命名约定、文件夹结构

阶段："数据库备份 CLI"
→ 输出格式、标志设计、进度报告、错误恢复

阶段："API 文档"
→ 结构/导航、代码示例深度、版本控制方案、交互元素
```

**关键问题：** 哪些决策会改变结果，用户应该参与权衡？

**Claude 处理这些（不要问）：**
- 技术实现细节
- 架构模式
- 性能优化
- 范围（路线图定义了这个）
</gray_area_identification>

<answer_validation>
**重要：答案验证** — 每次 AskUserQuestion 调用后，检查响应是否为空或仅包含空白。如果是：
1. 使用相同参数重试一次
2. 如果仍为空，将选项以纯文本编号列表呈现，要求用户输入选择编号
永远不要在空答案下继续。

**文本模式（配置中 `workflow.text_mode: true` 或 `--text` 标志）：**
当文本模式激活时，**完全不使用 AskUserQuestion**。而是将每个问题以纯文本编号列表呈现，要求用户输入选择编号。
这是 Claude Code 远程会话（`/rc` 模式）所必需的，因为 Claude App 无法将 TUI 菜单选择转发回主机。

启用文本模式：
- 每次会话：向任何命令传递 `--text` 标志（例如 `/gsd:discuss-phase --text`）
- 每个项目：`gsd-tools config-set workflow.text_mode true`

文本模式适用于会话中的所有工作流，不仅仅是 discuss-phase。
</answer_validation>

<process>

**快速通道可用：** 如果你已有 PRD 或验收标准文档，使用 `/gsd:plan-phase {phase} --prd path/to/prd.md` 跳过此讨论直接进入规划。

<step name="initialize" priority="first">
从参数获取阶段编号（必需）。

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init phase-op "${PHASE}")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
AGENT_SKILLS_ADVISOR=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-advisor 2>/dev/null)
```

解析 JSON 获取：`commit_docs`、`phase_found`、`phase_dir`、`phase_number`、`phase_name`、`phase_slug`、`padded_phase`、`has_research`、`has_context`、`has_plans`、`has_verification`、`plan_count`、`roadmap_exists`、`planning_exists`。

**如果 `phase_found` 为 false：**
```
阶段 [X] 未在路线图中找到。

使用 /gsd:progress ${GSD_WS} 查看可用阶段。
```
退出工作流。

**如果 `phase_found` 为 true：** 继续到 check_existing。

**自动模式** — 如果 ARGUMENTS 中包含 `--auto`：
- 在 `check_existing` 中：自动选择"跳过"（如果上下文存在）或无需提示继续（如果无上下文/计划）
- 在 `present_gray_areas` 中：自动选择所有灰色地带而不询问用户
- 在 `discuss_areas` 中：对于每个讨论问题，选择推荐选项（第一个选项，或标记为"推荐"的选项）而不使用 AskUserQuestion
- 内联记录每个自动选择，以便用户可以在上下文文件中审查决策
- 讨论完成后，自动推进到 plan-phase（已有行为）
</step>

<step name="check_existing">
使用 init 中的 `has_context` 检查 CONTEXT.md 是否已存在。

```bash
ls ${phase_dir}/*-CONTEXT.md 2>/dev/null || true
```

**如果存在：**

**如果 `--auto`：** 自动选择"更新" — 加载现有上下文并继续到 analyze_phase。记录：`[auto] 上下文存在 — 使用自动选择的决策更新。`

**否则：** 使用 AskUserQuestion：
- header: "上下文"
- question: "阶段 [X] 已有上下文。你想做什么？"
- options:
  - "更新" — 审查并修订现有上下文
  - "查看" — 给我看看现有内容
  - "跳过" — 按原样使用现有上下文

如果"更新"：加载现有内容，继续到 analyze_phase
如果"查看"：显示 CONTEXT.md，然后提供更新/跳过选项
如果"跳过"：退出工作流

**如果不存在：**

从 init 检查 `has_plans` 和 `plan_count`。**如果 `has_plans` 为 true：**

**如果 `--auto`：** 自动选择"继续并在之后重新规划"。记录：`[auto] 计划存在 — 继续捕获上下文，之后重新规划。`

**否则：** 使用 AskUserQuestion：
- header: "计划已存在"
- question: "阶段 [X] 已有 {plan_count} 个计划，在没有用户上下文的情况下创建的。你在这里的决策不会影响现有计划，除非你重新规划。"
- options:
  - "继续并在之后重新规划" — 捕获上下文，然后运行 /gsd:plan-phase {X} ${GSD_WS} 重新规划
  - "查看现有计划" — 在决定前查看计划
  - "取消" — 跳过 discuss-phase

如果"继续并在之后重新规划"：继续到 analyze_phase。
如果"查看现有计划"：显示计划文件，然后提供"继续"/"取消"。
如果"取消"：退出工作流。

**如果 `has_plans` 为 false：** 继续到 load_prior_context。
</step>

<step name="load_prior_context">
读取项目级和先前阶段的上下文，以避免重新询问已决定的问题并保持一致性。

**步骤 1：读取项目级文件**
```bash
# 核心项目文件
cat .planning/PROJECT.md 2>/dev/null || true
cat .planning/REQUIREMENTS.md 2>/dev/null || true
cat .planning/STATE.md 2>/dev/null || true
```

从中提取：
- **PROJECT.md** — 愿景、原则、不可妥协项、用户偏好
- **REQUIREMENTS.md** — 验收标准、约束、必须有 vs 锦上添花
- **STATE.md** — 当前进度、任何标记或会话备注

**步骤 2：读取所有先前的 CONTEXT.md 文件**
```bash
# 查找当前阶段之前的所有 CONTEXT.md 文件
(find .planning/phases -name "*-CONTEXT.md" 2>/dev/null || true) | sort
```

对于每个阶段编号 < 当前阶段的 CONTEXT.md：
- 读取 `<decisions>` 部分 — 这些是已锁定的偏好
- 读取 `<specifics>` — 特定参考或"我想要类似 X"的时刻
- 记录任何模式（例如"用户一贯偏好最简化 UI"、"用户拒绝了单键快捷键"）

**步骤 3：构建内部 `<prior_decisions>` 上下文**

组织提取的信息：
```
<prior_decisions>
## 项目级
- [来自 PROJECT.md 的关键原则或约束]
- [来自 REQUIREMENTS.md 影响此阶段的需求]

## 来自先前阶段
### 阶段 N：[名称]
- [可能与当前阶段相关的决策]
- [建立模式的偏好]

### 阶段 M：[名称]
- [另一个相关决策]
</prior_decisions>
```

**在后续步骤中的使用：**
- `analyze_phase`：跳过先前阶段已决定的灰色地带
- `present_gray_areas`：用先前决策标注选项（"你在阶段 5 中选择了 X"）
- `discuss_areas`：预填答案或标记冲突（"这与阶段 3 矛盾 — 这里相同还是不同？"）

**如果不存在先前上下文：** 在没有的情况下继续 — 对于早期阶段这是预期的。
</step>

<step name="cross_reference_todos">
检查是否有待处理的待办事项与此阶段的范围相关。浮现可能被遗漏的待办列表项。

**加载并匹配待办事项：**
```bash
TODO_MATCHES=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" todo match-phase "${PHASE_NUMBER}")
```

解析 JSON 获取：`todo_count`、`matches[]`（每个包含 `file`、`title`、`area`、`score`、`reasons`）。

**如果 `todo_count` 为 0 或 `matches` 为空：** 静默跳过 — 不减慢工作流。

**如果找到匹配项：**

向用户展示匹配的待办事项。显示每个匹配项的标题、领域和匹配原因：

```
📋 找到 {N} 个可能与阶段 {X} 相关的待处理待办事项：

{对于每个匹配项：}
- **{title}**（领域：{area}，相关性：{score}）— 匹配原因 {reasons}
```

使用 AskUserQuestion（multiSelect）询问哪些待办事项应纳入此阶段的范围：

```
哪些待办事项应纳入阶段 {X} 的范围？
（选择适用的，或不选以跳过）
```

**对于选中（已纳入）的待办事项：**
- 内部存储为 `<folded_todos>` 以包含在 CONTEXT.md 的 `<decisions>` 部分
- 这些成为下游代理（研究者、规划者）会看到的额外范围项

**对于未选中（已审查但未纳入）的待办事项：**
- 内部存储为 `<reviewed_todos>` 以包含在 CONTEXT.md 的 `<deferred>` 部分
- 这防止未来阶段将相同的待办事项重新浮现为"遗漏"

**自动模式（`--auto`）：** 自动纳入所有得分 >= 0.4 的待办事项。记录选择。
</step>

<step name="scout_codebase">
对现有代码进行轻量扫描，为灰色地带识别和讨论提供信息。使用约 10% 的上下文 — 对于交互会话是可接受的。

**步骤 1：检查现有的代码库映射**
```bash
ls .planning/codebase/*.md 2>/dev/null || true
```

**如果代码库映射存在：** 读取最相关的（根据阶段类型选择 CONVENTIONS.md、STRUCTURE.md、STACK.md）。提取：
- 可复用组件/hooks/工具函数
- 已建立的模式（状态管理、样式、数据获取）
- 集成点（新代码将在哪里连接）

跳到下方步骤 3。

**步骤 2：如果没有代码库映射，进行定向 grep**

从阶段目标中提取关键词（例如"feed" → "post"、"card"、"list"；"auth" → "login"、"session"、"token"）。

```bash
# 查找与阶段目标相关的文件
grep -rl "{term1}\|{term2}" src/ app/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null | head -10 || true

# 查找现有组件/hooks
ls src/components/ 2>/dev/null || true
ls src/hooks/ 2>/dev/null || true
ls src/lib/ src/utils/ 2>/dev/null || true
```

读取 3-5 个最相关的文件以了解现有模式。

**步骤 3：构建内部 codebase_context**

从扫描中识别：
- **可复用资产** — 可在此阶段使用的现有组件、hooks、工具函数
- **已建立的模式** — 代码库如何进行状态管理、样式、数据获取
- **集成点** — 新代码将在哪里连接（路由、导航、providers）
- **创造性选项** — 现有架构启用或约束的方案

存储为内部 `<codebase_context>` 供 analyze_phase 和 present_gray_areas 使用。这不写入文件 — 仅在此会话中使用。
</step>

<step name="analyze_phase">
分析阶段以识别值得讨论的灰色地带。**使用 `prior_decisions` 和 `codebase_context` 来支撑分析。**

**从 ROADMAP.md 读取阶段描述并确定：**

1. **领域边界** — 此阶段交付什么能力？清晰地陈述。

1b. **初始化规范引用累加器** — 开始为 CONTEXT.md 构建 `<canonical_refs>` 列表。这在整个讨论过程中累积，不仅仅是这一步。

   **来源 1（现在）：** 从 ROADMAP.md 复制此阶段的 `Canonical refs:`。展开每个为完整相对路径。
   **来源 2（现在）：** 检查 REQUIREMENTS.md 和 PROJECT.md 中为此阶段引用的规范/ADR。
   **来源 3（scout_codebase）：** 如果现有代码引用了文档（例如注释引用 ADR），添加那些。
   **来源 4（discuss_areas）：** 当用户在讨论中说"读取 X"、"检查 Y"或引用任何文档/规范/ADR 时 — 立即添加。这些通常是最重要的引用，因为它们代表用户特别希望被遵循的文档。

   此列表在 CONTEXT.md 中是必须的。每个引用必须有完整相对路径，以便下游代理可以直接读取。如果不存在外部文档，明确说明。

2. **检查先前决策** — 在生成灰色地带之前，检查是否有已经决定的：
   - 扫描 `<prior_decisions>` 查找相关选择（例如"仅 Ctrl+C，无单键快捷键"）
   - 这些是**预先回答的** — 除非此阶段有冲突需求否则不要重新询问
   - 记录适用的先前决策以在展示中使用

3. **按类别的灰色地带** — 对于每个相关类别（UI、UX、行为、空状态、内容），识别 1-2 个会改变实施的具体歧义。**在相关时标注代码上下文**（例如"你已有一个 Card 组件"或"目前没有此模式"）。

4. **跳过评估** — 如果不存在有意义的灰色地带（纯基础设施、实施明确，或先前阶段已全部决定），该阶段可能不需要讨论。

**顾问模式检测：**

检查是否应激活顾问模式：

1. 检查 USER-PROFILE.md：
   ```bash
   PROFILE_PATH="$HOME/.claude/get-shit-done/USER-PROFILE.md"
   ```
   ADVISOR_MODE = 文件存在于 PROFILE_PATH → true，否则 → false

2. 如果 ADVISOR_MODE 为 true，解析 vendor_philosophy 校准层级：
   - 优先级 1：读取 config.json > preferences.vendor_philosophy（项目级覆盖）
   - 优先级 2：读取 USER-PROFILE.md 供应商选择/理念评分（全局）
   - 优先级 3：如果两者都没有值或值为 UNSCORED，默认为 "standard"

   映射到校准层级：
   - conservative 或 thorough-evaluator → full_maturity
   - opinionated → minimal_decisive
   - pragmatic-fast 或任何其他值或空 → standard

3. 解析顾问代理的模型：
   ```bash
   ADVISOR_MODEL=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" resolve-model gsd-advisor-researcher --raw)
   ```

如果 ADVISOR_MODE 为 false，跳过所有顾问特定步骤 — 工作流以现有对话流程不变地继续。

**内部输出你的分析，然后展示给用户。**

"帖子 Feed"阶段的分析示例（包含代码和先前上下文）：
```
领域：显示已关注用户的帖子
现有：Card 组件（src/components/ui/Card.tsx）、useInfiniteQuery hook、Tailwind CSS
先前决策："偏好最简化 UI"（阶段 2）、"无分页 — 总是无限滚动"（阶段 4）

灰色地带：
- UI：布局风格（卡片 vs 时间线 vs 网格）— Card 组件存在，有阴影/圆角变体
- UI：信息密度（完整帖子 vs 预览）— 无现有密度模式
- 行为：加载模式 — 已决定：无限滚动（阶段 4）
- 空状态：无帖子时显示什么 — ui/ 中存在 EmptyState 组件
- 内容：显示什么元数据（时间、作者、反应数）
```
</step>

<step name="present_gray_areas">
向用户展示领域边界、先前决策和灰色地带。

**首先，陈述边界和适用的先前决策：**
```
阶段 [X]：[名称]
领域：[此阶段交付什么 — 来自你的分析]

我们将澄清如何实施这个。
（新功能属于其他阶段。）

[如果先前决策适用：]
**从早期阶段延续的：**
- [来自阶段 N 的在此适用的决策]
- [来自阶段 M 的在此适用的决策]
```

**如果 `--auto`：** 自动选择所有灰色地带。记录：`[auto] 已选择所有灰色地带：[列出领域名称]。` 跳过下方的 AskUserQuestion，选择所有领域直接继续到 discuss_areas。

**否则，使用 AskUserQuestion（multiSelect: true）：**
- header: "讨论"
- question: "你想讨论 [阶段名称] 的哪些领域？"
- options：生成 3-4 个阶段特定的灰色地带，每个包含：
  - "[具体领域]"（标签）— 具体的，不是通用的
  - [此领域涵盖的 1-2 个问题 + 代码上下文标注]（描述）
  - **用简要解释高亮推荐选择**

**先前决策标注：** 当灰色地带在先前阶段已决定时，标注它：
```
☐ 退出快捷键 — 用户应如何退出？
  （你在阶段 5 决定了"仅 Ctrl+C，无单键快捷键" — 重新审视还是保持？）
```

**代码上下文标注：** 当侦察发现了相关的现有代码时，标注灰色地带描述：
```
☐ 布局风格 — 卡片 vs 列表 vs 时间线？
  （你已有带阴影/圆角变体的 Card 组件。复用它保持应用一致性。）
```

**两者结合：** 当先前决策和代码上下文都适用时：
```
☐ 加载行为 — 无限滚动还是分页？
  （你在阶段 4 选择了无限滚动。useInfiniteQuery hook 已就绪。）
```

**不要包含"跳过"或"你来决定"选项。** 用户运行此命令是为了讨论 — 给他们真正的选择。

**按领域的示例（带代码上下文）：**

"帖子 Feed"（视觉功能）：
```
☐ 布局风格 — 卡片 vs 列表 vs 时间线？（Card 组件存在且有变体）
☐ 加载行为 — 无限滚动还是分页？（useInfiniteQuery hook 可用）
☐ 内容排序 — 时间顺序、算法推荐还是用户选择？
☐ 帖子元数据 — 每个帖子显示什么信息？时间戳、反应、作者？
```

"数据库备份 CLI"（命令行工具）：
```
☐ 输出格式 — JSON、表格还是纯文本？详细程度级别？
☐ 标志设计 — 短标志、长标志还是两者都有？必需的 vs 可选的？
☐ 进度报告 — 静默、进度条还是详细日志？
☐ 错误恢复 — 快速失败、重试还是提示操作？
```

"组织照片库"（组织任务）：
```
☐ 分组标准 — 按日期、位置、人脸还是事件？
☐ 重复处理 — 保留最佳、全部保留还是每次提示？
☐ 命名约定 — 原始名称、日期还是描述性名称？
☐ 文件夹结构 — 扁平、按年嵌套还是按类别？
```

选择领域后继续到 discuss_areas（如果 ADVISOR_MODE 为 true 则先到 advisor_research）。
</step>

<step name="advisor_research">
**顾问研究**（仅当 ADVISOR_MODE 为 true 时）

用户在 present_gray_areas 中选择灰色地带后，生成并行研究代理。

1. 显示简要状态："正在研究 {N} 个领域..."

2. 对于每个用户选择的灰色地带，并行生成 Task()：

   Task(
     prompt="首先，读取 @~/.claude/agents/gsd-advisor-researcher.md 了解你的角色和指令。

     <gray_area>{area_name}：{来自灰色地带识别的 area_description}</gray_area>
     <phase_context>{来自 ROADMAP.md 的阶段目标和描述}</phase_context>
     <project_context>{来自 PROJECT.md 的项目名称和简要描述}</project_context>
     <calibration_tier>{解析的校准层级：full_maturity | standard | minimal_decisive}</calibration_tier>

     研究此灰色地带并返回带理由的结构化比较表。
     ${AGENT_SKILLS_ADVISOR}",
     subagent_type="general-purpose",
     model="{ADVISOR_MODEL}",
     description="研究：{area_name}"
   )

   所有 Task() 调用同时生成 — 不要等一个完成再启动下一个。

3. 所有代理返回后，在展示前综合结果：
   对于每个代理的返回：
   a. 解析 markdown 比较表和理由段落
   b. 验证所有 5 列存在（选项 | 优点 | 缺点 | 复杂度 | 推荐）— 填充任何缺失的列而不是显示破损的表
   c. 验证选项数量与校准层级匹配：
      - full_maturity：3-5 个选项可接受
      - standard：2-4 个选项可接受
      - minimal_decisive：1-2 个选项可接受
      如果代理返回太多，裁剪最不可行的。如果太少，按原样接受。
   d. 重写理由段落以融入代理没有访问的项目上下文和持续讨论上下文
   e. 如果代理只返回 1 个选项，从表格格式转换为直接推荐："关于 {area} 的标准方案：{选项}。{理由}"

4. 存储综合后的表格供 discuss_areas 使用。

**如果 ADVISOR_MODE 为 false：** 完全跳过此步骤 — 从 present_gray_areas 直接进入 discuss_areas。
</step>

<step name="discuss_areas">
与用户讨论每个选定的领域。流程取决于顾问模式。

**如果 ADVISOR_MODE 为 true：**

表格优先的讨论流程 — 展示研究支持的比较表，然后捕获用户选择。

**对于每个选定的领域：**

1. **展示综合后的比较表 + 理由段落**（来自 advisor_research 步骤）

2. **使用 AskUserQuestion：**
   - header: "{area_name}"
   - question: "关于 {area_name} 选择哪种方案？"
   - options：从表格的选项列提取（AskUserQuestion 自动添加"其他"）

3. **记录用户的选择：**
   - 如果用户从表格选项中选择 → 记录为该领域的锁定决策
   - 如果用户选择"其他" → 接收其输入，回显确认，记录

4. **记录选择后，Claude 决定是否需要后续问题：**
   - 如果选择有歧义会影响下游规划 → 使用 AskUserQuestion 问 1-2 个有针对性的后续问题
   - 如果选择清晰且自包含 → 移到下一个领域
   - 不要问标准的 4 个问题 — 表格已提供了上下文

5. **所有领域处理完后：**
   - header: "完成"
   - question: "这涵盖了 [列出领域]。准备创建上下文？"
   - options："创建上下文" / "重新审视某个领域"

**范围蔓延处理（顾问模式）：**
如果用户提到阶段领域之外的内容：
```
"[功能] 听起来是一个新能力 — 那属于它自己的阶段。
我将把它记为延期想法。

回到 [当前领域]：[返回当前问题]"
```

内部跟踪延期想法。

---

**如果 ADVISOR_MODE 为 false：**

对于每个选定的领域，进行聚焦的讨论循环。

**问前研究模式：** 检查配置中是否启用了 `workflow.research_before_questions`（来自 init 上下文或 `.planning/config.json`）。启用时，在展示每个领域的问题之前：
1. 对该领域主题的最佳实践进行简短的网络搜索
2. 用 2-3 个要点总结最重要的发现
3. 将研究与问题一起展示，以便用户做出更明智的决策

启用研究的示例：
```
让我们谈谈 [认证策略]。

📊 最佳实践研究：
• OAuth 2.0 + PKCE 是当前 SPA 的标准（替代了隐式流程）
• 使用 httpOnly cookies 的会话令牌优于 localStorage 的 XSS 防护
• 考虑 passkey/WebAuthn 支持 — 2025-2026 年采用率在加速

有了这个背景：用户应如何认证？
```

禁用时（默认），跳过研究并像以前一样直接展示问题。

**文本模式支持：** 从 `$ARGUMENTS` 解析可选的 `--text`。
- 接受 `--text` 标志或读取配置中的 `workflow.text_mode`（来自 init 上下文）
- 激活时，将所有 `AskUserQuestion` 调用替换为纯文本编号列表
- 用户输入编号选择，或输入自由文本选择"其他"
- 这是 Claude Code 远程会话（`/rc` 模式）所必需的，因为 TUI 菜单无法通过 Claude App 工作

**批量模式支持：** 从 `$ARGUMENTS` 解析可选的 `--batch`。
- 接受 `--batch`、`--batch=N` 或 `--batch N`

**分析模式支持：** 从 `$ARGUMENTS` 解析可选的 `--analyze`。
当 `--analyze` 激活时，在展示每个问题（或批量模式中的问题组）之前，提供该决策的简要**权衡分析**：
- 基于代码库上下文和常见模式的 2-3 个带优缺点的选项
- 带理由的推荐方案
- 来自先前阶段的已知陷阱或约束

使用 `--analyze` 的示例：
```
**权衡分析：认证策略**

| 方案 | 优点 | 缺点 |
|----------|------|------|
| 会话 cookie | 简单，httpOnly 防 XSS | 需要 CSRF 防护，粘性会话 |
| JWT（无状态） | 可扩展，无服务器状态 | Token 大小，撤销复杂度 |
| OAuth 2.0 + PKCE | SPA 的行业标准 | 更多设置，重定向流程 UX |

💡 推荐：OAuth 2.0 + PKCE — 你的应用在需求中有社交登录（REQ-04），这与 `src/lib/auth.ts` 中现有的 NextAuth 设置一致。

用户应如何认证？
```

这为用户提供上下文以做出明智决策，无需额外提示。当 `--analyze` 不存在时，像以前一样直接展示问题。
- 接受 `--batch`、`--batch=N` 或 `--batch N`
- 未提供数字时默认每批 4 个问题
- 将显式大小限制在 2-5 之间以保持批次可回答
- 如果 `--batch` 不存在，保持现有的逐个问题流程

**理念：** 保持自适应，但让用户选择节奏。
- 默认模式：4 个单问题轮次，然后检查是否继续
- `--batch` 模式：1 个包含 2-5 个编号问题的分组轮次，然后检查是否继续

每个答案（或批量模式中的答案集）应揭示下一个问题或下一批。

**自动模式（`--auto`）：** 对于每个领域，Claude 为每个问题选择推荐选项（第一个选项，或明确标记为"推荐"的选项）而不使用 AskUserQuestion。记录每个自动选择：
```
[auto] [领域] — 问："[问题文本]" → 已选择："[选择的选项]"（推荐默认值）
```
所有领域自动解决后，跳过"探索更多灰色地带"提示，直接进入 write_context。

**交互模式（无 `--auto`）：**

**对于每个领域：**

1. **宣布领域：**
   ```
   让我们谈谈 [领域]。
   ```

2. **使用选定的节奏提问：**

   **默认（无 `--batch`）：使用 AskUserQuestion 问 4 个问题**
   - header: "[领域]"（最多 12 个字符 — 需要时缩写）
   - question：此领域的具体决策
   - options：2-3 个具体选择（AskUserQuestion 自动添加"其他"），高亮推荐选择并简要说明原因
   - **在相关时用代码上下文标注选项**：
     ```
     "帖子应该如何显示？"
     - 卡片（复用现有 Card 组件 — 与消息保持一致）
     - 列表（更简单，将是新模式）
     - 时间线（需要新的 Timeline 组件 — 目前不存在）
     ```
   - 在合理时包含"你来决定"选项 — 捕获 Claude 自由裁量权
   - **库选择使用 Context7：** 当灰色地带涉及库选择（例如"魔法链接" → 查询 next-auth 文档）或 API 方案决策时，使用 `mcp__context7__*` 工具获取当前文档并为选项提供信息。不要对每个问题都使用 Context7 — 仅在库特定知识改善选项时使用。

   **批量模式（`--batch`）：在一个纯文本轮次中问 2-5 个编号问题**
   - 将当前领域紧密相关的问题分组到单条消息中
   - 保持每个问题具体且可在一次回复中回答
   - 当选项有帮助时，为每个问题包含简短的内联选择而不是为每项都用单独的 AskUserQuestion
   - 用户回复后，回显捕获的决策，记录任何未回答的项，仅问最少的后续以继续
   - 在批次之间保持自适应性：使用完整的答案集来决定下一批或领域是否已足够清晰

3. **当前问题集结束后，检查：**
   - header: "[领域]"（最多 12 个字符）
   - question: "关于 [领域] 还有更多问题，还是继续下一个？（剩余：[列出其他未访问的领域]）"
   - options："更多问题" / "下一个领域"

   构建问题文本时，列出剩余的未访问领域以便用户知道接下来是什么。例如："关于布局还有更多问题，还是继续下一个？（剩余：加载行为、内容排序）"

   如果"更多问题" → 再问 4 个单个问题，或当 `--batch` 激活时再问 2-5 个批量问题，然后再次检查
   如果"下一个领域" → 进入下一个选定的领域
   如果"其他"（自由文本）→ 解释意图：继续性短语（"多聊聊"、"继续"、"是的"、"更多"）映射到"更多问题"；推进短语（"完成"、"继续"、"下一个"、"跳过"）映射到"下一个领域"。如果不明确，问："继续关于 [领域] 的问题，还是移到下一个领域？"

4. **所有初始选定的领域完成后：**
   - 总结讨论中迄今捕获的内容
   - AskUserQuestion：
     - header: "完成"
     - question: "我们已讨论了 [列出领域]。哪些灰色地带仍不清楚？"
     - options："探索更多灰色地带" / "我准备好创建上下文了"
   - 如果"探索更多灰色地带"：
     - 根据已了解的内容识别 2-4 个额外的灰色地带
     - 用这些新领域返回 present_gray_areas 逻辑
     - 循环：讨论新领域，然后再次提示
   - 如果"我准备好创建上下文了"：进入 write_context

**讨论中的规范引用累积：**
当用户在任何回答中引用文档、规范或 ADR 时 — 例如"读取 adr-014"、"检查 MCP 规范"、"根据 browse-spec.md" — 立即：
1. 读取引用的文档（或确认它存在）
2. 将其添加到规范引用累加器中，使用完整相对路径
3. 使用从文档中学到的内容来指导后续问题

这些用户引用的文档通常比 ROADMAP.md 引用更重要，因为它们代表用户特别希望下游代理遵循的文档。永远不要丢弃它们。

**问题设计：**
- 选项应该具体，不要抽象（"卡片"而不是"选项 A"）
- 每个答案应该为下一个问题或下一批提供信息
- 如果用户选择"其他"提供自由输入（例如"让我描述一下"、"其他东西"或开放式回复），将后续作为纯文本提问 — 不是另一个 AskUserQuestion。等他们在正常提示处输入，然后回显他们的输入并确认后再恢复 AskUserQuestion 或下一个编号批次。

**范围蔓延处理：**
如果用户提到阶段领域之外的内容：
```
"[功能] 听起来是一个新能力 — 那属于它自己的阶段。
我将把它记为延期想法。

回到 [当前领域]：[返回当前问题]"
```

内部跟踪延期想法。

**内部跟踪讨论日志数据：**
对于每个提出的问题，累积：
- 领域名称
- 展示的所有选项（标签 + 描述）
- 用户选择了哪个选项（或他们的自由文本回复）
- 用户提供的任何后续备注或澄清
此数据用于在 `write_context` 步骤中生成 DISCUSSION-LOG.md。
</step>

<step name="write_context">
创建 CONTEXT.md 捕获所做的决策。

**同时生成 DISCUSSION-LOG.md** — 讨论阶段问答的完整审计记录。
此文件仅供人类参考（软件审计、合规审查）。它不被下游代理（研究者、规划者、执行者）消费。

**查找或创建阶段目录：**

使用 init 中的值：`phase_dir`、`phase_slug`、`padded_phase`。

如果 `phase_dir` 为 null（阶段存在于路线图但无目录）：
```bash
mkdir -p ".planning/phases/${padded_phase}-${phase_slug}"
```

**文件位置：** `${phase_dir}/${padded_phase}-CONTEXT.md`

**按讨论内容组织内容：**

```markdown
# 阶段 [X]：[名称] - 上下文

**收集时间：** [date]
**状态：** 准备好规划

<domain>
## 阶段边界

[此阶段交付什么的清晰声明 — 范围锚点]

</domain>

<decisions>
## 实施决策

### [讨论的类别 1]
- **D-01:** [捕获的决策或偏好]
- **D-02:** [另一个决策（如适用）]

### [讨论的类别 2]
- **D-03:** [捕获的决策或偏好]

### Claude 自行决定
[用户说"你来决定"的领域 — 注明 Claude 在此有灵活性]

### 已纳入的待办事项
[如果在 cross_reference_todos 步骤中有任何待办事项被纳入范围，在此列出。
每个条目应包含待办事项标题、原始问题和它如何适合此阶段的范围。
如果没有纳入的待办事项：完全省略此子部分。]

</decisions>

<canonical_refs>
## 规范引用

**下游代理在规划或实施前必须阅读这些。**

[必须部分。在此写入完整的累积规范引用列表。
来源：ROADMAP.md 引用 + REQUIREMENTS.md 引用 + 讨论中用户引用的文档 + 代码库侦察中发现的任何文档。按主题领域分组。
每个条目需要完整相对路径 — 不仅仅是名称。]

### [主题领域 1]
- `path/to/adr-or-spec.md` — [它决定/定义的与此相关的内容]
- `path/to/doc.md` §N — [特定部分引用]

### [主题领域 2]
- `path/to/feature-doc.md` — [此文档定义的内容]

[如果没有外部规范："无外部规范 — 需求完全捕获在上述决策中"]

</canonical_refs>

<code_context>
## 现有代码洞察

### 可复用资产
- [组件/hook/工具函数]：[如何在此阶段使用]

### 已建立的模式
- [模式]：[如何约束/赋能此阶段]

### 集成点
- [新代码与现有系统的连接处]

</code_context>

<specifics>
## 具体想法

[讨论中的任何特定参考、示例或"我想要类似 X"的时刻]

[如果没有："无特定要求 — 开放接受标准方案"]

</specifics>

<deferred>
## 延期想法

[讨论中提出但属于其他阶段的想法。不要丢失它们。]

### 已审查的待办事项（未纳入）
[如果在 cross_reference_todos 中有待办事项被审查但未纳入范围，
在此列出，以便未来阶段知道它们已被考虑。
每个条目：待办事项标题 + 延期原因（超出范围、属于阶段 Y 等）
如果没有已审查但延期的待办事项：完全省略此子部分。]

[如果没有："无 — 讨论保持在阶段范围内"]

</deferred>

---

*阶段：XX-name*
*上下文收集时间：[date]*
```

写入文件。
</step>

<step name="confirm_creation">
展示摘要和后续步骤：

```
已创建：.planning/phases/${PADDED_PHASE}-${SLUG}/${PADDED_PHASE}-CONTEXT.md

## 已捕获的决策

### [类别]
- [关键决策]

### [类别]
- [关键决策]

[如果存在延期想法：]
## 记录以备后用
- [延期想法] — 未来阶段

---

## ▶ 下一步

**阶段 ${PHASE}：[名称]** — [来自 ROADMAP.md 的目标]

`/gsd:plan-phase ${PHASE} ${GSD_WS}`

<sub>`/clear` 先执行 → 全新上下文窗口</sub>

---

**其他可用操作：**
- `/gsd:plan-phase ${PHASE} --skip-research ${GSD_WS}` — 不做研究直接规划
- `/gsd:ui-phase ${PHASE} ${GSD_WS}` — 在规划前生成 UI 设计契约（如果阶段有前端工作）
- 继续前审查/编辑 CONTEXT.md

---
```
</step>

<step name="git_commit">
**提交前写入 DISCUSSION-LOG.md：**

**文件位置：** `${phase_dir}/${padded_phase}-DISCUSSION-LOG.md`

```markdown
# 阶段 [X]：[名称] - 讨论日志

> **仅作审计记录。** 不作为规划、研究或执行代理的输入。
> 决策捕获在 CONTEXT.md 中 — 此日志保留考虑过的替代方案。

**日期：** [ISO date]
**阶段：** [阶段编号]-[阶段名称]
**讨论的领域：** [逗号分隔列表]

---

[对于讨论过的每个灰色地带：]

## [领域名称]

| 选项 | 描述 | 已选择 |
|--------|-------------|----------|
| [选项 1] | [来自 AskUserQuestion 的描述] | |
| [选项 2] | [描述] | ✓ |
| [选项 3] | [描述] | |

**用户的选择：** [选定的选项或自由文本回复]
**备注：** [用户提供的任何澄清、后续上下文或理由]

---

[每个领域重复]

## Claude 自行决定

[列出用户说"你来决定"或交由 Claude 决定的领域]

## 延期想法

[讨论中提到的记录给未来阶段的想法]
```

写入文件。

提交阶段上下文和讨论日志：

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs(${padded_phase}): capture phase context" --files "${phase_dir}/${padded_phase}-CONTEXT.md" "${phase_dir}/${padded_phase}-DISCUSSION-LOG.md"
```

确认："已提交：docs(${padded_phase}): capture phase context"
</step>

<step name="update_state">
使用会话信息更新 STATE.md：

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" state record-session \
  --stopped-at "Phase ${PHASE} context gathered" \
  --resume-file "${phase_dir}/${padded_phase}-CONTEXT.md"
```

提交 STATE.md：

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs(state): record phase ${PHASE} context session" --files .planning/STATE.md
```
</step>

<step name="auto_advance">
检查自动推进触发器：

1. 从 $ARGUMENTS 解析 `--auto` 标志
2. **与意图同步链标志** — 如果用户手动调用（无 `--auto`），清除先前中断的 `--auto` 链中的临时链标志。这不会触碰 `workflow.auto_advance`（用户的持久设置偏好）：
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

**如果存在 `--auto` 标志且 `AUTO_CHAIN` 不为 true：** 将链标志持久化到配置（处理不通过 new-project 直接使用 `--auto` 的情况）：
```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-set workflow._auto_chain_active true
```

**如果存在 `--auto` 标志或 `AUTO_CHAIN` 为 true 或 `AUTO_CFG` 为 true：**

显示横幅：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 自动推进到规划
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

上下文已捕获。正在启动 plan-phase...
```

使用 Skill 工具启动 plan-phase 以避免嵌套 Task 会话（由于深度代理嵌套会导致运行时冻结 — 见 #686）：
```
Skill(skill="gsd:plan-phase", args="${PHASE} --auto ${GSD_WS}")
```

这保持自动推进链扁平 — discuss、plan 和 execute 都在相同的嵌套层级运行，而不是生成越来越深的 Task 代理。

**处理 plan-phase 返回：**
- **PHASE COMPLETE** → 完整链成功。显示：
  ```
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   GSD ► 阶段 ${PHASE} 完成
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  自动推进流水线完成：discuss → plan → execute

  下一步：/gsd:discuss-phase ${NEXT_PHASE} --auto ${GSD_WS}
  <sub>/clear 先执行 → 全新上下文窗口</sub>
  ```
- **PLANNING COMPLETE** → 规划完成，执行未完成：
  ```
  自动推进部分完成：规划完成，执行未完成。
  继续：/gsd:execute-phase ${PHASE} ${GSD_WS}
  ```
- **PLANNING INCONCLUSIVE / CHECKPOINT** → 停止链：
  ```
  自动推进已停止：规划需要输入。
  继续：/gsd:plan-phase ${PHASE} ${GSD_WS}
  ```
- **GAPS FOUND** → 停止链：
  ```
  自动推进已停止：执行期间发现差距。
  继续：/gsd:plan-phase ${PHASE} --gaps ${GSD_WS}
  ```

**如果既没有 `--auto` 也没有配置启用：**
路由到 `confirm_creation` 步骤（已有行为 — 显示手动后续步骤）。
</step>

</process>

<success_criteria>
- 阶段已在路线图中验证
- 已加载先前上下文（PROJECT.md、REQUIREMENTS.md、STATE.md、先前 CONTEXT.md 文件）
- 已决定的问题不再重新询问（从先前阶段延续）
- 已侦察代码库获取可复用资产、模式和集成点
- 通过智能分析识别灰色地带，带代码和先前决策标注
- 用户选择了要讨论的领域
- 每个选定领域探讨到用户满意为止（使用代码感知和先前决策感知的选项）
- 范围蔓延重定向到延期想法
- CONTEXT.md 捕获实际决策，而非模糊愿景
- CONTEXT.md 包含 canonical_refs 部分，带有下游代理所需的每个规范/ADR/文档的完整文件路径（必须 — 永远不要省略）
- CONTEXT.md 包含 code_context 部分，带有可复用资产和模式
- 延期想法保留给未来阶段
- STATE.md 已使用会话信息更新
- 用户知道后续步骤
</success_criteria>
