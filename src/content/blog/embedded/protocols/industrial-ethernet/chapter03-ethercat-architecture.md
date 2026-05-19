---
title: "Ch 3: EtherCAT 아키텍처 — Processing on the Fly"
date: 2026-05-16T03:00:00
description: "Slave가 프레임을 통과시키면서 읽고 쓴다 — EtherCAT 핵심."
series: "Industrial Ethernet 심화"
seriesOrder: 3
tags: [ethercat, beckhoff, on-the-fly]
draft: false
---

## 한 줄 요약

> **"EtherCAT 슬레이브는 프레임을 받아 *통과시키면서* 자기 몫의 비트만 읽고 쓴다. 응답을 위해 멈추는 일이 없다."** 이 *on-the-fly* 모델이 EtherCAT의 결정성을 만드는 핵심입니다.

EtherCAT을 처음 접할 때 가장 받아들이기 어려운 개념이 *Processing on the Fly*입니다. 표준 Ethernet에서는 노드가 프레임을 *받아 처리한 다음 새 프레임을 만들어 보냅니다*. EtherCAT은 이걸 뒤집습니다. 슬레이브는 *지나가는 프레임 안에서 직접* 자기 비트를 수정합니다.

이 장은 그 모델이 어떻게 동작하는지, 그것을 가능하게 하는 ESC(EtherCAT Slave Controller)의 자원(FMMU·Sync Manager·DC)이 무엇인지, 그리고 왜 Beckhoff에 종속되지 않은 *오픈 생태계*가 만들어졌는지 풀어봅니다.

## 한눈에 보는 구조

![EtherCAT 토폴로지 — Master에서 시작하는 daisy-chain, 마지막 슬레이브에서 반환되는 논리적 ring](/images/blog/industrial-ethernet/diagrams/ch03-ethercat-topology.svg)

EtherCAT 망은 *논리적 ring*입니다. 마스터가 보낸 프레임이 슬레이브 1→2→3→N을 순서대로 통과하고, 마지막 슬레이브에서 *접지(termination)*되어 *반대 방향*으로 돌아옵니다. 물리적으로는 *daisy-chain*입니다. 별도의 ring 토폴로지가 아닙니다. 각 슬레이브의 ESC가 *upstream port*와 *downstream port*를 가지고 있어서 한 케이블이 두 방향 신호를 *공유*합니다(전이중).

전체 프레임이 *마스터로 돌아올 때까지의 시간*이 한 사이클입니다. 64 slave × 4 byte 데이터 기준으로 12.5 μs 안에 끝납니다.

## On-the-Fly Processing — 어떻게 가능한가

표준 Ethernet 모델과 비교해 보면 차이가 선명합니다.

```text
표준 Ethernet (request-response)
  마스터: "Slave 1, 데이터 줘" 전송
  Slave 1: 프레임 *수신* → 처리 → *응답 프레임 생성* → 전송
  마스터: 응답 수신
  → 1 노드 왕복: 수십 μs
  → 64 노드: 수 ms

EtherCAT (on-the-fly)
  마스터: 한 프레임에 *모든 슬레이브의 데이터 슬롯* 포함하여 전송
  Slave 1: 프레임이 통과하는 *그 순간* 자기 비트만 R/W
  Slave 2: 같은 프레임이 와도 자기 비트만 R/W
  ...
  Slave N: 마지막 슬레이브가 termination → 프레임이 마스터로 복귀
  → 전체 64 노드: 12.5 μs
```

ESC ASIC은 프레임이 *통과하는 동안 실시간으로* 데이터를 처리합니다. 비유하자면 *지나가는 기차 안에서 손을 뻗어 가방을 바꿔치기*하는 것과 같습니다. 기차는 멈추지 않습니다.

이게 가능한 이유는 세 가지입니다.

1. ESC가 *전용 ASIC*이라 처리 지연이 *<<1 μs*. 게다가 슬레이브가 *프레임 전체*를 받기 전에 *비트 단위 스트림*으로 처리합니다. 시작부분 처리가 끝부분이 도착하기 전에 완료됩니다.
2. EtherCAT 프레임은 *최소 84 byte, 최대 1500 byte*로 길어서, 그 시간 안에 ESC가 충분히 처리할 수 있습니다.
3. *마스터가 미리 모든 슬레이브의 슬롯을 배치*한 한 프레임을 보내므로, 슬레이브는 *판단* 없이 *자기 슬롯 위치*만 알면 됩니다.

