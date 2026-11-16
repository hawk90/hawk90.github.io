---
title: "ROM부터 init까지 — 부트로더가 채우는 부팅 단계"
slug: "embedded/bootloader/chapter01-boot-problem"
date: 2026-05-09T09:01:00
description: "BootROM에서 커널과 init으로 이어지는 흐름에서 부트로더가 맡는 초기화·이미지 적재·인계 역할을 설명합니다."
series: "Bootloader Internals"
seriesOrder: 1
tags: [embedded, bootloader, u-boot, boot]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

전원이 들어온 CPU는 정해진 주소에서, 정해진 Exception level로 첫 명령어를 실행합니다. 그 순간부터 Linux의 `init`이 돌기까지 메모리를 쓸 수 있게 만들고, 다음 이미지를 찾아 올려놓고, 커널이 요구하는 상태로 점프하는 일을 부트 체인이 나눠 맡습니다. 같은 QEMU `virt`에서도 옵션 하나에 따라 첫 명령어의 EL이 EL1·EL2·EL3로 바뀌고, 부트 체인은 U-Boot 하나일 수도, TF-A BL1→BL2→BL31→U-Boot의 네 단계일 수도 있습니다. 이 글은 그 차이를 직접 보여 주며 시리즈의 출발점을 잡습니다.

## 실험 환경

| 항목 | 값 |
| --- | --- |
| QEMU | 11.1.3, `-M virt -cpu cortex-a57 -m 1024` |
| U-Boot | v2024.04 `qemu_arm64_defconfig`, aarch64-elf-gcc 16.2.0 |
| TF-A | v2.15.0 `PLAT=qemu` (BL33 = 위 U-Boot) |
| UEFI 경로 | QEMU 포함 EDK2(`edk2-stable202408`) + Debian 13 arm64, 커널 6.12.116. 이 실행만 [Ch 35](/blog/embedded/bootloader/chapter35-uefi-cxl-init)의 VM(`-M virt,gic-version=3,cxl=on -cpu max -smp 4 -m 4g`) 로그 |

이 시리즈의 실측은 대부분 이 QEMU 구성에서 나옵니다. 실제 SoC는 [Ch 23](/blog/embedded/bootloader/chapter23-bootrom-efuse-otp)부터 U-Boot `imx8mm_evk` 빌드 산출물(SPL 배치, binman 이미지, DDR 설정 코드)로 다룹니다. 하드웨어 보드에서 실행한 기록은 없습니다.

## 전원이 들어온 직후의 CPU

Armv8-A에서 reset 직후의 Exception level은 그 PE가 구현한 가장 높은 EL입니다. EL3와 EL2는 선택 사항이므로 "항상 EL3에서 시작한다"고 할 수 없습니다. QEMU에서 그대로 보입니다. `-S`로 첫 명령어 전에 멈추고 monitor의 `info registers`로 PSTATE를 읽었습니다.

```text
=== -M virt
PSTATE=00000000400003c5 -Z-- EL1h    FPU disabled
=== -M virt,virtualization=on
PSTATE=00000000400003c9 -Z-- EL2h     FPCR=00000000 FPSR=00000000
=== -M virt,secure=on
PSTATE=00000000400003cd -Z-- EL3h     FPCR=00000000 FPSR=00000000
```

PSTATE 하위 4비트(M[3:0])가 0x5면 EL1h, 0x9면 EL2h, 0xd면 EL3h입니다. 기본 `virt`는 EL2·EL3를 구현하지 않은 CPU처럼 동작해 EL1에서 시작합니다. `virtualization=on`은 EL2를, `secure=on`은 EL3를 더합니다. 첫 명령어 주소는 `PC=0000000000000000`이고, QEMU `virt`는 `-bios`로 준 파일을 주소 0의 flash에 둡니다. 실제 SoC에서는 이 자리에 mask ROM의 BootROM이 있습니다.

