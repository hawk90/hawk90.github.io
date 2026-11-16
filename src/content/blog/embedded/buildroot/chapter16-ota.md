---
title: "Buildroot OTA 이미지 업데이트 — RAUC·swupdate 통합"
slug: "embedded/buildroot/chapter16-ota"
date: 2026-05-19T09:16:00
description: "Buildroot에서 RAUC·swupdate·Mender를 통합해 A/B 부팅·atomic update를 제공하는 패턴. slot 설계, bundle 생성, U-Boot bootcount, 서명·롤백까지."
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
| **rollback** | passive (bootcount) / active (health check) | "부팅은 되는데 application이 죽는" 경우를 잡을지 |

A/B는 비활성 슬롯에 쓰고 부트로더 변수만 바꾸므로, 실패하면 이전 슬롯으로 돌아갈 수 있습니다. 대가는 rootfs 저장 공간 두 배입니다.

서명 정책은 *prototyping에서 production 키 체계까지 미리 검증*해야 합니다. 한 번 배포된 device의 trust anchor는 사실상 바꿀 수 없습니다.

rollback은 *passive (U-Boot bootcount)가 부팅까지의 실패*를 잡고, *active (userspace health check)가 부팅 이후 실패*를 잡습니다. 양쪽 다 있어야 *"부팅은 되는데 application이 죽는"* 시나리오를 처리합니다.

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

Buildroot에는 `system.conf` 경로를 받는 Kconfig 옵션이 없습니다(`package/rauc/Config.in`에 `_DBUS`·`_GPT`·`_NETWORK`·`_STREAMING`·`_JSON`만 있음). `system.conf`와 keyring은 rootfs overlay(Ch 7)로 `/etc/rauc/` 아래에 넣습니다.

`/etc/rauc/system.conf`는 슬롯 정의를 담습니다. 형식은 RAUC 문서의 "System Configuration File"을 따릅니다.

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

핵심은 `compatible`과 `bootname`입니다. bundle manifest의 `compatible`이 이 값과 다르면 RAUC는 설치를 거부합니다. `bootname`은 U-Boot 쪽 부트 순서 변수의 토큰과 맞아야 합니다.

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

`BR2_PACKAGE_HOST_RAUC=y`를 켜고 `make host-rauc`를 돌리니 42.32초 뒤 `output/host/bin/rauc`가 생겼습니다(`rauc 1.15.2`). 키는 Root CA 하나와 그 CA가 서명한 device 인증서로 만들었습니다.

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
rauc-Message: 04:27:38.137: No keyring given, skipping signature verification
$ ls -l myboard.raucb
-rw-r--r-- 1 br br 2422722 Nov 16 04:27 myboard.raucb
```

62,914,560바이트 ext4 이미지를 담은 bundle이 2.4 MB였습니다. bundle 자체가 압축된 squashfs이기 때문입니다. device에서 쓸 keyring(여기서는 Root CA)으로 검증한 `rauc info` 출력입니다(일부 생략).

```text
$ rauc info --keyring=keys/root.cert.pem myboard.raucb
rauc-Message: 04:27:38.143: Verifying bundle signature... 
rauc-Message: 04:27:38.143: Verified inline signature by 'CN = myboard-v1 build'
Compatible:     'myboard-v1'
Version:        '2026.11.16-1'
Description:    'test bundle'
Build:          '(null)'
Hooks:          ''
Bundle Format:  verity
  Verity Salt:  '86a16503a96ed021b43ab5314ab42facc106982254bc70d0b17b5aa6dc5e9d76'
  Verity Hash:  'b9fd62f15c2a29c220ec7d1f3106250b1c4e80ebc8e5390361174c5e484ca72d'
  Verity Size:  24576
