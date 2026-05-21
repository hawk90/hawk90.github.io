---
title: "Ch 8: 출력 파일시스템 — initramfs, squashfs, ext4, cpio"
date: 2026-05-19T08:00:00
description: "Buildroot가 생성하는 파일시스템 형식 비교 — 언제 무엇을, 크기·읽기성능·쓰기 가능성."
series: "Buildroot Practical"
seriesOrder: 8
tags: [embedded, buildroot, rootfs, ext4, squashfs, initramfs]
draft: false
---

## 한 줄 요약

> **"어떤 rootfs 포맷을 고르는지가 곧 제품의 *업데이트 전략*과 *수명*을 결정한다."** — Buildroot는 한 빌드에서 여러 포맷을 동시에 만들 수 있지만, *런타임 정책*은 처음부터 정해야 합니다.

Buildroot로 첫 시스템을 만들 때 대부분 ext4 한 가지만 활성화합니다. 잘 동작하니 그 상태로 production까지 갑니다. 그러다 *현장에서 갑자기 전원이 끊겼을 때 부팅이 안 됨*이라는 이슈가 한 달 뒤에 들어옵니다.

이 장은 그 문제를 *처음부터 막는* 관점에서 rootfs 포맷 네 가지를 비교합니다. 각각이 어떤 비용을 치르고 어떤 장점을 주는지, 그리고 실무에서 가장 많이 쓰이는 *read-only + overlayfs* 패턴을 어떻게 구성하는지 정리합니다.

## 네 포맷의 한눈 비교

| 포맷 | 압축 | 쓰기 가능 | 부팅 위치 | 전원 끊김 내성 | 전형적 크기 |
|------|------|---------|----------|--------------|------------|
| **initramfs** | gzip/xz | RAM | RAM에 fully loaded | 무관 (RAM) | 5~30MB |
| **cpio** | 없음(원본) | 형식상 가능 | initramfs 재료 | 무관 | initramfs 참고 |
| **squashfs** | zstd/xz/gzip | 불가 (read-only) | 디스크/flash mount | 강함 (RO) | ext4 대비 40~60% |
| **ext4** | 없음 | 가능 | 디스크/flash mount | 약함 (저널 필요) | 원본 크기 |

크기 예시는 대략적입니다. 같은 rootfs (BusyBox + libc + 작은 데몬 몇 개)를 기준으로 한 측정값에 가깝습니다.

| 같은 rootfs (62MB 원본) | 결과 크기 |
|-----------------------|-----------|
| `rootfs.tar` (압축 안 함) | 62MB |
| `rootfs.cpio.gz` | 23MB |
| `rootfs.cpio.xz` | 16MB |
| `rootfs.ext4` (8% reserved) | 80MB |
| `rootfs.squashfs` (gzip) | 27MB |
| `rootfs.squashfs` (xz) | 19MB |
| `rootfs.squashfs` (zstd, level 19) | 21MB |

이 표가 결정의 80%를 정해 줍니다. *작고 압축률 좋고 read-only*가 squashfs, *작고 RAM에만 살면 됨*이 initramfs, *쓰기 필요*가 ext4입니다.

## initramfs — RAM에 사는 rootfs

initramfs는 *cpio 아카이브를 부트 시점에 압축 해제해 RAM에 펼친* 파일시스템입니다. Linux 커널이 마운트하는 것이 아니라 *커널 안에 내장된 rootfs 메커니즘*이 직접 가져옵니다.

Buildroot에서는 다음 옵션으로 활성화합니다.

```text
BR2_TARGET_ROOTFS_CPIO=y
BR2_TARGET_ROOTFS_CPIO_GZIP=y       # 또는 XZ, ZSTD
BR2_TARGET_ROOTFS_INITRAMFS=y       # 커널에 내장
```

`BR2_TARGET_ROOTFS_INITRAMFS=y`를 켜면 cpio가 *커널 이미지에 포함*됩니다. `zImage`/`Image` 하나만 flash하면 됩니다. 부트로더가 별도의 rootfs를 로드할 필요가 없습니다.

initramfs의 장점은 압도적입니다.

- 전원 끊김에 *무관*. 다음 부팅에서 깨끗한 상태로 시작합니다.
- 부트 직후 모든 파일이 *RAM 캐시*에 있어 read 성능이 빠릅니다.
- update 흐름이 단순합니다. 커널 한 파일만 교체하면 끝입니다.

단점도 명확합니다.

- *RAM을 영구적으로 소비*합니다. 30MB rootfs면 30MB RAM이 사라집니다.
- 쓰기는 모두 *휘발성*입니다. 재부팅하면 사라집니다.
- *큰 rootfs*에는 부적합합니다. 50MB가 넘어가면 부담스럽습니다.

