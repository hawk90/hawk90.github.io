---
title: "성능 측정의 기본 — Wall-Clock·CPU Cycle·Instruction Count"
slug: "embedded/performance-engineering/part1-03-measurement"
date: 2026-04-23T09:03:00
description: "어떻게 측정하나. DWT, PMU, clock_gettime, GPIO + 로직 분석기. Overhead 줄이기."
series: "Embedded Performance Engineering"
seriesOrder: 3
tags: [measurement, dwt, pmu, clock-gettime, gpio]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"무엇을 측정하느냐가 절반"**입니다. wall-clock, cycle, instruction은 *각각 다른 답*을 줍니다.

## 3 종류의 시간

같은 코드라도 무엇으로 재느냐에 따라 다른 숫자가 나옵니다. 경과 시간(wall-clock), 그 코드가 CPU를 쓴 시간, 실행한 명령어 수는 서로 다른 질문에 답합니다.

### Wall-Clock Time

*실제 경과 시간*입니다. 사용자가 체감하는 값과 같습니다.

```c
struct timespec t1, t2;
clock_gettime(CLOCK_MONOTONIC_RAW, &t1);
work();
clock_gettime(CLOCK_MONOTONIC_RAW, &t2);
long ns = (t2.tv_sec - t1.tv_sec) * 1000000000L + (t2.tv_nsec - t1.tv_nsec);
```

경과 시간에는 그 사이에 다른 task가 CPU를 쓴 시간도 들어갑니다. Debian 게스트에서 같은 루프(10억 번 덧셈)를 CPU 0에 고정해 돌리고, 같은 CPU에 무한 루프 셸을 하나 더 띄워 비교했습니다(`bench/wallcpu.c`, `gcc -O2`, `taskset -c 0`, 각 3회).

| 조건 | wall-clock | thread CPU time |
|---|---|---|
| 혼자 실행 | 0.316 / 0.324 / 0.330 s | 0.316 / 0.324 / 0.330 s |
| 같은 CPU에 busy loop 하나 | 0.705 / 0.704 / 0.639 s | 0.353 / 0.352 / 0.319 s |

CPU를 나눠 쓰자 경과 시간은 두 배가 됐지만, 이 thread가 실제로 CPU를 쓴 시간은 거의 그대로입니다. "코드가 느려졌는가"와 "응답이 늦어졌는가"는 이렇게 다른 질문입니다.

### CPU Cycle

코어 cycle counter는 구간 동안 지나간 cycle을 셉니다. ARMv7-M Architecture Reference Manual(DDI 0403E) C1.8.3에 따르면 DWT의 `CYCCNT`는 프로세서 클럭 한 cycle마다 1씩 증가하고, 프로세서가 Debug state에서 halt된 동안에는 증가하지 않습니다. 구간 안에 인터럽트가 들어오면 ISR이 쓴 cycle도 함께 세어지므로, CYCCNT 차이는 "이 함수만의 cycle"이 아니라 "이 구간의 cycle"입니다.

```c
// Cortex-M
uint32_t start = DWT->CYCCNT;
work();
uint32_t cycles = DWT->CYCCNT - start;
```

### Instruction Count

Armv8-A PMU의 `INST_RETIRED`(이벤트 0x08) 같은 카운터로 실행한 명령어 수를 셉니다. 같은 입력이면 실행 경로가 같으므로 명령어 수는 cycle보다 덜 흔들립니다. 1-02의 `sum` 측정(M2 Pro, `/usr/bin/time -l`)에서 instructions retired는 3회 실행 사이에 0.04% 안에서 같았고, cycles elapsed는 1.1% 차이 났습니다. 그래서 코드 변경이 *일의 양*을 줄였는지 볼 때 명령어 수를 씁니다.

## Bare-Metal — DWT_CYCCNT

`CYCCNT`는 아키텍처에서 *선택 사항*입니다. DDI 0403E C1.8.3은 이 카운터를 "optional free-running 32-bit cycle counter"로 정의하고, 구현되어 있으면 `DWT_CTRL.NOCYCCNT`가 0으로 읽힌다고 적습니다. 그래서 초기화 전에 이 비트부터 봅니다.

```c
// Initialization (once)
CoreDebug->DEMCR |= CoreDebug_DEMCR_TRCENA_Msk;   /* DEMCR bit 24 */
if (DWT->CTRL & DWT_CTRL_NOCYCCNT_Msk) {
    /* CYCCNT 없음: SysTick이나 SoC 타이머로 대체 */
}
DWT->CYCCNT = 0;
DWT->CTRL |= DWT_CTRL_CYCCNTENA_Msk;

// Use
uint32_t start = DWT->CYCCNT;
work();
uint32_t cycles = DWT->CYCCNT - start;
uint64_t us = (uint64_t)cycles * UINT64_C(1000000) / SystemCoreClock;
```

