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

이유는 *배포판 호환*과 *표준화* 두 가지입니다. Debian·Fedora·Ubuntu가 ARM64 이미지를 만들 때 보드마다 별도 부트로더를 묶지 않아도, *EFI stub이 박힌 vmlinuz* 하나로 임베디드 보드까지 부팅할 수 있게 됩니다. ARM·Linaro가 만든 EBBR(Embedded Base Boot Requirements) 표준이 이 흐름을 명문화했습니다. 다음 그림은 Traditional 부트와 EFI 부트의 차이를 보여줍니다.

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

### 완전한 EFI 부팅 스크립트 예시

다음은 ESP(EFI System Partition)에서 Linux EFI stub을 직접 부팅하는 전체 흐름입니다.

```text
# ESP를 FAT으로 마운트하고 파일 확인
=> ls mmc 0:1
    12345678   EFI/BOOT/BOOTAA64.EFI
     8765432   vmlinuz.efi
     1234567   initrd.img
      456789   board.dtb

# kernel과 initrd 로드
=> load mmc 0:1 ${kernel_addr_r} vmlinuz.efi
=> load mmc 0:1 ${ramdisk_addr_r} initrd.img
=> load mmc 0:1 ${fdt_addr_r} board.dtb

# EFI 환경 초기화 (한 번만)
=> bootefi setup ${fdt_addr_r}

# bootargs는 EFI stub이 UEFI 변수에서 읽음
# 또는 직접 전달
=> setenv bootargs "console=ttyS0,115200 root=/dev/mmcblk0p2 rw"

# EFI stub 실행
=> bootefi ${kernel_addr_r} ${fdt_addr_r}
```

initrd를 LoadFile2로 전달하려면 `CONFIG_EFI_LOAD_FILE2_INITRD=y`가 필요합니다.

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

## UEFI 명세에서 무엇이 필수인가

UEFI 명세는 두꺼운 책 한 권 분량입니다. 모든 항목을 다 만족시키지 않아도 *부팅이라는 목적*에는 부족하지 않습니다. EFI 애플리케이션이 실제로 의존하는 영역만 추리면 네 가지로 좁혀집니다.

| 영역 | 역할 | 필수성 |
|------|------|--------|
| Boot Services | 메모리 할당, 프로토콜 핸들, 이미지 로딩·실행 | OS 로더가 가장 많이 호출 |
| Runtime Services | EFI Variable, 시간, reset | Linux 부팅 후에도 일부 호출 |
| NVRAM Variables | `BootOrder`, `BootXXXX`, `SecureBoot` 등 영구 변수 | bootmgr이 의존 |
| GPT + FAT ESP | 디스크 파티션 표준과 FAT32 ESP | 부트로더가 들어 있는 곳 |

GPT 헤더 안에 `EFI System Partition`이라는 type GUID(`C12A7328-F81F-11D2-BA4B-00A0C93EC93B`)가 박힌 파티션이 한 개는 있어야 합니다. 그 위는 FAT12/16/32 중 하나이고, 관례상 FAT32를 씁니다. 그 안 표준 경로(`/EFI/BOOT/BOOTAA64.EFI`)에 fallback 이미지가 놓여 있으면 펌웨어가 무엇이든 부팅이 됩니다.

