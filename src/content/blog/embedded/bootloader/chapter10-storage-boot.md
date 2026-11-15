---
title: "임베디드 스토리지 부팅 분석 — MMC·SCSI·NAND·SPI Flash 비교"
slug: "embedded/bootloader/chapter10-storage-boot"
date: 2026-05-09T09:10:00
description: "부트 미디어별 동작 차이 — eMMC, SD, SATA, NAND, SPI NOR/NAND의 부트 모드."
series: "Bootloader Internals"
seriesOrder: 10
tags: [embedded, bootloader, u-boot, storage, mmc, nand]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

스토리지 부팅은 ROM이 읽는 첫 이미지의 위치와 형식, 이후 단계가 저장 장치를 읽는 방식으로 나누어 봅니다. 부트 소스 선택과 저장 레이아웃은 SoC 및 보드마다 다르므로, 다른 보드의 주소·Fuse 값·출력은 그대로 적용하지 않습니다.

[9장](/blog/embedded/bootloader/chapter09-dram-init)에서 설명한 초기화 이후에는 다음 boot stage가 OS 이미지와 데이터를 읽을 수 있습니다. 이때 ROM의 책임은 SoC가 지정한 미디어와 이미지 형식에 한정되고, U-Boot의 `mmc`, `scsi`, `nand`, `sf` 같은 명령은 해당 드라이버와 설정이 빌드된 경우 사용할 수 있습니다.

## 먼저 구분할 두 단계

1. **ROM에서 다음 firmware로** — reset 설정, straps 또는 비휘발성 설정에 따라 SoC가 지원하는 부트 경로를 선택합니다. 부트 순서와 이미지 형식은 SoC reference manual과 해당 보드 문서를 확인합니다.
2. **U-Boot에서 OS 파일로** — U-Boot가 저장 장치 driver를 초기화하고, 파티션 또는 raw layout에서 kernel, DTB, initramfs 등을 읽습니다.

특정 `BOOTSEL[2:0]` 비트 표는 칩 전반의 공통 규칙이 아닙니다. 실제 설정은 해당 SoC의 문서와 보드 회로에서 확인해야 합니다. 이 글은 Fuse programming 명령이나 공용 주소표를 제시하지 않습니다.

![ROM이 boot source를 골라 첫 firmware stage 이미지를 읽는 단계와, U-Boot가 저장 장치 driver로 raw offset·파티션·filesystem에서 kernel·DTB·initramfs를 RAM에 적재하는 단계를 나눈 그림](/images/blog/bootloader/diagrams/ch10-storage-layout.svg)

두 단계는 근거 자료도 다르므로, 그림처럼 ROM 쪽은 SoC 문서로, U-Boot 쪽은 build configuration과 command 문서로 따로 확인합니다.

## eMMC와 SD

U-Boot의 MMC subsystem은 eMMC와 SD 장치를 다룹니다. eMMC는 보드에 실장되고 boot hardware partition 등을 제공할 수 있으며, SD 카드는 removable media입니다. 파티션 구성과 ROM이 어느 영역을 읽는지는 SoC의 boot flow에 따릅니다. U-Boot가 지원되도록 빌드됐다면 다음은 장치 상태를 살펴보는 **읽기 명령 형태**입니다.

```text
=> mmc list
=> mmc dev <device>
=> mmc info
=> mmc part
```

