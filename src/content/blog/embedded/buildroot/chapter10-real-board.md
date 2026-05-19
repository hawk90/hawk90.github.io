---
title: "Ch 10: 실전 — BeagleBone Black 시스템 처음부터 끝까지"
date: 2026-05-19T10:00:00
description: "Buildroot로 BeagleBone Black용 완전한 시스템을 구축 — defconfig부터 SD 카드 부팅까지."
series: "Buildroot Practical"
seriesOrder: 10
tags: [embedded, buildroot, beaglebone, practical]
draft: false
---

## 한 줄 요약

> **"앞 아홉 장의 모든 개념을 *하나의 SD 카드*에 응축한다."** — BeagleBone Black을 켜 부팅 메시지가 흐르는 그 순간까지가 이 장의 목표입니다.

지금까지 다룬 것을 정리하면 다음과 같습니다. Buildroot의 위치(Ch 1), 디렉터리 구조(Ch 2), Kconfig(Ch 3), 첫 QEMU 빌드(Ch 4), 패키지 시스템(Ch 5), 외부 트리(Ch 6), 보드 customize(Ch 7), 파일시스템 포맷(Ch 8), 새 패키지 작성(Ch 9).

이 장에서는 그 전체를 *실제 보드*에 적용합니다. BeagleBone Black을 고른 이유는 *Buildroot 본체에 defconfig가 있고*, *MMC 부팅이 단순하고*, *시리얼 콘솔이 USB-TTL 어댑터 하나로 잡히고*, *전 세계적으로 구하기 쉽기 때문*입니다. 같은 흐름이 Raspberry Pi, BeaglePlay, Variscite, Olimex 보드에 거의 그대로 적용됩니다.

## 무엇을 만들 것인가

- *부트로더*: U-Boot (MLO + u-boot.img)
- *커널*: linux-am335x with am335x-boneblack.dtb
- *rootfs*: squashfs (read-only) + ext4 data partition
- *내 패키지*: `acme-led-blink` — 보드 LED를 깜빡이는 데몬 (Ch 9 자작)
- *내 overlay*: `/etc/hostname`을 `acme-bbb`로 설정 (Ch 7)
- *결과물*: `sdcard.img` 하나. `dd`로 SD 카드에 굽고 보드에 꽂으면 부팅.

## 준비물

| 항목 | 사양 |
|------|------|
| BeagleBone Black | rev C 권장. eMMC 4GB 내장 |
| MicroSD 카드 | 8GB 이상, class 10 |
| USB-TTL 어댑터 | 3.3V level. FTDI 또는 CP2102 |
| Jumper wires | F-F 3가닥 (GND, RX, TX) |
| Host PC | Ubuntu 24.04 또는 동급. ~10GB 디스크 여유 |

호스트 의존성을 먼저 설치합니다.

```bash
sudo apt install -y \
    build-essential bc bison flex libssl-dev libncurses-dev \
    git wget cpio rsync unzip file python3 \
    parted dosfstools mtools
```

## Step 1: Buildroot 가져오기 + 외부 트리 준비

```text
$ cd ~/work
$ git clone https://gitlab.com/buildroot.org/buildroot.git
$ cd buildroot
$ git checkout 2026.02      # LTS branch
```

외부 트리를 만듭니다. [Ch 6](/blog/embedded/buildroot/chapter06-br2-external)의 패턴을 따릅니다.

```text
$ mkdir -p ~/work/br2-acme/{package,board/acme/bbb,configs}
$ cd ~/work/br2-acme

$ cat > external.desc <<'EOF'
name: ACME
desc: ACME corporation Buildroot tree
EOF

$ cat > external.mk <<'EOF'
include $(sort $(wildcard $(BR2_EXTERNAL_ACME_PATH)/package/*/*.mk))
EOF

$ cat > Config.in <<'EOF'
menu "ACME packages"
    source "$BR2_EXTERNAL_ACME_PATH/package/acme-led-blink/Config.in"
endmenu
EOF
```

