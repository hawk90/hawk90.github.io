---
title: "Ch 10: 스토리지 부트 — MMC, SCSI, NAND, SPI Flash"
date: 2026-05-09T10:00:00
description: "부트 미디어별 동작 차이 — eMMC, SD, SATA, NAND, SPI NOR/NAND의 부트 모드."
series: "Bootloader Internals"
seriesOrder: 10
tags: [embedded, bootloader, u-boot, storage, mmc, nand]
draft: false
---

## 한 줄 요약

**스토리지 부트의 핵심은 "부트 ROM이 기대하는 위치에, 기대하는 형식으로 이미지가 있어야 한다"입니다.** 미디어마다 그 위치와 형식이 다르고, 그 위에서 U-Boot가 동작하는 명령도 다릅니다.

[9장](/blog/embedded/bootloader/chapter09-dram-init)에서 DRAM이 깨어났으니, 이제 메인 U-Boot는 *부트 이미지를 어디서 어떻게 읽을지* 결정해야 합니다. eMMC, SD, SATA, NAND, SPI NOR/NAND는 *물리 레이어*도 다르고 *부트 ROM이 보는 헤더*도 다릅니다. 같은 SoC라도 BOOTSEL 핀 값에 따라 완전히 다른 경로를 탑니다.

이 글에서는 각 미디어의 부트 모드, U-Boot에서 그 미디어를 다루는 명령, 그리고 *어디까지가 부트 ROM의 일이고 어디부터 U-Boot의 일인지*를 정리합니다.

## 부트 미디어 선택과 BOOTSEL

대부분의 SoC는 칩 외부 핀(BOOTSEL, BOOT_MODE)을 reset 시점에 읽어 부트 소스를 결정합니다.

```text
BOOTSEL[2:0] = 000 → 외부 fuse/OTP에 따름
             = 001 → SD card
             = 010 → eMMC
             = 011 → SPI NOR
             = 100 → NAND
             = 101 → USB (download mode)
             = 110 → Ethernet
             = 111 → JTAG halt
```

값은 SoC마다 다릅니다. 양산 보드는 보통 BOOTSEL을 GPIO로 끌어내 *recovery jumper*를 만듭니다. jumper를 짧게 하면 USB download로, 빼면 eMMC로 부팅하는 식입니다. 칩의 [3장](/blog/embedded/bootloader/chapter03-build-system) 빌드 산출물(SPL + main U-Boot)을 어느 미디어에 어느 형식으로 쓸지가 다음 문제입니다.

## eMMC와 SD — MMC 서브시스템

eMMC는 BGA로 PCB에 박혀 있고, SD는 슬롯에 꽂는 카드입니다. 전기적·프로토콜적으로는 거의 같은 *MMC 패밀리*입니다. U-Boot에서도 같은 `mmc` 명령으로 다룹니다.

```text
=> mmc list
FSL_SDHC: 0 (eMMC)
FSL_SDHC: 1 (SD)
=> mmc dev 0 0     # eMMC user partition 선택
=> mmc info
Device: FSL_SDHC
Manufacturer ID: 13
OEM: 14e
Tran Speed: 200000000
Bus Width: 8-bit DDR
=> mmc part        # 파티션 목록
Partition Map for MMC device 0  --  Partition Type: EFI
Part  Start LBA    End LBA      Name
  1   0x00002000   0x00021fff   boot
  2   0x00022000   0x00121fff   rootfs
```

eMMC는 *boot partition*(hardware 영역)을 별도로 가집니다. user area와 분리되어 있고, 부트 ROM이 *boot partition 1*을 먼저 봅니다. SPL과 main U-Boot를 boot partition에 쓰면, user area는 깨끗하게 GPT 파티션으로 쓸 수 있습니다.

```bash
# eMMC boot partition에 U-Boot 쓰기 (호스트 PC에서)
echo 0 > /sys/block/mmcblk0boot0/force_ro
dd if=u-boot-with-spl.imx of=/dev/mmcblk0boot0 bs=1k seek=33
echo 1 > /sys/block/mmcblk0boot0/force_ro

# U-Boot에서 boot partition 활성화
mmc partconf 0 1 1 1     # boot ack, boot 0, partition 1
```

부트 이미지가 적재된 다음의 흐름은 단순합니다.

