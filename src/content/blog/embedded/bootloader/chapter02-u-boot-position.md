---
title: "Das U-Boot vs TF-A vs EDK II — 임베디드 부트로더 생태계 비교"
slug: "embedded/bootloader/chapter02-u-boot-position"
date: 2026-05-09T09:02:00
description: "임베디드 부트로더 생태계 — Das U-Boot, ARM Trusted Firmware, EDK II의 역할 분담."
series: "Bootloader Internals"
seriesOrder: 2
tags: [embedded, bootloader, u-boot, tf-a, edk2]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

U-Boot, TF-A, EDK II, OpenSBI는 경쟁 제품이 아니라 부트 체인의 서로 다른 자리에 들어가는 부품입니다. U-Boot v2024.04로 `imx8mm_evk`를 빌드하면 최종 이미지 `flash.bin` 하나에 U-Boot SPL, NXP DDR PHY 펌웨어, TF-A BL31, U-Boot Proper가 binman으로 묶입니다. 서로 다른 세 출처의 바이너리입니다. 같은 자리를 다른 아키텍처에서는 다른 프로젝트가 맡습니다. RISC-V QEMU를 켜면 TF-A 대신 OpenSBI v1.8.1이 M-mode에서 먼저 올라옵니다.

## 네 프로젝트의 자리

| 프로젝트 | 자리 | 이 시리즈에서 실행한 것 |
|---------|------|------------|
| U-Boot | SPL(초기 단계), U-Boot Proper(부트 정책, Armv8에서는 BL33) | v2024.04 `qemu_arm64`, `imx8mm_evk` 빌드 |
| TF-A | BL1·BL2(trusted boot), BL31(EL3 상주 firmware), BL32 자리 제공 | v2.15.0 `PLAT=qemu` |
| EDK II | UEFI firmware | QEMU 포함 `edk2-stable202408`, Debian `AAVMF` |
| OpenSBI | RISC-V M-mode firmware (SBI 제공) | QEMU 포함 v1.8.1 |

TF-A v2.15.0 release 빌드(`PLAT=qemu`)의 크기는 BL1 22,832바이트, BL2 25,072바이트, BL31 49,255바이트입니다. `qemu_arm64` U-Boot는 1,047,344바이트입니다. Debian의 EDK II 빌드 `QEMU_EFI.fd`는 파일 크기가 3 MiB입니다. QEMU의 pflash용 `edk2-aarch64-code.fd`는 64 MiB로 패딩돼 있어 실제 코드 크기를 보여 주지 않습니다.

## U-Boot

U-Boot v2024.04의 README는 프로젝트의 출발을 이렇게 적습니다. 8xxrom 소스에서 시작해 PPCBoot 프로젝트를 만들고, ARMBoot로 ARM을 더한 뒤 U-Boot 프로젝트가 됐습니다. 공식 이름은 "Das U-Boot"이고, 글에서는 "U-Boot"로 씁니다.

U-Boot가 맡는 일은 부트 미디어 드라이버, 파일 시스템, 네트워크 부팅, 환경 변수와 bootstd 부트 정책, FIT 이미지와 서명 검증, DT fixup입니다. 시리즈의 [Ch 10](/blog/embedded/bootloader/chapter10-storage-boot)–[Ch 16](/blog/embedded/bootloader/chapter16-verified-boot)이 이 영역입니다.

U-Boot도 UEFI 인터페이스를 구현합니다. 다만 목표 범위가 정해져 있습니다. v2024.04 `doc/develop/uefi/uefi.rst`는 구현이 "Embedded Base Boot Requirements (EBBR) Specification - Release v2.1.0"의 요구사항을 목표로 한다고 하고, "A full blown UEFI implementation would contradict the U-Boot design principle "keep it small""이라고 적습니다. 그래서 U-Boot 위에서도 GRUB이나 Linux EFI stub을 실행할 수 있습니다([Ch 18](/blog/embedded/bootloader/chapter18-efi-in-uboot)).

## SPL은 U-Boot의 빌드 산출물

SPL은 별도 프로젝트가 아니라 같은 U-Boot 트리에서 `CONFIG_SPL=y`로 함께 나오는 바이너리입니다. `imx8mm_evk` 빌드 디렉터리에는 두 단계가 따로 있습니다.

| 파일 | 크기 (바이트) | 단계 |
| --- | --- | --- |
| `spl/u-boot-spl.bin` | 152,599 | SPL (SRAM에서 실행, DDR 초기화) |
| `u-boot.bin` | 713,888 | U-Boot Proper (DTB 포함) |

