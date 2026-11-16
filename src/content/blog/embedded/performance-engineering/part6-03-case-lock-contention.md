---
title: "사례 분석 — 멀티코어 처리량 저하에서 lock 병목 조사"
slug: "embedded/performance-engineering/part6-03-case-lock-contention"
date: 2026-04-28T09:02:00
description: "공유 통계 카운터를 mutex·atomic·worker별 슬롯으로 바꿔 가며 1~8 스레드 처리량을 재고, mutex 대기와 cache-line 이동을 perf lock·strace로 구분합니다."
series: "Embedded Performance Engineering"
seriesOrder: 52
tags: [case-study, lock, contention, scalability, perf-lock]
topics: ["embedded"]
---

## 한 줄 요약

> **"스레드를 늘렸더니 처리량이 오히려 떨어졌다면, 공유 쓰기가 어디서 일어나는지 찾습니다. lock을 없애도 같은 cache line에 쓰는 한 확장되지 않습니다."**

## 증상 — 재현한 문제

패킷마다 통계 카운터(`packets`·`bytes`·`errors`)를 올리는 데몬을 생각해 봅니다. 스레드를 늘렸는데 처리량이 늘지 않고 오히려 떨어졌다는 보고가 들어왔다고 해 봅니다. 이 글은 그 모양을 직접 만들어 측정했습니다.

측정 프로그램 `counters.c`는 "패킷 처리" 대신 xorshift 난수 몇 번을 돌리고, 그 결과로 길이와 오류 여부를 정한 뒤 통계를 갱신합니다. 통계 갱신 방법만 네 가지로 바꿉니다.

| 모드 | 통계 갱신 | 공유되는 것 |
|---|---|---|
| `mutex` | 전역 `struct stats`를 `pthread_mutex_lock`으로 보호 | mutex와 카운터 |
| `atomic` | 전역 `_Atomic` 카운터 3개에 `atomic_fetch_add_explicit(relaxed)` | 카운터가 있는 cache line |
| `local_packed` | worker마다 자기 슬롯(24 B)에 relaxed atomic add, 패딩 없음 | 이웃 슬롯과 같은 line(false sharing) |
| `local_padded` | 위와 같지만 슬롯을 128 B로 정렬 | 없음 |

`mutex` 모드의 갱신 부분은 원래 코드 그대로입니다.

```c
case 0: pthread_mutex_lock(&m); g.packets++; g.bytes += len; if (err) g.errors++; pthread_mutex_unlock(&m); break;
```

실행 환경은 두 곳입니다. 스레드당 20,000,000 패킷을 처리하고, 각 조합을 5번 돌려 중앙값을 씁니다. 프로그램은 끝날 때 합계가 `스레드 수 × 20,000,000`과 같은지 확인하고, 다르면 실패로 끝납니다. 두 환경 각각 160번 실행 모두 합계가 맞았습니다.

| 항목 | Mac | VM |
|---|---|---|
| CPU | Apple M2 Pro (P 8 + E 4), 스레드 고정 없음 | 같은 M2 Pro 위 QEMU 11.1.3 HVF, 8 vCPU |
| OS·컴파일러 | macOS 27.2.1, Apple clang 21.0.0 `-O2` | Debian 13 arm64, kernel 6.12.116, GCC 14.2.0 `-O2 -pthread` |

`mutex` 모드의 결과가 보고된 증상과 같은 모양입니다. 1스레드 처리량을 1.00으로 놓은 상대값입니다.

| 스레드 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Mac `mutex` | 1.00 | 0.59 | 0.43 | 0.39 | 0.38 | 0.33 | 0.34 | 0.35 |
| VM `mutex` | 1.00 | 0.15 | 0.35 | 0.24 | 0.26 | 0.23 | 0.21 | 0.18 |

스레드를 하나 더 붙이는 순간부터 처리량이 떨어지고, 8스레드에서도 1스레드보다 느립니다. 1스레드의 절대 처리량은 Mac 132.5 Mpps, VM 135.7 Mpps였습니다. VM의 2스레드 값(0.15)이 3스레드(0.35)보다 낮은 것처럼 곡선이 고르지 않은 이유는 이 글에서 확인하지 못했습니다.

## 가설 1 — Memory bandwidth saturation

처음 의심할 것은 메모리 대역폭 포화입니다. 이 가설은 실험 설계만으로 걸러집니다. 이 프로그램이 패킷마다 쓰는 메모리는 통계 몇 바이트뿐입니다. `local_padded` 모드는 같은 계산과 같은 개수의 atomic add를 하지만, 각 스레드가 자기 cache line에만 씁니다. 대역폭이 한계라면 이 모드도 함께 막혀야 합니다.