![Reset 직후 흐름 — 전원 → POR(PMIC rail + PLL lock + CPU deassert) → Reset Vector(SoC 고정 주소) → BootROM(boot mode strap에 따라 다음 단계 적재)](/images/blog/bootloader/diagrams/ch01-reset-flow.svg)

BootROM은 SoC 제조 시 mask ROM에 들어간 코드라서 바꿀 수 없습니다. boot mode 핀과 fuse를 읽어 다음 이미지를 어느 장치에서 가져올지 정하고, 그 이미지를 SoC 내부 SRAM에 올려 실행합니다. i.MX 8M Mini에서 그 첫 이미지(U-Boot SPL)가 어디에 놓이는지는 [Ch 23](/blog/embedded/bootloader/chapter23-bootrom-efuse-otp)·[Ch 24](/blog/embedded/bootloader/chapter24-spl-deep)에서 빌드 산출물로 확인합니다.

## 부트로더가 하는 네 가지 일

### 1. DRAM 초기화

내부 SRAM은 reset 직후 바로 쓸 수 있지만 작습니다. 커널과 rootfs를 올릴 DRAM은 controller와 PHY를 설정하고 training을 끝내야 쓸 수 있습니다. 임베디드 SoC에서는 그 코드를 SPL 같은 초기 단계가 SRAM 안에서 실행합니다. [Ch 9](/blog/embedded/bootloader/chapter09-dram-init)와 [Ch 26](/blog/embedded/bootloader/chapter26-ddr-training)에서 i.MX 8M의 실제 코드를 봅니다. QEMU `virt`에는 이 단계가 없습니다. 에뮬레이터의 RAM은 처음부터 쓸 수 있어서, U-Boot가 곧바로 `DRAM:  1 GiB`를 출력합니다.

### 2. 다음 이미지 찾기와 적재

커널은 eMMC·SD·NAND·SPI flash·USB·네트워크 어디서든 올 수 있습니다. 부트로더가 그 장치의 controller를 깨우고, 파일 시스템이나 raw 영역에서 이미지를 읽어 메모리에 올립니다. U-Boot v2024.04는 이 탐색을 bootstd로 합니다([Ch 29](/blog/embedded/bootloader/chapter29-distro-boot)).

### 3. 커널 진입 조건 맞추기

Linux v6.12 `Documentation/arch/arm64/booting.rst`는 primary CPU가 커널에 들어갈 때 `x0`에 시스템 RAM 안 DTB의 물리 주소, `x1`–`x3`에 0을 요구합니다. MMU는 꺼져 있어야 하고, CPU는 non-secure EL2(권장) 또는 non-secure EL1이어야 합니다. instruction cache는 켜져 있어도 되지만 커널 이미지에 대한 stale 항목이 없어야 합니다. [Ch 19](/blog/embedded/bootloader/chapter19-kernel-handoff)에서 U-Boot `booti` 직후 커널 첫 명령어에 gdb로 멈춰 이 레지스터 값을 직접 읽습니다.

### 4. 부트 정책

어느 장치·파티션에서 부팅할지, kernel command line은 무엇인지, A/B 슬롯 중 어느 쪽이 활성인지를 누군가 정해야 합니다. U-Boot는 환경 변수와 bootstd 순서로 정합니다([Ch 13](/blog/embedded/bootloader/chapter13-env-bootcmd), [Ch 20](/blog/embedded/bootloader/chapter20-rauc-swupdate)).

## 같은 QEMU, 세 가지 부트 체인

### U-Boot 하나

`-M virt -bios u-boot.bin`이면 주소 0의 첫 명령어가 곧 U-Boot입니다. 이 경로의 부트 체인은 U-Boot 하나로 끝납니다.

```text
U-Boot 2024.04 (Nov 15 2026 - 20:43:03 +0900)
DRAM:  1 GiB
Core:  51 devices, 14 uclasses, devicetree: board
Flash: 64 MiB
...
=> bdinfo
...
relocaddr   = 0x000000007f6d7000
fdt_blob    = 0x000000007e596d90
```

