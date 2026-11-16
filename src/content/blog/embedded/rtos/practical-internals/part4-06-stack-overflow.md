---
title: "Stack Overflow 탐지 — Canary·MPU·Watermark 3중 방어"
slug: "embedded/rtos/practical-internals/part4-06-stack-overflow"
date: 2026-05-07T09:38:00
description: "FreeRTOS V11.2.0의 stack 검사와 관찰 watermark의 한계를 구분합니다. MPU guard, compiler protector, 정적 stack 분석을 실제 port와 build 조건에 맞춰 조합합니다."
series: "Practical RTOS Internals"
seriesOrder: 38
tags: [stack-overflow, canary, mpu, watermark]
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

stack overflow는 즉시 fault가 날 수도, 다른 memory를 훼손한 뒤 드러날 수도 있습니다. **canary·watermark·MPU·compiler 보호는 검출 시점과 범위가 다릅니다.** 이 글은 네 가지를 같은 QEMU 11.1.3 `mps2-an385`(Cortex-M3)에서 하나씩 일부러 넘쳐 보고, 무엇이 잡히고 무엇이 빠지는지 출력으로 확인합니다. 커널은 FreeRTOS V11.2.0(commit `0adc196d`) `ARM_CM3` 포트, 컴파일러는 `arm-none-eabi-gcc` 16.2.0입니다.

## 어떤 문제를 푸는가

task·exception·library 호출이 예상보다 큰 stack을 쓰면 이웃 영역을 덮어씁니다. 컵에 물을 따르다 넘치면 옆에 둔 서류가 젖는 것과 같아서, 넘친 순간이 아니라 나중에 서류를 펼칠 때 문제가 드러납니다. 아래 실행에서도 같은 넘침이 한 번은 hook으로, 한 번은 HardFault로, 한 번은 아무 신호 없이 지나갔습니다.

## Stack의 방향과 침범 양상

Cortex-M의 stack은 *높은 주소에서 낮은 주소로* 자랍니다. SP가 stack base보다 작아지는 순간 *인접한 메모리 영역*을 덮어쓰기 시작합니다.

![Cortex-M stack은 높은 주소에서 낮은 주소로 자라며, overflow 시 인접 메모리를 침범한다](/images/blog/rtos/diagrams/part4-06-stack-layout.svg)

SP가 stack 아래로 내려가는 것과 그 아래 memory에 실제로 쓰는 것은 다른 사건입니다. MPU 같은 보호가 없으면 Cortex-M은 그냥 씁니다. 그래서 검출 방법마다 "무엇을 보느냐"가 다릅니다. SP 값을 보는 검사, stack 끝 패턴을 보는 검사, 금지 영역 접근을 잡는 hardware, 함수 frame 안 canary를 보는 compiler입니다.

## Canary 패턴 — FreeRTOS Method 2

V11.2.0의 `include/stack_macros.h`에서 stack이 아래로 자라는 비-MPU port의 Method 1(`configCHECK_FOR_STACK_OVERFLOW 1`, `:67-79`)은 저장된 SP(`pxTopOfStack`)가 `pxStack`(stack의 가장 낮은 주소) 이하인지만 봅니다. Method 2(`> 1`, `:101-118`)는 그 검사에 더해 `pxStack`의 4개 `uint32_t`가 모두 `0xa5a5a5a5`인지 봅니다. 위로 자라는 port는 끝의 20 byte를 `memcmp()`로 비교합니다(`:123-138`). MPU wrapper port에서는 이 매크로가 정의되지 않고, 소스 주석(`:56-66`)은 MPU region이 unprivileged task의 overflow를 fault로 잡는다고 설명합니다.

```c
#define configCHECK_FOR_STACK_OVERFLOW 2
```

