---
title: "RTOS 선택 가이드 — Footprint·License·Certification·Ecosystem"
date: 2026-05-08T09:50:00
description: "FreeRTOS·Zephyr·ThreadX·RT-Thread·NuttX·VxWorks·QNX·INTEGRITY·SafeRTOS·µC/OS·PX5를 한 표에 모아 비교합니다. IoT·자동차·항공·산업·의료·웨어러블·드론별 추천과 결정 기준을 정리합니다."
series: "Practical RTOS Internals"
seriesOrder: 50
tags: [selection, comparison, freertos, zephyr, vxworks, qnx, integrity]
---

## 한 줄 요약

> **"RTOS 선택은 footprint·certification·ecosystem 세 축의 trade-off입니다."** — 어느 한 축에서 정답이 나오지 않습니다. 모든 결정이 *프로젝트 컨텍스트의 함수*입니다.

## 어떤 문제를 푸는가

새 프로젝트를 시작할 때 가장 빨리 굳혀야 하는 결정 중 하나가 RTOS 선택입니다. 한 번 정하면 *수년 단위로* 바꾸기 어렵습니다. 드라이버 통합, 인증, 엔지니어 채용, 빌드 인프라가 모두 따라옵니다.

이 글의 목표는 두 가지입니다. 첫째, 자주 후보에 오르는 RTOS를 *한 표에 모아* 같은 축으로 비교합니다. 둘째, IoT 센서부터 자동차 ECU, 항공 FCC, 산업 PLC, 의료 기기, 드론, 웨어러블까지 *사용 시나리오별로 추천*을 정리합니다. 마지막으로 흔히 빠지는 함정 몇 가지를 짚습니다.

여기서 정답은 제시하지 않습니다. *기준과 trade-off를 명확히* 하는 것이 목표입니다.

## 주요 RTOS 한 표

| RTOS | License | Footprint | SMP | Certification | Ecosystem |
|---|---|---|---|---|---|
| FreeRTOS | MIT | 4-10 KB | v11+ | SafeRTOS (상업 fork) | 매우 큼 |
| Zephyr | Apache 2.0 | 8-50 KB | ✓ | DO-178C 진행 | 매우 큼·LF |
| Eclipse ThreadX (구 Azure RTOS) | MIT (2024 오픈소스) | 2-15 KB | optional | IEC 61508·ISO 26262 | Eclipse Foundation |
| RT-Thread | Apache 2.0 | 4-50 KB | ✓ | 일부 | 중국 dominant |
| NuttX | Apache 2.0 | 8-100 KB | ✓ | DO-178C optional | PX4·NASA |
| VxWorks | commercial | 50-500 KB | ✓ | DO-178C·ISO 26262 | Wind River |
| QNX | commercial | 100 KB+ | ✓ | ASIL D·DO-178C | BlackBerry |
| INTEGRITY | commercial | 50 KB+ | ✓ | DO-178C Level A·EAL 6+ | Green Hills |
| SafeRTOS | commercial | 6 KB+ | × | IEC 61508·ISO 26262 | WHIS |
| µC/OS (Micrium) | Apache 2.0 (2020 오픈소스) | 5-15 KB | optional | IEC 62304 | Weston Embedded |
| PX5 | commercial | 1-5 KB | × | DO-178C 진행 | 2024년 신규 |

> 참고 — Arm Mbed OS는 2026년 7월 EOL이 공식 예고되어 *신규 프로젝트에는 권장되지 않습니다*. 기존 프로젝트는 Zephyr나 FreeRTOS로의 이전 경로를 미리 계획해 두는 편이 안전합니다.

## 결정 축

### 1. 프로젝트 규모

1K LoC 미만, 작은 센서

- FreeRTOS·ThreadX·µC/OS — overhead 최소, 빌드 단순

1K - 10K LoC, IoT 게이트웨이급

- FreeRTOS+ (TCP·TLS 추가)
- Zephyr — Network·BLE 통합 우수
- RT-Thread — 중국 MCU 사용 시

10K+ LoC, 풍부한 서브시스템 필요

