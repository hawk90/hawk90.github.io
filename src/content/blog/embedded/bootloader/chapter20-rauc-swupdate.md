---
title: "Ch 20: RAUC / SWUpdate — 펌웨어 업데이트 프레임워크"
date: 2026-05-09T20:00:00
description: "U-Boot와 통합되는 펌웨어 업데이트 프레임워크 — RAUC와 SWUpdate의 비교와 적용."
series: "Bootloader Internals"
seriesOrder: 20
tags: [embedded, bootloader, u-boot, rauc, swupdate, ota]
draft: false
---

A/B 슬롯·서명·다운로드·진행 보고·롤백 정책을 직접 짜기 시작하면, 비슷한 코드를 여러 프로젝트에서 다시 짜는 자신을 발견합니다. RAUC와 SWUpdate는 그 *반복되는 뼈대*를 미리 마련해 둔 오픈소스 프레임워크입니다. 둘 다 U-Boot의 A/B 슬롯과 정확히 맞물려 동작합니다.

## 한 줄 요약

**RAUC는 *bundle*이라는 서명된 업데이트 단위로 슬롯을 갈아 끼우고, SWUpdate는 *sw-description*이라는 YAML/Lua 스크립트로 더 유연한 업데이트를 지원합니다. 둘 다 U-Boot의 env로 슬롯을 표시합니다.**

## 왜 프레임워크인가

직접 짜면 다음을 모두 다뤄야 합니다.

- 다운로드 (HTTP/HTTPS/MQTT/USB)
- 무결성 검증 (체크섬·서명)
- 슬롯 선택과 토글
- 진행 상태 표시·로그
- 실패 시 롤백
- 부분 업데이트 (rootfs만, bootloader만, etc.)
- 동시성 (다운로드 중에도 정상 서비스)

매번 다시 만들면 *버그가 매번 새로* 들어옵니다. 프레임워크는 이 흐름을 검증된 형태로 묶어 둡니다. RAUC와 SWUpdate가 가장 널리 쓰입니다.

## RAUC와 SWUpdate의 철학 차이

| 항목 | RAUC | SWUpdate |
|------|------|----------|
| 주도 | Pengutronix | sbabic·DENX |
| 설정 형식 | INI 풍 system.conf | libconfig 풍 sw-description |
| bundle 형식 | SquashFS + CMS 서명 | cpio + 이미지 + 서명 |
| GUI | 별도 | 내장 Mongoose 웹 UI |
| 원격 업데이트 | hawkBit 호환 | suricatta(hawkBit·자체) |
| Lua 후킹 | 제한적 | 풍부 |
| 부분 업데이트 | slot 단위 | image 단위, 더 세분화 |
| 학습 곡선 | 낮은 편 | 가팔라 보일 수 있음 |

성격을 한 줄로 추리면, **RAUC는 *기본을 안전하게* 깔아 두는 도구**이고, **SWUpdate는 *복잡한 시나리오까지 유연하게* 짤 수 있는 도구**입니다. 표준 A/B만 필요하면 RAUC가 빠르고, 부분 업데이트·복잡한 시퀀스·자체 hook이 많으면 SWUpdate 쪽이 자유롭습니다.

## RAUC — system.conf

장치 측에서 RAUC가 어떤 슬롯·어떤 키로 동작할지 적는 파일입니다.

```ini
# /etc/rauc/system.conf
[system]
compatible=boardX-v1
bootloader=uboot
mountprefix=/run/rauc

[keyring]
path=/etc/rauc/keyring.pem

[handlers]
post-install=/usr/lib/rauc/post-install.sh

[slot.rootfs.0]
device=/dev/mmcblk0p2
type=ext4
bootname=A

[slot.rootfs.1]
device=/dev/mmcblk0p3
type=ext4
bootname=B

[slot.kernel.0]
device=/dev/mmcblk0p4
type=raw
parent=rootfs.0

[slot.kernel.1]
device=/dev/mmcblk0p5
type=raw
parent=rootfs.1
```

`bootname=A`·`bootname=B`가 *U-Boot env의 `BOOT_SLOT`* 값과 매핑됩니다. RAUC는 부팅 성공이 확정되면 이 값을 자동으로 토글합니다.

## RAUC bundle 만들기

bundle은 *서명된 SquashFS*입니다. manifest.raucm과 이미지를 묶어 빌드 호스트에서 만듭니다.

```text
# manifest.raucm
[update]
compatible=boardX-v1
version=2026.05.0

[bundle]
format=verity

[image.rootfs]
filename=rootfs.ext4
sha256=...

[image.kernel]
filename=boot.itb
sha256=...
```