## Step 2: defconfig 베이스 — beaglebone_defconfig 복사

Buildroot 본체에 `beaglebone_defconfig`가 이미 있습니다. 이걸 *외부 트리의 시작점*으로 복사합니다.

```text
$ cd ~/work/buildroot
$ make BR2_EXTERNAL=~/work/br2-acme beaglebone_defconfig
$ make savedefconfig BR2_DEFCONFIG=~/work/br2-acme/configs/acme_bbb_defconfig
```

이제 `~/work/br2-acme/configs/acme_bbb_defconfig`가 *최소 형태로 정규화된* defconfig입니다. 한번 열어 보면 핵심만 남아 있습니다.

```text
BR2_arm=y
BR2_cortex_a8=y
BR2_ARM_FPU_VFPV3=y
BR2_TOOLCHAIN_EXTERNAL=y
BR2_LINUX_KERNEL=y
BR2_LINUX_KERNEL_CUSTOM_VERSION=y
BR2_LINUX_KERNEL_CUSTOM_VERSION_VALUE="6.6.21"
BR2_LINUX_KERNEL_DEFCONFIG="multi_v7"
BR2_LINUX_KERNEL_DTS_SUPPORT=y
BR2_LINUX_KERNEL_INTREE_DTS_NAME="am335x-boneblack"
BR2_TARGET_ROOTFS_EXT2=y
BR2_TARGET_ROOTFS_EXT2_4=y
BR2_TARGET_ROOTFS_EXT2_SIZE="120M"
BR2_TARGET_UBOOT=y
BR2_TARGET_UBOOT_BOARD_DEFCONFIG="am335x_evm"
BR2_TARGET_UBOOT_FORMAT_IMG=y
BR2_TARGET_UBOOT_SPL=y
BR2_TARGET_UBOOT_SPL_NAME="MLO"
BR2_PACKAGE_HOST_GENIMAGE=y
BR2_ROOTFS_POST_IMAGE_SCRIPT="board/beaglebone/post-image.sh"
```

## Step 3: 우리 식으로 defconfig 수정

`acme_bbb_defconfig`를 우리 요구에 맞춥니다.

```text
# Read-only squashfs + data partition pattern (Ch 8)
BR2_TARGET_ROOTFS_SQUASHFS=y
BR2_TARGET_ROOTFS_SQUASHFS4_ZSTD=y
# ext4도 유지 — data partition 용도
BR2_TARGET_ROOTFS_EXT2=y
BR2_TARGET_ROOTFS_EXT2_4=y
BR2_TARGET_ROOTFS_EXT2_SIZE="120M"

# 외부 트리의 overlay + post-build + post-image (Ch 7)
BR2_ROOTFS_OVERLAY="$(BR2_EXTERNAL_ACME_PATH)/board/acme/bbb/rootfs-overlay"
BR2_ROOTFS_POST_BUILD_SCRIPT="$(BR2_EXTERNAL_ACME_PATH)/board/acme/bbb/post-build.sh"
BR2_ROOTFS_POST_IMAGE_SCRIPT="$(BR2_EXTERNAL_ACME_PATH)/board/acme/bbb/post-image.sh"
BR2_ROOTFS_POST_SCRIPT_ARGS="acme-bbb"

# 우리 패키지 (Ch 9)
BR2_PACKAGE_ACME_LED_BLINK=y

# 유용한 디버깅 도구
BR2_PACKAGE_DROPBEAR=y
BR2_PACKAGE_HTOP=y
BR2_PACKAGE_STRACE=y
BR2_PACKAGE_NANO=y
```

수정 후 다시 적용합니다.

```text
$ make BR2_EXTERNAL=~/work/br2-acme acme_bbb_defconfig
```

## Step 4: acme-led-blink 패키지 작성

[Ch 9](/blog/embedded/buildroot/chapter09-new-package)의 패턴을 적용한 사례 패키지입니다.

