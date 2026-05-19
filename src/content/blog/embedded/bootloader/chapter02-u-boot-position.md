---
title: "Ch 2: U-Boot의 위치 — Das U-Boot, TF-A, EDK II"
date: 2026-05-09T02:00:00
description: "임베디드 부트로더 생태계 — Das U-Boot, ARM Trusted Firmware, EDK II의 역할 분담."
series: "Bootloader Internals"
seriesOrder: 2
tags: [embedded, bootloader, u-boot, tf-a, edk2]
draft: false
---

## 한 줄 요약

> **"U-Boot은 *부트 정책*을, TF-A는 *secure world*를, EDK II는 *UEFI 표준 준수*를, LinuxBoot은 *kexec-기반 단순화*를 담당합니다."** — 한 보드에 *함께* 쓰이는 경우가 더 많습니다. 라이벌이 아니라 *분업*입니다.

"임베디드 부트로더 = U-Boot"이라는 인식이 있지만 실제 산업용 ARMv8-A 시스템에는 *U-Boot 하나만* 들어가지 않습니다. TF-A가 BL1·BL2·BL31을 담당하고, U-Boot이 BL33으로 동작하며, OPTEE가 BL32로 secure OS 자리를 차지합니다. 각 컴포넌트의 *역할*을 알아야 어디서 무엇이 일하는지 보입니다.

## 네 가지 부트로더의 자리

다음 네 가지가 *서로 다른 자리*에 들어가는 부트로더입니다.

| 컴포넌트 | 정식 명칭 | 자리 | 대표 사용처 |
|---------|---------|------|------------|
| U-Boot | Das U-Boot | 부트 정책, BL33 | 임베디드 ARM/RISC-V |
| TF-A | Trusted Firmware-A | BL1·BL2·BL31 | ARMv8-A secure boot |
| EDK II | EFI Development Kit II | UEFI firmware | ARM 서버, x86 워크스테이션 |
| LinuxBoot | Linux as firmware | UEFI 이후 단계 대체 | Google, Facebook 서버 |

같은 보드에 *여러 개가 동시에* 들어갑니다. NXP i.MX 8M Plus 양산 보드의 부트 체인은 다음과 같습니다.

```text
BootROM (i.MX 내부)
   │
   ▼
SPL (U-Boot 빌드의 SPL 단계)  ← DDR init
   │
   ▼
BL31 (TF-A)                    ← secure monitor
   │
   ▼
U-Boot Proper (BL33)            ← 부트 정책
   │
   ▼
Linux Kernel
```

SPL과 U-Boot Proper는 모두 *U-Boot 소스 트리*에서 빌드되지만 *완전히 다른 바이너리*입니다. BL31은 *TF-A 소스 트리*에서 빌드됩니다. 두 프로젝트가 *서로의 결과물을 link*해서 최종 부트 이미지를 만듭니다.

## Das U-Boot — 임베디드의 사실상 표준

Wolfgang Denx가 1999년에 시작한 PowerPC 부트로더 PPCBoot에서 출발했습니다. 2002년 ARM 지원 추가 후 *Das U-Boot*으로 개명. 현재는 ARM, RISC-V, MIPS, x86, NIOS 등 *대부분의 임베디드 아키텍처*를 지원합니다.

### U-Boot이 잘하는 일

- 부트 미디어 추상화 (SD, eMMC, NAND, SPI, USB, ethernet)
- 환경 변수와 bootcmd
- FIT image, verified boot
- Device Tree fixup
- TFTP, NFS, DHCP를 통한 네트워크 부팅
- 다양한 파일 시스템 (FAT, ext4, UBIFS, btrfs read-only)

### U-Boot이 안 하는 일

- secure world 관리 (TF-A의 일)
- UEFI 표준 100% 준수 (부분 지원만, 자체 명령 위주)
- secondary CPU 깨우기 ARMv8-A에서는 PSCI 호출만, 구현은 TF-A BL31)
- 자체 hypervisor 또는 OS 기능

```bash
# U-Boot의 일상적인 명령 인터페이스
=> mmc list
FSL_SDHC: 0 (eMMC), FSL_SDHC: 2 (SD)
=> setenv bootargs "console=ttymxc1,115200 root=/dev/mmcblk0p2 rw"
=> load mmc 0:1 0x40480000 Image
=> load mmc 0:1 0x43000000 imx8mp-evk.dtb
=> booti 0x40480000 - 0x43000000
```

산업에서 *임베디드 Linux를 부트할 때* 거의 대부분은 U-Boot입니다.

## ARM Trusted Firmware-A — secure world의 표준

ARM이 2013년에 공개한 *ARMv8-A secure boot의 reference 구현*입니다. ARM이 직접 유지보수하며, *secure world의 모든 단계*를 담당합니다.

### TF-A가 책임지는 단계