검사는 `vTaskSwitchContext()` 안(`tasks.c:5153`)에서, 즉 task가 CPU를 내놓을 때만 돕니다. 128 word stack task로 세 가지 넘침을 Method 1과 2에서 각각 돌렸습니다. 1은 SP는 그대로 두고 canary word 하나만 0으로 쓰기, 2는 560 byte frame 함수를 불렀다가 돌아온 뒤 block하기, 3은 그 frame 안에서 block하기입니다.

```text
[SCEN 1, configCHECK_FOR_STACK_OVERFLOW=1]
  write 0 to stack base word 2 (canary area), SP untouched
  no hook after the next context switch
[SCEN 2, configCHECK_FOR_STACK_OVERFLOW=1]
  call a 560-byte frame on a 512-byte stack, return, then block
  no hook after the next context switch
[SCEN 3, configCHECK_FOR_STACK_OVERFLOW=1]
  call a 560-byte frame on a 512-byte stack and block inside it
HardFault CFSR=0x01000000 HFSR=0x40000000 MMFAR=0x00000000
[SCEN 1, configCHECK_FOR_STACK_OVERFLOW=2]
  write 0 to stack base word 2 (canary area), SP untouched
  -> vApplicationStackOverflowHook("victim")
[SCEN 2, configCHECK_FOR_STACK_OVERFLOW=2]
  call a 560-byte frame on a 512-byte stack, return, then block
  -> vApplicationStackOverflowHook("victim")
[SCEN 3, configCHECK_FOR_STACK_OVERFLOW=2]
  call a 560-byte frame on a 512-byte stack and block inside it
HardFault CFSR=0x01000000 HFSR=0x40000000 MMFAR=0x00000000
```

결과에서 세 가지가 보입니다.

- **word 하나만 깨져도 Method 2는 잡습니다.** "16 byte가 전부 깨져야 잡는다"는 설명은 틀립니다. 4개 word 중 하나만 달라도 조건이 참입니다.
- **넘쳤다가 돌아온 frame은 Method 1이 놓칩니다.** switch 시점의 SP는 이미 정상 범위라서 SP 검사는 통과합니다. Method 2는 그 frame이 canary를 덮어썼기 때문에 잡았습니다.
- **깊이 넘친 상태에서 block하면 둘 다 hook 전에 HardFault로 멈췄습니다.** 560 byte frame이 stack 아래 heap 영역까지 덮어써서, switch 검사에 이르기 전에 다른 곳이 깨졌습니다. 검사 방식과 상관없이 "hook이 반드시 불린다"는 보장은 없습니다.

## Application Hook

`ARM_CM3` 포트에서 `vTaskSwitchContext()`는 PendSV handler가 부르므로(`portable/GCC/ARM_CM3/port.c:473`) hook도 그 안에서 돕니다. SCEN 1에서 hook 안의 SP를 찍었더니 RAM 꼭대기의 MSP(`0x203fffc0`)였고, task의 PSP는 `0x20000348`이었습니다.

```text
  -> vApplicationStackOverflowHook("victim")
     hook sp=0x203fffc0 (psp=0x20000348, task stack base 0x200001b0)
```

 넘친 task의 stack이 아니라는 점은 다행이지만, 넘친 범위가 TCB까지 닿았다면 `pcTaskName`부터 깨져 있습니다. 위 SCEN 3이 보여 주듯 hook까지 가지도 못하는 경우도 있습니다. 그래서 hook은 최소한의 일만 합니다.

```c title="overflow-hook.c"
#include "FreeRTOS.h"
#include "task.h"
_Noreturn extern void board_fail_stop(void);
void vApplicationStackOverflowHook(TaskHandle_t task, char *name) {
    (void)task; (void)name;
    board_fail_stop();
}
```

`board_fail_stop()`은 보드가 정한 최소 실패 대응 자리입니다. 출력을 안전 상태로 두고, 진단 정보(task 이름 대신 TCB 주소)를 reset 후에도 남는 RAM에 기록한 뒤 멈추거나 reset하는 식입니다.

## High Water Mark — 운영 중 측정

