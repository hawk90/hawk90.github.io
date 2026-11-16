---
title: "Buildroot OTA 이미지 업데이트 — RAUC·swupdate 통합"
slug: "embedded/buildroot/chapter16-ota"
date: 2026-05-19T09:16:00
description: "Buildroot에서 RAUC·swupdate·Mender를 통합해 A/B 부팅·atomic update를 제공하는 패턴. slot 설계, bundle 생성, U-Boot `BOOT_ORDER` 연동, 서명·롤백까지."
series: "Buildroot Practical"
seriesOrder: 16
tags: [embedded, buildroot, ota, rauc, swupdate, mender, ab-update]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"OTA는 *느린 빌드 단계*가 아니라 *시스템 설계 결정*입니다."** — 어떤 도구를 고르냐보다 *A/B 슬롯·서명·롤백 정책*을 먼저 정해야 빌드가 따라옵니다. RAUC와 swupdate는 둘 다 Buildroot에 잘 통합돼 있고, 차이는 *bundle 포맷·생태계·운영 도구*입니다.

## 왜 OTA가 별도의 장인가

OTA는 *한 패키지를 추가*하면 끝나는 작업이 아닙니다. RAUC를 `BR2_PACKAGE_RAUC=y`로 켜는 일은 30초면 됩니다. 하지만 *동작하는 OTA 시스템*을 만들려면 7가지가 정렬돼야 합니다. partition layout, bootloader 협업, bundle 포맷, 서명 체계, rollback 정책, delivery 경로, 상태 머신입니다.

이 중 하나가 어긋나도 현장에서 장치가 부팅하지 못할 수 있습니다. 비행기 엔진을 비행 중에 교체하는 일과 같아서, 교체 도구보다 *교체가 실패했을 때 돌아갈 엔진*을 먼저 정해야 합니다. 이 장은 Buildroot 위에서 세 도구를 비교하고, RAUC와 swupdate의 통합 흐름을 다룹니다.

버전·라이선스·옵션 이름은 **Buildroot 2026.02.3**의 `package/rauc`, `package/swupdate`, `package/mender`에서 확인했습니다. RAUC는 VM에서 `host-rauc`를 실제로 빌드하고, Ch 4의 QEMU `rootfs.ext2`로 서명된 bundle을 만들어 `rauc info`로 검증했습니다. target에서 설치·슬롯 전환·롤백까지는 돌리지 않았으므로, 그 부분은 각 프로젝트 문서의 형식을 따르며 실행 결과가 아닙니다.

## OTA 결정 차원 3개

도구를 고르기 전에 *세 가지 차원*을 먼저 결정합니다. 도구 선택은 그 다음입니다.

| 차원 | 옵션 | 결정할 때 보는 것 |
|---|---|---|
| **슬롯 모델** | A/B (dual bank) / 단일 슬롯 + recovery / delta | 저장 공간 여유, 다운로드 비용 |
| **서명 정책** | 단일 키 / CA chain | 키 유출 시 교체 경로 |
| **rollback** | passive (부트로더의 남은 시도 횟수) / active (health check) | "부팅은 되는데 application이 죽는" 경우를 잡을지 |

A/B는 비활성 슬롯에 쓰고 부트로더 변수만 바꾸므로, 실패하면 이전 슬롯으로 돌아갈 수 있습니다. 대가는 rootfs 저장 공간 두 배입니다.

서명 정책은 *prototyping에서 production 키 체계까지 미리 검증*해야 합니다. 한 번 배포된 device의 trust anchor는 사실상 바꿀 수 없습니다.

rollback은 *passive (부트로더의 남은 부팅 시도 횟수)가 부팅까지의 실패*를 잡고, *active (userspace health check)가 부팅 이후 실패*를 잡습니다. 양쪽 다 있어야 *"부팅은 되는데 application이 죽는"* 시나리오를 처리합니다.

## 도구 비교 — RAUC vs swupdate vs Mender

세 도구 모두 Buildroot 본체에 패키지가 있습니다. 버전과 라이선스는 각 `.mk`의 값입니다.

