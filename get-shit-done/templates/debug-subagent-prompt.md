# 调试子 Agent 提示模板

用于生成 gsd-debugger agent 的模板。Agent 自身包含所有调试专业知识——本模板仅提供问题上下文。

---

## 模板

```markdown
<objective>
调查问题：{issue_id}

**摘要：** {issue_summary}
</objective>

<symptoms>
expected: {expected}
actual: {actual}
errors: {errors}
reproduction: {reproduction}
timeline: {timeline}
</symptoms>

<mode>
symptoms_prefilled: {true_or_false}
goal: {find_root_cause_only | find_and_fix}
</mode>

<debug_file>
创建：.planning/debug/{slug}.md
</debug_file>
```

---

## 占位符

| 占位符 | 来源 | 示例 |
|--------|------|------|
| `{issue_id}` | 编排器分配 | `auth-screen-dark` |
| `{issue_summary}` | 用户描述 | `认证界面太暗` |
| `{expected}` | 来自症状 | `清楚地看到 logo` |
| `{actual}` | 来自症状 | `界面是暗的` |
| `{errors}` | 来自症状 | `控制台无报错` |
| `{reproduction}` | 来自症状 | `打开 /auth 页面` |
| `{timeline}` | 来自症状 | `最近一次部署之后` |
| `{goal}` | 编排器设置 | `find_and_fix` |
| `{slug}` | 自动生成 | `auth-screen-dark` |

---

## 用法

**从 /gsd:debug 调用：**
```python
Task(
  prompt=filled_template,
  subagent_type="gsd-debugger",
  description="调试 {slug}"
)
```

**从 diagnose-issues（UAT）调用：**
```python
Task(prompt=template, subagent_type="gsd-debugger", description="调试 UAT-001")
```

---

## 继续调试

对于检查点，使用以下内容生成新的 agent：

```markdown
<objective>
继续调试 {slug}。证据在调试文件中。
</objective>

<prior_state>
调试文件：@.planning/debug/{slug}.md
</prior_state>

<checkpoint_response>
**类型：** {checkpoint_type}
**回复：** {user_response}
</checkpoint_response>

<mode>
goal: {goal}
</mode>
```
