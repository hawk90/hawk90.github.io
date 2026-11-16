---
title: "임베디드 스토리지 부팅 분석 — MMC·SCSI·NAND·SPI Flash 비교"
slug: "embedded/bootloader/chapter10-storage-boot"
date: 2026-05-09T09:10:00
description: "부트 미디어별 동작 차이 — eMMC, SD, SATA, NAND, SPI NOR/NAND의 부트 모드."
series: "Bootloader Internals"
seriesOrder: 10
tags: [embedded, bootloader, u-boot, storage, mmc, nand]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> 저장 장치는 U-Boot 안에서 두 부류로 갈립니다. eMMC·SD·SATA·NVMe·USB·virtio는 **블록 장치**라서 일단 인식되면 `part`·`ls`·`load` 같은 명령을 인터페이스 이름만 바꿔 똑같이 씁니다. raw NAND와 SPI·parallel NOR는 **MTD**라서 erase 단위와 bad block을 직접 다뤄야 하고 명령도 따로 있습니다.

이 글은 U-Boot **v2024.04** 소스를 기준으로 하고, 명령 출력은 모두 이 버전을 `qemu_arm64_defconfig`(+`CONFIG_CMD_MEMTEST`)로 빌드해 QEMU 11.1.3 `virt`(`-cpu cortex-a57 -m 1G`)에서 실제로 실행한 것입니다. 디스크는 64 MiB raw 이미지에 `sgdisk`로 GPT 파티션 두 개를 만들고, 첫 파티션을 `mke2fs -d`로 ext4로 채워 SATA·NVMe·virtio에 각각 붙였습니다.

## 먼저 구분할 두 단계

스토리지 부팅에는 읽는 주체가 다른 두 단계가 있습니다. 첫째는 **ROM이 첫 firmware를 읽는 단계**로, 어느 장치의 어느 위치를 어떤 형식으로 읽을지가 SoC 안에 고정되어 있습니다. 둘째는 **U-Boot가 OS 파일을 읽는 단계**로, 여기서는 U-Boot에 빌드된 driver와 명령이 모든 것을 정합니다. 앞 단계를 바꾸려면 SoC 문서와 strap·fuse를 봐야 하고, 뒤 단계를 바꾸려면 defconfig와 환경 변수를 고치면 됩니다.

![ROM이 boot source를 골라 첫 firmware stage 이미지를 읽는 단계와, U-Boot가 저장 장치 driver로 raw offset·파티션·filesystem에서 kernel·DTB·initramfs를 RAM에 적재하는 단계를 나눈 그림](/images/blog/bootloader/diagrams/ch10-storage-layout.svg)

QEMU `virt`는 첫 단계가 특이합니다. `-bios u-boot.bin`으로 주면 QEMU가 이미지를 주소 0의 parallel NOR flash에 넣고 CPU가 거기서 바로 실행합니다. [8장](/blog/embedded/bootloader/chapter08-board-init)의 `bdinfo`에서 `reloc off`가 `relocaddr`와 같았던 것도 이 때문입니다. U-Boot가 flash 주소 0에서 시작했으니 이동 거리가 곧 목적지 주소입니다.

## 한눈에 보는 비교

| 매체 | U-Boot 명령 | driver model uclass | 접근 방식 | 이 글에서 확인한 방법 |
| --- | --- | --- | --- | --- |
| eMMC·SD | `mmc` | `UCLASS_MMC` → 블록 장치 | 512 byte 블록, eMMC는 hardware boot partition 있음 | v2024.04 소스·문서 (이 QEMU 빌드에는 없음) |
| SATA | `scsi` | `UCLASS_AHCI` → `UCLASS_SCSI` → 블록 장치 | 512 byte 블록 | QEMU AHCI 실측 |
| NVMe | `nvme` | `UCLASS_NVME` → 블록 장치 | 블록 | QEMU 실측 |
| virtio-blk | `virtio` | `UCLASS_VIRTIO` → 블록 장치 | 블록 (가상 머신 전용) | QEMU 실측 |
| raw NAND | `nand` | MTD | page 읽기·block erase, bad block 관리 필요 | v2024.04 소스 |
| SPI NOR | `sf` | `UCLASS_SPI_FLASH` (MTD) | sector erase 후 쓰기 | v2024.04 소스 |
| parallel NOR (CFI) | `flinfo`·`erase`·`cp` | CFI flash driver | memory-mapped, sector erase | QEMU 실측 |

