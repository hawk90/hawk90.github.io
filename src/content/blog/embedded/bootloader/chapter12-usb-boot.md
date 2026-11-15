---
title: "U-Boot USB 부팅 — fastboot·UMS·USB host 메커니즘"
slug: "embedded/bootloader/chapter12-usb-boot"
date: 2026-05-09T09:12:00
description: "USB를 통한 부팅과 flash — fastboot, USB Mass Storage(UMS), USB host 부팅 흐름."
series: "Bootloader Internals"
seriesOrder: 12
tags: [embedded, bootloader, u-boot, usb, fastboot]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

U-Boot에서 USB는 서로 다른 역할로 사용될 수 있습니다. USB host로 block device에서 파일을 읽고, USB gadget 기능으로 Fastboot·DFU를 제공하거나 UMS로 block device를 host computer에 노출할 수 있습니다. 사용 가능한 흐름은 board의 USB controller, device mode, U-Boot build와 storage configuration에 따라 달라집니다.

[10장](/blog/embedded/bootloader/chapter10-storage-boot)에서 본 저장 장치와 마찬가지로 USB도 연결 형태만으로 부팅 가능 여부가 정해지지 않습니다. ROM-level USB download는 U-Boot에 진입하기 전 SoC별 동작이고, U-Boot의 gadget/host 명령은 U-Boot가 실행된 다음의 기능입니다.

![U-Boot 진입 전의 Boot ROM USB recovery와, U-Boot 실행 후 board가 USB host로 저장 장치를 읽는 경우, USB gadget으로 Fastboot·DFU·UMS를 제공하는 경우를 나눈 구성도](/images/blog/bootloader/diagrams/ch12-usb-boot-modes.svg)

그림처럼 같은 USB 포트라도 boot stage와 board의 USB 역할에 따라 쓰는 명령과 확인할 설정이 달라집니다.

## USB host로 파일 읽기

USB host mode에서는 U-Boot가 mass-storage 장치를 인식하고 지원되는 filesystem에서 파일을 읽을 수 있습니다. 명령과 device numbering은 driver 및 build 설정을 확인해야 합니다.

```text
=> usb start
=> load usb <device>:<partition> ${kernel_addr_r} /boot/Image
```