```bash
rauc --cert=cert.pem --key=key.pem \
     bundle ./bundle-content/ \
     boardX-v2026.05.0.raucb
```

`.raucb` 한 파일이 결과물입니다. CMS 서명이 박혀 있고, `compatible`이 안 맞으면 RAUC가 거부합니다. 다른 보드의 bundle을 *실수로 받아 끼우는* 사고가 그래서 잘 안 일어납니다.

## RAUC 설치 흐름

장치 측에서 한 줄입니다.

```bash
# 다운로드한 bundle 설치
rauc install /tmp/boardX-v2026.05.0.raucb
```

RAUC가 내부에서 다음을 합니다.

```text
1. bundle 서명 확인 (keyring.pem의 인증서로)
2. compatible·version 검사
3. 비활성 슬롯 결정 (현재 A면 B)
4. 비활성 슬롯에 이미지 기록
5. fw_setenv로 BOOT_SLOT=B, bootcount=0, upgrade_available=1
6. (옵션) post-install handler 실행
7. exit
```

그다음 `reboot`은 사용자(또는 update agent)가 합니다. 자동 reboot이 *항상* 좋은 동작이 아니라 그렇게 분리한 설계입니다.

부팅 성공 표시는 `rauc status mark-good`이 담당합니다.

```bash
# systemd unit (부팅 성공 확정 시 실행)
ExecStart=/usr/bin/rauc status mark-good booted
```

이 명령이 호출되면 RAUC가 `fw_setenv bootcount=0`·`upgrade_available=0`을 박아 다음 부팅에서 fallback이 발동하지 않게 합니다.

## SWUpdate — sw-description

SWUpdate의 같은 시나리오는 *bundle 안에 sw-description 파일*이 들어 있는 형태입니다.

```text
software =
{
    version = "2026.05.0";
    description = "boardX rootfs + kernel update";

    boardX = {
        stable = {
            copy-1 = {
                images: (
                    {
                        filename = "rootfs.ext4";
                        device = "/dev/mmcblk0p3";
                        type = "raw";
                        sha256 = "...";
                    },
                    {
                        filename = "boot.itb";
                        device = "/dev/mmcblk0p5";
                        type = "raw";
                        sha256 = "...";
                    }
                );

                bootenv: (
                    {
                        name = "BOOT_SLOT";
                        value = "B";
                    },
                    {
                        name = "bootcount";
                        value = "0";
                    },
                    {
                        name = "upgrade_available";
                        value = "1";
                    }
                );
            };
        };
    };
};
```

`copy-1`이 *비활성 슬롯 한 벌*입니다. `copy-2`까지 정의해 두면 SWUpdate가 *어느 슬롯이 비활성인지*에 따라 알아서 선택합니다.

bundle은 cpio로 묶습니다.

```bash
ls files/
sw-description rootfs.ext4 boot.itb

cd files
for f in sw-description rootfs.ext4 boot.itb; do
    echo $f
done | cpio -ov -H crc > ../boardX-v2026.05.0.swu
```

서명은 별도 `sw-description.sig`를 함께 cpio에 넣어 처리합니다.

## SWUpdate 설치 흐름

`swupdate` 데몬이 늘 떠 있고, 웹 UI·MQTT·USB·HTTP 등 다양한 소스에서 `.swu`를 받습니다.

```text
# /etc/swupdate.cfg (요지)
globals: {
    verbose = true;
    loglevel = 5;
    public-key-file = "/etc/swupdate/key.pub";
};

webserver: {
    document_root = "/usr/share/swupdate/www";
    port = 8080;
};

suricatta: {
    tenant = "default";
    id = "boardX-0001";
    url = "https://hawkbit.example.com";
};
```

```bash
# CLI로 직접 설치
swupdate -i /tmp/boardX-v2026.05.0.swu
```

웹 UI나 hawkBit 콘솔에서 push해도 같은 결과입니다. SWUpdate는 설치 후 *Lua hook*으로 추가 동작을 끼워 넣을 수 있어 "설치 직후 디바이스 ID 등록"·"수동 reboot 대신 5분 카운트다운" 같은 시나리오가 자연스럽습니다.

## U-Boot 측 설정

두 프레임워크 모두 U-Boot 측 부담은 거의 같습니다.

```text
# defconfig
CONFIG_BOOTCOUNT_LIMIT=y
CONFIG_BOOTCOUNT_ENV=y
CONFIG_CMD_SAVEENV=y
CONFIG_ENV_IS_IN_MMC=y

# boot script
setenv altbootcmd 'run switch_slot; run boot_active'
setenv bootcmd 'run boot_active'
setenv boot_active '
    if test "${BOOT_SLOT}" = "A"; then
        load mmc 0:1 ${kernel_addr_r} boot.itb;
    else
        load mmc 0:2 ${kernel_addr_r} boot.itb;
    fi;
    bootm ${kernel_addr_r}'
setenv switch_slot '
    if test "${BOOT_SLOT}" = "A"; then
        setenv BOOT_SLOT B;
    else
        setenv BOOT_SLOT A;
    fi;
    setenv bootcount 0;
    saveenv'
saveenv
```

