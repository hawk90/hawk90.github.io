---
title: "HBM 컨트롤러 입문 — DRAM 스케줄링과 AXI HBM IP"
slug: "embedded/hardware/hbm/chapter07-memory-controller"
date: 2026-05-16T09:07:00
description: "DRAM 공통 page policy·주소 매핑을 학습용 예제로 살펴보고 AMD AXI HBM IP의 공개 인터페이스와 구분합니다."
series: "HBM·GDDR 심화"
seriesOrder: 7
tags: [hbm, memory-controller, bank, scheduling]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"메모리 컨트롤러가 *bank parallelism을 얼마나 짜내느냐*가 실제 대역폭을 좌우합니다."** — bank·row·column 계층, command scheduling, address mapping, refresh 처리가 모두 *컨트롤러의 책임*입니다. 같은 HBM stack이라도 컨트롤러가 요청을 어떻게 흩고 묶느냐에 따라 실제로 쓰는 대역폭이 달라집니다.

[Ch 6](/blog/embedded/hardware/hbm/chapter06-thermal-power)에서 *HBM의 전력과 열*을 봤습니다. 이번 장은 *컨트롤러가 HBM을 어떻게 보는지*입니다.

## 컨트롤러가 보는 HBM

컨트롤러 입장에서 HBM3 stack 1개는 계층으로 나뉜 *주소 공간*입니다.

```text
HBM3 stack 주소 계층

stack (1024-bit)
└── Channel 0 .. 15       (16 channel, 64-bit)
    └── Pseudo Channel 0, 1   (32-bit)
        └── Bank (bank group으로 묶임)
            └── Row
                └── Column
```