## ESC — EtherCAT Slave Controller

ESC는 *모든 EtherCAT 슬레이브의 심장*입니다. 외부에서 보면 두 개의 Ethernet PHY, 내부에는 DPRAM, FMMU, Sync Manager, DC unit, 그리고 *호스트 인터페이스*(SPI/PDI)를 가진 ASIC입니다.

![ESC 블록 다이어그램 — EBus Loop · DPRAM · FMMU · Sync Manager · DC Unit · ESC Registers와 PDI를 통한 MCU 연결](/images/blog/industrial-ethernet/diagrams/ch03-esc-block.svg)

EtherCAT 슬레이브 칩의 대표는 두 가지입니다.

| 칩 | 제조사 | 특징 | 가격대 |
|----|--------|------|--------|
| **ET1100** | Beckhoff | 4 port, 8 FMMU, 8 SM, DPRAM 8 KB | 산업 표준 |
| **LAN9252** | Microchip | 3 port, ET1100 호환, SPI/μC PDI | 저렴 |
| **AX58100** | ASIX | 2 port, 8 FMMU, 8 SM | 가성비 |
| **ESC20** | ETG | FPGA reference (IP core) | 가변 |

설계 시점에 가장 흔한 선택이 LAN9252입니다. ET1100과 *바이너리 호환*이고 SPI 인터페이스가 깔끔합니다. MCU 한 개 + LAN9252 한 개로 슬레이브를 만들 수 있어 한국의 *중소 전장·자동화 업체*에서 폭넓게 쓰입니다.

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

각 slave의 FMMU 매핑 (LWR=0x08 logical write 시점)
   Slave 1 FMMU 1: logical 0x10100~0x10103 → DPRAM 0x1000 (4 byte, write)
   Slave 1 FMMU 0: logical 0x10000~0x10003 → DPRAM 0x1010 (4 byte, read)
   Slave 2 FMMU 1: logical 0x10104~0x1010B → DPRAM 0x1000 (8 byte, write)
   ...
```

한 LRW(0x0C, Logical Read-Write) datagram이 *모든 슬레이브를 통과하면서*, 각 슬레이브가 FMMU로 *자기 슬롯만* 잘라서 처리합니다. 마스터 코드는 *논리 process image*만 다루면 됩니다. *어느 슬레이브의 어느 레지스터*가 어디 있는지 알 필요가 없습니다.

ESC는 보통 *8개 FMMU*를 가집니다. 입력·출력·mailbox용으로 나눠 씁니다.

## Sync Manager — DPRAM 접근 동기화

DPRAM은 *EtherCAT 측*과 *호스트 MCU 측* 양쪽에서 접근됩니다. 동시에 같은 영역을 R/W하면 *데이터 손상*이 일어납니다. Sync Manager가 이걸 막습니다.

Sync Manager는 두 가지 모드가 있습니다.

| 모드 | 용도 | 동작 |
|------|------|------|
| **Buffered (3-buffer)** | 주기 process data | 3개 버퍼를 *원자적*으로 swap. 항상 *최신*만 읽힘 |
| **Mailbox (handshake)** | 비주기 큰 메시지 | 한 측 쓰기 완료 → 다른 측 읽기. handshake |

3-buffer 모드의 동작이 정교합니다.

```text
3-buffer SM (process data)
  버퍼 A: EtherCAT이 *지금 쓰는 중*
  버퍼 B: 호스트가 *지금 읽는 중*
  버퍼 C: *다음에 swap될 후보*

  EtherCAT 쓰기 완료 → C가 "최신"으로 표시, A가 다음 쓰기로
  호스트 읽기 완료    → C가 호스트의 다음 읽기로
```

결과는 *race-free에 latest-only* 의미론입니다. 호스트가 느리게 읽어도 *최신 데이터*만 봅니다. 오래된 데이터를 보는 일이 없습니다.

mailbox SM은 *CoE·SoE·FoE·EoE·AoE* 같은 *대용량 비주기* 메시지에 쓰입니다. Ch 4에서 다룹니다.

## Distributed Clock — Sub-μs 동기

DC의 원리는 Ch 2에서 다뤘습니다. 여기서는 *EtherCAT 안에서의 동작 흐름*을 봅니다.

```text
DC 동기 절차 (마스터가 수행)
  1. BWR (0x05, Broadcast Write):
     모든 슬레이브의 DC port time을 latch
     → 각 슬레이브는 *각 port에서의 프레임 도착 시각*을 기록
  2. BRD (0x07, Broadcast Read):
     첫 DC 슬레이브의 시각을 reference로 채택
  3. ARMW (Auto Read Multiple Write, 0x0D):
     reference 시각을 모든 슬레이브에 분배.
     각 슬레이브 ESC가 자기 propagation delay를 자동으로 빼고
     offset을 계산해서 자체 clock에 적용
  4. 마스터가 주기적으로 ARMW를 재전송 → drift 보정
