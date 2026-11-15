---
title: "Modern U-Boot bootflow / bootmeth — 새 추상화 레이어 분석"
slug: "embedded/bootloader/chapter14-bootflow-bootmeth"
date: 2026-05-09T09:14:00
description: "U-Boot Standard Boot의 bootdev·bootmeth·bootflow 모델과 보드별 migration 확인."
series: "Bootloader Internals"
seriesOrder: 14
tags: [embedded, bootloader, u-boot, bootflow, bootmeth]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> Standard Boot(bootstd)는 **장치(bootdev) × 파티션 × 부팅 방법(bootmeth)**을 차례로 시도해, 부팅할 수 있는 후보(bootflow)를 모으고 그중 하나를 실행합니다. 같은 디스크에 extlinux 설정, `boot.scr`, EFI 실행 파일을 함께 넣으면 bootflow 세 개가 나오고, 어느 것을 먼저 고를지는 bootmeth 순서가 정합니다.

이 글의 출력은 U-Boot **v2024.04**(`qemu_arm64_defconfig`, `CONFIG_BOOTSTD_FULL=y`)를 QEMU 11.1.3 `virt`에서 실행한 것입니다. 128 MiB GPT 디스크의 ext4 파티션 하나에 세 가지를 넣어 virtio-blk로 붙였습니다.

| 파일 | 내용 | 대응 bootmeth |
| --- | --- | --- |
| `/extlinux/extlinux.conf` + `/boot/vmlinuz` | Debian 13.7 arm64 netboot kernel (SHA256을 Debian `SHA256SUMS`와 대조) | `extlinux` |
| `/boot/boot.scr` | [13장](/blog/embedded/bootloader/chapter13-env-bootcmd)에서 만든 `mkimage -T script` 스크립트 | `script` |
| `/efi/boot/bootaa64.efi` | U-Boot 빌드가 만든 `lib/efi_loader/helloworld.efi` | `efi` |

## 세 가지 이름 — bootdev, bootmeth, bootflow

택배 배송에 비유하면 이해가 쉽습니다. **bootdev**는 배송지(어느 장치), **bootmeth**는 배송 방법(어떤 형식의 파일을 찾을지), **bootflow**는 "이 배송지에서 이 방법으로 보낼 수 있는 물건이 있다"는 확인서입니다. 실제 목록입니다.

```text
=> bootdev list
Seq  Probed  Status  Uclass    Name
---  ------  ------  --------  ------------------
  0   [   ]      OK  qfw       fw-cfg@9020000.bootdev
  1   [   ]      OK  virtio    virtio-blk#31.bootdev
  2   [   ]      OK  ethernet  virtio-net#32.bootdev
---  ------  ------  --------  ------------------
(3 bootdevs)
=> bootmeth list
Order  Seq  Name                Description
-----  ---  ------------------  ------------------
    0    0  extlinux            Extlinux boot from a block device
    1    1  script              Script boot from a block device
    2    2  efi                 EFI boot from an .efi file
 glob    3  efi_mgr             EFI bootmgr flow
    4    4  pxe                 PXE boot from a network device
    5    5  qfw                 QEMU boot using firmware interface
 glob    6  vbe_simple          VBE simple
-----  ---  ------------------  ------------------
(7 bootmeths)
```

이전 자료에는 extlinux를 읽는 bootmeth가 `distro`로 나오지만, v2024.04의 이름은 `extlinux`(`boot/bootmeth_extlinux.c`)입니다. `CONFIG_BOOTMETH_DISTRO`라는 Kconfig는 남아 있는데, bootmeth가 아니라 `script`·`extlinux`·`extlinux_pxe`·`efi`를 한꺼번에 켜는 묶음 옵션입니다(`boot/Kconfig`). `glob` 표시가 붙은 `efi_mgr`·`vbe_simple`은 **global bootmeth**로, 장치를 돌기 전에 스스로 장치를 고르는 방법입니다(`doc/develop/bootstd.rst`).

