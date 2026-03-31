<purpose>
为路线图阶段创建可执行的阶段提示（PLAN.md 文件），集成调研和验证。默认流程：调研（如需）-> 规划 -> 验证 -> 完成。协调 gsd-phase-researcher、gsd-planner 和 gsd-plan-checker 代理，带有修订循环（最多 3 次迭代）。
</purpose>

<required_reading>
在开始之前，阅读调用提示的 execution_context 中引用的所有文件。

@~/.claude/get-shit-done/references/ui-brand.md
</required_reading>

<available_agent_types>
有效的 GSD 子代理类型（使用确切名称——不要回退到 'general-purpose'）：
- gsd-phase-researcher — 为某个阶段调研技术方案
- gsd-planner — 从阶段范围创建详细计划
- gsd-plan-checker — 在执行前审查计划质量
</available_agent_types>

<process>

## 1. 初始化

一次调用加载所有上下文（仅路径，以最小化编排器上下文）：

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init plan-phase "$PHASE")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
AGENT_SKILLS_RESEARCHER=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-researcher 2>/dev/null)
AGENT_SKILLS_PLANNER=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-planner 2>/dev/null)
AGENT_SKILLS_CHECKER=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-checker 2>/dev/null)
```

解析 JSON 获取：`researcher_model`、`planner_model`、`checker_model`、`research_enabled`、`plan_checker_enabled`、`nyquist_validation_enabled`、`commit_docs`、`text_mode`、`phase_found`、`phase_dir`、`phase_number`、`phase_name`、`phase_slug`、`padded_phase`、`has_research`、`has_context`、`has_reviews`、`has_plans`、`plan_count`、`planning_exists`、`roadmap_exists`、`phase_req_ids`。

**文件路径（用于 <files_to_read> 块）：**`state_path`、`roadmap_path`、`requirements_path`、`context_path`、`research_path`、`verification_path`、`uat_path`、`reviews_path`。如果文件不存在则为 null。

**如果 `planning_exists` 为 false：**报错——先运行 `/gsd:new-project`。

## 2. 解析和规范化参数

从 $ARGUMENTS 提取：阶段编号（整数或小数如 `2.1`）、标志（`--research`、`--skip-research`、`--gaps`、`--skip-verify`、`--prd <filepath>`、`--reviews`、`--text`）。

如果 $ARGUMENTS 中存在 `--text` 或初始化 JSON 中 `text_mode` 为 `true`，则设置 `TEXT_MODE=true`。当 `TEXT_MODE` 激活时，将每个 `AskUserQuestion` 调用替换为纯文本编号列表，要求用户输入选择编号。这对于 Claude Code 远程会话（`/rc` 模式）是必需的，因为 TUI 菜单在通过 Claude App 的连接中无法工作。

从 $ARGUMENTS 提取 `--prd <filepath>`。如果存在，将 PRD_FILE 设置为该文件路径。

**如果没有阶段编号：**从路线图中检测下一个未规划的阶段。

**如果 `phase_found` 为 false：**验证阶段是否存在于 ROADMAP.md 中。如果有效，使用初始化中的 `phase_slug` 和 `padded_phase` 创建目录：
```bash
mkdir -p ".planning/phases/${padded_phase}-${phase_slug}"
```

**来自初始化的现有产物：**`has_research`、`has_plans`、`plan_count`。

## 2.5. 验证 `--reviews` 前置条件

**跳过条件：**没有 `--reviews` 标志。

**如果 `--reviews` 且 `--gaps`：**报错——不能将 `--reviews` 与 `--gaps` 组合使用。这是冲突的模式。

**如果 `--reviews` 且 `has_reviews` 为 false（阶段目录中没有 REVIEWS.md）：**

报错：
```
Phase {N} 没有找到 REVIEWS.md。请先运行审查：

/gsd:review --phase {N}

然后重新运行 /gsd:plan-phase {N} --reviews
```
退出工作流。

## 3. 验证阶段

```bash
PHASE_INFO=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" roadmap get-phase "${PHASE}")
```

**如果 `found` 为 false：**报错并显示可用阶段。**如果 `found` 为 true：**从 JSON 中提取 `phase_number`、`phase_name`、`goal`。

## 3.5. 处理 PRD 快速路径

**跳过条件：**参数中没有 `--prd` 标志。

**如果提供了 `--prd <filepath>`：**

1. 读取 PRD 文件：
```bash
PRD_CONTENT=$(cat "$PRD_FILE" 2>/dev/null)
if [ -z "$PRD_CONTENT" ]; then
  echo "Error: PRD file not found: $PRD_FILE"
  exit 1
