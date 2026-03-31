<purpose>
通过目标反推分析验证阶段目标的达成情况。检查代码库是否交付了阶段承诺的内容，而不仅仅是任务是否完成。

由 execute-phase.md 生成的验证子 agent 执行。
</purpose>

<core_principle>
**任务完成 ≠ 目标达成**

一个"创建聊天组件"的任务可以在组件只是占位符时被标记为完成。任务完成了 — 但"可用的聊天界面"这个目标并未达成。

目标反推验证：
1. 要达成目标，什么必须为真？
2. 要使这些条件成立，什么必须存在？
3. 要使这些产物运作，什么必须连接？

然后针对实际代码库验证每个层级。
</core_principle>

<required_reading>
@~/.claude/get-shit-done/references/verification-patterns.md
@~/.claude/get-shit-done/templates/verification-report.md
</required_reading>

<process>

<step name="load_context" priority="first">
加载阶段操作上下文：

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init phase-op "${PHASE_ARG}")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

从初始化 JSON 中提取：`phase_dir`、`phase_number`、`phase_name`、`has_plans`、`plan_count`。

然后加载阶段详情并列出计划/摘要：
```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" roadmap get-phase "${phase_number}"
grep -E "^| ${phase_number}" .planning/REQUIREMENTS.md 2>/dev/null || true
ls "$phase_dir"/*-SUMMARY.md "$phase_dir"/*-PLAN.md 2>/dev/null || true
```

从 ROADMAP.md 中提取**阶段目标**（要验证的结果，而非任务）和 REQUIREMENTS.md 中的**需求**（如果存在）。
</step>

<step name="establish_must_haves">
**选项 A：PLAN 前置元数据中的必须项**

使用 gsd-tools 从每个 PLAN 中提取 must_haves：

```bash
for plan in "$PHASE_DIR"/*-PLAN.md; do
  MUST_HAVES=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" frontmatter get "$plan" --field must_haves)
  echo "=== $plan ===" && echo "$MUST_HAVES"
done
```

返回 JSON：`{ truths: [...], artifacts: [...], key_links: [...] }`

汇总所有计划的 must_haves 用于阶段级验证。

**选项 B：使用 ROADMAP.md 中的成功标准**

如果前置元数据中没有 must_haves（MUST_HAVES 返回错误或为空），检查成功标准：

```bash
PHASE_DATA=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" roadmap get-phase "${phase_number}" --raw)
```

从 JSON 输出中解析 `success_criteria` 数组。如果非空：
1. 直接将每个成功标准用作**真值条件**（它们已经以可观察、可测试的行为形式编写）
2. 推导**产物**（每个真值条件对应的具体文件路径）
3. 推导**关键连接**（桩代码隐藏的关键连线）
4. 在继续之前记录必须项

ROADMAP.md 中的成功标准是合约 — 当两者都存在时，它们优先于 PLAN 级的 must_haves。

**选项 C：从阶段目标推导（回退方案）**

如果前置元数据中没有 must_haves 且 ROADMAP 中没有成功标准：
1. 陈述 ROADMAP.md 中的目标
2. 推导**真值条件**（3-7 个可观察行为，每个可测试）
3. 推导**产物**（每个真值条件对应的具体文件路径）
4. 推导**关键连接**（桩代码隐藏的关键连线）
5. 在继续之前记录推导的必须项
</step>

<step name="verify_truths">
对于每个可观察的真值条件，确定代码库是否支持它。

**状态：** ✓ VERIFIED（所有支持产物通过）| ✗ FAILED（产物缺失/桩代码/未连接）| ? UNCERTAIN（需要人工）

对于每个真值条件：识别支持产物 → 检查产物状态 → 检查连线 → 确定真值条件状态。

**示例：** 真值条件"用户可以看到现有消息"依赖于 Chat.tsx（渲染）、/api/chat GET（提供数据）、Message 模型（schema）。如果 Chat.tsx 是桩代码或 API 返回硬编码的 [] → FAILED。如果全部存在、有实质内容且已连接 → VERIFIED。
</step>

