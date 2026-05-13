---
title: "Part 5-1: 동기화 primitives — spinlock / mutex / rwsem / RCU"
date: 2025-07-19T01:00:00
description: "커널 동기화 도구. spinlock vs mutex 선택. RCU의 lock-free 읽기."
tags: [Linux, Kernel, Synchronization, RCU]
series: "리눅스 커널의 구조와 원리"
seriesOrder: 22
draft: true
---

## 작성 중

### 예정 내용
- spinlock — 짧은 critical section / 인터럽트 컨텍스트
- mutex — 슬립 가능 / 프로세스 컨텍스트
- semaphore — 일반 / down_interruptible
- rwsem — reader-writer semaphore
- RCU — Read-Copy-Update / lock-free 읽기
- seqlock — 짧은 reader / 흔한 writer
