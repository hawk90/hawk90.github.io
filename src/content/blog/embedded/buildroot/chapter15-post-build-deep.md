---
title: "Buildroot post-build·post-image 심화 — rootfs 최종 수정 흐름"
date: 2026-05-19T09:15:00
description: "post-build·post-image·post-fakeroot 세 hook의 정확한 차이, 환경 변수, BR2_ROOTFS_OVERLAY 한계, system_table.txt로 권한·devnode 다루기, genimage로 SD 이미지 만들기."
series: "Buildroot Practical"
seriesOrder: 15
tags: [embedded, buildroot, post-build, post-image, genimage, fakeroot]
draft: false
---

## 한 줄 요약

> **"세 hook은 *언제·어디서·어떤 권한으로* 실행되는지가 다 다릅니다."** — post-build는 fakeroot 밖에서 TARGET_DIR을 만지고, post-fakeroot는 fakeroot 안에서 권한·devnode를 박고, post-image는 rootfs가 닫힌 뒤 이미지를 조립합니다. 셋을 섞으면 *조용히 망가집니다*.

## 3가지 hook의 정확한 차이

Ch 7에서 post-build·post-image의 존재는 짚었습니다. 이번 장은 셋의 경계에 집중합니다. 실제로 트러블 슈팅의 9할이 "어느 hook에서 무엇을 해야 하는가"를 잘못 결정한 데서 옵니다. 각 hook이 실행되는 시점을 그리면 다음 흐름입니다.

```text
패키지 빌드·설치 끝
   │
   ├─► post-build  (TARGET_DIR 수정 가능, fakeroot 밖, root 권한 없음)
   │
   ├─► fakeroot 진입
   │     ├─ device table 적용 (system_table.txt)
   │     ├─ post-fakeroot  (TARGET_DIR 안에서 chown·mknod 가능)
   │     └─ rootfs tar/squashfs/ext4 생성 → BINARIES_DIR
   │
   └─► post-image  (BINARIES_DIR 조립, fakeroot 밖, TARGET_DIR 건드리지 말 것)
```

세 hook의 *권한·디렉터리·시점*을 한 표로 정리하면 다음과 같습니다.

| 항목 | `post-build` | `post-fakeroot` | `post-image` |
|---|---|---|---|
| **실행 시점** | rootfs 만들기 직전 | rootfs 만드는 도중 (fakeroot 안) | rootfs 이미지 완성 후 |
| **TARGET_DIR 수정** | O (권장) | O (소유권·devnode) | X (이미 닫힘) |
| **BINARIES_DIR 수정** | X (아직 비어 있음) | X | O (권장) |
| **fakeroot 안?** | 아니오 | **예** | 아니오 |
| **실제 root 권한** | 아니오 | 아니오 (가짜 root) | 아니오 |
| **`chown`·`mknod` 효과** | 호스트 권한으로 무시됨 | tar에 정확히 박힘 | 의미 없음 (TARGET_DIR 닫힘) |
| **주요 용도** | 파일 추가/삭제, 설정 patch | 권한·소유자·devnode | 이미지 조립, signing, 압축 |
| **Kconfig 옵션** | `BR2_ROOTFS_POST_BUILD_SCRIPT` | `BR2_ROOTFS_POST_FAKEROOT_SCRIPT` | `BR2_ROOTFS_POST_IMAGE_SCRIPT` |

가장 자주 틀리는 부분이 **post-build에서 `chown root:root`를 시도**하는 경우입니다. 호스트에서 실행되므로 *no-op*이거나 *권한 거부*입니다. soft link, file content 정리는 post-build, 권한 설정은 post-fakeroot, 이미지 묶기는 post-image로 분리해야 합니다.

## 환경 변수 — 각 hook이 받는 것

세 hook 모두 *동일한 환경 변수*를 받습니다. 의미 있게 사용 가능한지가 다를 뿐입니다.

| 변수 | 값 (예시) | post-build | post-fakeroot | post-image |
|---|---|---|---|---|
| `TARGET_DIR` | `output/target/` | 읽기·쓰기 | 읽기·쓰기 | 읽기만 (변경 무시) |
| `BINARIES_DIR` | `output/images/` | 비어 있음 | 비어 있음 | 읽기·쓰기 |
| `BUILD_DIR` | `output/build/` | 읽기 | 읽기 | 읽기 |
| `HOST_DIR` | `output/host/` | 읽기 (도구 호출용) | 읽기 | 읽기 |
| `STAGING_DIR` | `output/staging/` | 읽기 | 읽기 | 읽기 |
| `BR2_CONFIG` | `.config` 경로 | 읽기 | 읽기 | 읽기 |
| `BR2_EXTERNAL` | external tree 경로 | 읽기 | 읽기 | 읽기 |

