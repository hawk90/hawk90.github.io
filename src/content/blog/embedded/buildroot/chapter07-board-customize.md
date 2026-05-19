---
title: "Ch 7: 보드 customize — overlay, post-build, post-image"
date: 2026-05-19T07:00:00
description: "보드별 파일 추가, 빌드 후 처리, 이미지 생성 후 처리 — 세 가지 hook."
series: "Buildroot Practical"
seriesOrder: 7
tags: [embedded, buildroot, overlay, post-build, post-image]
draft: false
---

## 한 줄 요약

> **"패키지로 풀 수 없는 보드별 차이는 세 가지 hook으로 해결한다."** — overlay는 *파일 복사*, post-build는 *rootfs 수정*, post-image는 *flash 이미지 조립*입니다.

Buildroot는 패키지 시스템이 강력하지만, 실제 보드에는 항상 *패키지로 풀기 애매한 차이*가 남습니다. 한 줄짜리 `/etc/hostname`, 보드별 `/etc/network/interfaces`, MAC 주소를 박는 udev rule, 마지막에 `dd`로 SD 카드 이미지를 만드는 절차 같은 것들입니다.

이 장은 그 빈틈을 메우는 세 hook을 다룹니다. `BR2_ROOTFS_OVERLAY`, `BR2_ROOTFS_POST_BUILD_SCRIPT`, `BR2_ROOTFS_POST_IMAGE_SCRIPT`. 셋 다 *defconfig에 한 줄씩* 적는 단순한 메커니즘이지만, 잘 쓰면 보드 패키지를 따로 만들 필요가 거의 사라집니다.

## 세 hook의 위치

빌드 흐름에서 셋이 어디에 끼는지부터 정리합니다.

```text
toolchain build
        │
        ▼
package build  (cross-compile + install to $(TARGET_DIR))
        │
        ▼
BR2_ROOTFS_OVERLAY      ← 디렉터리 트리를 그대로 복사
        │
        ▼
BR2_ROOTFS_POST_BUILD_SCRIPT  ← $(TARGET_DIR)를 마지막으로 수정
        │
        ▼
fakeroot + rootfs format 생성 (ext4, squashfs, ...)
        │
        ▼
BR2_ROOTFS_POST_IMAGE_SCRIPT  ← .img·.tar 등이 만들어진 뒤
        │
        ▼
output/images/  완성
```

| Hook | 시점 | 수정 대상 | 전형적 용도 |
|------|------|----------|------------|
| `BR2_ROOTFS_OVERLAY` | 패키지 install 직후 | `$(TARGET_DIR)` 트리 | 보드별 conf 파일 추가 |
| `BR2_ROOTFS_POST_BUILD_SCRIPT` | overlay 직후, fakeroot 직전 | `$(TARGET_DIR)` 트리 | 동적 콘텐츠 생성, 권한 조정 |
| `BR2_ROOTFS_POST_IMAGE_SCRIPT` | 모든 이미지 생성 직후 | `output/images/` | flash 이미지 조립, SD 카드 layout |

## BR2_ROOTFS_OVERLAY — 파일 트리 복사

가장 단순한 hook입니다. 디렉터리 하나를 가리키면 그 안의 모든 파일이 *그대로* `$(TARGET_DIR)`로 복사됩니다. rsync 한 줄과 같다고 보면 됩니다.

defconfig에 다음 한 줄을 추가합니다.

```text
BR2_ROOTFS_OVERLAY="$(BR2_EXTERNAL_ACME_PATH)/board/acme/edge/rootfs-overlay"
```

디렉터리는 *target rootfs의 루트 기준*으로 구성합니다.

```text
board/acme/edge/rootfs-overlay/
├── etc/
│   ├── hostname
│   ├── motd
│   ├── network/
│   │   └── interfaces
│   └── init.d/
│       └── S99acme
└── opt/
    └── acme/
        └── config.json
```

위 트리는 빌드 후 `$(TARGET_DIR)/etc/hostname` 등으로 정확히 그 위치에 복사됩니다. 권한도 *overlay 디렉터리의 권한 그대로* 유지됩니다. 따라서 `S99acme` 같은 init 스크립트는 `chmod +x`로 미리 실행 권한을 줘 두어야 합니다.

### Overlay의 함정

세 가지가 자주 발생합니다.

**1. 패키지 install이 overlay를 덮는 게 아니라, overlay가 패키지 install을 덮는다.** 같은 경로 파일이 둘 다 있으면 overlay가 이깁니다. `/etc/inittab`을 overlay에 넣으면 busybox가 설치한 기본 `inittab`을 덮어씁니다.