```text
=> mmc dev 0
=> ext4load mmc 0:1 ${loadaddr} /boot/Image
=> ext4load mmc 0:1 ${fdt_addr_r} /boot/board.dtb
=> booti ${loadaddr} - ${fdt_addr_r}
```

`load` 명령이 추상화되어 있어 `fatload`, `ext4load`, `load`(자동 감지) 모두 가능합니다. distroboot 환경 변수는 거의 항상 *`load`*를 씁니다.

## SATA — `scsi` 명령

SATA SSD를 부트 디스크로 쓰는 시스템(예: NXP Layerscape, Marvell Armada)에서는 `scsi` 명령으로 디스크를 enumerate합니다.

```text
=> scsi scan
SCSI: scanning bus for devices...
  Device 0: (0:0) Vendor: ATA Prod.: Samsung SSD 870 Rev: 4B6Q
            Type: Hard Disk
            Capacity: 476940.0 MB = 465.7 GB
=> scsi part 0
Partition Map for SCSI device 0
Part  Start LBA    End LBA      Name
  1   0x00000800   0x000807ff   efi
  2   0x00080800   0x3a385bff   rootfs
=> load scsi 0:1 ${loadaddr} /Image
```

U-Boot의 SCSI 레이어는 *AHCI*나 *iEDMA* 컨트롤러 위에서 표준 SCSI 명령(READ(10), WRITE(10) 등)을 발행합니다. eMMC와 달리 boot partition이 없으므로, GPT의 첫 파티션에 *FAT*나 *ext4*로 부트 파일을 두고 그대로 읽습니다.

## NAND — UBI와 UBIFS

raw NAND는 *bad block*과 *ECC*를 펌웨어가 처리해야 합니다. 부트 ROM은 보통 NAND의 첫 몇 block을 hardware ECC로 읽어 SPL을 적재합니다. SPL과 main U-Boot 이후는 *UBI*(Unsorted Block Images)와 *UBIFS*가 표준입니다.

```text
=> nand info
Device 0: nand0, sector size 128 KiB
  Page size       2048 b
  OOB size          64 b
  Erase size    131072 b
  ecc strength       8 bit
  ecc step size    512 b
=> ubi part nand0
=> ubi info
UBI: attached mtd1 (name "nand0", size 4096 MiB)
UBI: max. sequence number:       42
=> ubifsmount ubi0:rootfs
=> ubifsload ${loadaddr} /boot/Image
```

UBI는 wear leveling과 bad block 관리를 펌웨어 레이어에서 처리하는 *로지컬 볼륨*입니다. NAND의 raw block 위에 PEB(Physical Erase Block)와 LEB(Logical Erase Block)의 매핑 테이블을 두고, write에서 자동으로 다른 PEB로 옮깁니다.

NAND를 쓰는 시스템의 부트 파티션 레이아웃은 보통 이렇습니다.

```text
Block 0~3   — SPL (hardware ECC, fixed location)
Block 4~7   — main U-Boot (still raw, sometimes redundant copies)
Block 8~9   — U-Boot env (redundant)
Block 10~   — UBI volume (rootfs, kernel, ...)
```

부트 ROM은 SPL을 hardware ECC로 읽는 것까지만 합니다. UBI 마운트는 main U-Boot가 합니다.

## SPI NOR Flash — `sf` 명령

소형 IoT 디바이스는 SPI NOR Flash를 부트 미디어로 자주 씁니다. 작은 용량(4~64MB), 빠른 random read, *byte-addressable*인 점이 장점입니다.

```text
=> sf probe 0:0
SF: Detected w25q256 with page size 256 Bytes, erase size 4 KiB, total 32 MiB
=> sf read ${loadaddr} 0x100000 0x800000   # offset 0x100000부터 8MB read
=> sf erase 0x100000 0x800000
=> sf write ${loadaddr} 0x100000 0x800000
```

`sf` 명령은 raw offset 기반입니다. 파티션 정보가 없으므로, 보드 정의에 *어디에 무엇이 있는지*를 환경 변수나 디바이스 트리에 박아 둡니다.

```c
/* include/configs/myboard.h — 부트 영역 정의 */
#define CONFIG_ENV_OFFSET       0x80000
#define CONFIG_ENV_SIZE         0x10000
#define CONFIG_SYS_SPI_KERNEL_OFFS  0x100000
#define CONFIG_SYS_SPI_DTB_OFFS     0x500000
```

