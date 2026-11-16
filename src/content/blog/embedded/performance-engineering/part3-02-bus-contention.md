---
title: "Bus Contention 진단 — Arbitration·QoS·Starvation 측정"
slug: "embedded/performance-engineering/part3-02-bus-contention"
date: 2026-04-25T09:01:00
description: "M2 Pro에서 다른 thread의 memcpy가 피해자 load latency를 얼마나 늘리는지 재고, 중재 정책·AXI QoS·Cortex-M7 AHBS 중재를 사양서로 정리합니다."
series: "Embedded Performance Engineering"
seriesOrder: 20
tags: [bus, contention, arbitration, qos, starvation]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Contention = 여러 master가 한 slave에 동시에 접근하는 상황"**입니다. arbiter는 공평과 빠름 사이에서 trade-off를 선택합니다.

## 측정 — 다른 master가 버스를 쓰면 내 load가 얼마나 늦어지나

contention이 실제로 얼마나 큰지는 "피해자" 하나와 "가해자" 여럿을 같은 메모리에 붙여 보면 보입니다. M2 Pro에서 피해자 thread는 256 MiB 무작위 순환 리스트를 한 번에 한 load씩 따라가고(load latency를 그대로 드러냄), 가해자 K개는 각자 128 MiB를 반복해서 `memcpy`합니다(`bench/bus/contend.c`, `clang -O2`, K마다 2회). 측정 동안 호스트의 load average는 10 안팎이었습니다.

| 가해자 K | 피해자 load당 시간 (2회) | 가해자 합계 (2회) |
|---:|---|---|
| 0 | 121.0, 122.3 ns | — |
| 1 | 165.6, 167.7 ns | 85.6, 80.7 GB/s |
| 2 | 190.5, 224.0 ns | 110.6, 93.9 GB/s |
| 4 | 264.0, 476.5 ns | 116.8, 73.2 GB/s |
| 6 | 299.7, 558.9 ns | 136.8, 86.3 GB/s |

가해자가 하나만 있어도 피해자의 load가 37% 늦어지고, 여섯이면 2.5~4.6배가 됩니다. 피해자는 대역폭을 거의 쓰지 않는데도 느려졌으므로, 같은 메모리 경로에서 가해자의 요청 뒤에 줄을 섰다고 해석할 수 있습니다. 가해자 합계는 K = 2부터 73~137 GB/s 사이에서 흔들릴 뿐 크게 늘지 않았고(2-08의 STREAM에서도 thread 넷에서 포화), 그 사이 피해자의 지연은 계속 커졌습니다.

처음 이 프로그램을 돌렸을 때는 가해자의 `memcpy` 결과를 아무도 읽지 않아 컴파일러가 복사를 지웠고, 가해자 수를 늘려도 피해자가 느려지지 않았습니다(`contend-mac-broken.log`). 1-06과 같은 함정이라 buffer를 asm memory clobber로 붙잡아 다시 쟀습니다.

## Arbitration 정책

slave 하나를 여러 master가 원하면 arbiter가 cycle마다 하나를 고릅니다. 정책 차이를 보려고 가장 단순한 경우를 시뮬레이션했습니다. master A는 매 cycle 요청하고(DMA처럼), master B는 10 cycle마다 한 번 요청해 받을 때까지 기다립니다(`bench/bus/arb.py`, 10만 cycle).

| 정책 | A가 받은 cycle | B가 받은 횟수 | B의 최대 대기 |
|---|---:|---:|---:|
| 고정 우선순위 (A > B) | 100.0% | 0 | 끝까지 받지 못함 |
| Round-robin | 90.0% | 10,000 | 1 cycle |

고정 우선순위에서는 A가 쉬지 않는 한 B는 영원히 기다립니다. 이것이 starvation입니다. round-robin은 B가 요청하면 그 cycle 안에 받게 해 주는 대신(시뮬레이션 초기 상태 때문에 처음 한 번만 1 cycle) A의 몫을 10% 덜어 냅니다. 가중 round-robin은 master마다 몫을 다르게 정하는 방식이고, QoS 기반 중재는 요청마다 붙은 값으로 고릅니다.

### QoS-Based (AXI)

![QoS-based arbitration — ARQOS 4-bit priority로 master 선택](/images/blog/perf-eng/diagrams/part3-02-arbitration.svg)

