<purpose>

将已完成里程碑中累积的阶段目录归档到 `.planning/milestones/v{X.Y}-phases/`。识别哪些阶段属于每个已完成的里程碑，显示试运行摘要，确认后移动目录。

</purpose>

<required_reading>

1. `.planning/MILESTONES.md`
2. `.planning/milestones/` 目录列表
3. `.planning/phases/` 目录列表

</required_reading>

<process>

<step name="identify_completed_milestones">

读取 `.planning/MILESTONES.md` 以识别已完成的里程碑及其版本。

```bash
cat .planning/MILESTONES.md
```

提取每个里程碑版本（例如 v1.0、v1.1、v2.0）。

检查哪些里程碑归档目录已经存在：

```bash
ls -d .planning/milestones/v*-phases 2>/dev/null || true
```

过滤出尚未拥有 `-phases` 归档目录的里程碑。

如果所有里程碑都已有阶段归档：

```
All completed milestones already have phase directories archived. Nothing to clean up.
```

在此停止。

</step>

<step name="determine_phase_membership">

对于每个没有 `-phases` 归档的已完成里程碑，读取归档的路线图快照以确定哪些阶段属于它：

```bash
cat .planning/milestones/v{X.Y}-ROADMAP.md
```

从归档路线图中提取阶段编号和名称（例如 Phase 1: Foundation, Phase 2: Auth）。

检查这些阶段目录中哪些仍存在于 `.planning/phases/`：

```bash
ls -d .planning/phases/*/ 2>/dev/null || true
```

将阶段目录与里程碑归属关系匹配。仅包含仍存在于 `.planning/phases/` 中的目录。

</step>

<step name="show_dry_run">

为每个里程碑展示试运行摘要：

```
## Cleanup Summary

### v{X.Y} — {Milestone Name}
These phase directories will be archived:
- 01-foundation/
- 02-auth/
- 03-core-features/

Destination: .planning/milestones/v{X.Y}-phases/

### v{X.Z} — {Milestone Name}
These phase directories will be archived:
- 04-security/
- 05-hardening/

Destination: .planning/milestones/v{X.Z}-phases/
```

如果没有剩余的阶段目录需要归档（全部已移动或删除）：

```
No phase directories found to archive. Phases may have been removed or archived previously.
```

在此停止。

AskUserQuestion: "Proceed with archiving?" 选项: "Yes — archive listed phases" | "Cancel"

如果 "Cancel"：停止。

</step>

<step name="archive_phases">

对于每个里程碑，移动阶段目录：

```bash
mkdir -p .planning/milestones/v{X.Y}-phases
```

对于属于此里程碑的每个阶段目录：

```bash
mv .planning/phases/{dir} .planning/milestones/v{X.Y}-phases/
```

对清理集中的所有里程碑重复此操作。

</step>

<step name="commit">

提交更改：

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "chore: archive phase directories from completed milestones" --files .planning/milestones/ .planning/phases/
```

</step>

<step name="report">

```
Archived:
{For each milestone}
- v{X.Y}: {N} phase directories → .planning/milestones/v{X.Y}-phases/

.planning/phases/ cleaned up.
```

</step>

</process>

<success_criteria>

- [ ] 已识别所有没有现有阶段归档的已完成里程碑
- [ ] 从归档的路线图快照中确定了阶段归属关系
- [ ] 已显示试运行摘要并获得用户确认
- [ ] 阶段目录已移动到 `.planning/milestones/v{X.Y}-phases/`
- [ ] 更改已提交

</success_criteria>
