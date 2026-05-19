---
title: "Ch 18: OTA와 field recovery"
date: 2026-05-09T18:00:00
description: "현장 배포된 보드의 펌웨어 업데이트와 복구 — RAUC/SWUpdate 통합, recovery 파티션, USB recovery."
series: "BSP Development"
seriesOrder: 18
tags: [embedded, bsp, ota, recovery, rauc, swupdate]
draft: false
---

## 한 줄 요약

**OTA의 핵심은 *원자성*과 *롤백*입니다. 한 줄 요약하면 "절대 벽돌이 되지 않는다"입니다.** 이를 보장하는 것이 A/B 슬롯, bootcount, 그리고 서명된 update agent입니다.

OTA가 없는 BSP는 *현장에서 죽은* BSP입니다. 가전, 차량, 산업 IoT 모두 펌웨어를 회수해 다시 굽는 비용을 감당할 수 없습니다. 동시에 OTA가 *잘못* 설계되면 한 번의 실패가 전체 fleet을 벽돌로 만듭니다.

이번 글은 OTA 아키텍처 비교, RAUC/SWUpdate 같은 update agent 통합, U-Boot의 bootcount fallback, 서명과 delta update를 다룹니다.

## OTA 아키텍처 비교

| 방식 | 슬롯 구성 | 디스크 사용 | 롤백 | 적합 |
|------|----------|-----------|------|------|
| Single + recovery | rootfs + recovery | rootfs + 100MB | recovery에서 다시 flash | 저용량 |
| A/B 전체 슬롯 | 2× (boot+rootfs) | 2× | 즉시 (재부팅) | 표준 |
| A/B with shared data | 2× (boot+rootfs) + data | 2× + data | 즉시, data 유지 | 가전 표준 |
| Delta + A/B | 2× + delta cache | 2× + 일부 | 즉시 | 대역폭 절약 |
| Atomic with ostree | content-addressed | 1× + 작은 cache | git처럼 checkout | 컨테이너 워크로드 |

가장 안전하고 흔한 패턴은 *A/B with shared data*입니다. boot/rootfs는 2벌, data는 1벌 공유.

## A/B 슬롯과 bootcount

U-Boot의 `bootcount`는 A/B 패턴의 핵심입니다. 매 부팅마다 +1, application이 정상 부팅을 확인하면 0으로 reset, 임계치 초과 시 `altbootcmd`로 fallback.

```text
# U-Boot env
bootcount=0
bootlimit=3
bootcmd=run boot_active
altbootcmd=run switch_slot

boot_active=if test "$slot" = "B"; then run boot_b; else run boot_a; fi
boot_a=setenv bootargs root=PARTUUID=$uuid_rootfs_a ...; load mmc 0:2 ...; bootm
boot_b=setenv bootargs root=PARTUUID=$uuid_rootfs_b ...; load mmc 0:3 ...; bootm
switch_slot=if test "$slot" = "B"; then setenv slot A; else setenv slot B; fi; saveenv; reset
```

application이 부팅 직후 reset 하지 않으면 watchdog과 같습니다.

```c
// /usr/sbin/bootcount-reset
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    // 시스템 준비 검증
    if (check_critical_services_running() != 0) {
        return 1;  // bootcount 유지 - U-Boot가 fallback 트리거
    }

    // U-Boot env 변수 reset
    return system("fw_setenv bootcount 0");
}
```

이 binary를 systemd unit으로 등록합니다. 모든 critical service가 올라간 *후* 실행되어야 합니다.

```text
# /etc/systemd/system/bootcount-reset.service
[Unit]
Description=Reset bootcount after successful boot
After=multi-user.target mybsp-init.service
Requires=mybsp-init.service

[Service]
Type=oneshot
ExecStart=/usr/sbin/bootcount-reset
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

`fw_setenv`는 U-Boot의 `tools/env/`에서 빌드한 utility로 Linux에서 U-Boot env partition을 안전하게 수정합니다. `/etc/fw_env.config`에 partition 위치를 명시합니다.

```text
# /etc/fw_env.config
/dev/mmcblk0p1   0x0000  0x20000   0x20000
/dev/mmcblk0p1   0x20000 0x20000   0x20000
```

두 줄은 redundant env입니다. 둘 다 두면 write 중 전원이 끊겨도 한쪽은 살아남습니다.

## RAUC — Robust Auto-Update Controller

RAUC는 Pengutronix가 만든 update agent입니다. *bundle* 단위로 업데이트하며 GPG/x509 서명을 강제합니다.

```text
# /etc/rauc/system.conf
[system]
compatible=mybsp-rev-a
bootloader=uboot
data-directory=/var/lib/rauc

