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

## 한 줄 요약

> U-Boot는 UEFI의 일부(Boot Services, 일부 Runtime Services, 변수, 디스크 접근)를 구현해서, **PC의 UEFI 펌웨어처럼 EFI 프로그램을 실행**할 수 있습니다. 배포판 kernel은 자체가 EFI 프로그램(EFI stub)이므로, `bootefi`나 EFI Boot Manager로 kernel을 직접 실행할 수 있고, boot option은 EFI 변수로 ESP에 저장됩니다.

이 글의 실험은 U-Boot **v2024.04** `qemu_arm64_defconfig`에 `CONFIG_CMD_EFIDEBUG`만 더 켜서 빌드하고, QEMU 11.1.3 `virt`에서 실행했습니다. 디스크는 GPT에 ESP(type `EF00`, `mkfs.fat -F 32`) 하나와 ext4 파티션 하나를 두었고, kernel은 [14장](/blog/embedded/bootloader/chapter14-bootflow-bootmeth)의 Debian 13.7 arm64 kernel입니다. 이 kernel 파일의 첫 2 byte는 `MZ`로, PE/COFF 실행 파일, 곧 EFI 프로그램이기도 합니다.

![U-Boot EFI 부트 흐름 — Traditional vs EFI Boot 비교](/images/blog/bootloader/diagrams/ch18-efi-boot-flow.svg)

왼쪽은 지금까지 본 `booti`/`bootm` 경로로 U-Boot가 kernel에 직접 점프합니다. 오른쪽은 U-Boot가 EFI 환경을 만들고 kernel을 EFI 프로그램으로 실행하는 경로입니다. 이 글은 오른쪽을 실제로 따라갑니다.

## 왜 임베디드 보드에서 EFI인가

배포판 입장에서는 보드마다 다른 `bootcmd`와 FIT 형식보다 "EFI 프로그램 하나를 ESP에 두면 실행된다"는 약속이 훨씬 다루기 쉽습니다. 콘센트 규격이 하나면 가전마다 다른 어댑터가 필요 없는 것과 같습니다. 그래서 Arm의 EBBR(Embedded Base Boot Requirements)은 임베디드 펌웨어가 제공할 UEFI 부분 집합을 정하고, v2024.04 `doc/develop/uefi/uefi.rst`는 U-Boot의 UEFI 구현 목표를 EBBR v2.1.0으로 밝힙니다. 다만 kernel이 실제로 쓰는 기능이 빌드에 있는지는 보드마다 확인할 일이고, 아래 실험은 그 확인을 QEMU에서 한 것입니다.

## ESP에 파일 넣기 — U-Boot의 `fatwrite`

ESP는 FAT이어야 합니다. host에서 FAT 이미지에 파일을 넣는 도구 대신, U-Boot의 `fatwrite`로 ext4 파티션의 파일을 ESP에 복사했습니다(이 빌드는 `CONFIG_FAT_WRITE=y`).

```text
=> load virtio 0:2 ${kernel_addr_r} /vmlinuz
37660608 bytes read in 67 ms (536.1 MiB/s)
=> fatwrite virtio 0:1 ${kernel_addr_r} vmlinuz.efi ${filesize}
37660608 bytes written in 458 ms (78.4 MiB/s)
=> load virtio 0:2 ${ramdisk_addr_r} /initrd.gz
139 bytes read in 0 ms
=> fatwrite virtio 0:1 ${ramdisk_addr_r} initrd.gz ${filesize}
139 bytes written in 6 ms (22.5 KiB/s)
```

## boot option 만들기 — `efidebug boot add`

UEFI에서 "무엇을 부팅할지"는 `Boot####` 변수(boot option)와 `BootOrder` 변수가 정합니다. U-Boot에서는 `efidebug`로 만듭니다. v2024.04의 문법은 `-b`(부팅 파일)·`-i`(initrd)·`-s`(kernel에 넘길 문자열) 옵션 형식입니다. 옵션 없이 쓰던 예전 형식은 사용법만 출력하고 거부됩니다.

