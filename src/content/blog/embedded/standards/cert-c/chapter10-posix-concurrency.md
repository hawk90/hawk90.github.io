---
title: "Ch 10: POSIX / 동시성 / 시리즈 마무리"
date: 2025-09-12T04:00:00
description: "POS — Linux/POSIX 특정. CON — 동시성 오류. 도구."
tags: [CERT, POSIX, Concurrency]
series: "CERT C"
seriesOrder: 10
---

## 예정 내용
- POS30 — readlink 결과 null terminate
- POS33 — vfork 사용 X
- POS54 — file descriptor 누수 X
- CON30 — 정리 핸들러 — thread / mutex
- CON32 — 비-atomic 공유 — race
- CON33 — 라이브러리 thread-safety 확인
- CON40 — racy memcpy / memmove X
- 도구 — TSan / Helgrind
- 시리즈 마무리 — Real World CVE 사례
