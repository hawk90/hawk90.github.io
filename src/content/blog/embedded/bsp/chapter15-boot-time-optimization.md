---
title: "BSP 부트 시간 최적화 — Bootchart·initcall_debug·부팅 경로 측정"
slug: "embedded/bsp/chapter15-boot-time-optimization"
date: 2026-05-18T09:15:00
description: "대상 보드에서 부트 단계를 측정하고, 병목과 복구 조건을 확인하며 최적화하는 방법."
series: "BSP Development"
seriesOrder: 15
tags: [embedded, bsp, boot-time, optimization, sub-second]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

**부트 시간 최적화는 추측이 아니라 측정으로 시작합니다.** 각 단계의 시간을 ms 단위로 쪼개 본 다음, 가장 비싼 단계부터 깎아내려 갑니다.

제품마다 부팅 완료의 정의와 시간 예산이 다릅니다. 후방 카메라 영상 표시, 안전 상태 복구, 사용자 인터페이스 준비처럼 완료 조건을 먼저 정하고, 대상 제품의 요구사항과 실제 측정 결과를 비교합니다.

이번 글은 ROM에서 application 첫 줄까지의 전 구간을 *측정 가능한 단계*로 나눕니다. 그리고 각 단계에서 시간을 깎는 실전 기법을 정리합니다.

## 단계별 시간 모델

부트는 다음 단계로 나뉩니다. 다음 그림은 각 단계의 시간 비중을 시각화합니다.

![부트 시간 분석 — ROM부터 Application까지 각 단계의 시간 비중](/images/blog/bsp/diagrams/ch15-boot-time-breakdown.svg)

| 단계 | 시작 이벤트 | 끝 이벤트 | 기준 측정 | 변경 후 측정 |
|------|-------------|-----------|------------|---------------|
| ROM → SPL | 보드 전원/리셋 기준점 | SPL 첫 관측점 | 대상 보드에서 기록 | 같은 조건으로 재측정 |
| SPL/U-Boot | SPL 진입 | 커널 handoff | 대상 보드에서 기록 | 같은 조건으로 재측정 |
| Kernel | kernel entry | 정의한 kernel milestone | 대상 보드에서 기록 | 같은 조건으로 재측정 |
| Userspace | init 시작 | 제품 완료 조건 | 대상 보드에서 기록 | 같은 조건으로 재측정 |

표는 결과를 기록할 틀입니다. 숫자는 대상 하드웨어와 동일한 완료 조건에서 측정한 뒤 채우며, 다른 보드의 수치를 일반 기준으로 옮기지 않습니다.

## 측정 — printk timestamps와 bootchart

커널은 빌드 옵션 하나로 부팅 로그에 시간을 박아 줍니다.

```text
CONFIG_PRINTK_TIME=y
```

또는 부팅 명령줄에 `printk.time=1`을 넣으면 dmesg 출력의 모든 줄에 `[초.마이크로초]` prefix가 붙습니다.

```text
[    0.000000] Booting Linux on physical CPU 0x0
[    0.234521] random: get_random_bytes called from start_kernel
[    0.512344] PCI: bus0: Fast back to back transfers enabled
[    1.234567] systemd[1]: Detected architecture arm.
```

여기서 0초는 kernel 시작 시점입니다. 그 앞 단계는 별도로 봐야 합니다. U-Boot에서는 `bootstage report`가 단계별 시간을 보여 줍니다.

```text
=> bootstage report
Timer summary in microseconds (12 records):
       Mark    Elapsed  Stage
          0          0  reset
    218,453    218,453  board_init_f
    345,221    126,768  board_init_r
    421,003     75,782  eth_common_init
    498,221     77,218  bootm_start
    523,144     24,923  start_kernel
```

systemd가 init이면 `systemd-analyze`가 userspace 단계를 분해합니다.

```bash
$ systemd-analyze
Startup finished in 1.234s (kernel) + 2.567s (userspace) = 3.801s
multi-user.target reached after 2.234s in userspace.

$ systemd-analyze blame
   1.234s NetworkManager.service
    876ms ModemManager.service
    543ms udev-trigger.service
    321ms my-app.service
```

