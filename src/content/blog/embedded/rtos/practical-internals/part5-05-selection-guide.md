---
title: "RTOS 선택 가이드 — Footprint·License·Certification·Ecosystem"
slug: "embedded/rtos/practical-internals/part5-05-selection-guide"
date: 2026-05-08T09:50:00
description: "RTOS 후보를 같은 board·기능·실패 조건으로 비교하는 절차를 정리합니다. Footprint 실측, 필수 API·격리·지원 버전, 라이선스 원문과 인증 산출물 범위, 장기 유지 비용을 구분합니다."
series: "Practical RTOS Internals"
seriesOrder: 50
tags: [selection, comparison, freertos, zephyr, vxworks, qnx, integrity]
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **"RTOS 선택은 footprint·certification·ecosystem 세 축의 trade-off입니다."** — 어느 한 축에서 정답이 나오지 않습니다. 모든 결정이 *프로젝트 컨텍스트의 함수*입니다.

## 어떤 문제를 푸는가

새 프로젝트를 시작할 때 가장 빨리 굳혀야 하는 결정 중 하나가 RTOS 선택입니다. 한 번 정하면 *수년 단위로* 바꾸기 어렵습니다. 드라이버 통합, 인증, 엔지니어 채용, 빌드 인프라가 모두 따라옵니다.

이 글의 목표는 두 가지입니다. 첫째, 자주 후보에 오르는 RTOS를 *한 표에 모아* 같은 축으로 비교합니다. 둘째, IoT 센서부터 자동차 ECU, 항공 FCC, 산업 PLC, 의료 기기, 드론, 웨어러블까지 *사용 시나리오별로 검증 질문*을 정리합니다. 마지막으로 흔히 빠지는 함정 몇 가지를 짚습니다.

여기서 정답은 제시하지 않습니다. *기준과 trade-off를 명확히* 하는 것이 목표입니다.

## 주요 RTOS 한 표

다음은 후보를 모으는 출발점입니다. 같은 제품명이 모든 release/port의 기능·인증 상태를 대표하지 않으며 표의 빈 수치를 임의의 최소 footprint로 채우지 않습니다.

| 후보 | 비교 시 고정할 범위 |
|---|---|
| FreeRTOS | kernel tag·port·heap·별도 network/POSIX component |
| Zephyr | release·west manifest·board·Kconfig·driver/subsystem |
| Eclipse ThreadX | release·port·SMP/component 구성과 safety 산출물 |
| RT-Thread | release·BSP·component·Smart 여부 |
| Apache NuttX | release·apps tag·board·Flat/Protected/Kernel config |
| VxWorks·QNX·INTEGRITY | 정확한 제품 variant·지원 CPU/toolchain·support/qualification package |
| SafeRTOS·µC/OS·PX5 | source/product version·port·계약·사용 가능한 검증 산출물 |

확인한 core license 예는 FreeRTOS/ThreadX의 MIT, Zephyr/RT-Thread의 Apache-2.0입니다. 배포에 포함되는 BSP·library·tool과 별도 상업 package까지 같은 조건이라고 해석하지 않습니다. 법적 의무 판단은 실제 선택한 revision의 license/notice와 계약으로 확인합니다.

Arm은 Mbed platform/OS의 2026년 7월 EOL을 공지했습니다. 2026-10-23 검토 시점에는 이를 미래 예정처럼 설명하지 않습니다. 기존 image·source·offline toolchain·dependency 보존과 유지 경로를 별도로 확인합니다.

## 결정 축

### 1. 프로젝트 규모

source LoC 구간으로 RTOS를 배정하지 않습니다. 필수 driver·network/BLE/TLS·filesystem·update·diagnostic·격리 기능과 동시 task 수를 정한 뒤 같은 board에서 최소 대표 image를 만듭니다. kernel-only 크기와 필요한 middleware까지 포함한 최종 image를 각각 기록합니다.

### 2. 하드웨어 클래스

CPU 이름만으로 지원을 확정하지 않습니다. exact SoC/board·compiler ABI·interrupt/timer·FPU/vector·SMP/MPU/TrustZone·debug와 driver 지원 release를 확인합니다. M33/M55/M85가 들어 있다는 사실만으로 SMP나 TF-M이 준비되지는 않습니다.

