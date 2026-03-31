# 取证工作流

对失败或卡住的 GSD 工作流进行事后调查。分析 git 历史、
`.planning/` 工件和文件系统状态，以检测异常并生成
结构化的诊断报告。

**原则：** 这是一个只读调查。不要修改项目文件。
只编写取证报告。

---

## 步骤 1：获取问题描述

```bash
PROBLEM="$ARGUMENTS"
```

如果 `$ARGUMENTS` 为空，询问用户：
> "出了什么问题？请描述该问题 — 例如，'自主模式在阶段 3 卡住了'，
> 'execute-phase 静默失败了'，'费用似乎异常偏高'。"

记录问题描述以用于报告。

## 步骤 2：收集证据

从所有可用来源收集数据。缺少某些来源也没关系 — 适应已有的数据。

### 2a. Git 历史

```bash
# 最近的提交记录（最近 30 条）
git log --oneline -30

# 带时间戳的提交记录，用于间隔分析
git log --format="%H %ai %s" -30

# 最近提交中变更的文件（检测重复编辑）
git log --name-only --format="" -20 | sort | uniq -c | sort -rn | head -20

# 未提交的工作
git status --short
git diff --stat
```

记录：
- 提交时间线（日期、消息、频率）
- 最频繁编辑的文件（潜在的卡循环指标）
- 未提交的变更（潜在的崩溃/中断指标）

### 2b. 规划状态

如果存在，读取以下文件：
- `.planning/STATE.md` — 当前里程碑、阶段、进度、阻塞项、上次会话
- `.planning/ROADMAP.md` — 包含状态的阶段列表
- `.planning/config.json` — 工作流配置

提取：
- 当前阶段及其状态
- 上次记录的会话停止点
- 任何阻塞项或标记

### 2c. 阶段工件

对 `.planning/phases/*/` 中的每个阶段目录：

```bash
ls .planning/phases/*/
```

对每个阶段，检查存在哪些工件：
- `{padded}-PLAN.md` 或 `{padded}-PLAN-*.md`（执行计划）
- `{padded}-SUMMARY.md`（完成总结）
- `{padded}-VERIFICATION.md`（质量验证）
- `{padded}-CONTEXT.md`（设计决策）
- `{padded}-RESEARCH.md`（前期调研）

追踪：哪些阶段有完整的工件集，哪些有缺失。

### 2d. 会话报告

如果存在，读取 `.planning/reports/SESSION_REPORT.md` — 提取上次会话的成果、
完成的工作、token 估算。

### 2e. Git 工作树状态

```bash
git worktree list
```

检查是否有孤立的工作树（来自崩溃的 agent）。

## 步骤 3：检测异常

根据以下异常模式评估收集到的证据：

### 卡循环检测

**信号：** 同一文件在短时间窗口内出现在 3 次以上连续提交中。

```bash
# 查找在序列中被反复提交的文件
git log --name-only --format="---COMMIT---" -20
```

解析提交边界。如果任何文件出现在 3 次以上连续提交中，标记为：
- **置信度 高** 如果提交消息相似（例如，对同一文件连续 "fix:"、"fix:"、"fix:"）
- **置信度 中** 如果文件频繁出现但提交消息不同

### 缺失工件检测

**信号：** 阶段看起来已完成（有提交，在路线图中已过期）但缺少预期的工件。

对每个应该已完成的阶段：
- PLAN.md 缺失 → 跳过了规划步骤
- SUMMARY.md 缺失 → 阶段未正确关闭
- VERIFICATION.md 缺失 → 跳过了质量检查

### 废弃工作检测

**信号：** 最后一次提交和当前时间之间有较大间隔，且 STATE.md 显示处于执行中。

```bash
# 距上次提交的时间
git log -1 --format="%ai"
```

如果 STATE.md 显示有活跃阶段，但最后一次提交超过 2 小时，并且存在
未提交的变更，则标记为潜在的废弃或崩溃。

### 崩溃/中断检测

**信号：** 未提交的变更 + STATE.md 显示执行中 + 孤立的工作树。

