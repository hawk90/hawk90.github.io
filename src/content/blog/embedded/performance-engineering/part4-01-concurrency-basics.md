---
title: "Concurrency 기초 — Concurrency vs Parallelism·Race·Memory Model"
slug: "embedded/performance-engineering/part4-01-concurrency-basics"
date: 2026-04-26T09:00:00
description: "Concurrency vs Parallelism (Rob Pike). Race condition. Memory model 도입."
series: "Embedded Performance Engineering"
seriesOrder: 30
tags: [concurrency, parallel, race, memory-model]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Concurrency는 처리할 일들의 조직이고, Parallelism은 동시 실행"** 이라는 Rob Pike의 정의가 출발점입니다.

이 글의 숫자는 모두 직접 돌린 결과입니다. 측정 환경은 두 가지입니다. 하나는 Apple M2 Pro(macOS 27.2.1, Apple clang 21.0.0) 네이티브이고, 다른 하나는 같은 Mac 위의 Debian 13 arm64 게스트(QEMU 11.1.3 HVF, 8 vCPU, 커널 6.12.116, GCC 14.2.0)입니다. 프로그램마다 5회씩 돌렸고, 본문에는 중앙값을 적습니다.

## Concurrency vs Parallelism

![Concurrency vs Parallelism — single core time-slicing과 multi-core 동시 실행 비교](/images/blog/perf-eng/diagrams/part4-01-concurrency.svg)