SPI NAND는 `mtd` 서브시스템을 통해 UBI를 얹는 패턴이 일반적입니다. 작은 SoC에서는 raw `mtd read`도 씁니다.

## boot.scr — 스크립트로 묶기

위의 명령들은 *bootcmd*에 직접 넣을 수도 있지만, 보통은 `boot.scr` 파일에 묶어 부트 미디어에 둡니다.

```bash
# boot.cmd — 사람이 읽는 원본
setenv bootargs "console=ttyS0,115200 root=/dev/mmcblk0p2 rw rootwait"
load mmc 0:1 ${kernel_addr_r} /boot/Image
load mmc 0:1 ${fdt_addr_r} /boot/board.dtb
booti ${kernel_addr_r} - ${fdt_addr_r}

# mkimage로 binary script 만들기
mkimage -A arm64 -O linux -T script -C none \
        -d boot.cmd boot.scr
```

`bootcmd`는 그저 `load mmc 0:1 ${loadaddr} boot.scr && source ${loadaddr}` 한 줄이면 됩니다. 부트 시나리오를 *파일 시스템 안*에 두는 것이라, 새 커널을 배포할 때 U-Boot 환경 변수를 건드리지 않아도 됩니다.

## 자주 하는 실수

- **eMMC user area에 U-Boot를 씁니다.** GPT 파티션 0번에 U-Boot를 dd로 쓰면 GPT 헤더가 깨집니다. boot partition을 쓰거나 GPT의 first usable LBA 이전 영역에 두세요.
- **NAND를 dd로 직접 씁니다.** raw NAND는 bad block과 ECC가 필요합니다. `dd if=img of=/dev/mtd0`는 bad block을 건너뛰지 않습니다. `nandwrite`나 `flash_erase`를 쓰세요.
- **SPI Flash 영역이 겹칩니다.** U-Boot env와 kernel image가 같은 sector에 들어가면 `saveenv`가 kernel을 깨뜨립니다. offset을 *erase size 단위*로 정렬하세요.
- **boot partition을 active로 설정하지 않습니다.** `mmc partconf 0 1 1 0`(boot 0 선택)인데 데이터를 boot 1에 썼다면 부트 ROM은 비어 있는 boot 0을 읽습니다.
- **distroboot 변수가 없는 보드에서 `boot.scr`를 찾지 못합니다.** `${prefix}/boot.scr`의 prefix가 `/boot/`인지 `/`인지 보드마다 다릅니다.

## 정리

- 부트 미디어는 BOOTSEL 핀이 결정합니다. 양산 보드는 jumper로 USB recovery 경로를 둡니다.
- eMMC는 *boot partition*에 SPL/U-Boot를 넣고, user area는 GPT로 자유롭게 쓸 수 있습니다.
- SATA는 `scsi scan`으로 enumerate하고, 일반 파티션의 파일을 그대로 읽습니다.
- NAND는 hardware ECC가 필수이고, U-Boot 이후는 *UBI*가 사실상의 표준입니다.
- SPI NOR는 raw offset 기반입니다. 영역 분할은 보드 정의에 박아 둡니다.
- `boot.scr`는 부트 시나리오를 파일 시스템에 두는 패턴입니다. 환경 변수 의존을 줄입니다.

## 다음 장 예고

다음 글에서는 *네트워크 부트*를 봅니다. DHCP, TFTP, PXE의 단계와 U-Boot에서 *distroboot*가 네트워크 부트를 어떻게 통합하는지를 정리합니다.

## 관련 항목

- [Ch 9: DRAM 초기화](/blog/embedded/bootloader/chapter09-dram-init) — 스토리지 부트의 전 단계
- [Ch 11: 네트워크 부트](/blog/embedded/bootloader/chapter11-network-boot) — 디스크가 없는 부트
- [Ch 13: 환경 변수와 bootcmd](/blog/embedded/bootloader/chapter13-env-bootcmd) — `bootcmd`의 구조
- [Buildroot Ch 8: 파일 시스템](/blog/embedded/buildroot/chapter08-filesystems) — rootfs 이미지 포맷
- [Security Ch 6: OTA Update](/blog/embedded/embedded-security/chapter06-ota-update) — 부트 파티션과 OTA
