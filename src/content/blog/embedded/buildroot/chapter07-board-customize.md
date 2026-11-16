---
title: "Buildroot 보드 Customize — overlay·post-build·post-image 흐름"
slug: "embedded/buildroot/chapter07-board-customize"
date: 2026-05-19T09:07:00
description: "보드별 파일 추가, 빌드 후 처리, 이미지 생성 후 처리 — 세 가지 hook."
series: "Buildroot Practical"
seriesOrder: 7
tags: [embedded, buildroot, overlay, post-build, post-image]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"패키지로 풀 수 없는 보드별 차이는 세 가지 hook으로 해결한다."** — overlay는 *파일 복사*, post-build는 *rootfs 수정*, post-image는 *flash 이미지 조립*입니다.

Buildroot는 패키지 시스템이 강력하지만, 실제 보드에는 항상 *패키지로 풀기 애매한 차이*가 남습니다. 한 줄짜리 `/etc/hostname`, 보드별 `/etc/network/interfaces`, 마지막에 SD 카드 이미지를 만드는 절차 같은 것들입니다.

이 장은 그 빈틈을 메우는 세 hook, `BR2_ROOTFS_OVERLAY`, `BR2_ROOTFS_POST_BUILD_SCRIPT`, `BR2_ROOTFS_POST_IMAGE_SCRIPT`를 다룹니다. 이사 비유로 말하면 overlay는 *짐을 그대로 옮겨 놓는 일*, post-build는 *옮긴 뒤 가구 배치를 손보는 일*, post-image는 *집을 다 꾸민 뒤 사진을 찍어 앨범으로 묶는 일*입니다.

설명이 추측에 머물지 않도록, **Buildroot 2026.02.3**의 QEMU defconfig(Ch 4와 같은 VM 빌드)에 아래 설정을 실제로 넣고 hook마다 인자·환경 변수·권한을 로그로 남겼습니다. 결과는 각 절에 붙였습니다.

```text
BR2_ROOTFS_OVERLAY="/home/br/ch07/board/acme/edge/rootfs-overlay"
BR2_ROOTFS_POST_BUILD_SCRIPT="/home/br/ch07/board/acme/edge/post-build.sh"
BR2_ROOTFS_POST_FAKEROOT_SCRIPT="/home/br/ch07/board/acme/edge/post-fakeroot.sh"
BR2_ROOTFS_POST_IMAGE_SCRIPT="board/qemu/post-image.sh /home/br/ch07/board/acme/edge/post-image.sh"
BR2_ROOTFS_POST_SCRIPT_ARGS="acme-edge production"
BR2_ROOTFS_DEVICE_TABLE="system/device_table.txt /home/br/ch07/board/acme/edge/device_table.txt"
BR2_TARGET_ROOTFS_TAR=y
```

외부 트리를 쓴다면 경로는 `$(BR2_EXTERNAL_ACME_PATH)/board/acme/edge/...`로 적습니다(Ch 6).

## 세 hook의 위치

빌드 흐름에서 셋이 어디에 끼는지부터 정리합니다.

![세 hook의 빌드 흐름 내 위치](/images/blog/buildroot/diagrams/chapter07-three-hooks.svg)

실제 `make` 출력에서 hook이 나오는 순서는 다음과 같았습니다.

```text
>>>   Copying overlay /home/br/ch07/board/acme/edge/rootfs-overlay
>>>   Executing post-build script /home/br/ch07/board/acme/edge/post-build.sh
>>>   Generating root filesystems common tables
>>>   Generating filesystem image rootfs.ext2
>>>   Executing fakeroot script /home/br/ch07/board/acme/edge/post-fakeroot.sh
>>>   Generating filesystem image rootfs.tar
>>>   Executing fakeroot script /home/br/ch07/board/acme/edge/post-fakeroot.sh
>>>   Executing post-image script board/qemu/post-image.sh
>>>   Executing post-image script /home/br/ch07/board/acme/edge/post-image.sh
```

이 순서는 최상위 `Makefile`의 `target-finalize` 규칙(overlay 복사 → post-build)과 `target-post-image` 규칙(post-image), 그리고 `fs/common.mk`의 이미지 생성 규칙(post-fakeroot)에서 나옵니다. 네 번째 hook인 post-fakeroot는 *이미지 포맷마다 한 번씩* 돌았습니다(ext2와 tar 두 번).