- Zephyr — Linux-like ecosystem
- RT-Thread Smart — POSIX + MMU
- NuttX — POSIX 완전 호환

### 2. 하드웨어 클래스

| HW | 추천 RTOS |
|---|---|
| Cortex-M0/M3 | FreeRTOS·ThreadX·µC/OS (footprint 우선) |
| Cortex-M4/M7 | + Zephyr·RT-Thread |
| Cortex-M33 | + TrustZone·TF-M aware |
| Cortex-M55/M85 | + SMP variant |
| Cortex-R52 | + AUTOSAR OS·SafeRTOS (lock-step) |
| Cortex-A | Zephyr·VxWorks·QNX·Linux PREEMPT_RT |
| RISC-V | Zephyr·FreeRTOS·RT-Thread·NuttX |

### 3. 인증 요구

자동차 (ISO 26262)

- ASIL-B/C — FreeRTOS + SafeRTOS fork, AUTOSAR OS
- ASIL-D — AUTOSAR OS, QNX, INTEGRITY, ThreadX 일부

항공 (DO-178C)

- Level D/C — Zephyr·FreeRTOS+ 인증 패키지
- Level B — QNX·INTEGRITY·VxWorks·µC/OS-III
- Level A — INTEGRITY (Cortex-A·R), VxWorks 일부

의료 (IEC 62304) — µC/OS-III, Zephyr, ThreadX, INTEGRITY.

산업 (IEC 61508) — SafeRTOS (SIL 3), µC/OS-III, INTEGRITY.

인증 비용은 수만 ~ 수십만 달러 단위입니다. *인증된 RTOS를 그대로 사용*하더라도 application 측 코드 변경 후에는 별도 audit이 필요합니다.

### 4. 라이선스

무료·open source

- FreeRTOS (MIT)
- Zephyr·NuttX·RT-Thread (Apache 2.0)
- Eclipse ThreadX (MIT) — 구 Azure RTOS, Microsoft가 2024년 Eclipse로 기증
- µC/OS (Apache 2.0) — 2020년 오픈소스화, Weston Embedded 관리
- eCos (modified GPL)
- Linux PREEMPT_RT (GPL)

Commercial (라이선스 또는 인증 패키지 유료)

- VxWorks·QNX·INTEGRITY — 수만~수십만 달러
- SafeRTOS — 수만 달러
- µC/OS-III 안전 인증 패키지(Weston Embedded) — 별도 유료
- PX5 — 신규 상업 옵션

GPL은 임베디드 제품 distribution 시 *소스 공개 의무*가 따라옵니다. 자동차·proprietary 시스템에서는 Apache 2.0 또는 MIT가 일반적인 선택입니다.

### 5. Ecosystem

Driver·Network·BLE·USB 통합

- **Zephyr** — built-in (Matter·Thread·BLE Mesh 표준)
- **RT-Thread** — components 통합 (DFS·LwIP·POSIX·FinSH)
- **ThreadX** — Azure/Eclipse component
- **FreeRTOS** — 외부 (FreeRTOS+TCP·TLS 별도)
- **VxWorks** — 상업적 통합

IDE

- VS Code + extension (universal)
- STM32CubeIDE (FreeRTOS·Zephyr 일부)
- RT-Thread Studio (RT-Thread)
- Wind River Workbench (VxWorks)
- QNX Momentics (QNX)
- MULTI (INTEGRITY)

### 6. 실시간 성능 — 큰 차이 없음

ISR latency (Cortex-M4 168 MHz)

| RTOS | Cycle | 대략 |
|---|---|---|
| FreeRTOS | 12-15 | ~80 ns |
| ThreadX | 10-12 | ~70 ns |
| Zephyr | 15-20 | ~100 ns |
| RT-Thread | 12-15 | ~80 ns |

Context switch

| RTOS | Cycle |
|---|---|
| FreeRTOS | 30-50 |
| ThreadX | 20-30 |
| Zephyr | 40-60 |
| RT-Thread | 30-40 |

모두 *sub-µs* 영역입니다. 실시간 성능만으로는 결정적인 차이가 거의 나지 않습니다. 다른 축이 의사결정을 지배합니다.

