---
title: "Ch 12: 비교 분석 — 프로토콜 선택 가이드"
date: 2026-05-16T12:00:00
description: "EtherCAT·PROFINET·EtherNet/IP·POWERLINK·SERCOS III·TSN — 시나리오별 선택 가이드와 한국 산업 현장 적용 사례."
series: "Industrial Ethernet 심화"
seriesOrder: 12
tags: [industrial-ethernet, comparison, selection-guide, tsn, industry-4-0]
draft: false
---

## 한 줄 요약

> **"하나의 프로토콜이 모든 시나리오를 이기지 못합니다. *모션은 EtherCAT, 라인 통합은 PROFINET, 북미 시장은 EtherNet/IP, 미래는 TSN*입니다."** 선택은 *기술 우열*이 아니라 *기존 인프라·생태계·안전 등급*의 함수입니다.

이 시리즈의 마지막 장입니다. 앞의 11장에서 EtherCAT의 processing on the fly, PROFINET의 conformance class, TSN의 시간 인식 스위치, POWERLINK의 slot-based 폴링, Linux의 PREEMPT_RT까지 *각 표준의 내부*를 들여다보았습니다.

이번 장은 *위에서 내려다보는 비교*입니다. 6개 주요 표준을 *같은 축*에서 정렬하고, *어떤 시나리오에 어느 표준이 들어맞는지* 결정하는 흐름을 정리합니다. 마지막에 한국 산업 현장에서 실제로 어떻게 묶어 쓰는지 사례로 마무리합니다.

## 6개 표준 — 한눈 비교표

| 항목 | EtherCAT | PROFINET IRT | EtherNet/IP | POWERLINK | SERCOS III | TSN |
|------|----------|--------------|-------------|-----------|-----------|-----|
| 거버넌스 | ETG | PI | ODVA | EPSG | Bosch Rexroth | IEEE 802.1 |
| 최소 cycle | 12.5 μs | 31.25 μs | 1 ms (CIP Sync) | 100 μs | 31.25 μs | 가변 (Qbv) |
| Jitter | ≤1 μs | ≤1 μs | 수~수십 μs | ≤1 μs | ≤1 μs | ≤1 μs |
| 토폴로지 | line·ring | star·tree·ring | star·tree | star·ring·line | ring | star·ring |
| 동기 메커니즘 | DC (Distributed Clock) | PTP IEEE 1588 + IRT | CIP Sync (1588) | NMT slot | MST cycle | gPTP 802.1AS |
| 결정성 원리 | on-the-fly + ASIC | time-aware switch | priority + sync | slot scheduling | time-slotted ring | time-aware shaper |
| 슬레이브 H/W 비용 | $$ (ESC ASIC) | $$$ (IRT NIC) | $ (표준 NIC) | $ (표준 NIC) | $$$ (FPGA) | $$ (TSN NIC) |
| 마스터 H/W 비용 | $ (일반 NIC) | $$$ (IRT switch) | $ (표준 PC) | $ (표준 NIC) | $$ | 가변 |
| Safety profile | FSoE (61508 SIL 3) | PROFIsafe (SIL 3) | CIP Safety (SIL 3) | openSAFETY (SIL 3) | CIP Safety (SIL 3) | FRER · TSN-Safety |
| 케이블 | 표준 Cat 5e | 표준 Cat 5e | 표준 Cat 5e | 표준 Cat 5e | 표준 Cat 5e | 표준 Cat 5e |
| 최대 노드 | 65535 (이론) | ~250 (1 ms cycle 기준) | ~수백 | 240 | 254 | 토폴로지 의존 |
| 한국 점유율 | 모션·로봇 1위 | 자동차·반도체 라인 1위 | 북미계 라인 | 일부 SI 시장 | 공작기계 일부 | 신규 | 

이 표가 *질문의 출발점*입니다. 하나하나 풀어 봅니다.

## 차원별 비교

### 1. Cycle 시간과 jitter

가장 자주 묻는 축입니다. *반드시 짧을수록 좋은* 것은 아닙니다. *애플리케이션이 요구하는 만큼*이 정답입니다.