**2. Symlink는 의도대로 들어간다.** overlay의 symlink는 `cp -a`로 복사되므로 *링크 자체*가 보존됩니다. 절대 경로 symlink면 target에서도 절대 경로로 평가됩니다.

**3. 빈 디렉터리도 복사된다.** `/var/log/acme`처럼 빈 디렉터리만 필요하면 overlay에 빈 디렉터리를 두면 됩니다. 단 `.gitkeep` 같은 placeholder가 그대로 rootfs에 남으니 주의합니다.

### 여러 overlay 합치기

`BR2_ROOTFS_OVERLAY`는 공백으로 구분된 *여러 디렉터리*를 받습니다.

```text
BR2_ROOTFS_OVERLAY="$(BR2_EXTERNAL_ACME_PATH)/board/common/rootfs-overlay \
                    $(BR2_EXTERNAL_ACME_PATH)/board/acme/edge/rootfs-overlay"
```

뒤에 오는 overlay가 앞 overlay를 덮어씁니다. *공통 → 보드 → 변형* 순으로 쌓는 패턴이 흔합니다.

## BR2_ROOTFS_POST_BUILD_SCRIPT — 마지막 수정

overlay로 안 되는 것이 있습니다. *빌드 시점에 값이 정해지는* 파일들입니다. 빌드 날짜, git hash, 자동 생성된 conf, 권한 조정 같은 것들입니다.

defconfig에 다음을 추가합니다.

```text
BR2_ROOTFS_POST_BUILD_SCRIPT="$(BR2_EXTERNAL_ACME_PATH)/board/acme/edge/post-build.sh"
```

스크립트는 *첫 인자로 `$(TARGET_DIR)` 절대 경로*를 받습니다. 추가 환경 변수도 풍부합니다.

| 변수 | 의미 |
|------|------|
| `$1` | `$(TARGET_DIR)` 절대 경로 |
| `$BR2_CONFIG` | `.config` 파일의 절대 경로 |
| `$HOST_DIR` | host 도구 디렉터리 |
| `$STAGING_DIR` | staging 디렉터리 (target sysroot) |
| `$BUILD_DIR` | 패키지 빌드 디렉터리 |
| `$BINARIES_DIR` | `output/images/` |
| `$BASE_DIR` | `output/` |

전형적인 post-build 스크립트입니다.

```bash
#!/bin/sh
# board/acme/edge/post-build.sh
# Called after rootfs assembly, before fakeroot/image creation.

set -e

TARGET_DIR="$1"

# 1. Build-time stamp
date +"%Y-%m-%d %H:%M:%S" > "$TARGET_DIR/etc/build-date"
git -C "$BR2_EXTERNAL_ACME_PATH" rev-parse --short HEAD \
    > "$TARGET_DIR/etc/build-revision" 2>/dev/null || echo "unknown" \
    > "$TARGET_DIR/etc/build-revision"

# 2. Adjust permissions for SUID binaries
chmod 4755 "$TARGET_DIR/usr/bin/acme-fw"

# 3. Generate /etc/issue from template
sed "s/@VERSION@/$(cat "$TARGET_DIR/etc/build-revision")/" \
    "$BR2_EXTERNAL_ACME_PATH/board/acme/edge/issue.in" \
    > "$TARGET_DIR/etc/issue"

# 4. Remove unwanted files
rm -f "$TARGET_DIR/etc/init.d/S40network"   # we use systemd-networkd

# 5. Strip world-write from /tmp template (kept by busybox install)
chmod 1777 "$TARGET_DIR/tmp"
```

### post-build vs overlay 구분

자주 헷갈리는 지점입니다. 규칙은 단순합니다.

- *정적*이고 *그대로 복사*하면 되는 파일 → overlay.
- 빌드 시점에 *값을 채워야* 하는 파일 → post-build.
- *권한 조정*은 post-build에서. overlay에서 mode를 강제할 방법이 없습니다.
- *기존 파일 삭제*는 post-build에서. overlay는 삭제를 표현할 수 없습니다.

### Owner/Permission 표 — device table

권한·소유권을 *체계적으로* 관리하려면 *device table*을 사용합니다. defconfig에서 `BR2_ROOTFS_DEVICE_TABLE`을 가리킵니다.

```text
BR2_ROOTFS_DEVICE_TABLE="system/device_table.txt $(BR2_EXTERNAL_ACME_PATH)/board/acme/edge/device_table.txt"
```

테이블 형식은 다음과 같습니다.

