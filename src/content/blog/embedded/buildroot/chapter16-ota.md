---
title: "Buildroot OTA 이미지 업데이트 — RAUC·swupdate 통합"
date: 2026-05-19T09:16:00
description: "Buildroot에서 RAUC·swupdate·Mender를 통합해 A/B 부팅·atomic update를 제공하는 패턴. slot 설계, bundle 생성, U-Boot bootcount, 서명·롤백까지."
series: "Buildroot Practical"
seriesOrder: 16
tags: [embedded, buildroot, ota, rauc, swupdate, mender, ab-update]
draft: false
---

## 한 줄 요약

> **"OTA는 *느린 빌드 단계*가 아니라 *시스템 설계 결정*입니다."** — 어떤 도구를 고르냐보다 *A/B 슬롯·서명·롤백 정책*을 먼저 정해야 빌드가 따라옵니다. RAUC와 swupdate는 둘 다 Buildroot에 잘 통합돼 있고, 차이는 *bundle 포맷·생태계·운영 도구*입니다.

## 왜 OTA가 별도의 장인가

OTA는 *한 패키지를 추가*하면 끝나는 작업이 아닙니다. RAUC를 `BR2_PACKAGE_RAUC=y`로 켜는 일은 30초면 됩니다. 하지만 *동작하는 OTA 시스템*을 만들려면 7가지가 정렬돼야 합니다. partition layout, bootloader 협업, bundle 포맷, 서명 체계, rollback 정책, delivery 경로, 상태 머신입니다.

이 중 하나가 어긋나도 *현장에서 brick*이 됩니다. OTA 실패는 *대량 RMA*로 직결되므로, OTA 설계가 BSP 설계만큼 무겁게 다뤄져야 합니다. 이 장은 Buildroot 위에서 *세 도구*를 비교하고, *RAUC와 swupdate*의 실제 통합 흐름을 단계별로 보여 줍니다.

## OTA 결정 차원 3개

도구를 고르기 전에 *세 가지 차원*을 먼저 결정합니다. 도구 선택은 그 다음입니다.

| 차원 | 옵션 | 실무 기본값 |
|---|---|---|
| **슬롯 모델** | A/B (dual bank) / delta / container 단위 | A/B (storage 2배가 가장 작은 비용) |
| **서명 정책** | unsigned / single key / CA chain | CA chain (단일 키는 회수 불가) |
| **rollback** | passive (bootcount) / active (health check) | passive + active 동시 |

A/B는 *atomic + 즉시 rollback*이 가능해 가장 단순합니다. delta는 셀룰러·LPWA처럼 *데이터 비용이 큰* 환경에서 검토합니다. container 모델은 *application 주기가 firmware보다 빠른* 시스템에 한정.

서명 정책은 *prototyping에서 production 키 체계까지 미리 검증*해야 합니다. 한 번 배포된 device의 trust anchor는 사실상 바꿀 수 없습니다.

rollback은 *passive (U-Boot bootcount)가 부팅까지의 실패*를 잡고, *active (userspace health check)가 부팅 이후 실패*를 잡습니다. 양쪽 다 있어야 *"부팅은 되는데 application이 죽는"* 시나리오를 처리합니다.

## 도구 비교 — RAUC vs swupdate vs Mender

세 도구의 차이를 한눈에.

| 항목 | RAUC | swupdate | Mender |
|---|---|---|---|
| **Buildroot 패키지** | `BR2_PACKAGE_RAUC` | `BR2_PACKAGE_SWUPDATE` | `BR2_PACKAGE_MENDER` |
| **라이선스** | LGPLv2.1 | GPLv2 | Apache 2.0 client, commercial server |
| **slot 모델** | A/B per-slot 설명, group 단위 | A/B 또는 single | A/B (rootfs partition) |
| **update 단위** | bundle (squashfs + manifest) | CPIO archive + sw-description | mender artifact (tar) |
| **delta 지원** | casync 기반 | libarchive + custom handler | 자체 delta |
| **서명** | x509 CA chain, OpenSSL/PKCS#11 | RSA / CMS / ed25519 | RSA |
| **HTTP server** | 별도 (hawkBit 등) | 내장 mongoose 서버 | 자체 server (commercial) |
| **D-Bus API** | yes | no | no |
| **container 친화도** | 그룹 단위 | handler 작성으로 가능 | 미지원 |
| **학습 곡선** | 중 | 중-상 (handler 자유도 높음) | 낮음 (전체 SaaS) |