fi
```

2. 显示横幅：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PRD 快速路径
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

使用 PRD：{PRD_FILE}
正在从需求生成 CONTEXT.md...
```

3. 解析 PRD 内容并生成 CONTEXT.md。编排器应该：
   - 从 PRD 中提取所有需求、用户故事、验收标准和约束
   - 将每项映射为锁定决策（PRD 中的一切都视为锁定决策）
   - 识别 PRD 未覆盖的区域并标记为"Claude 自行决定"
   - 从 ROADMAP.md 中**提取规范引用**——该阶段的引用，加上 PRD 中引用的任何规格/ADR——展开为完整文件路径（必须）
   - 在阶段目录中创建 CONTEXT.md

4. 写入 CONTEXT.md：
```markdown
# 阶段 [X]：[Name] - 上下文

**收集时间：** [date]
**状态：** 准备规划
**来源：** PRD 快速路径 ({PRD_FILE})

<domain>
## 阶段边界

[从 PRD 中提取——此阶段交付什么]

</domain>

<decisions>
## 实现决策

{对于 PRD 中的每个需求/故事/标准：}
### [从内容推导的分类]
- [需求作为锁定决策]

### Claude 自行决定
[PRD 未覆盖的区域——实现细节、技术选择]

</decisions>

<canonical_refs>
## 规范引用

**下游代理在规划或实现之前必须阅读这些内容。**

[必须。从 ROADMAP.md 和 PRD 中引用的任何文档中提取。
使用完整的相对路径。按主题分组。]

### [主题区域]
- `path/to/spec-or-adr.md` — [它决定/定义了什么]

[如果没有外部规格："无外部规格——需求已在上述决策中完全捕获"]

</canonical_refs>

<specifics>
## 具体想法

[PRD 中的任何具体引用、示例或明确需求]

</specifics>

<deferred>
## 延后的想法

[PRD 中明确标记为未来/v2/范围外的项目]
[如果没有："无——PRD 覆盖了阶段范围"]

</deferred>

---

*阶段：XX-name*
*上下文收集时间：[date] 通过 PRD 快速路径*
```

5. 提交：
```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs(${padded_phase}): generate context from PRD" --files "${phase_dir}/${padded_phase}-CONTEXT.md"
```

6. 将 `context_content` 设置为生成的 CONTEXT.md 内容，然后继续到步骤 5（处理调研）。

**效果：**这完全跳过了步骤 4（加载 CONTEXT.md），因为我们刚刚创建了它。工作流的其余部分（调研、规划、验证）使用 PRD 派生的上下文正常进行。

## 4. 加载 CONTEXT.md

**跳过条件：**使用了 PRD 快速路径（CONTEXT.md 已在步骤 3.5 中创建）。

检查初始化 JSON 中的 `context_path`。

如果 `context_path` 不为 null，显示：`正在使用来自以下位置的阶段上下文：${context_path}`

**如果 `context_path` 为 null（不存在 CONTEXT.md）：**

读取讨论模式以获取上下文门标签：
```bash
DISCUSS_MODE=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow.discuss_mode 2>/dev/null || echo "discuss")
```

如果 `TEXT_MODE` 为 true，以纯文本编号列表呈现：
```
Phase {X} 没有找到 CONTEXT.md。计划将仅使用调研和需求——你的设计偏好不会被包含。

1. 不使用上下文继续——仅使用调研 + 需求进行规划
[如果 DISCUSS_MODE 为 "assumptions":]
2. 收集上下文（假设模式）——在规划前分析代码库并提出假设
[如果 DISCUSS_MODE 为 "discuss" 或未设置:]
2. 先运行 discuss-phase——在规划前捕获设计决策

输入编号：
```

否则使用 AskUserQuestion：
- header: "无上下文"
- question: "Phase {X} 没有找到 CONTEXT.md。计划将仅使用调研和需求——你的设计偏好不会被包含。继续还是先捕获上下文？"
- options:
  - "不使用上下文继续" — 仅使用调研 + 需求进行规划
  如果 `DISCUSS_MODE` 为 `"assumptions"`：
  - "收集上下文（假设模式）" — 在规划前分析代码库并提出假设
  如果 `DISCUSS_MODE` 为 `"discuss"`（或未设置）：
  - "先运行 discuss-phase" — 在规划前捕获设计决策

