---
title: "BSP OTA와 Field Recovery — A/B 슬롯·롤백·BootCount"
slug: "embedded/bsp/chapter18-ota-recovery"
date: 2026-05-18T09:18:00
description: "현장 배포된 보드의 펌웨어 업데이트와 복구 — RAUC/SWUpdate 통합, recovery 파티션, USB recovery."
series: "BSP Development"
seriesOrder: 18
tags: [embedded, bsp, ota, recovery, rauc, swupdate]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

**OTA는 업데이트 원자성, 실패 탐지, 복구 경로를 함께 설계해야 합니다.** A/B 슬롯과 서명 검증은 위험을 줄이는 구성요소이고, 전원·저장장치·부트로더 고장까지 막아 주지는 않습니다.

이번 글은 슬롯 구성, U-Boot bootcount fallback, update agent, 서명, delta update, 복구 경로를 다룹니다. RAUC 1.13으로 3단 인증서 체인과 bundle을 실제로 만들어 검증했고, 인증서 만료 뒤의 동작, bsdiff와 casync의 delta도 Debian 13 guest에서 돌렸습니다. U-Boot bootcount fallback과 RAUC의 U-Boot 슬롯 스크립트(`BOOT_ORDER`/`BOOT_x_LEFT`)를 QEMU에서 돌린 기록은 [Bootloader Ch 17](/blog/embedded/bootloader/chapter17-ab-update)에 있습니다. `rauc install`과 `mark-good`은 이 시리즈에서 실행하지 않았습니다.

## OTA 아키텍처 비교

| 방식 | 슬롯 구성 | 롤백 |
|------|----------|------|
| Single + recovery | rootfs + recovery | recovery에서 다시 기록 |
| A/B 전체 슬롯 | boot+rootfs 두 벌 | 다른 슬롯으로 재부팅 |
| A/B + 공유 data | boot+rootfs 두 벌 + data 한 벌 | 다른 슬롯으로 재부팅, data 유지 |
| Delta + A/B | A/B에 변경분만 전송 | 다른 슬롯으로 재부팅 |

이삿짐에 비유하면 A/B는 새 집을 다 꾸민 뒤 이사하는 방식입니다. 새 집(비활성 슬롯)에 문제가 있으면 옛 집으로 돌아가면 됩니다. Ch 17의 layout(boot-a/b, rootfs-a/b, data)이 세 번째 방식입니다.

## A/B 슬롯과 bootcount

U-Boot v2024.04 `doc/README.bootcount`에 따르면 `CONFIG_BOOTCOUNT_LIMIT`이 켜지면 재부팅마다 `bootcount`가 1씩 오르고, `bootlimit`을 넘으면 `bootcmd` 대신 `altbootcmd`가 실행됩니다. 성공한 부팅 뒤 `bootcount`를 0으로 돌리는 것은 Linux 쪽 책임입니다(Ch 17).

```text
# U-Boot env
bootlimit=3
bootcmd=run boot_active
altbootcmd=run switch_slot

boot_active=if test "$slot" = "B"; then run boot_b; else run boot_a; fi
boot_a=setenv bootargs root=PARTUUID=${uuid_rootfs_a} rootwait; load mmc 0:2 ${kernel_addr_r} Image; load mmc 0:2 ${fdt_addr_r} mybsp.dtb; booti ${kernel_addr_r} - ${fdt_addr_r}
boot_b=setenv bootargs root=PARTUUID=${uuid_rootfs_b} rootwait; load mmc 0:3 ${kernel_addr_r} Image; load mmc 0:3 ${fdt_addr_r} mybsp.dtb; booti ${kernel_addr_r} - ${fdt_addr_r}
switch_slot=if test "$slot" = "B"; then setenv slot A; else setenv slot B; fi; setenv bootcount 0; saveenv; reset
```

Linux 쪽에서 bootcount를 0으로 돌리는 서비스는 핵심 서비스가 올라온 뒤에 실행합니다. 아래 C 코드는 흐름만 보이는 예이고 `check_critical_services_running()`은 제품이 정의해야 합니다.

```c
// /usr/sbin/bootcount-reset
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    if (check_critical_services_running() != 0)
        return 1;  // bootcount 유지 - 다음 재부팅에서 U-Boot가 판단

    return system("fw_setenv bootcount 0");
}
```