Rob Pike의 발표 "Concurrency is not parallelism"을 소개한 Go 블로그 글([Andrew Gerrand, go.dev/blog/waza-talk](https://go.dev/blog/waza-talk))은 둘을 이렇게 나눕니다. concurrency는 "독립적으로 실행되는 프로세스들의 구성(composition)"이고, parallelism은 "(서로 관련이 있을 수도 있는) 계산들의 동시 실행"입니다. 같은 글의 요약은 더 짧습니다. concurrency는 많은 일을 한꺼번에 *다루는* 것이고, parallelism은 많은 일을 한꺼번에 *하는* 것입니다.

식당 주방으로 비유하면 이해가 쉽습니다. 요리사 한 명이 국을 올려 두고 그 사이에 채소를 써는 것은 concurrency입니다. 요리사 두 명이 각자 다른 접시를 동시에 만드는 것은 parallelism입니다. 단일 코어 RTOS는 앞의 것만 제공하고, SMP Linux는 둘 다 제공합니다.

## Race Condition — 정의

여러 thread가 순서 보장 없이 공유 자원에 접근하고, 그 결과가 실행 순서에 따라 달라지는 상황을 race condition이라 합니다. 아래 코드는 `counter`를 1 늘리는 read-modify-write를 atomic load와 atomic store 두 번으로 나눴습니다. 두 연산 각각은 atomic이지만, 그 사이에 다른 thread가 끼어들 수 있습니다.

```c
#include <stdatomic.h>

atomic_int counter = 0;

void task1(void) {
    int old = atomic_load_explicit(&counter, memory_order_relaxed);
    atomic_store_explicit(&counter, old + 1, memory_order_relaxed);
}
void task2(void) {
    int old = atomic_load_explicit(&counter, memory_order_relaxed);
    atomic_store_explicit(&counter, old + 1, memory_order_relaxed);
}
```

두 함수는 원자 load와 store를 쓰므로 C 표준이 말하는 data race(정의되지 않은 동작)는 아닙니다. 하지만 read-modify-write 전체가 하나의 연산은 아니므로, 다음 순서로 실행되면 두 번 증가시켰는데 최종값이 1이 됩니다.

| 순서 | Thread 1 | Thread 2 | `counter` |
|---|---|---|---|
| 1 | load → 0 | | 0 |
| 2 | | load → 0 | 0 |
| 3 | store 1 | | 1 |
| 4 | | store 1 | 1 (2여야 함) |

이 순서가 실제로 얼마나 자주 나오는지 재 봤습니다. `lost.c`는 두 thread가 같은 카운터를 각각 100만 번 증가시킵니다. 세 가지 방식을 비교합니다.

```c title="lost.c (발췌)"
static volatile int plain;      /* -O1에서도 반복마다 load/store를 남기려고 volatile */
static atomic_int ac;
/* mode 0: plain++                       (data race, 정의되지 않은 동작) */
/* mode 1: load(relaxed) 후 store(relaxed) (data race는 아님, RMW는 비원자적) */
/* mode 2: atomic_fetch_add(relaxed)      */
for (long i = 0; i < N; i++) {
    if (mode == 0) plain++;
    else if (mode == 1) {
        int old = atomic_load_explicit(&ac, memory_order_relaxed);
        atomic_store_explicit(&ac, old + 1, memory_order_relaxed);
    } else atomic_fetch_add_explicit(&ac, 1, memory_order_relaxed);
}
```

빌드는 `cc -O1 -pthread lost.c -o lost`, 실행은 `./lost plain|ldst|fadd 1000000`입니다. 기대값 2,000,000 중 잃어버린 증가 횟수의 중앙값은 다음과 같습니다.

| 방식 | M2 Pro 네이티브 | Debian 게스트 |
|---|---:|---:|
| `volatile int` + `++` | 965,804 | 943,444 |
| atomic load + atomic store | 887,381 | 995,320 |
| `atomic_fetch_add` | 0 | 0 |

"드물게 일어나는 버그"가 아니라는 점이 핵심입니다. 두 thread가 계속 부딪히는 이 조건에서는 증가의 절반 가까이가 사라졌고, `atomic_fetch_add`만 다섯 번 모두 정확히 2,000,000이었습니다.

## Atomic

`atomic_fetch_add`는 read-modify-write 전체를 하나의 원자 연산으로 만듭니다.

```c
#include <stdatomic.h>

atomic_int counter = 0;
atomic_fetch_add(&counter, 1);   // 원자적
```

하드웨어가 이것을 어떻게 구현하는지는 target마다 다릅니다. 같은 `atomic_fetch_add_explicit(&v, 1, memory_order_relaxed)`를 세 target으로 컴파일해 보면 다음 명령이 나옵니다(`codegen.c`, `-O2 -S`).

| Target (컴파일러) | 생성된 명령 |
|---|---|
| ARMv7-A (`clang -target armv7a-none-eabi`) | `ldrex` / `add` / `strex` / `cmp` / `bne` 재시도 루프 |
| AArch64 기본 (`gcc`, Debian 14.2.0) | `bl __aarch64_ldadd4_relax` (outline atomics 헬퍼 호출) |
| AArch64 `-march=armv8.1-a` (`gcc`) | `ldadd w0, w0, [x1]` 한 명령 |
| x86-64 (`clang -target x86_64-linux-gnu`) | `lock xaddl` |

ARMv7 쪽 루프는 clang이 실제로 낸 출력입니다. `strex`가 실패하면(다른 접근이 exclusive monitor를 깼으면) 0이 아닌 값을 돌려주고 처음으로 돌아갑니다.

```text
	ldrex	r0, [r1]
	add	r2, r0, #1
	strex	r3, r2, [r1]
	cmp	r3, #0
	bne	.LBB6_1
```

Debian GCC가 AArch64 기본 target에서 헬퍼를 부르는 이유는 `-moutline-atomics` 때문입니다. [GCC 14.2 매뉴얼의 AArch64 옵션](https://gcc.gnu.org/onlinedocs/gcc-14.2.0/gcc/AArch64-Options.html)은 이 헬퍼가 실행 시점에 ARMv8.1-A의 LSE 명령을 쓸 수 있는지 판단하고, 쓸 수 없으면 ARMv8.0 기본 ISA의 load/store-exclusive 명령을 쓴다고 설명합니다. `-march=armv8.1-a`를 주면 LSE가 있다고 가정하고 `ldadd`를 바로 씁니다.

## Memory Model — 왜 필요한가

한 thread 안에서는 코드 순서대로 실행되는 것처럼 보이지만, 다른 thread가 관찰하는 순서는 다를 수 있습니다. 편지 두 통을 차례로 부쳐도 받는 쪽에 도착하는 순서는 우체국 사정에 달린 것과 같습니다.

```c
/* Thread 1 */
x = 1;
y = 1;

/* Thread 2 */
if (y == 1)
    assert(x == 1);   // 일반 int라면 data race라서 정의되지 않은 동작
```

일반 `int`로 쓰면 이 코드는 data race이고, C 표준은 결과를 정의하지 않습니다. 아래처럼 relaxed atomic으로 바꾸면 data race는 사라지지만, relaxed에는 두 변수 사이의 순서 보장이 없습니다. 그래서 Thread 2가 `y == 1`을 보고도 `x == 0`을 보는 결과를 표준이 금지하지 않습니다.

```c
#include <stdatomic.h>
#include <assert.h>
_Atomic int x = 0, y = 0;

/* Thread 1 */
atomic_store_explicit(&x, 1, memory_order_relaxed);
atomic_store_explicit(&y, 1, memory_order_relaxed);

/* Thread 2 */
if (atomic_load_explicit(&y, memory_order_relaxed) == 1)
    assert(atomic_load_explicit(&x, memory_order_relaxed) == 1); /* 표준이 보장하지 않음 */
```

**Memory model**은 어떤 재정렬이 허용되는지를 정의합니다. 이 message-passing(MP) 패턴은 `litmus.c`의 `mp` 모드로 100만 번씩 5회 돌렸는데, M2 Pro와 Debian 게스트 모두 `y == 1 && x == 0`이 한 번도 나오지 않았습니다. 이것은 "이 하드웨어와 이 테스트 하네스에서 관찰하지 못했다"는 뜻일 뿐, 허용되지 않는다는 뜻이 아닙니다. 표준이 허용하는 결과라면 다른 CPU나 컴파일러 최적화에서 나올 수 있습니다.

## ARM Memory Model — Weak

Arm의 [Application Note 321](https://documentation-service.arm.com/static/5efefb97dbdee951c1cd5aaf)(ARM DAI 0321A, 2012) 2.2절은 ARMv7-M과 ARMv6-M이 "weakly-ordered memory model만 요구한다"고 적습니다. 프로그램의 명령 순서가 메모리 트랜잭션 순서를 항상 보장하지는 않으며, 그 이유로 프로세서의 재정렬, 여러 버스 인터페이스, 인터커넥트의 다른 가지에 있는 장치, 버퍼링·투기적 접근을 듭니다. 같은 문서 3.2절은 반대로, *현재의* Cortex-M 프로세서는 메모리 트랜잭션을 재정렬하지 않으므로 DMB가 필요한 경우가 드물다고도 적습니다. 아키텍처가 허용하는 것과 특정 코어가 실제로 하는 것은 다릅니다.

AArch64 쪽에서 실제로 보이는 재정렬은 store-buffering(SB) 테스트로 확인할 수 있습니다. 두 thread가 각자 자기 변수에 1을 쓰고 상대 변수를 읽습니다. 순차적으로만 실행된다면 둘 다 0을 읽는 경우는 없어야 합니다.

```c title="litmus.c — SB 테스트 (발췌)"
/* Thread 1 */                          /* Thread 2 */
atomic_store_explicit(&x, 1, ST);       atomic_store_explicit(&y, 1, ST);
r1 = atomic_load_explicit(&y, LD);      r2 = atomic_load_explicit(&x, LD);
/* 매 반복 spin barrier로 두 thread를 맞춰 출발시키고, r1 == 0 && r2 == 0을 센다 */
```

`ST`/`LD`는 컴파일 시점 상수여야 해서 order마다 바이너리를 따로 만듭니다(`build-litmus.sh`). 100만 번 반복에서 `r1 == 0 && r2 == 0`이 나온 횟수의 중앙값입니다.

| Store / Load order | M2 Pro (clang) | Debian 게스트 (gcc) |
|---|---:|---:|
| relaxed / relaxed | 204,154 | 779,135 |
| release / acquire | 20,115 | 0 |
| seq_cst / seq_cst | 0 | 0 |

relaxed에서는 두 환경 모두 store 뒤의 load가 store보다 먼저 끝난 것처럼 보였습니다. release/acquire 줄이 두 환경에서 다른 이유는 아래 [Sequential Consistency vs Acquire-Release](#sequential-consistency-vs-acquire-release)에서 설명합니다.

## x86 Memory Model — Strong

x86은 TSO(Total Store Order)로 설명됩니다. Sewell 등의 논문 [x86-TSO: A Rigorous and Usable Programmer's Model for x86 Multiprocessors](https://www.cl.cam.ac.uk/~pes20/weakmemory/cacm.pdf)(CACM 2010)가 제시한 모델은 hardware thread마다 FIFO store buffer 하나를 두고, 읽는 thread는 자기 store buffer에 같은 주소의 쓰기가 있으면 그것을 먼저 읽습니다. `MFENCE`는 자기 store buffer를 비웁니다. `LOCK` 접두 명령은 전역 lock을 잡고 실행되며, 끝날 때 store buffer를 비우고 lock을 놓습니다. lock을 쥔 동안 다른 thread는 읽을 수 없습니다.

이 모델에서 보이는 재정렬은 사실상 하나입니다. 논문은 SB 테스트를 들어, store buffer 때문에 *앞선 store 뒤의 다른 주소 load*가 먼저 보일 수 있다고 설명합니다.

- Load → Load: 순서 유지
- Store → Store: 순서 유지 (FIFO store buffer)
- Load → Store: 순서 유지
- Store → Load(다른 주소): *재정렬 가능* (store buffer)

이 글은 x86 하드웨어에서 직접 돌리지 않았습니다. x86 쪽 내용은 위 논문과 아래 컴파일러 출력에만 근거합니다.

## C11/C++11 Atomic — Memory Order

```c
atomic_store_explicit(&x, 1, memory_order_release);
int v = atomic_load_explicit(&y, memory_order_acquire);
```

"비싸다/싸다"를 느낌으로 말하는 대신, 각 order가 실제로 어떤 명령이 되는지 보는 편이 정확합니다. `codegen.c`의 함수 하나당 연산 하나를 컴파일한 결과입니다.

| Order | 연산 | AArch64 (gcc 14.2, 기본) | AArch64 (gcc `-march=armv8.3-a+rcpc`) | x86-64 (clang) | ARMv7-M (clang `thumbv7m`) |
|---|---|---|---|---|---|
| `relaxed` | store / load | `str` / `ldr` | `str` / `ldr` | `mov` / `mov` | `str` / `ldr` |
| `release` | store | `stlr` | `stlr` | `mov` | `dmb sy` + `str` |
| `acquire` | load | `ldar` | `ldapr` | `mov` | `ldr` + `dmb sy` |
| `seq_cst` | store | `stlr` | `stlr` | `xchgl` | `dmb sy` + `str` + `dmb sy` |
| `seq_cst` | load | `ldar` | `ldar` | `mov` | `ldr` + `dmb sy` |
| `seq_cst` | fence | `dmb ish` | `dmb ish` | `lock orl $0, -64(%rsp)` | `dmb sy` |
| `acq_rel` | fence | `dmb ish` | `dmb ish` | (명령 없음) | `dmb sy` |

몇 가지가 눈에 띕니다. AArch64 기본 target에서는 seq_cst store와 release store가 같은 `stlr`이고, seq_cst load와 acquire load가 같은 `ldar`입니다. 차이는 RCpc 확장(`ldapr`)을 켰을 때 acquire load에서만 생깁니다. x86에서는 release·acquire가 평범한 `mov`이고, seq_cst store만 `xchg`가 됩니다. TSO가 이미 Store→Load 외의 순서를 지키기 때문입니다.

`memory_order_consume`은 현재 C++ working draft에서 Annex D의 [depr.atomics.order](https://eel.is/c++draft/depr.atomics.order)로 옮겨졌고, "acquire가 허용되는 모든 곳에 쓸 수 있으며 의미가 같다"고 적혀 있습니다. 새 코드에서 쓸 이유는 없습니다.

인자 없는 `atomic_store`/`atomic_load`의 기본값은 `seq_cst`입니다. 비용이 얼마나 더 드는지는 위 표처럼 target에 따라 0(같은 명령)부터 `xchg`까지 다릅니다.

## Acquire-Release Pattern

가장 흔한 lock-free 패턴은 "데이터를 다 쓴 뒤 깃발을 올리고, 깃발을 본 쪽이 데이터를 읽는" 형태입니다.

```c
/* Producer */
data = 42;
atomic_store_explicit(&ready, 1, memory_order_release);

/* Consumer */
if (atomic_load_explicit(&ready, memory_order_acquire) == 1) {
    use(data);   // ← data = 42 보장
}
```

release store를 acquire load가 읽으면 둘 사이에 synchronizes-with 관계가 생기고, producer가 release 전에 한 쓰기(`data = 42`)가 consumer의 acquire 뒤 읽기에 보입니다. 택배에 송장을 붙이는 것과 같습니다. 송장(`ready`)을 확인한 사람은 상자 안의 물건(`data`)이 이미 들어 있다고 믿을 수 있습니다.

## Sequential Consistency vs Acquire-Release

위 SB 테스트를 C++로 쓰면 다음과 같습니다.

```cpp
/* Thread 1 */
x.store(1, std::memory_order_seq_cst);
r1 = y.load(std::memory_order_seq_cst);

/* Thread 2 */
y.store(1, std::memory_order_seq_cst);
r2 = x.load(std::memory_order_seq_cst);

/* seq_cst: r1 == 0 && r2 == 0 불가 */
/* release store + acquire load: r1 == 0 && r2 == 0 허용 */
```

C++ working draft [atomics.order](https://eel.is/c++draft/atomics.order) 4항은 *모든 `seq_cst` 연산(fence 포함)에 대한 단일 전체 순서 S*를 요구합니다. 네 연산이 S 위에 한 줄로 서면 어느 한 store가 반드시 상대 load보다 앞서므로 0/0이 나올 수 없습니다. release/acquire에는 이런 전체 순서가 없고, 이 테스트에는 release store를 읽는 acquire load도 없어서 synchronizes-with가 생기지 않습니다. 그래서 0/0을 막는 규칙이 없습니다.

표준이 허용한다고 해서 모든 하드웨어에서 나오는 것은 아닙니다. 앞의 SB 표에서 release/acquire 줄이 환경마다 달랐던 이유가 여기 있습니다.

- Debian GCC는 acquire load를 `ldar`로 냈고, 0/0은 5회 모두 0번이었습니다.
- Apple clang은 M2 target에서 acquire load를 `ldapr`로 냈습니다. `objdump -d litmus-acqrel`에서 `stlr w11, [x13]` 바로 뒤에 `ldapr w1, [x14]`가 있고, 100만 번 중 중앙값 20,115번 0/0이 나왔습니다. Arm의 Kyrylo Tkachov가 쓴 [Enabling the LDAPR instructions for C/C++ compilers](https://developer.arm.com/community/arm-community-blogs/b/tools-software-ides-blog/posts/enabling-rcpc-in-gcc-and-llvm)(2023)는 LDAPR가 구현하는 RCpc 모델이, 주소 의존이 없는 한 메모리 접근을 앞선 STLR 너머로 재정렬할 자유를 하드웨어에 준다고 설명합니다. 관찰된 0/0이 바로 그 재정렬입니다.
- seq_cst load는 두 컴파일러 모두 `ldar`였고, 0/0은 한 번도 없었습니다. 같은 글은 C++11 acquire load의 기존 매핑이 LDAR였다고 적습니다.

같은 C 소스, 같은 CPU에서 컴파일러가 고른 명령 하나 때문에 결과가 달라진 사례입니다.

## ARM·POWER에서 SC 비용

AArch64에서 seq_cst store·load는 위 codegen 표대로 release/acquire와 같은 `stlr`/`ldar`로 컴파일되므로, 명령 수준에서 추가 비용이 없습니다. 차이가 드러나는 곳은 `atomic_thread_fence(memory_order_seq_cst)`(`dmb ish`)와, RCpc를 쓸 수 있는데도 seq_cst load 때문에 `ldar`를 써야 하는 경우입니다. 반면 ARMv7-M에서는 seq_cst store 하나가 `dmb sy`를 앞뒤로 두 개 붙입니다. POWER는 이 글에서 컴파일하거나 실행하지 않았습니다.

Linux kernel의 `smp_mb()`·`READ_ONCE()` 같은 API는 C11 memory order와 별개의 계약입니다. 커널 코드에서는 `Documentation/memory-barriers.txt`를 기준으로 합니다. arm64에서 이 API들이 어떤 barrier 명령이 되는지는 [4-08 Memory Ordering](/blog/embedded/performance-engineering/part4-08-memory-ordering)에서 다룹니다.

## DMB·DSB·ISB

ARM의 barrier 명령은 세 가지입니다. 정의와 쓰임새는 AN321 3.2절(Typical usages)과 3.3절(Architectural Requirements)을 따릅니다.

```c
__DMB();   // Data Memory Barrier
__DSB();   // Data Synchronization Barrier
__ISB();   // Instruction Synchronization Barrier
```

| 명령 | AN321의 정의 | AN321이 드는 용도 |
|---|---|---|
| `DMB` | DMB 앞의 모든 명시적 데이터 전송이, DMB 뒤의 명시적 데이터 트랜잭션이 시작되기 전에 완료됨 | CPU 메모리 접근과 DMA 동작 사이, 멀티코어 semaphore·mailbox |
| `DSB` | DSB 앞의 모든 명시적 데이터 전송이, DSB 뒤의 *어떤 명령*이 실행되기 전에 완료됨 | SCS(NVIC·MPU·SysTick 등) 접근의 효과 보장, SVC·WFI·WFE 전에 메모리 갱신 완료 |
| `ISB` | 파이프라인을 비우고, 앞선 context 변경의 효과를 뒤 명령이 인식하게 함 | CONTROL 레지스터 갱신 뒤 |

3.3절은 조합도 정합니다. SCS 접근의 부작용을 확실히 보이게 하려면 `DSB` 뒤에 `ISB`를 두고, MPU를 프로그래밍한 뒤에도 `DSB`(필요하면 `ISB`)를 둡니다. self-modifying code도 `DSB` 다음 `ISB`입니다.

## Concurrent Data Structure

자료구조를 thread 사이에 공유하는 방법은 크게 두 갈래입니다. 하나는 lock으로 감싸는 것이고, 다른 하나는 atomic 연산만으로 불변식을 지키는 것입니다.

### Lock-based

```c
xSemaphoreTake(mtx, portMAX_DELAY);
queue_push(&queue, item);
xSemaphoreGive(mtx);
```

### Lock-free

producer 하나와 consumer 하나만 있는 SPSC queue는 lock 없이 안전하게 만들 수 있는 대표적인 경우입니다. `head`는 producer만, `tail`은 consumer만 쓰므로 각 index의 쓰기 주체가 하나입니다.

```c
/* SPSC (single-producer single-consumer) queue: producer 쪽 */
atomic_size_t head, tail;

bool push(T item) {
    size_t h = atomic_load_explicit(&head, memory_order_relaxed);
    size_t t = atomic_load_explicit(&tail, memory_order_acquire);
    if (h - t == CAPACITY) return false;
    buf[h % CAPACITY] = item;
    atomic_store_explicit(&head, h + 1, memory_order_release);
    return true;
}
```

`head`의 release store가 앞의 `buf[...] = item`을 consumer에게 보이게 하는 깃발 역할을 합니다. lock-free라는 성질은 "어떤 thread가 멈춰도 다른 thread가 진행한다"는 진행 보장이지 속도 보장이 아닙니다. 속도 비교는 [4-07 Lock-Free](/blog/embedded/performance-engineering/part4-07-lock-free)에서 다룹니다.

## False Sharing — 다음 편 주제

```c
struct {
    atomic_int a;   // CPU 0 사용
    atomic_int b;   // CPU 1 사용
} stats;
```

서로 다른 변수라도 같은 cache line에 있으면, 한쪽의 쓰기가 다른 코어의 그 line을 무효화합니다. 얼마나 느려지는지는 다음 편에서 64바이트와 128바이트 간격으로 직접 재 봅니다.

## ABA Problem

lock-free stack의 `pop`은 "top을 읽고, 그 사이 top이 바뀌지 않았으면 다음 노드로 교체"합니다. 문제는 "바뀌지 않았다"를 주소 비교로만 판단한다는 점입니다.

```text
pop():
    old = top                 // top = X를 읽음
    (선점: 다른 thread가 X pop, Y pop, X를 다시 push)
    CAS(&top, old, old->next) // top이 다시 X라서 성공하지만 old->next는 이미 해제된 Y
```

해결책으로는 **tagged pointer**(포인터 + version 카운터)나 hazard pointer, epoch 기반 회수를 씁니다. 자세한 내용은 [4-07](/blog/embedded/performance-engineering/part4-07-lock-free)에서 다룹니다.

## 자주 하는 실수

> ⚠️ `volatile`로 atomic 가정

```c
volatile int counter;
counter++;   // ← 여전히 load / add / store 세 단계
```

`volatile`은 컴파일러가 접근을 없애거나 합치지 못하게 할 뿐이고, read-modify-write를 원자적으로 만들지 않습니다. 앞의 `lost.c` 측정에서 `volatile int` 카운터는 200만 번 중 중앙값 965,804번(M2 Pro)의 증가를 잃었습니다.

> ⚠️ Memory order를 기본값에 맡김

```c
atomic_store(&flag, 1);    // 기본값 seq_cst
atomic_load(&flag);        // 기본값 seq_cst
```

기본값이 틀린 것은 아닙니다. 다만 x86에서는 seq_cst store가 `xchg`가 되고, ARMv7-M에서는 `dmb sy` 두 개가 붙습니다. 깃발 하나를 넘기는 용도라면 release/acquire로 충분하고, 그 선택이 맞는지는 위 SB 같은 litmus 테스트와 codegen으로 확인합니다.

> ⚠️ Race condition은 *드물어서 무시*

`lost.c`처럼 경합이 심하면 race는 드물지 않습니다. 실제 서비스에서 race가 드물어 보이는 이유는 경합 창이 좁기 때문이고, 창이 좁을수록 재현이 어려워 디버깅 비용이 커집니다. 테스트가 통과했다는 사실만으로 race가 없다고 결론 내리지 않습니다.

## 정리

- **Concurrency는 구성(다루기)이고, Parallelism은 동시 실행(하기)**입니다.
- 비원자적 read-modify-write는 경합 조건에서 증가의 절반 가까이를 잃었고, `atomic_fetch_add`만 정확했습니다.
- ARMv7-M/v6-M 아키텍처는 weak ordering을 허용하고, M2 Pro에서는 relaxed SB 테스트 100만 번 중 중앙값 204,154번(약 20%)이 재정렬된 결과였습니다.
- x86-TSO에서 보이는 재정렬은 store buffer에 의한 Store→Load 하나입니다.
- 같은 C11 order도 target마다 다른 명령이 됩니다. AArch64는 seq_cst store/load가 release/acquire와 같은 명령일 수 있고, x86과 ARMv7-M에서는 차이가 큽니다.
- release/acquire는 SB의 0/0을 허용하며, M2 Pro에서 clang이 낸 `ldapr`로 실제로 관찰됐습니다.

다음 편은 **False Sharing**을 다룹니다.

## 관련 항목

- [3-10: Thermal](/blog/embedded/performance-engineering/part3-10-thermal)
- [4-02: False Sharing](/blog/embedded/performance-engineering/part4-02-false-sharing)
- [4-08: Memory Ordering](/blog/embedded/performance-engineering/part4-08-memory-ordering)