如果选择"不使用上下文继续"：继续到步骤 5。
如果选择"先运行 discuss-phase"：
  **重要：**不要将 discuss-phase 作为嵌套的 Skill/Task 调用——AskUserQuestion
  在嵌套子上下文中无法正常工作（#1009）。相反，显示命令
  并退出，让用户作为顶层命令运行：
  ```
  请先运行此命令，然后重新运行 /gsd:plan-phase {X} ${GSD_WS}：

  /gsd:discuss-phase {X} ${GSD_WS}
  ```
  **退出 plan-phase 工作流。不要继续。**

## 5. 处理调研

**跳过条件：**`--gaps` 标志或 `--skip-research` 标志或 `--reviews` 标志。

**如果 `has_research` 为 true（来自初始化）且没有 `--research` 标志：**使用现有内容，跳到步骤 6。

**如果缺少 RESEARCH.md 或有 `--research` 标志：**

**如果没有显式标志（`--research` 或 `--skip-research`）且不是 `--auto`：**
询问用户是否进行调研，根据阶段提供上下文化的建议：

如果 `TEXT_MODE` 为 true，以纯文本编号列表呈现：
```
在规划 Phase {X}: {phase_name} 之前进行调研？

1. 先调研（推荐）——在规划前调查领域、模式和依赖关系。最适合新功能、不熟悉的集成或架构变更。
2. 跳过调研——直接从上下文和需求进行规划。最适合缺陷修复、简单重构或已充分了解的任务。

输入编号：
```

否则使用 AskUserQuestion：
```
AskUserQuestion([
  {
    question: "在规划 Phase {X}: {phase_name} 之前进行调研？",
    header: "调研",
    multiSelect: false,
    options: [
      { label: "先调研（推荐）", description: "在规划前调查领域、模式和依赖关系。最适合新功能、不熟悉的集成或架构变更。" },
      { label: "跳过调研", description: "直接从上下文和需求进行规划。最适合缺陷修复、简单重构或已充分了解的任务。" }
    ]
  }
])
```

如果用户选择"跳过调研"：跳到步骤 6。

**如果 `--auto` 且 `research_enabled` 为 false：**静默跳过调研（保留自动化行为）。

显示横幅：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 正在调研阶段 {X}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ 正在生成调研员...
```

### 生成 gsd-phase-researcher

```bash
PHASE_DESC=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" roadmap get-phase "${PHASE}" --pick section)
```

调研提示：

```markdown
<objective>
调研如何实现阶段 {phase_number}: {phase_name}
回答："为了做好此阶段的规划，我需要了解什么？"
</objective>

<files_to_read>
- {context_path}（来自 /gsd:discuss-phase 的用户决策）
- {requirements_path}（项目需求）
- {state_path}（项目决策和历史）
</files_to_read>

${AGENT_SKILLS_RESEARCHER}

<additional_context>
**阶段描述：** {phase_description}
**阶段需求 ID（必须满足）：** {phase_req_ids}

**项目指令：** 如果 ./CLAUDE.md 存在则阅读——遵循项目特定指南
**项目技能：** 检查 .claude/skills/ 或 .agents/skills/ 目录（如果存在）——阅读 SKILL.md 文件，调研应考虑项目技能模式
</additional_context>

<output>
写入到：{phase_dir}/{phase_num}-RESEARCH.md
</output>
```

```
Task(
  prompt=research_prompt,
  subagent_type="gsd-phase-researcher",
  model="{researcher_model}",
  description="调研阶段 {phase}"
)
```

### 处理调研员返回

- **`## RESEARCH COMPLETE`：**显示确认，继续到步骤 6
- **`## RESEARCH BLOCKED`：**显示阻塞原因，提供选项：1) 提供上下文，2) 跳过调研，3) 中止

## 5.5. 创建验证策略

如果 `nyquist_validation_enabled` 为 false 或 `research_enabled` 为 false 则跳过。

如果 `research_enabled` 为 false 且 `nyquist_validation_enabled` 为 true：警告"Nyquist 验证已启用但调研已禁用——没有 RESEARCH.md 无法创建 VALIDATION.md。计划将缺少验证需求（维度 8）。"继续到步骤 6。

