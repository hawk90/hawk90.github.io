---
title: "Buildroot 실전 — BeagleBone Black 시스템 처음부터 끝까지"
slug: "embedded/buildroot/chapter10-real-board"
date: 2026-05-19T09:10:00
description: "Buildroot로 BeagleBone Black용 완전한 시스템을 구축 — defconfig부터 SD 카드 부팅까지."
series: "Buildroot Practical"
seriesOrder: 10
tags: [embedded, buildroot, beaglebone, practical]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"앞 아홉 장의 모든 개념을 *하나의 SD 카드 이미지*에 응축한다."** — BeagleBone Black용 `sdcard.img`를 실제로 빌드하고, 굽기 전에 검사하는 데까지가 이 장의 범위입니다.

지금까지 다룬 것을 정리하면 다음과 같습니다. Buildroot의 위치(Ch 1), 디렉터리 구조(Ch 2), Kconfig(Ch 3), 첫 QEMU 빌드(Ch 4), 패키지 시스템(Ch 5), 외부 트리(Ch 6), 보드 customize(Ch 7), 파일시스템 포맷(Ch 8), 새 패키지 작성(Ch 9).

이 장에서는 그 전체를 *실제 보드용 설정*에 적용합니다. BeagleBone Black을 고른 이유는 Buildroot 본체에 `beaglebone_defconfig`와 `board/beagleboard/beaglebone/`가 있고, `readme.txt`가 "Tested hardware"로 beagleboneblack(rev. A5A)을 적고 있기 때문입니다. 본체의 `beagleplay_defconfig`, `raspberrypi4_64_defconfig`도 같은 구조(defconfig + board 디렉터리 + genimage)라 흐름이 그대로 옮겨집니다.

## 무엇을 만들 것인가

- *부트로더*: U-Boot 2026.01 (MLO + u-boot.img)
- *커널*: Linux 6.18.1 (`omap2plus`) + `am335x-boneblack.dtb`
- *rootfs*: squashfs (read-only) + 빈 ext4 data partition
- *내 패키지*: `acme-led-blink` — 보드 LED를 깜빡이는 데몬 (Ch 9의 패턴)
- *내 overlay*: `/etc/hostname`을 `acme-bbb`로 설정 (Ch 7)
- *결과물*: `sdcard.img` 하나

이 장은 **Buildroot 2026.02.3**으로 위 구성을 *실제로 빌드*하고, 결과 이미지의 파티션·파일을 호스트에서 검사한 기록입니다. 빌드는 Ch 1과 같은 Debian 13 arm64 VM에서 했습니다. **BeagleBone Black 실물에 굽고 부팅하는 단계(Step 9 이후)는 보드가 없어 실행하지 않았습니다.** 그 부분은 절차와 확인 방법만 적고, 부팅 로그는 싣지 않습니다. QEMU는 AM335x 보드를 에뮬레이트하지 않으므로 대신 쓸 수도 없습니다.

이 장의 전체 흐름은 다음과 같습니다.

![defconfig → make → dd → 부팅 전체 흐름](/images/blog/buildroot/diagrams/chapter10-full-flow.svg)

## 준비물

| 항목 | 사양 |
|---|---|
| BeagleBone Black | 보드 |
| MicroSD 카드 | 이 장의 이미지는 208 MiB이므로 그보다 큰 카드 |
| USB-TTL 어댑터 | 3.3V level |
| Host PC | Linux. 이 장의 빌드는 `output/` 외에 `dl/`도 공유 |

호스트 도구는 Ch 4의 매뉴얼 필수 목록과 같습니다. SD 카드 이미지는 Buildroot가 `host-genimage`·`host-dosfstools`·`host-mtools`를 직접 빌드해 만들므로, 호스트에 `parted`나 `mtools`를 따로 깔 필요는 없습니다(`beaglebone_defconfig`가 `BR2_PACKAGE_HOST_DOSFSTOOLS`, `_GENIMAGE`, `_MTOOLS`를 켬).

## Step 1: Buildroot 가져오기 + 외부 트리 준비

```text
$ git clone --depth=1 --branch 2026.02.3 https://gitlab.com/buildroot.org/buildroot.git
```

외부 트리는 [Ch 6](/blog/embedded/buildroot/chapter06-br2-external)의 패턴 그대로입니다.

