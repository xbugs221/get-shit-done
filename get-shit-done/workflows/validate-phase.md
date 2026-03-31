<purpose>
审计已完成阶段的 Nyquist 验证差距。生成缺失的测试。更新 VALIDATION.md。
</purpose>

<required_reading>
@~/.claude/get-shit-done/references/ui-brand.md
</required_reading>

<available_agent_types>
有效的 GSD 子 agent 类型（使用精确名称 — 不要回退到 'general-purpose'）：
- gsd-nyquist-auditor — 验证验证覆盖率
</available_agent_types>

<process>

## 0. 初始化

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init phase-op "${PHASE_ARG}")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
AGENT_SKILLS_AUDITOR=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-nyquist-auditor 2>/dev/null)
```

解析：`phase_dir`、`phase_number`、`phase_name`、`phase_slug`、`padded_phase`。

```bash
AUDITOR_MODEL=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" resolve-model gsd-nyquist-auditor --raw)
NYQUIST_CFG=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow.nyquist_validation --raw)
```

如果 `NYQUIST_CFG` 为 `false`：退出并显示"Nyquist 验证已禁用。通过 /gsd:settings 启用。"

显示横幅：`GSD > 验证阶段 {N}：{name}`

## 1. 检测输入状态

```bash
VALIDATION_FILE=$(ls "${PHASE_DIR}"/*-VALIDATION.md 2>/dev/null | head -1)
SUMMARY_FILES=$(ls "${PHASE_DIR}"/*-SUMMARY.md 2>/dev/null)
```

- **状态 A**（`VALIDATION_FILE` 非空）：审计现有内容
- **状态 B**（`VALIDATION_FILE` 为空，`SUMMARY_FILES` 非空）：从产物重建
- **状态 C**（`SUMMARY_FILES` 为空）：退出 — "阶段 {N} 未执行。请先运行 /gsd:execute-phase {N} ${GSD_WS}。"

## 2. 发现

### 2a. 读取阶段产物

读取所有 PLAN 和 SUMMARY 文件。提取：任务列表、需求 ID、修改的关键文件、验证块。

### 2b. 构建需求到任务的映射

每个任务：`{ task_id, plan_id, wave, requirement_ids, has_automated_command }`

### 2c. 检测测试基础设施

状态 A：从现有 VALIDATION.md 的测试基础设施表中解析。
状态 B：文件系统扫描：

```bash
find . -name "pytest.ini" -o -name "jest.config.*" -o -name "vitest.config.*" -o -name "pyproject.toml" 2>/dev/null | head -10
find . \( -name "*.test.*" -o -name "*.spec.*" -o -name "test_*" \) -not -path "*/node_modules/*" 2>/dev/null | head -40
```

### 2d. 交叉引用

通过文件名、导入、测试描述将每个需求与现有测试匹配。记录：需求 → 测试文件 → 状态。

## 3. 差距分析

对每个需求进行分类：

| 状态 | 标准 |
|------|------|
| COVERED | 测试存在，针对行为，运行通过 |
| PARTIAL | 测试存在，失败或不完整 |
| MISSING | 未找到测试 |

构建：`{ task_id, requirement, gap_type, suggested_test_path, suggested_command }`

无差距 → 跳到步骤 6，设置 `nyquist_compliant: true`。

## 4. 呈现差距计划

使用 AskUserQuestion 展示差距表和选项：
1. "修复所有差距" → 步骤 5
2. "跳过 — 标记为仅手动" → 添加到仅手动列表，步骤 6
3. "取消" → 退出

## 5. 生成 gsd-nyquist-auditor

```
Task(
  prompt="阅读 ~/.claude/agents/gsd-nyquist-auditor.md 获取指令。\n\n" +
    "<files_to_read>{PLAN、SUMMARY、实现文件、VALIDATION.md}</files_to_read>" +
    "<gaps>{差距列表}</gaps>" +
    "<test_infrastructure>{框架、配置、命令}</test_infrastructure>" +
    "<constraints>永远不要修改实现文件。最多 3 次调试迭代。上报实现 bug。</constraints>" +
    "${AGENT_SKILLS_AUDITOR}",
  subagent_type="gsd-nyquist-auditor",
  model="{AUDITOR_MODEL}",
  description="填充阶段 {N} 的验证差距"
)
```

处理返回：
- `## GAPS FILLED` → 记录测试 + 映射更新，步骤 6
- `## PARTIAL` → 记录已解决的，将上报的移至仅手动，步骤 6
- `## ESCALATE` → 将所有移至仅手动，步骤 6

## 6. 生成/更新 VALIDATION.md

**状态 B（创建）：**
1. 从 `~/.claude/get-shit-done/templates/VALIDATION.md` 读取模板
2. 填充：前置元数据、测试基础设施、每任务映射、仅手动列表、签核
3. 写入 `${PHASE_DIR}/${PADDED_PHASE}-VALIDATION.md`

**状态 A（更新）：**
1. 更新每任务映射状态，将上报的添加到仅手动列表，更新前置元数据
2. 追加审计记录：

```markdown
## 验证审计 {日期}
| 指标 | 数量 |
|------|------|
| 发现差距 | {N} |
| 已解决 | {M} |
| 已上报 | {K} |
```

## 7. 提交

```bash
git add {test_files}
git commit -m "test(phase-${PHASE}): add Nyquist validation tests"

node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs(phase-${PHASE}): add/update validation strategy"
```

## 8. 结果及路由

**合规：**
```
GSD > 阶段 {N} 符合 NYQUIST 标准
所有需求均有自动化验证。
▶ 下一步：/gsd:audit-milestone ${GSD_WS}
```

**部分合规：**
```
GSD > 阶段 {N} 已验证（部分）
{M} 个自动化，{K} 个仅手动。
▶ 重试：/gsd:validate-phase {N} ${GSD_WS}
```

显示 `/clear` 提醒。

</process>

<success_criteria>
- [ ] 已检查 Nyquist 配置（如禁用则退出）
- [ ] 已检测输入状态（A/B/C）
- [ ] 状态 C 正常退出
- [ ] 已读取 PLAN/SUMMARY 文件，已构建需求映射
- [ ] 已检测测试基础设施
- [ ] 差距已分类（COVERED/PARTIAL/MISSING）
- [ ] 用户关卡包含差距表
- [ ] 已生成审计器并提供完整上下文
- [ ] 已处理所有三种返回格式
- [ ] VALIDATION.md 已创建或更新
- [ ] 测试文件已单独提交
- [ ] 已呈现带路由的结果
</success_criteria>
</output>