| 항목 | RAUC | swupdate | Mender |
|---|---|---|---|
| **Buildroot 패키지** | `BR2_PACKAGE_RAUC` (+ `BR2_PACKAGE_HOST_RAUC`) | `BR2_PACKAGE_SWUPDATE` | `BR2_PACKAGE_MENDER` (+ `mender-artifact` 등) |
| **2026.02.3의 버전** | 1.15.2 | 2025.05 | 3.5.3 |
| **`<PKG>_LICENSE`** | `LGPL-2.1` | `GPL-2.0, GPL-2.0+, LGPL-2.1+, MIT, …` | `Apache-2.0, BSD-2-Clause, …` |
| **하위 옵션 (Config.in)** | `_DBUS`, `_GPT`, `_NETWORK`, `_STREAMING`, `_JSON` | `_CONFIG`, `_USB`, `_WEBSERVER`, `_INSTALL_WEBSITE` | — |
| **update 단위** | bundle (`.raucb`) | `.swu` (CPIO + `sw-description`) | Mender artifact |
| **관련 패키지** | `rauc-hawkbit-updater` | — | `mender-connect`, `mender-grubenv`, `mender-update-modules` |

`BR2_PACKAGE_RAUC`의 `Config.in`은 `libglib2`·`openssl`·`squashfs`를 `select`하며, `squashfs`에는 "run-time dependency" 주석이 붙어 있습니다. RAUC bundle이 squashfs 이미지이기 때문입니다(아래 실측). swupdate는 기본 설정 파일 `package/swupdate/swupdate.config`를 쓰는데, 이 파일은 `CONFIG_WEBSERVER=y`, `CONFIG_MONGOOSE=y`를 켜고 `CONFIG_BOOTLOADER_NONE=y`로 둡니다. 서명 검증 관련 줄은 없습니다. 제품에 쓰려면 `BR2_PACKAGE_SWUPDATE_CONFIG`로 직접 만든 설정을 지정해야 한다는 뜻입니다.

도구를 고르는 기준은 bundle 형식, 서버 구성, 부트로더 연동 방식입니다. 이 장은 RAUC를 실측과 함께, swupdate를 설정 형식 위주로 다룹니다.

## RAUC — Buildroot 통합 흐름

RAUC는 device 쪽 `system.conf`, 서명용 키·인증서, bundle 안의 `manifest.raucm`, bundle을 만드는 post-image 스크립트가 맞물려야 동작합니다.

menuconfig 토글은 다음과 같습니다.

```text
BR2_PACKAGE_RAUC=y
BR2_PACKAGE_HOST_RAUC=y                  # bundle 생성용 host tool
```

Buildroot에는 `system.conf` 경로를 받는 Kconfig 옵션이 없습니다(`package/rauc/Config.in`에 `_DBUS`·`_GPT`·`_NETWORK`·`_STREAMING`·`_JSON`만 있음). RAUC는 `system.conf`를 `/etc/rauc/`, `/run/rauc/`, `/usr/lib/rauc/` 순으로 찾으므로(RAUC `docs/reference.rst` "System Configuration File", 18-20행), `system.conf`와 keyring은 rootfs overlay(Ch 7)로 `/etc/rauc/` 아래에 넣습니다.

`/etc/rauc/system.conf`는 슬롯 정의를 담습니다. 형식은 RAUC `docs/reference.rst`의 "System Configuration File" 절을 따릅니다. `bootloader=uboot`는 같은 절 97-100행의 지원 값 중 하나이고, `[keyring] path`는 274행, 슬롯의 `device`·`type`·`bootname`은 536-567행에 정의돼 있습니다.

```ini
[system]
compatible=myboard-v1
bootloader=uboot

[keyring]
path=/etc/rauc/ca.cert.pem

[slot.rootfs.0]
device=/dev/mmcblk0p2
type=ext4
bootname=A

[slot.rootfs.1]
device=/dev/mmcblk0p3
type=ext4
bootname=B
```

핵심은 `compatible`과 `bootname`입니다. bundle manifest의 `compatible`이 이 값과 다르면 RAUC는 설치를 거부합니다(`docs/reference.rst` 66-69행, 설치 순서 2147행). `bootname`은 U-Boot 스크립트의 `BOOT_ORDER`에 들어가는 이름과 같아야 합니다(`docs/integration.rst` U-Boot 절, 1052-1058행).

bundle에 들어가는 `manifest.raucm`입니다. 실측에 쓴 파일 그대로입니다.

```ini
[update]
compatible=myboard-v1
version=2026.11.16-1
description=test bundle

[bundle]
format=verity

[image.rootfs]
filename=rootfs.ext4
```

### 실측 — host-rauc로 bundle 만들고 검증하기