```text
br2-acme/
├── Config.in
├── configs/
├── external.desc
├── external.mk
├── board/acme/bbb/
│   ├── boot.cmd
│   ├── genimage.cfg
│   ├── linux-squashfs.config
│   ├── post-build.sh
│   ├── rootfs-overlay/
│   │   ├── data/.empty
│   │   └── etc/
│   │       ├── hostname
│   │       └── init.d/S99led-blink
│   └── uEnv.txt
└── package/acme-led-blink/
    ├── Config.in
    ├── acme-led-blink.mk
    └── src/
        ├── Makefile
        └── led-blink.c
```

## Step 2: defconfig 베이스 — beaglebone_defconfig

Buildroot 본체에 `beaglebone_defconfig`가 있습니다. 이걸 펼친 뒤 우리 옵션을 더해 외부 트리에 저장합니다.

```bash
make O=$HOME/out-bbb BR2_EXTERNAL=$HOME/in/bbb beaglebone_defconfig
# (아래 Step 3의 줄을 .config에 추가)
make O=$HOME/out-bbb olddefconfig
make O=$HOME/out-bbb savedefconfig BR2_DEFCONFIG=$HOME/in/bbb/configs/acme_bbb_defconfig
```

여기서 첫 함정을 만났습니다. 저장된 `acme_bbb_defconfig`의 앞부분입니다.

```text
BR2_arm=y
BR2_cortex_a8=y
BR2_ARM_FPU_VFPV3=y
BR2_TOOLCHAIN_EXTERNAL=y
BR2_GLOBAL_PATCH_DIR="board/beagleboard/beaglebone/patches"
...
```

본체 `beaglebone_defconfig`에 있던 `BR2_TOOLCHAIN_EXTERNAL_BOOTLIN=y`와 `BR2_TOOLCHAIN_EXTERNAL_BOOTLIN_ARMV7_EABIHF_GLIBC_STABLE=y`가 사라졌습니다. Buildroot의 `support/scripts/check-dotconfig.py`로 확인하면 원인이 드러납니다.

```text
$ support/scripts/check-dotconfig.py /tmp/obb/.config configs/beaglebone_defconfig
WARN: defconfig configs/beaglebone_defconfig can't be used:
      Missing: BR2_TOOLCHAIN_EXTERNAL_BOOTLIN=y
      Missing: BR2_TOOLCHAIN_EXTERNAL_BOOTLIN_ARMV7_EABIHF_GLIBC_STABLE=y
```

`toolchain/toolchain-external/toolchain-external-bootlin/Config.in`이 `depends on BR2_HOSTARCH = "x86_64"`이기 때문입니다. 이 VM은 aarch64 호스트라 Bootlin toolchain이 선택될 수 없었고, Kconfig는 그 줄을 경고 없이 지운 뒤 기본 외부 toolchain을 골랐습니다. 실제 빌드는 `BR2_TOOLCHAIN_EXTERNAL_ARM_ARM=y`, 즉 "Arm ARM 14.2.rel1"(`depends on BR2_HOSTARCH = "x86_64" || BR2_HOSTARCH = "aarch64"`)로 진행됐습니다. x86_64 호스트에서 같은 명령을 치면 Bootlin toolchain으로 빌드되므로, *같은 defconfig라도 호스트 아키텍처에 따라 toolchain이 달라질 수 있습니다*. 팀에서 defconfig를 공유한다면 `check-dotconfig.py`를 CI에 넣어 이런 차이를 잡습니다(Ch 19).

## Step 3: 우리 식으로 defconfig 수정

`beaglebone_defconfig`에 다음을 더했습니다. 저장된 `acme_bbb_defconfig`에 실제로 남은 줄입니다.

```makefile
BR2_ROOTFS_OVERLAY="$(BR2_EXTERNAL_ACME_PATH)/board/acme/bbb/rootfs-overlay"
BR2_ROOTFS_POST_BUILD_SCRIPT="$(BR2_EXTERNAL_ACME_PATH)/board/acme/bbb/post-build.sh"
BR2_ROOTFS_POST_IMAGE_SCRIPT="support/scripts/genimage.sh"
BR2_ROOTFS_POST_SCRIPT_ARGS="-c $(BR2_EXTERNAL_ACME_PATH)/board/acme/bbb/genimage.cfg"
BR2_LINUX_KERNEL_CONFIG_FRAGMENT_FILES="$(BR2_EXTERNAL_ACME_PATH)/board/acme/bbb/linux-squashfs.config"
BR2_PACKAGE_LIBUBOOTENV=y
BR2_PACKAGE_DROPBEAR=y
BR2_TARGET_ROOTFS_SQUASHFS=y
BR2_TARGET_ROOTFS_SQUASHFS4_ZSTD=y
BR2_PACKAGE_HOST_UBOOT_TOOLS=y
BR2_PACKAGE_HOST_UBOOT_TOOLS_BOOT_SCRIPT=y
BR2_PACKAGE_HOST_UBOOT_TOOLS_BOOT_SCRIPT_SOURCE="$(BR2_EXTERNAL_ACME_PATH)/board/acme/bbb/boot.cmd"
BR2_PACKAGE_ACME_LED_BLINK=y
```

