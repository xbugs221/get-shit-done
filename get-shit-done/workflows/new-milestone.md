<purpose>

为现有项目启动新的里程碑周期。加载项目上下文，收集里程碑目标（从 MILESTONE-CONTEXT.md 或对话中），更新 PROJECT.md 和 STATE.md，可选运行并行调研，定义带有 REQ-ID 的范围需求，生成路线图规划 agent 以创建分阶段执行计划，并提交所有产物。等同于 new-project 的存量项目版本。

</purpose>

<required_reading>

在开始之前，阅读调用提示的 execution_context 中引用的所有文件。

</required_reading>

<available_agent_types>
有效的 GSD 子 agent 类型（使用精确名称 — 不要回退到 'general-purpose'）：
- gsd-project-researcher — 调研项目级技术决策
- gsd-research-synthesizer — 综合并行调研 agent 的发现
- gsd-roadmapper — 创建分阶段执行路线图
</available_agent_types>

<process>

## 1. 加载上下文

在做任何其他事情之前先解析 `$ARGUMENTS`：
- `--reset-phase-numbers` 标志 → 选择将路线图阶段编号从 `1` 重新开始
- 剩余文本 → 如果存在则用作里程碑名称

如果标志不存在，保持当前行为，即从上一个里程碑继续阶段编号。

- 读取 PROJECT.md（现有项目、已验证的需求、决策）
- 读取 MILESTONES.md（之前发布的内容）
- 读取 STATE.md（待办事项、阻塞项）
- 检查 MILESTONE-CONTEXT.md（来自 /gsd:discuss-milestone）

## 2. 收集里程碑目标

**如果 MILESTONE-CONTEXT.md 存在：**
- 使用 discuss-milestone 中的功能和范围
- 呈现摘要以供确认

**如果没有上下文文件：**
- 展示上一个里程碑中发布的内容
- 内联询问（自由输入，非 AskUserQuestion）："你接下来想构建什么？"
- 等待他们的回复，然后使用 AskUserQuestion 探究具体细节
- 如果用户在任何时候选择"其他"来提供自由输入，以纯文本形式进行后续追问 — 而不是再次使用 AskUserQuestion

## 3. 确定里程碑版本

- 从 MILESTONES.md 解析上一个版本
- 建议下一个版本（v1.0 → v1.1，或 v2.0 表示主要版本）
- 与用户确认

## 3.5. 验证里程碑理解

在写入任何文件之前，呈现收集到的内容摘要并要求确认。

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 里程碑摘要
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**里程碑 v[X.Y]：[名称]**

**目标：** [一句话描述]

**目标功能：**
- [功能 1]
- [功能 2]
- [功能 3]

**关键上下文：** [来自提问的任何重要约束、决策或注释]
```

AskUserQuestion：
- header: "确认？"
- question: "这是否准确反映了你想在这个里程碑中构建的内容？"
- options：
  - "没问题" — 继续写入 PROJECT.md
  - "调整" — 让我修正或添加细节

**如果选择"调整"：** 询问需要更改的内容（纯文本，非 AskUserQuestion）。合并更改，重新呈现摘要。循环直到选择"没问题"。

**如果选择"没问题"：** 继续到步骤 4。

## 4. 更新 PROJECT.md

添加/更新：

```markdown
## 当前里程碑：v[X.Y] [名称]

**目标：** [描述里程碑重点的一句话]

**目标功能：**
- [功能 1]
- [功能 2]
- [功能 3]
```

更新活跃需求部分和"最后更新"页脚。

确保 PROJECT.md 中存在 `## 演进` 部分。如果缺失（在此功能之前创建的项目），在页脚之前添加：

```markdown
## 演进

本文档在阶段转换和里程碑边界时演进。

**每次阶段转换后**（通过 `/gsd:transition`）：
1. 需求失效了？→ 移至超出范围并注明原因
2. 需求已验证？→ 移至已验证并注明阶段引用
3. 出现新需求？→ 添加到活跃需求
4. 需要记录决策？→ 添加到关键决策
5. "这是什么"仍然准确？→ 如有偏离则更新

**每个里程碑后**（通过 `/gsd:complete-milestone`）：
1. 全面审查所有部分
2. 核心价值检查 — 仍然是正确的优先级吗？
3. 审计超出范围 — 原因仍然成立吗？
4. 用当前状态更新上下文
```

## 5. 更新 STATE.md