bootchart는 동일 정보를 *간트 차트*로 그려 줍니다. 의존성과 병렬 실행 여부가 한눈에 보입니다.

```bash
# Buildroot
BR2_PACKAGE_BOOTCHART=y
# 또는 systemd-bootchart 사용
systemd-bootchart --no-syslog --output=/tmp/bootchart.svg
```

ftrace의 `boot_tracer`는 커널 내부의 `do_initcall`을 추적합니다.

```text
CONFIG_BOOT_TRACER=y
# kernel cmdline: initcall_debug
```

dmesg에 모든 initcall이 시간과 함께 찍힙니다.

```text
[    0.512] calling  pci_subsys_init+0x0/0x60 @ 1
[    0.745] initcall pci_subsys_init+0x0/0x60 returned 0 after 232 msecs
```

232ms 걸린 `pci_subsys_init`이 PCIe를 쓰지 않는 보드라면 제거 후보입니다.

### 부트 시간 측정 스크립트 예시

아래는 kernel dmesg의 한 milestone과 systemd journal의 별도 milestone을 표시하는 shell 예시입니다. 두 로그의 이벤트가 보장된 것은 아니므로 실제 target에서 확인합니다.

```bash
#!/bin/bash
# boot-time-analyze.sh - dmesg에서 부트 단계별 시간 추출
set -euo pipefail

# 커널 부트 완료 시점
dmesg | awk '/Freeing unused kernel/ { stamp = $2; sub(/\].*/, "", stamp); print "kernel milestone:", stamp; found = 1; exit } END { if (!found) exit 1 }'

# systemd journal은 dmesg와 별도 출처
journalctl -b -o short-monotonic | awk '/Reached target Multi-User System/ { print; exit }'

# 가장 느린 initcall 상위 10개
echo "=== Slowest initcalls ==="
dmesg | grep "initcall.*returned 0 after" | \
    sed 's/.*initcall \(.*\) returned 0 after \([0-9]*\) msecs/\2 \1/' | \
    sort -rn | head -10

```

U-Boot의 bootstage 정보를 환경 변수로 내보내 커널에서 전체 부트 시간을 추적할 수도 있습니다.

```text
=> bootstage stash 0x83000000 0x1000
=> setenv bootargs "${bootargs} bootstage.stash=0x83000000,0x1000"
```

## SPL과 U-Boot 단계 — Falcon mode

U-Boot가 *대화형 셸*을 제공하는 단계와 장치 초기화가 부트 경로에 포함될 수 있습니다. Falcon mode는 설정된 보드에서 SPL이 커널을 직접 적재하는 경로를 제공합니다. 특수 키 입력이나 실패 때 full U-Boot로 전환되는지는 보드의 SPL 정책이 별도로 구현해야 합니다.

```text
CONFIG_SPL_OS_BOOT=y
CONFIG_SPL_FALCON_BOOT_MMC=y
```

Falcon용 kernel·DTB의 형식과 저장 위치는 board code 및 U-Boot 버전이 정합니다. 저장 매체를 갱신하는 명령은 대상 장치·offset·복구 경로를 확인한 뒤 해당 보드 문서를 따라야 하므로 범용 쓰기 명령은 제시하지 않습니다.

Falcon mode는 U-Boot의 유연성과 빠른 handoff 사이의 trade-off입니다. 이를 쓸지는 boot failure recovery, security/update 경로와 target board support를 검증한 뒤 정합니다.

DRAM 초기화 조기 종료, console 끄기, 불필요한 드라이버 제외도 누적되면 큽니다. defconfig에서 제거할 후보는 다음과 같습니다.

```ini
CONFIG_CMD_NET=n           # 네트워크 부팅 안 함
CONFIG_USB_STORAGE=n       # USB 부팅 안 함
CONFIG_CMD_USB=n
CONFIG_CONSOLE_MUX=n
CONFIG_HUSH_PARSER=n       # 양산이면 셸 자체를 빼도 됨
```

