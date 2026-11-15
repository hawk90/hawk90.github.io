---
title: "U-Boot의 EFI 호환 분석 — bootefi 명령과 EFI loader 동작 원리"
slug: "embedded/bootloader/chapter18-efi-in-uboot"
date: 2026-05-09T09:18:00
description: "U-Boot이 UEFI Boot Services를 노출하는 방식 — bootefi, EBBR, Linux EFI stub과의 연결."
series: "Bootloader Internals"
seriesOrder: 18
tags: [embedded, bootloader, u-boot, efi, uefi, ebbr]
draft: false
topics: ["embedded"]
---

U-Boot은 EFI/UEFI application을 실행하는 loader를 제공합니다. 임베디드 보드에서 GRUB이나 EFI stub을 실행할 수 있지만, 필요한 protocol, device driver, configuration과 image compatibility가 해당 board build에 갖춰져야 합니다.

## 한 줄 요약

**`bootefi`는 구성된 U-Boot EFI subsystem에서 UEFI binary를 실행합니다.** 실제 application 호환성은 필요한 EFI protocol과 board resource 지원에 달려 있습니다.

## 왜 임베디드에서 EFI인가

EFI application interface는 배포판별 loader를 실행하는 공통 경로를 제공할 수 있습니다. EBBR은 embedded firmware의 requirements를 정의하지만, 모든 ARM64 image나 installer와의 호환성을 보장하지 않습니다.

![U-Boot EFI 부트 흐름 — Traditional vs EFI Boot 비교](/images/blog/bootloader/diagrams/ch18-efi-boot-flow.svg)

```text
[Distro vmlinuz.efi]   ----> [Any UEFI firmware]
            \                       |
             \--> EFI stub          v
                       \---> [bootefi via U-Boot]
                                    |
                                    v
                            Same Linux kernel runs
```

EBBR-compatible platform은 해당 requirements를 만족하는 firmware/software combinations를 대상으로 합니다. 설치 media, storage/USB driver, network, graphics 및 distro image support는 별도로 확인해야 합니다.

## EFI loader가 구현하는 것

U-Boot의 EFI loader는 UEFI 전체가 아니라 *부팅에 꼭 필요한 부분*만 들고 있습니다.

| 서비스 | 구현 | 비고 |
|--------|------|------|
| Boot Services (메모리, 프로토콜, 이미지 로딩) | 대부분 구현 | LoadImage, StartImage, AllocatePages 등 |
| Console (Simple Text Input/Output) | U-Boot 콘솔로 래핑 | 시리얼이 그대로 EFI 콘솔이 됨 |
| Block I/O · Disk I/O | U-Boot의 mmc·sata·nvme로 매핑 | 디스크 접근 |
| File System (FAT) | EFI System Partition 읽기 | `efi/boot/bootaa64.efi` 같은 표준 경로 |
| Runtime Services (변수, 시간) | 부분 구현 | EFI Variable은 env에 매핑 |
| Graphics Output Protocol | 디스플레이 있으면 | 보통 임베디드는 비활성 |
| Secure Boot | 부분 구현 | PK·KEK·db·dbx 변수 검증 |

지원 범위는 U-Boot tag, Kconfig, board drivers와 firmware variables에 따라 다릅니다. 아래 목록은 완전한 conformance matrix가 아닙니다.

## defconfig 설정

EFI 부팅을 켜려면 다음을 활성화합니다.

```text
CONFIG_CMD_BOOTEFI=y
CONFIG_EFI_LOADER=y
```

UEFI Boot Manager, Secure Boot, variable storage, device-path 및 initrd 관련 옵션은 tag와 board configuration에 따라 추가로 선택합니다. 옵션 이름만으로 동작을 단정하지 말고 해당 tag의 Kconfig/help와 build configuration을 확인합니다. Initrd 전달 방식도 U-Boot 및 kernel 설정에서 검증합니다.

## bootefi 명령

기본 사용 흐름은 두 줄입니다.

```text
=> load mmc 0:1 ${kernel_addr_r} efi/boot/bootaa64.efi
=> bootefi ${kernel_addr_r}
```

