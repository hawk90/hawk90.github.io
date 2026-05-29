---
title: "Ch 5: INT — 정수 오버플로, 부호 변환, 시프트 함정"
date: 2026-05-18T06:00:00
description: "unsigned wraparound(INT30), signed overflow UB(INT31), shift UB(INT34), 부호 변환(INT35) — CVE의 큰 부분."
tags: [cert-c, integer, overflow, signed, unsigned, shift, cwe-190]
series: "CERT C"
seriesOrder: 5
draft: true
---

정수 함정은 *NVD CVE의 큰 부분*이다. 버퍼 크기 계산이 overflow하면 *작은 버퍼에 큰 데이터*가 흘러들어가 buffer overflow로 연결된다. INT 카테고리는 이를 다룬다.

## signed vs unsigned — C 표준의 정의

| 종류 | overflow 시 동작 |
|------|----------------|
| **unsigned** | `2^N`으로 modulo (well-defined wraparound) |
| **signed** | *Undefined Behavior* |

이게 핵심이다. `unsigned`는 *예측 가능한 wrap*, `signed`는 *어떤 일이 일어나도 합법*. 컴파일러는 *signed overflow가 일어나지 않는다*고 가정해 최적화한다.

```c
// 컴파일러는 이 검사를 *제거*할 수 있다
int x = INT_MAX;
if (x + 1 < x) {        // signed overflow 가정 → 절대 false라고 가정 → 제거
    panic();
}
```

GCC `-fwrapv`로 *signed wrap을 well-defined*로 강제할 수 있지만 *표준 외*. CERT는 이 옵션에 의존하지 말라고 한다.

## INT30-C — unsigned 정수 wraparound 회피

unsigned는 well-defined wrap이지만 *의도하지 않은 wrap*은 버그.

```c
// CVE-2002-0639 패턴 — buffer 크기 wrap
size_t n = strlen(input);
size_t total = n + 1;            // null 종결자 공간
char *buf = malloc(total);       // n이 SIZE_MAX면 total = 0
strcpy(buf, input);              // 0바이트 버퍼에 strcpy → overflow
```

대응: *덧셈 전 검사*.

```c
if (n > SIZE_MAX - 1) {
    return -EOVERFLOW;
}
size_t total = n + 1;

// 또는 C23의 ckd_add (checked arithmetic)
size_t total;
if (ckd_add(&total, n, 1)) {
    return -EOVERFLOW;
}
```

GCC/Clang `__builtin_add_overflow` 계열이 *모든 정수 타입에 checked arithmetic* 제공.

```c
size_t total;
if (__builtin_add_overflow(n, 1, &total)) {
    return -EOVERFLOW;
}
```

## INT31-C — signed 정수 wraparound 회피 (UB!)

```c
// 위반 — signed overflow는 UB
int x = INT_MAX;
int y = x + 1;       // UB

int total_size = num_items * item_size;   // UB 가능
```

`__builtin_*_overflow` 계열로 안전하게.

```c
int total_size;
if (__builtin_mul_overflow(num_items, item_size, &total_size)) {
    return -EOVERFLOW;
}
```

## INT32-C — signed 곱셈/시프트 UB 회피

곱셈 overflow가 가장 흔한 *exploitable* 정수 버그.

```c
// 위반
size_t size = nmemb * size;
void *p = malloc(size);     // overflow 시 작은 할당, 큰 사용

// Good
size_t size;
if (__builtin_mul_overflow(nmemb, size_of_elem, &size)) {
    return NULL;
}

// 또는 calloc — 표준이 overflow 검사 보장
void *p = calloc(nmemb, size_of_elem);
```

`calloc(nmemb, size)`는 *표준 보장 overflow 안전*. 한 호출로 처리.

## INT33-C — 0 나누기와 음수 modulo

```c
int z = x / y;       // y == 0이면 SIGFPE (또는 UB)
int z = x % y;       // y == 0이면 SIGFPE
int z = INT_MIN / -1;   // 위반 — UB (INT_MAX < |INT_MIN|)
int z = INT_MIN % -1;   // 위반 — 위와 같은 이유
```

`INT_MIN / -1`의 결과는 *수학적으로 INT_MAX + 1* — int 표현 범위 밖. *반드시* 검사.

```c
// Good
int safe_div(int x, int y, int *result) {
    if (y == 0) return -EINVAL;
    if (x == INT_MIN && y == -1) return -EOVERFLOW;
    *result = x / y;
    return 0;
}
```

## INT34-C — 시프트 카운트가 *비트 폭 미만*

```c
uint32_t x = 1;
uint32_t y = x << 32;     // 위반 — UB (32비트 타입을 32 시프트)
uint32_t y = x << -1;     // 위반 — 음수 시프트, UB
int z = -1 << 1;          // 위반 — signed 음수 좌시프트, UB
```

시프트 카운트는 *비트 폭 미만*(예: int32 → 0~31), *signed 음수 좌시프트 금지*.

```c
// Good — 검증
if (n >= 32) return -EINVAL;
uint32_t y = x << n;
```

## INT35-C — 비교 시 signed/unsigned 변환 함정