```text
=> efidebug boot add 1 old-syntax virtio 0:1 vmlinuz.efi
efidebug - Configure UEFI environment

Usage:
...
efidebug boot add - set UEFI BootXXXX variable
  -b|-B <bootid> <label> <interface> <devnum>[:<part>] <file path>
  -i|-I <interface> <devnum>[:<part>] <initrd file path>
  (-b, -i for short form device path)
  -s '<optional data>'
...
=> efidebug boot add -b 1 debian virtio 0:1 vmlinuz.efi -i virtio 0:1 initrd.gz -s 'console=ttyAMA0 earlycon'
=> efidebug boot order 1
```

처음 `efidebug`를 실행할 때 `Failed to load EFI variables`가 한 번 출력되었는데, 저장된 변수 파일이 아직 없어서입니다(`lib/efi_loader/efi_var_file.c`).

## 변수가 재부팅 뒤에도 남는가

QEMU를 껐다 켜고 ESP를 보면 파일이 하나 늘어 있습니다.

```text
=> ls virtio 0:1
 37660608   vmlinuz.efi
      139   initrd.gz
      616   ubootefi.var

3 file(s), 0 dir(s)
```

`CONFIG_EFI_VARIABLE_FILE_STORE`가 켜진 빌드는 비휘발(NV) 속성 변수를 ESP의 `ubootefi.var`에 저장합니다(`efi_var_file.c`의 주석 "File ubootefi.var is created on the EFI system partition"). 이 파일을 쓰려면 U-Boot가 ESP를 찾아야 하므로 파티션 type이 EFI system partition이어야 합니다. [14장](/blog/embedded/bootloader/chapter14-bootflow-bootmeth)에서 Linux type 파티션에 EFI 프로그램을 두었을 때 `No EFI system partition` / `Failed to persist EFI variables`가 나온 것이 그 반대 경우입니다.

```text
=> efidebug boot dump
Boot0000:
attributes: A-- (0x00000001)
  label: virtio 0
  file_path: /VenHw(e61d73b9-...)/VenHw(e61d73b9-...)/VenHw(e61d73b9-...)
  data:
Boot0001:
attributes: A-- (0x00000001)
  label: debian
  file_path: /HD(1,GPT,2b2f14fc-1b09-455f-9cbc-d93760b30732,0x800,0x20000)/vmlinuz.efi
  initrd_path: /HD(1,GPT,2b2f14fc-1b09-455f-9cbc-d93760b30732,0x800,0x20000)/initrd.gz
  data:
=> efidebug boot order
 1: Boot0001: debian
=> printenv -e BootOrder
BootOrder:
    8be4df61-93ca-11d2-aa0d-00e098032b8c (EFI_GLOBAL_VARIABLE_GUID)
    NV|BS|RT, DataSize = 0x2
```

읽을 거리가 몇 가지 있습니다.

- `Boot0001`의 경로는 `HD(1,GPT,<파티션 GUID>,0x800,0x20000)`입니다. U-Boot의 `virtio 0:1`이라는 이름이 아니라 **GPT 파티션 GUID와 시작·크기 sector**로 저장되므로, 디스크 번호가 바뀌어도 같은 파티션을 찾습니다.
- 등록하지 않은 `Boot0000: virtio 0`이 있습니다. `CONFIG_CMD_BOOTEFI_BOOTMGR`가 켜져 있으면 `lib/efi_loader/efi_setup.c`가 EFI 초기화 때 `efi_bootmgr_update_media_device_boot_option()`을 불러, 부팅할 수 있는 장치마다 이런 항목을 자동으로 만듭니다. `BootOrder`에 들어 있지 않으므로 이번 부팅에는 쓰이지 않습니다.
- `BootOrder`의 속성 `NV|BS|RT`는 비휘발·Boot Services·Runtime Services 접근 가능이라는 뜻이고, `DataSize = 0x2`는 boot 번호 하나(16 bit)입니다.

