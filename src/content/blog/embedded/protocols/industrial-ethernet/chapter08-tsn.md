---
title: "TSN 표준 분석 — IEEE 802.1 Time-Sensitive Networking 개요"
slug: "embedded/protocols/industrial-ethernet/chapter08-tsn"
date: 2026-05-13T09:08:00
description: "TSN의 시간 동기화·예약 전송·선점·스트림 감시·중복 제거·설정 기능을 IEEE 802.1 TSN Task Group 자료로 정리하고, Linux의 대응 인터페이스(taprio·ethtool MAC Merge·tc gate)를 VM에서 확인합니다."
series: "Industrial Ethernet 심화"
seriesOrder: 8
tags: [tsn, ieee-802-1, deterministic-ethernet, gptp, qbv, qbu, qci, cb, frer, qcc]
draft: false
topics: ["embedded", "embedded/protocols"]
---

## 한 줄 요약

> **TSN은 여러 이더넷 기능의 집합입니다. 필요한 기능을 골라 경로 전체에 구성해야 지연·손실 요구를 맞출 수 있습니다.**

EtherCAT·PROFINET IRT·POWERLINK는 각자의 하드웨어와 프로토콜로 결정성을 만들었습니다. TSN은 같은 일을 *표준 IEEE 802.1 브리지 기능*으로 하려는 시도입니다. 비유하자면 회사마다 따로 깔던 전용 철도 대신, 공용 고속도로에 시간대별 전용 차선·추월 금지 구간·톨게이트 검문을 표준으로 넣는 일입니다.