`BR2_PACKAGE_HOST_RAUC=y`를 켜고 `make host-rauc`를 돌리니 13.55초 뒤 `output/host/bin/rauc`가 생겼습니다(`rauc 1.15.2`). QEMU 빌드가 끝난 트리라 `HOST_RAUC_DEPENDENCIES`의 host-openssl·host-pkgconf는 이미 있었고, 새로 빌드된 것은 host-json-glib과 host-rauc 둘뿐이었습니다. 키는 Root CA 하나와 그 CA가 서명한 device 인증서로 만들었습니다.

```bash
openssl req -x509 -newkey rsa:4096 -nodes -keyout root.key.pem -out root.cert.pem \
    -days 7300 -subj "/CN=Example Root CA"
openssl req -newkey rsa:2048 -nodes -keyout device.key.pem -out device.csr \
    -subj "/CN=myboard-v1 build"
openssl x509 -req -in device.csr -CA root.cert.pem -CAkey root.key.pem \
    -CAcreateserial -out device.cert.pem -days 730 -extfile ext.cnf
```

`ext.cnf`에는 `basicConstraints=CA:FALSE`, `keyUsage=digitalSignature` 두 줄을 넣었습니다. bundle 디렉터리에 QEMU 빌드의 `rootfs.ext2`를 `rootfs.ext4`로 복사하고 manifest를 둔 뒤 서명했습니다.

```text
$ rauc bundle --cert=keys/device.cert.pem --key=keys/device.key.pem bundle myboard.raucb
Creating 'verity' format bundle
rauc-Message: 07:21:45.147: No keyring given, skipping signature verification
$ ls -l myboard.raucb
-rw-r--r-- 1 br br 2066370 Nov 16 07:21 myboard.raucb
```

62,914,560바이트 ext4 이미지를 담은 bundle이 2.1 MB였습니다. bundle 자체가 압축된 squashfs이기 때문입니다. device에서 쓸 keyring(여기서는 Root CA)으로 검증한 `rauc info` 출력입니다(일부 생략).

```text
$ rauc info --keyring=keys/root.cert.pem myboard.raucb
rauc-Message: 07:21:45.152: Verifying bundle signature... 
rauc-Message: 07:21:45.153: Verified inline signature by 'CN = myboard-v1 build'
Compatible:     'myboard-v1'
Version:        '2026.11.16-1'
Description:    'test bundle'
Build:          '(null)'
Hooks:          ''
Bundle Format:  verity
  Verity Salt:  '91f0cb984a3952b54457eea07acc74f5f7dec794da74f9201aaf179b12fa4ebe'
  Verity Hash:  '507b1701fd0da3c2929cf6b74cc8f534276de3251dac60e17628d9f7ab771cb5'
  Verity Size:  20480
...
1 Image:
  [rootfs]
    Filename:  rootfs.ext4
    Type:      ext4 (detected)
    Checksum:  e5e8e0452f69b1cffa84c3e9ec769054ae1c6a6b33a04f5b8ff5a1bd8fde2d5d
    Size:      62.9 MB (62914560 bytes)

Certificate Chain:
 0 Subject: CN = myboard-v1 build
   Issuer: CN = Example Root CA
...
 1 Subject: CN = Example Root CA
   Issuer: CN = Example Root CA
```

manifest에 적지 않은 checksum과 크기를 `rauc bundle`이 채웠고, `format=verity` bundle에는 dm-verity 메타데이터(salt, root hash, verity 영역 크기)가 붙었습니다. 다른 CA를 keyring으로 주자 검증이 실패했습니다.

```text
$ rauc info --keyring=other.pem myboard.raucb
rauc-Message: 07:21:45.190: Verifying bundle signature... 
signature verification failed: Verify error: unable to get local issuer certificate
```

같은 manifest를 `format=plain`으로 바꾸면 `Creating 'plain' format bundle`로 만들어지고 `rauc info`의 `Bundle Format:`이 `plain`으로 나옵니다. 서명 방식도 달라져서, verity bundle은 "Verified inline signature", plain bundle은 "Verified detached signature"로 검증됐습니다.

이 절차를 post-image 스크립트로 옮기면 다음과 같습니다. 키 경로는 트리에 두지 않고 환경 변수로 받습니다.

```bash
#!/bin/sh
set -e
BOARD_DIR="$(dirname "$0")"
BUNDLE_DIR="${BINARIES_DIR}/rauc-bundle"

rm -rf "${BUNDLE_DIR}"; mkdir -p "${BUNDLE_DIR}"
cp "${BINARIES_DIR}/rootfs.ext4" "${BUNDLE_DIR}/"
cp "${BOARD_DIR}/rauc/manifest.raucm" "${BUNDLE_DIR}/"

rm -f "${BINARIES_DIR}/myboard.raucb"
rauc bundle \
    --cert="${RAUC_CERT:?set RAUC_CERT}" \
    --key="${RAUC_KEY:?set RAUC_KEY}" \
    "${BUNDLE_DIR}" \
    "${BINARIES_DIR}/myboard.raucb"
```

