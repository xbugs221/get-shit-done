<purpose>
基于已完成阶段的 SUMMARY.md、CONTEXT.md 和实现代码，生成单元测试和端到端测试。将每个更改的文件分类为 TDD（单元）、E2E（浏览器）或 Skip 类别，向用户展示测试计划以获取批准，然后按照 RED-GREEN 惯例生成测试。

用户目前在每个阶段后手动编写 `/gsd:quick` 提示来生成测试。此工作流通过适当的分类、质量门禁和缺口报告来标准化该过程。
</purpose>

<required_reading>
在开始之前，读取调用提示的 execution_context 中引用的所有文件。
</required_reading>

<process>

<step name="parse_arguments">
从 `$ARGUMENTS` 中解析：
- 阶段编号（整数、小数或字母后缀）→ 存储为 `$PHASE_ARG`
- 阶段编号之后的剩余文本 → 存储为 `$EXTRA_INSTRUCTIONS`（可选）

示例：`/gsd:add-tests 12 focus on edge cases` → `$PHASE_ARG=12`，`$EXTRA_INSTRUCTIONS="focus on edge cases"`

如果未提供阶段参数：

```
ERROR: Phase number required
Usage: /gsd:add-tests <phase> [additional instructions]
Example: /gsd:add-tests 12
Example: /gsd:add-tests 12 focus on edge cases in the pricing module
```

退出。
</step>

<step name="init_context">
加载阶段操作上下文：

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init phase-op "${PHASE_ARG}")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

从初始化 JSON 中提取：`phase_dir`、`phase_number`、`phase_name`。

验证阶段目录是否存在。如果不存在：
```
ERROR: Phase directory not found for phase ${PHASE_ARG}
Ensure the phase exists in .planning/phases/
```
退出。

按优先级顺序读取阶段产物：
1. `${phase_dir}/*-SUMMARY.md` — 实现了什么，更改了哪些文件
2. `${phase_dir}/CONTEXT.md` — 验收标准，决策
3. `${phase_dir}/*-VERIFICATION.md` — 用户验证的场景（如果做了 UAT）

如果没有 SUMMARY.md：
```
ERROR: No SUMMARY.md found for phase ${PHASE_ARG}
This command works on completed phases. Run /gsd:execute-phase first.
```
退出。