| Hook | 시점 | 첫 인자 | 실행 권한 | 수정 대상 |
|------|------|--------|---------|----------|
| `BR2_ROOTFS_OVERLAY` | 패키지 설치 뒤, post-build 앞 | — | 빌드 사용자 | `output/target/` |
| `BR2_ROOTFS_POST_BUILD_SCRIPT` | overlay 복사 직후 | `output/target` | 빌드 사용자 (`id: 1000`) | `output/target/` |
| `BR2_ROOTFS_POST_FAKEROOT_SCRIPT` | 이미지마다, fakeroot 안 | `output/build/buildroot-fs/<fmt>/target` | fakeroot (`id: 0`) | 그 이미지의 복사본 |
| `BR2_ROOTFS_POST_IMAGE_SCRIPT` | 모든 이미지 생성 뒤 | `output/images` | 빌드 사용자 (`id: 1000`) | `output/images/` |

## BR2_ROOTFS_OVERLAY — 파일 트리 복사

가장 단순한 hook입니다. 디렉터리 하나를 가리키면 그 안의 파일이 `output/target/`으로 복사됩니다. 복사 명령은 `system/system.mk` 64~67행의 `SYSTEM_RSYNC`입니다.

```makefile
define SYSTEM_RSYNC
	rsync -a --ignore-times $(RSYNC_VCS_EXCLUSIONS) \
		--chmod=u=rwX,go=rX --exclude .empty --exclude '*~' \
		$(1)/ $(2)/
```

`RSYNC_VCS_EXCLUSIONS`는 최상위 `Makefile` 642행에서 `.svn`, `.git`, `.hg`, `.bzr`, `CVS`를 뺍니다. 이 명령의 옵션이 overlay의 동작을 거의 다 설명합니다. 실험에 쓴 overlay는 다음과 같았습니다.

```text
board/acme/edge/rootfs-overlay/
├── etc/
│   ├── acme.json -> /opt/acme/config.json
│   ├── hostname              (mode 600)
│   └── init.d/
│       └── S99acme           (mode 755)
├── opt/
│   └── acme/
│       ├── .gitkeep
│       ├── config.json       (mode 4755)
│       └── notes~
└── var/
    └── log/
        └── acme/
            └── .empty
```

post-build 시점에 `output/target/`에서 본 결과입니다.

```text
-rw-r--r-- br:br etc/hostname
-rwxr-xr-x br:br etc/init.d/S99acme
-rwsr-xr-x br:br opt/acme/config.json
lrwxrwxrwx br:br etc/acme.json
```

### Overlay의 함정

결과에서 다섯 가지가 드러납니다.

**1. mode가 그대로 보존되지 않습니다.** `--chmod=u=rwX,go=rX` 때문에 600이던 `hostname`이 644가 됐습니다. 실행 비트(`X`)는 원래 실행 가능하던 파일에만 붙으므로 `S99acme`는 755를 유지합니다. 그래서 init 스크립트는 저장소에서 미리 `chmod +x`해 둬야 합니다.

**2. setuid 비트는 남았습니다.** 같은 옵션인데 4755 `config.json`은 `-rwsr-xr-x`로 복사됐습니다. 의도하지 않은 setuid가 overlay에 섞이면 그대로 이미지까지 갑니다(아래 tar 목록 참고).

**3. 소유자는 빌드 사용자입니다.** `output/target/`의 파일은 `br:br`입니다. root 소유로 바뀌는 것은 이미지를 만드는 fakeroot 단계입니다.

**4. `.empty`와 `*~`는 빠지고, 다른 placeholder는 남습니다.** `var/log/acme/.empty`는 제외돼 빈 디렉터리만 남았고 `notes~`도 사라졌지만, `.gitkeep`은 그대로 rootfs에 들어갔습니다. 빈 디렉터리가 필요하면 placeholder 이름을 `.empty`로 둡니다.

**5. symlink는 링크 자체로 복사됩니다.** `rsync -a`이므로 `acme.json -> /opt/acme/config.json`이 그대로 남고, 절대 경로는 타깃에서 해석됩니다.

