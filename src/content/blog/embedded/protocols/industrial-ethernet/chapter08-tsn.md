---
title: "Ch 8: TSN — Time-Sensitive Networking"
date: 2026-05-16T08:00:00
description: "IEEE 802.1 toolkit — 표준 Ethernet에 결정성을 더하는 9개 표준을 한 자리에."
series: "Industrial Ethernet 심화"
seriesOrder: 8
tags: [tsn, ieee-802-1, deterministic-ethernet, gptp, qbv, qbu, qci, cb, frer, qcc]
draft: false
---

## 한 줄 요약

> **"TSN은 *하나의 프로토콜*이 아니라 *IEEE 802.1이 모은 toolkit*입니다."** — 시간 동기는 802.1AS, 게이트는 Qbv, 선점은 Qbu, 필터링은 Qci, redundancy는 CB, 설정은 Qcc가 맡습니다. 이 6개를 알면 TSN 시스템이 *보입니다*.

EtherCAT·PROFINET·POWERLINK는 모두 *각자의 방식*으로 표준 Ethernet에 결정성을 만들었습니다. TSN의 출발은 "이걸 *벤더 중립으로* 표준화하자"입니다. IEEE 802.1 working group이 2016년부터 약 9개의 부속 표준으로 쪼개서 발표해 왔습니다.

이 장은 그 표준들을 *기능 단위*로 묶어 한 번에 정리합니다. 다음 장(Ch 9)이 *어떻게 스케줄을 짜는지*의 깊이 있는 이야기로 들어가므로, 여기서는 *각 표준이 무엇을 책임지는지*에 집중합니다.

## 왜 TSN인가 — 표준화의 가치

EtherCAT은 *daisy-chain + on-the-fly*, PROFINET IRT는 *IRT slot*, POWERLINK는 *polling*. 각 프로토콜이 *수십 µs jitter*를 만드는 방법은 다 다릅니다.

이게 *공장에서는 견딜만* 합니다. 한 라인 안에서는 한 프로토콜만 쓰니까요. 문제는 *공장과 IT*가 만날 때입니다.

- *데이터 수집* — 모든 PLC가 다른 프로토콜이라 게이트웨이가 9개 필요.
- *카메라·AI 추론* — 비결정적 트래픽과 결정적 트래픽이 같은 망에 섞이지 않음.
- *Industry 4.0*  — OPC UA Pub/Sub이 *결정적 채널*을 요구함.

TSN은 이 *분리된 두 세계*를 *같은 케이블에 결정적·비결정적이 공존*하는 한 네트워크로 묶습니다. 자동차의 AVB(Audio Video Bridging)에서 시작된 시리즈가 산업·5G fronthaul로 확장된 결과입니다.

## TSN 표준 한눈 매핑

| 표준 | 별명 | 기능 |
|------|------|------|
| **802.1AS** | gPTP | 시간 동기 (sub-µs) |
| **802.1AS-2020** | gPTP-Rev | redundant grandmaster·hot standby |
| **802.1Qbv** | TAS | Time-Aware Shaper — gate control list |
| **802.1Qbu** | Preemption | 프레임 선점 (큰 BE 프레임 중단) |
| **802.3br** | (Qbu 짝꿍) | MAC 레벨 preemption signaling |
| **802.1Qci** | PSFP | Per-Stream Filtering & Policing |
| **802.1CB** | FRER | Frame Replication and Elimination for Reliability |
| **802.1Qcc** | (관리) | Stream Reservation + YANG model |
| **802.1Qch** | CQF | Cyclic Queuing & Forwarding |
| **802.1Qbz** | (브리지 확장) | (less relevant for industrial) |

산업용 TSN에서 *반드시 보는* 다섯은 AS·Qbv·Qbu·Qci·CB입니다. Qcc는 *어떻게 설정하느냐*입니다.

## 802.1AS — 시간 동기의 토대

TSN의 모든 결정성은 *시간이 맞아 있다*는 가정 위에 섭니다. 802.1AS는 IEEE 1588 PTP의 *Ethernet-only profile*입니다. *gPTP(generalized PTP)*라고 부릅니다.

핵심 메시지 4개입니다.

```text
Grandmaster                      Slave
    |                              |
    |---  Sync (T1) -------------> |  T2에 도착
    |---  Follow_Up (T1 exact) --> |
    |                              |
    | <-- Pdelay_Req (T3) -------- |
    |---  Pdelay_Resp (T4) ------> |  T5에 도착
    |---  Pdelay_Resp_Follow_Up -->|
```

