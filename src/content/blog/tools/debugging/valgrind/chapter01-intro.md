---
title: "Ch 1: Valgrind 개요 — Memcheck / Helgrind / DRD"
date: 2026-05-15T21:10:00
description: "Valgrind가 아직 왜 필요한지, Memcheck / Helgrind / DRD의 역할과 사용 순서를 정리."
tags: [Valgrind, Memcheck, Helgrind, DRD, Debugging, C, C++]
series: "Valgrind"
seriesOrder: 1
draft: false
---

`Valgrind`는 느리지만 아직 유효한 도구입니다. `Sanitizer`를 기본으로 쓰더라도, 다음 상황에서는 Valgrind가 계속 필요합니다.

- 메모리 누수 상세 추적
- 초기화되지 않은 값 사용
- 힙 사용 패턴 분석
- 동시성 보조 분석

---

## Valgrind를 어디에 쓰나

Valgrind는 런타임을 감싸서 추적합니다. 그래서 느리지만 관찰 폭이 넓습니다.

대표 도구는 세 가지입니다.

### Memcheck

- 메모리 누수
- invalid read/write
- uninitialized value

가장 많이 쓰는 기본 도구입니다.

```bash
valgrind --leak-check=full --show-leak-kinds=all ./app
```

### Helgrind

- 락 사용 오류
- race 가능성
- 동기화 패턴 점검

```bash
valgrind --tool=helgrind ./app
```

### DRD

- 스레드 동기화 관련 분석
- race / mutex misuse 보조 점검

```bash
valgrind --tool=drd ./app
```

---

## 왜 아직 버리지 못하나

Sanitizer가 더 빠르고 실용적이지만, Valgrind는 이런 장점이 있습니다.

- 누수 원인 추적이 자세함
- 초기화되지 않은 값 분석이 강함
- 바이너리 수준 추적이라 빌드 계측과 다른 관점을 줌

즉, 기본 도구라기보다는 **정밀 점검 도구**에 가깝습니다.

---

## 추천 운영 방식

1. 평소 개발: `ASan + UBSan`
2. 멀티스레드: `TSan`
3. 릴리스 전 점검: `Valgrind Memcheck`
4. 동기화 보조 분석: `Helgrind` 또는 `DRD`

---

## 이 시리즈에서 다룰 것

1. Valgrind 개요
2. Memcheck 실전 사용
3. leak report 읽는 법
4. Helgrind / DRD
5. suppression 파일과 실무 운용

---

## 체크리스트

- [ ] 누수 재현 케이스에 `Memcheck`를 돌려보는가?
- [ ] report의 direct / indirect leak를 구분하는가?
- [ ] 멀티스레드 문제에서 `Helgrind`/`DRD`를 보조로 써보는가?
- [ ] 너무 느린 job은 nightly로 분리했는가?

