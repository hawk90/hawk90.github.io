---
title: "동기화 기초 분석 — Critical Section·Mutual Exclusion·Race Condition"
slug: "embedded/rtos/practical-internals/part1-06-sync-basics"
date: 2026-05-04T09:06:00
description: "공유 자원 보호의 3가지 도구로 interrupt disable, spinlock, mutex가 있습니다. 언제 어느 것을 쓰는지 정리합니다."
series: "Practical RTOS Internals"
seriesOrder: 6
tags: [sync, critical-section, mutex, race-condition, atomic]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **"공유 데이터엔 동기화"** — 공유 데이터의 read-modify-write와 게시 순서를 구분합니다. 짧고 정확한 보호가 핵심입니다.

## Race Condition — 가장 까다로운 버그

```c
// 두 task가 같은 counter 증가
volatile uint32_t counter = 0;

void task_a(void *arg) {
    while (1) { counter++; vTaskDelay(1); }
}

void task_b(void *arg) {
    while (1) { counter++; vTaskDelay(1); }
}
```

`counter++`이 한 줄이지만, arm-none-eabi-gcc 16.2.0 `-mcpu=cortex-m3 -O2`로 컴파일하면 세 명령입니다([1-05](/blog/embedded/rtos/practical-internals/part1-05-interrupts-rtos)에서 objdump로 확인).

```text
ldr	r3, [r2, #0]     ; (1) read
adds	r3, #1           ; (2) increment
str	r3, [r2, #0]     ; (3) write
```

**3 단계 사이에 preempt 되면** 다른 task가 같은 값을 read 하면서 증가분을 잃습니다. 공용 화이트보드의 숫자를 두 사람이 번갈아 고치는 상황과 같습니다. A가 "5"를 읽고 계산하는 사이 B가 "5"를 읽어 "6"을 쓰고, A도 "6"을 쓰면 하나가 사라집니다.

```text
시점 →
Task A: read=5 . . . . . . . . . . . . . . . . . . increment=6, write=6
Task B: . . . . . . read=5 . . . increment=6, write=6 . . . . . .
결과: counter = 6 (7이 맞음)
```

### QEMU에서 실제로 잃어 보기

말로만 보면 드문 일 같아서 실제로 돌려 봤습니다. 같은 우선순위 2의 task 둘이 각각 `counter++`를 200,000번 하고, time slicing이 tick마다 둘을 번갈아 돌립니다. `PROTECT=1`이면 증가를 `taskENTER_CRITICAL()`로 감쌉니다.

```c title="race.c (발췌)"
#define N 200000u
static volatile uint32_t counter;
static void worker(void*a){ (void)a;
  for(uint32_t i=0;i<N;i++){
#if PROTECT
    taskENTER_CRITICAL(); counter++; taskEXIT_CRITICAL();
#else
    counter++;
#endif
  }
  /* ... 둘 다 끝나면 출력 ... */ }
```

FreeRTOS V11.2.0 `ARM_CM3`, arm-none-eabi-gcc 16.2.0 `-O2`, QEMU 11.1.3 `mps2-an385 -icount shift=5`의 결과입니다.

```text
PROTECT=0 expected=400000 counter=249799 lost=150201 ticks=64
PROTECT=1 expected=400000 counter=400000 lost=0 ticks=410
```

보호하지 않으면 40만 번 중 15만 번이 사라졌습니다. 한 번 끼어들 때 하나만 잃는 것이 아닙니다. A가 `ldr`와 `str` 사이에서 선점되면 B가 1 tick 동안 수천 번 올린 값을, 다시 돌아온 A가 옛 값 + 1로 덮어씁니다. 64 tick 동안 이런 전환이 수십 번 일어나면 손실이 이만큼 커집니다. `volatile`을 붙였는데도 그렇습니다.

