---
title: "EtherCAT 아키텍처 분해 — Processing on the Fly 메커니즘"
slug: "embedded/protocols/industrial-ethernet/chapter03-ethercat-architecture"
date: 2026-05-13T09:03:00
description: "EtherCAT 슬레이브가 프레임을 저장하지 않고 통과시키며 읽고 쓰는 방식을 Beckhoff ESC 데이터시트와 SOEM v1.4.0 코드로 따라가며 FMMU·Sync Manager·DC·상태 머신을 정리합니다."
series: "Industrial Ethernet 심화"
seriesOrder: 3
tags: [ethercat, beckhoff, on-the-fly]
draft: false
topics: ["embedded", "embedded/protocols"]
---

## 한 줄 요약

> **"EtherCAT 슬레이브는 프레임을 받아 *통과시키면서* 자기 몫의 비트만 읽고 쓴다. 응답을 위해 멈추는 일이 없다."** 이 *on-the-fly* 모델이 EtherCAT의 결정성을 만드는 핵심입니다.

EtherCAT을 처음 접할 때 가장 받아들이기 어려운 개념이 *Processing on the Fly*입니다. 표준 Ethernet 노드는 프레임을 *끝까지 받아 처리한 다음 새 프레임을 만들어 보냅니다*. EtherCAT은 이걸 뒤집습니다. 슬레이브는 *지나가는 프레임 안에서 직접* 자기 비트를 수정합니다.

이 장은 그 모델을 Beckhoff의 EtherCAT Slave Controller(ESC) 데이터시트 Section I v2.3과 ET1100 Section III v2.1, 그리고 SOEM v1.4.0 소스로 따라갑니다. ESC가 가진 자원(FMMU·Sync Manager·DC)이 무엇을 하는지, 마스터가 그 자원을 어떤 순서로 설정하는지까지 봅니다.

## 한눈에 보는 구조

![EtherCAT 토폴로지 — Master에서 시작하는 daisy-chain, 마지막 슬레이브에서 반환되는 논리적 ring](/images/blog/industrial-ethernet/diagrams/ch03-ethercat-topology.svg)

그림의 물리 배선은 daisy-chain이지만 프레임의 경로는 *논리적 ring*입니다. 이게 가능한 이유는 ESC의 포트 규칙에 있습니다. ESC 데이터시트 3.1절에 따르면 각 포트는 open 또는 closed 상태입니다. 3.3절에 따라 영구 포트는 처음에 Auto 모드로 설정되고, Auto에서는 링크가 있으면 open, 없으면 closed입니다. closed 포트로 가야 할 프레임은 내부에서 다음 논리 포트로 넘어갑니다. 그래서 링크가 하나뿐인 마지막 슬레이브는 받은 프레임을 그대로 자기 입력 포트 쪽으로 돌려보냅니다.

처리는 한 방향에서만 일어납니다. 2포트 ESC의 처리 순서는 "0 → EtherCAT Processing Unit → 1 / 1 → 0"입니다(3.2절 Table 10). 가는 길에는 Processing Unit을 지나며 데이터를 읽고 쓰고, 돌아오는 길에는 그냥 forwarding만 합니다. 100BASE-TX 한 케이블 안에 송신 쌍과 수신 쌍이 따로 있으므로 가는 프레임과 오는 프레임이 같은 케이블에서 충돌하지 않습니다.

## On-the-Fly Processing — 어떻게 가능한가

일반 Ethernet 스위치나 NIC는 프레임을 FIFO에 받아 둔 뒤 판단합니다. 택배 분류장이 상자를 컨베이어에서 내려 송장을 읽고 다시 싣는 방식입니다. ESC는 컨베이어를 멈추지 않고, 상자가 지나가는 동안 손을 뻗어 자기 칸의 물건만 바꿉니다.

