---
title: "임베디드 스택 분석 — high-water·overflow 탐지"
slug: "embedded/modern-recipes/part8-09-stack-analysis"
date: 2026-04-17T09:08:00
description: "Stack high-water의 한계, FreeRTOS word 단위, GCC 정적 사용량, 보호 기법의 검출 범위를 설명합니다."
series: "Modern Embedded Recipes"
seriesOrder: 97
tags: [recipes, memory, stack]
topics: ["embedded"]
---

## 한 줄 요약

Stack은 실행 중 함수 호출·지역 변수·예외 상태를 저장하는 메모리입니다. 패턴 기반 high-water는 관측된 최소 여유량이고, 정적 분석·guard·stack protector는 서로 다른 결함을 다른 시점에 잡으므로 하나의 숫자로 안전성을 보장하지 않습니다.

깊은 호출 경로, 가변 길이 배열, 큰 지역 buffer, interrupt nesting은 드문 입력이나 특정 시점에 stack을 더 사용할 수 있습니다. 따라서 task별 설정값을 추측만으로 정하지 말고 compiler report와 실제 workload를 결합합니다. 검사법마다 놓치는 경로와 보드·ABI·RTOS port 조건도 기록합니다.

## 측정값과 보장 범위

패턴을 채우는 방식은 사용되지 않은 stack 영역을 훑어 가장 많이 덮인 경계를 추정합니다. 주행 중 관측한 high-water는 그때까지 실행한 경로에 대한 관측이며, 실행하지 않은 오류·interrupt 조합의 최대 사용량은 아닙니다. stack 내용이 우연히 패턴과 같아지거나 startup·MPU 설정이 잘못되면 결과가 왜곡될 수 있습니다.

벽에 표시한 물 높이 자국은 지금까지 물이 도달한 지점을 남기지만, 아직 열지 않은 수도꼭지의 최대 유량까지 알려주지는 않습니다. High-water도 실행한 경로의 기록이며 모든 미래 경로의 보증은 아닙니다.

기법마다 잡는 사건도 다릅니다. Static compiler report는 일부 함수 frame을 알려주고, FreeRTOS check는 port가 지정한 지점에 stack pointer 또는 경계 패턴을 검사합니다. MPU guard는 접근을 차단해 fault를 만들 수 있으며 compiler stack protector는 함수 반환 시 stack canary 변경을 확인합니다. 이들은 서로 대체재가 아닙니다.

## Bare-metal main stack watermark

일반 C 함수에서 현재 실행 중인 main stack 전체를 패턴으로 다시 채우면 함수 자신의 frame과 return address까지 덮어쓸 수 있습니다. 초기 stack을 채우려면 C runtime에 진입하기 전에 startup assembly가 임시로 stack을 사용하지 않는 구간에서 초기화해야 합니다. 아래 Cortex-M 예제는 linker가 정의한 전용 stack 범위를 채운 뒤 MSP를 설정하고 C 초기화로 분기하는 핵심 순서만 보여줍니다.

```asm title="main-stack-fill.S"
.syntax unified
.cpu cortex-m4
.thumb
.global Reset_Handler
.type Reset_Handler, %function
Reset_Handler:
    cpsid i
    ldr r0, =_stack_limit
    ldr r1, =_stack_top
    ldr r2, =0xA5A5A5A5
1:
    cmp r0, r1
    bhs 2f
    str r2, [r0], #4
    b 1b
2:
    ldr sp, =_stack_top
    b Reset_C
```

이 조각은 vector table, `.data` 복사, `.bss` 초기화, FPU 설정, `SystemInit`을 포함한 완전한 startup이 아닙니다. 실제 startup 순서에 합칠 때 해당 단계가 stack을 쓰는 시점과 interrupt enable 시점을 확인해야 합니다. linker는 `_stack_limit`과 `_stack_top`을 RAM 안의 정렬된 예약 구간으로 정의하고 다른 section과 겹치지 않는지 assertion해야 합니다.

