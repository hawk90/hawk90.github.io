---
title: "임베디드 Flash Layout 설계 — partition·NAND·eMMC·UBI 비교"
slug: "embedded/bootloader/chapter28-flash-layout"
date: 2026-05-19T09:28:00
description: "양산 firmware의 flash layout 설계 — 부트로더·env·kernel·rootfs·OTA slot의 sizing과 NAND/eMMC/UBI 차이."
series: "Bootloader Internals"
seriesOrder: 28
tags: [embedded, bootloader, flash, nand, emmc, ubi, partition]
draft: false
topics: ["embedded"]
---
Flash layout은 부팅 코드, OS image, update metadata와 사용자 데이터가 저장 장치에서 어떻게 나뉘는지 정의합니다. 구체적인 경계는 매체의 erase/write 특성, BootROM 요구 사항, vendor image format, partition table, update/recovery 정책에 맞춰야 합니다. 예시의 주소·크기·offset을 제품에 복사하지 말고 부품 데이터시트와 boot/update 구현을 대조하세요.

## 한 줄 요약

먼저 저장 매체와 ROM·bootloader 요구 조건을 고정하고, 그 뒤 실제 artifact 크기와 update/recovery 경로를 넣어 layout을 계산합니다. 고정된 sizing 비율이나 universal partition map은 없습니다.

## 저장 매체에 따라 다른 단위

Raw NAND, NOR, eMMC와 SD는 host가 보는 동작 단위와 bad block·erase 처리 방법이 다릅니다. Linux MTD 문서는 NAND를 eraseblock/page 기반 device로 다루며, UBI는 raw NAND의 wear-leveling과 bad-block handling을 추상화하는 layer라고 설명합니다. eMMC와 SD는 host에 block device로 노출되고, eMMC는 별도로 boot partition, RPMB 등 설정 가능한 hardware area를 가질 수 있습니다. 실제 크기와 사용 가능 기능은 device spec과 programmed configuration을 확인해야 합니다.

| 매체 | 설계 전에 확인할 항목 |
|---|---|
| Raw NAND | page/eraseblock geometry, ECC, factory/runtime bad-block handling, ROM load restrictions |
| NOR/QSPI | erase geometry, execute-in-place 지원 조건, ROM/board image header와 protected range |
| eMMC | user area, boot partitions, RPMB, GPT와 device boot configuration |
| SD | 카드별 용량·품질 편차, partition layout과 boot ROM/U-Boot 지원 |

NAND의 bad-block table이 특정 고정 위치를 차지한다거나 raw partition이 모든 환경에서 같은 방식으로 처리된다고 일반화하지 마세요. UBI를 사용할 때도 bad-block/wear behavior와 update semantics를 해당 kernel, UBI tool과 boot flow documentation에서 확인합니다. UBIFS는 block device filesystem이 아니라 UBI volume 위에서 동작하는 MTD filesystem입니다.

## 필요한 영역과 update 정책

제품에 필요한 영역은 보드에 따라 다릅니다. 부트 ROM이 직접 읽는 image, SPL/U-Boot, trusted firmware, environment, kernel/DTB, rootfs, recovery, update staging, A/B metadata와 user data를 먼저 목록화합니다. 각 영역이 어디에 놓이고 어느 component가 쓰는지도 기록합니다.

A/B는 두 image set이 저장 장치에 존재한다는 뜻만으로 안전한 update를 보장하지 않습니다. slot metadata, attempt counter, health confirmation, interrupted update recovery와 rollback eligibility를 함께 설계해야 합니다. Firmware와 OS를 같은 slot transaction에 포함하는지는 product boot chain과 update framework가 결정합니다.

용량은 실제 production artifact와 peak update payload, filesystem/partition metadata, bad-block margin 등 요구 조건을 측정해 결정합니다. “현재 rootfs × 1.5”와 같은 고정 배수는 제품 요구나 OTA growth model의 증거가 아닙니다. 각 release의 최대 artifact와 update compatibility를 가진 검증 자료로 여유를 산정하세요.

## Partition table과 bootloader 환경

Linux block device는 GPT/MBR 등 partition scheme으로 나눌 수 있고, raw NAND의 MTD partition은 device-tree나 platform data로 정의될 수 있습니다. 이 모델들을 섞지 마세요. Device tree의 fixed-partitions node가 eMMC의 hardware boot partition을 자동으로 생성하는 것은 아닙니다.

