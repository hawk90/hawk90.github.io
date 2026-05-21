---
title: "Ch 9: TSN 스케줄링 — Qbv·Qbu·동기화"
date: 2026-05-16T09:00:00
description: "Gate Control List 설계부터 ILP 기반 스케줄 합성·실제 도구·CNC YANG까지."
series: "Industrial Ethernet 심화"
seriesOrder: 9
tags: [tsn, qbv, qbu, ptp, scheduling, gcl, ilp, cnc]
draft: false
---

## 한 줄 요약

> **"TSN 스케줄링은 *공장 전체의 시계 위에 그린 시간표*입니다."** — 모든 스위치 포트에서 *언제 무엇이 송신되는지*를 1µs 단위로 미리 정하고, gPTP가 그 시계를 맞춰 줍니다. 손으로 짤 만한 규모를 넘어가면 ILP나 휴리스틱이 필요합니다.

이전 장에서 TSN의 *표준 toolkit*을 훑었다면, 이 장은 *실제로 스케줄을 짜는* 작업입니다. *GCL을 어떻게 채울 것인가*, *gPTP는 어떻게 동기화 정확도를 보장하는가*, *수십 노드 규모에서는 누가 자동으로 풀어 주는가*가 핵심 질문입니다.

GCL을 손으로 짤 수 있는 규모는 대략 *4~8 노드*까지입니다. 그 이상이면 *CNC + 합성 도구*에 맡깁니다. 이 장은 양쪽을 모두 다룹니다.

## Traffic class — 무엇을 결정적으로 다룰까

TSN을 도입하면 가장 먼저 *트래픽 분류*를 고민합니다. 802.1Q는 *8개의 priority(PCP 0~7)*를 제공합니다. 산업 환경의 표준 분류는 다음과 같습니다.

| PCP | Traffic class | 대역폭 | 사이클 | 예시 |
|-----|--------------|-------|--------|------|
| 7 | **CDT** (Critical Data Transfer) | 작음 | ≤ 1ms | 모션 제어, safety |
| 6 | **Class A** (AVB-strict) | 75% | ≤ 2ms | high-priority I/O |
| 5 | **Class B** (AVB-strict) | 25% | ≤ 50ms | medium I/O |
| 4 | **Network control** | 작음 | aperiodic | gPTP, MRP, LLDP |
| 3 | **Video/audio** | 변동 | streaming | 카메라 |
| 0~2 | **Best effort** | 잔여 | aperiodic | OPC UA non-RT, SSH, HTTPS |

이 표가 *스케줄 설계의 출발점*입니다. CDT는 *반드시 Qbv 슬롯*을 받고, Class A·B는 *credit-based shaper(CBS)*로, BE는 *strict priority + Qbu*로 처리합니다.

## GCL 설계 — 4 클래스 예제

5포트 스위치의 한 출력 포트를 가정합니다. 목표는 다음 트래픽을 1ms 사이클에 욱여넣는 것입니다.

- 4개의 CDT stream — 각 256B, 100µs 주기 안에 모두 송신
- AVB Class A — 평균 75Mbps
- AVB Class B — 평균 25Mbps
- BE — 잔여 시간

링크는 1Gbps입니다. 256B 프레임 송신 시간은 약 2µs입니다(256 × 8 / 1Gbps + IPG).

```text
cycle_time = 1 ms (1,000,000 ns)
hyperperiod = 1 ms

GCL:
| offset(ns) | duration(ns) | gates(Q7..Q0)         | meaning           |
|------------|--------------|------------------------|-------------------|
| 0          | 2,200        | 10000000               | CDT stream 1      |
| 2,200      | 2,200        | 10000000               | CDT stream 2      |
| 4,400      | 2,200        | 10000000               | CDT stream 3      |
| 6,600      | 2,200        | 10000000               | CDT stream 4      |
| 8,800      | 1,200        | 00000000               | guard band        |
| 10,000     | 740,000      | 01100000               | AVB Class A + B   |
| 750,000    | 250,000      | 00001111               | Best effort       |
```