**但在以下所有条件都为 true 时，Nyquist 不适用于本次运行：**
- `research_enabled` 为 false
- `has_research` 为 false
- 没有提供 `--research` 标志

在这种情况下：**完全跳过验证策略创建**。不要期望本次运行有 `RESEARCH.md` 或 `VALIDATION.md`，继续到步骤 6。

```bash
grep -l "## Validation Architecture" "${PHASE_DIR}"/*-RESEARCH.md 2>/dev/null || true
```

**如果找到：**
1. 读取模板：`~/.claude/get-shit-done/templates/VALIDATION.md`
2. 写入到 `${PHASE_DIR}/${PADDED_PHASE}-VALIDATION.md`（使用 Write 工具）
3. 填充 frontmatter：`{N}` → 阶段编号，`{phase-slug}` → slug，`{date}` → 当前日期
4. 验证：
```bash
test -f "${PHASE_DIR}/${PADDED_PHASE}-VALIDATION.md" && echo "VALIDATION_CREATED=true" || echo "VALIDATION_CREATED=false"
```
5. 如果 `VALIDATION_CREATED=false`：停止——不要继续到步骤 6
6. 如果 `commit_docs`：`commit "docs(phase-${PHASE}): add validation strategy"`

**如果未找到：**警告并继续——计划可能无法通过维度 8。

## 5.6. UI 设计合约门

> 如果 `.planning/config.json` 中 `workflow.ui_phase` 明确为 `false` 且 `workflow.ui_safety_gate` 明确为 `false` 则跳过。如果键不存在，视为启用。

```bash
UI_PHASE_CFG=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow.ui_phase 2>/dev/null || echo "true")
UI_GATE_CFG=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow.ui_safety_gate 2>/dev/null || echo "true")
```

**如果两者都为 `false`：**跳到步骤 6。

检查阶段是否有前端指标：

```bash
PHASE_SECTION=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" roadmap get-phase "${PHASE}" 2>/dev/null)
echo "$PHASE_SECTION" | grep -iE "UI|interface|frontend|component|layout|page|screen|view|form|dashboard|widget" > /dev/null 2>&1
HAS_UI=$?
```

**如果 `HAS_UI` 为 0（发现前端指标）：**

检查现有 UI-SPEC：
```bash
UI_SPEC_FILE=$(ls "${PHASE_DIR}"/*-UI-SPEC.md 2>/dev/null | head -1)
```

**如果找到 UI-SPEC.md：**设置 `UI_SPEC_PATH=$UI_SPEC_FILE`。显示：`正在使用 UI 设计合约：${UI_SPEC_PATH}`

**如果缺少 UI-SPEC.md 且 `UI_GATE_CFG` 为 `true`：**

如果 `TEXT_MODE` 为 true，以纯文本编号列表呈现：
```
Phase {N} 有前端指标但没有 UI-SPEC.md。在规划前生成设计合约？

1. 先生成 UI-SPEC——运行 /gsd:ui-phase {N} 然后重新运行 /gsd:plan-phase {N}
2. 不使用 UI-SPEC 继续
3. 这不是前端阶段

输入编号：
```

否则使用 AskUserQuestion：
- header: "UI 设计合约"
- question: "Phase {N} 有前端指标但没有 UI-SPEC.md。在规划前生成设计合约？"
- options:
  - "先生成 UI-SPEC" → 显示："运行 `/gsd:ui-phase {N} ${GSD_WS}` 然后重新运行 `/gsd:plan-phase {N} ${GSD_WS}`"。退出工作流。
  - "不使用 UI-SPEC 继续" → 继续到步骤 6。
  - "这不是前端阶段" → 继续到步骤 6。

**如果 `HAS_UI` 为 1（无前端指标）：**静默跳到步骤 6。

## 6. 检查现有计划

```bash
ls "${PHASE_DIR}"/*-PLAN.md 2>/dev/null || true
```

**如果存在且有 `--reviews` 标志：**跳过提示——直接进入重新规划（`--reviews` 的目的是使用审查反馈重新规划）。

**如果存在且没有 `--reviews` 标志：**提供选项：1) 添加更多计划，2) 查看现有计划，3) 从头重新规划。

## 7. 使用来自 INIT 的上下文路径

从 INIT JSON 提取：