post-image 스크립트는 *추가 인자*로 `BR2_ROOTFS_POST_IMAGE_SCRIPT`의 *공백 뒤 값*을 받습니다. 예를 들어 `BR2_ROOTFS_POST_IMAGE_SCRIPT="board/myboard/post-image.sh extra-arg"`이면 스크립트의 `$1 = "extra-arg"`. 보드별 분기에 유용합니다.

호스트 도구를 호출할 때는 `$HOST_DIR/bin`을 PATH에 명시적으로 넣는 게 안전합니다.

```bash
#!/bin/sh
set -e
export PATH="${HOST_DIR}/bin:${HOST_DIR}/sbin:${PATH}"
mkimage -f "${BOARD_DIR}/u-boot.its" "${BINARIES_DIR}/fitImage"
```

`set -e`는 반드시 켜둡니다. post-build 스크립트의 silent failure가 양산 후 가장 골치 아픈 사고를 만듭니다.

## BR2_ROOTFS_OVERLAY — 가장 단순한 방법

스크립트가 부담스러우면 *overlay 디렉터리* 한 줄로 끝납니다. `BR2_ROOTFS_OVERLAY="board/myboard/rootfs-overlay"`로 지정하면 그 안의 트리가 rootfs 위에 그대로 복사됩니다.

```text
board/myboard/rootfs-overlay/
├── etc/
│   ├── hostname
│   ├── motd
│   └── systemd/system/myapp.service
└── usr/local/bin/init-myapp.sh
```

이 방식의 결정적 한계가 셋 있습니다.

- **소유권은 항상 `root:root`** — overlay의 파일이 호스트에서 어떤 소유자였든 무시. UID 1000으로 두고 싶어도 옵션 없음.
- **모드는 호스트 그대로** — 호스트의 umask와 실행 비트가 그대로 복사됩니다. git clone 직후 실행 비트가 누락된 스크립트가 자주 사고 원인.
- **특수 파일 불가능** — `/dev/console`, FIFO, named socket, file capabilities 모두 표현 불가.

권한 한 줄을 정확히 박아야 하면 *system_table.txt* 또는 *post-fakeroot*로 옮겨야 합니다.

## system_table.txt — 권한과 devnode

device table은 fakeroot 안에서 적용되는 권한·devnode 명세입니다. Buildroot 기본은 `system/device_table.txt`와 `system/device_table_dev.txt` 두 파일을 합쳐서 적용합니다. 추가 entry는 별도 파일에 넣고 `BR2_ROOTFS_DEVICE_TABLE="system/device_table.txt board/myboard/device_table_extras.txt"`처럼 지정합니다. 엔트리 형식은 다음과 같습니다.

```text
#<path>           <type>  <mode>  <uid>  <gid>  <major>  <minor>  <start>  <inc>  <count>
/dev/ttyS0          c      666      0      0      4       64       -        -      -
/dev/ttyS1          c      666      0      0      4       65       -        -      -
/dev/null           c      666      0      0      1       3        -        -      -
/etc/shadow         f      600      0      0      -       -        -        -      -
/var/log            d      755      0      0      -       -        -        -      -
/dev/loop           b      660      0      6       7       0        0        1      8
```

각 컬럼의 의미는 다음 표와 같습니다.

| 컬럼 | 의미 |
|---|---|
| `path` | rootfs 안의 절대 경로 |
| `type` | `f` 일반 파일, `d` 디렉터리, `c` char device, `b` block device, `p` FIFO, `l` symlink |
| `mode` | 8진 mode (`644`, `755`) |
| `uid`/`gid` | 숫자 (이름 사용 불가) |
| `major`/`minor` | char/block 전용 |
| `start`/`inc`/`count` | minor를 *연속 생성*할 때. `/dev/loop0` ~ `/dev/loop7` 같은 패턴 |

이 파일은 post-fakeroot 직전에 적용됩니다. overlay의 결과를 덮어쓸 수 있으므로, overlay에 둔 파일의 권한을 system_table에서 재지정하는 패턴이 표준입니다. systemd를 쓰면 `/dev/console` 같은 최소한의 정적 devnode만 두고 나머지는 udev에 맡깁니다. BusyBox + mdev면 device table에 더 많은 entry가 필요합니다.

## fakeroot의 한계

fakeroot는 *모든 root 권한을 흉내내지는 못합니다*. 다음 세 가지가 대표적입니다.

### File capabilities

`setcap cap_net_raw+ep /usr/bin/ping` 같은 capability는 *real root*가 아니면 설정해도 디스크에 안 박힙니다. fakeroot는 chown·chmod는 가짜로 추적하지만, xattr `security.capability`는 대부분의 호스트 fs(ext4·tmpfs)에서 잡지 못합니다.

