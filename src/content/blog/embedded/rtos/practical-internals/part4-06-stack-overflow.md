---
title: "4-06: Stack Overflow 탐지 — Canary, MPU, Watermark의 3중 방어"
date: 2026-05-07T18:00:00
description: "임베디드 가장 흔한 silent bug가 스택 오버플로우입니다. FreeRTOS canary, MPU region 기반 hardware 보호, high-water mark 측정, 정적 분석 도구까지 다층 방어 전략을 정리합니다."
series: "Practical RTOS Internals"
seriesOrder: 38
tags: [stack-overflow, canary, mpu, watermark]
---

## 한 줄 요약

> **"Stack overflow는 즉시 죽지 않는 silent corruption입니다."** — canary·MPU·watermark *세 층*으로 막아야 안전합니다.

## 어떤 문제를 푸는가

스택 오버플로우는 임베디드에서 *재현이 가장 어려운 버그*입니다. C에서 stack은 *그냥 메모리 영역*이고 hardware는 *경계를 모릅니다*. SP가 region 밖으로 내려가도 CPU는 그냥 *다음 word*에 push할 뿐입니다.

문제가 가시화되는 시점은 *훨씬 나중*입니다. 침범당한 영역이 다른 task의 TCB라면 *다음 context switch*에서 깨지고, heap 영역이라면 *몇 ms 뒤 다른 task의 alloc*이 이상해집니다. 원인과 결과 사이 *수십 ms*가 벌어져 디버거로 잡기가 거의 불가능합니다.

방어는 *한 층으로 부족*합니다. FreeRTOS의 canary, MPU 기반 hardware boundary, 운영 중 watermark monitoring, 그리고 컴파일 단계 정적 분석을 *겹쳐* 적용해야 합니다. 이번 편은 각 방어 층의 원리와 함정을 정리합니다.

## Stack의 방향과 침범 양상

Cortex-M의 stack은 *높은 주소에서 낮은 주소로* 자랍니다. SP가 stack base보다 작아지는 순간 *인접한 메모리 영역*을 덮어쓰기 시작합니다.

![Cortex-M stack은 높은 주소에서 낮은 주소로 자라며, overflow 시 인접 메모리를 침범한다](/images/blog/rtos/diagrams/part4-06-stack-layout.svg)

침범 첫 byte부터 *fault가 나는 것은 아닙니다*. read/write가 *그냥 성공*합니다. CPU는 침범을 모릅니다. 그래서 *소프트웨어 또는 MPU가 명시적으로 검사*해야 합니다.

## Canary 패턴 — FreeRTOS Method 2

가장 보편적인 방어가 *stack 끝에 magic value*를 심어 두고 주기적으로 검사하는 것입니다. FreeRTOS는 `configCHECK_FOR_STACK_OVERFLOW`에 *세 단계*를 제공합니다.

```c
#define configCHECK_FOR_STACK_OVERFLOW 2
```

값이 0이면 검사 없음, 1이면 SP 위치 검사, 2이면 *canary 검사*입니다. Method 2는 task 생성 시 stack을 *0xA5 패턴*으로 채웁니다.

```c
/* task 생성 시 */
memset(stack, 0xA5, stack_size);

/* 매 context switch 시 */
uint32_t *bottom = (uint32_t*)task->pxStack;
if (bottom[0] != 0xA5A5A5A5 || bottom[1] != 0xA5A5A5A5 ||
    bottom[2] != 0xA5A5A5A5 || bottom[3] != 0xA5A5A5A5) {
    vApplicationStackOverflowHook(task, task->pcTaskName);
}
```

stack 끝 16 byte가 깨졌다면 *최소한 그만큼은 침범*했다는 뜻입니다. 16 byte보다 작은 침범은 놓치지만, 그 정도라도 *대부분의 overflow*는 잡힙니다.

Method 1은 더 가볍습니다. context switch 시 *SP가 stack base 이하*인지만 봅니다. 이미 침범이 *발생한 뒤*에 잡힌다는 한계가 있습니다. Method 2는 *경계를 살짝 침범한 순간*까지도 잡습니다. 양산 빌드도 최소 Method 1, 가능하면 Method 2로 둡니다.

## Application Hook

overflow가 검출되면 RTOS가 *application hook*을 호출합니다. 시스템이 *이미 corrupt 상태*이므로 hook 안에서는 *최소한의 작업*만 합니다.

