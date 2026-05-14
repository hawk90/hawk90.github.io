---
title: "Part 2-3: 스케줄러 — CFS / RT / deadline"
date: 2025-07-15T07:00:00
description: "Completely Fair Scheduler — red-black tree, vruntime. RT / deadline 클래스."
tags: [Linux, Kernel, Scheduler, CFS]
series: "리눅스 커널의 구조와 원리"
seriesOrder: 7
draft: true
---

## 작성 중

### 예정 내용
- 스케줄러 클래스 계층 — stop / deadline / RT / CFS / idle
- CFS — red-black tree by vruntime
- vruntime 계산 / weight (nice)
- pick_next_task → 다음 실행 task
- RT — FIFO / RR, prio_array
- deadline (EDF)
- load balancing — CPU 간