같은 경로의 파일이 패키지와 overlay에 둘 다 있으면 overlay가 이깁니다. 패키지 설치가 모두 끝난 *뒤*에 복사하기 때문입니다.

### 여러 overlay 합치기

`BR2_ROOTFS_OVERLAY`는 공백으로 구분된 여러 디렉터리를 받고, `Makefile`의 `$(foreach d, …)`가 적힌 순서대로 복사합니다. 뒤 디렉터리가 앞 디렉터리의 같은 파일을 덮어씁니다.

```text
BR2_ROOTFS_OVERLAY="$(BR2_EXTERNAL_ACME_PATH)/board/common/rootfs-overlay $(BR2_EXTERNAL_ACME_PATH)/board/acme/edge/rootfs-overlay"
```

*공통 → 보드* 순으로 쌓으면 보드 디렉터리가 공통 설정을 덮습니다.

## BR2_ROOTFS_POST_BUILD_SCRIPT — 마지막 수정

overlay로 안 되는 것이 있습니다. *빌드 시점에 값이 정해지는* 파일, 기존 파일 *삭제*, 템플릿 치환 같은 것들입니다.

```text
BR2_ROOTFS_POST_BUILD_SCRIPT="$(BR2_EXTERNAL_ACME_PATH)/board/acme/edge/post-build.sh"
```

인자와 환경 변수를 실제로 찍어 봤습니다.

```text
== post-build argv: /home/br/buildroot/output/target acme-edge production
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

첫 인자는 `TARGET_DIR`, 그 뒤가 `BR2_ROOTFS_POST_SCRIPT_ARGS`의 토큰입니다. `BR2_CONFIG`부터 `BASE_DIR`까지는 최상위 `Makefile` 504~510행의 `export`, `CONFIG_DIR`부터 `PARALLEL_JOBS`까지는 `package/Makefile.in` 362행의 `EXTRA_ENV`가 넘깁니다. 매뉴얼 "Customizing the generated target filesystem"이 나열하는 변수(`BR2_CONFIG`, `CONFIG_DIR`, `HOST_DIR`, `STAGING_DIR`, `TARGET_DIR`, `BUILD_DIR`, `BINARIES_DIR`, `BASE_DIR`, `PARALLEL_JOBS`)가 모두 들어왔고, `O`와 `BR2_DL_DIR`은 매뉴얼 목록에는 없지만 `EXTRA_ENV`가 함께 넘깁니다. 같은 절은 `BR2_ROOTFS_POST_SCRIPT_ARGS`가 "also be passed to post-image and post-fakeroot scripts"라고 적습니다. `STAGING_DIR`은 Ch 4에서 본 symlink가 아니라 실제 sysroot 경로로 들어옵니다.

다음은 전형적인 post-build 스크립트입니다.

```bash
#!/bin/sh
# board/acme/edge/post-build.sh
set -e

TARGET_DIR="$1"

# 1. Record the pinned source revision; avoid wall-clock timestamps in the image.
git -C "$BR2_EXTERNAL_ACME_PATH" rev-parse --short HEAD \
    > "$TARGET_DIR/etc/build-revision" 2>/dev/null \
    || echo "unknown" > "$TARGET_DIR/etc/build-revision"

# 2. Generate /etc/issue from a template
sed "s/@VERSION@/$(cat "$TARGET_DIR/etc/build-revision")/" \
    "$BR2_EXTERNAL_ACME_PATH/board/acme/edge/issue.in" \
    > "$TARGET_DIR/etc/issue"

