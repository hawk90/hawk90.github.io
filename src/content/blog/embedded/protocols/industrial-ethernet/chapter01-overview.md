---
title: "산업용 이더넷 분석 — 일반 이더넷과 결정성 요구의 차이"
date: 2026-05-13T09:01:00
description: "왜 표준 Ethernet으로 부족한가 — 실시간성·결정성."
series: "Industrial Ethernet 심화"
seriesOrder: 1
tags: [industrial-ethernet, ethercat, profinet, tsn]
draft: false
---

## 한 줄 요약

> **"공장의 motion control은 1 ms 안에 끝나야 하고, 표준 TCP/IP는 그 1 ms를 보장하지 않는다."** 산업용 이더넷은 표준 Ethernet을 *결정적(deterministic)*으로 길들이는 기술의 묶음입니다.

대학에서 배우는 Ethernet은 "best-effort 패킷 망"입니다. 패킷이 늦게 도착해도, 순서가 바뀌어도, 가끔 손실되어도 TCP가 알아서 복구합니다. 데스크톱과 데이터센터에서는 충분히 잘 동작합니다.

문제는 공장입니다. 6축 로봇팔이 0.5 mm 오차 안에서 용접점을 따라가려면, 마스터가 보낸 위치 명령이 *250 μs마다 정확히 같은 간격으로* 모든 슬레이브에 도착해야 합니다. 한 사이클이 늦으면 로봇이 흔들리고, 두 사이클이 사라지면 안전 회로가 *비상 정지*를 겁니다. TCP의 재전송 100 ms는 여기서는 *기절급 지연*입니다.

이 시리즈는 산업 자동화에서 쓰이는 결정적 이더넷 표준들을 다룹니다. EtherCAT·PROFINET·EtherNet/IP·SERCOS III·POWERLINK·TSN까지, 각각이 어떤 시간 등급을 보장하는지, 어떻게 표준 Ethernet 위에서 그것을 가능하게 하는지 풀어갑니다.

## 표준 Ethernet의 한계

"왜 그냥 1 Gbps Ethernet으로 안 되는가"라는 질문이 첫 단추입니다. 대역폭은 충분합니다. 정작 부족한 것은 *지연의 상한*입니다.

표준 Ethernet 스택의 비결정성 원천은 네 군데입니다.

| 계층 | 비결정성 원인 | 전형적 영향 |
|------|-------------|------------|
| PHY/MAC | switch에서의 store-and-forward, queue 대기 | 수 μs ~ 수 ms |
| IP/TCP | 재전송, 경로 변경, NAT, 방화벽 | 수십 ms |
| OS 스택 | softirq 지연, NAPI 폴링 간격 | 수십 μs ~ ms |
| 애플리케이션 | GC, page fault, scheduling jitter | ms 단위 |

각 계층이 *평균*은 빠릅니다. 문제는 *최악값*입니다. 산업 제어는 평균이 아니라 *worst-case*로 설계됩니다. 평균 200 μs인데 한 사이클에 한 번 5 ms가 튀어나오는 시스템은, 그 한 번에 로봇이 멈춥니다.

```text
일반 Ethernet ping latency 분포 (Gigabit, switch 1단)
  평균:    80 μs
  중앙값:  60 μs
  p99:    180 μs
  p99.9:  450 μs
  p99.99:  3.2 ms   ← 1만 번에 1번 — motion control 실패
  최대:   12 ms     ← MAC pause, queue overflow
```

이 *꼬리(tail)*가 산업용 이더넷이 풀어야 할 본질입니다.

## 결정성 — 세 가지 시간 등급

"실시간"은 단일 개념이 아닙니다. 시스템이 deadline을 놓쳤을 때의 *결과*에 따라 세 등급으로 나뉩니다.

| 등급 | 정의 | 예 | 사이클 |
|------|------|-----|--------|
| **Soft real-time** | deadline 초과 = 품질 저하 | 비디오 스트리밍, HMI | 16~100 ms |
| **Firm real-time** | deadline 초과 = 결과 무효 | 데이터 수집, SCADA | 10~100 ms |
| **Hard real-time** | deadline 초과 = 시스템 실패 | motion, 안전 제어 | 250 μs ~ 1 ms |

산업용 이더넷이 진짜로 다루는 영역은 Firm과 Hard입니다. *동시에 두 등급 모두를 한 망에서 지원*해야 한다는 점이 설계의 까다로움입니다.