SPL 쪽 옵션은 `CONFIG_SPL_*`로 따로 켜고 끕니다. SPL이 쓰는 SRAM 위치와 크기 한계는 [Ch 24](/blog/embedded/bootloader/chapter24-spl-deep)에서 이 빌드의 링커 맵으로 봅니다.

## 한 이미지 안의 세 출처 — imx8mm_evk의 flash.bin

U-Boot v2024.04의 `imx8mm_evk`는 NXP의 별도 도구 `imx-mkimage` 대신 U-Boot 안의 binman으로 부트 이미지를 조립합니다. 빌드가 남긴 binman 맵 세 개를 합치면 구조가 보입니다.

```text
ImagePos    Offset      Size  Name
00000000  00000000  001090a0  imx-boot
00000000   00000000  00027600  spl
00057c00   00057c00  000b14a0  uboot
```

```text
ImagePos    Offset      Size  Name
00000000  00000000  00025418  u-boot-spl-ddr
00000000   00000000  00025417  u-boot-spl
00000000    00000000  00023410  u-boot-spl-nodtb
00023410    00023410  00002007  u-boot-spl-dtb
00025418   00025418  00000000  ddr-1d-imem-fw
00025418   00025418  00000000  ddr-1d-dmem-fw
00025418   00025418  00000000  ddr-2d-imem-fw
00025418   00025418  00000000  ddr-2d-dmem-fw
```

```text
ImagePos    Offset      Size  Name
00000000  00000000  000b14a0  itb
00000000   00000000  000b14a0  fit
00003000    00003000  000a43d0  uboot
000a73d0    000a73d0  00000000  atf
000a73d0    000a73d0  00000000  fip
```

(`imx-boot.map`, `u-boot-spl-ddr.map`, `itb.map`. `itb.map`의 `uboot-blob`·`atf-blob` 줄 생략)

| 조각 | 출처 | 이 빌드의 크기 |
| --- | --- | --- |
| U-Boot SPL (+ SPL용 DTB) | U-Boot 트리 | 0x23410 + 0x2007 |
| `lpddr4_pmu_train_{1d,2d}_{imem,dmem}.bin` | NXP DDR PHY 펌웨어 (별도 배포) | 0 (없음) |
| U-Boot Proper | U-Boot 트리 | 0xa43d0 |
| `bl31.bin` | TF-A 트리 | 0 (없음) |

DDR 펌웨어와 BL31의 크기가 0인 것은 이 빌드에 그 파일들을 넣지 않았기 때문입니다. binman이 그대로 알려 줍니다.

```text
Image 'u-boot-spl-ddr' is missing external blobs and is non-functional: ddr-1d-imem-fw ddr-1d-dmem-fw ddr-2d-imem-fw ddr-2d-dmem-fw
Image 'itb' is missing external blobs and is non-functional: atf-blob
```

`BINMAN_ALLOW_MISSING=1`로 빌드를 끝까지 진행시켜 배치만 확인한 것입니다. 이 `flash.bin`(1,085,600바이트)은 보드에서 부팅되지 않습니다. 실제 이미지를 만들려면 TF-A에서 `PLAT=imx8mm`로 만든 `bl31.bin`과 NXP 펌웨어 파일을 빌드 디렉터리에 둬야 합니다. 이 결과가 이 장의 핵심입니다. 한 보드의 부팅 가능한 이미지 하나가 세 출처의 바이너리를 요구합니다.

![i.MX 8M 계열 부트 체인 — BootROM → SPL → BL31 → U-Boot Proper → Kernel](/images/blog/bootloader/diagrams/chapter02-imx-boot-chain.svg)

## TF-A

Trusted Firmware-A는 Arm A-profile용 trusted firmware의 참조 구현입니다. 단계 이름은 BL(Boot Loader) 번호로 붙습니다.

| 단계 | 역할 | QEMU에서 본 것 ([Ch 1](/blog/embedded/bootloader/chapter01-boot-problem)) |
| --- | --- | --- |
| BL1 | reset 직후 첫 trusted 코드, BL2 적재 | 주소 0, EL3 |
| BL2 | trusted boot, 다음 이미지들 적재·검증 | 0xe05b000, S-EL1 |
| BL31 | EL3 상주 runtime (PSCI, SMC 분배) | 0xe090000, EL3 |
| BL32 | secure-EL1 payload (OP-TEE 등, 선택) | 이 빌드에는 없음 |
| BL33 | normal world firmware (U-Boot, EDK II) | 0x60000000, EL1 |