[keyring]
path=/etc/rauc/keyring.pem

[slot.rootfs.0]
device=/dev/disk/by-partlabel/rootfs-a
type=ext4
bootname=A

[slot.rootfs.1]
device=/dev/disk/by-partlabel/rootfs-b
type=ext4
bootname=B

[slot.boot.0]
device=/dev/disk/by-partlabel/boot-a
type=vfat
parent=rootfs.0

[slot.boot.1]
device=/dev/disk/by-partlabel/boot-b
type=vfat
parent=rootfs.1
```

bundle 만들기:

```bash
$ cat > manifest.raucm <<EOF
[update]
compatible=mybsp-rev-a
version=1.5.0

[bundle]
format=verity

[image.rootfs]
filename=rootfs.ext4

[image.boot]
filename=boot.vfat
EOF

$ rauc bundle \
    --cert=cert.pem \
    --key=key.pem \
    bundle-input/ \
    mybsp-1.5.0.raucb
```

target 보드에서 install:

```bash
$ rauc install mybsp-1.5.0.raucb
installing
  0% Installing
 10% Determining slot states
 20% Checking bundle
 30% Verifying signature
 50% Determining target install group
 60% Updating slots
 80% Writing slot rootfs.1
 95% Writing slot boot.1
100% Installing done.

$ rauc status
=== System Info ===
Compatible:  mybsp-rev-a
Variant:
Booted from: rootfs.0 (A)

=== Bootloader ===
Activated: rootfs.1 (B)

=== Slot States ===
o [rootfs.0] (active, booted)
        bootname: A
        boot status: good

x [rootfs.1] (inactive, pending)
        bootname: B
        boot status: pending
```

재부팅하면 B가 부팅됩니다. 정상 부팅 후 RAUC가 자동으로 `boot status: good`을 표시합니다.

## SWUpdate

SWUpdate는 SBabic이 만든 대안입니다. 더 *유연*하지만 그만큼 *직접 설정*해야 할 게 많습니다. WebGUI, Hawkbit 통합, suricatta 모드(서버 polling)가 강점입니다.

```text
# /etc/swupdate.cfg
globals: {
    verbose = true;
    loglevel = 5;
    syslog = true;
    public-key-file = "/etc/swupdate/public.pem";
};
```

bundle은 `.swu` (CPIO archive)입니다.

```text
# sw-description
software = {
    version = "1.5.0";

    hardware-compatibility: ["mybsp-rev-a"];

    stable = {
        copy1: {
            images: (
                {
                    filename = "rootfs.ext4";
                    device = "/dev/disk/by-partlabel/rootfs-a";
                    sha256 = "abc...";
                }
            );
        };
        copy2: {
            images: (
                {
                    filename = "rootfs.ext4";
                    device = "/dev/disk/by-partlabel/rootfs-b";
                    sha256 = "abc...";
                }
            );
        };
    };
};
```

```bash
$ swupdate -i mybsp-1.5.0.swu -k /etc/swupdate/public.pem
```

`suricatta` 모드는 Hawkbit 서버를 polling 합니다. 서버에 새 release를 올리면 fleet이 자동 다운로드합니다.

## Mender와 ostree

Mender는 *상용 OTA platform* 성격이 강합니다. Cloud 또는 self-hosted server + 클라이언트로 구성됩니다. Yocto 통합이 잘 되어 있고, dashboard에서 fleet 관리가 됩니다.

ostree는 *content-addressed* 모델입니다. 파일별 hash로 저장해 두 슬롯이 공통 파일을 공유합니다. 디스크 사용을 줄이지만 그만큼 BSP 통합 복잡도가 올라갑니다. Automotive Grade Linux와 Fedora Silverblue가 채택했습니다.

| 도구 | 강점 | 약점 |
|------|------|------|
| RAUC | 단순, robust, BSP 친화 | 서버 필요 별도 |
| SWUpdate | 유연, suricatta, GUI | 설정 복잡 |
| Mender | Dashboard, cloud, fleet 관리 | 상용 의존도 |
| ostree | 디스크 효율 | 학습 곡선, 복잡 |

소규모 fleet이면 RAUC, 대규모면 Mender, 자유도가 필요하면 SWUpdate가 일반적인 선택입니다.

## 서명과 보안

OTA bundle을 서명하지 않은 BSP는 *언젠가* 침해됩니다. 공격자가 자체 bundle을 보내 임의 코드를 실행시키는 시나리오입니다.

키 계층은 다음과 같습니다.

```text
Root CA (HSM에 보관, off-line)
 └─ Intermediate CA
     ├─ Signing key (개발용, QA 환경)
     └─ Signing key (production, HSM)