post-image는 매 `make`마다 돌기 때문에(Ch 7) 출력 파일을 먼저 지웁니다. `rauc`는 `PATH` 앞의 `output/host/bin`에서 찾아집니다. target에서는 `rauc install <bundle>`로 설치하고 `rauc status`로 슬롯 상태를 봅니다(RAUC `docs/using.rst` 85-112행). 이 두 명령은 이 장에서 target으로 실행하지 않았습니다.

## swupdate — 통합 흐름

swupdate는 image마다 handler를 골라 설치하는 도구입니다. swupdate `doc/source/handlers.rst` 27-35행이 raw 모드 flash(NOR·NAND), UBI 볼륨, SD 카드 파티션 같은 raw 장치, Lua·shell 스크립트 handler를 들고, 같은 파일 760행에 MCU 펌웨어용 `ucfw` handler가 있습니다.

menuconfig 토글.

```text
BR2_PACKAGE_SWUPDATE=y
BR2_PACKAGE_SWUPDATE_CONFIG="board/myboard/swupdate/swupdate.config"
BR2_PACKAGE_SWUPDATE_WEBSERVER=y         # 기본값 y (package/swupdate/Config.in)
```

Lua handler 같은 기능은 Buildroot 옵션이 아니라 swupdate 자체 Kconfig(`swupdate.config`, swupdate 소스의 `Kconfig`·`handlers/Kconfig`의 `CONFIG_LUA`·`CONFIG_LUASCRIPTHANDLER`)에서 켜고, Buildroot 쪽에서는 `BR2_PACKAGE_LUA`를 직접 골라야 합니다(`package/swupdate/Config.in` help). Buildroot의 기본 `swupdate.config`를 출발점으로 복사해 `make swupdate-menuconfig`(`swupdate.mk`의 `SWUPDATE_KCONFIG_EDITORS`, 매뉴얼 `adding-packages-kconfig.adoc`)로 고친 뒤 `BR2_PACKAGE_SWUPDATE_CONFIG`에 지정합니다.

swupdate bundle의 *manifest*는 `sw-description`이고, libconfig 문법을 씁니다(`doc/source/sw-description.rst` 11행). 아래 예는 그 문서 28-110행의 예제 형식을 따랐습니다.

```text
software =
{
    version = "2026.05.19-3";
    description = "Q2 release";
    hardware-compatibility: ["1.0", "1.1"];

    images: (
        {
            filename = "rootfs.ext4.gz";
            device   = "/dev/mmcblk0p3";
            compressed = "zlib";
            sha256   = "@ROOTFS_SHA256@";
        },
        {
            filename = "u-boot.imx";
            device   = "/dev/mmcblk0boot0";
            type     = "raw";
            sha256   = "@UBOOT_SHA256@";
        }
    );

    bootenv: (
        { name = "rootfs_slot"; value = "B"; }
    );
};
```

`device`를 주면 raw handler가 자동으로 고르고, 압축은 raw 모드 image에 `compressed`로 겁니다(`sw-description.rst` 637-646행). `sha256`은 서명된 image에서 검증에 쓰이며, 서명된 SWU에서는 모든 image에 있어야 합니다(`sw-description.rst` 1477행, `signed_images.rst` 217-220행). swupdate에는 Buildroot용 hash 치환 기능이 없으므로 아래 스크립트가 `@..@` 자리에 실제 값을 넣습니다. `bootenv:` 절은 image·script 설치가 끝난 뒤 부트로더 환경 변수를 갱신합니다(`sw-description.rst` 986-1000행, `swupdate.rst` 328행). 변수 이름(`rootfs_slot`)은 보드의 U-Boot 스크립트가 읽는 이름에 맞춥니다.

bundle 패키징은 CPIO입니다. swupdate는 New ASCII(`newc`, magic `070701`)와 New CRC(`crc`, magic `070702`) 두 형식을 받습니다(`doc/source/swupdate.rst` 783-787행). 문서 예제는 `-H crc`를 쓰고, 아래는 `newc`를 씁니다.

