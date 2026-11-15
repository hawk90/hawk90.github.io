---
title: "ARM64 Secondary Core Bring-up — PSCI와 spin-table 시작 계약"
slug: "embedded/bootloader/chapter33-smp-secondary-cpu-bringup"
date: 2026-05-22T09:33:00
description: "Linux AArch64의 secondary CPU 시작 계약을 PSCI와 spin-table 방식으로 비교하고 DT 및 검증 경계를 정리합니다."
series: "Bootloader Internals"
seriesOrder: 33
tags: [embedded, bootloader, smp, psci, arm64, kernel, hotplug]
topics: ["embedded"]
---

## 한 줄 요약

> AArch64 Linux가 보조 CPU를 시작하는 방법은 플랫폼의 firmware 계약에 달려 있습니다. 흔한 경로인 PSCI와 spin-table은 서로 다른 약속을 가지며, DT와 실제 firmware 구현을 같이 확인해야 합니다.

[Ch 32](/blog/embedded/bootloader/chapter32-psci-smccc)에서 PSCI 요청과 SMCCC 전달 규약을 구분했습니다. 여기서는 Linux 부팅 시 보조 CPU를 시작하는 두 가지 계약을 비교하고, 문서화된 경계와 커널 내부 구현의 차이를 살펴봅니다.

## 먼저 구분할 것: 부팅 계약과 커널 내부 경로

모든 Arm 시스템이 같은 Boot ROM, TF-A, EL3 서비스, CPU 시작 순서를 사용하는 것은 아닙니다. CPU가 초기화된 뒤 Linux가 진입하는 상태도 플랫폼 부트 체인에 따라 다릅니다. 따라서 “BL1·BL2·BL31은 한 CPU만 쓰고 나머지는 항상 WFI에 있다” 같은 문장을 보편 규칙으로 적용할 수 없습니다.

Linux에 중요한 것은 각 CPU의 enable 방식과 펌웨어가 지키는 진입 계약입니다. Linux 소스의 `secondary_entry`, `secondary_start_kernel` 같은 내부 심볼은 커널 버전과 설정의 구현 세부이므로, 특정 버전을 지정하지 않고 고정된 명령 흐름으로 복사하지 않습니다.

## PSCI 방식

