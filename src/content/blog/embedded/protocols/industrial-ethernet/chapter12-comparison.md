---
title: "산업용 이더넷 프로토콜 비교 — EtherCAT·PROFINET·POWERLINK·TSN 선택"
slug: "embedded/protocols/industrial-ethernet/chapter12-comparison"
date: 2026-05-13T09:12:00
description: "EtherCAT·PROFINET·EtherNet/IP·POWERLINK·Sercos·TSN을 각 단체 자료와 소스가 공개한 수치로 나란히 놓고, 그 수치가 무엇을 보장하지 않는지와 함께 주기·데이터 나이·장애 반응 요구를 증거로 비교하는 방법을 정리합니다."
series: "Industrial Ethernet 심화"
seriesOrder: 12
tags: [industrial-ethernet, comparison, selection-guide, tsn, industry-4-0]
draft: false
topics: ["embedded", "embedded/protocols"]
---

## 한 줄 요약

> **프로토콜 이름보다 먼저 요구사항과 지원 제품을 확정합니다. 후보별로 같은 조건의 증거를 모으고, 단체가 발표한 범위값과 내 구성의 측정값을 같은 칸에 섞지 않습니다.**

이 시리즈의 마지막 장입니다. 앞 장에서 EtherCAT의 프레임 처리와 상태 머신, PROFINET의 기능 클래스와 IO 관계, TSN의 게이트와 시계, POWERLINK의 polling, Linux의 wakeup 지연을 하나씩 소스와 실행으로 확인했습니다. 이번 장은 그 결과를 실제 선정 질문으로 묶습니다.

차를 고를 때 제조사 공인 연비와 내가 출퇴근길에서 낸 연비가 다르듯, 단체가 발표한 "최소 31.25 μs"와 내 라인에서 나오는 주기는 다른 값입니다. 아래 비교는 먼저 공개 수치를 출처와 함께 모으고, 그다음 그 수치를 내 요구에 대조하는 순서로 갑니다. 후보 A/B/C와 요구 수치는 방법을 설명하는 **가상 예제**입니다.

## 서로 같은 층위를 비교하기

EtherCAT·PROFINET·EtherNet/IP·POWERLINK·Sercos는 각자의 통신 방식과 애플리케이션 체계를 갖습니다. TSN은 이들과 같은 층의 IO 프로토콜이 아니라 IEEE 802의 표준 묶음입니다([Ch 8](/blog/embedded/protocols/industrial-ethernet/chapter08-tsn)). TSN 기능을 쓴다고 장치 데이터 모델·제어 상태·안전 프로토콜이 서로 호환되지는 않습니다.

![두 체계가 각자의 장치 데이터 모델·제어 상태·안전 프로토콜을 가진 채 같은 TSN 기능 층과 Ethernet 위에 놓이는 층위 구분](/images/blog/industrial-ethernet/diagrams/ch12-tsn-backbone.svg)