이는 문법을 보여주는 예이며 실제 장치 검색이나 파일 읽기를 실행한 기록이 아닙니다. 메모리 주소, partition과 filesystem은 board configuration에 맞춰야 합니다. U-Boot v2025.01의 generic `load` command는 지원되는 interface 목록에 USB를 포함합니다. [U-Boot load command](https://docs.u-boot.org/en/stable/usage/cmd/load.html)

## USB gadget 기능 구분

USB device/gadget mode에서 제공하는 protocol과 storage access는 따로 구성합니다.

| 기능 | 역할 | 확인할 설정 |
|---|---|---|
| Fastboot | host tool과 bootloader 간 image download/flash protocol | Fastboot, USB gadget, buffer address/size, target storage mapping |
| DFU | 표준 USB firmware upgrade protocol과 backend별 alternate | DFU command, `dfu_alt_info`, MMC/NAND/SF/MTD backend |
| UMS | U-Boot block device를 USB Mass Storage 장치로 host에 노출 | USB gadget download, block layer, 대상 interface/device/partition |

### Fastboot

Fastboot command는 host computer와 연결해 version/상태를 조회하거나, 지원되는 configuration에서 partition image를 download·flash하는 데 사용합니다. `CONFIG_FASTBOOT_BUF_ADDR`는 download buffer 위치, `CONFIG_FASTBOOT_BUF_SIZE`는 buffer 크기입니다. 주소와 크기를 혼동하지 말고 target memory map 및 최대 이미지 크기를 확인해야 합니다.

U-Boot v2025.01은 USB에서 `fastboot usb <controller>` 형태로 진입하는 방법, partition mapping, buffer 설정과 지원 command를 설명합니다. 실제 flash 대상은 GPT/MBR 이름 또는 U-Boot 설정에 따라 달라지므로 명령을 실행하기 전에 board-specific mapping과 recovery 절차를 확인하세요. [U-Boot Android Fastboot](https://docs.u-boot.org/en/v2025.01/android/fastboot.html)

```text
=> fastboot usb <controller>
```

이 예시는 command shape만 나타냅니다. 이 작업에서는 장치에 연결하거나 write/erase를 하지 않았습니다.

### DFU

U-Boot의 DFU 구현은 USB-IF DFU 1.1을 따르며, document가 기술하는 backend에는 MMC, NAND, RAM, serial flash, MTD 등이 포함됩니다. 노출 대상은 `dfu_alt_info`로 정의합니다. 같은 `dfu` 명령이라도 alternate 설정에 따라 저장 위치와 효과가 다릅니다.

```text
=> printenv dfu_alt_info
=> dfu <USB-controller> mmc <device> list
```

두 번째 명령 형태는 versioned DFU 문서에 따라 다룰 수 있는 target에서 확인해야 합니다. Flash alternate 설정을 임의로 복사하지 말고 offset, size, hardware partition과 device number를 검증하세요. [U-Boot v2024.04 DFU documentation](https://docs.u-boot.org/en/v2024.04/usage/dfu.html)

### UMS

UMS는 선택된 U-Boot block device를 host에 USB Mass Storage device처럼 제공합니다. U-Boot 문서의 command form은 `ums <dev> [<interface>] <devnum[:partnum]>`이며, 전체 device 또는 선택한 partition을 노출하도록 구성할 수 있습니다. [U-Boot UMS command](https://docs.u-boot.org/en/stable/usage/cmd/ums.html)

UMS session 중에는 host가 filesystem metadata와 sectors를 변경할 수 있습니다. 보드와 host 양쪽에서 동시에 같은 filesystem에 접근하지 말고, host의 write 작업이 끝나고 cleanly unmount되기 전에 케이블을 제거하거나 보드를 reset하지 않습니다. 이 문서에는 실제 host block device의 `dd` 명령이나 합성 `lsblk` 결과를 포함하지 않습니다.

## ROM-level USB recovery

일부 SoC는 내부 Boot ROM에서 USB download/recovery mode를 제공하지만, protocol, entry condition, host utility와 허용 image는 vendor와 chip revision에 따라 다릅니다. 이는 U-Boot의 Fastboot/DFU/UMS와 다른 boot stage입니다. 특정 SoC 문서와 board recovery guide가 확인되지 않으면 USB cable이나 BOOTSEL 조합만으로 ROM recovery가 된다고 가정하지 않습니다.

SoC별 host tool의 이름만 나열해도 지원 image, command syntax, transfer protocol을 증명하지 못합니다. 제조사 documentation의 해당 silicon revision을 먼저 확인하고, factory process에 쓰는 경우 승인된 image, device identity와 success criteria를 고정합니다.

## 안전한 확인 절차

1. Board schematic 및 SoC documentation에서 host/device port와 ROM recovery 조건을 확인합니다.
2. U-Boot tag/defconfig에서 USB controller, gadget/host, Fastboot·DFU·UMS, block/filesystem support를 확인합니다.
3. `dfu_alt_info`, Fastboot partition mapping, buffer address/size를 실제 memory map 및 storage layout과 대조합니다.
4. 먼저 조회 가능한 configuration을 기록하고, 쓰기 테스트는 별도의 복구 가능한 대상에서만 수행합니다.
5. UMS를 끝낼 때 host filesystem을 unmount하고 session을 정상 종료합니다.

이 환경에는 보드, U-Boot build, USB host/device target 또는 storage fixture가 없어 명령을 실행하지 않았습니다. 따라서 전송 output, 장치 용량, 속도나 recovery 성공을 주장하지 않습니다.

## 정리

- USB host, USB gadget, ROM recovery는 서로 다른 역할과 boot stage입니다.
- Fastboot buffer address와 size는 서로 다른 설정입니다.
- DFU alternate와 Fastboot partition mapping은 board-specific storage layout에 연결됩니다.
- UMS 사용 중에는 host와 board가 동시에 filesystem을 수정하지 않도록 session을 종료합니다.
- 실제 protocol, commands, output은 pinned U-Boot version과 해당 SoC 자료로 확인합니다.

## 다음 장 예고

다음 글에서는 U-Boot 환경 변수와 `bootcmd`가 부트 명령을 구성하는 방법을 다룹니다.

## 관련 항목

- [Ch 10: 스토리지 부트](/blog/embedded/bootloader/chapter10-storage-boot) — local storage interface와 layout
- [Ch 11: 네트워크 부트](/blog/embedded/bootloader/chapter11-network-boot) — network download
- [Ch 13: 환경 변수와 bootcmd](/blog/embedded/bootloader/chapter13-env-bootcmd) — boot command 설정
- [Ch 17: A/B 업데이트](/blog/embedded/bootloader/chapter17-ab-update) — update layout과 rollback
- [Ch 23: BootROM 내부](/blog/embedded/bootloader/chapter23-bootrom-efuse-otp) — SoC ROM 및 boot configuration
- [Ch 30: Bootloader CI](/blog/embedded/bootloader/chapter30-bootloader-ci) — 자동화 검증
- [U-Boot v2025.01 Fastboot protocol](https://docs.u-boot.org/en/v2025.01/android/fastboot-protocol.html)