32비트 카운터이므로 168 MHz에서는 2³² / 168×10⁶ ≈ 25.6초마다 한 바퀴 돕니다. unsigned 뺄셈은 한 번의 wrap까지는 올바른 차이를 주므로, 측정 구간은 이보다 짧아야 합니다.

**QEMU에서는 쓸 수 없습니다.** `qemu-system-arm -M mps2-an386`(Cortex-M4, QEMU 11.1.3)에서 위 초기화를 한 뒤 읽어 보면 세 번 실행 모두 `DWT_CTRL = 0x00000000`, 루프 전후 `CYCCNT`가 둘 다 0이었습니다(`qemu-m/dwt.c`). 같은 프로그램에서 SysTick은 감소했지만, 같은 1000회 루프에 대해 실행마다 0x15e, 0x113, 0x145 tick으로 달랐습니다. QEMU의 SysTick은 명령어 수가 아니라 호스트 시간을 따르므로, QEMU에서 잰 시간은 하드웨어 타이밍이 아닙니다.

### Cortex-M0/M0+의 대체 타이머

Cortex-M0+ TRM(DDI 0484C) 7.1.3에 따르면 M0+의 DWT는 0~2개의 watchpoint와 PC 샘플링 레지스터를 제공하고, cycle counter는 그 기능 목록에 없습니다. CMSIS의 `core_cm0.h`와 `core_cm0plus.h`에는 `DWT` 구조체 정의 자체가 없습니다. 같은 TRM 5.1.1은 SysTick도 *선택 사항*인 24비트 타이머로 적습니다. 그래서 M0 계열에서는 SoC 타이머를 쓰거나, SysTick이 구현됐는지 확인한 뒤 씁니다.

```c
uint32_t systick_elapsed(uint32_t start_val, uint32_t now_val) {
    /* SysTick은 감소 카운터: 경과 = 시작값 - 현재값 (한 주기 안에서만) */
    return (start_val - now_val) & 0x00FFFFFFu;
}
```

ARMv7-M ARM B3.3.1에 따르면 SysTick은 `SYST_CVR`에서 0까지 감소한 뒤 다음 클럭에 `SYST_RVR` 값을 다시 읽어 들이고(wrap), 0에 도달할 때 `COUNTFLAG`를 1로 만듭니다. 인터럽트는 `SYST_CSR.TICKINT`가 1일 때만 pending됩니다(B3.3.3). 그래서 측정 구간이 한 reload 주기를 넘을 수 있으면 `COUNTFLAG`나 tick 인터럽트 횟수로 wrap 수를 함께 셉니다.

## Linux — clock_gettime

Linux man-pages 6.9.1의 `clock_gettime(2)`가 정의하는 clock은 다음과 같습니다.

| Clock | man page의 설명 |
| --- | --- |
| `CLOCK_REALTIME` | 설정 가능한 wall-clock. 관리자가 시간을 바꾸면 불연속으로 뛰고, NTP 주파수 조정의 영향을 받음 |
| `CLOCK_MONOTONIC` | 설정 불가. Linux에서는 부팅 후 시간. 불연속 점프는 없지만 주파수 조정은 받음. suspend 시간은 세지 않음 |
| `CLOCK_MONOTONIC_RAW` | `CLOCK_MONOTONIC`과 같되 주파수 조정을 받지 않는 raw 하드웨어 기반 시간 |
| `CLOCK_PROCESS_CPUTIME_ID` | 이 프로세스의 모든 thread가 쓴 CPU 시간 |
| `CLOCK_THREAD_CPUTIME_ID` | 이 thread가 쓴 CPU 시간 |

1-02에서 본 것처럼 `clock_getres()`가 1 ns를 돌려줘도 실제 값은 24 MHz 카운터(약 41.7 ns) 단위로 바뀝니다.

## arm64 — CNTVCT_EL0 직접 읽기

x86의 RDTSC에 해당하는 것이 arm64에서는 generic timer의 가상 카운터 `CNTVCT_EL0`입니다. Linux는 사용자 공간에서 이 레지스터를 읽게 해 주고, vDSO의 `clock_gettime()`도 이것을 읽습니다. Linux 6.12의 `arch/arm64/include/asm/vdso/gettimeofday.h` 69~100행 `__arch_get_hw_counter()`는 읽기 앞에 `isb`를 두고, 주석에 그 이유를 "the isb is required to prevent that the counter value is speculated"라고 적습니다. FEAT_ECV가 있는 코어에서는 자체 동기화되는 `CNTVCTSS_EL0`를 대신 읽습니다. 커널 쪽 `arch/arm64/include/asm/arch_timer.h` 200~210행 `__arch_counter_get_cntvct()`도 같은 구성입니다.

