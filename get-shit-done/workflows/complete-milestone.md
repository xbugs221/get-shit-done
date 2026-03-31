<purpose>

将已发布的版本（v1.0、v1.1、v2.0）标记为完成。在 MILESTONES.md 中创建历史记录，执行完整的 PROJECT.md 演进审查，使用里程碑分组重新组织 ROADMAP.md，并在 git 中创建发布标签。

</purpose>

<required_reading>

1. templates/milestone.md
2. templates/milestone-archive.md
3. `.planning/ROADMAP.md`
4. `.planning/REQUIREMENTS.md`
5. `.planning/PROJECT.md`

</required_reading>

<archival_behavior>

当里程碑完成时：

1. 将完整的里程碑详情提取到 `.planning/milestones/v[X.Y]-ROADMAP.md`
2. 将需求归档到 `.planning/milestones/v[X.Y]-REQUIREMENTS.md`
3. 更新 ROADMAP.md — 用一行摘要替换里程碑详情
4. 删除 REQUIREMENTS.md（为下一个里程碑准备新的）
5. 执行完整的 PROJECT.md 演进审查
6. 提供内联创建下一个里程碑的选项
7. 将 UI 产物（`*-UI-SPEC.md`、`*-UI-REVIEW.md`）与其他阶段文档一起归档
8. 清理 `.planning/ui-reviews/` 截图文件（二进制资产，不归档）

**上下文效率：** 归档使 ROADMAP.md 保持恒定大小，REQUIREMENTS.md 保持里程碑范围。

**ROADMAP 归档**使用 `templates/milestone-archive.md` — 包括里程碑头部（状态、阶段、日期）、完整阶段详情、里程碑摘要（决策、问题、技术债务）。

**REQUIREMENTS 归档**包含所有标记为完成的需求及其结果、带有最终状态的可追溯性表格、关于已更改需求的说明。

</archival_behavior>

<process>

<step name="verify_readiness">

**使用 `roadmap analyze` 进行全面就绪检查：**

```bash
ROADMAP=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" roadmap analyze)
```

这将返回所有阶段及其计划/摘要计数和磁盘状态。使用此来验证：
- 哪些阶段属于此里程碑？
- 所有阶段都完成了吗（所有计划都有摘要）？检查每个阶段的 `disk_status === 'complete'`。
- `progress_percent` 应该为 100%。

**需求完成检查（展示前必须执行）：**

解析 REQUIREMENTS.md 可追溯性表格：
- 统计总 v1 需求数与已勾选（`[x]`）需求数
- 识别可追溯性表格中任何非 Complete 的行

展示：

```
Milestone: [Name, e.g., "v1.0 MVP"]

Includes:
- Phase 1: Foundation (2/2 plans complete)
- Phase 2: Authentication (2/2 plans complete)
- Phase 3: Core Features (3/3 plans complete)
- Phase 4: Polish (1/1 plan complete)

Total: {phase_count} phases, {total_plans} plans, all complete
Requirements: {N}/{M} v1 requirements checked off
```

**如果需求未完成**（N < M）：

```
⚠ Unchecked Requirements:

- [ ] {REQ-ID}: {description} (Phase {X})
- [ ] {REQ-ID}: {description} (Phase {Y})
```

必须展示 3 个选项：
1. **Proceed anyway** — 标记里程碑完成，带有已知缺口
2. **Run audit first** — `/gsd:audit-milestone` 评估缺口严重程度
3. **Abort** — 返回开发

如果用户选择 "Proceed anyway"：在 MILESTONES.md 的 `### Known Gaps` 下记录未完成的需求，包含 REQ-ID 和描述。

<config-check>

```bash
cat .planning/config.json 2>/dev/null || true
```

</config-check>

<if mode="yolo">

```
⚡ Auto-approved: Milestone scope verification
[Show breakdown summary without prompting]
Proceeding to stats gathering...
```

继续到 gather_stats。

</if>

<if mode="interactive" OR="custom with gates.confirm_milestone_scope true">

