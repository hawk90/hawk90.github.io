---
title: "임베디드 메모리 레이아웃 — .text·.rodata·.data·.bss·.heap·.stack"
date: 2026-04-12T09:30:00
description: "Stack/heap/static — 누가 어디 사는가."
series: "Modern Embedded Recipes"
seriesOrder: 30
tags: [recipes, toolchain, memory]
draft: false
---

## 한 줄 요약

> **"펌웨어가 실행되는 동안 RAM에는 stack, heap, static이 공존합니다."** 이 셋의 위치와 경계를 알면 메모리 부족과 corruption을 미리 막을 수 있습니다.

## 어떤 상황에서 쓰나

- Stack overflow를 막기 위한 영역 설계
- `malloc` 실패 디버깅
- RTOS task별 stack 크기 결정
- 전역 데이터의 위치 확인

## 핵심 개념

### 1) 전형적인 RAM 레이아웃

| 주소 (낮음 → 높음) | 영역 | 설명 |
| --- | --- | --- |
| 0x20000000 | `.data` | 초기화된 전역 (Flash → RAM 복사) |
| ↓ | `.bss` | 0으로 초기화된 전역 |
| ↓ | heap | malloc/free (위로 자람) |
| (빈 공간) | — | heap·stack 사이 여유 |
| ↑ | stack | 함수 call frame / local 변수 (아래로 자람) |
| 0x2001FFFF | `_estack` | initial MSP |

heap은 위로, stack은 아래로 자랍니다. 가운데 빈 공간이 둘의 안전 여유입니다.

### 2) Section별 위치

| Section | 메모리 | 누가 사용 |
| --- | --- | --- |
| `.text` | Flash | 함수 코드 |
| `.rodata` | Flash | 상수, string literal |
| `.data` | RAM (Flash에 init) | 초기화된 전역/static |
| `.bss` | RAM | 0 전역/static |
| heap | RAM | malloc |
| stack | RAM | call frame, local |

### 3) `_end`와 heap의 시작

linker가 `.bss` 끝에 `_end` symbol을 정의합니다. heap은 `_end`부터 시작합니다.

```c
extern uint32_t _end;
extern uint32_t _estack;        // stack top
static uint8_t *heap_ptr = (uint8_t *)&_end;

void *malloc_simple(size_t size) {
    uint8_t *ret = heap_ptr;
    heap_ptr += size;
    if (heap_ptr > (uint8_t *)&_estack - 1024) {   // stack 여유 1KB
        return NULL;   // OOM
    }
    return ret;
}
```

### 4) Stack 크기 결정

bare-metal에서는 linker script에서 minimum stack을 지정합니다.

```text
_Min_Stack_Size = 0x1000;       /* 4 KB */

._user_stack :
{
    . = ALIGN(8);
    . = . + _Min_Stack_Size;
    . = ALIGN(8);
} > RAM
```

이 영역을 미리 잡아 두면 `_estack`까지 stack용으로 확실히 확보됩니다.

RTOS의 경우 task마다 별도 stack이 있습니다. main thread의 stack은 `_estack`, task stack은 RTOS가 heap이나 static buffer에서 잡습니다.

### 5) Stack 사용량 측정

```c
// Stack을 0xDEADBEEF로 채우고 사용 후 확인
extern uint32_t _sstack, _estack;

void stack_paint(void) {
    for (uint32_t *p = &_sstack; p < (uint32_t *)__get_PSP() - 4; p++) {
        *p = 0xDEADBEEF;
    }
}

uint32_t stack_high_water(void) {
    uint32_t *p = &_sstack;
    while (*p == 0xDEADBEEF) p++;
    return (uint32_t)(&_estack) - (uint32_t)p;   // 사용된 byte
}
```

ARM compiler의 `-Wstack-usage=N` 옵션도 정적 분석을 도와줍니다.

### 6) Heap 정책 선택

| 정책 | 장점 | 단점 |
| --- | --- | --- |
| 사용 안 함 (static only) | deterministic | flexibility 부족 |
| 단순 sbrk (1방향) | 단순, 빠름 | free 안 됨 |
| newlib malloc | 표준 | fragmentation |
| FreeRTOS heap_4 | 임베디드 최적화 | 별도 영역 |
| TLSF | 빠른 best-fit | 구현 복잡 |

