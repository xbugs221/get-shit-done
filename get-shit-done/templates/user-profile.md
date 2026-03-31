# 开发者画像

> 此画像是通过会话分析生成的。它包含 Claude 在与此开发者协作时应遵循的行为指令。
> HIGH（高）置信度的维度应直接执行。LOW（低）置信度的维度应以试探的方式处理
> （"根据你的画像，我会尝试 X -- 如果不对请告诉我"）。

**生成时间：** {{generated_at}}
**数据来源：** {{data_source}}
**分析的项目：** {{projects_list}}
**分析的消息数：** {{message_count}}

---

## 快速参考

{{summary_instructions}}

---

## 沟通风格

**评级：** {{communication_style.rating}} | **置信度：** {{communication_style.confidence}}

**指令：** {{communication_style.claude_instruction}}

{{communication_style.summary}}

**证据：**

{{communication_style.evidence}}

---

## 决策速度

**评级：** {{decision_speed.rating}} | **置信度：** {{decision_speed.confidence}}

**指令：** {{decision_speed.claude_instruction}}

{{decision_speed.summary}}

**证据：**

{{decision_speed.evidence}}

---

## 解释深度

**评级：** {{explanation_depth.rating}} | **置信度：** {{explanation_depth.confidence}}

**指令：** {{explanation_depth.claude_instruction}}

{{explanation_depth.summary}}

**证据：**

{{explanation_depth.evidence}}

---

## 调试方法

**评级：** {{debugging_approach.rating}} | **置信度：** {{debugging_approach.confidence}}

**指令：** {{debugging_approach.claude_instruction}}

{{debugging_approach.summary}}

**证据：**

{{debugging_approach.evidence}}

---

## 用户体验理念

**评级：** {{ux_philosophy.rating}} | **置信度：** {{ux_philosophy.confidence}}

**指令：** {{ux_philosophy.claude_instruction}}

{{ux_philosophy.summary}}

**证据：**

{{ux_philosophy.evidence}}

---

## 供应商理念

**评级：** {{vendor_philosophy.rating}} | **置信度：** {{vendor_philosophy.confidence}}

**指令：** {{vendor_philosophy.claude_instruction}}

{{vendor_philosophy.summary}}

**证据：**

{{vendor_philosophy.evidence}}

---

## 挫败感触发因素

**评级：** {{frustration_triggers.rating}} | **置信度：** {{frustration_triggers.confidence}}

**指令：** {{frustration_triggers.claude_instruction}}

{{frustration_triggers.summary}}

**证据：**

{{frustration_triggers.evidence}}

---

## 学习风格

**评级：** {{learning_style.rating}} | **置信度：** {{learning_style.confidence}}

**指令：** {{learning_style.claude_instruction}}

{{learning_style.summary}}

**证据：**

{{learning_style.evidence}}

---

## 画像元数据

| 字段 | 值 |
|------|------|
| 画像版本 | {{profile_version}} |
| 生成时间 | {{generated_at}} |
| 数据来源 | {{data_source}} |
| 项目数 | {{projects_count}} |
| 消息数 | {{message_count}} |
| 已评分维度 | {{dimensions_scored}}/8 |
| 高置信度 | {{high_confidence_count}} |
| 中置信度 | {{medium_confidence_count}} |
| 低置信度 | {{low_confidence_count}} |
| 已排除的敏感内容 | {{sensitive_excluded_summary}} |
</output>
