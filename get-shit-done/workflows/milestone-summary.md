# 里程碑总结工作流

从已完成的里程碑产物生成全面、易读的项目总结。
专为团队入职设计——新成员可以阅读输出并理解整个项目。

---

## 步骤 1：解析版本

```bash
VERSION="$ARGUMENTS"
```

如果 `$ARGUMENTS` 为空：
1. 检查 `.planning/STATE.md` 获取当前里程碑版本
2. 检查 `.planning/milestones/` 获取最新归档版本
3. 如果两者都未找到，检查 `.planning/ROADMAP.md` 是否存在（项目可能处于里程碑进行中）
4. 如果什么都没找到：报错 "未找到里程碑。请先运行 /gsd:new-project 或 /gsd:new-milestone。"

将 `VERSION` 设置为解析后的版本（如 "1.0"）。

## 步骤 2：定位产物

确定里程碑是**已归档**还是**当前**的：

**已归档的里程碑**（`.planning/milestones/v{VERSION}-ROADMAP.md` 存在）：
```
ROADMAP_PATH=".planning/milestones/v${VERSION}-ROADMAP.md"
REQUIREMENTS_PATH=".planning/milestones/v${VERSION}-REQUIREMENTS.md"
AUDIT_PATH=".planning/milestones/v${VERSION}-MILESTONE-AUDIT.md"
```

**当前/进行中的里程碑**（尚无归档）：
```
ROADMAP_PATH=".planning/ROADMAP.md"
REQUIREMENTS_PATH=".planning/REQUIREMENTS.md"
AUDIT_PATH=".planning/v${VERSION}-MILESTONE-AUDIT.md"
```

注意：审计文件在归档时会移至 `.planning/milestones/`（按 `complete-milestone` 工作流）。作为后备方案，两个位置都要检查。

**始终可用：**
```
PROJECT_PATH=".planning/PROJECT.md"
RETRO_PATH=".planning/RETROSPECTIVE.md"
STATE_PATH=".planning/STATE.md"
```

读取所有存在的文件。缺失的文件没关系——总结会根据可用内容进行调整。

## 步骤 3：发现阶段产物

查找所有阶段目录：

```bash
gsd-tools.cjs init progress
```

这将返回阶段元数据。对于里程碑范围内的每个阶段：

- 如果存在 `{phase_dir}/{padded}-SUMMARY.md`，读取并提取 `one_liner`、`accomplishments`、`decisions`
- 如果存在 `{phase_dir}/{padded}-VERIFICATION.md`，读取并提取状态、差距、推迟项
- 如果存在 `{phase_dir}/{padded}-CONTEXT.md`，读取并从 `<decisions>` 部分提取关键决策
- 如果存在 `{phase_dir}/{padded}-RESEARCH.md`，记录研究内容

跟踪哪些阶段有哪些产物。

**如果不存在阶段目录**（空里程碑或预构建状态）：跳至步骤 5 并生成最小总结，注明"尚未执行任何阶段。"不要报错——总结仍应包含 PROJECT.md 和 ROADMAP.md 的内容。

## 步骤 4：收集 Git 统计

按顺序尝试每种方法，直到一种成功：

**方法 1 — 已标签的里程碑**（优先检查）：
```bash
git tag -l "v${VERSION}" | head -1
```
如果标签存在：
```bash
git log v${VERSION} --oneline | wc -l
git diff --stat $(git log --format=%H --reverse v${VERSION} | head -1)..v${VERSION}
```

**方法 2 — STATE.md 日期范围**（如果没有标签）：
读取 STATE.md 并提取 `started_at` 或最早的会话日期。将其用作 `--since` 边界：
```bash
git log --oneline --since="<started_at_date>" | wc -l
```

**方法 3 — 最早的阶段提交**（如果 STATE.md 没有日期）：
找到最早的 `.planning/phases/` 提交：
```bash
git log --oneline --diff-filter=A -- ".planning/phases/" | tail -1
```
使用该提交的日期作为起始边界。

**方法 4 — 跳过统计**（如果以上都不可行）：
报告"Git 统计不可用——无法确定标签或日期范围。"这不是错误——总结将继续生成，只是不包含统计部分。