```
Ready to mark this milestone as shipped?
(yes / wait / adjust scope)
```

等待确认。
- "adjust scope"：询问要包含哪些阶段。
- "wait"：停止，用户准备好后返回。

</if>

</step>

<step name="gather_stats">

计算里程碑统计数据：

```bash
git log --oneline --grep="feat(" | head -20
git diff --stat FIRST_COMMIT..LAST_COMMIT | tail -1
find . -name "*.swift" -o -name "*.ts" -o -name "*.py" | xargs wc -l 2>/dev/null || true
git log --format="%ai" FIRST_COMMIT | tail -1
git log --format="%ai" LAST_COMMIT | head -1
```

展示：

```
Milestone Stats:
- Phases: [X-Y]
- Plans: [Z] total
- Tasks: [N] total (from phase summaries)
- Files modified: [M]
- Lines of code: [LOC] [language]
- Timeline: [Days] days ([Start] → [End])
- Git range: feat(XX-XX) → feat(YY-YY)
```

</step>

<step name="extract_accomplishments">

使用 summary-extract 从 SUMMARY.md 文件中提取一行摘要：

```bash
# 对于里程碑中的每个阶段，提取一行摘要
for summary in .planning/phases/*-*/*-SUMMARY.md; do
  [ -e "$summary" ] || continue
  node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" summary-extract "$summary" --fields one_liner --pick one_liner
done
```

提取 4-6 个关键成就。展示：

```
Key accomplishments for this milestone:
1. [Achievement from phase 1]
2. [Achievement from phase 2]
3. [Achievement from phase 3]
4. [Achievement from phase 4]
5. [Achievement from phase 5]
```

</step>

<step name="create_milestone_entry">

**注意：** MILESTONES.md 条目现在由 archive_milestone 步骤中的 `gsd-tools milestone complete` 自动创建。该条目包含版本、日期、阶段/计划/任务计数，以及从 SUMMARY.md 文件中提取的成就。

如果需要额外的详情（例如用户提供的 "Delivered" 摘要、git 范围、LOC 统计），在 CLI 创建基础条目后手动添加。

</step>

<step name="evolve_project_full_review">

里程碑完成时的完整 PROJECT.md 演进审查。

读取所有阶段摘要：

```bash
cat .planning/phases/*-*/*-SUMMARY.md
```

**完整审查检查清单：**

1. **"What This Is" 准确性：**
   - 将当前描述与实际构建的内容进行比较
   - 如果产品发生了有意义的变化则更新

2. **Core Value 检查：**
   - 优先级仍然正确吗？发布是否揭示了不同的核心价值？
   - 如果唯一最重要的事情发生了转移则更新

3. **需求审计：**

   **Validated 部分：**
   - 此里程碑中发布的所有 Active 需求 → 移到 Validated
   - 格式：`- ✓ [Requirement] — v[X.Y]`

   **Active 部分：**
   - 移除已移到 Validated 的需求
   - 为下一个里程碑添加新需求
   - 保留未处理的需求

   **Out of Scope 审计：**
   - 审查每个项目 — 理由仍然有效吗？
   - 移除不相关的项目
   - 添加在里程碑期间被否决的需求

4. **上下文更新：**
   - 当前代码库状态（LOC、技术栈）
   - 用户反馈主题（如有）
   - 已知问题或技术债务

5. **Key Decisions 审计：**
   - 从里程碑阶段摘要中提取所有决策
   - 添加到 Key Decisions 表格并附上结果
   - 标记 ✓ Good、⚠️ Revisit 或 — Pending

6. **Constraints 检查：**
   - 开发过程中是否有约束条件发生变化？根据需要更新

内联更新 PROJECT.md。更新 "Last updated" 页脚：

```markdown
---
*Last updated: [date] after v[X.Y] milestone*
```

**完整演进示例（v1.0 → v1.1 准备）：**

之前：