## 스캔은 조합을 하나씩 시도한다

`bootflow scan`에 `-a`(실패한 후보도 표시)와 `-e`(오류 표시)를 붙이면 안에서 무슨 일이 일어나는지 다 보입니다. 앞부분만 옮깁니다.

```text
=> bootflow scan -lae virtio
Scanning for bootflows with label 'virtio'
Seq  Method       State   Uclass    Part  Name                      Filename
---  -----------  ------  --------  ----  ------------------------  ----------------
Hunting with: virtio
Scanning bootdev 'virtio-blk#31.bootdev':
  0  extlinux     media   virtio       0  virtio-blk#31.bootdev.who
     ** No partition found, err=-2
  1  script       media   virtio       0  virtio-blk#31.bootdev.who
     ** No partition found, err=-2
  2  efi          media   virtio       0  virtio-blk#31.bootdev.who
     ** No partition found, err=-2
  3  pxe          base    virtio       0  virtio-blk#31.bootdev.who
     ** No media/partition found, err=-524
...
  5  extlinux     ready   virtio       1  virtio-blk#31.bootdev.par /extlinux/extlinux.conf
  6  script       ready   virtio       1  virtio-blk#31.bootdev.par /boot/boot.scr
...
  a  extlinux     media   virtio       2  virtio-blk#31.bootdev.par
     ** No partition found, err=-2
...
```

파티션 0(디스크 전체), 1, 2, 3 …마다 bootmeth 다섯 개를 모두 시도합니다. `pxe`·`qfw`는 블록 장치를 다루지 않아 `-524`(`-ENOTSUPP`)로 바로 빠지고, 파티션이 없는 번호에서는 `-2`(`-ENOENT`)가 나옵니다. `-a` 없이 실행하면 `ready`인 줄만 남습니다. 부팅이 이상하게 다른 후보를 고른다면, 먼저 `-lae`로 이 표를 봅니다.

그런데 이 표에서 6번 줄 다음에 있어야 할 EFI 후보가 처음에는 없었습니다.

## 실제로 걸린 함정 — EFI 파일 이름의 대소문자

처음 디스크에는 UEFI 관례대로 `/EFI/BOOT/BOOTAA64.EFI`를 넣었습니다. `-lae`로 보니 EFI bootmeth는 이 이름을 찾고 있었습니다.

```text
  7  efi          fs      virtio       1  virtio-blk#31.bootdev.par efi/boot/bootaa64.efi
     ** File not found, err=-1
```

`boot/bootmeth_efi.c`의 `get_efi_leafname()`은 아키텍처별 이름을 **소문자로** 만듭니다(`CONFIG_ARM64`면 `"bootaa64"` + `".efi"`). 경로 접두어도 `EFI_DIRNAME "efi/boot/"`입니다. 보통 EFI 파일은 FAT으로 만든 EFI system partition에 두는데, FAT은 대소문자를 구분하지 않으므로 대문자 파일도 찾힙니다. 이 실험처럼 ext4에 두면 정확히 `efi/boot/bootaa64.efi`여야 합니다. 이름을 소문자로 바꾸자 세 후보가 모두 나왔습니다.

```text
=> bootflow scan -l virtio
...
  0  extlinux     ready   virtio       1  virtio-blk#31.bootdev.par /extlinux/extlinux.conf
  1  script       ready   virtio       1  virtio-blk#31.bootdev.par /boot/boot.scr
  2  efi          ready   virtio       1  virtio-blk#31.bootdev.par efi/boot/bootaa64.efi
No more bootdevs
---  -----------  ------  --------  ----  ------------------------  ----------------
(3 bootflows, 3 valid)
```

## 후보를 골라 실행하기

`bootflow scan -b`는 찾는 즉시 첫 후보를 실행하고, `bootflow select`·`info`·`boot`로는 원하는 것을 골라 실행합니다. extlinux 후보의 정보입니다.

