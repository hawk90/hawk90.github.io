---
title: "Buildroot post-build·post-image 심화 — rootfs 최종 수정 흐름"
slug: "embedded/buildroot/chapter15-post-build-deep"
date: 2026-05-19T09:15:00
description: "post-build·post-image·post-fakeroot 세 hook의 정확한 차이, 환경 변수, BR2_ROOTFS_OVERLAY 한계, device table로 권한·devnode·capability 다루기, genimage로 SD 이미지 만들기."
series: "Buildroot Practical"
seriesOrder: 15
tags: [embedded, buildroot, post-build, post-image, genimage, fakeroot]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"세 hook은 *언제·어디서·어떤 권한으로* 실행되는지가 다 다릅니다."** — post-build는 fakeroot 밖에서 TARGET_DIR을 만지고, post-fakeroot는 fakeroot 안에서 권한·devnode를 박고, post-image는 rootfs가 닫힌 뒤 이미지를 조립합니다. 셋을 섞으면 *조용히 망가집니다*.

## 3가지 hook의 정확한 차이

Ch 7에서 post-build·post-image의 존재와 기본 동작을 봤습니다. 이번 장은 셋의 경계에 집중합니다. 트러블슈팅의 상당수가 "어느 hook에서 무엇을 해야 하는가"를 잘못 고른 데서 옵니다. 공장 라인에 비유하면 post-build는 *조립대*, post-fakeroot는 *검수·포장대*(여기서만 "관리자 도장"을 찍을 수 있음), post-image는 *출하장*입니다. 도장을 조립대에서 찍으려 하면 거부당합니다.

이 장의 동작 설명은 **Buildroot 2026.02.3**의 최상위 `Makefile`(`target-finalize`, `target-post-image`)과 `fs/common.mk`(이미지 생성 규칙)에서 확인했습니다. 실행 결과는 Ch 7에서 QEMU defconfig에 네 hook과 device table을 모두 넣고 인자·권한을 로그로 남긴 실험의 것입니다.

`fs/common.mk`가 이미지마다 만드는 fakeroot 스크립트의 순서는 다음과 같습니다(160~195행).

1. `output/target/`을 `output/build/buildroot-fs/<fmt>/target`으로 `rsync -auH` 복사
2. `chown -h -R 0:0` (전체를 root 소유로)
3. `support/scripts/mkusers`로 사용자 테이블 적용
4. `makedevs -d full_devices_table.txt` (device table 적용)
5. `ROOTFS_PRE_CMD_HOOKS`
6. **`BR2_ROOTFS_POST_FAKEROOT_SCRIPT`** 실행
7. `/run`, `/tmp` 내용 삭제, `BR2_REPRODUCIBLE`이면 timestamp 고정, SELinux면 `setfiles`
8. 포맷별 이미지 생성 명령(`mkfs.ext4 -d …`, `mksquashfs …`)

그래서 post-fakeroot는 *device table이 적용된 뒤*, *이미지 직전*에 돌고, *포맷마다 한 번씩* 돕니다.

| 항목 | `post-build` | `post-fakeroot` | `post-image` |
|---|---|---|---|
| **실행 시점** | overlay 복사 직후, 이미지 생성 전 | 이미지마다, device table 적용 직후 | 모든 이미지 생성 후 |
| **첫 인자 (실측)** | `output/target` | `output/build/buildroot-fs/<fmt>/target` | `output/images` |
| **`id -u` (실측)** | 1000 | 0 (fakeroot) | 1000 |
| **실행 횟수 (실측, ext2+tar)** | 1 | 2 | 1 |
| **`chown` 결과 (실측)** | `Operation not permitted` | 이미지에 반영 | 대상 없음 |
| **바꾼 내용이 남는 곳** | `output/target/` (모든 이미지) | 그 포맷의 이미지만 | `output/images/` |
| **Kconfig 옵션** | `BR2_ROOTFS_POST_BUILD_SCRIPT` | `BR2_ROOTFS_POST_FAKEROOT_SCRIPT` | `BR2_ROOTFS_POST_IMAGE_SCRIPT` |