선택의 *경험적 기준*은 다음과 같습니다. **RAUC**는 D-Bus 통합·systemd 친화·CA chain이 표준화돼 *firmware 위주 제품*에 깔끔합니다. **swupdate**는 handler를 직접 작성해 *복잡한 partition·container·MCU 펌웨어까지 한 번에 업데이트*하는 시스템에 적합합니다. **Mender**는 *server까지 한 번에* 끝내고 싶을 때 선택, 단 server는 commercial입니다.

이 장은 RAUC와 swupdate를 다룹니다. Mender는 클라이언트 통합 방식이 비슷하고, 차이는 *서버 측 SaaS*라 Buildroot 통합 관점에서는 부수적입니다.

## RAUC — Buildroot 통합 흐름

RAUC는 *5개 파일*만 정렬되면 동작합니다. `system.conf`, `cert/key`, slot이 정의된 device tree·`genimage.cfg`, manifest, bundle build 스크립트입니다.

menuconfig 토글.

```text
BR2_PACKAGE_RAUC=y
BR2_PACKAGE_RAUC_SYSTEM_CONF="board/myboard/rauc/system.conf"
BR2_PACKAGE_HOST_RAUC=y                  # bundle 생성용 host tool
BR2_PACKAGE_HOST_CASYNC=y                # delta 지원 시
```

`HOST_RAUC`는 *호스트에서 bundle을 만드는* 도구입니다. Target 빌드 후 *post-image hook*에서 호출합니다.

`board/myboard/rauc/system.conf`는 슬롯 정의의 *유일한 진실 소스*입니다.

```ini
[system]
compatible=myboard-v1
bootloader=uboot
mountprefix=/run/rauc
max-bundle-download-size=1073741824

[keyring]
path=ca.cert.pem

[handlers]
system-info=/usr/lib/rauc/system-info.sh
post-install=/usr/lib/rauc/post-install.sh

[slot.rootfs.0]
device=/dev/mmcblk0p2
type=ext4
bootname=A

[slot.rootfs.1]
device=/dev/mmcblk0p3
type=ext4
bootname=B

[slot.bootloader.0]
device=/dev/mmcblk0boot0
type=raw
```

핵심은 `compatible`과 `bootname`입니다. `compatible`은 *manifest와 일치*하지 않으면 RAUC가 install을 거부합니다. 잘못된 하드웨어에 깔리는 사고를 막는 1차 방어선입니다. `bootname`은 *U-Boot 변수 `BOOT_ORDER`의 토큰*과 일치해야 합니다.

bundle 안에 들어가는 `manifest.raucm`.

```ini
[update]
compatible=myboard-v1
version=2026.05.19-3
description=Q2 maintenance release

[bundle]
format=verity

[image.rootfs]
filename=rootfs.ext4

[image.bootloader]
filename=u-boot.imx
```

`format=verity`는 RAUC 1.5+ 권장입니다. bundle 자체가 dm-verity로 무결성 검증되며, 종래의 `plain` (단일 서명)보다 부분 변조에 강합니다. sha256·size는 `rauc bundle`이 자동 채웁니다.

Buildroot가 `rootfs.ext4`를 만든 뒤 *post-image script*가 RAUC bundle을 생성합니다.

```bash
#!/bin/sh
set -e
BOARD_DIR="$(dirname "$0")"
IMAGES_DIR="${BINARIES_DIR}"
BUNDLE_DIR="${IMAGES_DIR}/rauc-bundle"
KEY_DIR="${BR2_EXTERNAL_MYBOARD_PATH}/keys"

rm -rf "${BUNDLE_DIR}"; mkdir -p "${BUNDLE_DIR}"
cp "${IMAGES_DIR}/rootfs.ext4"  "${BUNDLE_DIR}/"
cp "${IMAGES_DIR}/u-boot.imx"   "${BUNDLE_DIR}/"
cp "${BOARD_DIR}/rauc/manifest.raucm" "${BUNDLE_DIR}/"

rauc bundle \
    --cert="${KEY_DIR}/device.cert.pem" \
    --key="${KEY_DIR}/device.key.pem" \
    --keyring="${KEY_DIR}/ca.cert.pem" \
    "${BUNDLE_DIR}" \
    "${IMAGES_DIR}/myboard-${BR2_VERSION}.raucb"
```