| cycle 요구 수준 | 대표 application |
|-----------------|------------------|
| ≤ 50 μs | 고속 모션·CNC·로봇 조인트 제어 |
| 50 μs ~ 250 μs | 일반 servo, 협동 로봇 |
| 250 μs ~ 1 ms | 안전 PLC, 비전·force control |
| 1 ms ~ 10 ms | 공정 자동화, 분산 IO |
| 10 ms ~ 100 ms | 상위 SCADA, HMI |

EtherCAT·PROFINET IRT·SERCOS III·POWERLINK는 *μs급 cycle*을 보장합니다. EtherNet/IP의 *기본 CIP*는 best-effort라서 *1 ms 이하는 어렵습니다*. CIP Sync + CIP Motion으로 *1 ms급*은 가능하지만, EtherCAT 수준의 *수 μs*는 안 나옵니다.

### 2. 토폴로지

| 토폴로지 | 장점 | 단점 | 적합 표준 |
|---------|------|------|---------|
| line (daisy-chain) | 케이블 절약, 직관적 배선 | 한 곳 단선이면 하류 다 죽음 | EtherCAT (기본) |
| ring | 단선 자가 치유 | redundant 케이블, 비용 ↑ | EtherCAT (ring 모드), POWERLINK, SERCOS III |
| star (switch 중심) | 한 노드 죽어도 영향 적음 | switch 비용·hop latency | PROFINET, EtherNet/IP, TSN |
| tree | star의 계층 확장 | 동일 | PROFINET (대규모 라인) |

모션 라인은 *line/ring*이 자연스럽습니다. 액추에이터가 *기계적으로 일렬 배치*되기 때문입니다. 공정 라인이나 분산 IO는 *star/tree*가 자연스럽습니다. 큰 라인 안에 여러 셀이 *물리적으로 떨어져* 있기 때문입니다.

### 3. 슬레이브 하드웨어 비용

| 표준 | 슬레이브 칩 가격대 | 비고 |
|------|------------------|------|
| EtherCAT | $2~5 (LAN9252, AX58100) | ASIC 전용. 대량 양산 시 단가 빠르게 하락 |
| PROFINET CC-A | $1~3 | 일반 NIC PHY로 가능 |
| PROFINET IRT | $5~15 (netX, ERTEC) | 전용 ASIC 필수 |
| EtherNet/IP | $1~3 | 일반 NIC로 가능 |
| POWERLINK | $1~3 | FPGA 또는 표준 MAC |
| SERCOS III | $10~30 | FPGA IP 라이선스 |
| TSN | $5~10 (i.MX 8M Plus, LS1028A) | 가격 빠르게 하락 중 |

*싼 게 좋은 게 아닙니다*. EtherCAT의 LAN9252는 *비싸도 결정성을 자체 보장*합니다. 일반 NIC + 소프트웨어로 결정성을 짜는 EtherNet/IP는 *마스터·OS·튜닝 비용*이 별도로 듭니다. *시스템 총 비용*으로 보면 EtherCAT이 *모션*에서 가장 저렴한 경우가 많습니다.

### 4. Safety profile

기능 안전은 *별도 표준*입니다. 망 자체가 SIL을 만드는 게 아니라, 망 위에 *safety 프로토콜*을 얹습니다.

| 표준 | Safety 프로토콜 | 인증 수준 | 비고 |
|------|---------------|---------|------|
| EtherCAT | FSoE (Safety over EtherCAT) | IEC 61508 SIL 3 | 기존 망에 *추가 layer*로 동거 |
| PROFINET | PROFIsafe | IEC 61508 SIL 3 | F-CPU (Fail-safe PLC)와 짝 |
| EtherNet/IP | CIP Safety | IEC 61508 SIL 3 | 미국·일본 강세 |
| POWERLINK | openSAFETY | IEC 61508 SIL 3 | 오픈 사양 |
| SERCOS III | CIP Safety | IEC 61508 SIL 3 | EtherNet/IP와 호환 |
| TSN | FRER (802.1CB) | 망 redundancy. 상위는 별도 | safety 자체는 application 책임 |