`system/Config.in`의 `BR2_ROOTFS_POST_FAKEROOT_SCRIPT` help도 같은 내용을 적습니다. "scripts to be run at the end of the fakeroot script right before the image(s) are actually generated … called with the target directory name as first argument."

가장 자주 틀리는 부분이 **post-build에서 `chown root:root`를 시도**하는 경우입니다. Ch 7 실험에서 post-build의 `chown 0:0 etc/hostname`은 `chown: changing ownership of 'etc/hostname': Operation not permitted`로 실패했습니다. 파일 내용·symlink 정리는 post-build, 권한은 device table(또는 post-fakeroot), 이미지 묶기는 post-image로 나눕니다.

## 환경 변수 — 각 hook이 받는 것

Ch 7 실험에서 post-build가 받은 환경은 다음과 같았습니다.

```text
BR2_CONFIG=/home/br/buildroot/.config
HOST_DIR=/home/br/buildroot/output/host
STAGING_DIR=/home/br/buildroot/output/host/aarch64-buildroot-linux-gnu/sysroot
TARGET_DIR=/home/br/buildroot/output/target
BUILD_DIR=/home/br/buildroot/output/build
BINARIES_DIR=/home/br/buildroot/output/images
BASE_DIR=/home/br/buildroot/output
CONFIG_DIR=/home/br/buildroot
O=/home/br/buildroot/output
BR2_DL_DIR=/home/br/buildroot/dl
PARALLEL_JOBS=11
```

`BR2_CONFIG`·`TARGET_DIR`·`STAGING_DIR`·`HOST_DIR`·`BINARIES_DIR`·`BASE_DIR`는 최상위 `Makefile` 504~510행의 `export`이고, `PATH`·`BR2_DL_DIR`·`BUILD_DIR`·`CONFIG_DIR`·`O`·`PARALLEL_JOBS`는 `package/Makefile.in` 362행의 `EXTRA_ENV`가 세 hook 모두에 넘깁니다. post-fakeroot는 `fs/common.mk` 185행에서 같은 `EXTRA_ENV`로 불립니다.

| 변수 | post-build | post-fakeroot | post-image |
|---|---|---|---|
| `$1` | `output/target` | 포맷별 복사본 | `output/images` |
| `TARGET_DIR` (환경 변수) | `output/target` | `output/build/buildroot-fs/<fmt>/target` | `output/target` (이미지에는 이미 반영 끝) |
| `BINARIES_DIR` | 이전 빌드의 산출물이 있을 수 있음 | 같음 | 이번 빌드 산출물 |
| `PATH` | `output/host/bin`, `output/host/sbin`이 앞에 | 같음 | 같음 |

post-fakeroot 안에서 `TARGET_DIR`이 포맷별 경로가 되는 것은 최상위 `Makefile` 470·473행의 정의 때문입니다. `TARGET_DIR = $(if $(ROOTFS),$(ROOTFS_$(ROOTFS)_TARGET_DIR),…)`이고, 이미지 규칙은 `ROOTFS=<포맷>`을 설정하므로 `fs/common.mk` 110행의 `$(ROOTFS_$(2)_DIR)/target`이 됩니다.

`PATH`는 `EXTRA_ENV`의 `PATH=$(BR_PATH)`가 `output/host/bin`과 `output/host/sbin`을 앞에 붙인 값이라, `mkimage`·`genimage` 같은 host 도구를 이름만으로 부를 수 있습니다. Ch 7 실험의 make 로그에서 fakeroot 명령은 `PATH="/home/br/buildroot/output/host/bin:/home/br/buildroot/output/host/sbin:…"`로 실행됐습니다. 스크립트를 Buildroot 밖에서도 돌린다면 직접 `PATH`를 잡아 둡니다.