# 3. Remove an init script installed by a package
rm -f "$TARGET_DIR/etc/init.d/S50telnet"
```

권한·소유권은 여기서 바꾸지 않습니다. 실험에서 post-build는 `id: 1000`으로 돌았고, `chown 0:0 etc/hostname`은 다음 메시지로 실패했습니다.

```text
chown: changing ownership of 'etc/hostname': Operation not permitted
```

매뉴얼 "Setting file permissions and ownership"도 같은 이유를 적습니다. "Since the post-build scripts are not run as root, you cannot do such changes from there unless you use an explicit fakeroot from the post-build script."

### post-build vs overlay 구분

- 정적이고 그대로 복사하면 되는 파일 → overlay.
- 빌드 시점에 값을 채워야 하는 파일 → post-build.
- 기존 파일 *삭제* → post-build. overlay는 삭제를 표현할 수 없습니다.
- 소유권·mode·setuid·capability → device table (다음 절).

## device table — 권한과 소유권

권한·소유권은 *device table*로 선언합니다. `BR2_ROOTFS_DEVICE_TABLE`에 여러 파일을 공백으로 나열할 수 있고, 기본값은 `system/device_table.txt`입니다. 그 파일의 머리말과 앞부분입니다.

```text
# This device table is used to assign proper ownership and permissions
# on various files. It doesn't create any device file, as it is used
# in both static device configurations (where /dev/ is static) and in
# dynamic configurations (where devtmpfs, mdev or udev are used).
#
# <name>				<type>	<mode>	<uid>	<gid>	<major>	<minor>	<start>	<inc>	<count>
/dev					d	755	0	0	-	-	-	-	-
/tmp					d	1777	0	0	-	-	-	-	-
/etc					d	755	0	0	-	-	-	-	-
/root					d	700	0	0	-	-	-	-	-
/var/www				d	755	33	33	-	-	-	-	-
/etc/shadow				f	600	0	0	-	-	-	-	-
```

실험에서 보드용 표를 하나 더 붙였습니다.

```text
# <name>	<type>	<mode>	<uid>	<gid>	<major>	<minor>	<start>	<inc>	<count>
/etc/hostname	f	600	0	0	-	-	-	-	-
/opt/acme	d	700	500	500	-	-	-	-	-
/bin/busybox	f	4755	0	0	-	-	-	-	-
|xattr cap_net_raw+ep
```

마지막 `|xattr` 줄은 매뉴얼 "Makedev syntax documentation"에 있는 capability 문법입니다. 처음 빌드는 이 줄에서 멈췄습니다.

```text
makedevs: line 28 not supported: '|xattr cap_net_raw+ep'
Did you forget to enable BR2_ROOTFS_DEVICE_TABLE_SUPPORTS_EXTENDED_ATTRIBUTES?
```

`BR2_ROOTFS_DEVICE_TABLE_SUPPORTS_EXTENDED_ATTRIBUTES=y`를 켜고 다시 `make`해도 같은 오류가 났습니다. `package/makedevs/makedevs.mk`는 이 옵션이 켜졌을 때 `host-libcap`을 의존성에 넣고 `-DEXTENDED_ATTRIBUTES`로 컴파일하는데, `host-makedevs`는 이미 빌드돼 있어 다시 빌드되지 않았기 때문입니다. Ch 1에서 본 매뉴얼 원칙("once a package has been built, it is never rebuilt unless explicitly told to do so") 그대로입니다. `make host-makedevs-dirclean` 뒤 `make`하자 통과했습니다.

device table은 fakeroot 안에서 적용됩니다. 그 결과를 post-fakeroot 스크립트(`id: 0`)가 본 값과 최종 tar 이미지에서 확인했습니다.

```text
== post-fakeroot argv: /home/br/buildroot/output/build/buildroot-fs/ext2/target acme-edge production
id: 0
-rw------- 0:0 etc/hostname
drwx------ 500:500 opt/acme
```

```text
$ tar tvf output/images/rootfs.tar | grep -E "etc/hostname$|opt/acme|bin/busybox$|var/log/acme"
-rwsr-xr-x 0/0          817608 2026-11-16 03:41 ./bin/busybox
-rw------- 0/0              10 2026-11-16 03:04 ./etc/hostname
drwx------ 500/500           0 2026-11-16 03:04 ./opt/acme/
-rw-r--r-- 0/0               0 2026-11-16 03:04 ./opt/acme/.gitkeep
-rwsr-xr-x 0/0               8 2026-11-16 03:04 ./opt/acme/config.json
drwxr-xr-x 0/0               0 2026-11-16 03:04 ./var/log/acme/
```

overlay에서 644로 바뀌었던 `hostname`이 device table대로 600·root가 됐고, `/opt/acme`는 700·500:500입니다. capability는 ext4 이미지에 들어갔습니다.

```text
$ output/host/sbin/debugfs -R "ea_list /bin/busybox" output/images/rootfs.ext2
Extended attributes:
  security.capability (20) = 01 00 00 02 00 20 00 00 00 00 00 00 00 00 00 00 00 00 00 00