- **BL1** — boot ROM 직후의 첫 trusted code
  - EL3 진입점
  - BL2 무결성 검증 + 적재
  - secure ROM 안에서 동작 가능
- **BL2** — trusted boot firmware
  - 다음 단계들(BL31, BL32, BL33)의 무결성 검증
  - DDR 초기화는 대개 *여기서* (또는 SPL이 대신)
  - BL31에 control 넘김
- **BL31** — EL3 runtime firmware (secure monitor)
  - 부트 끝나도 *계속 살아있음*
  - PSCI 호출 (CPU on/off, suspend)
  - SMC(secure monitor call) 핸들러
  - normal world ↔ secure world 전환
- **BL32** — secure-EL1 payload (선택)
  - OP-TEE 같은 secure OS
  - TA(Trusted Application) 실행 환경
- **BL33** — non-trusted firmware
  - U-Boot Proper 또는 EDK II
  - normal world의 모든 부트 작업

BL31은 *runtime* firmware입니다. 부팅이 끝나도 메모리에 *계속 살아 있고*, 커널이 *PSCI 호출(예: 다른 코어 깨우기)*을 할 때마다 *깨어나서 응답*합니다.

```c
/* TF-A BL2가 BL33(U-Boot)을 적재하는 흐름 */
/* tf-a/bl2/bl2_main.c */

void bl2_main(void)
{
    /* ... 초기화 ... */

    /* 각 단계 이미지 적재 */
    bl2_load_images();  /* BL31, BL32, BL33 차례로 */

    /* BL31로 점프 */
    bl2_run_next_image(&bl31_ep_info);
    /* 돌아오지 않음 */
}
```

TF-A 없이 U-Boot만으로도 ARMv8-A를 부팅할 수 있지만, *PSCI가 없으니 SMP를 못 쓰고*, *power management도 한계*가 있습니다. 양산용은 *대부분 TF-A 사용*입니다.

## EDK II — UEFI 표준 준수

Intel이 시작한 *UEFI reference 구현*입니다. 현재는 TianoCore 프로젝트로 *오픈소스*입니다. UEFI 표준의 모든 인터페이스(boot service, runtime service, protocol)를 제공합니다.

### EDK II가 들어가는 자리

- ARM server (Ampere Altra, NXP Layerscape 서버 SKU)
- 일부 ARM laptop (Windows on ARM)
- x86 워크스테이션 (BIOS 대체)
- ARM 가상화 (QEMU + UEFI)

### EDK II vs U-Boot

| 항목 | EDK II | U-Boot |
|------|--------|--------|
| 표준 | UEFI 2.10 완전 준수 | UEFI는 *부분 지원* |
| 크기 | 수 MB | 수백 KB |
| 부트 인터페이스 | EFI 응용프로그램, BDS | 명령 인터프리터 |
| Linux 부팅 | GRUB → vmlinuz.efi | bootcmd → booti |
| 임베디드 친화 | 작은 RAM에서 부담 | 작은 시스템에 적합 |
| Windows 부팅 | 가능 | 불가능 |

ARM server에는 EDK II가 *반드시* 들어갑니다. Linux distribution이 *EFI loader(GRUB EFI, systemd-boot)를 통해* 부트하기 때문입니다. 임베디드 산업용 보드는 *그런 표준 준수가 불필요*하므로 *U-Boot이 표준*입니다.

| 시스템 | 부트 체인 |
|--------|----------|
| ARM server | TF-A BL31 → EDK II (BL33) → GRUB EFI → Linux kernel |
| 임베디드 | TF-A BL31 → U-Boot (BL33) → Linux kernel |

U-Boot도 *부분적으로 UEFI를 지원*하긴 합니다. `CONFIG_EFI_LOADER=y`로 빌드하면 EFI binary를 실행할 수 있어 *GRUB 같은 EFI bootloader를 통한 부트*가 가능합니다. [Ch 18: EFI in U-Boot](/blog/embedded/bootloader/chapter18-efi-in-uboot)에서 다룹니다.

## LinuxBoot — Linux를 firmware로

Google, Facebook 같은 *hyperscale 서버 운영사*가 주도하는 프로젝트입니다. 아이디어는 *firmware 단계를 짧게 줄이고 가능한 빨리 Linux kernel을 띄워, Linux를 firmware처럼 사용하자*는 것입니다.

```text
일반 서버 부트:
TF-A → EDK II → GRUB → Linux  (수십 초)

LinuxBoot:
TF-A → mini Linux kernel → kexec → main Linux  (수 초)
```

작은 Linux 커널과 init binary(`u-root`, Go로 작성)가 BL33 자리에 들어갑니다. 그 안에서 *kexec 시스템콜로 본격 커널을 띄우는* 구조입니다.

### LinuxBoot의 장점