해결은 두 가지. post-image에서 `setcap`을 real root로 실행하거나(sudo 필요, CI에는 부적절), systemd `AmbientCapabilities=` 또는 `CapabilityBoundingSet=`로 서비스 단위 부여(setcap 회피)입니다. 가능하면 systemd 단위로 처리하는 게 서명·OTA에도 친화적입니다.

### Extended attributes (xattr)

SELinux label, NFS ACL, `user.*` xattr이 여기 해당. fakeroot가 xattr을 흉내내긴 하지만, tar·cpio가 xattr을 그대로 packaging하는지는 옵션 의존입니다.

```bash
# tar로 묶을 때 xattr 보존
tar --xattrs --xattrs-include='*' -cf rootfs.tar -C "${TARGET_DIR}" .
```

ext4 이미지로 만들 때는 `genext2fs`·`make_ext4fs`의 xattr 지원 여부를 확인해야 합니다. Buildroot의 ext4 path는 보통 `genext2fs`인데, 이 도구는 xattr을 일부만 지원합니다.

### SELinux context

SELinux를 켠 시스템이면 file context를 어딘가에서 박아야 합니다. fakeroot로는 완전히 불가능합니다. 두 가지 길이 있습니다. post-image에서 `setfiles`를 부르거나(host에 SELinux policy 필요), target에서 첫 부팅 시 `restorecon -R /`를 돌립니다(kernel cmdline에 `autorelabel` 추가). 대부분의 임베디드 시스템은 autorelabel 1회 패턴이 가장 단순합니다.

## post-image use cases

post-image는 BINARIES_DIR에 이미 생성된 rootfs를 받아 조립하는 단계입니다. 대표 4가지 시나리오입니다.

| 시나리오 | 도구 | 산출물 |
|---|---|---|
| **FIT 이미지** | `mkimage -f u-boot.its` | `fitImage` (kernel + dtb + initramfs 묶음) |
| **partition 이미지** | `genimage -c genimage.cfg` | `sdcard.img` (MBR/GPT + 여러 partition) |
| **squashfs 압축** | `mksquashfs` | `rootfs.sqfs` (read-only A/B 업데이트용) |
| **signed update bundle** | `openssl dgst -sign` 또는 vendor tool | `update.bin.sig` |

post-build에서 흔한 패턴 한 장은 다음과 같습니다.

```bash
#!/bin/sh
# board/myboard/post-build.sh
set -e

# BusyBox inittab의 console 행 제거 — systemd가 처리
sed -i '/^::respawn:.*getty/d' "${TARGET_DIR}/etc/inittab" || true

# 커스텀 service unit symlink
mkdir -p "${TARGET_DIR}/etc/systemd/system/multi-user.target.wants"
ln -sf /etc/systemd/system/myapp.service \
    "${TARGET_DIR}/etc/systemd/system/multi-user.target.wants/myapp.service"

# 빌드 timestamp를 /etc/os-release에 박기
sed -i "s|^BUILD_ID=.*|BUILD_ID=$(date -u +%Y%m%d%H%M%S)|" \
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

`mkimage`는 `HOST_DIR/bin`에 들어 있으므로 PATH만 잘 잡으면 됩니다. `.its` 파일 내부의 경로는 *현재 작업 디렉터리 기준*이라 `cd "${BINARIES_DIR}"`이 중요합니다.

## genimage — SD/eMMC 이미지 생성

`genimage`는 *MBR/GPT partition 이미지*를 한 줄 cfg로 만드는 표준 도구입니다. Buildroot가 host package로 제공하므로 `BR2_PACKAGE_HOST_GENIMAGE=y`만 켜면 됩니다.

전형적인 `genimage.cfg` 한 장입니다.

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
        image = "rootfs.ext4"
        size = 512M
    }
}
```

이 cfg를 post-image 스크립트에서 호출합니다.

```bash
#!/bin/sh
set -e
GENIMAGE_TMP="${BUILD_DIR}/genimage.tmp"
rm -rf "${GENIMAGE_TMP}"

genimage \
    --rootpath "${TARGET_DIR}" \
    --tmppath "${GENIMAGE_TMP}" \
    --inputpath "${BINARIES_DIR}" \
    --outputpath "${BINARIES_DIR}" \
    --config "${BOARD_DIR}/genimage.cfg"
```

각 옵션의 의미는 다음과 같습니다.

