---
title: "임베디드 메모리 레이아웃 — .text·.rodata·.data·.bss·.heap·.stack"
slug: "embedded/modern-recipes/part3-08-memory-layout"
date: 2026-04-12T09:30:00
description: "Stack/heap/static — 누가 어디 사는가."
series: "Modern Embedded Recipes"
seriesOrder: 30
tags: [recipes, toolchain, memory]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"펌웨어가 실행되는 동안 RAM에는 stack, heap, static이 공존합니다."** 이 셋의 위치와 경계를 알면 메모리 부족과 corruption을 미리 막을 수 있습니다.

## 어떤 상황에서 쓰나

- Stack overflow를 막기 위한 영역 설계
- `malloc` 실패 디버깅
- RTOS task별 stack 크기 결정
- 전역 데이터의 위치 확인

이 글의 linker script와 코드는 Debian 13 arm64 guest의 `gcc-arm-none-eabi` 14.2.rel1로 빌드해 QEMU 11.1.3 `netduinoplus2`(STM32F405 모델, RAM 0x20000000)에서 실행했습니다. 실행 결과는 각 절에 붙였습니다.

## 핵심 개념

### 1) 흔한 RAM 레이아웃 예

| 주소 (낮음 → 높음) | 영역 | 설명 |
| --- | --- | --- |
| 0x20000000 | `.data` | 초기화된 전역 (Flash → RAM 복사) |
| ↓ | `.bss` | 0으로 초기화된 전역 |
| ↓ | heap | malloc/free (위로 자람) |
| (빈 공간) | — | heap·stack 사이 여유 |
| ↑ | stack | 함수 call frame / local 변수 (아래로 자람) |
| 0x20020000 | `_estack` | initial MSP (RAM 끝 다음 주소) |

128 KB RAM이라면 마지막 byte는 0x2001FFFF이고 `_estack = ORIGIN(RAM) + LENGTH(RAM)`은 그 다음 주소 0x20020000입니다. Cortex-M의 stack은 full descending이라(push 때 SP를 먼저 줄이고 씀, Cortex-M4 Generic User Guide 2.1.2) 첫 push가 0x2001FFFC에 들어가므로, RAM 끝 다음 주소를 초기 SP로 쓰는 것이 맞습니다. 이 배치는 linker script마다 다르고, 아래 4)·코드 절의 script는 stack을 RAM 끝이 아니라 `.heap` 바로 위의 고정 크기 영역에 둡니다.

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

많은 linker script가 `.bss` 끝에 `_end` symbol을 정의하고 heap 시작점으로 사용합니다. 이름과 위치는 linker script의 계약이므로 실제 map 파일에서 확인해야 합니다.

```c
extern uint32_t _end;
extern uint32_t _estack;        // stack top
static uint8_t *heap_ptr = (uint8_t *)&_end;

void *malloc_simple(size_t size) {
    uint8_t *ret = heap_ptr;
    // Production code should also enforce allocator alignment and overflow checks.
    heap_ptr += size;
    if (heap_ptr > (uint8_t *)&_estack - 1024) {   // stack 여유 1KB
        return NULL;   // OOM
    }
    return ret;
}
```

### 4) Stack 크기 결정

bare-metal에서는 linker script에서 stack 크기를 정합니다. 이 글에서 실제로 링크한 형태는 아래 "코드 / 실제 사용 예"의 `.stack (NOLOAD)` 영역이고(`_Min_Stack_Size = 0x1000`, 4 KB), [3-04](/blog/embedded/modern-recipes/part3-04-linker-script-basics)의 ST식 script는 heap과 stack을 `._user_heap_stack` 하나로 예약합니다. 이 영역은 link 때 RAM이 모자라지 않는지 확인하는 예약입니다. 실행 중 stack이 그 안에 머무는지는 따로 확인해야 하고(아래 5절, MPU guard), 넘쳐도 hardware는 알려 주지 않습니다(아래 함정 절의 실행 결과).

