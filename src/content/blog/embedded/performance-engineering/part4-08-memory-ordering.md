---
title: "Memory Ordering 분석 — Acquire·Release·Seq-Cst·ARM Relaxed Model"
slug: "embedded/performance-engineering/part4-08-memory-ordering"
date: 2026-04-26T09:07:00
description: "C11/C++11 memory_order와 acquire-release pair, seq-cst 비용, ARM ldar/stlr."
series: "Embedded Performance Engineering"
seriesOrder: 37
tags: [memory-ordering, acquire, release, seq-cst, ldar]
topics: ["embedded"]
---

## 한 줄 요약

> **"Memory ordering은 다른 thread가 메모리 접근을 어떤 순서로 관찰하는지를 정하는 계약이고, 그 계약을 지키는 명령은 target마다 다릅니다."**

## 어떤 문제를 푸는가

CPU는 store를 store buffer에 넣어 두고 다음 load를 먼저 실행할 수 있고, 컴파일러도 서로 무관해 보이는 접근의 순서를 바꿉니다. 단일 thread에서는 결과가 같지만, 다른 thread는 코드 순서와 다른 순서를 볼 수 있습니다. 우편에 비유하면 편지 두 통을 순서대로 부쳐도 받는 사람에게 도착하는 순서는 보장되지 않는 것과 같습니다.

Lock을 쓰면 lock 구현 안의 barrier가 이 문제를 가려 줍니다. Lock-free 코드에서는 직접 순서를 정해야 하고, 틀리면 producer가 데이터를 쓰기 전에 consumer가 flag를 보는 버그가 됩니다. 이 글은 C/C++ memory order가 무엇을 약속하는지 표준 문구로 정리하고, 같은 코드가 AArch64·ARMv7·x86-64·Cortex-M0+에서 어떤 명령이 되는지, 실제 M2 코어에서 재정렬이 관찰되는지를 litmus test로 확인합니다.

측정 환경은 [4-06](/blog/embedded/performance-engineering/part4-06-rw-lock)과 같은 Apple M2 Pro 위 QEMU 11.1.3(`-accel hvf -cpu host`, vCPU 4개) Debian 13 arm64 guest이고, 컴파일러는 gcc 14.2.0(aarch64, `x86_64-linux-gnu`, `arm-linux-gnueabihf` 교차)과 macOS의 Apple clang 21.0.0입니다.

## C11/C++11 Memory Order

