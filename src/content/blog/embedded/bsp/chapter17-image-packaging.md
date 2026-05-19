---
title: "Ch 17: 이미지 패키징 — flash layout, partition, GPT"
date: 2026-05-09T17:00:00
description: "최종 이미지 조립 — 파티션 테이블, flash layout, SD/eMMC/UFS 굽기 워크플로."
series: "BSP Development"
seriesOrder: 17
tags: [embedded, bsp, image, partition, gpt]
draft: false
---

## 한 줄 요약

**flash image는 *섹터 단위의 layout*입니다. 한 번 양산되면 바꾸기 어렵습니다.** 파티션 layout과 partition table 형식을 처음부터 잘 잡는 것이 핵심입니다.

빌드 시스템이 toolchain, kernel, rootfs를 다 만들어 줘도 그것들이 *어떻게 한 binary로 묶이는가*는 별도 문제입니다. SD 카드의 0번 섹터, eMMC의 boot1 파티션, NAND의 MTD partition table이 다 다릅니다. 잘못 설계하면 OTA를 못 하는 BSP가 만들어집니다.

이번 글은 partition table 종류, A/B 슬롯, GPT 구조, `genimage`로 이미지를 조립하는 방법을 다룹니다.

## Partition Table 종류

| 형식 | 최대 파티션 | 최대 크기 | 적용 |
|------|-------------|-----------|------|
| MBR | 4 (primary) | 2TB | 단순한 SD 카드 |
| GPT | 128 | 9.4ZB | 표준 (UEFI 포함) |
| BCT / TOC1 | SoC 특정 | SoC 특정 | NVIDIA, Mediatek |
| MTD partitions | kernel cmdline | N/A | raw NAND/NOR flash |

eMMC와 SD 카드는 GPT가 표준입니다. raw NAND는 MTD partition을 씁니다. SoC가 자체 boot header 형식을 강요하는 경우(NVIDIA Tegra, Mediatek)도 있습니다. 새 BSP면 *GPT*로 시작하는 것이 안전합니다.

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

- **16KB 예약**. LBA 0~33이 partition table용입니다. 0~33 = 34 LBA = 17KB이지만 보통 첫 partition을 *최소 1MB*부터 시작하도록 정렬합니다.
- **backup GPT**. 디스크 끝에 동일 정보가 한 번 더 있습니다. primary가 깨져도 복구 가능합니다.
- **partition UUID**. 각 파티션은 고유 UUID를 갖습니다. kernel의 `root=PARTUUID=...`로 참조하면 sda/mmcblk0/nvme0n1 같은 device 이름 변화에 흔들리지 않습니다.

`sgdisk`나 `parted`로 확인할 수 있습니다.

```bash
$ sgdisk -p /dev/mmcblk0
Disk /dev/mmcblk0: 30543872 sectors, 14.6 GiB
Logical sector size: 512 bytes
Disk identifier (GUID): A1B2C3D4-E5F6-7890-ABCD-EF1234567890
First usable sector is 34, last usable sector is 30543838
Total free space is 2014 sectors (1007.0 KiB)

Number  Start    End        Size       Code  Name
   1    2048     67583      32.0 MiB   8300  boot
   2    67584    2164735    1024.0 MiB 8300  rootfs-a
   3    2164736  4261887    1024.0 MiB 8300  rootfs-b
   4    4261888  30543838   12.5 GiB   8300  data
```

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

A/B 슬롯의 동작 순서는 다음과 같습니다.

1. 부팅 직후: 부트로더가 `BOOT_SLOT` 환경 변수를 읽음. 기본 A.
2. 슬롯 A의 boot와 rootfs를 mount.
3. 정상 부팅 완료 시 application이 `BOOT_OK=1`을 씀.
4. OTA agent가 슬롯 B에 새 이미지를 씀.
5. 검증 후 `BOOT_SLOT=B`로 변경 + `TRY_COUNT=3` 설정.
6. 재부팅. B 슬롯이 부팅됨.
7. B가 정상 부팅하면 `BOOT_OK=1`. 실패하면 부트로더가 `TRY_COUNT` 감소 후 A로 fallback.

U-Boot 환경 변수로 다음과 같이 구현합니다.

```text
bootcount=0
bootlimit=3
altbootcmd=run boot_alt
bootcmd=run boot_main

boot_main=if test "$boot_slot" = "B"; then run boot_b; else run boot_a; fi
boot_a=load mmc 0:2 ${kernel_addr_r} boot/Image; load mmc 0:4 ...; bootm
boot_b=load mmc 0:3 ${kernel_addr_r} boot/Image; load mmc 0:5 ...; bootm
boot_alt=if test "$boot_slot" = "B"; then setenv boot_slot A; else setenv boot_slot B; fi; saveenv; reset
```

