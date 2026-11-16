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

정적 storage를 사용하면 RTOS 객체의 저장소 크기와 수명을 link 때 정할 수 있습니다. **storage 확보와 객체 초기화 시점, 전체 프로그램의 heap 사용 여부는 서로 다른 문제입니다.** 이 글은 FreeRTOS V11.2.0(commit `0adc196d`)을 heap 파일 없이 빌드해 QEMU 11.1.3 `mps2-an385`에서 돌리고(`arm-none-eabi-gcc` 16.2.0), 같은 툴체인으로 size·nm·`-fstack-usage`·C++ constructor를 직접 확인합니다.

## 어떤 문제를 푸는가

극장 좌석을 공연 전에 모두 지정석으로 팔아 두는 것과 같습니다. 당일 현장 판매(heap)가 없으니 "자리가 없어 입장 실패"는 공연 중에 일어나지 않고, 대신 좌석 수는 표를 찍을 때 정해집니다. task·queue처럼 개수가 정해져 있고 끝까지 사는 객체를 미리 정한 storage에 만들면, 실행 중 할당 실패와 heap 탐색 경로가 사라집니다. 그래도 stack 부족, 배열 범위, 초기화 순서 문제는 남습니다.

## FreeRTOS Static API

사용자가 control block(`StaticQueue_t` 등)과 payload/stack storage를 제공하면 RTOS가 그 memory에서 객체를 초기화합니다. 다음 함수는 객체를 쓰기 전에 **한 번만** 호출하며 buffer는 객체보다 오래 살아 있어야 합니다.

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

이 함수를 `configSUPPORT_STATIC_ALLOCATION=1`, `configSUPPORT_DYNAMIC_ALLOCATION=0`, `configKERNEL_PROVIDED_STATIC_MEMORY=1`로 빌드하고, `heap_N.c`는 아예 링크하지 않았습니다. link가 성공했고 그대로 돌았습니다.

```text
create_static_ipc() -> 1
static task ran: queue round-trip 7, mutex take=1, eventbits=0x1
stack high water mark: 139 words
```

ELF에 heap 관련 심볼이 남았는지 `nm`으로 세면 0입니다.

```text
$ arm-none-eabi-nm build/staticonly.elf | grep -c -i "pvPortMalloc\|vPortFree\|ucHeap"
0
```

이 0은 커널과 이 테스트 코드가 heap을 부르지 않는다는 증거입니다. 다만 다른 library(libc의 `printf()` 계열 등)가 자기 `malloc()`을 쓰는지는 따로 `nm`으로 봐야 합니다. 이 harness는 libc를 링크하지 않아 그 확인이 필요 없었습니다.

## Idle·Timer Task의 Storage

static allocation을 켜면 idle task와 timer task의 storage도 어딘가에서 와야 합니다. V11.2.0에는 두 길이 있습니다.

- **application이 제공.** `vApplicationGetIdleTaskMemory()`와(timer를 쓰면) `vApplicationGetTimerTaskMemory()`를 직접 정의합니다. 기본값 `configKERNEL_PROVIDED_STATIC_MEMORY 0`(`include/FreeRTOS.h:2824-2825`)일 때입니다.
- **kernel이 제공.** `configKERNEL_PROVIDED_STATIC_MEMORY 1`이면 `tasks.c:8740-8778`과 `:8781-`이 두 함수를 kernel 안에 static 배열로 정의합니다. MPU port에서는 이 설정이 `#error`입니다(`tasks.c:47-48`).

위 빌드는 두 번째 길을 썼고, `nm --size-sort`의 마지막 줄들에 kernel이 만든 1 KiB짜리 stack 두 개가 보입니다.

```text
$ arm-none-eabi-nm --size-sort -S build/staticonly.elf | tail -6
00004924 00000334 T __udivmoddi4
2000013c 00000400 b stack
200006c8 00000400 b uxIdleTaskStack.2
20000b2c 00000400 b uxTimerTaskStack.0
00000296 00000476 T vsnprintf
20400000 dfc05a58 T _estack
```

`_estack`의 크기 칸은 linker 심볼이라 의미가 없습니다. hook을 직접 쓸 때 stack 크기 인자는 `configSTACK_DEPTH_TYPE *` 이고 단위는 byte가 아니라 `StackType_t` 원소 수입니다.

## Zephyr 매크로 패턴

Zephyr는 같은 일을 선언 매크로로 합니다. 아래 매크로는 모두 v3.7.0 `include/zephyr/kernel.h`에 있습니다(`K_THREAD_DEFINE` `:767`, `K_TIMER_DEFINE` `:1542`, `K_MUTEX_DEFINE` `:2960`, `K_SEM_DEFINE` `:3247`, `K_MSGQ_DEFINE` `:4513`). 이 코드는 빌드하지 않았습니다.