가장 앞 8.8µs를 CDT 4개에 *경합 없이* 할당합니다. 그 뒤 1.2µs *guard band*는 *큰 BE 프레임이 다음 사이클의 CDT 슬롯을 침범*하지 못하도록 비워 둡니다. 1Gbps에서 1538B는 약 12.3µs이므로 guard band는 *그 시간보다 작게는 둘 수 없습니다*. Qbu(preemption)가 켜져 있으면 64B(약 0.5µs)면 충분합니다.

GCL은 *모든 스위치 출력 포트마다 따로* 가지고 있습니다. 같은 stream이 여러 hop을 지나면 *각 hop의 GCL이 일관*돼야 합니다. 이게 손으로 짜기 어려워지는 이유입니다.

## Linux tc-taprio — Qbv를 실제로 설정하기

Intel I225 NIC + Linux 6+ 조합이 가장 흔한 실험 환경입니다. `tc`의 `taprio` qdisc가 *802.1Qbv를 그대로* 노출합니다.

```bash
# Enable taprio on eth0 with 1ms cycle, base time aligned to next second
NOW=$(date +%s)
BASE=$(( (NOW + 5) * 1000000000 ))

tc qdisc replace dev eth0 parent root handle 100 taprio \
    num_tc 4 \
    map 0 0 0 0 1 1 2 3 \
    queues 1@0 1@1 1@2 1@3 \
    base-time $BASE \
    sched-entry S 01 200000 \
    sched-entry S 02 200000 \
    sched-entry S 04 200000 \
    sched-entry S 08 400000 \
    flags 0x2 \
    txtime-delay 200000 \
    clockid CLOCK_TAI
```

읽는 법입니다.

- `num_tc 4` — 4개의 traffic class.
- `map 0 0 0 0 1 1 2 3` — skb priority 0~7을 tc 0~3에 매핑.
- `queues 1@0 ...` — 각 tc가 hw queue 0~3을 한 개씩 사용.
- `sched-entry S 01 200000` — 200µs 동안 *bit0 = tc0*만 게이트 open.
- `flags 0x2` — *hardware offload*. NIC가 직접 처리.
- `clockid CLOCK_TAI` — PTP가 동기화하는 *TAI* 시계 기준.

`base-time`을 *미래의 정확한 1초 경계*로 잡는 게 중요합니다. 두 노드가 base-time이 *같지 않으면* 같은 슬롯에 송신하지 못합니다. PTP로 시계만 맞춘다고 끝이 아니라, *base-time 자체*가 같은 wall-clock이어야 합니다.

## gPTP — sub-µs 동기의 비밀

GCL이 1µs 정확도로 동작하려면 *시계 자체*가 1µs 안에 맞아 있어야 합니다. gPTP가 그걸 보장합니다.

3단계 메커니즘입니다.

1. **Sync interval** — grandmaster가 매 125ms마다 `Sync`+`Follow_Up` 송신.
2. **Pdelay measurement** — 직접 연결된 두 노드가 매 1초마다 *link delay*를 측정.
3. **Offset correction** — slave가 *수신 timestamp - master timestamp - link delay*로 offset 계산, slow drift는 PI 제어로 추정.

```python
# Pseudo-code of slave time correction
def on_sync_followup(master_time_T1, link_delay_d):
    local_time_T2 = phy_rx_timestamp()
    offset = local_time_T2 - master_time_T1 - link_delay_d

    # PI filter: smooth out jitter, track drift
    integ += offset * ki
    correction = offset * kp + integ
    adjust_local_clock(correction)
```

핵심은 *PHY-level timestamping*입니다. Sync 프레임이 *PHY에서 송수신되는 순간*에 timestamp를 찍어야 합니다. 소프트웨어 stack 안에서 찍으면 *수십 µs 변동*이 그대로 noise로 들어옵니다.

Intel I225, NXP LS1028A 같은 TSN NIC은 *PHY timestamp*를 hardware로 제공합니다. PTP daemon(`ptp4l`)이 그 hw 값을 읽어 보정합니다.

