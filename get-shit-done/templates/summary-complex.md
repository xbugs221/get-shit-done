---
phase: XX-name
plan: YY
subsystem: [主要类别]
tags: [可搜索的技术标签]
requires:
  - phase: [前置阶段]
    provides: [该阶段构建了什么]
provides:
  - [交付成果列表]
affects: [受影响的阶段名称或关键词列表]
tech-stack:
  added: [库/工具]
  patterns: [架构/代码模式]
key-files:
  created: [创建的重要文件]
  modified: [修改的重要文件]
key-decisions:
  - "决策 1"
patterns-established:
  - "模式 1：描述"
duration: Xmin
completed: YYYY-MM-DD
---

# 阶段 [X]：[名称] 总结（复杂版）

**[描述成果的实质性一句话]**

## 执行情况
- **耗时：** [时间]
- **任务：** [完成数量]
- **修改的文件：** [数量]

## 成果
- [关键成果 1]
- [关键成果 2]

## 任务提交记录
1. **任务 1：[任务名称]** - `hash`
2. **任务 2：[任务名称]** - `hash`
3. **任务 3：[任务名称]** - `hash`

## 创建/修改的文件
- `path/to/file.ts` - 功能描述
- `path/to/another.ts` - 功能描述

## 做出的决策
[关键决策及简要理由]

## 偏离计划（自动修复）
[按照 GSD 偏差规则的详细自动修复记录]

## 遇到的问题
[计划执行过程中的问题及解决方案]

## 下一阶段就绪状态
[为下一阶段准备好了什么]
[阻塞项或关注点]
