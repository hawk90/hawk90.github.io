---
title: "Static Allocation — 정적 storage와 초기화·heap 경계"
slug: "embedded/rtos/practical-internals/part4-04-static-allocation"
date: 2026-05-07T09:36:00
description: "FreeRTOS V11.2.0의 static API와 idle·timer storage 조건을 확인하고, 정적 저장소·객체 초기화·NOLOAD·전체 heap 사용 검증을 구분합니다."
series: "Practical RTOS Internals"
seriesOrder: 36
tags: [static, deterministic, misra, do-178c, linker]
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

정적 storage를 사용하면 RTOS 객체의 저장소 크기와 수명을 명시할 수 있습니다. **storage 확보와 객체 초기화 시점, 전체 프로그램의 heap 사용 여부는 다릅니다.** 정적 할당만으로 모든 메모리 오류나 인증 요구가 사라지지는 않습니다.

## 어떤 문제를 푸는가

예측 가능한 객체 수와 긴 수명의 task·queue를 미리 정한 storage에 만들면 실행 중 할당 실패·해제·heap 탐색 경로를 줄일 수 있습니다. stack 부족·array bounds·이용자 수명·동기화·초기화 실패 검증은 남습니다. 정적 storage가 있다는 사실만으로 초기화가 compile time에 모두 끝나지는 않습니다.

이 글은 FreeRTOS V11.2.0의 static API와 linker/compiler 자료를 기준으로 설명합니다. 공개 근거 없는 특정 자동차·항공기·누리호 내부 구현이나 표준 조항 인용을 제품 채택의 증거로 사용하지 않습니다.

## FreeRTOS Static API

사용자가 control block과 payload/stack storage를 제공하면 RTOS가 그 memory에서 객체를 초기화합니다. C++ placement new를 호출한다는 뜻은 아닙니다. 다음 함수는 이용자 시작 전에 **한 번만** 호출하며 buffer는 객체보다 오래 살아 있어야 합니다.

```c title="static-ipc.c"
#include <stdbool.h>
#include <stdint.h>
#include "FreeRTOS.h"
#include "queue.h"
#include "semphr.h"
#include "event_groups.h"
static StaticQueue_t queue_control;
static uint8_t queue_bytes[4 * sizeof(uint32_t)];
static StaticSemaphore_t mutex_control;
static StaticEventGroup_t event_control;
QueueHandle_t static_queue;
SemaphoreHandle_t static_mutex;
EventGroupHandle_t static_events;
bool create_static_ipc(void) {
    static_queue = xQueueCreateStatic(4, sizeof(uint32_t),
                                       queue_bytes, &queue_control);
    static_mutex = xSemaphoreCreateMutexStatic(&mutex_control);
    static_events = xEventGroupCreateStatic(&event_control);
    return static_queue != NULL && static_mutex != NULL && static_events != NULL;
}
```

configSUPPORT_STATIC_ALLOCATION=1이 필요합니다. configSUPPORT_DYNAMIC_ALLOCATION=0은 해당 kernel의 dynamic API를 제외하지만 libc·C++·driver의 다른 allocator까지 금지하는 전역 증명은 아닙니다. 실제 link map·undefined symbols·관련 library와 실행 경로를 확인합니다.

## Idle·Timer Task의 Storage

V11.2.0은 config와 port에 따라 application이 idle/timer task storage를 제공하거나 configKERNEL_PROVIDED_STATIC_MEMORY로 kernel 제공 구현을 사용할 수 있습니다. SMP와 MPU port의 경계도 확인해야 합니다. 모든 static 설정에서 두 hook이 반드시 application에 있어야 한다고 일반화하지 않습니다.

application hook을 직접 제공할 때 stack depth 인자는 해당 태그의 **configSTACK_DEPTH_TYPE**을 따릅니다. timer hook은 timer 지원·생성 조건에 따라 필요하며, stack 원소 단위는 StackType_t입니다. 기본 uint32_t를 모든 ABI에 고정하지 않습니다.

## Zephyr 매크로 패턴

Zephyr RTOS는 같은 사상을 *매크로*로 더 깔끔하게 표현합니다.

```c
K_THREAD_DEFINE(sensor_tid, 2048,
                sensor_thread_fn, NULL, NULL, NULL,
                5, 0, 0);

K_SEM_DEFINE(data_sem, 0, 1);

K_MUTEX_DEFINE(bus_mtx);

K_MSGQ_DEFINE(cmd_q, sizeof(cmd_t), 10, 4);

K_TIMER_DEFINE(heartbeat, hb_handler, NULL);
```

각 매크로의 객체 정의·초기화·thread 시작 조건은 Zephyr 버전과 해당 API를 확인합니다. FreeRTOS 함수 호출과 다른 선언 방식이지만 모든 runtime 결정이 사라진다는 뜻은 아닙니다.

