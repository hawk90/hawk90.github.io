---
title: "Part 5-2: 인터럽트 / softirq / tasklet / workqueue"
date: 2025-07-19T02:00:00
description: "인터럽트 처리 계층 — top half / bottom half. workqueue."
tags: [Linux, Kernel, Interrupt, softirq, workqueue]
series: "리눅스 커널의 구조와 원리"
seriesOrder: 23
---

## 작성 중

### 예정 내용
- 인터럽트 핸들러 — top half (빠르게)
- bottom half — softirq / tasklet / workqueue (지연 처리)
- softirq — 정적 / 빠름 / 락 없음
- tasklet — 동적 / 자동 직렬화
- workqueue — 프로세스 컨텍스트 / 슬립 가능
- threaded IRQ