이러면 GRUB efi가 떠 자체 메뉴를 띄웁니다. Linux EFI stub을 직접 부르면 더 단순합니다.

```text
=> load mmc 0:1 ${kernel_addr_r} vmlinuz.efi
=> load mmc 0:1 ${ramdisk_addr_r} initrd.img
=> setenv bootargs 'root=/dev/mmcblk0p2 ro'
=> bootefi ${kernel_addr_r} ${fdt_addr_r}
```

U-Boot v2025.01 `bootefi` synopsis에는 `setup` subcommand가 없습니다. Application은 `bootefi <image_addr> [fdt_addr]`로 실행하며, `bootargs`는 loaded image protocol의 load options로 전달됩니다.

### 완전한 EFI 부팅 스크립트 예시

다음은 command shape 예시이며 실제 board log나 완성된 boot recipe가 아닙니다. Address, file path, FDT/initrd handling은 target 설정에서 확인해야 합니다.

```bash
# ESP를 FAT으로 마운트하고 파일 확인
=> ls mmc 0:1
    <target media에 있는 file과 크기를 확인>

# kernel과 initrd 로드
=> load mmc 0:1 ${kernel_addr_r} vmlinuz.efi
=> load mmc 0:1 ${ramdisk_addr_r} initrd.img
=> load mmc 0:1 ${fdt_addr_r} board.dtb

# EFI 환경 초기화 (한 번만)

# bootargs는 EFI stub이 UEFI 변수에서 읽음
# 또는 직접 전달
=> setenv bootargs "console=ttyS0,115200 root=/dev/mmcblk0p2 rw"

# EFI stub 실행
=> bootefi ${kernel_addr_r} ${fdt_addr_r}
```

initrd를 LoadFile2로 전달하려면 `CONFIG_EFI_LOAD_FILE2_INITRD=y`가 필요합니다.

## EFI bootmgr

`bootefi bootmgr`은 UEFI Boot Manager를 실행하며 BootNext/BootOrder 변수를 사용합니다. EFI Variable에 `BootOrder`와 `Boot0000`, `Boot0001` 등이 적혀 있으면 그 순서대로 시도합니다.

```text
=> efidebug boot add 0 distro mmc 0:1 efi/boot/bootaa64.efi
=> efidebug boot order 0
=> efidebug boot dump
0000:
  attributes: A-- (0x00000001)
  label: distro
  file_path: VenHw(...)/HD(1,GPT,...)/File(\EFI\BOOT\BOOTAA64.EFI)
=> bootefi bootmgr
```

Boot option 저장과 userspace 변경은 EFI variable services와 persistent backend가 제공될 때 사용할 수 있습니다. 지원 여부와 command syntax는 target에서 확인합니다.

```bash
# userspace (Linux)
$ efibootmgr -v
BootCurrent: 0000
BootOrder: 0000,0001
Boot0000* distro    HD(1,GPT,...)/File(\EFI\BOOT\BOOTAA64.EFI)
Boot0001* recovery  HD(2,GPT,...)/File(\EFI\RECOVERY\BOOT.EFI)
```

## EFI Variable 저장

EFI variable의 persistent backend는 U-Boot version, Kconfig 및 board/TEE 구성에 따라 다릅니다. U-Boot v2025.01 문서는 OP-TEE variable services와 RPMB 구성을 설명합니다. 특정 ESP 파일명이나 environment mapping을 모든 build의 동작으로 일반화하지 않습니다.

Media layout만으로 variable backend가 설정되거나 EFI variables가 저장되는 것은 아닙니다. EFI application path와 variable storage를 별도로 확인합니다. 저장 안정성, tamper resistance, backup/restore 및 recovery는 선택한 variable backend로 검증해야 합니다.

## UEFI Secure Boot 연결

U-Boot EFI loader와 Secure Boot 지원은 build 및 board configuration에 따라 다릅니다. UEFI Secure Boot 키 데이터 모델에는 다음 변수들이 포함됩니다.