현재 C++ 작업 초안(eel.is, 2026-08-23 생성본)의 [\[atomics.order\]](https://eel.is/c++draft/atomics.order)에는 `memory_order` 열거자가 `relaxed`, `acquire`, `release`, `acq_rel`, `seq_cst` 다섯 개만 남아 있습니다. `consume`은 Annex D의 [\[depr.atomics.order\]](https://eel.is/c++draft/depr.atomics.order)(D.24.5)로 옮겨졌고 "it has the same meaning" as `acquire`라고 적혀 있습니다.

```cpp
namespace std {
  enum class memory_order : unspecified {
    relaxed = 0, acquire = 2, release = 3, acq_rel = 4, seq_cst = 5
  };
}
```

[\[atomics.types.operations\]](https://eel.is/c++draft/atomics.types.operations)의 `store()`와 `load()`는 기본 인자가 `memory_order::seq_cst`입니다. 아무것도 쓰지 않은 `atomic` 연산은 가장 강한 순서로 동작한다는 뜻이고, 그 비용은 뒤의 측정에서 봅니다.

## 각 Order가 막는 방향

\[atomics.order\] 1절의 정의를 풀면 다음과 같습니다.

- **relaxed** — "no operation orders memory". 그 객체에 대한 접근이 쪼개지지 않는다는 것만 보장합니다.
- **release** — store가 release 연산이 됩니다. 이 store 앞의 읽기·쓰기가 store 뒤로 내려가지 않습니다.
- **acquire** — load가 acquire 연산이 됩니다. 이 load 뒤의 읽기·쓰기가 load 앞으로 올라가지 않습니다.
- **seq_cst** — acquire/release에 더해, 모든 seq_cst 연산이 하나의 전체 순서 S에 놓입니다.

Acquire와 release는 한쪽 방향만 막는 반쪽 울타리입니다. 혼자서는 의미가 없고 둘이 짝을 이룰 때 동기화가 됩니다.

## Acquire-Release Pair

\[atomics.order\] 2절은 release 연산 A가 같은 객체 M에 대한 acquire 연산 B와 "synchronizes with" 관계가 되는 조건을, B가 A(또는 A로 시작하는 release sequence)가 쓴 값을 읽었을 때로 정합니다. 택배에 비유하면 release는 "상자를 다 채운 뒤 송장을 붙이는 것"이고, acquire는 "송장을 확인한 뒤 상자를 여는 것"입니다.

```c
/* Producer */
data = compute();
atomic_store_explicit(&ready, true, memory_order_release);

/* Consumer */
if (atomic_load_explicit(&ready, memory_order_acquire)) {
    use(data);   /* ready == true를 봤다면 data도 보임 */
}
```

이 짝은 [4-07](/blog/embedded/performance-engineering/part4-07-lock-free#lock-free-spsc-queue)의 SPSC ring에서 그대로 쓰였고, 2,000만 개를 넘기는 동안 순서가 어긋난 값은 0개였습니다.

## Seq-Cst — Sequential Consistency

Dekker 알고리즘의 핵심은 "내 flag를 세운 뒤 상대 flag를 읽는다"입니다. 두 thread가 모두 상대 flag를 0으로 읽으면 둘 다 임계 구역에 들어갑니다. 이 패턴을 store-buffering(SB) litmus test라고 부릅니다. Acquire/release만으로는 이 결과를 막지 못합니다. Release store 뒤의 acquire load는 release가 막는 방향(앞의 접근이 뒤로)에도, acquire가 막는 방향(뒤의 접근이 앞으로)에도 해당하지 않기 때문입니다.

`litmus.c`로 이 결과가 실제로 나오는지 확인했습니다. 두 thread가 매 반복마다 `x=1; r0=y`와 `y=1; r1=x`를 동시에 실행하고, `r0==0 && r1==0`인 횟수를 셉니다. 200만 회씩 3번 돌렸습니다.

| 빌드 | AArch64 명령 | SB `r0==r1==0` (3회) |
|---|---|---|
| relaxed | `STR` / `LDR` | 6, 5, 17 |
| release/acquire (`-march` 기본) | `STLR` / `LDAR` | 0, 0, 0 |
| release/acquire (`-march=armv8.3-a`) | `STLR` / `LDAPR` | 0, 0, 0 |
| seq_cst | `STLR` / `LDAR` | 0, 0, 0 |

Relaxed에서는 M2 코어 위에서 SB 결과가 실제로 나왔습니다. 흥미로운 것은 release/acquire 줄입니다. C++은 이 결과를 허용하지만, gcc 기본 빌드는 acquire load를 `LDAR`로 냈고 이번 실행에서는 한 번도 나오지 않았습니다. `-march=armv8.3-a`에서 gcc는 acquire를 RCpc 명령인 `LDAPR`로 바꿉니다. Arm의 Kyrylo Tkachov가 쓴 ["Enabling the LDAPR instructions for C/C++ compilers"](https://developer.arm.com/community/arm-community-blogs/b/tools-software-ides-blog/posts/enabling-rcpc-in-gcc-and-llvm)(2023-11-15)는 `LDAPR`이 `LDAR`과 달리 "freedom to move LDAPR instructions past preceding STLR instructions to unrelated addresses"를 하드웨어에 준다고 설명합니다. 즉 SB 결과를 막아 주던 하드웨어 동작이 이 빌드에서는 보장되지 않습니다. 이번 600만 회에서는 관찰되지 않았지만, 관찰되지 않은 것은 금지된 것이 아닙니다. Dekker류 알고리즘에는 seq_cst를 써야 합니다.

Message-passing(MP) 패턴(`data=1; flag=1` / `f=flag; d=data`)은 같은 조건에서 네 빌드 모두 600만 회 중 `f==1 && d==0`이 0회였습니다. Relaxed MP도 이 환경에서는 재현되지 않았다는 뜻이지 안전하다는 뜻이 아닙니다.

## ARM 명령

같은 C 파일(`order.c`)을 gcc 14.2 `-O2`로 컴파일한 결과입니다.

| 연산 | AArch64 기본 | AArch64 `-march=armv8.1-a` | ARMv7-A (`-march=armv7-a+fp -marm`) | x86-64 |
|---|---|---|---|---|
| load relaxed | `ldr` | `ldr` | `ldr` | `movl` |
| load acquire | `ldar` | `ldar` | `ldr; dmb ish` | `movl` |
| load seq_cst | `ldar` | `ldar` | `dmb ish; ldr; dmb ish` | `movl` |
| store relaxed | `str` | `str` | `str` | `movl` |
| store release | `stlr` | `stlr` | `dmb ish; str` | `movl` |
| store seq_cst | `stlr` | `stlr` | `dmb ish; str; dmb ish` | `xchgl` |
| `fetch_add` seq_cst | `bl __aarch64_ldadd4_acq_rel` | `ldaddal` | `dmb ish; ldrex/strex; dmb ish` | `lock xaddl` |
| CAS seq_cst | `bl __aarch64_cas4_acq_rel` | `casal` | `dmb ish; ldrex/strex; dmb ish` | `lock cmpxchgl` |
| fence acquire | `dmb ishld` | `dmb ishld` | `dmb ish` | (없음) |
| fence seq_cst | `dmb ish` | `dmb ish` | `dmb ish` | `lock orq $0,(%rsp)` |

AArch64에서는 acquire/release가 단일 명령(`LDAR`/`STLR`)에 들어가고, ARMv7에서는 일반 `ldr`/`str` 앞뒤에 `dmb ish`가 붙습니다. x86-64에서는 acquire load와 release store가 평범한 `movl`이고, seq_cst store만 `xchgl`이 됩니다. 기본 AArch64 빌드의 RMW가 함수 호출인 이유는 [4-07](/blog/embedded/performance-engineering/part4-07-lock-free#isa와-성능을-구분)의 outline atomics입니다.

## DMB, DSB, ISB

세 barrier의 정의는 Arm의 [Application Note 321](https://documentation-service.arm.com/static/5efefb97dbdee951c1cd5aaf)(ARM DAI 0321A, 2012) 3.2절에 있습니다.

| Barrier | AN321 3.2절의 정의 | M2(guest)에서 store 1회당 추가 비용 |
|---|---|---:|
| DMB | DMB 앞의 명시적 데이터 접근이 DMB 뒤의 접근보다 먼저 완료 | 약 0.31 ns |
| DSB | DSB 앞의 데이터 접근이 끝나야 DSB 뒤의 *명령*이 실행 | 약 4.87 ns |
| ISB | pipeline을 비우고, 앞선 context 변경을 뒤의 명령이 인식하게 함 | 약 10.06 ns |

오른쪽 열은 `atomcost.c`의 barrier 모드로, `volatile` store 2,000만 번 사이에 각 barrier를 넣고 barrier 없는 루프(0.30 ns/iter)와의 차이를 5회 중앙값으로 계산했습니다. 같은 정의대로 DSB는 DMB보다 약 16배, ISB는 약 33배 비쌌습니다.

AN321 4.17절은 MPU 설정에 대해 구체적인 순서를 줍니다. 설정 앞에 DMB, 설정이 끝난 뒤 DSB, 그리고 설정이 프로그램 메모리에 영향을 주면 ISB를 둡니다.

## DMB Variant

AArch64의 DMB는 범위(shareability domain)와 종류를 인자로 받습니다. CMSIS에는 범위 인자를 받는 DMB 함수가 없으므로 아래처럼 inline asm으로 씁니다. Linux v6.12 `arch/arm64/include/asm/barrier.h`는 이 인자를 용도별로 나눠 씁니다. `smp_mb()`/`smp_rmb()`/`smp_wmb()`는 `dmb(ish)`/`dmb(ishld)`/`dmb(ishst)`(123~125행), DMA용 `dma_rmb()`/`dma_wmb()`는 `dmb(oshld)`/`dmb(oshst)`(65~66행), `mb()`는 `dsb(sy)`(60행)입니다.

```c
__asm__ volatile("dmb ish"   ::: "memory");   /* inner shareable: CPU 사이 */
__asm__ volatile("dmb ishld" ::: "memory");   /* 앞의 load만 */
__asm__ volatile("dmb sy"    ::: "memory");   /* full system */
```

"범위가 좁을수록 빠르다"는 이 환경에서는 관찰되지 않았습니다. 앞 절과 같은 루프에서 `dmb ishld`, `dmb ish`, `dmb sy`는 모두 0.61 ns/iter(5회 중앙값, 범위 0.60~0.62)였습니다. 경쟁 없는 단일 코어 루프라 범위 차이가 드러날 외부 트래픽이 없었기 때문일 수 있으므로, 범위 선택은 성능보다 *정확성*(누구와 동기화하는가) 기준으로 합니다.

## x86 vs ARM — 구현 비용은 target에서 확인

위 표에서 보듯 x86-64는 acquire/release에 추가 명령이 없고, AArch64는 `LDAR`/`STLR`라는 별도 명령을 씁니다. 그렇다고 AArch64의 seq_cst가 늘 비싼 것은 아닙니다. 같은 guest에서 128-byte 정렬 counter에 `fetch_add`를 한 결과(LL/SC 빌드, thread당 연산 평균, 5회 중앙값)입니다.

| 연산 | 1 thread | 2 thread | 4 thread |
|---|---:|---:|---:|
| `fetch_add` relaxed | 3.88 ns | 7.67 ns | 33.11 ns |
| `fetch_add` seq_cst | 4.56 ns | 17.43 ns | 65.81 ns |

경쟁이 없을 때 차이는 0.7 ns였지만, 4 thread가 같은 counter를 두드리면 seq_cst가 relaxed의 두 배였습니다. x86-64에서는 두 연산이 모두 `lock xaddl`로 같은 명령이라 이런 차이가 생길 여지가 없습니다(표 참조). x86-64 쪽 시간은 이 글에서 재지 않았습니다.

## Release-Consume Pattern (deprecated)

`consume`은 "이 포인터로부터 데이터 의존이 이어지는 읽기만 순서를 보장한다"는 의도로 만들어졌습니다. 그런데 앞 절에서 본 대로 현재 C++ 초안은 이를 Annex D로 옮기고 acquire와 같은 의미로 정했습니다. 컴파일러도 이미 그렇게 처리합니다.

```c title="consume.c"
int read_consume(void) {
    struct msg *p = atomic_load_explicit(&shared, memory_order_consume);
    return p->field;
}
```

gcc 14.2 `-O2` aarch64는 이 load를 `ldar x0, [x0]`로 냈습니다. Acquire와 같은 명령입니다. 새 코드에서는 처음부터 `memory_order_acquire`를 씁니다.

## Lock-Free Queue에 적용

SPSC queue에서 producer는 slot을 채운 뒤 `head`를 release로, consumer는 `head`를 acquire로 읽은 뒤 slot을 읽습니다.

```c
/* SPSC push */
ring[h & (CAP - 1)] = value;
atomic_store_explicit(&head, h + 1, memory_order_release);

/* SPSC pop */
size_t h = atomic_load_explicit(&head, memory_order_acquire);
if (h != t) value = ring[t & (CAP - 1)];
```

[4-07](/blog/embedded/performance-engineering/part4-07-lock-free#lock-free-spsc-queue)의 측정에서 이 버전은 15.3 Mitems/s, 모든 index를 seq_cst로 바꾼 버전은 15.1 Mitems/s였습니다. AArch64에서는 seq_cst load/store가 같은 `LDAR`/`STLR`이라 차이가 없었습니다.

## Linux Kernel — smp_rmb, smp_wmb

Kernel은 C11 atomic 대신 자체 barrier를 씁니다. 위 `barrier.h` 매핑대로 arm64에서 `smp_rmb()`는 `dmb ishld`, `smp_wmb()`는 `dmb ishst`, `smp_mb()`는 `dmb ish`입니다. `smp_store_release()`와 `smp_load_acquire()`는 같은 파일 127행(`__smp_store_release`)과 162행(`__smp_load_acquire`)에서 크기별 `stlr`/`ldar` inline asm으로 구현됩니다.

```c
smp_store_release(&ring->head, h + 1);       /* arm64: stlr */
h = smp_load_acquire(&ring->head);           /* arm64: ldar */
```

## Cortex-M Single Core

AN321 2.3절은 "The Cortex-M processors never perform memory accesses out of order compared to instruction flow"라고 적으면서, 아키텍처가 미래 구현에서 이를 금지하지는 않는다고 덧붙입니다. 그래서 같은 문서 3.2절은 DMB가 Cortex-M에서 "rarely needed"라고 하면서도, 다른 Arm 프로세서로 옮길 코드와 multi-master 시스템에서는 필요하다고 하고 첫 예로 DMA를 듭니다.

```c
fill_buf(dma_buf, len);
__DMB();                 /* CPU 쓰기와 DMA 시작 사이 */
DMA1_Channel1->CCR |= DMA_CCR_EN;
```

AN321 3.2절은 이 경우를 "A barrier is required between a CPU memory access and a DMA operation"이라고 적습니다. 단, data cache가 있는 Cortex-M7 같은 코어에서는 barrier와 별개로 cache clean이 필요합니다([4-09](/blog/embedded/performance-engineering/part4-09-cache-coherency)).

## Dual-Core Cortex-M

RP2040은 Cortex-M0+ 두 개를 가진 MCU입니다. AN321 4.19절이 적듯 "The Cortex-M0 and Cortex-M0+ processors do not have exclusive access instructions"이므로, 같은 `order.c`를 Apple clang 21.0.0 `--target=thumbv6m-none-eabi -mcpu=cortex-m0plus -O2`로 컴파일하면 모든 atomic 연산이 `__atomic_load_4`, `__atomic_fetch_add_4` 같은 라이브러리 호출이 되고 다음 경고가 나옵니다.

```text
order.c:3:35: warning: large atomic operation may incur significant performance penalty; the access size (4 bytes) exceeds the max lock-free size (0 bytes) [-Watomic-alignment]
```

RP2040은 이 빈자리를 하드웨어로 채웁니다. [RP2040 datasheet](https://datasheets.raspberrypi.com/rp2040/rp2040-datasheet.pdf)(build 2025-02-20) 2.3.1.3절의 SIO는 32개의 hardware spinlock을 제공하고, 읽기가 lock 획득 시도, 쓰기가 해제이며, 두 코어가 같은 cycle에 요청하면 core 0이 이깁니다. 같은 절은 이 spinlock을 mutex·semaphore·queue 같은 상위 primitive의 짧은 임계 구역 보호에 쓰라고 권합니다. 즉 dual M0+에서 코어 간 동기화는 C11 atomic보다 이 하드웨어 lock이 기본 도구입니다.

## 자주 보는 함정과 안티패턴

> ⚠️ volatile을 atomic으로 가정

```c
volatile int x;
x++;   /* load, add, store 세 단계. 다른 코어의 증가와 섞임 */
```

`volatile`은 컴파일러가 접근을 없애거나 합치지 못하게 할 뿐, RMW를 하나로 묶거나 순서를 보장하지 않습니다.

> ⚠️ 기본 seq_cst의 비용 무시

```c
atomic_ulong counter;
counter++;   /* atomic_fetch_add(&counter, 1) == seq_cst */
```

통계 counter처럼 다른 데이터의 공개와 무관하면 `memory_order_relaxed`를 명시합니다. 위 표에서 4 thread일 때 seq_cst는 relaxed의 두 배였습니다.

> ⚠️ Store에 acquire, load에 release

```c
atomic_store_explicit(&flag, 1, memory_order_acquire);   /* 잘못된 order */
```

\[atomics.types.operations\]은 `store()`의 order를 relaxed, release, seq_cst 중 하나로 제한하는 precondition을 둡니다. gcc 14.2는 이 코드에 `warning: invalid memory model 'memory_order_acquire' for '__atomic_store_4' [-Winvalid-memory-model]`을 내고 `stlr`(seq_cst와 같은 명령)로 컴파일했습니다. 경고를 무시하지 말고 order를 고칩니다.

> ⚠️ Barrier만 추가하고 non-atomic 변수 사용

```c
data = 1;
__asm__ volatile("dmb ish" ::: "memory");
flag = 1;          /* 다른 thread가 non-atomic flag를 동시에 읽으면 data race */
```

하드웨어 DMB는 모든 메모리 접근의 순서를 정하지만, C/C++ 언어 수준에서는 non-atomic 객체에 대한 동시 접근 자체가 data race입니다. 컴파일러는 이 경우 `flag`를 레지스터에 담아 두거나 접근을 합칠 수 있습니다. 공유 flag는 atomic으로 선언합니다.

## Mapping을 확인하기

Memory order는 언어 계약이고 명령은 target마다 다르다는 것이 이 글의 반복 주제입니다. 확인은 assembly를 직접 보는 것이 가장 빠릅니다.

```cpp
#include <atomic>
std::atomic<int> value{0};
void store_relaxed(int v) { value.store(v, std::memory_order_relaxed); }
void store_release(int v) { value.store(v, std::memory_order_release); }
void store_seq_cst(int v) { value.store(v, std::memory_order_seq_cst); }
```

```bash
clang++ -std=c++20 -O2 -S -target arm64-apple-macos13 mapping.cpp -o -
```

Apple clang 21.0.0에서는 relaxed가 `str`, release와 seq_cst가 `stlr`이었습니다. gcc 14.2 aarch64의 결과(위 표)와 같습니다.

## 정리

- C++ 초안 기준 memory order는 relaxed, acquire, release, acq_rel, seq_cst 다섯이고, `consume`은 Annex D에서 acquire와 같은 의미가 됐습니다. gcc도 consume을 `ldar`로 냅니다.
- Relaxed SB litmus는 M2 코어에서 600만 회 중 28회 관찰됐고, seq_cst에서는 0회였습니다.
- AArch64 gcc 기본 빌드의 acquire(`LDAR`)에서는 SB가 관찰되지 않았지만, `-march=armv8.3-a`의 `LDAPR`은 앞선 `STLR`을 지나갈 수 있습니다(Arm 블로그). Dekker류에는 seq_cst를 씁니다.
- AArch64는 acquire/release가 단일 명령, ARMv7은 `dmb ish` 조합, x86-64는 seq_cst store만 `xchg`입니다.
- DSB는 DMB의 약 16배, ISB는 약 33배 비쌌고, DMB 범위(ishld/ish/sy)는 단일 코어 루프에서 차이가 없었습니다.
- Cortex-M은 접근을 재정렬하지 않지만 DMA·multi-master에는 DMB가 필요하고(AN321), dual M0+(RP2040)는 hardware spinlock으로 동기화합니다.

다음 편은 **Cache Coherency** — MESI 프로토콜과 멀티코어 동기화입니다.

## 관련 항목

- [4-07: Lock-Free](/blog/embedded/performance-engineering/part4-07-lock-free)
- [4-09: Cache Coherency](/blog/embedded/performance-engineering/part4-09-cache-coherency)
- [TSan으로 데이터 레이스 디버깅](/blog/tools/debugging/sanitizers/chapter04-tsan) — 잘못 고른 memory_order가 TSan에서 data race로 드러나는 방식