`bootcount`와 `bootlimit`은 U-Boot가 자동으로 다루는 변수입니다. 부팅 시 +1, application의 `bootcount=0`로 reset. limit 초과 시 `altbootcmd` 실행.

## SoC 부트 헤더와 첫 섹터

SoC마다 부트 ROM이 읽는 첫 영역이 다릅니다. GPT가 이 영역을 *침범*하면 부팅이 안 됩니다.

| SoC | 부트 영역 | 위치 |
|-----|----------|------|
| i.MX 6/7 | IVT + DCD + bootloader | offset 1024 byte |
| i.MX 8M | container header | offset 32KB |
| STM32MP1 | FSBL header | offset 0 (SD/eMMC) |
| RK3399 | IDB header | sector 64 (32KB) |
| Tegra | BCT | sector 0 |
| TI AM335x | MLO | FAT 파티션 또는 raw |

GPT의 partition 1 시작 위치를 SoC 부트 영역 *뒤*로 옮겨야 합니다. 보통 첫 partition을 1MB 또는 8MB부터 시작하는 방식이 안전합니다.

i.MX 8M의 예입니다.

```text
0x000000 (0KB)    : (사용 안 함)
0x008000 (32KB)   : flash.bin (SPL + ATF + U-Boot, ~2MB)
0x100000 (1MB)    : GPT primary header
0x100200 (1MB+)   : Partition entry array
0x800000 (8MB)    : partition 1 (boot)
...
```

GPT primary header가 1MB offset에 있으면 표준 GPT 도구로 인식이 안 될 수 있습니다. SoC vendor가 권장하는 layout을 따르거나, GPT를 8MB 이후에 두고 그 앞은 *unused* 영역으로 비워 두는 패턴이 흔합니다.

## genimage로 이미지 조립

Pengutronix의 `genimage`가 Buildroot/Yocto와 무관하게 standalone으로 자주 쓰입니다. 한 cfg 파일로 multi-partition disk image를 만듭니다.

```text
# genimage.cfg
image boot.vfat {
    vfat {
        files = {
            "Image",
            "mybsp.dtb",
            "boot.scr",
        }
    }
    size = 32M
}

image rootfs.ext4 {
    ext4 {
        label = "rootfs"
    }
    mountpoint = "/"
    size = 1G
}

image sdcard.img {
    hdimage {
        partition-table-type = "gpt"
    }

    partition u-boot {
        in-partition-table = "no"
        image = "u-boot.bin"
        offset = 32K
        size = 2M
    }

    partition boot-a {
        partition-type-uuid = U
        image = "boot.vfat"
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
        size = 4G
    }
}
```

`in-partition-table = "no"`는 raw 영역(SoC가 읽는 부트 영역)에 쓰지만 GPT에는 표시하지 않는다는 뜻입니다.

빌드:

```bash
$ genimage \
    --inputpath output/images \
    --outputpath output/images \
    --rootpath output/target \
    --config genimage.cfg
INFO: vfat(boot.vfat): cmd: "MAKEDOSFS=mkfs.fat ..."
INFO: ext4(rootfs.ext4): cmd: "mkfs.ext4 ..."
INFO: hdimage(sdcard.img): writing GPT
```

`sdcard.img`를 `dd`나 `bmaptool`로 SD에 굽습니다.

```bash
$ sudo dd if=sdcard.img of=/dev/sdX bs=4M status=progress conv=fsync
```

`bmaptool`은 빈 영역을 건너뛰어 훨씬 빠릅니다.

```bash
$ bmaptool create -o sdcard.bmap sdcard.img
$ sudo bmaptool copy sdcard.img /dev/sdX
```

## Android Sparse Image

Android는 `.simg` (sparse image) 형식을 씁니다. 0으로 채워진 큰 영역을 메타데이터로만 표시해 전송량을 줄입니다. fastboot로 flash 할 때 사용됩니다.

```bash
# raw → sparse
$ img2simg rootfs.ext4 rootfs.simg

# sparse → raw
$ simg2img rootfs.simg rootfs.ext4

$ fastboot flash rootfs rootfs.simg
```

16GB raw image가 1GB sparse로 줄어드는 일이 흔합니다. 양산 line에서 flash 속도에 직접 영향이 있습니다.

## Raw NAND/NOR Flash (MTD)

raw flash는 GPT가 없습니다. MTD partition을 kernel cmdline 또는 device tree로 정의합니다.

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

NAND rootfs는 `ubinize`로 UBI volume을 만들어 둡니다. UBI는 wear-leveling과 bad block management를 해 줍니다.

