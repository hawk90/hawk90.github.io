---
title: "Linux Kernel Boot ABI — ARM, RISC-V, x86 진입 규약"
slug: "embedded/bootloader/chapter19-kernel-handoff"
date: 2026-05-09T09:19:00
description: "Linux ARM32·AArch64·RISC-V·x86 boot protocol의 인자, CPU 상태, 메모리 요구를 1차 문서에 따라 비교."
series: "Bootloader Internals"
seriesOrder: 19
tags: [embedded, bootloader, u-boot, linux-abi, kernel]
draft: false
topics: ["embedded"]
---

부트로더에서 Linux로 넘어갈 때는 아키텍처별 boot protocol이 정한 상태를 지켜야 합니다. 같은 CPU 계열이라도 직접 Image로 진입하는 경우와 EFI stub을 통하는 경우는 경로가 다릅니다. 이 장은 Linux v6.12의 공개 boot documentation을 기준으로 요구사항의 핵심만 비교하며, 실제 보드의 모든 CPU/system-register 설정을 대신하지 않습니다.

## 한 줄 요약

**커널 진입 규약은 아키텍처와 boot path에 따라 다릅니다.** AArch64의 x0=DTB 같은 레지스터 값만 맞추는 것으로 끝나지 않으며, 이미지 배치, cache/MMU, interrupt, firmware handoff도 해당 protocol에 맞아야 합니다.

## AArch64 direct boot