`Sync`/`Follow_Up`이 마스터 시간을 알리고, `Pdelay_*`가 *직접 연결된 두 노드 사이의 link delay*를 측정합니다. PTP의 일반 `Delay_Req` 대신 *peer-to-peer delay*를 쓰는 게 gPTP의 특징입니다. 매 hop마다 *그 link만의 delay*를 알면 *경로 전체*를 누적할 수 있습니다.

802.1AS-2020은 *복수 도메인*과 *hot-standby grandmaster*를 추가했습니다. grandmaster가 고장 나면 *backup이 즉시* 인계받습니다. 산업·자동차에 필수입니다.

```text
Domain 0: 절대 시간 (산업 PLC)
Domain 1: 미디어 시간 (차량 카메라/디스플레이)
Domain 2: 5G fronthaul
```

한 네트워크에 *복수 도메인*이 공존합니다.

## 802.1Qbv — TAS, 게이트의 시간 분할

TSN의 *간판* 표준입니다. Time-Aware Shaper(TAS)는 *큐별 게이트*를 시간에 따라 *열고 닫습니다*.

이더넷 스위치의 출력 포트에는 *8개의 priority queue*(QoS 큐)가 있습니다. Qbv는 그 8개 각각에 *게이트* G0~G7을 답니다. 게이트가 *열린 큐*만 그 시각에 송신할 수 있습니다.

```text
Time:  0µs    100µs   200µs   300µs   400µs   500µs
Q7:    [OPEN ][CLOSED][CLOSED][OPEN ][CLOSED]   ← critical (시간 슬롯)
Q6:    [CLOSED][CLOSED][OPEN ][CLOSED][CLOSED]  ← motion
Q0~5:  [CLOSED][OPEN ][CLOSED][CLOSED][OPEN ]   ← best-effort
```

*Gate Control List(GCL)*가 이 패턴을 정의합니다. *cycle time*마다 같은 패턴이 반복됩니다.

```text
cycle_time = 500 µs
gcl = [
  { offset=0,   duration=100µs, gates=0b10000000 },  # Q7 only
  { offset=100, duration=100µs, gates=0b00111111 },  # BE
  { offset=200, duration=100µs, gates=0b01000000 },  # Q6
  { offset=300, duration=100µs, gates=0b10000000 },  # Q7 only
  { offset=400, duration=100µs, gates=0b00111111 },  # BE
]
```

100µs의 *critical 슬롯* 동안 다른 트래픽은 *기다립니다*. critical 프레임은 *정확한 시간*에 *경합 없이* 빠져나갑니다. 이게 sub-100µs jitter의 핵심입니다.

문제는 *슬롯 경계에서 송신 중인 큰 프레임*입니다. 1538바이트 프레임이 1Gbps에서 약 12µs입니다. critical 슬롯이 시작될 때 그 프레임이 *방해*합니다. 이걸 해결하는 게 다음 표준입니다.

## 802.1Qbu / 802.3br — 프레임 선점

Qbu는 *송신 중인 best-effort 프레임을 일시 중단*하고, critical 프레임을 먼저 보낸 다음 *나중에 이어 보내는* 메커니즘입니다.

MAC 계층이 *두 개*로 분리됩니다.

```text
eMAC (express MAC)     ← critical 트래픽 전용
pMAC (preemptable MAC) ← BE 트래픽, 중단 가능

PHY layer multiplexer  ← 두 MAC의 출력을 합쳐 PHY로
```

송신 중인 pMAC 프레임을 어디서 자를 수 있는지가 *fragment 단위*로 정의됩니다. 최소 64바이트(+ 4 mCRC) 단위로 자릅니다. 자른 조각에는 *mCRC*가 붙고, 마지막 조각에는 일반 CRC가 붙습니다.

```text
정상:    [pMAC frame: 1500B]
선점:    [frag1: 64B][eMAC frame: 100B][frag2: 1436B]
                            ↑
                            여기서 critical 프레임이 끼어듦
```

Qbu가 있으면 critical 프레임이 *최대 1µs 이내*(64B fragment 시간)에 송신을 시작할 수 있습니다. Qbv 단독으로는 *최악 12µs* 대기인 것을 *1µs 이하*로 줄입니다.

802.3br은 *MAC merge sublayer*를 정의합니다. PHY 위에서 두 MAC 출력을 fragment 단위로 섞는 *물리적 메커니즘*입니다. Qbu(상위 사용)와 802.3br(하위 메커니즘)이 짝을 이룹니다.

## 802.1Qci — Per-Stream 필터링·정책

Qbv가 *송신 측*의 시간을 잡는다면, Qci는 *수신 측*에서 *스트림 단위*로 *받을지 말지*를 결정합니다.

세 단계입니다.

