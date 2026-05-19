---
title: "8-02: 메모리 정렬과 패딩"
date: 2026-05-15T18:00:00
description: "Natural alignment, struct padding 규칙, packed의 unaligned access penalty, offsetof와 alignof 사용을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 90
tags: [recipes, memory, alignment]
---

## 한 줄 요약

> **"Alignment는 *공짜 성능*입니다."** Natural alignment를 깨면 ARM에서 fault가 나거나 cycle이 두 배로 듭니다. `packed`는 *전송 프로토콜*에만 씁니다.

## 어떤 상황에서 쓰나

UART나 BLE로 받은 byte stream을 struct로 캐스팅해서 읽으려고 할 때 가장 먼저 마주칩니다. 송신측이 정렬을 고려하지 않은 layout을 쏘아 보내면 `__attribute__((packed))`를 붙일 수밖에 없고, 그 결과 ARMv6/M0에서는 hard fault, Cortex-A에서는 cycle 두 배의 비용이 발생합니다.

또 한 가지는 struct를 정의할 때입니다. 같은 field를 어떤 순서로 두느냐에 따라 sizeof가 두 배로 차이날 수 있습니다. RAM이 빠듯한 MCU에서는 그만큼 다른 데이터를 더 둘 수 있느냐 마느냐가 결정됩니다.

## 핵심 개념

**Natural alignment:**

| Type | 경계 |
|------|------|
| `uint8_t` | 1-byte (어디든) |
| `uint16_t` | 2-byte |
| `uint32_t` | 4-byte |
| `uint64_t` | 8-byte (32-bit ARM은 4-byte로 처리) |
| `double` | 8-byte |
| pointer | architecture word size |

C 표준은 모든 type에 *natural alignment*를 요구합니다. struct field 사이에 *padding*이 자동으로 들어가 이 규칙을 지킵니다.

| Architecture | Unaligned access |
|--------------|-------------------|
| ARM ARMv6/M0 | → BUS FAULT |
| ARM ARMv7+/M3+ | 허용, 2배 cycle |
| x86 | 허용, 거의 0 cost |

ARM Cortex-M0/M3에서는 정렬을 놓치면 hard fault로 reset됩니다. 정렬 비용이 무료가 아닙니다.

## 코드 / 실제 사용 예

### Struct padding 규칙

```c
struct s1 {
    char  a;        /* offset 0 */
    /* padding 3 byte */
    int   b;        /* offset 4 */
    char  c;        /* offset 8 */
    /* padding 3 byte */
};
/* sizeof(s1) = 12 */

struct s2 {
    int   b;        /* offset 0 */
    char  a;        /* offset 4 */
    char  c;        /* offset 5 */
    /* padding 2 byte */
};
/* sizeof(s2) = 8 — 33% 절약 */
```

큰 type을 먼저, 작은 type을 뒤에 두면 padding이 줄어듭니다. RAM이 빠듯하면 의식적으로 reorder합니다.

### offsetof, alignof, sizeof

```c
#include <stddef.h>
#include <stdalign.h>

struct s {
    char a;
    int  b;
    long long c;
};

printf("sizeof  = %zu\n", sizeof(struct s));     /* 16 */
printf("offsetof(a) = %zu\n", offsetof(struct s, a));  /* 0 */
printf("offsetof(b) = %zu\n", offsetof(struct s, b));  /* 4 */
printf("offsetof(c) = %zu\n", offsetof(struct s, c));  /* 8 */
printf("alignof = %zu\n", alignof(struct s));    /* 8 */
```

protocol을 정의할 때 `offsetof`로 layout이 의도와 같은지 확인합니다.

### `_Static_assert`로 layout 검증

```c
struct frame {
    uint8_t  type;
    uint8_t  flags;
    uint16_t len;
    uint32_t payload;
};

_Static_assert(sizeof(struct frame) == 8, "frame layout drift");
_Static_assert(offsetof(struct frame, len) == 2, "len position");
```

컴파일 시점에 layout이 깨지면 빌드가 실패합니다. 외부 device와의 protocol을 보호하는 가장 단순한 방법입니다.

### Packed의 함정

```c
struct __attribute__((packed)) bad {
    char  a;
    int   b;       /* offset 1 — misaligned! */
};

struct bad p;
int v = p.b;       /* Cortex-M3: 2 cycle, Cortex-M0: fault */
```

`packed`는 padding을 모두 없앱니다. 그 결과 align되지 않은 read/write가 일어나, ARM에서는 cycle이 두 배이거나 fault가 발생합니다.

```c
/* 안전한 packed 접근 — memcpy로 우회 */
int v;
memcpy(&v, &p.b, sizeof(v));
```

`memcpy`는 컴파일러가 unaligned-safe로 처리합니다. packed struct를 다룰 때 표준 패턴입니다.

### 전송 프로토콜용 packed