데이터시트 3장은 이를 이렇게 적습니다. 프레임은 ESC 안에 저장되지 않고, 데이터는 비트가 ESC를 지나가는 동안 읽히고 쓰입니다. forwarding 지연은 수신 FIFO 크기와 Processing Unit 지연으로 정해지며, 지연을 줄이려고 송신 FIFO를 아예 두지 않습니다. ET1100의 실제 숫자는 Section III Table 91에 있습니다(FIFO size 7, TX shift 00, ESC MII 포트 사이 기준).

| 경로 (ET1100) | min | average | max |
|---|---:|---:|---:|
| MII → MII, Processing Unit 통과 | 280 ns | 305 ns | 335 ns |
| MII → MII, Processing Unit 옆(forwarding) | 240 ns | 265 ns | 295 ns |
| EBUS → EBUS, Processing Unit 통과 | 140 ns | 150 ns | 160 ns |

프레임 전체(최대 1518 B, 100 Mbit/s에서 약 121 μs)를 받은 뒤 처리한다면 hop마다 그 시간이 더해졌을 것입니다. ESC는 hop당 수백 ns만 붙입니다.

이 방식이 성립하는 조건은 세 가지입니다.

1. ESC는 MAC 주소로 자기 프레임을 고르지 않습니다. ET1100·ET1200·IP Core·ESC20은 MAC·IP 주소 없이 어떤 주소의 EtherCAT 프레임이든 처리합니다(3장). 대신 처리한 프레임의 source MAC 한 비트(`SOURCE_MAC[1]`)를 1로 바꿔, 마스터가 보낸 프레임과 돌아온 프레임을 구분하게 합니다.
2. 그 결과 ESC 사이, 또는 마스터와 첫 슬레이브 사이에 unmanaged switch를 둘 수 없습니다(3장).
3. 마스터가 *모든 슬레이브의 몫을 미리 배치*한 프레임을 보냅니다. 슬레이브는 판단할 것 없이 datagram의 주소가 자기에게 해당하는지만 봅니다. 주소 방식은 [Ch 4](/blog/embedded/protocols/industrial-ethernet/chapter04-ethercat-frame)에서 다룹니다.

## ESC — EtherCAT Slave Controller

EtherCAT 슬레이브는 모두 ESC 하나를 중심으로 만들어집니다. 데이터시트 Figure 1의 구성은 2~4개의 포트(MII 또는 EBUS), AutoForwarder와 Loopback, EtherCAT Processing Unit, FMMU, SyncManager, 레지스터와 Process RAM, Distributed Clocks, SII EEPROM 인터페이스, 그리고 슬레이브 MCU와 연결되는 PDI(Process Data Interface)입니다.

![ESC 블록 다이어그램 — EBus Loop · DPRAM · FMMU · Sync Manager · DC Unit · ESC Registers와 PDI를 통한 MCU 연결](/images/blog/industrial-ethernet/diagrams/ch03-esc-block.svg)

Beckhoff ESC끼리도 자원 수가 다릅니다. Section I Table 1의 값입니다.

| 항목 | ET1200 | ET1100 | IP Core | ESC20 |
|---|---|---|---|---|
| 포트 | 2~3 | 2~4 | 1~3 MII 등 | 2 MII |
| FMMU | 3 | 8 | 0~8 | 4 |
| SyncManager | 4 | 8 | 0~8 | 4 |
| RAM | 1 KB | 8 KB | 0~60 KB | 4 KB |
| DC | 64 bit | 64 bit | 32/64 bit | 32 bit |
| PDI | Digital I/O 16 bit, SPI | Digital I/O 32 bit, SPI, 8/16 bit µC | 8~32 bit I/O, SPI, µC, on-chip bus | 32 bit I/O, SPI, µC |

Microchip LAN9252 같은 다른 제조사 ESC는 데이터시트를 직접 확인하지 못해 표에서 뺐습니다. 칩마다 FMMU·SM 수가 다르니, 한 칩용 firmware의 SM·FMMU 배치를 다른 칩에 옮기려면 먼저 대상 칩의 자원 표와 맞춰 봐야 합니다.

## FMMU — Fieldbus Memory Management Unit

