---
title: "U-Boot Falcon Mode — SPL이 U-Boot Proper 없이 커널 직접 부팅"
slug: "embedded/bootloader/chapter05-falcon-mode"
date: 2026-05-09T09:05:00
description: "U-Boot Falcon Mode의 SPL 기반 직접 부팅, 보드별 설정, 사전 생성 인자, 설정과 보드별 저장 방식을 설명합니다."
series: "Bootloader Internals"
seriesOrder: 5
tags: [embedded, bootloader, u-boot, falcon, boot-time]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> Falcon Mode는 U-Boot SPL이 U-Boot proper 대신 Linux kernel 또는 다른 이미지를 직접 시작할 수 있게 하는 U-Boot 기능입니다.

일반 흐름에서는 SPL이 U-Boot proper를 시작하고, U-Boot proper가 OS를 준비합니다. Falcon 흐름에서는 SPL이 OS와 필요한 인자를 불러 직접 시작할 수 있습니다. 실제 절감 시간, 매체 형식, 복구 경로는 보드 구현과 설정에 따라 달라집니다. 비교 시간이나 특정 보드의 로그는 재현 가능한 측정 자료가 없어 제시하지 않습니다.

## 구성 요소와 흐름

U-Boot 문서는 Falcon Mode를 SPL framework에 의존하는 기능으로 설명합니다. `CONFIG_SPL_OS_BOOT`는 SPL이 U-Boot 외의 image도 시작할 수 있게 하는 설정입니다. 보드는 `spl_start_uboot()`를 구현해야 합니다. 반환값 0은 SPL이 kernel을 시작하고, 1은 U-Boot를 시작한다는 뜻입니다. 보드가 GPIO나 SPL console 입력을 선택 조건으로 사용할 수 있습니다.

```text
일반: BootROM → SPL → U-Boot proper → OS
Falcon: BootROM → SPL → OS
```

이 흐름은 개념도이며 모든 보드의 이미지·firmware 단계를 나타내지는 않습니다. 보드별 초기화 작업이 U-Boot proper에서만 수행된다면 Falcon 경로에서 필요한 부분을 SPL에 준비해야 합니다.

## 설정 확인

U-Boot 문서는 다음 Falcon 관련 설정을 설명합니다. 선택 가능 여부와 매체 지원은 U-Boot 버전 및 board Kconfig에서 확인해야 합니다.

| 설정 | 문서상 역할 |
|---|---|
| `CONFIG_SPL_OS_BOOT` | Falcon Mode 활성화 |
| `CONFIG_CMD_SPL` | U-Boot shell의 `spl export` 명령 활성화 |
| `CONFIG_SPL_PAYLOAD_ARGS_ADDR` | SPL이 parameter image를 복사할 RAM 주소 |

NAND/NOR 등의 kernel·argument 저장 위치와 write size는 매체별 설정으로 정합니다. `CONFIG_CMD_SPL_NAND_OFS` 등 특정 기호를 다른 매체나 보드에 그대로 적용하지 말고, 같은 버전의 Falcon 문서, defconfig 및 SPL 코드를 대조하세요.

## 인자 이미지 생성

U-Boot shell의 `spl export fdt` 명령은 kernel boot parameter를 준비한 FDT를 만듭니다. U-Boot v2024.04 문서의 문법은 다음과 같습니다.

```text
spl export fdt [kernel_addr] [initrd_addr] [fdt_addr]
```

`kernel_addr`는 메모리에 적재한 kernel의 주소, `initrd_addr`는 initrd 주소이며 initrd가 없고 `fdt_addr`를 쓸 때는 `-`를 지정할 수 있습니다. `fdt_addr`는 메모리의 device tree 주소입니다. `spl export`는 결과를 storage에 쓰지 않습니다. 명령이 출력하는 임시 RAM 주소 및 `fdtargsaddr`, `fdtargslen` 환경 값을 이용해 생성 결과를 별도로 저장합니다. 임시 주소는 시스템 구성에 따라 달라집니다.

```text
# 문법만 옮긴 예시. U-Boot target에서 실행한 transcript가 아님
spl export fdt <kernel_addr> - <fdt_addr>
```

저장 위치와 형식은 대상 보드의 설정을 확인해야 합니다. 실기기의 raw media를 수정하는 명령은 이 글에 두지 않았습니다. 시험은 분리된 staging image에서 offset·길이·내용을 검증한 뒤 진행하세요.

## 실패 경로와 보안

일반 Falcon Mode에서는 정의된 위치에서 유효한 OS image를 찾지 못할 때 U-Boot로 fallback하는 동작을 문서가 설명합니다. 사용자 지정 보드 구현에서 이 경로를 유지하는지 확인하세요. 보안 boot 설정을 쓰는 제품은 signed image 요구사항과 실패 동작을 별도로 확인해야 합니다.

Falcon 경로에는 U-Boot proper shell이 실행되지 않으므로 진단과 복구를 별도로 설계해야 합니다. 어떤 값이 이미지에 사전 반영되어야 하는지, 동적 보드 정보가 SPL에서 갱신되는지, 실패 시 어떤 image가 시작되는지를 구현과 실제 보드에서 확인합니다.

부팅 시간 차이는 보드에서 측정해야 합니다. 같은 hardware, image, storage 조건에서 여러 번 실행해 측정 시작·종료 지점과 분포를 기록하세요. 재현 조건이 없는 수치를 일반적인 효과로 제시하지 않습니다.

## 자주 확인할 항목

- `CONFIG_SPL_OS_BOOT`가 target configuration에서 선택되었는가?
- `spl_start_uboot()`의 0/1 분기와 recovery 조건은 무엇인가?
- SPL이 읽을 kernel과 parameter image의 source·offset·size가 어디에 정의되어 있는가?
- `spl export`로 만든 결과가 맞는 주소·길이로 staging media에 옮겨지는가?
- normal 및 secure Falcon 경로의 실패 동작은 무엇인가?
- U-Boot proper에서만 준비되던 hardware state가 SPL에서도 준비되는가?

## 정리

- Falcon Mode는 SPL에서 kernel 또는 다른 image를 직접 시작할 수 있게 합니다.
- `spl_start_uboot()`의 반환 0은 OS 시작, 1은 U-Boot 시작입니다.
- `spl export fdt`는 parameter FDT를 RAM에 만들며 storage 기록은 별도 작업입니다.
- 설정·주소·저장 방식·복구 절차는 보드와 매체별로 검증해야 합니다.
- 정량적인 boot-time 효과는 동일 조건에서 측정해야 합니다.

## 다음 편

[Ch 6: Device Tree와 부트로더](/blog/embedded/bootloader/chapter06-device-tree)에서는 U-Boot의 control DTB와 커널로 넘기는 OS DTB, `fdt` 명령, 보드별 fixup을 다룹니다.

## 관련 항목

- [Ch 4: 부트 단계](/blog/embedded/bootloader/chapter04-boot-stages)
- [Ch 13: 환경 변수와 bootcmd](/blog/embedded/bootloader/chapter13-env-bootcmd)
- [Ch 15: FIT Image](/blog/embedded/bootloader/chapter15-fit-image)
- [Ch 16: Verified Boot](/blog/embedded/bootloader/chapter16-verified-boot)
- [Ch 17: A/B 업데이트](/blog/embedded/bootloader/chapter17-ab-update)
- [BSP Ch 6: U-Boot 보드 포팅](/blog/embedded/bsp/chapter06-u-boot-porting)
- [U-Boot v2024.04 Falcon Mode 문서](https://docs.u-boot.org/en/v2024.04/develop/falcon.html)
