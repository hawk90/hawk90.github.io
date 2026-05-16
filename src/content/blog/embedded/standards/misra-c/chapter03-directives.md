---
title: "Ch 3: Directives D1~D4 — 도구가 보지 못하는 영역"
date: 2025-09-05T04:00:00
description: "환경 가정, 외부 코드 통합, 코드 표현, 언어 사용 — 16개 Directive의 의미와 실전 적용."
tags: [misra, c, directives, implementation-defined, traceability, header-guard]
series: "MISRA C"
seriesOrder: 3
draft: false
---

Directive는 정적 분석기가 자동 검증할 수 없는 *프로세스·환경·문서* 차원의 요구다. MISRA C:2012는 16개 Directive를 4개 그룹으로 묶었다.

| 그룹 | 범주 | 항목 수 |
|---|---|---|
| D1 | 컴파일 환경 가정 | 1 |
| D2 | 외부 코드(라이브러리, 어셈블리) 통합 | 1 |
| D3 | 코드 표현(추적성, 주석) | 1 |
| D4 | 언어 사용 정책 | 13 |

## D1 — 구현 정의 동작은 모두 문서화

### Dir 1.1 (Required)

> 구현 정의 동작(implementation-defined behavior)에 대한 *모든 의존성*은 문서화돼야 한다.

C 표준은 약 70개의 implementation-defined 항목을 정의한다. 대표 예:

```c
// int의 비트 폭은 구현마다 다르다
int x = 1 << 16;            // 16비트 int에서는 undefined

// signed 우측 시프트의 부호 처리는 구현 정의
int y = -1 >> 1;            // arithmetic shift? logical shift? 구현 따름

// char가 signed인지 unsigned인지 구현 정의
char c = 0xFF;
if (c < 0) /* ... */         // 의도가 무엇인가?

// 비트필드의 부호도 구현 정의
struct S { int flag:1; };    // -1인가 1인가?
```

대응 방법:

1. **명시적 타입 사용** — `int` 대신 `int32_t`, `char` 대신 `signed char` / `unsigned char`.
2. **컴파일러 동작 문서화** — 프로젝트 *Compiler Conformance Statement*에 사용하는 컴파일러의 모든 implementation-defined 항목을 기록.
3. **타깃 변경 시 재검토** — 컴파일러나 아키텍처가 바뀌면 문서 갱신.

```c
/* Compiler: GCC 12.2 / ARM Cortex-M4
 * char       : unsigned (project policy: -funsigned-char)
 * int        : 32 bits
 * signed >>  : arithmetic shift (GCC 보장)
 * pointer    : 32 bits, byte addressable
 */
```

## D2 — 외부 코드 통합

### Dir 2.1 (Required)

> 모든 소스 파일은 *어떤 위반도 없이* 컴파일돼야 한다(warning 포함).

이 Directive는 의외로 *함정*이 많다. "warning 없이"의 정의가 컴파일러마다 다르기 때문이다.

```bash
# GCC — strict하게 잡으려면
gcc -std=c99 -pedantic -Wall -Wextra -Werror -Wconversion \
    -Wsign-conversion -Wshadow -Wundef -Wcast-qual -Wcast-align \
    -Wstrict-prototypes -Wmissing-prototypes

# Clang — 추가 옵션
clang -Weverything -Wno-padded -Wno-c++98-compat
```

외부 라이브러리(HAL, RTOS, vendor SDK)는 일반적으로 MISRA 위반을 한다. 다음과 같이 *경계*를 그어 격리한다.

```
프로젝트/
├── src/                ← MISRA 적용 (deviation 보고 대상)
├── third_party/        ← MISRA 면제 (Permit-EXT-001)
│   ├── FreeRTOS/
│   └── ST_HAL/
└── wrappers/           ← MISRA 적용. HAL 위 추상화 레이어
    └── hal_uart.c
```

`third_party`는 별도 Permit으로 *전체 면제*하고, 그 위에 *MISRA 준수 wrapper*를 둔다. Wrapper가 HAL을 호출할 때만 deviation을 기록한다.

## D3 — 추적성

### Dir 3.1 (Required)

> 모든 코드는 요구사항에 추적 가능해야 한다.

ISO 26262 Part 8(Supporting processes)이 요구하는 *요구사항-설계-구현-테스트* 추적성이 코드 차원에서 구현된다. 보통 주석에 요구사항 ID를 박는다.

