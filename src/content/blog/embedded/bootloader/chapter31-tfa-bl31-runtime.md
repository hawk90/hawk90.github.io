---
title: "TF-A BL31 EL3 Runtime — 서비스 등록과 요청 처리 경계"
slug: "embedded/bootloader/chapter31-tfa-bl31-runtime"
date: 2026-05-22T09:31:00
description: "TF-A BL31의 EL3 runtime service 등록과 SMCCC 요청 처리 경계, 표준 서비스와 플랫폼별 구현을 구분합니다."
series: "Bootloader Internals"
seriesOrder: 31
tags: [embedded, bootloader, tf-a, bl31, el3, psci, sdei, ras, smccc, arm]
topics: ["embedded"]
---

## 한 줄 요약

> BL31은 TF-A 구성에서 EL3에 배치되는 런타임 펌웨어이며, PSCI 같은 표준 서비스와 플랫폼별 동작을 연결합니다. 어떤 서비스와 초기화 경로가 실제 이미지에 들어가는지는 빌드 구성과 플랫폼 포트에 달려 있습니다.

[Ch 25](/blog/embedded/bootloader/chapter25-tfa-optee)에서 부트 단계의 BL31 역할을 살펴봤습니다. 여기서는 TF-A의 EL3 런타임 서비스 프레임워크가 무엇을 보장하고, 무엇을 플랫폼 또는 개별 서비스 구현에 맡기는지 구분합니다.

## BL31의 역할과 경계

TF-A는 EL3에서 실행되는 Secure Monitor를 제공하고, 표준 인터페이스의 참조 구현을 포함합니다. BL31은 정상 세계 운영체제에 서비스를 제공할 수 있지만, “모든 시스템에서 같은 구성의 작은 운영체제”라고 볼 수는 없습니다. 포함되는 서비스, 보안 상태 전환, 전원 제어, 메모리 배치는 SoC와 빌드 설정에 따라 달라집니다.

따라서 다음을 보편적 사실로 단정하면 안 됩니다.

- BL31이 항상 특정 DRAM 주소나 고정 크기의 carveout에 놓인다는 주장
- 모든 제품에서 PSCI, SDEI, RAS, Trusted OS dispatcher가 동시에 등록된다는 주장
- SMC 왕복에 일정한 시간만 걸린다는 주장
- BL31이 반드시 BL33을 EL2로 진입시킨다는 주장

메모리 보안 영역과 다음 이미지의 실행 상태는 해당 보드의 메모리 지도, 펌웨어 설정, 부트 이미지 정보를 함께 확인해야 합니다.

## 런타임 서비스 등록

TF-A의 EL3 runtime service writer’s guide는 `DECLARE_RT_SVC()`를 서비스 등록 방식으로 설명합니다. 선언은 서비스 이름, 처리할 OEN 범위, 호출 유형, 초기화 함수, 호출 핸들러를 연결합니다. BL31 링커 스크립트는 선언된 descriptor들을 모으고, 초기화 프레임워크는 descriptor를 검증하고 초기화 함수를 실행한 뒤 런타임 조회 정보를 구성합니다.

```c
/* 개념 예시: 값과 함수는 해당 서비스의 ABI·TF-A 버전을 확인해야 한다. */
DECLARE_RT_SVC(
    example_service,
    OEN_EXAMPLE_START,
    OEN_EXAMPLE_END,
    SMC_TYPE_FAST,
    example_service_setup,
    example_service_handler
);
```

이 예시는 등록 모델을 보여 줄 뿐, 그대로 빌드할 수 있는 서비스 구현은 아닙니다. OEN 중복 같은 잘못된 descriptor는 초기화 실패나 예측할 수 없는 동작으로 이어질 수 있습니다. 사용자 정의 서비스를 추가할 때는 사용 중인 TF-A 릴리스의 writer’s guide와 해당 버전의 헤더·링커 스크립트를 기준으로 확인해야 합니다.

## 호출 경계

정상 세계나 보안 세계의 낮은 exception level에서 `SMC`를 실행하면, CPU와 실행 환경이 정의한 예외 경로를 통해 펌웨어에 요청이 전달됩니다. SMCCC는 function identifier, 인자와 결과를 전달하는 규약을 정의하고, 개별 서비스 규격은 그 값의 의미와 지원 여부를 정의합니다.

TF-A의 runtime service 프레임워크는 등록된 descriptor와 function identifier를 바탕으로 알맞은 handler에 요청을 넘깁니다. 이 개념적 경로를 특정 어셈블리 함수명이나 정확한 레지스터 저장 순서로 일반화하지 마세요. 예외 벡터, context 관리, dispatcher 내부는 TF-A 릴리스와 실행 상태에 따라 확인해야 하는 구현 세부입니다.