```c
static inline uint64_t cntvct(void) {
    uint64_t v;
    __asm__ volatile("isb; mrs %0, cntvct_el0" : "=r"(v) :: "memory");
    return v;
}
```

주파수는 `CNTFRQ_EL0`에서 읽습니다. M2 Pro 호스트와 Debian 게스트 모두 24,000,000 Hz였습니다.

## PMU — Hardware Performance Counters

Armv8-A 코어의 *Performance Monitors Unit*은 cycle 외에도 cache refill, 분기 예측 실패 같은 이벤트를 셉니다. Linux 6.12 `include/linux/perf/arm_pmuv3.h`의 공통 이벤트 번호는 다음과 같습니다.

| 이벤트 | 번호 |
|---|---|
| `L1D_CACHE_REFILL` | 0x03 |
| `INST_RETIRED` | 0x08 |
| `BR_MIS_PRED` | 0x10 |
| `CPU_CYCLES` | 0x11 |
| `L2D_CACHE_REFILL` | 0x17 |

cycle counter는 `PMCCNTR_EL0`입니다. Linux에서 사용자 공간이 PMU 레지스터를 직접 읽는 정식 경로는 `Documentation/arch/arm64/perf.rst` 116~132행에 있습니다. `kernel.perf_user_access`를 1로 켜고, `perf_event_open()`을 `config1`의 bit 1을 세워 연 뒤 mmap한 페이지에서 카운터 번호를 받아 `mrs`로 읽습니다. 이 시리즈에서는 perf를 씁니다.

```bash
perf stat -e cycles,instructions -- ./app
```

카운터보다 이벤트가 많으면 perf는 이벤트를 번갈아 카운터에 올립니다(multiplexing). perf-stat man page는 hybrid 이벤트 예제에서 이 백분율을 "the event's running time/enabling time"으로 설명합니다. 100%가 아니면 perf는 enabled 시간 동안 센 것으로 환산한(scaled) 값을 보여 줍니다.

이 시리즈의 HVF 게스트는 범용 카운터가 0개여서 `perf stat -e cycles`가 `<not supported>`를 돌려줍니다(1-01). 그런데 같은 게스트에서 `kernel.perf_user_access = 0`인 채로 EL0에서 `mrs pmccntr_el0`를 실행하면 trap 없이 값이 읽혔고, 1억 번 루프 동안 9.7~9.8×10⁷ 증가했습니다(`bench/pmccntr2.c`, 3회). 같은 구간의 `CNTVCT_EL0`로 잰 시간이 32 ms였으니 약 3.1 GHz로 증가한 셈입니다. 이것은 문서화된 경로가 아니고 HVF가 그렇게 처리한 결과일 뿐이므로, 이 값에 기대지 않습니다.

## GPIO + 로직 분석기 — 외부 측정

외부 계측은 CPU 안의 카운터에 기대지 않으므로, 카운터가 없거나 debug 인증이 꺼진 보드에서도 씁니다. 코드에 GPIO 전환을 넣고 로직 분석기나 오실로스코프로 펄스 폭을 잽니다. GPIO 쓰기 자체도 버스를 거치는 store이므로, 빈 구간(SET 직후 CLR)의 펄스 폭을 먼저 재서 빼 줍니다. 이 글에서는 보드로 재지 않았습니다.

```c
void critical_function(void) {
    GPIO_SET(DEBUG_PIN);
    work();
    GPIO_CLR(DEBUG_PIN);
}
```

### 두 이벤트 사이의 지연

ISR 진입 때 한 핀, 그 ISR이 깨운 task가 실행을 시작할 때 다른 핀을 토글하면, 두 엣지 사이의 시간이 "인터럽트 → task 실행" 지연입니다.

```c
void UART_IRQHandler(void) {
    GPIO_TOGGLE(IRQ_PIN);
    /* ... 수신 처리, task 깨우기 ... */
}

void rx_task(void *arg) {
    for (;;) {
        ulTaskNotifyTake(pdTRUE, portMAX_DELAY);
        GPIO_TOGGLE(TASK_PIN);
        /* ... */
    }
}
```

## Overhead 줄이기

측정 코드도 시간을 씁니다. 호스트에서 잴 수 있는 것은 직접 쟀습니다(`bench/tcost.c`, 100만 회 × 7묶음의 중앙값).