```bash
#!/bin/sh
set -e
export PATH="${HOST_DIR}/bin:${HOST_DIR}/sbin:${PATH}"
mkimage -f "${BOARD_DIR}/u-boot.its" "${BINARIES_DIR}/fitImage"
```

`set -e`는 반드시 켭니다. 실패한 명령이 있어도 스크립트가 0으로 끝나면 Buildroot는 다음 단계로 갑니다. post-fakeroot help는 "The build will fail on the first scripts that exits with a non-zero exit code"라고 적으므로, 실패를 알리는 방법은 종료 코드뿐입니다.

## BR2_ROOTFS_OVERLAY — 가장 단순한 방법

스크립트가 부담스러우면 overlay 디렉터리 한 줄로 정적 파일을 넣습니다. 다만 overlay는 `system/system.mk`의 `rsync -a --ignore-times … --chmod=u=rwX,go=rX --exclude .empty --exclude '*~'`로 복사되므로 Ch 7 실험에서 확인한 세 가지 한계가 있습니다.

- **mode** — 600 파일이 644가 됐습니다. 그룹·기타 쓰기와 제한 권한은 보존되지 않습니다.
- **setuid** — 4755 파일은 setuid가 그대로 남았습니다. 의도하지 않은 setuid가 섞이지 않게 저장소의 mode를 점검합니다.
- **소유자** — `output/target/`에서는 빌드 사용자 소유이고, 이미지 단계에서 `chown -R 0:0`로 전부 root가 됩니다. root 외 소유자는 device table로 지정합니다.

## device table — 권한과 devnode

device table은 fakeroot 안에서 `makedevs`가 적용하는 권한·devnode 명세입니다. 파일 이름은 `system/device_table.txt`이고(`system_table.txt`라는 파일은 없습니다), `BR2_ROOTFS_DEVICE_TABLE`의 기본값입니다. 추가 표는 공백으로 이어 붙입니다.

```text
BR2_ROOTFS_DEVICE_TABLE="system/device_table.txt board/myboard/device_table_extras.txt"
```

`system/device_table_dev.txt`는 별도 옵션 `BR2_ROOTFS_STATIC_DEVICE_TABLE`의 기본값이고, 이 옵션은 `depends on BR2_ROOTFS_DEVICE_CREATION_STATIC`입니다. 즉 `/dev`를 정적으로 만드는 설정에서만 쓰이고, 기본값인 devtmpfs 설정에서는 쓰이지 않습니다. `system/device_table.txt` 머리말도 "It doesn't create any device file"이라고 적습니다.

엔트리 형식은 매뉴얼 "Makedev syntax documentation"이 정합니다.

```text
#<name>           <type>  <mode>  <uid>  <gid>  <major>  <minor>  <start>  <inc>  <count>
/dev/ttyS0          c      666      0      0      4       64       -        -      -
/etc/shadow         f      600      0      0      -       -        -        -      -
/var/log            d      755      0      0      -       -        -        -      -
/dev/loop           b      660      0      6       7       0        0        1      8
/bin/busybox        f      4755     0      0      -       -        -        -      -
|xattr cap_net_raw+ep
```

| 컬럼 | 의미 |
|---|---|
| `name` | rootfs 안의 절대 경로 |
| `type` | `f` 일반 파일, `d` 디렉터리, `c` char device, `b` block device, `p` FIFO 등 |
| `mode` | 8진 mode (`644`, `4755`) |
| `uid`/`gid` | 숫자 ID |
| `major`/`minor` | char/block 전용 |
| `start`/`inc`/`count` | minor를 연속으로 만들 때. `/dev/loop0`~`/dev/loop7` 같은 패턴 |