```c
K_THREAD_DEFINE(sensor_tid, 2048,
                sensor_thread_fn, NULL, NULL, NULL,
                5, 0, 0);

K_SEM_DEFINE(data_sem, 0, 1);

K_MUTEX_DEFINE(bus_mtx);

K_MSGQ_DEFINE(cmd_q, sizeof(cmd_t), 10, 4);

K_TIMER_DEFINE(heartbeat, hb_handler, NULL);
```

두 커널의 단위가 다릅니다. `K_THREAD_DEFINE`의 doc comment는 `stack_size`를 "Stack size in bytes"로, 마지막 `delay`를 ms 단위 시작 지연(0이면 바로 시작)으로 정의합니다. FreeRTOS `xTaskCreateStatic()`의 stack 크기는 `StackType_t` 원소 수라 Cortex-M에서는 4 byte 단위입니다. 위 예의 2048은 Zephyr에서 2 KiB지만, 같은 숫자를 FreeRTOS에 넘기면 8 KiB가 됩니다.

## Linker Section으로 메모리 영역 분리

TCM, 내부 SRAM, 외부 SDRAM이 함께 있는 MCU에서는 *어떤 객체를 어디에 둘지*를 section 이름으로 지정합니다. 아래 section 이름과 linker script는 예시이고 실행하지 않았습니다.

```c
__attribute__((section(".dtcm")))  static StaticTask_t  critical_tcb;
__attribute__((section(".dtcm")))  static StackType_t   critical_stack[1024];
__attribute__((section(".sdram"))) static uint8_t       frame_buffer[1024 * 1024];
__attribute__((section(".sram")))  static StaticQueue_t cmd_q_buf;
```

어느 영역이 빠른지, DMA가 볼 수 있는지는 그 칩의 reference manual이 정합니다. linker script가 이 section을 메모리 영역에 매핑합니다.

```text
/* device.ld */
SECTIONS
{
    .dtcm  (NOLOAD) : { *(.dtcm)  } > DTCM
    .sram  (NOLOAD) : { *(.sram)  } > SRAM
    .sdram (NOLOAD) : { *(.sdram) } > SDRAM
}
```

GNU ld 매뉴얼의 "Output Section Type"은 NOLOAD를 "not loadable, so that it will not be loaded into memory when the program is run"으로 정의합니다. 즉 이미지에 초기값이 들어가지 않을 뿐이고, **zero-fill도 하지 않습니다.** 이 harness의 `Reset_Handler`는 `_sbss`~`_ebss`만 0으로 채우므로, 위 `.dtcm`·`.sram`·`.sdram`에 놓인 변수는 startup이 따로 지우지 않는 한 부팅 직후 쓰레기 값을 가집니다. 외부 SDRAM은 컨트롤러 초기화가 끝나기 전에 건드리면 안 되므로, 그 영역의 zero-fill도 SDRAM 초기화 뒤에 둡니다.

## 메모리 Footprint 분석

size·nm·map은 link된 section과 symbol의 크기·배치를 보여 줍니다. 앞의 static-only ELF에 돌린 결과입니다.

```bash
arm-none-eabi-size firmware.elf
arm-none-eabi-nm --size-sort firmware.elf
```

```text
$ arm-none-eabi-size build/staticonly.elf
   text	   data	    bss	    dec	    hex	filename
  23136	      4	   4192	  27332	   6ac4	build/staticonly.elf
```

bss 4192 byte 안에 task stack 1 KiB, idle·timer stack 각 1 KiB, control block들이 모두 들어 있습니다. heap을 쓰는 빌드라면 `ucHeap` 배열(`configTOTAL_HEAP_SIZE`)도 bss에 잡히므로, static-only 빌드의 bss는 "실제로 쓸 RAM 전부"에 가깝습니다. 그래도 이 숫자에는 main stack(MSP)과 실행 중 쌓이는 stack 깊이가 없습니다.

## Stack Size 계산 — -fstack-usage

GCC 매뉴얼(Developer Options의 `-fstack-usage`)에 따르면 `.su` 파일은 함수마다 위치, byte 수, qualifier를 적습니다. `static`은 진입 때 고정 크기 frame만 잡는다는 뜻이고, `dynamic`은 함수 안에서 stack을 더 조정한다는 뜻입니다. `dynamic`에 `bounded`가 붙으면 그 수가 상한이고, 없으면 고정 부분만 센 값입니다. 함수 하나의 frame이므로, task의 최대 stack은 call graph를 따라 더해야 합니다.

```bash
gcc -fstack-usage -c source.c
cat source.su
```

