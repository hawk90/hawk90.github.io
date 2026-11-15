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

stack overflow는 즉시 fault가 날 수도, 다른 memory를 훼손한 뒤 드러날 수도 있습니다. **canary·watermark·MPU·compiler 보호는 검출 시점과 범위가 다릅니다.** 한 검사나 관찰값만으로 모든 경로의 stack 안전을 보장하지 않습니다.

## 어떤 문제를 푸는가

task·exception·library 호출이 예상보다 큰 stack을 쓰면 이웃 영역을 훼손하거나 보호 fault를 만들 수 있습니다. 어느 증상이 몇 ms 뒤 발생한다고 고정할 수는 없습니다. 이 글은 FreeRTOS **V11.2.0**의 일반 비-MPU stack macro를 기준으로 하고 port·hardware 보호는 별도로 구분합니다.

## Stack의 방향과 침범 양상

Cortex-M의 stack은 *높은 주소에서 낮은 주소로* 자랍니다. SP가 stack base보다 작아지는 순간 *인접한 메모리 영역*을 덮어쓰기 시작합니다.

![Cortex-M stack은 높은 주소에서 낮은 주소로 자라며, overflow 시 인접 메모리를 침범한다](/images/blog/rtos/diagrams/part4-06-stack-layout.svg)

보호·mapping·access 조건에 따라 fault 여부가 달라집니다. Cortex-M의 아래 방향 stack에서도 SP 이동과 실제 memory access는 다르므로 byte 경계와 검출 시점을 나누어 봐야 합니다.

## Canary 패턴 — FreeRTOS Method 2

V11.2.0의 include/stack_macros.h에서 아래 방향 일반 비-MPU port의 Method 1은 저장된 SP와 경계를 비교합니다. configCHECK_FOR_STACK_OVERFLOW>1 경로는 **SP 경계 검사와 stack 시작의 4개 uint32_t 패턴 비교**를 함께 수행합니다. MPU wrapper나 다른 port의 검사 계약은 다릅니다.

```c
#define configCHECK_FOR_STACK_OVERFLOW 2
```

4개 word 중 하나라도 0xA5A5A5A5와 다르면 이 비교 조건에 걸릴 수 있습니다. “16 byte가 전부 깨져야 하고 그보다 작은 손상은 못 잡는다”는 설명은 틀립니다. 다만 경계를 건너뛰는 write·원래와 같은 값·검사 전에 SP가 돌아온 경로 등 모든 overflow가 검출되는 것은 아닙니다.

검사는 해당 kernel의 전환 경로에서 실행되며 손상 순간을 항상 포착하지 않습니다. 아래 방향 검사와 위 방향 검사에서 비교 크기·조건도 같다고 가정하지 않습니다.

## Application Hook

hook이 호출될 때에는 이미 memory·task 이름·TCB 상태가 손상되었을 수 있습니다. 사용 stack과 호출 문맥은 실제 port 경로를 확인해야 합니다. 무조건 overflow된 task stack에서 실행된다거나 printf·ITM이 안전하다고 가정하지 않습니다.

```c title="overflow-hook.c"
#include "FreeRTOS.h"
#include "task.h"
_Noreturn extern void board_fail_stop(void);
void vApplicationStackOverflowHook(TaskHandle_t task, char *name) {
    (void)task; (void)name;
    board_fail_stop();
}
```

board_fail_stop은 제품이 검증한 최소 실패 대응을 제공해야 합니다. reset이 언제나 가장 안전한 결과는 아니며, 보존할 진단 정보·외부 출력·watchdog·안전 상태를 설계해야 합니다.

## High Water Mark — 운영 중 측정

`uxTaskGetStackHighWaterMark`는 fill pattern이 남은 연속 영역을 StackType_t 단위로 관찰합니다. 쓰지 않은 예약 frame·같은 pattern의 데이터 때문에 정확한 최대 SP 이동량과 다를 수 있습니다.

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

threshold는 전체 stack·예외 frame·분석 여유·관찰 조건으로 정합니다. 위 snapshot 이후 task가 삭제되면 handle·name 수명 문제가 생길 수 있으므로 monitor 중 task lifecycle 계약도 필요합니다.

## 정적 분석 — `-fstack-usage`

운영 시 측정과 *컴파일 타임 분석*은 서로 보완합니다. 지금까지의 watermark·canary는 *이미 쓴 만큼*을 알려 주지만, 아직 타지 않은 경로가 얼마를 쓸지는 말해 주지 못합니다. 그 빈칸을 GCC `-fstack-usage`가 채웁니다.