## Linker Section으로 메모리 영역 분리

STM32H7이나 i.MX RT처럼 *DTCM, SRAM, 외부 SDRAM*이 함께 있는 SoC에서는 *어떤 객체를 어디에 둘지*를 직접 지정합니다.

```c
__attribute__((section(".dtcm")))  static StaticTask_t  critical_tcb;
__attribute__((section(".dtcm")))  static StackType_t   critical_stack[1024];
__attribute__((section(".sdram"))) static uint8_t       frame_buffer[1024 * 1024];
__attribute__((section(".sram")))  static StaticQueue_t cmd_q_buf;
```

타깃의 접근 지연·DMA 가시성·cache·전원 retention 조건을 보고 control stack과 큰 frame buffer의 영역을 선택합니다. DTCM이라는 이름만으로 모든 access가 0-wait라고 보장하지 않습니다. linker script가 이 section을 메모리 영역에 매핑합니다.

```text
/* device.ld */
SECTIONS
{
    .dtcm  (NOLOAD) : { *(.dtcm)  } > DTCM
    .sram  (NOLOAD) : { *(.sram)  } > SRAM
    .sdram (NOLOAD) : { *(.sdram) } > SDRAM
}
```

**NOLOAD 자체가 startup zero-fill 코드를 만들지는 않습니다.** 초기화·copy/zero table과 외부 SDRAM 준비 시점은 해당 startup·linker script가 처리해야 합니다. 메모리 배치가 *컴파일·링크 시점에 완전히 결정*됩니다.

## 메모리 Footprint 분석

size·nm·map은 link된 section과 symbol의 크기·배치를 확인하는 자료입니다. stack headroom·동적 library/driver memory·reserved 영역·DMA buffer·실행 중 library 할당까지 자동으로 망라하지는 않습니다. 같은 link script와 build 옵션의 실제 ELF를 조사합니다.

```bash
arm-none-eabi-size firmware.elf
arm-none-eabi-nm --size-sort firmware.elf
```

여기서는 특정 firmware.elf의 출력이나 전체 RAM 회계 완료를 주장하지 않습니다. custom NOLOAD section이 도구의 어떤 항목에 집계되는지도 확인합니다.

## Stack Size 계산 — -fstack-usage

compiler의 함수별 stack 사용 보고는 call graph·재귀/간접 호출·library·exception/FP frame·task와 ISR의 stack 구분을 결합해야 worst path 분석에 사용할 수 있습니다. .su 한 파일이 전체 응답 경로의 stack 상한을 증명하지 않습니다.

```bash
gcc -fstack-usage -c source.c
cat source.su
```

정적 경로 분석과 watermark는 서로 보완합니다. 관찰값이 작다는 이유로 분석이 틀렸거나 아직 실행하지 않은 경로가 반드시 overflow한다고 결론내리지 않습니다. watermark도 untouched fill pattern의 관찰 지표이며 모든 예약 stack byte가 실제 쓰였다고 가정할 수 없습니다.

```c
UBaseType_t high_water = uxTaskGetStackHighWaterMark(task);
/* FreeRTOS V11.2.0: units are StackType_t entries, not universally bytes. */
```

단위·port frame·FP·IRQ nesting과 제품의 안전 여유를 근거로 정합니다. 모든 target에 고정 25% margin이나 2048 byte를 적용하지 않습니다.

## C++ 객체의 static 할당

C++ 전역 객체는 *컴파일 타임에 storage가 잡히고*, *부팅 시 constructor*가 호출됩니다. embedded toolchain은 `_init_array`에 constructor 포인터를 모아 두고 `Reset_Handler`가 순차 호출합니다.

```cpp
class SensorController {
public:
    void run();
private:
    int state_;
    Filter filter_;
};

/* 전역 — BSS + constructor */
static SensorController controller;

static StaticTask_t  task_tcb;
static StackType_t   task_stack[2048];

extern "C" void task_entry(void *p) {
    static_cast<SensorController*>(p)->run();
}

int main() {
    xTaskCreateStatic(task_entry, "ctrl", 2048,
                      &controller, 5, task_stack, &task_tcb);
    vTaskStartScheduler();
}
```

정적 storage를 갖는 객체도 constructor·멤버·library 내부에서 동적 할당할 수 있습니다. application에 명시적 new가 없다는 사실만으로 heap 사용이 0이라고 증명할 수는 없습니다.

## 안전 정책과 제품 증거

표준 적합성은 적용 판·요구·분석·검증과 project policy에 따라 판단합니다. static allocation은 동적 storage 관리의 일부 위험을 줄이는 설계 선택이며 DO-178C·ISO 26262·CERT 요구를 자동으로 충족하는 인증서가 아닙니다. 원문을 확인하지 않은 표준 문장을 따옴표로 인용하지 않습니다.