uclass 이름은 `include/dm/uclass-id.h`에 있는 그대로입니다. 표의 핵심은 세 번째 열입니다. "→ 블록 장치"로 끝나는 매체는 그 뒤의 파티션·파일시스템 처리가 같은 코드를 탑니다.

## 블록 장치 — 인터페이스 이름만 다르다

SATA부터 보겠습니다. QEMU의 AHCI controller는 SCSI 계층을 거쳐 노출되므로 명령은 `scsi`입니다.

```text
=> scsi scan
scanning bus for devices...
Target spinup took 0 ms.
SATA link 1 timeout.
...
SATA link 5 timeout.
AHCI 0001.0000 32 slots 6 ports 1.5 Gbps 0x3f impl SATA mode
flags: 64bit ncq only
  Device 0: (0:0) Vendor: ATA Prod.: QEMU HARDDISK Rev: 2.5+
            Type: Hard Disk
            Capacity: 64.0 MB = 0.0 GB (131072 x 512)
```

`SATA link 1~5 timeout`은 오류가 아닙니다. 이 AHCI controller는 port 6개를 구현하고(`0x3f impl`), 디스크는 port 0에만 붙였으므로 나머지 다섯 개에서 link가 올라오지 않았다는 뜻입니다. 실제 보드에서 디스크를 꽂은 port까지 timeout이 난다면 그때가 문제입니다.

인식된 뒤의 파티션 확인은 매체와 상관없이 `part list <interface> <dev>`입니다.

```text
=> part list scsi 0

Partition Map for SCSI device 0  --   Partition Type: EFI

Part	Start LBA	End LBA		Name
	Attributes
	Type GUID
	Partition GUID
  1	0x00000800	0x000187ff	"boot"
	attrs:	0x0000000000000000
	type:	0fc63daf-8483-4772-8e79-3d69d8477de4
	guid:	b1986114-8420-4843-891c-805c52c7b5e4
  2	0x00018800	0x0001ffde	"data"
...
```

`Partition Type: EFI`는 GPT라는 뜻이고, 시작 LBA `0x800`(2048)은 `sgdisk -n 1:2048:+48M`으로 만든 값 그대로입니다. type GUID `0fc63daf-…`는 Linux filesystem 파티션입니다. 같은 이미지를 NVMe와 virtio로 붙이면 명령의 첫 단어만 바뀝니다.

```text
=> nvme scan
=> nvme info
Device 0: Vendor: 0x1b36 Rev: 11.1.3   Prod: deadbeef
            Type: Hard Disk
            Capacity: 64.0 MB = 0.0 GB (131072 x 512)
=> part list nvme 0

Partition Map for NVMe device 0  --   Partition Type: EFI
...
  1	0x00000800	0x000187ff	"boot"
=> virtio scan
=> virtio info
Device 0: QEMU VirtIO Block Device
            Type: Hard Disk
            Capacity: 64.0 MB = 0.0 GB (131072 x 512)
```

NVMe의 `Prod: deadbeef`는 QEMU에 `-device nvme,serial=deadbeef`로 준 serial이 그대로 보이는 것입니다. 파일 읽기도 같습니다. `<interface> <dev>:<part>`가 위치를 정하고 나머지는 ext4·FAT 공통 코드가 처리합니다.