```

post-build에서 `chmod`·`chown`으로 하나씩 잡는 것보다 device table이 안전한 이유가 위 두 결과입니다. post-build의 `chown`은 실패하고, 성공한 `chmod`도 이미지 단계의 표가 다시 덮을 수 있습니다.

## BR2_ROOTFS_POST_FAKEROOT_SCRIPT — 이미지마다 한 번

Ch 15에서 깊이 다루지만, 실험 결과 하나는 여기서 짚습니다. post-fakeroot의 첫 인자는 `output/target`이 아니라 `output/build/buildroot-fs/ext2/target`, `…/tar/target`처럼 *포맷별 복사본*이었고, 포맷 수만큼 실행됐습니다. `fs/common.mk`가 이미지마다 `target/`을 `rsync -auH`로 복사한 뒤 fakeroot 스크립트를 만들어 돌리기 때문입니다. 그래서 여기서 바꾼 내용은 `output/target/`에 남지 않고, 모든 이미지에 같은 변경을 넣으려면 스크립트가 포맷마다 같은 결과를 내야 합니다.

## BR2_ROOTFS_POST_IMAGE_SCRIPT — 이미지 조립

마지막 hook입니다. 모든 rootfs 이미지와 커널이 `output/images/`에 모인 *뒤* 호출됩니다. SD 카드 이미지나 업데이트 번들을 조립하는 자리입니다.

```text
BR2_ROOTFS_POST_IMAGE_SCRIPT="$(BR2_EXTERNAL_ACME_PATH)/board/acme/edge/post-image.sh"
BR2_ROOTFS_POST_SCRIPT_ARGS="acme-edge production"
```

실험에서는 QEMU 보드의 원래 스크립트 뒤에 내 스크립트를 공백으로 이어 붙였고, 둘 다 순서대로 실행됐습니다. 받은 인자는 다음과 같습니다.

```text
== post-image argv: /home/br/buildroot/output/images acme-edge production
id: 1000
```

| 인자·변수 | 의미 |
|------|------|
| `$1` | `BINARIES_DIR` (= `output/images`) |
| `$2`, `$3`, … | `BR2_ROOTFS_POST_SCRIPT_ARGS`, 그 뒤 `BR2_ROOTFS_POST_IMAGE_SCRIPT_ARGS`의 토큰 |
| `$BR2_CONFIG`, `$HOST_DIR`, `$TARGET_DIR` 등 | post-build와 같은 export |

`BR2_ROOTFS_POST_SCRIPT_ARGS`는 post-build·post-fakeroot·post-image *모두에* 같은 값으로 넘어갑니다. hook별로 다른 인자가 필요하면 `system/Config.in`의 `BR2_ROOTFS_POST_BUILD_SCRIPT_ARGS`, `_POST_FAKEROOT_SCRIPT_ARGS`, `_POST_IMAGE_SCRIPT_ARGS`를 씁니다. help에 따르면 이 값들은 공통 인자 *뒤에* 붙습니다.

SD 카드 이미지는 보통 `genimage`로 만듭니다. Buildroot는 범용 스크립트 `support/scripts/genimage.sh`를 제공하고, BeagleBone defconfig가 바로 이것을 씁니다.

```text
BR2_ROOTFS_POST_IMAGE_SCRIPT="support/scripts/genimage.sh"
BR2_ROOTFS_POST_SCRIPT_ARGS="-c board/beagleboard/beaglebone/genimage.cfg"
```

이 스크립트의 핵심 부분입니다. `--rootpath`에 `TARGET_DIR` 대신 빈 임시 디렉터리를 주는 이유를 주석이 밝힙니다.

```bash
# Pass an empty rootpath. genimage makes a full copy of the given rootpath to
# ${GENIMAGE_TMP}/root so passing TARGET_DIR would be a waste of time and disk
# space. We don't rely on genimage to build the rootfs image, just to insert a
# pre-built one in the disk image.

trap 'rm -rf "${ROOTPATH_TMP}"' EXIT
ROOTPATH_TMP="$(mktemp -d)"

