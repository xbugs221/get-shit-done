<purpose>
从已完成的阶段/里程碑工作中创建 Pull Request，从规划产物生成丰富的 PR 正文，可选地运行代码审查，并准备合并。关闭 规划 → 执行 → 验证 → 发布 的循环。
</purpose>

<required_reading>
在开始之前，阅读调用提示的 execution_context 中引用的所有文件。
</required_reading>

<process>

<step name="initialize">
解析参数并加载项目状态：

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init phase-op "${PHASE_ARG}")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

从初始化 JSON 中解析：`phase_found`、`phase_dir`、`phase_number`、`phase_name`、`padded_phase`、`commit_docs`。

同时加载分支策略的配置：
```bash
CONFIG=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" state load)
```

提取：`branching_strategy`、`branch_name`。
</step>

<step name="preflight_checks">
验证工作是否已准备好发布：

1. **验证是否通过？**
   ```bash
   VERIFICATION=$(cat ${PHASE_DIR}/*-VERIFICATION.md 2>/dev/null)
   ```
   检查 `status: passed` 或 `status: human_needed`（需人工批准）。
   如果没有 VERIFICATION.md 或状态为 `gaps_found`：发出警告并要求用户确认。

2. **工作区是否干净？**
   ```bash
   git status --short
   ```
   如果存在未提交的更改：要求用户先提交或暂存。

3. **是否在正确的分支上？**
   ```bash
   CURRENT_BRANCH=$(git branch --show-current)
   ```
   如果在 `main`/`master` 上：发出警告——应该在功能分支上。
   如果 branching_strategy 为 `none`：提议现在创建一个分支。

4. **远程仓库是否已配置？**
   ```bash
   git remote -v | head -2
   ```
   检测 `origin` 远程仓库。如果没有远程仓库：报错——无法创建 PR。

5. **`gh` CLI 是否可用？**
   ```bash
   which gh && gh auth status 2>&1
   ```
   如果 `gh` 未找到或未认证：提供设置说明并退出。
</step>

<step name="push_branch">
将当前分支推送到远程仓库：

```bash
git push origin ${CURRENT_BRANCH} 2>&1
```

如果推送失败（例如没有上游）：设置上游：
```bash
git push --set-upstream origin ${CURRENT_BRANCH} 2>&1
```

报告："已将 `{branch}` 推送到 origin（领先 main {commit_count} 个提交）"
</step>

<step name="generate_pr_body">
从规划产物自动生成丰富的 PR 正文：

**1. 标题：**
```
Phase {phase_number}: {phase_name}
```
或者对于里程碑：`Milestone {version}: {name}`

**2. 概要部分：**
从 ROADMAP.md 读取阶段目标。从 VERIFICATION.md 读取验证状态。

```markdown
## 概要

**阶段 {N}: {Name}**
**目标：** {ROADMAP.md 中的目标}
**状态：** 已验证 ✓

{从 SUMMARY.md 文件综合的一段话——描述构建了什么}
```

**3. 变更部分：**
对于阶段目录中的每个 SUMMARY.md：
```markdown
## 变更

### 计划 {plan_id}: {plan_name}
{SUMMARY.md frontmatter 中的 one_liner}

**关键文件：**
{SUMMARY.md frontmatter 中的 key-files.created 和 key-files.modified}
```

**4. 需求部分：**
```markdown
## 已满足的需求

{计划 frontmatter 中的 REQ-ID，链接到 REQUIREMENTS.md 的描述}
```

**5. 测试部分：**
```markdown
## 验证

- [x] 自动化验证：{VERIFICATION.md 中的通过/失败}
- {VERIFICATION.md 中的人工验证项目（如有）}
```

**6. 决策部分：**
```markdown
## 关键决策

{STATE.md 中与此阶段相关的累积上下文中的决策}
```
</step>

<step name="create_pr">
使用生成的正文创建 PR：

```bash
gh pr create \
  --title "Phase ${PHASE_NUMBER}: ${PHASE_NAME}" \
  --body "${PR_BODY}" \
  --base main
```

如果传递了 `--draft` 标志：添加 `--draft`。

报告："PR #{number} 已创建：{url}"
</step>

<step name="optional_review">
询问用户是否要触发代码审查：

```
AskUserQuestion:
  question: "PR 已创建。合并前运行代码审查吗？"
  options:
    - label: "跳过审查"
      description: "PR 已就绪——CI 通过后合并"
    - label: "自我审查"
      description: "我将在 PR 中自己审查 diff"
    - label: "请求审查"
      description: "请求队友审查"
```

**如果选择"请求审查"：**
```bash
gh pr edit ${PR_NUMBER} --add-reviewer "${REVIEWER}"
```

**如果选择"自我审查"：**
报告 PR URL 并建议："在 {url}/files 审查 diff"
</step>

<step name="track_shipping">
更新 STATE.md 以反映发布操作：

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" state update "Last Activity" "$(date +%Y-%m-%d)"
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" state update "Status" "Phase ${PHASE_NUMBER} shipped — PR #${PR_NUMBER}"
```

如果 `commit_docs` 为 true：
```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs(${padded_phase}): ship phase ${PHASE_NUMBER} — PR #${PR_NUMBER}" --files .planning/STATE.md
```
</step>

<step name="report">
```
───────────────────────────────────────────────────────────────

## ✓ 阶段 {X}: {Name} — 已发布

PR: #{number} ({url})
分支: {branch} → main
提交数: {count}
验证: ✓ 已通过
需求: 已满足 {N} 个 REQ-ID

后续步骤：
- 审查/批准 PR
- CI 通过后合并
- /gsd:complete-milestone（如果是里程碑中的最后一个阶段）
- /gsd:progress（查看下一步）

───────────────────────────────────────────────────────────────
```
</step>

</process>

<offer_next>
发布后：

- /gsd:complete-milestone — 如果里程碑中的所有阶段都已完成
- /gsd:progress — 查看整体项目状态
- /gsd:execute-phase {next} — 继续下一个阶段
</offer_next>

<success_criteria>
- [ ] 预检查通过（验证、干净的工作区、分支、远程仓库、gh）
- [ ] 分支已推送到远程仓库
- [ ] PR 已创建，包含丰富的自动生成正文
- [ ] STATE.md 已更新发布状态
- [ ] 用户知道 PR 编号和后续步骤
</success_criteria>
</output>
