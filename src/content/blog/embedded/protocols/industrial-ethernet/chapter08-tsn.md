---
title: "TSN 표준 분석 — IEEE 802.1 Time-Sensitive Networking 개요"
slug: "embedded/protocols/industrial-ethernet/chapter08-tsn"
date: 2026-05-13T09:08:00
description: "TSN의 시간 동기화·예약 전송·선점·스트림 감시·중복 제거·설정 기능과 각각의 보장 조건을 구분합니다."
series: "Industrial Ethernet 심화"
seriesOrder: 8
tags: [tsn, ieee-802-1, deterministic-ethernet, gptp, qbv, qbu, qci, cb, frer, qcc]
draft: false
topics: ["embedded", "embedded/protocols"]
---

## 한 줄 요약

> **TSN은 여러 이더넷 기능의 집합입니다. 필요한 기능과 프로파일을 선택하고, 전체 경로를 구성·검증해야 지연과 손실에 관한 요구를 만족시킬 수 있습니다.**

스위치가 “TSN 지원”이라고 표시되어 있어도 시간 동기화, 게이트 제어, 선점과 중복 제거가 모두 구현된 것은 아닙니다. 하드웨어 기능에 더해 드라이버와 관리 인터페이스의 지원도 확인해야 합니다. 이 장에서는 각 기능이 어떤 문제를 맡는지 구분하고, 다음 장에서는 한 출력 포트의 스케줄을 계산합니다.