| 스레드 | 1 | 2 | 4 | 8 |
|---|---|---|---|---|
| Mac `local_padded` | 443.0 Mpps | 897.0 (2.02×) | 1,255.0 (2.83×) | 2,377.5 (5.37×) |
| VM `local_padded` | 291.7 Mpps | 554.1 (1.90×) | 870.8 (2.99×) | 1,114.3 (3.82×) |

`local_padded`는 8스레드에서 Mac 2,377.5 Mpps로, 같은 스레드 수의 `mutex`(46.0 Mpps)보다 51배 많이 처리합니다. **메모리 대역폭은 병목이 아닙니다.** 다만 이 모드도 8배까지 늘지는 않았습니다. 측정하는 동안 같은 Mac에서 다른 VM들이 돌았고, Mac에서는 스레드를 P-core에 고정할 수 없었다는 점을 함께 적어 둡니다.

## 가설 2 — Lock contention

다음은 mutex 경합입니다. 먼저 *잠든 시간*이 있는지 봅니다. VM에서 `strace -f -c -e trace=futex`로 `futex` 시스템 호출을 셌습니다(스레드당 2,000,000 패킷).

```text
== strace -f -c -e trace=futex ./counters mutex 1 2000000
  0.00    0.000000           0         1           futex
== strace -f -c -e trace=futex ./counters mutex 2 2000000
100.00    0.029641          20      1422       551 futex
== strace -f -c -e trace=futex ./counters mutex 8 2000000
100.00    3.896173         491      7933      3020 futex
```

