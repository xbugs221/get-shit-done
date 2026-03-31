<purpose>
跨阶段审计所有 UAT 和验证文件。查找所有未完成项（pending、skipped、blocked、human_needed），可选择性地与代码库进行对比以检测过时文档，并生成优先级排序的人工测试计划。
</purpose>

<process>

<step name="initialize">
运行 CLI 审计：

```bash
AUDIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" audit-uat --raw)
```

解析 JSON 中的 `results` 数组和 `summary` 对象。

如果 `summary.total_items` 为 0：
```
## 全部通过

所有阶段未发现未完成的 UAT 或验证项。
所有测试均已通过、已解决或已诊断并制定了修复方案。
```
在此停止。
</step>

<step name="categorize">
将项目按当前可操作项和需要前置条件的项进行分组：

**可立即测试**（无外部依赖）：
- `pending` — 从未运行的测试
- `human_uat` — 需要人工验证的项
- `skipped_unresolved` — 跳过且无明确阻塞原因

**需要前置条件：**
- `server_blocked` — 需要外部服务器运行
- `device_needed` — 需要物理设备（非模拟器）
- `build_needed` — 需要发布/预览构建
- `third_party` — 需要外部服务配置

对于"可立即测试"中的每个项，使用 Grep/Read 检查底层功能是否仍存在于代码库中：
- 如果测试引用的组件/函数已不存在 → 标记为 `stale`
- 如果测试引用的代码已被大幅重写 → 标记为 `needs_update`
- 否则 → 标记为 `active`
</step>

<step name="present">
展示审计报告：

```
## UAT 审计报告

**{total_items} 个未完成项，分布在 {phase_count} 个阶段的 {total_files} 个文件中**

### 可立即测试 ({count})

| # | 阶段 | 测试 | 描述 | 状态 |
|---|-------|------|-------------|--------|
| 1 | {phase} | {test_name} | {expected} | {active/stale/needs_update} |
...

### 需要前置条件 ({count})

| # | 阶段 | 测试 | 阻塞原因 | 描述 |
|---|-------|------|------------|-------------|
| 1 | {phase} | {test_name} | {category} | {expected} |
...

### 已过时（可关闭）({count})

| # | 阶段 | 测试 | 过时原因 |
|---|-------|------|-----------|
| 1 | {phase} | {test_name} | {reason} |
...

---

## 建议操作

1. **关闭过时项：** `/gsd:verify-work {phase}` — 将过时测试标记为已解决
2. **运行活跃测试：** 下方的人工 UAT 测试计划
3. **前置条件满足后：** 使用 `/gsd:verify-work {phase}` 重新测试被阻塞的项
```
</step>

<step name="test_plan">
仅为"可立即测试"中的 "active" 项生成人工 UAT 测试计划：

按可一起测试的内容分组（相同页面、相同功能、相同前置条件）：

```
## 人工 UAT 测试计划

### 第 1 组：{类别 — 例如 "账单流程"}
前置条件：{需要运行/配置的内容}

1. **{测试名称}** (阶段 {N})
   - 导航到：{位置}
   - 操作：{动作}
   - 预期：{预期行为}

2. **{测试名称}** (阶段 {N})
   ...

### 第 2 组：{类别}
...
```
</step>

</process>
</output>