post-image는 본체의 범용 `support/scripts/genimage.sh`를 그대로 쓰고 cfg만 바꿨습니다(Ch 7). post-build는 본체 보드의 것을 대신해 우리 `uEnv.txt`를 `BINARIES_DIR`로 복사합니다.

```bash
#!/bin/sh
set -eu
BOARD_DIR="$(dirname "$0")"
cp "${BOARD_DIR}/uEnv.txt" "${BINARIES_DIR}/uEnv.txt"
```

`linux-squashfs.config`는 Ch 8과 같은 두 줄(`CONFIG_SQUASHFS=y`, `CONFIG_SQUASHFS_ZSTD=y`)입니다. 빌드 후 커널 `.config`에 두 줄이 모두 들어간 것을 확인했습니다.

## Step 4: acme-led-blink 패키지

[Ch 9](/blog/embedded/buildroot/chapter09-new-package)의 패턴을 적용한 패키지입니다. 소스를 외부 트리 안에 두고 `SITE_METHOD = local`로 가져옵니다.

`src/led-blink.c`는 `write()` 실패도 확인합니다.

```c
#include <stdio.h>
#include <unistd.h>
#include <fcntl.h>

static const char *LED = "/sys/class/leds/beaglebone:green:usr2/brightness";

int main(void)
{
	int fd = open(LED, O_WRONLY);
	if (fd < 0) { perror("open"); return 1; }
	/* writing 0 also clears the default "cpu0" trigger */
	if (write(fd, "0", 1) != 1) { perror("write"); return 1; }
	for (;;) {
		sleep(1);
		if (write(fd, "1", 1) != 1) { perror("write"); return 1; }
		sleep(1);
		if (write(fd, "0", 1) != 1) { perror("write"); return 1; }
	}
	return 0;
}
```

LED 경로는 커널 DTS의 LED label에서 정해집니다. 커널 6.18의 `arch/arm/boot/dts/ti/omap/am335x-bone-common.dtsi`에는 `beaglebone:green:heartbeat`·`mmc0`·`usr2`·`usr3` 네 개가 있고, 각각 `linux,default-trigger`가 걸려 있습니다(`usr2`는 `"cpu0"`). 이 글의 이전 판은 DTS에 없는 `usr0`을 썼습니다. `Documentation/ABI/testing/sysfs-class-led`는 brightness에 "Writing 0 to this file clears active trigger"라고 적으므로, 위 코드는 먼저 0을 써서 cpu0 trigger를 떼고 깜빡입니다. 보드가 없어 실제 점멸은 확인하지 못했습니다.

`src/Makefile`:

```makefile
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

`acme-led-blink.mk`:

```makefile
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

`SITE_METHOD = local`이면 다운로드와 hash 검사 대신 소스 디렉터리를 *rsync*합니다. 실제 로그도 `>>> acme-led-blink 1.0 Syncing from source dir /home/br/in/bbb/package/acme-led-blink/src`였고, 빈 hash 파일은 만들지 않았습니다. 결과는 armhf 바이너리였습니다.

```text
target/usr/sbin/led-blink: ELF 32-bit LSB pie executable, ARM, EABI5 version 1 (SYSV), dynamically linked, interpreter /lib/ld-linux-armhf.so.3, for GNU/Linux 3.2.0, stripped
```

## Step 5: rootfs-overlay

[Ch 7](/blog/embedded/buildroot/chapter07-board-customize)의 패턴입니다. overlay에는 `etc/hostname`(`acme-bbb`), 실행 비트를 준 `etc/init.d/S99led-blink`, 그리고 squashfs 위에서 mount 지점이 될 빈 `data/`(`data/.empty`)를 둡니다.

```sh
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
```