- 부트 시간 단축 (driver 재초기화 없음)
- *익숙한 도구*(linux command, go)로 부트 정책 작성
- 보안 면에서 *코드 base가 단순*

### LinuxBoot의 한계

- *작은 임베디드*에서는 mini Linux도 부담
- secure boot 체인 통합이 까다로움
- 산업용 임베디드에는 *거의 안 씀*

임베디드 boot loader 시리즈 본문에서는 LinuxBoot을 자세히 다루지 않습니다. 산업용 표준은 *U-Boot + TF-A*입니다.

## 한 보드의 실제 분업

NXP i.MX 8M Plus EVK의 부트 이미지가 어떻게 조립되는지 봅니다.

```text
flash.bin
├── IVT (Image Vector Table) — BootROM이 파싱
├── HAB header — code-signing 정보
├── SPL (u-boot-spl.bin)              ← U-Boot 소스에서
│   - DDR training + U-Boot Proper 적재
├── DDR firmware (lpddr4_*.bin)        ← NXP 제공 binary
├── ATF (bl31.bin)                     ← TF-A 소스에서
├── OPTEE (tee.bin) — 선택              ← OP-TEE 소스에서
└── U-Boot Proper (u-boot.bin)         ← U-Boot 소스에서
```

`mkimage` 또는 `imx-mkimage` 같은 도구가 이 *조각들을 하나의 flash.bin*으로 묶습니다.

```bash
# NXP의 flash.bin 빌드 예시
cd imx-mkimage
make SOC=iMX8MP flash_evk

# 결과:
# iMX8M/flash.bin (수 MB)
```

이 flash.bin 하나를 *eMMC의 boot partition*에 굽고 boot mode strap을 그쪽으로 설정하면 *위에서 본 부트 체인*이 동작합니다.

## SPL은 U-Boot의 일부

용어 혼동을 정리합니다. SPL(Secondary Program Loader)은 *U-Boot의 빌드 산출물*입니다. U-Boot 소스 트리에서 *CONFIG_SPL=y*로 빌드하면 다음 두 바이너리가 나옵니다.

```text
u-boot.bin        ← U-Boot Proper (BL33)
u-boot-spl.bin    ← SPL (BL2 자리 또는 BL1+BL2 자리)
```

같은 코드 베이스에서 *다른 .config로 두 번* 컴파일하는 것입니다. SPL은 *DDR이 없는 SRAM*에서 동작하므로 *훨씬 작아야* 하고, *기능이 제한*됩니다.

ARMv8-A 보드 중에는 SPL 자리를 *TF-A BL2*가 대신하는 경우도 있습니다.

```text
[SPL을 사용하는 흐름]
BootROM → SPL → BL31 → U-Boot Proper → Linux

[BL2를 사용하는 흐름]
BootROM → BL1 → BL2 (DDR init) → BL31 → U-Boot Proper → Linux
```

i.MX, Rockchip은 *SPL을 사용*하고, 일부 ARM server SKU는 *BL2를 사용*합니다. 부트 흐름 파악할 때 *어느 모델*인지 먼저 확인하는 것이 중요합니다.

## RISC-V의 분업 — OpenSBI

RISC-V는 ARMv8-A의 TF-A에 대응하는 *OpenSBI(Supervisor Binary Interface)*가 있습니다. M-mode에서 동작하며 S-mode(커널·U-Boot)에 SBI call 인터페이스를 제공합니다.

```text
RISC-V boot:
BootROM → OpenSBI (M-mode) → U-Boot (S-mode) → Linux (S-mode)
```

OpenSBI는 *FW_PAYLOAD* 모드로 빌드하면 *내부에 U-Boot binary를 포함*하는 단일 이미지가 됩니다. 또는 *FW_JUMP* 모드로 *별도 U-Boot binary로 점프*합니다.

```bash
# OpenSBI를 FW_PAYLOAD로 빌드
cd opensbi
make PLATFORM=generic FW_PAYLOAD_PATH=../u-boot/u-boot.bin

# 결과: build/platform/generic/firmware/fw_payload.bin
```

QEMU virt RISC-V에서 부트하면 다음과 같습니다.

```bash
qemu-system-riscv64 -M virt -nographic \
    -bios opensbi/build/platform/generic/firmware/fw_payload.bin
```

```text
OpenSBI v1.5
   ____                    _____ ____ _____
  / __ \                  / ____|  _ \_   _|
 | |  | |_ __   ___ _ __ | (___ | |_) || |
 | |  | | '_ \ / _ \ '_ \ \___ \|  _ < | |
 | |__| | |_) |  __/ | | |____) | |_) || |_
  \____/| .__/ \___|_| |_|_____/|____/_____|
        | |
        |_|

Platform Name : riscv-virtio,qemu
...
U-Boot 2024.04 (May 19 2026 - 09:00:00 +0000)

DRAM:  128 MiB
=>
```