Ethernet PHY auto-negotiation은 link partner와 설정에 따라 지연될 수 있습니다. 네트워크가 즉시 필요하지 않다면 이를 boot critical path에서 분리할지 측정 결과로 판단합니다.

## Kernel 단계 — 슬림화

압축 해제 비용은 image format, bootloader, CPU 및 storage에 따라 달라집니다. `zImage`는 ARM용 self-decompressing image, `Image.gz`는 gzip-compressed arm64 image, `Image`는 비압축 image입니다. 누가 압축을 푸는지는 boot flow로 확인하고 실제 boot time을 측정합니다.

```bash
# arch/arm/boot/Makefile
make Image    # 비압축 - 빠른 부팅
make zImage   # gzip - 균형
make lzImage  # lz4 - decompress 빠름, 크기 중간
```

initcall_debug로 시간 잡아먹는 드라이버를 찾아 모듈로 빼거나 제거합니다.

```bash
$ dmesg | grep "returned 0 after" | sort -k 11 -n -r | head
[    1.234] initcall ip_auto_config returned 0 after 700 msecs
[    0.987] initcall mmc_blk_init returned 0 after 234 msecs
[    0.745] initcall pci_subsys_init returned 0 after 232 msecs
```

`ip_auto_config`가 700ms 걸리는 보드는 IP DHCP를 부트 cmdline에서 받고 있을 가능성이 큽니다. rootfs를 NFS가 아니라 eMMC로 바꾸면 사라집니다.

kernel cmdline의 `quiet`와 `loglevel=0`은 console 출력 자체를 줄입니다. 직렬 출력은 의외로 느립니다. 115200bps면 한 줄 80자가 6.9ms입니다. dmesg가 100줄이면 700ms가 console로 빠집니다.

```text
# 디버깅용
console=ttyS0,115200 earlycon loglevel=7

# 양산용
console=null loglevel=0 quiet
```

`PARTUUID=`는 장치 열거 순서가 바뀌어도 partition 식별자를 유지하는 방법입니다. 이를 지정해도 장치 준비 대기 시간이 자동으로 줄어드는 것은 아니므로 storage 초기화와 mount 시간을 따로 측정합니다.

```text
root=PARTUUID=12345678-02 rootwait
```

`rootwait`은 MMC가 준비될 때까지 대기합니다. 없으면 panic으로 빠질 수 있습니다.

## Initramfs — 최소화 또는 제거

표준 distribution은 initramfs를 거쳐 real rootfs로 switch_root 합니다. 임베디드는 rootfs가 항상 같은 자리에 있으므로 initramfs 자체가 불필요한 경우가 많습니다.

```text
# kernel config
CONFIG_INITRAMFS_SOURCE=""   # 비움
```

initramfs가 필요하다면(예: rootfs를 검증하거나 암호화된 volume을 여는 경우) 포함한 도구와 파일을 기록하고, 이미지 크기와 실행 시간을 대상 구성에서 측정합니다.

```bash
#!/bin/sh
# /init - initramfs의 진입점
mount -t proc none /proc
mount -t sysfs none /sys
mount /dev/mmcblk0p2 /newroot
umount /proc /sys
exec switch_root /newroot /sbin/init
```

## Userspace — systemd 의존성 정리

systemd의 `multi-user.target`은 기본적으로 *많은* 서비스에 의존합니다. 임베디드에서는 대부분 불필요합니다.

```bash
$ systemctl disable systemd-resolved.service
$ systemctl disable ModemManager.service
$ systemctl disable NetworkManager-wait-online.service
$ systemctl mask wpa_supplicant.service
```

`NetworkManager-wait-online.service`가 application 시작을 막는지는 unit dependency와 실제 journal로 확인합니다. 네트워크가 application 시작 후 올라와도 되는 제품에서만 dependency를 조정하고 기능 회귀를 시험합니다.

다른 init 시스템은 기능과 의존성이 다릅니다. systemd를 BusyBox init 등으로 바꾸면 부팅 시간이 얼마나 달라지는지 같은 보드와 완료 조건으로 측정하고, 서비스 관리·로그·업데이트 동작도 함께 검증합니다.

application을 직접 init으로 등록하는 극단도 가능합니다.