전형적 용도는 *복구 시스템*, *공장 검사 펌웨어*, *부트 중간 단계의 minimal env* 같은 것들입니다. 메인 production rootfs로는 작은 임베디드 시스템에서만 적합합니다.

## cpio — initramfs의 재료

`BR2_TARGET_ROOTFS_CPIO`만 켜고 `BR2_TARGET_ROOTFS_INITRAMFS`를 끄면, Buildroot는 `rootfs.cpio.gz`(또는 xz/zstd)를 *독립 파일*로 만듭니다. 이건 *외부 initramfs*로 쓰이거나, 커널을 별도 빌드할 때 `CONFIG_INITRAMFS_SOURCE`로 주입됩니다.

```text
$ ls output/images/
Image  rootfs.cpio.gz  rootfs.tar
```

U-Boot에서 다음과 같이 부팅합니다.

```text
=> tftp 0x82000000 Image
=> tftp 0x88000000 rootfs.cpio.gz
=> booti 0x82000000 0x88000000 ${fdt_addr_r}
```

`booti`/`bootz`의 두 번째 인자가 initramfs입니다. 커널은 이 cpio를 압축 해제해 rootfs로 사용합니다.

cpio는 *형식상* 쓰기가 가능하지만, 실제로는 initramfs로 마운트된 *tmpfs*에 쓰는 것이지 cpio 파일 자체를 수정하는 게 아닙니다.

## squashfs — read-only 압축

squashfs는 *압축된 read-only* 파일시스템입니다. mount 시점에 압축이 풀리는 게 아니라, *read할 때마다* 블록 단위로 압축이 풀립니다. CPU를 약간 더 쓰는 대신 *flash 크기를 40~60% 줄여 줍니다*.

```text
BR2_TARGET_ROOTFS_SQUASHFS=y
BR2_TARGET_ROOTFS_SQUASHFS4_ZSTD=y    # gzip < xz < zstd 권장
```

압축 방식 비교입니다. 같은 rootfs 기준으로 *추정*값입니다.

| 알고리즘 | 크기 | 압축 시간 | 압축 해제 속도 |
|----------|-----|-----------|--------------|
| gzip | 27MB | 빠름 | 빠름 |
| lzo | 28MB | 매우 빠름 | 매우 빠름 |
| xz | 19MB | 느림 | 보통 |
| zstd | 21MB | 보통 | 매우 빠름 |

*제품용*이라면 zstd가 대부분 정답입니다. 압축률이 xz에 근접하고, 해제는 lzo급으로 빠릅니다. 부팅 시간 차이가 체감될 만큼 큽니다.

### 왜 read-only인가

squashfs는 쓰기를 지원하지 않습니다. 이게 단점이 아니라 *기능*입니다. read-only면 다음이 자동으로 보장됩니다.

- 전원 끊김에 손상되지 않는다. 디스크 상태가 변할 일이 없다.
- 마운트가 항상 깨끗하다. `fsck`가 필요 없다.
- 보안 검사가 단순하다. squashfs hash를 검증하면 끝.

문제는 *쓰기가 필요한 곳*입니다. `/var/log`, `/etc`, `/home`. 이건 overlayfs로 해결합니다.

## ext4 — 쓰기 가능, 그러나 위험

ext4는 *쓰기 가능*하고 *저널*이 있어 전원 끊김에 *어느 정도* 견딥니다. *어느 정도*가 문제입니다. 저널이 보장하는 것은 *파일시스템 메타데이터의 일관성*뿐, 사용자 데이터까지는 아닙니다.

```text
BR2_TARGET_ROOTFS_EXT2=y
BR2_TARGET_ROOTFS_EXT2_4=y          # = ext4
BR2_TARGET_ROOTFS_EXT2_SIZE="512M"
BR2_TARGET_ROOTFS_EXT2_INODES=0     # 0 = mkfs.ext4 default
BR2_TARGET_ROOTFS_EXT2_RESBLKS=5    # 5% reserved for root
```

`BR2_TARGET_ROOTFS_EXT2_SIZE`는 *최종 이미지 크기*입니다. 빈 공간을 미리 잡아 둡니다. SD 카드를 다 채우려면 부팅 첫 회에 `resize2fs`로 확장합니다.

ext4의 *5% reserved*는 root 사용자 전용 예약 영역입니다. 디스크가 가득 차도 root가 로그를 쓸 수 있게 합니다. 임베디드에서는 1~2%로 줄이는 게 일반적입니다(`BR2_TARGET_ROOTFS_EXT2_RESBLKS=1`).

ext4의 실제 위험은 *journal 자체*가 아니라 *application의 쓰기 패턴*에 있습니다. SQLite, log rotation, config 파일 수정처럼 *partial write*가 일어나는 자리에서 전원이 끊기면 *내용물이 깨집니다*. 저널은 파일시스템을 살릴 뿐, 파일을 살리지는 않습니다.