```bash
_gsd_field() { node -e "const o=JSON.parse(process.argv[1]); const v=o[process.argv[2]]; process.stdout.write(v==null?'':String(v))" "$1" "$2"; }
STATE_PATH=$(_gsd_field "$INIT" state_path)
ROADMAP_PATH=$(_gsd_field "$INIT" roadmap_path)
REQUIREMENTS_PATH=$(_gsd_field "$INIT" requirements_path)
RESEARCH_PATH=$(_gsd_field "$INIT" research_path)
VERIFICATION_PATH=$(_gsd_field "$INIT" verification_path)
UAT_PATH=$(_gsd_field "$INIT" uat_path)
CONTEXT_PATH=$(_gsd_field "$INIT" context_path)
REVIEWS_PATH=$(_gsd_field "$INIT" reviews_path)
```

## 7.5. 验证 Nyquist 产物

如果 `nyquist_validation_enabled` 为 false 或 `research_enabled` 为 false 则跳过。

如果以下所有条件都为 true 也跳过：
- `research_enabled` 为 false
- `has_research` 为 false
- 没有提供 `--research` 标志

在无调研路径中，本次运行**不需要** Nyquist 产物。

```bash
VALIDATION_EXISTS=$(ls "${PHASE_DIR}"/*-VALIDATION.md 2>/dev/null | head -1)
```

如果缺失且 Nyquist 仍然启用/适用——询问用户：
1. 重新运行：`/gsd:plan-phase {PHASE} --research ${GSD_WS}`
2. 使用以下确切命令禁用 Nyquist：
   `node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-set workflow.nyquist_validation false`
3. 仍然继续（计划将无法通过维度 8）

仅当用户选择 2 或 3 时继续到步骤 8。

## 8. 生成 gsd-planner 代理

显示横幅：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 正在规划阶段 {X}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ 正在生成规划器...
```

规划器提示：

```markdown
<planning_context>
**阶段：** {phase_number}
**模式：** {standard | gap_closure | reviews}

<files_to_read>
- {state_path}（项目状态）
- {roadmap_path}（路线图）
- {requirements_path}（需求）
- {context_path}（来自 /gsd:discuss-phase 的用户决策）
- {research_path}（技术调研）
- {verification_path}（验证差距——如果 --gaps）
- {uat_path}（UAT 差距——如果 --gaps）
- {reviews_path}（跨 AI 审查反馈——如果 --reviews）
- {UI_SPEC_PATH}（UI 设计合约——视觉/交互规格，如果存在）
</files_to_read>

${AGENT_SKILLS_PLANNER}

**阶段需求 ID（每个 ID 必须出现在某个计划的 `requirements` 字段中）：** {phase_req_ids}

**项目指令：** 如果 ./CLAUDE.md 存在则阅读——遵循项目特定指南
**项目技能：** 检查 .claude/skills/ 或 .agents/skills/ 目录（如果存在）——阅读 SKILL.md 文件，计划应考虑项目技能规则
</planning_context>

<downstream_consumer>
输出由 /gsd:execute-phase 消费。计划需要：
- Frontmatter（wave、depends_on、files_modified、autonomous）
- XML 格式的任务，包含 read_first 和 acceptance_criteria 字段（每个任务必须有）
- 验证标准
- 用于目标反向验证的 must_haves
</downstream_consumer>

<deep_work_rules>
## 反浅执行规则（必须遵守）

每个任务必须包含以下字段——它们不是可选的：

1. **`<read_first>`** — 执行者在修改任何内容之前必须阅读的文件。始终包括：
   - 被修改的文件（这样执行者能看到当前状态，而非假设）
   - CONTEXT.md 中引用的任何"权威来源"文件（参考实现、现有模式、配置文件、schema）
   - 必须复制或遵循其模式、签名、类型或约定的任何文件

2. **`<acceptance_criteria>`** — 可验证的条件，证明任务已正确完成。规则：
   - 每个标准必须可以通过 grep、文件读取、测试命令或 CLI 输出来检查
   - 永远不要使用主观语言（"看起来正确"、"正确配置"、"与...一致"）
   - 始终包含必须存在的确切字符串、模式、值或命令输出
   - 示例：
     - 代码：`auth.py contains def verify_token(` / `test_auth.py exits 0`
     - 配置：`.env.example contains DATABASE_URL=` / `Dockerfile contains HEALTHCHECK`
     - 文档：`README.md contains '## Installation'` / `API.md lists all endpoints`
     - 基础设施：`deploy.yml has rollback step` / `docker-compose.yml has healthcheck for db`