组合判断：
- `git status` 显示已修改/已暂存的文件
- STATE.md 有活跃的执行条目
- `git worktree list` 显示除主工作树外还有其他工作树

### 范围偏移检测

**信号：** 最近的提交涉及当前阶段预期范围之外的文件。

读取当前阶段的 PLAN.md 以确定预期的文件路径。与最近提交中
实际修改的文件进行比较。标记任何明显不属于
该阶段领域的文件。

### 测试回归检测

**信号：** 提交消息中包含 "fix test"、"revert" 或对测试文件的重复提交。

```bash
git log --oneline -20 | grep -iE "fix test|revert|broken|regression|fail"
```

## 步骤 4：生成报告

如果需要，创建取证目录：
```bash
mkdir -p .planning/forensics
```

写入 `.planning/forensics/report-$(date +%Y%m%d-%H%M%S).md`：

```markdown
# 取证报告

**生成时间：** {ISO 时间戳}
**问题：** {用户的描述}

---

## 证据摘要

### Git 活动
- **最后一次提交：** {日期} — "{消息}"
- **提交记录（最近 30 条）：** {计数}
- **时间跨度：** {最早} → {最新}
- **未提交的变更：** {是/否 — 如果有则列出}
- **活跃的工作树：** {计数 — 如果大于 1 则列出}

### 规划状态
- **当前里程碑：** {版本或"无"}
- **当前阶段：** {编号 — 名称 — 状态}
- **上次会话：** {来自 STATE.md 的 stopped_at}
- **阻塞项：** {来自 STATE.md 的任何标记}

### 工件完整性
| 阶段 | PLAN | CONTEXT | RESEARCH | SUMMARY | VERIFICATION |
|------|------|---------|----------|---------|-------------|
{对每个阶段: 名称 | 每个工件标记 ✅/❌}

## 检测到的异常

### {异常类型} — {置信度: 高/中/低}
**证据：** {具体的提交、文件或状态数据}
**解读：** {这可能意味着什么}

{对检测到的每个异常重复}

## 根因假设

基于以上证据，最可能的解释是：

{基于异常的 1-3 句假设}

## 建议的操作

1. {具体的、可执行的修复步骤}
2. {如果适用，另一个步骤}
3. {如果适用，恢复命令 — 例如 `/gsd:resume-work`、`/gsd:execute-phase N`}

---

*报告由 `/gsd:forensics` 生成。所有路径已脱敏以便移植。*
```

**脱敏规则：**
- 将绝对路径替换为相对路径（去除 `$HOME` 前缀）
- 移除 git diff 输出中发现的任何 API 密钥、token 或凭据
- 将大型 diff 截断为前 50 行

## 步骤 5：展示报告

内联显示完整的取证报告。

## 步骤 6：提供交互式调查

> "报告已保存到 `.planning/forensics/report-{timestamp}.md`。
>
> 我可以深入调查任何发现。需要我：
> - 追踪某个特定异常到其根因？
> - 读取证据中引用的特定文件？
> - 检查是否之前已报告过类似问题？"

如果用户提出后续问题，从已收集的证据中作答。
仅在确实需要时才读取额外文件。

## 步骤 7：提供创建 Issue 的选项

如果发现了可操作的异常（高或中置信度）：

> "需要我为此创建一个 GitHub issue 吗？我会格式化发现的内容并脱敏路径。"

如果确认：
```bash
# 在使用之前检查 "bug" 标签是否存在
BUG_LABEL=$(gh label list --search "bug" --json name -q '.[0].name' 2>/dev/null)
LABEL_FLAG=""
if [ -n "$BUG_LABEL" ]; then
  LABEL_FLAG="--label bug"
fi

gh issue create \
  --title "bug: {来自异常的简洁描述}" \
  $LABEL_FLAG \
  --body "{来自报告的格式化发现}"
```

## 步骤 8：更新 STATE.md

```bash
gsd-tools.cjs state record-session \
  --stopped-at "Forensic investigation complete" \
  --resume-file ".planning/forensics/report-{timestamp}.md"
```