rm -rf "${GENIMAGE_TMP}"

genimage \
	--rootpath "${ROOTPATH_TMP}"     \
	--tmppath "${GENIMAGE_TMP}"    \
	--inputpath "${BINARIES_DIR}"  \
	--outputpath "${BINARIES_DIR}" \
	--config "${GENIMAGE_CFG}"
```

`GENIMAGE_TMP`는 스크립트 앞부분에서 `${BUILD_DIR}/genimage.tmp`로 정해집니다. `BR2_PACKAGE_HOST_BMAP_TOOLS=y`면 이미지마다 `.bmap`도 만듭니다. 직접 post-image 스크립트를 쓸 때도 이 스크립트를 호출하거나 같은 방식(빈 rootpath)을 따르는 편이 낫습니다.

`board/beagleboard/beaglebone/genimage.cfg`의 실제 내용입니다(`files` 목록 일부 생략).

```text
image boot.vfat {
	vfat {
		files = {
			"MLO",
			"u-boot.img",
			"zImage",
			"uEnv.txt",
			...
			"am335x-boneblack.dtb",
			...
			"extlinux"
		}
	}

	size = 16M
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
		image = "rootfs.ext4"
		size = 512M
	}
}
```

`uEnv.txt`와 `extlinux/extlinux.conf`는 rootfs가 아니라 boot 파티션에 들어가야 하므로, 이 보드의 post-build 스크립트가 `BINARIES_DIR`로 복사해 둡니다.

```bash
cp "${BOARD_DIR}/uEnv.txt" "${BINARIES_DIR}/uEnv.txt"

install -m 0644 -D "${BOARD_DIR}/extlinux.conf" "${BINARIES_DIR}/extlinux/extlinux.conf"
```

이 구성으로 만든 `sdcard.img`를 실제로 빌드해 파티션을 확인하는 흐름은 [Ch 10](/blog/embedded/buildroot/chapter10-real-board)에서 다룹니다.

## 세 hook을 모두 사용하는 보드 트리

종합 예시입니다. ACME edge 보드의 트리 구성입니다.

```text
br2-acme/
└── board/acme/edge/
    ├── rootfs-overlay/
    │   ├── etc/hostname
    │   ├── etc/init.d/S99acme
    │   ├── opt/acme/config.json
    │   └── var/log/acme/.empty
    ├── device_table.txt
    ├── issue.in
    ├── post-build.sh
    ├── post-fakeroot.sh
    ├── post-image.sh
    └── genimage.cfg
```

defconfig 발췌입니다.

```text
BR2_ROOTFS_OVERLAY="$(BR2_EXTERNAL_ACME_PATH)/board/acme/edge/rootfs-overlay"
BR2_ROOTFS_POST_BUILD_SCRIPT="$(BR2_EXTERNAL_ACME_PATH)/board/acme/edge/post-build.sh"
BR2_ROOTFS_POST_IMAGE_SCRIPT="support/scripts/genimage.sh"
BR2_ROOTFS_POST_SCRIPT_ARGS="-c $(BR2_EXTERNAL_ACME_PATH)/board/acme/edge/genimage.cfg"
BR2_ROOTFS_DEVICE_TABLE="system/device_table.txt $(BR2_EXTERNAL_ACME_PATH)/board/acme/edge/device_table.txt"
BR2_PACKAGE_HOST_GENIMAGE=y
```

각 파일이 어떤 defconfig 옵션으로 참조되는지 그림으로 보면 다음과 같습니다.

![보드 디렉터리 파일과 참조 옵션 매핑](/images/blog/buildroot/diagrams/chapter07-board-tree.svg)

## Troubleshooting

### overlay의 파일이 안 들어간다

가장 흔한 원인은 *경로*입니다. `BR2_ROOTFS_OVERLAY`가 가리키는 디렉터리 *바로 아래*가 rootfs의 `/`로 매핑됩니다. `rootfs-overlay/etc/hostname`은 `/etc/hostname`이 되지만, `rootfs-overlay/rootfs/etc/hostname`처럼 한 단계 더 감싸면 `/rootfs/etc/hostname`이 됩니다. `make` 출력의 `Copying overlay <경로>` 줄에서 실제로 복사한 디렉터리를 확인합니다.

### overlay 파일의 권한이 바뀌었다

위 실험처럼 `--chmod=u=rwX,go=rX`로 정규화됩니다. 600·700 같은 제한 권한과 root 이외 소유자는 device table로 지정합니다.

### post-build 스크립트가 실행되지 않는다

실행 권한(`chmod +x`), shebang(`#!/bin/sh`), defconfig의 경로를 확인합니다. defconfig를 고쳤다면 `make <board>_defconfig` 또는 `make olddefconfig`로 `.config`에 반영해야 합니다.