이미 지원되는 port인지, 사내 port 검증을 누가 유지할지, 필요한 peripheral·sleep·boot/update 경로가 동작하는지를 우선 비교합니다.

### 3. 인증 요구

인증/qualification 산출물은 **제품 variant·version·target·toolchain·configuration·사용 가정**에 묶입니다. 일반 OSS kernel과 특정 안전 package를 같은 인증 제품으로 취급하지 않습니다. certificate 이름과 application 전체의 적합성도 구분합니다.

요구되는 산출물·traceability·변경 통제·known issue·검증 책임과 공급자 지원 범위를 구체적으로 받아 비교합니다. RTOS 제품명만으로 ASIL/SIL/DAL이나 의료 class별 추천을 확정하지 않습니다. patch가 언제나 자동 무효이거나 원본 binary면 전체 제품 인증이 유지된다는 규칙도 없습니다. 변경 영향과 실제 assurance 범위에 따라 판단합니다.

통일된 인증 비용 시세를 이 글에서 조사하지 않았으므로 수만~수십만 달러 표는 제시하지 않습니다.

### 4. 라이선스

license, commercial support, safety package, redistribution 범위와 component별 notice를 따로 수집합니다. 무료 source가 있다는 사실과 유지·support/평가 산출물 비용이 0이라는 것은 다릅니다.

GPL 또는 MIT/Apache 같은 label 하나로 proprietary 제품의 모든 코드 공개 의무·배포 가능 여부를 결론내리지 않습니다. 실제 결합·배포 방식과 적용 원문/계약의 검토가 필요합니다. 이 절은 확인 자료를 모으는 절차입니다.

### 5. Ecosystem

보유 driver와 필수 component의 실제 지원 상태, maintainer·LTS/security backport, debugger/trace와 CI·재현 build를 확인합니다. built-in이라는 표시는 board에서 기능·전력·성능·장기 유지가 검증되었다는 뜻이 아닙니다.

팀의 기존 코드와 해당 버전의 문서·진단 tooling을 작은 prototype에서 함께 평가합니다. 국가·vendor·인기 순위만으로 ecosystem을 점수화하지 않습니다.

### 6. 실시간 성능 — 같은 조건에서 측정

RTOS별 10–20 cycle ISR, 20–60 cycle switch 표에는 source·board·compiler·IRQ mask·FP·workload가 없어 비교 근거로 사용할 수 없습니다. hardware exception 진입과 application ISR 완료·task wake·end-to-end deadline도 서로 다른 지표입니다.

대표 정상 부하, IRQ/DMA burst·queue full·timeout·memory pressure·update/diagnostic 경로에서 latency 분포와 관찰 최대, missed deadline을 수집합니다. 관찰 max를 입증된 WCET로 부르지 않습니다. 모두 sub-µs이고 큰 차이가 없다는 결론이나 OS 이름별 고정 deadline 경계는 사용하지 않습니다.

### 7. POSIX 호환성

필수 API·option·errno·signal/thread semantics·resource limit와 build mode를 목록으로 고정합니다. Full/partial이라는 한 단어가 Linux syscall ABI·모든 source 호환·실제 POSIX certification을 함께 뜻하지는 않습니다. 사용 경로를 정상/실패 예제로 port별 확인합니다.

## 시나리오별 확인 질문

| 시나리오 | 비교를 결정하는 구체 조건 |
|---|---|
| 배터리 sensor/wearable | exact radio/controller·TLS·sleep/wake·update·전류와 image 크기 |
| 자동차/항공/산업/의료 | 실제 safety/security 요구·target qualification·partition/간섭과 변경 책임 |
| PLC/robot/control | end-to-end deadline·driver/fieldbus·IRQ/DMA burst·fault 복구 |
| Edge AI/heterogeneous | accelerator driver·Linux/RTOS 역할·shared memory와 reset/lifetime |
| Drone/PX4 | 해당 flight-controller target·PX4 release·NuttX/host simulation 지원과 실제 timing |
| 기존 vendor/지역 생태계 | 실제 BSP·유지보수 계약·언어·도구·팀 경험 |