특정 ECU나 비행체의 구현 대신 실제 제품의 ELF·link map·startup 초기화·allocator 호출 경로와 객체 수명 표를 증거로 남깁니다. RTOS static-only 빌드와 전체 application의 allocator 배제도 별도로 확인해야 합니다.

## 정적 할당의 한계

만능은 아닙니다. *peak 메모리가 항상 점유*된다는 단점이 있습니다. 한 task가 가끔만 큰 buffer를 쓰더라도 *항상 그 크기를 잡고* 있어야 합니다. 평균 사용량과 peak 사용량의 비율이 *수십 배 차이*나는 시스템에서는 static이 비효율적입니다.

이 경계가 모호한 경우 *static 기반 + 작은 memory pool*로 절충합니다. RTOS 객체와 task stack은 static으로 두고, 동적 buffer는 [4-05의 fixed-size pool](/blog/embedded/rtos/practical-internals/part4-05-memory-pool)로 처리합니다. pool도 본질적으로는 *컴파일 타임에 잡힌 storage* 위에서 도므로 정적 분석이 가능합니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Stack size를 감으로 정함

`xTaskCreateStatic(..., 512, ...)` 같이 적당한 숫자를 던지면 *언젠가 overflow*합니다. `-fstack-usage` + watermark 측정을 *모든 task에* 적용합니다. 4-06편에서 더 자세히 다룹니다.

> ⚠️ static과 dynamic API 혼용

한 시스템에 `xTaskCreate`와 `xTaskCreateStatic`이 섞이면 *heap 사용 0*이라는 보장이 깨집니다. `configSUPPORT_DYNAMIC_ALLOCATION = 0`은 해당 kernel의 동적 API를 조건부 컴파일에서 제외합니다. 별도 libc·port·library 할당은 map과 호출 경로로 확인합니다.

> ⚠️ const 데이터를 RAM에

```c
const uint8_t lookup_table[1024 * 1024] = { ... };
```

const의 C/C++ 의미는 수정 제한이며 physical Flash 배치를 보장하지 않습니다. 초기값·ABI·linker·startup과 실제 map을 확인합니다. 큰 zero-initialized const나 custom section을 무조건 Flash로 보내는 처방은 target 요구와 충돌할 수 있습니다.

> ⚠️ 전역 객체 초기화 순서 가정

C++ 전역 객체의 *생성 순서*는 translation unit 사이에서 임의의 의존 순서가 보장되지는 않습니다. task가 시작되기 전에 의존 객체가 준비되어 있는지 보장이 필요합니다. 의심스러우면 `main()` 안에서 explicit init 함수를 호출합니다.

## 정리

- 정적 storage와 객체 초기화 시점·전체 heap 사용 여부를 구분합니다.
- FreeRTOS는 *거의 모든 객체*에 `*Static` API를 제공하며, `configSUPPORT_DYNAMIC_ALLOCATION = 0`으로 kernel의 동적 API를 제외할 수 있습니다.
- Zephyr는 `K_THREAD_DEFINE` 같은 매크로로 같은 결과를 *더 간결하게* 표현합니다.
- linker section과 `__attribute__((section()))`로 *DTCM·SRAM·SDRAM을 명시 배치*할 수 있습니다.
- stack 크기는 `-fstack-usage` 정적 분석과 `uxTaskGetStackHighWaterMark` 실측으로 *둘 다 검증*합니다.
- 표준 적합성과 zero-heap 주장은 별도 제품 증거가 필요합니다.
- 평균 대비 peak가 큰 워크로드는 *static + 작은 pool* 절충이 합리적입니다.

다음 편은 [4-05 Memory Pool](/blog/embedded/rtos/practical-internals/part4-05-memory-pool)에서 *fixed-size block allocator*를 다룹니다.

## 근거 자료

- [FreeRTOS V11.2.0 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c), [FreeRTOS.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/FreeRTOS.h): static API와 kernel-provided storage 조건.
- [GNU ld output section type](https://sourceware.org/binutils/docs/ld/Output-Section-Type.html): NOLOAD.
- [GCC developer options](https://gcc.gnu.org/onlinedocs/gcc/Developer-Options.html): stack-usage 보고.

## 관련 항목

- [4-01: 실시간 메모리 요구사항](/blog/embedded/rtos/practical-internals/part4-01-realtime-memory)
- [4-02: FreeRTOS Heap_1~5](/blog/embedded/rtos/practical-internals/part4-02-freertos-heap)
- [4-03: TLSF — O(1) bounded allocator](/blog/embedded/rtos/practical-internals/part4-03-tlsf)
- [4-05: Memory Pool](/blog/embedded/rtos/practical-internals/part4-05-memory-pool)
- [4-06: Stack Overflow 탐지](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)