```bash
$ mkfs.ubifs -r rootfs/ -m 2048 -e 124KiB -c 1000 -o rootfs.ubifs
$ ubinize -o rootfs.ubi -m 2048 -p 128KiB ubinize.cfg
```

raw 쓰기는 `flash_erase` + `nandwrite`:

```bash
$ flash_erase /dev/mtd4 0 0
$ nandwrite -p /dev/mtd4 rootfs.ubi
```

## 양산 라인의 flashing 도구

| 도구 | SoC | 인터페이스 |
|------|-----|-----------|
| `uuu` | NXP i.MX | USB |
| `fastboot` | Qualcomm, MediaTek, Android | USB |
| `dfu-util` | STM, Allwinner | USB DFU |
| `STM32CubeProgrammer` | STM32 | USB / UART / JTAG |
| `RKDevTool` | Rockchip | USB |
| `sunxi-fel` | Allwinner | USB FEL |
| `bmaptool` | 일반 | SD card |

i.MX의 `uuu` 예입니다.

```bash
$ cat << 'EOF' > flash.uuu
uuu_version 1.4.0

SDP: boot -f flash.bin
SDPU: write -f u-boot.itb -offset 0x57c00
SDPU: jump

FB: ucmd setenv fastboot_buffer 0x42000000
FB: flash gpt sdcard.gpt
FB: flash boot-a boot.vfat
FB: flash rootfs-a rootfs.ext4
FB: done
EOF

$ sudo uuu flash.uuu
```

양산 line이라면 *PC + USB hub + 보드 8대* 같은 setup에서 동시 flash가 표준입니다. uuu, fastboot 모두 multi-board 모드를 지원합니다.

## 자주 하는 실수

**GPT primary가 SoC 부트 영역과 겹침.** i.MX 8M의 SPL은 32KB부터, GPT는 보통 1MB부터. 첫 partition은 8MB 이후로 두는 것이 안전합니다.

**partition UUID 미사용.** kernel cmdline에 `root=/dev/mmcblk0p2`로 박으면 SD가 USB로 바뀌면 panic. 항상 `PARTUUID=`.

**A/B 슬롯에서 환경 변수 동기화 실패.** 두 슬롯이 같은 `bootloader-env` partition을 공유해야 하는데 각 slot의 rootfs에 따로 두면 inconsistent. env는 *별도 partition*.

**`dd` 대신 USB writer GUI 사용.** Windows의 일부 GUI tool이 GPT를 깨뜨립니다. 항상 `dd` + `sync`나 `bmaptool`.

**bmap 없이 raw image 전송.** 16GB image 전체를 보내는 건 낭비입니다. `bmap`은 사용된 영역만 표시합니다.

**sparse image 직접 mount 시도.** `.simg`는 그냥 mount 안 됩니다. `simg2img`로 변환 후.

## 정리

- 첫 섹터의 의미는 SoC마다 다릅니다. SoC vendor 가이드의 layout을 출발점으로 삼아야 합니다.
- GPT가 표준입니다. MBR은 legacy SD 카드 정도, raw NAND는 MTD partition.
- A/B 슬롯은 OTA 안전성의 출발점입니다. boot 슬롯과 rootfs 슬롯을 짝지어 두 세트 둡니다.
- partition UUID로 root를 지정해야 device 이름 변화에 영향을 받지 않습니다.
- `genimage`는 단일 cfg로 multi-partition disk image를 만드는 표준 도구입니다.
- `bmaptool`은 빈 영역을 건너뛰어 flash 시간을 한 자릿수로 줄입니다. 양산 line의 필수.
- Android sparse image는 fastboot 환경에서 큰 image의 전송 시간을 단축합니다.
- 양산 flashing은 SoC별 전용 도구(uuu, fastboot, RKDevTool, dfu-util)를 PC line에서 multi-board로 운영합니다.

## 다음 편 예고

[Ch 18: OTA와 field recovery](/blog/embedded/bsp/chapter18-ota-recovery)에서는 A/B 슬롯을 활용한 OTA, RAUC/SWUpdate/Mender 같은 update agent, 그리고 현장 복구 시나리오를 다룹니다.

## 관련 항목

- [Ch 16: Buildroot/Yocto와 rootfs](/blog/embedded/bsp/chapter16-rootfs) — 빌드 산출물의 출처
- [Ch 18: OTA와 field recovery](/blog/embedded/bsp/chapter18-ota-recovery) — A/B 슬롯의 활용
- [Bootloader 시리즈 — 환경 변수](/blog/embedded/bootloader/) — U-Boot env partition
- [Buildroot Practical — 이미지 조립](/blog/embedded/buildroot/) — Buildroot 측 깊이