```markdown
## What This Is

A real-time collaborative whiteboard for remote teams.

## Core Value

Real-time sync that feels instant.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Canvas drawing tools
- [ ] Real-time sync < 500ms
- [ ] User authentication
- [ ] Export to PNG

### Out of Scope

- Mobile app — web-first approach
- Video chat — use external tools
```

v1.0 之后：

```markdown
## What This Is

A real-time collaborative whiteboard for remote teams with instant sync and drawing tools.

## Core Value

Real-time sync that feels instant.

## Requirements

### Validated

- ✓ Canvas drawing tools — v1.0
- ✓ Real-time sync < 500ms — v1.0 (achieved 200ms avg)
- ✓ User authentication — v1.0

### Active

- [ ] Export to PNG
- [ ] Undo/redo history
- [ ] Shape tools (rectangles, circles)

### Out of Scope

- Mobile app — web-first approach, PWA works well
- Video chat — use external tools
- Offline mode — real-time is core value

## Context

Shipped v1.0 with 2,400 LOC TypeScript.
Tech stack: Next.js, Supabase, Canvas API.
Initial user testing showed demand for shape tools.
```

**步骤完成条件：**

- [ ] "What This Is" 已审查并根据需要更新
- [ ] Core Value 验证仍然正确
- [ ] 所有已发布的需求移到 Validated
- [ ] 为下一个里程碑在 Active 中添加了新需求
- [ ] Out of Scope 的理由已审计
- [ ] Context 已更新为当前状态
- [ ] 所有里程碑决策已添加到 Key Decisions
- [ ] "Last updated" 页脚反映里程碑完成

</step>

<step name="reorganize_roadmap">

更新 `.planning/ROADMAP.md` — 对已完成的里程碑阶段分组：

```markdown
# Roadmap: [Project Name]

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped YYYY-MM-DD)
- 🚧 **v1.1 Security** — Phases 5-6 (in progress)
- 📋 **v2.0 Redesign** — Phases 7-10 (planned)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) — SHIPPED YYYY-MM-DD</summary>

- [x] Phase 1: Foundation (2/2 plans) — completed YYYY-MM-DD
- [x] Phase 2: Authentication (2/2 plans) — completed YYYY-MM-DD
- [x] Phase 3: Core Features (3/3 plans) — completed YYYY-MM-DD
- [x] Phase 4: Polish (1/1 plan) — completed YYYY-MM-DD

</details>

### 🚧 v[Next] [Name] (In Progress / Planned)

- [ ] Phase 5: [Name] ([N] plans)
- [ ] Phase 6: [Name] ([N] plans)

## Progress

| Phase             | Milestone | Plans Complete | Status      | Completed  |
| ----------------- | --------- | -------------- | ----------- | ---------- |
| 1. Foundation     | v1.0      | 2/2            | Complete    | YYYY-MM-DD |
| 2. Authentication | v1.0      | 2/2            | Complete    | YYYY-MM-DD |
| 3. Core Features  | v1.0      | 3/3            | Complete    | YYYY-MM-DD |
| 4. Polish         | v1.0      | 1/1            | Complete    | YYYY-MM-DD |
| 5. Security Audit | v1.1      | 0/1            | Not started | -          |
| 6. Hardening      | v1.1      | 0/2            | Not started | -          |
```

</step>

<step name="archive_milestone">

**将归档委托给 gsd-tools：**

```bash
ARCHIVE=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" milestone complete "v[X.Y]" --name "[Milestone Name]")
```

CLI 处理：
- 创建 `.planning/milestones/` 目录
- 将 ROADMAP.md 归档到 `milestones/v[X.Y]-ROADMAP.md`
- 将 REQUIREMENTS.md 归档到 `milestones/v[X.Y]-REQUIREMENTS.md` 并附加归档头部
- 如果存在审计文件则移动到 milestones
- 创建/追加 MILESTONES.md 条目，包含从 SUMMARY.md 文件中提取的成就
- 更新 STATE.md（状态、最后活动）

从结果中提取：`version`、`date`、`phases`、`plans`、`tasks`、`accomplishments`、`archived`。

验证：`✅ Milestone archived to .planning/milestones/`

