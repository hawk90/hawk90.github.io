---
title: "PROFINET 개요 분석 — RT·IRT 클래스와 실시간 등급"
slug: "embedded/protocols/industrial-ethernet/chapter06-profinet"
date: 2026-05-13T09:06:00
description: "PROFINET의 CC-A·B·C·D 기능 구분과 RT·IRT 전송 원리, GSDML에서 확인할 타이밍 조건을 설명합니다."
series: "Industrial Ethernet 심화"
seriesOrder: 6
tags: [profinet, siemens, rt, irt]
draft: false
topics: ["embedded", "embedded/protocols"]
---

## 한 줄 요약

> **PROFINET의 Conformance Class는 필수 기능의 묶음입니다. 클래스 이름만으로 설비의 cycle time이나 지터 상한을 정할 수는 없습니다.**

PROFINET은 PI(PROFIBUS & PROFINET International)가 관리하는 산업용 이더넷 기술입니다. Siemens 제품에서도 사용하지만 특정 제조사의 전용 통신으로 한정되지 않습니다. 이 장에서는 RT와 IRT가 전송 기회를 확보하는 방법을 비교하고, 실제 장치 선정에서 GSDML의 어느 정보를 읽어야 하는지 살펴봅니다.

다음 장은 DCP·AR·IOCR·alarm을 다룹니다. 여기서는 기능 클래스와 전송 경로에 집중합니다. 제품별 최소 주기, 스위치 인증, 실제 망의 지터는 해당 모델·펌웨어·토폴로지 조건으로 확인해야 합니다.

## Conformance Class와 전송 방식

