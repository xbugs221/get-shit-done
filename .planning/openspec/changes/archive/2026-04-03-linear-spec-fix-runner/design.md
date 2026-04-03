## Context

这个 spec-fix 工作流从一开始就应该是线性的：analysis、proposal review、coding、code review、archive。当前设计讨论已经识别出三个会阻碍日常使用的缺口：第一，阶段推进还停留在 prompt 语义层，没有被 runner 强制执行；第二，面向用户的 mux 体验还没有明确下来；第三，agent runtime/provider 很容易被误设计成全局单值，无法支持 5 个 agent 的自由组合。现有 GSD 的 auto-advance 能在一个会话中串起 workflow step，但它不会创建 `zellij` 或 `tmux` pane，不会把 `lazygit` 固定在第 1 个 pane，也不会限制 review/coding 回环次数，更不会按 agent 角色分发不同 provider。

## Goals / Non-Goals

**Goals:**
- 用持久化状态机和 hook 驱动的阶段切换来保证阶段顺序。
- 提供固定的六 pane 布局，把 `lazygit` 放在第 1 个 pane，其余阶段 pane 顺序稳定。
- 每个成功阶段后都 commit，包括一个专门记录用户原始问题的初始 commit。
- 允许 code review 失败后返回 coding 做增量修复，而不是从头来过。
- 在第 3 次 code review 完成后自动通过，并将最终 review 备注带入 archive。
- 允许 5 个工作流 agent 独立配置 provider/runtime。

**Non-Goals:**
- 不引入负责决定下一阶段的调度 agent。
- 不支持任意 pane 数量、任意 pane 布局或任意阶段重排。
- 不允许 coding 和 code review 之间出现无上限重试。
- 不要求所有阶段完全并行执行。
- 不要求 5 个 agent 使用同一个 provider。

## Decisions

### 1. Use a deterministic runner instead of a scheduling agent

工作流由单一 runner 命令推进，例如 `gsd-tools spec-fix start`。runner 统一负责 pane 创建、状态持久化、hook、commit 边界和阶段解锁。这样可以消除“到底谁有权推进流程”的歧义，也让推进过程可复现。

Alternatives considered:
- agent 驱动编排：不采用。prompt 层意图没有脚本级闸门可靠，也更难审计。
- 由用户手动推进：不采用。这样会削弱阶段完整性和 commit 顺序的保证。

### 2. Persist workflow state in `.planning/fixes/<id>/workflow.json`

每次 fix run 都要写一个机器可读的状态文件，包含 fix id、change name、mux 类型、pane id、当前阶段、当前 review 轮次、阶段时间戳、commit hash，以及解析后的 agent provider 结果。只有 runner 及其 hook 可以修改这个文件。

Alternatives considered:
- 只靠 git 历史推导状态：不采用。review 重试次数、自动通过标记和 pane/provider 元数据无法被可靠恢复。
- 只靠文件存在性推导状态：不采用。自动通过状态和 attempt 次数需要显式追踪。

### 3. Fix the pane order and pin `lazygit` to pane 1

MUX 适配器必须始终以同一顺序创建 6 个 panes：
1. `lazygit`
2. analysis
3. proposal-review
4. coding
5. code-review
6. archive

这样做是为了给用户一个稳定的视觉模型，并让 git 变化在整个 run 生命周期里持续可见。

Alternatives considered:
- 把 `lazygit` 放最后：不采用。用户已经明确要求优先显示 git 变化，这也更符合监控式使用。
- 每个阶段动态创建 pane：不采用。这样会让不同 run 难以快速对照和扫描。

### 4. Use stage validators and completion hooks as the progression gate

每个阶段都必须有一个 validator，用来检查必须产物和允许输出范围。阶段完成后由 hook 执行 `validate -> commit -> update workflow.json -> unlock next stage`。只要校验或 commit 失败，工作流就停在当前阶段。

Alternatives considered:
- 让 agent 自己宣布完成：不采用。它无法可靠保证 commit 成功或产物完整。
- 只要进程退出就推进：不采用。进程即使正常退出，也可能留下不完整或无效产物。

### 5. Bound the code-review improvement loop to three rounds