```text
br2-acme/package/acme-led-blink/
├── Config.in
├── acme-led-blink.mk
├── acme-led-blink.hash
└── src/
    ├── Makefile
    └── led-blink.c
```

`src/led-blink.c`:

```c
#include <stdio.h>
#include <unistd.h>
#include <fcntl.h>
#include <string.h>

static const char *LED = "/sys/class/leds/beaglebone:green:usr0/brightness";

int main(void) {
    int fd = open(LED, O_WRONLY);
    if (fd < 0) { perror("open"); return 1; }
    for (;;) {
        write(fd, "1", 1);
        sleep(1);
        write(fd, "0", 1);
        sleep(1);
    }
    return 0;
}
```

`src/Makefile`:

```make
CC ?= gcc
CFLAGS ?= -O2 -Wall

led-blink: led-blink.c
	$(CC) $(CFLAGS) -o $@ $<

install: led-blink
	install -D -m 0755 led-blink $(DESTDIR)/usr/sbin/led-blink

clean:
	rm -f led-blink

.PHONY: install clean
```

`Config.in`:

```make
config BR2_PACKAGE_ACME_LED_BLINK
    bool "acme-led-blink"
    help
      Blinks the on-board USER0 LED of BeagleBone Black.
```

`acme-led-blink.mk`:

```make
################################################################################
#
# acme-led-blink
#
################################################################################

ACME_LED_BLINK_VERSION = 1.0
ACME_LED_BLINK_SITE = $(BR2_EXTERNAL_ACME_PATH)/package/acme-led-blink/src
ACME_LED_BLINK_SITE_METHOD = local
ACME_LED_BLINK_LICENSE = Proprietary

define ACME_LED_BLINK_BUILD_CMDS
	$(MAKE) CC="$(TARGET_CC)" CFLAGS="$(TARGET_CFLAGS)" -C $(@D)
endef

define ACME_LED_BLINK_INSTALL_TARGET_CMDS
	$(MAKE) -C $(@D) DESTDIR=$(TARGET_DIR) install
endef

$(eval $(generic-package))
```

`SITE_METHOD = local`은 *외부 트리 안의 디렉터리*를 source로 사용합니다. tarball을 만들 필요가 없습니다. `.hash` 파일은 local 패키지면 *생략 가능*하지만, production에서는 별도 git tag로 받게 바꾸는 게 좋습니다.

빈 hash 파일을 만들어 둡니다.

```text
$ touch ~/work/br2-acme/package/acme-led-blink/acme-led-blink.hash
```

## Step 5: rootfs-overlay 작성

[Ch 7](/blog/embedded/buildroot/chapter07-board-customize)의 패턴입니다.

```text
$ mkdir -p ~/work/br2-acme/board/acme/bbb/rootfs-overlay/etc/init.d
$ cd ~/work/br2-acme/board/acme/bbb/rootfs-overlay

$ cat > etc/hostname <<'EOF'
acme-bbb
EOF

$ cat > etc/issue <<'EOF'
ACME BeagleBone Black system
Built: @BUILDDATE@
EOF

$ cat > etc/init.d/S99led-blink <<'EOF'
#!/bin/sh
case "$1" in
    start)
        echo "Starting led-blink"
        /usr/sbin/led-blink &
        ;;
    stop)
        killall led-blink 2>/dev/null
        ;;
esac
EOF
$ chmod +x etc/init.d/S99led-blink
```

## Step 6: post-build.sh, post-image.sh, genimage.cfg

`board/acme/bbb/post-build.sh`:

```bash
#!/bin/sh
set -e
TARGET_DIR="$1"

# Stamp build date into /etc/issue
sed -i "s/@BUILDDATE@/$(date +%Y-%m-%d)/" "$TARGET_DIR/etc/issue"
```

`board/acme/bbb/post-image.sh`:

```bash
#!/bin/sh
set -e

BINARIES_DIR="$1"
BOARD=$2

GENIMAGE_CFG="$BR2_EXTERNAL_ACME_PATH/board/acme/bbb/genimage.cfg"
GENIMAGE_TMP="$BINARIES_DIR/genimage.tmp"

rm -rf "$GENIMAGE_TMP"
genimage \
    --rootpath "$TARGET_DIR" \
    --tmppath "$GENIMAGE_TMP" \
    --inputpath "$BINARIES_DIR" \
    --outputpath "$BINARIES_DIR" \
    --config "$GENIMAGE_CFG"

echo "[post-image] sdcard.img ready: $(du -h "$BINARIES_DIR/sdcard.img" | cut -f1)"
```

`board/acme/bbb/genimage.cfg`:

```text
image boot.vfat {
    vfat {
        files = {
            "MLO",
            "u-boot.img",
            "zImage",
            "am335x-boneblack.dtb",
            "uEnv.txt"
        }
    }
    size = 16M
}

image sdcard.img {
    hdimage {}

    partition u-boot {
        partition-type = 0xC
        bootable = "true"
        image = "boot.vfat"
    }

    partition rootfs {
        partition-type = 0x83
        image = "rootfs.squashfs"
        size = 256M
    }

    partition data {
        partition-type = 0x83
        image = "rootfs.ext4"
        size = 128M
    }
}
```

스크립트에 실행 권한을 줍니다.

```text
$ chmod +x ~/work/br2-acme/board/acme/bbb/post-build.sh
$ chmod +x ~/work/br2-acme/board/acme/bbb/post-image.sh
```

## Step 7: uEnv.txt — U-Boot 환경

U-Boot이 SD 카드 부팅 시점에 읽는 환경 파일입니다. 부트 명령을 *외부에 두는* 흐름의 핵심입니다.

`rootfs-overlay`가 아니라 `board/acme/bbb/`에 `uEnv.txt`를 직접 둡니다. `genimage.cfg`가 boot 파티션에 포함시킵니다. 그러나 우리 genimage는 *binaries_dir 안의 파일*만 vfat에 넣을 수 있으므로, post-image에서 미리 복사합니다.

post-image.sh 시작 부분에 추가:

```bash
cp "$BR2_EXTERNAL_ACME_PATH/board/acme/bbb/uEnv.txt" "$BINARIES_DIR/"
```

`board/acme/bbb/uEnv.txt`:

```text
# BeagleBone Black boot env

bootdir=/
bootfile=zImage
dtbfile=am335x-boneblack.dtb

# console + read-only rootfs on p2 (squashfs)
optargs=console=ttyO0,115200n8 root=/dev/mmcblk0p2 rootfstype=squashfs ro rootwait quiet

uenvcmd=load mmc 0:1 ${loadaddr} ${bootdir}/${bootfile}; \
        load mmc 0:1 ${fdtaddr} ${bootdir}/${dtbfile}; \
        setenv bootargs ${optargs}; \
        bootz ${loadaddr} - ${fdtaddr}
```

핵심 라인입니다.

- `console=ttyO0,115200n8` — AM335x의 UART0. BeagleBone Black의 J1 헤더가 여기 연결됩니다.
- `root=/dev/mmcblk0p2 rootfstype=squashfs ro` — 두 번째 파티션이 squashfs rootfs.
- `bootz` — zImage 부팅 명령. ARM 32-bit.

## Step 8: 빌드

이제 모든 게 준비됐습니다. 빌드합니다.

```text
$ cd ~/work/buildroot
$ make
```

첫 빌드는 30~60분이 걸립니다. host에 toolchain·cross 도구·U-Boot·linux 커널·BusyBox·우리 패키지를 모두 빌드합니다. 빌드 진행은 단계별로 출력됩니다.