```bash
#!/bin/sh
set -e
STAGE="${BINARIES_DIR}/swupdate-stage"
BOARD_DIR="$(dirname "$0")"
KEY="${SWUPDATE_KEY:?set SWUPDATE_KEY}"
CERT="${SWUPDATE_CERT:?set SWUPDATE_CERT}"

rm -rf "${STAGE}"; mkdir -p "${STAGE}"
cp "${BINARIES_DIR}/rootfs.ext4.gz"       "${STAGE}/"
cp "${BINARIES_DIR}/u-boot.imx"           "${STAGE}/"
cp "${BOARD_DIR}/swupdate/sw-description" "${STAGE}/"

sed -i \
    -e "s/@ROOTFS_SHA256@/$(sha256sum "${STAGE}/rootfs.ext4.gz" | cut -d' ' -f1)/" \
    -e "s/@UBOOT_SHA256@/$(sha256sum "${STAGE}/u-boot.imx" | cut -d' ' -f1)/" \
    "${STAGE}/sw-description"

openssl cms -sign -in "${STAGE}/sw-description" \
    -out "${STAGE}/sw-description.sig" \
    -signer "${CERT}" -inkey "${KEY}" -outform DER -nosmimecap -binary

# sw-description이 첫 번째, sw-description.sig가 바로 다음
( cd "${STAGE}" && \
  ls sw-description sw-description.sig *.ext4.gz u-boot.imx \
  | cpio -ov -H newc ) > "${BINARIES_DIR}/myboard.swu"
```

**핵심 함정** — swupdate 문서는 cpio를 stream으로 읽을 수 있는 컨테이너로 쓰며, `sw-description`이 CPIO archive의 첫 번째 파일이어야 한다고 정합니다(`swupdate.rst` 807-810행). 서명 파일은 그 바로 뒤에 와야 합니다(`signed_images.rst` 214-215행). 위 스크립트가 `ls`에 파일 이름을 순서대로 적는 이유입니다. `openssl cms` 명령은 `signed_images.rst` 167-168행의 CMS 서명 명령과 같은 옵션입니다. 서명 검증은 swupdate를 `CONFIG_SIGNED_IMAGES`로, CMS 서명이면 `CONFIG_SIGALG_CMS`도 켜서 빌드해야 하고, 실행할 때 `-k`로 공개 키(인증서)를 줘야 합니다(`signed_images.rst` 287-292행). Buildroot 기본 `swupdate.config`에는 이 설정이 없습니다. 이 장의 swupdate 명령은 실행하지 않았습니다.

## A/B slot 부팅 — U-Boot와의 협업

A/B 부팅에서 어느 슬롯으로 부팅할지 정하는 것은 OTA 도구가 아니라 **U-Boot**입니다(RAUC `docs/integration.rst` 1017-1019행). RAUC는 U-Boot 환경 변수 두 종류로 상태를 넘깁니다(같은 파일 1022-1027행). `BOOT_ORDER`는 시도할 bootname의 순서(`A B`)이고, `BOOT_<bootname>_LEFT`는 그 슬롯의 남은 부팅 시도 횟수입니다. swupdate는 `sw-description`의 `bootenv:`로 환경 변수를 바꿉니다.

RAUC 소스의 `contrib/uboot.sh` 예제에서 슬롯 A 부분만 옮기면 다음과 같습니다.

```bash
test -n "${BOOT_ORDER}" || setenv BOOT_ORDER "A B"
test -n "${BOOT_A_LEFT}" || setenv BOOT_A_LEFT 3
test -n "${BOOT_B_LEFT}" || setenv BOOT_B_LEFT 3

setenv bootargs
for BOOT_SLOT in "${BOOT_ORDER}"; do
  if test "x${bootargs}" != "x"; then
    # skip remaining slots
  elif test "x${BOOT_SLOT}" = "xA"; then
    if test 0x${BOOT_A_LEFT} -gt 0; then
      setexpr BOOT_A_LEFT ${BOOT_A_LEFT} - 1
      setenv bootargs "${default_bootargs} root=/dev/mmcblk0p1 rauc.slot=A"
    fi
  fi
done
```

스크립트는 `BOOT_ORDER` 순서대로 남은 횟수가 0보다 큰 첫 슬롯을 고르고 그 횟수를 1 줄인 뒤 `saveenv`합니다. 고를 슬롯이 없으면 두 횟수를 3으로 되돌리고 `reset`합니다(`contrib/uboot.sh`). 이 스크립트는 `mkimage -T script`로 `boot.scr`를 만들어 U-Boot의 기본 boot script로 씁니다(`docs/integration.rst` 1035-1048행). 부팅한 시스템이 정상이면 `rauc status mark-good`으로 부트로더 쪽 시도 횟수를 되돌립니다(`docs/using.rst` 152-158행). 문서는 이 스크립트의 boot 명령을 플랫폼에 맞게 고쳐 써야 한다고 적고 있습니다(1032행 note).