3-10의 deadlock 데모와 이 harness의 `libc.c`에 돌린 결과입니다.

```text
$ cat deadlock.su
../demo/deadlock.c:22:13:holdB	8	static
../demo/deadlock.c:16:13:worker	32	static
../demo/deadlock.c:30:13:ctl	376	static
../demo/deadlock.c:51:5:main	16	static
$ grep -E "vsnprintf|printf" libc.su
../libc.c:18:5:vsnprintf	96	static
../libc.c:45:5:snprintf	16	static
../libc.c:46:5:printf	272	static
```

`ctl`이 376 byte인 것은 `-O1`에서 `ctl`에 inline된 `report()`의 `TaskStatus_t ts[8]` 배열 때문이고, `ctl`이 `printf()`를 부르면 272, 그 안의 `vsnprintf()`가 96을 더 씁니다. 이 경로만 해도 744 byte입니다. 여기에 커널 API 호출과 Cortex-M이 exception 진입 때 쌓는 frame이 더해집니다. 실행 중에 잰 watermark와 함께 봅니다. watermark는 task 생성 때 stack을 채워 둔 패턴(`tskSTACK_FILL_BYTE 0xa5`, `tasks.c:120`)이 지워지지 않은 깊이라, 실행해 보지 않은 경로는 반영하지 않습니다.

```c
UBaseType_t high_water = uxTaskGetStackHighWaterMark(task);
/* FreeRTOS V11.2.0: units are StackType_t entries, not universally bytes. */
```

앞의 static-only 실행에서 256 word stack의 high water mark는 139 word였습니다. 즉 117 word(468 byte)까지 썼습니다.

## C++ 객체의 static 할당

C++ 전역 객체는 storage가 link 때 잡히지만, constructor는 부팅 때 누군가 불러야 돕니다. 컴파일러는 constructor를 부르는 함수 포인터를 `.init_array` section에 넣고, 그 배열을 도는 것은 startup 코드의 몫입니다. 이 harness의 `Reset_Handler`는 `.data` 복사와 `.bss` 지우기만 하므로, 아래 작은 C++ 프로그램으로 차이를 확인했습니다.

```cpp
struct Counter { int v; Counter() : v(42) {} };
static Counter g;           /* needs a constructor call at boot */
/* main() 앞부분, RUN_INIT_ARRAY일 때만 */
for (void (**f)(void) = __init_array_start; f < __init_array_end; ++f) (*f)();
```

```text
== -Dnone
g.v = 0 (42 means the constructor ran)
table at 0xc08, rw_table at 0x20000000
== -DRUN_INIT_ARRAY
g.v = 42 (42 means the constructor ran)
table at 0xc28, rw_table at 0x20000000
```

startup이 `.init_array`를 돌지 않으면 `g.v`는 `.bss`의 0으로 남고, 컴파일러도 linker도 경고하지 않습니다. 직접 만든 startup 코드를 쓴다면 이 루프가 있는지부터 확인합니다. 아래 FreeRTOS 예의 `controller`도 같은 조건입니다.

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

정적 storage를 갖는 객체도 constructor·멤버·library 안에서 동적 할당할 수 있습니다. `Filter`가 `std::vector`를 멤버로 가진다면 `operator new`가 링크되므로, 앞에서처럼 `nm`으로 `_Znwj`(32-bit `operator new`) 같은 심볼이 있는지 봅니다. 이 FreeRTOS C++ 예는 실행하지 않았습니다.

## 안전 정책과 제품 증거

DO-178C·ISO 26262 같은 안전 표준이 static allocation을 어떻게 요구하는지는 이 글에서 다루지 않습니다. 원문을 확인하지 않았습니다. 이 글에서 보여 줄 수 있는 증거는 위에서 만든 종류입니다. heap 심볼이 없는 ELF(`nm`), section별 크기(`size`), 함수별 stack(`.su`), 실행 중 watermark, 그리고 startup이 `.init_array`를 도는지의 실행 결과입니다.

## 정적 할당의 한계

만능은 아닙니다. *peak 메모리가 항상 점유*된다는 단점이 있습니다. 한 task가 가끔만 큰 buffer를 쓰더라도 *항상 그 크기를 잡고* 있어야 합니다. 큰 buffer를 서로 다른 시점에 쓰는 task가 여럿이면, 각자 static으로 잡는 대신 하나를 공유하는 편이 RAM을 덜 씁니다.

이 경계가 모호한 경우 *static 기반 + 작은 memory pool*로 절충합니다. RTOS 객체와 task stack은 static으로 두고, 동적 buffer는 [4-05의 fixed-size pool](/blog/embedded/rtos/practical-internals/part4-05-memory-pool)로 처리합니다. pool도 link 때 잡힌 배열 위에서 돌므로 `size`에 그대로 잡힙니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Stack size를 감으로 정함