```text
>>> host-tar 1.34 Downloading
>>> linux-headers 6.6.21 Configuring
>>> uclibc 1.0.50 Building
>>> uboot 2024.04 Configuring
>>> linux 6.6.21 Building (35%)
>>> busybox 1.36.1 Installing to target
>>> acme-led-blink 1.0 Building
>>> Generating root filesystems common tables
>>> Generating filesystem image rootfs.squashfs
>>> Generating filesystem image rootfs.ext4
>>> Executing post-image script board/acme/bbb/post-image.sh
[post-image] sdcard.img ready: 401M
```

완료 후 `output/images/`를 봅니다.

```text
$ ls -lh output/images/
-rw-r--r-- 1 user user  16M ...  MLO
-rw-r--r-- 1 user user  580K ... u-boot.img
-rw-r--r-- 1 user user  6.2M ... zImage
-rw-r--r-- 1 user user   62K ... am335x-boneblack.dtb
-rw-r--r-- 1 user user  43M ...  rootfs.squashfs
-rw-r--r-- 1 user user 120M ...  rootfs.ext4
-rw-r--r-- 1 user user 401M ...  sdcard.img
-rw-r--r-- 1 user user  16M ...  boot.vfat
```

## Step 9: SD 카드에 굽기

SD 카드를 USB reader에 꽂고 *어떤 장치인지* 정확히 확인합니다.

```text
$ lsblk
NAME        SIZE TYPE
sda         500G disk
├─sda1      500G part
sdb         8G   disk     ← 이것이 SD
├─sdb1      ...
$ sudo umount /dev/sdb*
```

**잘못된 장치를 고르면 호스트 디스크가 날아갑니다.** `lsblk`의 SIZE를 두 번 확인합니다.

```text
$ sudo dd if=output/images/sdcard.img of=/dev/sdb bs=4M conv=fsync status=progress
401MB transferred in 38s
$ sync
```

`bs=4M`은 *큰 블록*으로 빨리 굽기 위함입니다. `conv=fsync`는 마지막에 *디스크에 flush*합니다.

빨리 굽고 싶다면 `bmap-tools`를 씁니다. genimage는 `.bmap` 파일을 함께 만들 수 있어 *비어 있는 블록을 건너뜁니다*. 큰 ext4 파티션에서 시간 절약이 큽니다.

```text
$ sudo bmaptool copy --bmap output/images/sdcard.bmap \
                     output/images/sdcard.img /dev/sdb
```

## Step 10: 시리얼 콘솔 연결

BeagleBone Black의 J1 헤더가 시리얼 콘솔입니다. 6핀 헤더이고, USB-TTL 어댑터를 다음처럼 연결합니다.

```text
J1 pin 1  (GND, 보드 바깥쪽)  ── 어댑터 GND
J1 pin 4  (RX,  보드 TX)      ── 어댑터 RX
J1 pin 5  (TX,  보드 RX)      ── 어댑터 TX
```

**어댑터의 VCC 핀은 연결하지 마세요.** BeagleBone은 자체 전원으로 동작합니다.

호스트에서 minicom 또는 picocom을 띄웁니다.

```text
$ sudo picocom -b 115200 /dev/ttyUSB0
```

## Step 11: 첫 부팅

SD 카드를 BeagleBone Black에 꽂습니다. 그런데 *그냥 끼우면 eMMC가 우선*입니다. SD 부팅을 *강제*하려면 *USER 버튼을 누른 채로* 전원을 인가해야 합니다.

- 전원을 빼고 SD를 슬롯에 꽂습니다.
- 보드 위 **USER 버튼**(S2)을 누르고 유지합니다.
- 전원을 인가합니다. 5초 후 USER 버튼을 놓습니다.

시리얼에 다음과 같은 흐름이 나타납니다.

