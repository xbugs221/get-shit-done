<purpose>
编排完整的开发者画像流程：同意确认、会话分析（或问卷回退）、画像生成、结果展示和产物创建。

本工作流将阶段 1（会话管道）和阶段 2（画像引擎）整合为一个连贯的用户体验。所有繁重的工作由现有的 gsd-tools.cjs 子命令和 gsd-user-profiler agent 完成 — 本工作流负责编排流程序列、处理分支和提供用户体验。
</purpose>

<required_reading>
在开始之前，阅读调用提示的 execution_context 中引用的所有文件。

关键参考：
- @$HOME/.claude/get-shit-done/references/ui-brand.md（显示模式）
- @$HOME/.claude/get-shit-done/agents/gsd-user-profiler.md（画像 agent 定义）
- @$HOME/.claude/get-shit-done/references/user-profiling.md（画像参考文档）
</required_reading>

<process>

## 1. 初始化

从 $ARGUMENTS 解析标志：
- 检测 `--questionnaire` 标志（跳过会话分析，仅使用问卷）
- 检测 `--refresh` 标志（即使画像已存在也重新构建）

检查是否存在画像：

```bash
PROFILE_PATH="$HOME/.claude/get-shit-done/USER-PROFILE.md"
[ -f "$PROFILE_PATH" ] && echo "EXISTS" || echo "NOT_FOUND"
```

**如果画像存在且未设置 --refresh 且未设置 --questionnaire：**

使用 AskUserQuestion：
- header: "已有画像"
- question: "你已经有一份画像了。你想做什么？"
- options：
  - "查看" — 从已有画像数据展示摘要卡片，然后退出
  - "刷新" — 继续执行 --refresh 行为
  - "取消" — 退出工作流

如果选择"查看"：读取 USER-PROFILE.md，将其内容格式化为摘要卡片展示，然后退出。
如果选择"刷新"：设置 --refresh 行为并继续。
如果选择"取消"：显示"未做任何更改。"并退出。

**如果画像存在且已设置 --refresh：**

备份现有画像：
```bash
cp "$HOME/.claude/get-shit-done/USER-PROFILE.md" "$HOME/.claude/get-shit-done/USER-PROFILE.backup.md"
```

显示："正在重新分析你的会话以更新画像。"
继续到步骤 2。

**如果不存在画像：** 继续到步骤 2。

---

## 2. 同意确认关卡 (ACTV-06)

**如果**设置了 `--questionnaire` 标志则**跳过**（不读取 JSONL — 直接跳到步骤 4b）。

显示同意确认界面：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD > 分析你的编码风格
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Claude 在每次对话开始时都是通用的。画像可以教会 Claude
你实际上是如何工作的 — 而不是你认为自己是如何工作的。

## 我们将分析什么

你最近的 Claude Code 会话，从以下 8 个行为维度寻找模式：

| 维度             | 衡量内容                                    |
|------------------|---------------------------------------------|
| 沟通风格         | 你如何表达请求（简洁 vs. 详细）             |
| 决策速度         | 你如何在选项之间做出选择                    |
| 解释深度         | 你希望代码附带多少解释                      |
| 调试方法         | 你如何处理错误和 bug                        |
| UX 理念          | 你对设计 vs. 功能的关注程度                 |
| 依赖选择理念     | 你如何评估库和工具                          |
| 挫折触发点       | 什么会让你纠正 Claude                       |
| 学习风格         | 你偏好如何学习新事物                        |

## 数据处理

