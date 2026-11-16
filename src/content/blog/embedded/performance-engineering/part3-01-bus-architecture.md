---
title: "임베디드 Bus Architecture — AHB·AXI·CHI 진화와 5-Channel"
slug: "embedded/performance-engineering/part3-01-bus-architecture"
date: 2026-04-25T09:00:00
description: "AMBA APB·AHB·AXI·ACE·CHI의 역사와 AXI 5채널·burst·ID·outstanding·QoS·응답을 AXI·APB 사양서와 Cortex-M7 TRM의 실제 값으로 정리합니다."
series: "Embedded Performance Engineering"
seriesOrder: 19
tags: [bus, ahb, axi, chi, amba]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Bus = CPU와 peripheral 사이 다리"**입니다. 시스템의 bandwidth와 latency를 결정합니다.

## AMBA 진화

연도와 특징은 Arm의 *Introduction to AMBA AXI4*(문서 102202, Issue 01) 2.3절을 따릅니다.

| Bus | 도입 | 102202 2.3절의 설명 |
|---|---|---|
| **APB** (Advanced Peripheral Bus) | AMBA 1 (1990년대 후반) | 저대역 제어 접근용. 단순한 address·data phase. 파이프라인 없음 |
| **AHB** (Advanced High-performance Bus) | AMBA 2 (1999) | 단일 clock edge 프로토콜. address phase 뒤에 data phase. 파이프라인 있음. MUX로 한 번에 master 하나 |
| **AHB-Lite** | AMBA 3 (2003) | AHB의 부분집합. master가 하나인 버스용 |
| **AXI** (Advanced eXtensible Interface) | AMBA 3 (2003) | 고성능·고클럭 설계용 |
| **ACE** (AXI Coherency Extensions) | AMBA 4 (2011) | 시스템 수준 coherency. big.LITTLE 같은 기술을 가능하게 함 |
| **CHI** (Coherent Hub Interface) | AMBA 5 (2014) | 새로 설계한 고속 transport 계층, 혼잡을 줄이는 기능 |

Cortex-M7은 이 중 여러 개를 함께 씁니다. M7 TRM(DDI 0489D) 1.1에 따르면 M7의 메모리 인터페이스는 TCM 인터페이스, 캐시 뒤의 AXI master(AXIM), 저지연 AHB-Lite peripheral 포트(AHBP), TCM에 DMA 접근을 주는 AHB-Lite slave(AHBS)입니다. Cortex-M4는 ICode·DCode·System 세 개의 AHB-Lite 인터페이스입니다(M4 TRM 2.2.1).

![AHB-Lite + APB(Cortex-M)와 AXI Interconnect(Cortex-A) 비교](/images/blog/perf-eng/diagrams/part3-01-bus-architecture.svg)

## AXI 5 채널

AMBA AXI Protocol Specification(IHI 0022, Issue L, 2025) A1.2는 transaction이 다섯 채널 위의 transfer로 이루어진다고 정의합니다. Write request(AW), Write data(W), Write response(B), Read request(AR), Read data(R)입니다. 같은 절은 AXI가 address 정보를 실제 데이터보다 먼저 보낼 수 있고, 여러 outstanding transaction과 out-of-order 완료를 지원한다고 적습니다. Issue H.b부터는 master/slave 대신 Manager/Subordinate라는 용어를 씁니다(릴리스 노트).

![AXI 5 Channels — Read/Write 독립 Handshake](/images/blog/perf-eng/diagrams/part3-01-axi-channels.svg)

## 채널별 시그널

| 채널 | 주요 신호 |
|---|---|
| AR | ARID, ARADDR, ARLEN, ARSIZE, ARBURST, ARLOCK, ARCACHE, ARPROT, ARQOS, ARVALID, ARREADY |
| R | RID, RDATA, RRESP, RLAST, RVALID, RREADY |
| AW | AWID, AWADDR, AWLEN, AWSIZE, AWBURST, AWLOCK, AWCACHE, AWPROT, AWQOS, AWVALID, AWREADY |
| W | WDATA, WSTRB, WLAST, WVALID, WREADY |
| B | BID, BRESP, BVALID, BREADY |

