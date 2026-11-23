---
title: "산업용 이더넷 분석 — 일반 이더넷과 결정성 요구의 차이"
slug: "embedded/protocols/industrial-ethernet/chapter01-overview"
date: 2026-05-13T09:01:00
description: "표준 Ethernet이 산업 제어에 부족한 이유를 TCP 재전송 상수와 VM 지연 꼬리로 보이고, EtherCAT·PROFINET·POWERLINK·Sercos·TSN이 결정성을 만드는 네 가지 전략을 정리합니다."
series: "Industrial Ethernet 심화"
seriesOrder: 1
tags: [industrial-ethernet, ethercat, profinet, tsn]
draft: false
topics: ["embedded", "embedded/protocols"]
---

## 한 줄 요약

> **"산업 통신의 deadline은 제어 대상이 정하며, 링크 속도만으로 지연 상한을 보장할 수 없습니다."** 산업용 이더넷은 표준 Ethernet을 *결정적(deterministic)*으로 길들이는 기술의 묶음입니다.

대학에서 배우는 Ethernet은 "best-effort 패킷 망"입니다. 패킷이 늦게 도착해도, 순서가 바뀌어도, 가끔 손실되어도 TCP가 알아서 복구합니다. 데스크톱과 데이터센터에서는 이 방식이 충분히 잘 동작합니다.

공장에서는 "알아서 복구"에 걸리는 시간이 문제입니다. Linux v6.12의 `include/net/tcp.h`는 재전송 timeout 하한의 기본값 `TCP_RTO_MIN`을 `HZ/5`, 즉 200 ms로, 첫 RTO `TCP_TIMEOUT_INIT`을 `1*HZ`(RFC 6298 2.1절의 1초)로 정의합니다. 같은 판의 `ip-sysctl.rst`도 `tcp_rto_min_us`의 기본값을 200000 μs로 적습니다. 250 μs 주기로 도는 모션 제어에서 손실을 RTO로 복구한다면 기본 하한만으로 800 주기가 지나갑니다. 기본값 3으로 켜져 있는 tail loss probe(`tcp_early_retrans`)가 더 일찍 재전송할 수는 있지만, 그것도 RTT 단위로 기다린 뒤의 일이고 재전송 시각의 상한은 아닙니다. 복구가 되긴 하지만 제어 루프 입장에서는 이미 늦었습니다.

이 시리즈는 산업 자동화에서 쓰이는 결정적 이더넷 기술을 다룹니다. EtherCAT·PROFINET·EtherNet/IP·Sercos·POWERLINK·TSN이 어떤 방식으로 전송 시각을 통제하는지, 그 방식이 표준 Ethernet 하드웨어 위에서 어떻게 성립하는지 풀어 갑니다.

## 표준 Ethernet의 한계

"왜 그냥 1 Gbps Ethernet으로 안 되는가"라는 질문이 첫 단추입니다. 대역폭은 충분합니다. 정작 부족한 것은 *지연의 상한*입니다.

표준 Ethernet 스택에서 지연이 흔들리는 원천은 계층마다 있습니다.

| 계층 | 지연 변동 원인 |
|------|-------------|
| PHY/MAC·switch | store-and-forward, 같은 출력 포트의 queue 대기 |
| IP/TCP | 재전송(Linux RTO 하한 기본 200 ms), 경로 변경 |
| OS 스택 | softirq 지연, NAPI 폴링 간격 |
| 애플리케이션 | page fault, scheduling 지연 |

각 계층의 *평균*은 빠릅니다. 문제는 *최악값*입니다. 고속도로의 평균 통행 시간이 10분이어도 사고 한 번이면 한 시간이 걸리는 것과 같습니다. 산업 제어는 평균이 아니라 그 한 번을 기준으로 설계합니다.

