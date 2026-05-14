---
title: "Ch 10: 실전 사례 + 시리즈 마무리"
date: 2025-08-25T10:00:00
description: "캐시 미스 / 락 컨텐션 / I/O 블로킹 실제 분석. 시리즈 마무리."
tags: [perf, Case Study]
series: "perf and FlameGraph"
seriesOrder: 10
draft: true
---

## 예정 내용
- 사례 1 — 캐시 미스 (perf stat → annotate)
- 사례 2 — 락 컨텐션 (off-CPU + lock event)
- 사례 3 — I/O 블로킹 (block: tracepoint)
- 사례 4 — false sharing 식별
- 사례 5 — 컴파일 결과 검증 (godbolt + perf annotate)
- Brendan Gregg의 책 — Systems Performance, BPF
- 시리즈 마무리 — eBPF / bpftrace 시리즈로