RAUC가 userspace에서 U-Boot env를 읽고 쓰려면 target rootfs에 `fw_printenv`·`fw_setenv`와 `/etc/fw_env.config`가 있어야 합니다(`docs/integration.rst` 1100-1107행). Ch 10의 BeagleBone 빌드에서 `BR2_PACKAGE_LIBUBOOTENV=y`를 켰을 때 `fw_printenv`·`fw_setenv`는 설치됐지만 `/etc/fw_env.config`는 생기지 않았습니다(Ch 13). 이 파일은 U-Boot의 `CONFIG_ENV_*` 값과 맞춰 overlay로 직접 넣습니다. RAUC `docs/integration.rst` 1135-1175행에 MMC redundant env의 `CONFIG_ENV_OFFSET`·`CONFIG_ENV_OFFSET_REDUND` 값과 그에 맞춘 `/etc/fw_env.config` 예가 있습니다.

## partition layout

A/B 설계의 layout 예입니다. 크기는 rootfs 실측값에서 출발해 정합니다. 이 시리즈의 QEMU rootfs는 실제 사용량이 4.1 MB, 이미지가 60 MiB였습니다(Ch 4).

| 번호 | 이름 | 용도 |
|---|---|---|
| 1 | `boot` | kernel + dtb |
| 2 | `rootfs-A` | 슬롯 A rootfs |
| 3 | `rootfs-B` | 슬롯 B rootfs |
| 4 | `data` | 슬롯과 무관한 공유 데이터 |

`genimage.cfg`에서 다음과 같이 정의합니다.

```text
image sdcard.img {
    hdimage { partition-table-type = "gpt" }

    partition boot {
        bootable = "true"
        image = "boot.vfat"
        size = 64M
    }
    partition rootfs-A { image = "rootfs.ext4"; size = 512M; }
    partition rootfs-B { image = "rootfs.ext4"; size = 512M; }
    partition data     { image = "data.ext4"; }
}

image data.ext4 {
    ext4 { label = "data" }
    size = 64M
    empty = true
}
```

**핵심 결정** — 슬롯 크기는 *지금의 최대 rootfs*에 *앞으로 늘어날 몫*을 더해 잡습니다. 출시 뒤에는 파티션을 바꾸기 어렵기 때문입니다. Ch 6에서 인용한 매뉴얼 migration 절차의 `make graph-size`(`file-size-stats.csv`)를 릴리스마다 남기면 rootfs가 늘어나는 추세를 근거로 크기를 정할 수 있습니다.

## 서명·암호화

bundle 서명은 *양산의 비가역 결정*입니다. 한 번 배포된 device의 *trust anchor*는 사실상 바꿀 수 없으므로, prototyping 단계에서 *production 키 체계*를 미리 검증해야 합니다.

위 실측은 Root CA → device 인증서의 2단계였습니다. Root CA 아래에 중간(intermediate) CA를 두는 3단계 구성이라면, `rauc bundle --intermediate=<중간 인증서>`로 중간 인증서를 bundle 서명에 넣어 검증 때 chain을 닫습니다(RAUC `docs/advanced.rst` "Intermediate Certificates", 155-165행).

```bash
# Root CA
openssl req -x509 -newkey rsa:4096 -keyout root.key.pem -out root.cert.pem \
    -nodes -days 7300 -subj "/CN=MyCompany Root CA"

# Intermediate
openssl req -newkey rsa:4096 -keyout inter.key.pem -out inter.csr \
    -nodes -subj "/CN=MyCompany Build Intermediate"
openssl x509 -req -in inter.csr -CA root.cert.pem -CAkey root.key.pem \
    -CAcreateserial -out inter.cert.pem -days 3650

# Device signing cert
openssl req -newkey rsa:2048 -keyout device.key.pem -out device.csr \
    -nodes -subj "/CN=myboard-v1 build"
openssl x509 -req -in device.csr -CA inter.cert.pem -CAkey inter.key.pem \
    -out device.cert.pem -days 730

# device keyring = Root CA (중간 인증서는 rauc bundle --intermediate=inter.cert.pem으로 bundle에)
cp root.cert.pem ca.cert.pem
```