## 부트로더 선택 기준

새 프로젝트에서 어느 부트로더를 쓸지 결정하는 기준입니다.

```text
이 보드가 ARM 임베디드인가?
  └ Yes → U-Boot 시작
       └ ARMv8-A인가?
            └ Yes → TF-A도 추가
                 └ secure OS가 필요한가?
                      └ Yes → OP-TEE(BL32) 추가
            └ No → SPL + U-Boot Proper만

이 보드가 ARM server인가?
  └ Yes → EDK II(UEFI) 사용
       └ TF-A(BL31)도 필수

이 보드가 x86인가?
  └ coreboot 또는 EDK II

이 보드가 RISC-V인가?
  └ OpenSBI + U-Boot
```

산업용 임베디드는 *U-Boot + TF-A*가 거의 *기본값*입니다. SoC vendor의 BSP가 이미 그렇게 구성되어 있으므로, 그 위에서 *수정*해 가는 것이 빠릅니다.

## 자주 하는 오해

### "U-Boot이 TF-A를 대체한다"

대체 관계가 아닙니다. *각자 다른 자리*에 들어갑니다. U-Boot은 BL33(부트 정책), TF-A는 BL31(secure monitor). 둘이 *동시에* 동작합니다.

### "UEFI = EDK II"

UEFI는 *표준*이고, EDK II는 *그 표준의 reference 구현*입니다. U-Boot도 *부분적으로* UEFI를 구현합니다.

### "SPL은 별도 프로젝트다"

U-Boot 소스 트리에서 *같이* 빌드됩니다. `CONFIG_SPL=y` 옵션으로 활성화하면 두 binary가 나옵니다.

### "임베디드에 EDK II를 써도 된다"

가능하지만 *오버스펙*입니다. EDK II는 *수 MB*고, 임베디드 SPL은 *50KB*입니다. SoC 내부 SRAM에 안 들어갑니다.

### "OpenSBI는 RISC-V에만 있다"

맞습니다. ARM의 TF-A에 대응하는 *RISC-V 전용* 표준입니다.

## 정리

- U-Boot은 *부트 정책*, TF-A는 *secure world*, EDK II는 *UEFI 표준*, LinuxBoot은 *kexec 기반 단순화*를 담당합니다.
- 한 보드에 *함께 쓰이는* 경우가 흔합니다. 라이벌이 아니라 *분업*입니다.
- ARMv8-A 임베디드 양산 보드의 표준 조합은 *SPL(U-Boot) + BL31(TF-A) + BL33(U-Boot Proper)*입니다.
- SPL은 *U-Boot 소스 트리의 일부*입니다. `CONFIG_SPL=y`로 빌드합니다.
- TF-A의 BL31은 *runtime firmware*입니다. 부트가 끝나도 메모리에 살아 있고, PSCI 호출에 응답합니다.
- EDK II는 *ARM server, x86 워크스테이션*에 들어갑니다. 임베디드에는 *오버스펙*입니다.
- RISC-V는 *OpenSBI*가 TF-A의 자리를 차지합니다. U-Boot은 S-mode payload로 들어갑니다.
- `imx-mkimage` 같은 도구가 SPL·BL31·OPTEE·U-Boot Proper 조각을 *flash.bin 하나*로 묶습니다.

## 다음 편

[Ch 3: 빌드 시스템 — Kconfig, Makefile, defconfig](/blog/embedded/bootloader/chapter03-build-system)에서는 U-Boot 소스 트리의 빌드 시스템을 다룹니다. `make qemu_arm64_defconfig`로 시작해서, `menuconfig`로 옵션을 바꾸고, *defconfig 파일*이 어떻게 동작하는지 봅니다.

## 관련 항목

- [Ch 1: 부트로더가 푸는 문제](/blog/embedded/bootloader/chapter01-boot-problem)
- [Ch 3: 빌드 시스템](/blog/embedded/bootloader/chapter03-build-system)
- [Ch 4: 부트 단계](/blog/embedded/bootloader/chapter04-boot-stages)
- [Ch 18: EFI in U-Boot](/blog/embedded/bootloader/chapter18-efi-in-uboot)
- [BSP Ch 7: TF-A와 TrustZone 통합](/blog/embedded/bsp/chapter07-tfa-trustzone)
- [Embedded Security Ch 2: Secure Boot 체인](/blog/embedded/embedded-security/chapter02-secure-boot)
- [원문 — Trusted Firmware-A](https://www.trustedfirmware.org/projects/tf-a/)
- [원문 — EDK II / TianoCore](https://www.tianocore.org/)
- [원문 — OpenSBI](https://github.com/riscv-software-src/opensbi)
- [원문 — LinuxBoot](https://www.linuxboot.org/)