### 7. POSIX 호환성

Full POSIX

- QNX (POSIX 1003.1)
- INTEGRITY (POSIX + ARINC-653)
- Linux PREEMPT_RT
- RT-Thread Smart
- NuttX (가장 가까운 임베디드 POSIX)

Partial POSIX

- Zephyr (subsys/posix)
- FreeRTOS (FreeRTOS-POSIX add-on)

No POSIX

- ThreadX (자체 API)
- µC/OS (자체 API)

POSIX 호환은 *Linux 코드 재활용*에 직접 영향을 줍니다. ROS 2 통합, MAVLink 사용, 자동차 인포테인먼트에서 가치가 큽니다.

## 시나리오별 추천

### IoT 센서 — 배터리 구동, Cortex-M0/M3

요구 — 작은 footprint, 저전력, BLE·Wi-Fi.

1. Zephyr — Nordic·Espressif 표준, Matter 채택
2. FreeRTOS — 단순함, 가장 큰 채용 풀
3. RT-Thread — 중국 MCU·OneNET 사용 시

### 자동차 ECU — ASIL-B/C/D

요구 — 인증, 결정성, AUTOSAR.

1. AUTOSAR OS (Vector·EB·ETAS) — 표준
2. QNX·INTEGRITY — 고급 인포테인먼트, ADAS
3. SafeRTOS — 작은 ASIL-D ECU
4. ThreadX (ASIL-D 일부)

### 항공·발사체·우주 — DO-178C Level A/B

요구 — 인증, 결정성, 검증 도큐먼트.

1. INTEGRITY — Cortex-A·R fully certified
2. VxWorks — DO-178C optional package
3. µC/OS-III — Level A 가능 (Micrium safety package)
4. SafeRTOS — 작은 시스템

참고 — NASA·SpaceX 일부는 VxWorks 또는 자체 RTOS, NASA Ingenuity Mars helicopter는 NuttX (다음 편).

### 산업 PLC·로봇

요구 — hard real-time, EtherCAT·CANopen·OPC-UA.

1. Linux PREEMPT_RT — 가장 큰 ecosystem, 2024 mainline
2. Zephyr — modern, 통합 IPC
3. QNX·VxWorks — 인증 + 안정성
4. Xenomai 4·EVL — dual-kernel hard RT

### 의료 기기 — IEC 62304 Class B/C

요구 — validation, traceability.

1. µC/OS-III (Micrium) — IEC 62304 표준
2. INTEGRITY·VxWorks — high-end
3. ThreadX·Zephyr — cert 패키지 확인

### 스마트홈·웨어러블

요구 — BLE·Wi-Fi·Matter·Thread, 빠른 개발.

1. Zephyr — Matter 가장 많은 채택, BLE 표준
2. ESP-IDF — ESP32 전용, FreeRTOS 기반
3. Nordic SDK + Zephyr — nRF 시리즈

### Edge AI·자율주행

요구 — heterogeneous (CPU·GPU·NPU), Linux 통신.

1. Linux + PREEMPT_RT — main system
2. Zephyr·FreeRTOS — co-processor (Cortex-R, M)
3. QNX Neutrino — 자동차 ADAS (BMW·Mercedes 채택)
4. NVIDIA DriveOS (QNX 기반)

### 드론·UAV·로봇 — POSIX 친화

요구 — POSIX, MAVLink, ROS 2, 빠른 prototyping.

1. NuttX (PX4 표준) — autopilot
2. Zephyr + micro-ROS — 차세대 노드
3. Linux PREEMPT_RT — 고성능 onboard computer

### 중국 시장·IoT

요구 — 중국 MCU·클라우드 친화 (GD32·HK32·N32·WCH·OneNET).

1. RT-Thread — de facto standard
2. Huawei LiteOS — Huawei ecosystem
3. AliOS Things — Alibaba ecosystem

## Total Cost of Ownership

무료 RTOS (FreeRTOS·Zephyr·RT-Thread·NuttX)

- License $0
- 인증은 별도 (SafeRTOS·WHIS·Yocto-LTS 등)
- 러닝 커브에 엔지니어 시간 투입
- Long-term 생태계 보장 (OSS community)