- **PK** (Platform Key) — OEM/벤더.
- **KEK** (Key Exchange Key) — distro·OS.
- **db** (Allowed signatures) — 허용 이미지 해시·서명.
- **dbx** (Forbidden) — 폐기된 해시.

이미지 검증 지원, variable provisioning 및 enforcement 경로는 선택한 U-Boot tag에서 확인해야 합니다. 아래 임의 `efidebug` key enrollment 예제는 명령/인증서 형식과 지원을 검증하지 않아 제거했습니다.

FIT signature verification과 UEFI Secure Boot은 서로 다른 verification paths입니다. 두 경로를 같이 활성화할 경우 trusted keys, fallback policy와 allowed image set을 통합 검토해야 합니다.

## EBBR 호환

EBBR(Embedded Base Boot Requirements)은 임베디드용 UEFI 요구사항을 정의합니다. Revision별 normative requirements는 해당 revision의 specification에서 확인해야 합니다. 이 장의 요약은 보드 conformity 판정이나 complete requirements list가 아닙니다.

EBBR-related requirements alone do not guarantee a particular distro installer boots. EFI Boot Manager uses configured BootNext/BootOrder options; media discovery, image compatibility and required drivers must also be present.

## UEFI 명세에서 무엇이 필수인가

UEFI 명세는 두꺼운 책 한 권 분량입니다. 모든 항목을 다 만족시키지 않아도 *부팅이라는 목적*에는 부족하지 않습니다. EFI 애플리케이션이 실제로 의존하는 영역만 추리면 네 가지로 좁혀집니다.

| 영역 | 역할 | 필수성 |
|------|------|--------|
| Boot Services | 메모리 할당, 프로토콜 핸들, 이미지 로딩·실행 | OS 로더가 가장 많이 호출 |
| Runtime Services | EFI Variable, 시간, reset | Linux 부팅 후에도 일부 호출 |
| EFI variables | `BootOrder`, `BootXXXX`, `SecureBoot` 등 variables; non-volatile 보존은 attribute/backend에 따름 | bootmgr configuration에서 사용 |
| System partition | GPT 또는 MBR과 FAT filesystem 조합을 UEFI media access rules 및 platform firmware에 따라 확인 | EFI image discovery 경로 |

UEFI system partition은 GPT 또는 MBR partitioning에서 정의될 수 있습니다. UEFI 2.10은 EFI FAT32/FAT16/FAT12 support를 정의하며 system partition과 removable media의 FAT 요구를 구분합니다. GPT ESP GUID는 GPT-based system partition discovery에 중요하지만, fallback path나 bootability는 architecture, firmware implementation 및 device-path configuration에 좌우됩니다.

```text
GPT disk
├── Partition 1: ESP (type GUID = C12A7328-...)
│   EFI FAT filesystem (format/media class에 맞춤)
│   └── /EFI
│       ├── BOOT/
│       │   └── BOOTAA64.EFI       <- fallback loader
│       ├── debian/
│       │   ├── grubaa64.efi
│       │   └── grub.cfg
│       └── systemd/
│           └── systemd-bootaa64.efi
├── Partition 2: /boot
└── Partition 3: rootfs
```

Non-volatile boot variables의 지속성은 구현된 backend가 제공합니다. Persistent storage가 없는 환경에서 reboot 후 variable retention을 가정하면 안 됩니다.

## U-Boot EFI 구현 범위

U-Boot 문서는 implementation target으로 EBBR requirements를 명시하며, full UEFI implementation을 목표로 하지 않는다고 설명합니다. 구체적인 protocol support는 선택한 tag의 source/documentation과 board configuration에서 확인합니다.

| 확인 항목 | 무엇을 대조할지 |
|------|------|
| Boot Services / protocols | 선택 tag의 source 및 UEFI test 결과 |
| EFI variables | board가 선택한 variable backend와 persistent storage |
| Storage / display / network | 해당 device driver와 board configuration |
| Secure Boot | tag의 Kconfig, enrollment path, enforcement 및 negative test |

일반적인 compatibility를 protocol list만으로 보장할 수 없습니다. GRUB, systemd-boot, shim 및 Linux EFI stub은 대상 board와 build에서 각각 시험해야 합니다.