그림처럼 같은 TSN 기능 층을 공유해도 그 위의 층은 체계마다 따로 남습니다. PROFINET CC-D가 그 예입니다([PI FAQ](https://www.profinet.com/community/faq)).

## 공개된 수치와 그 출처

각 체계가 공개 자료나 소스로 밝힌 값을 모았습니다. "출처의 성격" 열이 중요합니다. 단체의 소개 페이지는 규격이 허용하는 범위나 가능한 최선을 적고, 데이터시트는 특정 칩의 측정 조건을 붙여 적습니다.

| 체계 | 공개 수치 | 출처 | 출처의 성격 |
|---|---|---|---|
| EtherCAT | ET1100 MII 포트 간 처리 지연 평균 305 ns(min 280, max 335) | Beckhoff ET1100 데이터시트 v2.1 Table 91 | 칩 데이터시트, 조건 명시 |
| EtherCAT | DC system time 64 bit, 1 ns 단위 | Beckhoff ESC Section I v2.3 9.1 | 규격 정의 |
| PROFINET RT | update time 250 μs~512 ms, VLAN priority 6 | PI System Description(2018) 3.1 | 단체 기술 설명 |
| PROFINET IRT | 기본 최소 250 μs, 하드웨어에 따라 31.25 μs, jitter 1 μs 미만 | PI System Description 5장, [PI IRT 페이지](https://us.profinet.com/?p=19941) | 단체 기술 설명 |
| PROFINET MRP | 전형적 재구성 시간 200 ms 미만 | PI System Description 6.7 | 단체 기술 설명 ("typical") |
| EtherNet/IP CIP Sync | 두 장치 간 동기 정확도 100 ns 미만 | [ODVA CIP Sync](https://www.odva.org/technology-standards/distinct-cip-services/cip-sync/) | 단체 소개 |
| EtherNet/IP CIP Motion | clock synchronization 200 ns보다 좋게 | [ODVA CIP Motion](https://www.odva.org/technology-standards/distinct-cip-services/cip-motion/) | 단체 소개 |
| Sercos | 통신 주기 31.25 μs~65 ms, 동기 정확도 1 μs보다 훨씬 작음, 링 단선 25 μs 안에 인식 | [Sercos International](https://www.sercos.org/technology/) | 단체 소개 |
| POWERLINK | 최소 프레임만으로 CN 32대 443.52 μs의 선로 하한(100 Mbit/s) | [Ch 10](/blog/embedded/protocols/industrial-ethernet/chapter10-powerlink)의 계산 | 산술 하한 |
| TSN | 1 Gbit/s에서 1522 B 프레임 guard 12,336 ns | [Ch 9](/blog/embedded/protocols/industrial-ethernet/chapter09-tsn-scheduling)의 계산 | 산술 하한 |

이 표만 보면 "31.25 μs끼리 비슷하다", "100 ns가 200 ns보다 좋다"고 읽고 싶어집니다. 그런데 행마다 조건이 다릅니다. Sercos의 31.25 μs는 설정 가능한 주기 범위의 하한이고, PROFINET의 31.25 μs는 "depending on the hardware used"라는 조건이 붙은 값이며, CIP Sync의 100 ns와 CIP Motion의 200 ns는 같은 단체가 다른 페이지에 다른 맥락으로 적은 값입니다. 이 표로는 "어느 쪽이 빠른가"를 가리지 않고, "내 요구가 이 체계의 공개 범위 안에 들어오는가"를 1차로 거릅니다.

| 후보 체계 | 먼저 확인할 기능 | 공개 수치가 답하지 않는 것 |
|---|---|---|
| EtherCAT | master·ESC·PDO·DC·상태 감시 | 목표 topology와 IO량에서의 cycle·유효 데이터 나이 |
| PROFINET RT/IRT | 장치 class, GSDML의 `SendClock`·`ReductionRatio` | 경로 hop 수와 경쟁 트래픽에서의 RT 최악 지연 |
| EtherNet/IP | IO connection과 필요한 CIP 서비스 | CIP Sync 지원 장치끼리의 실제 출력 시각 차이 |
| POWERLINK | MN/CN mode, polling·응답·비동기 예산 | CN 응답 시간을 더한 실제 주기 |
| Sercos | 지원되는 주기 통신·장치 profile | 특정 제조사 제품 사이의 상호운용 |
| TSN 기반 구성 | IEC/IEEE 60802 프로파일, 시계·gate·policing·설정 경로 | 애플리케이션과 안전 기능의 통합 |

## 요구사항을 측정 가능한 값으로 쓰기

"빠른 모션"이나 "SIL 3 망"처럼 적으면 무엇을 시험할지 정하기 어렵습니다. 주기, deadline, 동기 오차, 장애 시 반응을 각각 숫자와 관측 지점으로 적습니다. 기능 안전 요구는 위험 평가와 해당 안전 기능의 기준으로 따로 명세합니다.

| 요구 축 | 가상 요구 예 | 확인할 자료·시험 |
|---|---|---|
| 갱신 주기 | 250 μs | Controller와 Device의 지원 조합(PROFINET이면 GSDML `SendClock` 목록) |
| 유효 데이터 나이 | 센서 취득부터 사용까지 400 μs 이하 | IO 취득·전송·소비 경계가 포함된 timestamp |
| 동기 오차 | 두 출력 갱신 시각 차이 1 μs 이하 | 같은 계측기로 잰 두 장치의 출력 시각 |
| 통신 장애 | 유효 데이터가 3 주기 연속 없으면 안전 상태 | data hold·watchdog 설정과 대체 출력 시험 |
| 배선·장애 범위 | 링크 하나가 끊겨도 나머지 노드 유지 | redundant 경로 구성과 복구 시간 측정 |
| 유지보수 | 모델·펌웨어 교체 시 재구성 절차 | description 파일(ESI·GSDML·XDD)과 교체 절차 |

250 μs 주기와 400 μs 데이터 나이는 모순되지 않습니다. 데이터가 주기 중간에 취득되면 다음 프레임에 실려 한 주기 넘게 기다릴 수 있습니다. 반대로 clock offset이 1 μs 미만이어도 데이터 지연이 1 μs라는 뜻은 아닙니다.

통신 장애 요구는 시리즈에서 본 감시 메커니즘과 바로 이어집니다. PROFINET이면 p-net 기준 update time × data hold factor 뒤에 AR이 끊기고([Ch 7](/blog/embedded/protocols/industrial-ethernet/chapter07-profinet-io)), EtherCAT이면 마스터가 WKC 부족을 보고 판단합니다([Ch 4](/blog/embedded/protocols/industrial-ethernet/chapter04-ethercat-frame)). "3 주기 연속"이라는 요구가 각 체계의 어느 설정값으로 옮겨지는지 적어 두면 시험 항목이 저절로 나옵니다.

## 후보를 탈락시키는 근거와 추가 질문

다음 표는 평가 방법의 예입니다. 가상 프로젝트의 필수 조건은 기존 Controller와의 연결, 250 μs update, 사용할 장치의 IO mapping, 현장 진단입니다.

| 필수 조건 | 후보 A | 후보 B | 후보 C |
|---|---|---|---|
| Controller·firmware 조합 지원 | 문서 확인 | 문서 확인 | 확인 자료 없음 |
| 목표 update와 IO량 지원 | 구성 도구 수락 | description 파일상 최소 1 ms로 미충족 | description 파일상 지원 |
| 실제 deadline과 데이터 유효성 | 실험 전 | 주기 조건에서 탈락 | 실험 전 |
| 교체·진단 절차 | 검토 중 | 검토 중 | 검토 중 |

B는 필수 주기 조건에 맞지 않아 이 구성에서 빠집니다. A는 구성 도구가 설정을 받아들였을 뿐 실측이 아니므로 부하 시험이 남았습니다. [Ch 9](/blog/embedded/protocols/industrial-ethernet/chapter09-tsn-scheduling)에서도 커널이 taprio 설정을 받아들이는 단계와 NIC가 그 시각에 실제로 프레임을 내보내는 단계는 따로였습니다. C는 성능 시험 전에 Controller 조합부터 확인해야 합니다. A와 C를 점수 하나로 정렬하면 "아직 모름"과 "확인됨"이 섞입니다.

실험을 마친 뒤에는 조건, 관찰값, 결론, 남은 위험을 함께 적습니다. 평균·percentile·관측 최대를 모두 "worst case"로 부르지 않습니다. [Ch 11](/blog/embedded/protocols/industrial-ethernet/chapter11-linux-realtime)의 VM cyclictest에서도 평균은 79~135 μs로 비슷했지만 최대는 13 ms에서 224 ms까지 갈렸습니다. 같은 열에 놓을 값은 같은 조건에서 같은 지표로 잰 것뿐입니다.

## 시나리오별로 바뀌는 검증 순서

### 기존 Controller를 유지하는 라인

먼저 현재 Controller·firmware가 지원하는 장치와 기능을 확인합니다. 장치의 description 파일(PROFINET GSDML, EtherCAT ESI 등)과 모듈·서브모듈 구성을 맞춘 뒤, 실제 IO량과 진단 부하에서 타이밍을 봅니다. 새 통신망을 덧붙인다면 데이터 매핑과 유효성, timeout 전파, 운영 인력과 도구 비용까지 포함합니다.

### 동기 모션이 중심인 장치

지원되는 Controller·drive·profile과 동기 방식부터 확인합니다. EtherCAT DC([Ch 2](/blog/embedded/protocols/industrial-ethernet/chapter02-realtime-requirements)), PROFINET IRT의 동기 프레임([PI IRT 페이지](https://us.profinet.com/?p=19941)), CIP Sync의 IEEE 1588([ODVA CIP Sync](https://www.odva.org/technology-standards/distinct-cip-services/cip-sync/))은 모두 공통 시계를 쓰지만 동기 메커니즘은 서로 다릅니다. 통신 주기와 드라이브 내부 제어 주기, 명령이 실제로 적용되는 시각이 다를 수 있으므로, 출력 시각을 직접 재는 시험이 필요합니다.

배선이 간단한 line topology라도 한 곳이 끊겼을 때 어디까지 영향이 가는지 확인합니다. EtherCAT은 기본 line에서 끊긴 지점 뒤의 슬레이브에 닿지 못하고([Ch 3](/blog/embedded/protocols/industrial-ethernet/chapter03-ethercat-architecture)), PROFINET MRP는 재구성에 전형적으로 200 ms 미만이 걸립니다. 이 시간이 data hold보다 길면 연결이 끊긴다는 점은 Ch 7에서 계산했습니다.

### 비전·IT 트래픽을 함께 싣는 망

카메라의 trigger·노출 동기와 영상 전송량을 나눠 봅니다. 큰 이미지 burst가 제어 프레임과 같은 출력 포트를 쓰면 [Ch 6](/blog/embedded/protocols/industrial-ethernet/chapter06-profinet)에서 계산한 대로 100 Mbit/s에서 최대 프레임 하나당 hop마다 최대 약 123 μs를 기다릴 수 있습니다. TSN을 쓴다면 필요한 기능(게이트·선점·policing)과 프로파일을 정하고, talker의 준비 시각부터 listener의 소비까지 추적합니다. Ch 9의 한 포트 계산은 전체 설비의 지연 증명이 아닙니다.

## 안전·가용성·보안을 따로 비교하기

FRER·MRP 같은 통신 가용성 기능은 안전 통신 프로토콜이 아닙니다. 패킷 복제와 경로 복구가 안전 기능의 진단 범위나 반응 시간 요구를 대신하지 않습니다.

| 평가 항목 | 확인할 대상 |
|---|---|
| 기능 안전 | 선택한 safety 장치·profile의 safety manual과 안전 기능 검증 근거 |
| 가용성 | 지원하는 redundancy mode, 장애 범위와 실제 데이터 복귀 시간 |
| 보안 | 인증·권한·네트워크 경계·업데이트·진단 접근 정책 |
| 제어 성능 | 주기·동기·데이터 나이·deadline miss와 애플리케이션 반응 |

[IEC 61784-3-13:2021의 공개 초록](https://webstore.iec.ch/en/publication/68897)은 그 안전 통신 계층이 "intended for implementation in safety devices only"라고 적습니다([Ch 10](/blog/embedded/protocols/industrial-ethernet/chapter10-powerlink)). 일반 통신 스택을 골랐다는 사실만으로 시스템의 안전 등급이 정해지지 않습니다. 보안 쪽에서는 [Ch 1](/blog/embedded/protocols/industrial-ethernet/chapter01-overview)의 ESC 경고(ESC를 사무망에 직접 붙이면 broadcast storm이 생긴다)처럼 이미 알려진 위험부터 망 경계 설계에 넣습니다.

Gateway로 다른 망을 연결할 때는 안전·보안·시간 기준이 자동으로 이어지지 않습니다. 재전송·큐·데이터 변환으로 늘어나는 지연과 오래된 값의 표시를 확인하고, 한쪽 통신이 끊겼을 때 다른 쪽에 유효한 데이터처럼 남는 경우도 시험합니다.

![망 A와 망 B를 gateway로 연결할 때 자동으로 이어지지 않는 기능 안전·보안·시간 기준과, 따로 설계하고 시험할 지연·오래된 값·통신 단절 시의 값](/images/blog/industrial-ethernet/diagrams/ch12-vendor-locked.svg)

그림의 두 상자는 gateway를 넣을 때 설계 문서와 시험 항목에 따로 적을 목록입니다.

## 비용과 운영 자료를 남기기

초기 하드웨어 가격 외에 stack·tool 라이선스, 통합 개발, 시험·인증, 진단·교육, 교체 부품을 포함합니다. 라이선스는 시리즈에서 본 것만 해도 체계마다 다릅니다. SOEM은 GPLv2와 별도로 Beckhoff EtherCAT Master License 조건을 붙이고, IgH는 커널 쪽 GPLv2와 라이브러리 LGPL 2.1, openPOWERLINK는 대부분 BSD이고 일부 target만 GPLv2입니다([Ch 5](/blog/embedded/protocols/industrial-ethernet/chapter05-ethercat-master), Ch 10).

최종 결정에는 Controller·Device·switch의 모델·revision·firmware, 설정 파일과 description 파일의 버전, topology와 IO량을 남깁니다. 시험의 부하·시간·관측 지점, 실패 조건과 복구 결과도 함께 기록합니다. 이 기록이 있어야 교체나 업데이트 뒤에 재검증할 범위를 정할 수 있습니다.

## 시리즈를 마치며

- 프로토콜, 기능 profile, 제품 구현을 같은 층위로 섞지 않습니다. TSN은 응용 프로토콜이 올라타는 바닥입니다.
- 단체가 공개한 범위값(31.25 μs, 100 ns 등)은 1차 필터로 쓰고, 내 구성의 측정값과 같은 칸에 두지 않습니다.
- cycle, clock offset, 데이터 나이, deadline을 각각 명세하고 관측 지점을 정합니다.
- 장애 반응 요구는 data hold·WKC 같은 각 체계의 설정값으로 옮겨 시험합니다.
- 필수 조건의 실패와 미확인을 구분하고, 같은 조건의 증거로 비교합니다.
- 기능 안전·가용성·보안은 각자의 요구와 검증 근거가 필요합니다.

산업용 이더넷의 내부 동작을 이해하는 목적은 조건에 맞는 질문을 던지는 데 있습니다. 이 시리즈에서 VM으로 돌린 실험들은 그 질문을 어떻게 재현 가능한 측정으로 바꾸는지 보여 주는 예이고, 실제 판단은 대상 장비에서 같은 방법으로 잰 값으로 합니다. Linux 실행 지연은 [PREEMPT_RT 글](/blog/embedded/rtos/practical-internals/part5-07-preempt-rt-linux), 이미지 구성은 [Buildroot 시리즈](/blog/embedded/buildroot/chapter01-problem)로 이어서 볼 수 있습니다.

## 관련 항목

- [Ch 1: 산업용 이더넷 개요](/blog/embedded/protocols/industrial-ethernet/chapter01-overview)
- [Ch 5: EtherCAT Master 구현](/blog/embedded/protocols/industrial-ethernet/chapter05-ethercat-master)
- [Ch 6: PROFINET 기능 클래스](/blog/embedded/protocols/industrial-ethernet/chapter06-profinet)
- [Ch 8: TSN 기능 개요](/blog/embedded/protocols/industrial-ethernet/chapter08-tsn)
- [Ch 10: POWERLINK와 openSAFETY](/blog/embedded/protocols/industrial-ethernet/chapter10-powerlink)
- [Ch 11: Linux 실시간 산업 통신](/blog/embedded/protocols/industrial-ethernet/chapter11-linux-realtime)
- [Modern Embedded Recipes: IRQ affinity](/blog/embedded/modern-recipes/part7-13-irq-affinity)
- [PI PROFINET FAQ](https://www.profinet.com/community/faq)
- [IEEE TSN 표준·프로파일 목록](https://1.ieee802.org/tsn/)