i.MX 8M Mini는 BL1·BL2를 쓰지 않습니다. BootROM 다음을 U-Boot SPL이 맡고, SPL이 BL31을 올립니다. 위 binman 맵에 BL1·BL2가 없는 이유입니다. QEMU 구성은 TF-A가 BL1부터 맡는 반대 사례입니다.

BL31은 부팅이 끝나도 메모리에 남아 커널의 SMC 호출에 답합니다. [Ch 31](/blog/embedded/bootloader/chapter31-tfa-bl31-runtime)에서 BL31이 링크한 서비스를 읽고, [Ch 32](/blog/embedded/bootloader/chapter32-psci-smccc)에서 U-Boot로 PSCI `CPU_ON`을 직접 보냅니다. secondary CPU를 깨우는 방법이 PSCI만은 아닙니다. [Ch 33](/blog/embedded/bootloader/chapter33-smp-secondary-cpu-bringup)에서 spin-table을 다룹니다.

## EDK II

EDK II는 TianoCore가 관리하는 UEFI/PI firmware 개발 환경입니다. Arm 서버, x86 PC, 그리고 QEMU 가상 머신의 기본 UEFI firmware로 쓰입니다. 이 시리즈에서는 두 빌드를 실행했습니다. QEMU에 포함된 `edk2-stable202408`은 Secure Boot가 없는 빌드였고, Debian 13 `qemu-efi-aarch64`의 `AAVMF_CODE.secboot.fd`는 Secure Boot를 강제했습니다([Ch 37](/blog/embedded/bootloader/chapter37-secureboot-cert-rollover)). 같은 프로젝트라도 빌드 옵션에 따라 제공 기능이 다르다는 예입니다.

| 구성 | 실행한 부트 체인 |
| --- | --- |
| QEMU virt + TF-A + U-Boot | BL1 → BL2 → BL31 → U-Boot(BL33) → `booti` → Linux |
| QEMU virt + EDK II | UEFI firmware → shim(`EFI/BOOT/BOOTAA64.EFI`, 로그 출력 없음) → grub → Linux EFI stub |

두 번째 구성에서 커널은 하드웨어 정보를 ACPI로 받습니다. EFI stub이 "Generating empty DTB"를 남겼습니다([Ch 1](/blog/embedded/bootloader/chapter01-boot-problem)).

## OpenSBI — RISC-V의 M-mode firmware

RISC-V에서 TF-A BL31에 해당하는 자리는 OpenSBI입니다. M-mode에서 상주하며 S-mode의 커널이나 U-Boot에 SBI 호출을 제공합니다. QEMU의 `-M virt`는 `-bios`를 주지 않으면 포함된 OpenSBI `fw_dynamic`을 씁니다.

```text
OpenSBI v1.8.1
...
Platform Name               : riscv-virtio,qemu
Platform HART Count         : 1
Firmware Base               : 0x80000000
Firmware Size               : 321 KB
Runtime SBI Version         : 3.0
Standard SBI Extensions     : time,rfnc,ipi,base,hsm,srst,pmu,dbcn,fwft,legacy,dbtr,sse
Domain0 Next Address        : 0x0000000000000000
Domain0 Next Arg1           : 0x000000009fe00000
Domain0 Next Mode           : S-mode
```

(ASCII 로고와 PMP·HART 상세 줄 생략. `qemu-system-riscv64 -M virt -nographic -m 512`)

OpenSBI는 RAM 시작 0x80000000에 321 KB로 자리 잡고, 다음 단계를 S-mode로 넘기려고 준비합니다. `Next Arg1` 0x9fe00000은 다음 단계에 넘길 DTB 주소입니다. 이 실행에는 커널도 U-Boot도 주지 않았으므로 `Next Address`가 0이고 그 뒤로 진행하지 않았습니다. 표준 확장 목록의 `hsm`(Hart State Management)이 Armv8 PSCI의 `CPU_ON`·`CPU_OFF`에 해당하는 역할을 합니다.

U-Boot v2024.04 `doc/board/emulation/qemu-riscv.rst`는 U-Boot SPL과 함께 쓰는 구성을 이렇게 설명합니다. SPL이 M-mode에서 시작해 U-Boot Proper와 OpenSBI `FW_DYNAMIC`을 FIT 이미지에서 올리고, OpenSBI가 U-Boot Proper를 S-mode로 시작합니다. i.MX 8M Mini에서 SPL이 BL31과 U-Boot Proper를 FIT에서 꺼내는 구조와 같은 모양입니다.

## 자리를 정하는 기준