...
1 Image:
  [rootfs]
    Filename:  rootfs.ext4
    Type:      ext4 (detected)
    Checksum:  51836e0f4e50b5fa79379eaddf61fb5b67fa8804bd2a0a5a945269f266ae3d00
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
rauc-Message: 04:27:38.265: Verifying bundle signature... 
signature verification failed: Verify error: unable to get local issuer certificate
```

같은 manifest를 `format=plain`으로 바꾸면 `Creating 'plain' format bundle`로 만들어지고 `rauc info`의 `Bundle Format:`이 `plain`으로 나옵니다.

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

post-image는 매 `make`마다 돌기 때문에(Ch 7) 출력 파일을 먼저 지웁니다. `rauc`는 `PATH` 앞의 `output/host/bin`에서 찾아집니다. target에서는 `rauc install <bundle>`로 설치하고 `rauc status`로 슬롯 상태를 봅니다. 이 두 명령은 이 장에서 target으로 실행하지 않았습니다.

## swupdate — 통합 흐름

swupdate는 RAUC보다 *handler 자유도*가 높은 도구입니다. 단일 binary로 *raw partition·UBI·MTD·LUKS·MCU 펌웨어·post-script*까지 처리합니다.

menuconfig 토글.

```text
BR2_PACKAGE_SWUPDATE=y
BR2_PACKAGE_SWUPDATE_CONFIG="board/myboard/swupdate/swupdate.config"
BR2_PACKAGE_SWUPDATE_WEBSERVER=y         # 기본값 y: "update from remote using a web server"
```

Lua handler 같은 기능은 Buildroot 옵션이 아니라 swupdate 자체 Kconfig(`swupdate.config`)에서 켭니다. Buildroot의 기본 `swupdate.config`를 출발점으로 복사해 `make swupdate-menuconfig`로 고친 뒤 `BR2_PACKAGE_SWUPDATE_CONFIG`에 지정합니다.

swupdate bundle의 *manifest*는 `sw-description`입니다. libconfig 문법.

```text
software =
{
    version = "2026.05.19-3";
    description = "Q2 release";
    hardware-compatibility: ["1.0", "1.1"];

    images: (
        {
            filename = "rootfs.ext4.gz";
            volume   = "rootfs_b";
            type     = "ubivol";
            compressed = "zlib";
            sha256   = "@rootfs.ext4.gz.sha256";
        },
        {
            filename = "u-boot.imx";
            device   = "/dev/mmcblk0boot0";
            type     = "raw";
            sha256   = "@u-boot.imx.sha256";
        }
    );

    scripts: (
        { filename = "post-install.lua"; type = "lua"; }
    );

    bootenv: (
        { name = "upgrade_available"; value = "1"; },
        { name = "bootcount";         value = "0"; }
    );
};
```

`bootenv:` 절이 bundle 설치 때 U-Boot 환경 변수를 갱신합니다(swupdate 문서의 `sw-description` 형식).

bundle 패키징은 CPIO `newc` 포맷.

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

openssl cms -sign -in "${STAGE}/sw-description" \
    -out "${STAGE}/sw-description.sig" \
    -signer "${CERT}" -inkey "${KEY}" -nocerts -noattr -binary -outform DER

# CPIO newc — sw-description이 첫 번째여야 함
( cd "${STAGE}" && \
  ls sw-description sw-description.sig *.ext4.gz u-boot.imx \
  | cpio -ov -H newc ) > "${BINARIES_DIR}/myboard.swu"
```

**핵심 함정** — swupdate 문서는 `sw-description`이 CPIO archive의 첫 번째 파일이어야 한다고 정합니다. swupdate가 stream을 앞에서부터 읽기 때문입니다. 위 스크립트가 `ls`에 파일 이름을 순서대로 적는 이유입니다. 서명(`sw-description.sig`) 검증은 swupdate를 `CONFIG_SIGNED_IMAGES`로 빌드해야 하고, Buildroot 기본 `swupdate.config`에는 이 설정이 없습니다. 이 장의 swupdate 명령은 실행하지 않았습니다.

## A/B slot 부팅 — U-Boot와의 협업