| 측정 | Debian 게스트 (`gcc -O2`) | M2 Pro macOS (`clang -O2`) |
| --- | ---: | ---: |
| `clock_gettime(CLOCK_MONOTONIC_RAW)` | 17.6 ns | 17.0 ns |
| `clock_gettime(CLOCK_THREAD_CPUTIME_ID)` | 175.2 ns | 112.2 ns |
| `isb; mrs cntvct_el0` | 10.7 ns | 10.1 ns |
| `fprintf(null, "%d\n", i)` (`/dev/null`, 버퍼링) | 29.8 ns | 56.0 ns |

차이는 Linux 소스에서 보입니다. `include/vdso/datapage.h` 29~35행이 vDSO에서 바로 처리하는 clock을 `VDSO_HRES`(REALTIME·MONOTONIC·BOOTTIME·TAI), `VDSO_COARSE`, `VDSO_RAW`(MONOTONIC_RAW)로 정하고, `lib/vdso/gettimeofday.c`의 `__cvdso_clock_gettime_common()`은 그 밖의 clock에 -1을 돌려 syscall fallback으로 보냅니다. 그래서 `CLOCK_THREAD_CPUTIME_ID`는 매번 커널에 들어가고 게스트에서 10배 비쌉니다. `printf`는 버퍼에 쓰는 동안은 수십 ns이고, 비싼 것은 출력 장치로 나가는 순간입니다. 임베디드에서 printf가 UART로 나가면 115200 baud 8N1에서 글자 하나가 10비트이므로 86.8 µs이고, 20글자 한 줄이면 1.74 ms입니다. DWT 읽기와 GPIO 토글 비용은 보드에서 재야 하는데, 이 글에서는 재지 않았습니다.

측정값을 출력하지 않고 메모리에 쌓아 두는 **lightweight tracing**의 예입니다.

```c
#define TRACE_SIZE 256u
_Static_assert((TRACE_SIZE & (TRACE_SIZE - 1u)) == 0u, "power of two");

struct trace_record {
    uint32_t cycles;
    uint16_t event_id;
    uint16_t data;
};
static struct trace_record trace_buf[TRACE_SIZE];   /* TRACE_SIZE는 2의 거듭제곱 */
static volatile uint32_t trace_idx;

#define TRACE(id, data) do { \
    uint32_t i = trace_idx++ & (TRACE_SIZE - 1); \
    trace_buf[i].cycles = DWT->CYCCNT; \
    trace_buf[i].event_id = (event_value); \
    trace_buf[i].data = (payload_value); \
} while (0)
```

`trace_idx++`는 원자적이지 않습니다. ISR과 task가 같은 버퍼에 쓰면 인덱스가 겹칠 수 있으므로, writer를 하나로 두거나 증가를 인터럽트 금지 구간 또는 `LDREX`/`STREX`로 감쌉니다. 버퍼가 차면 오래된 기록을 덮어씁니다.

## SystemView / SEGGER RTT

SEGGER SystemView는 이런 trace 기록을 PC에서 타임라인으로 보여 주는 도구입니다. 타깃 쪽 소스는 SEGGER RTT 위에서 동작하고, README는 RTT 저장소를 함께 넣으라고 적습니다. ISR 진입·종료는 SystemView 소스(`SYSVIEW/SEGGER_SYSVIEW.h` 310~311행)에 선언된 두 함수로 기록합니다. 이 글에서는 실행하지 않았습니다.

```c
#include "SEGGER_SYSVIEW.h"
SEGGER_SYSVIEW_RecordEnterISR();
// ... ISR work
SEGGER_SYSVIEW_RecordExitISR();
```

## Hardware Trace (ETM·ITM)

Cortex-M4 TRM(DDI 0439B) 2.1은 명령어 trace용 ETM을 *선택 사항*으로 적습니다.

**ITM (Instrumentation Trace Macrocell)**은 소프트웨어가 stimulus port 레지스터에 쓰면 그 값을 trace 패킷으로 내보냅니다. ARMv7-M ARM C1.7.1은 stimulus port를 최대 256개까지, 8의 배수로 허용하고, Cortex-M4 TRM 표 10-1은 M4에 ITM_STIM0~31, 즉 32개가 있다고 적습니다.

```c
if ((ITM->TCR & ITM_TCR_ITMENA_Msk) && (ITM->TER & 1u)) {
    while (ITM->PORT[0].u32 == 0) { }   /* 출력 버퍼가 비기를 기다림 */
    ITM->PORT[0].u8 = 'A';
}
```

