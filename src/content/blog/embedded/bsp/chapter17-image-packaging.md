---
title: "BSP 이미지 패키징 — Flash Layout·Partition·GPT 설계"
slug: "embedded/bsp/chapter17-image-packaging"
date: 2026-05-18T09:17:00
description: "최종 이미지 조립 — 파티션 테이블, flash layout, SD/eMMC/UFS 굽기 워크플로."
series: "BSP Development"
seriesOrder: 17
tags: [embedded, bsp, image, partition, gpt]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

**flash image는 *섹터 단위의 layout*입니다. 한 번 양산되면 바꾸기 어렵습니다.** 파티션 layout과 partition table 형식을 처음부터 잘 잡는 것이 핵심입니다.

빌드 시스템이 toolchain, kernel, rootfs를 다 만들어 줘도 그것들이 *어떻게 한 binary로 묶이는가*는 별도 문제입니다. 이삿짐 트럭에 짐을 싣는 순서처럼, SoC가 맨 먼저 꺼낼 부트 이미지는 정해진 자리에 있어야 하고 나머지 파티션은 그 뒤에 놓여야 합니다.

이번 글은 partition table, A/B 슬롯, GPT 구조를 다루고, Debian 13 guest에서 genimage 18로 실제 SD 이미지를 조립해 sgdisk, bmaptool, img2simg로 확인합니다. raw NAND와 양산 flashing 도구는 실행하지 않았고 U-Boot 문서로 대조했습니다.

## Partition Table 종류

| 형식 | 파티션 정보가 있는 곳 | 적용 |
|------|-------------|------|
| MBR | 0번 섹터의 4개 primary 항목 | 단순한 SD 카드 |
| GPT | LBA 1의 header와 그 뒤 entry array | eMMC·SD |
| MTD partitions | kernel cmdline `mtdparts=` 또는 DT `fixed-partitions` | raw NAND/NOR flash |

GPT의 entry 수는 header에 적힌 값이고, 아래 실행 결과의 sgdisk는 "Partition table holds up to 128 entries"라고 보고했습니다. raw NAND와 NOR에는 블록 장치용 partition table이 없으므로 MTD partition을 씁니다.

## GPT 구조

GPT는 LBA 단위로 다음을 배치합니다.

```text
LBA 0          : Protective MBR (legacy tool 호환)
LBA 1          : GPT Header (primary)
LBA 2~33       : Partition Entry Array (128 entries × 128B = 16KB)
LBA 34~        : Partition data
...
LBA -33 ~ -2   : Partition Entry Array (backup)
LBA -1         : GPT Header (backup)
```

핵심 특징을 짚습니다.

- **앞쪽 34 LBA**. LBA 0~33(512바이트 섹터로 17 KiB)이 protective MBR, header, entry array입니다. 첫 partition을 어디서 시작할지는 따로 정하고, 아래 genimage 결과처럼 SoC 부트 이미지 뒤로 미룰 수 있습니다.
- **backup GPT**. 디스크 끝에 동일 정보가 한 번 더 있습니다. primary가 깨져도 복구 가능합니다.
- **partition UUID**. GPT partition에는 고유한 partition UUID가 있습니다. kernel의 `root=PARTUUID=...`는 장치 이름 열거 순서와 무관하게 root partition을 가리킵니다. 이 시리즈의 Debian guest도 `/proc/cmdline`에 `root=PARTUUID=1f342af3-...`를 씁니다(Ch 10).

`sgdisk -p`로 layout을 확인합니다. 출력 예는 아래 genimage 절에 있습니다.

## A/B Partition Layout

OTA를 안전하게 하려면 두 개의 rootfs 슬롯이 필요합니다. 업데이트 중 전원이 끊겨도 *이전 슬롯*으로 부팅 가능해야 하기 때문입니다.

```text
GPT
├─ p1: bootloader-env (1MB)         # U-Boot 환경, 부팅 슬롯 정보
├─ p2: boot-a (32MB)                # kernel + dtb + initramfs (slot A)
├─ p3: boot-b (32MB)                # kernel + dtb + initramfs (slot B)
├─ p4: rootfs-a (1GB)               # rootfs (slot A)
├─ p5: rootfs-b (1GB)               # rootfs (slot B)
├─ p6: persist (256MB)              # 영구 데이터 (factory cert 등)
├─ p7: data (remainder)             # 사용자 데이터
```