FMMU가 왜 필요한지부터 보겠습니다. 슬레이브 64대가 있고 마스터가 각자의 메모리 주소를 따로 알아야 한다면, 주기마다 datagram 64개를 만들어야 합니다. 대신 *논리 주소 공간 하나*를 잡고 그 안에 모두의 몫을 줄지어 놓으면, datagram 하나로 64대를 다 다룰 수 있습니다. 아파트 우편함에 비유하면, 집배원은 "101호 우편함"이라는 논리 주소만 알고 그 우편함이 실제로 어느 집 현관과 연결되는지는 각 집이 압니다.

FMMU가 이 연결을 맡습니다. 데이터시트 7장에 따르면 FMMU 채널 하나는 *연속된 논리 주소 구간 하나*를 슬레이브의 *연속된 물리 주소 구간 하나*에 매핑하고, 방향은 read·write·read/write 중 하나로 설정합니다. 논리 주소 공간은 32 bit, 즉 4 GB이고 비트 단위 매핑도 됩니다. FMMU 설정 레지스터는 0x0600부터 시작합니다.

SOEM v1.4.0의 `ecx_config_map_group()`은 모든 슬레이브의 출력 매핑(`ethercatconfig.c` 1205행)을 입력 매핑(1265행)보다 먼저 하고, 입력은 출력이 끝난 논리 주소에서 이어 붙입니다. 매번 비어 있는 다음 FMMU를 쓰므로, 출력과 입력이 모두 있는 슬레이브에서는 FMMU 0이 출력(`FMMUtype = 2`, write, 1130행), FMMU 1이 입력(`FMMUtype = 1`, read, 1000행)을 맡습니다. 다음은 그 규칙을 따른 가상 배치입니다. 물리 주소 0x1100·0x1180은 예시로 고른 값이고, SOEM이 기본 mailbox에 쓰는 0x1000~0x10FF와 겹치지 않게 잡았습니다.

```text
논리 주소           방향     슬레이브   FMMU   물리 주소(ESC)
0x00000000-0x03     출력     1          0      0x1100-0x1103
0x00000004-0x0B     출력     2          0      0x1100-0x1107
0x0000000C-0x0F     입력     1          1      0x1180-0x1183
0x00000010-0x17     입력     2          1      0x1180-0x1187
```

LRW(Logical Read Write) datagram 하나가 이 구간을 덮으면, 지나가는 동안 각 슬레이브의 FMMU가 *자기 구간만* 잘라서 처리합니다. 데이터시트 7장에 따르면 FMMU 설정에 맞지 않는 논리 주소라면 ESC는 데이터를 바꾸지도, 프레임에 넣지도 않습니다. 그래서 마스터 코드는 *논리 process image*만 다루면 됩니다.

## Sync Manager — DPRAM 접근 동기화

ESC 메모리는 EtherCAT 쪽과 슬레이브 MCU 쪽에서 동시에 접근합니다. 데이터시트 8장은 SyncManager 없이 메모리를 직접 쓰면 데이터 일관성이 보장되지 않고, 양쪽이 상대의 접근 완료를 polling해야 한다고 설명합니다. SyncManager는 버퍼 접근을 하드웨어로 중재하고 변화가 생기면 인터럽트로 알립니다. 설정 레지스터는 0x0800부터입니다.

두 가지 모드가 있습니다.

| 모드 | 용도 | 동작 |
|------|------|------|
| **Buffered (3-buffer)** | 주기 process data | consumer는 항상 producer가 마지막으로 끝까지 쓴 버퍼를 받습니다. 더 빨리 쓰면 옛 데이터는 버립니다. |
| **Mailbox** | 비주기 메시지 | 한쪽이 다 쓰면 잠기고, 다른 쪽이 다 읽어야 다시 쓸 수 있습니다. 데이터를 잃지 않습니다. |

