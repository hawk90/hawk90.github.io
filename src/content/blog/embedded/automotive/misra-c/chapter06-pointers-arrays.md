---
title: "Ch 6: Rules 11, 18 — 포인터 변환과 배열·산술"
date: 2026-05-18T07:00:00
description: "포인터 캐스트(R11), 포인터 산술·배열 첨자(R18.1~7), VLA 금지(R18.8) — 메모리 안전성의 1차 방어선."
tags: [misra, c, pointer, array, void-pointer, vla, flexible-array]
series: "MISRA C"
seriesOrder: 6
draft: true
---

포인터는 C의 *가장 강력하면서 가장 위험한* 도구다. MISRA는 R11(타입 변환)과 R18(산술)에 강한 제약을 둔다. 위반은 거의 항상 메모리 안전 사고와 직결된다.

## R11 — 포인터 타입 변환

### Rule 11.1 (Required) — 함수 포인터를 객체 포인터로 변환 금지

```c
int (*fn)(int) = &Foo;
void *p = (void *)fn;      // 위반 — 함수 포인터 → void *
```

C 표준은 함수 포인터와 객체 포인터를 *호환되지 않는 별도 카테고리*로 둔다. Harvard 아키텍처(코드와 데이터가 분리된 주소 공간)에서는 *크기와 표현*조차 다를 수 있다.

### Rule 11.2 (Required) — 불완전 타입 객체 포인터를 변환 금지

```c
struct Opaque;        // declaration only
struct Opaque *p;
int *q = (int *)p;    // 위반 — 불완전 타입 포인터 캐스트
```

### Rule 11.3 (Required) — 객체 포인터 *간* 캐스트는 호환 타입만

```c
int x = 5;
int *p = &x;
char *c = (char *)p;     // 위반 — int * → char *

uint32_t *q = (uint32_t *)p;    // OK — 같은 폭, 정렬
```

타입 punning이 필요하면 `memcpy` 또는 union을 쓴다.

```c
// Good — memcpy 방식
uint32_t bits;
float f = 3.14f;
memcpy(&bits, &f, sizeof(bits));
```

### Rule 11.4 (Advisory) — 정수와 포인터 사이 변환 회피

```c
volatile uint32_t *reg = (uint32_t *)0x40021000;   // 위반 (Advisory)
```

MMIO 코드에서는 *피할 수 없는* 패턴이다. Deviation Permit으로 처리.

### Rule 11.5 (Advisory) — `void *` → 객체 포인터 캐스트는 명시적

```c
void *Allocate(size_t n);

// 위반 (Advisory) — 묵시적
int *p = Allocate(100);

// Good — 명시
int *p = (int *)Allocate(100);
```

C++과 달리 C는 `void *`에서 묵시적 변환을 허용한다. MISRA는 *의도 명시*를 권한다.

### Rule 11.6 (Required) — `void *`와 정수 변환은 NULL뿐

```c
void *p = (void *)0;       // OK — NULL
void *p = (void *)42;      // 위반
```

### Rule 11.7 (Required) — 객체 포인터 ↔ non-integer 산술 타입 변환 금지

`(float *)(double)x` 같은 *어처구니없는* 코드가 가능한 것을 막는다.

### Rule 11.8 (Required) — qualifier(`const`, `volatile`) 제거 금지

```c
const int x = 5;
int *p = (int *)&x;      // 위반 — const 제거
*p = 10;                 // UB — 실제로는 read-only 메모리일 수도
```

### Rule 11.9 (Required) — NULL은 `NULL` 매크로 또는 `(void *)0`으로

```c
int *p = 0;          // 위반 — 그냥 0
int *p = NULL;       // Good
int *p = (void *)0;  // Good
```

## R18 — 포인터 산술과 배열

### Rule 18.1 (Required, Undecidable) — 포인터 산술 결과가 객체 범위 내

```c
int arr[10];
int *p = &arr[15];        // 위반 — 범위 초과
int *p = arr;
p += 20;                  // 위반 — 같은 의미

int *p = &arr[10];        // OK — one-past-end는 표준 허용
int x = *(&arr[10]);      // 위반 — dereferencing
```

C 표준은 *one past the end*까지 *주소 계산*은 허용하지만 *역참조*는 UB. MISRA가 강제.

Undecidable이라 정적 분석기가 *모든* 케이스를 잡지는 못한다. 코드 리뷰와 런타임 검사(예: ASan)로 보완.

### Rule 18.2 (Required, Undecidable) — 두 포인터 뺄셈은 같은 배열

```c
int a[10], b[10];
ptrdiff_t d = &a[5] - &b[2];     // 위반 — 다른 배열
```

표준상 *같은 객체 안*에서만 결과가 정의된다.

