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

> **"RTOS 선택은 footprint·certification·ecosystem 세 축의 trade-off입니다."** — 세 축 모두 후보의 이름이 아니라 같은 board에서 만든 image와 원문 문서로 비교합니다.

## 어떤 문제를 푸는가

RTOS를 고르면 driver 통합, 빌드 인프라, 인증 산출물이 그 RTOS에 맞춰 쌓이므로 나중에 바꾸기 어렵습니다. 집을 고를 때 평면도만 보지 말고 직접 가서 물을 틀어 보는 것처럼, 후보마다 같은 board에서 작은 image를 직접 만들어 보는 것이 이 글의 방법입니다.

이 시리즈에서 FreeRTOS V11.2.0, Zephyr v3.7.0, RT-Thread v5.1.0을 실제로 빌드해 돌렸습니다(5-01~5-03). 이 글은 그 결과에서 비교에 쓸 수 있는 숫자와, 원문으로 확인한 license·지원 상태를 모읍니다. 시나리오별 검증 질문도 정리하지만 정답 RTOS를 고르지는 않습니다.

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

core license는 저장소의 license 파일에서 확인했습니다. FreeRTOS V11.2.0 `LICENSE.md`와 Eclipse ThreadX `LICENSE.txt`(master)는 MIT, Zephyr v3.7.0 `LICENSE`와 RT-Thread v5.1.0 `LICENSE`는 Apache License 2.0입니다. 같은 저장소 안의 vendor HAL이나 module은 자기 license 파일을 따로 가질 수 있으므로, 배포할 image에 들어가는 component마다 license 파일을 모읍니다. 이 글은 법적 판단을 하지 않습니다.

Arm Mbed는 이미 끝났습니다. `os.mbed.com`(현재 `github.com/ArmMbed`로 redirect) 페이지는 "Mbed was sunsetted in July 2026"이고, Mbed OS source는 공개로 남지만 Arm이 더는 유지·지원하지 않는다고 적습니다(2026-11-16 확인). 기존 Mbed 제품은 source와 offline toolchain을 직접 보관해야 합니다.

## 결정 축

### 1. 프로젝트 규모

크기는 같은 core·같은 compiler·같은 최적화로 만든 image로 비교합니다. Debian 13 guest의 `arm-none-eabi-gcc` 14.2.1로 Cortex-M3용 "hello" 두 개를 만들었습니다.

| image | text | data | bss | 포함된 것 |
| --- | --- | --- | --- | --- |
| Zephyr v3.7.0 `samples/hello_world`, `qemu_cortex_m3` | 8596 | 386 | 4014 | 커널, `printk`, UART driver, `-Os`(`CONFIG_SIZE_OPTIMIZATIONS=y`) |
| FreeRTOS V11.2.0 harness `hello.c`, `ARM_CM3` | 10568 | 4 | 65952 | 커널, timer task, heap_4, 이 harness의 `printf`, `-Os -ffunction-sections -Wl,--gc-sections` |

FreeRTOS 쪽 bss의 대부분은 64 KiB `ucHeap`이고, text에는 이 harness가 직접 쓴 `vsnprintf()`(746 byte)와 64-bit 나눗셈 helper `__udivmoddi4`(754 byte)가 들어 있습니다. 두 image는 출력 경로(UART driver 대 semihosting)도 다릅니다. 이렇게 조건을 하나씩 적어 두지 않으면 크기 숫자는 비교가 되지 않습니다. 실제 선택에서는 필요한 driver·network·file system까지 넣은 image로 같은 표를 만듭니다. Zephyr image는 QEMU `lm3s6965evb`에서 부팅 배너까지 확인했습니다.

```text
*** Booting Zephyr OS build 3.7.0 ***
```

### 2. 하드웨어 클래스

core 이름이 아니라 board가 지원되는지 봅니다. 5-02에서 Zephyr의 `nucleo_f407g`라는 board 이름이 v3.7.0에 없었던 것처럼, 같은 MCU라도 board 정의가 있어야 바로 빌드됩니다. FreeRTOS V11.2.0에서 SMP를 쓸 수 있는 port가 셋뿐이었던 것(4-07)처럼, 기능 지원도 port마다 다릅니다. 없으면 port를 직접 쓰고 유지해야 합니다(5-04).

### 3. 인증 요구

기능 안전 인증이 필요하면, 후보 RTOS 공급자에게 그 표준의 인증서나 산출물이 어느 version·target·toolchain·설정에 대한 것인지 문서로 받습니다. 이 글은 각 RTOS의 인증 상태를 원문으로 확인하지 않아 표에 넣지 않았고, 예전 판의 인증 비용 표도 출처가 없어 지웠습니다. 보안 인증은 4-11의 PSA Certified 등급이 한 예입니다.

### 4. 라이선스

앞 표의 MIT·Apache-2.0 확인처럼, license는 이름이 아니라 그 revision의 파일 원문으로 모읍니다. 상용 지원 계약과 안전 package는 license와 별도 문서입니다.

### 5. Ecosystem

