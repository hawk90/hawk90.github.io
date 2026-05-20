---
title: "Ch 15: 부트 시간 최적화"
date: 2026-05-09T15:00:00
description: "boot에서 application까지 시간을 줄이는 기법 — measurement, Falcon, deferred init, kernel slim."
series: "BSP Development"
seriesOrder: 15
tags: [embedded, bsp, boot-time, optimization, sub-second]
draft: false
---

## 한 줄 요약

**부트 시간 최적화는 추측이 아니라 측정으로 시작합니다.** 각 단계의 시간을 ms 단위로 쪼개 본 다음, 가장 비싼 단계부터 깎아내려 갑니다.

자동차 인포테인먼트는 후방 카메라를 2초 안에 표시해야 합니다. 산업용 컨트롤러는 정전 복구 후 1초 안에 안전 상태로 돌아와야 합니다. 가전 제품은 사용자가 버튼을 누른 직후 LED가 켜져야 합니다. 부팅이 5초 걸리는 BSP는 이런 요구를 통과하지 못합니다.

이번 글은 ROM에서 application 첫 줄까지의 전 구간을 *측정 가능한 단계*로 나눕니다. 그리고 각 단계에서 시간을 깎는 실전 기법을 정리합니다.

## 단계별 시간 모델

부트는 다음 단계로 나뉩니다. 다음 그림은 각 단계의 시간 비중을 시각화합니다.

![부트 시간 분석 — ROM부터 Application까지 각 단계의 시간 비중](/images/blog/bsp/diagrams/ch15-boot-time-breakdown.svg)

| 단계 | 일반 BSP | 최적화 후 |
|------|----------|-----------|
| ROM → SPL | 50~200ms | 50~80ms |
| SPL → U-Boot | 100~500ms | 30~100ms |
| U-Boot → kernel load | 200ms~2s | 50~200ms |
| Kernel decompress + init | 1~3s | 300~800ms |
| Initramfs → real rootfs | 200~800ms | 0~100ms |
| init → application | 1~5s | 200~500ms |
| **합계** | **3~10s** | **0.6~1.5s** |

각 단계를 측정하지 않고는 어디를 깎을지 알 수 없습니다. 측정 도구를 먼저 갖추는 것이 출발점입니다.

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

자동화된 측정을 위해 시리얼 로그를 파싱하는 스크립트입니다.

```bash
#!/bin/bash
# boot-time-analyze.sh - dmesg에서 부트 단계별 시간 추출

# 커널 부트 완료 시점
KERNEL_DONE=$(dmesg | grep "Freeing unused kernel" | awk '{print $1}' | tr -d '[]')

# systemd 도달 시점
SYSTEMD_START=$(dmesg | grep "systemd\[1\]: Detected" | awk '{print $1}' | tr -d '[]')

# 가장 느린 initcall 상위 10개
echo "=== Slowest initcalls ==="
dmesg | grep "initcall.*returned 0 after" | \
    sed 's/.*initcall \(.*\) returned 0 after \([0-9]*\) msecs/\2 \1/' | \
    sort -rn | head -10

echo ""
echo "Kernel boot: ${KERNEL_DONE}s"
echo "systemd reached: ${SYSTEMD_START}s"
```

U-Boot의 bootstage 정보를 환경 변수로 내보내 커널에서 전체 부트 시간을 추적할 수도 있습니다.

```text
=> bootstage stash 0x83000000 0x1000
=> setenv bootargs "${bootargs} bootstage.stash=0x83000000,0x1000"
```

## SPL과 U-Boot 단계 — Falcon mode

U-Boot가 *대화형 셸*을 제공하는 비용은 작지 않습니다. 환경 변수 로드, console 초기화, USB 스캔 같은 단계가 다 부팅 시간을 잡아먹습니다. Falcon mode는 SPL이 *바로* 커널을 로드하도록 합니다. 평소에는 SPL → kernel, 특수 키를 누르거나 부팅 실패 시에만 full U-Boot로 떨어집니다.

```text
CONFIG_SPL_OS_BOOT=y
CONFIG_SPL_FALCON_BOOT_MMC=y
```

```bash
# Falcon mode 준비 - kernel과 dtb를 SPL이 기대하는 위치에 둠
=> spl export fdt $kernel_addr_r - $fdt_addr_r
=> mmc write $fdt_addr_r 0x500 0x80
```

Falcon mode는 U-Boot의 *유연성*과 *부팅 속도*를 맞바꿉니다. 양산 펌웨어에 권장됩니다.

DRAM 초기화 조기 종료, console 끄기, 불필요한 드라이버 제외도 누적되면 큽니다.

```text
# defconfig에서 제거할 후보
CONFIG_CMD_NET=n          # 네트워크 부팅 안 함
CONFIG_USB_STORAGE=n       # USB 부팅 안 함
CONFIG_CMD_USB=n
CONFIG_CONSOLE_MUX=n
CONFIG_HUSH_PARSER=n      # 양산이면 셸 자체를 빼도 됨
```

이더넷 PHY autoneg은 1~3초가 걸리므로 부팅 경로에 *절대* 두지 말아야 합니다.

