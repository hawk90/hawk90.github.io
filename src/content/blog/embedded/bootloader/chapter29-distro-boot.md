---
title: "U-Boot Distro Boot — extlinux·boot.scr 표준화 분석"
slug: "embedded/bootloader/chapter29-distro-boot"
date: 2026-05-19T09:29:00
description: "보드별 다른 부트 스크립트를 표준화 — U-Boot Distro Boot, extlinux.conf, boot.scr의 차이와 선택."
series: "Bootloader Internals"
seriesOrder: 29
tags: [embedded, bootloader, u-boot, distro-boot, extlinux]
draft: false
topics: ["embedded"]
---
U-Boot에는 보드 설정에 따라 여러 boot discovery 경로가 있습니다. Distro Boot는 일반 저장 장치에서 distribution boot configuration을 찾을 수 있도록 U-Boot 기능과 distro 설치 규칙을 맞추는 방식입니다. 이는 모든 보드나 모든 Linux distribution에서 자동 지원되는 공통 firmware가 아닙니다. 보드의 U-Boot configuration, storage scheme, 설치 도구와 image를 함께 확인해야 합니다.

## 한 줄 요약

U-Boot의 Distro Boot, `extlinux.conf`, U-Boot script와 Standard Boot는 역할이 다릅니다. format을 선택하기 전에 해당 보드 build에서 어떤 boot method가 켜져 있는지 확인합니다.

## Distro Boot와 extlinux.conf

U-Boot v2025.01의 Generic Distro Configuration 문서는 여러 bootloader와 보드별 feature 차이를 줄이기 위해 필요한 U-Boot feature set을 정의합니다. 문서는 일반 저장 매체와 MBR/GPT partition scheme에서 boot configuration을 찾는 모델을 전제로 하며, 이를 지원하는 보드에서 distribution이 board-agnostic 설치를 할 수 있다고 설명합니다.

이 구성에서 U-Boot은 `extlinux.conf` 형식의 boot configuration을 읽을 수 있습니다. U-Boot의 경로와 지원하는 stanza/feature는 해당 release 문서에서 확인하세요. 모든 배포판의 모든 ARM image가 이를 제공한다거나, PC의 GRUB과 동일한 기능을 갖는다고 가정하지 않습니다.

## U-Boot script와 FIT script

U-Boot `source` command 문서는 legacy U-Boot image format과 FIT script 두 형식을 지원한다고 설명합니다. Legacy script는 CRC가 있는 legacy image format이지만 암호학적으로 서명·검증되지 않습니다. FIT script는 U-Boot FIT signature feature와 required-key policy가 구성된 경우 서명 검증을 적용할 수 있습니다.

따라서 `boot.scr`를 “signed script”라 부르지 말고, format과 enforcement 설정을 명시하세요. Script 자체는 U-Boot shell command를 실행하므로 `env`, storage, GPIO 등 부작용이 있는 command가 포함될 수 있습니다. 변경 전에 스크립트를 확인하고 시험용 media에서 실행해야 합니다.

## Standard Boot와 bootflow

U-Boot Standard Boot는 bootdev, bootmeth, bootflow 개념으로 여러 boot source를 탐색합니다. `bootflow scan`은 구성·옵션에 따라 bootflow를 조사하거나 boot 가능한 항목을 실행합니다. U-Boot v2025.01 문서에 따르면 상세 명령 기능은 `CONFIG_BOOTSTD_FULL` 등 설정에 따라 달라집니다. bootmeth 목록, discovery 순서, device tree와 environment 설정이 맞지 않으면 예상한 후보가 나타나지 않을 수 있습니다.

Standard Boot가 기존 Distro Boot의 무조건적인 대체이거나 모든 보드의 fallback을 자동 보장하지 않습니다. Migration 가이드와 해당 보드의 boot policy를 확인해 단계적으로 선택합니다. `bootflow scan -b` 같은 실행 옵션은 실제로 OS를 시작할 수 있으므로, 실험 장치와 복구 경로 없이 자동 실행하지 마세요.

## 선택 기준과 시험

| 요구 | 먼저 확인할 것 |
|---|---|
| 배포판 공통 설치/부팅 | Generic Distro Configuration 요구사항과 보드 지원 feature |
| board-specific 명령 sequence | script format, signature/enforcement, side effect와 recovery |
| boot source 탐색 관리 | Standard Boot configuration, bootdev/bootmeth 지원, ordering |
| UEFI application/boot manager | U-Boot EFI support, partition/filesystem 및 firmware variable policy |

시험할 때는 U-Boot version/config, boot media partition map, configuration 파일과 device tree, 실제 부팅 command를 함께 저장합니다. 정상 configuration 외에 빠진 파일, 잘못된 kernel/DTB, 서명 거부와 두 번째 후보로의 이동도 확인해야 합니다. 이 글의 수정 과정에서는 U-Boot build, media, board나 QEMU를 준비하지 않아 discovery/bootflow를 실행하지 않았습니다.

## 정리

- Distro Boot는 U-Boot feature set과 distribution 설치 형식의 조합입니다.
- `extlinux.conf` 지원 범위와 경로는 사용 중인 U-Boot release/documentation으로 확인합니다.
- Legacy `boot.scr`의 CRC는 cryptographic signature가 아닙니다. FIT script signing도 별도 key policy가 필요합니다.
- Standard Boot의 discovery 순서와 자동 실행은 build/board configuration에 달립니다.
- boot scan/execute는 실제 image를 부팅할 수 있으므로 별도 시험 조건과 recovery path가 필요합니다.

## 다음 편

다음은 [Ch 30: 부트로더 CI](/blog/embedded/bootloader/chapter30-bootloader-ci)입니다. U-Boot sandbox, QEMU 지원 보드와 실기 시험이 서로 무엇을 검증하는지 구분합니다.

## 관련 항목

- [Ch 13: 환경 변수와 bootcmd](/blog/embedded/bootloader/chapter13-env-bootcmd)
- [Ch 14: bootflow / bootmeth](/blog/embedded/bootloader/chapter14-bootflow-bootmeth)
- [Ch 18: EFI in U-Boot](/blog/embedded/bootloader/chapter18-efi-in-uboot)
- [U-Boot v2025.01: Generic Distro Configuration](https://docs.u-boot.org/en/v2025.01/develop/distro.html)
- [U-Boot v2025.01: Standard Boot](https://docs.u-boot.org/en/v2025.01/develop/bootstd/index.html)
- [U-Boot v2025.01: bootflow command](https://docs.u-boot.org/en/v2025.01/usage/cmd/bootflow.html)
- [U-Boot v2025.01: source command](https://docs.u-boot.org/en/v2025.01/usage/cmd/source.html)
- [U-Boot v2025.01: FIT signature verification](https://docs.u-boot.org/en/v2025.01/usage/fit/signature.html)