✓ 在本地读取会话文件（只读，不做任何修改）
✓ 分析消息模式（不分析内容含义）
✓ 画像存储在 $HOME/.claude/get-shit-done/USER-PROFILE.md
✗ 不会向外部服务发送任何内容
✗ 敏感内容（API 密钥、密码）会被自动排除
```

**如果是 --refresh 路径：**
改为显示简略同意说明：

```
正在重新分析你的会话以更新画像。
你的现有画像已备份到 USER-PROFILE.backup.md。
```

使用 AskUserQuestion：
- header: "刷新"
- question: "继续刷新画像？"
- options：
  - "继续" — 进入步骤 3
  - "取消" — 退出工作流

**如果是默认（非 --refresh）路径：**

使用 AskUserQuestion：
- header: "准备好了？"
- question: "准备好分析你的会话了吗？"
- options：
  - "开始吧" — 进入步骤 3（会话分析）
  - "改用问卷" — 跳到步骤 4b（问卷路径）
  - "现在不了" — 显示"没关系。准备好后运行 /gsd:profile-user。"并退出

---

## 3. 会话扫描

显示："◆ 正在扫描会话..."

运行会话扫描：
```bash
SCAN_RESULT=$(node $HOME/.claude/get-shit-done/bin/gsd-tools.cjs scan-sessions --json 2>/dev/null)
```

解析 JSON 输出以获取会话数量和项目数量。

显示："✓ 在 M 个项目中找到 N 个会话"

**判断数据充分性：**
- 从扫描结果中统计可用的总消息数（汇总各项目的会话）
- 如果找到 0 个会话：显示"未找到会话。切换到问卷。"并跳到步骤 4b
- 如果找到会话：继续到步骤 4a

---

## 4a. 会话分析路径

显示："◆ 正在采样消息..."

运行画像采样：
```bash
SAMPLE_RESULT=$(node $HOME/.claude/get-shit-done/bin/gsd-tools.cjs profile-sample --json 2>/dev/null)
```

解析 JSON 输出以获取临时目录路径和消息数量。

显示："✓ 从 M 个项目中采样了 N 条消息"

显示："◆ 正在分析模式..."

**使用 Task 工具生成 gsd-user-profiler agent：**

使用 Task 工具生成 `gsd-user-profiler` agent。提供以下信息：
- 来自 profile-sample 输出的采样 JSONL 文件路径
- 位于 `$HOME/.claude/get-shit-done/references/user-profiling.md` 的用户画像参考文档

agent 提示应遵循以下结构：
```
阅读画像参考文档和采样的会话消息，然后分析开发者在所有 8 个维度上的行为模式。

参考：@$HOME/.claude/get-shit-done/references/user-profiling.md
会话数据：@{temp_dir}/profile-sample.jsonl

分析这些消息并以参考文档中指定的 <analysis> JSON 格式返回你的分析。
```

**解析 agent 的输出：**
- 从 agent 的响应中提取 `<analysis>` JSON 块
- 将分析 JSON 保存到临时文件（在 profile-sample 创建的同一临时目录中）

```bash
ANALYSIS_PATH="{temp_dir}/analysis.json"
```

将分析 JSON 写入 `$ANALYSIS_PATH`。

显示："✓ 分析完成（已评分 N 个维度）"

**检查数据稀疏性：**
- 读取分析 JSON 并检查总消息数
- 如果分析的消息少于 50 条：提示问卷补充可以提高准确性。显示："注意：会话数据有限（N 条消息）。结果置信度可能较低。"

继续到步骤 5。

---

## 4b. 问卷路径

显示："使用问卷来构建你的画像。"

**获取问题：**
```bash
QUESTIONS=$(node $HOME/.claude/get-shit-done/bin/gsd-tools.cjs profile-questionnaire --json 2>/dev/null)
```

解析问题 JSON。它包含 8 个问题，每个维度一个。

**通过 AskUserQuestion 向用户展示每个问题：**

对于问题数组中的每个问题：
- header：维度名称（例如，"沟通风格"）
- question：问题文本
- options：来自问题定义的答案选项

将所有答案收集到一个 answers JSON 对象中，映射维度键到选择的答案值。

**将答案保存到临时文件：**
```bash
ANSWERS_PATH=$(mktemp /tmp/gsd-profile-answers-XXXXXX.json)
```

将 answers JSON 写入 `$ANSWERS_PATH`。

**将答案转换为分析：**
```bash
ANALYSIS_RESULT=$(node $HOME/.claude/get-shit-done/bin/gsd-tools.cjs profile-questionnaire --answers "$ANSWERS_PATH" --json 2>/dev/null)
```

从结果中解析分析 JSON。

将分析 JSON 保存到临时文件：
```bash
ANALYSIS_PATH=$(mktemp /tmp/gsd-profile-analysis-XXXXXX.json)
```

将分析 JSON 写入 `$ANALYSIS_PATH`。

继续到步骤 5（跳过分歧解决，因为问卷内部已处理歧义）。

---

## 5. 分歧解决

**如果**是仅问卷路径则**跳过**（分歧已在内部处理）。

从 `$ANALYSIS_PATH` 读取分析 JSON。

检查每个维度的 `cross_project_consistent: false`。

**对于检测到的每个分歧：**

使用 AskUserQuestion：
- header：维度名称（例如，"沟通风格"）
- question："你的会话显示出不同的模式：" 后跟分歧上下文（例如，"CLI/后端项目 -> 简洁直接，前端/UI 项目 -> 详细结构化"）
- options：
  - 评级选项 A（例如，"简洁直接"）
  - 评级选项 B（例如，"详细结构化"）
  - "取决于上下文（保留两者）"

**如果用户选择了特定评级：** 将分析 JSON 中该维度的 `rating` 字段更新为所选值。

**如果用户选择"取决于上下文"：** 在 `rating` 字段中保留主导评级。在维度的 summary 中添加 `context_note` 描述分歧（例如，"取决于上下文：在 CLI 项目中简洁，在前端项目中详细"）。

将更新后的分析 JSON 写回 `$ANALYSIS_PATH`。

---

## 6. 写入画像

显示："◆ 正在写入画像..."

```bash
node $HOME/.claude/get-shit-done/bin/gsd-tools.cjs write-profile --input "$ANALYSIS_PATH" --json 2>/dev/null
```

显示："✓ 画像已写入 $HOME/.claude/get-shit-done/USER-PROFILE.md"

---

## 7. 结果展示

从 `$ANALYSIS_PATH` 读取分析 JSON 以构建展示内容。

**展示评估卡片表格：**

```
## 你的画像