```text
GPT disk
├── Partition 1: ESP (type GUID = C12A7328-...)
│   FAT32
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

NVRAM Variables는 매번 부팅마다 보존되어야 합니다. 영구 저장소가 없으면 펌웨어가 사용자가 등록한 부팅 항목을 잊어버려 fallback 경로만 시도하게 됩니다.

## U-Boot EFI 구현 범위

U-Boot의 EFI loader는 *부팅에 필요한 만큼*만 구현하는 실용주의 노선입니다. UEFI 명세 100% 호환을 목표로 두지 않으며, 통과 의무가 있는 시험 모음(SCT, Self-Certification Test)에도 일부 항목만 통과합니다.

| 분류 | 항목 | U-Boot 구현 |
|------|------|-------------|
| Boot Services | LoadImage, StartImage, AllocatePages, HandleProtocol | 전부 구현 |
| Boot Services | OpenProtocolInformation, ConnectController | 부분 구현 |
| Runtime Services | GetVariable, SetVariable | 구현 (env 또는 file backend) |
| Runtime Services | GetTime, SetTime | RTC 있을 때만 |
| Runtime Services | UpdateCapsule | 부분 구현 (펌웨어 업데이트용) |
| Runtime Services | ResetSystem | 구현 |
| Protocols | Block IO, Disk IO, Simple File System | 구현 |
| Protocols | Graphics Output Protocol | 디스플레이 드라이버 있을 때 |
| Protocols | Network (PXE, TCP, UDP) | 부분 구현 |
| 보안 | Secure Boot 검증 (PK/KEK/db/dbx) | 구현 |

`OpenProtocolInformation`처럼 진단·디버그용 API 일부가 stub이고, multiprocessor 관련 프로토콜은 빠져 있습니다. 그래도 GRUB·systemd-boot·shim·Linux EFI stub 같은 *실전 소프트웨어*가 동작하기에는 충분합니다.

## GRUB · systemd-boot 부팅 흐름

U-Boot EFI를 켠 임베디드 보드에서 distro를 부팅하는 흐름은 PC와 거의 같습니다. 세 단계로 나뉩니다.

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

U-Boot은 ESP를 mount해 fallback 경로 또는 `BootXXXX`에 적힌 경로의 EFI 이미지를 LoadImage로 메모리에 올리고 StartImage로 점프합니다. 그 EFI 이미지가 GRUB이면 `grub.cfg`를 파싱해 메뉴를 띄우고, systemd-boot이면 `/loader/entries/*.conf`를 읽어 항목을 보여 줍니다.

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

GRUB·systemd-boot 모두 *Linux kernel을 EFI 이미지로 보고* StartImage로 호출합니다. EFI stub이 박힌 kernel이라면 그 자체가 EFI application이라 별도 변환이 필요하지 않습니다.

## EFI variables (efivars)

EFI Variable은 키-값 쌍의 영구 저장소입니다. 이름(`BootOrder`, `Boot0000`, `SecureBoot` 등)과 GUID, 그리고 attribute 비트(non-volatile, boot-services-only, runtime-access 등)로 식별됩니다.

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

U-Boot이 NVRAM에 저장하는 방식은 두 가지입니다. `CONFIG_EFI_VARIABLE_FILE_STORE=y`면 ESP 루트에 `ubootefi.var` 파일을 만들어 그 안에 변수를 직렬화합니다. 그 옵션이 없으면 U-Boot env에 `efi_<name>` 형태로 섞여 저장됩니다. 파일 백엔드가 더 안전합니다. env를 erase해도 EFI 변수는 남고, ESP만 복사해도 환경이 옮겨집니다.

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

임베디드 보드는 보통 *IR*을 노립니다. U-Boot 기반으로 EBBR(Embedded Base Boot Requirements)을 만족하면 IR 인증을 받을 수 있습니다. 인증을 받으면 *어떤 generic distro ISO든* 부팅된다는 보증이 따라옵니다.

```text
SystemReady IR 요구 요약
- UEFI Boot Services 핵심
- UEFI Runtime Services: SetVariable·GetVariable·ResetSystem
- GPT + FAT ESP
- Device Tree를 EFI Configuration Table로 전달
- BSA(Base System Architecture) ACS test suite 통과
```

U-Boot은 IR을 충족하기 위해 만들어진 옵션을 다 갖추고 있습니다. 다만 *벤더가 빌드 시점에 그 옵션을 켰는지*는 보드마다 다릅니다. defconfig를 확인하는 습관이 필요합니다.

## debian-installer · Fedora 부팅 사례

EBBR/SystemReady IR을 충족하는 보드는 distro install 이미지를 그대로 부팅할 수 있습니다. 가장 흔한 시나리오는 다음 둘입니다.

debian-installer (netinst) AArch64.

```bash
# host에서 SD/USB에 이미지 dd
$ xz -d debian-12-netinst-arm64.iso.xz
$ sudo dd if=debian-12-netinst-arm64.iso of=/dev/sdX bs=4M conv=fsync

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

보드별 BSP 부팅 스크립트를 만들 필요가 없어집니다. *PC를 부팅시키듯이* SD 카드를 꽂고 전원을 넣으면 됩니다. 이게 EBBR이 약속하는 핵심 가치입니다.

## 자주 하는 실수

EFI 부팅 도입 시 자주 만나는 함정입니다.

- **`bootefi setup`을 건너뛴다.** EFI System Table이 초기화 안 되어 EFI 변수·시간 함수가 NULL을 반환합니다.
- **DTB를 EFI Configuration Table로 전달하지 않는다.** Linux EFI stub이 *EFI에서 DTB를 받아야* 정상 동작합니다. `bootefi ${kernel_addr_r} ${fdt_addr_r}` 형태의 두 번째 인자를 빠뜨리지 않아야 합니다.
- **`CONFIG_EFI_LOAD_FILE2_INITRD=y`를 빼고** 5.8+ 커널을 부팅한다. initramfs가 메모리에 있어도 커널이 찾지 못합니다.
- **EFI Variable을 env에만 두고** 펌웨어 업데이트 시 env가 같이 날아간다. 파일 저장 백엔드를 권합니다.
- **Secure Boot의 db에 직접 키만 넣고** PK·KEK 계층을 건너뛴다. 검증이 도중에 풀려 거짓 양성이 납니다.
- **GUI 콘솔이 없는데 GOP를 켠다.** 부팅이 *디스플레이 초기화에서* 한참 멈추거나 hang합니다.
- **ESP 파티션을 FAT 외 파일시스템으로 만든다.** ext4·btrfs로 포맷한 ESP는 펌웨어가 인식하지 못합니다. FAT32(또는 FAT16)만 허용됩니다.
- **MBR 디스크에 EFI 부팅을 시도한다.** UEFI 명세는 GPT를 전제로 하는 항목이 많습니다. MBR로도 부팅이 되긴 하지만 BootXXXX의 디바이스 경로가 GPT GUID에 의존하므로 항목 등록이 깨집니다.
- **EFI variable 영역을 빼고 빌드한다.** `CONFIG_EFI_VARIABLE_FILE_STORE`도 `CONFIG_ENV_IS_*`도 없으면 SetVariable이 in-memory에만 머무릅니다. 재부팅하면 사라집니다.
- **ESP의 GPT type GUID를 일반 데이터 파티션으로 둔다.** type GUID가 `C12A7328-F81F-11D2-BA4B-00A0C93EC93B`여야 펌웨어가 ESP로 인식합니다. `parted set 1 esp on`이나 `sgdisk -t 1:EF00`로 설정합니다.

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
- [Ch 19: 커널로 인계 — Linux boot ABI](/blog/embedded/bootloader/chapter19-kernel-handoff) — EFI stub이 ExitBootServices 뒤 커널에 인계하는 ABI
- [Ch 25: TF-A와 보안 부트](/blog/embedded/bootloader/chapter25-tf-a) — TF-A BL31 위에서 U-Boot EFI가 도는 구성
- [Ch 29: Distro Boot vs EFI Boot](/blog/embedded/bootloader/chapter29-distro-vs-efi) — 두 부팅 흐름의 비교와 선택 기준
- [Embedded Security Ch 2: Secure Boot](/blog/embedded/embedded-security/chapter02-secure-boot)
- [원문 — U-Boot doc/uefi/uefi.rst](https://u-boot.readthedocs.io/en/latest/develop/uefi/uefi.html)
- [원문 — EBBR specification](https://arm-software.github.io/ebbr/)
- [원문 — ARM SystemReady program](https://www.arm.com/architecture/system-architectures/systemready-compliance-program)