Buffered 모드는 같은 크기의 버퍼 셋을 씁니다(8.1절). 신문 가판대에 비유하면, 배달원이 새 신문을 다 꽂기 전까지 손님은 어제 신문을 가져가고, 다 꽂은 순간부터 오늘 신문을 가져갑니다. 하나는 producer가 쓰는 중, 하나는 consumer가 읽는 중, 나머지 하나는 *마지막으로 일관되게 쓰인 데이터*를 들고 있습니다. 양쪽은 첫 번째 버퍼의 주소만 쓰고, 실제로 어느 버퍼에 닿는지는 SyncManager가 바꿔 줍니다. 예를 들어 시작 주소 0x1000, 길이 0x100이면 0x1000~0x12FF 세 칸을 차지하므로 다음 SyncManager는 0x1300 이후에 놓아야 합니다.

버퍼 교환에는 조건이 둘 있습니다. 버퍼는 시작 주소부터 접근해야 하고 끝 주소에 닿아야 교환이 일어납니다. 또 마스터 쪽 변경은 프레임의 FCS가 맞을 때만 받아들입니다(8장). 그래서 깨진 프레임이 들어와도 슬레이브는 반쯤 쓰인 출력을 보지 않습니다. 대신 consumer가 producer보다 느리면 중간 샘플은 건너뜁니다.

Mailbox SyncManager는 비주기 프로토콜에 씁니다. 데이터시트 8.2.1절이 나열하는 것은 EoE(Ethernet over EtherCAT), CoE(CAN application layer over EtherCAT), FoE(File access), SoE(Servo profile, IEC 61800-7 식별자 접근), VoE(vendor specific), AoE(ADS over EtherCAT)입니다. 헤더 형식은 Ch 4에서 다룹니다.

## Distributed Clock — 포트별 수신 시각으로 맞추는 시계