![SMC dispatcher 흐름 — EL1에서 EL3로, vector entry에서 service handler까지](/images/blog/bootloader/diagrams/chapter31-smc-dispatcher.svg)

## 표준 서비스와 플랫폼별 서비스

PSCI는 CPU 시작·정지와 전원 상태 전환을 위한 표준 펌웨어 인터페이스입니다. TF-A는 PSCI 구현을 제공하지만, 실제 전원 도메인 전환은 플랫폼 전원관리 코드와 하드웨어에 연결됩니다. 세부 API와 호출 의미는 [Ch 32](/blog/embedded/bootloader/chapter32-psci-smccc)에서 다룹니다.

SDEI는 시스템 오류나 인터럽트 등의 이벤트를 소프트웨어에 전달하기 위한 별도 표준 인터페이스입니다. RAS 오류 처리와 상호작용할 수 있지만, “모든 ECC 오류가 BL31에서 수집되어 SDEI로 전달된다”는 보장은 없습니다. 플랫폼의 오류 소유권, RAS 구성, 이벤트 등록과 운영체제 지원을 확인해야 합니다.

SoC별 서비스는 제조사 정의 인터페이스를 쓸 수 있으며, Trusted OS dispatch도 별도의 구성과 ABI를 따릅니다. OEN이나 function identifier 하나만 보고 해당 서비스가 모든 TF-A 제품에 포함된다고 추론할 수 없습니다.

## 조사 순서

1. 제품에 사용된 TF-A 릴리스와 플랫폼 포트를 특정합니다.
2. 빌드 설정과 링크된 이미지에서 runtime service descriptor 및 관련 구현을 확인합니다.
3. 호출하는 운영체제 드라이버와 서비스 규격을 대조합니다.
4. 보드의 메모리 지도, 보안 컨트롤러 설정, 부트 이미지 정보를 확인해 실제 주소와 권한 경계를 확인합니다.
5. 실기 계측이 필요하면 타이머, CPU 주파수, 호출 상태, 펌웨어 빌드와 측정 구간을 기록합니다. 근거가 없는 latency 숫자를 다른 보드에 적용하지 않습니다.

이 작업에서는 특정 보드의 TF-A tree나 ELF를 대상으로 빌드·실행·계측하지 않았습니다. 따라서 특정 OEN 표, 주소, stack 크기, dispatcher 비용을 결과로 제시하지 않습니다.

## 정리

- BL31은 TF-A의 EL3 런타임 구성 요소지만, 서비스와 플랫폼 동작은 빌드·포트에 따라 다릅니다.
- `DECLARE_RT_SVC()`는 서비스 descriptor를 등록하는 TF-A 프레임워크의 일부입니다. 세부 구현은 해당 릴리스에서 확인해야 합니다.
- SMCCC는 호출 전달 규약이고, PSCI·SDEI 등은 각자의 서비스 계약을 정의합니다.
- 메모리 주소, 전원 제어 동작, 서비스 포함 여부와 성능은 보드·펌웨어 이미지에서 확인해야 합니다.

## 다음 편

[Ch 32: PSCI와 SMCCC ABI](/blog/embedded/bootloader/chapter32-psci-smccc)에서는 호출 규약과 CPU 전원관리 인터페이스의 책임을 나눠 살펴봅니다.

## 관련 항목

- [Ch 4: 부트 단계 — BL1 → SPL → TPL → U-Boot Proper](/blog/embedded/bootloader/chapter04-boot-stages)
- [Ch 25: ARM TF-A 통합 — BL1·BL2·BL31·BL32·BL33](/blog/embedded/bootloader/chapter25-tfa-optee)
- [Ch 32: PSCI / SMCCC ABI](/blog/embedded/bootloader/chapter32-psci-smccc)
- [Ch 33: SMP secondary CPU bring-up](/blog/embedded/bootloader/chapter33-smp-secondary-cpu-bringup)
- [Embedded Security Ch 4: TrustZone](/blog/embedded/embedded-security/chapter04-trustzone)
- [Embedded Security Ch 5: TEE / OP-TEE](/blog/embedded/embedded-security/chapter05-tee)
- [Practical RTOS Internals Ch 4-11: TrustZone-M과 TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
- [TF-A EL3 Runtime Service Writer’s Guide](https://trustedfirmware-a.readthedocs.io/en/latest/getting_started/rt-svc-writers-guide.html)
- [TF-A Firmware Design](https://trustedfirmware-a.readthedocs.io/en/stable/design/firmware-design.html)