Ch 7 실험에서 `/etc/hostname f 600 0 0`과 `/opt/acme d 700 500 500`을 넣었더니 post-fakeroot 시점과 최종 `rootfs.tar`에서 `-rw------- 0/0 ./etc/hostname`, `drwx------ 500/500 ./opt/acme/`가 확인됐습니다. overlay가 644로 바꿔 놓은 파일을 device table이 다시 600으로 덮은 것입니다. 이 순서(overlay → … → makedevs)가 "overlay에 둔 파일의 권한을 device table에서 재지정"하는 패턴의 근거입니다.

## fakeroot의 한계와 대안

fakeroot는 root 권한을 *흉내*냅니다. 그 흉내가 실제 이미지에 남는지는 이미지 생성 도구가 fakeroot가 기억한 메타데이터를 읽느냐에 달려 있습니다.

### File capabilities

post-build에서 `setcap`을 부르면 일반 사용자 권한이라 실패하거나, `output/target/`에만 남고 이미지 복사본에는 보장되지 않습니다. Buildroot의 공식 경로는 device table의 `|xattr` 줄입니다. Ch 7 실험에서 다음 두 가지가 필요했습니다.

1. `BR2_ROOTFS_DEVICE_TABLE_SUPPORTS_EXTENDED_ATTRIBUTES=y` — 없으면 `makedevs: line 28 not supported: '|xattr cap_net_raw+ep'`와 "Did you forget to enable BR2_ROOTFS_DEVICE_TABLE_SUPPORTS_EXTENDED_ATTRIBUTES?"로 멈췄습니다.
2. 이미 빌드된 `host-makedevs`를 `make host-makedevs-dirclean`으로 지우고 다시 빌드 — `package/makedevs/makedevs.mk`가 이 옵션일 때만 `-DEXTENDED_ATTRIBUTES -lcap`로 컴파일합니다.

그 뒤 ext4 이미지에서 capability가 확인됐습니다.

```text
$ output/host/sbin/debugfs -R "ea_list /bin/busybox" output/images/rootfs.ext2
Extended attributes:
  security.capability (20) = 01 00 00 02 00 20 00 00 00 00 00 00 00 00 00 00 00 00 00 00
```

같은 빌드의 `rootfs.tar`도 `tar --xattrs -tvf`에서 `./bin/busybox`에 xattr 표시(`*`)가 붙었습니다. 서비스 권한만 필요하다면 systemd의 `AmbientCapabilities=`처럼 *실행 시점*에 권한을 주는 방법도 있습니다.

### Extended attributes와 ext4

ext4 이미지는 `fs/ext2/ext2.mk`의 `mkfs.ext$(GEN) -d $(TARGET_DIR) …`로 만들어집니다. `genext2fs`가 아니라 e2fsprogs의 `mkfs.ext4 -d`(디렉터리에서 채우기)이며, 위 결과처럼 fakeroot가 보관한 `security.capability`가 이미지에 들어갔습니다. 다른 포맷(squashfs, erofs 등)은 각 생성 도구의 xattr 지원에 따라 다르므로, 쓰는 포맷의 이미지에서 같은 방법으로 직접 확인합니다.

### SELinux context

Buildroot는 `BR2_PACKAGE_REFPOLICY=y`일 때 `fs/common.mk` 53~58행의 `ROOTFS_SELINUX`를 fakeroot 스크립트에 넣어, 이미지 생성 직전에 `setfiles -m -r $(TARGET_DIR) -c <policy> <file_contexts> $(TARGET_DIR)`로 label을 붙입니다. 의존성으로 `host-policycoreutils`가 추가됩니다. 따라서 label을 손으로 붙이는 post-image 단계는 필요 없고, 생성된 이미지에서 label이 들어갔는지를 확인합니다. 이 장에서 SELinux 이미지는 빌드하지 않았습니다.

## post-image use cases

post-image는 BINARIES_DIR에 이미 생성된 rootfs를 받아 조립하는 단계입니다. 대표 4가지 시나리오입니다.