이 시리즈의 빌드 경험이 ecosystem 차이를 보여 줍니다. Zephyr는 host gcc만으로 native_sim을 돌릴 수 있었고, Cortex-M3 board는 west manifest가 지정한 revision의 cmsis module을 함께 받아 빌드했습니다. RT-Thread는 QEMU BSP가 scons 한 번에 빌드됐지만 Linux simulator BSP는 glibc header 충돌로 빌드되지 않았습니다(5-03). FreeRTOS는 커널만 있어 libc·startup을 직접 채워야 했습니다(5-04). 후보마다 이런 하루짜리 prototype을 만들어 보면 문서로는 안 보이는 비용이 드러납니다.

### 6. 실시간 성능 — 같은 조건에서 측정

예전 판의 "RTOS별 10–20 cycle ISR, 20–60 cycle switch" 표는 board·compiler·측정 방법이 없어 지웠습니다. 이 글에서도 실리콘에서 재지 않았습니다. 비교하려면 같은 board에서 같은 ISR → task wake 경로를 cycle counter로 재고, 평균이 아니라 분포와 최댓값을 남깁니다. 5-07에서 Linux의 `cyclictest`가 그런 측정의 예입니다.

### 7. POSIX 호환성

쓰려는 POSIX 함수를 목록으로 적고, 후보마다 그 함수가 있는지 소스에서 찾습니다. Zephyr는 `lib/posix/`(5-02), RT-Thread는 `components/libc/posix/`(5-03)에 있고, NuttX는 POSIX를 기본 API로 삼습니다(5-06). FreeRTOS 커널 저장소에는 POSIX 계층이 없습니다.

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

채택 사례는 선택 근거로 쓰지 않았습니다. [다음 NuttX 글](/blog/embedded/rtos/practical-internals/part5-06-nuttx)은 PX4와 build/API 경계를 중심으로 설명합니다.

## Total Cost of Ownership

비용은 license 비용, 지원 계약, driver 통합 시간, 보안 update를 따라가는 시간, 인증 산출물, 그리고 나중에 바꿀 때의 비용으로 나눠 견적합니다. Mbed처럼 platform이 끝나면(앞 절) 마지막 항목이 실제 비용이 됩니다.

## Soft Factors

기술 사양 외에 결정에 영향을 주는 요소가 따로 있습니다.

1. 공급자의 long-term support 기간과 보안 update 정책
2. 팀이 이미 아는 RTOS인지
3. Tooling: debugger의 RTOS awareness, trace 도구
4. 문서의 언어와 버전 일치(3-05의 `CONFIG_PRIORITY_CEILING` 기본값처럼 문서와 코드가 어긋나는 경우도 있습니다)
5. 사내 기존 코드와의 호환성

## 자주 보는 함정

- 서로 다른 조건의 image 크기를 비교합니다. 위 표의 bss가 16배 차이 나는 것은 대부분 RTOS가 아니라 FreeRTOS 쪽의 64 KiB heap 설정 때문입니다.
- 문서에서 본 board 이름을 그대로 믿습니다. `nucleo_f407g`처럼 없을 수 있습니다.
- 끝난 platform(Mbed)의 source와 toolchain을 보관하지 않습니다.

## 정리

- 같은 compiler(arm-none-eabi-gcc 14.2.1)로 만든 Cortex-M3 hello는 Zephyr text 8596 byte, FreeRTOS(이 harness) 10568 byte였고, 조건 차이를 함께 적어야 비교가 됩니다.
- core license는 FreeRTOS·ThreadX MIT, Zephyr·RT-Thread Apache-2.0입니다(각 revision의 license 파일).
- Arm Mbed는 2026년 7월에 끝났습니다(github.com/ArmMbed).
- 하루짜리 prototype 빌드에서 board 이름, module, libc 같은 숨은 비용이 드러났습니다.
- 인증·latency는 공급자 문서와 같은 board 측정으로 따로 확인합니다.

## 근거 자료

- [FreeRTOS V11.2.0](https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0), [Zephyr v3.7.0](https://github.com/zephyrproject-rtos/zephyr/tree/v3.7.0), [RT-Thread v5.1.0](https://github.com/RT-Thread/rt-thread/tree/v5.1.0).
- [Eclipse ThreadX license](https://github.com/eclipse-threadx/threadx/blob/master/LICENSE.txt), [NuttX 소개/지원 범위](https://nuttx.apache.org/docs/latest/introduction/about.html).
- [Arm Mbed](https://github.com/ArmMbed): sunset 안내(2026-11-16 확인).
- [PX4 architecture](https://docs.px4.io/v1.15/en/concept/architecture): NuttX와 Linux simulation 경계.



다음 편은 [5-06 Apache NuttX](/blog/embedded/rtos/practical-internals/part5-06-nuttx)에서 PX4가 쓰는 POSIX RTOS를 봅니다.

## 관련 항목

- [5-01: FreeRTOS 소스 분석](/blog/embedded/rtos/practical-internals/part5-01-freertos-source)
- [5-02: Zephyr 커널 분석](/blog/embedded/rtos/practical-internals/part5-02-zephyr-source)
- [5-03: RT-Thread](/blog/embedded/rtos/practical-internals/part5-03-rt-thread)
- [5-06: Apache NuttX](/blog/embedded/rtos/practical-internals/part5-06-nuttx)
- [5-07: PREEMPT_RT Linux](/blog/embedded/rtos/practical-internals/part5-07-preempt-rt-linux)