이 hook을 `BR2_ROOTFS_POST_IMAGE_SCRIPT`에 등록하면 `make` 한 번으로 bundle까지 완성됩니다. target에서는 `rauc install /tmp/myboard.raucb`로 설치하고, `rauc status`로 *현재 슬롯·boot status*를 확인합니다. 다음 부팅에서 *반대 슬롯*으로 자동 전환됩니다.

## swupdate — 통합 흐름

swupdate는 RAUC보다 *handler 자유도*가 높은 도구입니다. 단일 binary로 *raw partition·UBI·MTD·LUKS·MCU 펌웨어·post-script*까지 처리합니다.

menuconfig 토글.

```text
BR2_PACKAGE_SWUPDATE=y
BR2_PACKAGE_SWUPDATE_CONFIG="board/myboard/swupdate/swupdate.config"
BR2_PACKAGE_SWUPDATE_WEBSERVER=y         # embedded mongoose webserver
BR2_PACKAGE_SWUPDATE_LUASCRIPTS=y        # Lua handler 지원
```

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

`bootenv:` 절이 *U-Boot 환경 변수를 직접 갱신*합니다. swupdate의 강점 중 하나로, RAUC가 별도 handler에서 처리해야 하는 일을 *manifest 한 줄*로 끝냅니다.

bundle 패키징은 CPIO `newc` 포맷.

```bash
#!/bin/sh
set -e
STAGE="${BINARIES_DIR}/swupdate-stage"
KEY="${BR2_EXTERNAL_MYBOARD_PATH}/keys/swupdate-priv.pem"

rm -rf "${STAGE}"; mkdir -p "${STAGE}"
cp "${BINARIES_DIR}/rootfs.ext4.gz"       "${STAGE}/"
cp "${BINARIES_DIR}/u-boot.imx"           "${STAGE}/"
cp "${BOARD_DIR}/swupdate/sw-description" "${STAGE}/"

openssl cms -sign -in "${STAGE}/sw-description" \
    -out "${STAGE}/sw-description.sig" \
    -signer "${KEY}" -nocerts -noattr -binary -outform DER

# CPIO newc — sw-description이 첫 번째여야 함
( cd "${STAGE}" && \
  ls sw-description sw-description.sig *.ext4.gz u-boot.imx \
  | cpio -ov -H newc ) > "${BINARIES_DIR}/myboard.swu"
```

**핵심 함정** — `sw-description`이 *CPIO 안에서 첫 번째 파일*이어야 합니다. swupdate는 stream을 *앞에서부터* 파싱하므로 manifest가 뒤에 있으면 *signature 검증을 시작도 못 합니다*. `WEBSERVER`를 켜면 target의 `:8080`에 *업로드 UI*가 생겨 별도 server 인프라 없이 노트북·USB로 직접 업로드할 수 있습니다.

## A/B slot 부팅 — U-Boot와의 협업

A/B 부팅의 *결정자*는 OTA 도구가 아니라 **U-Boot**입니다. RAUC·swupdate는 *어느 슬롯이 다음 부팅 대상인지*를 U-Boot 환경 변수로 알립니다.

```text
# 정상 부팅 시도 - bootcount 1 증가
bootcmd=run main_boot
main_boot=if test ${BOOT_ORDER} = "A B"; then \
            run slot_a; \
          else \
            run slot_b; \
          fi

# 부팅 N회 실패 시 altbootcmd로 전환
altbootcmd=setenv BOOT_ORDER "B A" && saveenv && reset
bootlimit=3
```

U-Boot가 *bootcount > bootlimit*이면 `altbootcmd`를 실행해 *반대 슬롯*으로 강제 전환합니다. 이게 **passive rollback의 핵심**입니다. RAUC는 `system.conf`의 `bootloader=uboot` 설정으로 install 완료 시 `BOOT_ORDER`를 갱신하고, `rauc status mark-good` 호출 시 `bootcount`를 리셋합니다.

이 helper들은 *u-boot-tools*의 `fw_setenv`·`fw_printenv`를 호출합니다. Buildroot가 자동으로 `/etc/fw_env.config`를 만들어 *환경 partition의 위치·크기*를 알려 줍니다.