## GRUB · systemd-boot 부팅 흐름

U-Boot EFI를 사용하는 임베디드 보드의 distro boot flow는 loader, boot manager configuration 및 OS image에 따라 달라집니다. 아래는 개념도입니다.

```text
[U-Boot EFI loader]
        |
        v
[ESP의 /EFI/BOOT/BOOTAA64.EFI]   <- shim 또는 GRUB
        |
        v
[GRUB efi or systemd-boot]
        |
        v
[Linux EFI stub (vmlinuz.efi)]
        |
        v
[kernel main]
```

U-Boot의 EFI loader가 boot option을 실행할 때 Boot Manager가 변수에서 선택한 device path를 사용하고 EFI image를 load/execute합니다. 장치와 filesystem 가용성은 platform 설정에 달려 있습니다. 그 EFI 이미지가 GRUB이면 `grub.cfg`를 파싱해 메뉴를 띄우고, systemd-boot이면 `/loader/entries/*.conf`를 읽어 항목을 보여 줍니다.

```text
# /EFI/debian/grub.cfg 예시
set timeout=3
menuentry 'Debian GNU/Linux' {
    linux  /vmlinuz-6.6.0-arm64 root=UUID=... ro quiet
    initrd /initrd.img-6.6.0-arm64
}
```

systemd-boot은 더 단순합니다.

```text
# /loader/entries/debian.conf
title    Debian
linux    /vmlinuz-6.6.0-arm64
initrd   /initrd.img-6.6.0-arm64
options  root=UUID=... ro quiet
```

EFI stub이 포함된 Linux kernel은 supported UEFI image로 실행될 수 있습니다. GRUB과 systemd-boot의 지원 기능 및 각 command는 해당 loader/kernel version 문서에서 확인해야 합니다.

## EFI variables (efivars)

UEFI variable은 이름과 GUID, attribute로 식별되며 비휘발성인지는 attribute와 variable service 구현에 따릅니다. 이름(`BootOrder`, `Boot0000`, `SecureBoot` 등)과 GUID, 그리고 attribute 비트(non-volatile, boot-services-only, runtime-access 등)로 식별됩니다.

아래 형식은 설명용 예시이며 target command output이 아닙니다.

```text
=> efidebug boot dump
Boot0000:
  attributes: A-N (active, non-volatile)
  label: distro
  file_path: VenHw(...)/HD(1,GPT,3a23...)/File(\EFI\BOOT\BOOTAA64.EFI)
  optional_data: 00000000
Boot0001:
  attributes: A-N
  label: recovery
  file_path: VenHw(...)/HD(2,GPT,...)/File(\EFI\RECOVERY\BOOT.EFI)
```

EFI variable 저장 방식은 version, Kconfig 및 board/TEE backend에 따라 달라집니다. 특정 파일명이나 U-Boot environment mapping을 보편 동작으로 가정하지 말고 실제 configuration과 recovery behavior를 확인합니다.

Linux userspace에서는 `/sys/firmware/efi/efivars/`에 read/write할 수 있습니다. `efibootmgr`이 그 인터페이스를 사용합니다.

```bash
$ ls /sys/firmware/efi/efivars/
Boot0000-8be4df61-93ca-11d2-aa0d-00e098032b8c
BootOrder-8be4df61-93ca-11d2-aa0d-00e098032b8c
SecureBoot-8be4df61-93ca-11d2-aa0d-00e098032b8c
```

## Linux EFI stub

EFI stub은 vmlinuz 자체가 *EFI application*으로도 동작하도록 만든 작은 어댑터입니다. PE/COFF 헤더를 zImage 앞에 끼워, 펌웨어가 `LoadImage`로 적재하면 EFI 진입점이 호출되고 stub이 EFI Boot Services를 통해 메모리·DTB·initrd를 받은 뒤 *진짜 커널 entry*로 점프합니다.