Valid-Ready transport에서는 송신 쪽이 VALID로 보낼 것이 있음을 알리고 수신 쪽이 READY로 받을 수 있음을 알리며, A2.3절의 말대로 "A transfer occurs when VALID and READY are both HIGH"입니다.

## ID — Out-of-Order 지원

| 순서 | 요청 | 응답으로 가능한 순서 |
|---|---|---|
| 1 | AR0: ID=0, addr=0x1000 | |
| 2 | AR1: ID=1, addr=0x2000 | AR1의 응답(ID=1)이 AR0보다 먼저 와도 됨 |
| 3 | AR2: ID=0, addr=0x3000 | AR2의 응답은 같은 ID인 AR0 뒤에 와야 함 |

AXI A5.6에 따르면 Subordinate는 응답의 RID를 요청의 ARID와 맞춰야 하고, interconnect는 *같은 ARID*로 *서로 다른 Subordinate*에 보낸 요청의 read data가 요청 순서대로 Manager에 도착하게 해야 합니다. A5.6.1은 ID가 다른 read data transfer끼리는 섞여(interleave) 올 수 있다고 적습니다.

## Burst Transaction

| 신호 | 인코딩 (AXI Issue L) |
|---|---|
| AxBURST (2 bit, 표 A3.9) | 0b00 FIXED, 0b01 INCR(기본값), 0b10 WRAP, 0b11 reserved |
| AxLEN (8 bit, 표 A3.4) | Length = AxLEN + 1 |
| AxSIZE (3 bit, 표 A3.2) | 0b000 = 1 byte, 0b001 = 2, 0b010 = 4, 0b011 = 8, … 0b111 = 128 byte |

A3.1.2는 Length에 제약을 둡니다. WRAP은 2, 4, 8, 16만, FIXED는 16까지 허용하고, 어떤 transaction도 4 KB 주소 경계를 넘으면 안 되며, 중간에 끝낼 수 없습니다.

실제 코어가 어떤 burst를 내는지는 TRM에 있습니다. Cortex-M7 TRM 5.4.1 표 5-3에 따르면 M7의 AXIM은 cacheable 메모리의 linefill을 *WRAP4 64-bit read*로, eviction을 *INCR4 64-bit write*로 냅니다. 32 byte line(2-05)을 8 byte씩 네 번 옮기는 것이므로 `ARLEN = 3`, `ARSIZE = 0b011`, `ARBURST = 0b10`입니다.

## Outstanding Transaction

Manager가 앞 요청의 응답을 받기 전에 다음 요청을 보낼 수 있습니다.

| Time | 1 | 2 | 3 | 4 | 5 | 6 |
|------|---|---|---|---|---|---|
| AR | AR0 | AR1 | AR2 | AR3 | AR4 | AR5 |
| R | | | | R0 | | R1 (R2…) |

메모리 latency 동안 다음 요청들이 이미 진행 중이므로, 1-07의 bytes-in-flight처럼 동시에 나가 있는 요청 수가 대역폭을 정합니다. 2-04의 M2 Pro 측정에서 독립 load를 16개까지 겹치자 load당 시간이 13분의 1이 된 것도 같은 원리입니다.

코어가 낼 수 있는 outstanding 수는 TRM에 있습니다. Cortex-M7 TRM 5.4.1 표 5-3의 AXIM 값은 read issuing capability 7(data linefill 2, Non-cacheable data read 4, instruction fetch 또는 linefill 1), combined issuing capability 40(outstanding write 39와 instruction fetch 1)입니다. Cortex-A53 TRM 6.1은 L1 data 메모리 시스템이 동시에 3개의 data cache miss를 처리한다고 적습니다.

## AHB-Lite vs AXI 차이

| 항목 | AHB-Lite | AXI |
|---|---|---|
| Manager 수 | 1 (AHB의 부분집합, 102202 2.3.3) | 여럿 |
| 채널 | address phase → data phase (102202 2.3.2) | 다섯 채널, 각자 handshake (IHI 0022 A1.2) |
| Outstanding / OoO 완료 | — | 지원 (IHI 0022 A1.2) |
| 4 KB 경계 | — | transaction은 넘을 수 없음 (A3.1.2) |