이 문제를 푸는 길은 두 가지입니다. *application 수준에서 atomic write*를 강제하거나, 아예 *rootfs를 read-only로 만드는 것*입니다. 후자가 훨씬 안전합니다.

## Read-only rootfs + overlayfs — 실무 표준 패턴

가장 권장되는 production 패턴입니다. *rootfs는 squashfs(또는 ext4 ro mount)*로 두고, *쓰기 필요한 디렉터리만 overlayfs로 노출*합니다.

### 구조

```text
/                 ← squashfs (read-only)
  /etc            ← overlay 마운트
  /var            ← overlay 마운트
  /home           ← overlay 마운트
  /tmp            ← tmpfs

overlay 백업 저장:
  /data/overlay/etc        ← ext4 또는 jffs2 partition
  /data/overlay/var
  /data/overlay/home
```

부팅 흐름:

1. 부트로더가 squashfs를 `/`로 마운트 (read-only).
2. init 초반에 *data 파티션*을 `/data`에 ext4로 마운트.
3. `/data/overlay/etc`를 upper로, `/etc`(squashfs)를 lower로 overlayfs 마운트.
4. 결과: `/etc`는 *읽기 가능 + 쓰기 가능*. 변경분은 `/data`에 저장됨.

### Buildroot 설정

```text
# Read-only rootfs base
BR2_TARGET_ROOTFS_SQUASHFS=y
BR2_TARGET_ROOTFS_SQUASHFS4_ZSTD=y

# Optional: also build ext4 for data partition (we'll mkfs on first boot)
BR2_TARGET_ROOTFS_EXT2=y
BR2_TARGET_ROOTFS_EXT2_4=y
BR2_TARGET_ROOTFS_EXT2_LABEL="data"
BR2_TARGET_ROOTFS_EXT2_SIZE="64M"

# overlay support in kernel (in linux fragment)
# CONFIG_OVERLAY_FS=y
```

### init 스크립트 (initscripts 패키지)

`/etc/init.d/S01overlay` 같은 자리에 둡니다. overlay에 들어가야 하므로 *base rootfs* 안에 있어야 합니다.

```bash
#!/bin/sh
# /etc/init.d/S01overlay
# Mount data partition and overlay writable directories.

set -e

DATA_DEV=/dev/mmcblk0p3
DATA_MNT=/data

case "$1" in
    start)
        # 1. Ensure data partition exists; format on first boot
        if ! blkid "$DATA_DEV" | grep -q ext4; then
            mkfs.ext4 -L data "$DATA_DEV"
        fi

        mkdir -p "$DATA_MNT"
        mount -t ext4 "$DATA_DEV" "$DATA_MNT"

        for d in etc var home; do
            UPPER="$DATA_MNT/overlay/$d"
            WORK="$DATA_MNT/overlay/.$d.work"
            mkdir -p "$UPPER" "$WORK"
            mount -t overlay overlay \
                -o lowerdir=/$d,upperdir=$UPPER,workdir=$WORK \
                /$d
        done
        ;;
    stop)
        umount /etc /var /home /data 2>/dev/null || true
        ;;
esac
```

이 패턴의 장점은 다음과 같습니다.

- *base rootfs*는 squashfs라 절대 손상되지 않습니다.
- *factory reset*은 `/data`를 비우면 끝납니다.
- *업데이트*는 squashfs 파일 하나만 교체합니다. 보통 A/B 슬롯으로 묶습니다.
- log·config 변경은 자유롭게 가능합니다.

단점은 overlay된 변경분이 *별도 파티션*에 있어 *전원 끊김에 취약*하다는 점입니다. 단, 깨져도 *base rootfs는 멀쩡*하므로 다음 부팅에서 *최소한* 시스템이 살아 있습니다. 그것만 해도 ext4 단독에 비해 안정성이 훨씬 높습니다.

## 한 빌드에 여러 포맷 생성

Buildroot의 강점입니다. 옵션을 여러 개 켜면 *한 번의 빌드*에서 모든 포맷이 동시에 만들어집니다.

```text
BR2_TARGET_ROOTFS_TAR=y              # 디버깅·검사용
BR2_TARGET_ROOTFS_TAR_GZIP=y
BR2_TARGET_ROOTFS_SQUASHFS=y         # production
BR2_TARGET_ROOTFS_SQUASHFS4_ZSTD=y
BR2_TARGET_ROOTFS_CPIO=y             # initramfs/recovery
BR2_TARGET_ROOTFS_CPIO_XZ=y
```

빌드 후 `output/images/`에 다음이 생깁니다.

```text
$ ls output/images/
Image            rootfs.squashfs
rootfs.tar.gz    rootfs.cpio.xz
```

같은 rootfs에서 만든 결과물이므로 *내용은 동일*합니다. 포맷만 다릅니다. CI에서 이걸 모두 만들고, deployment 시점에 *목적에 맞는 것만* 선택합니다.