```text
공장 한 셀의 트래픽 구성 (실제 예)
  Hard (motion):      250 μs cycle, 64 byte × 32 축    →  대역폭 8 Mbps
  Firm (PLC I/O):     1 ms cycle,  256 byte × 100 노드 →  대역폭 200 Mbps
  Best-effort (HMI):  TCP 화면 갱신, 파일 전송          →  나머지
```

대역폭만 봐서는 1 Gbps로 충분합니다. 그러나 hard 트래픽이 best-effort 트래픽 뒤에 줄을 서면 *jitter*가 폭발합니다. 결정성을 만드는 일은 결국 *우선순위와 시간 슬롯 배분*의 문제입니다.

## 결정성을 만드는 네 가지 전략

표준 Ethernet을 결정적으로 길들이는 방법은 크게 네 가닥입니다. 각 산업 이더넷 표준은 이 중 하나 이상을 선택합니다.

### 1. Master/Slave + 순환 폴링

마스터 하나가 모든 슬레이브를 *고정 사이클*로 폴링합니다. 슬레이브는 마스터 요청 없이는 송신하지 않습니다. 충돌이 원천적으로 없습니다.

대표 예가 **EtherCAT**입니다. 마스터가 한 프레임을 보내면 그 프레임이 슬레이브들을 *체인으로 통과*하면서 각자의 데이터를 읽고 씁니다.

### 2. TDMA — 시간 슬롯 분할

망의 시간을 *고정 슬롯*으로 나누고, 각 노드에 슬롯을 할당합니다. 슬롯 안에서만 송신합니다.

**POWERLINK**가 이 방식입니다. 한 사이클은 *Isochronous phase* + *Asynchronous phase*로 나뉘고, 첫 단계에서 모든 hard 트래픽이 끝납니다.

### 3. Priority Queue + 하드웨어 스위치

VLAN 우선순위 큐를 활용해 hard 트래픽을 *우선 전송*합니다. 더 강한 보장은 *시간 인식 스위치(time-aware shaper)*로 합니다.

**PROFINET RT**가 우선순위 큐, **PROFINET IRT**와 **TSN**이 시간 인식 스위치를 씁니다.

### 4. 정밀 동기 + 동시 동작

IEEE 1588 PTP로 모든 노드의 시계를 sub-μs로 맞춥니다. 그러면 *같은 절대 시각*에 모두가 동작합니다. 망의 지연은 보상으로 흡수합니다.

**EtherCAT의 Distributed Clock**, **TSN의 802.1AS**가 이 길을 갑니다.

대부분의 표준은 두세 가지를 *조합*해 씁니다. EtherCAT은 1번 + 4번, PROFINET IRT는 2번 + 3번 + 4번입니다.

## 5대 표준 — 한눈 비교

| 표준 | 주도 | 방식 | 최소 사이클 | 시장 |
|------|------|------|------------|------|
| **EtherCAT** | Beckhoff (독일) | master/slave + on-the-fly | 12.5 μs | 모션·로봇 |
| **PROFINET** | Siemens (독일) | RT/IRT + GSDML | 31.25 μs (IRT) | 공정·PLC |
| **EtherNet/IP** | Rockwell (미국) | CIP over UDP/IP | 1 ms (CIP Motion) | 미국 시장 PLC |
| **POWERLINK** | B&R (오스트리아) | TDMA polling | 100 μs | 모션 (오픈소스) |
| **SERCOS III** | Bosch Rexroth | TDMA + UC channel | 31.25 μs | 모션 (서보) |

여기에 **TSN (IEEE 802.1)**이 *상위 표준*으로 자리잡고 있습니다. 5대 표준이 각자의 TSN profile을 정의하면서 *수렴*하는 흐름입니다.

지역적 색채도 짙습니다. 독일·유럽은 EtherCAT/PROFINET이 압도적이고, 미국은 EtherNet/IP가 강세입니다. 한국은 양쪽이 섞여 있습니다. *국내 로봇·자동화 업계*는 *EtherCAT·EtherNet/IP·PROFINET*이 *공존*하며, 한 공장에 *두세 가지 표준이 gateway로 연결되어 공존*하는 게 일상입니다. (구체 회사·라인별 채택 현황은 *공개 자료 한정*적이므로 *spec 카탈로그*에서 직접 확인하는 게 안전합니다.)

## 시리즈 로드맵

이 시리즈는 EtherCAT을 깊게 다루고, 나머지를 비교하는 구조입니다.