(출력 일부 발췌)

QEMU는 생성한 DTB를 RAM 시작(0x40000000)에 둡니다(`board/emulation/qemu-arm/qemu-arm.c`의 `board_fdt_blob_setup()`이 "QEMU loads a generated DTB for us at the start of RAM"이라며 `CFG_SYS_SDRAM_BASE`를 돌려줌, `devicetree: board`). `bdinfo`의 `fdt_blob` 0x7e596d90은 U-Boot가 relocation할 때 RAM 위쪽으로 복사한 사본입니다(`new_fdt`와 같은 값). U-Boot 자신은 0x7f6d7000으로 relocation했습니다([Ch 8](/blog/embedded/bootloader/chapter08-board-init)).

### TF-A BL1 → BL2 → BL31 → U-Boot

`-M virt,secure=on`에 TF-A v2.15.0의 BL1을 주소 0에, FIP를 flash에 넣으면 같은 U-Boot가 네 번째 단계가 됩니다. 디버그 빌드 로그에서 각 단계가 다음 단계의 진입 주소와 SPSR을 남깁니다.

```text
NOTICE:  Booting Trusted Firmware
NOTICE:  BL1: v2.15.0(debug):v2.15.0
INFO:    BL1: Loading BL2
NOTICE:  BL1: Booting BL2
INFO:    Entry point address = 0xe05b000
INFO:    SPSR = 0x3c5
NOTICE:  BL2: v2.15.0(debug):v2.15.0
INFO:    Loading image id=3 at address 0xe090000
INFO:    Loading image id=5 at address 0x60000000
NOTICE:  BL1: Booting BL31
INFO:    Entry point address = 0xe090000
INFO:    SPSR = 0x3cd
NOTICE:  BL31: v2.15.0(debug):v2.15.0
...
INFO:    BL31: Preparing for EL3 exit to normal world
INFO:    Entry point address = 0x60000000
INFO:    SPSR = 0x3c5
```

(CPU erratum 줄 등 생략)

| 단계 | 진입 주소 | SPSR | 실행 EL |
| --- | --- | --- | --- |
| BL1 | 0x0 (reset) | — | EL3 |
| BL2 | 0xe05b000 (secure SRAM) | 0x3c5 | S-EL1 |
| BL31 | 0xe090000 | 0x3cd | EL3 |
| BL33 = U-Boot | 0x60000000 (DRAM) | 0x3c5 | non-secure EL1 |

BL2가 BL31(image id 3)과 BL33(image id 5)을 둘 다 메모리에 올리고, BL31이 EL3에 상주한 채 U-Boot를 non-secure EL1로 내보냅니다. 이 구성은 EL2가 없어서 U-Boot가 EL1에서 돕니다. 단계별 상세는 [Ch 25](/blog/embedded/bootloader/chapter25-tfa-optee)와 [Ch 31](/blog/embedded/bootloader/chapter31-tfa-bl31-runtime)에서 봅니다.

### UEFI → shim·grub → Linux → init

QEMU 포함 EDK2로 Debian 13을 부팅하면 U-Boot 없이 UEFI 펌웨어가 부트로더 자리에 섭니다. 로그에서 단계마다 한 줄씩 골랐습니다. BdsDxe가 실행한 "UEFI Misc Device"는 ESP의 기본 경로 `EFI/BOOT/BOOTAA64.EFI`이고, 이 파일은 `EFI/debian/shimaa64.efi`와 SHA-256이 같은 shim입니다. shim은 콘솔에 아무것도 출력하지 않고 바로 grub을 실행하므로 로그에는 줄이 없습니다.