U-Boot v2025.01 문서는 `mmc partconf <dev> <boot_ack> <boot_partition> <partition_access>` 형식과 `mmc bootbus` 인자를 설명합니다. `partconf`는 eMMC 설정을 변경하므로 실제 대상 값은 eMMC 사양, SoC ROM 요구사항과 보드의 recovery 절차를 확인한 뒤 계획해야 합니다. 이 글에서는 쓰기 명령을 실행하지 않습니다. [U-Boot MMC command reference](https://docs.u-boot.org/en/v2025.01/usage/cmd/mmc.html)

OS 파일을 파일 시스템에서 읽는 방법도 configuration에 따라 달라집니다. 예를 들어 U-Boot의 generic `load` command는 `<interface> <dev[:part]> <addr> <filename>` 형식을 사용합니다. 주소와 파일명은 target의 memory map과 실제 파티션에 맞춰야 하며, 아래는 문법 예시이지 실행한 transcript가 아닙니다.

```text
=> load mmc <device>:<partition> ${kernel_addr_r} /boot/Image
=> load mmc <device>:<partition> ${fdt_addr_r} /boot/board.dtb
```

## SATA와 SCSI 장치

U-Boot의 저장 장치 경로는 컨트롤러, block layer 및 활성화된 filesystem/partition support에 좌우됩니다. SATA device가 SCSI interface를 통해 노출되는 구성에서는 `scsi` 관련 명령을 사용할 수 있지만, 모든 SoC의 SATA controller가 같은 경로를 쓰는 것은 아닙니다. GPT 또는 파일 시스템에서 OS 이미지를 읽으려면 controller driver, partition support, filesystem command가 해당 build에 포함됐는지 확인합니다.

```text
=> scsi scan
=> scsi part <device>
```

위는 명령 형태만 보이며 실제 장치 검색 결과나 성능을 뜻하지 않습니다.

## Raw NAND와 SPI Flash

Raw NAND는 erase block, bad block, ECC/OOB 구성과 controller/ROM 지원을 고려해야 합니다. ROM이 첫 stage를 읽는 방식은 SoC마다 다르고, 이후 U-Boot가 사용하는 MTD/UBI/UBIFS 구성도 보드와 저장 레이아웃의 선택입니다. 따라서 “ROM은 첫 몇 블록을 항상 같은 ECC로 읽는다”거나 특정 ECC 강도가 보편적이라고 가정할 수 없습니다.

SPI NOR는 U-Boot의 SPI flash driver가 활성화된 경우 `sf` 명령으로 접근할 수 있습니다. 명령은 보드가 정의한 flash offset 및 erase geometry를 사용합니다. NOR와 SPI NAND, 그리고 XIP를 같은 동작으로 취급하면 안 됩니다. 각 flash part의 데이터시트, controller 기능, DTS 및 보드의 memory map을 확인해야 합니다.

```text
=> sf probe
=> sf read <ram-address> <flash-offset> <length>
```

`sf erase`와 `sf write` 등은 flash 내용을 변경하므로, 실제 layout과 복구 절차를 확인하기 전에는 실행하면 안 됩니다. 이 장에는 지워 쓰는 예시를 두지 않습니다.

## 이미지와 파티션 레이아웃

첫 firmware stage는 ROM 전용 header, 고정 위치 또는 별도 packaging format을 요구할 수 있습니다. U-Boot 이후 단계는 raw offset, GPT/MBR 파티션, filesystem 또는 platform-specific container에서 이미지를 읽을 수 있습니다. 하나의 eMMC/flash 레이아웃을 모든 보드의 표준으로 볼 수 없습니다.

레이아웃을 문서화할 때는 SoC ROM이 읽는 위치와 U-Boot의 OS 파일 위치를 나누고, 단위(바이트, 섹터, erase block), 장치 hardware partition, 예약 영역, redundant copy 정책을 명시합니다. GPT header 영역이나 boot partition을 포함한 어떤 위치도 추측으로 덮어쓰지 않습니다. 업데이트·복구 가능성까지 확인하려면 [28장: Flash 레이아웃](/blog/embedded/bootloader/chapter28-flash-layout)을 함께 봅니다.

## 확인 순서

1. SoC reference manual에서 boot source 선택과 ROM image format을 확인합니다.
2. board defconfig, DTS와 vendor packaging 설정에서 실제 controller/partition을 확인합니다.
3. U-Boot version의 command 문서에서 지원 구문과 required configuration을 확인합니다.
4. 대상 장치에서 읽기 전용 상태 조회를 하고, output과 build identifier를 함께 기록합니다.
5. 쓰기·erase·Fuse 작업은 별도 복구 계획과 대상 확인이 끝난 뒤에만 진행합니다.

이 환경에서는 보드, U-Boot image와 저장 장치가 없어 boot ROM, `mmc`, `scsi`, `nand`, `sf` 예제를 실행하지 않았습니다. 이 글은 합성된 console output이나 측정 수치를 포함하지 않습니다.

## 정리

- ROM의 boot source와 U-Boot가 OS 파일을 읽는 경로는 구분해야 합니다.
- eMMC partition selection, NAND ECC/layout, SPI offset은 SoC·장치·보드별 자료로 확인합니다.
- U-Boot command는 build configuration에 따라 달라질 수 있습니다.
- 쓰기·erase·Fuse 작업은 대상 layout과 recovery 절차를 확인한 뒤 수행합니다.

## 다음 장 예고

다음 글에서는 네트워크를 통한 이미지 전송과 PXE 계열 흐름을 다룹니다.

## 관련 항목

- [Ch 9: DRAM 초기화](/blog/embedded/bootloader/chapter09-dram-init) — 저장 장치 접근 전 초기화 단계
- [Ch 11: 네트워크 부트](/blog/embedded/bootloader/chapter11-network-boot) — 네트워크에서 이미지 읽기
- [Ch 12: USB 부트와 download mode](/blog/embedded/bootloader/chapter12-usb-boot) — USB 전송과 recovery 선택지
- [Ch 13: 환경 변수와 bootcmd](/blog/embedded/bootloader/chapter13-env-bootcmd) — 부팅 명령 구성
- [Ch 28: Flash 레이아웃](/blog/embedded/bootloader/chapter28-flash-layout) — partition과 redundant image 설계
- [Buildroot Ch 8: 파일 시스템](/blog/embedded/buildroot/chapter08-filesystems) — root filesystem 구성
- [U-Boot v2025.01 MMC command](https://docs.u-boot.org/en/v2025.01/usage/cmd/mmc.html)
