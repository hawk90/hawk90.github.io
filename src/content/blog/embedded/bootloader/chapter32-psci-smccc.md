---
title: "PSCI와 SMCCC ABI — ARM 표준 SMC 호출 규약 분석"
slug: "embedded/bootloader/chapter32-psci-smccc"
date: 2026-05-22T09:32:00
description: "SMCCC 호출 전달 규약과 PSCI 전원관리 ABI의 책임, CPU_ON 요청과 Linux device tree 연결을 설명합니다."
series: "Bootloader Internals"
seriesOrder: 32
tags: [embedded, bootloader, psci, smccc, arm, tf-a, kernel]
topics: ["embedded"]
---

## 한 줄 요약

> SMCCC는 SMC/HVC 호출의 전달 규약이고, PSCI는 그 규약을 이용해 CPU와 시스템 전원 상태를 요청하는 표준 인터페이스입니다. 호출 ID와 기능 지원 여부는 적용 규격 버전과 펌웨어 구현을 기준으로 확인해야 합니다.

[Ch 31](/blog/embedded/bootloader/chapter31-tfa-bl31-runtime)에서 BL31 런타임 서비스가 요청을 처리하는 개념을 봤습니다. 이 장에서는 SMCCC와 PSCI의 경계를 나누고, Linux에서 호출이 펌웨어까지 연결되는 지점을 정리합니다.

## SMCCC: 호출 전달 규약

SMCCC(SMC Calling Convention)는 호출자가 function identifier와 인자를 전달하고 결과를 받는 규약입니다. `SMC`는 EL3 모니터로, `HVC`는 하이퍼바이저로 요청을 전달하는 데 쓰일 수 있습니다. 어떤 명령을 사용하는지는 실행 환경과 펌웨어가 제공하는 conduit에 달려 있습니다.

호출자는 임의의 숫자를 function identifier로 만들어 표준 서비스인 것처럼 호출하면 안 됩니다. 식별자의 비트 해석은 규격 버전에 정의돼 있으며, service가 어떤 인자·결과·오류 코드를 사용하는지는 그 service의 별도 ABI가 정합니다. 등록된 서비스가 없거나 기능이 지원되지 않을 때의 결과도 임의로 추정하지 말고 해당 규격과 구현을 확인해야 합니다.

![SMCCC Function ID 32-bit 비트 레이아웃](/images/blog/bootloader/diagrams/chapter32-smccc-function-id.svg)

## PSCI: 전원관리 인터페이스

PSCI(Power State Coordination Interface)는 운영체제 같은 클라이언트와 플랫폼 펌웨어 사이의 전원관리 계약입니다. 주요 사용 흐름에는 보조 CPU 시작, CPU 종료, 저전력 상태 진입, 시스템 종료·재시작이 포함됩니다. 표준 인터페이스를 사용해도 실제 reset, clock, 전원 도메인 작업은 플랫폼 구현의 책임입니다.

`CPU_ON` 요청을 개념적으로 보면 호출자는 대상 CPU의 플랫폼 식별자, 해당 CPU가 시작할 entry point, 추가 context 값을 전달합니다. 반환 결과는 요청의 접수·실패 상태를 나타냅니다. 호출이 성공적으로 반환했다는 사실만으로 대상 CPU가 Linux에서 이미 online 상태가 됐다고 판단할 수는 없습니다. secondary 진입과 운영체제 초기화는 별도 단계입니다.

PSCI function identifier와 인자 형태는 지원하는 PSCI 버전에 맞춰야 합니다. 클라이언트는 버전 조회와 기능 조회를 이용해 실제 펌웨어가 제공하는 계약을 확인해야 하며, 특정 SoC의 reset register나 전원 상태 인코딩을 일반적인 PSCI 예제로 제시하면 안 됩니다.

## Linux와 device tree