```text
=> ls scsi 0:1 /boot
<DIR>       1024 .
<DIR>       1024 ..
         1048576 board.dtb
              35 hello.txt
=> load virtio 0:1 ${kernel_addr_r} /boot/hello.txt
35 bytes read in 4 ms (7.8 KiB/s)
=> md.b ${kernel_addr_r} 0x23
40400000: 68 65 6c 6c 6f 20 66 72 6f 6d 20 65 78 74 34 20  hello from ext4
40400010: 6f 6e 20 47 50 54 20 70 61 72 74 69 74 69 6f 6e  on GPT partition
40400020: 20 31 0a                                          1.
```

SATA로 목록을 보고 virtio로 읽었는데 같은 파일이 나옵니다. 저장 장치를 바꿔도 `bootcmd`에서 고칠 곳이 인터페이스 이름 하나라는 뜻이고, 표준 부팅(bootstd)이 장치를 차례로 훑을 수 있는 이유이기도 합니다. QEMU 환경의 순서는 다음과 같습니다.

```text
=> printenv boot_targets
boot_targets=qfw usb scsi virtio nvme dhcp
```

`doc/develop/bootstd.rst`에 따르면 이 변수가 bootdev를 찾는 목록과 순서를 정합니다. SATA와 NVMe에 모두 부팅 가능한 이미지가 있으면 앞에 있는 `scsi`가 먼저 선택됩니다.

## 실제로 걸린 함정 — 정의되지 않은 주소 변수

처음 DTB를 읽을 때 이렇게 실패했습니다.

```text
=> load scsi 0:1 ${fdt_addr_r} /boot/board.dtb
load - load binary file from a filesystem

Usage:
load <interface> [<dev[:part]> [<addr> [<filename> [bytes [pos]]]]]
...
=> fdt addr ${fdt_addr_r}
=> fdt header
No FDT memory address configured. Please configure
the FDT address via "fdt addr <address>" command.
Aborting!
```

원인은 QEMU의 기본 환경에 `fdt_addr_r`이 없다는 것이었습니다. `board/emulation/qemu-arm/qemu-arm.env`의 주소 변수는 `scriptaddr=0x40200000`, `pxefile_addr_r=0x40300000`, `kernel_addr_r=0x40400000`, `ramdisk_addr_r=0x44000000`, 그리고 QEMU가 DTB를 넣어 주는 위치인 `fdt_addr=0x40000000`이고, `fdt_addr_r`은 없습니다. 정의되지 않은 변수는 빈 문자열로 바뀌기 때문에 `load`는 인자가 하나 모자라 사용법만 찍었고, `fdt addr`은 주소 없이 실행되어 **아무 메시지도 내지 않았습니다**. 다음 명령에서야 실패가 드러납니다.

`kernel_addr_r`·`fdt_addr_r`·`ramdisk_addr_r`이라는 이름은 `doc/usage/environment.rst`가 정한 관례일 뿐이고, 값을 정의하는 것은 보드의 몫입니다. 다른 보드의 `bootcmd`를 가져올 때는 먼저 변수가 있는지 확인합니다.

```text
=> echo [${fdt_addr_r}]
[]
=> setenv fdt_addr_r 0x43e00000
=> load scsi 0:1 ${fdt_addr_r} /boot/board.dtb
1048576 bytes read in 5 ms (200 MiB/s)
=> printenv filesize
filesize=100000
=> fdt addr ${fdt_addr_r}
Working FDT set to 43e00000
=> fdt header
magic:			0xd00dfeed
totalsize:		0x100000 (1048576)
...
```

`0x43e00000`은 `kernel_addr_r`(`0x40400000`)과 `ramdisk_addr_r`(`0x44000000`) 사이에 1 MiB DTB가 딱 들어가는 자리로 골랐습니다. 같은 문서는 DTB를 8 byte 정렬 주소에 두라고 요구합니다. `filesize=100000`은 16진수입니다(`fs/fs.c`가 `env_set_hex("filesize", …)`로 저장). 1,048,576 byte와 같은 값입니다.

## eMMC와 SD — 이 빌드에는 없는 명령