### Rule 18.3 (Required, Undecidable) — 관계 비교는 같은 객체

```c
int a[10], b[10];
if (&a[0] < &b[0]) { /* ... */ }     // 위반 — UB
```

### Rule 18.4 (Advisory) — 포인터 산술은 배열 첨자 `[]`로만

```c
int arr[10];
int *p = arr;

// 회피
*(p + 3) = 5;
*++p = 10;
p[0] = (p++, 5);

// Good
arr[3] = 5;
p[0] = 10;
```

가독성과 분석 가능성 모두 향상. STL 알고리즘 이식 등 *반복자 패턴*이 필요하면 deviation.

### Rule 18.5 (Advisory) — 다중 레벨 포인터 회피

```c
// 회피
int ***p;            // 3단 포인터
char **argv;         // 2단은 흔하지만 advisory 위반

// Good — 구조체로 추상화
typedef struct { char **items; size_t count; } string_list_t;
void Process(string_list_t *list);
```

`char **argv`는 거의 모든 C 프로그램이 가지는 형태라 *Advisory*로 두는 것.

### Rule 18.6 (Required) — 객체 주소가 그 객체 수명을 넘어 사용되지 않음

```c
int *Bad(void) {
    int x = 5;
    return &x;          // 위반 — 자동 변수 주소 반환
}

const char *Good(void) {
    static const char *msg = "hello";
    return msg;          // OK — static
}
```

dangling pointer의 주요 원인. GCC `-Wreturn-local-addr` 동일.

### Rule 18.7 (Required) — Flexible array member는 단일 객체

C99의 *flexible array member*는 *마지막 멤버에 한해 크기 미정 배열* 허용.

```c
struct Buffer {
    size_t len;
    char data[];       // FAM
};

// 사용 — 동적 할당 필요
struct Buffer *b = malloc(sizeof(*b) + 100);
b->len = 100;
```

이를 *배열로 만들지 마라*(`struct Buffer arr[10];` 금지). FAM은 *마지막 객체에만* 의미 있다.

### Rule 18.8 (Required) — Variable-Length Array(VLA) 금지

C99의 VLA는 *스택에 런타임 결정 크기* 배열을 만든다.

```c
void Process(size_t n) {
    int buf[n];        // 위반 — VLA
    /* ... */
}
```

문제는:

1. **스택 오버플로 위험** — 큰 n이 들어오면 스택 폭주.
2. **정렬·크기 분석 어려움** — 정적 분석기가 *최악 사용량*을 못 잡는다.
3. **C11 옵션화** — C11에서 VLA는 *선택적 기능*이 됐다.

대안:

```c
// Good — 고정 최대 크기
#define MAX_BUF 256
void Process(size_t n) {
    int buf[MAX_BUF];
    if (n > MAX_BUF) return;
    /* ... */
}
```

## 함수 포인터 — R8과 R11이 만나는 곳

```c
// 회피 — 다양한 시그니처를 void *로 강제
typedef void (*generic_callback_t)(void *);

// Good — 타입 안전 콜백
typedef void (*timer_callback_t)(timer_handle_t, void *user_data);
```

콜백 등록에서 *void * user_data*가 일반적 패턴이지만, *콜백 함수 시그니처 자체*는 강타이핑이 필요하다.

## 자주 위반되는 항목

| Rule | 위반 빈도 | 흔한 원인 |
|------|----------|----------|
| 11.3 | 매우 높음 | byte buffer를 `char *`로 다루기 |
| 11.5 | 높음 | `malloc` 결과 캐스트 누락 |
| 11.8 | 중간 | `const` 제거하고 수정 |
| 18.1 | 높음 | off-by-one |
| 18.4 | 매우 높음 | `*(p + i)` 패턴 습관 |
| 18.8 | 중간 | VLA 편의 사용 |

## 정리

- R11은 *포인터 타입 변환의 안전성*을 모델링한다.
- 함수 ↔ 객체 포인터 캐스트, 다른 객체 타입 캐스트는 *원칙적으로 금지*.
- R18은 *포인터 산술의 정의된 동작 범위*를 강제한다.
- VLA(18.8)는 스택 오버플로와 분석 곤란으로 금지.
- 산술 결과 범위(18.1), 두 포인터 비교(18.2/3)는 Undecidable — 도구 + 리뷰가 함께.

## 다음 장 예고

7장은 R14~R16 제어흐름이다. `for`, `while`, `switch`, `goto`에 대한 *단일 종료점*과 *fall-through*의 정책을 본다.

## 관련 항목

- [Ch 5 — Essential Type Model](/blog/embedded/automotive/misra-c/chapter05-expressions-types)
- [Ch 7 — 제어흐름](/blog/embedded/automotive/misra-c/chapter07-control-flow)