`ca.cert.pem`은 `system.conf`의 `[keyring] path`가 가리키는 `/etc/rauc/`에 Ch 7의 rootfs overlay로 넣습니다. 중간 CA를 keyring에 넣어 trust anchor로 쓰려면 `allow-partial-chain=true`가 따로 필요합니다(`docs/reference.rst` 293-298행).

swupdate의 서명 검증은 swupdate 자체 Kconfig에서 켭니다. Buildroot의 기본 `package/swupdate/swupdate.config`에는 서명 관련 설정이 없으므로, 서명을 쓰려면 `make swupdate-menuconfig`로 `CONFIG_SIGNED_IMAGES`와 알고리즘(`CONFIG_SIGALG_CMS` 등)을 켠 설정 파일을 `BR2_PACKAGE_SWUPDATE_CONFIG`에 지정합니다. 켜면 런타임에 검사를 끌 수 없고, RSA·CMS 서명은 `-k`로 공개 키 파일을 줘야 합니다(swupdate `doc/source/signed_images.rst` 287-292행).

## 롤백 정책 — watchdog과 health check

무엇이 성공한 부팅인지는 시스템마다 다르므로, RAUC는 `rauc status mark-good`·`mark-bad`만 제공하고 언제 부를지는 시스템에 맡깁니다(`docs/using.rst` 141-160행). `docs/integration.rst` 1412-1430행은 systemd 의존성으로 관련 서비스가 다 올라온 뒤에 `mark-good`을 부르는 서비스를 권합니다. 아래는 그 형식에 health check를 앞에 붙인 예입니다.