꼬리가 실제로 어떻게 생기는지 작은 실험으로 보겠습니다. Apple Silicon Mac 위 QEMU/HVF로 띄운 Debian 12 VM(kernel 6.1.0-56-arm64, vCPU 4)에서 QEMU user-net 게이트웨이(10.0.2.2)로 2 ms 간격 ping 5000회를 두 번 보냈습니다. 두 번째는 `stress-ng --cpu 4 --hdd 2`로 CPU와 디스크 부하를 건 상태입니다.

```text
# 부하 없음
5000 packets transmitted, 5000 received, 0% packet loss, time 9997ms
rtt min/avg/max/mdev = 0.026/0.056/0.169/0.019 ms
# stress-ng --cpu 4 --hdd 2 동시 실행
5000 packets transmitted, 5000 received, 0% packet loss, time 15684ms
rtt min/avg/max/mdev = 0.012/0.041/2.736/0.083 ms
```

부하를 걸어도 평균은 41 μs로 오히려 낮지만 최대는 2.736 ms로 평균의 약 67배입니다. 2 ms 간격으로 보내라고 했는데 5000회에 15.7초가 걸려 송신 시각 자체도 밀렸습니다. 이 숫자는 VM과 userspace 네트워크 에뮬레이터의 값이라 산업 장비의 지연과 비교할 수 없습니다. 보여 주려는 것은 크기가 아니라 모양입니다. 평균은 그대로인데 꼬리만 수십 배 길어집니다. 산업용 이더넷이 풀어야 할 문제가 바로 이 꼬리입니다.

## 결정성 — 세 가지 시간 등급

"실시간"은 단일 개념이 아닙니다. 시스템이 deadline을 놓쳤을 때의 *결과*에 따라 세 등급으로 나눕니다.

| 등급 | deadline을 놓치면 | 예 |
|------|------|-----|
| **Soft real-time** | 품질이 떨어짐 | 비디오 스트리밍, HMI 화면 갱신 |
| **Firm real-time** | 그 결과가 쓸모없어짐 | 데이터 수집, SCADA 샘플 |
| **Hard real-time** | 시스템이 실패함 | motion, 안전 제어 |

택배에 비유하면 soft는 하루 늦은 생일 선물, firm은 경기가 끝난 뒤 도착한 응원 도구, hard는 수술이 끝난 뒤 도착한 혈액입니다. 산업용 이더넷이 다루는 영역은 firm과 hard이고, *두 등급을 한 망에서 동시에* 실어야 해서 설계가 까다로워집니다.

다음은 **가상의 payload 부하 계산**입니다. 실제 공장 사례나 wire-rate 측정이 아닙니다.

| 트래픽 | 가정 | payload bit/s |
|---|---|---|
| Motion | 64 B × 32축 / 250 μs | 65.536 Mbps |
| PLC I/O | 256 B × 100노드 / 1 ms | 204.8 Mbps |
| 합계 | 헤더·응답·padding·IFG·재전송 제외 | 270.336 Mbps |

합계는 1 Gbps의 약 27%입니다. 대역폭만 보면 1 Gbps로 충분합니다. 그러나 hard 트래픽 프레임이 1500 B짜리 파일 전송 프레임 뒤에 줄을 서면 그 프레임이 다 나갈 때까지 기다려야 하고, 그런 대기가 hop마다 쌓입니다. 결정성을 만드는 일은 결국 *우선순위와 시간 슬롯 배분*의 문제입니다.

## 결정성을 만드는 네 가지 전략

표준 Ethernet을 결정적으로 길들이는 방법은 크게 네 가닥입니다. 각 산업 이더넷 기술은 이 중 하나 이상을 고릅니다.

### 1. Master/Slave + 순환 폴링

마스터 하나가 모든 슬레이브와의 교환을 *고정 사이클*로 주도합니다. 슬레이브는 마스터가 보낸 프레임에만 반응하므로 같은 링크에서 송신 경합이 생기지 않습니다.