```text
init=/usr/bin/my-app
```

이 경우 my-app이 필요한 mount, network, log 초기화를 책임져야 합니다. 제품의 완료 조건을 만족하는지와 장애 복구 경로를 함께 검증해야 합니다.

## 실측 사례를 비교하는 방법

다른 보드의 공개 사례를 인용하려면 제조사 문서나 재현 가능한 시험 자료에서 보드 revision, 이미지·커널 버전, 측정 시작점과 완료 조건, 변경 항목을 함께 확인합니다. 이 장에서는 출처와 조건이 확인된 STM32MP1 측정 사례를 제시하지 않으므로 수치를 싣지 않습니다. 자체 결과에는 기준 이미지와 변경 이미지를 같은 장비·전원·저장 매체·완료 조건으로 측정한 기록을 남깁니다.

## 자주 하는 실수

**측정 없이 깎기.** console 출력이나 PHY negotiation을 먼저 끄기보다, 실제 부트 경로에서 어느 단계가 지연되는지 확인합니다.

**release에서 console 끄기 잊기.** `loglevel=7`이면 매 줄마다 직렬 송신에 시간이 듭니다. 양산에서는 0으로.

**Falcon mode 실패 경로 미준비.** Falcon이 실패하면 보드가 벽돌이 됩니다. Fallback을 제공하는지, 실패 시 recovery 진입이 가능한지는 실제 SPL/boot policy에서 확인합니다. Falcon 자체가 자동으로 full U-Boot fallback을 보장하지 않습니다.

**Userspace에서 고정 sleep 사용.** 고정 지연은 실제 의존성을 표현하지 못합니다. systemd unit 사이의 순서·요구 관계를 확인해 적절한 dependency로 표현하고, 서비스가 준비되기 전에 다음 단계가 진행되는 실패 사례도 시험합니다.

**네트워크 초기화를 측정 없이 이동하기.** PHY negotiation 시간과 네트워크 준비 의존성은 PHY, link partner, 설정에 따라 달라집니다. 네트워크가 application 시작 조건인지 확인하고 변경 전후의 시간을 기록합니다.

## 정리

- 부트 시간 최적화는 측정으로 시작합니다. `printk.time=1`, `bootstage report`, `systemd-analyze blame`이 기본 도구입니다.
- 측정에서 가장 큰 지연 구간부터 검토합니다. 변경 후에도 같은 milestone과 workload로 비교합니다.
- U-Boot Falcon mode는 일부 보드에서 bootloader 작업을 줄일 수 있지만 단축 시간은 platform 설정과 측정에 따릅니다.
- Kernel은 `Image` 비압축 + initcall_debug로 무거운 driver 제거 + `quiet loglevel=0`이 기본 조합입니다.
- Initramfs는 보안 검증이 필요하지 않다면 제거하고 PARTUUID로 직접 root mount 합니다.
- systemd는 무겁습니다. BusyBox init이나 application init으로 대체하는 극단을 검토하세요.
- 부팅 시간 주장은 특정 제품·완료 기준·측정 조건을 함께 적습니다. 이 장에서는 target board를 사용한 실측을 하지 않았습니다.

## 다음 편 예고

[Ch 16: Buildroot/Yocto와 BSP](/blog/embedded/bsp/chapter16-rootfs)에서는 BSP를 빌드 시스템(Buildroot/Yocto)에 통합하는 방법을 다룹니다. 외부 트리, 메타레이어, 보드별 오버레이를 설계합니다.

## 관련 항목

- [Ch 14: 디버깅 도구](/blog/embedded/bsp/chapter14-thermal-watchdog) — 측정 도구가 같이 묶입니다
- [Ch 17: 이미지 패키징](/blog/embedded/bsp/chapter17-image-packaging) — 파티션 layout이 부트 경로와 맞물립니다
- [Bootloader 시리즈 — Falcon Mode](/blog/embedded/bootloader/chapter01-boot-problem) — U-Boot 측 깊이 있는 다룸
- [Modern Embedded Recipes — Boot 최적화](/blog/embedded/modern-recipes/00-preface) — recipe 묶음