## Kernel 단계 — 슬림화

커널 decompression 자체가 무거운 단계입니다. `zImage`는 gzip, `Image.gz`는 동일 압축이고 `Image`는 비압축입니다. 비압축은 디스크 공간을 더 쓰지만 decompress 시간이 0입니다.

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

root는 `PARTUUID=`로 지정하면 rootfs 검색 단계의 random poll이 짧아집니다.

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

initramfs를 꼭 써야 한다면(예: dm-verity 검증) busybox 정적 빌드 + 최소 init 스크립트로 100KB 이내로 만듭니다.

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

`NetworkManager-wait-online.service`는 자주 5~30초 timeout으로 박힙니다. 네트워크가 application 시작 후 올라와도 되는 시스템에서는 mask가 안전합니다.

systemd 자체가 무거우면 BusyBox init이나 finit, OpenRC를 대안으로 검토합니다. systemd → BusyBox init만 바꿔도 userspace 부팅이 1~2초 빨라집니다.

application을 직접 init으로 등록하는 극단도 가능합니다.

```text
init=/usr/bin/my-app
```

이 경우 my-app이 mount, network, log 같은 모든 setup을 책임집니다. 부팅 0.5초 안에 application LED가 켜져야 하는 케이스에서 검토할 만합니다.

## 실전 사례 — STM32MP1에서 1초 이내

ST가 공개한 STM32MP157 0-to-login 최적화는 단계별 숫자를 보여 줍니다.

| 단계 | 기본 | 최적화 |
|------|------|--------|
| ROM bootloader | 60ms | 60ms |
| FSBL (TF-A BL2) | 250ms | 80ms |
| SSBL (U-Boot) | 700ms | 60ms (Falcon) |
| Kernel | 1900ms | 480ms |
| Userspace | 2100ms | 320ms |
| **합계** | **5010ms** | **1000ms** |

깎은 항목은 다음과 같습니다.

- TF-A BL2에서 사용하지 않는 STORAGE/USB 드라이버 제외
- U-Boot Falcon mode 적용
- Kernel `Image.gz` → `Image` (비압축)
- Initramfs 제거, rootfs PARTUUID 직접 root
- systemd → BusyBox init
- application의 의존 라이브러리를 LTO + strip

## 자주 하는 실수

**측정 없이 깎기.** `quiet` 하나 넣고 만족하는 경우가 많습니다. dmesg 안 보고 PHY autoneg 1초를 그대로 두는 BSP가 흔합니다.

**release에서 console 끄기 잊기.** `loglevel=7`이면 매 줄마다 직렬 송신에 시간이 듭니다. 양산에서는 0으로.

**Falcon mode 실패 경로 미준비.** Falcon이 실패하면 보드가 벽돌이 됩니다. SPL이 fallback으로 U-Boot 전체를 로드할 수 있도록 환경을 짜둡니다.

**Userspace에서 sleep 박기.** 어떤 service가 race condition을 피하려고 `sleep 2`를 박아두는 경우가 있습니다. 부팅 2초가 사라집니다. systemd `After=`/`Wants=`로 해결합니다.

**autoneg을 부팅 경로에.** 이더넷 PHY autoneg은 1.5~3초입니다. application이 네트워크를 필요로 한다면 application 시작 후 비동기로 처리합니다.

## 정리

- 부트 시간 최적화는 측정으로 시작합니다. `printk.time=1`, `bootstage report`, `systemd-analyze blame`이 기본 도구입니다.
- 가장 큰 한 덩어리부터 깎습니다. 1초짜리 PHY autoneg 한 개가 0.1초짜리 10개보다 우선입니다.
- U-Boot Falcon mode는 부트로더 단계 시간을 한 자릿수 ms로 끌어내립니다.
- Kernel은 `Image` 비압축 + initcall_debug로 무거운 driver 제거 + `quiet loglevel=0`이 기본 조합입니다.
- Initramfs는 보안 검증이 필요하지 않다면 제거하고 PARTUUID로 직접 root mount 합니다.
- systemd는 무겁습니다. BusyBox init이나 application init으로 대체하는 극단을 검토하세요.
- STM32MP1, i.MX8M, RK3568 같은 메인스트림 SoC에서 1초 이내 부팅이 실현 가능합니다.

## 다음 편 예고

[Ch 16: Buildroot/Yocto와 BSP](/blog/embedded/bsp/chapter16-rootfs)에서는 BSP를 빌드 시스템(Buildroot/Yocto)에 통합하는 방법을 다룹니다. 외부 트리, 메타레이어, 보드별 오버레이를 설계합니다.

## 관련 항목

- [Ch 14: 디버깅 도구](/blog/embedded/bsp/chapter14-debugging-tools) — 측정 도구가 같이 묶입니다
- [Ch 17: 이미지 패키징](/blog/embedded/bsp/chapter17-image-packaging) — 파티션 layout이 부트 경로와 맞물립니다
- [Bootloader 시리즈 — Falcon Mode](/blog/embedded/bootloader/) — U-Boot 측 깊이 있는 다룸
- [Modern Embedded Recipes — Boot 최적화](/blog/embedded/modern-recipes/) — recipe 묶음