| 维度             | 评级                 | 置信度     |
|------------------|----------------------|------------|
| 沟通风格         | detailed-structured  | HIGH       |
| 决策速度         | deliberate-informed  | MEDIUM     |
| 解释深度         | concise              | HIGH       |
| 调试方法         | hypothesis-driven    | MEDIUM     |
| UX 理念          | pragmatic            | LOW        |
| 依赖选择理念     | thorough-evaluator   | HIGH       |
| 挫折触发点       | scope-creep          | MEDIUM     |
| 学习风格         | self-directed        | HIGH       |
```

（用分析 JSON 中的实际值填充。）

**展示亮点集锦：**

选择 3-4 个置信度最高且证据信号最多的维度。格式如下：

```
## 亮点

- **沟通（HIGH）：** 你始终在发出请求前提供带有标题和问题描述的结构化上下文
- **依赖选择（HIGH）：** 你会在做出决定前深入研究替代方案 — 比较文档、GitHub 活跃度和包大小
- **挫折点（MEDIUM）：** 你纠正 Claude 最多的情况是它做了你没有要求的事情 — 范围蔓延是你的主要触发点
```

从分析 JSON 的 `evidence` 数组和 `summary` 字段构建亮点。使用最有说服力的证据引用。每条格式化为"你倾向于..."或"你始终..."并附上证据归因。

**提供查看完整画像：**

使用 AskUserQuestion：
- header: "画像"
- question: "想查看完整画像吗？"
- options：
  - "是的" — 读取并展示完整的 USER-PROFILE.md 内容，然后继续到步骤 8
  - "继续生成产物" — 直接进入步骤 8

---

## 8. 产物选择 (ACTV-05)

使用带 multiSelect 的 AskUserQuestion：
- header: "产物"
- question: "我应该生成哪些产物？"
- options（全部默认预选）：
  - "/gsd:dev-preferences 命令文件" — "在任何会话中加载你的偏好"
  - "CLAUDE.md 画像部分" — "将画像添加到此项目的 CLAUDE.md"
  - "全局 CLAUDE.md" — "将画像添加到 $HOME/.claude/CLAUDE.md 以用于所有项目"

**如果未选择任何产物：** 显示"未生成产物。你的画像已保存在 $HOME/.claude/get-shit-done/USER-PROFILE.md"并跳到步骤 10。

---

## 9. 产物生成

按顺序生成选中的产物（文件 I/O 很快，并行 agent 没有收益）：

**如果选择了 /gsd:dev-preferences：**

```bash
node $HOME/.claude/get-shit-done/bin/gsd-tools.cjs generate-dev-preferences --analysis "$ANALYSIS_PATH" --json 2>/dev/null
```

显示："✓ 已生成 /gsd:dev-preferences，位于 $HOME/.claude/commands/gsd/dev-preferences.md"

**如果选择了 CLAUDE.md 画像部分：**

```bash
node $HOME/.claude/get-shit-done/bin/gsd-tools.cjs generate-claude-profile --analysis "$ANALYSIS_PATH" --json 2>/dev/null
```

显示："✓ 已将画像部分添加到 CLAUDE.md"

**如果选择了全局 CLAUDE.md：**

```bash
node $HOME/.claude/get-shit-done/bin/gsd-tools.cjs generate-claude-profile --analysis "$ANALYSIS_PATH" --global --json 2>/dev/null
```

显示："✓ 已将画像部分添加到 $HOME/.claude/CLAUDE.md"

**错误处理：** 如果任何 gsd-tools.cjs 调用失败，显示错误消息并使用 AskUserQuestion 提供"重试"或"跳过此产物"选项。重试时重新运行命令。跳过时继续到下一个产物。

---

## 10. 摘要和刷新差异

**如果是 --refresh 路径：**

读取旧备份和新分析以比较维度评级/置信度。

读取备份的画像：
```bash
BACKUP_PATH="$HOME/.claude/get-shit-done/USER-PROFILE.backup.md"
```

比较新旧每个维度的评级和置信度。展示仅显示已更改维度的差异表：

```
## 变更

