---
title: "Ch 8: AI 클러스터 설계 패턴"
date: 2026-12-01T08:00:00
description: "UALink 위에서 LLM 학습·추론 워크로드를 어떻게 배치하나."
series: "UALink 심화"
seriesOrder: 8
tags: [ualink, ai-cluster, llm, sharding]
draft: true
---

* Outline — *Tensor parallelism* — UALink 내 모든 GPU에 split. *Pipeline parallelism* — UALink pod 간. *Expert parallelism* (MoE) — sparse routing. *Collective* — all-reduce·all-gather over UALink switch. *Pod 단위 fault domain*. RoCE/InfiniBand는 inter-pod로 분리.