```text
UEFI firmware (version edk2-stable202408-prebuilt.qemu.org built at 16:28:50 on Sep 12 2024)
Loading Linux 6.12.116+deb13-arm64 ...
Loading initial ramdisk ...
EFI stub: Booting Linux Kernel...
EFI stub: Loaded initrd from LINUX_EFI_INITRD_MEDIA_GUID device path
EFI stub: Generating empty DTB
EFI stub: Exiting boot services...
[    0.000000] Booting Linux on physical CPU 0x0000000000 [0x000f0510]
[    2.006025] Freeing unused kernel memory: 3136K
[    2.271662] Run /init as init process
[    5.462069] systemd[1]: systemd 257.13-1~deb13u1 running in system mode (...)
Welcome to Debian GNU/Linux 13 (trixie)!
```

(systemd 기능 목록 생략)

`Loading Linux`·`Loading initial ramdisk`는 grub, `EFI stub:`은 커널 이미지 자신이 UEFI 프로그램으로 실행되며 남긴 줄입니다. 이 경로에서 하드웨어 기술은 ACPI로 넘어가므로 EFI stub이 빈 DTB를 만듭니다. 커널 타임스탬프 2.27초에 initramfs의 `/init`이 첫 user space 프로세스로 실행되고, 5.46초에 실제 rootfs의 systemd가 올라옵니다. 이 셋째 경로는 [Ch 18](/blog/embedded/bootloader/chapter18-efi-in-uboot)·[Ch 35](/blog/embedded/bootloader/chapter35-uefi-cxl-init)·[Ch 37](/blog/embedded/bootloader/chapter37-secureboot-cert-rollover)에서 이어집니다.

![전체 부트 체인 — POR → BootROM → SPL/BL1+BL2 → BL31(TF-A) → U-Boot Proper/BL33 → Linux Kernel → user space, 각 단계가 다음 단계를 메모리에 적재하고 점프](/images/blog/bootloader/diagrams/ch01-full-boot-chain.svg)

그림은 실제 SoC에서 흔한 가장 긴 형태입니다. 위 세 실험처럼 단계 수와 각 단계를 맡는 프로젝트는 플랫폼마다 다르고, 공통점은 앞 단계가 다음 단계를 메모리에 올리고 진입 조건을 맞춰 점프한다는 것 하나입니다.

## 아키텍처별 차이

| | Armv8-A | Armv7-A | RISC-V |
| --- | --- | --- | --- |
| 권한 단계 | EL0–EL3 (EL2·EL3 선택) | PL0–PL2, Security Extensions의 Monitor 모드 선택 | U/S/M mode (S는 선택) |
| reset 직후 | 구현된 최고 EL | 구현에 따라 Secure SVC 등 | M-mode |
| 상주 firmware | TF-A BL31 (PSCI 등) | 선택, 없는 구성도 흔함 | OpenSBI (SBI) |
| U-Boot 위치 | BL33, non-secure EL2/EL1 | SPL → U-Boot | OpenSBI 위 S-mode |

이 시리즈는 Armv8-A를 기준으로 하고, 다른 아키텍처는 [Ch 19](/blog/embedded/bootloader/chapter19-kernel-handoff)의 커널 인계처럼 차이가 의미 있는 곳에서만 짚습니다.

## 부트 시간은 단계별로 잰다

위 UEFI 경로에서 커널 시계로 2.27초에 `/init`, 5.46초에 systemd가 나왔습니다. 이 숫자는 커널 진입 이후만 잽니다. 펌웨어와 부트로더 시간은 커널 타임스탬프에 들어가지 않습니다. 제품에서는 "화면이 켜졌다", "네트워크가 붙었다", "서비스가 준비됐다"처럼 완료 지점을 먼저 정하고, 단계별로 따로 계측해야 합니다.

| 단계 | 재는 방법 |
| --- | --- |
| BootROM·SPL·U-Boot | U-Boot `bootstage`(`CONFIG_BOOTSTAGE`), GPIO 토글과 오실로스코프 |
| 커널 | dmesg 타임스탬프, `initcall_debug` |
| user space | `systemd-analyze` 등 |

U-Boot가 병목이면 SPL이 커널을 바로 올리는 [Falcon Mode](/blog/embedded/bootloader/chapter05-falcon-mode)를 검토할 수 있습니다.