```markdown
## 当前位置

阶段：未开始（定义需求中）
计划：—
状态：定义需求中
最后活动：[今天] — 里程碑 v[X.Y] 已启动
```

保留上一个里程碑的累积上下文部分。

## 6. 清理并提交

如果存在则删除 MILESTONE-CONTEXT.md（已消费）。

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs: start milestone v[X.Y] [Name]" --files .planning/PROJECT.md .planning/STATE.md
```

## 7. 加载上下文并解析模型

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init new-milestone)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
AGENT_SKILLS_RESEARCHER=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-project-researcher 2>/dev/null)
AGENT_SKILLS_SYNTHESIZER=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-synthesizer 2>/dev/null)
AGENT_SKILLS_ROADMAPPER=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-roadmapper 2>/dev/null)
```

从初始化 JSON 中提取：`researcher_model`、`synthesizer_model`、`roadmapper_model`、`commit_docs`、`research_enabled`、`current_milestone`、`project_exists`、`roadmap_exists`、`latest_completed_milestone`、`phase_dir_count`、`phase_archive_path`。

## 7.5 重置阶段安全检查（仅当 `--reset-phase-numbers` 时）

如果 `--reset-phase-numbers` 已激活：

1. 将即将到来的路线图的起始阶段编号设置为 `1`。
2. 如果 `phase_dir_count > 0`，在路线图规划之前归档旧的阶段目录，以确保新的 `01-*` / `02-*` 目录不会与过时的里程碑目录冲突。

如果 `phase_dir_count > 0` 且 `phase_archive_path` 可用：

```bash
mkdir -p "${phase_archive_path}"
find .planning/phases -mindepth 1 -maxdepth 1 -type d -exec mv {} "${phase_archive_path}/" \;
```

然后验证 `.planning/phases/` 中不再包含旧的里程碑目录后再继续。

如果 `phase_dir_count > 0` 但 `phase_archive_path` 缺失：
- 停止并说明在没有已完成的里程碑归档目标的情况下重置编号是不安全的。
- 告诉用户先完成/归档上一个里程碑，然后重新运行 `/gsd:new-milestone --reset-phase-numbers ${GSD_WS}`。

## 8. 调研决策

从初始化 JSON 中检查 `research_enabled`（从配置加载）。

**如果 `research_enabled` 为 `true`：**

AskUserQuestion："在定义需求之前，是否要先调研新功能的领域生态系统？"
- "先调研（推荐）" — 为新能力发现模式、功能、架构
- "本次里程碑跳过调研" — 直接进入需求（不更改你的默认设置）

**如果 `research_enabled` 为 `false`：**

AskUserQuestion："在定义需求之前，是否要先调研新功能的领域生态系统？"
- "跳过调研（当前默认）" — 直接进入需求
- "先调研" — 为新能力发现模式、功能、架构

**重要：** 不要将此选择持久化到 config.json。`workflow.research` 设置是一个持久的用户偏好，控制整个项目的 plan-phase 行为。在此处更改它会静默地改变未来 `/gsd:plan-phase` 的行为。要更改默认设置，请使用 `/gsd:settings`。

**如果用户选择了"先调研"：**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 正在调研
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ 并行生成 4 个调研员...
  → 技术栈、功能、架构、陷阱