모두 *SIL 3*를 보장합니다. 안전 관점에서는 *어느 표준이든 차이가 없습니다*. 차이는 *PLC 벤더 생태계*에서 옵니다. Siemens F-CPU + PROFIsafe, Rockwell GuardLogix + CIP Safety, Beckhoff TwinSAFE + FSoE가 *세 묶음*으로 시장이 갈립니다.

### 5. Vendor 생태계

| 표준 | 주력 vendor | 생태계 강점 |
|------|------------|-----------|
| EtherCAT | Beckhoff, Omron, Kollmorgen, Yaskawa | 모션 컨트롤러·서보 |
| PROFINET | Siemens, Phoenix, Pepperl+Fuchs | 라인 통합·HMI·MES |
| EtherNet/IP | Rockwell, Omron, Allen-Bradley | 북미 자동차·식품·음료 |
| POWERLINK | B&R, KEBA | 인쇄·포장기 |
| SERCOS III | Bosch Rexroth, Schneider | 공작기계·프레스 |
| TSN | Intel, NXP, Marvell, Cisco | OPC UA·Industry 4.0 |

생태계가 *기술적 우열보다 자주 결정 인자*입니다. *PLC가 Rockwell이면 EtherNet/IP가 기본*입니다. *Siemens가 들어와 있으면 PROFINET이 기본*입니다. 신규 라인을 *통째로 갈아엎지 않는 한* 기존 PLC 벤더의 표준을 따라갑니다.

## 시나리오별 추천

### 시나리오 1 — 6축 로봇팔 모션 제어

요구: 250 μs cycle, ≤1 μs jitter, line 토폴로지, 협동 로봇 안전(ISO 10218).

```text
요구 매칭
  cycle:      250 μs        → EtherCAT·PROFINET IRT·SERCOS III
  jitter:     ≤1 μs         → 동일
  topology:   line          → EtherCAT 자연, 나머지는 ring/star
  safety:     SIL 3 + STO   → 세 표준 모두 가능
  cost:       슬레이브 적은데 master 비싸지 말 것
  → EtherCAT (master 가장 저렴, line 자연)
```

**추천: EtherCAT + FSoE.** 두산 협동로봇, 현대중공업 산업로봇이 이 조합입니다.

### 시나리오 2 — 자동차 차체 용접 라인

요구: 100~200 PLC + 1000~2000 분산 IO, 4 ms cycle, Siemens PLC 표준화.

```text
요구 매칭
  분산 IO 규모: 매우 큼      → star/tree 토폴로지 필수
  cycle:       4 ms          → PROFINET RT 충분
  PLC:         S7-1500       → TIA Portal 통합
  Safety:      PROFIsafe     → 라인 비상정지 SIL 3
  →  PROFINET RT (+ IRT는 모션 셀에만)
```

**추천: PROFINET RT(주력) + IRT(모션 셀 한정).** 현대자동차 울산 공장, 기아 화성 공장이 이 패턴입니다.

### 시나리오 3 — 반도체 fab 비전 검사 스테이션

요구: 카메라 트리거 ±100 ns 동기, 50 ms throughput, IT 시스템 통합.

```text
요구 매칭
  카메라 동기: PTP 1588 필수  → 모든 표준 가능
  throughput: best-effort     → IT 호환 우선
  IT 통합:    OPC UA          → Ethernet 표준 친화
  →  EtherNet/IP + GigE Vision 또는 OPC UA over TSN
```

**추천: EtherNet/IP + GigE Vision** (현재 표준) 또는 **OPC UA Pub-Sub over TSN** (미래). 삼성전자 평택, SK하이닉스 청주 fab의 검사 라인이 이 조합으로 옮겨가고 있습니다.

### 시나리오 4 — 식품·음료 라인 (북미 vendor)

요구: Rockwell ControlLogix PLC, FactoryTalk SCADA, FDA 21 CFR Part 11 추적.

```text
→  EtherNet/IP + CIP Safety 외에 선택지 없음
```