[Linux v6.12 AArch64 booting 문서](https://docs.kernel.org/6.12/arch/arm64/booting.html)는 Image 위치, DTB, CPU mode와 cache 상태를 구체적으로 정의합니다.

- Image는 usable RAM의 2 MiB-aligned base로부터 `text_offset`만큼 떨어진 곳에 둡니다. `image_size`가 0이 아니면 그 크기만큼 kernel이 사용할 수 있어야 합니다.
- DTB는 8-byte aligned이고 2 MiB를 넘지 않아야 합니다. 512 MiB 범위 제약은 v4.2 이전 kernel에 대한 주석이며 현재 일반 규칙으로 쓰면 안 됩니다.
- direct boot에서 x0은 RAM의 DTB physical address이고 x1–x3은 0입니다. CPU는 non-secure EL1 또는 권장되는 EL2에서 진입할 수 있습니다.
- MMU는 꺼져 있어야 하고 모든 DAIF interrupt를 mask합니다. D-cache가 단순히 꺼져 있어야 한다고 쓰지 않습니다. Image range는 PoC까지 clean하고 I-cache의 stale entry가 없어야 합니다.
- initrd를 전달하면 kernel Image를 포함하는 최대 32 GiB의 1-GiB-aligned physical window 안에 완전히 있어야 합니다.

EFI 경로는 EFI application/boot protocol을 통해 stub이 초기화를 수행하므로 위 direct-entry 요약을 그대로 EFI 진입에 적용하지 않습니다. 자세한 CPU feature register 조건은 같은 버전의 kernel 문서와 platform firmware specification을 확인해야 합니다.

## ARM32 direct boot

[Linux v6.12 ARM booting 문서](https://docs.kernel.org/6.12/arch/arm/booting.html)는 boot data를 r2로 전달하도록 정의합니다. DT-only platform은 r1 machine type을 `~0`으로 둘 수 있습니다.

- r0 = 0, r1 = machine type 또는 DT-only platform의 `~0`, r2 = ATAGS 또는 DTB physical address.
- DTB는 64-bit aligned이며 kernel decompressor가 덮어쓰지 않는 범위에 둡니다. 문서가 제시하는 safe placement는 RAM 시작 뒤 128 MiB 경계보다 위쪽입니다.
- DT와 ATAGS는 서로 다른 boot-data format이며 실제 kernel/platform이 기대하는 형식을 따라야 합니다.

이 요약은 ARM32의 전체 entry condition이나 오래된 board별 machine type 목록을 대체하지 않습니다.

## RISC-V direct boot

[Linux v6.12 RISC-V boot requirements](https://docs.kernel.org/6.12/arch/riscv/boot.html)에 따르면 a0에는 현재 hart ID, a1에는 DT 주소를 전달하며 `satp=0`이어야 합니다. Kernel image alignment와 resident firmware memory reservation도 함께 지켜야 합니다.

Linux가 항상 OpenSBI를 거친다고 일반화할 수 없습니다. firmware mode, SBI implementation 및 hart release 방식은 platform configuration에 따라 다릅니다. boot firmware는 resident memory를 DT 또는 EFI memory map에 올바르게 표시해야 합니다.

## x86 64-bit boot protocol

x86은 별도 setup/boot_params protocol을 사용합니다. [Linux v6.12 x86 boot protocol](https://docs.kernel.org/6.12/arch/x86/boot.html)의 64-bit entry 조건에는 `struct boot_params`를 가리키는 RSI, 64-bit mode와 paging, 정해진 segment/GDT 상태 및 interrupts disabled가 포함됩니다. Identity mapping은 임의로 “첫 4 GiB”라고 요약하지 않고 해당 protocol의 `init_size`와 memory range 조건을 따라야 합니다.

32-bit protected-mode와 real-mode entry는 서로 다른 protocol 단계와 fields를 사용합니다. `EBX/EBP/EDI/ESI`의 한 묶음을 모든 32-bit entry에 보편 레지스터 ABI로 제시하지 않습니다.

## U-Boot command와 Linux protocol 구분

U-Boot command는 이미지 형식별 boot path를 선택하며, 구체적인 가용성은 configuration에 달려 있습니다.

| 명령 | U-Boot v2025.01 문서의 용도 | 적용 시 확인할 점 |
|------|------------------------------|------------------|
| `bootm` | legacy image 또는 FIT OS boot | FIT configuration/subimage, initrd 및 FDT 인자 |
| `booti` | flat 또는 설정된 compressed `Image` 형식 | `CONFIG_CMD_BOOTI`, compression options와 address layout |
| `bootz` | Linux `zImage` 형식 | `CONFIG_CMD_BOOTZ`, initrd/FDT 주소 |
| `bootefi` | EFI application 및 EFI boot manager path | EFI protocol/build/board configuration; Linux direct-entry 레지스터와 혼동 금지 |

명령 이름만으로 cache/MMU 동작과 모든 ABI condition을 추정하지 않습니다. [bootm](https://docs.u-boot.org/en/v2025.01/usage/cmd/bootm.html), [booti](https://docs.u-boot.org/en/v2025.01/usage/cmd/booti.html), [bootz](https://docs.u-boot.org/en/v2025.01/usage/cmd/bootz.html) 문서의 syntax와 target build를 대조합니다.

## DTB, initrd와 command line

DTB/initrd의 위치 조건은 architecture별 protocol을 따릅니다. `fdt_high`나 `initrd_high`에 특정 값을 넣으면 항상 안전하다는 일반 규칙은 없습니다. 실제 memory map, relocation behavior, reserved regions와 image size를 확인해야 합니다.

U-Boot environment의 `bootargs`는 U-Boot boot path가 FDT를 준비하는 과정에서 사용될 수 있지만, 기존 `/chosen` properties와 board fixups를 포함한 결과를 target configuration에서 확인해야 합니다. 다음은 argument shape만 보이는 예이며 실행 기록이 아닙니다.

```text
=> booti <kernel-address> <initrd-address>:<initrd-size> <fdt-address>
```

DT의 `linux,initrd-start`/`linux,initrd-end` 인코딩과 `#address-cells`는 DT/platform에 따라 달라지므로 고정 32-bit/64-bit cell example을 보편값으로 사용하지 않습니다.

## 첫 출력이 없을 때

조용한 화면만으로 원인을 ABI 위반 하나로 좁힐 수 없습니다. UART/pinmux, kernel console arguments, image type/load address, DTB, cache maintenance와 early firmware handoff를 분리해 확인합니다. “90%” 같은 근거 없는 성공률 수치 대신, 재현 가능한 board log와 build/tag 정보를 함께 남깁니다.

## 정리

- AArch64 direct entry는 x0–x3뿐 아니라 image/DTB/initrd placement, EL, interrupts 및 cache/MMU 상태가 함께 맞아야 합니다.
- ARM32, RISC-V, x86은 서로 다른 Linux boot protocol을 사용합니다.
- U-Boot `bootm`/`booti`/`bootz`/`bootefi`는 이미지 및 boot path 선택을 설명하며 모든 ABI 검증을 자동 보장하는 것은 아닙니다.
- version-pinned kernel docs, U-Boot config/source, DT/memory map과 실제 target output을 함께 확인해야 합니다.

## 다음 장 예고

다음 장에서는 RAUC와 SWUpdate의 bundle/manifest와 bootloader integration을 비교합니다. 이 프레임워크가 slot policy를 자동으로 정한다고 가정하지 않고, target의 bootchooser contract를 구분해 살펴봅니다.

## 관련 항목

- [Ch 18: EFI in U-Boot](/blog/embedded/bootloader/chapter18-efi-in-uboot) — Linux EFI stub 이전의 EFI handoff
- [Ch 20: RAUC / SWUpdate](/blog/embedded/bootloader/chapter20-rauc-swupdate) — update framework와 bootchooser contract
- [Linux ARM64 boot protocol v6.12](https://docs.kernel.org/6.12/arch/arm64/booting.html)
- [Linux ARM boot protocol v6.12](https://docs.kernel.org/6.12/arch/arm/booting.html)
- [Linux RISC-V boot requirements v6.12](https://docs.kernel.org/6.12/arch/riscv/boot.html)
- [Linux x86 boot protocol v6.12](https://docs.kernel.org/6.12/arch/x86/boot.html)