| 维度            | 变更前                      | 变更后                       |
|-----------------|-----------------------------|-----------------------------|
| 沟通            | terse-direct (LOW)          | detailed-structured (HIGH)  |
| 调试            | fix-first (MEDIUM)          | hypothesis-driven (MEDIUM)  |
```

如果没有变化：显示"未检测到变更 — 你的画像已经是最新的。"

**展示最终摘要：**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD > 画像完成 ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

你的画像：    $HOME/.claude/get-shit-done/USER-PROFILE.md
```

然后列出每个已生成产物的路径：
```
产物：
  ✓ /gsd:dev-preferences   $HOME/.claude/commands/gsd/dev-preferences.md
  ✓ CLAUDE.md 部分          ./CLAUDE.md
  ✓ 全局 CLAUDE.md          $HOME/.claude/CLAUDE.md
```

（仅显示实际生成的产物。）

**清理临时文件：**

删除 profile-sample 创建的临时目录（包含采样 JSONL 和分析 JSON）：
```bash
rm -rf "$TEMP_DIR"
```

同时删除为问卷答案创建的任何独立临时文件：
```bash
rm -f "$ANSWERS_PATH" 2>/dev/null
rm -f "$ANALYSIS_PATH" 2>/dev/null
```

（仅清理在本次工作流运行期间实际创建的临时路径。）

</process>

<success_criteria>
- [ ] 初始化检测现有画像并处理所有三种响应（查看/刷新/取消）
- [ ] 会话分析路径显示同意确认关卡，问卷路径跳过
- [ ] 会话扫描发现会话并报告统计信息
- [ ] 会话分析路径：采样消息、生成画像 agent、提取分析 JSON
- [ ] 问卷路径：展示 8 个问题、收集答案、转换为分析 JSON
- [ ] 分歧解决展示上下文相关的分歧及用户解决选项
- [ ] 通过 write-profile 子命令将画像写入 USER-PROFILE.md
- [ ] 结果展示显示评估卡片表格和带证据的亮点集锦
- [ ] 产物选择使用 multiSelect 并默认预选所有选项
- [ ] 通过 gsd-tools.cjs 子命令按顺序生成产物
- [ ] 使用 --refresh 时显示刷新差异中已更改的维度
- [ ] 完成时清理临时文件
</success_criteria>
</output>