**추천: EtherNet/IP.** 한국 진출 미국계 식품업체(Coca-Cola, Pepsi, Nestle) 공장이 거의 모두 이 라인입니다.

### 시나리오 5 — 인쇄·포장기 (B&R 강세)

요구: 8축 동기 모션, ring redundancy, 200 μs cycle.

**추천: POWERLINK + openSAFETY.** B&R의 본거지 시장이고 LG화학 포장 라인, 코오롱 인쇄기에서도 보입니다.

### 시나리오 6 — 차세대 통합 라인 (Industry 4.0)

요구: motion + safety + vision + IT 데이터 한 망에서, vendor lock-in 회피.

```text
요구 매칭
  vendor-neutral: 절실        → IEEE 802.1 표준
  motion + IT:    동거         → time-aware + best-effort 큐 분리
  →  OPC UA Pub-Sub over TSN (802.1Qbv + 802.1AS)
```

**추천: OPC UA over TSN.** 아직 *대규모 양산 배치*는 한국에 거의 없지만, 삼성전자 평택 P3·LG디스플레이 파주 P9 신규 라인의 일부 셀에서 *파일럿*으로 시작했습니다. 향후 5~10년에 *주류로 이동*할 가능성이 높습니다.

## OPC UA over TSN — 통합의 미래

이 흐름이 *시리즈 전체를 통틀어 가장 중요한 동향*입니다. 지금까지의 산업 이더넷은 *각 vendor의 독자 프로토콜*이었습니다. EtherCAT 슬레이브를 PROFINET 마스터에 못 꽂고, EtherNet/IP PLC가 EtherCAT 드라이브를 직접 못 다룹니다. *gateway*를 거쳐야 합니다.

OPC UA Pub-Sub over TSN은 *그 벽을 허무는 시도*입니다.

**기존 (vendor-locked)** — vendor마다 독자 프로토콜, gateway 경유로만 통합:

![Vendor-Locked Architecture](/images/blog/industrial-ethernet/diagrams/ch12-vendor-locked.svg)

**미래 (TSN 통합)** — 단일 backbone 위에 OPC UA Pub-Sub semantic으로 모든 도메인 통합:

![TSN Backbone](/images/blog/industrial-ethernet/diagrams/ch12-tsn-backbone.svg)

VDMA의 *Umati* initiative, OPC Foundation의 *Companion Specifications*가 이 그림을 구체화하고 있습니다. 한국에서는 *현대자동차 의왕연구소*의 차세대 라인 설계, *POSCO 광양제철소*의 일부 압연 라인에서 *조심스럽게* 시도되고 있습니다.

이 흐름이 *완전히 자리잡는 데* 10년 이상은 걸릴 것으로 봅니다. 기존 PROFINET·EtherCAT 라인의 *설비 수명*이 15~20년이라, 새 표준이 *지배적*이 되려면 *세대 교체*가 필요합니다.

## 한국 산업 현장의 묶음 패턴

한국 공장에서 자주 보이는 *현실 배치*입니다.

### 현대자동차 — 차체 라인

```text
상위 MES:        Ethernet + OPC UA
PLC 백본:         PROFINET RT (Siemens S7-1500)
분산 IO:          PROFINET RT (ET 200SP)
모션 셀:           PROFINET IRT 또는 EtherCAT(부분)
용접 로봇:         EtherCAT (현대중공업·ABB·KUKA)
Safety:           PROFIsafe + FSoE
```

라인 백본은 PROFINET이고, *로봇 내부*만 EtherCAT입니다. 두 망은 *gateway*로 묶입니다.

### 삼성전자 — 반도체 fab

```text
상위 시스템:       Ethernet + OPC UA + SECS/GEM
설비 통신:         SECS/GEM over TCP/IP
설비 내부 제어:     EtherCAT 또는 PROFINET IRT (장비 vendor 따라)
비전 카메라:        GigE Vision + CC-Link IE 또는 EtherNet/IP
Safety:           장비 vendor 표준
```