```text
#<name>                <type>  <mode>  <uid>  <gid>  <major>  <minor>  <start>  <inc>  <count>
/etc/shadow             f       600     0       0       -       -       -       -       -
/opt/acme               d       755     0       0       -       -       -       -       -
/opt/acme/private       d       700     500     500     -       -       -       -       -
/dev/acme0              c       660     0       100     250     0       -       -       -
```

`fakeroot` 단계에서 적용되므로 *최종 image*에 반영됩니다. post-build에서 `chmod`로 일일이 잡는 것보다 device table이 훨씬 안전합니다.

## BR2_ROOTFS_POST_IMAGE_SCRIPT — 이미지 조립

마지막 hook입니다. 모든 rootfs 형식과 부트로더·커널이 `output/images/`에 모인 *뒤* 호출됩니다. *SD 카드 이미지*나 *OTA 패키지*를 조립하는 자리입니다.

defconfig에 다음을 추가합니다.

```text
BR2_ROOTFS_POST_IMAGE_SCRIPT="$(BR2_EXTERNAL_ACME_PATH)/board/acme/edge/post-image.sh"
BR2_ROOTFS_POST_SCRIPT_ARGS="acme-edge"
```

`BR2_ROOTFS_POST_SCRIPT_ARGS`는 두 hook(post-build, post-image) *모두에* 전달되는 추가 인자입니다. 보드 식별자나 production/dev 플래그를 넘기는 용도로 씁니다.

post-image 스크립트의 인자·변수입니다.

| 변수 | 의미 |
|------|------|
| `$1` | `$BINARIES_DIR` (= `output/images/`) |
| `$2`, `$3`, ... | `BR2_ROOTFS_POST_SCRIPT_ARGS`의 토큰들 |
| `$BR2_CONFIG` | `.config` 절대 경로 |
| `$HOST_DIR` | host 도구 디렉터리 |
| `$TARGET_DIR` | target rootfs (read-only로 보세요) |

전형적인 SD 카드 이미지 조립 스크립트입니다. `genimage`를 호출하는 형태가 표준입니다.

```bash
#!/bin/sh
# board/acme/edge/post-image.sh
# Assemble final flashable SD card image from output/images/.

set -e

BINARIES_DIR="$1"
BOARD_NAME="$2"

GENIMAGE_CFG="$BR2_EXTERNAL_ACME_PATH/board/acme/edge/genimage.cfg"
GENIMAGE_TMP="$BINARIES_DIR/genimage.tmp"

rm -rf "$GENIMAGE_TMP"

genimage \
    --rootpath "$TARGET_DIR" \
    --tmppath "$GENIMAGE_TMP" \
    --inputpath "$BINARIES_DIR" \
    --outputpath "$BINARIES_DIR" \
    --config "$GENIMAGE_CFG"

# Compress final image
gzip -kf "$BINARIES_DIR/sdcard.img"

echo "[post-image] sdcard.img.gz ready: $(du -h "$BINARIES_DIR/sdcard.img.gz" | cut -f1)"
```

`genimage`는 Buildroot가 자동으로 host에 빌드해 주는 도구입니다(`BR2_PACKAGE_HOST_GENIMAGE=y`로 활성화). `genimage.cfg`는 다음과 같이 생겼습니다.

```text
image boot.vfat {
    vfat {
        files = {
            "MLO",
            "u-boot.img",
            "zImage",
            "am335x-boneblack.dtb",
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
        image = "rootfs.ext4"
        size = 512M
    }
}
```

이 구성으로 만들어진 `sdcard.img`는 그대로 `dd if=sdcard.img of=/dev/sdX`로 SD에 굽습니다. 자세한 SD 굽기 흐름은 [Ch 10: 실전 — BeagleBone Black](/blog/embedded/buildroot/chapter10-real-board)에서 다룹니다.

## 세 hook을 모두 사용하는 보드 트리

종합 예시입니다. ACME edge 보드의 전체 트리 구성입니다.

```text
br2-acme/
└── board/acme/edge/
    ├── rootfs-overlay/
    │   ├── etc/
    │   │   ├── hostname              # "acme-edge\n"
    │   │   ├── motd                  # ASCII banner
    │   │   └── network/interfaces
    │   └── opt/acme/config.json
    │
    ├── device_table.txt              # SUID, /opt/acme private dir
    ├── issue.in                      # template with @VERSION@
    ├── post-build.sh                 # build-date, revision, sed
    ├── post-image.sh                 # genimage → sdcard.img
    └── genimage.cfg                  # partition layout
```

defconfig 발췌입니다.