```ini
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

`fw_setenv`는 `/etc/fw_env.config`에 적힌 위치에서 U-Boot 환경을 읽고 씁니다. U-Boot 소스의 예제 `tools/env/fw_env.config`는 "Up to two entries are valid, in this case the redundant environment sector is assumed present"라고 적고, block device 예로 `/dev/mmcblk0 0xc0000 0x20000`을 듭니다. 이 offset과 크기는 U-Boot 쪽 `CONFIG_ENV_OFFSET`, `CONFIG_ENV_SIZE`와 같아야 합니다. i.MX 8M Plus EVK라면 `0x400000`과 `0x1000`입니다(Ch 6).

```text
# /etc/fw_env.config (EVK 값으로 쓴 예)
/dev/mmcblk1   0x400000   0x1000
```

## RAUC — Robust Auto-Update Controller

RAUC는 *bundle* 단위로 업데이트하고 서명을 검증합니다. 대상 시스템의 설정 예입니다. `bootloader` 값으로는 `barebox`, `grub`, `uboot`, `efi`, `custom`, `noop`이 있습니다(RAUC v1.13 Reference).

`bootloader=uboot`로 두면 RAUC는 위의 `slot` 변수가 아니라 `BOOT_ORDER`와 `BOOT_<bootname>_LEFT` 환경 변수를 바꿉니다(RAUC 통합 문서, Bootloader Ch 17). 그래서 RAUC를 쓸 때는 위 스크립트 대신 그 변수를 읽는 boot script를 씁니다.

```ini
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
```

bundle을 만들고 검증해 본 결과입니다. manifest와 명령은 다음과 같습니다.

```ini
[update]
compatible=mybsp-rev-a
version=1.5.0

[bundle]
format=verity

[image.rootfs]
filename=rootfs.ext4
```

```text
$ rauc bundle --cert=pki/bundle.crt --key=pki/bundle.key --intermediate=pki/int.crt in/ mybsp-1.5.0.raucb
Creating 'verity' format bundle
$ ls -l mybsp-1.5.0.raucb
-rw-r--r-- 1 root root 15550 Nov 16 08:27 mybsp-1.5.0.raucb
$ rauc info --keyring=pki/keyring.pem mybsp-1.5.0.raucb
rauc-Message: 08:27:06.226: Verified inline signature by 'CN = MyBSP Bundle Signer'
Compatible:     'mybsp-rev-a'
Version:        '1.5.0'
...
Bundle Format:  verity
...
Certificate Chain:
 0 Subject: CN = MyBSP Bundle Signer
   Issuer: CN = MyBSP Intermediate
   ...
   Not After:  Nov 16 08:27:06 2027 GMT
 1 Subject: CN = MyBSP Intermediate
   Issuer: CN = MyBSP Root CA
   ...
 2 Subject: CN = MyBSP Root CA
   Issuer: CN = MyBSP Root CA