```bash
$ objdump -h vmlinuz | head -20

vmlinuz:     file format pei-aarch64-little

Sections:
Idx Name          Size      VMA               LMA               File off  Algn
  0 .text         00800000  0000000000010000  0000000000010000  00010000  2**16
                  CONTENTS, ALLOC, LOAD, READONLY, CODE
  1 .reloc        00000010  0000000000810000  0000000000810000  00810000  2**0
                  CONTENTS, ALLOC, LOAD, READONLY, DATA
  2 .data         00200000  0000000000810010  0000000000810010  00810010  2**3
                  CONTENTS, ALLOC, LOAD, DATA
```

`pei-aarch64-little`라는 포맷이 핵심입니다. ELF가 아니라 PE32+, 즉 Windows EXE와 동일한 컨테이너입니다. 그래서 같은 `vmlinuz` 한 파일이 다음 셋 다 됩니다.

- U-Boot의 `bootefi`로 부팅
- PC UEFI 펌웨어가 직접 부팅
- GRUB이 `linuxefi`로 호출해 부팅

stub은 `efi_entry()`에서 시작해 EFI Memory Map을 받고, EFI Configuration Table에서 DTB 또는 ACPI를 찾고, initrd를 LoadFile2로 받아들인 뒤 ExitBootServices를 호출해 펌웨어에서 손을 뗍니다. 그 다음에야 일반 `start_kernel`로 진입합니다.

## ARM SystemReady

ARM SystemReady는 ARM이 정의한 *EFI/ACPI/devicetree 호환 인증 프로그램*입니다. 네 단계 등급이 있습니다.

| 등급 | 대상 | 펌웨어 요구 |
|------|------|-------------|
| SystemReady SR | 서버 | UEFI + ACPI + SBBR |
| SystemReady ES | edge·embedded | UEFI + ACPI 또는 DT + EBBR |
| SystemReady IR | IoT·임베디드 | UEFI + DT + EBBR |
| SystemReady LS | 리눅스 한정 | LBBR |

SystemReady profile과 EBBR compliance는 별도 specification/test scope를 따릅니다. EBBR compliance만으로 arbitrary generic distro ISO의 boot guarantee가 생기지는 않습니다.

이 장에서는 profile requirements를 완전하게 열거하거나 U-Boot build의 compliance를 주장하지 않습니다. U-Boot build이 특정 profile을 충족하는지는 해당 revision의 normative specification, board configuration과 conformance tests로 확인해야 합니다.

## debian-installer · Fedora 부팅 사례

EBBR/SystemReady profile은 정해진 firmware interface requirements를 다룹니다. 특정 distribution installer의 성공적인 부팅은 image, architecture, drivers 및 board configuration에 따라 별도로 검증해야 합니다. 아래 output은 예시이며 실제 보드 캡처가 아닙니다.

debian-installer (netinst) AArch64.

```bash
# Host imaging commands are intentionally omitted: verify the target device, image and recovery plan before writing removable media.

# 보드 부팅
=> usb start
=> bootefi bootmgr
GRUB loading...
GNU GRUB version 2.06
  Debian installer
  Rescue mode
  ...
```

Fedora Server arm64. Anaconda 인스톨러가 같은 방식으로 뜹니다.

```text
=> setenv boot_targets "usb0 mmc0"
=> run distro_bootcmd
Found EFI removable media binary efi/boot/bootaa64.efi
Booting /EFI/BOOT/BOOTAA64.EFI
Welcome to Fedora 39 (Server Edition)
```

이 예시만으로 보드별 BSP script가 불필요하거나 installer가 자동으로 동작한다고 결론내릴 수 없습니다. 실제 media와 board에서 확인해야 합니다.

## 자주 하는 실수

EFI 부팅 도입 시 자주 만나는 함정입니다.