RTOS의 경우 task마다 별도 stack이 있습니다. FreeRTOS를 예로 들면 `xTaskCreate()`는 task stack을 RTOS heap에서, `xTaskCreateStatic()`은 호출자가 넘긴 static buffer를 씁니다.

### 5) Stack 사용량 측정

stack을 알려진 값으로 칠해 두고, 나중에 칠이 남아 있는 지점까지 세면 가장 깊게 쓴 지점(high water mark)이 나옵니다. 이전 판은 칠하는 경계로 `__get_PSP()`를 썼는데, `main`은 reset 직후 MSP로 도므로 PSP가 아니라 현재 SP를 기준으로 해야 합니다.

```c
extern uint32_t _sstack, _estack;

static inline uint32_t get_sp(void) { uint32_t sp; __asm volatile("mov %0, sp" : "=r"(sp)); return sp; }

/* paint from the stack bottom up to just below the current SP (main runs on MSP) */
__attribute__((noinline)) void stack_paint(void) {
    for (uint32_t *p = &_sstack; p < (uint32_t *)get_sp() - 16; p++) *p = 0xDEADBEEF;
}
uint32_t stack_high_water(void) {
    uint32_t *p = &_sstack;
    while (*p == 0xDEADBEEF) p++;
    return (uint32_t)(&_estack) - (uint32_t)p;   // 사용된 byte
}
```

호출 깊이를 바꿔 가며 high water를 읽었습니다. `burn(n)`은 64 byte 지역 배열을 가진 재귀 함수이고, `-fstack-usage`가 보고한 frame 크기는 72 byte입니다.

```text
main.c:28:36:burn	72	static
high water after paint     = 0x00000060
high water after burn(10)  = 0x00000338
high water after burn(40)  = 0x00000BA8
```

burn(10)과 burn(40)의 차이 0x870(2160)은 정확히 30 frame × 72 byte입니다. `-Wstack-usage=64`로 컴파일하면 이 함수에 "warning: stack usage is 72 bytes [-Wstack-usage=]"가 나옵니다. `-fstack-usage`와 `-Wstack-usage`는 함수 하나의 frame만 알려 주므로, 호출 경로 전체와 인터럽트·RTOS task stack은 painting 같은 실측으로 봅니다.

### 6) Heap 정책 선택

| 정책 | 장점 | 단점 |
| --- | --- | --- |
| 사용 안 함 (static only) | deterministic | flexibility 부족 |
| 단순 sbrk (1방향) | 단순, 빠름 | free 안 됨 |
| newlib malloc | 표준 | fragmentation |
| FreeRTOS heap_4 | free 때 인접 block을 합쳐 fragmentation을 줄임 | `configTOTAL_HEAP_SIZE` 크기의 `ucHeap` 배열 안에서만 할당 |

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

이 script로 링크하면 `.heap`과 `.stack`이 `.bss` 위에 차례로 놓입니다. `.heap` section 자체는 0x20000004에서 시작하고, 안의 `ALIGN(8)` 때문에 `_sheap`은 0x20000008이 됩니다(크기 0x204 = 정렬 4 + 0x200).

```text
  [ 3] .data             PROGBITS        20000000 020000 000004 00  WA  0   0  4
  [ 4] .bss              NOBITS          20000004 020004 000000 00  WA  0   0  1
  [ 5] .heap             NOBITS          20000004 020004 000204 00  WA  0   0  1
  [ 6] .stack            NOBITS          20000208 020208 001000 00  WA  0   0  1
```

`_Min_Stack_Size`를 128 KB로 바꿔 RAM보다 크게 만들면 `ASSERT`와 MEMORY 검사가 둘 다 link를 멈춥니다.