## Step 6: genimage.cfg

본체 `board/beagleboard/beaglebone/genimage.cfg`에서 rootfs를 squashfs로 바꾸고 data 파티션을 더했습니다.

```text
image boot.vfat {
	vfat {
		files = {
			"MLO",
			"u-boot.img",
			"zImage",
			"uEnv.txt",
			"am335x-boneblack.dtb",
		}
	}

	size = 16M
}

image data.ext4 {
	ext4 {
		label = "data"
	}
	size = 64M
	empty = true
}

image sdcard.img {
	hdimage {
	}

	partition u-boot {
		partition-type = 0xC
		bootable = "true"
		image = "boot.vfat"
	}

	partition rootfs {
		partition-type = 0x83
		image = "rootfs.squashfs"
		size = 128M
	}

	partition data {
		partition-type = 0x83
		image = "data.ext4"
	}
}
```

`data.ext4`는 rootfs의 복사본이 아니라 `empty = true`로 만드는 빈 ext4입니다. 이 genimage(`host-genimage` 19)가 실제로 64 MiB `data.ext4`를 만들었습니다.

이 `genimage.cfg`가 만들어 내는 SD 카드 layout을 그림으로 보면 다음과 같습니다.

![sdcard.img 3-파티션 layout](/images/blog/buildroot/diagrams/chapter10-sd-layout.svg)

## Step 7: uEnv.txt와 boot.scr

AM335x U-Boot은 boot 파티션의 `uEnv.txt`를 읽습니다. 본체 `board/beagleboard/beaglebone/uEnv.txt`를 출발점으로, rootfs 인자만 squashfs로 바꿨습니다.

```text
bootpart=0:1
devtype=mmc
bootdir=
bootfile=zImage
bootpartition=mmcblk0p2
console=ttyS0,115200n8
loadaddr=0x82000000
fdtaddr=0x88000000
set_mmc1=if test $board_name = A33515BB; then setenv bootpartition mmcblk1p2; fi
set_bootargs=setenv bootargs console=${console} root=/dev/${bootpartition} ro rootfstype=squashfs rootwait
uenvcmd=run set_mmc1; run set_bootargs;run loadimage;run loadfdt;printenv bootargs;bootz ${loadaddr} - ${fdtaddr}
```

- `console=ttyS0,115200n8` — 본체 `uEnv.txt`와 `extlinux.conf`가 모두 이 값을 씁니다. 옛 자료에 보이는 `ttyO0`를 그대로 옮기지 않습니다.
- `set_mmc1`은 `board_name`이 `A33515BB`(eMMC가 있는 보드)일 때 rootfs를 `mmcblk1p2`로 바꿉니다. SD 카드가 `mmcblk0`이 될지 `mmcblk1`이 될지는 커널의 장치 순서에 달려 있어, 본체 파일도 이렇게 분기합니다.
- `bootz` — zImage(ARM 32-bit) 부팅 명령입니다.

같은 내용을 서명 없는 U-Boot script로도 만들어 봤습니다(`BR2_PACKAGE_HOST_UBOOT_TOOLS_BOOT_SCRIPT`). 생성된 `images/boot.scr`를 `host/bin/mkimage -l`로 보면 다음과 같습니다(Ch 13에서 자세히).

```text
Image Type:   ARM Linux Script (uncompressed)
Data Size:    209 Bytes = 0.20 KiB = 0.00 MiB
```

이 장의 genimage.cfg는 `boot.scr`를 boot 파티션에 넣지 않았습니다. 어느 쪽을 쓸지는 보드 U-Boot의 `bootcmd`가 무엇을 찾는지에 달렸습니다.

## Step 8: 빌드

```text
$ make O=$HOME/out-bbb acme_bbb_defconfig
$ make O=$HOME/out-bbb
```

빌드는 성공했고 벽시계로 41분 6초(`/usr/bin/time -v`, CPU 300%)가 걸렸습니다. 다만 이 시간은 참고값이 아닙니다. `output/build/build-time.log`를 합산하면 다운로드가 1,134초였고, 그중 외부 toolchain tarball이 1,057초였습니다.