이 layout은 설계 예입니다. A/B 슬롯의 동작을 설명용 변수 이름으로 적으면 다음과 같습니다. 남은 시도 횟수를 *줄여 가는* 이 방식은 RAUC의 U-Boot 연동(`BOOT_ORDER`, `BOOT_<슬롯>_LEFT`, Bootloader Ch 17)과 같은 설계이고, 아래 U-Boot `bootcount` 예는 횟수를 *올려 가며* `bootlimit`과 비교하는 다른 구현입니다.

1. 부팅 직후: 부트로더가 `BOOT_SLOT` 환경 변수를 읽음. 기본 A.
2. 슬롯 A의 boot와 rootfs를 mount.
3. 정상 부팅 완료 시 application이 `BOOT_OK=1`을 씀.
4. OTA agent가 슬롯 B에 새 이미지를 씀.
5. 검증 후 `BOOT_SLOT=B`로 변경 + `TRY_COUNT=3` 설정.
6. 재부팅. B 슬롯이 부팅됨.
7. B가 정상 부팅하면 `BOOT_OK=1`. 실패하면 부트로더가 `TRY_COUNT` 감소 후 A로 fallback.

U-Boot 환경 변수로 다음과 같이 구현합니다.

```text
bootlimit=3
altbootcmd=run boot_alt
bootcmd=run boot_main

boot_main=if test "$boot_slot" = "B"; then run boot_b; else run boot_a; fi
boot_a=load mmc 0:2 ${kernel_addr_r} Image; load mmc 0:2 ${fdt_addr_r} mybsp.dtb; booti ${kernel_addr_r} - ${fdt_addr_r}
boot_b=load mmc 0:3 ${kernel_addr_r} Image; load mmc 0:3 ${fdt_addr_r} mybsp.dtb; booti ${kernel_addr_r} - ${fdt_addr_r}
boot_alt=if test "$boot_slot" = "B"; then setenv boot_slot A; else setenv boot_slot B; fi; setenv bootcount 0; saveenv; reset
```

arm64 `Image`는 `booti`로 부팅합니다(Ch 6의 EVK 환경과 같은 명령). U-Boot v2024.04 `doc/README.bootcount`에 따르면 `CONFIG_BOOTCOUNT_LIMIT`이 켜진 U-Boot는 power-on reset 뒤 `bootcount`를 1로 두고 재부팅마다 1씩 올립니다. 그 값이 `bootlimit`을 넘으면 `bootcmd` 대신 `altbootcmd`를 실행하고(`include/bootcount.h:100-105`, `common/autoboot.c:476`), 성공한 부팅 뒤 `bootcount`를 0으로 돌리는 것은 Linux 쪽 application의 책임입니다. `boot_alt`에서 `bootcount`를 0으로 돌리지 않으면, 저장된 횟수가 계속 `bootlimit`을 넘은 채라 다음 부팅도 `altbootcmd`로 가서 슬롯을 다시 뒤집습니다. 그래서 슬롯을 바꾼 뒤 `setenv bootcount 0`을 함께 저장합니다. bootcount fallback을 QEMU에서 실제로 돌린 기록은 [Bootloader Ch 17](/blog/embedded/bootloader/chapter17-ab-update)에 있습니다.

## SoC 부트 헤더와 첫 섹터

SoC마다 부트 ROM이 읽는 첫 영역이 다릅니다. GPT가 이 영역을 *침범*하면 부팅이 안 됩니다.

U-Boot v2024.04 보드 문서의 SD 기록 명령에서 각 SoC의 위치를 읽을 수 있습니다.

| SoC | 부트 이미지 | 위치 | 근거 |
|-----|----------|------|------|
| i.MX 6UL/6ULL | `SPL` 또는 `u-boot-dtb.imx` | 1 KiB 오프셋 (`dd bs=1k seek=1`) | `doc/board/nxp/mx6ul_14x14_evk.rst:26`, `mx6ullevk.rst:29` |
| i.MX 8M Plus | `flash.bin` | 32 KiB 오프셋 (`dd bs=1K seek=32`) | `doc/board/nxp/imx8mp_evk.rst:55` |
| Rockchip | `idbloader.img` / `u-boot-rockchip.bin` | 섹터 64 (`dd seek=64`) | `doc/board/rockchip/rockchip.rst:267,341` |
| STM32MP1 | TF-A BL2 또는 SPL | GPT 파티션 `fsbl1`, `fsbl2` (각 256 KiB 이상) | `doc/board/st/stm32mp1.rst:437-459` |
| TI AM335x | `MLO` | boot FAT 파티션의 파일 | Buildroot `board/beaglebone/genimage.cfg` (Ch 1) |

