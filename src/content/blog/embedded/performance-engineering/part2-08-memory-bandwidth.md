---
title: "메모리 대역폭 분석 — STREAM·Roofline·Bus Saturation 측정"
slug: "embedded/performance-engineering/part2-08-memory-bandwidth"
date: 2026-04-24T09:07:00
description: "STREAM의 byte 계산 규칙을 확인하고, M2 Pro와 Debian 게스트에서 Copy·Scale·Add·Triad를 직접 재며, Roofline과 Arm interconnect·PMU 이벤트를 정리합니다."
series: "Embedded Performance Engineering"
seriesOrder: 16
tags: [memory, bandwidth, stream, roofline]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> $\text{Bandwidth} = \text{bytes} / \text{second}$입니다. 대역폭이 saturation 상태에 이르면 CPU가 빠르지 않은 것이 아니라 메모리가 발목을 잡습니다.

## STREAM Benchmark

John McCalpin의 STREAM은 네 가지 단순한 루프로 지속 가능한 메모리 대역폭을 잽니다. [STREAM 설명 페이지](https://www.cs.virginia.edu/stream/ref.html)가 정한 반복당 byte와 FLOP은 다음과 같습니다.

| Kernel | 동작 | bytes/iter | FLOPS/iter |
|---|---|---:|---:|
| **Copy** | `a[i] = b[i]` | 16 | 0 |
| **Scale** | `a[i] = q * b[i]` | 16 | 1 |
| **Add** | `a[i] = b[i] + c[i]` | 24 | 1 |
| **Triad** | `a[i] = b[i] + q * c[i]` | 24 | 2 |

같은 페이지는 두 가지 규칙을 적습니다. 배열 하나가 실행에 쓰인 last-level cache 합의 4배 이상이거나 100만 원소 이상이어야 하고, byte는 "사용자가 읽고 쓰라고 요청한 byte"만 셉니다. 즉 store miss 때 하드웨어가 line을 먼저 읽어 오는 write-allocate traffic은 세지 않습니다(1-07의 triad OI 0.167 대 0.125가 이 차이입니다).

## 측정 — M2 Pro와 Debian 게스트

공식 `stream.c` 대신 같은 네 루프를 이 글에서 직접 써서 돌렸습니다(`bench/bw/mystream.c`). byte는 STREAM 규칙대로 16/16/24/24로 세고, 10회 중 첫 회를 뺀 최고값을 씁니다. M2 Pro에서는 배열 하나가 256 MiB(`double` 33,554,432개), 게스트에서는 128 MiB입니다.

| 환경 | thread | Copy | Scale | Add | Triad |
|---|---:|---:|---:|---:|---:|
| M2 Pro (`clang -O2`) | 1 | 99.3 | 93.5 | 89.2 | 89.7 |
| | 2 | 154.4 | 152.6 | 150.0 | 153.5 |
| | 4 | 173.8 | 168.2 | 152.5 | 154.2 |
| | 8 | 171.9 | 156.6 | 155.0 | 149.1 |
| Debian 게스트 (`gcc -O2`, 4 vCPU) | 1 | 51.6 | 50.9 | 72.6 | 73.0 |
| | 4 | 172.0 | 172.7 | 161.0 | 159.9 |

단위는 GB/s입니다. Apple은 M2 Pro의 unified memory 대역폭을 200 GB/s로 발표했습니다([Apple Newsroom, 2023-01-17](https://www.apple.com/newsroom/2023/01/apple-unveils-m2-pro-and-m2-max-next-generation-chips-for-next-level-workflows/)). thread 4개에서 Copy가 174 GB/s로 발표값의 87%였고, 그 뒤로는 thread를 늘려도 오르지 않았습니다. 1-07의 `mem` 측정에서 thread 2~4개부터 시간이 줄지 않았던 것과 같은 포화입니다. thread 하나로는 Triad가 90 GB/s에 그쳤습니다. 1-07의 bytes-in-flight 식으로 보면 154 GB/s를 2-05에서 잰 120 ns latency로 유지하려면 약 18.5 KB, 128 byte line으로 145개 정도가 동시에 나가 있어야 합니다. thread 하나가 왜 그만큼을 띄우지 못하는지는 이 측정으로 가르지 않았습니다.

## 이론치 계산

DRAM의 이론 최대 대역폭은 데이터율 × 버스 폭 × 채널 수입니다. 예를 들어 3200 MT/s, 32-bit(4 byte) 버스 하나라면 `3200 × 10⁶ × 4 byte = 12.8 GB/s`입니다. "1600 MHz DDR"처럼 클럭으로 적힌 사양은 클럭당 두 번 전송하므로 MT/s로 바꿀 때 한 번만 ×2 합니다. 실측이 이 값에 얼마나 가까운지는 위처럼 직접 재서 봅니다.

## Roofline Model

![Roofline Model — Memory vs Compute Bound 판별](/images/blog/perf-eng/diagrams/part2-08-roofline.svg)

- 알고리즘의 operational intensity(FLOP / DRAM byte)를 계산합니다(1-07).
- intensity가 ridge point보다 낮으면 memory-bound, 높으면 compute-bound입니다.

위 표에서 STREAM Triad는 24 byte에 2 FLOP, 즉 OI = 1/12입니다. M2 Pro에서 thread 4개로 154 GB/s였으니 Triad가 낼 수 있는 연산 성능은 154 × (1/12) ≈ 12.8 GFLOP/s로 묶입니다. 코어가 이보다 훨씬 많은 FLOP을 처리할 수 있어도 이 루프는 메모리 쪽 지붕 아래에 있습니다.

## Interconnect — Arm CCN과 CMN

Arm 서버·인프라용 SoC의 코어 cluster, 메모리 컨트롤러, I/O를 잇는 interconnect는 Arm CoreLink 계열입니다. Linux 6.12 커널 문서에 따르면 두 계열은 구조가 다릅니다.

- `Documentation/admin-guide/perf/arm-ccn.rst`: CCN-504(Cache Coherent Network)는 crosspoint(XP) 11개로 된 **ring bus**이고, XP마다 장치 포트가 두 개까지 있습니다.
- `Documentation/admin-guide/perf/arm-cmn.rst`: CMN-600(Coherent Mesh Network)은 crosspoint를 직사각형 격자로 놓은 **mesh**이고, XP마다 AMBA CHI agent가 붙는 장치 포트가 두 개까지 있습니다. 모든 XP에 local monitor(DTM)를 둔 분산 PMU를 가집니다.

![Arm CMN — Coherent Mesh Network 구조](/images/blog/perf-eng/diagrams/part2-08-ccn-mesh.svg)

그림은 mesh interconnect에 cluster, 메모리 컨트롤러, I/O가 붙는 모양을 개념적으로 보입니다. 실제 XP 수와 배치는 SoC마다 다릅니다.

## DRAM 측정 — perf event

```bash
perf stat -e cycles,instructions,cache-misses ./prog
```

Cortex-A53 TRM 12.9 표 12-28에는 0x19 `BUS_ACCESS`(Bus access), 0x1D `BUS_CYCLES`, 0x60 `BUS_ACCESS_LD`, 0x61 `BUS_ACCESS_ST`가 있습니다. 이 이벤트는 *접근 횟수*를 세므로 byte로 바꾸려면 접근 한 번의 폭을 알아야 하는데, 그 폭은 이 표에 나오지 않습니다. 위 STREAM 방식처럼 프로그램이 옮긴 byte를 시간으로 나누는 쪽이 해석이 분명합니다. CMN이 있는 SoC라면 위 `arm-cmn.rst`의 interconnect PMU로 메모리 쪽 traffic을 따로 볼 수 있습니다. 이 시리즈의 게스트에는 PMU 카운터가 없어 실행하지 못했습니다(1-01).

## Cortex-M7 MCU의 메모리

Cortex-M7 MCU는 TCM, 내부 SRAM, flash, 외부 메모리 컨트롤러가 서로 다른 버스에 붙어 있어 같은 load라도 어디를 읽느냐에 따라 시간이 다릅니다. M7 TRM 1.1.3에 따르면 I-TCM·D-TCM은 4 KB~16 MB로 구성하는 코어 직결 메모리입니다.

```c
__attribute__((section(".dtcm"))) float dtcm_buf[256];
```

구체적인 MCU의 영역별 latency와 wait state는 그 칩의 reference manual에 있습니다. 이 글에서는 보드로 재지 않았습니다.

## NUMA — Multi-Socket

Linux 서버에서는 다음과 같이 NUMA 토폴로지를 확인하고, CPU와 메모리를 같은 node에 묶습니다.

```bash
numactl --hardware
numactl --cpunodebind=0 --membind=0 ./prog
```

이 시리즈의 게스트는 node가 하나뿐이라 node 간 차이를 재지 못했습니다. 임베디드의 AMP 구성에서 코어마다 전용 SRAM 영역을 두는 것도 비슷한 생각입니다.

## DMA로 CPU offload

CPU가 직접 복사하면 대역폭과 함께 CPU cycle도 씁니다. DMA는 복사를 다른 bus master에게 넘깁니다.

```c
HAL_DMA_Start(&hdma, src, dst, len);
```

DMA 설정 비용과 CPU 복사의 손익분기점은 3-04에서 다룹니다.

## Streaming Store — Cache 우회

큰 buffer를 한 번 쓰고 다시 읽지 않는다면, 그 line을 캐시에 가져오는 것(write-allocate)이 낭비입니다. AArch64의 `STNP`와 Cortex-A53의 동작은 2-07에서 정리했습니다. A53 TRM 6.6.3에 따르면 A53에서 non-temporal load(`LDNP`)는 L2에만 할당됩니다.

## 자주 하는 실수

> ⚠️ "RAM이 크면 빠름" 오해

용량과 대역폭은 다른 사양입니다. 대역폭은 데이터율, 버스 폭, 채널 수로 정해집니다(위 이론치 계산).

> ⚠️ thread 하나로 시스템 대역폭을 판단

M2 Pro에서 thread 하나의 Triad는 90 GB/s, 넷은 154 GB/s였습니다. 시스템이 낼 수 있는 대역폭을 보려면 thread 수를 늘려 가며 포화점을 찾습니다.

> ⚠️ STREAM 숫자를 write-allocate까지 센 값으로 오해

STREAM은 요청한 byte만 셉니다. write-allocate 캐시에서는 실제 DRAM traffic이 Copy·Scale은 16이 아닌 24 byte, Add·Triad는 24가 아닌 32 byte일 수 있습니다.

> ⚠️ 배열이 캐시보다 작은 상태로 측정

STREAM 규칙은 배열 하나를 last-level cache 합의 4배 이상으로 두는 것입니다. M2 Pro의 P코어 L2는 16 MiB(`sysctl`)라 위 측정은 배열 하나를 256 MiB로 잡았습니다.

## 정리

- STREAM은 Copy/Scale/Add/Triad를 16/16/24/24 byte로 세고, write-allocate traffic은 세지 않습니다.
- M2 Pro에서 직접 쓴 STREAM 루프는 thread 4개에서 Copy 174 GB/s로 Apple 발표값 200 GB/s의 87%였고, 그 이상 thread를 늘려도 오르지 않았습니다.
- Triad의 OI는 1/12이므로 154 GB/s에서 12.8 GFLOP/s로 묶입니다.
- Arm CCN-504는 ring bus, CMN-600은 mesh입니다(Linux perf 문서).
- 하드웨어 bus 이벤트는 접근 횟수를 셉니다. byte로 바꾸려면 접근 폭을 알아야 합니다.

다음 편에서는 **SIMD/NEON**을 다룹니다.

## 관련 항목

- [2-07: Cache Line](/blog/embedded/performance-engineering/part2-07-cache-line)
- [2-09: SIMD NEON](/blog/embedded/performance-engineering/part2-09-simd-neon)

## 참고 자료

- [STREAM: Sustainable Memory Bandwidth in High Performance Computers](https://www.cs.virginia.edu/stream/ref.html)
- [Apple Newsroom, M2 Pro and M2 Max (2023-01-17)](https://www.apple.com/newsroom/2023/01/apple-unveils-m2-pro-and-m2-max-next-generation-chips-for-next-level-workflows/)
- Linux v6.12 `Documentation/admin-guide/perf/arm-ccn.rst`, `arm-cmn.rst`
- Cortex-A53 MPCore Technical Reference Manual (DDI 0500E) 6.6.3, 12.9 표 12-28; Cortex-M7 Technical Reference Manual (DDI 0489D) 1.1.3