```text
=> bootflow select 0
=> bootflow info
Name:      virtio-blk#31.bootdev.part_1
Device:    virtio-blk#31.bootdev
Block dev: virtio-blk#31
Method:    extlinux
State:     ready
Partition: 1
Subdir:    (none)
Filename:  /extlinux/extlinux.conf
Buffer:    7e6a69a0
Size:      52 (82 bytes)
OS:        debian
...
FDT:       <NULL>
```

`Size: 52 (82 bytes)`는 16진수와 10진수를 나란히 쓴 것입니다. `OS: debian`은 설정 파일의 `label debian`에서 왔습니다. 설정 파일은 이렇게 짧습니다.

```text
default debian
label debian
	linux /boot/vmlinuz
	append console=ttyAMA0 earlycon
```

실행하면 실제 Debian kernel이 올라옵니다.

```text
=> bootflow boot
** Booting bootflow 'virtio-blk#31.bootdev.part_1' with extlinux
1:	debian
Retrieving file: /boot/vmlinuz
append: console=ttyAMA0 earlycon
## Flattened Device Tree blob at 40000000
   Booting using the fdt blob at 0x40000000
...
Starting kernel ...

[    0.000000] Booting Linux on physical CPU 0x0000000000 [0x411fd070]
[    0.000000] Linux version 6.12.107+deb13-arm64 (debian-kernel@lists.debian.org) ...
[    0.000000] Machine model: linux,dummy-virt
[    0.000000] efi: UEFI not found.
...
[    0.000000] Kernel command line: console=ttyAMA0 earlycon
```

세 가지를 확인할 수 있습니다. `append` 줄이 그대로 `Kernel command line`이 되었습니다. 설정에 `fdt` 줄이 없으므로 U-Boot는 QEMU가 넘긴 `fdt_addr=0x40000000`의 DTB를 썼습니다([13장](/blog/embedded/bootloader/chapter13-env-bootcmd)의 `qemu-arm.env`). extlinux 경로는 `booti`로 kernel을 직접 실행하므로 kernel은 `efi: UEFI not found.`라고 보고합니다.

EFI 후보를 실행하면 결과가 다릅니다.

```text
=> bootflow select 2
=> bootflow boot
** Booting bootflow 'virtio-blk#31.bootdev.part_1' with efi
Using prior-stage device tree
No EFI system partition
Failed to persist EFI variables
...
Booting /efi\boot\bootaa64.efi
Hello, world!
Running on UEFI 2.10
Have device tree
Load options: <none>
File path: /efi\boot\bootaa64.efi
Boot device: /VenHw(...)/HD(1,GPT,52dcfab1-365e-465a-99bb-02c3a6914061,0x800,0x3f7df)
Boot failed (err=-14)
```

U-Boot가 UEFI 2.10 환경을 만들어 EFI 프로그램을 실행했습니다. `No EFI system partition` / `Failed to persist EFI variables`는 이 파티션의 GPT type이 Linux filesystem이지 EFI system partition이 아니어서, EFI 변수를 저장할 곳을 찾지 못했다는 뜻입니다. EFI Boot Manager(`efi_mgr`)를 쓰는 제품이라면 ESP를 제대로 만들어야 부팅 순서 같은 변수가 재부팅 뒤에도 남습니다. 마지막의 `err=-14`는 13장에서 본 것과 같습니다. hello world 프로그램이 kernel로 넘어가지 않고 돌아왔기 때문입니다.

## 순서 바꾸기 — `bootmeths`

`CONFIG_BOOTSTD_FULL`이 켜져 있으면 `bootmeths` 환경 변수로 쓸 bootmeth와 순서를 정할 수 있습니다.

