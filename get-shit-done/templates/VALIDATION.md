---
phase: {N}
slug: {phase-slug}
status: draft
nyquist_compliant: false
wave_0_complete: false
created: {date}
---

# 阶段 {N} — 验证策略

> 按阶段的验证契约，用于执行期间的反馈采样。

---

## 测试基础设施

| 属性 | 值 |
|------|-----|
| **框架** | {pytest 7.x / jest 29.x / vitest / go test / 其他} |
| **配置文件** | {路径或 "无——Wave 0 安装"} |
| **快速运行命令** | `{quick command}` |
| **完整套件命令** | `{full command}` |
| **预计运行时间** | ~{N} 秒 |

---

## 采样频率

- **每次任务提交后：** 运行 `{quick run command}`
- **每个计划波次后：** 运行 `{full suite command}`
- **`/gsd:verify-work` 之前：** 完整套件必须全部通过
- **最大反馈延迟：** {N} 秒

---

## 按任务验证映射

| 任务 ID | 计划 | 波次 | 需求 | 测试类型 | 自动化命令 | 文件存在 | 状态 |
|---------|------|------|------|----------|-----------|----------|------|
| {N}-01-01 | 01 | 1 | REQ-{XX} | unit | `{command}` | ✅ / ❌ W0 | ⬜ pending |

*状态：⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 要求

- [ ] `{tests/test_file.py}` — REQ-{XX} 的桩文件
- [ ] `{tests/conftest.py}` — 共享 fixture
- [ ] `{framework install}` — 如果未检测到框架

*如无需要："现有基础设施已覆盖所有阶段需求。"*

---

## 仅手动验证

| 行为 | 需求 | 为何手动 | 测试说明 |
|------|------|----------|----------|
| {behavior} | REQ-{XX} | {reason} | {steps} |

*如无需要："所有阶段行为均有自动化验证。"*

---

## 验证签核

- [ ] 所有任务都有 `<automated>` 验证或 Wave 0 依赖
- [ ] 采样连续性：连续不超过 3 个任务没有自动化验证
- [ ] Wave 0 覆盖所有 MISSING 引用
- [ ] 无 watch 模式标志
- [ ] 反馈延迟 < {N}s
- [ ] frontmatter 中已设置 `nyquist_compliant: true`

**审批：** {pending / approved YYYY-MM-DD}