| 옵션 | 의미 |
|---|---|
| `--rootpath` | rootfs 트리. genimage가 *읽기 참고용*으로만 사용 |
| `--inputpath` | 입력 이미지·바이너리들이 있는 디렉터리 (BINARIES_DIR) |
| `--outputpath` | 최종 이미지가 떨어질 곳 (보통 BINARIES_DIR) |
| `--tmppath` | 작업 공간. 매번 rm -rf 해야 *재실행 시 stale 충돌* 없음 |

A/B 업데이트를 염두에 두면 partition 두 개를 *같은 이미지로* 채우는 위 cfg가 시작점입니다. data 파티션은 첫 부팅 시 `mkfs`로 다시 만드는 게 보통입니다.

## secure boot 통합 패턴

서명은 *post-image에서* 처리합니다. fakeroot가 닫힌 뒤, rootfs와 FIT, kernel 같은 *최종 이미지*가 모두 BINARIES_DIR에 모인 시점이라 한 번에 묶기 좋습니다.

```bash
#!/bin/sh
set -e
KEY="${BR2_EXTERNAL}/keys/signing-key.pem"

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

key 파일은 *절대* Buildroot 트리 안에 두지 않습니다. `BR2_EXTERNAL` 트리, 또는 CI의 secret store에서 임시 주입. post-image 스크립트가 *key 경로를 환경 변수에서 읽도록* 짜는 게 가장 깨끗합니다.

vendor signing tool(NXP HABv4의 `cst`, TI의 `image_create.sh` 등)도 같은 자리에서 호출. 단, vendor tool은 *real root*를 요구하는 경우가 있어 *CI 환경*과 결합 시 주의.

## 흔한 실수

세 hook을 잘못 쓰면 *조용히 망가지는* 패턴이 정형화돼 있습니다.

| 증상 | 원인 | 해결 |
|---|---|---|
| `chown` 효과가 없음 | post-build에서 시도 | post-fakeroot 또는 device table로 이동 |
| 이미지 안에 setuid 비트가 사라짐 | overlay의 mode가 호스트 umask | device table에서 *재지정* |
| post-image 결과가 *비어 있음* | TARGET_DIR을 건드림 | BINARIES_DIR로 작업 대상 옮기기 |
| `mkimage: command not found` | PATH에 `$HOST_DIR/bin` 누락 | 스크립트 상단에 명시 |
| 이미지가 늘 stale | `--tmppath`를 매번 `rm -rf` 안 함 | 스크립트 첫 줄에 cleanup |
| capabilities가 안 박힘 | fakeroot 한계 | systemd `AmbientCapabilities`로 대체 |
| SELinux label 누락 | fakeroot 한계 | autorelabel 또는 post-image에서 `setfiles` |
| `Permission denied: ./post-build.sh` | 스크립트 실행 비트 누락 | `chmod +x` 후 git에 등록 |
| `${BUILD_DIR}/something` 경로가 없음 | BUILD_DIR을 패키지별로 추정 | 패키지별 경로는 `${BUILD_DIR}/<pkg>-<version>/`으로 *명시* |
| 같은 스크립트가 board별로 다르게 동작 | 분기 없음 | `BR2_ROOTFS_POST_IMAGE_SCRIPT`에 인자 추가 |

위 중 가장 비싸게 드는 사고가 *capabilities 사고*입니다. 양산 직전에 발견하면 *서비스 단위 모델*로 *전부 다시 짜야* 합니다. 초기 단계에서 *fakeroot 한계*를 받아들이고 systemd로 옮기는 게 보통 최선입니다.

## 정리

- 세 hook은 *시점·디렉터리·권한*이 다릅니다. post-build는 fakeroot 밖에서 TARGET_DIR, post-fakeroot는 fakeroot 안에서 권한·devnode, post-image는 BINARIES_DIR 조립.
- post-build에서 `chown`·`mknod`는 의미가 없고, post-image에서 TARGET_DIR 수정도 의미가 없습니다. 잘못 두면 silent failure.
- 환경 변수 7개(`TARGET_DIR`·`BINARIES_DIR`·`BUILD_DIR`·`HOST_DIR`·`STAGING_DIR`·`BR2_CONFIG`·`BR2_EXTERNAL`)는 모든 hook이 받습니다. `set -e`와 PATH 명시는 필수.
- `BR2_ROOTFS_OVERLAY`는 가장 단순하지만 *root:root + 호스트 mode + 일반 파일*만 표현 가능. 그 너머가 필요하면 device table·post-fakeroot.
- `system_table.txt`로 char/block devnode·정확한 mode·uid·gid·연속 minor를 박을 수 있습니다. overlay 위를 *덮어쓰는* 용도로도 표준.
- fakeroot로는 file capabilities·xattr·SELinux context를 *완전히* 표현할 수 없습니다. 각각 systemd 단위·tar `--xattrs`·autorelabel 같은 대안이 표준.
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
