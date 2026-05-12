---
title: "Ch 5: Integers (INT)"
date: 2026-09-11T02:00:00
description: "정수 오버플로 / 음수 / 시프트 / wraparound. 보안 결함의 큰 부분."
tags: [CERT, Integer, Overflow]
series: "CERT C"
seriesOrder: 5
draft: true
---

## 예정 내용
- INT30 — unsigned 오버플로 wrap 회피
- INT31 — signed 오버플로 UB 회피
- INT32 — signed 곱셈 / 시프트 UB 회피
- INT33 — 0 나누기 / 음수 modulo
- INT34 — 0 시프트 / 너비 초과 시프트 UB
- INT35 — 비교 시 signed/unsigned 변환 주의
- INT36 — 포인터 → 정수 변환