```text
# /etc/systemd/system/rauc-mark-good.service
[Unit]
Description=Mark RAUC slot good after health check
After=multi-user.target network-online.target myapp.service
Wants=network-online.target

[Service]
Type=oneshot
ExecStartPre=/usr/local/bin/health-check.sh
ExecStart=/usr/bin/rauc status mark-good
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

`health-check.sh`는 *제품별 정의*입니다. 다음 5가지가 통과해야 *good*으로 마킹합니다. 네트워크 reachability (백엔드 ping), 핵심 service status (`systemctl is-active`), 센서·주변기기 enumeration, 디스크 mount 상태, 정해진 N분의 안정성 관찰입니다.

Buildroot의 기본 BusyBox 설정은 `watchdog` applet을 켭니다(`package/busybox/busybox.config`의 `CONFIG_WATCHDOG=y`). 부팅 때 busybox watchdog 데몬을 띄우는 `S15watchdog` init 스크립트는 `BR2_PACKAGE_BUSYBOX_WATCHDOG=y`일 때만 설치됩니다(`busybox.mk`, `package/busybox/Config.in`). watchdog 갱신이 멈추면 하드웨어 watchdog이 시스템을 reset합니다(Linux `Documentation/watchdog/watchdog-api.rst` 19-30행). `mark-good` 전에 reset이 반복되면 위 U-Boot 스크립트가 부팅마다 `BOOT_<bootname>_LEFT`를 줄이므로, 횟수가 0이 된 슬롯은 건너뛰고 `BOOT_ORDER`의 다음 슬롯으로 부팅합니다.

## 흔한 실패

**slot 크기 부족.** image가 슬롯 장치보다 크면 RAUC는 `Slot (... bytes) is too small for image (... bytes).`로 설치를 멈춥니다(RAUC `src/update_handler.c` 87행). 그래서 슬롯은 *처음부터* 여유 있게 잡습니다.

**env 쓰기 중 정전.** 슬롯 선택 정보는 U-Boot env에 있으므로, env를 쓰는 도중 전원이 끊기면 그 정보가 깨질 수 있습니다. RAUC 문서는 U-Boot의 redundant env(`CONFIG_SYS_REDUNDAND_ENVIRONMENT=y`와 `CONFIG_ENV_OFFSET_REDUND`)를 켜서, 한 copy에 쓰는 동안 다른 copy를 fallback으로 남기라고 합니다(`docs/integration.rst` 1083-1094행). env는 bootloader 파티션 밖에 둬야 bootloader를 갱신해도 남습니다(1071-1075행).

**signature verification 실패.** keyring이 bundle 서명 chain의 CA를 갖고 있지 않으면 위 실측처럼 다음 메시지로 실패합니다.

```text
signature verification failed: Verify error: unable to get local issuer certificate
```

원인 후보는 셋입니다. target의 keyring이 키 교체 이전 것이거나, 중간 CA를 쓰는데 bundle에 넣지 않았거나, target 시계가 인증서 유효 기간 밖인 경우입니다. 실측의 device 인증서는 `Not Before: Nov 16 07:21:44 2026 GMT`였으므로, RAUC는 기본적으로 현재 시스템 시각으로 인증서를 검증하므로(`use-bundle-signing-time`을 켜면 서명 시각 사용, `docs/reference.rst` 288-290행), RTC가 초기화돼 그 이전 시각에 머문 보드에서는 아직 유효하지 않은 인증서가 됩니다.

**bundle MIME format wrong.** swupdate는 CPIO header의 magic이 `070701`(newc)이나 `070702`(crc)가 아니면 `CPIO Format not recognized: magic not found`로 멈춥니다(swupdate `core/cpio_utils.c` 47-52행). `cpio -ov -H newc` 또는 `-H crc`로 만듭니다. 압축은 image마다 `compressed` 속성으로 겁니다(`sw-description.rst` 637-638행).

## 정리

- OTA는 패키지 한 개가 아니라 *7개 영역의 정렬* — partition, bootloader, bundle, 서명, rollback, delivery, 상태 머신.
- 결정 차원은 *슬롯 모델 (A/B / 단일 슬롯 + recovery / delta)*, *서명 정책 (단일 vs CA chain)*, *rollback 방식 (passive vs active)*의 3개입니다.
- RAUC·swupdate·Mender는 모두 Buildroot 패키지가 있고, update 단위가 각각 `.raucb`·`.swu`·Mender artifact입니다. Mender는 `package/mender/Config.in` help 기준으로 device client와 배포를 관리하는 server로 이루어집니다.
- Buildroot에는 RAUC `system.conf` 경로 옵션이 없어 overlay로 넣고, bundle은 post-image에서 `rauc bundle`로 만듭니다.
- swupdate 통합의 핵심은 *sw-description + CPIO newc 컨테이너 + sw-description이 첫 파일*. `BR2_PACKAGE_SWUPDATE_WEBSERVER`(기본 y)는 target의 web server로 원격 update를 받게 합니다.
- A/B 부팅에서 슬롯을 고르는 것은 *U-Boot*이며, RAUC는 `fw_printenv`·`fw_setenv`와 `/etc/fw_env.config`로, swupdate는 `libubootenv`로 U-Boot env를 바꿉니다(`swupdate.rst` 216행).
- `host-rauc` 1.15.2로 60 MiB ext4를 담은 verity bundle을 만들었더니 2.1 MB였고, `rauc info`가 서명 chain과 verity 메타데이터를 보여 줬습니다. 다른 CA로는 "unable to get local issuer certificate"로 실패했습니다.
- partition layout은 boot + rootfs-A + rootfs-B + data에서 시작하고, 슬롯 크기는 rootfs 크기 추세를 근거로 정합니다.
- 이 장의 구성은 *CA chain + health check 뒤 `mark-good` + watchdog*입니다. RAUC는 기본적으로 현재 시스템 시각으로 인증서를 검증하므로 target 시계도 검증 chain의 일부입니다.

## 다음 장 예고

다음 편은 **Ch 17: SDK 생성·배포 — `make sdk`와 application 워크플로**. OTA로 *시스템 이미지*를 갱신하는 흐름을 마쳤다면, 그 위에서 *application 개발자*가 어떻게 빌드 환경을 받아 쓰는지 다룹니다.


## 관련 항목

- [Ch 13: U-Boot 통합 — env·bootcmd·MMC layout](/blog/embedded/buildroot/chapter13-uboot-integration) — `fw_env.config`·bootcount의 출처
- [Ch 15: post-build·post-image 스크립트 심화](/blog/embedded/buildroot/chapter15-post-build-deep) — RAUC bundle 생성 hook의 정석
- [Ch 18: 보안·CVE 관리 — secure boot, SBOM, CVE tracking](/blog/embedded/buildroot/chapter18-security-cve) — OTA 서명 키와 secure boot의 chain of trust
- [U-Boot Ch 17: A/B 업데이트 — bootcount와 altbootcmd](/blog/embedded/bootloader/chapter17-ab-update) — bootloader 측 시각
- [U-Boot Ch 20: RAUC·swupdate 통합 — bootloader 측 책임](/blog/embedded/bootloader/chapter20-rauc-swupdate) — Buildroot 통합의 반대편 절반
- [BSP Development Ch 14: 업데이트 시스템 설계](/blog/embedded/bsp/chapter14-thermal-watchdog) — BSP 관점의 OTA 아키텍처
- [원문 — RAUC documentation](https://rauc.readthedocs.io/)
- [원문 — swupdate documentation](https://sbabic.github.io/swupdate/)