```c
void vApplicationStackOverflowHook(TaskHandle_t xTask, char *pcTaskName) {
    /* 로컬 변수는 호출 측 stack — overflow된 task의 stack */
    /* 가능한 가벼운 작업만 */

    log_critical_isr("stack overflow: %s", pcTaskName);

    /* 양산 — 즉시 reset, watchdog에게 맡기는 것이 가장 안전 */
    NVIC_SystemReset();

    /* debug — halt for inspection */
    __BKPT(0);
    for (;;);
}
```

hook 안에서 *큰 stack을 쓰는 함수* (printf, malloc 등)를 호출하면 *2차 overflow*가 납니다. 메시지는 *최소 길이*로, 가능하면 *ITM trace*로만 떨어뜨립니다. 그리고 watchdog reset이나 `NVIC_SystemReset()`으로 *깨끗한 부팅*을 유도합니다.

## High Water Mark — 운영 중 측정

`uxTaskGetStackHighWaterMark`가 *지금까지 사용하지 않은 stack의 최소량*을 반환합니다. canary가 *깨지지는 않았지만 얼마나 가까이 갔는지*를 측정합니다.

```c
UBaseType_t hw = uxTaskGetStackHighWaterMark(task);
/* hw = 사용하지 않은 word 수의 *최솟값* */
```

운영 중 주기적으로 모든 task의 watermark를 telemetry로 보냅니다.

```c
void monitor_stacks(void) {
    TaskStatus_t status[MAX_TASKS];
    UBaseType_t n = uxTaskGetSystemState(status, MAX_TASKS, NULL);
    for (UBaseType_t i = 0; i < n; i++) {
        UBaseType_t hw = uxTaskGetStackHighWaterMark(status[i].xHandle);
        if (hw < THRESHOLD_WORDS) {
            log_warn("task %s: only %u words free",
                     status[i].pcTaskName, (unsigned)hw);
        }
    }
}
```

watermark가 *총 stack의 10% 이하*로 떨어지면 *위험*입니다. stack을 늘리거나 해당 task의 worst path를 다시 분석합니다.

## 정적 분석 — `-fstack-usage`

운영 시 측정과 *컴파일 타임 분석*은 서로 보완합니다. GCC `-fstack-usage`는 함수별 *최악 stack 사용량*을 파일로 떨어뜨립니다.

```bash
$ gcc -fstack-usage -c handler.c
$ cat handler.su
handler.c:42:6:task_entry    128  static
handler.c:55:6:process       256  static
handler.c:78:6:compute       512  static
```

call graph를 따라 *worst path*를 합산합니다.

| 항목 | Byte |
|---|---|
| `task_entry(128) → process(256) → compute(512)` | 896 |
| ISR worst case path | +192 |
| context switch overhead | +64 |
| safety margin (25%) | +288 |
| **total** | ≈ 1440 → 2048 |

수동으로 트리를 따라가는 것이 번거롭다면 *Memfault puncover* 같은 도구가 자동화해 줍니다. ELF와 `.su` 파일을 입력으로 받아 *call graph + stack 합산*을 보여 줍니다.

## Stack을 패턴으로 채워 측정

운영 watermark와 별개로 *개발 단계 측정*에는 stack을 *0xDEADBEEF로 채우고 worst case 시나리오*를 돌립니다.

```c
void fill_stack(uint32_t *stack, size_t words) {
    for (size_t i = 0; i < words; i++) stack[i] = 0xDEADBEEF;
}

size_t measure_stack_used(uint32_t *stack, size_t words) {
    size_t i;
    for (i = 0; i < words; i++) {
        if (stack[i] != 0xDEADBEEF) break;
    }
    return words - i;   /* 깨진 위치부터 끝까지 = 사용량 */
}
```

stress test 후 *몇 word까지 패턴이 살아 있는지*를 보면 *그때까지의 최대 사용량*을 정확히 알 수 있습니다. canary는 *침범 여부*만, 이 방법은 *침범 거리*까지 알려 줍니다.

## MPU로 Hardware 보호

가장 강력한 방어는 *MPU(Memory Protection Unit)*입니다. task stack 바로 아래에 *no-access region*을 두면, overflow 시 *즉시 MemManageFault*가 발생합니다.

```c
/* task stack 직전 32 byte를 no-access region으로 */
MPU->RNR  = MPU_REGION_NUMBER;
MPU->RBAR = (uint32_t)(stack_base - 32);
MPU->RASR = MPU_REGION_SIZE_32B
          | MPU_REGION_NO_ACCESS
          | MPU_REGION_ENABLE;
```