## Boot Manager로 kernel 실행 — EFI stub

```text
=> bootefi bootmgr
Booting: debian
EFI stub: Booting Linux Kernel...
EFI stub: EFI_RNG_PROTOCOL unavailable
EFI stub: Loaded initrd from LINUX_EFI_INITRD_MEDIA_GUID device path
EFI stub: Using DTB from configuration table
EFI stub: Exiting boot services...
[    0.000000] Linux version 6.12.107+deb13-arm64 ...
[    0.000000] Machine model: linux,dummy-virt
[    0.000000] efi: EFI v2.10 by Das U-Boot
[    0.000000] efi: RTPROP=0x7d565040 SMBIOS 3.0=0x7e6b1000 INITRD=0x7d45a040 MEMRESERVE=0x7d459040
[    0.000000] secureboot: Secure boot disabled
...
[    0.000000] Kernel command line: console=ttyAMA0 earlycon
...
[    0.052035] Remapping and enabling EFI services.
...
[    0.147489] SMBIOS 3.0.0 present.
[    0.147736] DMI: QEMU QEMU Virtual Machine, BIOS
```

[14장](/blog/embedded/bootloader/chapter14-bootflow-bootmeth)의 extlinux 부팅에서는 kernel이 `efi: UEFI not found.`라고 했는데, 이번에는 `EFI v2.10 by Das U-Boot`입니다. 같은 kernel 파일이 이번에는 EFI 프로그램으로 실행되었다는 뜻이고, 그 차이가 로그에 줄줄이 나타납니다.

| 로그 | 의미 |
| --- | --- |
| `EFI stub: Loaded initrd from LINUX_EFI_INITRD_MEDIA_GUID device path` | initrd를 메모리 주소로 넘기지 않고, U-Boot가 노출한 LoadFile2 프로토콜로 kernel이 직접 읽었습니다(`CONFIG_EFI_LOAD_FILE2_INITRD`, `efidebug -i`로 지정) |
| `EFI stub: Using DTB from configuration table` | DTB를 레지스터로 받지 않고 EFI configuration table에서 찾았습니다 |
| `EFI stub: EFI_RNG_PROTOCOL unavailable` | U-Boot에 RNG 장치가 없어 KASLR seed를 EFI로 받지 못했습니다. QEMU에 `virtio-rng` 같은 장치를 주면 사라집니다 |
| `Kernel command line: console=ttyAMA0 earlycon` | `efidebug -s`로 boot option에 넣은 문자열이 kernel command line이 되었습니다 |
| `Remapping and enabling EFI services` | kernel이 부팅 뒤에도 U-Boot의 Runtime Services(변수 읽기 등)를 쓸 수 있도록 매핑했습니다 |
| `SMBIOS 3.0.0 present` | U-Boot가 SMBIOS table도 만들어 넘겼습니다 |

`secureboot: Secure boot disabled`는 이 빌드에 `CONFIG_EFI_SECURE_BOOT`가 없어서입니다. UEFI Secure Boot는 PK·KEK·db·dbx 변수로 EFI 프로그램의 서명을 검사하는 별개의 체계로, [16장](/blog/embedded/bootloader/chapter16-verified-boot)의 FIT 서명과 키도 형식도 다릅니다.

Boot Manager 없이 한 번만 실행할 때는 `bootefi <image address>[:<image size>] [<fdt address>]` 형식을 씁니다(v2024.04 `cmd/bootefi.c`의 사용법). 이 경우 kernel에 넘길 문자열은 `lib/efi_loader/efi_bootbin.c`가 `efi_env_set_load_options(handle, "bootargs", …)`로 환경 변수 `bootargs`에서 가져옵니다.

## 어느 경로를 쓸까

같은 kernel을 세 가지 방법으로 부팅해 봤습니다.

