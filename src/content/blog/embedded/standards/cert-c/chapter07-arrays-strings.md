---
title: "Ch 7: Arrays (ARR) / Strings (STR)"
date: 2025-09-12T01:00:00
description: "배열 경계 / 문자열 NULL terminator / strcpy 함정 / 안전 대체 함수."
tags: [CERT, Array, String, Buffer Overflow]
series: "CERT C"
seriesOrder: 7
draft: true
---

## 예정 내용
- ARR30 — 배열 경계 — never out-of-range
- ARR32 — 가변 길이 배열 적절 크기
- ARR37 — non-array 포인터 + 산술 X
- STR30 — 문자열 리터럴 변경 X
- STR31 — 충분한 버퍼 보장
- STR32 — null terminator 보장
- STR38 — narrow/wide 혼용 X
- 안전 함수 — strncpy_s / strncat_s (C11 Annex K)