1. **Stream Identification (802.1CB-2018)** — 들어오는 프레임을 *stream*으로 분류. MAC+VLAN, 또는 IP 5-tuple 기반.
2. **Stream Filter** — 해당 stream이 *허용된 priority*인지 검증.
3. **Stream Gate / Meter** — *해당 stream의 도착 시각이 예상 윈도우*인지, *대역폭이 예약치 이내*인지 확인.

```text
incoming frame
     |
     v
[Stream ID] --hash--> Stream_handle = 17
     |
     v
[Filter]  Stream 17 allowed at port 3? Yes.
     |
     v
[Gate]    Stream 17 expected at t = 100µs ± 5µs? Yes.
     |
     v
[Meter]   Stream 17 max rate 100Mbps? Within budget.
     |
     v
forward to output queue
```

위 단계 중 하나라도 실패하면 *프레임을 drop*하고 *카운터*를 올립니다. 공격적인 트래픽(예: 잘못 동작하는 IoT 디바이스가 critical 슬롯에 끼어들기)이 *critical 망을 오염시키는 것*을 막습니다.

Qci는 *수신 측의 면역계*입니다. 보낸 쪽이 약속을 지키지 않으면 받는 쪽이 *적극적으로* 차단합니다.

## 802.1CB — FRER, 프레임 복제

*FRER(Frame Replication and Elimination for Reliability)*은 *같은 프레임을 두 경로로 동시에* 보내서, 도착하는 쪽이 *중복을 제거*하는 redundancy 메커니즘입니다.

```text
Talker                        Listener
   |                            |
   +--- frame seq=42 (path A)---+
   +--- frame seq=42 (path B)---+
                                ↑
                                먼저 도착한 것만 받고
                                나중 것은 버림 (seq 일치)
```

핵심은 *sequence number*입니다. R-TAG(Redundancy Tag, EtherType 0xF1C1) 안에 16bit sequence가 들어갑니다. 수신 측의 *Sequence Recovery Function(SRF)*이 history window를 보고 *중복은 drop, 새 것만 통과*시킵니다.

전통적 redundancy(MRP·RSTP)는 *링이 끊긴 뒤* 복구합니다. FRER은 *끊김이 일어나기 전부터 두 경로로 동시에* 보내므로 *복구 시간이 0*입니다. 산업 안전·항공 전자에 적합합니다.

비용은 *대역폭 2배*와 *경로가 분리된 토폴로지*가 필요합니다. *링 + cross link*나 *이중 mesh*를 씁니다.

## 802.1Qcc — 설정의 표준화

Qcc는 *어떻게 위 모든 것을 설정하느냐*입니다. *CNC(Centralized Network Configuration)*라는 중앙 관리자가 *YANG model*로 모든 스위치·엔드 스테이션을 설정합니다.

```yaml
# YANG model example (simplified)
tsn-stream:
  stream-id: "00-1B-1B-AA-BB-CC:5"   # MAC + VLAN
  talker:
    end-station-interfaces: ["sw1/port1"]
    data-frame-spec:
      ieee802-mac-addresses:
        destination-mac-address: "01-80-C2-00-00-0E"
      ieee802-vlan-tag:
        priority-code-point: 7
        vlan-id: 100
    traffic-specification:
      interval: { numerator: 1, denominator: 1000 }   # 1ms
      max-frames-per-interval: 1
      max-frame-size: 256
  listeners:
    - end-station-interfaces: ["sw3/port2"]
  group-status-stream:
    status-info:
      talker-status: ready
      listener-status: ready
      failure-code: 0
```

세 가지 설정 모델이 있습니다.

| 모델 | 누가 결정 | 사용처 |
|------|----------|--------|
| **Fully distributed** | 모든 노드가 분산 협상 | (사실상 미사용) |
| **Centralized network, distributed user** | CNC가 네트워크, 엔드는 분산 | 산업용 표준 |
| **Fully centralized** | CNC + CUC(Centralized User Configuration) | 자동차·5G |

CNC는 *NETCONF·RESTCONF*로 스위치 fleet에 YANG payload를 push합니다. *벤더 중립*이 핵심입니다.

## 실제 TSN 스위치·NIC

표준이 있어도 *지원하는 하드웨어*가 없으면 의미가 없습니다. 2024~2026년 기준 주요 제품군입니다.

| 제품 | 종류 | TSN 지원 | 가격대 |
|------|------|---------|-------|
| **Intel I225/I226** | NIC | 802.1AS, Qbv, Qbu (LaunchTime) | $20 |
| **Intel I210** | NIC | 802.1AS만 | $15 |
| **NXP LS1028A** | SoC + 4-port switch | AS, Qbv, Qbu, Qci, CB | 평가보드 $300 |
| **TI AM6442** | SoC, PRU-ICSS | AS, Qbv, Qbu | 평가보드 $500 |
| **Cisco IE 4000** | 산업 스위치 | AS, Qbv, Qbu, Qci | $$$ (PLC급) |
| **Marvell Prestera** | switch ASIC | Full TSN | 산업 OEM |
| **Hirschmann BOBCAT** | 산업 스위치 | AS, Qbv | mid |