`code-review` 可以输出结构化反馈，把工作流带回 coding，但这个回退只能是增量修复循环。每次 review 未通过时，runner 都要增加 `review_attempt`。前 2 次 review 未通过时，工作流回到 coding。第 3 次 review 完成后，不再允许继续回退，而是把最终 review 备注记录为 `accepted_after_round_3` 并直接解锁 archive。

Alternatives considered:
- 无上限重试：不采用。这样会悄悄吞掉时间，也会掩盖该升级处理的时点。
- review 失败后回到 analysis 重新开始：不采用。用户已经明确要求基于 review 意见做增量修复，而不是从头 redo。
- 第 3 次 review 仍未通过时阻塞工作流：不采用。三审三改后继续中断收益很低，反而会破坏线性闭环。

### 6. Resolve provider/runtime per agent instead of globally

runner 必须从配置中按 agent 角色解析 provider/runtime，而不是用单一 `--runtime` 覆盖整条工作流。建议在 `.planning/config.json` 中增加如下配置：

```json
{
  "workflow": {
    "spec_fix_agent_providers": {
      "analysis": "codex",
      "proposal_review": "claude",
      "coding": "codex",
      "code_review": "claude",
      "archive": "gemini"
    }
  }
}
```

runner 在 pane 注入阶段命令时，必须把各自 agent 的 provider/runtime 映射进去，并把解析结果写入 `workflow.json`，方便事后检查。

Alternatives considered:
- 单一 `--runtime` 参数控制全流程：不采用。它会错误地把 5 个 agent 绑死在一个 provider 上。
- 完全不显式配置 provider，全部继承当前 session：不采用。这样无法表达 analysis 与 code-review 使用不同 provider 的常见需求。

### 7. Standardize stage commit messages

commit message 由 runner 统一生成，以确保一致性：
- `问题：<user problem, normalized to one line>`
- `analysis(fix-<id>): evidence and openspec change`
- `review(fix-<id>): refine proposal`
- `fix(fix-<id>): implement approved proposal`
- `review(fix-<id>): verify against problem and proposal`
- `chore(fix-<id>): archive workflow`

用户原文会完整保存在 `PROBLEM.md` 中；commit subject 只做单行化处理，因为 git subject 必须保持单行且稳定。

## Risks / Trade-offs

- 固定 mux 布局对高级用户来说可能偏死板 -> 缓解：MVP 先固定布局，等确定性 runner 稳定后再讨论定制化。
- `tmux` 和 `zellij` 的 pane API 存在差异 -> 缓解：保留统一 runner 契约，把 mux 特有命令隔离到 adapter 脚本中。
- 如果工件定义演进，阶段 validator 可能变脆 -> 缓解：让 validator 期望与 prompt 模板、workflow state schema 一起版本化。
- 第 3 次 review 自动通过，可能让少量残余问题进入 archive -> 缓解：将最终 review 备注明确写入 review 工件和状态输出，让用户知道这是“三审后自动通过”。
- 多 provider 配置会增加 runner 注入逻辑复杂度 -> 缓解：限制配置面为 5 个固定 agent 角色，不支持任意新增角色。

## Migration Plan

1. 增加 `spec-fix` CLI 入口和 `.planning/fixes/<id>/` 状态布局。
2. 先实现 `zellij` 适配器，并落下固定的 6 pane 布局。
3. 增加阶段 prompt 模板、validator 和 completion hook。
4. 增加有上限的 `code-review -> coding` 回退支持，并在第 3 次 review 后自动通过。
5. 增加 5 个 agent 的 provider 配置解析。
6. 增加 `spec-fix status`。
7. 增加 runner 初始化、重试上限、provider 解析和状态输出的验收测试。
8. 补齐用户视角的触发方式和检查方式文档。

Rollback strategy:
- 移除 `spec-fix` 命令注册及相关脚本。
- 保留已经生成的 `.planning/fixes/` 工件，作为静态历史记录。
- 对未完成的 OpenSpec change，不自动归档，除非用户显式要求。

## Open Questions

- `tmux` 是否要和 `zellij` 一起进入首版，还是等 `zellij` 先验证 runner 契约后再补？
- runner 是否应该提供 `--dry-run` 模式，方便测试和 CI 在没有真实 terminal multiplexer 的情况下模拟 pane 创建？