展示横幅：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► ADD TESTS — Phase ${phase_number}: ${phase_name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
</step>

<step name="analyze_implementation">
从 SUMMARY.md 的 "Files Changed" 或等效部分提取阶段修改的文件列表。

对于每个文件，分类为以下三个类别之一：

| 类别 | 标准 | 测试类型 |
|----------|----------|-----------|
| **TDD** | 可以编写 `expect(fn(input)).toBe(output)` 的纯函数 | 单元测试 |
| **E2E** | 可通过浏览器自动化验证的 UI 行为 | Playwright/E2E 测试 |
| **Skip** | 无法有效测试或已被覆盖 | 无 |

**TDD 分类 — 适用于：**
- 业务逻辑：计算、定价、税务规则、验证
- 数据转换：映射、过滤、聚合、格式化
- 解析器：CSV、JSON、XML、自定义格式解析
- 验证器：输入验证、模式验证、业务规则
- 状态机：状态转换、工作流步骤
- 工具函数：字符串操作、日期处理、数字格式化

**E2E 分类 — 适用于：**
- 键盘快捷键：按键绑定、修饰键、组合键序列
- 导航：页面转换、路由、面包屑、前进/后退
- 表单交互：提交、验证错误、焦点、自动补全
- 选择：行选择、多选、Shift 点击范围
- 拖放：重新排序、在容器间移动
- 模态对话框：打开、关闭、确认、取消
- 数据网格：排序、过滤、内联编辑、列调整大小

**Skip 分类 — 适用于：**
- UI 布局/样式：CSS 类、视觉外观、响应式断点
- 配置：配置文件、环境变量、功能开关
- 胶水代码：依赖注入设置、中间件注册、路由表
- 迁移：数据库迁移、模式变更
- 简单 CRUD：没有业务逻辑的基本创建/读取/更新/删除
- 类型定义：没有逻辑的记录、DTO、接口

读取每个文件以验证分类。不要仅根据文件名分类。
</step>

<step name="present_classification">
在继续之前向用户展示分类以获取确认：

```
AskUserQuestion(
  header: "Test Classification",
  question: |
    ## Files classified for testing

    ### TDD (Unit Tests) — {N} files
    {list of files with brief reason}

    ### E2E (Browser Tests) — {M} files
    {list of files with brief reason}

    ### Skip — {K} files
    {list of files with brief reason}

    {if $EXTRA_INSTRUCTIONS: "Additional instructions: ${EXTRA_INSTRUCTIONS}"}

    How would you like to proceed?
  options:
    - "Approve and generate test plan"
    - "Adjust classification (I'll specify changes)"
    - "Cancel"
)
```

如果用户选择 "Adjust classification"：应用其更改并重新展示。
如果用户选择 "Cancel"：优雅退出。
</step>

<step name="discover_test_structure">
在生成测试计划之前，发现项目的现有测试结构：

```bash
# 查找现有测试目录
find . -type d -name "*test*" -o -name "*spec*" -o -name "*__tests__*" 2>/dev/null | head -20
# 查找现有测试文件以匹配命名约定
find . -type f \( -name "*.test.*" -o -name "*.spec.*" -o -name "*Tests.fs" -o -name "*Test.fs" \) 2>/dev/null | head -20
# 检查测试运行器
ls package.json *.sln 2>/dev/null || true
```

识别：
- 测试目录结构（单元测试在哪里，E2E 测试在哪里）
- 命名约定（`.test.ts`、`.spec.ts`、`*Tests.fs` 等）
- 测试运行器命令（如何执行单元测试，如何执行 E2E 测试）
- 测试框架（xUnit、NUnit、Jest、Playwright 等）

如果测试结构不明确，询问用户：
```
AskUserQuestion(
  header: "Test Structure",
  question: "I found multiple test locations. Where should I create tests?",
  options: [list discovered locations]
)
```
</step>

<step name="generate_test_plan">
为每个已批准的文件创建详细的测试计划。

**对于 TDD 文件**，按照 RED-GREEN-REFACTOR 规划测试：
1. 识别文件中可测试的函数/方法
2. 对于每个函数：列出输入场景、预期输出、边界情况
3. 注意：由于代码已存在，测试可能会立即通过 — 这没问题，但要验证它们测试的是正确的行为

**对于 E2E 文件**，按照 RED-GREEN 门禁规划测试：
1. 从 CONTEXT.md/VERIFICATION.md 识别用户场景
2. 对于每个场景：描述用户操作、预期结果、断言
3. 注意：RED 门禁意味着确认如果功能被破坏测试将会失败

展示完整的测试计划：

```
AskUserQuestion(
  header: "Test Plan",
  question: |
    ## Test Generation Plan

    ### Unit Tests ({N} tests across {M} files)
    {for each file: test file path, list of test cases}

    ### E2E Tests ({P} tests across {Q} files)
    {for each file: test file path, list of test scenarios}

    ### Test Commands
    - Unit: {discovered test command}
    - E2E: {discovered e2e command}

    Ready to generate?
  options:
    - "Generate all"
    - "Cherry-pick (I'll specify which)"
    - "Adjust plan"
)
```

如果 "Cherry-pick"：询问用户要包含哪些测试。
如果 "Adjust plan"：应用更改并重新展示。
</step>

<step name="execute_tdd_generation">
对于每个已批准的 TDD 测试：

1. **创建测试文件**，遵循发现的项目约定（目录、命名、导入）

2. **编写测试**，使用清晰的 arrange/act/assert 结构：
   ```
   // Arrange — 设置输入和预期输出
   // Act — 调用被测函数
   // Assert — 验证输出匹配预期
   ```

3. **运行测试**：
   ```bash
   {discovered test command}
   ```

4. **评估结果：**
   - **测试通过**：好 — 实现满足测试。验证测试检查的是有意义的行为（而不仅仅是能编译）。
   - **测试因断言错误失败**：这可能是测试发现的真正 bug。标记它：
     ```
     ⚠️ Potential bug found: {test name}
     Expected: {expected}
     Actual: {actual}
     File: {implementation file}
     ```
     不要修复实现 — 这是测试生成命令，不是修复命令。记录发现。
   - **测试因错误失败（导入、语法等）**：这是测试错误。修复测试并重新运行。
</step>

<step name="execute_e2e_generation">
对于每个已批准的 E2E 测试：

1. **检查是否已有测试**覆盖相同场景：
   ```bash
   grep -r "{scenario keyword}" {e2e test directory} 2>/dev/null || true
   ```
   如果找到，扩展而不是复制。

2. **创建测试文件**，针对 CONTEXT.md/VERIFICATION.md 中的用户场景

3. **运行 E2E 测试**：
   ```bash
   {discovered e2e command}
   ```

4. **评估结果：**
   - **GREEN（通过）**：记录成功
   - **RED（失败）**：确定是测试问题还是真正的应用 bug。标记 bug：
     ```
     ⚠️ E2E failure: {test name}
     Scenario: {description}
     Error: {error message}
     ```
   - **无法运行**：报告阻塞因素。不要标记为完成。
     ```
     🛑 E2E blocker: {reason tests cannot run}
     ```

**不可跳过规则：** 如果 E2E 测试无法执行（缺少依赖、环境问题），报告阻塞因素并将测试标记为未完成。永远不要在没有实际运行测试的情况下标记成功。
</step>

<step name="summary_and_commit">
创建测试覆盖报告并展示给用户：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► TEST GENERATION COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Results

| Category | Generated | Passing | Failing | Blocked |
|----------|-----------|---------|---------|---------|
| Unit     | {N}       | {n1}    | {n2}    | {n3}    |
| E2E      | {M}       | {m1}    | {m2}    | {m3}    |

## Files Created/Modified
{list of test files with paths}

## Coverage Gaps
{areas that couldn't be tested and why}

## Bugs Discovered
{any assertion failures that indicate implementation bugs}
```

在项目状态中记录测试生成：
```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" state-snapshot
```

如果有通过的测试要提交：

```bash
git add {test files}
git commit -m "test(phase-${phase_number}): add unit and E2E tests from add-tests command"
```

展示下一步操作：

```
---

## ▶ Next Up

{if bugs discovered:}
**Fix discovered bugs:** `/gsd:quick fix the {N} test failures discovered in phase ${phase_number}`

{if blocked tests:}
**Resolve test blockers:** {description of what's needed}

{otherwise:}
**All tests passing!** Phase ${phase_number} is fully tested.

---

**Also available:**
- `/gsd:add-tests {next_phase}` — test another phase
- `/gsd:verify-work {phase_number}` — run UAT verification

---
```
</step>

</process>

<success_criteria>
- [ ] 阶段产物已加载（SUMMARY.md、CONTEXT.md，可选 VERIFICATION.md）
- [ ] 所有更改的文件已分类为 TDD/E2E/Skip 类别
- [ ] 分类已展示给用户并获得批准
- [ ] 已发现项目测试结构（目录、约定、运行器）
- [ ] 测试计划已展示给用户并获得批准
- [ ] TDD 测试已按 arrange/act/assert 结构生成
- [ ] E2E 测试已针对用户场景生成
- [ ] 所有测试已执行 — 没有未运行的测试被标记为通过
- [ ] 测试发现的 bug 已标记（未修复）
- [ ] 测试文件已使用正确的消息提交
- [ ] 覆盖缺口已记录
- [ ] 下一步操作已展示给用户
</success_criteria>