STM32MP1은 오프셋이 아니라 이름 붙은 GPT 파티션에서 부트 이미지를 찾는다는 점이 다릅니다. GPT partition 1의 시작 위치는 raw 부트 이미지 뒤로 미루되, GPT header와 entry array는 표준 위치(LBA 1, 2~33)에 둡니다.

i.MX 8M Plus라면 LBA 0~33(17 KiB까지)이 GPT, 32 KiB부터 `flash.bin`, 그 뒤가 첫 partition입니다. 32 KiB는 34 LBA 끝(17 KiB)보다 뒤라서 128-entry GPT와 겹치지 않습니다. 아래 genimage 실행이 이 배치를 실제로 만듭니다.

## genimage로 이미지 조립

`genimage`는 cfg 파일 하나로 multi-partition disk image를 만듭니다. Buildroot의 BeagleBone 이미지도 이 도구로 조립합니다(Ch 1). 아래 cfg를 Debian 13의 genimage 18로 실행했습니다. rootfs와 data 크기는 시험용으로 줄였고, `u-boot` 자리에는 Ch 6에서 만든 i.MX 8M Plus `flash.bin`을 넣었습니다.

```text
# genimage.cfg
image boot.vfat {
    vfat {
        files = {
            "Image",
            "mybsp.dtb",
        }
    }
    size = 32M
}

image rootfs.ext4 {
    ext4 {
        label = "rootfs"
    }
    mountpoint = "/"
    size = 64M
}

image sdcard.img {
    hdimage {
        partition-table-type = "gpt"
    }

    partition u-boot {
        in-partition-table = "no"
        image = "flash.bin"
        offset = 32K
    }

    partition boot-a {
        partition-type-uuid = U
        image = "boot.vfat"
        offset = 8M
    }

    partition boot-b {
        partition-type-uuid = U
        image = "boot.vfat"
    }

    partition rootfs-a {
        partition-type-uuid = L
        partition-uuid = "12345678-9abc-def0-1234-56789abcdef0"
        image = "rootfs.ext4"
    }

    partition rootfs-b {
        partition-type-uuid = L
        partition-uuid = "12345678-9abc-def0-1234-56789abcdef1"
        image = "rootfs.ext4"
    }

    partition data {
        partition-type-uuid = L
        size = 128M
    }
}
```

`in-partition-table = "no"`는 raw 영역(SoC가 읽는 부트 영역)에 쓰지만 GPT에는 표시하지 않는다는 뜻입니다.

실행 결과 중 이미지 조립 부분입니다.

```text
$ genimage --inputpath in --outputpath out --rootpath root --tmppath tmp --config genimage.cfg
INFO: vfat(boot.vfat): cmd: "mkdosfs   '/root/gi/out/boot.vfat'" (stderr):
INFO: ext4(rootfs.ext4): cmd: "mke2fs -t ext4 -I 256 -E 'root_owner=0:0,lazy_itable_init=0,lazy_journal_init=0' -O '^large_file' -O '^huge_file' -d '/root/gi/tmp/root'  -L 'rootfs'  '/root/gi/out/rootfs.ext4' 65536k" (stderr):
INFO: hdimage(sdcard.img): adding primary partition 'u-boot' from 'flash.bin' ...
...
INFO: hdimage(sdcard.img): writing GPT
INFO: hdimage(sdcard.img): writing protective MBR
$ sgdisk -p out/sdcard.img
Disk out/sdcard.img: 671784 sectors, 328.0 MiB
Sector size (logical): 512 bytes
...
Partition table holds up to 128 entries
Main partition table begins at sector 2 and ends at sector 33
First usable sector is 16384, last usable sector is 671750
...
Number  Start (sector)    End (sector)  Size       Code  Name
   1           16384           81919   32.0 MiB    EF00  boot-a
   2           81920          147455   32.0 MiB    EF00  boot-b
   3          147456          278527   64.0 MiB    8300  rootfs-a
   4          278528          409599   64.0 MiB    8300  rootfs-b
   5          409600          671743   128.0 MiB   8300  data
$ dd if=out/sdcard.img bs=1K skip=32 count=4 | cmp -n 4096 - in/flash.bin && echo "flash.bin found at 32 KiB"
flash.bin found at 32 KiB
```