*외부 망은 IT*이고 *설비 내부만 산업 이더넷*입니다. 반도체 fab의 특징은 *설비를 통째로* 사오는 점입니다. 망 표준은 *vendor가 결정*합니다.

### LG에너지솔루션 — 배터리 셀 조립

```text
라인 백본:         PROFINET RT
권취·조립 모션:    EtherCAT (Beckhoff TwinCAT)
검사 비전:         EtherNet/IP + GigE Vision
화성 공정:         PROFIBUS PA (기존 설비) + PROFINET (신규)
Safety:           PROFIsafe + FSoE
```

PROFINET·EtherCAT·EtherNet/IP가 *셋 다* 한 공장 안에 있습니다. 영역별로 *vendor의 강점*을 따라간 결과입니다.

### POSCO 광양제철소 — 압연 라인

```text
상위 제어:         EtherNet/IP + Modbus TCP
압연 모션:         SERCOS III (Bosch Rexroth)
공정 PLC:         PROFINET (Siemens) 또는 EtherNet/IP(Rockwell)
화성 공정:         PROFIBUS PA · HART (위험구역)
신규 시범 라인:     OPC UA over TSN (파일럿)
```

*기존 설비*가 PROFIBUS PA·SERCOS III인 곳이 많고, *신규 라인*은 OPC UA over TSN으로 *시범 적용* 중입니다.

### 현대중공업 — 산업 로봇

```text
로봇 컨트롤러:     EtherCAT (IgH master on Linux PREEMPT_RT)
서보 드라이브:     EtherCAT (자체 + 협력사)
Safety:           FSoE
티칭 펜던트:        Ethernet TCP + 자체 protocol
공장 PLC 연결:     PROFINET 또는 EtherNet/IP gateway (고객 환경 따라)
```

로봇 *제품 내부는 EtherCAT 단일*이고, *외부 인터페이스만* 고객의 PLC 망에 맞춥니다. 이 패턴이 *모션 컨트롤 제품*의 표준 설계입니다.

## 선택 흐름도

복잡한 결정을 *질문 다섯 개*로 정리해 봅니다.

```text
Q1. 기존 PLC가 있는가?
    YES → 그 vendor 표준 따름 (Siemens=PROFINET, Rockwell=EtherNet/IP, B&R=POWERLINK)
    NO  → Q2로

Q2. 모션 컨트롤이 주된 application인가?
    YES → cycle ≤ 250 μs 필요? → EtherCAT
                              아니면 → POWERLINK or PROFINET IRT
    NO  → Q3로

Q3. 분산 IO·라인 통합이 중심인가?
    YES → 북미·일본 시장? → EtherNet/IP
          유럽·한국 시장? → PROFINET RT
    NO  → Q4로

Q4. IT 통합·vendor lock-in 회피가 우선인가?
    YES → OPC UA over TSN (단, 5~10년 ramp-up 예상)
    NO  → Q5로

Q5. 공작기계·프레스인가?
    YES → SERCOS III
    NO  → (재검토 필요)
```

이 흐름이 *완벽한* 결정 규칙은 아니지만, *9할의 케이스를 가립니다*. 나머지 1할은 *vendor 협상·기존 인력의 숙련도·향후 5년 setup cost*가 결정합니다.

## 정리

- 모든 시나리오에서 *최강*인 단일 표준은 존재하지 않습니다. *선택은 application·생태계·기존 인프라의 함수*입니다.
- 모션·로봇은 EtherCAT이 *cycle·비용 모두* 우위입니다. ETG 생태계가 두텁고 master가 일반 NIC면 충분합니다.
- 라인 통합·분산 IO·HMI 통합은 PROFINET이 *Siemens TIA Portal 한 IDE*에서 끝납니다. 한국 자동차·디스플레이 공장의 사실상 표준입니다.
- 북미 시장과 식음료·화학 라인은 *EtherNet/IP + CIP Safety*가 사실상 단일 선택지입니다.
- POWERLINK·SERCOS III는 *특정 vendor·산업*에서 강합니다. 인쇄·포장·공작기계.
- TSN은 *vendor-neutral 미래*입니다. OPC UA Pub-Sub과 결합해 *모든 산업 데이터를 한 망*에 흐르게 만드는 시도가 진행 중입니다.
- 한국 공장은 PROFINET·EtherCAT·EtherNet/IP가 *gateway로 묶여 공존*하는 패턴이 가장 일반적입니다. 단일 표준 선택은 *제품 내부*에서나 가능합니다.
- 안전 프로토콜은 모두 *IEC 61508 SIL 3*를 만족합니다. 안전 관점에서는 표준 간 우열이 없습니다.