| 경로 | 장 | kernel이 받는 것 | 무결성 검사 |
| --- | --- | --- | --- |
| extlinux → `booti` | 14장 | 레지스터의 DTB 주소, `append` 문자열 | 없음 |
| FIT → `bootm` | 15·16장 | FIT 안 DTB, 이미지 hash·서명 | FIT hash/서명 |
| EFI Boot Manager → `bootefi` | 이 글 | EFI 환경(DTB·initrd·변수·SMBIOS), `-s` 문자열 | UEFI Secure Boot(켰을 때) |

배포판을 그대로 올리는 보드라면 EFI 경로가 맞고, 제품 이미지를 직접 만들어 서명까지 관리하는 보드라면 FIT 경로가 단순합니다. EFI 경로를 쓰면 boot option이 ESP의 파일에 있다는 점을 잊지 않아야 합니다. ESP를 다시 포맷하면 `BootOrder`도 사라지고, 위의 자동 생성 항목만 남습니다.

## 정리

- arm64 배포판 kernel은 PE 파일(`MZ`)이라 U-Boot의 `bootefi`로 EFI stub을 실행할 수 있고, kernel은 `EFI v2.10 by Das U-Boot`를 보고했습니다.
- v2024.04의 `efidebug boot add`는 `-b`·`-i`·`-s` 형식이며, 옛 형식은 거부됩니다.
- NV 변수는 ESP의 `ubootefi.var`에 저장되었고 재부팅 뒤에도 `Boot0001`과 `BootOrder`가 남았습니다. ESP type이 아니면 저장되지 않습니다.
- boot option 경로는 GPT 파티션 GUID와 sector로 저장되고, Boot Manager는 장치마다 `Boot####`을 자동으로 만들기도 합니다.
- initrd는 LoadFile2(`LINUX_EFI_INITRD_MEDIA_GUID`)로, DTB는 configuration table로, command line은 boot option의 `-s` 데이터로 kernel에 전달되었습니다.

## 다음 장 예고

EFI든 FIT든 `bootm`이든, 결국 *커널에 점프하는 순간*의 ABI는 같아야 합니다. 다음 장은 ARM·AArch64·RISC-V·x86 각각에서 부트로더가 커널에게 *어떤 레지스터로* *어떤 상태로* 인계해야 하는지를 봅니다.

## 관련 항목

- [Ch 17: A/B 업데이트와 boot 이중화](/blog/embedded/bootloader/chapter17-ab-update)
- [Ch 19: 커널로 인계 — Linux boot ABI](/blog/embedded/bootloader/chapter19-kernel-handoff) — EFI stub이 ExitBootServices 뒤 커널에 인계하는 ABI
- [Ch 25: TF-A와 보안 부트](/blog/embedded/bootloader/chapter25-tfa-optee) — TF-A BL31 위에서 U-Boot EFI가 도는 구성
- [Ch 29: Distro Boot vs EFI Boot](/blog/embedded/bootloader/chapter29-distro-boot) — 두 부팅 흐름의 비교와 선택 기준
- [Embedded Security Ch 2: Secure Boot](/blog/embedded/embedded-security/chapter02-secure-boot)
- [UEFI 2.10: Media Access](https://uefi.org/specs/UEFI/2.10/13_Protocols_Media_Access.html) — GPT/MBR 및 FAT media requirements
- [원문 — EBBR specification](https://github.com/ARM-software/ebbr)
- [원문 — ARM SystemReady program](https://www.arm.com/architecture/system-architectures/systemready-compliance-program)
- [U-Boot v2024.04 `cmd/efidebug.c`](https://github.com/u-boot/u-boot/blob/v2024.04/cmd/efidebug.c) · [`lib/efi_loader/efi_bootmgr.c`](https://github.com/u-boot/u-boot/blob/v2024.04/lib/efi_loader/efi_bootmgr.c) · [`lib/efi_loader/efi_var_file.c`](https://github.com/u-boot/u-boot/blob/v2024.04/lib/efi_loader/efi_var_file.c)