**阶段归档（可选）：** 归档完成后，询问用户：

AskUserQuestion(header="Archive Phases", question="Archive phase directories to milestones/?", options: "Yes — move to milestones/v[X.Y]-phases/" | "Skip — keep phases in place")

如果 "Yes"：将阶段目录移到里程碑归档中：
```bash
mkdir -p .planning/milestones/v[X.Y]-phases
# 对于 .planning/phases/ 中的每个阶段目录：
mv .planning/phases/{phase-dir} .planning/milestones/v[X.Y]-phases/
```
验证：`✅ Phase directories archived to .planning/milestones/v[X.Y]-phases/`

如果 "Skip"：阶段目录保留在 `.planning/phases/` 中作为原始执行历史。稍后使用 `/gsd:cleanup` 进行追溯归档。

归档后，AI 仍然处理：
- 使用里程碑分组重新组织 ROADMAP.md（需要判断力）
- 完整的 PROJECT.md 演进审查（需要理解力）
- 删除原始的 ROADMAP.md 和 REQUIREMENTS.md
- 这些没有完全委托是因为它们需要 AI 对内容的解读

</step>

<step name="reorganize_roadmap_and_delete_originals">

`milestone complete` 归档后，使用里程碑分组重新组织 ROADMAP.md，然后删除原始文件：

**重新组织 ROADMAP.md** — 对已完成的里程碑阶段分组：

```markdown
# Roadmap: [Project Name]

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped YYYY-MM-DD)
- 🚧 **v1.1 Security** — Phases 5-6 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) — SHIPPED YYYY-MM-DD</summary>

- [x] Phase 1: Foundation (2/2 plans) — completed YYYY-MM-DD
- [x] Phase 2: Authentication (2/2 plans) — completed YYYY-MM-DD

</details>
```

**然后删除原始文件：**

```bash
rm .planning/ROADMAP.md
rm .planning/REQUIREMENTS.md
```

</step>

<step name="write_retrospective">

**追加到持续更新的回顾文档：**

检查现有的回顾文档：
```bash
ls .planning/RETROSPECTIVE.md 2>/dev/null || true
```

**如果存在：** 读取文件，在 "## Cross-Milestone Trends" 部分之前追加新的里程碑部分。

**如果不存在：** 从 `~/.claude/get-shit-done/templates/retrospective.md` 的模板创建。

**收集回顾数据：**

1. 从 SUMMARY.md 文件：提取关键交付物、一行摘要、技术决策
2. 从 VERIFICATION.md 文件：提取验证分数、发现的缺口
3. 从 UAT.md 文件：提取测试结果、发现的问题
4. 从 git log：统计提交数、计算时间线
5. 从里程碑工作中：反思什么有效、什么无效

**编写里程碑部分：**

```markdown
## Milestone: v{version} — {name}

**Shipped:** {date}
**Phases:** {phase_count} | **Plans:** {plan_count}

### What Was Built
{从 SUMMARY.md 一行摘要中提取}

### What Worked
{导致顺利执行的模式}

### What Was Inefficient
{错过的机会、返工、瓶颈}

### Patterns Established
{此里程碑期间发现的新约定}

### Key Lessons
{具体的、可操作的要点}

### Cost Observations
- Model mix: {X}% opus, {Y}% sonnet, {Z}% haiku
- Sessions: {count}
- Notable: {efficiency observation}
```

**更新跨里程碑趋势：**

如果 "## Cross-Milestone Trends" 部分存在，使用此里程碑的新数据更新表格。

**提交：**
```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs: update retrospective for v${VERSION}" --files .planning/RETROSPECTIVE.md
```

</step>

<step name="update_state">

大部分 STATE.md 更新已由 `milestone complete` 处理，但验证并更新剩余字段：

**Project Reference：**

```markdown
## Project Reference

See: .planning/PROJECT.md (updated [today])

**Core value:** [Current core value from PROJECT.md]
**Current focus:** [Next milestone or "Planning next milestone"]
```

