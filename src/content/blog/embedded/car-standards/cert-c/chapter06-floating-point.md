---
title: "Ch 6: FLP — 부동소수점, NaN, 비교, 변환"
date: 2025-09-10T07:00:00
description: "Loop counter 금지(FLP30), 도메인 에러(FLP32), 변환 검증(FLP34), 비트 비교 금지(FLP37) — IEEE 754의 함정."
tags: [cert-c, floating-point, ieee-754, nan, denormal, rounding]
series: "CERT C"
seriesOrder: 6
draft: false
---

부동소수점은 *수학적 실수*가 아니라 *IEEE 754 비트 표현*이다. C 표준은 IEEE 754를 *권장*하지만 강제하지 않는다. 임베디드에서는 *float 하드웨어가 없거나*, *비표준 구현*인 경우도 있다.

## IEEE 754 기본

| 타입 | 비트 폭 | 지수 | 가수 | 범위 |
|------|--------|------|-----|------|
| `float` | 32 | 8 | 23 | ±~3.4e38 |
| `double` | 64 | 11 | 52 | ±~1.8e308 |
| `long double` | 80~128 | 가변 | 가변 | 구현 정의 |

특수 값:

- **±0** — 부호가 있는 0. 비교는 같음, 비트는 다름.
- **±Inf** — 무한대. `1.0 / 0.0`의 결과.
- **NaN** — *Not a Number*. `0.0 / 0.0`, `sqrt(-1.0)`. 비교가 항상 false.
- **Subnormal/Denormal** — 매우 작은 수. 일부 임베디드는 *0으로 처리*(FTZ).

## FLP30-C — float를 loop counter로 쓰지 마라

```c
// 위반
for (float t = 0.0f; t < 1.0f; t += 0.1f) { /* ... */ }
```

`0.1f`는 *2진 부동소수점에서 정확히 표현 불가*(0.1 = 1/10이 2진으로 무한 소수). 10번 더해도 1.0이 *아닐 수* 있어 *반복 횟수가 컴파일러·하드웨어에 따라 다르다*.

```c
// Good — 정수 카운터
for (int i = 0; i < 10; i++) {
    float t = (float)i * 0.1f;
    /* ... */
}
```

## FLP32-C — 부동소수점 *도메인 에러* 검증

```c
// 위반 — sqrt 음수 인자
float x = -1.0f;
float y = sqrtf(x);     // NaN 반환, errno = EDOM

// Good
if (x < 0.0f) return -EDOM;
float y = sqrtf(x);
```

C99의 `math_errhandling` 매크로로 *errno 사용 / fp exception 사용*을 알 수 있다.

```c
#include <math.h>
#if math_errhandling & MATH_ERRNO
    errno = 0;
    float y = sqrtf(x);
    if (errno == EDOM) { /* domain error */ }
#endif
```

`<fenv.h>`의 `fetestexcept(FE_INVALID)` 등으로 *FP exception flag*로도 검출 가능.

## FLP34-C — 정수 → 부동소수점 변환 시 *표현 가능*

```c
int32_t n = INT32_MAX;
float f = (float)n;           // float는 23비트 가수 — 32비트 int 손실
int32_t m = (int32_t)f;       // 원래 값과 다를 수 있음
```

`float`의 가수는 23비트(+ 묵시 1 = 24비트). `int32_t`의 큰 값은 *정확히 표현 불가*.

```c
// Good — 명시적 처리
if (n > FLT_MAX || n < -FLT_MAX) return -ERANGE;
float f = (float)n;
```

## FLP36-C — 정수 정밀도가 *부동소수점에 보존*

`uint64_t` → `double` 변환은 *52비트 가수* 한계로 정밀도 손실. 큰 정수를 부동소수점에 넣으면 *낮은 비트가 잘린다*.

```c
uint64_t n = 0xFFFFFFFFFFFFFFFFu;
double d = (double)n;         // ~1.84e19, 하지만 정확한 64비트 값이 아님
uint64_t m = (uint64_t)d;     // n과 다를 수 있음
```

해결: *원본 정수 유지*하고 *필요할 때만* 캐스트.

## FLP37-C — 부동소수점은 `memcmp`로 비교 금지

```c
float a = 0.1f;
float b = 0.1f;
if (memcmp(&a, &b, sizeof(float)) == 0) { /* ... */ }   // 위반
```