```

target 보드의 `/etc/rauc/keyring.pem`에는 *공개키 chain*만 둡니다. 비밀키는 빌드 서버 또는 HSM에 있습니다.

```bash
# Root CA 생성 (1회만)
$ openssl req -newkey rsa:4096 -keyout root.key -x509 -days 7300 -out root.crt

# Intermediate CA (서명 전용)
$ openssl req -newkey rsa:4096 -keyout intermediate.key -out intermediate.csr
$ openssl x509 -req -CA root.crt -CAkey root.key -in intermediate.csr \
    -out intermediate.crt -days 3650

# Bundle 서명용 cert
$ openssl req -newkey rsa:2048 -keyout bundle.key -out bundle.csr
$ openssl x509 -req -CA intermediate.crt -CAkey intermediate.key \
    -in bundle.csr -out bundle.crt -days 365

# 보드에 들어갈 keyring
$ cat root.crt intermediate.crt > /etc/rauc/keyring.pem
```

bundle 서명 시:

```bash
$ rauc bundle \
    --cert=bundle.crt \
    --key=bundle.key \
    --intermediate=intermediate.crt \
    input/ output.raucb
```

키 만료가 진짜 문제입니다. cert를 1년으로 발급해 두면 1년 후 모든 fleet이 update 거부합니다. *충분히 길게* (5~10년) 그리고 *교체 절차* 미리 마련.

TLS download 채널도 검증해야 합니다. bundle 서명만으로 충분하다는 의견이 있지만, 중간자 차단을 위해 mutual TLS + bundle 서명의 *이중 방어*가 안전합니다.

## Delta Update

전체 image를 매번 보내면 cellular 환경에서 부담됩니다. delta는 *이전 버전과의 차이*만 전송합니다.

`bsdiff`는 binary diff의 고전입니다. 1.2.0 → 1.3.0 사이의 patch를 만들어 두면 100MB rootfs가 수 MB로 줄어듭니다.

```bash
$ bsdiff rootfs-1.2.0.ext4 rootfs-1.3.0.ext4 patch.bin
$ bspatch rootfs-1.2.0.ext4 rootfs-1.3.0-restored.ext4 patch.bin
```

`zchunk`는 chunk별 hash로 *재사용 가능한 diff*를 만듭니다. delta 캐시 hit가 높아지면 transfer가 더 줄어듭니다. Fedora가 RPM repo에 zchunk를 채택했습니다.

`casync`는 Lennart Poettering이 만든 content-defined chunking 도구입니다. ostree와 유사한 철학을 raw image에 적용합니다. RAUC가 casync bundle을 지원합니다.

```bash
$ casync make rootfs.caibx rootfs.ext4
$ casync extract --store http://server/casync-store/ rootfs.caibx rootfs.ext4
```

server는 chunk store를 호스팅합니다. 보드는 변경된 chunk만 다운로드합니다.

## Recovery 파티션

A/B 슬롯이 둘 다 망가지는 극단 케이스도 가능합니다. NAND bit-flip, 잘못된 partition 쓰기, 파일시스템 corruption 등입니다. recovery 파티션은 *최소 시스템*으로 마지막 방어선입니다.

```text
GPT
├─ boot-a, boot-b
├─ rootfs-a, rootfs-b
├─ recovery (32~128MB)   # initramfs + 최소 driver + USB host
└─ data
```

recovery는 다음을 할 수 있어야 합니다.

- USB stick의 update bundle을 읽을 수 있음
- network로 image를 다운로드할 수 있음
- A/B 슬롯을 raw로 다시 쓸 수 있음
- 사용자 data를 보존하면서 system reset

부트로더가 키 입력(예: GPIO button 5초)으로 recovery 모드로 진입하도록 합니다.

```text
# U-Boot
=> if gpio input recovery_btn; then run recovery_boot; fi
=> recovery_boot=setenv slot recovery; load mmc 0:N ...; bootm
```

## USB recovery (uuu, fastboot, DFU)

부트 영역까지 망가지면 *SoC ROM의 USB 모드*로 복구합니다. 이 모드는 SoC가 제공하는 *고정* 기능입니다.

| SoC | USB recovery | Trigger |
|-----|--------------|---------|
| i.MX | Serial Download (uuu) | BOOT_MODE strap |
| STM32MP1 | USB DFU | BOOT pin |
| RK | MaskROM | RECOVERY button |
| Allwinner | FEL | FEL button |

이 모드는 부트 미디어 자체가 비어 있어도 동작합니다. 양산 line 첫 flash와 현장 복구의 *최후 수단*입니다. BSP는 이 경로를 *반드시* 테스트해 두어야 합니다.

## 자주 하는 실수

**bootcount reset을 너무 일찍.** application이 launch 되자마자 reset 하면 application crash 후에도 fallback이 안 됩니다. critical service 모두 확인 후에 reset.

**A/B 슬롯이 같은 file system label.** 양쪽 다 LABEL=rootfs면 mount가 wrong slot으로 갈 수 있습니다. PARTUUID로 구분.

**Update agent 자체를 업데이트.** RAUC 1.0이 RAUC 2.0 bundle을 install 하다가 자기 자신을 덮어쓰면 중간에 죽습니다. agent는 항상 *현재 살아 있는 슬롯*에서 *반대 슬롯*으로 씁니다.

**키 만료 무시.** 5년 cert를 발급해 둔 fleet이 5년 후 update 못 받음. 키 rotation 절차와 expiry 모니터링 필요.

**Bundle 서명만 신뢰.** HTTP로 다운로드하면 중간자가 *유효 서명된 옛 bundle*을 재전송할 수 있습니다(downgrade 공격). 서버에 monotonically increasing version + nonce 확인.

**Recovery 미테스트.** 양산 후 한 번도 recovery 경로를 안 타본 BSP는 진짜 recovery가 필요한 순간에 실패합니다. CI에서 매 release마다 recovery test 자동화.

## 정리

- OTA의 두 원칙은 원자성과 롤백입니다. 부팅 실패 시 이전 슬롯으로 자동 복귀해야 합니다.
- A/B 슬롯 + U-Boot bootcount/bootlimit가 산업 표준 패턴입니다.
- RAUC는 BSP 친화적이고 단순, SWUpdate는 유연, Mender는 dashboard 강점, ostree는 디스크 효율.
- bundle 서명은 필수입니다. Root CA + intermediate + signing key의 3단 hierarchy를 사용하고 비밀키는 HSM에 둡니다.
- delta update(bsdiff, zchunk, casync)는 cellular 환경의 update 비용을 한 자릿수 MB로 줄입니다.
- recovery 파티션은 마지막 방어선입니다. USB/network로 fleet을 다시 살릴 수 있는 최소 시스템.
- SoC ROM의 USB recovery (uuu, DFU, FEL)는 *반드시* 테스트하고 양산 line과 field 모두에 준비해 둡니다.

## 다음 편 예고

[Ch 19: Stability testing](/blog/embedded/bsp/chapter19-stability-testing)에서는 양산 BSP의 안정성 검증을 다룹니다. stress, soak, thermal cycling, EMC 영향, 자동 회귀 감시까지 살펴봅니다.

## 관련 항목

- [Ch 17: 이미지 패키징](/blog/embedded/bsp/chapter17-image-packaging) — A/B 파티션 layout
- [Ch 20: 양산 환경](/blog/embedded/bsp/chapter20-production) — 키 관리와 CI
- [Bootloader 시리즈 — bootcount](/blog/embedded/bootloader/) — U-Boot 측 깊이
- [Embedded Security 시리즈](/blog/embedded/embedded-security/) — 서명, HSM, secure boot
