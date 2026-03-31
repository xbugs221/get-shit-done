<purpose>
跨 AI 同行评审 — 调用外部 AI CLI 独立评审阶段计划。
每个 CLI 获得相同的提示（PROJECT.md 上下文、阶段计划、需求）并
产出结构化反馈。结果合并到 REVIEWS.md 中，供规划者
通过 --reviews 标志合并反馈。

这实现了对抗式评审：不同的 AI 模型能发现不同的盲点。
一个经过 2-3 个独立 AI 系统评审后仍然成立的计划更加健壮。
</purpose>

<process>

<step name="detect_clis">
检查系统上有哪些 AI CLI 可用：

```bash
# 检查每个 CLI
command -v gemini >/dev/null 2>&1 && echo "gemini:available" || echo "gemini:missing"
command -v claude >/dev/null 2>&1 && echo "claude:available" || echo "claude:missing"
command -v codex >/dev/null 2>&1 && echo "codex:available" || echo "codex:missing"
```

从 `$ARGUMENTS` 解析标志：
- `--gemini` → 包含 Gemini
- `--claude` → 包含 Claude
- `--codex` → 包含 Codex
- `--all` → 包含所有可用的
- 无标志 → 包含所有可用的

如果没有可用的 CLI：
```
未找到外部 AI CLI。请至少安装一个：
- gemini：https://github.com/google-gemini/gemini-cli
- codex：https://github.com/openai/codex
- claude：https://github.com/anthropics/claude-code

然后重新运行 /gsd:review。
```
退出。

如果唯一可用的 CLI 是当前运行时（例如在 Claude 内运行），跳过它进行评审
以确保独立性。至少需要一个不同的 CLI 可用。
</step>

<step name="gather_context">
收集阶段产物用于评审提示：

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init phase-op "${PHASE_ARG}")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

从初始化中读取：`phase_dir`、`phase_number`、`padded_phase`。

然后读取：
1. `.planning/PROJECT.md`（前 80 行 — 项目上下文）
2. `.planning/ROADMAP.md` 中的阶段部分
3. 阶段目录中的所有 `*-PLAN.md` 文件
4. `*-CONTEXT.md`（如果存在）（用户决策）
5. `*-RESEARCH.md`（如果存在）（领域调研）
6. `.planning/REQUIREMENTS.md`（本阶段处理的需求）
</step>

<step name="build_prompt">
构建结构化评审提示：

```markdown
# 跨 AI 计划评审请求

你正在评审一个软件项目阶段的实现计划。
请对计划质量、完整性和风险提供结构化反馈。

## 项目上下文
{PROJECT.md 的前 80 行}

## 阶段 {N}：{阶段名称}
### 路线图部分
{路线图阶段部分}

### 处理的需求
{本阶段的需求}

### 用户决策 (CONTEXT.md)
{上下文（如果存在）}

### 调研发现
{调研（如果存在）}

### 待评审的计划
{所有 PLAN.md 内容}

## 评审指南

分析每个计划并提供：

1. **摘要** — 一段话的评估
2. **优点** — 设计良好的方面（要点列表）
3. **关注点** — 潜在问题、差距、风险（要点列表，含严重程度：HIGH/MEDIUM/LOW）
4. **建议** — 具体改进（要点列表）
5. **风险评估** — 总体风险级别（LOW/MEDIUM/HIGH）及理由

重点关注：
- 缺失的边界情况或错误处理
- 依赖排序问题
- 范围蔓延或过度工程
- 安全考虑
- 性能影响
- 计划是否真正达成了阶段目标

以 markdown 格式输出你的评审。
```

写入临时文件：`/tmp/gsd-review-prompt-{phase}.md`
</step>

<step name="invoke_reviewers">
对每个选定的 CLI，按顺序调用（非并行 — 避免速率限制）：

**Gemini：**
```bash
gemini -p "$(cat /tmp/gsd-review-prompt-{phase}.md)" 2>/dev/null > /tmp/gsd-review-gemini-{phase}.md
```

**Claude（独立会话）：**
```bash
claude -p "$(cat /tmp/gsd-review-prompt-{phase}.md)" --no-input 2>/dev/null > /tmp/gsd-review-claude-{phase}.md
```

**Codex：**
```bash
codex exec --skip-git-repo-check "$(cat /tmp/gsd-review-prompt-{phase}.md)" 2>/dev/null > /tmp/gsd-review-codex-{phase}.md
```

如果某个 CLI 失败，记录错误并继续处理剩余的 CLI。

显示进度：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 跨 AI 评审 — 阶段 {N}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ 使用 {CLI} 评审中... 完成 ✓
◆ 使用 {CLI} 评审中... 完成 ✓
```
</step>

<step name="write_reviews">
将所有评审响应合并到 `{phase_dir}/{padded_phase}-REVIEWS.md`：

```markdown
---
phase: {N}
reviewers: [gemini, claude, codex]
reviewed_at: {ISO 时间戳}
plans_reviewed: [{PLAN.md 文件列表}]
---

# 跨 AI 计划评审 — 阶段 {N}

## Gemini 评审

{gemini 评审内容}

---

## Claude 评审

{claude 评审内容}

---

## Codex 评审

{codex 评审内容}

---

## 共识摘要

{综合所有评审者的共同关注点}

### 一致的优点
{2 个以上评审者提到的优点}

### 一致的关注点
{2 个以上评审者提出的关注点 — 最高优先级}

### 分歧观点
{评审者意见不一致的地方 — 值得调查}
```

提交：
```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs: cross-AI review for phase {N}" --files {phase_dir}/{padded_phase}-REVIEWS.md
```
</step>

<step name="present_results">
显示摘要：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 评审完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

阶段 {N} 已由 {count} 个 AI 系统评审。

共识关注点：
{前 3 个共同关注点}

完整评审：{padded_phase}-REVIEWS.md

要将反馈合并到规划中：
  /gsd:plan-phase {N} --reviews
```

清理临时文件。
</step>

</process>

<success_criteria>
- [ ] 至少成功调用了一个外部 CLI
- [ ] REVIEWS.md 已写入并包含结构化反馈
- [ ] 共识摘要已从多个评审者中综合
- [ ] 临时文件已清理
- [ ] 用户知道如何使用反馈（/gsd:plan-phase --reviews）
</success_criteria>
</output>