- **`bootefi setup` 명령을 가정한다.** v2025.01 documented synopsis에 이 subcommand는 없으며, board-specific initialization은 해당 build documentation을 확인합니다.
- **FDT/ACPI 전달을 가정한다.** `bootefi`는 옵션 FDT 주소를 받으며 UEFI application이 hardware description을 요구하는 방식은 image와 platform에 따라 확인합니다.
- **Initrd 전달 방식과 kernel support를 확인하지 않는다.** 선택한 U-Boot EFI configuration과 Linux kernel documentation으로 검증합니다.
- **EFI variables persistence를 가정한다.** board가 제공하는 storage backend, secure storage, backup/restore policy를 확인합니다.
- **Secure Boot provisioning을 가정한다.** PK/KEK/db/dbx handling, enrollment 및 enforcement를 선택한 U-Boot build에서 확인합니다.
- **GUI 콘솔이 없는데 GOP를 켠다.** 부팅이 *디스플레이 초기화에서* 한참 멈추거나 hang합니다.
- **ESP filesystem support를 가정한다.** UEFI FAT variant와 platform implementation을 확인합니다; UEFI 2.10은 FAT32 system partition과 FAT12/16 removable-media support를 구분합니다.
- **GPT만 지원된다고 가정한다.** UEFI system partition은 GPT 또는 MBR-based device에 있을 수 있으나 firmware discovery와 device path는 구현별로 검증해야 합니다.
- **EFI variable persistence를 빌드 option 이름만으로 추론한다.** 실제 backend와 power-loss behavior를 해당 tag의 board/TEE configuration으로 확인합니다.
- **GPT-based system partition에서 ESP type GUID를 누락한다.** GPT partition entry를 사용하는 경우 GUID `C12A7328-F81F-11D2-BA4B-00A0C93EC93B`를 지정합니다; MBR layouts use a different partition-type mechanism.

## 정리

- U-Boot의 EFI loader는 UEFI Boot Services·일부 Runtime Services를 구현해 EFI 부팅을 가능케 합니다.
- `bootefi <image_addr> [fdt_addr]` 또는 `bootefi bootmgr`를 사용하며 availability는 board config로 확인합니다.
- `bootefi bootmgr`이 EFI Variable의 BootOrder를 읽어 자동 부팅을 수행합니다.
- EFI variable persistence와 trust properties는 실제 backend에 따라 달라집니다.
- Secure Boot enforcement와 PK/KEK/db/dbx enrollment은 선택한 U-Boot tag/board에서 end-to-end 검증합니다.
- EBBR requirements만으로 특정 distro installer의 compatibility가 보장되지는 않습니다.
- Initrd 전달 경로는 target U-Boot/Kconfig와 Linux kernel configuration으로 검증해야 합니다.

## 다음 장 예고

EFI든 FIT든 `bootm`이든, 결국 *커널에 점프하는 순간*의 ABI는 같아야 합니다. 다음 장은 ARM·AArch64·RISC-V·x86 각각에서 부트로더가 커널에게 *어떤 레지스터로* *어떤 상태로* 인계해야 하는지를 봅니다.

## 관련 항목

- [Ch 17: A/B 업데이트와 boot 이중화](/blog/embedded/bootloader/chapter17-ab-update)
- [Ch 19: 커널로 인계 — Linux boot ABI](/blog/embedded/bootloader/chapter19-kernel-handoff) — EFI stub이 ExitBootServices 뒤 커널에 인계하는 ABI
- [Ch 25: TF-A와 보안 부트](/blog/embedded/bootloader/chapter25-tfa-optee) — TF-A BL31 위에서 U-Boot EFI가 도는 구성
- [Ch 29: Distro Boot vs EFI Boot](/blog/embedded/bootloader/chapter29-distro-boot) — 두 부팅 흐름의 비교와 선택 기준
- [Embedded Security Ch 2: Secure Boot](/blog/embedded/embedded-security/chapter02-secure-boot)
- [UEFI 2.10: Media Access](https://uefi.org/specs/UEFI/2.10/13_Protocols_Media_Access.html) — GPT/MBR 및 FAT media requirements
- [원문 — U-Boot doc/uefi/uefi.rst](https://docs.u-boot.org/en/v2025.01/develop/uefi/uefi.html)
- [U-Boot v2025.01 `bootefi` command](https://docs.u-boot.org/en/v2025.01/usage/cmd/bootefi.html)
- [원문 — EBBR specification](https://github.com/ARM-software/ebbr)
- [원문 — ARM SystemReady program](https://www.arm.com/architecture/system-architectures/systemready-compliance-program)