```text
BR2_ROOTFS_OVERLAY="$(BR2_EXTERNAL_ACME_PATH)/board/acme/edge/rootfs-overlay"
BR2_ROOTFS_POST_BUILD_SCRIPT="$(BR2_EXTERNAL_ACME_PATH)/board/acme/edge/post-build.sh"
BR2_ROOTFS_POST_IMAGE_SCRIPT="$(BR2_EXTERNAL_ACME_PATH)/board/acme/edge/post-image.sh"
BR2_ROOTFS_POST_SCRIPT_ARGS="acme-edge production"
BR2_ROOTFS_DEVICE_TABLE="system/device_table.txt $(BR2_EXTERNAL_ACME_PATH)/board/acme/edge/device_table.txt"
BR2_PACKAGE_HOST_GENIMAGE=y
```

## Troubleshooting

### overlay의 파일이 안 들어간다

가장 흔한 원인은 *path*입니다. overlay 루트의 직접 자식이 `etc`인지, `rootfs-overlay`인지 확인합니다. `BR2_ROOTFS_OVERLAY`가 가리키는 디렉터리 *바로 아래*가 rootfs의 `/`로 매핑됩니다.

```text
$ ls -la $(BR2_EXTERNAL_ACME_PATH)/board/acme/edge/rootfs-overlay
drwxr-xr-x  etc/   ← 이게 맞음
drwxr-xr-x  opt/

# 아니라
drwxr-xr-x  rootfs/   ← 이러면 /rootfs/etc/... 로 들어감
```

### post-build 스크립트가 실행되지 않는다

세 가지를 확인합니다. 실행 권한(`chmod +x`), shebang(`#!/bin/sh`), 그리고 *defconfig의 경로*. defconfig를 수정한 뒤에 `make olddefconfig` 또는 `savedefconfig`를 거쳐야 빌드에 반영됩니다.

### post-image에서 `genimage`가 없다고 한다

`BR2_PACKAGE_HOST_GENIMAGE=y`가 빠졌습니다. defconfig에 추가하고 다시 빌드합니다. host 패키지는 *target 빌드를 시작하기 전에* 준비되므로 한 번 활성화하면 매번 자동으로 갖춰집니다.

### 한 번 빌드한 뒤 overlay만 바꿔 다시 빌드하고 싶다

`make` 한 번만 다시 돌리면 됩니다. 패키지가 모두 빌드되어 있으면 *rootfs assembly만* 다시 수행합니다. 더 명시적으로는 `make target-finalize`로 fakeroot 단계만 다시 돌릴 수 있습니다.

```text
$ make target-finalize
$ make
```

post-build·post-image도 매 `make`마다 실행됩니다. 멱등(idempotent)하게 작성하는 것이 중요합니다.

### `BR2_ROOTFS_POST_SCRIPT_ARGS`가 post-image에 안 넘어간다

인자는 두 hook *모두에* 같은 값으로 넘어갑니다. post-image에서는 `$1`이 `$BINARIES_DIR`이므로 사용자 인자는 `$2`부터 시작합니다. post-build에서는 `$1`이 `$TARGET_DIR`이고 `$2`부터 사용자 인자입니다.

## 정리

- 세 hook은 *어떤 시점*에 *어떤 대상*을 수정하는지에 따라 구분됩니다.
- `BR2_ROOTFS_OVERLAY`는 정적 파일 트리 복사. 권한·삭제는 표현 불가.
- `BR2_ROOTFS_POST_BUILD_SCRIPT`는 `$(TARGET_DIR)` 마지막 수정. 빌드 정보 주입, 권한 조정, 파일 삭제.
- `BR2_ROOTFS_POST_IMAGE_SCRIPT`는 `output/images/`에서 flash 이미지 조립. `genimage`가 표준 도구.
- 권한·SUID·디바이스 노드는 `BR2_ROOTFS_DEVICE_TABLE`로 일괄 관리합니다.
- 모든 경로는 `$(BR2_EXTERNAL_<NAME>_PATH)` 기준으로 표기합니다.
- 세 스크립트는 *매 빌드마다* 실행되므로 멱등하게 작성합니다.

다음 편은 **Ch 8: 출력 파일시스템 — initramfs, squashfs, ext4, cpio**.

## 관련 항목

- [Ch 6: 외부 트리 — BR2_EXTERNAL](/blog/embedded/buildroot/chapter06-br2-external)
- [Ch 8: 출력 파일시스템 — initramfs, squashfs, ext4, cpio](/blog/embedded/buildroot/chapter08-filesystems)
- [Ch 10: 실전 — BeagleBone Black 시스템 처음부터 끝까지](/blog/embedded/buildroot/chapter10-real-board)
- [원문 — Buildroot Manual: Customization](https://buildroot.org/downloads/manual/manual.html#customize)
- [genimage README](https://github.com/pengutronix/genimage)