`-0.0`과 `+0.0`은 *비트 표현이 다르지만 같은 값*. NaN은 *모든 비트 표현이 NaN*. `memcmp`는 이를 구분하지 못한다.

```c
// Good — 값 비교
if (a == b) { /* ... */ }       // -0.0 == +0.0 = true

// 더 Good — 오차 허용
if (fabsf(a - b) < FLT_EPSILON) { /* ... */ }
```

## 정확한 비교는 거의 불가능

```c
// 위반 — 거의 항상 false
float a = 0.1f + 0.2f;
if (a == 0.3f) { /* ... */ }    // 0.1 + 0.2 ≠ 0.3 in binary FP
```

부동소수점 *동일성 비교*는 *피한다*. *오차 범위* 비교로.

```c
// 절대 오차
bool float_eq_abs(float a, float b, float eps) {
    return fabsf(a - b) < eps;
}

// 상대 오차 — 큰 수에 안전
bool float_eq_rel(float a, float b, float eps) {
    return fabsf(a - b) <= eps * fmaxf(fabsf(a), fabsf(b));
}

// ULP (Unit in the Last Place) — 가장 정밀
bool float_eq_ulp(float a, float b, int ulps);
```

## NaN 처리

```c
// NaN은 모든 비교가 false
float n = NAN;
n == n;          // false
n != n;          // true   ← NaN 검출 관용구
n < 0;           // false
n > 0;           // false

// 표준 매크로
isnan(n);        // C99 — NaN 여부
isinf(n);        // 무한대 여부
isfinite(n);     // 일반 수인가
```

## Denormal·Subnormal

`FLT_MIN` 미만의 *매우 작은 수*. 일부 임베디드 FPU는 *Flush-To-Zero (FTZ)* 모드로 *0으로 강제*. 이 경우 *작은 값이 0이 되어* 0 나누기 trap.

```c
// FPU 설정 확인 — ARM Cortex-M
uint32_t fpscr;
__asm__ volatile("VMRS %0, FPSCR" : "=r"(fpscr));
bool ftz_on = (fpscr & (1 << 24)) != 0;   // FZ bit
```

안전 설정은 *FTZ off* + *NaN 발생 시 fp exception*.

## 부동소수점 — 임베디드 권장 사항

| 권장 | 이유 |
|------|------|
| 가능하면 *정수 fixed-point* 사용 | FPU 없는 MCU, 결정성 |
| `float`을 *마지막 단계*에서만 | 누적 오차 회피 |
| `==` 비교 대신 *허용 오차* | 정확 표현 불가 |
| *입력 검증* — NaN/Inf 차단 | 후속 연산 보호 |
| FTZ/RTZ 모드 *프로젝트 차원에 고정* | 이식성 |

## CVE 사례

```
2018 — Adobe Reader CVE-2018-4922
       NaN처리 누락 → 무한 루프 또는 OOB read

2020 — Various TLS 라이브러리
       부동소수점 변환 시 정수 범위 검증 누락 → 길이 wrap
```

부동소수점이 *보안 critical*에 직접 등장하는 경우는 적지만, *DSP 펌웨어*, *센서 처리*, *제어 시스템*에서는 *core 안전성 자체*가 부동소수점 정확성에 달려 있다.

## 정리

- 부동소수점은 *수학 실수가 아니다* — IEEE 754 비트 표현.
- Loop counter로 쓰지 마라 — 누적 오차.
- 동일성 `==` 비교 회피, *허용 오차* 또는 *ULP*.
- `memcmp` 금지 — `±0` 동일, NaN 비교 불가.
- 정수→float 변환 시 *표현 가능성 검사*.
- NaN/Inf는 *isnan/isinf*로 명시 검출.

## 다음 장 예고

7장은 ARR, STR — 배열과 문자열. 가장 *exploit가 많은* 영역. Buffer overflow, off-by-one, null 종결.

## 관련 항목

- [Ch 5 — Integers](/blog/embedded/standards/cert-c/chapter05-integers)
- [Ch 7 — Arrays & Strings](/blog/embedded/standards/cert-c/chapter07-arrays-strings)
- [IEEE 754 — Wikipedia](https://en.wikipedia.org/wiki/IEEE_754)