I225는 *PC에 꽂는* 가장 저렴한 TSN NIC입니다. *Linux 6+에서 tc-taprio*로 Qbv를 설정할 수 있어 실험·교육에 자주 쓰입니다.

NXP LS1028A는 *Arm Cortex-A72 + 내장 TSN 스위치*입니다. *완성된 TSN 엔드포인트*를 한 칩으로 만들 수 있어 산업 게이트웨이의 표준에 가깝습니다.

## OPC UA over TSN

산업 4.0 메시지 표준인 *OPC UA*가 *Pub/Sub over UDP over TSN*으로 진화 중입니다. *OPC UA Companion Spec for Field Level Communications(FLC)*가 이걸 정의합니다.

```text
Application: OPC UA Pub/Sub (binary encoding)
Transport:   UDP multicast
Network:     IP + VLAN priority
Link:        Ethernet + TSN (Qbv slot, AS sync)
```

motion 사이클 1ms에 OPC UA 메시지를 *결정적 슬롯*에 실어 PLC↔드라이브·PLC↔PLC를 모두 OPC UA 하나로 통일하는 그림입니다. EtherCAT·PROFINET을 *완전히 대체*하지는 않고, *공장 전체의 통합 계층*으로 자리잡고 있습니다.

## 자주 하는 실수

### "Intel I210에 Qbv를 설정하려 한다"

I210은 *802.1AS만* 지원합니다. Qbv는 I225/I226부터입니다. 사양서를 보지 않고 *TSN-capable*이라고 적힌 것만 보고 사면 실험이 멈춥니다.

### "한 도메인에 grandmaster가 두 개 보인다"

BMCA(Best Master Clock Algorithm)가 *결정 안 됨*입니다. 두 후보의 *priority1·clockClass*가 같으면 *MAC tiebreaker*로 갑니다. 의도적인 redundant 구성이 아니면 한쪽의 `priority1`을 *명시적으로 낮춰* 한 grandmaster만 유효하게 만듭니다.

### "Qbv 슬롯을 정확히 잡았는데 jitter가 나온다"

대부분 *Qbu를 안 켠* 경우입니다. BE 프레임이 슬롯 경계에서 *blocking*합니다. Qbu(802.3br MAC merge)를 양쪽 모두 활성화합니다. 또는 BE를 *Qbv guard band* 안에 가둡니다(guard band = 최대 BE 프레임 시간).

### "FRER이 켜져 있는데 한 경로가 끊어져도 listener가 잠시 못 받는다"

*history window* 설정이 너무 작거나, *sequence reset 조건*이 잘못된 경우입니다. window는 *경로 간 max delta + 여유*로 잡습니다.

## 정리

- TSN은 *하나의 프로토콜이 아니라 IEEE 802.1 toolkit*입니다.
- *802.1AS*(gPTP)가 시간 동기의 토대를 만듭니다. sub-µs 정확도가 모든 결정성의 출발입니다.
- *Qbv*(TAS)는 큐별 게이트로 *시간 슬롯*을 만들고, *Qbu*가 선점으로 *슬롯 진입 지연*을 1µs 이하로 줄입니다.
- *Qci*(PSFP)는 수신 측에서 *예상 윈도우 밖의 stream을 차단*해 결정성을 지킵니다.
- *CB*(FRER)는 *동시 이중 경로 + 중복 제거*로 *복구 시간 0*의 redundancy를 만듭니다.
- *Qcc*는 *YANG model 기반 CNC*로 fleet 설정을 표준화합니다.
- 실용 NIC: Intel I225/I226, SoC: NXP LS1028A·TI AM64x, 스위치: Cisco IE 4000·Hirschmann BOBCAT.
- *OPC UA over TSN*이 공장 통합 계층의 차세대 표준입니다.

다음 편은 **Ch 9: TSN 스케줄링 — Qbv·Qbu·gPTP 깊이 있는 설정**입니다.

## 관련 항목

- [Ch 7: PROFINET IO — Controller·Device·Supervisor](/blog/embedded/protocols/industrial-ethernet/chapter07-profinet-io)
- [Ch 9: TSN 스케줄링 — Qbv·Qbu·동기화](/blog/embedded/protocols/industrial-ethernet/chapter09-tsn-scheduling)
- [Ch 2: 실시간 요구사항 — cycle, jitter, determinism](/blog/embedded/protocols/industrial-ethernet/chapter02-realtime-requirements)
- [원문 — IEEE 802.1 TSN Task Group](https://1.ieee802.org/tsn/)