<step name="verify_artifacts">
使用 gsd-tools 针对每个 PLAN 中的 must_haves 进行产物验证：

```bash
for plan in "$PHASE_DIR"/*-PLAN.md; do
  ARTIFACT_RESULT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" verify artifacts "$plan")
  echo "=== $plan ===" && echo "$ARTIFACT_RESULT"
done
```

解析 JSON 结果：`{ all_passed, passed, total, artifacts: [{path, exists, issues, passed}] }`

**从结果得出的产物状态：**
- `exists=false` → MISSING
- `issues` 不为空 → STUB（检查 issues 中的"Only N lines"或"Missing pattern"）
- `passed=true` → VERIFIED（级别 1-2 通过）

**级别 3 — 已连接（对通过级别 1-2 的产物进行手动检查）：**
```bash
grep -r "import.*$artifact_name" src/ --include="*.ts" --include="*.tsx"  # 已导入
grep -r "$artifact_name" src/ --include="*.ts" --include="*.tsx" | grep -v "import"  # 已使用
```
WIRED = 已导入且已使用。ORPHANED = 存在但未导入/使用。

| 存在 | 有实质内容 | 已连接 | 状态 |
|------|-----------|--------|------|
| ✓ | ✓ | ✓ | ✓ VERIFIED |
| ✓ | ✓ | ✗ | ⚠️ ORPHANED |
| ✓ | ✗ | - | ✗ STUB |
| ✗ | - | - | ✗ MISSING |

**导出级别抽查（WARNING 严重级别）：**

对于通过级别 3 的产物，抽查各个导出：
- 提取关键导出符号（函数、常量、类 — 跳过类型/接口）
- 对每个，在定义文件外 grep 其用法
- 将零外部调用点的导出标记为"已导出但未使用"

这能捕获像 `setPlan()` 这样的死存储 — 存在于已连接的文件中但从未
实际被调用。报告为 WARNING — 可能表明跨计划连线不完整
或来自计划修订的残留代码。
</step>

<step name="verify_wiring">
使用 gsd-tools 针对每个 PLAN 中的 must_haves 进行关键连接验证：

```bash
for plan in "$PHASE_DIR"/*-PLAN.md; do
  LINKS_RESULT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" verify key-links "$plan")
  echo "=== $plan ===" && echo "$LINKS_RESULT"
done
```

解析 JSON 结果：`{ all_verified, verified, total, links: [{from, to, via, verified, detail}] }`

**从结果得出的连接状态：**
- `verified=true` → WIRED
- `verified=false` 含 "not found" → NOT_WIRED
- `verified=false` 含 "Pattern not found" → PARTIAL

**回退模式（如果 must_haves 中没有 key_links）：**

| 模式 | 检查 | 状态 |
|------|------|------|
| 组件 → API | 向 API 路径发起 fetch/axios 调用，响应被使用（await/.then/setState） | WIRED / PARTIAL（调用但未使用响应）/ NOT_WIRED |
| API → 数据库 | 对模型的 Prisma/DB 查询，结果通过 res.json() 返回 | WIRED / PARTIAL（查询但未返回）/ NOT_WIRED |
| 表单 → 处理器 | onSubmit 有实际实现（fetch/axios/mutate/dispatch），不是 console.log/空 | WIRED / STUB（仅 log/空）/ NOT_WIRED |
| 状态 → 渲染 | useState 变量出现在 JSX 中（`{stateVar}` 或 `{stateVar.property}`） | WIRED / NOT_WIRED |

记录每个关键连接的状态和证据。
</step>

<step name="verify_requirements">
如果 REQUIREMENTS.md 存在：
```bash
grep -E "Phase ${PHASE_NUM}" .planning/REQUIREMENTS.md 2>/dev/null || true
```