상업 RTOS (VxWorks·QNX·INTEGRITY·SafeRTOS)

- License 수만~수십만 달러 / project
- Support·training·cert 패키지 포함
- 빠른 개발, 명확한 책임 소재
- 벤더 종속성 부담

스타트업이나 prototyping은 무료 RTOS가 합리적이고, *인증과 책임 소재가 중요한* 양산 enterprise는 상업 RTOS의 가치가 license 비용을 상회하는 경우가 많습니다.

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

> 경고 — Footprint만 보고 선택

"Zephyr는 너무 크다"는 인상으로 FreeRTOS를 골랐는데, 네트워크 스택, BLE, TLS, 파일 시스템을 직접 통합하다 보니 최종 binary는 더 커지고 유지보수 부담만 늘어나는 경우가 흔합니다. *통합 ecosystem 비용*까지 합산해 비교해야 합니다.

> 경고 — 무료라서 선택, 인증에서 막힘

"FreeRTOS 무료니까"로 시작한 safety-critical 프로젝트가 인증 단계에서 *SafeRTOS로의 마이그레이션*을 요구받는 경우가 있습니다. 처음부터 SafeRTOS나 인증 가능한 RTOS를 골랐어야 절감되는 비용이 큽니다.

> 경고 — 모든 feature가 있는 RTOS 욕심

작은 sensor 노드에 Zephyr의 모든 서브시스템을 켰다가 flash가 부족해진 사례가 적지 않습니다. *요구사항을 먼저 명확히* 한 뒤 *최소한의 feature 셋*으로 시작하는 편이 안전합니다.

> 경고 — 인증된 binary에 patch

인증된 RTOS 바이너리에 사내에서 patch를 가하면 *인증이 무효*가 됩니다. 인증 RTOS는 원본 그대로 사용하고, application 측에서 인증 boundary를 우회하지 않도록 설계합니다.

> 경고 — Mbed OS 신규 채택

Arm Mbed OS는 2026년 7월 EOL이 공식화되어 *신규 프로젝트에서는 피해야* 합니다. 기존 프로젝트는 Zephyr나 FreeRTOS로의 이전 경로를 일정에 반영합니다.

## 정리

- RTOS 선택은 *footprint·certification·ecosystem* 세 축의 trade-off이며, 모든 결정이 프로젝트 컨텍스트의 함수입니다.
- 실시간 성능은 주류 RTOS 사이에서 결정적인 차이를 만들지 못합니다. 다른 축이 의사결정을 지배합니다.
- IoT는 FreeRTOS·Zephyr·RT-Thread, 자동차는 AUTOSAR OS·QNX·SafeRTOS·INTEGRITY가 일반적입니다.
- 항공·발사체는 INTEGRITY·VxWorks·µC/OS-III가 인증 부담을 가장 잘 받쳐 줍니다.
- 드론·UAV는 NuttX(PX4)와 Zephyr+micro-ROS가 강합니다.
- 중국 시장은 RT-Thread가 사실상 표준입니다.
- 인증 RTOS는 binary에 손대지 않고 원본 그대로 사용해야 인증 효력이 유지됩니다.
- Mbed OS는 2026-07 EOL이 예고되어 신규 채택을 피합니다.

다음 편은 [5-06 Apache NuttX](/blog/embedded/rtos/practical-internals/part5-06-nuttx)에서 PX4와 NASA Ingenuity가 선택한 POSIX RTOS를 봅니다.

## 관련 항목

- [5-01: FreeRTOS 소스 분석](/blog/embedded/rtos/practical-internals/part5-01-freertos-source)
- [5-02: Zephyr 커널 분석](/blog/embedded/rtos/practical-internals/part5-02-zephyr-source)
- [5-03: RT-Thread](/blog/embedded/rtos/practical-internals/part5-03-rt-thread)
- [5-06: Apache NuttX](/blog/embedded/rtos/practical-internals/part5-06-nuttx)
- [5-07: PREEMPT_RT Linux](/blog/embedded/rtos/practical-internals/part5-07-preempt-rt-linux)