CMSIS `core_cm4.h`의 `ITM_SendChar()`도 ITM과 port 0이 켜졌는지 먼저 보고 같은 순서로 씁니다. 확인을 빼면 안 됩니다. C1.7.1에 따르면 ITM이나 그 port가 꺼진 상태에서 stimulus port를 읽으면 "버퍼가 가득 참"을 뜻하는 값이 돌아오므로, 디버거가 ITM을 켜지 않은 보드에서는 대기 루프가 끝나지 않습니다. C1.7.1에 따르면 ITM의 출력 버퍼 크기는 구현 정의이고, 버퍼가 차 있으면 이 대기 루프가 길어집니다. 즉 ITM 쓰기의 비용은 trace 출력 속도에 묶여 있습니다.

## PGO

Profile-Guided Optimization은 측정 도구가 아니라 측정 결과를 컴파일러에 되먹이는 기법이라 1-08에서 다룹니다.

## 자주 하는 실수

> ⚠️ Wall-clock으로 CPU 시간 측정

위 게스트 측정에서 CPU를 나눠 쓰자 wall-clock은 0.70 s, thread CPU 시간은 0.35 s였습니다. 코드의 비용을 보려면 CPU 시간이나 cycle을, 응답성을 보려면 wall-clock을 씁니다.

> ⚠️ DWT_CYCCNT가 움직이지 않는다

ARMv7-M ARM C1.3.1에 따르면 DBGEN, HALTED, NIDEN이 모두 0이면 프로세서는 `DEMCR.TRCENA`가 0인 것처럼 동작해야 하고, 같은 절은 이때 DWT가 꺼지고 카운터가 세지 않는다고 적습니다. 양산 보드에서 DBGEN·NIDEN을 끄면 이 조건에 걸립니다. QEMU에서는 DWT 자체가 동작하지 않습니다.

> ⚠️ 카운터 읽기 순서를 강제하지 않음

Linux가 `CNTVCT_EL0`를 읽기 전에 `isb`를 두는 이유는, 그렇지 않으면 측정 구간 안의 명령어가 끝나기 전에 카운터가 읽힐 수 있기 때문입니다. 직접 읽을 때도 같은 장벽을 둡니다.

> ⚠️ printf로 timing 측정

버퍼에 쓰는 printf는 수십 ns지만, UART로 나가는 printf는 한 줄에 ms 단위입니다. 반복 안에서는 trace buffer에 쌓고, 출력은 측정이 끝난 뒤에 합니다.

## 정리

- Wall-clock, CPU 시간, 명령어 수는 서로 다른 질문에 답합니다. CPU를 나눠 쓰면 앞의 둘이 두 배 차이 납니다.
- DWT `CYCCNT`는 ARMv7-M에서 선택 사항이고 `NOCYCCNT`로 확인합니다. Cortex-M0+에는 없고, QEMU에서는 0만 읽힙니다.
- Linux에서는 `CLOCK_MONOTONIC_RAW`(vDSO)와 perf를 씁니다. 이 글의 HVF 게스트에서 호출 하나는 약 17 ns였습니다. arm64에서 직접 읽을 때는 `isb; mrs cntvct_el0`입니다.
- GPIO와 로직 분석기는 카운터가 없는 보드에서도 쓸 수 있는 외부 측정입니다.
- 측정값은 trace buffer에 쌓아 두고, 출력은 측정이 끝난 뒤에 합니다.

다음 편은 **통계적 분석**입니다. percentile과 histogram을 다룹니다.

## 관련 항목

- [1-04: 통계적 분석](/blog/embedded/performance-engineering/part1-04-statistics)
- [2-10: PMU와 하드웨어 카운터](/blog/embedded/performance-engineering/part2-10-pmu)
- [5-07: Bare-metal 프로파일링](/blog/embedded/performance-engineering/part5-07-baremetal-profiling)

## 참고 자료

- ARMv7-M Architecture Reference Manual (DDI 0403E): B3.3 SysTick, C1.3.1 Debug authentication, C1.7.1 ITM, C1.8.3 CYCCNT
- Cortex-M4 Technical Reference Manual (DDI 0439B): 2.1, 표 10-1
- Cortex-M0+ Technical Reference Manual (DDI 0484C): 5.1.1, 7.1.3
- Linux man-pages 6.9.1, `clock_gettime(2)`, `perf-stat(1)`
- Linux v6.12: `arch/arm64/include/asm/arch_timer.h`, `include/linux/perf/arm_pmuv3.h`, `Documentation/arch/arm64/perf.rst`
- [SEGGER SystemView 소스](https://github.com/SEGGERMicro/SystemView), [CMSIS_5 Core 헤더](https://github.com/ARM-software/CMSIS_5/tree/develop/CMSIS/Core/Include)