```bash
# Linux: ptp4l with gPTP profile
sudo ptp4l -i eth0 -f /etc/ptp4l-gptp.conf -m
```

`ptp4l-gptp.conf`:

```ini
[global]
gPTP                    1
twoStepFlag             1
delay_mechanism         P2P
network_transport       L2
priority1               128
priority2               128
clockClass              248
[eth0]
logSyncInterval         -3   ; = 125 ms
logMinPdelayReqInterval 0    ; = 1 s
```

`ptp4l`이 PHY 시계를 *grandmaster에 맞춥니다*. 그러나 *시스템 시계*는 아직 PHY와 별개입니다. `phc2sys`로 *PHY → system clock*을 한 번 더 옮깁니다.

```bash
sudo phc2sys -s eth0 -O 0 -m
```

`ptp4l`이 PHY 시계, `phc2sys`가 system 시계, `tc taprio`가 그 system 시계 기반 base-time. *세 단계가 모두* 맞아야 GCL이 의도대로 동작합니다.

동기화 정확도는 일반적으로 다음 수준입니다.

| 측정 | 정확도 |
|------|-------|
| PHY ↔ PHY (gPTP, 1 hop) | ±100ns |
| PHY ↔ PHY (gPTP, 5 hop) | ±500ns |
| PHY → system clock | ±1µs |
| system → GCL trigger | ±1µs (소프트웨어), ±10ns (hw offload) |

hardware offload (`flags 0x2`)가 *결정적*인 이유입니다.

## CNC YANG — fleet 단위 설정

10대 미만이면 수동 설정도 가능합니다. 그 이상이면 *CNC*에 맡깁니다.

CNC는 *NETCONF 서버*로 동작하는 중앙 컨트롤러입니다. *Talker*와 *Listener*가 자기 요구사항을 YANG model로 등록하면, CNC가 *위상 + 트래픽*을 보고 *모든 스위치의 GCL을 합성*해서 push합니다.

Talker가 등록하는 stream 요구사항입니다.

```yaml
ieee802-dot1q-tsn-config-uni:
  talkers:
    - stream-id: "00:1b:1b:11:22:33:5"
      stream-rank:
        rank: 0     # 0 = highest
      end-station-interfaces:
        - interface-name: "eth0"
      data-frame-specification:
        - ieee802-mac-addresses:
            destination-mac-address: "01:80:c2:00:00:0e"
        - ieee802-vlan-tag:
            priority-code-point: 7
            vlan-id: 100
      traffic-specification:
        interval:
          numerator: 1
          denominator: 1000     # 1 ms
        max-frames-per-interval: 1
        max-frame-size: 256
        transmission-selection: 0
      user-to-network-requirements:
        num-seamless-trees: 2   # FRER
        max-latency: 500000     # ns
```

Listener는 더 간단합니다.

```yaml
listeners:
  - end-station-interfaces:
      - interface-name: "eth3"
    user-to-network-requirements:
      max-latency: 500000
```

CNC가 *모든 talker + listener + 네트워크 위상*을 받아서 *스케줄을 합성*합니다. 결과가 *configured-by-cnc* 항목에 채워져 talker/listener에 통보됩니다.

```yaml
status-talker-listener:
  status-info:
    talker-status: ready
    listener-status: ready
    failure-code: 0
  accumulated-latency: 350000
  configured-by-cnc:
    schedule:
      gate-control-list: [...]
      base-time: 1700000000000000000
      cycle-time: 1ms
```

## 스케줄 합성 — ILP

CNC 내부에서 어떻게 스케줄을 *계산하는가*가 다음 질문입니다. 학계의 주된 정식화는 *MILP(Mixed Integer Linear Programming)*입니다.

변수와 제약을 간단히 풀면 다음과 같습니다.

**Variables:**

- t_{s,h}  ∈ ℝ⁺   : stream s가 hop h를 떠나는 시각 (in cycle)
- q_{s,h}  ∈ {0..7} : 그 hop의 queue 배정

**Constraints:**

- (1) Topology: t_{s, h+1} ≥ t_{s, h} + tx_time + prop_delay
- (2) Deadline: t_{s, last} + tx_time ≤ deadline_s