## 시리즈를 마치며

12편으로 산업용 이더넷 표준을 *내부 동작 수준*까지 훑었습니다. EtherCAT의 *on-the-fly 슬레이브 ASIC*, PROFINET IRT의 *time-aware switch*, TSN의 *Qbv·Qbu·Qci*, POWERLINK의 *slot 기반 폴링*, Linux PREEMPT_RT의 *μs급 결정성*까지 *왜 그렇게 설계되었는지*가 핵심 흐름이었습니다.

이 시리즈가 *vendor 마케팅의 안개*를 걷어내고 *공학적 trade-off*를 본 자리가 되었기를 바랍니다. PROFINET이 EtherCAT보다 *나쁜* 것이 아닙니다. *문제가 다릅니다*. 그 사실이 명확해지면 *선택*은 자연스러워집니다.

다음 시리즈 추천은 두 가지입니다.

- **Practical RTOS Internals — Part 5 Linux RT**: PREEMPT_RT를 *RTOS 관점*에서 더 깊이. scheduling·priority inheritance·deadlock 회피를 OS 내부에서 보는 시리즈입니다.
- **Buildroot로 시작하는 임베디드 Linux**: softPLC를 *부팅부터* 만드는 흐름. Buildroot로 *최소 root filesystem*을 빌드하고, PREEMPT_RT 커널과 IgH EtherCAT 모듈을 *제품 이미지*로 패키징하는 단계까지.

기능 안전 쪽으로 한 단계 더 가고 싶다면 **항공우주 안전 표준 — DO-178C·DO-254** 시리즈가 *SIL 3의 인증 절차*를 풀어 줍니다.

## 관련 항목

- [Ch 1: 산업용 이더넷 개요](/blog/embedded/protocols/industrial-ethernet/chapter01-overview) — 시리즈 시작
- [Ch 5: EtherCAT Master/Slave — SOEM·IgH](/blog/embedded/protocols/industrial-ethernet/chapter05-ethercat-master)
- [Ch 6: PROFINET 개요 — RT·IRT 클래스](/blog/embedded/protocols/industrial-ethernet/chapter06-profinet)
- [Ch 8: TSN — IEEE 802.1 시간 민감 네트워킹](/blog/embedded/protocols/industrial-ethernet/chapter08-tsn)
- [Ch 10: POWERLINK — Slot 기반 폴링](/blog/embedded/protocols/industrial-ethernet/chapter10-powerlink)
- [Ch 11: 리눅스 실시간 — PREEMPT_RT·EtherCAT](/blog/embedded/protocols/industrial-ethernet/chapter11-linux-realtime)
- [Practical RTOS Internals Part 5.7: PREEMPT_RT Linux](/blog/embedded/rtos/practical-internals/part5-07-preempt-rt-linux)
- [Modern Embedded Recipes Part 4.6: IRQ affinity](/blog/embedded/modern-recipes/part7-13-irq-affinity)
- [Buildroot Ch 1: 문제 정의](/blog/embedded/buildroot/chapter01-problem)
- [DO-178C Ch 1: 항공 SW 인증 개요](/blog/embedded/aerospace-standards/do-178c/chapter01-overview)
- [원문 — ETG (EtherCAT Technology Group)](https://www.ethercat.org/)
- [원문 — PI (PROFINET International)](https://www.profibus.com/)
- [원문 — ODVA (EtherNet/IP)](https://www.odva.org/)
- [원문 — OPC Foundation](https://opcfoundation.org/)