```c
int signed_v = -1;
unsigned int unsigned_v = 1;
if (signed_v < unsigned_v) {     // 위반? — signed → unsigned 변환되어 -1 = 0xFFFFFFFF
    /* never executed */
}
```

`signed_v`가 *변환*되어 *훨씬 큰 unsigned 값*이 된다. C의 *usual arithmetic conversion*이 의도와 반대 결과.

```c
// Good — 명시적 비교
if (signed_v < 0 || (unsigned int)signed_v < unsigned_v) {
    /* ... */
}
```

GCC `-Wsign-compare`가 같은 검사.

## INT36-C — 포인터를 정수로 변환할 때 정보 손실

```c
void *p = (void *)0x40020000;
uint32_t addr = (uint32_t)p;       // 32비트 시스템 OK, 64비트는 잘림
```

`uintptr_t`(C99)가 *포인터를 손실 없이 담을 수 있는 정수 타입*.

```c
#include <stdint.h>
uintptr_t addr = (uintptr_t)p;
```

## INT37-C — `char` 값을 정수 함수에 직접 넘기지 않는다

```c
char c = '\xFF';
isspace(c);          // 위반 — c가 signed면 -1 → EOF와 충돌
                     // ctype 함수는 unsigned char 또는 EOF만 허용

// Good
isspace((unsigned char)c);
```

ctype 계열(`isalpha`, `isdigit`, ...)은 *EOF (보통 -1)*와 충돌하므로 *unsigned char로 캐스트* 필수.

## INT38-C — 정수 식의 *비트 폭*에 주의

```c
uint32_t x = 0xFFFF;
uint32_t y = x * x;      // 위반? — int promotion으로 *int* 곱셈, signed overflow 가능

// Good — 명시적으로 unsigned 유지
uint32_t y = (uint32_t)x * (uint32_t)x;
```

C의 *integer promotion*은 *작은 정수를 int로* 끌어올린다. `uint16_t × uint16_t`는 *int 곱셈*이 되어 signed overflow UB.

## INT04-C — 사용자 입력은 *범위 검증* 필수

(*Recommendation* — 직접 UB 아니지만 보안 가이드)

```c
// 위반
int n = atoi(input);
char buf[n];                // n이 음수, 0, 또는 거대값이면 위험

// Good
char *end;
errno = 0;
long v = strtol(input, &end, 10);
if (errno != 0 || end == input || v < 1 || v > 1000) {
    return -EINVAL;
}
char buf[v];
```

## CVE 사례 — 정수 overflow가 어떻게 RCE로

```
2002 — Apache mod_rewrite remote heap overflow
       복호화 함수가 음수 길이를 unsigned로 변환 → 거대한 buffer copy

2014 — GnuTLS X.509 cert parsing
       cert 길이가 wrap → 작은 버퍼 할당, 큰 데이터 복사

2017 — Linux kernel CVE-2017-1000112
       UFO packet length overflow → kernel heap overflow → LPE
```

공격자 입력으로 *정수 연산*이 wrap되면 *그 결과를 길이로 쓰는 함수*가 모두 취약점이 된다.

## checked arithmetic 권장 패턴

```c
#include <stdckdint.h>    // C23

// 또는 GCC/Clang builtin
#define CHECK_ADD(a, b, result) __builtin_add_overflow((a), (b), (result))
#define CHECK_MUL(a, b, result) __builtin_mul_overflow((a), (b), (result))

size_t compute_size(size_t count, size_t item_size, size_t header) {
    size_t total;
    if (CHECK_MUL(count, item_size, &total)) return 0;
    if (CHECK_ADD(total, header, &total))    return 0;
    return total;
}
```

모든 *입력에서 파생된 크기 계산*에 적용. 보안 critical 코드의 *기본 패턴*.

## 자주 마주치는 취약점

| 규칙 | CVE 패턴 |
|------|---------|
| INT30/31 (overflow) | malloc size → heap overflow |
| INT32 (signed mul) | nmemb × size 함정 |
| INT34 (shift) | 잘못된 마스크 → 권한 우회 |
| INT35 (signed/unsigned 비교) | 음수가 거대값으로 → 검사 우회 |

## 정리

- *unsigned wrap*은 well-defined지만 *의도 안 한 wrap은 버그*.
- *signed overflow*는 UB — 컴파일러가 코드 자체를 제거할 수 있다.
- `calloc`, `__builtin_*_overflow`, C23 `ckd_*`로 checked arithmetic.
- 시프트 카운트 *비트 폭 미만*. signed 음수 좌시프트 금지.
- signed/unsigned 비교는 *명시적 처리*.
- 사용자 입력은 *범위 검증* 후 사용.

## 다음 장 예고

6장은 FLP — 부동소수점. NaN, 비교, 변환의 함정. 임베디드에서 흔히 마주치는 영역.

## 관련 항목

- [Ch 4 — Expressions](/blog/embedded/automotive/cert-c/chapter04-expressions)
- [Ch 6 — Floating Point](/blog/embedded/automotive/cert-c/chapter06-floating-point)
- [CWE-190 Integer Overflow](https://cwe.mitre.org/data/definitions/190.html)