**(3) Non-overlap (same port, same queue):**


**∀ s1, s2 sharing port p, queue q:**

- t_{s1,p} + tx_time + IPG ≤ t_{s2,p}    OR
- t_{s2,p} + tx_time + IPG ≤ t_{s1,p}
- (4) Frame ordering: FIFO within queue
- (5) Cyclic wrap: t_{s,h} mod hyperperiod

**Objective:**

- minimize  Σ end-to-end latency
- OR
- minimize  GCL entries (스위치 hw 제약)

(3)이 *비선형*(OR)이라 *integer variable*로 분리합니다. 수십 stream + 수 hop이면 CPLEX·Gurobi가 *수십 초*에 푸는 규모이고, 수백 stream이면 *수 시간*입니다. 실시간 재계산은 어렵습니다.

산업 환경의 정적 스케줄은 *오프라인*에 한 번 풀어 둡니다. 토폴로지가 바뀌거나 새 stream이 추가되면 다시 풉니다.

## 휴리스틱 — list scheduling

ILP가 너무 비싼 규모에서는 *list scheduling*이 보통 정답입니다.

```python
def list_schedule(streams, topology):
    # 1. Sort streams by priority (deadline, criticality)
    streams.sort(key=lambda s: (-s.priority, s.deadline))

    # 2. For each stream, route greedy & assign earliest slot
    schedule = {}
    for s in streams:
        path = shortest_path(topology, s.src, s.dst)
        t = 0
        for hop in path:
            port = hop.out_port
            slot = find_earliest_free_slot(
                port,
                start=t,
                length=s.tx_time + GUARD_BAND,
                cycle=s.cycle_time,
            )
            if slot is None:
                raise InfeasibleException(s)
            schedule[s, hop] = slot
            t = slot + s.tx_time + hop.prop_delay
        if t > s.deadline:
            raise InfeasibleException(s)
    return schedule
```

핵심은 *find_earliest_free_slot*입니다. 한 포트의 *cycle 내 사용 중인 시간 구간*을 정렬해 두고, *충분히 긴 빈 구간*을 찾습니다. O(streams × hops × log slots)에 풀립니다.

list scheduling은 *optimal*이 아니지만, 보통 *수 초 안에* feasible solution을 줍니다. 안 풀리면 ILP로 보내는 *2-tier* 구성을 자주 씁니다.

## 실제 도구

| 도구 | 종류 | 비고 |
|------|------|------|
| **Cisco Catalyst Center / CCC** | 상용 CNC | IE 스위치 fleet, NETCONF |
| **Marvell TSN switch CLI** | 벤더 CLI | Prestera ASIC, YAML 설정 |
| **TTTech Insight / Slate** | 합성·시뮬레이션 | 자동차·산업 |
| **Hirschmann HiVision** | NMS | BOBCAT/Greyhound 관리 |
| **NXP TSN-Configurator** | 오픈소스 GUI | LS1028A 평가보드용 |
| **iCNet** | Python lib | 학술용 ILP/heuristic 프로토타이핑 |

Marvell Prestera 스위치 CLI 예입니다.

```text
switch> configure terminal
switch(config)> interface gigabit 0/1
switch(config-if)> tsn taprio
switch(config-taprio)> base-time 1700000000000000000
switch(config-taprio)> cycle-time 1000000
switch(config-taprio)> entry add 1 gate 0x80 duration 200000
switch(config-taprio)> entry add 2 gate 0x40 duration 200000
switch(config-taprio)> entry add 3 gate 0x0F duration 600000
switch(config-taprio)> commit
```

요점은 모든 벤더가 *결국 GCL을 어떻게 표현하느냐* 차이만 있을 뿐, *모델은 같다*는 것입니다. YANG model이 그 모델의 *표준화된 표현*입니다.

## 자주 하는 실수

### "GCL을 짰는데 jitter가 50µs"