DC의 정의와 PTP와의 차이는 [Ch 2](/blog/embedded/protocols/industrial-ethernet/chapter02-realtime-requirements)에서 다뤘습니다. 여기서는 [SOEM v1.4.0 `ethercatdc.c`](https://github.com/OpenEtherCATsociety/SOEM/blob/v1.4.0/soem/ethercatdc.c)의 초기화와 주기 보정을 단계로 나눕니다.

1. `ecx_configdc()`가 BWR로 Receive Time Port 0 레지스터에 쓰면 모든 슬레이브가 그 프레임의 포트별 수신 시각을 latch합니다.
2. DC 지원 슬레이브를 순회하며 FPRD로 각 포트의 수신 시각을 읽고, 첫 DC 슬레이브를 reference로 연결합니다.
3. 마스터가 topology의 부모·자식 관계로 전파 지연을 계산하고 FPWR로 System Time Offset과 System Time Delay(0x0928)를 씁니다.
4. 주기 process data 프레임의 FRMW datagram이 reference의 system time을 읽어 다른 DC 슬레이브에 씁니다. 각 ESC의 time control loop가 그 값과 자기 시각의 차이로 로컬 시계 속도를 조정합니다(데이터시트 9.1.5).

데이터시트 9.1.5는 초기화 직후 drift 보정 명령을 별도 프레임으로 많이(예: 15,000개) 보내 정적 편차를 먼저 줄이라고 권합니다. 같은 절에는 Δt가 2³⁰ ns(약 1초)를 넘으면 안정성이 보장되지 않는다는 주의도 있습니다. 또 drift 보정은 매우 느리므로, 시작 직전에 System Time Offset으로 오프셋을 대략 맞춰 settling time을 줄이라고 권합니다.

## 슬레이브의 상태 머신 — EtherCAT State Machine (ESM)

ESC 데이터시트 10장은 슬레이브가 지원해야 할 상태를 넷, 선택 상태를 하나로 정합니다. 마스터는 AL Control 레지스터(0x0120)에 요청 상태를 쓰고, 슬레이브는 AL Status(0x0130)에 현재 상태를, 실패하면 AL Status Code(0x0134)에 오류 코드를 씁니다.

| 상태 | AL Control/Status 값 | SOEM v1.4.0 이름 |
|------|------|------|
| **Init** | 1 | `EC_STATE_INIT` |
| **Pre-Operational** | 2 | `EC_STATE_PRE_OP` |
| **Bootstrap** (선택) | 3 | `EC_STATE_BOOT` |
| **Safe-Operational** | 4 | `EC_STATE_SAFE_OP` |
| **Operational** | 8 | `EC_STATE_OPERATIONAL` |

Init에서 Operational로 바로 갈 수는 없고, Init → Pre-Operational → Safe-Operational → Operational 순서를 거쳐야 합니다(Figure 37 주석). 슬레이브 애플리케이션이 그 상태에 필요한 서비스를 준비해야 슬레이브가 전이를 확인해 줍니다.

SOEM v1.4.0은 이 순서를 두 함수에 나눠 담습니다.

| 단계 | 함수 | 하는 일 |
|---|---|---|
| Init → Pre-Op | `ecx_config_init()` | SII에서 mailbox 설정을 읽어 SM0/SM1을 씁니다. SII에 없으면 기본값 0x1000/0x1080, 길이 0x80을 씁니다(570~587행). 그 뒤 `EC_STATE_PRE_OP`를 요청합니다(599행). |
| Pre-Op → Safe-Op | `ecx_config_map_group()` | process data용 SM과 FMMU를 설정하고 `EC_STATE_SAFE_OP`를 요청합니다(1291행). |
| Safe-Op → Op | 애플리케이션 | `simple_test.c`처럼 process data를 한 번 주고받은 뒤 Operational을 요청합니다. |

상태 전이가 실패하면 슬레이브는 AL Status의 Error Indication 비트(0x0130[4])를 세우고 AL Status Code에 원인을 씁니다(10.1.3절). 마스터는 이 코드를 읽어야 실패 원인을 알 수 있습니다.

## Beckhoff와 ETG

ESC 데이터시트 8.2.1절은 mailbox 프로토콜의 세부를 ETG(EtherCAT Technology Group)가 배포하는 ETG.1000.6과 IEC 61158 Type 12 문서에서 보라고 안내합니다. 즉 프로토콜 사양은 ETG 문서와 IEC 표준으로 공개되어 있고, Beckhoff는 ESC ASIC(ET1100·ET1200)을 만드는 제조사 중 하나입니다.

![ETG가 생태계를 운영하고 Beckhoff(ET1100, 상용 master)와 다른 구현(LAN9252, SOEM·IgH)이 함께 있는 EtherCAT 생태계 구성](/images/blog/industrial-ethernet/diagrams/ch03-ethercat-ecosystem.svg)

마스터 쪽에는 오픈소스 구현이 있습니다. SOEM은 Linux에서 `PF_PACKET`, `SOCK_RAW` 소켓을 EtherType `ETH_P_ECAT`로 열어 일반 NIC로 프레임을 주고받습니다(`oshw/linux/nicdrv.c` 146행). 오픈소스 master가 있다고 해서 슬레이브 제품의 적합성 시험이나 인증이 따라오지는 않습니다.

## 자주 하는 실수

### "EtherCAT은 ring 토폴로지다"

배선은 line이고 프레임 경로가 ring입니다. 마지막 슬레이브의 closed 포트가 프레임을 되돌리므로 두 번째 케이블이 필요 없습니다. 마스터 쪽에 케이블을 하나 더 연결하는 cable redundancy는 별도 구성입니다. SOEM v1.4.0에는 두 번째 NIC를 여는 `ecx_init_redundant()`가 있고(`ethercatmain.c` 300행), ESC 데이터시트 9.1.2.1절은 마스터가 port 1~3에 연결된 reverse mode의 지연 측정을 따로 설명합니다.

### "Slave 한 개가 잘못되면 전체 망이 죽는다"

기본 line 배선에서 중간 링크가 끊기면, 끊긴 지점 앞의 슬레이브는 링크를 잃은 포트를 닫고 프레임을 되돌립니다(3.1절의 Auto 모드). 그래서 그 앞의 슬레이브와는 계속 통신하고 그 뒤의 슬레이브에만 닿지 못합니다. cable redundancy를 쓰면 마스터의 두 번째 포트로 끊긴 뒤쪽에도 닿을 수 있습니다.

### "FMMU와 Sync Manager는 같은 것이다"

다릅니다. FMMU는 *논리 → 물리 주소 변환*, SyncManager는 *물리 버퍼 접근의 중재*입니다. 같은 process data가 둘을 모두 거칩니다. 데이터시트 7장은 read/write FMMU 하나를 SyncManager와 함께 쓸 수 없다고 적습니다. 읽기용과 쓰기용 SyncManager가 같은 물리 주소 범위를 가질 수 없기 때문입니다.

### "DC는 마스터 시계를 따라간다"

DC의 reference는 보통 첫 DC 지원 ESC이고(데이터시트 9.1), SOEM v1.4.0의 `ecx_configdc()`도 첫 `hasdc` 슬레이브를 고릅니다. 마스터는 reference clock의 초기값을 자기 시계로 정해 주고, 필요하면 reference를 외부 1588 grandmaster에 맞춥니다.

### "EtherCAT 마스터는 전용 NIC가 필요하다"

SOEM은 raw socket으로 일반 NIC를 씁니다. 다만 ESC가 모든 프레임을 되돌리므로, 마스터 NIC가 다른 망과 섞여 있으면 Ch 1에서 본 broadcast storm 문제가 생깁니다. EtherCAT 전용 포트를 두는 이유가 여기에 있습니다.

## 정리

- EtherCAT의 핵심은 *on-the-fly processing*입니다. ESC는 프레임을 저장하지 않고, ET1100 기준 MII 포트 사이 평균 305 ns만 지연시킵니다.
- 배선은 daisy-chain, 경로는 ring입니다. closed 포트가 프레임을 되돌리고, 처리는 가는 방향에서만 합니다.
- ESC마다 FMMU·SM·RAM 수가 다릅니다. ET1100은 FMMU 8·SM 8·RAM 8 KB, ET1200은 3·4·1 KB입니다.
- FMMU는 *논리↔물리 주소 변환*, SyncManager는 *3-buffer 또는 mailbox로 접근을 중재*합니다.
- DC는 포트별 수신 시각으로 지연을 계산하고 FRMW로 reference 시각을 배포해 drift를 보정합니다.
- ESM은 Init(1) → Pre-Op(2) → Safe-Op(4) → Op(8) 순서로 전이하고, SOEM은 `ecx_config_init()`과 `ecx_config_map_group()`이 앞의 두 전이를 맡습니다.
- 프로토콜 사양은 ETG 문서와 IEC 61158 Type 12로 공개되어 있습니다.

다음 편은 **Ch 4: EtherCAT 프레임 — Datagram·WKC**입니다. EtherType 0x88A4 프레임의 바이트 구조, 명령 코드, Working Counter, mailbox 헤더를 SOEM이 실제로 보낸 프레임과 함께 풀어봅니다.

## 관련 항목

- [Ch 2: 실시간 요구사항 — Determinism·Cycle Time](/blog/embedded/protocols/industrial-ethernet/chapter02-realtime-requirements)
- [Ch 4: EtherCAT 프레임 — Datagram·WKC](/blog/embedded/protocols/industrial-ethernet/chapter04-ethercat-frame)
- [Ch 5: EtherCAT Master/Slave — SOEM·IgH](/blog/embedded/protocols/industrial-ethernet/chapter05-ethercat-master)
- [Beckhoff EtherCAT Slave Controller Section I — Technology v2.3](https://download.beckhoff.com/download/document/io/ethercat-development-products/ethercat_esc_datasheet_sec1_technology_2i3.pdf)
- [Beckhoff ET1100 Hardware Description v2.1](https://download.beckhoff.com/download/document/io/ethercat-development-products/ethercat_et1100_datasheet_v2i1.pdf)
- [SOEM v1.4.0 `ethercatconfig.c`](https://github.com/OpenEtherCATsociety/SOEM/blob/v1.4.0/soem/ethercatconfig.c)
- [원문 — EtherCAT Technology Group](https://www.ethercat.org/)
- [원문 — Microchip LAN9252 datasheet](https://www.microchip.com/en-us/product/lan9252)