## APB — Peripheral 전용

AMBA APB Protocol Specification(IHI 0024E) 1.1은 APB를 파이프라인이 없는 단순 동기 프로토콜로 정의하고, "Every transfer takes at least two cycles to complete"라고 적습니다. 3.1절의 write transfer는 두 단계입니다.

- Setup phase(T1): `PSEL`이 올라가고 `PADDR`, `PWRITE`, `PWDATA`가 유효합니다.
- Access phase(T2): `PENABLE`이 올라갑니다. Completer가 `PREADY`를 LOW로 두면 Access phase가 늘어납니다(대기 상태).

그래서 APB 레지스터 하나를 읽고 쓰는 데 APB clock으로 최소 두 cycle이 듭니다. 3-07에서 MMIO 접근 비용으로 이어집니다.

## NoC — Network-on-Chip

![NoC — Network-on-Chip Multi-core SoC 구조](/images/blog/perf-eng/diagrams/part3-01-noc.svg)

Linux 커널 문서 `Documentation/admin-guide/perf/arm-cmn.rst`에 따르면 Arm CMN-600(Coherent Mesh Network)은 crosspoint(XP)를 직사각형 격자로 놓은 mesh interconnect이고, XP마다 AMBA CHI agent가 붙는 장치 포트가 두 개까지 있습니다. 이전 세대인 CCN-504는 XP 11개로 된 ring bus입니다(`arm-ccn.rst`). 그림의 XP 수와 배치는 예시입니다.

## Cortex-A 시스템의 버스 계층

![Cortex-A72 Bus Hierarchy — L1/L2/SCU/CCI-400/DDR](/images/blog/perf-eng/diagrams/part3-01-cortex-a72-hierarchy.svg)

그림은 cluster 안의 L1·L2, cluster를 시스템에 잇는 coherent interconnect, 메모리 컨트롤러로 이어지는 일반적인 구성을 보입니다. 특정 SoC가 어떤 interconnect를 쓰는지는 그 SoC의 문서에 있습니다. Cortex-A53의 경우 TRM 2.1.7은 master 인터페이스를 AMBA 4 ACE 또는 AMBA 5 CHI로 구현할 수 있다고 적습니다.

## 측정 — AXI 활용도

| 관찰할 것 | 의미 |
|---|---|
| VALID가 HIGH인데 READY가 LOW | 받는 쪽이 못 받음(backpressure) |
| READY가 HIGH인데 VALID가 LOW | 보내는 쪽에 보낼 것이 없음(idle) |
| 동시에 열린 transaction 수 | concurrency 수준 |
| AxLEN 분포 | linefill burst인지 단일 전송인지 |

이런 신호 수준 관찰은 RTL 시뮬레이션이나 SoC에 들어간 버스 모니터·interconnect PMU(예: CMN의 분산 PMU, `arm-cmn.rst`)로 합니다. 이 글에서는 실행하지 않았습니다.

## QoS — DMA·CPU Contention

CPU와 DMA가 같은 Subordinate(예: DRAM)에 동시에 접근하면 interconnect가 순서를 정합니다. AXI A4.8.1은 AWQOS·ARQOS를 4 bit의 "Quality of Service identifier"로 정의하고, 프로토콜이 정확한 쓰임을 정하지는 않지만 *값이 클수록 우선순위가 높은* priority 지표로 쓰기를 권합니다. 같은 절은 많은 interconnect가 연결된 Manager에 QoS 값을 배정하는 프로그래머블 레지스터를 둘 것으로 예상한다고 적습니다. 3-02에서 이어서 다룹니다.

## Response — OKAY/EXOKAY/SLVERR/DECERR

AXI Issue L 표 A3.28의 BRESP 인코딩입니다. Issue L에서는 BRESP가 최대 3 bit이고, 0b100 이상에 DEFER 같은 값이 추가되었습니다.