같은 QEMU 빌드에서 `mmc list`를 치면 `Unknown command 'mmc'`가 나옵니다. `qemu_arm64_defconfig`가 MMC를 켜지 않기 때문입니다. U-Boot 명령은 이렇게 빌드 설정에 따라 있고 없음이 갈리므로, 문서의 명령이 보드에서 안 된다면 먼저 `.config`를 봅니다.

실제 보드의 eMMC에는 블록 장치 공통 경로 위에 하나가 더 있습니다. user area와 별도로 **hardware boot partition**이 있고, ROM이 어느 쪽에서 부팅할지는 eMMC의 `PARTITION_CONFIG` 레지스터가 정합니다. v2024.04 `doc/usage/cmd/mmc.rst`의 `mmc partconf`가 이 값을 보여 주고 바꿉니다.

| `boot_partition` 값 | 의미 (v2024.04 `mmc.rst`) |
| --- | --- |
| `0x0` | boot 비활성 (기본값) |
| `0x1` | boot partition 1에서 부팅 |
| `0x2` | boot partition 2에서 부팅 |
| `0x7` | user area에서 부팅 |

인자 없이 `mmc partconf <dev>`로 부르면 현재 값을 보여 주기만 합니다. 세 인자를 주는 형태는 eMMC 레지스터를 바꾸므로, ROM이 요구하는 값을 SoC 문서에서 확인한 뒤에만 씁니다. 잘못 바꾸면 ROM이 첫 firmware를 찾지 못해 USB recovery([12장](/blog/embedded/bootloader/chapter12-usb-boot))로만 복구할 수 있습니다.

## MTD — erase 단위와 bad block을 직접 다루는 매체

raw NAND와 NOR는 블록 장치가 아닙니다. 블록 장치는 512 byte 단위로 아무 데나 덮어쓸 수 있지만, flash는 **지운(erase) 뒤에만 쓸 수 있고 지우는 단위가 훨씬 큽니다**. 칠판에 비유하면 블록 장치는 글자 하나씩 고칠 수 있는 화이트보드이고, flash는 한 칸 전체를 지우개로 지워야 새로 쓸 수 있는 칠판입니다.

QEMU `virt`의 parallel NOR가 이 구조를 그대로 보여 줍니다.

```text
=> flinfo

Bank # 1: CFI conformant flash (16 x 16)  Size: 32 MB in 256 Sectors
  Intel Extended command set, Manufacturer ID: 0x89, Device ID: 0x0018
  Erase timeout: 16384 ms, write timeout: 3 ms
  Buffer write timeout: 3 ms, buffer size: 2048 bytes

  Sector Start Addresses:
  00000000   RO   00020000   RO   00040000   RO   00060000   RO   00080000   RO
  000A0000   RO   000C0000   RO   000E0000   RO   00100000        00120000
...
Bank # 2: CFI conformant flash (16 x 16)  Size: 32 MB in 256 Sectors
...
  04000000   RO   04020000   RO   04040000        04060000        04080000
```

sector 시작 주소가 `0x20000`씩 늘어나므로 erase 단위는 128 KiB입니다. `RO` 표시는 U-Boot가 스스로 걸어 둔 쓰기 보호이고, 두 구간 모두 이유가 있습니다.

- bank 1의 `0x00000000`~`0x000FFFFF`(8 sector)는 U-Boot 자신입니다. 이 빌드는 `CONFIG_SYS_MONITOR_BASE=0x00000000`이고, `drivers/mtd/cfi_flash.c`의 `flash_protect_default()`가 그 주소부터 `monitor_flash_len`(`common/board_r.c`에서 `_end - __image_copy_start`)만큼을 보호합니다. 이 장의 빌드(`CMD_MEMTEST`를 더한 빌드)에서는 `_end`가 `0xfff28`이라 그 길이가 `0xfff28`이고, sector 경계로 올리면 8개가 됩니다. 8장 `bdinfo`의 `flashoffset` `0xffb30`은 기본 빌드의 값입니다.
- bank 2의 `0x04000000`~`0x0403FFFF`(2 sector)는 환경 변수 영역입니다. 이 빌드는 `CONFIG_ENV_IS_IN_FLASH=y`, `CONFIG_ENV_ADDR=0x4000000`, `CONFIG_ENV_SECT_SIZE=0x40000`입니다. 부팅 로그의 `Loading Environment from Flash... *** Warning - bad CRC, using default environment`는 이 영역이 아직 비어 있다는 뜻입니다.