1스레드에서는 `futex` 호출이 1번뿐입니다. [futex(7)](https://man7.org/linux/man-pages/man7/futex.7.html)는 "Futex operation occurs entirely in user space for the noncontended case. The kernel is involved only to arbitrate the contended case."라고 설명합니다. 경합이 없으면 user 공간에서 끝나고, 경합이 생겨야 커널로 들어가 잠듭니다. 8스레드에서는 7,933번 호출에 3.90초를 썼고, 3,020번이 에러로 돌아왔습니다. `perf stat`으로 보면 차이가 더 분명합니다.

```text
mutex threads=8 packets=16000000 sec=1.255 Mpps=12.7
             11646      context-switches                 #    1.931 K/sec
           6029.54 msec task-clock                       #    4.798 CPUs utilized
local_padded threads=8 packets=16000000 sec=0.022 Mpps=728.7
                 2      context-switches                 #   29.982 /sec
```

`mutex` 모드는 1.26초 동안 context switch가 11,646번 일어났습니다. 회의실 하나를 여덟 명이 번갈아 쓰면서, 자리가 날 때마다 잠든 사람을 깨우는 비용까지 치르는 셈입니다. 같은 `mutex` 8스레드가 `perf stat` 아래에서는 12.7 Mpps, `strace` 아래에서는 25.6 Mpps, 도구 없이 잰 5회 중앙값은 24.5 Mpps였습니다. 한 번 실행한 값은 이만큼 흔들리므로, 처리량 비교에는 도구 없이 5번 돌린 중앙값만 씁니다.

`perf lock`은 무엇을 보여 줄까요. [perf-lock 매뉴얼](https://man7.org/linux/man-pages/man1/perf-lock.1.html)대로 `perf lock record`·`perf lock contention`을 돌리면, 이 커널의 lock 이벤트가 잡힙니다.

```text
 contended   total wait     max wait     avg wait         type   caller

      6573      3.26 s     235.59 ms    496.00 us     spinlock   do_futex+0xe8
      3572      1.97 s     233.33 ms    551.27 us     spinlock   futex_wait_setup+0x80
         1      2.53 ms      2.53 ms      2.53 ms     spinlock   update_process_times+0xb4
```

여기에 `stats_mutex` 같은 사용자 mutex의 이름은 없습니다. 보이는 것은 커널 futex 경로(`do_futex`, `futex_wait_setup`)의 spinlock입니다. 즉 `perf lock`은 user 공간 mutex를 직접 재지 않고, 그 mutex가 잠들고 깨는 과정에서 커널 lock이 얼마나 경합했는지를 보여 줍니다. 이 Debian `perf` 6.12.117은 `-b`(BPF로 수집) 옵션이 "not built-in because no BUILD_BPF_SKEL=1"로 빠져 있어서, 위 결과는 tracepoint 기반 수집입니다.

**가설 2 확인**: `mutex` 모드에서는 lock 대기와 잠들기·깨우기가 있습니다. 하지만 이것으로 이야기가 끝나지는 않습니다.

## 원인 — Cache Line 소유권 이동

lock을 없애면 해결될까요. `atomic` 모드는 mutex 없이 relaxed atomic add만 합니다. 그런데 결과는 `mutex`보다 나빴습니다.

| 스레드 | 1 | 2 | 4 | 8 |
|---|---|---|---|---|
| Mac `atomic` | 487.6 Mpps | 26.9 (0.06×) | 22.0 (0.05×) | 17.5 (0.04×) |
| VM `atomic` | 295.5 Mpps | 80.0 (0.27×) | 32.4 (0.11×) | 38.9 (0.13×) |
| Mac `local_packed` | 455.2 Mpps | 317.6 (0.70×) | 77.5 (0.17×) | 164.6 (0.36×) |
| VM `local_packed` | 260.3 Mpps | 95.5 (0.37×) | 76.7 (0.29×) | 75.9 (0.29×) |

Mac에서 `atomic`은 2스레드가 되는 순간 1스레드의 18분의 1로 떨어졌습니다. 잠드는 스레드도 없습니다. VM에서 8스레드 `atomic`의 context switch는 15번뿐이었고, `task-clock`은 4.567 CPUs utilized로 CPU를 꽉 쓰고 있었습니다. **CPU는 바쁜데 일은 하지 못하는** 상태입니다.

원인은 cache line의 소유권입니다. 한 코어가 line에 쓰려면 그 line을 독점해야 하고, 다른 코어에 있던 사본은 무효가 됩니다. 여러 코어가 같은 line에 번갈아 쓰면 line이 코어 사이를 계속 오갑니다. 공 하나로 여덟 명이 캐치볼을 하면 공을 든 사람만 일할 수 있는 것과 같습니다.

`local_packed`가 이것을 확인해 줍니다. 각 스레드는 *자기* 슬롯에만 씁니다. 논리적으로는 아무것도 공유하지 않지만, 24 B 슬롯 여러 개가 한 line에 들어가 같은 일이 벌어졌습니다(false sharing). 같은 코드에 128 B 정렬만 더한 `local_padded`는 앞의 표처럼 확장됩니다.

Universal Scalability Law(USL)로 이 곡선을 설명해 볼 수도 있습니다.

$$C(N) = \frac{N}{1 + \alpha(N-1) + \beta \cdot N(N-1)}$$

$N$은 스레드 수, $\alpha$는 직렬화(contention), $\beta$는 coherency 비용입니다. 측정한 상대 처리량에 $\alpha, \beta \in [0, 1]$ 범위로 최소제곱 적합을 해 보면, `local_padded`는 VM에서 $\alpha = 0.0355$, $\beta = 0.01413$(RMSE 0.212)이 나옵니다. 그런데 `mutex`·`atomic`·`local_packed`는 VM에서 셋 다 $\alpha = 1$, $\beta = 1$로 범위 끝에 붙었습니다. 2스레드에서 이미 1스레드보다 느려지는 곡선은 이 범위의 USL로 표현되지 않습니다. USL 계수는 *잘 맞을 때* 병목의 종류를 말해 주지만, 이 사례에서는 직접 측정한 context switch·futex·cache line 실험이 더 많은 것을 알려 줍니다.

## 해결 — Worker별 슬롯과 주기적 합산

해결은 공유 쓰기를 없애는 것입니다. worker마다 자기 슬롯을 하나씩 갖고, 슬롯끼리 cache line을 나눠 쓰지 않게 정렬합니다. 측정에 쓴 `local_padded`의 정의는 다음과 같습니다.

```c
#ifndef LINE
#define LINE 128            /* >= cache line on both hosts (M2 Pro sysctl: 128, guest getconf: 64) */
#endif
struct padded { _Atomic uint64_t packets, bytes, errors; } __attribute__((aligned(LINE)));
static struct padded ld[MAXT];

atomic_fetch_add_explicit(&ld[id].packets, 1, memory_order_relaxed);
atomic_fetch_add_explicit(&ld[id].bytes, len, memory_order_relaxed);
if (err) atomic_fetch_add_explicit(&ld[id].errors, 1, memory_order_relaxed);
```

정렬 크기 128은 Mac의 `sysctl hw.cachelinesize`(128)에 맞췄습니다. VM guest의 `getconf LEVEL1_DCACHE_LINESIZE`는 64를 보고했으므로, 128이면 둘 다 덮습니다. 정렬 값은 대상 CPU에서 이렇게 확인한 값으로 정합니다. `worker_id`는 스레드를 만들 때 한 번 정하는 번호라 `sched_getcpu()`와 다릅니다. 스레드가 다른 CPU로 옮겨 가도 슬롯은 바뀌지 않습니다.

합계는 별도 스레드가 주기적으로 읽습니다.

```c
struct stats aggregate(void)
{
    struct stats total = {0};
    for (int i = 0; i < MAX_WORKERS; i++) {
        total.packets += atomic_load_explicit(&ld[i].packets, memory_order_relaxed);
        total.bytes   += atomic_load_explicit(&ld[i].bytes, memory_order_relaxed);
        total.errors  += atomic_load_explicit(&ld[i].errors, memory_order_relaxed);
    }
    return total;
}
```

슬롯을 일반 `uint64_t`로 두고 집계 스레드가 읽으면 안 됩니다. C11 표준 초안 [N1570](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf) §5.1.2.4 ¶25는 서로 다른 스레드의 두 충돌 접근 중 하나 이상이 atomic이 아니고 어느 쪽도 다른 쪽보다 먼저 일어남(happens before)이 성립하지 않으면 data race이고, 그 결과는 undefined behavior라고 정합니다. 통계값이라는 이유로 예외가 되지 않습니다. 대신 relaxed atomic이라 필드마다 값은 안전하게 읽히지만, 세 필드가 같은 순간의 값이라는 보장은 없습니다. 일관된 snapshot이 필요하면 별도의 동기화 규약을 추가합니다.

## 검증 — Before / After

"Before"는 `mutex`, "After"는 `local_padded`입니다. 계산과 atomic add 개수는 같고 통계를 쓰는 위치만 다릅니다. 처리량은 5회 중앙값입니다.

| 스레드 | Mac Before | Mac After | VM Before | VM After |
|---|---|---|---|---|
| 1 | 132.5 Mpps | 443.0 Mpps | 135.7 Mpps | 291.7 Mpps |
| 2 | 78.1 | 897.0 | 20.1 | 554.1 |
| 4 | 52.0 | 1,255.0 | 32.3 | 870.8 |
| 8 | 46.0 | 2,377.5 | 24.5 | 1,114.3 |
| 8스레드 / 1스레드 | 0.35× | 5.37× | 0.18× | 3.82× |

8스레드 기준으로 After는 Before보다 Mac에서 51.7배, VM에서 45.5배 많이 처리했습니다. 1스레드에서도 After가 빠르지만, lock·unlock과 relaxed add의 비용 차이는 이 글에서 따로 분해해 재지 않았습니다.

`perf c2c`는 cache line 공유를 직접 찾는 도구입니다. 이 VM에서는 돌지 않았습니다.

```text
$ perf c2c record -o /tmp/c2c.data -- ./counters local_packed 2 1000000
failed: no PMU supports the memory events
```

이 guest의 PMU는 메모리 접근 샘플링 이벤트를 제공하지 않습니다. 실제 보드에서 `local_packed` 같은 false sharing을 찾을 때는 그 보드의 PMU에서 `perf c2c record`가 먼저 동작하는지 확인합니다.

## 교훈

- **lock을 없애는 것과 공유를 없애는 것은 다릅니다.** mutex를 atomic으로 바꾸자 Mac 8스레드에서 46.0 → 17.5 Mpps로 오히려 나빠졌습니다.
- **잠든 시간과 바쁜 시간을 나눠 봅니다.** `mutex`는 context switch 11,646번으로 잠든 시간이 컸고, `atomic`은 15번뿐이었지만 CPU를 꽉 쓰면서 느렸습니다.
- **`perf lock`은 커널 lock을 봅니다.** user 공간 mutex 경합은 커널 futex 경로의 spinlock 경합(`do_futex`, `futex_wait_setup`)으로 간접적으로 보입니다.
- **padding은 대상 CPU의 line 크기로 정합니다.** M2 Pro는 128 B를 보고했고, 24 B 슬롯을 붙여 둔 `local_packed`는 8스레드에서 1스레드의 0.36배(Mac)였습니다.
- **USL은 잘 맞을 때만 씁니다.** 2스레드에서 처리량이 떨어지는 곡선에는 $[0,1]$ 범위 계수가 맞지 않았습니다.
- **공유 snapshot에는 동기화 규약이 필요합니다.** 일반 정수를 다른 스레드가 동시에 읽고 쓰면 C11에서 data race입니다.
- **한 번 잰 값을 믿지 않습니다.** 같은 `mutex` 8스레드가 실행마다 12.7~25.6 Mpps로 흔들렸습니다. 처리량은 도구 없이 여러 번 재서 중앙값을 씁니다.

측정 소스는 `counters.c` 한 파일이고, 실행은 `./counters <mode> <threads> 20000000`입니다.

다음 사례에서는 [카메라 payload와 DMA 경로](/blog/embedded/performance-engineering/part6-04-case-dma-tuning)를 조사합니다.

## 관련 항목

- [6-02: Cache Thrashing 사례](/blog/embedded/performance-engineering/part6-02-case-cache-thrashing)
- [6-04: DMA 성능 튜닝 사례](/blog/embedded/performance-engineering/part6-04-case-dma-tuning)
- [4-03: Lock Contention](/blog/embedded/performance-engineering/part4-03-lock-contention)
- [4-02: False Sharing](/blog/embedded/performance-engineering/part4-02-false-sharing)
- [5-01: perf 기초](/blog/embedded/performance-engineering/part5-01-perf-basics)
