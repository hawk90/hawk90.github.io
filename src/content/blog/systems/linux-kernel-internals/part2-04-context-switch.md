---
title: "Part 2-4: 컨텍스트 스위치"
date: 2026-07-16T04:00:00
description: "schedule() → context_switch — 레지스터 / 스택 / 페이지 테이블 교체."
tags: [Linux, Kernel, Context Switch]
series: "리눅스 커널의 구조와 원리"
seriesOrder: 8
draft: true
---

## 작성 중

### 예정 내용
- schedule() — 진입점 / preempt 검사
- context_switch — switch_mm / switch_to
- switch_mm — 페이지 테이블 / TLB
- switch_to — 어셈블리 / 레지스터 저장 / 복원
- 비용 — TLB flush / 캐시 무효화
- lazy TLB