[IEEE TSN Task Group](https://1.ieee802.org/tsn/)은 AVB에서 이어진 작업과 여러 기본 표준·프로파일을 함께 소개합니다. TSN을 2016년에 시작한 고정된 “9개 표준”으로 한정하지 않습니다. 아래 Q 접미사는 해당 기능을 도입한 amendment 이름이며, 후속 802.1Q 판에 통합된 기능도 있습니다.

## 기능별로 구분하기

| 기능 | 관련 표준·amendment | 확인할 질문 |
|---|---|---|
| 공통 시간 | 802.1AS | 어느 시간 도메인을 사용하며 실제 오차는 얼마인가? |
| 예약된 출력 기회 | 802.1Qbv | 포트별 GCL과 traffic class 매핑이 맞는가? |
| 프레임 선점 | 802.1Qbu, 802.3br | 양 끝 MAC Merge가 지원·설정되고 동작하는가? |
| 스트림 감시 | 802.1Qci | 어떤 stream에 어떤 filter·gate·meter 정책을 적용하는가? |
| 복제와 중복 제거 | 802.1CB | 경로 분리와 sequence recovery 조건이 맞는가? |
| 예약·설정 | 802.1Qcc | 분산·중앙 설정 중 무엇을 사용하며 어떤 요구를 전달하는가? |
| 주기적 큐 전달 | 802.1Qch | 큐 전환 주기와 hop별 시간 조건이 맞는가? |

모든 TSN 구성이 위 기능 전부를 사용하는 것은 아닙니다. 프로파일이 정한 기능 조합과 실제 장치의 지원 범위를 구분해야 합니다. 또한 8개의 PCP 값이 모든 장치에서 각각 하나의 전용 하드웨어 큐에 대응한다는 보장은 없습니다.

## 802.1AS: 시계와 링크 지연

gPTP는 시간 동기화에 사용하는 프로토콜입니다. Sync와 Follow_Up은 송신 시각 정보를 전달하고, peer delay 교환은 인접한 시간 인식 시스템 사이의 링크 지연을 구하는 데 관여합니다. 하나의 grandmaster가 모든 종단과 직접 peer delay를 교환하는 구조로 그리면 hop별 처리를 놓칩니다.

| 관찰 대상 | 의미 | 그 값만으로 증명하지 못하는 것 |
|---|---|---|
| 선택된 grandmaster와 domain | 현재 사용하는 시간 기준 | 장애 시 무중단 전환 |
| peer delay와 포트 상태 | 인접 링크의 시간 전달 조건 | 전체 애플리케이션 지연 |
| timestamp 지점과 PHC | 시각이 찍히는 하드웨어 경계와 시계 | 모든 NIC에서 PHY에 timestamp가 있다는 주장 |
| 측정 offset·최대 편차 | 해당 조건에서의 시간 차이 | 측정하지 않은 부하에서의 오차 상한 |

802.1AS-2020을 사용한다는 것만으로 hot standby가 즉시 동작한다고 말할 수 없습니다. IEEE는 [802.1ASdm-2024](https://1.ieee802.org/tsn/802-1asdm/)에서 hot standby와 clock drift error reduction을 별도 amendment로 다룹니다. 도메인 수, 선택 알고리즘과 장애 시 전환 조건은 적용 판·프로파일·구현으로 확인합니다.

소프트웨어 timestamp와 하드웨어 timestamp의 차이도 단순한 고정 수치로 환산하지 않습니다. timestamp가 MAC인지 PHY인지, PHC와 시스템 시계가 어떻게 연결되는지 먼저 확인합니다. `ptp4l`의 offset 로그 하나가 모든 출력 포트 게이트의 동기 상태를 증명하지는 않습니다.

## Qbv와 선점: 전송 기회와 잔여 blocking

Qbv의 GCL은 출력 traffic class의 게이트 상태를 시간에 따라 바꿉니다. 열린 게이트는 송신 자격을 주지만, 각 stream의 패킷 한 개를 지정 시각에 반드시 내보내라는 명령은 아닙니다. 데이터가 제때 큐에 들어오고 다른 eligible 트래픽과의 선택 조건도 맞아야 합니다.

게이트가 닫히기 전에 시작한 프레임의 전송 시간도 고려해야 합니다. 예약 구간 앞에 guard band를 배치하거나, 지원되는 프레임 선점 기능으로 간섭의 크기를 줄일 수 있습니다. guard band를 예약 구간 뒤에 놓으면 다음 주기 경계의 blocking을 막지 못합니다.

Qbu는 선점 가능한 traffic class와 express traffic class의 사용을 다루고, 802.3br의 MAC Merge가 하위 전송 메커니즘을 제공합니다. 이를 단순한 PHY multiplexer라고 부르지는 않습니다. 잔여 blocking은 링크 속도, fragment 조건과 구현 지연에 따르므로 “항상 1 μs 이하”라는 보장은 둘 수 없습니다.

![express traffic class는 eMAC, preemptible traffic class는 pMAC으로 가서 MAC Merge에서 합쳐지고, 링크에서는 preemptible 프레임의 fragment 사이에 express 프레임이 끼어드는 개념 timeline](/images/blog/industrial-ethernet/diagrams/ch08-qbu-preemption.svg)

그림의 timeline에는 수치를 두지 않았습니다. express 프레임이 도착한 뒤 송신을 시작하기까지의 잔여 blocking은 위에서 말한 조건으로 따로 계산합니다.

예를 들어 MAC 프레임 길이를 FCS 포함 1522 B, preamble/SFD를 8 B, IPG를 12 B로 가정하면 1 Gbit/s에서 차지하는 선로 시간은 1542 × 8 ns = **12,336 ns**입니다. 이 값은 VLAN 태그 한 개를 포함하는 예제의 계산입니다. 추가 캡슐화, jumbo frame, 속도와 구현 여유가 달라지면 guard band도 다시 산정합니다.

## Qci와 CB: 잘못된 송신과 경로 장애

[Qci](https://1.ieee802.org/tsn/802-1qci/)는 stream별 계수·필터링·policing 기능을 다룹니다. 과도한 트래픽이나 정해진 조건을 벗어나는 송신이 다른 stream에 미치는 영향을 제한하는 수단입니다. 분류와 정책이 틀리면 정상 트래픽도 버릴 수 있으므로 drop counter를 실제 stream·gate·meter 설정과 연결해서 봅니다.

![수신 프레임이 stream filter, maximum SDU size filter, stream gate, flow meter를 차례로 거쳐 출력 queue로 가고 단계마다 폐기와 계수기가 있는 PSFP 처리 순서](/images/blog/industrial-ethernet/diagrams/ch08-qci-pipeline.svg)

이 순서는 IEEE 802.1 작업 그룹의 [P802.1Qcr 8.6.5 정리 제안](https://grouper.ieee.org/groups/802/1/files/public/docs2019/cr-seaman-8-6-5-organization-0719-v02.pdf)을 따른 것이며, 단계마다 계수기가 따로 있으므로 어느 단계에서 프레임이 버려졌는지 구분해서 읽을 수 있습니다.

Qci를 보안 인증이나 기능 안전의 완성으로 취급하지 않습니다. 정상 메시지의 의미를 이해하거나 모든 공격을 차단하는 기능은 아닙니다. ingress 정책을 구성했다는 사실과 전체 경로의 deadline 만족은 별도 검증 대상입니다.

[802.1CB](https://1.ieee802.org/tsn/802-1cb/)는 프레임 복제와 중복 식별·제거를 정의합니다. 아래 그림은 두 경로를 쓰는 개념 예입니다. 복제 위치는 종단이나 중계 지점일 수 있으며 두 경로라는 수가 모든 구성을 제한하지는 않습니다.

![두 경로로 복제된 프레임의 sequence를 사용해 중복을 제거하는 FRER 개념 예](/images/blog/industrial-ethernet/diagrams/ch08-frer-replication.svg)

미리 복제본을 보내면 경로 재구성이 끝나기를 기다리지 않고 surviving path의 데이터를 받을 수 있습니다. 그러나 이를 모든 장애에서 “복구 시간 0, 손실 0”이라고 확대하면 안 됩니다. 공통 장애 지점, 경로 지연 차이, history window와 reset 조건, 두 경로의 동시 손실도 고려해야 합니다. 두 복제본이 공유하는 링크에서 소비하는 대역폭과 경로별 대역폭도 따로 계산합니다.

## Qcc: 요구사항과 설정 모델

[Qcc](https://1.ieee802.org/tsn/802-1qcc/)는 stream reservation과 사용자·네트워크 사이의 요구사항 전달을 확장합니다. 분산 설정과 중앙 설정 모델을 구분해야 하며, 모든 망에 CNC와 CUC가 반드시 있는 것은 아닙니다. CNC가 있다는 이유만으로 특정 NETCONF server 배치나 상용 관리 제품을 단정하지 않습니다.

YANG은 데이터 모델 언어입니다. YAML 모양의 임의 문서를 “표준 YANG 설정”이라고 제시하면 실제 장치에 적용할 수 없습니다. 대상 장치의 모듈 이름·revision·feature·deviation, 관리 프로토콜과 권한을 맞추고 schema 검증을 거쳐야 합니다. Qcc와 YANG 관련 amendment를 같은 표준 하나로 뭉뚱그리지 않습니다.

이 글은 schema를 검증하지 않은 stream YAML이나 출처 없는 벤더 CLI를 제공하지 않습니다. 다음 장의 JSON은 순수 계산 프로그램의 **교육용 입력 형식**이며 CNC나 스위치의 표준 설정 파일이 아닙니다.

## 애플리케이션과 TSN 사이

TSN은 애플리케이션 데이터 모델을 통일하지 않습니다. OPC UA PubSub 메시지를 사용해도 선택한 transport mapping과 네트워크 자원 구성이 필요합니다. [OPC UA Part 14 §7.3](https://reference.opcfoundation.org/specs/OPC-10000-14/7.3)은 여러 transport mapping을 다루므로 PubSub를 항상 UDP multicast 한 가지로 한정하지 않습니다.

장치를 선정할 때는 광고의 기능 이름보다 실제 사용 경로를 확인합니다. NIC의 launch-time 지원, Qbv full offload, MAC Merge와 hardware timestamp는 서로 다른 기능입니다. 제조사·모델·리비전·드라이버에 대한 증거 없이 가격이나 “Full TSN” 지원표를 만들지 않습니다.

## 정리

- TSN은 기능과 프로파일의 집합이며 표준 개수가 고정되어 있지 않습니다.
- 공통 시간과 예약 전송은 구성·측정 조건을 함께 확인해야 합니다.
- 게이트가 열려 있다는 사실만으로 stream의 deadline을 보장하지는 않습니다.
- 선점의 잔여 blocking과 guard band는 속도·프레임·장치 조건에 따라 계산합니다.
- Qci 정책과 FRER은 각각 별도의 실패 조건과 검증 범위를 가집니다.
- 예약 모델, YANG schema와 실제 설정 인터페이스를 구분합니다.

다음 [Ch 9: TSN 스케줄링](/blog/embedded/protocols/industrial-ethernet/chapter09-tsn-scheduling)에서 주기 경계의 guard band와 Linux taprio의 시계 모드를 구체적으로 확인합니다.

## 관련 항목

- [Ch 7: PROFINET IO 모델](/blog/embedded/protocols/industrial-ethernet/chapter07-profinet-io)
- [Ch 2: 실시간 요구사항](/blog/embedded/protocols/industrial-ethernet/chapter02-realtime-requirements)
- [IEEE TSN Task Group: 표준·프로파일 목록](https://1.ieee802.org/tsn/)