```

이 시험의 ext4에는 버전 파일 하나만 있었고, bundle은 15,550바이트였습니다. 대상 보드에서 `rauc install`로 비활성 슬롯에 쓰고, 다음 부팅이 성공하면 제품 로직이 `rauc status mark-good`을 부릅니다. RAUC는 application이 정상인지 스스로 판단하지 않습니다.

## SWUpdate

SWUpdate는 `.swu`(CPIO) 이미지와 `sw-description` 파일로 동작하는 다른 update agent입니다. 아래 `sw-description`은 같은 rootfs를 두 슬롯 중 하나에 쓰는 구조의 예이고, 이 글에서는 실행하지 않았습니다.

```text
software = {
    version = "1.5.0";

    hardware-compatibility: ["mybsp-rev-a"];

    stable = {
        copy1: {
            images: (
                {
                    filename = "rootfs.ext4";
                    device = "/dev/disk/by-partlabel/rootfs-a";
                    sha256 = "...";
                }
            );
        };
        copy2: {
            images: (
                {
                    filename = "rootfs.ext4";
                    device = "/dev/disk/by-partlabel/rootfs-b";
                    sha256 = "...";
                }
            );
        };
    };
};
```

Mender와 OSTree도 같은 문제를 푸는 도구입니다. 이 글은 두 도구를 실행하지 않아 비교 표를 싣지 않습니다.

## 서명과 보안

bundle을 서명하지 않으면 누구든 자기 bundle을 보내 장치에서 코드를 실행할 수 있습니다. 위 bundle에 쓴 3단 인증서 체인은 다음 명령으로 만들었습니다.

```bash
# Root CA (20년)
openssl req -x509 -newkey rsa:4096 -nodes -keyout root.key -out root.crt -days 7300 -subj "/CN=MyBSP Root CA"
# Intermediate CA (10년, CA 확장 필요)
openssl req -newkey rsa:4096 -nodes -keyout int.key -out int.csr -subj "/CN=MyBSP Intermediate"
printf "basicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\n" > ca.ext
openssl x509 -req -CA root.crt -CAkey root.key -CAcreateserial -in int.csr -out int.crt -days 3650 -extfile ca.ext
# Bundle 서명용 (1년)
openssl req -newkey rsa:2048 -nodes -keyout bundle.key -out bundle.csr -subj "/CN=MyBSP Bundle Signer"
openssl x509 -req -CA int.crt -CAkey int.key -CAcreateserial -in bundle.csr -out bundle.crt -days 365
# 보드에 들어갈 keyring은 Root CA만
cat root.crt > keyring.pem
```

intermediate에 `basicConstraints=CA:TRUE`를 주지 않으면 체인 검증이 실패합니다. 확장 없이 만든 intermediate로 서명한 bundle을 같은 keyring으로 검사하면 `signature verification failed: Verify error: invalid CA certificate`가 나왔습니다. 보드에는 root의 공개 인증서만 두고, 비밀키는 빌드 서버나 HSM에 둡니다.

서명 인증서의 유효기간이 끝나면 무슨 일이 생기는지 `faketime`으로 시계를 2028년으로 돌려 확인했습니다.

```text
$ faketime "2028-01-01 00:00:00" rauc info --keyring=pki/keyring.pem mybsp-1.5.0.raucb
rauc-Message: 00:00:00.238: Reading bundle: /root/rauc/mybsp-1.5.0.raucb
rauc-Message: 00:00:00.239: Verifying bundle signature...
signature verification failed: Verify error: certificate has expired
```

1년짜리 서명 인증서로 만든 bundle은 1년 뒤의 장치에서 거부됩니다. 이미 배포된 bundle을 다시 보낼 때도 같습니다. RAUC Reference는 `[keyring]`의 `use-bundle-signing-time`을 켜면 "the bundle signing time is used instead of the current system time for certificate validation"이라고 적습니다. 어느 쪽을 쓰든 인증서 교체 절차와 만료 감시를 같이 설계합니다.

## Delta Update

전체 image를 매번 보내는 대신 이전 버전과의 차이만 보낼 수 있습니다. 두 도구를 32 MiB ext4 두 벌(8 MiB 파일은 같고, 버전 파일과 64 KiB 파일 하나만 다름)로 시험했습니다.

`casync`는 이미지를 내용 기반 chunk로 나눠 store에 넣고, 같은 chunk는 다시 저장하지 않습니다.

```text
$ casync make --store=store rootfs-1.2.0.caibx rootfs-1.2.0.ext4
$ du -sk store; find store -name "*.cacnk" | wc -l
9028	store
138
$ casync make --store=store rootfs-1.3.0.caibx rootfs-1.3.0.ext4
$ du -sk store; find store -name "*.cacnk" | wc -l
9204	store
148
$ casync extract --store=store rootfs-1.3.0.caibx out.ext4 && cmp out.ext4 rootfs-1.3.0.ext4 && echo casync-identical
casync-identical
```

1.3.0을 넣을 때 store에 새로 생긴 chunk는 10개, 176 KiB였습니다. 장치가 1.2.0의 chunk를 갖고 있다면 이 10개만 받으면 됩니다.

`bsdiff`는 결과가 덜 좋았습니다. 같은 32 MiB 두 벌에 Debian 13의 bsdiff 4.3을 돌리자 7분 29초 뒤 `Segmentation fault`로 끝났습니다. 1 MiB 파일에서 6바이트만 바꾼 경우는 0.147초에 169바이트 patch가 나왔고, `bspatch`로 되돌린 결과가 새 파일과 같았습니다. 큰 이미지 전체에 bsdiff를 쓰려면 메모리와 시간을 대상 크기로 먼저 시험합니다.

## Recovery 파티션

A/B 슬롯 둘 다 망가지는 경우를 대비한 최소 시스템이 recovery 파티션입니다. USB나 네트워크에서 이미지를 받아 슬롯을 다시 쓰고, 사용자 data를 보존하는 것이 역할입니다.

```text
GPT
├─ boot-a, boot-b
├─ rootfs-a, rootfs-b
├─ recovery              # initramfs + 최소 driver
└─ data
```

부트로더가 버튼 입력으로 recovery에 들어가게 할 수 있습니다. U-Boot v2024.04의 `gpio input`은 핀 값을 그대로 명령의 반환값으로 씁니다(`cmd/gpio.c:297-302`, 주석은 "Whilst wrong"이라고 적습니다). 반환값 0이 참이므로 아래 `if`는 핀이 0일 때, 즉 active-low 버튼을 눌렀을 때 참이 됩니다.

```text
=> if gpio input recovery_btn; then run recovery_boot; fi
```

## USB recovery (SoC ROM)

부트 영역까지 망가지면 SoC ROM의 USB 다운로드 모드로 복구합니다. 부트 매체가 비어 있어도 동작하는 모드입니다. U-Boot v2024.04 문서에서 확인한 모드입니다.

| SoC | ROM 모드 | 근거 |
|-----|---------|------|
| i.MX | Serial Download Protocol (SDP), `uuu`·`imx_usb_loader` | `doc/imx/misc/sdp.txt`, `doc/board/bsh/imx8mn_bsh_smm_s2.rst:56-61` |
| STM32MP1 | USB DFU 1.1 (STM32CubeProgrammer) | `doc/board/st/stm32mp1.rst:424-430` |
| Rockchip | Mask ROM 모드 (`lsusb`에 "in Mask ROM mode") | `doc/board/rockchip/rockchip.rst:295` |
| Allwinner | FEL | `doc/board/allwinner/sunxi.rst:9,269` |

진입 방법(boot 핀, 버튼)은 보드마다 회로도에 있습니다. 이 글은 실제 보드에서 이 모드들을 실행하지 않았습니다.

## 자주 하는 실수

**bootcount reset을 너무 일찍.** application이 뜨자마자 0으로 돌리면 그 뒤 application이 죽어도 fallback이 일어나지 않습니다. 핵심 서비스를 확인한 뒤에 돌립니다.

**A/B 슬롯이 같은 file system label.** 두 rootfs가 같은 `LABEL=`을 가지면 label로 마운트할 때 어느 쪽이 잡힐지 정해지지 않습니다. `PARTUUID`로 구분합니다(Ch 17).

**intermediate CA 확장 누락.** `basicConstraints=CA:TRUE` 없이 만든 intermediate는 위 시험에서 `invalid CA certificate`로 거부됐습니다.

**키 만료 무시.** 위 시험처럼 만료된 서명 인증서의 bundle은 `certificate has expired`로 거부됩니다.

**Recovery 미테스트.** recovery 경로는 쓸 일이 드물어 깨져도 모르기 쉽습니다. release마다 실제로 한 번 타 봅니다.

## 정리

- A/B 슬롯의 전환은 U-Boot `bootcount`/`bootlimit`/`altbootcmd`이고, 성공한 부팅 뒤 `bootcount`를 0으로 돌리는 것은 Linux 쪽 책임입니다.
- `fw_env.config`의 위치·크기는 U-Boot의 `CONFIG_ENV_OFFSET`·`CONFIG_ENV_SIZE`와 같아야 합니다.
- RAUC 1.13으로 3단 체인 서명 bundle을 만들고 `rauc info`로 검증했습니다. 서명 인증서가 만료되면 검증이 실패합니다.
- casync는 1.2.0 → 1.3.0에서 새 chunk 10개만 store에 더했고, bsdiff는 32 MiB 이미지에서 segfault, 1 MiB 파일에서는 169바이트 patch였습니다.
- SoC ROM의 USB 복구 모드(i.MX SDP, STM32MP1 DFU, Rockchip Mask ROM, Allwinner FEL)는 U-Boot 문서에 근거가 있고, 보드에서 직접 시험해 둡니다.

## 다음 편 예고

[Ch 19: Stability testing](/blog/embedded/bsp/chapter19-stability-testing)에서는 양산 BSP의 안정성 검증을 다룹니다. stress, soak, thermal cycling, EMC 영향, 자동 회귀 감시까지 살펴봅니다.

## 관련 항목

- [Ch 17: 이미지 패키징](/blog/embedded/bsp/chapter17-image-packaging) — A/B 파티션 layout
- [Ch 20: 양산 환경](/blog/embedded/bsp/chapter20-production) — 키 관리와 CI
- [Bootloader Ch 17 — A/B 부팅 이중화](/blog/embedded/bootloader/chapter17-ab-update) — bootcount와 RAUC 슬롯 스크립트를 QEMU에서 실행
- [Embedded Security 시리즈](/blog/embedded/embedded-security/chapter01-threat-model) — 서명, HSM, secure boot