A/B 부팅의 *결정자*는 OTA 도구가 아니라 **U-Boot**입니다. RAUC·swupdate는 *어느 슬롯이 다음 부팅 대상인지*를 U-Boot 환경 변수로 알립니다.

```bash
# 정상 부팅 시도 - bootcount 1 증가
bootcmd=run main_boot
main_boot=if test ${BOOT_ORDER} = "A B"; then \
            run slot_a; \
          else \
            run slot_b; \
          fi

# 부팅 N회 실패 시 altbootcmd로 전환
altbootcmd=if test ${BOOT_ORDER} = "A B"; then setenv BOOT_ORDER "B A"; else setenv BOOT_ORDER "A B"; fi; saveenv; reset
bootlimit=3
```

`altbootcmd`는 U-Boot에서 `CONFIG_BOOTCOUNT_LIMIT`가 켜지고 bootcount 저장 방식이 구성돼 있을 때만, `bootcount`가 `bootlimit`를 넘으면 실행됩니다. 위 스크립트는 그 조건에서 `BOOT_ORDER`를 뒤집는 형식만 보여 줍니다. 상태 변수 이름과 성공 표시(`rauc status mark-good`) 연동은 RAUC 문서의 U-Boot 통합 절을 따라 보드에서 검증합니다.

userspace의 `fw_setenv`·`fw_printenv`는 `/etc/fw_env.config`를 읽습니다. Ch 10의 BeagleBone 빌드에서 `BR2_PACKAGE_LIBUBOOTENV=y`를 켰을 때 `fw_printenv`·`fw_setenv`는 설치됐지만 `/etc/fw_env.config`는 생기지 않았습니다(Ch 13). 이 파일은 U-Boot의 `CONFIG_ENV_*` 값과 맞춰 overlay로 직접 넣습니다.

이 파일이 *부정확*하면 `fw_setenv`가 *엉뚱한 위치를 덮어써* 부팅이 깨집니다. Ch 13의 U-Boot env 정렬을 다시 확인해야 하는 부분입니다.

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

위 실측은 Root CA → device 인증서의 2단계였습니다. 실제 운영에서는 Root CA를 오프라인에 두고 build server에는 중간(intermediate) CA만 두는 3단계 구성을 흔히 씁니다. 그 경우 bundle을 만들 때 중간 인증서도 함께 넣어야 device가 chain을 완성할 수 있습니다(RAUC `bundle`의 `--intermediate` 옵션).

```bash
# Root CA (한 번만, 오프라인 머신)
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

# device에 들어가는 keyring = root + intermediate
cat root.cert.pem inter.cert.pem > ca.cert.pem
```

`ca.cert.pem`을 *target rootfs*의 `/etc/rauc/`에 둡니다. Buildroot는 `rootfs-overlay` 메커니즘으로 처리하는 게 가장 깔끔합니다.

swupdate의 서명 검증은 swupdate 자체 Kconfig에서 켭니다. Buildroot의 기본 `package/swupdate/swupdate.config`에는 서명 관련 설정이 없으므로, 서명을 쓰려면 `make swupdate-menuconfig`로 켠 설정 파일을 `BR2_PACKAGE_SWUPDATE_CONFIG`에 지정합니다. 알고리즘과 키 배치는 swupdate 문서의 "Signed images" 절을 따릅니다.

## 롤백 정책 — watchdog과 health check

passive rollback (bootcount)만으로는 *"부팅은 되는데 application이 죽는"* 시나리오를 못 잡습니다. **active rollback**이 추가로 필요합니다.

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

Buildroot의 기본 BusyBox 설정은 `watchdog` applet을 켜고(`package/busybox/busybox.config`의 `CONFIG_WATCHDOG=y`), `busybox.mk`가 `S15watchdog` init 스크립트를 설치합니다. health check 서비스가 watchdog을 주기적으로 갱신하게 두면, 갱신이 멈췄을 때 하드웨어 reset → bootcount 증가 → passive rollback으로 이어집니다.