### post-image에서 `genimage`가 없다고 한다

`BR2_PACKAGE_HOST_GENIMAGE=y`가 빠졌습니다. post-image 스크립트는 `PATH` 앞에 `output/host/bin`이 붙은 상태로 실행되므로(`EXTRA_ENV`의 `PATH=$(BR_PATH)`), host 패키지를 켜면 이름만으로 부를 수 있습니다.

### 한 번 빌드한 뒤 overlay만 바꿔 다시 빌드하고 싶다

`make`를 한 번 더 돌리면 됩니다. Ch 4에서 본 것처럼 변경 없는 `make`도 `Finalizing target directory`부터 post-image까지 매번 다시 실행하므로 overlay 복사, post-build, 이미지 생성이 모두 다시 돕니다. 그래서 세 스크립트는 여러 번 실행해도 같은 결과가 나오도록(멱등하게) 작성합니다.

### overlay에서 지운 파일이 이미지에 남는다

overlay는 `output/target/`에 *덮어쓰기만* 합니다. overlay에서 파일을 지워도 이전 빌드가 `output/target/`에 복사해 둔 파일은 그대로 있습니다. 이 실험 뒤 다른 overlay로 바꿨을 때도 이전 파일이 남아 있어 손으로 지워야 했습니다. 깨끗하게 하려면 `make clean all`로 다시 빌드합니다.

## 정리

- 실제 실행 순서는 overlay 복사 → post-build → (이미지마다) fakeroot + device table → post-fakeroot → post-image였습니다.
- overlay는 `rsync -a --chmod=u=rwX,go=rX`로 복사됩니다. 600이 644로 바뀌고, setuid는 남고, `.empty`·`*~`·VCS 디렉터리는 빠지고, `.gitkeep`은 남습니다.
- post-build는 `TARGET_DIR`과 `BR2_ROOTFS_POST_SCRIPT_ARGS`를 받고 빌드 사용자로 돌아 `chown`이 실패합니다.
- 권한·소유권·capability는 device table로 지정하며, `|xattr`은 `BR2_ROOTFS_DEVICE_TABLE_SUPPORTS_EXTENDED_ATTRIBUTES`와 `host-makedevs` 재빌드가 필요했습니다.
- post-fakeroot는 포맷별 복사본에서 포맷 수만큼 돌고, post-image는 `BINARIES_DIR`을 받습니다.
- `support/scripts/genimage.sh`는 빈 rootpath로 genimage를 불러 미리 만든 rootfs 이미지를 디스크 이미지에 넣습니다.
- 모든 hook은 매 `make`마다 다시 실행되므로 멱등하게 작성합니다.

## 다음 장 예고

다음 편은 **Ch 8: 출력 파일시스템 — initramfs, squashfs, ext4, cpio**.


## 관련 항목

- [Ch 6: 외부 트리 — BR2_EXTERNAL](/blog/embedded/buildroot/chapter06-br2-external)
- [Ch 8: 출력 파일시스템 — initramfs, squashfs, ext4, cpio](/blog/embedded/buildroot/chapter08-filesystems)
- [Ch 10: 실전 — BeagleBone Black 시스템 처음부터 끝까지](/blog/embedded/buildroot/chapter10-real-board)
- [Ch 15: post-build·post-image 심화](/blog/embedded/buildroot/chapter15-post-build-deep) — post-fakeroot와 fakeroot 한계
- [원문 — Buildroot Manual: Customizing the generated target filesystem](https://buildroot.org/downloads/manual/manual.html#rootfs-custom)
- [genimage README](https://github.com/pengutronix/genimage)