AXI(IHI 0022 Issue L) A4.8.1에 따르면 AxQOS는 4 bit이고, 프로토콜은 쓰임을 정하지 않지만 값이 클수록 높은 우선순위로 쓰기를 권합니다. 같은 절의 기본 시스템 동작은 "고를 수 있는 transaction이 둘 이상인 구성 요소가 QoS 값이 높은 요청을 먼저 처리하는 것"이고, 이 선택은 다른 AXI 순서 규칙이 없을 때만 일어나며 AXI 순서 규칙이 QoS보다 앞섭니다. 또 interconnect가 연결된 Manager마다 QoS 값을 덮어쓰는 프로그래머블 레지스터를 둘 것으로 예상한다고 적습니다.

## Cortex-A SoC — CCI-400 사례

Arm 블로그 "Extended System Coherency - Part 2"의 표에 따르면 CoreLink CCI-400은 slave 인터페이스로 ACE fully-coherent 2개(최대 8 코어)와 ACE-Lite IO-coherent 3개(GPU, 가속기 등)를, master 인터페이스로 메모리용 ACE-Lite 2개(인터리빙 옵션)와 시스템용 ACE-Lite 1개를 두고, QoS로 "Integrated bandwidth and latency regulators, QoS Virtual Networks"를 제공합니다. 레지스터 이름과 설정 방법은 CCI-400 TRM과 SoC 문서에 있고, 이 글에서는 다루지 않습니다.

## Cortex-M7 — TCM을 두고 CPU와 DMA가 다툴 때

Cortex-M7 TRM(DDI 0489D) 1.1에 따르면 M7은 TCM을 전용 TCM 인터페이스로 접근하고, DMA 같은 외부 master는 AHB-Lite slave 포트(AHBS)를 통해 TCM에 들어옵니다. 그래서 CPU가 TCM을 쓰는 동안 같은 TCM에 DMA가 들어오면 둘 사이의 중재가 필요하고, M7은 이것을 `CM7_AHBSCR`(TRM 3.3.12 표 3-15)로 정합니다.

| 필드 | 표 3-15의 설명 |
|---|---|
| `CTL` [1:0] | 0b00 AHBS 접근 우선순위 낮춤(리셋값), 0b01 소프트웨어 접근 우선순위 낮춤, 0b10 소프트웨어 실행 우선순위가 `TPRI` 이상이면 AHBS를 fairness counter로 낮추고 그 아래면 round-robin |
| `TPRI` [10:2] | AHBS traffic을 낮출 실행 우선순위 문턱(NVIC 인코딩) |
| `INITCOUNT` [15:11] | fairness counter 초기값(리셋값 0b01). round-robin은 1(`0b01`). 0으로 두면 낮춘 쪽이 항상 이겨 livelock이 날 수 있음 |

리셋값은 `CTL` = 0b00, `INITCOUNT` = 0b01이고, 표 3-15의 주석대로 이 조합은 round-robin입니다(TRM 5.6.3은 fairness counter로 승자를 정하는 다섯 가지 중재 모드를 설명합니다). `INITCOUNT`를 키우면 낮춘 쪽(리셋값에서는 AHBS, 즉 DMA)의 몫이 줄어듭니다. DMA가 TCM에 쓰는 시간이 중요하다면 `CTL`과 `TPRI`로, "높은 우선순위 ISR이 돌 때만 CPU를 먼저 보내고 평소에는 번갈아" 같은 정책을 고를 수 있습니다. 이 글에서는 보드에서 실행하지 않았습니다.

## 측정 — PMU

Cortex-A53 TRM 12.9 표 12-28에는 0x19 `BUS_ACCESS`, 0x1D `BUS_CYCLES`, 0x60 `BUS_ACCESS_LD`, 0x61 `BUS_ACCESS_ST`가 있습니다.

```bash
perf stat -e r19,r1d,r60,r61 ./prog
```

`BUS_ACCESS / BUS_CYCLES`는 cycle당 접근 수이지 버스 점유율이 아닙니다. 점유율을 계산하려면 버스가 바빴던 cycle을 세는 카운터가 있어야 하는데, A53 표 12-28에는 그런 이벤트가 없습니다. SoC의 interconnect PMU(CMN이라면 Linux `arm-cmn.rst`의 분산 PMU)가 그 정보를 줍니다. 이 시리즈의 게스트에는 PMU 카운터가 없어 실행하지 못했습니다(1-01). 위 M2 Pro 실험처럼 피해자의 latency를 직접 재는 것이 카운터 없이도 할 수 있는 측정입니다.

## 충돌을 줄이는 방법

### 전용 경로 — TCM

