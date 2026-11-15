---
title: "산업용 이더넷 프로토콜 비교 — EtherCAT·PROFINET·POWERLINK·TSN 선택"
slug: "embedded/protocols/industrial-ethernet/chapter12-comparison"
date: 2026-05-13T09:12:00
description: "산업용 이더넷 후보를 주기·데이터 나이·장애 반응·제품 호환성·운영 비용의 증거로 비교하는 방법을 정리합니다."
series: "Industrial Ethernet 심화"
seriesOrder: 12
tags: [industrial-ethernet, comparison, selection-guide, tsn, industry-4-0]
draft: false
topics: ["embedded", "embedded/protocols"]
---

## 한 줄 요약

> **프로토콜 이름보다 먼저 요구사항과 지원 제품을 확정합니다. 후보별로 같은 조건의 증거를 모으고, 미확인 항목을 성능 점수로 바꾸지 않습니다.**

이 시리즈의 마지막 장입니다. 앞 장에서는 EtherCAT의 프레임 처리와 상태, PROFINET의 기능 클래스와 IO 관계, TSN의 게이트·시계, POWERLINK의 polling과 Linux 운영 조건을 구분했습니다. 이번 장은 그 지식을 실제 선정 질문으로 묶습니다.

이 글은 특정 공장의 내부망이나 제품 채택을 조사한 현장 보고가 아닙니다. 출처 없는 실명 공장·pilot·시장 점유율·칩 가격은 비교 근거로 사용하지 않습니다. 아래 숫자와 후보 A/B/C는 요구 분해를 설명하는 **가상 예제**입니다.

## 서로 같은 층위를 비교하기

EtherCAT·PROFINET·EtherNet/IP·POWERLINK·Sercos는 각각의 통신·애플리케이션 체계를 갖습니다. TSN은 이들과 동일한 층위의 단일 IO 프로토콜이 아닙니다. TSN의 기능을 쓴다고 장치 데이터 모델·제어 상태·안전 프로토콜이 자동으로 호환되지는 않습니다.

| 후보 체계 | 먼저 확인할 기능 | 이름만으로 결정되지 않는 것 |
|---|---|---|
| EtherCAT | master·ESC·PDO·DC·상태 감시 | 목표 topology와 IO량에서의 cycle·유효 데이터 나이 |
| PROFINET RT/IRT | 장치 class, IOCR 타이밍, 경로 지원 | 모든 RT가 같은 최소 주기를 가진다는 주장 |
| EtherNet/IP | IO connection과 필요한 CIP 서비스 | CIP Sync 지원만으로 motion·deadline 충족 |
| POWERLINK | MN/CN mode, polling·응답·비동기 예산 | 일반 NIC 사용만으로 얻는 주기 상한 |
| Sercos | 지원되는 주기 통신·장치 profile | 특정 제조사 제품과 모든 장치의 자동 호환 |
| TSN 기반 구성 | 적용 profile, 시계·gate·policing·설정 경로 | 애플리케이션과 안전 기능의 통합 완료 |