`am33x-cm3`(TI의 git 저장소)는 본 빌드 전에 `make am33x-cm3-source`로 따로 받았습니다. `git.ti.com`에 대한 `git fetch`가 태그 목록만 받은 채 진행하지 않아 300초 timeout으로 종료됐습니다. 이럴 때 Buildroot는 다음 후보 URI로 넘어갑니다. `package/pkg-download.mk` 63~85행의 `DOWNLOAD_URIS`가 upstream 다음에 `BR2_BACKUP_SITE`(기본 `https://sources.buildroot.net`)를 넣고, `support/download/dl-wrapper` 94행이 그 목록을 차례로 시도합니다. 이 실험에서는 timeout이 make 전체를 끝냈으므로, 같은 백업 사이트 주소의 tarball을 직접 `wget`으로 `dl/am33x-cm3/`에 넣었습니다. 본 빌드는 그 파일을 hash로 검사하고 계속했습니다.

```text
am33x-cm3-fb484c5e54f2e31cf0a338d2927a06a2870bcc2c-git4.tar.gz: OK (sha256: b6020ce5fee52e8df6cf8e045c75064021760dd04e2923ad0e4bdd6e18ebaa49)
```

다운로드를 뺀 주요 단계는 커널 build 539초, U-Boot build 15.8초, toolchain 압축 해제 6.6초였습니다. 로그의 주요 줄입니다.

```text
>>> toolchain-external-arm-arm 14.2.rel1 Downloading
...
>>> toolchain-external-arm-arm 14.2.rel1 Copying external toolchain sysroot to staging...
...
>>> uboot 2026.01 Building
>>> uboot 2026.01 Installing to images directory
>>> linux 6.18.1 Updating kernel config with fixups
>>> linux 6.18.1 Building
...
>>> acme-led-blink 1.0 Syncing from source dir /home/br/in/bbb/package/acme-led-blink/src
...
>>>   Generating filesystem image rootfs.ext2
>>>   Generating filesystem image rootfs.squashfs
>>>   Generating filesystem image rootfs.tar
>>>   Executing post-image script support/scripts/genimage.sh
INFO: hdimage(sdcard.img): writing MBR
```

완료 후 `$HOME/out-bbb/images/`입니다.

```text
-rw-r--r-- 1 br br    110524 Nov 16 07:56 MLO
-rwxr-xr-x 1 br br     66986 Nov 16 08:06 am335x-bone.dtb
-rwxr-xr-x 1 br br     70173 Nov 16 08:06 am335x-boneblack-wireless.dtb
-rwxr-xr-x 1 br br     70448 Nov 16 08:06 am335x-boneblack.dtb
...
-rwxr-xr-x 1 br br       273 Nov 16 07:55 boot.scr
-rw-r--r-- 1 br br  16777216 Nov 16 08:08 boot.vfat
-rw-r--r-- 1 br br  67108864 Nov 16 08:08 data.ext4
-rw-r--r-- 1 br br  62914560 Nov 16 08:08 rootfs.ext2
lrwxrwxrwx 1 br br        11 Nov 16 08:08 rootfs.ext4 -> rootfs.ext2
-rw-r--r-- 1 br br  10219520 Nov 16 08:08 rootfs.squashfs
-rw-r--r-- 1 br br  36864000 Nov 16 08:08 rootfs.tar
-rw-r--r-- 1 br br 218104320 Nov 16 08:08 sdcard.img
-rw-r--r-- 1 br br   1564932 Nov 16 07:56 u-boot.img
-rw-r--r-- 1 br br       438 Nov 16 08:08 uEnv.txt
-rw-r--r-- 1 br br   7633984 Nov 16 08:06 zImage
```

`BR2_LINUX_KERNEL_INTREE_DTS_NAME`에 적힌 9개 DTS가 모두 `.dtb`로 들어왔고(목록 일부 생략), squashfs rootfs는 10.2 MB로 60 MiB ext4 이미지의 1/6이었습니다. `beaglebone_defconfig`가 켜 둔 ext4와 tar도 그대로 만들어졌습니다.

### 이미지 검사 — 굽기 전에 확인할 것

보드가 없어도 호스트에서 이미지를 검사할 수 있습니다. 파티션 표입니다.

`O=$HOME/out-bbb`로 빌드했으므로 아래 명령은 그 디렉터리에서 실행했습니다.

```text
$ cd $HOME/out-bbb
$ sfdisk -l images/sdcard.img
Disk images/sdcard.img: 208 MiB, 218104320 bytes, 425985 sectors
...
Disklabel type: dos

Device             Boot  Start    End Sectors  Size Id Type
images/sdcard.img1 *         1  32768   32768   16M  c W95 FAT32 (LBA)
images/sdcard.img2       32769 294912  262144  128M 83 Linux
images/sdcard.img3      294913 425984  131072   64M 83 Linux
```