```text
# /etc/fw_env.config
# MTD/MMC device   offset      env-size    sector-size   N-sectors
/dev/mmcblk0       0x100000    0x4000      0x4000        2
```

이 파일이 *부정확*하면 `fw_setenv`가 *엉뚱한 위치를 덮어써* 부팅이 깨집니다. Ch 13의 U-Boot env 정렬을 다시 확인해야 하는 부분입니다.

## partition layout

A/B 설계의 *최소* layout은 6개 partition입니다.

| 번호 | 이름 | 크기 | 용도 |
|---|---|---|---|
| 1 | `boot` | 64 MB | kernel + dtb + initramfs (있다면) |
| 2 | `rootfs-A` | 800 MB | 슬롯 A rootfs |
| 3 | `rootfs-B` | 800 MB | 슬롯 B rootfs |
| 4 | `appdata` | 200 MB | app config (공유 또는 슬롯별) |
| 5 | `data` | 나머지 | 공유 user data (slot 무관) |
| 6 | `recovery` | 200 MB | 최후 복구용 minimal rootfs |

`genimage.cfg`에서 다음과 같이 정의합니다.

```text
image sdcard.img {
    hdimage { partition-table-type = "gpt" }

    partition boot {
        bootable = "true"
        image = "boot.vfat"
        size = 64M
    }
    partition rootfs-A { image = "rootfs.ext4"; size = 800M; }
    partition rootfs-B { image = "rootfs.ext4"; size = 800M; }
    partition appdata  { image = "appdata.ext4"; size = 200M; }
    partition data     { image = "data.ext4"; }
    partition recovery { image = "recovery.ext4"; size = 200M; }
}
```

**핵심 결정** — A/B 슬롯의 크기는 *최대 rootfs* + *향후 2년 성장 여유*를 잡습니다. 너무 작으면 *몇 번의 업데이트 뒤 image가 안 들어가*고, 너무 크면 *공유 data 영역이 부족*합니다. eMMC 4 GB 기준 *800 MB × 2 + recovery 200 MB*가 흔한 시작점입니다.

## 서명·암호화

bundle 서명은 *양산의 비가역 결정*입니다. 한 번 배포된 device의 *trust anchor*는 사실상 바꿀 수 없으므로, prototyping 단계에서 *production 키 체계*를 미리 검증해야 합니다.

RAUC는 전형적인 3단계 CA chain을 씁니다. Root CA는 오프라인 머신·HSM에 보관, intermediate는 build server에 권한 위임, device cert가 실제 bundle 서명을 담당합니다.

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

swupdate는 RSA·ECDSA·ed25519를 지원합니다. 빌드 옵션은 `swupdate.config`에서 `CONFIG_SIGNED_IMAGES=y` + `CONFIG_SIGALG_CMS=y` (또는 `_RAWED25519`)를 켜고, device에는 `/etc/swupdate/public.pem`을 둡니다. 검증은 *manifest 서명* + *각 image의 sha256*의 2단입니다.

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

`BR2_PACKAGE_BUSYBOX_SHOW_OTHERS` 하에 `watchdog`을 켜고, *health check 서비스가 watchdog을 정기적으로 kick*하게 합니다. 부팅 직후부터 *N분 동안 kick이 들어오지 않으면* 보드가 hardware reset → bootcount 증가 → *passive rollback*으로 자연스레 이어집니다.

## 흔한 실패

**slot 크기 부족.** 가장 흔한 사고. 처음 800 MB로 잡았는데 *18개월 뒤 rootfs가 820 MB*가 된 경우. bundle install이 *"No space left on device"*로 실패합니다. 해결책은 *처음부터* 크게 잡거나, *partition repartition 도구*를 미리 준비. 양산 후 partition 변경은 *boot loader·env까지 같이 갱신*해야 해서 사실상 *recovery 시나리오*가 필요합니다.

**env partition 비동기.** A 슬롯과 B 슬롯이 *같은 env partition을 공유*할 때, `fw_setenv`가 atomic write를 보장하지 못하면 *부팅 중 갱신 → 정전*으로 env가 깨집니다. U-Boot의 *redundant env* (`CONFIG_ENV_OFFSET_REDUND`)를 켜서 두 copy를 유지하는 게 표준 해법입니다.

**signature verification 실패.**

```text
rauc-install: signature verification failed: certificate not trusted
```