```text
ld: RAM overflow
ld: region `RAM' overflowed by 520 bytes
```

stack overflow를 fault로 잡으려면 stack 바닥에 MPU no-access region을 둡니다. 실제 레지스터 설정과 QEMU 실행 결과는 [2-07](/blog/embedded/modern-recipes/part2-07-arm-mpu)에 있습니다. ARMv7-M MPU region은 크기의 배수 주소에서 시작해야 하므로, 위 script의 `_sstack`(0x20000208)은 그대로 쓸 수 없고 `.stack`을 guard 크기(예: 32 byte)에 맞춰 정렬해야 합니다.

## 측정 / 비교

| 변수 종류 | 위치 | 크기 추적 도구 |
| --- | --- | --- |
| 전역 (init) | .data | `nm -S \| grep -i ' d '` |
| 전역 (zero) | .bss | `nm -S \| grep -i ' b '` |
| Local | stack | `-Wstack-usage` |
| malloc | heap | runtime 측정 |
| `const` | .rodata | `nm -S \| grep -i ' r '` |

위 표의 `nm -S`는 symbol마다 크기를 함께 보여 줍니다. `static` 변수는 소문자(`d`, `b`)로 나오므로 `grep -i`로 찾습니다. 이 글의 이미지에서는 다음과 같았습니다.

```text
20000000 00000004 d heap_ptr
08000000 00000040 R vectors
```

## 자주 보는 함정

> ⚠️ Stack overflow를 감지 못 함

위 4 KB stack에서 `burn(62)`(62 × 72 = 4,464 byte)를 부르면 SP가 `.stack` 아래 heap 영역 안까지 내려갑니다. 미리 0x11111111로 채운 heap buffer를 호출 전후로 비교했습니다.

```text
heap buf[63] before deep call = 0x11111111
heap buf words changed by burn(62) = 0x00000005
lowest SP reached ~ _estack - 62*72 = 0x20000088
```

마지막 줄은 SP를 직접 잰 값이 아니라 `_estack − 16 − 62×72`로 계산한 추정치이고(16은 계산식에 넣은 여유값), SP가 heap 영역(0x20000008~0x20000208) 안까지 내려갔다는 뜻입니다.

heap의 5 word가 바뀌었지만 fault는 없었고 프로그램은 정상 종료했습니다. MPU를 쓰지 않는 Cortex-M은 이런 침범을 알려 주지 않으므로, [2-07](/blog/embedded/modern-recipes/part2-07-arm-mpu)의 MPU stack guard나 위의 painting으로 감지합니다.

> ⚠️ Recursive 함수의 stack 폭증

재귀 깊이가 깊으면 stack을 빠르게 소진합니다. 임베디드는 가능한 한 iteration으로 변환.

> ⚠️ 큰 local array

`void f(void) { char buf[8192]; ... }` 같은 큰 local은 stack을 한 번에 차지. static 또는 heap으로 이동.

> ⚠️ Heap fragmentation

malloc/free를 반복하면 작은 hole이 많이 생겨 큰 할당이 실패. 임베디드는 가능한 lifetime이 짧은 객체만 heap에 두거나, pool allocator 사용.

> ⚠️ `_end` 위치 오해

`_end`는 `.bss` 끝이지 RAM의 끝이 아닙니다. 위 실행에서 `_end`는 0x20000004였고 `.heap`의 시작 `_sheap`은 `ALIGN(8)` 때문에 0x20000008이었습니다. 3)절의 `malloc_simple`처럼 `_end`에서 바로 할당하면 첫 블록이 0x20000004로, 8 byte 정렬이 아닙니다. heap 시작은 정렬된 `_sheap`을 쓰거나 할당기가 정렬을 맞춥니다.

## 정리

- RAM에는 보통 .data, .bss, heap, stack이 배치되지만 실제 순서와 영역은 linker script·RTOS·메모리 보호 설정에 따라 달라집니다.
- heap은 위로, stack은 아래로 자라며, 겹쳐도 fault 없이 데이터가 바뀝니다(위 실행에서 heap 5 word).
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