`xTaskCreateStatic(..., 512, ...)`처럼 근거 없는 숫자를 넣지 말고, 앞의 `.su` 합산과 watermark를 *모든 task에* 적용합니다. 4-06편에서 overflow 검출을 다룹니다.

> ⚠️ static과 dynamic API 혼용

한 시스템에 `xTaskCreate`와 `xTaskCreateStatic`이 섞이면 heap을 쓰게 됩니다. `configSUPPORT_DYNAMIC_ALLOCATION = 0`이면 `xTaskCreate()` 같은 동적 API의 선언이 조건부 컴파일에서 빠지므로(`include/task.h:384`), 누가 부르면 implicit declaration compile 오류로 드러납니다(이 GCC 16.2에서는 오류). 앞의 빌드는 heap 파일 없이 link가 성공했으니 커널 쪽 동적 호출이 없었다는 뜻입니다.

> ⚠️ const 데이터를 RAM에

```c
const uint8_t lookup_table[1024 * 1024] = { ... };
```

`const`는 C/C++에서 수정 금지라는 뜻이고, 어느 메모리에 놓을지는 컴파일러와 linker script가 정합니다. 앞의 C++ 실행에서 `static const unsigned char table[1024]`는 `.rodata`로 가서 flash 주소 `0xc08`에, 같은 초기값의 non-const `rw_table`은 `.data`로 가서 RAM `0x20000000`에 놓였습니다. 이 linker script는 `.rodata`를 FLASH에 두기 때문입니다. map이나 `nm`에서 큰 테이블의 주소를 확인합니다.

> ⚠️ 전역 객체 초기화 순서 가정

translation unit이 다른 전역 객체끼리의 생성 순서는 C++ 표준이 정하지 않습니다. working draft의 [basic.start.dynamic]/3.3은 앞의 순서 조건에 해당하지 않는 두 변수의 초기화를 "indeterminately sequenced"라고 적습니다. 한 전역 객체의 constructor가 다른 파일의 전역 객체를 쓰면, 그 객체가 아직 0일 수 있습니다. task가 시작되기 전에 준비돼야 하는 객체는 `main()` 안에서 명시적인 init 함수로 초기화합니다.

## 정리

- `configSUPPORT_DYNAMIC_ALLOCATION 0` + `configKERNEL_PROVIDED_STATIC_MEMORY 1`이면 heap 파일 없이 link되고, ELF에 heap 심볼이 0개였습니다.
- idle·timer storage는 application hook이나 kernel 제공(MPU port 제외) 중 하나로 옵니다.
- Zephyr `K_THREAD_DEFINE`의 stack은 byte, FreeRTOS는 `StackType_t` 원소 수입니다.
- NOLOAD section은 load도 zero-fill도 되지 않으니 startup이 직접 지웁니다.
- `.su`는 함수 하나의 frame입니다. 이 harness의 `ctl → printf → vsnprintf` 경로만 744 byte였습니다.
- startup이 `.init_array`를 돌지 않으면 C++ 전역 constructor는 실행되지 않고 경고도 없습니다.
- 평균 대비 peak가 큰 워크로드는 *static + 작은 pool*로 절충합니다.

다음 편은 [4-05 Memory Pool](/blog/embedded/rtos/practical-internals/part4-05-memory-pool)에서 *fixed-size block allocator*를 다룹니다.

## 근거 자료

- [FreeRTOS V11.2.0 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c), [FreeRTOS.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/FreeRTOS.h): static API와 kernel-provided storage 조건.
- [GNU ld output section type](https://sourceware.org/binutils/docs/ld/Output-Section-Type.html): NOLOAD.
- [GCC developer options](https://gcc.gnu.org/onlinedocs/gcc/Developer-Options.html): stack-usage 보고.
- [Zephyr v3.7.0 kernel.h](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/include/zephyr/kernel.h): `K_*_DEFINE` 매크로.
- [C++ working draft basic.start.dynamic](https://eel.is/c++draft/basic.start.dynamic): 동적 초기화 순서.

## 관련 항목

- [4-01: 실시간 메모리 요구사항](/blog/embedded/rtos/practical-internals/part4-01-realtime-memory)
- [4-02: FreeRTOS Heap_1~5](/blog/embedded/rtos/practical-internals/part4-02-freertos-heap)
- [4-03: TLSF — O(1) bounded allocator](/blog/embedded/rtos/practical-internals/part4-03-tlsf)
- [4-05: Memory Pool](/blog/embedded/rtos/practical-internals/part4-05-memory-pool)
- [4-06: Stack Overflow 탐지](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)