`.su` 파일을 읽어 call graph의 worst path를 합산하는 절차는 [Ch 4-4: 정적 할당](/blog/embedded/rtos/practical-internals/part4-04-static-allocation#stack-size-계산---fstack-usage)에서 예제와 함께 다뤘습니다. 여기서는 그 값을 *overflow 대응에 어떻게 쓰는지*만 봅니다.

정적 상한과 관찰 watermark는 서로 다른 지표입니다. 차이가 두 배라는 이유만으로 하나가 틀렸다고 판정하지 않습니다. 실행하지 않은 경로·간접 호출·재귀·alloca·library·FP/예외 frame과 fill-pattern 측정의 한계를 대조합니다.

수동으로 트리를 따라가는 것이 번거롭다면 *Memfault puncover* 같은 도구가 자동화해 줍니다. ELF와 `.su` 파일을 입력으로 받아 call graph와 stack 합산을 보여 줍니다.

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

이 패턴은 **비활성 scratch stack 또는 안전하게 초기화할 수 있는 저장소**에만 적용합니다. 살아 있는 task·MSP stack을 칠하면 실행 상태를 훼손합니다. untouched pattern은 실제 write 관찰치이며 SP가 예약만 하고 쓰지 않은 영역이나 같은 패턴의 write를 놓칠 수 있습니다.

## MPU로 Hardware 보호

guard region에 대한 금지된 access가 발생하면 설정에 따라 fault를 만들 수 있습니다. SP를 이동하는 것만으로 즉시 fault가 나거나 큰 frame이 guard를 절대로 건너뛰지 못한다는 보장은 없습니다. privileged access·background mapping·region 우선순위·fault enable·정렬·granularity를 확인합니다.

FreeRTOS의 MPU 지원은 architecture별 전용 port와 task API/config를 사용합니다. 임의의 MPU_RASR 이름과 32-byte 주소만 써서 모든 Cortex-M의 stack을 보호하는 완성 설정으로 제시하지 않습니다. 실제 MPU register·task memory map·target fault 주입 검증이 필요합니다.

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

stack protector는 compiler가 선택한 함수의 반환 등 검사 지점에서 canary를 검사합니다. overwrite 순간을 즉시 trap하거나 모든 stack 오류를 검출하는 것은 아닙니다. RTOS stack 경계 검사와 함수 protector는 검사 위치가 달라 서로 보완하지만 검출 범위가 겹치거나 빠질 수 있습니다.

## ISR Stack 분리

Cortex-M은 *MSP*(Main Stack Pointer, ISR용)와 *PSP*(Process Stack Pointer, task용)를 분리합니다. task에서 exception에 들어갈 때 hardware가 만드는 frame은 당시 task의 PSP에 놓일 수 있고 handler 본문은 MSP를 사용합니다. 분리만으로 task stack에 exception frame 비용이 없다고 할 수는 없습니다.

[2-05편](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)에서 본 것처럼 task는 PSP, ISR은 MSP를 씁니다. MSP 크기는 *모든 nested ISR worst case*를 합산해 정합니다.

MSP 예산에는 handler 호출 경로·중첩·FP/security 상태·port의 scheduler 처리와 분석 여유를 포함합니다. `_estack` 같은 초기 top symbol 하나만으로 저장소 크기가 정해지는 것은 아니며, linker의 범위와 startup 설정을 함께 확인합니다. 보호 검사도 MSP와 PSP에 각각 어떤 범위를 제공하는지 검증해야 합니다.

## Stack Probe — -fstack-clash-protection

지원 target에서 stack-clash protection은 큰 frame의 probe를 도입해 guard를 건너뛰는 일부 경로를 제한합니다. compiler version과 target 지원·실제 assembly를 확인해야 하며 모든 embedded GCC나 MPU 설정에서 일정한 4 KiB 간격·완전한 검출이 보장되지는 않습니다.

```bash
gcc -fstack-clash-protection -c source.c
```

성공한 옵션 parsing만으로 필요한 probe가 생성됐다고 판정하지 않습니다. guard 크기·배치·접근 권한과 실제 target 동작도 함께 확인합니다.

## Recursion과 printf의 비용

재귀 깊이에 상한이 없으면 stack 상한 분석이 어렵습니다. 깊이를 제한하고 함수별 frame·tail-call 최적화 등 실제 build를 확인해야 합니다. newlib printf와 대체 library도 format·FP·구현·compiler에 따라 stack과 reentrancy 비용이 다릅니다.

출처 없는 256/512/64 byte를 모든 제품의 stack 예산으로 사용하지 않습니다. ISR의 ITM print도 busy wait·지원 trace 경로를 확인해야 하므로 무조건 안전한 대체로 제시하지 않습니다.

## 제품 검증 기록

제품별로 stack 배치·최악 호출/예외 경로·도구의 적용 범위·관찰 workload·fault 대응을 기록합니다. 특정 표준 등급이면 canary·MPU·watermark의 같은 조합이 모두 강제된다고 일반화하지 않습니다. 공개 근거 없는 누리호의 50% margin·redundant unit 전환 절차도 제품 사실로 제시하지 않습니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Stack size를 감으로 정함

`xTaskCreate(..., 256, ...)` 같이 적당히 정하면 *언젠가 overflow*합니다. `-fstack-usage` 정적 분석과 watermark 실측을 *모든 task*에 적용합니다.

> ⚠️ 양산 빌드에서 canary 끔

성능 이유로 `configCHECK_FOR_STACK_OVERFLOW = 0`으로 두는 경우가 있습니다. 검사 비용과 config는 port·compiler·메모리·제품 요구로 판단합니다. 기능을 켰다는 사실과 시간 예산·검출 범위 검증을 구분합니다.

> ⚠️ ISR 안에서 큰 local 변수

```c
void some_isr(void) {
    char buf[4096];   /* MSP 4 KB 침범 */
}
```

ISR 안의 local은 *MSP를 직접 갉아먹습니다*. ISR에서 buffer가 필요하면 *static buffer*로 두거나, ISR을 *짧게 만들고 task에서 처리*합니다.

> ⚠️ ISR 안에서 printf

사용하는 printf의 stack·reentrancy·blocking 문맥을 확인합니다. ISR 출력에는 검증한 non-blocking 기록이나 별도 task 전달을 검토하며, 실제 비용은 target에서 확인합니다.

> ⚠️ Recursion 사용

깊이를 분석할 수 없는 recursion은 *worst stack 분석을 불가능하게* 합니다. iterative 변형이나 explicit stack 자료구조로 바꿉니다.

> ⚠️ MSP canary 누락

PSP 검사만으로 MSP overflow를 검출한다고 가정할 수 없습니다. MSP 역시 별도 분석과 보호가 필요하지만, 현재 실행 중인 MSP 영역을 임의로 pattern-fill하면 안 됩니다. startup과 검사 문맥을 검증해야 합니다.

## 정리

- Stack overflow는 즉시 fault 또는 지연된 memory corruption으로 드러날 수 있습니다.
- FreeRTOS V11.2.0의 비-MPU macro와 port별 SP·pattern 검사 조건을 확인합니다.
- watermark 관찰값은 실행 경로·fill pattern의 한계와 함께 보고합니다.
- MPU는 금지 access의 fault를 제공하며 guard·권한·probe와 target 조건을 확인합니다.
- GCC `-fstack-usage`로 *컴파일 타임 worst path 분석*, `-fstack-protector-strong`으로 *함수 단위 canary*를 추가합니다.
- 해당 Cortex-M port에서 ISR 본문의 MSP와 task PSP를 구분해 각각 분석·보호합니다.
- recursion 상한과 library의 실제 build별 stack 사용을 확인합니다.
- 제품의 요구와 분석 한계에 맞춰 서로 다른 검출 수단을 조합합니다.

다음 편은 [4-07 SMP RTOS](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)에서 *멀티코어 RTOS 스케줄링*을 다룹니다.

## 근거 자료

- [FreeRTOS V11.2.0 stack_macros.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/stack_macros.h), [tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c): 실제 검사·watermark 경로.
- [GCC instrumentation options](https://gcc.gnu.org/onlinedocs/gcc/Instrumentation-Options.html): protector·stack-clash의 target별 범위.

## 관련 항목

- [4-01: 실시간 메모리 요구사항](/blog/embedded/rtos/practical-internals/part4-01-realtime-memory)
- [4-04: Static Allocation](/blog/embedded/rtos/practical-internals/part4-04-static-allocation)
- [4-05: Memory Pool](/blog/embedded/rtos/practical-internals/part4-05-memory-pool)
- [2-05: ARM Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)
- [1-05: 인터럽트와 RTOS](/blog/embedded/rtos/practical-internals/part1-05-interrupts-rtos)
- [Embedded Debugging: RTOS-aware 디버깅](/blog/tools/debugging/embedded/chapter07-rtos-troubleshooting) — GDB 스크립트로 모든 task의 스택 여유를 한 번에 훑는 법