## 자주 하는 오해

- **"부트로더는 항상 여러 단계다"** — QEMU `-bios u-boot.bin`은 U-Boot 한 단계였습니다. 단계 수는 SRAM 크기, DRAM 초기화 필요성, secure world 유무가 정합니다.
- **"Armv8은 항상 EL3에서 시작한다"** — 기본 `virt`는 EL1에서 시작했습니다. EL3가 구현된 경우에만 EL3입니다.
- **"BootROM도 고칠 수 있다"** — mask ROM은 바꿀 수 없습니다. fuse로 boot 장치나 보안 정책 같은 동작만 고정할 수 있습니다([Ch 23](/blog/embedded/bootloader/chapter23-bootrom-efuse-otp)).
- **"커널이 저장 장치에서 자기를 읽어 온다"** — 커널은 이미 메모리에 올라온 상태에서 시작합니다. UEFI 경로에서도 커널을 읽은 것은 grub이었고, EFI stub은 메모리에 올라온 뒤에 실행됐습니다.

## 정리

- reset 직후 EL은 구현된 최고 EL입니다. QEMU `virt`에서 옵션에 따라 EL1·EL2·EL3로 달라졌습니다.
- 부트로더의 일은 DRAM 초기화, 다음 이미지 적재, 커널 진입 조건 맞추기, 부트 정책 네 가지입니다.
- 같은 QEMU에서 부트 체인은 U-Boot 하나, TF-A 네 단계, UEFI + grub 세 가지 모양으로 나왔습니다.
- AArch64 Linux 진입 조건은 `x0` = DTB 물리 주소, `x1`–`x3` = 0, MMU off, non-secure EL2 또는 EL1입니다.
- 부트 시간은 완료 지점을 정하고 단계별로 잽니다. 커널 타임스탬프는 펌웨어 시간을 포함하지 않습니다.

## 다음 편

[Ch 2: U-Boot의 위치 — Das U-Boot, TF-A, EDK II](/blog/embedded/bootloader/chapter02-u-boot-position)에서는 임베디드 부트로더 생태계의 분업을 정리합니다. U-Boot이 어디서 일하고, TF-A·EDK II·LinuxBoot가 어떤 자리를 차지하는지 봅니다.

## 근거 자료

- Linux v6.12 [`Documentation/arch/arm64/booting.rst`](https://docs.kernel.org/6.12/arch/arm64/booting.html): 커널 진입 레지스터와 CPU 상태.
- [U-Boot v2024.04: QEMU ARM](https://docs.u-boot.org/en/v2024.04/board/emulation/qemu-arm.html): `qemu_arm64_defconfig` 실행.
- [Arm: AArch64 Exception model](https://developer.arm.com/-/media/Arm%20Developer%20Community/PDF/Learn%20the%20Architecture/Exception%20model.pdf): Exception level과 reset.
- TF-A v2.15.0 `docs/plat/qemu.rst`: QEMU 플랫폼의 BL1·FIP 배치.
- 이 글의 실행 로그: QEMU monitor `info registers`, U-Boot `bdinfo`, TF-A 디버그 빌드 부팅, EDK2 + Debian 13 부팅.

## 관련 항목

- [Ch 2: U-Boot의 위치](/blog/embedded/bootloader/chapter02-u-boot-position)
- [Ch 4: 부트 단계](/blog/embedded/bootloader/chapter04-boot-stages)
- [Ch 9: DRAM 초기화](/blog/embedded/bootloader/chapter09-dram-init)
- [Ch 19: Linux Boot ABI](/blog/embedded/bootloader/chapter19-kernel-handoff)
- [BSP Ch 6: U-Boot 보드 포팅](/blog/embedded/bsp/chapter06-u-boot-porting)
- [Embedded Security Ch 2: Secure Boot 체인](/blog/embedded/embedded-security/chapter02-secure-boot)
