---
title: "CXL.mem 지연·대역폭 실측 — Direct·Switch·Pooled 토폴로지 비교"
slug: "embedded/performance-engineering/part3-12-cxl-mem-latency"
date: 2026-06-16T09:01:00
description: "CXL.mem 토폴로지 세 가지의 구조, 실제 CXL 디바이스 실측(MICRO 2023), mlc·STREAM·DAMON으로 직접 재는 방법."
series: "Embedded Performance Engineering"
seriesOrder: 54
tags: [cxl, cxl-mem, latency, bandwidth, numa, mlc, stream]
topics: ["embedded"]
---

## 한 줄 요약

> **"CXL.mem의 지연은 디바이스 설계에 크게 좌우됩니다."** 실제 CXL 메모리 디바이스 3종을 잰 연구(Sun et al., MICRO 2023)에서 load 지연이 원격 소켓 DDR5보다 35% 긴 것부터 거의 3배까지 갈렸습니다. 내 시스템의 값은 직접 재야 하고, 이 글은 그 측정 도구가 실제로 무엇을 출력하는지 보여 줍니다.

## 어떤 문제를 푸는가

[3-11](/blog/embedded/performance-engineering/part3-11-cxl-interconnect)에서 CXL의 세 프로토콜과 디바이스 타입을 봤습니다. 실제로 배치할 때는 *어느 토폴로지가 어떤 성능을 내는지*가 결정의 핵심입니다.

CXL.mem은 DDR DIMM 옆에 생기는 새 메모리 tier입니다. 집에 창고를 하나 더 지은 것과 비슷합니다. 공간은 늘었지만 물건을 꺼내러 가는 길이 멀어졌으니, 무엇을 거기 둘지는 *얼마나 먼지*를 알아야 정할 수 있습니다. 측정값 없이 "CXL.mem은 쓸 만하다/없다"를 말하면 서로 다른 디바이스와 토폴로지를 한 잣대로 재게 됩니다.

이 장은 CXL 3.1 명세가 정의하는 토폴로지, 공개된 실측 결과, 그리고 측정 도구(mlc·STREAM·DAMON)의 실제 사용법을 정리합니다.

## 세 가지 토폴로지

CXL.mem 배치 형태는 크게 세 가지입니다. 각 구성이 명세의 어느 절에 정의되는지 함께 적었습니다.

| 토폴로지 | 구성 | CXL 3.1 명세 |
|----------|------|----------|
| 1. Direct Attach | Host CPU → CXL link → Type 3 memory device | 2.3절 (Type 3 Device) |
| 2. Single Switch | Host CPU → CXL Switch → 여러 memory device | 1.4.1절 (CXL 2.0의 single-level switching, fan-out) |
| 3. Multi-Host Pool | 여러 Host → Switch → Multi-Logical Device(MLD). 각 Host에 Logical Device를 하나씩 배정 | 2.4절 (MLD는 최대 16개 LD로 분할), 2.4.3절 (Pooled Memory and Shared FAM) |

switch를 지나면 요청 경로에 장치가 하나 더 끼므로 지연이 늘어날 수 있습니다. 다만 이 글이 확인한 공개 실측(아래 Sun et al.)은 direct attach만 다뤄, switch·pool 구성의 지연 숫자는 TBD로 둡니다.

## 공개된 실측 — 실제 CXL 디바이스 3종