[PI의 공식 FAQ](https://www.profinet.com/community/faq)는 CC-A/B를 RT, CC-C를 IRT로 구분하고, PROFINET over TSN의 CC-D도 설명합니다. 아래 표는 기능을 구분하기 위한 요약이며 성능 등급표가 아닙니다.

| 클래스 | 이 장에서 확인할 기능 | 클래스만으로 알 수 없는 것 |
|---|---|---|
| CC-A | 기본 RT 통신과 비주기 서비스 | 특정 제품의 최소 update time |
| CC-B | A의 기능에 네트워크 진단 기능 추가. SNMP 지원이 대표적입니다. | PTP 필수 여부나 고정 10~100 ms 주기 |
| CC-C | IRT를 위한 동기화와 예약된 통신 | 모든 제품에서 31.25 μs가 가능한지 |
| CC-D | PROFINET over TSN | 기존 IRT 장치를 설정 변경만으로 전환할 수 있는지 |

따라서 CC-B를 “PTP를 쓰는 synchronized RT”로 정의하면 안 됩니다. 또한 RT class와 Conformance Class는 서로 다른 분류이므로 이름을 일대일 숫자 등급으로 바꾸지 않습니다. 같은 클래스의 장치라도 지원하는 주기와 데이터 크기는 다를 수 있습니다.

## RT: 우선순위가 지연을 줄이는 범위

PROFINET cyclic RT는 IP 헤더를 거치지 않고 Ethernet의 EtherType `0x8892`로 전송됩니다. 우선순위 태그와 스위치 큐는 다른 트래픽과 경쟁할 때 RT 프레임의 대기 시간을 줄이는 수단입니다. 아래 그림은 VLAN 태그가 있는 경우의 개념 배치입니다.

![VLAN 태그를 포함하는 PROFINET RT 프레임의 개념 배치](/images/blog/industrial-ethernet/diagrams/ch06-profinet-rt-frame.svg)

Strict priority라도 이미 전송 중인 낮은 우선순위 프레임을 자동으로 중단하지는 않습니다. 같은 우선순위 큐의 대기, 링크 속도, 프레임 길이, 스위치 전달 방식과 부하도 지연에 영향을 줍니다. 따라서 “hop당 지터 몇 μs”를 고정해서 더하거나, RT는 반드시 4 ms 이상이라고 결론 내릴 수 없습니다.

확인할 질문은 “RT인가?”에서 끝나지 않습니다. Controller와 Device가 요청한 update time을 지원하는지, 경로상의 큐와 트래픽 조건이 무엇인지, 최대 부하에서 소비자가 정해진 시간 안에 데이터를 받는지를 함께 봅니다. 설정 메뉴의 1 ms와 측정된 최악 지연은 서로 다른 증거입니다.

## IRT: 동기화된 예약 구간

IRT는 동기화된 시간 기준과 계획된 전송 경로를 사용합니다. 필요한 IRT 기능이 경로상의 장치와 내장 스위치에 있어야 하며, 외장 스위치를 추가한다면 그 모델의 지원 범위를 확인해야 합니다. 특정 제조사의 외장 스위치 한 종류가 모든 구성의 필수품인 것은 아닙니다.

![예약 구간과 개방 구간을 나눈 가상의 1 ms IRT cycle 예](/images/blog/industrial-ethernet/diagrams/ch06-profinet-cycle.svg)

그림의 200 μs 예약 구간과 800 μs 개방 구간은 **설명용 가정**입니다. 실제 구성의 전송 시각이나 대역폭을 측정한 결과가 아닙니다. 엔지니어링 단계에서는 토폴로지, 통신량, 지원 주기와 전달 지연을 고려해 예약 정보를 구성합니다. 토폴로지나 IO 구성이 바뀌면 해당 계획의 유효성도 다시 확인해야 합니다.

IRT의 동기화는 PROFINET의 PTCP와 연결됩니다. 이를 IEEE 802.1Qbv TAS와 같은 메커니즘이라고 부르면 안 됩니다. CC-D의 TSN 지원은 별도 기능 조건이며, 기존 IRT 망의 교체 시점이나 자동 호환을 뜻하지 않습니다.

## GSDML에서 성능 조건 읽기

GSDML은 IO-Device의 식별자, 모듈·서브모듈 구성, 통신 기능 등을 기술합니다. 실제 프로젝트에는 제조사가 해당 제품과 펌웨어에 제공한 파일을 사용합니다. 임의로 VendorID와 제품 주문번호를 조합한 XML은 장치 명세로 사용할 수 없습니다.

| 확인 대상 | 읽어야 할 의미 | 피해야 할 해석 |
|---|---|---|
| `VendorID`, `DeviceID` | 제조사와 장치 식별 | ID가 같으면 모든 펌웨어 구성이 호환됨 |
| `MinDeviceInterval` | 31.25 μs 단위의 최소 장치 간격 | CC-C에서만 사용하는 단위 |
| `ImplementationType` | 구현에 관한 설명 | CC-A/B/C를 지정하는 속성 |
| `InterfaceSubmoduleItem`의 `SupportedRT_Classes` | 인터페이스의 지원 RT class | 속성 하나가 모든 통신 조건을 확정함 |
| 타이밍 속성의 `SendClock`, `ReductionRatio` | 지원하는 타이밍 조합 | 최소 간격보다 작은 임의의 주기도 선택 가능함 |

[Siemens PN Driver v3.3.0의 RT class 정의](https://docs.industrial-operations-x.siemens.cloud/r/en-us/v3.3.0/profinet-driver/gsdml-getting-started/definition-of-real-time-classes?contentId=VAUaCmra9CrpBiKc6HRAog)는 `SupportedRT_Classes`의 위치와 PTCP 관련 속성을 예로 보여 줍니다. 해당 문서의 예제 속성을 다른 장치에 그대로 복사하지는 않습니다. 이 글에는 import 가능성을 검증하지 않은 전체 GSDML을 싣지 않습니다.

예를 들어 `MinDeviceInterval="32"`의 단위 환산은 32 × 31.25 μs = 1000 μs입니다. 이것만으로 IRT 지원이나 특정 제품의 기본 설정을 증명하지는 못합니다. 실제 update time 계산과 입력 검사는 다음 장의 실행 가능한 예제로 이어집니다.

## 역할과 프로토콜을 구분하기

IO-Controller는 제어 애플리케이션을 실행하고 IO-Device와 통신 관계를 설정합니다. 주기 통신에서는 Controller와 Device가 각각 provider가 되어 독립적으로 데이터를 보냅니다. Device가 매번 Controller의 요청을 받은 뒤 응답하는 polling 그림으로 해석하면 수신 누락 분석이 어긋납니다.

IO-Supervisor는 엔지니어링과 진단에 참여합니다. 사용하는 서비스에 따라 통신 경로가 달라지므로 “모든 Supervisor 트래픽은 TCP/IP”라고 일반화하지 않습니다. 특히 DCP는 IP 없이 동작하는 L2 서비스입니다. 주기 데이터는 PROFINET IO 데이터라고 부르며 EtherCAT의 PDO라는 이름을 그대로 붙이지 않습니다.

| 작업 | 통신 관점 |
|---|---|
| 장치 발견과 이름·IP 설정 | DCP, Ethernet L2 |
| AR 설정과 record 접근 | RPC를 통한 비주기 서비스 |
| 입력·출력 갱신 | IOCR의 주기 provider/consumer 통신 |
| 진단 사건 전달 | AlarmCR의 alarm과 확인 응답 |

## 설비에 적용할 때의 판단 순서

먼저 제어 주기와 허용 데이터 나이, 통신 장애 시 요구 동작을 정합니다. 다음으로 장치의 GSDML과 펌웨어 지원 범위, 경로상의 스위치 기능, 엔지니어링 도구의 설정을 맞춥니다. 마지막으로 실제 부하에서 지연과 누락, 장애 복구를 측정합니다.

PROFINET과 EtherCAT을 함께 사용하는 구성도 가능하지만 gateway가 공통된 시간 기준이나 기능 안전을 자동으로 제공하지는 않습니다. 두 망의 update time, 데이터 매핑, stale 데이터 표시와 장애 전파를 따로 설계해야 합니다. 근거 없이 특정 지역의 시장 점유나 제조사 조합을 표준 구성으로 제시하지 않습니다.

## 정리

- Conformance Class는 필수 기능의 묶음이며 제품의 실측 성능을 대신하지 않습니다.
- CC-A/B는 RT, CC-C는 IRT이며 CC-D는 PROFINET over TSN과 관련됩니다.
- 우선순위 큐만으로 지연 상한이 확정되지는 않습니다.
- IRT의 PTCP 기반 동기화와 TSN TAS를 같은 기능으로 취급하지 않습니다.
- GSDML의 구현 설명, 지원 RT class, 타이밍 속성을 구분해서 읽습니다.
- 주기 IO와 DCP·RPC·alarm은 서로 다른 서비스입니다.

다음 [Ch 7: PROFINET IO 모델](/blog/embedded/protocols/industrial-ethernet/chapter07-profinet-io)에서 발견, 연결, 주기 데이터와 장애 감시를 이어서 살펴봅니다. 이 시리즈는 Ch 12까지 이어집니다.

## 관련 항목

- [Ch 2: 실시간 요구사항](/blog/embedded/protocols/industrial-ethernet/chapter02-realtime-requirements)
- [Ch 5: EtherCAT Master 구현](/blog/embedded/protocols/industrial-ethernet/chapter05-ethercat-master)
- [Ch 8: TSN](/blog/embedded/protocols/industrial-ethernet/chapter08-tsn)
- [Modern Embedded Recipes: IRQ affinity](/blog/embedded/modern-recipes/part7-13-irq-affinity)
- [PI PROFINET System Description, 2018 update](https://www.profibus.de/fileadmin/media/downloadsection/technical_description_%26_books/PROFINET_System_Description_engl_2018_Update.pdf): 기능과 통신 모델의 배경 자료입니다. 최신 제품 인증 사양을 대신하지 않습니다.
