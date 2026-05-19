---
title: "Ch 18: EFI in U-Boot — bootefi와 EFI loader"
date: 2026-05-09T18:00:00
description: "U-Boot이 UEFI Boot Services를 노출하는 방식 — bootefi, EBBR, Linux EFI stub과의 연결."
series: "Bootloader Internals"
seriesOrder: 18
tags: [embedded, bootloader, u-boot, efi, uefi, ebbr]
draft: false
---

UEFI는 데스크탑·서버의 영역이라 생각하기 쉽지만, U-Boot은 *EFI loader*라는 부분 UEFI 구현을 들고 있습니다. 덕분에 임베디드 보드도 GRUB·systemd-boot·Linux EFI stub처럼 *EFI 애플리케이션*을 그대로 부팅할 수 있습니다. 배포판이 굳이 보드별 부트로더를 만들지 않아도 되는 셈입니다.

## 한 줄 요약

**`bootefi`로 U-Boot이 EFI Boot Services를 띄우면, EFI 애플리케이션은 자기가 UEFI 위에서 도는지 임베디드 보드 위에서 도는지 구별할 필요가 없어집니다.**

## 왜 임베디드에서 EFI인가

이유는 *배포판 호환*과 *표준화* 두 가지입니다. Debian·Fedora·Ubuntu가 ARM64 이미지를 만들 때 보드마다 별도 부트로더를 묶지 않아도, *EFI stub이 박힌 vmlinuz* 하나로 임베디드 보드까지 부팅할 수 있게 됩니다. ARM·Linaro가 만든 EBBR(Embedded Base Boot Requirements) 표준이 이 흐름을 명문화했습니다.

```text
[Distro vmlinuz.efi]   ----> [Any UEFI firmware]
            \                       |
             \--> EFI stub          v
                       \---> [bootefi via U-Boot]
                                    |
                                    v
                            Same Linux kernel runs
```

EBBR을 따르면 *PC용 ARM64 iso*가 임베디드 보드에서도 그대로 부팅됩니다. 보드 BSP의 부담이 줄어들고, 펌웨어 업데이트도 표준화된 EFI Variable로 처리할 수 있습니다.

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

이 정도면 EFI stub 박힌 커널·GRUB·systemd-boot·shim 같은 표준 EFI 부팅 도구를 띄우기에 충분합니다.

## defconfig 설정

EFI 부팅을 켜려면 다음을 활성화합니다.

```text
CONFIG_CMD_BOOTEFI=y
CONFIG_CMD_BOOTEFI_BOOTMGR=y
CONFIG_CMD_BOOTEFI_HELLO=y
CONFIG_EFI_LOADER=y
CONFIG_EFI_VARIABLE_FILE_STORE=y
CONFIG_EFI_VARIABLES_PRESEED=y
CONFIG_EFI_BOOTMGR=y
CONFIG_EFI_DEVICE_PATH_UTIL=y
CONFIG_EFI_LOAD_FILE2_INITRD=y
# 보안
CONFIG_EFI_SECURE_BOOT=y
```

`CONFIG_EFI_LOAD_FILE2_INITRD=y`가 의외로 중요한 옵션입니다. Linux 5.8 이후 EFI stub은 initramfs를 *LoadFile2 프로토콜*로 로드합니다. 이 옵션이 없으면 initramfs를 따로 cmdline으로 전달해야 합니다.

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
=> bootefi setup ${fdt_addr_r}
=> setenv bootargs 'root=/dev/mmcblk0p2 ro'
=> bootefi ${kernel_addr_r} ${fdt_addr_r}
```

`bootefi setup`은 *EFI System Table*과 *기본 변수*를 초기화하는 단계입니다. 이 단계가 한 번 끝나면 그다음부터는 그냥 `bootefi <addr>`로 실행할 수 있습니다.

## EFI bootmgr

`bootefi bootmgr`은 *EFI Boot Manager*를 흉내 냅니다. EFI Variable에 `BootOrder`와 `Boot0000`, `Boot0001` 등이 적혀 있으면 그 순서대로 시도합니다.

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

이 흐름이 시작되면, 보드는 *UEFI 펌웨어를 가진 PC*와 거의 같은 방식으로 부팅됩니다. `efibootmgr`을 userspace에서 돌려 부팅 순서를 바꿀 수도 있습니다.

```bash
# userspace (Linux)
$ efibootmgr -v
BootCurrent: 0000
BootOrder: 0000,0001
Boot0000* distro    HD(1,GPT,...)/File(\EFI\BOOT\BOOTAA64.EFI)
Boot0001* recovery  HD(2,GPT,...)/File(\EFI\RECOVERY\BOOT.EFI)
```

## EFI Variable 저장

U-Boot은 EFI Variable을 *env*에 매핑하거나, 별도 파일에 저장합니다. `CONFIG_EFI_VARIABLE_FILE_STORE=y`면 ESP의 `ubootefi.var` 파일에 저장합니다.

```text
mmc 0:1
  /EFI/
    BOOT/
      BOOTAA64.EFI
  ubootefi.var      <- EFI variable storage
