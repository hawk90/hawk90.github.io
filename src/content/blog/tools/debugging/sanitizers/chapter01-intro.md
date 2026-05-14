---
title: "Ch 1: Sanitizers 개요 — ASan / UBSan / LSan / TSan"
date: 2026-05-15T21:00:00
description: "Sanitizer 계열 도구의 역할, 종류, 언제 어떤 sanitizer를 먼저 써야 하는지 정리."
tags: [Sanitizer, ASan, UBSan, TSan, LSan, Debugging, C, C++]
series: "Sanitizers"
seriesOrder: 1
draft: false
---

`Sanitizer`는 C/C++에서 가장 먼저 붙여야 하는 런타임 검사용 도구입니다. 실무에서는 대개:

1. `ASan + UBSan`
2. 멀티스레드면 `TSan`
3. 필요하면 `LSan`

이 순서로 접근합니다.

---

## 왜 Sanitizer부터 시작하나

Sanitizer는 컴파일러가 계측 코드를 넣는 방식이라서, 일반적으로 다음 장점이 있습니다.

- 설정이 단순함
- 테스트/CI에 넣기 쉬움
- 에러 위치가 비교적 직접적임
- Valgrind 계열보다 훨씬 빠름

기본 조합은 보통 이렇습니다.

```bash
-fsanitize=address,undefined -fno-omit-frame-pointer -g
```

---

## 주요 종류

### ASan

`AddressSanitizer`

- heap/stack buffer overflow
- use-after-free
- double free
- invalid free

가장 먼저 켜야 하는 도구입니다.

### UBSan

`UndefinedBehaviorSanitizer`

- signed overflow
- invalid shift
- null 관련 UB
- 잘못된 downcast 등

경고만으로는 안 잡히는 UB를 런타임에 드러냅니다.

### LSan

`LeakSanitizer`

- 메모리 누수 검출

대개 ASan과 함께 동작합니다.

### TSan

`ThreadSanitizer`

- 데이터 레이스
- 동기화 누락

멀티스레드 코드라면 별도 빌드 구성으로 거의 필수입니다.

---

## 추천 운영 방식

### 로컬 개발

```bash
CFLAGS="-fsanitize=address,undefined -fno-omit-frame-pointer -g"
```

### 멀티스레드 테스트

```bash
CFLAGS="-fsanitize=thread -g"
```

### CI

- PR: `ASan + UBSan`
- nightly: `TSan`

---

## 이 시리즈에서 다룰 것

1. Sanitizers 개요
2. ASan / UBSan 실전 설정
3. LSan과 누수 분석
4. TSan과 데이터 레이스 디버깅
5. CMake / CI 통합

---

## 체크리스트

- [ ] Debug 빌드에 `ASan + UBSan`이 있는가?
- [ ] `-fno-omit-frame-pointer -g`를 함께 쓰는가?
- [ ] 멀티스레드 테스트용 `TSan` 빌드가 있는가?
- [ ] CI에서 sanitizer job을 돌리는가?