U-Boot environment backend, device number, partition, offset, size와 redundancy는 build configuration 및 저장 매체에 따라 달라집니다. Redundant environment를 쓰는 경우에도 실제 backend의 erase/write failure behavior와 power-cut recovery를 검증해야 합니다. 값 없는 `CONFIG_ENV_OFFSET` 샘플을 그대로 붙이지 말고, 해당 build의 configuration과 flash map을 같이 보관하세요.

U-Boot `mmc partconf`는 eMMC의 `PARTITION_CONFIG` field를 확인하거나 바꿉니다. 이는 device state를 변경할 수 있는 command입니다. 실제 device의 EXT_CSD와 제조사 문서를 확인하기 전에 쓰기 옵션을 실행하지 마세요. Boot partition의 크기, boot enable, access selection을 “항상 4 MiB” 같은 고정 규칙으로 설명할 수 없습니다.

## UBI/UBIFS와 eMMC 영역

Linux 문서에 따르면 UBI는 MTD NAND 위에서 volume 관리, wear-leveling과 bad-block abstraction을 제공하고 UBIFS는 UBI volume 위에서 동작합니다. 이것이 모든 failure에 대한 application-level atomic OTA를 보장한다는 뜻은 아닙니다. `ubinize` layout, volume type/size, update method, power-cut behavior는 deployment의 UBI tooling과 update logic을 확인합니다. generic “5–10% overhead” 값을 모든 flash geometry에 적용하지 않습니다.

eMMC boot partitions와 RPMB는 장치 내 별도 storage area입니다. RPMB는 authenticated access protocol을 지원하지만, 이를 U-Boot이 자동으로 anti-rollback counter나 device key 저장소로 사용하지 않습니다. host software, key provisioning, authenticated write counter와 recovery policy를 구체적으로 설계해야 합니다.

## 검증 순서

1. SoC/ROM, storage part number/revision, board wiring과 boot mode를 고정합니다.
2. vendor image packaging 문서와 bootloader/environment configuration으로 ROM부터 OS까지 실제 read path를 정리합니다.
3. 생산 image와 update artifact의 최대 크기, slot metadata, recovery image와 data retention 조건을 측정합니다.
4. partition map을 기계가 읽을 수 있는 하나의 source of truth로 관리하고 overlap, alignment, capacity를 자동 검사합니다.
5. approved test media에서 install, interrupted write, reboot, fallback, recovery 및 update retry를 검증합니다.

이 장의 수정 과정에서는 target storage나 image를 만들거나 쓴 적이 없습니다. 제품별 map, eMMC EXT_CSD, NAND geometry, UBI update behavior와 power-loss recovery는 미확인입니다.

## 정리

- NOR/NAND/SD/eMMC의 storage geometry와 boot ROM 요구 조건부터 확인합니다.
- MTD/UBI/UBIFS와 block-device/GPT partitioning은 서로 다른 계층입니다.
- A/B와 redundant environment는 실제 power-cut·failure recovery로 검증해야 합니다.
- U-Boot `mmc partconf`와 `mmc write/erase`는 persistent device state를 바꿀 수 있습니다.
- 용량과 offset은 실제 artifact와 product policy로 계산하고 고정 비율·샘플 주소를 재사용하지 않습니다.

## 다음 편

다음 편은 [Ch 29: Distro Boot 표준화](/blog/embedded/bootloader/chapter29-distro-boot)입니다. U-Boot의 distribution boot discovery와 설정 파일을 살펴봅니다.

## 관련 항목

- [Ch 10: 부트 미디어와 storage boot](/blog/embedded/bootloader/chapter10-storage-boot)
- [Ch 13: env와 bootcmd](/blog/embedded/bootloader/chapter13-env-bootcmd)
- [Ch 17: A/B 업데이트와 boot 이중화](/blog/embedded/bootloader/chapter17-ab-update)
- [Ch 27: Chain of Trust](/blog/embedded/bootloader/chapter27-chain-of-trust)
- [Linux: UBI File System](https://docs.kernel.org/filesystems/ubifs.html)
- [Linux: MTD NAND documentation](https://docs.kernel.org/driver-api/mtdnand.html)
- [U-Boot v2025.01: mmc command](https://docs.u-boot.org/en/v2025.01/usage/cmd/mmc.html)
- [U-Boot: Environment Variables](https://docs.u-boot.org/en/latest/usage/environment.html)
