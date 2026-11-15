---
title: "EtherCAT 아키텍처 분해 — Processing on the Fly 메커니즘"
slug: "embedded/protocols/industrial-ethernet/chapter03-ethercat-architecture"
date: 2026-05-13T09:03:00
description: "Slave가 프레임을 통과시키면서 읽고 쓴다 — EtherCAT 핵심."
series: "Industrial Ethernet 심화"
seriesOrder: 3
tags: [ethercat, beckhoff, on-the-fly]
draft: false
topics: ["embedded", "embedded/protocols"]
---

## 한 줄 요약

> **"EtherCAT 슬레이브는 프레임을 받아 *통과시키면서* 자기 몫의 비트만 읽고 쓴다. 응답을 위해 멈추는 일이 없다."** 이 *on-the-fly* 모델이 EtherCAT의 결정성을 만드는 핵심입니다.

EtherCAT을 처음 접할 때 가장 받아들이기 어려운 개념이 *Processing on the Fly*입니다. 표준 Ethernet에서는 노드가 프레임을 *받아 처리한 다음 새 프레임을 만들어 보냅니다*. EtherCAT은 이걸 뒤집습니다. 슬레이브는 *지나가는 프레임 안에서 직접* 자기 비트를 수정합니다.

이 장은 그 모델이 어떻게 동작하는지, 그것을 가능하게 하는 ESC(EtherCAT Slave Controller)의 자원(FMMU·Sync Manager·DC)이 무엇인지, 그리고 왜 Beckhoff에 종속되지 않은 *오픈 생태계*가 만들어졌는지 풀어봅니다.

## 한눈에 보는 구조

![EtherCAT 토폴로지 — Master에서 시작하는 daisy-chain, 마지막 슬레이브에서 반환되는 논리적 ring](/images/blog/industrial-ethernet/diagrams/ch03-ethercat-topology.svg)

EtherCAT 망은 *논리적 ring*입니다. 마스터가 보낸 프레임이 슬레이브 1→2→3→N을 순서대로 통과하고, 마지막 슬레이브에서 마지막 연결 port에서 loopback되어 *반대 방향*으로 돌아옵니다. 그림의 물리 구성은 daisy-chain입니다. 분기·star·tree·redundancy 구성은 다른 배선과 지원 기능을 사용합니다. 각 슬레이브의 ESC가 *upstream port*와 *downstream port*를 가지고 있어서 한 케이블이 두 방향 신호를 *공유*합니다(전이중).

프레임 왕복 시간과 주기 task의 cycle은 다른 값입니다. 선택한 cycle 안에 직렬화·전파·ESC 처리·host 처리·margin이 들어가는지 검증해야 합니다. 노드 수와 payload만으로 12.5 μs 완료를 보장할 수는 없습니다.

## On-the-Fly Processing — 어떻게 가능한가

표준 Ethernet 모델과 비교해 보면 차이가 선명합니다.

| 방식 | 프레임 처리 관점 |
|---|---|
| 개별 request/response 설계 | 노드별 요청과 응답 frame을 구성 |
| EtherCAT on-the-fly | ESC가 통과 중인 datagram에서 지정 주소의 데이터를 처리 |

일반 Ethernet 전체가 반드시 노드별 직렬 request/response로 동작하는 것은 아닙니다. 이 표는 두 처리 모델의 차이만 보여 주며 실측 latency 비교가 아닙니다.

ESC ASIC은 프레임이 *통과하는 동안 실시간으로* 데이터를 처리합니다. 비유하자면 *지나가는 기차 안에서 손을 뻗어 가방을 바꿔치기*하는 것과 같습니다. 기차는 멈추지 않습니다.

이게 가능한 이유는 세 가지입니다.

1. ESC의 하드웨어 datapath가 frame 전체 수신 후 응답을 만드는 대신 통과 중 주소·데이터를 처리합니다. 구체적인 지연은 ESC·PHY 사양으로 확인합니다.
2. Ethernet header·payload·FCS·preamble/IFG를 구분해 wire 시간을 계산해야 합니다. MTU 1500 B는 전체 wire frame의 크기가 아닙니다.
3. *마스터가 미리 모든 슬레이브의 슬롯을 배치*한 한 프레임을 보내므로, 슬레이브는 *판단* 없이 *자기 슬롯 위치*만 알면 됩니다.

## ESC — EtherCAT Slave Controller

ESC는 *모든 EtherCAT 슬레이브의 심장*입니다. 외부에서 보면 두 개의 Ethernet PHY, 내부에는 DPRAM, FMMU, Sync Manager, DC unit, 그리고 *호스트 인터페이스*(SPI/PDI)를 가진 ASIC입니다.