```text
U-Boot SPL 2024.04 ...
Trying to boot from MMC1
U-Boot 2024.04 ...
DRAM:  512 MiB
MMC:   OMAP SD/MMC: 0
Loading Environment from FAT... OK
Importing environment from mmc 0 ...
=>
Hit any key to stop autoboot:  0
switch to partitions #0, OK
mmc0(part 0) is current device
SD/MMC found on device 0
reading /uEnv.txt
541 bytes read in 4 ms (132 KiB/s)
Loaded environment from /uEnv.txt
Importing environment from mmc0 ...
Running uenvcmd ...
6238208 bytes read in 421 ms (14.1 MiB/s)
62236 bytes read in 11 ms (5.4 MiB/s)
Kernel image @ 0x82000000 [ 0x000000 - 0x5f2400 ]
## Flattened Device Tree blob at 88000000
   Booting using the fdt blob at 0x88000000
Starting kernel ...
[    0.000000] Booting Linux on physical CPU 0x0
[    0.000000] Linux version 6.6.21 ...
...
[    3.421855] Run /sbin/init as init process
Starting syslogd: OK
Starting klogd: OK
...
Starting dropbear sshd: OK
Starting led-blink

ACME BeagleBone Black system
Built: 2026-05-19

acme-bbb login:
```

`root`로 로그인합니다 (defconfig에서 비밀번호를 안 설정했으면 빈 비밀번호).

```text
acme-bbb login: root
# uname -a
Linux acme-bbb 6.6.21 #1 SMP PREEMPT ... armv7l GNU/Linux
# cat /etc/issue
ACME BeagleBone Black system
Built: 2026-05-19
# df -h
Filesystem                Size      Used Available Use% Mounted on
/dev/root                43.0M     43.0M         0 100% /
tmpfs                   244.6M         0    244.6M   0% /tmp
# mount | grep mmcblk
/dev/mmcblk0p2 on / type squashfs (ro,relatime)
# ls -la /sys/class/leds/
beaglebone:green:usr0
beaglebone:green:usr1
beaglebone:green:usr2
beaglebone:green:usr3
```

USER0 LED가 1초 간격으로 깜빡이고 있을 겁니다. `acme-led-blink`가 동작 중입니다.

## Troubleshooting

### 시리얼에 아무것도 안 나온다

세 가지를 의심합니다.

- *USB-TTL의 TX/RX 교차*. 보드 TX(pin 5)가 어댑터 RX에 가야 합니다.
- *GND 안 연결*. 시그널 wire만 있고 GND가 없으면 신호가 떠다닙니다.
- *baud rate 다름*. picocom에 `-b 115200`을 명시했는지.

### `Bad Magic Number` U-Boot 에러

`uEnv.txt`가 vfat에 들어가지 않았거나, `genimage.cfg`에 파일이 안 적힌 경우입니다. `mtools`로 boot.vfat을 열어 확인합니다.

```text
$ mdir -i output/images/boot.vfat ::
```

### Kernel panic — `Cannot mount root`

`uEnv.txt`의 `root=` 경로가 틀린 경우입니다. SD의 두 번째 파티션이 `mmcblk0p2`인지, `rootfstype`이 squashfs인지 확인합니다. 또는 *커널에 squashfs 모듈*이 안 들어간 경우. `CONFIG_SQUASHFS=y` + `CONFIG_SQUASHFS_ZSTD=y`를 linux fragment에 추가합니다.

### USER 버튼 효과가 없다

BeagleBone Black의 *SYSBOOT 설정*은 USER 버튼이 *high*일 때 SD를 먼저 보게 됩니다. 어떤 rev의 보드는 button polarity가 다를 수 있습니다. 대안으로 eMMC를 *지우는* 방법이 있습니다. eMMC가 비어 있으면 ROM이 자동으로 SD를 fallback으로 시도합니다.

```text
# (eMMC를 마운트한 상태에서)
sudo dd if=/dev/zero of=/dev/mmcblk1 bs=1M count=10
```

(eMMC 와이프는 *되돌릴 수 없습니다*. 신중히 하십시오.)

### squashfs는 떠 있는데 `acme-led-blink`가 없다

