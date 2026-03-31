# UAT 模板

`.planning/phases/XX-name/{phase_num}-UAT.md` 的模板——持久化的 UAT 会话跟踪。

---

## 文件模板

```markdown
---
status: testing | partial | complete | diagnosed
phase: XX-name
source: [被测试的 SUMMARY.md 文件列表]
started: [ISO 时间戳]
updated: [ISO 时间戳]
---

## 当前测试
<!-- 每次测试时覆盖——显示我们进行到哪里 -->

number: [N]
name: [测试名称]
expected: |
  [用户应观察到的内容]
awaiting: user response

## 测试

### 1. [测试名称]
expected: [可观察的行为——用户应看到什么]
result: [pending]

### 2. [测试名称]
expected: [可观察的行为]
result: pass

### 3. [测试名称]
expected: [可观察的行为]
result: issue
reported: "[用户原始回复]"
severity: major

### 4. [测试名称]
expected: [可观察的行为]
result: skipped
reason: [跳过原因]

### 5. [测试名称]
expected: [可观察的行为]
result: blocked
blocked_by: server | physical-device | release-build | third-party | prior-phase
reason: [被阻塞的原因]

...

## 摘要

total: [N]
passed: [N]
issues: [N]
pending: [N]
skipped: [N]
blocked: [N]

## 差距

<!-- YAML 格式，供 plan-phase --gaps 使用 -->
- truth: "[来自测试的预期行为]"
  status: failed
  reason: "用户报告：[原始回复]"
  severity: blocker | major | minor | cosmetic
  test: [N]
  root_cause: ""     # 由诊断填充
  artifacts: []      # 由诊断填充
  missing: []        # 由诊断填充
  debug_session: ""  # 由诊断填充
```

---

<section_rules>

**Frontmatter：**
- `status`：覆盖写入——"testing"、"partial" 或 "complete"
- `phase`：不可变——创建时设置
- `source`：不可变——被测试的 SUMMARY 文件
- `started`：不可变——创建时设置
- `updated`：覆盖写入——每次变更时更新

**当前测试：**
- 每次测试切换时完全覆盖
- 显示哪个测试处于活跃状态及等待什么
- 完成时："[testing complete]"

**测试：**
- 每个测试：用户回复时覆盖 result 字段
- `result` 值：[pending]、pass、issue、skipped、blocked
- 如果是 issue：添加 `reported`（原始内容）和 `severity`（推断的）
- 如果是 skipped：如有提供则添加 `reason`
- 如果是 blocked：添加 `blocked_by`（标签）和 `reason`（如有提供）

**摘要：**
- 每次回复后覆盖计数
- 跟踪：total、passed、issues、pending、skipped

**差距：**
- 仅在发现问题时追加（YAML 格式）
- 诊断后：填充 `root_cause`、`artifacts`、`missing`、`debug_session`
- 此部分直接输入到 /gsd:plan-phase --gaps

</section_rules>

<diagnosis_lifecycle>

**测试完成后（status: complete），如果存在差距：**

1. 用户运行诊断（从 verify-work 的建议或手动）
2. diagnose-issues 工作流生成并行调试 agent
3. 每个 agent 调查一个差距，返回根本原因
4. UAT.md 差距部分更新诊断结果：
   - 每个差距的 `root_cause`、`artifacts`、`missing`、`debug_session` 被填充
5. status → "diagnosed"
6. 准备好使用 /gsd:plan-phase --gaps 及根本原因

**诊断后：**
```yaml
## 差距

- truth: "评论提交后立即显示"
  status: failed
  reason: "用户报告：可以用但刷新页面后才显示"
  severity: major
  test: 2
  root_cause: "CommentList.tsx 中的 useEffect 缺少 commentCount 依赖"
  artifacts:
    - path: "src/components/CommentList.tsx"
      issue: "useEffect 缺少依赖"
  missing:
    - "将 commentCount 添加到 useEffect 依赖数组"
  debug_session: ".planning/debug/comment-not-refreshing.md"
```

</diagnosis_lifecycle>

<lifecycle>

**创建：** 当 /gsd:verify-work 启动新会话时
- 从 SUMMARY.md 文件中提取测试
- 设置 status 为 "testing"
- 当前测试指向测试 1
- 所有测试的 result 为 [pending]

**测试期间：**
- 展示当前测试部分的测试
- 用户回复通过确认或问题描述
- 更新测试结果（pass/issue/skipped）
- 更新摘要计数
- 如果是 issue：追加到差距部分（YAML 格式），推断严重程度
- 将当前测试移至下一个 pending 测试

**完成时：**
- status → "complete"
- 当前测试 → "[testing complete]"
- 提交文件
- 展示摘要及后续步骤

**部分完成：**
- status → "partial"（如果还有 pending、blocked 或未解决的 skipped 测试）
- 当前测试 → "[testing paused — {N} items outstanding]"
- 提交文件
- 展示摘要并突出显示未完成项

**恢复部分会话：**
- `/gsd:verify-work {phase}` 从第一个 pending/blocked 测试继续
- 当所有项目解决后，status 推进为 "complete"

**/clear 后恢复：**
1. 读取 frontmatter → 了解阶段和状态
2. 读取当前测试 → 了解进行到哪里
3. 找到第一个 [pending] 结果 → 从那里继续
4. 摘要显示目前的进度

</lifecycle>

<severity_guide>

严重程度从用户的自然语言中推断，绝不主动询问。

| 用户描述 | 推断 |
|----------|------|
| 崩溃、错误、异常、完全失败、无法使用 | blocker |
| 不工作、没有反应、错误行为、缺失 | major |
| 能用但是...、慢、奇怪、小问题、轻微问题 | minor |
| 颜色、字体、间距、对齐、视觉、看起来不对 | cosmetic |

默认值：**major**（安全的默认值，如有误用户可以纠正）

</severity_guide>

<good_example>
```markdown
---
status: diagnosed
phase: 04-comments
source: 04-01-SUMMARY.md, 04-02-SUMMARY.md
started: 2025-01-15T10:30:00Z
updated: 2025-01-15T10:45:00Z
---

## 当前测试

[testing complete]

## 测试

### 1. 查看帖子评论
expected: 评论区展开，显示数量和评论列表
result: pass

### 2. 创建顶级评论
expected: 通过富文本编辑器提交评论，带有作者信息出现在列表中
result: issue
reported: "可以用但刷新页面后才显示"
severity: major

### 3. 回复评论
expected: 点击回复，内联编辑器出现，提交后显示嵌套回复
result: pass

### 4. 视觉嵌套
expected: 3 层以上的回复线程显示缩进、左边框，在合理深度处截止
result: pass

### 5. 删除自己的评论
expected: 点击自己评论的删除按钮，评论被移除或在有回复时显示 [已删除]
result: pass

### 6. 评论计数
expected: 帖子显示准确的计数，添加评论时递增
result: pass

## 摘要

total: 6
passed: 5
issues: 1
pending: 0
skipped: 0

## 差距

- truth: "评论提交后立即出现在列表中"
  status: failed
  reason: "用户报告：可以用但刷新页面后才显示"
  severity: major
  test: 2
  root_cause: "CommentList.tsx 中的 useEffect 缺少 commentCount 依赖"
  artifacts:
    - path: "src/components/CommentList.tsx"
      issue: "useEffect 缺少依赖"
  missing:
    - "将 commentCount 添加到 useEffect 依赖数组"
  debug_session: ".planning/debug/comment-not-refreshing.md"
```
</good_example>