보호하면 손실은 0이지만 같은 일에 410 tick이 걸렸습니다. icount 모드에서 tick은 실행한 명령 수에 비례하므로, 이 차이는 critical section 진입·탈출(BASEPRI 쓰기, nesting 카운터, barrier)이 반복마다 더한 명령 수를 보여 줍니다. 실제 보드의 시간 비율은 아닙니다.

## Critical Section — 보호 구간

"이 코드 블록은 원자적으로 실행한다"는 목표를 달성하기 위한 3가지 도구를 살펴봅니다.

### 1. Interrupt Disable

해당 코어의 IRQ를 막는 도구입니다. PRIMASK는 NMI와 HardFault를 뺀 모든 설정 가능 예외를, BASEPRI는 지정한 값 이상의 우선순위만 막습니다(1-04의 디스어셈블). 어느 쪽이든 다른 코어와 DMA는 막지 못합니다.

```c
// CMSIS Cortex-M. unprivileged에서 PRIMASK 쓰기는 무시됨 (DDI 0403E.b B5.2.3 MSR)
uint32_t old_mask = __get_PRIMASK();
__disable_irq();
counter++;
__set_PRIMASK(old_mask); // 진입 전 이미 disabled였다면 그대로 보존

// 또는 FreeRTOS API
taskENTER_CRITICAL();
counter++;
taskEXIT_CRITICAL();
```

#### 장단점

- ✓ 마스킹 범위에 속하는 ISR과의 접근을 해당 코어에서 분리할 수 있습니다
- ✓ Spin·context switch가 없습니다
- ✗ 막힌 시간만큼 그 IRQ들의 응답이 늦어집니다(1-05의 latency 상한에 그대로 더해짐)
- ✗ 위 실험에서 반복마다 감싸자 명령 수가 64 → 410 tick 분량으로 늘었습니다

### 2. Spinlock (SMP)

여러 코어에서 동작합니다. busy-wait 방식입니다.

```c
spin_lock(&lock);
shared_data = value;
spin_unlock(&lock);
```

#### 장단점

- ✓ context switch 없이 기다립니다
- ✗ 단일 코어에서는 lock을 쥔 task를 선점한 쪽이 spin하면 보유자가 다시 돌 수 없어 영원히 돕니다. 그래서 spinlock을 쥐는 동안 그 코어의 선점과 IRQ를 함께 막습니다
- ✗ 보유 시간 동안 다른 코어는 일하지 못하고 spin 합니다(SMP는 [4-08](/blog/embedded/rtos/practical-internals/part4-08-spinlock-smp))

### 3. Mutex (Task 간)

Blocking 방식입니다. 대기 task가 Blocked 상태로 전환됩니다.

```c
if (xSemaphoreTake(mutex, portMAX_DELAY) == pdTRUE) {
    shared_data = value;
    configASSERT(xSemaphoreGive(mutex) == pdTRUE);
}
```

#### 장단점

- ✓ 기다리는 task는 Blocked가 되어 CPU를 다른 task에 넘깁니다
- ✓ FreeRTOS mutex는 priority inheritance를 합니다(Mars Pathfinder의 수정이 VxWorks mutex의 이 옵션을 켠 것, [1-03](/blog/embedded/rtos/practical-internals/part1-03-scheduling-algorithms))
- ✗ 경합하면 context switch가 두 번 일어납니다
- ✗ ISR에서는 사용할 수 없습니다(`semphr.h` L703)

## 선택 기준

| 상황 | 도구 | 이유 |
| --- | --- | --- |
| ISR과 task 공유 | critical section(task 쪽) + `..._FROM_ISR`(ISR 쪽) | mutex는 ISR에서 못 씀 |
| task 간 자원 보호, 보유 중 대기 가능 | mutex | 기다리는 task가 CPU를 넘김, PI |
| SMP 공유 상태 | spinlock + 그 코어의 IRQ/선점 차단 | 다른 코어는 IRQ mask로 못 막음 |
| 정수 하나 갱신·게시 | C11 atomic | 아래처럼 LDREX/STREX 한 루프 |