| 시나리오 | 도구 | 산출물 |
|---|---|---|
| **FIT 이미지** | `mkimage -f u-boot.its` | `fitImage` (kernel + dtb + initramfs 묶음) |
| **partition 이미지** | `support/scripts/genimage.sh -c genimage.cfg` | `sdcard.img` (MBR/GPT + 여러 partition) |
| **squashfs** | Buildroot 자체 옵션 `BR2_TARGET_ROOTFS_SQUASHFS` (post-image 불필요) | `rootfs.squashfs` |
| **signed update bundle** | `openssl dgst -sign` 또는 vendor tool | `update.bin.sig` |

post-build에서 흔한 패턴 한 장은 다음과 같습니다.

```bash
#!/bin/sh
# board/myboard/post-build.sh
set -e

# 커스텀 service unit symlink
mkdir -p "${TARGET_DIR}/etc/systemd/system/multi-user.target.wants"
ln -sf /etc/systemd/system/myapp.service \
    "${TARGET_DIR}/etc/systemd/system/multi-user.target.wants/myapp.service"

# 고정 release identifier를 /etc/os-release에 기록
sed -i "s|^BUILD_ID=.*|BUILD_ID=${RELEASE_ID:?set a fixed release identifier}|" \
    "${TARGET_DIR}/etc/os-release"
```

FIT 이미지 생성의 전형적인 post-image 호출은 다음과 같습니다.

```bash
#!/bin/sh
set -e
BOARD_DIR="$(dirname $0)"

# Image Tree Source 복사 (kernel·dtb 경로가 BINARIES_DIR 기준)
cp "${BOARD_DIR}/u-boot.its" "${BINARIES_DIR}/u-boot.its"
cd "${BINARIES_DIR}"
mkimage -f u-boot.its fitImage
rm -f u-boot.its
```

`mkimage`는 `BR2_PACKAGE_HOST_UBOOT_TOOLS=y`면 `output/host/bin`에 설치됩니다. 위처럼 `.its`를 `BINARIES_DIR`에 복사하고 그 디렉터리에서 실행하면, `.its` 안의 `data = /incbin/("Image")` 같은 상대 경로가 산출물 파일을 그대로 가리킵니다. 이 FIT 예는 이 장에서 실행하지 않았습니다.

## genimage — SD/eMMC 이미지 생성

`genimage`는 MBR/GPT 디스크 이미지를 cfg 파일로 만드는 도구입니다. Buildroot가 host package로 제공하므로 `BR2_PACKAGE_HOST_GENIMAGE=y`를 켜고, post-image에서 범용 스크립트 `support/scripts/genimage.sh`를 부르는 것이 본체 보드들의 방식입니다(Ch 7). 다음 cfg는 Raspberry Pi 류 구성의 예입니다.

```text
image boot.vfat {
    vfat {
        files = {
            "u-boot.bin",
            "bcm2710-rpi-3-b.dtb",
            "zImage",
            "config.txt",
            "cmdline.txt",
        }
    }
    size = 32M
}

image sdcard.img {
    hdimage {
        partition-table-type = "mbr"
    }

    partition boot {
        partition-type = 0xC
        bootable = "true"
        image = "boot.vfat"
    }

    partition rootfs {
        partition-type = 0x83
        image = "rootfs.ext4"
        size = 512M
    }

    partition data {
        partition-type = 0x83
        image = "data.ext4"
    }
}

image data.ext4 {
    ext4 {
        label = "data"
    }
    size = 64M
    empty = true
}
```

data 파티션에 `rootfs.ext4`를 다시 넣으면 rootfs 복사본이 data 파티션에 들어갑니다. 빈 파일시스템은 위처럼 `empty = true`인 별도 이미지로 만듭니다. Ch 10의 BeagleBone 빌드에서 이 방식으로 실제 `sdcard.img`를 만들었습니다.

이 cfg는 post-image에서 `support/scripts/genimage.sh`로 호출합니다.