genimage.cfg대로 FAT 16M(부팅 플래그) + squashfs 128M + data 64M입니다. boot 파티션 내용은 Buildroot가 빌드한 `mdir`로 봅니다.

```text
$ host/bin/mdir -i images/boot.vfat ::
Directory for ::/

MLO             110524 2026-11-16   8:08 
u-boot   img   1564932 2026-11-16   8:08 
ZIMAGE         7633984 2026-11-16   8:08  zImage
UENV     TXT       438 2026-11-16   8:08  uEnv.txt
AM335X~1 DTB     70448 2026-11-16   8:08  am335x-boneblack.dtb
        5 files           9 380 326 bytes
```

rootfs 안에 우리 파일이 들어갔는지는 `unsquashfs -l`로 봅니다.

```text
$ host/bin/unsquashfs -l images/rootfs.squashfs | grep -E "led-blink|hostname$|S99"
squashfs-root/bin/hostname
squashfs-root/etc/hostname
squashfs-root/etc/init.d/S99led-blink
squashfs-root/usr/sbin/led-blink
```

## Step 9: SD 카드에 굽기

이후 단계는 실행하지 않은 절차입니다. SD 카드를 꽂고 *어떤 장치인지* 정확히 확인합니다.

```bash
lsblk
sudo umount /dev/sdX1
sudo dd if=output/images/sdcard.img of=/dev/sdX bs=4M conv=fsync status=progress
```

`board/beagleboard/beaglebone/readme.txt`도 같은 `dd if=output/images/sdcard.img of=/dev/XXX`를 안내합니다. **잘못된 장치를 고르면 호스트 디스크가 지워집니다.** `lsblk`의 SIZE와 모델명을 두 번 확인합니다. Buildroot의 `support/scripts/genimage.sh` 52~59행은 `BR2_PACKAGE_HOST_BMAP_TOOLS=y`면 genimage.cfg의 이미지마다 `bmaptool create`로 `.bmap`을 만들어 주므로, `bmaptool copy`를 쓰려면 그 옵션을 켭니다.

## Step 10: 시리얼 콘솔 연결

보드의 시리얼 헤더에 USB-TTL 어댑터를 연결하고, 이 장의 `uEnv.txt`가 커널에 넘기는 `console=ttyS0,115200n8`에 맞춰 115200 bps로 엽니다. 헤더 위치와 핀 배치는 이 장에서 확인한 1차 자료가 없으므로 보드 문서를 따릅니다.

```bash
picocom -b 115200 /dev/ttyUSB0
```

## Step 11: 첫 부팅에서 확인할 것

부팅 로그는 싣지 않습니다. 대신 콘솔에서 다음을 차례로 확인합니다.

| 확인 | 기대값 (이 장의 이미지 기준) |
|---|---|
| U-Boot 버전 줄 | `U-Boot SPL 2026.01`, `U-Boot 2026.01` |
| `printenv bootargs` 출력 (`uenvcmd`가 찍음) | `console=ttyS0,115200n8 root=/dev/mmcblk0p2 ro rootfstype=squashfs rootwait` (`uEnv.txt`의 `set_mmc1`은 U-Boot `board_name`이 `A33515BB`이면 `mmcblk1p2`로 바꿈) |
| 커널 버전 | `Linux version 6.18.1` |
| rootfs mount | `VFS: Mounted root (squashfs filesystem) readonly` |
| 로그인 프롬프트 | `acme-bbb login:` |
| 데몬 | `Starting led-blink` 뒤 `usr2` LED 점멸 |

보드에서 보지 못했으므로 기대값은 모두 이 장의 입력 파일과 소스에서 옮겼습니다. 버전은 `beaglebone_defconfig`의 `BR2_LINUX_KERNEL_CUSTOM_VERSION_VALUE="6.18.1"`·`BR2_TARGET_UBOOT_CUSTOM_VERSION_VALUE="2026.01"`, bootargs는 위 `uEnv.txt`의 `set_bootargs`, mount 줄은 커널 `init/do_mounts.c` 173~175행의 형식(`"VFS: Mounted root (%s filesystem)%s on device %u:%u."`, `ro`면 `" readonly"`), 호스트 이름은 overlay의 `etc/hostname`(`acme-bbb`), 데몬 줄은 `S99led-blink`의 `echo`입니다.

