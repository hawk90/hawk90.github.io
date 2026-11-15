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

> **"U-Boot, TF-A, EDK II, LinuxBoot은 서로 다른 펌웨어 역할을 맡을 수 있습니다."** — 다만 역할과 조합은 아키텍처, SoC, 플랫폼 구성에 따라 달라집니다.

"임베디드 부트로더 = U-Boot"이라는 인식이 있지만 일부 ARMv8-A 시스템은 여러 펌웨어를 조합합니다. 흔한 구성 한 가지에서는 TF-A가 BL31 runtime firmware를 제공하고, U-Boot이 BL33으로 동작하며, 선택적으로 OP-TEE가 BL32 payload가 됩니다. BL1·BL2의 사용 여부와 각 단계의 담당 프로젝트는 플랫폼 구성에 따라 달라집니다. 각 컴포넌트의 역할을 알아야 실제 보드의 부트 체인을 읽을 수 있습니다.

## 네 가지 부트로더의 자리

다음 네 가지가 *서로 다른 자리*에 들어가는 부트로더입니다.

| 컴포넌트 | 정식 명칭 | 자리 | 대표 사용처 |
|---------|---------|------|------------|
| U-Boot | Das U-Boot | 부트 정책, BL33 | 임베디드 ARM/RISC-V |
| TF-A | Trusted Firmware-A | BL1·BL2·BL31 등 trusted firmware 단계 | Arm 플랫폼용 trusted firmware |
| EDK II | EFI Development Kit II | UEFI firmware | ARM 서버, x86 워크스테이션 |
| LinuxBoot | Linux-based firmware | 플랫폼에 따라 firmware의 OS 적재 역할 | 서버 펌웨어 구성 사례 |

같은 보드에 *여러 개가 동시에* 들어갑니다. NXP i.MX 8M Plus 양산 보드의 부트 체인은 다음과 같습니다.

![i.MX 8M Plus 부트 체인 — BootROM → SPL → BL31 → U-Boot Proper → Kernel](/images/blog/bootloader/diagrams/chapter02-imx-boot-chain.svg)

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

- 보통의 BL33 구성에서 EL3 runtime·secure-world service 제공 (플랫폼이 별도 firmware로 구성)
- 전체 UEFI 규격 구현 (U-Boot의 목표는 EBBR 요구사항 범위이며, UEFI 기능은 설정에 따름)
- 모든 SoC의 secondary CPU 전원·해제 절차 구현 (플랫폼 firmware와 OS의 인터페이스에 따름)
- 범용 OS나 hypervisor 역할

다음은 U-Boot prompt에서 사용할 수 있는 보드별 부트 명령의 형태입니다. 실행 주소, 장치 번호, 파일 이름은 보드의 환경 변수와 메모리 배치에 맞게 바꿔야 합니다. 실제 보드에서 실행하지 않았으므로 transcript가 아닙니다.

```text
=> mmc list
=> load mmc 0:1 ${kernel_addr_r} Image
=> load mmc 0:1 ${fdt_addr_r} board.dtb
=> booti ${kernel_addr_r} - ${fdt_addr_r}
```

U-Boot은 임베디드 Linux 시스템에서 널리 쓰이는 부트로더 중 하나입니다. 제품별 채택 비율을 단정하지 않고, 보드의 firmware 구성을 확인합니다.

## ARM Trusted Firmware-A — secure world의 표준

Arm이 공개하는 Trusted Firmware 프로젝트로, Armv7-A와 Armv8-A 플랫폼에서 EL3 runtime firmware 및 trusted boot 기능을 구현합니다. TF-A를 사용하는 구성이라도 모든 단계가 반드시 TF-A 안에 들어가는 것은 아니며, trusted boot 구성과 이미지 흐름은 플랫폼별로 확인해야 합니다.

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

이 단계는 특정 C 함수 호출 순서로 고정되지 않습니다. TF-A의 선택된 버전과 플랫폼 포트에서 이미지 로딩·entry point 준비 코드를 확인하세요. 일반적인 AArch64 구성에서는 BL2가 BL31 및 선택적 BL32와 BL33의 로드 정보를 준비하고, BL31 초기화 뒤 normal-world BL33으로 제어가 넘어갑니다.