```text
=> setenv bootmeths "efi script"
=> bootmeth list
Order  Seq  Name                Description
-----  ---  ------------------  ------------------
    0    2  efi                 EFI boot from an .efi file
    1    1  script              Script boot from a block device
-----  ---  ------------------  ------------------
(2 bootmeths)
=> bootflow scan -l
...
Scanning bootdev 'virtio-blk#31.bootdev':
  0  efi          ready   virtio       1  virtio-blk#31.bootdev.par efi/boot/bootaa64.efi
  1  script       ready   virtio       1  virtio-blk#31.bootdev.par /boot/boot.scr
...
Scanning bootdev 'virtio-net#32.bootdev':
BOOTP broadcast 1
DHCP client bound to address 10.0.2.15 (0 ms)
*** Warning: no boot file name; using '0A00020F.img'
...
TFTP error: 'Access violation' (2)
```

목록에서 뺀 `extlinux`는 아예 시도되지 않았고, `efi`가 0번이 되었습니다. `bootflow scan -lb`라면 EFI 프로그램이 먼저 실행됩니다. 같은 디스크라도 이 변수 하나로 부팅되는 OS가 바뀌므로, 제품에서는 의도한 순서를 `bootmeths`나 defconfig로 고정해 둡니다.

전체 스캔은 네트워크 bootdev까지 갔습니다. DHCP 응답에 bootfile이 없자 `net/tftp.c`가 IP 주소를 16진수로 바꾼 `0A00020F.img`를 대신 요청했습니다([11장](/blog/embedded/bootloader/chapter11-network-boot)의 PXE 경로와 같은 이름 규칙입니다). 이 실험에서는 TFTP 루트를 주지 않아 `Access violation`으로 끝났습니다. 네트워크 부팅을 쓰지 않는 제품이 bootmeth나 `boot_targets`를 좁혀 두어야 하는 이유입니다.

한 가지 더 관찰한 점이 있습니다. 이 빌드에서 `bootmeths`를 설정한 뒤 레이블을 붙인 `bootflow scan -l virtio`는 hunter를 따로 돌린 뒤에도 0개를 돌려줬고, 레이블 없는 전체 스캔에서만 위의 결과가 나왔습니다. 순서를 바꾼 뒤에는 전체 스캔으로 확인합니다.

## defconfig와 `bootcmd`

QEMU 빌드의 표준 부팅 설정은 다음과 같습니다.

```text
CONFIG_BOOTSTD_FULL=y
CONFIG_BOOTSTD_DEFAULTS=y
CONFIG_BOOTCOMMAND="bootflow scan -lb"
```

`CONFIG_BOOTSTD_DEFAULTS`는 `BOOTMETH_DISTRO`를 select해서 extlinux·script·EFI를 함께 켭니다(`boot/Kconfig`). `bootcmd`가 `bootflow scan -lb`이므로 자동 부팅은 위의 스캔을 돌다가 처음 `ready`가 된 후보를 실행합니다.

v2024.04 `doc/develop/bootstd.rst`의 "Migrating from distro_boot"는 이전 방식에서 옮길 때 세 가지를 하라고 안내합니다. 보드 헤더에서 `BOOTENV`·`BOOT_TARGET_xxx` define을 지우고, 꼭 필요하지 않다면 `boot_targets` 변수를 지우고(표준 부팅은 빠른 장치부터 느린 장치 순으로 기본 순서를 정합니다), `CONFIG_BOOTSTD_DEFAULTS`를 켭니다.

## 새 부팅 방법은 bootmeth 드라이버로

같은 문서는 보드 전용 boot 스크립트가 있다면 그 논리를 bootmeth로 만들라고 권합니다. bootmeth는 driver model 드라이버이고, 연산 몇 개를 채우면 됩니다. 실제 `script` bootmeth의 등록부입니다.