```c
/* @requirement SR-CAN-014: CAN 메시지 ID는 송신 전 검증
 * @design       D-CAN-007 (Message Validator)
 * @testcase     TC-CAN-014-001, TC-CAN-014-002
 */
int can_send(const can_msg_t *msg) {
    if (!validate_msg_id(msg->id)) {
        return -EINVAL;
    }
    return hal_can_transmit(msg);
}
```

도구(DOORS, Polarion, JIRA + 커스텀 플러그인)가 이 주석을 파싱해 트레이서빌리티 매트릭스를 만든다. 빠진 추적성이 있으면 인증 심사에서 즉시 지적된다.

## D4 — 언어 사용 정책 (13개)

가장 큰 그룹이다. 코드를 어떻게 *표현*할 것인가를 다룬다.

### Dir 4.1 (Required) — 런타임 실패 가능성 최소화

`malloc` 실패, 0 나눗셈, 배열 범위 초과 — *런타임 실패 가능성*을 최소화해야 한다. 다음과 같은 *방어적 코드*가 권장된다.

```c
// 회피
int Divide(int a, int b) {
    return a / b;              // b == 0이면 SIGFPE
}

// 권장
int Divide(int a, int b, int *result) {
    if (b == 0) return -EINVAL;
    *result = a / b;
    return 0;
}
```

### Dir 4.3 (Required) — Assembly는 격리

inline assembly나 vendor intrinsic은 *별도 함수*에 격리한다.

```c
// 회피 — 일반 함수 한가운데에 asm
int Foo(int x) {
    int y = x * 2;
    __asm__("nop");        // 분석기가 추적 불가
    return y;
}

// 권장 — wrapper 함수로 격리
static inline void cpu_nop(void) {
    __asm__("nop");
}

int Foo(int x) {
    int y = x * 2;
    cpu_nop();
    return y;
}
```

### Dir 4.4 (Advisory) — 주석 처리된 코드 제거

```c
// 회피
void Process(void) {
    int x = compute();
    // x = old_compute();   ← 이게 왜 남아 있는가?
    Use(x);
}
```

VCS가 있으면 코드는 지워도 된다.

### Dir 4.5 (Advisory) — 식별자 typographically unambiguous

`O`(대문자 오)와 `0`(영), `l`(소문자 엘)과 `1`(일), `rn`과 `m` 같은 시각적 혼동을 피한다. 폰트에 따라 다르지만 *원칙적으로* 회피.

```c
// 회피
int O0 = 0;        // 대문자 오와 영
int l1 = 1;        // 소문자 엘과 일

// Good
int circle = 0;
int line = 1;
```

### Dir 4.6 (Advisory) — 폭이 명시된 타입 사용

`int`, `long` 대신 `int32_t`, `uint16_t`를 쓴다.

```c
// 회피 — 폭이 컴파일러마다 다름
int counter;
long timestamp;

// Good
int32_t counter;
uint64_t timestamp;
```

`<stdint.h>`(C99 이상)가 모든 폭 명시 타입을 제공한다. 8/16/32/64 비트 + signed/unsigned.

### Dir 4.7 (Required) — 오류 정보가 손실되지 않도록

오류를 반환하는 함수는 *반환값을 검사*하거나 *문서화된 이유로* 무시해야 한다.

```c
// 위반
fopen("/etc/config", "r");          // 반환값을 통째로 버림

// Good
FILE *fp = fopen("/etc/config", "r");
if (fp == NULL) {
    log_error("config open failed");
    return -1;
}
```

### Dir 4.8 (Advisory) — 포인터 구현 은닉

포인터 타입은 구조체로 *불투명하게* 노출.

```c
// 회피 — 포인터를 직접 노출
typedef struct {
    int id;
    char buf[256];
} session_t;
session_t *create_session(void);

// Good — opaque pointer
typedef struct session_s session_t;     // 헤더는 declaration만
session_t *create_session(void);
void destroy_session(session_t *s);
```

### Dir 4.9 (Advisory) — 함수형 매크로보다 함수

```c
// 회피
#define MAX(a, b) ((a) > (b) ? (a) : (b))
int x = MAX(i++, j);    // i++가 두 번 평가됨

// Good
static inline int int_max(int a, int b) {
    return (a > b) ? a : b;
}
```

C99의 `inline` 또는 컴파일러 내장 `__attribute__((always_inline))`로 성능 손실 없이 함수로 대체 가능.