```c
__attribute__((section(".dtcm"))) uint8_t fast_buf[8192];

void critical_isr(void) {
    process(fast_buf);   /* AXIM을 거치지 않는 TCM 인터페이스 */
}
```

CPU의 TCM 접근은 AXIM과 그 뒤의 bus matrix를 거치지 않으므로, DRAM이나 SRAM을 두고 다투는 다른 master의 영향을 받지 않습니다. 다만 위 절처럼 DMA가 AHBS로 같은 TCM에 들어오면 `CM7_AHBSCR`의 중재를 받습니다.

### 서로 다른 메모리로 나누기

위 M2 Pro 측정에서 피해자가 느려진 것은 모두가 같은 DRAM을 썼기 때문입니다. CPU가 자주 쓰는 데이터와 DMA buffer를 서로 다른 메모리(예: TCM과 SRAM, 또는 독립된 SRAM 뱅크)에 두면 같은 큐에서 기다리지 않습니다. 어떤 경로가 독립인지는 MCU reference manual의 bus matrix 표에 있습니다.

### 바쁜 대기 대신 sleep

```c
HAL_DMA_Start(&hdma, src, dst, len);
while (!dma_done) { }    /* CPU가 플래그를 계속 읽음 */
```

이 루프는 `dma_done`이 캐시나 TCM에 있으면 버스를 거의 쓰지 않지만, 주변장치 레지스터를 polling한다면 그때마다 버스 transaction이 생깁니다. 완료를 인터럽트로 받고 그동안 `__WFI()`로 재우면 CPU 쪽 접근 자체가 없어집니다.

## 자주 하는 실수

> ⚠️ 모든 master의 QoS를 최대로

AXI A4.8.1의 기본 동작은 QoS 값이 *높은* 요청을 먼저 고르는 것이므로, 모두가 같은 값이면 QoS로는 구별이 생기지 않습니다. 그때 무엇을 먼저 처리할지는 interconnect의 나머지 중재 규칙이 정합니다.

> ⚠️ 독립 요청에 같은 ID 사용

AXI A5.6에 따르면 같은 ARID로 서로 다른 Subordinate에 보낸 read는 interconnect가 요청 순서대로 돌려줘야 합니다(3-01). 서로 무관한 요청에 같은 ID를 쓰면 빠른 쪽 응답이 느린 쪽을 기다립니다.

> ⚠️ contention을 측정하지 않고 CPU 탓

위 측정에서 피해자 코드는 한 줄도 바뀌지 않았는데 다른 thread 때문에 load가 2.5배 이상 느려졌습니다. 혼자 돌릴 때와 실제 부하를 함께 걸었을 때의 latency를 둘 다 잽니다.

## 정리

- M2 Pro에서 `memcpy` thread를 0개에서 6개로 늘리자, 대역폭을 거의 쓰지 않는 피해자 thread의 load가 121 ns에서 300~559 ns가 됐습니다.
- 고정 우선순위는 쉬지 않는 master가 있으면 다른 master를 굶깁니다. round-robin은 최대 대기를 1 cycle로 묶습니다(시뮬레이션).
- AXI QoS는 4 bit이고, 기본 동작은 높은 값을 먼저 고르는 것이며, AXI 순서 규칙이 QoS보다 앞섭니다.
- Cortex-M7은 TCM을 두고 CPU와 AHBS(DMA)가 다툴 때의 정책을 `CM7_AHBSCR`로 정합니다.
- `BUS_ACCESS / BUS_CYCLES`는 점유율이 아닙니다. 피해자 latency를 직접 재는 것이 가장 분명한 측정입니다.

다음 편에서는 **DMA Performance**를 다룹니다.

## 관련 항목

- [3-01: Bus Architecture](/blog/embedded/performance-engineering/part3-01-bus-architecture)
- [3-03: DMA Performance](/blog/embedded/performance-engineering/part3-03-dma-performance)

## 참고 자료

- AMBA AXI Protocol Specification (ARM IHI 0022, Issue L) A4.8.1, A5.6
- Cortex-M7 Technical Reference Manual (DDI 0489D) 1.1, 3.3.12 표 3-15
- Cortex-A53 MPCore Technical Reference Manual (DDI 0500E) 12.9 표 12-28
- [Arm, Extended System Coherency - Part 2](https://developer.arm.com/community/arm-community-blogs/b/architectures-and-processors-blog/posts/extended-system-coherency---part-2---implementation-big-little-gpu-compute-and-enterprise)