```

변수 저장이 *별도 파일*이라는 점이 익숙해지면 편합니다. env와 분리되어 한쪽이 망가져도 다른 쪽이 살아 있고, ESP만 backup·restore해도 EFI 환경이 옮겨갑니다.

## UEFI Secure Boot 연결

EFI 부팅을 켜면 UEFI Secure Boot를 그대로 쓸 수 있습니다. 키 계층은 PC와 동일합니다.

- **PK** (Platform Key) — OEM/벤더.
- **KEK** (Key Exchange Key) — distro·OS.
- **db** (Allowed signatures) — 허용 이미지 해시·서명.
- **dbx** (Forbidden) — 폐기된 해시.

shim·grub·linux 모두 db에 들어 있는 키로 서명되어 있어야 부팅됩니다. U-Boot은 이 검증을 *Boot Services의 LoadImage 안*에서 수행합니다.

```text
=> efidebug pk set MyPK.auth
=> efidebug kek set MyKEK.auth
=> efidebug db set MyDB.auth
=> efidebug secure-boot
secure boot enabled
```

이 흐름과 *Ch 16의 FIT 서명*은 둘 다 가능합니다. 시스템의 *제1 부트 경로*는 FIT signature로 두고, "distro install ISO도 받아 부팅하고 싶다" 같은 부가 경로에 EFI Secure Boot을 두는 식의 분업이 흔합니다.

## EBBR 호환

EBBR(Embedded Base Boot Requirements)은 임베디드용 UEFI 최소 요건을 정해 둔 표준입니다.

| 요건 | 의미 |
|------|------|
| FAT ESP | EFI System Partition을 FAT으로 둘 것 |
| BOOTAA64.EFI / BOOTARM.EFI | fallback 부팅 경로 |
| Variable Storage | 영구 EFI 변수 저장 |
| Devicetree 전달 | EFI configuration table로 DTB 전달 |
| LoadFile2 initrd | 표준 방식의 initramfs 전달 |

U-Boot이 EBBR을 다 만족하면, *Debian arm64 install ISO* 같은 디스크를 그대로 끼워 부팅해도 됩니다. `bootefi`가 자동으로 ESP를 찾아 부트로더를 띄웁니다.

## 자주 하는 실수

EFI 부팅 도입 시 자주 만나는 함정입니다.

- **`bootefi setup`을 건너뛴다.** EFI System Table이 초기화 안 되어 EFI 변수·시간 함수가 NULL을 반환합니다.
- **DTB를 EFI Configuration Table로 전달하지 않는다.** Linux EFI stub이 *EFI에서 DTB를 받아야* 정상 동작합니다. `bootefi ${kernel_addr_r} ${fdt_addr_r}` 형태의 두 번째 인자를 빠뜨리지 않아야 합니다.
- **`CONFIG_EFI_LOAD_FILE2_INITRD=y`를 빼고** 5.8+ 커널을 부팅한다. initramfs가 메모리에 있어도 커널이 찾지 못합니다.
- **EFI Variable을 env에만 두고** 펌웨어 업데이트 시 env가 같이 날아간다. 파일 저장 백엔드를 권합니다.
- **Secure Boot의 db에 직접 키만 넣고** PK·KEK 계층을 건너뛴다. 검증이 도중에 풀려 거짓 양성이 납니다.
- **GUI 콘솔이 없는데 GOP를 켠다.** 부팅이 *디스플레이 초기화에서* 한참 멈추거나 hang합니다.

## 정리

- U-Boot의 EFI loader는 UEFI Boot Services·일부 Runtime Services를 구현해 EFI 부팅을 가능케 합니다.
- `bootefi setup` 다음 `bootefi <addr> <dtb>` 형태가 표준 부팅 흐름입니다.
- `bootefi bootmgr`이 EFI Variable의 BootOrder를 읽어 자동 부팅을 수행합니다.
- EFI Variable 저장은 env 매핑보다 별도 파일 저장이 더 안전합니다.
- UEFI Secure Boot의 PK/KEK/db/dbx 계층을 그대로 가져와 distro 키로 검증할 수 있습니다.
- EBBR을 충족하면 distro 설치 ISO를 임베디드 보드에서 바로 부팅할 수 있습니다.
- Linux 5.8+의 LoadFile2 initrd 프로토콜은 `CONFIG_EFI_LOAD_FILE2_INITRD=y`로 활성화해야 합니다.

## 다음 장 예고

EFI든 FIT든 `bootm`이든, 결국 *커널에 점프하는 순간*의 ABI는 같아야 합니다. 다음 장은 ARM·AArch64·RISC-V·x86 각각에서 부트로더가 커널에게 *어떤 레지스터로* *어떤 상태로* 인계해야 하는지를 봅니다.

## 관련 항목

- [Ch 17: A/B 업데이트와 boot 이중화](/blog/embedded/bootloader/chapter17-ab-update)
- [Ch 19: 커널로 인계 — Linux boot ABI](/blog/embedded/bootloader/chapter19-kernel-handoff)
- [Embedded Security Ch 2: Secure Boot](/blog/embedded/embedded-security/chapter02-secure-boot)
- [원문 — U-Boot doc/uefi/uefi.rst](https://u-boot.readthedocs.io/en/latest/develop/uefi/uefi.html)
- [원문 — EBBR specification](https://arm-software.github.io/ebbr/)
