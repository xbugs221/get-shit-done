<purpose>
编排并行调试代理以调查 UAT 差距并找到根本原因。

UAT 发现差距后，为每个差距生成一个调试代理。每个代理使用 UAT 预填的症状进行自主调查。收集根本原因，更新 UAT.md 中的差距诊断信息，然后将带有实际诊断结果移交给 plan-phase --gaps。

编排器保持精简：解析差距、生成代理、收集结果、更新 UAT。
</purpose>

<available_agent_types>
有效的 GSD 子代理类型（使用精确名称 — 不要回退到 'general-purpose'）：
- gsd-debugger — 诊断并修复问题
</available_agent_types>

<paths>
DEBUG_DIR=.planning/debug

调试文件使用 `.planning/debug/` 路径（带前导点的隐藏目录）。
</paths>

<core_principle>
**先诊断再规划修复。**

UAT 告诉我们什么坏了（症状）。调试代理找到为什么坏了（根本原因）。然后 plan-phase --gaps 基于实际原因创建有针对性的修复方案，而不是靠猜测。

没有诊断："评论不刷新" → 猜测修复方案 → 可能修错
有了诊断："评论不刷新" → "useEffect 缺少依赖项" → 精确修复
</core_principle>

<process>

<step name="parse_gaps">
**从 UAT.md 提取差距：**

读取"Gaps"部分（YAML 格式）：
```yaml
- truth: "Comment appears immediately after submission"
  status: failed
  reason: "User reported: works but doesn't show until I refresh the page"
  severity: major
  test: 2
  artifacts: []
  missing: []
```

对于每个差距，还需读取"Tests"部分中对应的测试以获取完整上下文。

构建差距列表：
```
gaps = [
  {truth: "Comment appears immediately...", severity: "major", test_num: 2, reason: "..."},
  {truth: "Reply button positioned correctly...", severity: "minor", test_num: 5, reason: "..."},
  ...
]
```
</step>

<step name="report_plan">
**向用户报告诊断计划：**

```
## 正在诊断 {N} 个差距

生成并行调试代理以调查根本原因：

| 差距（预期行为） | 严重性 |
|-------------|----------|
| 提交后评论立即显示 | major |
| 回复按钮位置正确 | minor |
| 删除操作移除评论 | blocker |

每个代理将：
1. 创建 DEBUG-{slug}.md 并预填症状
2. 自主调查（读取代码、形成假设、测试）
3. 返回根本原因

此操作并行运行 - 所有差距同时调查。
```
</step>

<step name="spawn_agents">
**加载代理技能：**

```bash
AGENT_SKILLS_DEBUGGER=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-debugger 2>/dev/null)
```

**并行生成调试代理：**

对于每个差距，填充 debug-subagent-prompt 模板并生成：

```
Task(
  prompt=filled_debug_subagent_prompt + "\n\n<files_to_read>\n- {phase_dir}/{phase_num}-UAT.md\n- .planning/STATE.md\n</files_to_read>\n${AGENT_SKILLS_DEBUGGER}",
  subagent_type="gsd-debugger",
  isolation="worktree",
  description="Debug: {truth_short}"
)
```

**所有代理在单条消息中生成**（并行执行）。

模板占位符：
- `{truth}`：失败的预期行为
- `{expected}`：来自 UAT 测试
- `{actual}`：reason 字段中用户的原始描述
- `{errors}`：UAT 中的任何错误消息（或 "None reported"）
- `{reproduction}`："Test {test_num} in UAT"
- `{timeline}`："Discovered during UAT"
- `{goal}`：`find_root_cause_only`（UAT 流程 - plan-phase --gaps 处理修复）
- `{slug}`：从 truth 生成
</step>

<step name="collect_results">
**从代理收集根本原因：**

每个代理返回：
```
## ROOT CAUSE FOUND

**Debug Session:** ${DEBUG_DIR}/{slug}.md

**Root Cause:** {带证据的具体原因}

**Evidence Summary:**
- {关键发现 1}
- {关键发现 2}
- {关键发现 3}

**Files Involved:**
- {file1}: {问题所在}
- {file2}: {相关问题}

**Suggested Fix Direction:** {给 plan-phase --gaps 的简要提示}
```

解析每个返回以提取：
- root_cause：诊断出的原因
- files：涉及的文件
- debug_path：调试会话文件路径
- suggested_fix：差距关闭方案提示

如果代理返回 `## INVESTIGATION INCONCLUSIVE`：
- root_cause："调查不确定 - 需要人工审查"
- 记录哪个问题需要人工关注
- 包含代理返回的剩余可能性
</step>

<step name="update_uat">
**使用诊断信息更新 UAT.md 差距：**

对于 Gaps 部分中的每个差距，添加 artifacts 和 missing 字段：

```yaml
- truth: "Comment appears immediately after submission"
  status: failed
  reason: "User reported: works but doesn't show until I refresh the page"
  severity: major
  test: 2
  root_cause: "useEffect in CommentList.tsx missing commentCount dependency"
  artifacts:
    - path: "src/components/CommentList.tsx"
      issue: "useEffect missing dependency"
  missing:
    - "Add commentCount to useEffect dependency array"
    - "Trigger re-render when new comment added"
  debug_session: .planning/debug/comment-not-refreshing.md
```

将前置元数据中的 status 更新为 "diagnosed"。

提交更新后的 UAT.md：
```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs({phase_num}): add root causes from diagnosis" --files ".planning/phases/XX-name/{phase_num}-UAT.md"
```
</step>

<step name="report_results">
**报告诊断结果并移交：**

显示：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 诊断完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| 差距（预期行为） | 根本原因 | 文件 |
|-------------|------------|-------|
| 评论立即显示 | useEffect 缺少依赖项 | CommentList.tsx |
| 回复按钮位置正确 | CSS flex 顺序不正确 | ReplyButton.tsx |
| 删除移除评论 | API 缺少认证头 | api/comments.ts |

调试会话：${DEBUG_DIR}/

正在进入修复规划...
```

返回给 verify-work 编排器进行自动规划。
不要提供手动后续步骤 - verify-work 会处理后续工作。
</step>

</process>

<context_efficiency>
代理从 UAT 预填症状启动（无需症状收集）。
代理只进行诊断 — plan-phase --gaps 处理修复（不应用修复）。
</context_efficiency>

<failure_handling>
**代理未能找到根本原因：**
- 将差距标记为"需要人工审查"
- 继续处理其他差距
- 报告不完整的诊断

**代理超时：**
- 检查 DEBUG-{slug}.md 的部分进展
- 可以使用 /gsd:debug 恢复

**所有代理都失败：**
- 存在系统性问题（权限、git 等）
- 报告以供人工调查
- 回退到不带根本原因的 plan-phase --gaps（精确度较低）
</failure_handling>

<success_criteria>
- [ ] 从 UAT.md 解析差距
- [ ] 并行生成调试代理
- [ ] 从所有代理收集根本原因
- [ ] 使用 artifacts 和 missing 更新 UAT.md 差距
- [ ] 调试会话保存到 ${DEBUG_DIR}/
- [ ] 移交给 verify-work 进行自动规划
</success_criteria>
</output>
