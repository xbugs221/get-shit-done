<purpose>
创建所有必要的阶段以关闭 `/gsd:audit-milestone` 识别出的差距。读取 MILESTONE-AUDIT.md，将差距分组为逻辑阶段，在 ROADMAP.md 中创建阶段条目，并提供规划每个阶段的选项。一个命令创建所有修复阶段 — 无需每个差距手动执行 `/gsd:add-phase`。
</purpose>

<required_reading>
在开始之前，阅读调用提示的 execution_context 中引用的所有文件。
</required_reading>

<process>

## 1. 加载审计结果

```bash
# 查找最近的审计文件
(ls -t .planning/v*-MILESTONE-AUDIT.md 2>/dev/null || true) | head -1
```

解析 YAML 前置元数据以提取结构化差距：
- `gaps.requirements` — 未满足的需求
- `gaps.integration` — 缺失的跨阶段连接
- `gaps.flows` — 断裂的端到端流程

如果审计文件不存在或没有差距，报错：
```
未找到审计差距。请先运行 `/gsd:audit-milestone`。
```

## 2. 确定差距优先级

按 REQUIREMENTS.md 中的优先级对差距进行分组：

| 优先级 | 操作 |
|--------|------|
| `must` | 创建阶段，阻塞里程碑 |
| `should` | 创建阶段，建议执行 |
| `nice` | 询问用户：包含还是推迟？ |

对于集成/流程差距，从受影响的需求推断优先级。

## 3. 将差距分组为阶段

将相关差距聚类为逻辑阶段：

**分组规则：**
- 相同受影响阶段 → 合并为一个修复阶段
- 相同子系统（认证、API、UI） → 合并
- 依赖顺序（先修复桩代码再连接）
- 保持阶段聚焦：每个 2-4 个任务

**分组示例：**
```
差距：DASH-01 未满足（仪表盘未获取数据）
差距：集成 阶段 1→3（认证未传递到 API 调用）
差距：流程"查看仪表盘"在数据获取处断裂

→ 阶段 6："连接仪表盘到 API"
  - 在 Dashboard.tsx 中添加数据获取
  - 在获取请求中包含认证头
  - 处理响应，更新状态
  - 渲染用户数据
```

## 4. 确定阶段编号

查找最高的现有阶段：
```bash
# 获取排序后的阶段列表，提取最后一个
HIGHEST=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" phases list --pick directories[-1])
```

新阶段从此处继续编号：
- 如果阶段 5 是最高的，差距变为阶段 6、7、8...

## 5. 呈现差距关闭计划

```markdown
## 差距关闭计划

**里程碑：** {version}
**待关闭差距：** {N} 个需求，{M} 个集成，{K} 个流程

### 建议的阶段

**阶段 {N}：{名称}**
关闭：
- {REQ-ID}：{描述}
- 集成：{来源} → {目标}
任务数：{count}

**阶段 {N+1}：{名称}**
关闭：
- {REQ-ID}：{描述}
- 流程：{流程名称}
任务数：{count}

{如果存在可选差距：}

### 推迟（可选项）

这些差距是可选的。是否包含？
- {差距描述}
- {差距描述}

---

创建这 {X} 个阶段？（是 / 调整 / 推迟所有可选项）
```

等待用户确认。

## 6. 更新 ROADMAP.md

将新阶段添加到当前里程碑：

```markdown
### 阶段 {N}：{名称}
**目标：** {从待关闭的差距推导}
**需求：** {正在满足的 REQ-ID}
**差距关闭：** 关闭审计中的差距

### 阶段 {N+1}：{名称}
...
```

## 7. 更新 REQUIREMENTS.md 追溯表（必需）

对于每个分配到差距关闭阶段的 REQ-ID：
- 更新阶段列以反映新的差距关闭阶段
- 将状态重置为 `Pending`

重置审计中发现未满足的已勾选需求：
- 将审计中标记为未满足的任何需求从 `[x]` 改为 `[ ]`
- 更新 REQUIREMENTS.md 顶部的覆盖计数