```c
/* 외부 device와의 wire format — packed 필수 */
struct __attribute__((packed)) sensor_packet {
    uint8_t  sof;
    uint16_t length;     /* little-endian */
    uint32_t timestamp;
    int16_t  data[8];
    uint16_t crc;
};

_Static_assert(sizeof(struct sensor_packet) == 25, "wire format");
```

이 경우 packed가 *목적*입니다. 단, 접근 시 memcpy로 풀어 처리합니다.

### Explicit alignment

```c
#include <stdalign.h>

alignas(8) static uint8_t dma_buf[1024];    /* 8-byte 정렬 */

struct alignas(64) hot {
    int a;
};
```

DMA buffer나 cache line aligned struct는 `alignas`로 명시합니다. compiler가 시작 위치를 보장합니다.

### Compiler 특정 attribute

```c
/* GCC, Clang */
__attribute__((aligned(8)))  uint8_t b1[1024];
__attribute__((aligned(64))) struct x { int a; } y;

/* MSVC */
__declspec(align(8)) uint8_t b1[1024];

/* C11 표준 */
_Alignas(8) uint8_t b1[1024];
alignas(8) uint8_t b1[1024];     /* stdalign.h */
```

C11 이후로는 `alignas`가 표준입니다. 가능하면 표준 keyword를 씁니다.

### Stack alignment 보장

```c
void func(void) {
    alignas(16) char buf[64];    /* stack에 16-byte align */
}
```

함수의 stack frame은 보통 8-byte 또는 16-byte 정렬됩니다. local 변수에 큰 alignment를 요구할 때만 `alignas`를 씁니다.

## 측정 / 성능 비교

```text
Cortex-M4 72 MHz
aligned 32-bit read          1 cycle
unaligned 32-bit read        2 cycle
aligned + memcpy 32-bit      2~3 cycle (memcpy 펼침)
packed 접근 → memcpy 우회    2~3 cycle (안전)

Cortex-A72
aligned NEON load (vld1q)    1 cycle
unaligned NEON load          2 cycle (cross-line)
```

정렬을 깨면 *최소* 2배 cycle이 듭니다. cross-cache-line이면 더 늘어납니다.

```text
struct 재배열 효과 (RAM 절약)
field 순서: char int char int char    32 byte
field 순서: int int char char char    16 byte (50% 절약)
```

같은 정보를 두 배의 RAM으로 표현하는 셈입니다.

## 자주 보는 함정

> Packed 남용

```c
struct __attribute__((packed)) cfg {
    char a;
    int  b;
};   /* in-memory struct에 packed — Cortex-M0에서 fault */
```

Packed는 in-memory struct에는 쓰지 않습니다. wire format에만 씁니다.

> Cast로 buffer를 struct로

```c
struct frame *p = (struct frame *)buf;   /* buf가 align 0이면 fault */
int v = p->len;
```

buffer pointer를 struct pointer로 cast하면 align이 보장되지 않습니다. `memcpy(&s, buf, sizeof(s))`가 안전합니다.

> Bit-field 사용

```c
struct {
    unsigned a : 3;
    unsigned b : 5;
    unsigned c : 8;
} bf;
```

Bit-field는 layout이 compiler/architecture에 따라 다릅니다. wire format으로 절대 쓰지 않습니다.

> sizeof를 가정

```c
char buf[12];
struct s msg;
memcpy(buf, &msg, sizeof(buf));    /* sizeof(s)와 다를 수 있음 */
```

항상 `sizeof(struct s)`를 명시적으로 씁니다. `_Static_assert`로 wire size를 고정합니다.

> Stack에 큰 alignment

```c
void f(void) {
    alignas(64) char buf[64];    /* stack은 16/32 byte만 보장 */
}
```

stack pointer가 64-byte 정렬되지 않으면 `alignas`가 무시될 수 있습니다. `static` 또는 heap으로 옮기는 편이 안전합니다.

## 정리

- C는 모든 type에 natural alignment를 요구합니다. struct에 padding이 자동으로 들어갑니다.
- ARMv6/M0은 unaligned access에서 fault, ARMv7+는 2배 cycle을 소모합니다.
- Field를 큰 type → 작은 type 순으로 두면 padding이 줄어듭니다.
- `_Static_assert`로 layout을 컴파일 시 검증합니다.
- `packed`는 wire format에만 쓰고, 접근은 `memcpy`로 안전화합니다.
- Explicit alignment는 `alignas`(C11 표준)를 씁니다.
- Bit-field와 layout 가정은 portability를 깹니다. wire format에 안전하지 않습니다.

다음 편은 **Cache Line Alignment**입니다. False sharing 회피와 SoA 변환을 다룹니다.

## 관련 항목

- [8-01: 동적 메모리](/blog/embedded/modern-recipes/part8-01-dynamic-memory)
- [8-03: Cache Line Alignment](/blog/embedded/modern-recipes/part8-03-cache-line-alignment)
- [9-09: False sharing 해결](/blog/embedded/modern-recipes/part9-09-false-sharing)
- [PE 2-05: Cache Basics](/blog/embedded/performance-engineering/part2-05-cache-basics)