`uxTaskGetStackHighWaterMark()`(`tasks.c:6429`)는 `prvTaskCheckFreeStackSpace()`(`:6364-6377`)로 stack 끝에서부터 `tskSTACK_FILL_BYTE`(`0xa5`) byte가 이어지는 길이를 세고 `sizeof(StackType_t)`로 나눕니다. 그래서 단위는 word이고, SP가 내려갔지만 쓰지 않은 영역(예약만 한 큰 배열)은 사용량에 잡히지 않습니다. 위 실행의 task는 시작 직후 106~108 word가 남아 있었습니다.

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

`MAX_TASKS`·`THRESHOLD_WORDS`·`log_warn()`은 제품 코드가 정할 자리입니다. `uxTaskGetSystemState()` 이후 task가 삭제되면 그 handle로 watermark를 읽는 것은 해제된 TCB를 읽는 일이 되므로, task를 지우는 시스템이라면 이 함수를 `vTaskSuspendAll()`로 감쌉니다. 이 monitor 코드는 실행하지 않았습니다.

## 정적 분석 — `-fstack-usage`

운영 시 측정과 *컴파일 타임 분석*은 서로 보완합니다. 지금까지의 watermark·canary는 *이미 쓴 만큼*을 알려 주지만, 아직 타지 않은 경로가 얼마를 쓸지는 말해 주지 못합니다. 그 빈칸을 GCC `-fstack-usage`가 채웁니다.