**Accumulated Context：**
- 清除决策摘要（完整日志在 PROJECT.md 中）
- 清除已解决的阻塞因素
- 保留下一个里程碑的未解决阻塞因素

</step>

<step name="handle_branches">

检查分支策略并提供合并选项。

使用 `init milestone-op` 获取上下文，或直接加载配置：

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init execute-phase "1")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

从初始化 JSON 中提取 `branching_strategy`、`phase_branch_template`、`milestone_branch_template` 和 `commit_docs`。

**如果 "none"：** 跳到 git_tag。

**对于 "phase" 策略：**

```bash
BRANCH_PREFIX=$(echo "$PHASE_BRANCH_TEMPLATE" | sed 's/{.*//')
PHASE_BRANCHES=$(git branch --list "${BRANCH_PREFIX}*" 2>/dev/null | sed 's/^\*//' | tr -d ' ')
```

**对于 "milestone" 策略：**

```bash
BRANCH_PREFIX=$(echo "$MILESTONE_BRANCH_TEMPLATE" | sed 's/{.*//')
MILESTONE_BRANCH=$(git branch --list "${BRANCH_PREFIX}*" 2>/dev/null | sed 's/^\*//' | tr -d ' ' | head -1)
```

**如果未找到分支：** 跳到 git_tag。

**如果分支存在：**

```
## Git Branches Detected

Branching strategy: {phase/milestone}
Branches: {list}

Options:
1. **Merge to main** — Merge branch(es) to main
2. **Delete without merging** — Already merged or not needed
3. **Keep branches** — Leave for manual handling
```

AskUserQuestion 选项：Squash merge (Recommended)、Merge with history、Delete without merging、Keep branches。

**Squash merge：**

```bash
CURRENT_BRANCH=$(git branch --show-current)
git checkout main

if [ "$BRANCHING_STRATEGY" = "phase" ]; then
  for branch in $PHASE_BRANCHES; do
    git merge --squash "$branch"
    # 如果 commit_docs 为 false 则从暂存区移除 .planning/
    if [ "$COMMIT_DOCS" = "false" ]; then
      git reset HEAD .planning/ 2>/dev/null || true
    fi
    git commit -m "feat: $branch for v[X.Y]"
  done
fi

if [ "$BRANCHING_STRATEGY" = "milestone" ]; then
  git merge --squash "$MILESTONE_BRANCH"
  # 如果 commit_docs 为 false 则从暂存区移除 .planning/
  if [ "$COMMIT_DOCS" = "false" ]; then
    git reset HEAD .planning/ 2>/dev/null || true
  fi
  git commit -m "feat: $MILESTONE_BRANCH for v[X.Y]"
fi

git checkout "$CURRENT_BRANCH"
```

**Merge with history：**

```bash
CURRENT_BRANCH=$(git branch --show-current)
git checkout main

if [ "$BRANCHING_STRATEGY" = "phase" ]; then
  for branch in $PHASE_BRANCHES; do
    git merge --no-ff --no-commit "$branch"
    # 如果 commit_docs 为 false 则从暂存区移除 .planning/
    if [ "$COMMIT_DOCS" = "false" ]; then
      git reset HEAD .planning/ 2>/dev/null || true
    fi
    git commit -m "Merge branch '$branch' for v[X.Y]"
  done
fi

if [ "$BRANCHING_STRATEGY" = "milestone" ]; then
  git merge --no-ff --no-commit "$MILESTONE_BRANCH"
  # 如果 commit_docs 为 false 则从暂存区移除 .planning/
  if [ "$COMMIT_DOCS" = "false" ]; then
    git reset HEAD .planning/ 2>/dev/null || true
  fi
  git commit -m "Merge branch '$MILESTONE_BRANCH' for v[X.Y]"
fi

git checkout "$CURRENT_BRANCH"
```

**Delete without merging：**

