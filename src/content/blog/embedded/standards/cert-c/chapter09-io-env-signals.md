---
title: "Ch 9: I/O / Environment / Signals / Errors"
date: 2025-09-10T10:00:00
description: "FIO 파일, ENV getenv, SIG 비동기 안전, ERR errno 처리."
tags: [CERT, FIO, Signal, Error]
series: "CERT C"
seriesOrder: 9
draft: true
---

## 예정 내용
- FIO30 — race 회피 (TOCTOU)
- FIO34 — 입력 검증
- FIO37 — gets / scanf %s 회피
- ENV01 — getenv 결과 변경 X
- SIG30 — async-signal-safe 함수만 핸들러에서
- SIG31 — 핸들러에서 공유 변수 — sig_atomic_t 또는 atomic
- ERR30 — errno 확인 전 0으로 reset