대표 예가 **EtherCAT**입니다. Beckhoff의 ESC 데이터시트(Section I v2.3, 3장)는 슬레이브 컨트롤러가 프레임을 *저장하지 않고 비트가 지나가는 동안* 읽고 쓴다고 설명합니다. 마스터가 보낸 프레임 하나가 슬레이브 체인을 지나가는 동안 각 슬레이브가 자기 데이터를 읽고 씁니다. EtherCAT은 IEC 61158 Type 12로 표준화되어 있습니다.

### 2. TDMA — 시간 슬롯 분할

망의 시간을 *정해진 순서의 슬롯*으로 나누고, 노드는 자기 차례에만 송신합니다. 회의에서 발언 순서를 미리 정해 두는 것과 같습니다.

**POWERLINK**가 이 방식입니다. MN(Managing Node)이 SoC로 주기를 시작하고 각 CN에 PReq를 보내 PRes를 받은 뒤, SoA로 비동기 구간을 엽니다. 메시지 종류와 시간 예산은 [Ch 10](/blog/embedded/protocols/industrial-ethernet/chapter10-powerlink)에서 openPOWERLINK 소스로 확인합니다.

### 3. Priority Queue + 하드웨어 스위치

VLAN 우선순위 큐를 써서 hard 트래픽을 *먼저 내보냅니다*. 더 강한 보장은 스위치의 출력 시각 자체를 계획해서 얻습니다.