### Dir 4.10 (Required) — Include guard

모든 헤더에 guard가 있어야 한다.

```c
// foo.h
#ifndef PROJECT_FOO_H
#define PROJECT_FOO_H
/* ... */
#endif /* PROJECT_FOO_H */

// 또는 (비표준이지만 대부분 지원)
#pragma once
```

### Dir 4.11 (Required) — 표준 라이브러리 함수 인자 유효성 검증

`strcpy(NULL, src)`는 정의되지 않은 동작이다. 호출 전 검증.

```c
// 위반
strcpy(dst, src);

// Good
if (dst != NULL && src != NULL) {
    strncpy(dst, src, sizeof(dst_buf) - 1);
    dst[sizeof(dst_buf) - 1] = '\0';
}
```

더 안전하게는 *MISRA가 권장하는 안전 함수 wrapper*를 사용한다.

### Dir 4.12 (Required) — 동적 메모리는 사용하지 않는다

heap을 쓰지 않는 것이 가장 안전하다. 이 Directive는 Rule 21.3(`malloc` 금지)으로 강화된다.

### Dir 4.13 (Advisory) — 자원 함수는 짝을 맞춘다

```c
// 위반 — close 누락 경로 존재
int Process(const char *path) {
    int fd = open(path, O_RDONLY);
    if (fd < 0) return -1;
    if (do_work(fd) < 0) {
        return -1;          // 위반 — close 누락
    }
    close(fd);
    return 0;
}

// Good — single exit + cleanup label
int Process(const char *path) {
    int rc = -1;
    int fd = open(path, O_RDONLY);
    if (fd < 0) return -1;
    if (do_work(fd) < 0) goto cleanup;
    rc = 0;
cleanup:
    close(fd);
    return rc;
}
```

C++의 RAII가 가장 깨끗한 해법이지만 C에서는 *goto cleanup* 패턴 또는 *cleanup wrapper macro*(GCC `__attribute__((cleanup))`)가 대안이다.

## Directive 적용 체크리스트

| Directive | 자동화 가능 여부 | 검증 수단 |
|-----------|-----------------|-----------|
| Dir 1.1 | 부분 | Conformance Statement 리뷰 |
| Dir 2.1 | 가능 | CI에서 `-Werror` |
| Dir 3.1 | 부분 | DOORS/Polarion 트레이스 매트릭스 |
| Dir 4.1 | 어려움 | 코드 리뷰 + 정적 분석기 휴리스틱 |
| Dir 4.3 | 가능 | grep, 정적 분석기 |
| Dir 4.4 | 부분 | 정적 분석기, 리뷰 |
| Dir 4.5 | 어려움 | 코드 리뷰 |
| Dir 4.6 | 가능 | 정적 분석기 |
| Dir 4.7 | 가능 | `__attribute__((warn_unused_result))` |
| Dir 4.8 | 어려움 | 설계 리뷰 |
| Dir 4.9 | 부분 | 정적 분석기 |
| Dir 4.10 | 가능 | 정적 분석기 |
| Dir 4.11 | 부분 | 정적 분석기 휴리스틱 |
| Dir 4.12 | 가능 | grep, 정적 분석기 |
| Dir 4.13 | 어려움 | 정적 분석기 + 리뷰 |

"가능"은 도구만으로 충분하다는 뜻이고, "어려움"은 리뷰·설계 검토가 본 검증이 된다는 뜻이다.

## 정리

- Directive는 16개. 환경 가정(D1), 외부 코드(D2), 추적성(D3), 언어 사용(D4).
- 도구는 일부만 자동화한다 — 나머지는 리뷰·문서·프로세스가 본 증거.
- Dir 1.1은 *Compiler Conformance Statement* 라는 문서로 충족된다.
- Dir 2.1은 외부 코드를 wrapper로 격리해 충족한다.
- D4의 핵심 셋: 4.7(반환값 무시 금지), 4.10(include guard), 4.12(동적 메모리 금지).

## 다음 장 예고

4장부터 Rule 본문이다. 먼저 R1~R5 — 표준 준수, 사용·미사용 코드, 주석, 식별자 규칙을 본다.

## 관련 항목

- [Ch 2 — 분류 체계](/blog/embedded/standards/misra-c/chapter02-classification)
- [Ch 4 — Rules 1~5: 구문·형식](/blog/embedded/standards/misra-c/chapter04-syntax-format)