PSCI를 사용하는 시스템에서 Linux는 firmware에 CPU 시작을 요청합니다. Device tree에는 PSCI firmware를 기술하는 노드와 CPU 노드의 `enable-method = "psci"`가 사용될 수 있습니다. Linux는 `CPU_ON` 인터페이스를 호출하고 firmware가 플랫폼의 CPU 전원·reset 절차를 수행합니다.

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
        cpu@1 {
            device_type = "cpu";
            reg = <1>;
            enable-method = "psci";
        };
    };
};
```

예시는 구조만 보여 줍니다. `reg`의 값과 형식은 CPU address cells 및 플랫폼 토폴로지에 맞아야 하며, 호출 method와 entry point는 실제 시스템의 firmware 계약을 따라야 합니다. CPU_ON 성공 응답은 Linux의 CPU-online 완료를 대신하지 않습니다.

## spin-table 방식

Linux의 arm64 부팅 문서는 spin-table CPU가 커널 밖에서 대기하다가 `cpu-release-addr`에 기록된 시작 주소를 읽는 방식을 정의합니다. release 주소는 자연 정렬된 64비트 위치이며, 초기값은 0이고, 해당 위치는 DT가 설명하는 예약 메모리에 포함돼야 합니다. primary는 주소를 기록한 뒤 secondary에 알리며, secondary는 non-zero entry를 읽으면 그 주소로 이동합니다.

```dts
cpu@1 {
    device_type = "cpu";
    reg = <1>;
    enable-method = "spin-table";
    cpu-release-addr = <0x0 0x70000000>; /* 예시 주소 아님: 보드 예약 영역으로 대체 */
};
```

위 주소는 문법 모양만 나타내는 자리표시자입니다. 실제 주소를 그대로 복사하면 안 됩니다. 보드 메모리 지도, DT의 reserved-memory 또는 memreserve 정보, CPU의 대기 코드가 같은 위치를 가리키는지 검증해야 합니다. 일부 시스템은 spin-table을 제공하지 않습니다.

## 둘의 차이

| 확인 항목 | PSCI | spin-table |
| --- | --- | --- |
| 요청 경로 | firmware service 호출 | 공유 메모리의 release 위치 사용 |
| 필요한 설명 | PSCI 노드, CPU enable 방식, conduit | CPU별 release 주소와 예약 메모리 |
| CPU 전원 제어 | firmware와 플랫폼 코드에 위임 | 대기·해제 동작을 플랫폼 firmware가 제공 |
| 대표적인 확인 자료 | PSCI 규격, Linux DT binding, SoC firmware | Linux arm64 boot 문서, DT, SoC 대기 코드 |

이 비교만으로 전력 소비, hotplug 지원 또는 부팅 속도를 단정할 수 없습니다. 그 결과는 구현과 플랫폼의 전원 상태 지원에 달려 있습니다.

![spin-table과 PSCI 비교: spin-table은 primary가 cpu-release-addr에 entry를 기록하고 SEV를 보내면 대기 중인 CPU가 non-zero 값을 읽고 이동하며, PSCI는 primary가 SMC 또는 HVC로 CPU_ON을 호출하고 firmware와 플랫폼 코드가 대상 CPU를 시작](/images/blog/bootloader/diagrams/chapter33-spin-vs-psci.svg)

두 방식을 나란히 놓으면 spin-table은 공유 메모리 위치를, PSCI는 firmware 호출을 계약의 중심에 둔다는 점이 드러납니다.

## 커널 경로를 확인할 때

1. 실제 부팅에 전달된 DT 또는 ACPI를 저장하고 CPU enable 방식을 확인합니다.
2. 사용 중인 커널 릴리스의 arm64 boot 문서 및 PSCI binding을 확인합니다.
3. CPU 시작 요청과 반환 상태를 커널 로그 및 firmware 로그에서 확인합니다.
4. CPU가 커널의 online 상태가 됐는지 sysfs와 커널 로그로 별도 확인합니다.
5. assembly 단계까지 추적하려면 정확한 kernel tag, `.config`, 빌드 산출물과 소스 심볼을 함께 고정합니다.

![secondary CPU 시작 확인 흐름: DT 또는 ACPI에서 enable 방식을 확인한 뒤 psci면 CPU_ON 요청, spin-table이면 cpu-release-addr 기록과 SEV를 거쳐 secondary가 커널 entry에 진입하고, 마지막으로 Linux online 여부를 확인](/images/blog/bootloader/diagrams/chapter33-smp-bringup-flow.svg)

그림의 세 확인 지점은 위 목록의 요청 반환, secondary 진입, online 확인에 대응합니다.

이 문서 수정에서는 QEMU, 보드 또는 실제 Linux kernel image를 실행하지 않았습니다. secondary CPU 경로와 시간 측정 결과를 실행 증거처럼 제시하지 않습니다.

## 정리

- PSCI와 spin-table은 Linux가 보조 CPU를 시작하는 서로 다른 firmware 계약입니다.
- `cpu-release-addr`는 임의의 예제 주소가 아니라 보드의 예약 메모리 및 대기 코드와 일치해야 합니다.
- 커널의 secondary assembly와 초기화 함수는 버전별 구현이므로 대상 소스에서 검증해야 합니다.
- CPU_ON 응답, secondary 진입, Linux CPU-online 상태를 각각 확인해야 합니다.

## 다음 편

다음 편 [Ch 34: U-Boot PCIe enumeration](/blog/embedded/bootloader/chapter34-pcie-enumeration)에서는 부트로더가 PCIe 장치와 자원을 열거하는 경계를 살펴봅니다.

## 관련 항목

- [Ch 32: PSCI / SMCCC ABI](/blog/embedded/bootloader/chapter32-psci-smccc)
- [Ch 34: PCIe enumeration](/blog/embedded/bootloader/chapter34-pcie-enumeration)
- [Practical RTOS Internals Ch 2-6: Cortex-A context switch](/blog/embedded/rtos/practical-internals/part2-06-cortex-a-context)
- [Practical RTOS Internals Ch 4-7: SMP RTOS](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)
- [Practical RTOS Internals Ch 4-12: AMP와 OpenAMP](/blog/embedded/rtos/practical-internals/part4-12-amp-openamp)
- [Arm PSCI specification (DEN0022)](https://developer.arm.com/documentation/den0022)
- [Linux arm64 boot protocol](https://www.kernel.org/doc/html/latest/arch/arm64/booting.html)
- [Linux PSCI device tree binding](https://www.kernel.org/doc/Documentation/devicetree/bindings/arm/psci.yaml)