세 가지를 확인할 수 있습니다. entry array가 섹터 2~33에 있고, `flash.bin`이 32 KiB에 들어갔고, 첫 partition은 `offset = 8M`대로 섹터 16384에서 시작합니다. sgdisk가 첫 usable 섹터를 16384로 보고하므로, 이 이미지에서 다른 도구로 partition을 더 만들어도 8 MiB 앞쪽은 쓰이지 않습니다. `partition-type-uuid = U`는 EFI System Partition 타입(sgdisk 코드 `EF00`)으로, `L`은 Linux 파일시스템(`8300`)으로 들어갔습니다.

`sdcard.img`를 `dd`나 `bmaptool`로 SD에 굽습니다.

```bash
$ sudo dd if=sdcard.img of=/dev/sdX bs=4M status=progress conv=fsync
```

`bmaptool`은 데이터가 있는 블록만 씁니다. 위 이미지에서 만든 bmap입니다.

```text
$ bmaptool create -o sdcard.bmap sdcard.img
$ grep -E "<ImageSize>|<BlockSize>|<BlocksCount>|<MappedBlocksCount>" sdcard.bmap
    <ImageSize> 343953408 </ImageSize>
    <BlockSize> 4096 </BlockSize>
    <BlocksCount> 83973 </BlocksCount>
    <MappedBlocksCount> 4651  </MappedBlocksCount>
```

328 MiB 이미지 중 실제 데이터가 있는 블록은 4,651개(약 18 MiB)뿐입니다. 512 MiB 파일에 `bmaptool copy`로 쓴 뒤 원본과 `cmp`로 비교하면 같았습니다. 실제 SD 카드에서의 시간 단축은 재지 않았습니다.

## Android Sparse Image

Android sparse image(`.simg`)는 빈 블록을 메타데이터로만 적는 형식이고, fastboot가 이 형식을 받습니다. 위의 64 MiB ext4로 해 본 결과입니다.

```text
$ img2simg rootfs.ext4 rootfs.simg
$ ls -l rootfs.ext4 rootfs.simg
-rw-r--r-- 1 root root 67108864 Nov 16 08:08 rootfs.ext4
-rw-r--r-- 1 root root   356604 Nov 16 08:08 rootfs.simg
$ simg2img rootfs.simg back.ext4 && cmp rootfs.ext4 back.ext4 && echo roundtrip-identical
roundtrip-identical
```

64 MiB가 348 KiB가 됐고 되돌린 결과는 원본과 같았습니다. 줄어드는 비율은 파일시스템이 얼마나 차 있느냐에 달려 있고, 이 rootfs에는 `/etc/hostname` 하나만 있었습니다. fastboot로 실제 flash하는 흐름은 [Bootloader Ch 12](/blog/embedded/bootloader/chapter12-usb-boot)에서 다뤘습니다.

## Raw NAND/NOR Flash (MTD)

raw flash에는 GPT가 없습니다. MTD partition을 kernel cmdline 또는 device tree로 정의합니다. cmdline 문법은 `drivers/mtd/parsers/cmdlinepart.c` 첫 주석에 있고, DT의 `fixed-partitions`는 Ch 12의 binding입니다. 이 절의 명령은 raw flash가 없어 실행하지 않았습니다.

```text
mtdparts=spi-nor:512K(u-boot),128K(env),64K(dtb),4M(kernel),-(rootfs)
```

또는 DT:

```text
&spi0 {
    flash@0 {
        compatible = "jedec,spi-nor";
        reg = <0>;
        spi-max-frequency = <40000000>;

        partitions {
            compatible = "fixed-partitions";
            #address-cells = <1>;
            #size-cells = <1>;

            partition@0 {
                label = "u-boot";
                reg = <0x0 0x80000>;
            };
            partition@80000 {
                label = "env";
                reg = <0x80000 0x20000>;
            };
            partition@a0000 {
                label = "kernel";
                reg = <0xa0000 0x400000>;
            };
            partition@4a0000 {
                label = "rootfs";
                reg = <0x4a0000 0xb60000>;
            };
        };
    };
};
```

NAND rootfs는 UBI 위에 UBIFS로 올립니다. `mkfs.ubifs`의 `-m`(최소 I/O 단위), `-e`(LEB 크기), `-c`(최대 LEB 수)와 `ubinize`의 `-p`(물리 erase block)는 NAND 칩의 page·erase block 크기에서 정해지므로 칩 datasheet 값을 넣습니다.