guard band를 *생략*했거나 Qbu를 안 켠 경우입니다. BE 프레임이 슬롯 경계를 침범합니다. 1Gbps에서 *guard band ≥ 12.3µs*(Qbu 없을 때) 또는 *guard band ≥ 0.5µs + Qbu 활성*로 잡습니다.

### "한 hop에서는 잘 되는데 3 hop에서 deadline miss"

각 hop의 *propagation delay*와 *bridge processing delay*를 누적하지 않은 경우입니다. cut-through 스위치는 hop당 약 1µs, store-and-forward는 *프레임 시간 + 1µs*입니다. 3 hop이면 *3 × 1µs + 3 × frame_time*을 deadline에서 빼고 합성합니다.

### "ptp4l offset이 ±10µs를 진동한다"

PHY timestamp가 안 켜져 있거나 *sw timestamp* fallback인 경우입니다. `ethtool -T eth0`로 확인합니다.

```text
$ ethtool -T eth0
Time stamping parameters for eth0:
Capabilities:
        hardware-transmit
        hardware-receive
        hardware-raw-clock
PTP Hardware Clock: 0
Hardware Transmit Timestamp Modes: off, on
Hardware Receive Filter Modes: none, all
```

`hardware-*`가 모두 보이면 OK. 안 보이면 *NIC 또는 드라이버*가 PHY ts를 지원하지 않습니다. I210은 부분 지원, I225부터 full.

### "base-time이 과거인데 taprio가 동작 안 함"

`taprio`는 *base-time이 미래*여야 시작합니다. 과거면 *cycle 만큼 뒤로 미뤄* 시작하지만, 차이가 크면 *immediate error*입니다. `base-time`을 *항상 현재 + 1초* 이상으로 잡습니다.

### "CNC 합성이 infeasible로 나온다"

bandwidth 합이 100%를 넘었거나, *deadline이 hop chain의 minimum latency*보다 짧은 경우입니다. CNC가 보통 *어떤 stream이 문제인지*를 `failure-code`로 알려 줍니다. 그 stream의 deadline을 늘리거나, *경로를 짧게* 재설계합니다.

## 정리

- TSN traffic class는 *CDT·AVB-A·AVB-B·NC·video·BE*로 나뉘고, CDT가 *Qbv 슬롯*을 받습니다.
- *GCL*은 cycle 내 *언제 어느 큐가 송신하는지*를 정의합니다. guard band가 슬롯 침범을 막습니다.
- Linux는 `tc taprio`로 Qbv를 노출합니다. hw offload(`flags 0x2`)가 결정성의 핵심입니다.
- *gPTP*는 PHY-level timestamping + PI 제어로 1µs 이내 동기를 만듭니다. `ptp4l` + `phc2sys`가 표준 조합입니다.
- *CNC*가 talker·listener의 YANG 요구사항을 받아 *전체 fleet의 GCL을 합성*합니다.
- 합성은 *MILP*가 정확하지만 비쌉니다. *list scheduling 휴리스틱*이 실무 표준입니다.
- 도구: Cisco CCC, Marvell CLI, TTTech, NXP TSN-Configurator, 학술용 iCNet.
- 디버깅의 80%는 *guard band·base-time·PHY timestamp 셋 중 하나*입니다.

다음 편은 **Ch 10: POWERLINK + OpenSAFETY — 오픈소스 산업 이더넷의 정수**입니다.

## 관련 항목

- [Ch 8: TSN — Time-Sensitive Networking](/blog/embedded/protocols/industrial-ethernet/chapter08-tsn)
- [Ch 10: POWERLINK·OpenSAFETY](/blog/embedded/protocols/industrial-ethernet/chapter10-powerlink)
- [Ch 11: 리눅스 실시간 — PREEMPT_RT·EtherCAT](/blog/embedded/protocols/industrial-ethernet/chapter11-linux-realtime)
- [원문 — IEEE 802.1Qbv-2015 Time-Aware Shaper](https://standards.ieee.org/ieee/802.1Qbv/6068/)
- [원문 — IEEE 802.1AS-2020 Timing and Synchronization](https://standards.ieee.org/ieee/802.1AS/7121/)