예를 들어 POSIX API가 많으면 NuttX나 POSIX 지원 OS를 후보에 넣을 수 있지만 목록만으로 1위를 정하지 않습니다. Linux와 별도 RT core를 조합해도 shared memory/DMA/IRQ 격리와 통신 deadline을 검증해야 합니다.

NASA Ingenuity의 NuttX 채택이라는 출처 불명 인용은 선택 근거에서 제외합니다. [다음 NuttX 글](/blog/embedded/rtos/practical-internals/part5-06-nuttx)은 PX4와 build/API 경계를 중심으로 설명합니다.

## Total Cost of Ownership

license/support·driver 통합·보안 유지·검증/qualification·toolchain/CI·교육·migration·장기 공급과 종료 대응을 분리해 견적냅니다. open source면 LTS가 자동 보장되거나 commercial이면 모든 인증/교육 비용이 포함된다는 가정은 하지 않습니다.

prototype에서 측정한 통합 시간과 재현 가능한 build/운영 workload, 필요한 계약 견적을 비교합니다. 공급자 변경·API migration·data/firmware 복구의 exit 비용도 포함합니다.

## Soft Factors

기술 사양 외에 결정에 영향을 주는 요소가 따로 있습니다.

1. 벤더 신뢰성과 long-term support
2. 엔지니어 채용 가능성 — 흔한 RTOS는 채용이 쉬움
3. Tooling — debugger·trace·analyzer 통합도
4. Documentation 품질과 언어 (영문·한국어·중국어)
5. Community·forum 활성도
6. 사내 기존 자산과의 호환성

특히 *엔지니어 채용*은 자주 간과되는 축입니다. 매우 마이너한 RTOS를 선택하면 인력 확보가 장기 비용으로 돌아옵니다.

## 자주 보는 함정

- kernel-only 최소 크기와 실제 필수 middleware image를 혼동하지 않습니다.
- 인증 label을 전체 application의 적합성으로 확대하지 않습니다.
- 고정 cycle/µs·인기·채택 사례 하나로 deadline을 보증하지 않습니다.
- support 기간과 offline build·dependency 보존을 나중으로 미루지 않습니다.

## 정리

후보는 실제 board와 필수 기능·실패 경로로 비교합니다. source/release·config·측정 조건·계약/assurance 범위를 기록하고, 확인하지 않은 값은 확인 대기 상태로 남깁니다. 선택 뒤에도 driver·security update와 변경 검증의 책임을 명확히 합니다.

## 근거 자료

- [FreeRTOS V11.2.0](https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0), [Zephyr v3.7.0](https://github.com/zephyrproject-rtos/zephyr/tree/v3.7.0), [RT-Thread v5.1.0](https://github.com/RT-Thread/rt-thread/tree/v5.1.0).
- [Eclipse ThreadX license](https://github.com/eclipse-threadx/threadx/blob/master/LICENSE.txt), [NuttX 소개/지원 범위](https://nuttx.apache.org/docs/latest/introduction/about.html).
- [Arm Mbed 공식 안내 목록](https://forums.mbed.com/latest): EOL 공지. archive/redirect 상태와 offline 유지 경로를 함께 확인합니다.
- [PX4 architecture](https://docs.px4.io/v1.15/en/concept/architecture): NuttX와 Linux simulation 경계.



다음 편은 [5-06 Apache NuttX](/blog/embedded/rtos/practical-internals/part5-06-nuttx)에서 PX4와 NASA Ingenuity가 선택한 POSIX RTOS를 봅니다.

## 관련 항목

- [5-01: FreeRTOS 소스 분석](/blog/embedded/rtos/practical-internals/part5-01-freertos-source)
- [5-02: Zephyr 커널 분석](/blog/embedded/rtos/practical-internals/part5-02-zephyr-source)
- [5-03: RT-Thread](/blog/embedded/rtos/practical-internals/part5-03-rt-thread)
- [5-06: Apache NuttX](/blog/embedded/rtos/practical-internals/part5-06-nuttx)
- [5-07: PREEMPT_RT Linux](/blog/embedded/rtos/practical-internals/part5-07-preempt-rt-linux)