Linux는 firmware interface를 통해 conduit와 PSCI 구현을 연결합니다. Device tree를 사용하는 시스템에서는 `/psci` 노드와 CPU 노드의 `enable-method`가 부팅 계약의 일부가 됩니다. 아래는 형태를 보여 주는 축약 예시입니다. 실제 호환 문자열, 호출 방식, CPU 식별 값과 추가 속성은 사용 중인 커널 binding 및 보드 DT를 기준으로 정해야 합니다.

```dts
/ {
    psci {
        compatible = "arm,psci-1.0";
        method = "smc";
    };

    cpus {
        cpu@0 {
            device_type = "cpu";
            reg = <0>;
            enable-method = "psci";
        };
    };
};
```

PSCI가 아닌 firmware interface나 ACPI를 사용하는 시스템도 있으므로 이 조각만으로 모든 AArch64 부팅 경로를 설명할 수는 없습니다. Linux의 PSCI binding과 대상 장치의 실제 DT를 함께 확인하세요.

## 호출을 추적하는 방법

- 커널과 firmware가 구현하는 SMCCC 및 PSCI 버전을 확인합니다.
- Linux의 PSCI 초기화 로그와 device tree 또는 ACPI 설정에서 conduit 및 CPU enable 방식을 확인합니다.
- function ID의 의미, 인자 폭, 반환값과 오류 처리를 해당 규격 및 커널 헤더에 대조합니다.
- 실제 CPU hotplug나 suspend 결과는 커널 로그, firmware 로그, 해당 보드의 전원 도메인 상태로 확인합니다.
- 측정값을 보고할 때는 보드, firmware와 커널 버전, 측정 시작·종료 지점, 반복 횟수를 함께 남깁니다.

여기서는 특정 보드의 커널·TF-A 조합을 빌드하거나 실기 호출을 실행하지 않았습니다. 그러므로 latency 수치와 특정 SoC의 register 동작은 기재하지 않습니다.

## 정리

- SMCCC는 호출을 전달하고, PSCI는 CPU·시스템 전원관리 기능의 의미를 정의합니다.
- 표준 function ID도 버전 및 지원 여부 확인 없이 사용할 수 없습니다.
- `CPU_ON` 요청의 반환과 CPU가 OS에서 online 되는 시점은 서로 다른 사건입니다.
- 실제 동작은 kernel binding, firmware 구현, 보드 전원관리 코드와 실기 검증으로 확인합니다.

## 다음 편

[Ch 33: SMP secondary CPU bring-up](/blog/embedded/bootloader/chapter33-smp-secondary-cpu-bringup)에서는 PSCI와 spin-table 두 부팅 계약을 Linux의 secondary CPU 시작 관점에서 비교합니다.

## 관련 항목

- [Ch 4: 부트 단계 — BL1 → SPL → TPL → U-Boot Proper](/blog/embedded/bootloader/chapter04-boot-stages)
- [Ch 25: ARM TF-A 통합 — BL1·BL2·BL31·BL32·BL33](/blog/embedded/bootloader/chapter25-tfa-optee)
- [Ch 31: TF-A BL31 EL3 Runtime](/blog/embedded/bootloader/chapter31-tfa-bl31-runtime)
- [Ch 33: SMP secondary CPU bring-up](/blog/embedded/bootloader/chapter33-smp-secondary-cpu-bringup)
- [Practical RTOS Internals Ch 2-6: Cortex-A context switch](/blog/embedded/rtos/practical-internals/part2-06-cortex-a-context)
- [Practical RTOS Internals Ch 4-12: AMP와 OpenAMP](/blog/embedded/rtos/practical-internals/part4-12-amp-openamp)
- [Embedded Security Ch 4: TrustZone](/blog/embedded/embedded-security/chapter04-trustzone)
- [Arm PSCI specification (DEN0022)](https://developer.arm.com/documentation/den0022)
- [Arm SMCCC specification (DEN0028)](https://developer.arm.com/documentation/den0028)
- [Linux PSCI device tree binding](https://www.kernel.org/doc/Documentation/devicetree/bindings/arm/psci.yaml)