```ld title="main-stack-region.ld"
MEMORY {
  FLASH (rx)  : ORIGIN = 0x08000000, LENGTH = 512K
  RAM   (rwx) : ORIGIN = 0x20000000, LENGTH = 128K
}
_stack_top = ORIGIN(RAM) + LENGTH(RAM);
_stack_limit = _stack_top - 2048;

SECTIONS {
  .text : { *(.isr_vector) *(.text*) *(.rodata*) } > FLASH
  .data : { *(.data*) } > RAM AT > FLASH
  .bss (NOLOAD) : { *(.bss*) *(COMMON) } > RAM
  _ebss = ADDR(.bss) + SIZEOF(.bss);
}
ASSERT((_stack_limit & 3) == 0, "stack alignment")
ASSERT(_ebss <= _stack_limit, "RAM sections overlap main stack")
```

`_stack_limit`과 stack 크기는 이 예제의 linker 입력에서 정의한 값입니다. 양산 linker script에서는 RAM bank, vector table, heap, retained memory, alignment와 실제 startup symbol을 사용해 다시 작성합니다. 2 KiB는 검증된 권장 크기가 아닙니다.

Stack이 아래 주소로 자라는 Cortex-M에서 아래 scanner는 시작 경계부터 연속된 marker word 수를 세어 남은 공간을 bytes로 환산합니다. scanner 자신이 쓰는 stack도 high-water에 포함될 수 있습니다. 범위가 같은 linker-defined array이며 word 정렬됐다는 조건에서만 사용합니다.

```c title="main-stack-high-water.c"
#include <stddef.h>
#include <stdint.h>

extern uint32_t _stack_limit, _stack_top;

size_t main_stack_high_water_bytes(void) {
    uintptr_t p = (uintptr_t)&_stack_limit;
    const uintptr_t top = (uintptr_t)&_stack_top;
    if (top <= p || (top - p) % sizeof(uint32_t) != 0) return 0;
    const size_t words = (size_t)((top - p) / sizeof(uint32_t));
    size_t untouched = 0;
    while (p < top && *(const volatile uint32_t *)p == UINT32_C(0xA5A5A5A5)) {
        p += sizeof(uint32_t);
        ++untouched;
    }
    return (words - untouched) * sizeof(uint32_t);
}
```

이 방식은 최악 경로 증명이 아닙니다. 호출 전에 초기화가 끝나야 하고, DMA·다른 core·다른 stack 영역과 충돌하지 않아야 합니다. interrupt가 MSP를 공유하거나 FPU/exception frame을 쌓는 ABI라면 해당 사용도 workload에서 관측하거나 별도 경계로 분석합니다.

## FreeRTOS task별 high-water와 검사 hook