원인 후보 세 가지. target의 `ca.cert.pem`이 *옛 버전*이라 rotation 후 갱신이 안 됐거나, bundle 서명 시 *intermediate가 누락*됐거나 (`rauc bundle --intermediate inter.cert.pem` 필요), target 시계가 *cert valid range 밖*인 경우입니다. 세 번째는 의외로 자주. *embedded board의 RTC가 1970년*이면 *모든 cert가 not-yet-valid*로 거부됩니다. `--no-check-time` 옵션은 *개발 전용*이고 양산에 두면 안 됩니다.

**bundle MIME format wrong.** swupdate에서 `Invalid header magic`이 뜨면 CPIO가 *newc가 아닌 다른 format*으로 만들어진 경우입니다. `cpio -ov -H newc`가 정답이고, 기본 format이나 tar는 실패합니다. 또한 *외부 gzip 압축*을 두지 않습니다. swupdate는 stream을 *순차*로 읽으므로 외부 압축 layer가 있으면 *부분 streaming이 불가능*해집니다. 압축은 *내부 image별*로만 적용합니다 (`compressed = "zlib";`).

## 정리

- OTA는 패키지 한 개가 아니라 *7개 영역의 정렬* — partition, bootloader, bundle, 서명, rollback, delivery, 상태 머신.
- 결정 차원은 *슬롯 모델 (A/B vs delta vs container)*, *서명 정책 (단일 vs CA chain)*, *rollback 방식 (passive vs active)*의 3개입니다.
- RAUC·swupdate·Mender의 차이는 *bundle 포맷·생태계·서버*입니다. firmware 위주면 RAUC, handler 자유도 우선이면 swupdate, server까지 통합 패키지를 원하면 Mender.
- RAUC 통합은 *system.conf + manifest + post-image hook*의 세 파일로 끝납니다. `rauc bundle` 명령이 hash·서명을 자동 처리합니다.
- swupdate 통합의 핵심은 *sw-description + CPIO newc 컨테이너 + sw-description이 첫 파일*. embedded webserver를 같이 켜면 별도 서버 없이 현장 업로드가 됩니다.
- A/B 부팅의 결정자는 *U-Boot*이며, RAUC·swupdate는 `fw_setenv`로 변수를 갱신합니다. `/etc/fw_env.config`의 정확성이 보드 brick 여부를 가릅니다.
- partition layout의 시작점은 *boot + rootfs-A + rootfs-B + appdata + data + recovery*의 6개. eMMC 4 GB 기준 *800 MB × 2*가 흔한 비율입니다.
- 양산은 *CA chain + active rollback (health check) + watchdog*의 3단 방어가 default. RTC 배터리·NTP 동기까지 chain의 일부로 봐야 합니다.

## 다음 장 예고

다음 편은 **Ch 17: SDK 생성·배포 — `make sdk`와 application 워크플로**. OTA로 *시스템 이미지*를 갱신하는 흐름을 마쳤다면, 그 위에서 *application 개발자*가 어떻게 빌드 환경을 받아 쓰는지 다룹니다.


## 관련 항목

- [Ch 13: U-Boot 통합 — env·bootcmd·MMC layout](/blog/embedded/buildroot/chapter13-uboot-integration-integration) — `fw_env.config`·bootcount의 출처
- [Ch 15: post-build·post-image 스크립트 심화](/blog/embedded/buildroot/chapter15-post-build-deep-deep) — RAUC bundle 생성 hook의 정석
- [Ch 18: 보안·CVE 관리 — secure boot, SBOM, CVE tracking](/blog/embedded/buildroot/chapter18-security-cve-cve) — OTA 서명 키와 secure boot의 chain of trust
- [U-Boot Ch 17: A/B 업데이트 — bootcount와 altbootcmd](/blog/embedded/bootloader/chapter17-ab-update) — bootloader 측 시각
- [U-Boot Ch 20: RAUC·swupdate 통합 — bootloader 측 책임](/blog/embedded/bootloader/chapter20-rauc-swupdate) — Buildroot 통합의 반대편 절반
- [BSP Development Ch 14: 업데이트 시스템 설계](/blog/embedded/bsp/chapter14-update-system) — BSP 관점의 OTA 아키텍처
- [원문 — RAUC documentation](https://rauc.readthedocs.io/)
- [원문 — swupdate documentation](https://sbabic.github.io/swupdate/)