어느 쪽이 "짧다"고 볼지는 그 구간 동안 늦어지는 IRQ·task의 마감이 정합니다.

## Atomic Operations

C11 atomic API는 언어 수준의 원자성과 순서 계약입니다. 어떤 명령으로 바뀔지는 타깃이 정합니다.

```c
#include <stdatomic.h>

atomic_int counter = 0;
atomic_fetch_add(&counter, 1);   // counter++ atomic
```

위 코드를 arm-none-eabi-gcc 16.2.0 `-O2 -std=c11`로 Cortex-M3와 Cortex-M0 두 타깃에 대해 따로 컴파일했습니다. Cortex-M3에서는 exclusive 재시도 루프가 됩니다.

```text
00000000 <bump>:
   0:	dmb	ish
   4:	ldr	r3, [pc, #20]	@ (1c <bump+0x1c>)
   6:	ldrex	r1, [r3]
   a:	adds	r1, #1
   c:	strex	r2, r1, [r3]
  10:	cmp	r2, #0
  12:	bne.n	6 <bump+0x6>
  14:	dmb	ish
  18:	bx	lr
```

`strex`가 실패(r2 ≠ 0)하면 `ldrex`부터 다시 합니다. 기본 순서가 `memory_order_seq_cst`이므로 앞뒤에 `dmb`가 붙었습니다. LDREX/STREX가 없는 ARMv6-M(Cortex-M0)에서는 같은 코드가 라이브러리 호출이 됩니다.

```text
00000000 <bump>:
   0:	push	{r4, lr}
   2:	movs	r2, #5
   4:	movs	r1, #1
   6:	ldr	r0, [pc, #8]	@ (10 <bump+0x10>)
   8:	bl	0 <__atomic_fetch_add_4>
   c:	pop	{r4, pc}
```