## 부팅 시 마운트 — fstab, mount cmdline

ext4를 *루트로 마운트*하려면 커널 cmdline에 `root=`를 넘깁니다.

```text
console=ttyS0,115200 root=/dev/mmcblk0p2 rootfstype=ext4 rw rootwait
```

squashfs면 `rootfstype=squashfs ro`를 씁니다.

```text
console=ttyS0,115200 root=/dev/mmcblk0p2 rootfstype=squashfs ro rootwait
```

initramfs는 *마운트가 필요 없습니다*. `root=`도 필요 없습니다. 그저 `console=`만 있어도 됩니다.

`/etc/fstab`은 *root* 외 나머지 마운트만 적습니다.

```text
# device         mount        type     options             dump  pass
proc             /proc        proc     defaults            0     0
sysfs            /sys         sysfs    defaults            0     0
devpts           /dev/pts     devpts   defaults,gid=5,mode=620  0  0
tmpfs            /tmp         tmpfs    defaults,size=32M   0     0
tmpfs            /run         tmpfs    defaults,size=8M    0     0
/dev/mmcblk0p3   /data        ext4     defaults,noatime    0     2
```

## Troubleshooting

### squashfs로 만들면 부팅이 멈춘다

세 가지가 흔합니다. *커널에 SQUASHFS 모듈*이 없거나(`CONFIG_SQUASHFS=y`), *zstd 알고리즘 지원*이 없거나(`CONFIG_SQUASHFS_ZSTD=y`), *cmdline의 rootfstype*이 ext4로 남아 있는 경우.

### ext4 첫 부팅 후 `df`가 가득 차 있다

`BR2_TARGET_ROOTFS_EXT2_SIZE`로 잡은 크기 그대로 마운트되어 있습니다. SD 카드를 다 쓰려면 첫 부팅 init에서 `resize2fs`를 한 번 돌립니다.

```bash
parted /dev/mmcblk0 resizepart 2 100%
resize2fs /dev/mmcblk0p2
```

이 절차는 SD 카드 크기가 *고정이 아닌* 흐름에서만 필요합니다. 공장에서 모두 같은 크기의 eMMC를 쓰면 미리 정확한 크기로 빌드합니다.

### overlayfs 마운트가 안 된다

거의 항상 *커널 옵션*입니다. `CONFIG_OVERLAY_FS=y`가 켜져 있어야 합니다. Linux fragment(`linux.config`)에 추가하고 커널을 다시 빌드합니다.

### initramfs가 너무 커서 부트가 느리다

initramfs는 *부팅 전*에 전체가 RAM에 펼쳐집니다. 30MB가 넘어가면 *체감*됩니다. 줄이는 길은 두 가지입니다. 더 강한 압축(xz)을 쓰거나, *전체 rootfs를 initramfs로 만들지 말고* 최소 부트만 initramfs로 두고 메인 rootfs는 squashfs로 switch_root합니다.

### 같은 빌드를 ext4·squashfs 두 가지로 빌드했는데 결과가 다르다

내용물은 같아도 *권한·소유권*이 fakeroot 처리 시점에 따라 미세하게 다를 수 있습니다. SUID 비트나 소유권이 중요한 파일은 [device table](/blog/embedded/buildroot/chapter07-board-customize)로 *명시적으로* 잡아 줍니다.

## 정리

- initramfs는 *RAM에 사는 rootfs*입니다. 작은 시스템·복구 환경에 적합합니다.
- cpio는 initramfs의 *재료*입니다. 외부 initramfs 흐름에서 쓰입니다.
- squashfs는 *read-only 압축*입니다. 크기 40~60% 절감 + 전원 끊김 면역의 두 이득을 동시에 줍니다.
- ext4는 *쓰기 가능*하지만 *application 수준의 partial write* 위험은 그대로입니다.
- **production 표준 패턴**: squashfs base + overlayfs + 별도 data 파티션.
- 한 빌드에서 여러 포맷을 동시에 생성할 수 있습니다. 목적별로 골라 deploy합니다.
- squashfs 압축은 *zstd*가 거의 항상 최적의 균형입니다.

## 다음 장 예고

다음 편은 **Ch 9: 새 패키지 작성 — autotools, cmake, python**.


## 관련 항목

- [Ch 7: 보드 customize — overlay, post-build, post-image](/blog/embedded/buildroot/chapter07-board-customize)
- [Ch 10: 실전 — BeagleBone Black 시스템 처음부터 끝까지](/blog/embedded/buildroot/chapter10-real-board)
- [원문 — Buildroot Manual: Target filesystem](https://buildroot.org/downloads/manual/manual.html#rootfs-images)
- [Linux overlayfs documentation](https://www.kernel.org/doc/Documentation/filesystems/overlayfs.txt)