Sun et al., *Demystifying CXL Memory with Genuine CXL-Ready Systems and Devices*(MICRO 2023, [arXiv:2303.15375](https://arxiv.org/abs/2303.15375))는 Xeon 6430 두 소켓 서버(Table 1)에 실제 CXL 메모리 디바이스 3종을 붙이고, Intel MLC와 자체 마이크로벤치마크로 쟀습니다. 비교 기준은 다른 소켓의 DDR5(DDR5-R)입니다.

| 디바이스 (Table 1) | CXL IP / 메모리 | ld 지연, DDR5-R 대비 (4.1절 O2, Figure 3) |
|---------|----------|----------|
| CXL-A | Hard IP / DDR5-4800 | 35% 더 김 |
| CXL-B | Hard IP / 2× DDR4-2400 | 거의 2배 |
| CXL-C | Soft IP / DDR4-3200 | 거의 3배 |

논문의 결론은 *CXL 메모리 지연이 CXL 컨트롤러 설계에 크게 좌우된다*는 것입니다. 같은 DDR4를 쓴 CXL-C(DDR4-3200)가 CXL-B(DDR4-2400)보다 ld 지연이 67% 길었습니다. 메모리 속도가 더 빠른 쪽이 더 느렸으니, DRAM 사양만 보고 CXL 장치의 지연을 짐작할 수 없다는 뜻입니다.

## 측정 방법 — mlc

Intel Memory Latency Checker(MLC)는 NUMA 노드 사이의 지연·대역폭을 재는 도구입니다. [Intel MLC 페이지](https://www.intel.com/content/www/us/en/developer/articles/tool/intelr-memory-latency-checker.html)(v3.13)는 v3.0 설명에서 "NUMA nodes which have only memory resources without any compute resources"의 지연을 잴 수 있다고 적고, v3.7 변경 내역에 "Support for NUMA nodes with no CPU resources"를 적습니다. CXL 메모리가 CPU 없는 노드로 올라온 시스템이면 그대로 쓸 수 있다는 뜻입니다. 같은 페이지의 모드 설명은 다음과 같습니다.

```bash
./mlc --latency_matrix     # "a matrix of local and cross-socket memory latencies"
./mlc --idle_latency       # "the idle memory latency of the platform"
./mlc --loaded_latency     # "the loaded memory latency of the platform"
./mlc --bandwidth_matrix   # "a matrix of local and cross-socket memory b/w"
```

이 글의 측정 환경은 Apple M2 Pro 위의 arm64 VM이라 MLC는 돌리지 않았습니다. 페이지는 지원 OS로 Linux와 Windows를 적고, Arm에 대한 언급은 없습니다.

## STREAM으로 본 sustained bandwidth

STREAM은 큰 배열 세 개로 Copy·Scale·Add·Triad 네 커널의 처리량을 잽니다. CXL 노드가 있으면 `--membind`로 배열을 그 노드에만 두고 local 노드 결과와 비교합니다. 이 글에서는 CXL 노드가 없으니, 같은 절차를 local 노드에서 돌려 *출력이 어떻게 생겼고 얼마나 흔들리는지*를 봤습니다.

환경은 Debian 13 arm64 게스트(커널 6.12.116, HVF, 8 vCPU, 8 GiB, Apple M2 Pro 호스트), STREAM 5.10, GCC 14.2.0입니다.

```bash
gcc -O3 -fopenmp -DSTREAM_ARRAY_SIZE=80000000 -DNTIMES=10 -o stream stream.c
OMP_NUM_THREADS=8 numactl --cpunodebind=0 --membind=0 ./stream
```

배열 하나가 8천만 개 double(640 MB)이라 캐시보다 훨씬 큽니다. 다섯 번 돌린 *Best Rate*(STREAM 출력의 MB/s)를 정리하면 다음과 같습니다.

| 커널 | 5회 중앙값 (MB/s) | 5회 범위 (MB/s) |
|---|---|---|
| Copy | 111,606 | 108,457~127,973 |
| Scale | 126,770 | 111,421~144,948 |
| Add | 126,792 | 110,466~141,289 |
| Triad | 120,830 | 97,626~124,595 |

같은 커널의 Best Rate가 실행마다 크게는 28%(Triad 97,626 → 124,595) 차이 났고, 같은 실행 안에서 Avg time이 Min time의 두 배를 넘는 줄도 있었습니다. 다른 VM이 같은 호스트를 쓰는 중이었기 때문입니다. CXL tier를 이 방법으로 비교할 때는 local과 CXL을 같은 조건에서 번갈아 여러 번 돌려야, 이 정도 잡음보다 큰 차이만 결론으로 삼을 수 있습니다.

CXL 노드가 없는 시스템에서 `--membind`에 없는 노드를 주면 실행 자체가 거부됩니다.

```text
# numactl --membind=1 true
<1> is invalid
libnuma: Warning: node argument 1 is out of range
```

## DAMON으로 본 access 패턴

CXL tier에 무엇을 둘지는 *어느 메모리가 차가운지*를 알아야 정할 수 있습니다. DAMON(Data Access MONitor)이 그 답을 줍니다. v6.12 `Documentation/mm/damon/design.rst`에 따르면 DAMON은 `sampling interval`마다 접근 여부를 확인해 세고, `aggregation interval`마다 그 합(`nr_accesses`)을 보고합니다. 모든 page를 보지 않고, 인접 page를 region으로 묶어 region마다 page 하나만 무작위로 확인합니다("Region Based Sampling"). 도서관 사서가 책을 전부 세지 않고 서가마다 한 권씩 꺼내 먼지를 보는 식입니다.

실제로 돌려 봤습니다. 64 MiB 영역은 계속 쓰고, 448 MiB 영역은 처음에 한 번만 쓰는 프로그램입니다.

```c
char *cold = malloc(448 * MiB), *hot = malloc(64 * MiB);
memset(cold, 1, 448 * MiB);                  /* 한 번만 */
while (time(NULL) < end)
    for (size_t i = 0; i < 64 * MiB; i += 4096) hot[i]++;
```

커널 문서(`admin-guide/mm/damon/usage.rst`)가 소개하는 사용자 공간 도구 [damo](https://github.com/damonitor/damo) 3.4.5로 25초 기록했습니다. 같은 게스트(커널 6.12.116, `CONFIG_DAMON_SYSFS=y`)입니다.

```bash
./hotcold 40 &                       # 출력: hot=0xffff60e7e010 cold=0xffff64e7f010
damo record -o damon.data $(pgrep -n hotcold)
damo report access -i damon.data --style detailed --raw_number
```

마지막 snapshot에서 두 영역이 정확히 갈렸습니다(sample 5 ms, aggr 100 ms이라 최대 200 Hz).

| region 시작 (hex) | 크기 | access | age |
|---|---|---|---|
| `0xffff60e7e000` | 64 MiB (67,108,864 B) | 200 Hz | 100 ms |
| `0xffff64e7e000`부터 region 4개 | 합계 450.06 MiB | 0 Hz | 16.8~22.9 s |

hot 영역은 malloc이 돌려준 주소의 page 경계에서 정확히 64 MiB짜리 region 하나로 잡혔고, 최대 빈도(200 Hz)로 찍혔습니다. cold 영역은 20초 가까이 한 번도 접근되지 않은 region으로 나왔습니다. `--style temperature-sz-hist`로 보면 전체 1.192 GiB 중 가장 뜨거운 구간은 64.008 MiB뿐이었습니다. tiering 정책이 CXL로 내려보낼 후보가 바로 이 0 Hz region들입니다.

memory tier 쪽 sysfs도 같은 게스트에서 봤습니다. CXL 노드가 없으니 tier는 하나(`memory_tier4`, nodelist `0`)였고, `/sys/kernel/mm/numa/demotion_enabled`는 `false`였습니다. tier 번호는 v6.12 `mm/memory-tiers.c:242`가 abstract distance를 `MEMTIER_CHUNK_BITS`(7)만큼 오른쪽으로 민 값입니다. DRAM의 `MEMTIER_ADISTANCE_DRAM`은 4×128+64 = 576이라 576 >> 7 = 4가 됩니다. DAX/kmem이 올린 노드에 플랫폼 값이 없을 때 쓰는 기본값은 그 5배인 2880이라(`drivers/dax/kmem.c:24`), 계산상 `memory_tier22`에 들어갑니다.

## 토폴로지 선택

결정 변수는 *지연 budget*과 *용량*입니다. Sun et al.처럼 같은 direct attach라도 디바이스에 따라 지연이 35% 증가부터 거의 3배까지 갈리므로, 토폴로지보다 먼저 쓸 디바이스의 지연을 재고 워크로드의 지연 budget과 비교합니다. 그다음 DAMON으로 0 Hz에 가까운 영역의 크기를 재면, CXL tier에 내려보낼 수 있는 용량이 나옵니다.

## 자주 보는 함정과 안티패턴

> ⚠️ 링크 원시 전송률을 그대로 가정

32 GT/s × 16 ÷ 8 = 64 GB/s는 오버헤드 전 상한입니다. CXL 3.1 4.2.2절의 68B flit에는 2B CRC와 header slot이 들어가고, 디바이스 구현이 실효 대역폭을 다시 깎습니다. STREAM 같은 벤치마크로 잰 값으로 모델을 세웁니다.

> ⚠️ "CXL 메모리 지연은 하나의 값"

Sun et al.의 세 디바이스는 같은 시스템에서 35% 증가부터 거의 3배까지 갈렸습니다. 다른 디바이스의 수치를 가져다 쓰지 않고, 쓸 디바이스를 직접 잽니다.

> ⚠️ 한 번 잰 STREAM 값으로 결론

위 VM에서 Triad의 Best Rate는 실행마다 97,626~124,595 MB/s로 흔들렸습니다. local과 CXL의 차이가 이 범위보다 작다면, 그 측정으로는 차이를 말할 수 없습니다.

## 정리

- CXL.mem 지연은 디바이스 설계에 강하게 의존합니다. 실제 디바이스 3종이 원격 소켓 DDR5 대비 35% 증가부터 거의 3배까지 갈렸습니다(Sun et al., MICRO 2023, 4.1절).
- switch·pool 토폴로지는 명세(1.4.1, 2.4절)에 정의되어 있지만, 이 글이 확인한 공개 실측에는 없습니다.
- MLC는 CPU 없는 NUMA 노드의 지연을 재고(v3.0/v3.7), STREAM은 sustained 대역폭을, DAMON은 region별 접근 빈도를 잽니다.
- DAMON은 64 MiB hot 영역과 450 MiB cold 영역을 200 Hz와 0 Hz로 정확히 갈랐습니다.
- tier 번호는 abstract distance >> 7입니다. DRAM은 tier 4, 기본값으로 올라온 DAX 노드는 tier 22입니다.

다음 편은 [5-11: CXL 성능 프로파일링 도구](/blog/embedded/performance-engineering/part5-11-cxl-profiling-tools)로, cxl-cli·DAMON·perf-mem로 측정 환경 자체를 확인하는 법을 정리합니다.

## 관련 항목

- [2-08: 메모리 대역폭 분석 — STREAM·Roofline·Bus Saturation 측정](/blog/embedded/performance-engineering/part2-08-memory-bandwidth)
- [3-11: CXL Interconnect 분석](/blog/embedded/performance-engineering/part3-11-cxl-interconnect)
- [HBM·GDDR 심화 Ch 9: CXL.mem 분석 — HBM·GDDR·DDR 다음의 메모리 계층](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [HBM·GDDR 심화 Ch 8: NPU·GPU에서의 HBM 활용](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage) — LLM inference 메모리 분해