`nm`이 `U __atomic_fetch_add_4`를 보여 주듯 이 심볼은 링크 시 누군가 제공해야 합니다(`r2 = 5`는 `__ATOMIC_SEQ_CST`). [GCC 문서](https://gcc.gnu.org/onlinedocs/gcc/_005f_005fatomic-Builtins.html)는 "If there is no pattern or mechanism to provide a lock-free instruction sequence, a call is made to an external routine with the same parameters to be resolved at run time."이라고 적습니다. 같은 C 코드라도 Cortex-M0에서는 시간과 ISR 안전성이 그 라이브러리 구현에 달려 있다는 뜻입니다.

CAS 등의 원자 연산은 lock-free 알고리즘의 재료이지만, 연산 하나가 lock-free라고 전체 알고리즘이 wait-free이거나 ISR 안전한 것은 아닙니다.

## Memory Ordering — Reordering 함정

CPU의 메모리 모델뿐 아니라 C 언어의 data race 규칙을 지켜야 합니다. 서로 다른 C thread가 일반 변수 `ready`를 동기화 없이 읽고 쓰면 data race이고 N1570 5.1.2.4p25에 따라 undefined behavior입니다. 그래서 producer 쪽에 barrier 하나를 추가해도 그 data race를 없애지 못합니다.

다음은 one-shot 게시를 보여주는 완전한 호스트 예제입니다. producer가 `data`를 쓴 뒤 atomic `ready`에 release로 게시하고, consumer가 acquire로 관찰한 뒤 읽습니다. 게시 후 `data`를 다시 수정하지 않으며 모든 thread가 끝날 때까지 저장 공간을 유지합니다.

```c title="publication.c"
#include <assert.h>
#include <pthread.h>
#include <stdatomic.h>
#include <stdio.h>
static int data;
static atomic_bool ready = 0;
static void *producer(void *unused) {
    (void)unused;
    data = 42;
    atomic_store_explicit(&ready, 1, memory_order_release);
    return NULL;
}
static void *consumer(void *unused) {
    (void)unused;
    while (!atomic_load_explicit(&ready, memory_order_acquire)) {}
    assert(data == 42);
    return NULL;
}
int main(void) {
    pthread_t a, b;
    assert(pthread_create(&a, NULL, consumer, NULL) == 0);
    assert(pthread_create(&b, NULL, producer, NULL) == 0);
    assert(pthread_join(a, NULL) == 0);
    assert(pthread_join(b, NULL) == 0);
    puts("PASS one-shot release/acquire publication");
}
```

```bash
clang -std=c11 -Wall -Wextra -Werror -pthread publication.c -o publication
./publication
```

Apple clang 21.0.0(macOS)에서 `PASS one-shot release/acquire publication`을 출력했습니다. 이 프로그램이 보여 주는 것은 호스트 thread 사이의 게시 규칙입니다. DMA가 쓴 버퍼를 CPU가 읽을 때는 이 규칙 말고도 cache clean/invalidate가 필요합니다.

## False Sharing — Cache 함정

```c
struct {
    int counter_a;        // CPU 0이 자주 쓰기
    int counter_b;        // CPU 1이 자주 쓰기
} shared;                  // 두 int가 같은 cache line에 들어감
```

CPU 0이 `counter_a`에 write 하면 cache line 전체가 CPU 0의 cache로 들어옵니다. CPU 1이 `counter_b`에 write 하면 line이 CPU 1로 이동합니다. 두 사람이 한 권의 공책 다른 페이지에 쓰려고 공책을 계속 주고받는 꼴입니다. 줄이려면 두 변수를 다른 line에 둡니다. line 크기는 코어마다 다르며 CCSIDR의 LineSize 필드로 읽습니다. 예를 들어 Cortex-M7의 L1 cache line은 32바이트입니다(ARM DDI 0489D 3.3.4 "Cache Size ID Register", LineSize 0x1 = 32 bytes). 단일 코어이고 cache가 없는 Cortex-M3·M4에서는 이 문제가 생기지 않습니다. 아래 64는 line이 64바이트인 SMP 코어를 가정한 값입니다. C11에서는 `_Alignas(64)` 또는 `<stdalign.h>`의 `alignas`를 사용합니다.

```c
struct {
    alignas(64) int counter_a;
    alignas(64) int counter_b;
};
```

## Critical Section 길이 — 예산에서 정하기

critical section의 길이는 그대로 그 구간에 막힌 IRQ의 최악 지연에 더해집니다. 1-05의 Cortex-M4 하드웨어 진입 상한 12 cycle은 critical section이 없을 때의 값입니다. 주변 장치가 그 사이 데이터를 몇 개까지 버퍼에 쥐고 있을 수 있는지(FIFO 깊이)가 구간 길이의 또 다른 상한입니다. print나 다른 lock 취득처럼 길이가 정해지지 않은 일은 이 구간에 넣지 않습니다.

## Volatile — 동기화 ≠

`volatile`은 구현 규칙에 따른 관찰 가능한 접근을 지정합니다. 모든 최적화를 끄는 기능은 아니며, 원자성·다른 데이터의 게시 순서·thread 간 동기화를 보장하지 않습니다.

```c
volatile int counter = 0;
counter++;  // 여전히 3-instruction → race condition
```

위 `race.c`의 `counter`도 `volatile`이었지만 15만 번을 잃었습니다. `volatile`은 MMIO 레지스터처럼 "읽고 쓰는 것 자체가 의미 있는" 접근에 씁니다. ISR과 공유하는 1바이트 flag는 byte 접근이 single-copy atomic이라(DDI 0403E.b A3.5.3) 찢어지지는 않지만, 두 번 세워도 한 번으로 보이는 점은 그대로입니다.

## FreeRTOS API 요약

| API | 효과 |
| --- | --- |
| `taskENTER_CRITICAL()` | Cortex-M: BASEPRI ← `configMAX_SYSCALL_INTERRUPT_PRIORITY`, nesting +1 |
| `taskEXIT_CRITICAL()` | nesting −1, 0이 되면 BASEPRI ← 0 |
| `taskENTER_CRITICAL_FROM_ISR()` | 이전 BASEPRI를 반환하고 올림(1-04 objdump) |
| `vTaskSuspendAll()` | `uxSchedulerSuspended`를 올려 전환만 막음. IRQ는 그대로 들어옴([`tasks.c` L3837](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L3837)) |
| `xTaskResumeAll()` | 0이 되면 그동안 밀린 tick과 ready task를 처리 |
| `portDISABLE_INTERRUPTS()` | Cortex-M: `vPortRaiseBASEPRI()`, nesting 없음 |

## 자주 하는 실수

> ⚠️ `volatile`로 race condition 해결 시도

위에서 설명했듯이 atomic API 또는 critical section이 필요합니다.

> ⚠️ Critical section 안에서 long work

긴 critical section은 보호 범위의 IRQ와 해당 코어 task 전환을 지연시킵니다. 더 높은 urgency의 IRQ·다른 코어까지 모두 막히는 것은 아닙니다. 짧게 유지해야 합니다.

> ⚠️ Memory barrier 누락

ARMv7의 Normal 메모리는 접근 순서가 프로그램 순서와 다르게 관찰될 수 있습니다(DDI 0403E.b A3.7 "Memory access order"). 그래서 위 Cortex-M3 atomic 코드에 `dmb`가 붙었습니다. CPU thread끼리는 언어 atomic이나 lock을 쓰고, DMA와 MMIO는 cache 유지 연산과 barrier를 따로 넣습니다.

> ⚠️ Mutex를 ISR에서

FreeRTOS `semphr.h`는 mutex 생성 함수마다 "Mutex type semaphores cannot be used from within interrupt service routines"라고 적습니다. ISR 쪽은 binary/counting semaphore의 `xSemaphoreGiveFromISR()`나 task notification을 씁니다(1-05).

## 정리

- Race condition은 공유 데이터, 동시 접근, 동기화 없음이 합쳐질 때 발생합니다. QEMU 실험에서 보호 없는 `counter++` 40만 번 중 15만 번이 사라졌습니다.
- 보호 도구 3종은 **IRQ disable**, **Spinlock(SMP)**, **Mutex**입니다.
- 짧은 작업은 IRQ disable, 긴 작업은 mutex가 적합합니다.
- **Atomic API**는 Cortex-M3에서 LDREX/STREX 루프, Cortex-M0에서는 `__atomic_fetch_add_4` 호출이 됩니다.
- `volatile`, atomic, memory barrier는 셋 다 별개의 개념입니다.

다음 편에서는 **Semaphore 개념**으로 Counting과 Binary, 사용 패턴을 다룹니다.

## 1차 자료와 검증 범위

- [C11 N1570](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf) §5.1.2.4·§7.17: data race와 atomic 순서
- [GCC atomic builtins](https://gcc.gnu.org/onlinedocs/gcc/_005f_005fatomic-Builtins.html): target의 lock-free 여부와 helper 조건
- [FreeRTOS V11.2.0 ARM_CM4F portmacro.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/portmacro.h): mask 범위
- ARM DDI 0403E.b A3.5.3(single-copy atomicity), A3.7(memory access order); ARM DDI 0489D(Cortex-M7 TRM) 3.3.4

race·atomic 결과는 FreeRTOS V11.2.0 `ARM_CM3`, arm-none-eabi-gcc 16.2.0, QEMU 11.1.3 `mps2-an385`에서 얻었고, tick 수는 icount 가상 시간입니다. spinlock 조각은 개념 코드입니다.

## 관련 항목

- [1-05: 인터럽트와 RTOS](/blog/embedded/rtos/practical-internals/part1-05-interrupts-rtos)
- [1-07: Semaphore 개념](/blog/embedded/rtos/practical-internals/part1-07-semaphore)
- [3-01: Critical Section 구현](/blog/embedded/rtos/practical-internals/part3-01-critical-section)