```bash
if [ "$BRANCHING_STRATEGY" = "phase" ]; then
  for branch in $PHASE_BRANCHES; do
    git branch -d "$branch" 2>/dev/null || git branch -D "$branch"
  done
fi

if [ "$BRANCHING_STRATEGY" = "milestone" ]; then
  git branch -d "$MILESTONE_BRANCH" 2>/dev/null || git branch -D "$MILESTONE_BRANCH"
fi
```

**Keep branches：** 报告 "Branches preserved for manual handling"

</step>

<step name="git_tag">

创建 git 标签：

```bash
git tag -a v[X.Y] -m "v[X.Y] [Name]

Delivered: [One sentence]

Key accomplishments:
- [Item 1]
- [Item 2]
- [Item 3]

See .planning/MILESTONES.md for full details."
```

确认："Tagged: v[X.Y]"

询问："Push tag to remote? (y/n)"

如果 yes：
```bash
git push origin v[X.Y]
```

</step>

<step name="git_commit_milestone">

提交里程碑完成。

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "chore: complete v[X.Y] milestone" --files .planning/milestones/v[X.Y]-ROADMAP.md .planning/milestones/v[X.Y]-REQUIREMENTS.md .planning/milestones/v[X.Y]-MILESTONE-AUDIT.md .planning/MILESTONES.md .planning/PROJECT.md .planning/STATE.md
```
```

确认："Committed: chore: complete v[X.Y] milestone"

</step>

<step name="offer_next">

```
✅ Milestone v[X.Y] [Name] complete

Shipped:
- [N] phases ([M] plans, [P] tasks)
- [One sentence of what shipped]

Archived:
- milestones/v[X.Y]-ROADMAP.md
- milestones/v[X.Y]-REQUIREMENTS.md

Summary: .planning/MILESTONES.md
Tag: v[X.Y]

---

## ▶ Next Up

**Start Next Milestone** — questioning → research → requirements → roadmap

`/gsd:new-milestone`

<sub>`/clear` first → fresh context window</sub>

---
```

</step>

</process>

<milestone_naming>

**版本命名约定：**
- **v1.0** — 初始 MVP
- **v1.1, v1.2** — 小版本更新、新功能、修复
- **v2.0, v3.0** — 大版本重写、破坏性变更、新方向

**名称：** 简短的 1-2 个词（v1.0 MVP、v1.1 Security、v1.2 Performance、v2.0 Redesign）。

</milestone_naming>

<what_qualifies>

**为以下情况创建里程碑：** 初始发布、公开发布、主要功能集发布、归档规划之前。

**不要为以下情况创建里程碑：** 每个阶段完成（粒度太细）、进行中的工作、内部开发迭代（除非真正发布了）。

启发式规则："这个已经部署/可用/发布了吗？" 如果是 → 里程碑。如果否 → 继续工作。

</what_qualifies>

<success_criteria>

里程碑完成成功的标准：

- [ ] MILESTONES.md 条目已创建，包含统计数据和成就
- [ ] PROJECT.md 完整演进审查已完成
- [ ] 所有已发布的需求在 PROJECT.md 中移到 Validated
- [ ] Key Decisions 已更新结果
- [ ] ROADMAP.md 已使用里程碑分组重新组织
- [ ] 路线图归档已创建（milestones/v[X.Y]-ROADMAP.md）
- [ ] 需求归档已创建（milestones/v[X.Y]-REQUIREMENTS.md）
- [ ] REQUIREMENTS.md 已删除（为下一个里程碑准备新的）
- [ ] STATE.md 已更新为新的项目参考
- [ ] Git 标签已创建（v[X.Y]）
- [ ] 里程碑提交已完成（包含归档文件和删除操作）
- [ ] 已根据 REQUIREMENTS.md 可追溯性表格检查需求完成情况
- [ ] 未完成的需求已展示 proceed/audit/abort 选项
- [ ] 如果用户选择带未完成需求继续，已知缺口已记录在 MILESTONES.md 中
- [ ] RETROSPECTIVE.md 已更新里程碑部分
- [ ] 跨里程碑趋势已更新
- [ ] 用户知道下一步（/gsd:new-milestone）

</success_criteria>