[PI의 PROFINET FAQ](https://www.profinet.com/community/faq)는 CC-A·CC-B를 PROFINET RT, CC-C를 PROFINET IRT로 부르고, CC-C가 "jitter of less than a microsecond"의 motion 제어를 지원한다고 설명합니다. IRT는 [PI의 IRT 설명](https://us.profinet.com/?p=19941)대로 예약된 대역과 "각 프레임을 언제 보낼지 정한 시간표"를 씁니다. TSN에서는 IEEE 802.1Qbv(Enhancements for Scheduled Traffic)가 같은 역할을 맡습니다. IRT의 예약 구간과 Qbv는 다른 메커니즘이며 [Ch 6](/blog/embedded/protocols/industrial-ethernet/chapter06-profinet)과 [Ch 9](/blog/embedded/protocols/industrial-ethernet/chapter09-tsn-scheduling)에서 따로 다룹니다.

### 4. 정밀 동기 + 동시 동작

모든 노드가 같은 시계를 공유하면 *같은 절대 시각*에 출력을 갱신할 수 있습니다. 프레임이 노드마다 다른 시각에 도착해도 "10시 정각에 일제히"라는 약속은 지킬 수 있습니다.

이 계열에는 서로 다른 프로토콜이 셋 있습니다. IEEE 1588 PTP, TSN의 IEEE 802.1AS(gPTP), EtherCAT의 Distributed Clocks(DC)입니다. ESC 데이터시트 9.1절은 DC의 reference clock이 보통 마스터 다음의 첫 DC 지원 ESC이고, system time은 2000-01-01 0시부터 센 64 bit ns 값이라고 정의합니다. 세 메커니즘의 차이는 [Ch 2](/blog/embedded/protocols/industrial-ethernet/chapter02-realtime-requirements)에서 다룹니다.

대부분의 기술은 두세 전략을 *조합*합니다. EtherCAT은 1번과 4번, PROFINET IRT는 예약 대역·시간표(2번)와 clock 동기(4번)를 함께 씁니다.

## 다섯 기술 — 한눈 비교

| 기술 | 관리 단체 | 이 시리즈에서 볼 메커니즘 |
|---|---|---|
| EtherCAT | EtherCAT Technology Group (ETG) | on-the-fly 처리·FMMU·DC (Ch 3~5) |
| PROFINET | PROFIBUS & PROFINET International (PI) | RT·IRT·IO 모델 (Ch 6~7) |
| EtherNet/IP | ODVA | CIP over TCP/UDP (Ch 12) |
| POWERLINK | EPSG | MN/CN polling (Ch 10) |
| Sercos | Sercos International e.V. | on-the-fly 실시간 채널 (Ch 12) |

[ODVA](https://www.odva.org/technology-standards/key-technologies/ethernet-ip/)는 EtherNet/IP가 상위 계층에 CIP를 쓰고 실시간 주기 데이터에 UDP를 쓴다고 설명합니다. [Sercos International](https://www.sercos.org/technology/)은 Sercos의 통신 주기를 31.25 μs~65 ms로 설정할 수 있다고 밝힙니다. 이런 단체 자료의 숫자는 규격이 허용하는 범위이고, 특정 제품 조합이 그 값을 낸다는 뜻은 아닙니다. 이 시리즈에서 EtherCAT 주기 통신의 실제 코드는 [SOEM v1.4.0](https://github.com/OpenEtherCATsociety/SOEM/blob/v1.4.0/soem/ethercatmain.c)을 기준으로 읽습니다.

이들 아래에는 **TSN**이 *공통 인프라*로 깔립니다. [IEEE TSN Task Group](https://1.ieee802.org/tsn/)은 TSN을 "a set of standards specified by IEEE 802"라고 정의하고, 이전 AVB Task Group에서 이어졌다고 밝힙니다. 산업 자동화용 공통 프로파일인 [IEC/IEEE 60802](https://1.ieee802.org/tsn/iec-ieee-60802/)는 2026-06-29에 발행되었습니다. PI FAQ는 PROFINET이 V2.4부터 IEEE 802.1/802.3 기본 메커니즘 위에서 쓰이도록 규정되었고, 그 구성을 CC-D로 정의했다고 설명합니다.

## 시리즈 로드맵

이 시리즈는 EtherCAT을 깊게 다루고, 나머지를 비교하는 구조입니다.

| 장 | 주제 |
|----|------|
| Ch 1 (이 글) | 개요·다섯 기술 |
| Ch 2 | 실시간 요구사항·jitter·PTP |
| Ch 3 | EtherCAT 아키텍처·on-the-fly·DC |
| Ch 4 | EtherCAT 프레임·datagram·WKC |
| Ch 5 | EtherCAT master/slave 구현 |
| Ch 6 | PROFINET RT·IRT |
| Ch 7 | PROFINET I/O·GSDML |
| Ch 8 | TSN 표준과 기능 |
| Ch 9 | TSN 스케줄링 |
| Ch 10 | POWERLINK |
| Ch 11 | Linux 실시간 구현 |
| Ch 12 | 조건별 비교와 선택 |

EtherCAT을 먼저 깊이 보는 이유는 두 가지입니다. 첫째, *오픈소스 master(SOEM, IgH)*가 있어 직접 빌드하고 실행해 볼 수 있습니다. Ch 4와 Ch 5에서는 Debian VM에서 SOEM을 빌드해 veth로 보낸 실제 프레임을 tshark로 풉니다. 둘째, ESC 데이터시트가 공개되어 있어 프레임 형식부터 레지스터까지 1차 자료로 확인할 수 있습니다. EtherCAT을 기준으로 잡아 두면 다른 기술이 어떤 *타협*을 골랐는지 보입니다.

## 자주 하는 오해

### "기가비트 Ethernet이면 산업용으로 충분하다"

대역폭의 문제가 아닙니다. 위 VM 실험에서 평균 RTT는 부하와 상관없이 수십 μs였지만 최대는 2.7 ms까지 늘었습니다. 1 Gbps 링크라도 queue 대기·host scheduling·재전송은 그대로 남습니다. 산업용 기술이 풀어야 할 것은 throughput이 아니라 *worst-case latency의 상한*입니다.

### "PREEMPT_RT만 켜면 hard real-time이다"

Linux PREEMPT_RT는 *호스트 OS의 scheduling 지연*을 줄입니다. switch 큐 지연과 다른 노드의 트래픽 간섭은 그대로입니다. 호스트 RT는 *필요조건*이지 충분조건이 아닙니다. 호스트의 preemption 개념은 [RTOS preemption 글](/blog/embedded/rtos/practical-internals/part1-04-preemption), Linux의 실제 구성과 VM cyclictest 결과는 [이 시리즈 Ch 11](/blog/embedded/protocols/industrial-ethernet/chapter11-linux-realtime)에서 이어집니다.

### "TSN이 나오면 EtherCAT은 사라진다"

TSN은 IEEE 802의 표준 묶음이고, 장치의 데이터 모델·상태 머신·진단 같은 응용 계층을 정의하지 않습니다. 그래서 응용 프로토콜이 TSN *위에* 매핑됩니다. PROFINET CC-D가 그 예입니다. TSN은 응용 프로토콜을 대체하는 경쟁자라기보다 응용 프로토콜이 올라타는 바닥입니다. [Ch 12](/blog/embedded/protocols/industrial-ethernet/chapter12-comparison)의 층위 그림이 이 관계를 보여 줍니다.

### "EtherCAT 장치를 사무실 망에 꽂아도 그냥 무시된다"

반대입니다. ESC 데이터시트 Section I 3장은 ET1100·ET1200·IP Core·ESC20이 MAC·IP 주소를 갖지 않고 어떤 주소의 프레임이든 처리하며, 사무실 망에 직접 연결하면 broadcast를 포함한 모든 프레임을 되돌려 보내 broadcast storm을 일으킨다고 경고합니다. 같은 절은 ESC 사이나 마스터와 첫 슬레이브 사이에 unmanaged switch를 둘 수 없다고도 적습니다. EtherCAT 세그먼트는 IT 망과 물리적으로 분리하는 것이 기본입니다.

## 정리

- 표준 Ethernet의 본질적 한계는 *대역폭이 아니라 worst-case latency*입니다. Linux TCP의 RTO 하한 기본값만 해도 200 ms입니다.
- 산업 자동화는 Soft/Firm/Hard 세 시간 등급을 *한 망에서 동시에* 다룹니다.
- 결정성은 *master polling, TDMA, priority queue·예약 구간, 시계 동기* 네 전략의 조합으로 만듭니다.
- EtherCAT·PROFINET·EtherNet/IP·POWERLINK·Sercos가 각자의 조합을 고릅니다.
- TSN은 IEEE 802 표준 묶음이고, 산업용 공통 프로파일 IEC/IEEE 60802가 2026년에 발행되었습니다.
- PREEMPT_RT는 *호스트 RT*에 필요하지만 망의 결정성을 보장하지는 않습니다.

다음 편은 **Ch 2: 실시간 요구사항 — Determinism·Cycle Time**입니다. cycle time과 jitter를 정의하고, IEEE 1588 PTP의 네 timestamp 계산과 EtherCAT DC가 그와 어떻게 다른지 봅니다.

## 관련 항목

- [Ch 2: 실시간 요구사항 — Determinism·Cycle Time](/blog/embedded/protocols/industrial-ethernet/chapter02-realtime-requirements)
- [Ch 3: EtherCAT 아키텍처 — Processing on the Fly](/blog/embedded/protocols/industrial-ethernet/chapter03-ethercat-architecture)
- [Practical RTOS Internals Part 1.4: Preemption](/blog/embedded/rtos/practical-internals/part1-04-preemption) — 호스트 측 RT의 전제 조건
- [Modern Embedded Recipes: IRQ affinity](/blog/embedded/modern-recipes/part7-13-irq-affinity) — NIC 인터럽트를 RT core에 고정하기
- [Beckhoff EtherCAT Slave Controller Section I — Technology v2.3](https://download.beckhoff.com/download/document/io/ethercat-development-products/ethercat_esc_datasheet_sec1_technology_2i3.pdf)
- [원문 — EtherCAT Technology Group](https://www.ethercat.org/)
- [원문 — PROFINET International](https://www.profibus.com/)
