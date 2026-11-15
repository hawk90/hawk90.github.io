---
title: "U-Boot Driver Model 내부 — uclass·driver·device 추상화 구조"
slug: "embedded/bootloader/chapter07-driver-model"
date: 2026-05-09T09:07:00
description: "U-Boot Driver Model — uclass·driver·udevice 구조와 DT 기반 driver binding."
series: "Bootloader Internals"
seriesOrder: 7
tags: [embedded, bootloader, u-boot, driver-model]
draft: false
topics: ["embedded"]
---


## 한 줄 요약

> U-Boot Driver Model은 driver 구현, uclass의 공통 interface, 개별 device instance를 연결합니다. Device Tree는 이 구조에서 board의 device를 기술하는 한 방법입니다.

DT에 `compatible`을 적는 것만으로 모든 초기화가 끝나는 것은 아닙니다. 사용 가능한 driver와 binding, Kconfig, parent bus, 해당 부트 단계의 메모리·probe 제약이 함께 맞아야 합니다.

## Driver Model의 세 요소

U-Boot v2024.04 문서는 uclass를 같은 방식으로 동작하는 device의 그룹, driver를 peripheral을 다루는 코드, device를 특정 port/peripheral에 연결된 driver instance로 정의합니다.

| 요소 | 역할 |
|---|---|
| uclass | 같은 종류의 device에 공통 interface 제공 |
| driver | hardware-specific 동작 구현 |
| device (`udevice`) | 특정 controller 또는 peripheral을 나타내는 instance |

같은 SoC 안에 여러 MMC controller가 있으면 하나의 driver 구현을 여러 instance가 사용할 수 있습니다. 각 instance의 주소·속성·호환성 정보는 Device Tree 또는 board configuration에서 제공됩니다.

## Binding과 Device Tree

U-Boot의 driver model은 보드 설정과 Kconfig에서 사용할 수 있는 driver를 등록합니다. Device Tree를 쓰는 구성에서는 node의 `compatible` 정보와 driver의 matching data를 사용해 device를 bind할 수 있습니다. Binding된 node마다 hardware가 정상 동작한다고 보장되지는 않습니다. clock, reset, pinctrl, parent bus, status, driver 지원과 probe 결과를 확인해야 합니다.

U-Boot 문서는 DT binding과 device tree 없는 platform data 양쪽을 다룹니다. 어떤 방식이 선택되는지는 보드·단계·Kconfig에 따릅니다. “DT만 쓰면 board code가 필요 없다”는 일반 규칙이 아닙니다.

## Bind와 probe

- **Bind**는 driver model에 device instance와 부모-자식 관계를 등록하는 과정입니다.
- **Probe**는 device를 실제 사용 가능한 상태로 만들기 위해 driver 및 관련 자원을 초기화하는 과정입니다.

이 두 단계는 구분되지만, 모든 device가 첫 사용자 요청까지 probe를 미룬다고 단정할 수는 없습니다. uclass lookup, bus 동작, `DM_FLAG_PROBE_AFTER_BIND`, 단계별 initialization 정책에 따라 probe 시점이 달라질 수 있습니다.

## SPL과 pre-relocation 제약

SPL과 pre-relocation 단계는 full U-Boot proper와 다른 memory·driver·Device Tree 제약을 가질 수 있습니다. `DM_FLAG_PRE_RELOC` 등 driver metadata와 SPL Kconfig가 특정 단계에서 driver를 사용할 수 있게 하는 방법이지만, 각 플래그의 정확한 의미와 필요한 설정은 사용 중인 U-Boot tag에서 확인해야 합니다. 이 글은 버전 확인을 하지 않은 `U_BOOT_DRIVER` initializer와 flag table을 실행 가능한 API 예제로 제시하지 않습니다.

SPL의 DT subset, `OF_PLATDATA`/`dtoc`, driver private/platform data의 생성 방식도 U-Boot version과 board configuration에 의존합니다. 크기 절감량은 target build에서 측정해야 합니다.

## 새 driver를 추가할 때 확인할 것

1. 해당 peripheral에 이미 적용되는 uclass와 ops interface가 있는지 확인합니다.
2. board DTS의 compatible, register range, clock/reset/pinctrl 및 parent bus가 driver의 binding과 일치하는지 확인합니다.
3. 관련 Kconfig와 build output에서 driver가 실제 포함되었는지 확인합니다.
4. `dm tree`와 해당 uclass command 또는 sandbox test를 이용해 bind와 probe를 구분해 진단합니다.
5. SPL/pre-relocation에서 필요한 경우 해당 단계용 configuration과 memory footprint를 별도로 검증합니다.

아래 명령은 확인 방법을 나타내며 이 저장소에서 실행한 transcript가 아닙니다.

```text
=> dm tree
=> dm uclass <uclass_name>
```

이 글에서는 sensor/I²C driver의 구체 API signature와 생성 가능한 sensor class를 검증하지 않았으므로 실행 가능한 driver 예제는 싣지 않습니다. 그 API를 추가하려면 pinned U-Boot source와 해당 sensor interface의 최신 문서를 대조해야 합니다.

## 정리

- uclass는 공통 interface, driver는 구현, device는 구체 instance를 나타냅니다.
- Device Tree의 compatible은 binding 경로 일부이며, Kconfig와 하드웨어 dependency가 함께 필요합니다.
- Bind와 probe는 구분되지만 probe 시점은 보드 및 boot stage별로 달라질 수 있습니다.
- SPL/pre-relocation에서 사용할 driver와 DT data는 target configuration으로 검증합니다.
- Driver API signature는 U-Boot version에 따라 확인해야 합니다.

## 다음 편

[Ch 8: 보드 초기화 — board_init_f와 board_init_r](/blog/embedded/bootloader/chapter08-board-init)에서는 relocation 전후의 초기화와 보드 hook을 살펴봅니다.

## 관련 항목

- [Ch 3: 빌드 시스템](/blog/embedded/bootloader/chapter03-build-system)
- [Ch 6: Device Tree와 부트로더](/blog/embedded/bootloader/chapter06-device-tree)
- [Ch 8: board_init_f vs board_init_r](/blog/embedded/bootloader/chapter08-board-init)
- [Ch 9: DRAM 초기화](/blog/embedded/bootloader/chapter09-dram-init)
- [Ch 21: 보드 포팅 — 처음부터 끝까지](/blog/embedded/bootloader/chapter21-board-porting)
- [BSP Ch 6: U-Boot 보드 포팅](/blog/embedded/bsp/chapter06-u-boot-porting)
- [U-Boot v2024.04 Driver Model design](https://docs.u-boot.org/en/v2024.04/develop/driver-model/design.html)