```text
BR2_ROOTFS_POST_IMAGE_SCRIPT="support/scripts/genimage.sh"
BR2_ROOTFS_POST_SCRIPT_ARGS="-c $(BR2_EXTERNAL_MYBOARD_PATH)/board/myboard/genimage.cfg"
```

| genimage 옵션 | `genimage.sh`가 주는 값 |
|---|---|
| `--rootpath` | 빈 임시 디렉터리 (`mktemp -d`). 주석: "passing TARGET_DIR would be a waste of time and disk space" |
| `--tmppath` | `${BUILD_DIR}/genimage.tmp` (실행 전 `rm -rf`) |
| `--inputpath` | `${BINARIES_DIR}` |
| `--outputpath` | `${BINARIES_DIR}` |

## secure boot 통합 패턴

서명은 *post-image에서* 처리합니다. fakeroot가 닫힌 뒤, rootfs와 FIT, kernel 같은 *최종 이미지*가 모두 BINARIES_DIR에 모인 시점이라 한 번에 묶기 좋습니다.

```bash
#!/bin/sh
set -e
BOARD_DIR="$(dirname "$0")"
KEY="${SIGNING_KEY:?set SIGNING_KEY to the provisioned signing key path}"

# 1) FIT 이미지에 서명 — mkimage가 .its 안의 signature node를 채움
mkimage -f "${BOARD_DIR}/u-boot-signed.its" \
        -k "$(dirname ${KEY})" \
        -K "${BINARIES_DIR}/u-boot.dtb" \
        -r "${BINARIES_DIR}/fitImage"

# 2) rootfs에 별도 detached signature
openssl dgst -sha256 -sign "${KEY}" \
    -out "${BINARIES_DIR}/rootfs.ext4.sig" \
    "${BINARIES_DIR}/rootfs.ext4"

# 3) update bundle 묶기
tar -cf "${BINARIES_DIR}/update.tar" -C "${BINARIES_DIR}" \
    fitImage rootfs.ext4 rootfs.ext4.sig
```

key 파일은 Buildroot 트리에도 외부 트리에도 커밋하지 않고, CI의 secret store 등에서 빌드 시점에 경로로 주입합니다. post-image 스크립트가 key 경로를 환경 변수에서 읽도록 짜면(`${SIGNING_KEY:?…}`) 키가 없을 때 바로 실패합니다. 이 장에서 서명 흐름은 실제로 실행하지 않았고, 명령 형식은 `mkimage`(`-k`/`-K`/`-r`)와 `openssl dgst` 문서를 따랐습니다.

## 흔한 실수

세 hook을 잘못 쓰면 *조용히 망가지는* 패턴이 정형화돼 있습니다.

| 증상 | 원인 | 해결 |
|---|---|---|
| `chown` 효과가 없음 | post-build에서 시도 | post-fakeroot 또는 device table로 이동 |
| overlay 파일 mode가 644로 바뀜 | overlay rsync의 `--chmod=u=rwX,go=rX` | device table에서 *재지정* |
| post-image 결과가 *비어 있음* | TARGET_DIR을 건드림 | BINARIES_DIR로 작업 대상 옮기기 |
| `mkimage: command not found` | PATH에 `$HOST_DIR/bin` 누락 | 스크립트 상단에 명시 |
| 이미지가 늘 stale | 이전 임시 상태를 재사용 | 실행마다 새 임시 디렉터리를 만들고 그 경로만 제거 |
| 권한·metadata가 기대와 다름 | 일반 overlay 복사만으로 UID/GID/device metadata를 설정하려 함 | device table 또는 fakeroot 단계에서 명시 |
| SELinux label 누락 | `BR2_PACKAGE_REFPOLICY` 미설정 | refpolicy를 켜면 fakeroot 안에서 `setfiles`가 자동으로 돔 |
| `|xattr` 줄에서 makedevs 오류 | 확장 속성 옵션 꺼짐 또는 host-makedevs 미재빌드 | 옵션 켜고 `host-makedevs-dirclean` |
| `Permission denied: ./post-build.sh` | 스크립트 실행 비트 누락 | `chmod +x` 후 git에 등록 |
| `${BUILD_DIR}/something` 경로가 없음 | BUILD_DIR을 패키지별로 추정 | 패키지별 경로는 `${BUILD_DIR}/<pkg>-<version>/`으로 *명시* |
| 같은 스크립트가 board별로 다르게 동작 | 분기 없음 | `BR2_ROOTFS_POST_IMAGE_SCRIPT`에 인자 추가 |