3. **`<action>`** — 必须包含具体值，而非引用。规则：
   - 永远不要说"将 X 与 Y 对齐"、"使 X 与 Y 匹配"、"更新为一致"而不指定确切的目标状态
   - 始终包含实际值：配置键、函数签名、SQL 语句、类名、导入路径、环境变量等
   - 如果 CONTEXT.md 有比较表或期望值，将它们逐字复制到 action 中
   - 执行者应该能够仅从 action 文本完成任务，无需阅读 CONTEXT.md 或参考文件（read_first 用于验证，而非发现）

**为何重要：**执行代理根据计划文本工作。"更新配置以匹配生产环境"这样的模糊指令会产生浅层的单行更改。"添加 DATABASE_URL=postgresql://...，设置 POOL_SIZE=20，添加 REDIS_URL=redis://..."这样的具体指令会产生完整的工作。详细计划的成本远低于重做浅层执行的成本。
</deep_work_rules>

<quality_gate>
- [ ] 在阶段目录中创建了 PLAN.md 文件
- [ ] 每个计划都有有效的 frontmatter
- [ ] 任务是具体且可操作的
- [ ] 每个任务都有 `<read_first>`，至少包含被修改的文件
- [ ] 每个任务都有 `<acceptance_criteria>`，包含可用 grep 验证的条件
- [ ] 每个 `<action>` 包含具体值（没有不指定内容的"将 X 与 Y 对齐"）
- [ ] 依赖关系已正确识别
- [ ] 已分配波次用于并行执行
- [ ] must_haves 从阶段目标推导而来
</quality_gate>
```

```
Task(
  prompt=filled_prompt,
  subagent_type="gsd-planner",
  model="{planner_model}",
  description="规划阶段 {phase}"
)
```

## 9. 处理规划器返回

- **`## PLANNING COMPLETE`：**显示计划数量。如果 `--skip-verify` 或 `plan_checker_enabled` 为 false（来自初始化）：跳到步骤 13。否则：步骤 10。
- **`## CHECKPOINT REACHED`：**呈现给用户，获取响应，启动延续（步骤 12）
- **`## PLANNING INCONCLUSIVE`：**显示尝试次数，提供选项：添加上下文 / 重试 / 手动

## 10. 生成 gsd-plan-checker 代理

显示横幅：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 正在验证计划
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ 正在生成计划检查器...
```

检查器提示：

```markdown
<verification_context>
**阶段：** {phase_number}
**阶段目标：** {ROADMAP 中的 goal}