`BR2_PACKAGE_ACME_LED_BLINK=y`가 defconfig에 없거나, `Config.in`이 외부 트리 최상위 `Config.in`에서 source되지 않은 경우입니다. `make printvars VARS=BR2_PACKAGE_ACME_LED_BLINK`로 확인합니다.

## 시리즈 마무리

여기까지 따라온 분이라면 이제 *Buildroot를 도구로 다룰 수 있습니다*. 회사·팀의 보드를 받아 한두 주 안에 *부팅하는 rootfs*를 만들고, 그 위에서 application 개발에 집중할 수 있는 상태입니다.

이 시리즈가 의도적으로 다루지 *않은* 것들이 있습니다.

- **A/B 슬롯 OTA 업데이트** — RAUC, Mender, swupdate 같은 framework. squashfs base 위에 자연스럽게 얹힙니다.
- **Secure boot 체인** — TI HS device, OP-TEE, dm-verity 같은 보안 부팅.
- **부트로더 자체 customize** — U-Boot의 board-specific 코드, SPL 단계 수정.
- **커널 디바이스 트리 작성** — 새 보드의 DTS를 처음부터 적기.
- **BSP 전체 통합** — 부트로더 + 커널 + DTB + rootfs를 *제품 라인* 수준에서 묶기.

이 마지막 항목이 바로 다음 시리즈의 주제입니다.

## 다음 시리즈 — Embedded BSP

**Buildroot가 rootfs를 책임진다면, BSP는 모든 것의 통합을 책임집니다.**

부트로더 포트, 커널 컨피그, 디바이스 트리, 전원 시퀀스, factory provisioning, OTA 흐름까지를 *한 보드의 일관된 패키지*로 묶는 작업이 BSP입니다. Buildroot는 BSP의 *rootfs 컴포넌트*에 해당합니다. 다음 시리즈에서는 이 위에 *부트로더 작성*, *커널 보드 포팅*, *디바이스 트리 작성*, *production provisioning*을 차례로 다룹니다.

## 정리

- BeagleBone Black은 *defconfig·시리얼 콘솔·MMC 부팅*이 모두 단순해 첫 실전 보드로 적합합니다.
- `beaglebone_defconfig`를 베이스로 외부 트리에 `acme_bbb_defconfig`로 정착시키는 흐름이 표준입니다.
- *내 패키지 한 개*(`acme-led-blink`)와 *내 overlay 한 줄*(`/etc/hostname`)을 추가하는 절차가 외부 트리의 가장 작은 *살아 있는* 사례입니다.
- *squashfs base + ext4 data partition* 구성은 production의 사실상 표준입니다.
- `genimage`가 SD 카드 layout을 *선언적*으로 만들어 줍니다.
- `dd` 굽기 전 `lsblk`로 *장치 식별*을 반드시 두 번 확인합니다.
- BeagleBone Black의 *USER 버튼 + 전원*이 SD 부팅 강제 트릭입니다.
- 부팅 메시지에서 `Starting led-blink`가 보이고 LED가 깜빡이면 *전 시리즈의 모든 개념*이 동시에 동작한 것입니다.

수고하셨습니다. 다음 시리즈는 **Embedded BSP — 부트로더부터 OTA까지**.

## 관련 항목

- [Ch 6: 외부 트리 — BR2_EXTERNAL](/blog/embedded/buildroot/chapter06-br2-external)
- [Ch 7: 보드 customize — overlay, post-build, post-image](/blog/embedded/buildroot/chapter07-board-customize)
- [Ch 8: 출력 파일시스템 — initramfs, squashfs, ext4, cpio](/blog/embedded/buildroot/chapter08-filesystems)
- [Ch 9: 새 패키지 작성 — autotools, cmake, python](/blog/embedded/buildroot/chapter09-new-package)
- [원문 — BeagleBoard 위키 BeagleBone Black](https://www.beagleboard.org/boards/beaglebone-black)
- [Buildroot beaglebone defconfig (mainline)](https://gitlab.com/buildroot.org/buildroot/-/blob/master/configs/beaglebone_defconfig)