```bash
# 验证追溯表反映了差距关闭分配
grep -c "Pending" .planning/REQUIREMENTS.md
```

## 8. 创建阶段目录

```bash
mkdir -p ".planning/phases/{NN}-{name}"
```

## 9. 提交路线图和需求更新

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs(roadmap): add gap closure phases {N}-{M}" --files .planning/ROADMAP.md .planning/REQUIREMENTS.md
```

## 10. 提供后续步骤

```markdown
## ✓ 差距关闭阶段已创建

**已添加阶段：** {N} - {M}
**已处理差距：** {count} 个需求，{count} 个集成，{count} 个流程

---

## ▶ 下一步

**规划第一个差距关闭阶段**

`/gsd:plan-phase {N}`

<sub>`/clear` 先清除 → 全新的上下文窗口</sub>

---

**其他可用命令：**
- `/gsd:execute-phase {N}` — 如果计划已存在
- `cat .planning/ROADMAP.md` — 查看更新后的路线图

---

**所有差距阶段完成后：**

`/gsd:audit-milestone` — 重新审计以验证差距已关闭
`/gsd:complete-milestone {version}` — 审计通过后归档
```

</process>

<gap_to_phase_mapping>

## 差距如何转化为任务

**需求差距 → 任务：**
```yaml
gap:
  id: DASH-01
  description: "用户看到自己的数据"
  reason: "仪表盘存在但未从 API 获取数据"
  missing:
    - "带有 fetch 调用 /api/user/data 的 useEffect"
    - "用户数据的状态"
    - "在 JSX 中渲染用户数据"

becomes:

phase: "连接仪表盘数据"
tasks:
  - name: "添加数据获取"
    files: [src/components/Dashboard.tsx]
    action: "添加在挂载时获取 /api/user/data 的 useEffect"

  - name: "添加状态管理"
    files: [src/components/Dashboard.tsx]
    action: "为 userData、loading、error 状态添加 useState"

  - name: "渲染用户数据"
    files: [src/components/Dashboard.tsx]
    action: "将占位符替换为 userData.map 渲染"
```

**集成差距 → 任务：**
```yaml
gap:
  from_phase: 1
  to_phase: 3
  connection: "认证令牌 → API 调用"
  reason: "仪表盘 API 调用未包含认证头"
  missing:
    - "获取调用中的认证头"
    - "401 时的令牌刷新"

becomes:

phase: "为仪表盘 API 调用添加认证"
tasks:
  - name: "在获取请求中添加认证头"
    files: [src/components/Dashboard.tsx, src/lib/api.ts]
    action: "在所有 API 调用中包含带令牌的 Authorization 头"

  - name: "处理 401 响应"
    files: [src/lib/api.ts]
    action: "添加拦截器，在 401 时刷新令牌或重定向到登录页"
```

**流程差距 → 任务：**
```yaml
gap:
  name: "用户登录后查看仪表盘"
  broken_at: "仪表盘数据加载"
  reason: "没有获取调用"
  missing:
    - "挂载时获取用户数据"
    - "显示加载状态"
    - "渲染用户数据"

becomes:

# 通常与需求/集成差距属于同一阶段
# 流程差距通常与其他差距类型重叠
```

</gap_to_phase_mapping>

<success_criteria>
- [ ] MILESTONE-AUDIT.md 已加载且差距已解析
- [ ] 差距已确定优先级（must/should/nice）
- [ ] 差距已分组为逻辑阶段
- [ ] 用户已确认阶段计划
- [ ] ROADMAP.md 已更新为新阶段
- [ ] REQUIREMENTS.md 追溯表已更新差距关闭阶段分配
- [ ] 未满足需求的复选框已重置（`[x]` → `[ ]`）
- [ ] REQUIREMENTS.md 中的覆盖计数已更新
- [ ] 阶段目录已创建
- [ ] 变更已提交（包括 REQUIREMENTS.md）
- [ ] 用户知道下一步运行 `/gsd:plan-phase`
</success_criteria>
</output>