提取（可用时）：
- 里程碑内的总提交数
- 更改的文件数、新增行数、删除行数
- 时间线（开始日期 → 结束日期）
- 贡献者（来自 git log 作者）

## 步骤 5：生成总结文档

写入 `.planning/reports/MILESTONE_SUMMARY-v${VERSION}.md`：

```markdown
# 里程碑 v{VERSION} — 项目总结

**生成日期：**{date}
**用途：**团队入职和项目回顾

---

## 1. 项目概览

{来自 PROJECT.md："这是什么"、核心价值主张、目标用户}
{如果处于里程碑进行中：注明哪些阶段已完成、哪些正在进行}

## 2. 架构与技术决策

{来自各阶段 CONTEXT.md 文件：关键技术选择}
{来自 SUMMARY.md 的决策：选择的模式、库、框架}
{来自 PROJECT.md：记录的技术栈}

以带简要理由的列表形式呈现决策：
- **决策：**{选择了什么}
  - **原因：**{来自 CONTEXT.md 的理由}
  - **阶段：**{做出此决策的阶段}

## 3. 已交付的阶段

| 阶段 | 名称 | 状态 | 一句话总结 |
|------|------|------|-----------|
{对每个阶段：编号、名称、状态（完成/进行中/已规划）、来自 SUMMARY.md 的 one_liner}

## 4. 需求覆盖

{来自 REQUIREMENTS.md：列出每个需求及其状态}
- ✅ {已满足的需求}
- ⚠️ {部分满足的需求——注明差距}
- ❌ {未满足的需求——注明原因}

{如果存在 MILESTONE-AUDIT.md：包含审计结论}

## 5. 关键决策日志

{汇总所有 CONTEXT.md 的 <decisions> 部分}
{每个决策包含：ID、描述、阶段、理由}

## 6. 技术债务与推迟项

{来自 VERIFICATION.md 文件：发现的差距、标注的反模式}
{来自 RETROSPECTIVE.md：经验教训、需要改进的方面}
{来自 CONTEXT.md 的 <deferred> 部分：暂时搁置的想法}

## 7. 入门指南

{新贡献者的入口点：}
- **运行项目：**{来自 PROJECT.md 或 SUMMARY.md}
- **关键目录：**{来自代码库结构}
- **测试：**{来自 PROJECT.md 或 CLAUDE.md 的测试命令}
- **首先查看：**{主入口点、核心模块}

---

## 统计

- **时间线：**{开始} → {结束}（{持续时间}）
- **阶段：**{已完成数} / {总数}
- **提交数：**{数量}
- **更改的文件：**{数量}（+{新增} / -{删除}）
- **贡献者：**{列表}
```

## 步骤 6：写入并提交

**覆盖保护：**如果 `.planning/reports/MILESTONE_SUMMARY-v${VERSION}.md` 已存在，询问用户：
> "v{VERSION} 的里程碑总结已存在。要覆盖它还是查看现有的？"
如果选择"查看"：显示现有文件并跳至步骤 8（交互模式）。如果选择"覆盖"：继续。

如果需要，创建 reports 目录：
```bash
mkdir -p .planning/reports
```

写入总结，然后提交：
```bash
gsd-tools.cjs commit "docs(v${VERSION}): generate milestone summary for onboarding" \
  --files ".planning/reports/MILESTONE_SUMMARY-v${VERSION}.md"
```

## 步骤 7：展示总结

内联显示完整的总结文档。

## 步骤 8：提供交互模式

展示总结后：

> "总结已写入 `.planning/reports/MILESTONE_SUMMARY-v{VERSION}.md`。
>
> 我已加载了构建产物的完整上下文。想问任何关于项目的问题吗？
> 架构决策、特定阶段、需求、技术债务——尽管问。"

如果用户提问：
- 根据已加载的产物（CONTEXT.md、SUMMARY.md、VERIFICATION.md 等）回答
- 引用具体文件和决策
- 基于实际构建的内容回答（而非推测）

如果用户完成了提问：
- 建议后续步骤：`/gsd:new-milestone`、`/gsd:progress`，或将总结分享给团队

## 步骤 9：更新 STATE.md

```bash
gsd-tools.cjs state record-session \
  --stopped-at "Milestone v${VERSION} summary generated" \
  --resume-file ".planning/reports/MILESTONE_SUMMARY-v${VERSION}.md"
```