| 플랫폼 | 이 시리즈에서 본 구성 | 무엇이 결정하나 |
| --- | --- | --- |
| Arm 임베디드 SoC | BootROM → U-Boot SPL → TF-A BL31 → U-Boot Proper | SoC 벤더 BSP가 지원하는 조합, SRAM 크기 |
| Arm 가상 머신 | TF-A BL1부터, 또는 U-Boot 단독, 또는 EDK II | 에뮬레이터가 구현한 EL, 게스트 OS의 기대 (DT vs ACPI) |
| RISC-V | OpenSBI (M) → U-Boot 또는 커널 (S) | SBI 구현 |

실제 제품은 SoC 벤더 BSP가 검증한 조합에서 출발하는 것이 보통입니다. i.MX 8M Mini의 경우 U-Boot 업스트림 `imx8mm_evk`가 요구하는 외부 파일 목록이 binman 경고로 그대로 나왔습니다.

## 자주 하는 오해

- **"U-Boot이 TF-A를 대체한다"** — 자리가 다릅니다. QEMU TF-A 구성에서 BL31은 EL3에, U-Boot는 non-secure EL1에 동시에 있었습니다.
- **"UEFI = EDK II"** — UEFI는 규격이고 EDK II는 그 구현 중 하나입니다. U-Boot도 EBBR 범위의 UEFI를 구현합니다.
- **"SPL은 별도 프로젝트다"** — 같은 트리에서 `spl/u-boot-spl.bin`으로 함께 나옵니다.
- **"부트 이미지는 U-Boot만 빌드하면 된다"** — `imx8mm_evk`는 TF-A BL31과 NXP DDR 펌웨어 없이는 "non-functional" 이미지가 됩니다.

## 정리

- U-Boot은 SPL과 Proper 두 단계로 부트 미디어·정책·이미지 검증을 맡고, UEFI는 EBBR 범위만 구현합니다.
- TF-A는 BL1·BL2·BL31 단계를 제공합니다. i.MX 8M Mini는 BL31만 쓰고, QEMU 구성은 BL1부터 씁니다.
- `imx8mm_evk`의 `flash.bin`은 binman이 U-Boot SPL, NXP DDR 펌웨어, TF-A BL31, U-Boot Proper를 묶은 이미지입니다.
- EDK II는 같은 프로젝트라도 빌드에 따라 Secure Boot 같은 기능이 다릅니다.
- RISC-V에서는 OpenSBI가 M-mode에 상주하며 SBI(`hsm` 등)를 제공합니다.

## 다음 편

[Ch 3: 빌드 시스템 — Kconfig, Makefile, defconfig](/blog/embedded/bootloader/chapter03-build-system)에서는 U-Boot 소스 트리의 빌드 시스템을 다룹니다. `make qemu_arm64_defconfig`로 시작해 옵션을 바꾸고, defconfig 파일이 어떻게 동작하는지 봅니다.

## 근거 자료

- U-Boot v2024.04: `README`(Where we come from, Names and Spelling), `doc/develop/uefi/uefi.rst`(EBBR 목표), `doc/board/emulation/qemu-riscv.rst`(SPL + OpenSBI FW_DYNAMIC).
- 이 시리즈의 빌드 산출물: `imx8mm_evk` binman 맵(`imx-boot.map`, `u-boot-spl-ddr.map`, `itb.map`)과 빌드 로그, TF-A v2.15.0 `PLAT=qemu` release 바이너리.
- QEMU 11.1.3 `qemu-system-riscv64 -M virt` 부팅 로그(OpenSBI v1.8.1).
- [Trusted Firmware-A: Firmware Design](https://trustedfirmware-a.readthedocs.io/en/v2.15.0/design/firmware-design.html): BL 단계.
- [OpenSBI](https://github.com/riscv-software-src/opensbi), [TianoCore EDK II](https://www.tianocore.org/).

## 관련 항목

- [Ch 1: 부트로더가 푸는 문제](/blog/embedded/bootloader/chapter01-boot-problem)
- [Ch 3: 빌드 시스템](/blog/embedded/bootloader/chapter03-build-system)
- [Ch 4: 부트 단계](/blog/embedded/bootloader/chapter04-boot-stages)
- [Ch 18: EFI in U-Boot](/blog/embedded/bootloader/chapter18-efi-in-uboot)
- [BSP Ch 7: TF-A와 TrustZone 통합](/blog/embedded/bsp/chapter07-tfa-trustzone)
- [Embedded Security Ch 2: Secure Boot 체인](/blog/embedded/embedded-security/chapter02-secure-boot)
