<purpose>
将一个前瞻性的想法捕获为结构化的种子文件，附带触发条件。
当触发条件与新里程碑的范围匹配时，种子会在 /gsd:new-milestone 运行期间自动浮现。

种子优于延迟项，因为它们：
- 保留了想法重要的原因（不仅仅是内容）
- 定义了何时浮现（触发条件，而非手动扫描）
- 追踪线索（代码引用、相关决策）
- 通过 new-milestone 扫描在正确的时间自动呈现
</purpose>

<process>

<step name="parse_idea">
从 `$ARGUMENTS` 中解析想法摘要。

如果为空，则询问：
```
这个想法是什么？（一句话描述）
```

存储为 `$IDEA`。
</step>

<step name="create_seed_dir">
```bash
mkdir -p .planning/seeds
```
</step>

<step name="gather_context">
通过聚焦问题来构建完整的种子：

```
AskUserQuestion(
  header: "触发条件",
  question: "这个想法应该在什么时候浮现？（例如，'当我们添加用户账户时'，'下个主要版本'，'当性能成为优先事项时'）",
  options: []  // 自由填写
)
```

存储为 `$TRIGGER`。

```
AskUserQuestion(
  header: "原因",
  question: "为什么这很重要？它解决了什么问题或创造了什么机会？",
  options: []
)
```

存储为 `$WHY`。

```
AskUserQuestion(
  header: "规模",
  question: "这个有多大？（粗略估计）",
  options: [
    { label: "小", description: "几个小时 — 可以作为一个快速任务" },
    { label: "中", description: "一到两个阶段 — 需要规划" },
    { label: "大", description: "一个完整的里程碑 — 工作量很大" }
  ]
)
```

存储为 `$SCOPE`。
</step>

<step name="collect_breadcrumbs">
在代码库中搜索相关引用：

```bash
# 查找与想法关键词相关的文件
grep -rl "$KEYWORD" --include="*.ts" --include="*.js" --include="*.md" . 2>/dev/null | head -10
```

同时检查：
- 当前 STATE.md 中的相关决策
- ROADMAP.md 中的相关阶段
- todos/ 中的相关已捕获想法

将相关文件路径存储为 `$BREADCRUMBS`。
</step>

<step name="generate_seed_id">
```bash
# 查找下一个种子编号
EXISTING=$( (ls .planning/seeds/SEED-*.md 2>/dev/null || true) | wc -l )
NEXT=$((EXISTING + 1))
PADDED=$(printf "%03d" $NEXT)
```

从想法摘要生成 slug。
</step>

<step name="write_seed">
写入 `.planning/seeds/SEED-{PADDED}-{slug}.md`：

```markdown
---
id: SEED-{PADDED}
status: dormant
planted: {ISO 日期}
planted_during: {来自 STATE.md 的当前里程碑/阶段}
trigger_when: {$TRIGGER}
scope: {$SCOPE}
---

# SEED-{PADDED}: {$IDEA}

## 为什么重要

{$WHY}

## 何时浮现

**触发条件：** {$TRIGGER}

此种子应在 `/gsd:new-milestone` 运行期间呈现，当里程碑范围匹配以下任一条件时：
- {触发条件 1}
- {触发条件 2}

## 规模估计

**{$SCOPE}** — {基于规模选择的详细说明}

## 线索

在当前代码库中找到的相关代码和决策：

{$BREADCRUMBS 列表及文件路径}

## 备注

{当前会话中的任何额外上下文}
```
</step>

<step name="commit_seed">
```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs: plant seed — {$IDEA}" --files .planning/seeds/SEED-{PADDED}-{slug}.md
```
</step>

<step name="confirm">
```
✅ 种子已种下：SEED-{PADDED}

"{$IDEA}"
触发条件：{$TRIGGER}
规模：{$SCOPE}
文件：.planning/seeds/SEED-{PADDED}-{slug}.md

当你运行 /gsd:new-milestone 且里程碑范围匹配触发条件时，
此种子将自动浮现。
```
</step>

</process>

<success_criteria>
- [ ] 种子文件已在 .planning/seeds/ 中创建
- [ ] 前置元数据包含状态、触发条件、规模
- [ ] 已从代码库收集线索
- [ ] 已提交到 git
- [ ] 已向用户显示确认信息及触发条件
</success_criteria>
</output>
