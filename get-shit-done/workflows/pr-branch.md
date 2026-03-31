<purpose>
创建一个干净的分支用于 Pull Request，过滤掉 .planning/ 的提交。
PR 分支仅包含代码变更——审阅者不会看到 GSD 制品
（PLAN.md、SUMMARY.md、STATE.md、CONTEXT.md 等）。

使用 git cherry-pick 配合路径过滤来重建干净的历史。
</purpose>

<process>

<step name="detect_state">
从 `$ARGUMENTS` 中解析目标分支（默认：`main`）。

```bash
CURRENT_BRANCH=$(git branch --show-current)
TARGET=${1:-main}
```

检查前置条件：
- 必须在功能分支上（不是 main/master）
- 必须有领先于目标的提交

```bash
AHEAD=$(git rev-list --count "$TARGET".."$CURRENT_BRANCH" 2>/dev/null)
if [ "$AHEAD" = "0" ]; then
  echo "没有领先于 $TARGET 的提交——无需过滤。"
  exit 0
fi
```

显示：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PR 分支
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

分支：{CURRENT_BRANCH}
目标：{TARGET}
提交数：领先 {AHEAD} 个
```
</step>

<step name="analyze_commits">
分类提交：

```bash
# 获取所有领先于目标的提交
git log --oneline "$TARGET".."$CURRENT_BRANCH" --no-merges
```

对于每个提交，检查它是否仅涉及 .planning/ 文件：

```bash
# 对于每个提交哈希
FILES=$(git diff-tree --no-commit-id --name-only -r $HASH)
ALL_PLANNING=$(echo "$FILES" | grep -v "^\.planning/" | wc -l)
```

分类：
- **代码提交**：涉及至少一个非 .planning/ 文件 → 包含
- **仅规划提交**：仅涉及 .planning/ 文件 → 排除
- **混合提交**：同时涉及两者 → 包含（规划变更随之而来）

显示分析：
```
要包含的提交：{N}（代码变更）
要排除的提交：{N}（仅规划）
混合提交：{N}（代码 + 规划——已包含）
```
</step>

<step name="create_pr_branch">
```bash
PR_BRANCH="${CURRENT_BRANCH}-pr"

# 从目标创建 PR 分支
git checkout -b "$PR_BRANCH" "$TARGET"
```

仅按顺序 cherry-pick 代码提交：

```bash
for HASH in $CODE_COMMITS; do
  git cherry-pick "$HASH" --no-commit
  # 移除混合提交中附带的 .planning/ 文件
  git rm -r --cached .planning/ 2>/dev/null || true
  git commit -C "$HASH"
done
```

返回原始分支：
```bash
git checkout "$CURRENT_BRANCH"
```
</step>

<step name="verify">
```bash
# 验证 PR 分支中没有 .planning/ 文件
PLANNING_FILES=$(git diff --name-only "$TARGET".."$PR_BRANCH" | grep "^\.planning/" | wc -l)
TOTAL_FILES=$(git diff --name-only "$TARGET".."$PR_BRANCH" | wc -l)
PR_COMMITS=$(git rev-list --count "$TARGET".."$PR_BRANCH")
```

显示结果：
```
✅ PR 分支已创建：{PR_BRANCH}

原始：{AHEAD} 个提交，{ORIGINAL_FILES} 个文件
PR 分支：{PR_COMMITS} 个提交，{TOTAL_FILES} 个文件
规划文件：{PLANNING_FILES}（应为 0）

下一步：
  git push origin {PR_BRANCH}
  gh pr create --base {TARGET} --head {PR_BRANCH}

或使用 /gsd:ship 自动创建 PR。
```
</step>

</process>

<success_criteria>
- [ ] 从目标创建了 PR 分支
- [ ] 排除了仅规划的提交
- [ ] PR 分支差异中没有 .planning/ 文件
- [ ] 原始提交消息已保留
- [ ] 向用户展示了下一步
</success_criteria>
</output>