raw 쓰기는 `flash_erase` + `nandwrite`:

```bash
$ flash_erase /dev/mtd4 0 0
$ nandwrite -p /dev/mtd4 rootfs.ubi
```

## 양산 라인의 flashing 도구

SoC마다 ROM의 다운로드 모드에 맞는 도구가 있습니다. 아래는 U-Boot v2024.04 문서가 이름으로 언급하는 도구들입니다. 이 글은 어느 것도 실행하지 않았습니다.

| 도구 | SoC | U-Boot 문서 |
|------|-----|-------------|
| `uuu` | NXP i.MX 8M | `doc/board/bsh/imx8mn_bsh_smm_s2.rst:56-61` (`uuu -v flash.bin`) |
| `sunxi-fel` | Allwinner | `doc/board/allwinner/sunxi.rst:272-274` |
| STM32CubeProgrammer | STM32MP1 | `doc/board/st/stm32mp1.rst:424` |
| rockusb 계열 도구 | Rockchip | `doc/README.rockusb` |
| `fastboot` | U-Boot fastboot gadget | [Bootloader Ch 12](/blog/embedded/bootloader/chapter12-usb-boot) |

## 자주 하는 실수

**GPT와 SoC 부트 영역 배치를 혼동.** GPT primary header는 LBA 1, entry array는 LBA 2~33입니다. 첫 partition 시작 위치는 별개의 값이고, 위 실행에서는 8 MiB였습니다. 부트 이미지(예: i.MX 8M Plus의 32 KiB)가 entry array 뒤에 오는지 `sgdisk -p`와 `dd | cmp`로 확인합니다.

**변할 수 있는 장치 이름을 고정.** `root=/dev/mmcblk0p2`는 장치 열거 순서가 바뀌면 다른 파티션을 가리킵니다. genimage cfg에 `partition-uuid`를 고정하고 `root=PARTUUID=`로 씁니다.

**A/B 슬롯에서 환경 변수 동기화 실패.** 두 슬롯이 같은 `bootloader-env` partition을 공유해야 하는데 각 slot의 rootfs에 따로 두면 inconsistent. env는 *별도 partition*.

**bmap 없이 raw image 전송.** 위 예에서 328 MiB 중 데이터 블록은 18 MiB 남짓이었습니다. `bmap`은 그 블록만 씁니다.

**sparse image 직접 mount 시도.** `.simg`는 그냥 mount 안 됩니다. `simg2img`로 변환 후.

## 정리

- 부트 이미지 위치는 SoC마다 다릅니다. i.MX 6UL 1 KiB, i.MX 8M Plus 32 KiB, Rockchip 섹터 64, STM32MP1은 `fsbl1`/`fsbl2` GPT 파티션입니다(U-Boot v2024.04 문서).
- GPT header와 entry array는 LBA 1~33이고, 첫 partition은 부트 이미지 뒤로 미룹니다.
- A/B 슬롯은 U-Boot의 `bootcount`/`bootlimit`/`altbootcmd`로 전환하고, 부팅 성공 뒤 `bootcount`를 0으로 돌리는 것은 Linux 쪽 책임입니다.
- genimage 18은 `offset = 32K`의 raw 이미지와 `offset = 8M`의 첫 partition을 가진 GPT 이미지를 만들었습니다.
- 그 이미지에서 bmap은 328 MiB 중 4,651블록(4 KiB 단위)만, sparse image는 64 MiB ext4를 348 KiB로 표현했습니다.

## 다음 편 예고

[Ch 18: OTA와 field recovery](/blog/embedded/bsp/chapter18-ota-recovery)에서는 A/B 슬롯을 활용한 OTA, RAUC/SWUpdate/Mender 같은 update agent, 그리고 현장 복구 시나리오를 다룹니다.

## 관련 항목

- [Ch 16: Buildroot/Yocto와 rootfs](/blog/embedded/bsp/chapter16-rootfs) — 빌드 산출물의 출처
- [Ch 18: OTA와 field recovery](/blog/embedded/bsp/chapter18-ota-recovery) — A/B 슬롯의 활용
- [Bootloader 시리즈 — 환경 변수](/blog/embedded/bootloader/chapter01-boot-problem) — U-Boot env partition
- [Buildroot Practical — 이미지 조립](/blog/embedded/buildroot/chapter01-problem) — Buildroot 측 깊이