[ODVA의 CIP Sync 설명](https://www.odva.org/technology-standards/distinct-cip-services/cip-sync/)은 공통 시간의 역할을, [CIP Motion 설명](https://www.odva.org/technology-standards/distinct-cip-services/cip-motion/)은 motion 서비스와 시간 동기화의 결합을 다룹니다. 둘을 동일 기능으로 취급하거나 “EtherNet/IP는 항상 1 ms 이상”이라고 단정하지 않습니다. 실제 장치가 어느 서비스를 지원하는지가 필요합니다.

[Sercos International의 real-time channel 설명](https://www.sercos.org/technology/functions-and-features/real-time-channel/)도 여러 통신 형태와 서비스를 구분합니다. 특정 회사 이름을 표준의 관리 주체처럼 적거나 한 토폴로지·최소 주기를 모든 구현의 성능으로 일반화하지 않습니다. 지원 제품과 적용 profile을 확인하는 데서 비교를 시작합니다.

## 요구사항을 측정 가능한 값으로 쓰기

“빠른 모션”이나 “SIL 3 망”처럼 적으면 무엇을 시험할지 정하기 어렵습니다. 주기, deadline과 동기 오차, 장애 시 반응을 각각 적고 관측 지점을 정합니다. 기능 안전 요구는 위험 평가와 해당 안전 기능의 기준으로 별도로 명세합니다.

| 요구 축 | 가상 요구 예 | 확인할 자료·시험 |
|---|---|---|
| 갱신 주기 | 250 μs | Controller와 Device의 실제 지원 조합 |
| 유효 데이터 나이 | 센서 취득부터 사용까지 400 μs 이하 | IO 취득·전송·소비 경계가 포함된 timestamp |
| 동기 오차 | 두 출력 갱신 시각 차이 1 μs 이하 | 공통 기준으로 관측한 출력 시각 |
| 통신 장애 | 정해진 누락 조건에서 지정 반응 | timeout·대체 출력·애플리케이션 복구 시험 |
| 배선·장애 범위 | 노드·링크 하나의 고장 범위 명세 | topology, redundant 경로와 공통 장애 지점 |
| 유지보수 | 모델·펌웨어 교체와 진단 가능 | description 파일, 지원 기간과 교체 절차 |

250 μs 주기와 400 μs 데이터 나이는 모순되지 않습니다. 데이터가 언제 취득되고 어느 주기에 실리는지에 따라 소비 시점이 달라집니다. 반대로 clock offset이 1 μs 미만이어도 전체 데이터 지연이 1 μs라는 뜻은 아닙니다.

노드 주소의 이론적 범위도 실제 수용량이 아닙니다. Controller의 connection 수, 프레임 크기, 각 장치의 IO량, 스위치와 스택의 자원 한계를 확인해야 합니다. 최대 노드 수를 비교할 때는 같은 cycle·payload·진단 부하와 장애 조건을 붙입니다.

## 후보를 탈락시키는 근거와 추가 질문

다음 표는 실제 제품 성능이 아닌 평가 방법의 예입니다. 가상 프로젝트의 필수 조건은 기존 Controller와의 연결, 250 μs update, 사용할 장치의 IO mapping과 현장 진단 지원입니다. 같은 이름의 프로토콜이라는 이유만으로 항목을 통과 처리하지 않습니다.

| 필수 조건 | 후보 A | 후보 B | 후보 C |
|---|---|---|---|
| Controller·firmware 조합 지원 | 문서 확인 | 문서 확인 | 확인 자료 없음 |
| 목표 update와 IO량 지원 | 구성 도구 수락 | 명세상 최소 1 ms로 미충족 | 명세상 지원 |
| 실제 deadline과 데이터 유효성 | 실험 전 | 주기 조건에서 탈락 | 실험 전 |
| 교체·진단 절차 | 검토 중 | 검토 중 | 검토 중 |

B는 가상의 필수 주기 조건에 맞지 않아 이 구성에서 제외합니다. A의 설정 수락은 실측 통과가 아니므로 부하 시험이 필요합니다. C는 성능 시험 전에 Controller 조합의 지원을 확인해야 합니다. A와 C를 단순 점수로 정렬하면 미확인과 실제 실패가 섞입니다.

실험을 마친 뒤에는 조건, 관찰값, 결론과 남은 위험을 함께 기록합니다. 평균·percentile·관측 최대값을 같은 “worst case”로 부르지 않습니다. 부하가 다르거나 하나는 clock offset, 다른 하나는 application latency라면 같은 열에서 비교하지 않습니다.

## 시나리오별로 바뀌는 검증 순서

### 기존 Controller를 유지하는 라인

먼저 현재 Controller·firmware에서 지원하는 장치와 기능을 확인합니다. IO-Device의 description 파일과 모듈·서브모듈 또는 connection 설정을 맞춘 뒤, 실제 IO량·진단 부하에서 타이밍을 검증합니다. 특정 PLC 브랜드가 있다는 이유만으로 gateway·다중 protocol이나 다른 구조를 검토할 수 없다고 결론 내리지는 않습니다.

기존 설비의 확장에서는 연결 수와 topology 변경, 유지보수 중 장치 교체가 더 큰 문제가 될 수 있습니다. 새 통신망을 추가한다면 데이터 매핑과 유효성, timeout 전파, 운영 인력과 도구 비용을 포함합니다. 칩 단가만으로 전체 시스템의 비용을 비교하지 않습니다.

### 동기 모션이 중심인 장치

지원되는 Controller·drive·profile과 동기 방식부터 확인합니다. 통신 주기와 드라이브 내부 제어 주기, 명령이 적용되는 시각이 다를 수 있습니다. EtherCAT DC나 PROFINET IRT, CIP Motion 또는 다른 체계 중 어느 후보든 실제 지원 조합과 출력 시각의 증거가 필요합니다.

일렬 배치가 편리하더라도 단선 시 장애 범위와 복귀 동작을 함께 봅니다. ring이라는 모양만으로 무중단 통신이 되지는 않습니다. 이중 경로, 프로토콜 지원과 장치 설정·감시 조건까지 있어야 합니다.

### 비전·IT 트래픽을 함께 싣는 망

카메라의 trigger·노출 동기와 영상 전송량을 구분합니다. “PTP 지원” 하나로 ±100 ns trigger 요구를 만족한다고 가정하지 않습니다. 이미지 burst, 제어 traffic과 진단 traffic이 겹칠 때 각 출력 포트의 queue·bandwidth·drop을 관측합니다.

TSN을 사용한다면 필요한 기능의 지원과 profile을 확인하고, talker의 준비 시각부터 listener의 소비까지 추적합니다. [Ch 9](/blog/embedded/protocols/industrial-ethernet/chapter09-tsn-scheduling)의 한 포트 계산은 전체 설비의 지연 증명이 아닙니다. 모든 데이터를 한 망에 넣는 목표가 장애 범위와 운영 복잡성에 미치는 영향도 평가합니다.

## 안전·가용성·보안을 따로 비교하기

FRER·MRP 같은 통신 가용성 기능은 안전 통신 프로토콜 자체가 아닙니다. 패킷 복제와 경로 복구가 안전 기능의 진단 범위, 반응 시간이나 무결성 요구를 대신하지 않습니다. “모든 프로토콜이 SIL 3이므로 안전 관점에서 같다”는 비교는 사용할 수 없습니다.

| 평가 항목 | 확인할 대상 |
|---|---|
| 기능 안전 | 선택한 safety 장치·profile·구성의 safety manual과 안전 기능의 검증 근거 |
| 가용성 | 지원하는 redundancy mode, 장애 범위와 실제 데이터 복귀 시간 |
| 보안 | 인증·권한·네트워크 경계·업데이트·진단 접근 정책 |
| 제어 성능 | 주기·동기·데이터 나이·deadline miss와 애플리케이션 반응 |

[IEC 61784-3-13:2021의 공개 범위](https://webstore.iec.ch/en/publication/68897)도 safety communication layer를 안전 장치에 구현하는 대상으로 구분합니다. 따라서 일반 통신 스택을 선택한 사실만으로 시스템의 안전 등급을 선언하지 않습니다. DO-178C·DO-254는 항공 분야의 별도 맥락이며 산업용 SIL 3 인증 절차의 대체 설명으로 연결하지 않습니다.

Gateway로 다른 망을 연결할 때는 안전·보안·시간 기준이 자동으로 이어지지 않습니다. 재전송·queue·데이터 변환으로 늘어나는 지연과 오래된 값의 표시를 확인합니다. 한쪽 통신이 끊겼을 때 다른 쪽에 유효한 데이터처럼 남는 경우도 시험해야 합니다.

## 비용과 운영 자료를 남기기

초기 하드웨어 가격 외에 stack·tool 라이선스, 통합 개발, 시험·인증, 진단·교육과 교체 부품을 포함합니다. 공개 스택이라도 모든 target의 라이선스와 지원 범위가 같은 것은 아닙니다. 견적에는 수량·시점·포함 항목을 붙이고, 미확인 가격을 기술 상수로 적지 않습니다.

최종 결정에는 적어도 Controller·Device·switch의 모델·revision·firmware, 설정 파일·description 파일의 버전, topology와 IO량을 남깁니다. 시험의 부하·시간·관측 지점, 실패 조건과 복구 결과도 함께 기록합니다. 이 기록이 있어야 교체나 업데이트 후 재검증 범위를 정할 수 있습니다.

## 시리즈를 마치며

- 프로토콜, 기능 profile과 제품 구현을 같은 층위로 섞지 않습니다.
- cycle, clock offset, 데이터 나이와 deadline을 각각 명세합니다.
- 필수 조건의 실패와 미확인을 구분하고 같은 조건의 증거로 비교합니다.
- 지원 topology와 redundancy 구성, 실제 장애 범위는 따로 확인합니다.
- 기능 안전·가용성·보안은 각 요구와 검증 근거가 필요합니다.
- 선정 기록에는 버전·설정·부하와 관측·판단의 범위를 남깁니다.

산업용 이더넷의 내부 동작을 이해하는 목적은 조건에 맞는 질문을 할 수 있게 되는 것입니다. 이후에는 실제 대상의 구성과 관측을 연결해 판단을 구체화합니다. Linux 실행 지연은 [PREEMPT_RT 글](/blog/embedded/rtos/practical-internals/part5-07-preempt-rt-linux), 이미지 구성은 [Buildroot 시리즈](/blog/embedded/buildroot/chapter01-problem)로 이어서 볼 수 있습니다.

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