```

DC의 절묘함은 *propagation delay 자동 계산*입니다. ESC는 *port 0 도착 시각*과 *port 1 도착 시각*을 *둘 다* 기록합니다. 그 차이가 *그 슬레이브에서의 처리 시간 + 케이블 왕복 시간*입니다. 마스터는 이 정보로 *각 슬레이브까지의 정확한 propagation delay*를 계산해 ARMW에 실어 줍니다.

```text
DC 결과: 64 slave 망에서의 sync 정확도
  슬레이브 간 jitter: <100 ns
  마스터 vs 슬레이브: 1~5 μs (마스터 OS 의존)
```

마스터-슬레이브 jitter는 OS 의존이지만, *슬레이브 간*은 ns급입니다. 64축 모터가 *같은 시각에 동시 동작*해야 한다는 모션 컨트롤의 요구를 이걸로 풉니다.

## 슬레이브의 상태 머신 — EtherCAT State Machine (ESM)

EtherCAT 슬레이브는 다섯 상태를 가집니다. 마스터의 명령에 따라 상태 전이가 일어납니다.

| 상태 | 의미 | 가능한 통신 |
|------|------|------------|
| **Init** | 초기 상태, 통신 없음 | 없음 |
| **Pre-Operational (Pre-Op)** | mailbox 가능, process data 없음 | CoE/SoE/FoE/EoE 가능 |
| **Safe-Operational (Safe-Op)** | input 가능, output 불가 | input PDO 가능 |
| **Operational (Op)** | 모든 통신 가능 | input + output PDO |
| **Bootstrap** | firmware update 전용 | FoE만 |

마스터의 초기화 흐름은 보통 다음과 같습니다.

```text
1. Init        : ESC 설정 초기화
2. → Pre-Op    : Sync Manager 0/1 (mailbox) 설정
3. → Safe-Op   : Sync Manager 2/3 (PDO) 설정, FMMU 설정
                 input PDO 전송 시작
4. → Op        : output PDO도 처리. 정상 동작.
```

상태 전이가 실패하면 *AL Status*에 에러 코드가 기록되고 마스터에 통지됩니다. 가장 흔한 실패는 *Safe-Op → Op 전이*에서 *output PDO를 슬레이브가 받지 못함*입니다. WKC 불일치가 원인인 경우가 많습니다.

## Beckhoff 종속성 vs ETG 표준

EtherCAT은 *Beckhoff Automation*이 2003년에 발표한 프로토콜입니다. 그러나 같은 해에 *EtherCAT Technology Group(ETG)*에 양도되었고, 지금은 *IEC 61158/61784 국제 표준*입니다.

```text
EtherCAT 생태계
  ┌─────────────────────────────────────────────────┐
  │ ETG (EtherCAT Technology Group) - 표준 관리       │
  │   - IEC 61158/61784 표준                         │
  │   - 6000+ 회원사                                  │
  │   - vendor ID 발급, conformance test            │
  └─────────────────────────────────────────────────┘
              ↓                          ↓
  ┌────────────────────┐    ┌────────────────────┐
  │ Beckhoff 솔루션      │    │ 타사 솔루션          │
  │   - ET1100 ASIC      │    │   - LAN9252 (Microchip)│
  │   - TwinCAT (master) │    │   - AX58100 (ASIX)   │
  │   - 슬레이브 IO 모듈  │    │   - SOEM (open src)  │
  └────────────────────┘    │   - IgH (open src)   │
                            │   - acontis (commercial)│
                            └────────────────────┘