channel 16개와 channel당 pseudo channel 2개는 [JEDEC의 2022년 HBM3 발표](https://www.businesswire.com/news/home/20220127005320/en/) 기준입니다. pseudo channel 아래의 *bank group·bank·row·column 개수와 주소 비트 배치*는 JEDEC 규격 원문에 있고, 이 장에서는 TBD로 둡니다.

## DRAM 명령 인터페이스

컨트롤러가 DRAM에 보내는 *기본 명령*은 DRAM 계열 공통입니다.

| 명령 | 역할 |
|---|---|
| ACT | row 활성화 |
| PRE | precharge |
| RD / WR | 열린 row의 column 읽기 / 쓰기 |
| REF | refresh |
| MRS | mode register 설정 |

명령 사이에는 *최소 간격(timing constraint)*이 있습니다. 대표적인 것이 같은 bank에서 ACT 뒤 RD까지 기다려야 하는 tRCD, PRE 뒤 다음 ACT까지 기다려야 하는 tRP입니다. HBM3의 실제 값은 TBD입니다.

bank group이 있는 DRAM에서는 *같은 bank group 안*의 연속 column 명령 간격(tCCD_L)이 *다른 bank group으로 넘어갈 때*(tCCD_S)보다 *깁니다*. 그래서 컨트롤러는 연속 요청을 *bank group을 번갈아* 보내 명령 간격을 줄입니다.

## Scheduling — Open vs Closed Page

같은 row를 *계속 열어 둘지(Open)* *바로 닫을지(Closed)*가 핵심 정책 선택입니다.

**Open Page Policy** — 같은 row를 *열어 두고* 여러 column을 연속으로 읽습니다. 다음 요청도 같은 row면(row hit) ACT 없이 바로 RD합니다. 다른 row면(row miss) `PRE → ACT`를 거쳐야 합니다.

```text
ACT row=R
RD col=0
RD col=1
RD col=2
PRE
ACT row=R'
```

- **장점**: row hit이 많으면 latency가 짧음
- **단점**: row miss면 PRE·ACT 시간이 추가됨

**Closed Page Policy** — 한 번 읽고 바로 auto-precharge로 닫습니다.

```text
ACT row=R + RD col=0 + auto PRE
ACT row=R + RD col=1 + auto PRE
```

- **장점**: row buffer locality가 없을 때 단순함
- **단점**: row hit 기회를 버림

두 정책을 요청에 따라 선택하는 adaptive 정책도 설계할 수 있습니다. queue에 같은 row로 가는 요청이 더 있으면 열어 두고, 없으면 auto-precharge로 닫습니다.

## Bank parallelism — 인터리브의 핵심

![Bank Interleaving — Bad vs Good](/images/blog/hbm/diagrams/ch07-bank-interleaving.svg)

- **Bad** — 요청이 같은 bank의 다른 row로만 몰리면 매번 PRE·ACT를 기다려야 하고 나머지 bank는 놉니다.
- **Good** — 요청이 여러 bank로 흩어지면 한 bank가 row를 여는 동안 다른 bank가 데이터를 보냅니다.

이를 가능하게 하려면 *address-to-bank mapping*이 *균등*해야 합니다.

## Address mapping — XOR hash

주소의 *상위 비트를 그대로 bank 번호*로 쓰면, 큰 stride로 도는 access가 *한 bank*에 몰릴 수 있습니다.

학습용 linear 예를 `bank=(address >> 20) & 15`로 정의하면 1 MiB 미만 범위에서는 bank 0에 몰립니다. 반면 1 MiB stride는 bank를 순환합니다. 따라서 큰 stride라는 사실만으로 conflict를 예측할 수는 없습니다.

해결책 중 하나가 *XOR hash mapping*입니다. 여러 비트 구간의 XOR가 특정 access pattern의 분포를 바꾸는지 비교할 수 있습니다. 모든 stride의 충돌을 없애는 보장은 없습니다.

다음 순수 함수는 **가상의 주소 매핑**을 비교하는 학습용 모델입니다. HBM 규격·상용 컨트롤러의 register나 실제 주소 decoder를 구현한 것이 아닙니다.

```c title="hbm-toy-mapping.c"
#include <stdint.h>
struct mapping { unsigned channel, bank; };
struct mapping toy_mapping(uint64_t addr) {
    uint64_t burst = addr >> 5;
    struct mapping result = {
        (unsigned)(((burst >> 4) ^ (burst >> 12) ^ (burst >> 20)) & 15),
        (unsigned)(((burst >> 8) ^ (burst >> 16)) & 15)
    };
    return result;
}
```

예를 들어 2 MiB stride의 주소 16개는 이 모델에서 bank 16개로 분산되지만 channel은 모두 0입니다. XOR를 넣었다고 모든 stride·모든 계층의 분포가 좋아지는 것은 아닙니다. 또한 `0`과 `(1<<13)|(1<<21)` 주소는 같은 channel·bank로 충돌합니다. 실제 비교에서는 row까지 포함한 요청 trace와 ordering·timing 제약을 봐야 합니다.

이 모델로 상용 GPU·NPU의 실제 mapping을 추정하거나 단정하지 않습니다.

## Per-bank refresh — bandwidth 보호

*all-bank refresh*는 refresh하는 동안 *모든 bank*를 멈춥니다. *per-bank refresh*는 *한 bank만* refresh하고 나머지 bank는 계속 일하게 합니다.

![REFab vs REFpb](/images/blog/hbm/diagrams/ch07-refpb.svg)

per-bank refresh를 쓰려면 컨트롤러가 *bank별 refresh 일정*을 추적해야 합니다. HBM 세대별 지원 여부와 refresh 손실 비율은 TBD입니다.

## Read-write turnaround

같은 data bus 위에서 *Read 뒤 Write*나 *Write 뒤 Read*로 방향을 바꾸면 *turnaround* 시간이 듭니다. queue에서 RD와 WR이 섞여 도착해도, 좋은 컨트롤러는 *RD끼리, WR끼리 묶어* 방향 전환 횟수를 줄입니다.

![Batched RD/WR Scheduling](/images/blog/hbm/diagrams/ch07-batched-rw.svg)

queue가 `R W R W R W R W`로 도착해도 `R R R R / W W W W`로 묶으면 turnaround가 *여러 번에서 한 번*으로 줄어듭니다.

## ECC

HBM3는 DRAM die 안에 *on-die ECC(symbol 기반)*를 표준으로 둡니다. 컨트롤러가 그 위에 별도 ECC를 더하는지는 제품마다 다릅니다.

## Outstanding request queue

컨트롤러는 *여러 outstanding request*를 *동시에 추적*해 *bank별로 schedule*합니다.

![HBM 컨트롤러 내부 큐 — address mapping, per-bank queue, scheduler, bus](/images/blog/hardware/hbm/diagrams/ch07-controller-queue.svg)

[Rixner 등의 Memory Access Scheduling(ISCA 2000)](https://www.ece.ualberta.ca/~elliott/ece510/seminars/2002f/2002-10-29/p128-rixner.pdf)은 DRAM locality를 이용한 요청 재배치를 연구합니다. FR-FCFS에서는 timing 제약상 ready인 명령을 우선하고 그 안에서 도착 순서를 고려합니다. row hit도 tCCD·turnaround·종속성 때문에 항상 즉시 ready인 것은 아닙니다. 재배치는 동일 주소의 의존성과 가시성 순서를 보존해야 하며, row miss 요청의 starvation 방지 정책도 필요합니다.

## FPGA 예 — Xilinx HBM

FPGA에서는 HBM 컨트롤러가 IP로 제공됩니다. [U55C DS978 v1.3(2023-06-23)](https://docs.amd.com/r/en-US/ds978-u55c/Product-Details)의 공개값은 16 GB HBM2·460 GB/s입니다. [PG276 1.0(2025-12-17) Features](https://docs.amd.com/r/en-US/pg276-axi-hbm/Features)는 stack당 16개의 256-bit AXI3 slave port와 dual-stack의 32 port 확장을 설명합니다. 총 460을 32로 나눈 14.375 GB/s는 산술 평균이며 개별 경로의 보장 대역폭이 아닙니다. 교차 경로·동시 요청·목적지 경쟁은 별도 제약을 받습니다. [AXI Considerations](https://docs.amd.com/r/en-US/pg276-axi-hbm/AXI-Considerations)는 32-byte 정렬·고정 AxSIZE=5와 작은 write의 효율 저하를 설명합니다.

사용자 로직은 memory-mapped AXI 포트로 접근하고 crossbar를 거쳐 HBM 주소 공간을 사용합니다. 이는 AXI-Stream 인터페이스가 아니며, 포트 개수와 독립적인 물리 대역폭 경로 개수를 같은 것으로 취급하면 안 됩니다.

## 자주 하는 실수

### "address mapping은 신경 쓸 필요가 없다"

기본 mapping은 *일반적인 access*에 맞춰져 있습니다. access pattern이 특정 stride에 몰리면 *bank conflict*가 생길 수 있어, 성능이 이상하면 mapping과 access pattern을 함께 봐야 합니다.

### "open page가 *항상* 좋다"

random access가 많은 workload에서는 row hit이 드물어 *closed page*가 낫습니다. 어느 정책이 유리한지는 요청 trace와 timing model로 비교해야 합니다.

### tCCD_L과 tCCD_S를 거꾸로 이해

같은 bank group 안(tCCD_L)이 *더 깁니다*. 연속 요청은 bank group을 *번갈아* 보내야 간격이 짧아집니다.

### "Xilinx HBM IP는 AXI-Stream이다"

AXI HBM Controller IP는 *memory-mapped AXI* 포트 32개를 엽니다. AXI-Stream이 필요하면 사용자 로직에서 따로 감싸야 합니다.

## 정리

- HBM3 stack은 컨트롤러에게 *16 channel × 2 pseudo channel* 아래 bank·row·column 계층으로 보입니다.
- 컨트롤러는 *page policy, bank 인터리브, address mapping, refresh 처리, RD/WR 묶기*로 실제 대역폭을 끌어올립니다.
- bank group이 있으면 *다른 group으로 번갈아* 보내야 명령 간격이 짧아집니다.
- *FR-FCFS*는 row hit을 우선 처리하는 대표 scheduling 정책입니다.
- Xilinx HBM IP는 *256-bit memory-mapped AXI 포트 32개*로 HBM2 pseudo channel 32개에 접근합니다.

## 다음 편

[Ch 8: NPU·GPU에서의 활용](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage)에서는 *LLM weight·activation·KV cache가 HBM을 어떻게 채우는지*를 봅니다.

## 관련 항목

- [Ch 5: 대역폭 계산과 병목 분석](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck)
- [Ch 6: 열 설계와 전력 관리](/blog/embedded/hardware/hbm/chapter06-thermal-power)
- [Ch 8: NPU·GPU 활용](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage)