```c
/* boot/bootmeth_script.c (v2024.04) */
static struct bootmeth_ops script_bootmeth_ops = {
	.check		= script_check,
	.read_bootflow	= script_read_bootflow,
	.set_bootflow	= script_set_bootflow,
	.read_file	= bootmeth_common_read_file,
	.boot		= script_boot,
};

U_BOOT_DRIVER(bootmeth_2script) = {
	.name		= "bootmeth_script",
	.id		= UCLASS_BOOTMETH,
	.of_match	= script_bootmeth_ids,
	.ops		= &script_bootmeth_ops,
	.bind		= script_bootmeth_bind,
};
```

연산마다 역할이 정해져 있습니다. `check`는 이 장치를 시도할지 정합니다(`script`는 소스 주석대로 블록·네트워크·SPI flash에서 동작하고, PXE 전용 반복만 `-ENOTSUPP`로 거절합니다). `read_bootflow`는 파일을 찾아 bootflow를 `ready`로 만듭니다(`boot.scr.uimg`, `boot.scr`를 prefix마다 찾습니다). `boot`은 실제로 실행합니다. 드라이버 이름 앞의 숫자(`bootmeth_1extlinux`, `bootmeth_2script`)는 소스 주석이 밝히듯 기본 순서를 정하려고 붙인 것이고, 위 `bootmeth list`의 extlinux(0) → script(1) 순서가 거기서 나옵니다. 파일을 읽는 공용 함수는 `include/bootmeth.h`의 `bootmeth_try_file()`, `bootmeth_alloc_file(bflow, size_limit, align)` 같은 것을 씁니다.

## 정리

- bootstd는 bootdev × 파티션 × bootmeth 조합을 시도해 bootflow를 만들고, `bootflow scan -lae`가 그 전 과정을 보여 줍니다.
- v2024.04에서 extlinux를 읽는 bootmeth 이름은 `extlinux`이고, `CONFIG_BOOTMETH_DISTRO`는 여러 bootmeth를 켜는 묶음 옵션입니다.
- EFI bootmeth는 `efi/boot/bootaa64.efi`를 소문자로 찾습니다. FAT ESP에서는 문제없지만 ext4에서는 대소문자가 맞아야 합니다.
- 같은 디스크에서 extlinux 후보는 실제 Debian 6.12 kernel을, EFI 후보는 `helloworld.efi`를 실행했습니다. ESP가 없으면 EFI 변수가 저장되지 않습니다.
- `bootmeths`로 순서와 대상을 바꾸면 부팅되는 OS가 바뀝니다. 네트워크 bootdev는 bootfile이 없을 때 `<IP hex>.img`를 요청합니다.
- 새 부팅 형식은 `bootmeth_ops`(`check`·`read_bootflow`·`boot` 등)를 채운 드라이버로 추가합니다.

## 다음 장 예고

다음 글에서는 *FIT image*를 봅니다. kernel·DTB·ramdisk를 한 컨테이너로 묶고, hash와 서명으로 검증하는 표준 포맷입니다.

## 관련 항목

- [Ch 13: 환경 변수와 bootcmd](/blog/embedded/bootloader/chapter13-env-bootcmd) — 옛 distro_bootcmd
- [Ch 15: FIT image](/blog/embedded/bootloader/chapter15-fit-image) — bootflow가 다루는 이미지 포맷
- [Ch 18: EFI in U-Boot](/blog/embedded/bootloader/chapter18-efi-in-uboot) — efi_mgr bootmeth의 자세한 동작
- [BSP Ch 6: U-Boot 포팅](/blog/embedded/bsp/chapter06-u-boot-porting) — 보드별 bootflow 활성화
- [U-Boot v2024.04 `doc/develop/bootstd.rst`](https://github.com/u-boot/u-boot/blob/v2024.04/doc/develop/bootstd.rst)
- [U-Boot v2024.04 `boot/bootmeth_efi.c`](https://github.com/u-boot/u-boot/blob/v2024.04/boot/bootmeth_efi.c) · [`boot/bootmeth_script.c`](https://github.com/u-boot/u-boot/blob/v2024.04/boot/bootmeth_script.c)