raw NAND와 SPI NOR는 이 QEMU 빌드에 없지만 명령은 v2024.04 소스에 있습니다. NAND는 `nand bad`로 공장 출하 때부터 표시된 bad block 목록을 먼저 봅니다(`cmd/nand.c`). bad block을 건너뛰지 않고 이미지를 연속 주소로 쓰면 중간 block이 사라지기 때문에, NAND 위에는 보통 bad block을 처리하는 UBI 같은 계층을 둡니다. SPI NOR는 `sf probe [[bus:]cs] [hz] [mode]`로 장치를 고른 뒤 `sf read <addr> <offset> <len>`으로 읽습니다(`cmd/sf.c`). `sf probe` 없이 다른 `sf` 명령을 치면 "No SPI flash selected. Please run \`sf probe'"가 나옵니다.

## 정리

- U-Boot에서 eMMC·SD·SATA·NVMe·virtio는 블록 장치라 `part list`·`ls`·`load`를 인터페이스 이름만 바꿔 씁니다. QEMU에서 같은 GPT 이미지를 SATA·NVMe·virtio로 붙여 확인했습니다.
- SATA는 AHCI → SCSI 계층이라 명령이 `scsi`이고, 디스크 없는 port의 `SATA link timeout`은 정상입니다.
- `kernel_addr_r`·`fdt_addr_r`은 관례 이름일 뿐이고 보드가 정의합니다. QEMU 기본 환경에는 `fdt_addr_r`이 없어 `load`가 사용법만 출력하고 `fdt addr`은 조용히 넘어갔습니다.
- `filesize`와 `mtest` 반복 횟수처럼 U-Boot의 숫자는 16진수인 경우가 많습니다.
- eMMC의 ROM 부팅 위치는 `PARTITION_CONFIG`가 정하고, `mmc partconf <dev>`로 읽을 수 있습니다.
- NOR·NAND는 MTD라 erase 단위(QEMU NOR는 128 KiB)와 bad block을 직접 다룹니다. U-Boot는 자기 영역과 env 영역을 `RO`로 보호합니다.

## 다음 장 예고

다음 글에서는 저장 장치 대신 네트워크에서 이미지를 받는 경로, 곧 DHCP·TFTP·PXE를 같은 QEMU 환경에서 살펴봅니다.

## 관련 항목

- [Ch 9: DRAM 초기화](/blog/embedded/bootloader/chapter09-dram-init) — 저장 장치 접근 전 초기화 단계
- [Ch 11: 네트워크 부트](/blog/embedded/bootloader/chapter11-network-boot) — 네트워크에서 이미지 읽기
- [Ch 12: USB 부트와 download mode](/blog/embedded/bootloader/chapter12-usb-boot) — USB 전송과 recovery 선택지
- [Ch 13: 환경 변수와 bootcmd](/blog/embedded/bootloader/chapter13-env-bootcmd) — 부팅 명령 구성
- [Ch 28: Flash 레이아웃](/blog/embedded/bootloader/chapter28-flash-layout) — partition과 redundant image 설계
- [Buildroot Ch 8: 파일 시스템](/blog/embedded/buildroot/chapter08-filesystems) — root filesystem 구성
- [U-Boot v2024.04 `doc/usage/cmd/mmc.rst`](https://github.com/u-boot/u-boot/blob/v2024.04/doc/usage/cmd/mmc.rst)
- [U-Boot v2024.04 `doc/usage/environment.rst`](https://github.com/u-boot/u-boot/blob/v2024.04/doc/usage/environment.rst)