capability처럼 이미지 메타데이터에 의존하는 설정은 *생성된 이미지*에서 확인해야 드러납니다. 위 `debugfs -R "ea_list …"`나 `tar --xattrs -tvf`를 CI에 넣어 두면 옵션이 빠졌을 때 바로 잡힙니다.

## 정리

- fakeroot 스크립트 순서는 복사 → `chown -R 0:0` → mkusers → makedevs(device table) → post-fakeroot → 이미지 생성입니다(`fs/common.mk`).
- 실측으로 post-build는 uid 1000에서 `chown`이 실패했고, post-fakeroot는 uid 0으로 포맷별 복사본에서 포맷 수만큼 돌았습니다.
- 환경 변수는 `Makefile`의 export와 `EXTRA_ENV`가 넘기며, post-fakeroot 안에서는 `TARGET_DIR`이 포맷별 경로가 됩니다.
- overlay는 mode를 `u=rwX,go=rX`로 정규화하고 setuid는 남깁니다. UID/GID·제한 권한은 device table로 지정합니다.
- device table 파일은 `system/device_table.txt`이고, `device_table_dev.txt`는 정적 `/dev` 설정에서만 쓰입니다.
- capability는 `|xattr` + `BR2_ROOTFS_DEVICE_TABLE_SUPPORTS_EXTENDED_ATTRIBUTES` + host-makedevs 재빌드로 ext4 이미지에 들어갔고, SELinux label은 refpolicy를 켜면 fakeroot 안에서 `setfiles`가 붙입니다.
- post-image의 4대 시나리오는 FIT·partition image·squashfs·signed bundle. `genimage` cfg 한 장으로 MBR/GPT partition 이미지를 만들 수 있습니다.
- secure boot는 post-image에서 처리. key는 *트리 밖*에 두고 환경 변수로 주입.

## 다음 장 예고

다음 편은 **Ch 16: OTA·이미지 업데이트**. 이 장에서 만든 post-image 산출물을 *RAUC·SWUpdate·Mender* 같은 OTA 프레임워크로 넘기는 방식을 다룹니다.


## 관련 항목

- [Ch 7: 보드 추가·커스터마이즈 — defconfig·external tree·overlay](/blog/embedded/buildroot/chapter07-board-customize) — 세 hook의 *기본 소개*. 이 장은 그 후속.
- [Ch 13: U-Boot 통합 — bootloader·환경변수·FIT 이미지](/blog/embedded/buildroot/chapter13-uboot-integration) — post-image에서 만드는 FIT 이미지의 *부트로더 쪽 절반*.
- [Ch 16: OTA·이미지 업데이트 — RAUC·SWUpdate·Mender](/blog/embedded/buildroot/chapter16-ota) — post-image 산출물을 *업데이트 번들*로 묶기.
- [Ch 18: 보안·SBOM·라이선스 — 이미지 서명과 공급망](/blog/embedded/buildroot/chapter18-security-cve) — secure boot signing 흐름을 *공급망 관점*에서 재정리.
- [BSP Development Ch 17: 이미지 빌드와 배포](/blog/embedded/bsp/chapter17-image-packaging) — BSP 관점의 partition layout·서명 흐름.
- [원문 — Buildroot Manual §9.10: post-build, post-fakeroot, post-image scripts](https://buildroot.org/downloads/manual/manual.html)