```

Beckhoff는 *ASIC IP와 master 상용 제품*을 통해 *생태계의 중심*에 남아 있지만, *프로토콜 자체는 개방*되어 있습니다. 이 균형이 EtherCAT의 빠른 채택을 가능하게 했습니다.

한국에서 EtherCAT 슬레이브를 만드는 *중소 자동화 업체*는 보통 LAN9252 + STM32 조합으로 시작합니다. ETG에 가입(연회비 약 1500 EUR)하면 *vendor ID*가 발급되고, conformance test를 통과하면 *공식 EtherCAT 슬레이브*가 됩니다. 마스터 측은 SOEM이 무료라서 *총 비용 부담*이 적습니다.

## 자주 하는 실수

### "EtherCAT은 ring 토폴로지다"

*논리적*으로는 ring이지만 *물리적*으로는 daisy-chain입니다. 슬레이브의 한 케이블이 *양방향 신호*를 다 보냅니다. 별도의 두 번째 케이블이 필요 없습니다. *cable redundancy*가 필요하면 *별도의 ring 옵션*을 켜야 합니다.

### "Slave 한 개가 잘못되면 전체 망이 죽는다"

기본 daisy-chain에서는 그렇습니다. 중간 슬레이브가 *링크 단절*되면 그 뒤의 슬레이브에 접근 불가합니다. 해결책은 *cable redundancy* 옵션입니다. 마스터가 *양쪽 끝*에 케이블을 연결해 두 방향 모두로 통신합니다. 중간 단선이 일어나도 양쪽으로 분기된 망이 *각자 동작*합니다.

### "FMMU와 Sync Manager는 같은 것이다"

다릅니다. FMMU는 *주소 변환*, SM은 *접근 동기*입니다. 같은 process data가 두 개를 모두 거칩니다. FMMU가 *논리 → 물리 주소*를 변환하고, SM이 그 물리 주소 영역에 *원자성*을 보장합니다.

### "DC는 마스터 시계를 따라간다"

PTP는 그렇지만 EtherCAT DC는 *첫 슬레이브를 reference*로 씁니다. 마스터의 절대 시각과는 *별도 도메인*입니다. 마스터 OS의 jitter가 슬레이브 동기에 영향을 *주지 않는다*는 점이 강점입니다.

### "EtherCAT 마스터는 일반 NIC로 안 된다"

일반 1 Gbps NIC로 동작합니다. 다만 *PREEMPT_RT 커널, IRQ affinity, dedicated CPU core*가 필요합니다. *전용 NIC*는 jitter를 줄이지만 필수는 아닙니다.

## 정리

- EtherCAT의 핵심은 *on-the-fly processing*입니다. 슬레이브가 프레임을 통과시키면서 자기 비트만 R/W합니다.
- 물리는 daisy-chain, 논리는 ring입니다. 마지막 슬레이브가 *termination*해서 마스터로 돌려보냅니다.
- ESC ASIC이 ns 단위 처리를 가능하게 합니다. ET1100·LAN9252·AX58100이 대표 칩입니다.
- FMMU는 *논리↔물리 주소 변환*, Sync Manager는 *DPRAM 접근 동기화*를 담당합니다.
- Distributed Clock은 *propagation delay 자동 계산*으로 슬레이브 간 ns 동기를 만듭니다.
- EtherCAT State Machine은 Init→Pre-Op→Safe-Op→Op 네 단계 전이로 초기화됩니다.
- Beckhoff가 만든 프로토콜이지만 ETG가 표준화하고 *IEC 61158 국제 표준*입니다.
- 한국 슬레이브 개발에는 LAN9252 + STM32 + SOEM 마스터 조합이 흔합니다.

다음 편은 **Ch 4: EtherCAT 프레임 — Datagram·WKC**입니다. EtherType 0x88A4 프레임의 정확한 구조와 명령 코드(LRD·LWR·LRW·BRD·BWR), Working Counter, mailbox 프로토콜(CoE·SoE·FoE·EoE·AoE)을 풀어봅니다.

## 관련 항목

- [Ch 2: 실시간 요구사항 — Determinism·Cycle Time](/blog/embedded/protocols/industrial-ethernet/chapter02-realtime-requirements)
- [Ch 4: EtherCAT 프레임 — Datagram·WKC](/blog/embedded/protocols/industrial-ethernet/chapter04-ethercat-frame)
- [Ch 5: EtherCAT Master/Slave — SOEM·IgH](/blog/embedded/protocols/industrial-ethernet/chapter05-ethercat-master)
- [원문 — EtherCAT Technology Group](https://www.ethercat.org/)
- [원문 — Microchip LAN9252 datasheet](https://www.microchip.com/en-us/product/lan9252)
