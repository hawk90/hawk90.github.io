---
title: "Ch 2: perf list / perf stat — 카운터"
date: 2025-08-25T02:00:00
description: "perf stat — 정적 카운터. cycles per instruction, cache miss rate."
tags: [perf, perf stat, Counters]
series: "perf / FlameGraph"
seriesOrder: 2
---

## 예정 내용
- perf list — 사용 가능 이벤트
- perf stat ./prog — 기본 카운터
- 흥미로운 도출 — IPC (instructions / cycles)
- cache miss rate
- branch misprediction
- -e 명시 — 특정 이벤트 선택
- -a 시스템 전역 / -p PID
- -r 반복 / -d 상세