## 흔한 실패

**slot 크기 부족.** rootfs가 슬롯보다 커지면 설치가 실패합니다. 해결책은 *처음부터* 크게 잡거나, *partition repartition 도구*를 미리 준비. 양산 후 partition 변경은 *boot loader·env까지 같이 갱신*해야 해서 사실상 *recovery 시나리오*가 필요합니다.

**env partition 비동기.** A 슬롯과 B 슬롯이 *같은 env partition을 공유*할 때, `fw_setenv`가 atomic write를 보장하지 못하면 *부팅 중 갱신 → 정전*으로 env가 깨집니다. U-Boot의 *redundant env* (`CONFIG_ENV_OFFSET_REDUND`)를 켜서 두 copy를 유지하는 게 표준 해법입니다.

**signature verification 실패.** keyring이 bundle 서명 chain의 CA를 갖고 있지 않으면 위 실측처럼 다음 메시지로 실패합니다.

```text
signature verification failed: Verify error: unable to get local issuer certificate
```

원인 후보는 셋입니다. target의 keyring이 키 교체 이전 것이거나, 중간 CA를 쓰는데 bundle에 넣지 않았거나, target 시계가 인증서 유효 기간 밖인 경우입니다. 실측의 device 인증서는 `Not Before: Nov 16 04:27:37 2026 GMT`였으므로, RTC가 초기화돼 그 이전 시각에 머문 보드에서는 아직 유효하지 않은 인증서가 됩니다.

**bundle MIME format wrong.** swupdate에서 `Invalid header magic`이 뜨면 CPIO가 *newc가 아닌 다른 format*으로 만들어진 경우입니다. `cpio -ov -H newc`가 정답이고, 기본 format이나 tar는 실패합니다. 또한 *외부 gzip 압축*을 두지 않습니다. swupdate는 stream을 *순차*로 읽으므로 외부 압축 layer가 있으면 *부분 streaming이 불가능*해집니다. 압축은 *내부 image별*로만 적용합니다 (`compressed = "zlib";`).

## 정리

- OTA는 패키지 한 개가 아니라 *7개 영역의 정렬* — partition, bootloader, bundle, 서명, rollback, delivery, 상태 머신.
- 결정 차원은 *슬롯 모델 (A/B / 단일 슬롯 + recovery / delta)*, *서명 정책 (단일 vs CA chain)*, *rollback 방식 (passive vs active)*의 3개입니다.
- RAUC·swupdate·Mender의 차이는 *bundle 포맷·생태계·서버*입니다. firmware 위주면 RAUC, handler 자유도 우선이면 swupdate, server까지 통합 패키지를 원하면 Mender.
- Buildroot에는 RAUC `system.conf` 경로 옵션이 없어 overlay로 넣고, bundle은 post-image에서 `rauc bundle`로 만듭니다.
- swupdate 통합의 핵심은 *sw-description + CPIO newc 컨테이너 + sw-description이 첫 파일*. embedded webserver를 같이 켜면 별도 서버 없이 현장 업로드가 됩니다.
- A/B 부팅의 결정자는 *U-Boot*이며, RAUC·swupdate는 `fw_setenv`로 변수를 갱신합니다. `/etc/fw_env.config`의 정확성이 보드 brick 여부를 가릅니다.
- `host-rauc` 1.15.2로 60 MiB ext4를 담은 verity bundle을 만들었더니 2.4 MB였고, `rauc info`가 서명 chain과 verity 메타데이터를 보여 줬습니다. 다른 CA로는 "unable to get local issuer certificate"로 실패했습니다.
- partition layout은 boot + rootfs-A + rootfs-B + data에서 시작하고, 슬롯 크기는 rootfs 크기 추세를 근거로 정합니다.
- 양산은 *CA chain + active rollback (health check) + watchdog*의 3단 방어가 default. RTC 배터리·NTP 동기까지 chain의 일부로 봐야 합니다.

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