```

```bash
mkdir -p .planning/research
```

并行生成 4 个 gsd-project-researcher agent。每个使用此模板及维度特定字段：

**所有 4 个调研员的通用结构：**
```
Task(prompt="
<research_type>项目调研 — [新功能]的{DIMENSION}。</research_type>

<milestone_context>
后续里程碑 — 为现有应用添加[目标功能]。
{EXISTING_CONTEXT}
仅关注新功能所需的内容。
</milestone_context>

<question>{QUESTION}</question>

<files_to_read>
- .planning/PROJECT.md（项目上下文）
</files_to_read>

${AGENT_SKILLS_RESEARCHER}

<downstream_consumer>{CONSUMER}</downstream_consumer>

<quality_gate>{GATES}</quality_gate>

<output>
写入：.planning/research/{FILE}
使用模板：~/.claude/get-shit-done/templates/research-project/{FILE}
</output>
", subagent_type="gsd-project-researcher", model="{researcher_model}", description="{DIMENSION} 调研")
```

**维度特定字段：**

| 字段 | 技术栈 | 功能 | 架构 | 陷阱 |
|------|--------|------|------|------|
| EXISTING_CONTEXT | 现有已验证能力（不要重新调研）：[来自 PROJECT.md] | 现有功能（已构建）：[来自 PROJECT.md] | 现有架构：[来自 PROJECT.md 或代码库映射] | 关注向现有系统添加这些功能时的常见错误 |
| QUESTION | [新功能]需要什么技术栈添加/更改？ | [目标功能]通常如何工作？预期行为？ | [目标功能]如何与现有架构集成？ | 向[领域]添加[目标功能]时的常见错误？ |
| CONSUMER | 新能力所需的特定库及版本、集成点、不要添加什么 | 基础功能 vs 差异化功能 vs 反功能，标注复杂度，已有功能的依赖 | 集成点、新组件、数据流变更、建议的构建顺序 | 警告信号、预防策略、应在哪个阶段处理 |
| GATES | 版本最新（通过 Context7 验证）、说明了原因、考虑了集成 | 分类清晰、标注了复杂度、识别了依赖 | 识别了集成点、明确了新增 vs 修改、构建顺序考虑了依赖 | 陷阱针对添加这些功能、覆盖了集成陷阱、预防可操作 |
| FILE | STACK.md | FEATURES.md | ARCHITECTURE.md | PITFALLS.md |

4 个全部完成后，生成综合器：

```
Task(prompt="
将调研输出综合为 SUMMARY.md。

<files_to_read>
- .planning/research/STACK.md
- .planning/research/FEATURES.md
- .planning/research/ARCHITECTURE.md
- .planning/research/PITFALLS.md
</files_to_read>

${AGENT_SKILLS_SYNTHESIZER}

写入：.planning/research/SUMMARY.md
使用模板：~/.claude/get-shit-done/templates/research-project/SUMMARY.md
写入后提交。
", subagent_type="gsd-research-synthesizer", model="{synthesizer_model}", description="综合调研")
```

展示 SUMMARY.md 中的关键发现：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 调研完成 ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**技术栈补充：** [来自 SUMMARY.md]
**功能基础项：** [来自 SUMMARY.md]
**注意事项：** [来自 SUMMARY.md]
```

**如果"跳过调研"：** 继续到步骤 9。

## 9. 定义需求

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 定义需求
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

读取 PROJECT.md：核心价值、当前里程碑目标、已验证需求（现有内容）。

**如果调研已存在：** 读取 FEATURES.md，提取功能分类。

按分类呈现功能：
```
## [分类 1]
**基础功能：** 功能 A、功能 B
**差异化功能：** 功能 C、功能 D
**调研备注：** [任何相关注释]
```

**如果没有调研：** 通过对话收集需求。询问："[新功能]的用户主要需要做什么？"澄清、探索相关能力、按分类分组。

**确定每个分类的范围** 通过 AskUserQuestion（multiSelect: true，header 最多 12 个字符）：
- "[功能 1]" — [简要描述]
- "[功能 2]" — [简要描述]
- "本里程碑不包含" — 推迟整个分类

跟踪：已选 → 本里程碑。未选的基础功能 → 未来。未选的差异化功能 → 超出范围。

**识别差距** 通过 AskUserQuestion：
- "不，调研已覆盖" — 继续
- "是的，让我补充一些" — 捕获补充内容

**生成 REQUIREMENTS.md：**
- v1 需求按分类分组（复选框、REQ-ID）
- 未来需求（已推迟）
- 超出范围（明确排除及原因）
- 追溯部分（空白，由路线图填充）

**REQ-ID 格式：** `[分类]-[编号]`（AUTH-01、NOTIF-02）。从现有编号继续。

**需求质量标准：**

好的需求应该是：
- **具体且可测试的：** "用户可以通过邮件链接重置密码"（而非"处理密码重置"）
- **以用户为中心的：** "用户可以 X"（而非"系统执行 Y"）
- **原子性的：** 每个需求一个能力（而非"用户可以登录并管理个人资料"）
- **独立的：** 对其他需求的依赖最少

呈现完整的需求列表以供确认：

```
## 里程碑 v[X.Y] 需求

### [分类 1]
- [ ] **CAT1-01**：用户可以做 X
- [ ] **CAT1-02**：用户可以做 Y

### [分类 2]
- [ ] **CAT2-01**：用户可以做 Z

这是否反映了你正在构建的内容？（是 / 调整）
```

如果"调整"：返回范围确定。

**提交需求：**
```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs: define milestone v[X.Y] requirements" --files .planning/REQUIREMENTS.md
```

## 10. 创建路线图

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 创建路线图
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ 正在生成路线图规划器...
```

**起始阶段编号：**
- 如果 `--reset-phase-numbers` 已激活，从**阶段 1** 开始
- 否则，从上一个里程碑的最后阶段编号继续（v1.0 在阶段 5 结束 → v1.1 从阶段 6 开始）

```
Task(prompt="
<planning_context>
<files_to_read>
- .planning/PROJECT.md
- .planning/REQUIREMENTS.md
- .planning/research/SUMMARY.md（如果存在）
- .planning/config.json
- .planning/MILESTONES.md
</files_to_read>

${AGENT_SKILLS_ROADMAPPER}

</planning_context>

<instructions>
为里程碑 v[X.Y] 创建路线图：
1. 遵循选定的编号模式：
   - `--reset-phase-numbers` → 从阶段 1 开始
   - 默认行为 → 从上一个里程碑的最后阶段编号继续
2. 仅从本里程碑的需求推导阶段
3. 将每个需求映射到恰好一个阶段
4. 为每个阶段推导 2-5 个成功标准（可观察的用户行为）
5. 验证 100% 覆盖率
6. 立即写入文件（ROADMAP.md、STATE.md、更新 REQUIREMENTS.md 追溯）
7. 返回 ROADMAP CREATED 及摘要

先写入文件，然后返回。
</instructions>
", subagent_type="gsd-roadmapper", model="{roadmapper_model}", description="创建路线图")
```

**处理返回：**

**如果 `## ROADMAP BLOCKED`：** 呈现阻塞项，与用户协作，重新生成。

**如果 `## ROADMAP CREATED`：** 读取 ROADMAP.md，内联呈现：

```
## 建议的路线图

**[N] 个阶段** | **[X] 个需求已映射** | 全部覆盖 ✓

| # | 阶段 | 目标 | 需求 | 成功标准 |
|---|------|------|------|----------|
| [N] | [名称] | [目标] | [REQ-ID] | [数量] |

### 阶段详情

**阶段 [N]：[名称]**
目标：[目标]
需求：[REQ-ID]
成功标准：
1. [标准]
2. [标准]
```

**请求批准** 通过 AskUserQuestion：
- "批准" — 提交并继续
- "调整阶段" — 告诉我需要更改什么
- "查看完整文件" — 显示原始 ROADMAP.md

**如果"调整"：** 获取备注，使用修改上下文重新生成路线图规划器，循环直到获得批准。
**如果"查看"：** 显示原始 ROADMAP.md，重新询问。

**提交路线图**（批准后）：
```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs: create milestone v[X.Y] roadmap ([N] phases)" --files .planning/ROADMAP.md .planning/STATE.md .planning/REQUIREMENTS.md
```

## 11. 完成

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 里程碑已初始化 ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**里程碑 v[X.Y]：[名称]**

| 产物           | 位置                        |
|----------------|-----------------------------|
| 项目           | `.planning/PROJECT.md`      |
| 调研           | `.planning/research/`       |
| 需求           | `.planning/REQUIREMENTS.md` |
| 路线图         | `.planning/ROADMAP.md`      |

**[N] 个阶段** | **[X] 个需求** | 准备构建 ✓

## ▶ 下一步

**阶段 [N]：[阶段名称]** — [目标]

`/gsd:discuss-phase [N] ${GSD_WS}` — 收集上下文并澄清方法

<sub>`/clear` 先清除 → 全新的上下文窗口</sub>

另外：`/gsd:plan-phase [N] ${GSD_WS}` — 跳过讨论，直接规划
```

</process>

<success_criteria>
- [ ] PROJECT.md 已更新当前里程碑部分
- [ ] STATE.md 已为新里程碑重置
- [ ] MILESTONE-CONTEXT.md 已消费并删除（如果存在）
- [ ] 调研已完成（如果选择） — 4 个并行 agent，感知里程碑
- [ ] 需求已按分类收集和确定范围
- [ ] REQUIREMENTS.md 已创建并包含 REQ-ID
- [ ] 已生成 gsd-roadmapper 并带有阶段编号上下文
- [ ] 路线图文件已立即写入（非草稿）
- [ ] 用户反馈已合并（如果有）
- [ ] 阶段编号模式已遵循（继续或重置）
- [ ] 所有提交已完成（如果规划文档已提交）
- [ ] 用户知道下一步：`/gsd:discuss-phase [N] ${GSD_WS}`

**原子提交：** 每个阶段立即提交其产物。
</success_criteria>
</output>