| BRESP | Label | 의미 |
|---|---|---|
| 0b000 | OKAY | 일반 write 성공(exclusive write라면 실패) |
| 0b001 | EXOKAY | exclusive write 성공 |
| 0b010 | SLVERR | 끝점에 도달했지만 성공하지 못함. read-only나 전원이 꺼진 기능에 접근한 경우 등 |
| 0b011 | DECERR | write할 수 있는 지점에 도달하지 못함. 주소가 잘못 decode된 경우 등 |

Cortex-M7 TRM 5.2는 명령 fetch와 데이터 접근 모두에서 외부 AXI의 SLVERR와 DECERR를 fault 원인으로 듭니다. ARMv7-M ARM B1.5.14에 따르면 이런 버스 오류는 BusFault로 처리되며, 명시적 메모리 접근의 precise bus error는 데이터 주소를 기록합니다.

## 자주 하는 실수

> ⚠️ Burst가 4 KB 경계를 넘음

AXI A3.1.2: transaction은 4 KB 주소 경계를 넘을 수 없습니다. 64-bit INCR16이면 128 byte이므로, 시작 주소가 경계에서 128 byte 안쪽이면 두 transaction으로 나눠야 합니다. AXI Manager를 직접 설계하거나 DMA descriptor를 직접 만들 때 확인합니다.

> ⚠️ 같은 ID로 여러 Subordinate에 요청

A5.6에 따르면 같은 ARID로 서로 다른 Subordinate에 보낸 read는 interconnect가 요청 순서대로 돌려줘야 합니다. 응답이 빠른 Subordinate의 데이터도 앞의 느린 응답을 기다리게 되므로, 독립적인 요청에는 다른 ID를 씁니다.

> ⚠️ APB peripheral에 burst를 기대

APB는 파이프라인이 없고 transfer마다 최소 두 cycle입니다(IHI 0024E 1.1). AXI에서 APB로 가는 bridge 너머의 레지스터를 연달아 쓰면 그만큼 cycle이 쌓입니다.

## 정리

- AMBA는 APB(AMBA 1) → AHB(1999) → AHB-Lite·AXI(2003) → ACE(2011) → CHI(2014) 순으로 나왔습니다(Arm 102202).
- AXI는 AW·W·B·AR·R 다섯 채널이고, VALID와 READY가 모두 HIGH일 때 전송됩니다.
- 같은 ID는 순서를 지키고 다른 ID는 OoO와 interleave가 가능합니다. transaction은 4 KB 경계를 넘을 수 없습니다.
- Cortex-M7 AXIM은 linefill을 WRAP4 64-bit read로 내고, read를 최대 7개, write를 39개까지 동시에 둘 수 있습니다.
- APB는 transfer마다 최소 두 cycle입니다. AxQOS는 4 bit이고 높은 값이 높은 우선순위로 쓰이기를 권장합니다.

다음 편에서는 **Bus Contention 분석**을 다룹니다.

## 관련 항목

- [2-10: PMU](/blog/embedded/performance-engineering/part2-10-pmu)
- [3-02: Bus Contention](/blog/embedded/performance-engineering/part3-02-bus-contention)

## 참고 자료

- AMBA AXI Protocol Specification (ARM IHI 0022, Issue L): A1.2, A2.3, A3.1.1~A3.1.4, A3.3.1, A4.8.1, A5.6
- AMBA APB Protocol Specification (ARM IHI 0024E): 1.1, 3.1
- [Arm, Introduction to AMBA AXI4 (102202 Issue 01)](https://developer.arm.com/-/media/Arm%20Developer%20Community/PDF/Learn%20the%20Architecture/102202_0100_01_Introduction_to_AMBA_AXI.pdf) 2.3
- Cortex-M7 Technical Reference Manual (DDI 0489D) 1.1, 5.2, 5.4.1 표 5-3; Cortex-M4 TRM (DDI 0439B) 2.2.1; Cortex-A53 TRM (DDI 0500E) 2.1.7, 6.1
- ARMv7-M Architecture Reference Manual (DDI 0403E) B1.5.14
- Linux v6.12 `Documentation/admin-guide/perf/arm-cmn.rst`, `arm-ccn.rst`