<files_to_read>
- {PHASE_DIR}/*-PLAN.md（待验证的计划）
- {roadmap_path}（路线图）
- {requirements_path}（需求）
- {context_path}（来自 /gsd:discuss-phase 的用户决策）
- {research_path}（技术调研——包含验证架构）
</files_to_read>

${AGENT_SKILLS_CHECKER}

**阶段需求 ID（必须全部覆盖）：** {phase_req_ids}

**项目指令：** 如果 ./CLAUDE.md 存在则阅读——验证计划是否遵循项目指南
**项目技能：** 检查 .claude/skills/ 或 .agents/skills/ 目录（如果存在）——验证计划是否考虑了项目技能规则
</verification_context>

<expected_output>
- ## VERIFICATION PASSED — 所有检查通过
- ## ISSUES FOUND — 结构化的问题列表
</expected_output>
```

```
Task(
  prompt=checker_prompt,
  subagent_type="gsd-plan-checker",
  model="{checker_model}",
  description="验证阶段 {phase} 的计划"
)
```

## 11. 处理检查器返回

- **`## VERIFICATION PASSED`：**显示确认，继续到步骤 13。
- **`## ISSUES FOUND`：**显示问题，检查迭代计数，继续到步骤 12。

## 12. 修订循环（最多 3 次迭代）

跟踪 `iteration_count`（初始计划 + 检查后从 1 开始）。

**如果 iteration_count < 3：**

显示：`正在发回规划器进行修订...（迭代 {N}/3）`

修订提示：

```markdown
<revision_context>
**阶段：** {phase_number}
**模式：** revision

<files_to_read>
- {PHASE_DIR}/*-PLAN.md（现有计划）
- {context_path}（来自 /gsd:discuss-phase 的用户决策）
</files_to_read>

${AGENT_SKILLS_PLANNER}

**检查器问题：** {structured_issues_from_checker}
</revision_context>

<instructions>
进行有针对性的更新以解决检查器问题。
除非问题是根本性的，否则不要从头重新规划。
返回变更内容。
</instructions>
```

```
Task(
  prompt=revision_prompt,
  subagent_type="gsd-planner",
  model="{planner_model}",
  description="修订阶段 {phase} 的计划"
)
```

规划器返回后 -> 再次生成检查器（步骤 10），递增 iteration_count。

**如果 iteration_count >= 3：**

显示：`已达到最大迭代次数。{N} 个问题仍然存在：` + 问题列表

提供选项：1) 强制继续，2) 提供指导并重试，3) 放弃

## 13. 需求覆盖率门

计划通过检查器后（或检查器被跳过），验证所有阶段需求是否被至少一个计划覆盖。

**跳过条件：**`phase_req_ids` 为 null 或 TBD（没有需求映射到此阶段）。

**步骤 1：提取计划声明的需求 ID**
```bash
# 从计划 frontmatter 收集所有需求 ID
PLAN_REQS=$(grep -h "requirements_addressed\|requirements:" ${PHASE_DIR}/*-PLAN.md 2>/dev/null | tr -d '[]' | tr ',' '\n' | sed 's/^[[:space:]]*//' | sort -u)
```

**步骤 2：与路线图中的阶段需求进行比较**

对于 `phase_req_ids` 中的每个 REQ-ID：
- 如果 REQ-ID 出现在 `PLAN_REQS` 中 → 已覆盖 ✓
- 如果 REQ-ID 未出现在任何计划中 → 未覆盖 ✗

**步骤 3：检查 CONTEXT.md 功能是否在计划目标中**

读取 CONTEXT.md 的 `<decisions>` 部分。提取功能/能力名称。检查每个是否在计划 `<objective>` 块中。未在任何计划目标中提到的功能 → 可能被遗漏。

**步骤 4：报告**

如果所有需求已覆盖且没有遗漏功能：
```
✓ 需求覆盖率：{N}/{N} 个 REQ-ID 被计划覆盖
```
→ 继续到步骤 14。

如果发现差距：
```
## ⚠ 需求覆盖率差距

{M} 个（共 {N} 个）阶段需求未分配给任何计划：

| REQ-ID | 描述 | 计划 |
|--------|-------------|-------|
| {id} | {来自 REQUIREMENTS.md} | 无 |

{K} 个 CONTEXT.md 功能未在计划目标中找到：
- {feature_name} — 在 CONTEXT.md 中描述但没有计划覆盖

选项：
1. 重新规划以包含缺失需求（推荐）
2. 将未覆盖的需求移至下一阶段
3. 仍然继续——接受覆盖率差距
```

如果 `TEXT_MODE` 为 true，以纯文本编号列表呈现（选项已在上面的块中显示）。否则使用 AskUserQuestion 呈现选项。

## 14. 呈现最终状态

路由到 `<offer_next>` 或 `auto_advance`，取决于标志/配置。

## 15. 自动推进检查

检查自动推进触发器：

1. 从 $ARGUMENTS 解析 `--auto` 标志
2. **将链标志与意图同步** — 如果用户手动调用（没有 `--auto`），清除之前中断的 `--auto` 链的临时链标志。这不会影响 `workflow.auto_advance`（用户的持久设置偏好）：
   ```bash
   if [[ ! "$ARGUMENTS" =~ --auto ]]; then
     node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-set workflow._auto_chain_active false 2>/dev/null
   fi
   ```
3. 同时读取链标志和用户偏好：
   ```bash
   AUTO_CHAIN=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow._auto_chain_active 2>/dev/null || echo "false")
   AUTO_CFG=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow.auto_advance 2>/dev/null || echo "false")
   ```

**如果存在 `--auto` 标志或 `AUTO_CHAIN` 为 true 或 `AUTO_CFG` 为 true：**

显示横幅：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 自动推进到执行
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

计划就绪。正在启动 execute-phase...
```

使用 Skill 工具启动 execute-phase，以避免嵌套 Task 会话（由于深层代理嵌套会导致运行时冻结）：
```
Skill(skill="gsd:execute-phase", args="${PHASE} --auto --no-transition ${GSD_WS}")
```