![ESC 블록 다이어그램 — EBus Loop · DPRAM · FMMU · Sync Manager · DC Unit · ESC Registers와 PDI를 통한 MCU 연결](/images/blog/industrial-ethernet/diagrams/ch03-esc-block.svg)

공개 문서로 두 ESC의 자원 수를 비교할 수 있습니다. 가격·국내 채택률·바이너리 호환성은 여기서 추정하지 않습니다.

| 칩 | FMMU | Sync Manager | Process RAM | 근거 |
|---|---|---|---|---|
| ET1100 | 8 | 8 | 8 KiB | [Beckhoff datasheet v2i1](https://download.beckhoff.com/download/document/io/ethercat-development-products/ethercat_et1100_datasheet_v2i1.pdf) |
| LAN9252 | 3 | 4 | 4 KiB | [Microchip AN1907C migration guide](https://www.microchip.com/content/dam/mchp/documents/OTH/ApplicationNotes/ApplicationNotes/00001907C.pdf) |

같은 EtherCAT protocol을 지원해도 register 자원·PDI·pin·전기 조건·driver가 같지는 않습니다. ET1100 firmware를 LAN9252에 수정 없이 올릴 수 있다고 가정하지 않습니다.

## FMMU — Fieldbus Memory Management Unit

FMMU는 *논리 주소 ↔ 물리 주소* 변환기입니다. 마스터가 "logical address 0x10000~0x10003 4 byte 쓰기"를 보내면, ESC가 FMMU 매핑을 보고 *자기 DPRAM의 어디에 쓸지* 결정합니다.

왜 굳이 변환 단계를 두는지 처음엔 어색합니다. 이유는 *마스터의 단순화*입니다. 64개 슬레이브가 있을 때, 각각의 물리 주소를 다 알고 *개별 datagram*을 보내려면 64개 명령이 필요합니다. 대신 *논리 주소 공간*을 하나 잡고 *한 datagram에 64 slave 데이터*를 다 담으면, 한 명령으로 모두를 다룹니다.

```text
마스터의 process image (논리 주소 공간)
   0x10000:  Slave 1 input (4 byte)
   0x10004:  Slave 2 input (8 byte)
   0x1000C:  Slave 3 input (2 byte)
   ...
   0x10100:  Slave 1 output (4 byte)
   0x10104:  Slave 2 output (8 byte)
   ...

각 slave의 FMMU 매핑 (LWR=0x0B logical write 시점)
   Slave 1 FMMU 1: logical 0x10100~0x10103 → DPRAM 0x1000 (4 byte, write)
   Slave 1 FMMU 0: logical 0x10000~0x10003 → DPRAM 0x1010 (4 byte, read)
   Slave 2 FMMU 1: logical 0x10104~0x1010B → DPRAM 0x1000 (8 byte, write)
   ...
```

한 LRW(0x0C, Logical Read-Write) datagram이 *모든 슬레이브를 통과하면서*, 각 슬레이브가 FMMU로 *자기 슬롯만* 잘라서 처리합니다. 마스터 코드는 *논리 process image*만 다루면 됩니다. *어느 슬레이브의 어느 레지스터*가 어디 있는지 알 필요가 없습니다.

FMMU 수는 ESC마다 다르며 위 표에서도 8개와 3개가 다릅니다. 실제 process data mapping·SM 구성은 선택한 장치의 자원 안에서 확인해야 합니다.

## Sync Manager — DPRAM 접근 동기화

DPRAM은 *EtherCAT 측*과 *호스트 MCU 측* 양쪽에서 접근됩니다. 동시에 같은 영역을 R/W하면 *데이터 손상*이 일어납니다. Sync Manager가 이걸 막습니다.

Sync Manager는 두 가지 모드가 있습니다.

| 모드 | 용도 | 동작 |
|------|------|------|
| **Buffered (3-buffer)** | 주기 process data | 3개 버퍼를 *원자적*으로 swap. 항상 *최신*만 읽힘 |
| **Mailbox (handshake)** | 비주기 큰 메시지 | 한 측 쓰기 완료 → 다른 측 읽기. handshake |

3-buffer 모드의 동작이 정교합니다. 세 버퍼는 각각 다음 역할을 맡습니다.

| 버퍼 | 역할 |
|------|------|
| 버퍼 A | EtherCAT이 *지금 쓰는 중* |
| 버퍼 B | 호스트가 *지금 읽는 중* |
| 버퍼 C | *다음에 swap될 후보* |

EtherCAT 쓰기가 완료되면 버퍼 C가 "최신"으로 표시되고 버퍼 A가 다음 쓰기 대상이 됩니다. 호스트 읽기가 완료되면 버퍼 C가 호스트의 다음 읽기 대상이 됩니다.

Buffered SM은 읽기/쓰기가 한 buffer를 동시에 손상시키지 않도록 중재합니다. 읽는 중인 buffer가 매 순간 최신으로 바뀌는 것은 아니며, 느린 consumer는 중간 sample을 건너뛸 수 있습니다. 장치 application까지의 atomicity·freshness·deadline은 SM 기능만으로 보장되지 않습니다.

mailbox SM은 *CoE·SoE·FoE·EoE·AoE* 같은 *대용량 비주기* 메시지에 쓰입니다. Ch 4에서 다룹니다.

## Distributed Clock — Sub-μs 동기

DC의 계산 가정과 PTP와의 차이는 [Ch 2](/blog/embedded/protocols/industrial-ethernet/chapter02-realtime-requirements)를 참조합니다. 여기서는 [SOEM v1.4.0 `ethercatdc.c`](https://github.com/OpenEtherCATsociety/SOEM/blob/abbf0d42e38d6cfbaa4c1e9e8e07ace651c386fd/soem/ethercatdc.c)의 실제 초기화와 주기 전파를 구별합니다.

1. `ecx_configdc()`는 BWR(0x08)로 port 수신 시간을 latch합니다.
2. DC-capable slave를 순회해 FPRD(0x04)로 각 port 수신 시각을 읽고 첫 DC slave를 reference로 연결합니다.
3. Host가 topology의 active port·parent 관계로 전파 지연을 계산하고 FPWR(0x05)로 DC offset·system delay register를 설정합니다.
4. 주기 process-data 코드의 FRMW(0x0E)는 reference system time 읽기와 다른 DC 장치로의 전파를 담당합니다.

따라서 ARMW datagram 하나에 모든 장치의 propagation delay가 실려 자동 계산된다는 설명은 맞지 않습니다. 초기 topology 측정·register 설정과 주기 보정은 다른 단계입니다. 이 소스 대조는 실제 망의 ns 동기 정확도를 측정한 결과가 아닙니다.

## 슬레이브의 상태 머신 — EtherCAT State Machine (ESM)

EtherCAT 슬레이브는 다섯 상태를 가집니다. 마스터의 명령에 따라 상태 전이가 일어납니다.

| 상태 | 의미 | 가능한 통신 |
|------|------|------------|
| **Init** | 초기 상태, mailbox/PDO 미활성 | ESC register 구성은 가능 |
| **Pre-Operational (Pre-Op)** | mailbox 가능, process data 없음 | CoE/SoE/FoE/EoE 가능 |
| **Safe-Operational (Safe-Op)** | input 가능, output 불가 | input PDO 가능 |
| **Operational (Op)** | 모든 통신 가능 | input + output PDO |
| **Bootstrap** | 선택적 bootstrap mailbox 상태 | 장치가 지원하는 FoE 절차 |

마스터의 초기화 흐름은 보통 다음과 같습니다.

**1. Init        : ESC 설정 초기화**


**2. → Pre-Op    : Sync Manager 0/1 (mailbox) 설정**


**3. → Safe-Op   : Sync Manager 2/3 (PDO) 설정, FMMU 설정**

- input PDO 전송 시작

**4. → Op        : output PDO도 처리. 정상 동작.**

상태 전이가 실패하면 *AL Status*에 에러 코드가 기록되고 마스터에 통지됩니다. 가장 흔한 실패는 *Safe-Op → Op 전이*에서 *output PDO를 슬레이브가 받지 못함*입니다. WKC 불일치가 원인인 경우가 많습니다.

## Beckhoff 종속성 vs ETG 표준

EtherCAT은 *Beckhoff Automation*이 2003년에 발표한 프로토콜입니다. 그러나 ETG가 기술의 보급·상호운용 생태계를 운영합니다. 소유권 양도·라이선스·가입 비용은 별도의 공식 조건으로 확인해야 하며 이 글에서 추정하지 않습니다.

![EtherCAT Ecosystem](/images/blog/industrial-ethernet/diagrams/ch03-ethercat-ecosystem.svg)

Beckhoff는 *ASIC IP와 master 상용 제품*을 통해 *생태계의 중심*에 남아 있지만, *프로토콜 자체는 개방*되어 있습니다. 이 균형이 EtherCAT의 빠른 채택을 가능하게 했습니다.

제품 개발에는 ESC/PDI·application stack·ESI/SII·적합성·제품 인증을 각각 확인해야 합니다. 오픈소스 master가 있다는 사실이 slave 제품의 인증이나 전체 라이선스 요구를 대신하지 않습니다.

## 자주 하는 실수

### "EtherCAT은 ring 토폴로지다"

그림의 daisy-chain도 frame의 진행·반환 경로를 갖습니다. 물리 topology는 line·분기 등의 구성과 redundancy를 구별합니다. 슬레이브의 한 케이블이 *양방향 신호*를 다 보냅니다. 별도의 두 번째 케이블이 필요 없습니다. *cable redundancy*가 필요하면 *별도의 ring 옵션*을 켜야 합니다.

### "Slave 한 개가 잘못되면 전체 망이 죽는다"

기본 daisy-chain에서는 그렇습니다. 중간 슬레이브가 *링크 단절*되면 그 뒤의 슬레이브에 접근 불가합니다. 해결책은 *cable redundancy* 옵션입니다. 마스터가 *양쪽 끝*에 케이블을 연결해 두 방향 모두로 통신합니다. 중간 단선이 일어나도 양쪽으로 분기된 망이 *각자 동작*합니다.

### "FMMU와 Sync Manager는 같은 것이다"

다릅니다. FMMU는 *주소 변환*, SM은 *접근 동기*입니다. 같은 process data가 두 개를 모두 거칩니다. FMMU가 *논리 → 물리 주소*를 변환하고, SM이 그 물리 주소 영역에 *원자성*을 보장합니다.

### "DC는 마스터 시계를 따라간다"

SOEM v1.4.0의 기본 DC 설정은 첫 DC-capable slave를 reference로 고릅니다. 다른 master 설정이나 외부 동기 장치까지 이를 일반화하지 않습니다. Clock 동기가 유지되어도 늦은 process data·통신 중단·watchdog 조건은 별도로 처리해야 합니다.

### "EtherCAT 마스터는 일반 NIC로 안 된다"

일반 NIC를 이용하는 master 구현이 있습니다. 링크 모드·driver·raw frame 접근과 요구 cycle을 확인해야 하며, PREEMPT_RT·IRQ affinity·전용 core는 특정 deadline을 맞추기 위한 구성 선택입니다. *전용 NIC*는 jitter를 줄이지만 필수는 아닙니다.

## 정리

- EtherCAT의 핵심은 *on-the-fly processing*입니다. 슬레이브가 프레임을 통과시키면서 자기 비트만 R/W합니다.
- 물리는 daisy-chain, 논리는 ring입니다. 마지막 연결 port가 loopback해 마스터로 돌려보냅니다.
- ESC ASIC이 ns 단위 처리를 가능하게 합니다. ET1100·LAN9252는 공개 문서로 자원 차이를 확인할 수 있습니다.
- FMMU는 *논리↔물리 주소 변환*, Sync Manager는 *DPRAM 접근 동기화*를 담당합니다.
- Distributed Clock은 *propagation delay 자동 계산*으로 슬레이브 간 ns 동기를 만듭니다.
- EtherCAT State Machine은 Init→Pre-Op→Safe-Op→Op 네 단계 전이로 초기화됩니다.
- Beckhoff가 만든 프로토콜이지만 ETG가 표준화하고 *IEC 61158 국제 표준*입니다.
- 선택한 ESC/PDI·stack·제품 인증 조건은 각각 확인해야 합니다.

다음 편은 **Ch 4: EtherCAT 프레임 — Datagram·WKC**입니다. EtherType 0x88A4 프레임의 정확한 구조와 명령 코드(LRD·LWR·LRW·BRD·BWR), Working Counter, mailbox 프로토콜(CoE·SoE·FoE·EoE·AoE)을 풀어봅니다.

## 관련 항목

- [Ch 2: 실시간 요구사항 — Determinism·Cycle Time](/blog/embedded/protocols/industrial-ethernet/chapter02-realtime-requirements)
- [Ch 4: EtherCAT 프레임 — Datagram·WKC](/blog/embedded/protocols/industrial-ethernet/chapter04-ethercat-frame)
- [Ch 5: EtherCAT Master/Slave — SOEM·IgH](/blog/embedded/protocols/industrial-ethernet/chapter05-ethercat-master)
- [원문 — EtherCAT Technology Group](https://www.ethercat.org/)
- [원문 — Microchip LAN9252 datasheet](https://www.microchip.com/en-us/product/lan9252)