对于每个需求：解析描述 → 识别支持的真值条件/产物 → 状态：✓ SATISFIED / ✗ BLOCKED / ? NEEDS HUMAN。
</step>

<step name="scan_antipatterns">
从 SUMMARY.md 中提取本阶段修改的文件，扫描每个文件：

| 模式 | 搜索 | 严重级别 |
|------|------|----------|
| TODO/FIXME/XXX/HACK | `grep -n -E "TODO\|FIXME\|XXX\|HACK"` | ⚠️ 警告 |
| 占位符内容 | `grep -n -iE "placeholder\|coming soon\|will be here"` | 🛑 阻塞 |
| 空返回 | `grep -n -E "return null\|return \{\}\|return \[\]\|=> \{\}"` | ⚠️ 警告 |
| 仅日志函数 | 仅包含 console.log 的函数 | ⚠️ 警告 |

分类：🛑 阻塞（阻止目标达成）| ⚠️ 警告（不完整）| ℹ️ 信息（值得注意）。
</step>

<step name="identify_human_verification">
**总是需要人工验证的：** 视觉外观、用户流程完成度、实时行为（WebSocket/SSE）、外部服务集成、性能感受、错误消息清晰度。

**不确定时需要人工验证的：** 复杂的 grep 无法追踪的连线、依赖动态状态的行为、边界情况。

格式化为：测试名称 → 操作步骤 → 预期结果 → 为什么无法通过程序验证。
</step>

<step name="determine_status">
**passed：** 所有真值条件 VERIFIED，所有产物通过级别 1-3，所有关键连接 WIRED，无阻塞级反模式。

**gaps_found：** 任何真值条件 FAILED，产物 MISSING/STUB，关键连接 NOT_WIRED，或发现阻塞项。

**human_needed：** 所有自动化检查通过但仍有人工验证项。

**评分：** `已验证真值条件 / 总真值条件`
</step>

<step name="generate_fix_plans">
如果 gaps_found：

1. **聚类相关差距：** API 桩代码 + 组件未连接 → "连接前端到后端"。多个缺失 → "完成核心实现"。仅连线问题 → "连接现有组件"。

2. **为每个聚类生成计划：** 目标、2-3 个任务（每个包含文件/操作/验证）、重新验证步骤。保持聚焦：每个计划单一关注点。

3. **按依赖排序：** 修复缺失 → 修复桩代码 → 修复连线 → 验证。
</step>

<step name="create_report">
```bash
REPORT_PATH="$PHASE_DIR/${PHASE_NUM}-VERIFICATION.md"
```

填充模板各部分：前置元数据（阶段/时间戳/状态/评分）、目标达成情况、产物表、连线表、需求覆盖率、反模式、人工验证项、差距摘要、修复计划（如果 gaps_found）、元数据。

参见 ~/.claude/get-shit-done/templates/verification-report.md 获取完整模板。
</step>

<step name="return_to_orchestrator">
返回状态（`passed` | `gaps_found` | `human_needed`）、评分（N/M 必须项）、报告路径。

如果 gaps_found：列出差距 + 推荐的修复计划名称。
如果 human_needed：列出需要人工测试的项目。

编排器路由：`passed` → update_roadmap | `gaps_found` → 创建/执行修复，重新验证 | `human_needed` → 呈现给用户。
</step>

</process>

<success_criteria>
- [ ] 必须项已建立（从前置元数据或推导）
- [ ] 所有真值条件已验证并附状态和证据
- [ ] 所有产物已在三个级别全部检查
- [ ] 所有关键连接已验证
- [ ] 需求覆盖率已评估（如适用）
- [ ] 反模式已扫描并分类
- [ ] 人工验证项已识别
- [ ] 总体状态已确定
- [ ] 修复计划已生成（如果 gaps_found）
- [ ] VERIFICATION.md 已创建并包含完整报告
- [ ] 结果已返回给编排器
</success_criteria>
</output>