FreeRTOS의 `uxTaskGetStackHighWaterMark()`와 `uxTaskGetStackHighWaterMark2()`는 지금까지 남은 최소 stack을 `StackType_t` 단위로 반환합니다. 따라서 byte 환산에는 `sizeof(StackType_t)`를 곱해야 하며, 4-byte word를 상수로 가정하지 않습니다. 두 함수는 반환형이 달라 큰 값에서 overflow 특성도 다르므로 사용하는 kernel version과 `FreeRTOSConfig.h`의 `INCLUDE_...` 설정을 봅니다. [FreeRTOS stack 검사 문서](https://www.freertos.org/Documentation/02-Kernel/02-Kernel-features/09-Memory-management/02-Stack-usage-and-stack-overflow-checking)와 [V11.2.0 `task.h`](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/task.h)를 함께 확인합니다.

```c title="freertos-task-watermark.c"
#include "FreeRTOS.h"
#include "task.h"
#include <stddef.h>

size_t current_task_stack_free_bytes(void) {
    const configSTACK_DEPTH_TYPE free_words =
        uxTaskGetStackHighWaterMark2(NULL);
    return (size_t)free_words * sizeof(StackType_t);
}
```

이 예제는 `INCLUDE_uxTaskGetStackHighWaterMark2 == 1`과 해당 타입을 제공하는 kernel configuration을 전제로 합니다. 다른 버전이나 설정에서는 사용 가능한 API와 반환형을 header에서 확인합니다. 측정 시점에 실행되지 않은 코드 경로와 아직 발생하지 않은 interrupt nesting은 high-water가 반영하지 않습니다.

`configCHECK_FOR_STACK_OVERFLOW`의 값 1·2는 FreeRTOS가 검사하는 방법을 선택하지만 실제 확인 지점과 검출 범위는 port 구현에 달려 있습니다. 이 옵션을 켜면 application이 `vApplicationStackOverflowHook`를 제공해야 하는 설정이 있습니다. Hook은 모든 stack write를 매 명령마다 감시하거나 모든 overflow를 즉시 검출하는 장치가 아닙니다.

```c title="freertos-stack-overflow-hook.c"
#include "FreeRTOS.h"
#include "task.h"

void vApplicationStackOverflowHook(TaskHandle_t task, char *task_name) {
    (void)task;
    (void)task_name;
    taskDISABLE_INTERRUPTS();
    for (;;) {
        /* 손상됐을 수 있는 task stack에서 printf/logging을 호출하지 않습니다. */
    }
}
```

이 hook은 의도적으로 fail-stop만 수행합니다. 실제 제품은 port가 hook을 호출하는 문맥, 사용할 수 있는 emergency stack, watchdog/reset 및 crash record 수단을 확인해 구현합니다. stack이 이미 손상된 뒤에는 task 이름을 문자열로 기록하거나 복잡한 logging 함수를 호출하는 것이 안전하다고 가정하지 않습니다.

## Compiler의 함수별 stack report

GCC의 `-fstack-usage`는 함수별 stack usage를 `.su` 파일로 출력합니다. 이 수치는 선택한 compiler 옵션과 target ABI에서의 함수 frame 보고이지 전체 task의 worst-case call chain 값이 아닙니다. `static`, `dynamic`, `bounded` 분류의 의미는 GCC 문서를 확인하고, 동적 할당이 있는 함수와 재귀는 별도 상한을 정해야 합니다. [GCC `-fstack-usage` 문서](https://gcc.gnu.org/onlinedocs/gcc/Developer-Options.html#Developer-Options).

함수별 frame은 서로 안에 들어가는 상자와 같습니다. 호출이 깊어질수록 여러 상자가 겹치므로, 가장 큰 함수 하나의 숫자만으로 전체 경로를 계산할 수 없습니다.

```bash title="gcc-stack-usage"
arm-none-eabi-gcc -O2 -fstack-usage -Wstack-usage=512 -c parser.c
arm-none-eabi-gcc -O2 -fstack-usage -Wstack-usage=512 -c transport.c
cat parser.su transport.su
```

`-Wstack-usage`는 지정한 함수 사용량 threshold를 진단하며 모든 caller 경로의 합을 자동 보증하지 않습니다. 최대 경로를 계산하려면 호출 graph, recursion, indirect call, library/runtime 경로, compiler-generated prologue, exception/interrupt stack을 함께 분석합니다. linker map의 RAM 사용량만으로 runtime stack peak를 알 수도 없습니다.

## Stack protector와 MPU guard

GCC `-fstack-protector-strong`은 보호 대상으로 선택한 함수의 canary를 검사하는 compiler 기능입니다. 손상이 함수 반환 검사까지 드러나지 않을 수 있고, 모든 local write나 인접 메모리 손상을 방지하지는 않습니다. `__stack_chk_fail`은 runtime과 link되어야 하며, handler 안에서 손상 가능성이 있는 stack에 의존하는 logging을 피합니다.

MPU guard는 stack 경계의 별도 region에 접근 금지 권한을 주어 해당 경계를 넘는 접근에서 fault를 발생시키는 방식입니다. region base·크기 정렬, stack 성장 방향, region 우선순위·subregion 지원과 exception 처리 문맥을 실제 MCU MPU 문서에서 확인합니다. guard가 stack이 아닌 다른 RAM을 막거나 사용 가능한 RAM을 과도하게 줄이지 않는지 linker와 함께 검증합니다.

Guard는 stack 끝에 세운 물리적 울타리와 같습니다. 울타리 밖으로 나간 접근은 막을 수 있지만, 울타리에 닿기 전의 과도한 사용량이나 다른 RAM 주소로 잘못 쓰는 문제까지 잡아주지는 않습니다.

```c title="stack-protector-failure.c"
__attribute__((noreturn, no_stack_protector))
void __stack_chk_fail(void) {
    /* 제품별 emergency 경로: 손상된 현재 stack의 printf는 호출하지 않습니다. */
    for (;;) {
    }
}
```

이 handler는 toolchain/runtime과 board emergency 정책에 맞춰 연결해야 하는 최소 형태입니다. Cortex-M의 MemManage fault에서 바로 C logging을 호출할 수도 있다고 가정하지 않습니다. fault가 난 stack 자체를 사용할 수 없다면 assembly entry에서 별도 emergency stack으로 전환하는 설계가 필요합니다.

## 검증 계획

작은 host fixture에서는 marker scanner의 모든 미사용·일부 사용·경계 사용 경우를 확인하고 AddressSanitizer/UndefinedBehaviorSanitizer로 범위 오류를 찾을 수 있습니다. Cross compile에서는 startup assembly·linker ASSERT·`.su` output·stack protector symbol을 검사합니다. 이러한 검사는 실제 reset startup, task scheduler, interrupt nesting이나 MPU fault를 실행한 결과와 구분해 기록합니다.

제품 검증은 task별 정상·오류·재시도 경로, 최대 interrupt nesting, FPU context 저장, logging/error path, 재귀·가변 길이 입력을 포함해야 합니다. High-water 결과에는 실행한 workload와 환경을 남기고, 측정 여유분이나 guard 크기를 정할 때는 안전 요구사항과 분석 방법을 함께 사용합니다.

## 자주 보는 함정

**C 코드에서 현재 stack을 다시 초기화**하면 함수가 사용 중인 return address나 local state를 덮을 수 있습니다. Bare-metal 초기 pattern 작업은 C 진입 전 assembly에서 stack을 사용하지 않는 순서로 두고, RTOS task stack은 kernel의 초기화 및 측정 API를 우선 확인합니다.

**FreeRTOS watermark를 byte라고 단정**하면 stack 크기를 잘못 계산할 수 있습니다. 실제 API는 `StackType_t` word 수를 반환하므로 `sizeof(StackType_t)`와 API 반환 폭을 함께 사용합니다.

**Hook이나 canary를 완전한 overflow 방지로 설명**하면 검출 시점과 miss 범위를 감춥니다. port의 검사 지점, function return 시점, guard fault 경계는 서로 다릅니다.

**high-water를 worst-case proof로 사용**하면 아직 실행하지 않은 경로가 빠집니다. 정적 report, call graph와 실행 관측을 함께 쓰고 각각의 한계를 남깁니다.

## 정리

- Watermark는 관측한 최대 사용량의 단서이지 모든 실행의 상한이 아닙니다.
- 초기 main stack pattern은 C 함수가 실행 stack을 덮지 않도록 startup 단계에서 처리합니다.
- FreeRTOS watermark 단위는 `StackType_t` word이며 API 설정과 반환 폭을 확인합니다.
- GCC `.su`, FreeRTOS hook, stack protector, MPU guard는 서로 다른 범위를 검사합니다.
- worst-case 분석에는 call chain, recursion, ISR·exception·FPU 경로와 제품 workload가 필요합니다.

다음 편에서는 NEON/SIMD 코드의 대상별 compile과 측정 결과를 binary 크기 관점에서 살펴봅니다.

## 관련 항목

- [8-08: ARM NEON 심화](/blog/embedded/modern-recipes/part8-08-neon)
- [8-10: 코드 크기 최적화](/blog/embedded/modern-recipes/part8-10-code-size-optimization)
- [Practical RTOS Internals: Stack Overflow](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)
- [8-01: 동적 메모리](/blog/embedded/modern-recipes/part8-01-dynamic-memory)