| 장 | 주제 |
|----|------|
| Ch 1 (이 글) | 개요·5대 표준 |
| Ch 2 | 실시간 요구사항·jitter·PTP |
| Ch 3 | EtherCAT 아키텍처·on-the-fly·DC |
| Ch 4 | EtherCAT 프레임·datagram·WKC |
| Ch 5 | EtherCAT master/slave 구현 |
| Ch 6 | PROFINET RT·IRT |

EtherCAT을 먼저 깊이 보는 이유는 두 가지입니다. 첫째, *오픈소스 master(SOEM, IgH)*가 있어서 직접 코드를 만져 보면서 배울 수 있습니다. 둘째, EtherCAT의 *on-the-fly* 모델이 가장 극단적인 결정성을 보여 줍니다. 이걸 이해하면 다른 표준이 어떤 *타협*을 선택했는지 보입니다.

## 자주 하는 오해

### "기가비트 Ethernet이면 산업용으로 충분하다"

대역폭의 문제가 아닙니다. 1 Gbps 망에서도 일반 트래픽이 끼면 *최악 지연*이 수 ms로 튑니다. 산업용 표준이 풀어야 할 것은 throughput이 아니라 *worst-case latency의 상한*입니다.

### "PREEMPT_RT만 켜면 hard real-time이다"

Linux PREEMPT_RT는 *호스트 OS의 jitter*만 줄여 줍니다. 망 자체의 jitter, switch 큐 지연, 다른 노드의 트래픽 간섭은 그대로입니다. 산업용 이더넷은 *네트워크 수준의 결정성*을 다룹니다. 호스트 RT는 *전제 조건*일 뿐 충분 조건이 아닙니다. PREEMPT_RT 설정 자체는 [Practical RTOS Internals Part 1.4: Preemption](/blog/embedded/rtos/practical-internals/part1-04-preemption)에서 다룹니다.

### "TSN이 나오면 EtherCAT은 사라진다"

가까운 시일에는 그렇지 않습니다. TSN은 *표준 인프라*입니다. EtherCAT은 *완성된 응용 프로토콜 + 슬레이브 하드웨어 생태계*입니다. TSN 위에서 EtherCAT을 운영하는 *EtherCAT over TSN* 흐름이 오히려 현실에 가깝습니다.

### "산업용 이더넷은 IT 보안과 무관하다"

이건 *과거의 신화*입니다. IT/OT 통합으로 공장망이 외부와 연결되면서 산업용 이더넷도 *보안 위협*에 직접 노출되어 있습니다. Stuxnet 사건 이후 PROFINET·EtherNet/IP는 *Security extension*을 추가하는 중입니다.

## 정리

- 표준 Ethernet의 본질적 한계는 *대역폭이 아니라 worst-case latency*입니다.
- 산업 자동화는 Soft/Firm/Hard 세 시간 등급을 *동시에* 다루는 망을 요구합니다.
- 결정성은 *master polling, TDMA, priority queue, 시계 동기* 네 전략의 조합으로 만듭니다.
- 5대 표준(EtherCAT·PROFINET·EtherNet/IP·POWERLINK·SERCOS III)이 각자의 trade-off를 선택합니다.
- TSN은 이 표준들을 *공통 인프라*로 묶는 IEEE 802.1 표준 모음입니다.
- 한국 공장에는 EtherCAT과 PROFINET·EtherNet/IP가 *gateway로 연결되어* 공존하는 게 일반적입니다.
- PREEMPT_RT는 *호스트 RT*에 필요하지만 망의 결정성을 보장하지는 *않습니다*.

다음 편은 **Ch 2: 실시간 요구사항 — Determinism·Cycle Time**입니다. cycle time과 jitter 예산을 정량적으로 다루고, IEEE 1588 PTP의 동작을 풀어봅니다.

## 관련 항목

- [Ch 2: 실시간 요구사항 — Determinism·Cycle Time](/blog/embedded/protocols/industrial-ethernet/chapter02-realtime-requirements)
- [Ch 3: EtherCAT 아키텍처 — Processing on the Fly](/blog/embedded/protocols/industrial-ethernet/chapter03-ethercat-architecture)
- [Practical RTOS Internals Part 1.4: Preemption](/blog/embedded/rtos/practical-internals/part1-04-preemption) — 호스트 측 RT의 전제 조건
- [Modern Embedded Recipes Part 4.6: IRQ affinity](/blog/embedded/modern-recipes/part7-13-irq-affinity) — NIC 인터럽트를 RT core에 고정하기
- [원문 — EtherCAT Technology Group](https://www.ethercat.org/)
- [원문 — PROFINET International](https://www.profibus.com/)
