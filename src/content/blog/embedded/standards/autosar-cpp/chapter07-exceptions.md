---
title: "Ch 7: 예외 (A15-A16)"
date: 2025-09-15T08:00:00
description: "예외 규약 — throw 클래스, exception spec, RAII와 결합."
tags: [AUTOSAR, Exception, RAII]
series: "AUTOSAR C++14"
seriesOrder: 7
draft: true
---

## 예정 내용
- A15.1.1 — 예외만 throw (POD 아님)
- A15.1.2 — throw 직접 (포인터 X)
- A15.4.* — noexcept 명시 — destructor, move, swap
- A15.5.1 — destructor에서 예외 leak X
- A16.* — 빌드 옵션 / unspecified behavior
- 안전중요 시스템 — 예외 사용 자체 논쟁