stack을 *1 byte라도 넘기는 순간* MemManageFault가 발생합니다. canary처럼 *주기 검사*가 필요 없고, *침범과 동시에 검출*됩니다.

FreeRTOS는 *MPU 지원 port*가 별도로 있습니다(`port_mpu.c`). task 생성 시 *각 task의 stack region을 MPU로 보호*하고, context switch 시 *region을 갱신*합니다. ARMv7-M (Cortex-M3/M4/M7)와 ARMv8-M (Cortex-M23/M33)에서 지원됩니다.

```c
xTaskCreateRestricted(&task_params, &task_handle);
/* task_params.xRegions에 MPU region 정의 */
```

MPU region 수가 제한적(보통 8 또는 16개)이라는 점을 감안해 *핵심 task에만 우선 적용*하는 것이 현실적입니다.

## GCC Stack Protector — Per-Function Canary

함수 단위 보호가 필요하면 GCC의 *stack protector*를 켭니다. 각 함수가 *진입 시 canary를 stack에 두고 exit 시 검증*합니다.

```bash
gcc -fstack-protector-strong source.c
```

```c
void some_function(void) {
    uint32_t __stack_chk_guard_copy = __stack_chk_guard;
    /* local 변수들 */
    /* ... */
    if (__stack_chk_guard != __stack_chk_guard_copy) {
        __stack_chk_fail();
    }
}
```

buffer overrun이 *함수 내부에서* canary를 덮어쓰는 즉시 잡힙니다. RTOS canary가 *task 단위 침범*을 잡는다면, 이쪽은 *함수 단위 침범*을 잡습니다. 두 방어가 *겹치지 않는 영역*을 막습니다.

## ISR Stack 분리

Cortex-M은 *MSP*(Main Stack Pointer, ISR용)와 *PSP*(Process Stack Pointer, task용)를 분리합니다. ISR이 *task stack을 침범하지 않는다*는 보장입니다.

[2-05편](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)에서 본 것처럼 task는 PSP, ISR은 MSP를 씁니다. MSP 크기는 *모든 nested ISR worst case*를 합산해 정합니다.

MSP 분석

| 항목 | Byte |
|---|---|
| outer ISR worst | 128 |
| nested ISR worst | +64 |
| nested ISR worst | +64 |
| context switch frame | +64 |
| margin (25%) | +80 |
| **MSP size** | 400 → 512 |

MSP 크기는 linker script의 `_estack` 심볼로 정합니다. MSP overflow는 *PSP 검사로는 잡히지 않습니다*. 별도로 *MSP base 부근에 canary*를 두어 부팅 후 주기적으로 검사하는 패턴이 안전합니다.

## Stack Probe — `-fstack-clash-protection`

큰 stack frame을 잡는 함수가 *guard page를 건너뛰고* 침범할 가능성이 있습니다. GCC의 `-fstack-clash-protection`은 *큰 frame을 작은 조각으로 나누어 단계적으로 probe*하는 코드를 삽입합니다.

```c
void big_func(void) {
    char large_buffer[16384];   /* 16 KB */
    /* 컴파일러가 자동으로 매 4 KB마다 stack 접근 명령 삽입 */
}
```

guard page 또는 MPU no-access region이 *반드시 건드려지므로* overflow가 즉시 검출됩니다. desktop에서는 표준 옵션이지만 embedded toolchain에서도 *최근 GCC*는 지원합니다.

## Recursion과 printf의 위험

embedded에서 *recursion은 사실상 금기*입니다. 깊이를 컴파일 타임에 알 수 없으면 *worst stack 분석이 불가능*합니다.

```c
void recursive(int n) {
    char local[1024];
    if (n == 0) return;
    recursive(n - 1);
}
recursive(10);   /* 10 KB stack — 추정 불가 영역 */
```

비슷하게 위험한 것이 *newlib `printf`*입니다. format string 처리, float 변환, locale 처리에 *256~512 byte stack*을 소모합니다.

```c
printf("value: %f\n", fp_val);   /* 512+ byte stack */
```

embedded에서는 *`tinyprintf` / `mini-printf` / `embedded-printf`* 같은 *작은 구현*으로 교체합니다. stack 사용량이 *64 byte 수준*으로 줄어듭니다. ISR 안에서 출력이 필요하다면 *ITM_SendChar* 또는 *ring buffer + 별도 task*가 답입니다.

