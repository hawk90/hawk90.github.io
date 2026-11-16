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

> **"메모리 컨트롤러가 *bank parallelism을 얼마나 짜내느냐*가 실제 대역폭을 좌우합니다."** — bank·row·column 계층, command scheduling, address mapping, refresh 처리가 모두 *컨트롤러의 책임*입니다. AMD의 HBM 컨트롤러 문서는 8-byte write 하나가 32-byte burst와 같은 시간을 써서 *이론 peak의 25%*로 떨어진다고 적습니다. 같은 HBM stack이라도 컨트롤러가 요청을 어떻게 흩고 묶느냐에 따라 실제로 쓰는 대역폭이 달라집니다.

[Ch 6](/blog/embedded/hardware/hbm/chapter06-thermal-power)에서 *HBM의 전력과 열*을 봤습니다. 이번 장은 *컨트롤러가 HBM을 어떻게 보는지*입니다. 이 장의 HBM2 수치는 HBM 컨트롤러의 주소 배치와 효율 조건을 적은 [AMD PG276 (AXI High Bandwidth Memory Controller, 2025-12-17판)](https://docs.amd.com/r/en-US/pg276-axi-hbm/Features)을 기준으로 합니다.

## 컨트롤러가 보는 HBM

컨트롤러 입장에서 HBM stack 1개는 계층으로 나뉜 *주소 공간*입니다.

| 계층 | HBM2 (PG276, 8H stack) | HBM3 (JEDEC 2022 발표·JESD238B.01 페이지) |
|------|------|------|
| stack | 1024-bit | 1024-bit |
| channel | 8개, 128-bit | 16개, 64-bit |
| pseudo channel | channel당 2개, 64-bit | channel당 2개 |
| bank | 8H device 32 bank (bank group 8 × 4) | 16-Hi에서 최대 64 bank (12-Hi보다 16개 많음) |

HBM2 열은 PG276의 *Physical Address Map for 4H and 8H Devices* 표에서 8H(stack당 8 GB) 열입니다. 4H는 bank 16개(bank group 4 × 4)이고, 8H는 늘어난 bank 비트를 *SID* 비트로 씁니다. PG276은 같은 표에 row 주소 RA[13:0], column 주소 CA[5:1]도 적습니다. HBM3의 bank 수는 [JEDEC의 2022년 HBM3 발표](https://www.jedec.org/news/pressreleases/jedec-publishes-hbm3-update-high-bandwidth-memory-hbm-standard)에 없어 [Synopsys의 2022년 4월 16일 HBM3 설명](https://www.synopsys.com/articles/hbm3-ip-dwtb.html)을 따랐습니다. Synopsys는 bank 수를 세는 단위를 밝히지 않으며, 인용한 자료에는 HBM3의 row·column 주소 폭이 없습니다.

PG276은 HBM 동작이 *DDR4와 특히 비슷*하고, bank당 *열린 row는 하나*라고 설명합니다. 같은 bank의 다른 row로 가려면 지금 row를 *precharge*한 뒤 *activate*해야 합니다.

## DRAM 명령 인터페이스

컨트롤러가 DRAM에 보내는 *기본 명령*입니다. [Rixner 등의 Memory Access Scheduling (ISCA 2000)](http://cva.stanford.edu/publications/2000/mas.pdf)이 DRAM 동작을 같은 단위(bank precharge, row activation, column access)로 설명합니다.

| 명령 | 역할 |
|---|---|
| ACT | row 활성화 |
| PRE | precharge |
| RD / WR | 열린 row의 column 읽기 / 쓰기 |
| REF | refresh |

명령 사이에는 *최소 간격(timing constraint)*이 있습니다. bank group이 있는 DRAM에서는 *같은 bank group 안*의 연속 column 명령 간격(tCCD_L)이 *다른 bank group으로 넘어갈 때*(tCCD_S)보다 *깁니다*. 예를 들어 [Kingston 8 Gb DDR4 데이터시트 (rev G00, 2023-06)](https://mm.digikey.com/Volume0/opasdata/d220001/medias/docus/5411/8G%20Bits%20DDR4%20SDRAM.pdf)의 IDD 측정 timing 표는 DDR4-3200에서 *tCCD_S 4 nCK, tCCD_L 8 nCK*입니다. HBM에 대해서도 PG276은 *다른 bank group의 bank 사이 접근 시간이 같은 bank group 안보다 짧다*고 적습니다. 인용한 자료에는 HBM3의 tCCD 값이 없습니다.

그래서 PG276의 기본 주소 배치는 *Bank Group Interleave*를 켭니다. bank group 번호의 최하위 비트 BG0를 HBM 주소의 최하위 사용자 비트(addr[5])에 둬서, AxLEN 0x1인 AXI 요청 하나가 *Bank Group 0과 Bank Group 1*에 하나씩 명령을 보내게 합니다.

## Scheduling — Open vs Closed Page

같은 row를 *계속 열어 둘지(Open)* *바로 닫을지(Closed)*가 핵심 정책 선택입니다. Rixner 논문은 두 정책을 다음처럼 정의합니다.

| 정책 | 언제 precharge하나 | 논문이 권하는 상황 |
|------|------|------|
| open | 그 bank의 *다른 row로 가는 요청이 대기 중*이고 *열린 row로 가는 요청이 없을 때만* | row locality가 커서 다음 요청도 같은 row일 가능성이 클 때 |
| closed | *열린 row로 가는 대기 요청이 없어지자마자* | 다음 요청이 같은 row일 가능성이 낮을 때 |

open 정책에서 같은 row의 요청(row hit)은 ACT 없이 바로 RD합니다. 다른 row면(row miss) `PRE → ACT`를 거칩니다.

```text
ACT row=R
RD col=0
RD col=1
RD col=2
PRE
ACT row=R'
```

PG276도 *row를 연 뒤 그 row 안에서 column 접근을 여러 번 하라*고 권하고, 이것이 *page hit rate를 높여 효율을 올린다*고 적습니다.

## Bank parallelism — 인터리브의 핵심

![Bank Interleaving — Bad vs Good](/images/blog/hbm/diagrams/ch07-bank-interleaving.svg)

- **Bad** — 요청이 같은 bank의 다른 row로만 몰리면 매번 PRE·ACT를 기다려야 하고 나머지 bank는 놉니다.
- **Good** — 요청이 여러 bank로 흩어지면 한 bank가 row를 여는 동안 다른 bank가 데이터를 보냅니다.

이를 가능하게 하려면 *address-to-bank mapping*이 요청을 bank에 고르게 나눠야 합니다.

## Address mapping — XOR hash

주소의 *특정 비트 구간을 그대로 bank 번호*로 쓰면, 그 구간이 바뀌지 않는 access는 *한 bank*에 몰립니다. PG276의 컨트롤러는 *AXI에서 물리 HBM으로의 유연한 address mapping*을 기능으로 두고, 기본값으로 bank group interleave를 켭니다. 아래 학습용 모델은 여러 비트 구간을 XOR해 bank 번호를 만드는 방식을 linear 방식과 비교합니다.

다음 C 코드는 **가상의 주소 매핑 두 개**를 비교하는 학습용 모델입니다. `toy_mapping`은 XOR, `linear_bank`는 `(addr >> 20) & 15`입니다. HBM 규격·상용 컨트롤러의 register나 실제 주소 decoder를 구현한 것이 아닙니다.

```c title="hbm-toy-mapping.c"
#include <stdint.h>
#include <stdio.h>
struct mapping { unsigned channel, bank; };
struct mapping toy_mapping(uint64_t addr) {
    uint64_t burst = addr >> 5;
    struct mapping result = {
        (unsigned)(((burst >> 4) ^ (burst >> 12) ^ (burst >> 20)) & 15),
        (unsigned)(((burst >> 8) ^ (burst >> 16)) & 15)
    };
    return result;
}
static unsigned linear_bank(uint64_t addr) { return (unsigned)((addr >> 20) & 15); }
int main(void) {
    printf("2 MiB stride:\n");
    for (uint64_t i = 0; i < 16; ++i) {
        struct mapping m = toy_mapping(i << 21);
        printf("  addr=0x%08llx ch=%2u bank=%2u linear_bank=%2u\n",
               (unsigned long long)(i << 21), m.channel, m.bank, linear_bank(i << 21));
    }
    uint64_t a = 0, b = (1ull << 13) | (1ull << 21);
    struct mapping ma = toy_mapping(a), mb = toy_mapping(b);
    printf("0x%llx -> ch=%u bank=%u, 0x%llx -> ch=%u bank=%u\n",
           (unsigned long long)a, ma.channel, ma.bank, (unsigned long long)b, mb.channel, mb.bank);
    unsigned used = 0;
    for (uint64_t x = 0; x < (1u << 20); x += 4096) used |= 1u << linear_bank(x);
    printf("linear, 256 addrs at 4 KiB stride below 1 MiB: bank mask 0x%04x\n", used);
    return 0;
}
```

Apple clang 21.0.0 `-O2 -Wall`로 빌드해 실행한 출력입니다(2 MiB stride 16줄 중 앞뒤만 남김).

```text
$ ./hbm-toy-mapping
2 MiB stride:
  addr=0x00000000 ch= 0 bank= 0 linear_bank= 0
  addr=0x00200000 ch= 0 bank= 1 linear_bank= 2
  addr=0x00400000 ch= 0 bank= 2 linear_bank= 4
  ...
  addr=0x01c00000 ch= 0 bank=14 linear_bank=12
  addr=0x01e00000 ch= 0 bank=15 linear_bank=14
0x0 -> ch=0 bank=0, 0x202000 -> ch=0 bank=0
linear, 256 addrs at 4 KiB stride below 1 MiB: bank mask 0x0001
```

출력에서 세 가지가 보입니다.

- 2 MiB stride 16개는 XOR 모델에서 bank 0~15를 하나씩 쓰지만 linear 모델에서는 *짝수 bank 8개*만 씁니다.
- 같은 16개가 XOR 모델에서도 *channel은 모두 0*입니다. 한 계층을 고르게 만든 함수가 다른 계층까지 고르게 만들지는 않습니다.
- `0`과 `(1<<13)|(1<<21)` = `0x202000`은 XOR 모델에서도 같은 channel·bank로 충돌합니다. XOR가 모든 stride의 충돌을 없애지는 않습니다.

linear 모델에서 1 MiB 미만의 4 KiB stride 주소 256개는 bank mask가 `0x0001`, 곧 *bank 0 하나*에 몰립니다.

이 모델로 상용 GPU·NPU의 실제 mapping을 추정하거나 단정하지 않습니다.

## Per-bank refresh — bandwidth 보호

*all-bank refresh(REFab)*와 *per-bank refresh(REFpb)*는 refresh 명령의 단위가 다릅니다. HBM 쪽 공개 자료에서 REFpb 정의를 찾지 못해, 같은 개념을 정의한 [Micron Automotive LPDDR4/LPDDR4X 데이터시트(MT53E)](https://mm.digikey.com/Volume0/opasdata/d220001/medias/docus/7180/MT53E1G32D2FW.pdf)로 설명합니다. 이 데이터시트는 REFpb를 *지정한 bank 하나*에 수행하는 refresh로 정의하고, 기능 목록에 *concurrent bank operation을 위한 directed per-bank refresh*를 적습니다. 또 8개 bank를 REFpb로 *모두 한 번씩* refresh하기 전에는 같은 bank에 REFpb를 다시 보낼 수 없다는 규칙도 둡니다.

![REFab vs REFpb](/images/blog/hbm/diagrams/ch07-refpb.svg)

따라서 per-bank refresh를 쓰려면 컨트롤러가 *bank별 refresh 순서*를 추적해야 합니다. 인용한 HBM 자료에는 REFpb 정의나 refresh 손실 비율이 없습니다. PG276의 HBM 컨트롤러는 대신 *overhead를 줄이는 hidden single row refresh* 옵션을 둡니다.

## Read-write turnaround

PG276은 HBM stack에 *전기적 인터페이스가 하나뿐*이라 *Write를 마친 뒤 bus turnaround 시간을 기다려야 Read를 낼 수 있다*고 설명하고, 효율을 높이려면 *turnaround를 줄이고 한 방향으로 데이터를 오래 보내라*고 권합니다. 컨트롤러 기능 목록에도 *Read/Write grouping*이 있습니다.

![Batched RD/WR Scheduling](/images/blog/hbm/diagrams/ch07-batched-rw.svg)

queue가 `R W R W R W R W`로 도착하면 방향이 7번 바뀝니다. `R R R R / W W W W`로 묶으면 1번입니다.

## 요청 크기와 정렬 — 25%와 50%

PG276의 *AXI Considerations*는 HBM 인터페이스의 transaction 하나가 *burst length 4 × 64-bit DQ = 32 byte*라고 설명합니다. 그래서 다음이 효율을 깎습니다.

| 경우 | PG276이 적은 결과 |
|------|------|
| 8-byte write | 32-byte write와 같은 시간을 써서 *이론 peak의 25%* |
| 32-byte 경계에 맞지 않는 read | HBM에서 read 2번, *50% 이하* |
| 정렬 안 된 write, ECC 켬 | data mask를 못 써서 *read-modify-write 2번* |

8 ÷ 32 = 0.25이므로 25%는 전송 바이트 비율 그대로입니다. PG276은 같은 절 첫머리에서 IP가 *AxSIZE 0x5(32 byte) 고정*을 요구하고, 선형 접근에는 *AxLEN 0x1 이상*을 권한다고 적습니다.

## ECC

HBM3는 DRAM die 안에 *symbol 기반 on-die ECC*를 표준으로 둡니다(JEDEC 2022 발표). 컨트롤러 쪽 ECC는 별개입니다. PG276의 HBM2 컨트롤러는 *선택형 SECDED ECC*를 두고, 부분 write는 read-modify-write로 처리하며, *background scrubbing*으로 correctable error를 고쳐 다시 씁니다. 위 표처럼 ECC를 켜면 정렬 안 된 write의 비용이 커집니다.

## Outstanding request queue

컨트롤러는 *여러 outstanding request*를 *동시에 추적*해 *bank별로 schedule*합니다.

![HBM 컨트롤러 내부 큐 — address mapping, per-bank queue, scheduler, bus](/images/blog/hardware/hbm/diagrams/ch07-controller-queue.svg)

Rixner 논문은 이 재배치를 *memory access scheduling*이라 부릅니다. 순서 중 *처음으로 ready인 요청*을 먼저 처리하는 보수적 재배치(first-ready)가 media benchmark 5종 trace에서 *대역폭 40%*, 대역폭을 최적화하는 공격적 재배치가 *93%*를 올렸다고 보고합니다. 같은 논문은 오래 기다린 요청에 우선권을 주는 *age-threshold*로 starvation을 막습니다. PG276의 컨트롤러도 *ID가 다른 transaction은 재배치하고 같은 ID 안에서는 순서를 지키며*, 같은 master·같은 ID의 RAW·WAW를 검사합니다.

## FPGA 예 — Xilinx HBM

FPGA에서는 HBM 컨트롤러가 IP로 제공됩니다. [U55C DS978 v1.3(2023-06-23)](https://docs.amd.com/r/en-US/ds978-u55c/Product-Details)의 공개값은 16 GB·460 GB/s이고, block diagram에 HBM2 2개가 있습니다. PG276의 Features는 stack당 *16개의 256-bit AXI3 slave port*와 *16 × 16 crossbar*, dual-stack의 *32 port·32 × 32 crossbar* 확장을 설명합니다. port 하나의 256-bit는 HBM 쪽 64-bit와 *4:1 clock 비*로 맞춘 폭(`4 × 64`)입니다. 총 460을 32로 나눈 `460 ÷ 32 = 14.375 GB/s`는 산술 평균이며 개별 경로의 보장 대역폭이 아닙니다.

사용자 로직은 memory-mapped AXI3 포트로 접근하고 crossbar를 거쳐 *모든 pseudo channel의 주소 공간*을 사용합니다. AXI-Stream 인터페이스가 아닙니다.

## 자주 하는 실수

### "address mapping은 신경 쓸 필요가 없다"

위 실행에서 linear 모델은 4 KiB stride 주소 256개를 bank 하나에 몰았습니다. PG276이 기본 주소 배치에 bank group interleave를 켜 두고, 그 배치가 *짧은 혼합 traffic에 맞춘 것*이라고 적는 이유입니다. access pattern이 그 배치와 다르면 mapping 옵션을 다시 고릅니다.

### "open page가 *항상* 좋다"

Rixner 논문은 open 정책을 *row locality가 클 때*, closed 정책을 *다음 요청이 같은 row일 가능성이 낮을 때* 쓰라고 정의합니다. 어느 쪽인지는 요청 trace가 정합니다.

### tCCD_L과 tCCD_S를 거꾸로 이해

같은 bank group 안(tCCD_L)이 *더 깁니다*. Kingston DDR4-3200에서 8 nCK 대 4 nCK입니다. 연속 요청은 bank group을 *번갈아* 보내야 간격이 짧아집니다.

### "작은 write도 대역폭은 같다"

PG276 기준 8-byte write는 이론 peak의 25%입니다. 32-byte 단위로 묶고 정렬해야 합니다.

### "Xilinx HBM IP는 AXI-Stream이다"

AXI HBM Controller IP는 *memory-mapped AXI3* 포트(dual-stack에서 32개)를 엽니다. AXI-Stream이 필요하면 사용자 로직에서 따로 감싸야 합니다.

## 정리

- HBM2 8H stack은 PG276 기준 *channel 8 × pseudo channel 2*, device에 *bank 32개(bank group 8 × 4)*, RA[13:0]·CA[5:1]입니다. HBM3는 Synopsys 기준 16-Hi에서 최대 64 bank입니다.
- 컨트롤러는 *page policy, bank 인터리브, address mapping, refresh 처리, RD/WR 묶기*로 실제 대역폭을 끌어올립니다.
- bank group이 있으면 *다른 group으로 번갈아* 보내야 명령 간격이 짧아집니다(Kingston DDR4-3200의 IDD 측정 timing 표 기준 tCCD_S 4 대 tCCD_L 8 nCK).
- HBM transaction 하나는 32 byte라, 8-byte write는 25%, 정렬 안 된 read는 50% 이하로 떨어집니다.
- Rixner의 memory access scheduling은 first-ready 재배치로 40%, 공격적 재배치로 93%의 대역폭 향상을 보고했습니다.
- Xilinx HBM IP는 *256-bit memory-mapped AXI3 포트 32개*와 crossbar로 HBM2 pseudo channel 32개에 접근합니다.

## 다음 편

[Ch 8: NPU·GPU에서의 활용](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage)에서는 *LLM weight·activation·KV cache가 HBM을 어떻게 채우는지*를 봅니다.

## 관련 항목

- [Ch 5: 대역폭 계산과 병목 분석](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck)
- [Ch 6: 열 설계와 전력 관리](/blog/embedded/hardware/hbm/chapter06-thermal-power)
- [Ch 8: NPU·GPU 활용](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage)