[IEEE 802.1 TSN Task Group](https://1.ieee802.org/tsn/)은 TSN을 "a set of standards specified by IEEE 802"로 정의합니다. 이 Task Group은 이전 AVB(Audio Video Bridging) Task Group을 이었고, TSN 표준에는 AVB 표준도 들어 있습니다. 이 장은 그 기능을 하나씩 나누고, 각 기능에 대응하는 Linux 인터페이스를 Debian 12 VM(kernel 6.1.0-56-arm64, iproute2 6.1.0)에서 확인합니다. 다음 장에서는 한 출력 포트의 스케줄을 계산합니다.

## 기능별로 구분하기

TSN Task Group 페이지의 표준 목록에서 산업용 결정성과 직접 관련된 것을 기능별로 묶으면 다음과 같습니다. 여러 amendment는 이후 802.1Q 본판에 합쳐졌습니다.

| 기능 | 표준·amendment | TSN Task Group 페이지의 상태 |
|---|---|---|
| 공통 시간 | 802.1AS | 기본 표준 IEEE Std 802.1AS-2025 |
| 예약된 출력 기회 | 802.1Qbv-2015 (Enhancements for Scheduled Traffic) | 802.1Q-2018에 통합 |
| 프레임 선점 | 802.1Qbu-2016 (Frame Preemption) + IEEE 802.3br | 802.1Q-2018에 통합 (802.1Qbu) |
| 스트림 감시 | 802.1Qci-2017 (Per-Stream Filtering and Policing) | 802.1Q-2018에 통합 |
| 주기적 큐 전달 | 802.1Qch-2017 (Cyclic Queuing and Forwarding) | 802.1Q-2018에 통합 |
| 예약·설정 | 802.1Qcc-2018 (SRP Enhancements and Performance Improvements) | 802.1Q-2018의 amendment |
| 복제와 중복 제거 | 802.1CB-2017 (Frame Replication and Elimination for Reliability) | 기본 표준 |
| 산업용 프로파일 | IEC/IEEE 60802 | 2026-06-29 발행 |

모든 TSN 구성이 위 기능을 전부 쓰지는 않습니다. 그래서 산업 자동화용으로 어떤 기능을 어떻게 조합할지 정하는 프로파일이 따로 있고, 그것이 IEC SC65C/WG18과 IEEE 802의 공동 프로젝트인 [IEC/IEEE 60802](https://1.ieee802.org/tsn/iec-ieee-60802/)입니다. "TSN 지원" 장비를 고를 때 비교해야 할 것은 이 표의 행 하나하나입니다.

## 802.1AS: 시계와 링크 지연

시간 기반 기능은 모두 공통 시계를 전제로 합니다. [Ch 2](/blog/embedded/protocols/industrial-ethernet/chapter02-realtime-requirements)의 E2E 방식이 끝점끼리 왕복 시간을 재는 것과 달리, 802.1AS(gPTP)는 인접 장치 사이의 peer delay를 잽니다. linuxptp v4.4의 gPTP 예제 설정 `configs/gPTP.cfg`에서 그 차이가 보입니다.

```ini title="linuxptp-v4.4/configs/gPTP.cfg (발췌)"
[global]
gmCapable		1
...
transportSpecific	0x1
ptp_dst_mac		01:80:C2:00:00:0E
network_transport	L2
delay_mechanism		P2P
```

`delay_mechanism P2P`는 peer delay 방식을, `network_transport L2`는 UDP 없이 Ethernet 프레임으로 직접 보내는 방식을 뜻합니다. 목적지 MAC은 `01:80:C2:00:00:0E`입니다. 링크 하나씩 지연을 재서 hop마다 더하므로, 중간 bridge가 모두 시간 인식 장치여야 합니다.

| 관찰 대상 | 의미 | 그 값만으로 증명하지 못하는 것 |
|---|---|---|
| 선택된 grandmaster와 domain | 현재 사용하는 시간 기준 | 장애 시 무중단 전환 |
| peer delay와 포트 상태 | 인접 링크의 시간 전달 조건 | 전체 애플리케이션 지연 |
| timestamp 지점과 PHC | 시각을 찍는 하드웨어 경계와 시계 | 다른 NIC의 timestamp 위치 |
| 측정 offset·최대 편차 | 해당 조건에서의 시간 차이 | 측정하지 않은 부하에서의 오차 상한 |

grandmaster가 죽었을 때 다른 시계로 넘어가는 hot standby는 기본 802.1AS의 BMCA(Best Master Clock Algorithm) 재선출과 다른 기능입니다. IEEE는 [802.1ASdm-2024](https://1.ieee802.org/tsn/802-1asdm/)(2024-10-04 발행)에서 "hot standby without use of the Best Master Clock Algorithm (BMCA)"를 별도 amendment로 다룹니다.

Ch 2의 VM 실험에서 software timestamp ptp4l은 실제 오프셋이 0인 시계에 최대 4313 ns를 보고했습니다. 같은 VM의 veth는 `ethtool -T`에서 `PTP Hardware Clock: none`이었습니다. TSN의 시간 기반 기능이 하드웨어 timestamp와 PHC를 요구하는 이유가 여기에 있습니다.

## Qbv: 시간대별 전송 기회

Qbv는 출력 포트의 traffic class마다 *게이트*를 두고, 게이트 제어 목록(GCL)에 따라 시간대별로 열고 닫습니다. 출퇴근 시간에만 열리는 버스 전용 차선과 같습니다. 열린 게이트는 송신 *자격*을 줄 뿐이라, 그 시간에 큐에 프레임이 준비되어 있어야 실제로 나갑니다.

Linux에서는 `taprio` qdisc가 이 역할을 합니다. iproute2 v6.12.0의 `tc-taprio.8`에 따르면 `flags 0x1`은 txtime-assist(ETF qdisc와 함께 송신 시각을 지정), `flags 0x2`는 full offload(GCL을 NIC가 하드웨어로 실행)이고, 둘을 함께 쓰는 0x3은 잘못된 값입니다. 플래그 없이 쓰면 커널이 소프트웨어로 게이트를 돌립니다. VM의 veth(송신 큐 4개)에 소프트웨어 모드 taprio를 걸어 본 결과입니다.

```text
# tc -s -d qdisc show dev tsn0
qdisc taprio 100: root refcnt 5 tc 2 map 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0
queues offset 0 count 1 offset 1 count 1
clockid TAI	base-time 200 cycle-time 1000000 cycle-time-extension 0
	index 0 cmd S gatemask 0x2 interval 12000
	index 1 cmd S gatemask 0x1 interval 972000
	index 2 cmd S gatemask 0 interval 16000
...
```

같은 GCL을 `clockid` 없이 `flags 0x2`로 주면 veth에는 PHC가 없어 거부됩니다. `clockid`까지 주면 그보다 먼저 "The 'clockid' cannot be specified for full offload"로 거부됩니다.

```text
Error: Device does not have a PTP clock.
```

full offload는 NIC의 PHC로 GCL을 돌리므로, PHC가 없으면 Linux v6.12 `net/sched/sch_taprio.c` 1627~1629행에서 이 메시지를 내고 거부합니다. 설정 형식과 시계 모드는 [Ch 9](/blog/embedded/protocols/industrial-ethernet/chapter09-tsn-scheduling)에서 자세히 다룹니다.

게이트가 닫히기 직전에 시작한 프레임은 끝까지 나갑니다. 그래서 예약 구간 *앞*에 아무것도 시작하지 못하게 하는 guard band를 둡니다. 예를 들어 VLAN 태그 하나를 포함해 FCS까지 1522 B인 프레임은 preamble/SFD 8 B와 IPG 12 B를 더해 1 Gbit/s에서 1542 × 8 ns = **12,336 ns**를 차지합니다. guard band는 적어도 이만큼이어야 합니다.

## Qbu와 802.3br: 프레임 선점

guard band는 큰 프레임 하나만큼의 대역을 매 주기 버립니다. 프레임 선점은 다른 해법입니다. 급한(express) 프레임이 오면 진행 중인 선점 가능(preemptible) 프레임을 조각으로 끊고 끼어든 뒤, 나머지 조각을 이어서 보냅니다. 화물열차가 지나가는 중에 구급차가 오면 열차를 잠시 끊어 세우는 셈입니다.

![express traffic class는 eMAC, preemptible traffic class는 pMAC으로 가서 MAC Merge에서 합쳐지고, 링크에서는 preemptible 프레임의 fragment 사이에 express 프레임이 끼어드는 개념 timeline](/images/blog/industrial-ethernet/diagrams/ch08-qbu-preemption.svg)

802.1Qbu는 어떤 traffic class를 선점 가능으로 둘지를, IEEE 802.3br은 그 아래의 MAC Merge 계층을 정합니다. Linux v6.12에서는 ethtool netlink의 `ETHTOOL_MSG_MM_GET`/`MM_SET`이 MAC Merge 계층을 다룹니다(`Documentation/networking/ethtool-netlink.rst`). 응답에는 다음 상태가 있습니다.

| 속성 | 의미 (문서 원문 요약) |
|---|---|
| `ETHTOOL_A_MM_PMAC_ENABLED` | preemptible·SMD-V 프레임 수신 활성 |
| `ETHTOOL_A_MM_TX_ENABLED` | preemptible 송신을 관리상 켰는지(검증 실패 시 비활성일 수 있음) |
| `ETHTOOL_A_MM_TX_ACTIVE` | preemptible 송신이 실제로 동작 중인지 |
| `ETHTOOL_A_MM_TX_MIN_FRAG_SIZE` | 송신하는 마지막이 아닌 fragment의 최소 크기(octet) |
| `ETHTOOL_A_MM_VERIFY_ENABLED`, `_STATUS` | 상대 쪽 지원을 확인하는 verify 절차 |

`TX_ENABLED`와 `TX_ACTIVE`가 따로 있다는 점이 중요합니다. verify를 켜 두면 verify 절차가 성공해야 `TX_ACTIVE`가 되고, 실패하면 관리상 켜져 있어도(`TX_ENABLED`) 실제 선점은 동작하지 않습니다. verify를 끄면 상대 확인 없이 활성화됩니다. Debian 12의 ethtool 6.1에는 이 명령(`--show-mm`)이 아직 없어 VM에서는 `ethtool: bad command line argument(s)`가 나왔습니다.

선점해도 기다림이 0이 되지는 않습니다. 마지막이 아닌 fragment에는 최소 크기(`TX_MIN_FRAG_SIZE`)가 있어 그보다 짧게 끊을 수 없기 때문입니다.

## Qci와 CB: 잘못된 송신과 경로 장애

Qbv가 출구를 관리한다면 [Qci](https://1.ieee802.org/tsn/802-1qci/)는 입구를 지킵니다. TSN Task Group 페이지는 Qci의 범위를 "procedures and managed objects for a bridge to perform frame counting, filtering, policing"으로 적습니다. 고장 난 장치가 약속보다 많은 프레임을 쏟아내도 다른 stream이 영향을 받지 않게 막는 톨게이트입니다.

![수신 프레임이 stream filter, maximum SDU size filter, stream gate, flow meter를 차례로 거쳐 출력 queue로 가고 단계마다 폐기와 계수기가 있는 PSFP 처리 순서](/images/blog/industrial-ethernet/diagrams/ch08-qci-pipeline.svg)

이 순서는 IEEE 802.1 작업 그룹의 [P802.1Qcr 8.6.5 정리 제안](https://grouper.ieee.org/groups/802/1/files/public/docs2019/cr-seaman-8-6-5-organization-0719-v02.pdf)을 따릅니다. 단계마다 계수기가 따로 있어 어느 단계에서 버려졌는지 구분할 수 있습니다.

Linux에는 이 중 stream gate에 해당하는 `act_gate`(`net/sched/act_gate.c`, `tc-gate(8)`)가 있습니다. VM에서 veth 수신 쪽에 0.5초 열림·0.5초 닫힘 게이트를 걸고, 10 ms 간격으로 프레임 400개를 보냈습니다.

```text
# tc filter add dev tsn1 ingress protocol 0x88b5 flower skip_hw \
    action gate clockid CLOCK_TAI base-time 0 \
    sched-entry open 500000000 -1 -1 sched-entry close 500000000 -1 -1
# tc -s filter show dev tsn1 ingress
...
	base-time 0ns	cycle-time 1s	cycle-time-ext 0ns
	schedule:
	 number    0	gate-state open 	interval 500ms	 ipv wildcard	 max-octets wildcard
	 number    1	gate-state close 	interval 500ms	 ipv wildcard	 max-octets wildcard
...
	pipe
...
	Action statistics:
	Sent 96800 bytes 400 pkt (dropped 170, overlimits 0 requeues 0)
```

400개 중 170개가 닫힌 구간에 도착해 버려졌습니다. 같은 명령을 다시 돌린 실행에서는 205개였습니다. 보내는 쪽이 VM의 Python이라 프레임이 열림·닫힘 구간에 걸치는 비율이 실행마다 달라집니다. 소프트웨어 게이트이고 시계도 VM의 TAI라 시간 정밀도는 장비와 비교할 수 없지만, 계수기가 "몇 개가 게이트에서 버려졌는지"를 따로 센다는 점은 같습니다. 분류 규칙을 잘못 쓰면 정상 stream도 같은 방식으로 버려지므로, drop 계수기를 stream·gate 설정과 함께 읽습니다.

[802.1CB](https://1.ieee802.org/tsn/802-1cb/)(2017-09-28 발행)는 프레임을 복제해 서로 다른 경로로 보내고, 받는 쪽에서 sequence 번호로 중복을 지웁니다. 중요한 서류를 등기와 택배로 동시에 보내고 먼저 온 것만 쓰는 방식입니다.

![두 경로로 복제된 프레임의 sequence를 사용해 중복을 제거하는 FRER 개념 예](/images/blog/industrial-ethernet/diagrams/ch08-frer-replication.svg)

미리 복제본을 보내므로 경로 재구성을 기다리지 않습니다. [Ch 7](/blog/embedded/protocols/industrial-ethernet/chapter07-profinet-io)에서 본 PROFINET MRPD가 같은 발상입니다. 반대로 두 경로가 공유하는 링크나 장치가 고장 나면 복제본도 함께 잃고, 복제한 만큼 공유 링크의 대역도 더 씁니다.

## Qcc: 요구사항과 설정 모델

stream마다 게이트 시간과 경로를 손으로 정하는 것은 노드가 늘면 감당하기 어렵습니다. [Qcc](https://1.ieee802.org/tsn/802-1qcc/)(IEEE Std 802.1Qcc-2018)는 기존 SRP(Stream Reservation Protocol)를 확장합니다. TSN Task Group 페이지가 드는 항목은 다음과 같습니다.

- 더 많은 stream 지원
- 설정 가능한 SR class와 stream
- stream 특성의 더 나은 기술
- Layer 3 streaming
- 결정적인 예약 수렴
- 경로·예약을 위한 UNI(User Network Interface)

마지막 UNI가 장치 쪽에서 보이는 부분입니다. 장치가 "이런 주기와 크기의 stream이 필요하다"고 망에 요청하는 창구를 표준으로 정했습니다.

장치 설정을 데이터 모델로 주고받을 때는 YANG을 씁니다. YANG은 데이터 모델 언어라, 실제 장치에 적용하려면 그 장치가 구현한 모듈 이름과 revision에 맞춰야 합니다. 다음 장의 JSON은 계산 예제의 입력 형식이며 CNC나 스위치의 설정 파일이 아닙니다.

## 애플리케이션과 TSN 사이

TSN은 애플리케이션 데이터 모델을 정하지 않습니다. 그래서 응용 프로토콜이 TSN 위에 매핑됩니다. PROFINET은 V2.4부터 IEEE 802.1/802.3 기본 메커니즘 위에서 쓰이도록 규정되었고 그 구성을 CC-D로 정의했습니다([PI FAQ](https://www.profinet.com/community/faq)). OPC UA PubSub도 [Part 14 §7.3](https://reference.opcfoundation.org/specs/OPC-10000-14/7.3)에서 여러 transport mapping을 다룹니다.

장치를 고를 때는 기능 이름보다 Linux 인터페이스에서 실제로 확인되는 기능을 봅니다. 이 VM에서도 기능마다 확인 방법이 달랐습니다.

| 기능 | 확인 방법 | VM(veth)의 결과 |
|---|---|---|
| hardware timestamp·PHC | `ethtool -T` | software만, PHC 없음 |
| Qbv full offload | `taprio ... flags 0x2` | "Device does not have a PTP clock" |
| Qbv 소프트웨어 | `taprio ... clockid CLOCK_TAI` | 동작 |
| launch time(ETF offload) | `etf ... offload` | "Specified device does not support ETF offload" |
| MAC Merge | `ethtool --show-mm` | Debian 12의 ethtool 6.1에 명령 없음 |
| stream gate | `tc ... action gate` | 소프트웨어로 동작 |

## 정리

- TSN은 IEEE 802가 정한 표준 묶음이고, 산업용 기능 조합은 IEC/IEEE 60802 프로파일이 정합니다.
- 시간 기반 기능은 802.1AS와 하드웨어 timestamp를 전제로 합니다. VM의 software timestamp는 μs 단위 오차를 보였습니다.
- Qbv 게이트는 송신 자격만 주고, 경계 보호에는 최대 프레임 시간(1 Gbit/s에서 1522 B 기준 12,336 ns) 이상의 guard band가 필요합니다.
- 선점은 `TX_ENABLED`(관리상)와 `TX_ACTIVE`(실제 동작)가 따로 있고, verify를 켜면 그 성공이 `TX_ACTIVE`의 조건입니다.
- Qci는 입구에서 stream별로 세고 거르고 막습니다. tc gate 실험에서 닫힌 구간에 도착한 프레임(두 실행에서 170/400, 205/400)이 계수기에 drop으로 남았습니다.
- 802.1CB는 복제로 재구성 대기를 없애지만, 공유 지점의 고장은 막지 못합니다.

다음 [Ch 9: TSN 스케줄링](/blog/embedded/protocols/industrial-ethernet/chapter09-tsn-scheduling)에서 주기 경계의 guard band와 Linux taprio의 시계 모드를 구체적으로 확인합니다.

## 관련 항목

- [Ch 7: PROFINET IO 모델](/blog/embedded/protocols/industrial-ethernet/chapter07-profinet-io)
- [Ch 2: 실시간 요구사항](/blog/embedded/protocols/industrial-ethernet/chapter02-realtime-requirements)
- [IEEE TSN Task Group: 표준·프로파일 목록](https://1.ieee802.org/tsn/)
- [Linux v6.12 ethtool netlink — MAC Merge](https://github.com/torvalds/linux/blob/v6.12/Documentation/networking/ethtool-netlink.rst)
- [iproute2 v6.12.0 `tc-gate.8`](https://git.kernel.org/pub/scm/network/iproute2/iproute2.git/tree/man/man8/tc-gate.8?h=v6.12.0)