## 자동차·항공 표준

safety-critical 도메인은 stack 분석을 *증명*해야 합니다.

ASIL-D / DO-178C Level A

- 모든 함수의 stack 사용량 *정적 분석*
- worst path 산출 및 문서화
- canary + MPU 둘 다 활성화
- 운영 중 watermark monitoring
- recursion 금지

KSLV-II 누리호 비행 컴퓨터

- stack size *고정* + 50% margin
- 매 task 종료 시 watermark check
- telemetry로 ground에 전송
- canary 깨짐 시 즉시 redundant unit 전환

3중 4중 방어가 *과하다고 느껴질 정도*로 겹쳐 있습니다. 한 층의 실패가 *다른 층으로 흡수*되어야 *시스템 신뢰성*이 만들어집니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Stack size를 감으로 정함

`xTaskCreate(..., 256, ...)` 같이 적당히 정하면 *언젠가 overflow*합니다. `-fstack-usage` 정적 분석과 watermark 실측을 *모든 task*에 적용합니다.

> ⚠️ 양산 빌드에서 canary 끔

성능 이유로 `configCHECK_FOR_STACK_OVERFLOW = 0`으로 두는 경우가 있습니다. canary 검사는 *context switch 당 십 cycle 수준*이라 영향이 미미합니다. 양산에서도 *최소 Method 1*은 유지합니다.

> ⚠️ ISR 안에서 큰 local 변수

```c
void some_isr(void) {
    char buf[4096];   /* MSP 4 KB 침범 */
}
```

ISR 안의 local은 *MSP를 직접 갉아먹습니다*. ISR에서 buffer가 필요하면 *static buffer*로 두거나, ISR을 *짧게 만들고 task에서 처리*합니다.

> ⚠️ ISR 안에서 printf

newlib `printf`는 *256+ byte stack*을 씁니다. MSP가 작으면 *MSP overflow*가 즉시 발생합니다. ISR 출력은 ITM 또는 ring buffer 패턴으로 옮깁니다.

> ⚠️ Recursion 사용

깊이를 분석할 수 없는 recursion은 *worst stack 분석을 불가능하게* 합니다. iterative 변형이나 explicit stack 자료구조로 바꿉니다.

> ⚠️ MSP canary 누락

PSP만 canary로 보호하면 *ISR overflow는 silent*입니다. MSP에도 *부팅 시 magic pattern*을 채우고 주기적으로 검사합니다.

## 정리

- Stack overflow는 *즉시 fault가 나지 않는 silent corruption*이며 임베디드에서 가장 재현이 어려운 버그입니다.
- FreeRTOS `configCHECK_FOR_STACK_OVERFLOW = 2`는 stack 끝의 *canary 패턴*을 매 context switch마다 검사합니다.
- `uxTaskGetStackHighWaterMark`로 *운영 중 사용량*을 측정하고 임계 이하 시 alarm을 띄웁니다.
- *MPU region*으로 task stack을 보호하면 침범과 동시에 *MemManageFault*가 발생해 hardware 수준 방어가 됩니다.
- GCC `-fstack-usage`로 *컴파일 타임 worst path 분석*, `-fstack-protector-strong`으로 *함수 단위 canary*를 추가합니다.
- ISR stack(MSP)은 *task stack(PSP)과 별도*이므로 *별도 분석과 별도 canary*가 필요합니다.
- recursion과 newlib `printf`는 *stack 큰손*이므로 embedded에서는 *피하거나 대체*합니다.
- safety-critical 도메인은 *정적 분석 + canary + MPU + watermark monitoring*을 모두 겹쳐 적용합니다.

다음 편은 [4-07 SMP RTOS](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)에서 *멀티코어 RTOS 스케줄링*을 다룹니다.

## 관련 항목

- [4-01: 실시간 메모리 요구사항](/blog/embedded/rtos/practical-internals/part4-01-realtime-memory)
- [4-04: Static Allocation](/blog/embedded/rtos/practical-internals/part4-04-static-allocation)
- [4-05: Memory Pool](/blog/embedded/rtos/practical-internals/part4-05-memory-pool)
- [2-05: ARM Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)
- [1-05: 인터럽트와 RTOS](/blog/embedded/rtos/practical-internals/part1-05-interrupts-rtos)