`--no-transition` 标志告诉 execute-phase 在验证后返回状态，而不是继续链接。这保持自动推进链扁平化——每个阶段在同一嵌套层级运行，而不是生成更深层的 Task 代理。

**处理 execute-phase 返回：**
- **PHASE COMPLETE** → 显示最终摘要：
  ```
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   GSD ► 阶段 ${PHASE} 完成 ✓
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  自动推进流水线已完成。

  下一步：/gsd:discuss-phase ${NEXT_PHASE} --auto ${GSD_WS}
  ```
- **GAPS FOUND / VERIFICATION FAILED** → 显示结果，停止链：
  ```
  自动推进已停止：执行需要审查。

  请审查上方的输出并手动继续：
  /gsd:execute-phase ${PHASE} ${GSD_WS}
  ```

**如果既没有 `--auto` 也没有配置启用：**
路由到 `<offer_next>`（现有行为）。

</process>

<offer_next>
直接输出此 markdown（不作为代码块）：

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 阶段 {X} 已规划 ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**阶段 {X}: {Name}** — {N} 个计划，{M} 个波次

| 波次 | 计划 | 构建内容 |
|------|-------|----------------|
| 1    | 01, 02 | [目标] |
| 2    | 03     | [目标]  |

调研：{已完成 | 使用现有 | 已跳过}
验证：{已通过 | 已通过（带覆盖） | 已跳过}

───────────────────────────────────────────────────────────────

## ▶ 下一步

**执行阶段 {X}** — 运行全部 {N} 个计划

/gsd:execute-phase {X} ${GSD_WS}

<sub>/clear 先清理 → 全新的上下文窗口</sub>

───────────────────────────────────────────────────────────────

**其他可用操作：**
- cat .planning/phases/{phase-dir}/*-PLAN.md — 审查计划
- /gsd:plan-phase {X} --research — 先重新调研
- /gsd:review --phase {X} --all — 使用外部 AI 对计划进行同行审查
- /gsd:plan-phase {X} --reviews — 纳入审查反馈重新规划

───────────────────────────────────────────────────────────────
</offer_next>

<windows_troubleshooting>
**Windows 用户：**如果 plan-phase 在生成代理期间冻结（在 Windows 上常见，因为 MCP 服务器的
stdio 死锁——参见 Claude Code issue anthropics/claude-code#28126）：

1. **强制终止：**关闭终端（Ctrl+C 可能不起作用）
2. **清理孤立进程：**
   ```powershell
   # 终止来自过期 MCP 服务器的孤立 node 进程
   Get-Process node -ErrorAction SilentlyContinue | Where-Object {$_.StartTime -lt (Get-Date).AddHours(-1)} | Stop-Process -Force
   ```
3. **清理过期的任务目录：**
   ```powershell
   # 删除过期的子代理任务目录（Claude Code 在崩溃时从不清理这些）
   Remove-Item -Recurse -Force "$env:USERPROFILE\.claude\tasks\*" -ErrorAction SilentlyContinue
   ```
4. **减少 MCP 服务器数量：**在 settings.json 中临时禁用非必要的 MCP 服务器
5. **重试：**重启 Claude Code 并再次运行 `/gsd:plan-phase`

如果冻结持续存在，尝试 `--skip-research` 将代理链从 3 个减少到 2 个：
```
/gsd:plan-phase N --skip-research
```
</windows_troubleshooting>

<success_criteria>
- [ ] .planning/ 目录已验证
- [ ] 阶段已通过路线图验证
- [ ] 阶段目录已创建（如需要）
- [ ] CONTEXT.md 已提前加载（步骤 4）并传递给所有代理
- [ ] 调研已完成（除非 --skip-research 或 --gaps 或已存在）
- [ ] gsd-phase-researcher 已使用 CONTEXT.md 生成
- [ ] 已检查现有计划
- [ ] gsd-planner 已使用 CONTEXT.md + RESEARCH.md 生成
- [ ] 计划已创建（PLANNING COMPLETE 或 CHECKPOINT 已处理）
- [ ] gsd-plan-checker 已使用 CONTEXT.md 生成
- [ ] 验证已通过或用户覆盖或达到最大迭代次数并由用户决定
- [ ] 用户在代理生成之间看到状态
- [ ] 用户知道后续步骤
</success_criteria>
</output>