이 부분이 Ch 17의 A/B 셋업과 거의 같습니다. RAUC·SWUpdate는 *그 위에서* 동작합니다.

## 어느 도구를 고르나

선택 기준을 정리하면 이렇습니다.

| 상황 | 권장 |
|------|------|
| 표준 A/B만 필요, 빨리 띄우고 싶다 | RAUC |
| Yocto 기반, Pengutronix layer를 이미 쓴다 | RAUC |
| hawkBit 서버를 사용한다 | 둘 다 OK, 다만 SWUpdate가 suricatta로 더 통합 |
| 부분 업데이트, 복잡한 시퀀스, Lua hook | SWUpdate |
| 웹 UI를 장치에 내장하고 싶다 | SWUpdate |
| Buildroot이고 가벼움 우선 | SWUpdate (RAUC도 가능) |
| CMS 서명만으로 충분 | RAUC |
| 오프라인 USB 업데이트도 자주 한다 | SWUpdate |

둘 중 무엇이든, *직접 짜는 것보다는* 거의 항상 안전합니다.

## 자주 하는 실수

OTA 운영에서 자주 만나는 함정입니다.

- **mark-good을 너무 빨리 호출한다.** 부팅 직후 systemd unit으로 mark-good을 박으면 *문제가 5분 뒤* 드러나는 경우 fallback이 동작하지 않습니다. 핵심 서비스가 안정될 때까지 지연시키는 편이 안전합니다.
- **compatible 필드를 보드 모델로만** 정한다. SoC revision이 바뀌었는데 같은 compatible로 잡혀 잘못된 bundle이 설치됩니다. revision까지 포함시키는 편이 안전합니다.
- **서명 검증 키를 squashfs 안에 같이 둔다.** 키를 자기 검증에 쓰는 셈이라 chain이 의미가 없습니다. 키는 *불변 영역* 또는 *읽기 전용 rootfs*에 박혀 있어야 합니다.
- **fw_setenv가 atomic이라고 가정한다.** 실제로는 *env 한 사본을 통째로 다시 쓰는* 동작이라, 두 사본을 두는 redundant env 설정을 권합니다.
- **bundle을 그대로 슬롯에 dd한다.** rauc·swupdate가 *각 image 별로* 별도 슬롯에 풉니다. bundle 자체는 슬롯에 들어가지 않습니다.
- **post-install handler에서 reboot한다.** RAUC가 *비활성 슬롯에 마운트한 상태*에서 reboot이 일어나면 sync가 덜 된 상태로 끝납니다. reboot은 RAUC 종료 이후 별도 명령으로.

## 정리

- RAUC는 *bundle 단위*, SWUpdate는 *image 단위*로 업데이트를 다룹니다.
- 둘 다 *비활성 슬롯에 기록*하고 *U-Boot env를 토글*해 다음 부팅에서 새 슬롯을 시도합니다.
- 부팅 성공 표시는 mark-good(RAUC) 또는 후속 스크립트(SWUpdate)가 담당합니다.
- compatible·version 검사가 *잘못된 bundle 끼우는* 사고를 막아 줍니다.
- RAUC는 *빠른 표준*, SWUpdate는 *유연한 hook과 웹 UI*가 강점입니다.
- U-Boot 측은 Ch 17의 A/B 셋업과 거의 같고, 프레임워크는 *그 위에서* 동작합니다.
- mark-good 호출 시점이 *실제 fallback 안전망*의 두께를 결정합니다.

## 다음 장 예고

이제까지 부트로더의 *기능*을 봤다면, 다음 두 장은 *실전 작업*입니다. 새 보드를 U-Boot에 어떻게 포팅하는지(Ch 21), 그리고 부트로더 자체가 문제 일으킬 때 어떻게 디버깅하는지(Ch 22)를 봅니다.

## 관련 항목

- [Ch 17: A/B 업데이트와 boot 이중화](/blog/embedded/bootloader/chapter17-ab-update)
- [Ch 21: 새 보드 포팅 — defconfig부터 첫 부팅까지](/blog/embedded/bootloader/chapter21-board-porting)
- [원문 — RAUC documentation](https://rauc.readthedocs.io/)
- [원문 — SWUpdate documentation](https://sbabic.github.io/swupdate/)
