---
title: "Ch 2: Apple Neural Engine·MPSGraph Backend"
date: 2028-08-01T02:00:00
description: "ANE·GPU backend 내부 — model compile 결과가 어떻게 실행되나."
series: "Core ML 심화"
seriesOrder: 2
tags: [coreml, ane, mpsgraph, backend]
draft: true
---

> Outline — *ANE backend* — 비공개, Core ML 통해서만. *MPSGraph backend* — GPU 실행 경로. *Hybrid 실행* — ANE-supported subgraph + GPU fallback. *Compiler가 결정* — fp16·int8 변환·op fusion. *비교 분석* — compute_unit 옵션별 latency·power. *Reverse-engineering 노트* (Asahi·llama.cpp Metal).