## Troubleshooting

### 시리얼에 아무것도 안 나온다

115200 bps로 열었는지, 어댑터 배선이 보드 문서의 핀 배치와 맞는지 확인합니다.

### U-Boot까지는 나오는데 커널을 못 찾는다

`uEnv.txt`나 `zImage`·DTB가 boot 파티션에 없는 경우입니다. 위 "이미지 검사"처럼 굽기 전에 `host/bin/mdir -i images/boot.vfat ::`로 파일을 확인합니다. 파일 이름은 genimage.cfg의 `files` 목록과 `uEnv.txt`의 `bootfile`·DTB 이름이 같아야 합니다.

### Kernel panic — `VFS: Unable to mount root fs`

`root=` 장치가 틀렸거나 커널이 squashfs를 모르는 경우입니다. Ch 8에서 QEMU로 재현한 것과 같은 메시지가 납니다. 이 장의 빌드에서는 fragment 덕에 커널 `.config`에 `CONFIG_SQUASHFS=y`와 `CONFIG_SQUASHFS_ZSTD=y`가 들어간 것을 확인했습니다. 장치 이름은 `uenvcmd`가 찍는 `printenv bootargs`로 봅니다.

### squashfs는 떠 있는데 `acme-led-blink`가 없다

`BR2_PACKAGE_ACME_LED_BLINK=y`가 `.config`에 없거나, 외부 트리 최상위 `Config.in`이 패키지 `Config.in`을 `source`하지 않은 경우입니다. `make O=$HOME/out-bbb -s printvars VARS=BR2_PACKAGE_ACME_LED_BLINK`로 확인하고, 굽기 전에 `unsquashfs -l`로 rootfs 안의 파일을 봅니다.

### 다른 호스트에서 같은 defconfig인데 결과가 다르다

Step 2의 toolchain 사례처럼 호스트 아키텍처에 따라 선택 가능한 옵션이 다릅니다. `support/scripts/check-dotconfig.py <.config> <defconfig>`로 defconfig의 줄이 모두 살아남았는지 확인합니다.

## 정리

- `beaglebone_defconfig`를 베이스로 외부 트리에 `acme_bbb_defconfig`를 만들고 실제로 빌드해 208 MiB `sdcard.img`(FAT 16M + squashfs 128M + data 64M)를 얻었습니다.
- aarch64 호스트에서는 Bootlin toolchain 줄이 조용히 빠지고 Arm ARM 14.2.rel1로 빌드됐습니다. `check-dotconfig.py`가 이 차이를 잡습니다.
- `SITE_METHOD = local` 패키지는 소스를 rsync하고 hash 검사를 하지 않습니다.
- `empty = true`인 genimage 이미지로 빈 data 파티션을 만들었습니다.
- `git.ti.com` 다운로드가 멈췄고, `BR2_BACKUP_SITE`(`sources.buildroot.net`)의 같은 tarball로 hash를 확인한 뒤 계속했습니다.
- 보드에 굽고 부팅하는 단계는 실행하지 않았습니다. 굽기 전에 `sfdisk -l`, `mdir`, `unsquashfs -l`로 이미지를 검사할 수 있습니다.

## 다음 장 예고

다음 편은 **Ch 11: Toolchain 선택 — internal vs external**. 이 장에서 호스트에 따라 바뀐 외부 toolchain을, QEMU 설정에서 internal toolchain과 직접 비교합니다.

## 관련 항목

- [Ch 6: 외부 트리 — BR2_EXTERNAL](/blog/embedded/buildroot/chapter06-br2-external)
- [Ch 7: 보드 customize — overlay, post-build, post-image](/blog/embedded/buildroot/chapter07-board-customize)
- [Ch 8: 출력 파일시스템 — initramfs, squashfs, ext4, cpio](/blog/embedded/buildroot/chapter08-filesystems)
- [Ch 9: 새 패키지 작성 — autotools, cmake, python](/blog/embedded/buildroot/chapter09-new-package)
- [Ch 11: Toolchain 선택 — internal vs external](/blog/embedded/buildroot/chapter11-toolchain)
- [원문 — BeagleBoard 위키 BeagleBone Black](https://www.beagleboard.org/boards/beaglebone-black)
- [Buildroot beaglebone defconfig (mainline)](https://gitlab.com/buildroot.org/buildroot/-/blob/master/configs/beaglebone_defconfig)