작은 시스템에서는 heap을 안 쓰는 것도 흔합니다. 모든 buffer를 static으로.

## 코드 / 실제 사용 예

linker script에 stack과 heap을 명시:

```text
_Min_Heap_Size  = 0x200;        /* 512 B */
_Min_Stack_Size = 0x1000;       /* 4 KB */

SECTIONS
{
    /* ... .text, .data, .bss 생략 ... */

    .heap (NOLOAD) :
    {
        . = ALIGN(8);
        _sheap = .;
        . = . + _Min_Heap_Size;
        _eheap = .;
        . = ALIGN(8);
    } > RAM

    .stack (NOLOAD) :
    {
        . = ALIGN(8);
        _sstack = .;
        . = . + _Min_Stack_Size;
        _estack = .;
        . = ALIGN(8);
    } > RAM

    /* 만약 . > ORIGIN + LENGTH이면 link error */
    ASSERT(_estack <= ORIGIN(RAM) + LENGTH(RAM), "RAM overflow")
}
```

이렇게 하면 빌드 시점에 RAM 부족 여부를 알 수 있습니다.

stack overflow 감지 with MPU(앞 part2-07 참조):

```c
// Stack의 하단 32 byte를 No Access region으로
mpu_set_region(0, (uint32_t)&_sstack, 32, MPU_AP_NONE);
```

## 측정 / 비교

| 변수 종류 | 위치 | 크기 추적 도구 |
| --- | --- | --- |
| 전역 (init) | .data | `nm -S \| grep D` |
| 전역 (zero) | .bss | `nm -S \| grep B` |
| Local | stack | `-Wstack-usage` |
| malloc | heap | runtime 측정 |
| `const` | .rodata | `nm -S \| grep R` |

| 일반 펌웨어의 메모리 비율 |
| --- |
| Flash: 70% text, 20% rodata, 10% data init |
| RAM: 40% data+bss, 30% stack, 30% heap (또는 0% heap) |

## 자주 보는 함정

> ⚠️ Stack overflow를 감지 못 함

stack이 heap이나 .bss를 침범해도 hardware는 안 잡습니다. MPU stack guard 또는 painting 기법으로 감지.

> ⚠️ Recursive 함수의 stack 폭증

재귀 깊이가 깊으면 stack을 빠르게 소진합니다. 임베디드는 가능한 한 iteration으로 변환.

> ⚠️ 큰 local array

`void f(void) { char buf[8192]; ... }` 같은 큰 local은 stack을 한 번에 차지. static 또는 heap으로 이동.

> ⚠️ Heap fragmentation

malloc/free를 반복하면 작은 hole이 많이 생겨 큰 할당이 실패. 임베디드는 가능한 lifetime이 짧은 객체만 heap에 두거나, pool allocator 사용.

> ⚠️ `_end` 위치 오해

`_end`는 `.bss` 끝이지 RAM의 끝이 아닙니다. heap이 시작하는 점일 뿐. RAM 끝은 `ORIGIN(RAM) + LENGTH(RAM)` 또는 `_estack`.

## 정리

- RAM에는 .data, .bss, heap, stack이 차례로 배치됩니다.
- heap은 위로, stack은 아래로 자라며, 충돌 시 corruption이 발생합니다.
- linker script에 `_Min_Heap_Size`, `_Min_Stack_Size`를 명시해 영역을 확보합니다.
- Stack 사용량은 painting 기법 또는 `-Wstack-usage`로 측정.
- 작은 임베디드는 heap을 안 쓰고 static buffer만 쓰기도 합니다.
- ASSERT로 빌드 시점에 RAM overflow를 잡을 수 있습니다.

다음 편에서는 **컴파일러 최적화**를 다룹니다. `-O0` ~ `-O3`, `-Os`, `-Og`, LTO의 차이입니다.

## 관련 항목

- [3-04: 링커 스크립트 기초](/blog/embedded/modern-recipes/part3-04-linker-script-basics)
- [3-07: C 런타임 (crt0)](/blog/embedded/modern-recipes/part3-07-c-runtime)
- [3-09: 컴파일러 최적화](/blog/embedded/modern-recipes/part3-09-compiler-optimization)
- 더 깊이 — [Practical RTOS Internals: Task stack 설계](/blog/embedded/rtos/practical-internals/00-preface)