U-Boot과 Linux를 TF-A 없이 구성할 수 있는지는 플랫폼이 제공하는 초기화·EL3 runtime·CPU 전원 관리 firmware에 달려 있습니다. Linux의 secondary CPU 기동에는 PSCI 외에 플랫폼별 방법도 있으므로, “TF-A가 없으면 SMP를 쓸 수 없다”고 일반화할 수 없습니다. TF-A를 선택했다면 BL31이 PSCI를 제공하도록 설정됐는지와 OS가 그 인터페이스를 발견하는지를 해당 플랫폼의 DT/ACPI 및 firmware 설정에서 확인합니다.

> 더 깊이 — ARM 아키 관점에서의 같은 주제

## EDK II — UEFI 표준 준수

Intel에서 시작해 TianoCore가 관리하는 오픈소스 firmware 개발 환경입니다. UEFI/PI 규격을 구현하는 플랫폼을 만들 수 있지만, 실제 제공 인터페이스와 규격 지원 범위는 플랫폼 빌드와 통합 결과에 따라 확인해야 합니다.

### EDK II가 들어가는 자리

- ARM server (Ampere Altra, NXP Layerscape 서버 SKU)
- 일부 ARM laptop (Windows on ARM)
- x86 워크스테이션 (BIOS 대체)
- ARM 가상화 (QEMU + UEFI)

### EDK II vs U-Boot

| 항목 | EDK II | U-Boot |
|------|--------|--------|
| 표준·인터페이스 | UEFI/PI 규격 구현 환경; 플랫폼별 확인 필요 | 선택한 UEFI 기능을 구현; 플랫폼별 설정 필요 |
| 크기 | 수 MB | 수백 KB |
| 부트 인터페이스 | EFI 응용프로그램, BDS | 명령 인터프리터 |
| Linux 부팅 | GRUB → vmlinuz.efi | bootcmd → booti |
| 임베디드 친화 | 작은 RAM에서 부담 | 작은 시스템에 적합 |
| Windows 부팅 | 가능 | 불가능 |

Arm 서버는 일반적으로 OS와 펌웨어 사이에 UEFI 인터페이스를 제공하며, EDK II는 이를 구현하는 선택지 중 하나입니다. 어떤 EL3 runtime firmware를 함께 쓰는지는 플랫폼이 정하므로 TF-A가 항상 필수라고 단정하지 않습니다. 임베디드 보드도 요구사항에 따라 UEFI를 사용할 수 있고, U-Boot의 명령 기반 부트 흐름을 선택할 수도 있습니다.

| 시스템 | 부트 체인 |
|--------|----------|
| 예시 ARM server 구성 | EL3 runtime firmware → UEFI firmware (예: EDK II) → UEFI OS loader → Linux kernel |
| 예시 임베디드 구성 | BL31 (예: TF-A) → U-Boot (BL33) → Linux kernel |

U-Boot도 *부분적으로 UEFI를 지원*하긴 합니다. `CONFIG_EFI_LOADER=y`로 빌드하면 EFI binary를 실행할 수 있어 *GRUB 같은 EFI bootloader를 통한 부트*가 가능합니다. [Ch 18: EFI in U-Boot](/blog/embedded/bootloader/chapter18-efi-in-uboot)에서 다룹니다.

## LinuxBoot — Linux를 firmware로

Google, Facebook 같은 *hyperscale 서버 운영사*가 주도하는 프로젝트입니다. 아이디어는 *firmware 단계를 짧게 줄이고 가능한 빨리 Linux kernel을 띄워, Linux를 firmware처럼 사용하자*는 것입니다.

```text
일반 서버 부트:
EL3 runtime firmware → UEFI firmware → OS loader → Linux

LinuxBoot:
firmware → Linux-based boot environment → kexec → product Linux
```

LinuxBoot 구성에서는 작은 Linux 커널과 init 환경(예: `u-root`)을 firmware 단계에서 사용하고, 이후 `kexec`로 제품용 커널을 시작할 수 있습니다. 실제 이미지 순서와 BL 단계는 해당 플랫폼 설계에서 확인해야 합니다.

### LinuxBoot의 장점

- 부트 시간 단축 (driver 재초기화 없음)
- *익숙한 도구*(linux command, go)로 부트 정책 작성
- 부트 정책에 Linux 도구와 사용자 공간 프로그램을 활용할 수 있음

### LinuxBoot의 한계

- *작은 임베디드*에서는 mini Linux도 부담
- secure boot 체인 통합이 까다로움
- 제품별 보드 지원과 부트 체인 통합을 별도로 검증해야 함

임베디드 boot loader 시리즈 본문에서는 LinuxBoot을 자세히 다루지 않습니다. U-Boot과 TF-A의 조합은 여러 Arm 플랫폼에서 쓰이는 선택지지만, 모든 제품의 표준 구성으로 일반화하지 않습니다.

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

