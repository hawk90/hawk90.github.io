---
title: "PROFINET 개요 분석 — RT·IRT 클래스와 실시간 등급"
slug: "embedded/protocols/industrial-ethernet/chapter06-profinet"
date: 2026-05-13T09:06:00
description: "PROFINET의 CC-A·B·C·D 기능 구분, RT의 VLAN 우선순위 6과 250 μs~512 ms update time, IRT의 예약 구간과 31.25 μs 주기를 PI 자료와 p-net 소스로 정리하고, GSDML의 타이밍 속성을 읽습니다."
series: "Industrial Ethernet 심화"
seriesOrder: 6
tags: [profinet, siemens, rt, irt]
draft: false
topics: ["embedded", "embedded/protocols"]
---

## 한 줄 요약

> **PROFINET의 Conformance Class는 필수 기능의 묶음입니다. RT는 VLAN 우선순위로, IRT는 시간 동기와 예약 구간으로 전송 기회를 확보합니다.**

PROFINET은 PI(PROFIBUS & PROFINET International)가 관리하는 산업용 이더넷 기술입니다. EtherCAT이 "프레임 하나가 모든 슬레이브를 훑는" 방식이라면, PROFINET은 표준 Ethernet 스위치망 위에서 장치마다 자기 프레임을 보내고, 그 프레임이 제때 도착하도록 우선순위와 시간 계획을 씁니다. 같은 도로에서 구급차에 사이렌을 달아 주는 방식(RT)과, 아예 정해진 시각에 차선 하나를 비워 두는 방식(IRT)의 차이입니다.