`.su` 파일을 읽어 call graph의 worst path를 합산하는 절차는 [Ch 4-4: 정적 할당](/blog/embedded/rtos/practical-internals/part4-04-static-allocation#stack-size-계산---fstack-usage)에서 예제와 함께 다뤘습니다. 여기서는 그 값을 *overflow 대응에 어떻게 쓰는지*만 봅니다.

정적 합산은 모든 경로의 위쪽 값이고, watermark는 실제로 지나간 경로의 값입니다. 둘이 다르면 정적 합산이 지나가지 않은 경로를 포함했거나, `.su`가 `dynamic`(unbounded) 함수를 고정 부분만 셌거나, watermark가 아직 최악 경로를 안 탔다는 뜻입니다. 함수 포인터와 재귀는 `.su`만으로 합산할 수 없습니다.

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

FreeRTOS가 task 생성 때 `0xa5`로 채우는 것과 같은 방법입니다. 이 패턴은 **아직 쓰지 않은 stack**에만 칠합니다. 살아 있는 task·MSP stack을 칠하면 실행 상태를 덮어씁니다. 이 코드는 실행하지 않았습니다.

## MPU로 Hardware 보호

stack 바로 아래에 접근 금지 region(guard)을 두면, 넘친 write가 그 region에 닿는 순간 MemManage fault가 납니다. 소프트웨어 검사와 달리 switch를 기다리지 않습니다. bare metal로 `[다른 데이터 128 B][guard 32 B][stack 256 B]`를 한 배열에 배치하고, guard를 PMSAv7 region 0(AP=000, XN, 32 byte)으로 막은 뒤 두 가지 write를 했습니다.

```text
== SCEN 1
MPU_TYPE=0x00000800 (DREGION=8)
below=0x20000000 guard=0x20000080 stack=0x200000a0
write to stack[0] ok
write to guard[7] (just below stack[0])
MemManage CFSR=0x00000082 HFSR=0x00000000 MMFAR=0x2000009c
== SCEN 2
MPU_TYPE=0x00000800 (DREGION=8)
below=0x20000000 guard=0x20000080 stack=0x200000a0
write to stack[0] ok
write to below[31] (skips the 32-byte guard)
no fault; below[31]=0xdead
```

guard 안 write는 즉시 fault였고 MMFAR가 정확히 그 주소(`0x2000009c`)를 가리켰습니다. 그러나 guard를 건너뛴 write는 아무 일 없이 성공했습니다. 큰 local 배열을 가진 함수가 SP를 guard보다 더 아래로 한 번에 내리고 그 끝에 쓰면 이 SCEN 2가 됩니다. guard는 frame보다 커야 하고, 그게 어려우면 아래 stack-clash 옵션으로 frame 중간을 미리 건드리게 합니다. QEMU의 이 Cortex-M3 모델은 MPU region 8개를 보고했습니다.

FreeRTOS에서 이 보호를 쓰려면 `ARM_CM3_MPU` 같은 MPU 전용 port를 씁니다. 위 데모는 그 port가 아니라 region 하나를 손으로 설정한 것입니다.

## GCC Stack Protector — Per-Function Canary

함수 단위 보호가 필요하면 GCC의 *stack protector*를 켭니다. 각 함수가 *진입 시 canary를 stack에 두고 exit 시 검증*합니다.

```bash
gcc -fstack-protector-strong source.c
```

```c title="protected-frame.c"
#include <stddef.h>
unsigned inspect_stack_frame(const unsigned char *src, size_t length) {
    volatile unsigned char probe[64];
    if (src == NULL || length > sizeof probe) return 0;
    unsigned sum = 0;
    for (size_t i = 0; i < length; ++i) {
        probe[i] = src[i]; sum += probe[i];
    }
    return sum;
}
```

GCC 매뉴얼(Instrumentation Options)은 `-fstack-protector`가 "vulnerable objects"가 있는 함수에 guard 변수를 넣고, 진입 때 초기화해 함수를 나갈 때 검사한다고 설명합니다. `-strong`은 local 배열이나 local 주소를 참조하는 함수까지 넓힙니다. bare-metal에서는 `__stack_chk_guard`와 `__stack_chk_fail()`을 직접 정의해야 link됩니다.

위 `inspect_stack_frame()`과, 일부러 16 byte buffer에 24 byte를 쓰는 `buggy_copy()`를 `-fstack-protector-strong`으로 빌드해 돌렸습니다.

```text
inspect_stack_frame(data, 64) = 2016
inspect_stack_frame(data, 65) = 0 (rejected by its own length check)
  buggy_copy wrote 16 bytes into buf[16], about to return
  buggy_copy wrote 24 bytes into buf[16], about to return
  -> __stack_chk_fail: canary changed, detected at function return
```

넘친 write가 일어난 순간이 아니라 함수가 돌아가는 순간에 잡혔습니다. objdump에서 `inspect_stack_frame()`에도 `__stack_chk_guard` 참조가 들어간 것을 확인했습니다. 이 검사는 frame 안 canary만 보므로, 앞의 SCEN 1처럼 다른 코드가 stack 끝을 덮는 경우는 보지 못합니다. RTOS 검사와 겹치지 않는 부분을 채우는 도구입니다.

## ISR Stack 분리

Cortex-M은 *MSP*(Main Stack Pointer)와 *PSP*(Process Stack Pointer) 두 개를 둡니다. FreeRTOS `ARM_CM3` 포트는 첫 task를 시작할 때 `msr psp, r0`로 task stack을 PSP에 넣고 EXC_RETURN을 `orr r14, #0xd`로 바꿔 thread mode가 PSP를 쓰게 합니다(`port.c:235-239`). 위 hook 실행이 보여 주듯 handler는 MSP 위에서 돕니다. task 실행 중 interrupt가 들어오면 hardware가 쌓는 frame은 task stack에 놓이는데, 포트가 새 task stack에 미리 만들어 두는 가짜 frame(`pxPortInitialiseStack()`, `port.c:182-197`)이 그 모양을 보여 줍니다. xPSR·PC·LR·R12·R3~R0의 8 word입니다. 그래서 task stack 예산에도 이 frame 한 개 몫이 들어갑니다.

[2-05편](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)에서 본 것처럼 task는 PSP, ISR은 MSP를 씁니다. MSP 크기는 *모든 nested ISR worst case*를 합산해 정합니다.

FreeRTOS의 stack 검사는 `pxCurrentTCB`의 stack, 즉 task stack만 봅니다. MSP에는 같은 검사가 없습니다. MSP 아래에 무엇이 있는지는 linker script가 정합니다. 이 harness는 `_estack`을 4 MiB RAM 끝에 두고 `.bss`를 맨 앞에 두어 그 사이가 비어 있지만, RAM이 빠듯한 배치에서는 MSP 바로 아래에 `.bss`나 heap이 올 수 있으니 map 파일에서 확인합니다. MSP 끝에도 위 MPU guard를 두는 것이 hardware로 잡는 방법입니다.

## Stack Probe — -fstack-clash-protection

GCC 매뉴얼은 이 옵션이 stack을 "one page at a time" 할당하고 각 page를 할당 직후 건드려, guard page를 건너뛰지 못하게 한다고 적습니다. 동시에 "Most targets do not fully support stack clash protection"이라고도 적습니다. 그래서 내 target에서 실제로 probe가 생기는지는 assembly로 봐야 합니다. 16 KiB local 배열 하나를 가진 함수로 확인했습니다.

```bash
gcc -fstack-clash-protection -c source.c
```

```text
$ arm-none-eabi-gcc -mcpu=cortex-m3 -mthumb -O2 -fstack-clash-protection -S build/clash.c
exit=0
26:	push	{lr}
27:	sub	ip, sp, ip
28:	str	r0, [ip]
29:	sub	ip, ip, #4096
30:	str	r0, [ip]
31:	sub	ip, ip, #4096
32:	str	r0, [ip]
33:	sub	ip, ip, #4096
34:	str	r0, [ip]
35:	str	r0, [ip, #-8]
36:	sub	sp, sp, #16384
37:	sub	sp, sp, #4
$ (same without -fstack-clash-protection)
25:	push	{lr}
26:	sub	sp, sp, #16384
27:	sub	sp, sp, #4
```

이 컴파일러는 Cortex-M3에서 4096 byte마다 `str` probe를 넣었습니다. 옵션이 없으면 SP를 한 번에 16 KiB 내립니다. 다만 probe 간격이 4096 byte이므로, 앞의 32 byte guard로는 여전히 건너뛸 수 있습니다. 이 옵션은 OS가 4 KiB guard page를 두는 환경을 전제로 설계됐고, MCU에서 효과를 보려면 guard도 그 간격보다 커야 합니다.

## Recursion과 printf의 비용

재귀 깊이에 상한이 없으면 `.su` 합산으로 상한을 구할 수 없습니다. printf 계열도 크기를 직접 봅니다. 4-04에서 이 harness의 작은 `printf()`가 272 byte, 그 안의 `vsnprintf()`가 96 byte를 썼습니다. newlib 같은 실제 C 라이브러리의 printf는 이 툴체인에 없어 재지 않았고, 예전 판의 "256/512/64 byte"는 출처가 없어 지웠습니다.

## 제품 검증 기록

위 실행들을 표로 모으면 각 방법이 잡는 것이 갈립니다.

| 넘침 유형 | Method 1 | Method 2 | MPU guard | stack protector |
| --- | --- | --- | --- | --- |
| stack 끝 word 하나 덮기 | 못 잡음 | 잡음 (다음 switch) | guard 안이면 즉시 | 못 잡음 |
| 넘쳤다가 돌아온 frame | 못 잡음 | 잡음 (canary가 덮였을 때) | guard를 건드렸다면 즉시 | 그 frame의 canary가 깨졌다면 반환 때 |
| 깊이 넘친 채 block | 둘 다 hook 전에 HardFault | 〃 | — | — |
| guard를 건너뛴 write | — | — | 못 잡음 | — |

빈칸(—)은 이 글에서 돌리지 않은 조합입니다. 제품에서는 이 표의 빈칸을 그 제품의 실험으로 채웁니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Stack size를 감으로 정함

`xTaskCreate(..., 256, ...)`의 256은 byte가 아니라 word입니다. 숫자는 `.su` 합산과 watermark로 정하고, *모든 task*에 둘 다 적용합니다.

> ⚠️ 양산 빌드에서 canary 끔

Method 2의 비용은 context switch마다 비교 5번(SP 하나, word 넷)입니다(`stack_macros.h:109-113`). 이것을 끄면 위 표의 첫 두 줄이 모두 "못 잡음"이 됩니다.

> ⚠️ ISR 안에서 큰 local 변수

```c
void some_isr(void) {
    char buf[4096];   /* MSP 4 KB 침범 */
}
```

ISR 안의 local은 MSP에 잡히고, FreeRTOS 검사는 MSP를 보지 않습니다. 4 KB 배열이 MSP 아래 영역을 덮어도 hook은 불리지 않습니다. ISR에서 buffer가 필요하면 *static buffer*로 두거나, ISR을 *짧게 만들고 task에서 처리*합니다.

> ⚠️ ISR 안에서 printf

printf는 stack을 많이 쓰고(이 harness에서만 368 byte), 출력 장치를 기다리는 구현이면 ISR을 그만큼 늘립니다. ISR에서는 ring buffer에 값만 넣고 task가 출력합니다.

> ⚠️ Recursion 사용

깊이에 상한이 없는 recursion은 `.su` 합산으로 상한을 구할 수 없게 만듭니다. iterative 변형이나 크기를 정한 explicit stack 자료구조로 바꿉니다.

> ⚠️ MSP canary 누락

FreeRTOS 검사는 task stack만 봅니다. MSP는 startup에서 아직 쓰지 않은 아래쪽을 패턴으로 채워 두고 주기적으로 세거나, MSP 끝에 MPU guard를 둡니다. 이미 쓰고 있는 위쪽을 칠하면 실행 상태를 덮어씁니다.

## 정리

- FreeRTOS 검사는 context switch 때만 돕니다. Method 1은 SP만, Method 2는 SP와 끝 4 word를 봅니다.
- word 하나 손상과 넘쳤다 돌아온 frame은 Method 2만 잡았고, 깊이 넘친 채 block하면 둘 다 hook 전에 HardFault였습니다.
- MPU guard는 닿는 순간 fault를 내고 MMFAR로 주소를 알려 주지만, 건너뛴 write는 못 잡습니다.
- `-fstack-protector-strong`은 함수 반환 때 잡고, bare-metal에서는 `__stack_chk_guard`·`__stack_chk_fail`을 직접 둡니다.
- `-fstack-clash-protection`은 이 Cortex-M3 빌드에서 4096 byte 간격 probe를 넣었습니다.
- MSP는 FreeRTOS 검사 대상이 아니니 따로 보호합니다.

다음 편은 [4-07 SMP RTOS](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)에서 *멀티코어 RTOS 스케줄링*을 다룹니다.

## 근거 자료

- [FreeRTOS V11.2.0 stack_macros.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/stack_macros.h), [tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c): 실제 검사·watermark 경로.
- [GCC instrumentation options](https://gcc.gnu.org/onlinedocs/gcc/Instrumentation-Options.html): protector·stack-clash의 동작과 target 지원 범위.

## 관련 항목

- [4-01: 실시간 메모리 요구사항](/blog/embedded/rtos/practical-internals/part4-01-realtime-memory)
- [4-04: Static Allocation](/blog/embedded/rtos/practical-internals/part4-04-static-allocation)
- [4-05: Memory Pool](/blog/embedded/rtos/practical-internals/part4-05-memory-pool)
- [2-05: ARM Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)
- [1-05: 인터럽트와 RTOS](/blog/embedded/rtos/practical-internals/part1-05-interrupts-rtos)
- [Embedded Debugging: RTOS-aware 디버깅](/blog/tools/debugging/embedded/chapter07-rtos-troubleshooting) — GDB 스크립트로 모든 task의 스택 여유를 한 번에 훑는 법