U-Boot build system은 설정한 SPL 기능을 바탕으로 별도 SPL 산출물을 만들 수 있습니다. SPL과 U-Boot Proper의 옵션은 `CONFIG_SPL_*` 등을 통해 단계별로 달라지지만, 이를 서로 다른 `.config` 파일 두 개로 항상 빌드한다고 단정하지 않습니다. SPL이 사용하는 초기 메모리 영역과 크기 한계는 보드별 linker script와 BootROM 요구사항에서 확인해야 합니다.

ARMv8-A 보드 중에는 SPL 자리를 *TF-A BL2*가 대신하는 경우도 있습니다.

```text
[SPL을 사용하는 흐름]
BootROM → SPL → BL31 → U-Boot Proper → Linux

[BL2를 사용하는 흐름]
BootROM → BL1 → BL2 (DDR init) → BL31 → U-Boot Proper → Linux
```

일부 i.MX·Rockchip 보드는 U-Boot SPL을 사용하고, 다른 플랫폼은 TF-A BL2를 사용하거나 별도 firmware 단계를 둡니다. 같은 SoC 계열에서도 보드와 보안 구성에 따라 달라질 수 있으므로 실제 부트 흐름을 먼저 확인합니다.

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

아래 명령은 OpenSBI generic FW_PAYLOAD와 QEMU가 준비된 시스템에서 실행하는 예입니다. 이 작업 환경에는 QEMU, RISC-V cross-compiler, OpenSBI/U-Boot checkout이 없어 실행하지 않았으며, 부팅 출력을 검증된 transcript로 제시하지 않습니다.

```bash
qemu-system-riscv64 -M virt -nographic \
    -bios opensbi/build/platform/generic/firmware/fw_payload.bin
```

## 부트로더 선택 기준

새 프로젝트에서 어느 부트로더를 쓸지 결정하는 기준입니다.

<!-- TODO: TikZ flowchart (_design.tex) -->

- **ARM 임베디드** — U-Boot으로 시작합니다.
  - ARMv8-A라면 TF-A를 추가합니다.
    - secure OS가 필요하면 OP-TEE(BL32)까지 추가합니다.
  - ARMv8-A가 아니면 SPL + U-Boot Proper만으로 충분합니다.
- **ARM server** — 플랫폼이 제공하는 UEFI firmware를 사용합니다. EDK II와 EL3 runtime firmware 선택은 보드 설계에 따라 확인합니다.
- **x86** — coreboot 또는 EDK II를 씁니다.
- **RISC-V** — OpenSBI + U-Boot 조합입니다.

산업용 임베디드에서 U-Boot과 TF-A를 함께 쓰는 구성은 흔한 선택지입니다. 실제 구성은 SoC vendor BSP와 보드 문서에서 확인하고, 검증된 구성을 바탕으로 수정합니다.

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

- U-Boot, TF-A, EDK II, LinuxBoot은 각기 다른 firmware 기능을 제공하며 한 플랫폼에서의 역할은 보드 구성에 따라 달라집니다.
- 한 보드에 *함께 쓰이는* 경우가 흔합니다. 라이벌이 아니라 *분업*입니다.
- 한 가지 ARMv8-A 임베디드 구성은 *SPL(U-Boot) + BL31(TF-A) + BL33(U-Boot Proper)*입니다. 단계 구성은 보드별로 확인합니다.
- SPL은 *U-Boot 소스 트리의 일부*입니다. `CONFIG_SPL=y`로 빌드합니다.
- TF-A를 사용하는 플랫폼에서는 BL31이 runtime firmware 역할을 맡고 PSCI 서비스를 제공할 수 있습니다. 지원 기능은 플랫폼 빌드와 firmware 설정에 따릅니다.
- EDK II는 서버·워크스테이션·임베디드 등 여러 플랫폼에서 UEFI firmware를 만들 때 선택할 수 있습니다. 크기와 기능은 플랫폼 구성에 따라 달라집니다.
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
- [Trusted Firmware-A: Firmware Design](https://trustedfirmware-a.readthedocs.io/en/v2.10/design/firmware-design.html)
- [U-Boot v2024.04: UEFI](https://docs.u-boot.org/en/v2024.04/develop/uefi/uefi.html)
- [TianoCore EDK II](https://www.tianocore.org/tianocore-wiki.github.io/reference/external-resources/edk_ii.html)