이 장은 PI의 [PROFINET System Description(2018 판)](https://www.profibus.de/fileadmin/media/downloadsection/technical_description_%26_books/PROFINET_System_Description_engl_2018_Update.pdf)과 [PROFINET FAQ](https://www.profinet.com/community/faq), 공개 IO-Device 스택 [p-net public/v1.0.4](https://github.com/rtlabs-com/p-net/tree/public/v1.0.4)를 기준으로 기능 클래스와 두 전송 방식을 비교합니다. 발견·연결·alarm 같은 IO 모델은 [Ch 7](/blog/embedded/protocols/industrial-ethernet/chapter07-profinet-io)에서 다룹니다.

## Conformance Class와 전송 방식

PI 자료는 기능을 Conformance Class로 묶습니다. 2018년 System Description 1.2절은 서로 위에 쌓이는 세 클래스를 정의하고, 이후 PI FAQ가 PROFINET over TSN용 CC-D를 추가로 설명합니다.

| 클래스 | PI 자료의 정의 | 전송 |
|---|---|---|
| CC-A | 실시간(RT) 통신과 비주기 서비스, 표준 TCP/IP. 무선 통신도 이 클래스에 규정 | RT |
| CC-B | CC-A에 IT 방식의 네트워크 진단과 토폴로지 정보 추가. SNMP 구현이 B·C에 필수(4.1절) | RT |
| CC-C | 하드웨어 지원 대역 예약과 동기화를 갖춘 IRT. jitter 1 μs 미만(5장) | IRT |
| CC-D | "Recently Conformance Class D (CC-D) was defined for PROFINET over TSN" (FAQ) | TSN |

FAQ는 "CC-A and CC-B are also called PROFINET RT (Real-Time), and CC-C is called PROFINET IRT"라고 정리합니다. 클래스는 아래에서 위로 쌓이므로 CC-C 장치는 CC-A·B의 기능도 갖습니다. 같은 클래스 안에서도 장치마다 지원하는 주기와 데이터 크기가 다르며, 그 값은 장치의 GSDML 파일에 적힙니다.

## RT: VLAN 우선순위로 대기를 줄이기

PROFINET의 주기 IO 데이터는 TCP/IP 없이 L2에서 EtherType `0x8892`로 보냅니다(System Description 3.1절, FAQ). p-net의 `include/pnal.h` 118행도 `PNAL_ETHTYPE_PROFINET = 0x8892U`를 정의합니다.

System Description 3.1절은 CC-A 장치를 쓰는 망의 스위치 요건으로 세 가지를 듭니다. 100 Mbit/s full duplex와 auto negotiation, IEEE 802.1Q VLAN 태그 **priority 6**에 따른 주기 데이터 우선 처리, 그리고 LLDP(IEEE 802.1AB) 지원입니다. 같은 절은 RT의 update time을 입력·출력별로 **250 μs~512 ms** 범위에서 고를 수 있다고 적습니다.

![VLAN 태그를 포함하는 PROFINET RT 프레임의 개념 배치](/images/blog/industrial-ethernet/diagrams/ch06-profinet-rt-frame.svg)

p-net의 provider 코드(`src/common/pf_ppm.c` 156~174행)가 이 태그를 직접 씁니다. TPID `0x8100`을 쓰고, 이어지는 16 bit의 하위 12 bit에 VLAN ID를, 상위 3 bit에 `iocr_user_priority`를 채운 다음 EtherType을 씁니다.

```c title="p-net public/v1.0.4 src/common/pf_ppm.c:162-164"
/* Insert VLAN ID (VID) and priority (Priority Code Point = PCP) */
u16 = p_header->vlan_id & 0x0FFF;
u16 |= (p_header->iocr_user_priority & 0x0007) << 13; /* Three leftmost bits
```

우선순위 큐는 *줄 서는 순서*를 바꿀 뿐 *이미 나가고 있는 프레임*을 멈추지는 못합니다. 100 Mbit/s에서 VLAN 태그 없는 최대 프레임 1518 byte 하나가 선로를 차지하는 시간은 preamble·IFG를 포함해 (1518 + 20) × 80 ns = 123.04 μs입니다. store-and-forward 스위치에서 RT 프레임이 그 직후에 도착하면 hop마다 그만큼 기다릴 수 있습니다. 그래서 RT의 최악 지연은 경로의 hop 수와 경쟁 트래픽의 최대 프레임 길이로 정해지며, 이 한계를 넘으려면 IRT가 필요합니다.

## IRT: 동기화된 예약 구간

System Description 5장에 따르면 CC-C의 주기 데이터는 *예약된 대역(red phase)*에서 동기화된 패킷으로 보내고, 진단·TCP/IP 같은 나머지 패킷은 남은 대역(green phase)을 나눠 씁니다. red phase에는 다른 트래픽이 끼어들지 못하고, green phase에서는 IEEE 802.1Q 우선순위대로 보냅니다. 다음 예약 구간 시작 전에 전달을 마칠 수 없는 프레임은 잠시 저장했다가 다음 green phase에 보냅니다.

![예약 구간과 개방 구간을 나눈 가상의 1 ms IRT cycle 예](/images/blog/industrial-ethernet/diagrams/ch06-profinet-cycle.svg)

그림의 200 μs 예약 구간과 800 μs 개방 구간은 **설명용 가정**입니다. System Description 5장은 "The division of the individual phases may vary"라고만 적고, 계획 절차는 회원 공개 문서인 "PROFINET IRT Engineering"으로 넘깁니다.

System Description 5장과 [PI의 IRT 설명](https://us.profinet.com/?p=19941)은 IRT 수치를 똑같이 적습니다.

| 항목 | 값 | 출처 |
|---|---|---|
| CC-C 기본 최소 update rate | 250 μs | System Description 5장, PI IRT 페이지 |
| 하드웨어에 따른 최소 | 31.25 μs | 같은 곳 |
| jitter | 1 μs 미만 | 같은 곳 |
| 장치 간 주기 편차 | 최대 1 μs | System Description 5.1절 |

동기는 clock master가 보내는 synchronization frame으로 맞춥니다(5.1절). 정확히 맞추려고 각 케이블의 지연을 정해진 Ethernet 프레임으로 측정하고, 장치·스위치의 전달 시간과 함께 계산에 넣습니다. 같은 절의 예로, clock master의 시각이 10 μs 걸려 IO device 3에 도착하면 그 장치는 받은 시각이 10 μs 오래된 값임을 알고 자기 시계를 맞춥니다. 이 동기에 쓰는 프로토콜이 PTCP입니다. Siemens PN Driver v3.3.0의 GSDML 예제에도 `SupportedSyncProtocols="PTCP"`와 `SupportedDelayMeasurements="PTCP"`가 있습니다. IRT 클럭 시스템 안의 장치는 동기화되지 않은 장치를 거치지 않고 서로 직접 연결되어야 합니다(5.1절).

250 μs보다 짧은 주기에는 두 가지 최적화를 씁니다(5.3절). Dynamic Frame Packing(DFP)은 line 구조의 여러 장치 데이터를 Ethernet 프레임 하나로 묶고, 각 노드가 자기 몫을 떼어 내면서 프레임이 짧아집니다. 31.25 μs 주기에서는 green phase도 짧아지므로, 표준 Ethernet 프레임을 작은 조각으로 나눠 보내고 다시 합치는 fragmentation을 씁니다.

System Description의 TSN 절은 TSN이 IRT와 비슷한 원리를 쓴다고 적습니다. 고정밀 시간 동기, 주기 단위 통신, 실시간 구간과 나머지 트래픽 구간의 분할, 통신 계획, 대체 경로 고려입니다. 같은 절은 산업용 TSN 프로파일을 IEC/IEEE 60802로 만든다고 소개하고, TSN 위의 PROFINET은 CC-D로 따로 정의되어 있습니다(FAQ).

## 주기 계산 — send clock factor와 reduction ratio

PROFINET의 시간 기본 단위는 31.25 μs입니다. p-net의 `pf_ppm.c` 981~986행 주석은 "The timebase is 1/32 of a millisecond (31.25 us)", "One cycle length is send_clock_factor x 31.25 us"라고 적고, `src/pf_types.h` 1484~1485행은 `send_clock_factor`의 해상도를 31.25 μs, 허용 범위를 1..128(기본 32)로, `reduction_ratio`의 허용 범위를 1..512로 둡니다.

따라서 update time은 `31.25 μs × send_clock_factor × reduction_ratio`입니다. send clock factor 32는 1 ms 주기이고, reduction ratio가 4이면 이 주기 네 번에 한 번 보내므로 4 ms입니다. 계산 예제는 Ch 7에 있습니다.

## GSDML에서 성능 조건 읽기

GSDML은 IO-Device의 식별자, 모듈·서브모듈 구성, 통신 기능을 기술하는 XML 파일입니다. System Description 2장에 따르면 PROFINET 장치 제조사는 반드시 GSD 파일을 만들어야 하고, 그 파일은 인증 시험에서 함께 검사됩니다. 엔지니어링 도구가 이 파일을 읽어 구성합니다.

[Siemens PN Driver v3.3.0의 RT class 정의 문서](https://docs.industrial-operations-x.siemens.cloud/r/en-us/v3.3.0/profinet-driver/gsdml-getting-started/definition-of-real-time-classes?contentId=VAUaCmra9CrpBiKc6HRAog)의 예제에는 다음 속성이 나옵니다.

| 위치 | 속성 예 | 읽는 법 |
|---|---|---|
| `InterfaceSubmoduleItem` | `SupportedRT_Classes="RT_CLASS_1;RT_CLASS_3"` | 인터페이스가 지원하는 RT class. GSD V2.1 이하는 단수형 `SupportedRT_Class` |
| 같은 곳 | `IsochroneModeInRT_Classes="RT_CLASS_3"` | isochronous mode를 지원하는 class |
| `TimingProperties` | `SendClock="8 16 32 64 128"` | 허용 send clock factor 목록 |
| 같은 곳 | `ReductionRatio="1 2 4 8 16 32 64 128 256 512"` | 허용 reduction ratio 목록 |
| `SynchronisationMode` | `SupportedSyncProtocols="PTCP"` | 동기 프로토콜 |
| `MediaRedundancy` 관련 | `MRPD_Supported="true"` | MRPD 지원 |

이 예제의 `SendClock="8 16 32 64 128"`은 31.25 μs 단위로 250 μs·500 μs·1 ms·2 ms·4 ms의 send clock을 뜻합니다. 장치를 고를 때 읽어야 할 것은 클래스 이름보다 이 목록입니다. 목록에 없는 조합은 그 장치에서 설정할 수 없습니다.

## 역할과 프로토콜을 구분하기

System Description 2.1절은 PROFINET이 provider/consumer 모델을 따르며 "both the IO controller and IO device spontaneously send cyclic data independently"라고 설명합니다. IO controller(보통 PLC)는 출력 데이터의 provider이자 입력 데이터의 consumer이고, IO device는 그 반대입니다. Device가 Controller의 요청을 받을 때마다 응답하는 polling 방식이 아니므로, 주기 데이터가 오는지는 그 방향의 consumer가 감시합니다. 설정한 감시 시간 안에 데이터가 오지 않으면 consumer가 애플리케이션에 오류를 알립니다(3.1절).

![IO-Controller와 IO-Device 사이의 AR 안에 출력·입력 IO data CR, record data CR, alarm CR이 있고 IO-Supervisor는 시운전·진단을 위해 연결되는 구조](/images/blog/industrial-ethernet/diagrams/ch06-profinet-hierarchy.svg)

그림처럼 IO data CR의 출력과 입력은 provider가 서로 다르며, record와 alarm은 같은 AR 안의 별도 CR로 오갑니다. IO supervisor는 시운전과 진단용 PG·PC·HMI입니다(2.1절).

| 작업 | 통신 관점 |
|---|---|
| 장치 발견과 이름·IP 설정 | DCP, Ethernet L2 |
| AR 설정과 record 접근 | 비주기 record data CR (UDP 기반 서비스) |
| 입력·출력 갱신 | IO data CR, EtherType 0x8892 |
| 진단 사건 전달 | Alarm, 세 단계(maintenance required·demanded, diagnostics) |

alarm 단계는 System Description 3장의 기본 기능 목록에 있는 분류입니다. 각 서비스의 프레임 형식은 Ch 7에서 p-net 소스로 확인합니다.

## 설비에 적용할 때의 판단 순서

먼저 제어 주기와 허용 데이터 나이, 통신이 끊겼을 때의 동작을 정합니다. 그다음 주기가 250 μs 이상이고 경로의 hop 수와 경쟁 트래픽이 RT 지연 예산 안에 들어오면 RT로, 아니면 IRT로 갑니다. 마지막으로 후보 장치의 GSDML에서 `SendClock`·`ReductionRatio`·`SupportedRT_Classes`가 그 주기를 허용하는지 봅니다.

## 정리

- Conformance Class는 쌓이는 기능 묶음입니다. CC-A·B는 RT, CC-C는 IRT, CC-D는 PROFINET over TSN입니다.
- 주기 IO 데이터는 EtherType 0x8892의 L2 프레임이고, RT는 VLAN priority 6으로 우선 처리합니다. RT update time은 250 μs~512 ms입니다.
- 우선순위 큐는 이미 나가는 프레임을 멈추지 못하므로, 100 Mbit/s에서 최대 프레임 하나당 약 123 μs의 대기가 hop마다 남습니다.
- IRT는 PTCP 동기와 예약 red phase로 jitter 1 μs 미만, 기본 최소 250 μs, 하드웨어에 따라 31.25 μs 주기까지 지원합니다.
- update time은 31.25 μs × send clock factor × reduction ratio입니다.
- 장치의 실제 허용 주기는 GSDML의 `SendClock`·`ReductionRatio` 목록에 있습니다.

다음 [Ch 7: PROFINET IO 모델](/blog/embedded/protocols/industrial-ethernet/chapter07-profinet-io)에서 발견, 연결, 주기 데이터와 장애 감시를 p-net 소스로 이어서 살펴봅니다.

## 관련 항목

- [Ch 2: 실시간 요구사항](/blog/embedded/protocols/industrial-ethernet/chapter02-realtime-requirements)
- [Ch 5: EtherCAT Master 구현](/blog/embedded/protocols/industrial-ethernet/chapter05-ethercat-master)
- [Ch 8: TSN](/blog/embedded/protocols/industrial-ethernet/chapter08-tsn)
- [Modern Embedded Recipes: IRQ affinity](/blog/embedded/modern-recipes/part7-13-irq-affinity)
- [PI PROFINET System Description, 2018 update](https://www.profibus.de/fileadmin/media/downloadsection/technical_description_%26_books/PROFINET_System_Description_engl_2018_Update.pdf)
- [PI PROFINET IRT 설명](https://us.profinet.com/?p=19941)
- [p-net public/v1.0.4](https://github.com/rtlabs-com/p-net/tree/public/v1.0.4)
