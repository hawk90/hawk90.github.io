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

**부트 시간 최적화는 추측이 아니라 측정으로 시작합니다.** 각 단계의 시간을 쪼개 본 다음, 가장 큰 구간부터 봅니다.

제품마다 부팅 완료의 정의가 다릅니다. 후방 카메라 영상 표시, 안전 상태 복구, UI 준비처럼 완료 조건을 먼저 정해야 같은 조건으로 전후를 비교할 수 있습니다. 이 장은 Ch 10에서 끝까지 돌린 QEMU 체인(TF-A v2.15.0 → U-Boot v2024.04 → Linux 6.12 `defconfig` → Debian 13)을 측정 대상으로 씁니다. TCG 에뮬레이션이라 절대값은 실제 보드와 다르고, 이 장에서 실제 보드를 잰 값은 없습니다. 도구가 무엇을 보여 주는지와 가장 큰 구간을 고르는 절차를 실측으로 보여 주는 것이 목적입니다.

## 단계별 시간 모델

아래 그림은 Ch 10 실행에서 호스트가 잰 시각입니다. U-Boot 구간에는 autoboot를 멈추고 TFTP 명령을 넣은 시간과 38 MB 전송이 들어 있습니다.

![부트 시간 분석 — QEMU 체인 실측](/images/blog/bsp/diagrams/ch15-boot-time-breakdown.svg)

| 단계 | 시작 줄 | 끝 줄 | 호스트 시각 |
|------|-------------|-----------|------------|
| TF-A | `Booting Trusted Firmware` | `EL3 exit to normal world` | 0.052 → 0.075 s |
| U-Boot | `U-Boot 2024.04` | `Starting kernel ...` | 0.085 → 2.713 s |
| Kernel | `Booting Linux` | `Run /sbin/init` | 2.742 → 3.609 s |
| Userspace | systemd 시작 | `Reached target multi-user.target` | 3.609 → 15.223 s |

실제 보드에서는 같은 표를 같은 시작·끝 줄로 채웁니다. 시리얼 줄에 호스트 시각을 붙이는 방법은 이 장의 측정처럼 터미널 프로그램의 타임스탬프 기능이나 로그 스크립트를 씁니다.

## 측정 — 단계별 도구

### U-Boot: `bootstage report`

U-Boot에는 단계별 시각을 기록하는 bootstage가 있습니다. `qemu_arm64_defconfig`에는 꺼져 있어 `CONFIG_BOOTSTAGE`, `CONFIG_CMD_BOOTSTAGE`, `CONFIG_BOOTSTAGE_REPORT`를 켜고 빌드해 QEMU virt에서 돌렸습니다.

```text
=> bootstage report
Timer summary in microseconds (9 records):
       Mark    Elapsed  Stage
          0          0  reset
      1,252      1,252  board_init_f
     17,584     16,332  board_init_r
     84,490     66,906  eth_common_init
     85,114        624  main_loop
     86,166      1,052  usb_start
    297,598    211,432  cli_loop

Accumulated time:
                 3,704  dm_f
                 9,856  dm_r
```

`board_init_r`에서 `eth_common_init`까지 67 ms가 가장 큽니다. `eth_common_init()`은 첫 줄에서 이 표시를 남기므로(`net/eth_common.c:32-34`), 이 67 ms는 네트워크 초기화가 아니라 그 *앞*의 일, 즉 `common/board_r.c`의 `init_sequence_r`에서 `initr_net` 전에 도는 flash·환경·stdio·콘솔 초기화 시간입니다. 같은 로그에는 `Flash: 64 MiB`, `Loading Environment from Flash...`가 있고 `Net: No ethernet found.`로 NIC는 없었습니다. `cli_loop`까지의 211 ms는 autoboot 카운트다운을 멈추고 명령을 친 시간이 섞인 값입니다. `bootm`이 커널로 넘어가기 직전 `start_kernel` 표시를 남기고 report를 찍으며(`arch/arm/lib/bootm.c:57-62`), `CONFIG_BOOTSTAGE_FDT`(`boot/Kconfig:955`)를 켜면 이 기록을 커널에 넘기는 DT에 넣습니다(`common/bootstage.c:321`).

### Kernel: printk 시각과 `initcall_debug`

`CONFIG_PRINTK_TIME=y`(arm64 `defconfig`의 값, Ch 8)이면 커널 로그마다 커널 시작 기준 시각이 붙습니다. Ch 10에서 `Booting Linux`(0.000000)부터 `Run /sbin/init`(0.756240)까지 0.76초였습니다.

어느 initcall이 시간을 쓰는지는 `initcall_debug ignore_loglevel`로 봅니다(Ch 11). root 없이 같은 커널을 부팅해 `returned ... after N usecs`를 정렬한 상위 10개입니다.

```bash
grep -a "initcall .* returned" run4-initcall.log | \
  sed 's/.*initcall \(.*\) returned \(-*[0-9]*\) after \([0-9]*\) usecs/\3 \1 \2/' | \
  sort -rn | head -10
```

```text
36000 of_platform_default_populate_init+0x0/0x118 0
33720 jent_mod_init+0x0/0x114 0
18441 chr_dev_init+0x0/0xa8 0
17748 gen_pci_driver_init+0x0/0x28 0
16000 sock_init+0x0/0x100 0
10966 param_sysfs_builtin_init+0x0/0x1c4 0
10790 physmap_init+0x0/0x28 0
10418 loop_init+0x0/0x10c 0
9040 inet_init+0x0/0x2b0 0
8388 virtio_net_driver_init+0x0/0xb8 0
```

첫 줄은 DT 노드를 platform device로 만드는 initcall(`drivers/of/platform.c:503`)이고, 두 번째 `jent_mod_init`은 jitter entropy RNG 초기화(`crypto/jitterentropy-kcapi.c:333`)입니다. 줄인다면 제품에 필요 없는 기능을 빌드에서 빼는 쪽이고(Ch 8), 빼기 전후를 같은 명령으로 다시 잽니다. 예전 자료의 `CONFIG_BOOT_TRACER`는 linux-6.12의 `kernel/trace/Kconfig`에 없습니다.

### Userspace: `systemd-analyze`

Ch 10과 같은 부팅에서 login 뒤 실행했습니다.

```text
$ systemd-analyze
Startup finished in 882ms (kernel) + 11.435s (userspace) = 12.317s
graphical.target reached after 11.432s in userspace.
$ systemd-analyze blame --no-pager | head -8
6.831s dev-vda1.device
5.779s systemd-udev-trigger.service
1.588s user@0.service
1.112s systemd-resolved.service
 935ms grub-common.service
 855ms ssh.service
 854ms systemd-logind.service
 809ms dev-hugepages.mount
$ systemd-analyze critical-chain --no-pager | head -12
...
graphical.target @11.432s
└─multi-user.target @11.431s
  └─unattended-upgrades.service @11.421s
    └─systemd-logind.service @10.544s +854ms
      └─basic.target @10.225s
        └─sockets.target @10.224s
          └─uuidd.socket @10.223s
            └─sysinit.target @10.176s
              └─systemd-tmpfiles-setup.service @9.586s +565ms
```

`blame`은 각 unit이 걸린 시간이고, `critical-chain`은 목표에 이르는 경로입니다. 이 Debian 이미지의 `critical-chain`에는 `unattended-upgrades.service`가, `blame`에는 `grub-common.service`(935 ms)가 있습니다. 둘 다 임베디드 제품에 필요 없는 unit입니다. 그래서 제품용 rootfs는 Buildroot·Yocto로 필요한 unit만 넣어 만듭니다(Ch 16). Buildroot에는 그래프로 보는 `systemd-bootchart` 패키지도 있습니다(`package/systemd-bootchart/Config.in`).

## SPL과 U-Boot 단계 — Falcon mode

U-Boot proper를 건너뛰고 SPL이 커널을 직접 적재하는 것이 Falcon mode입니다. Kconfig는 `CONFIG_SPL_OS_BOOT`(`common/spl/Kconfig:1108`)와 MMC/SD용 `CONFIG_SPL_FALCON_BOOT_MMCSD`(1134행)입니다. 예전 자료의 `CONFIG_SPL_FALCON_BOOT_MMC`라는 이름은 v2024.04에 없습니다. Falcon을 실제로 빌드하고 `spl export`로 준비하는 과정은 [Bootloader Ch 5](/blog/embedded/bootloader/chapter05-falcon-mode)에 있습니다. 실패했을 때 full U-Boot로 돌아가는 경로는 보드 코드가 따로 만들어야 합니다.

U-Boot 자체를 줄일 때는 bootstage에서 큰 구간을 고릅니다. 위 측정에서 가장 큰 구간은 `board_init_r`부터 네트워크 초기화 전까지(flash 탐색, 환경 적재, stdio·video 콘솔)였습니다. 이 구간을 더 쪼개려면 그 사이 함수에 `bootstage_mark()`를 더해 다시 잽니다. 무엇을 뺄지는 그렇게 나눈 결과로 정합니다.

## Kernel 단계 — 슬림화

arm64의 커널 이미지 형식은 `arch/arm64/boot/Makefile:19-20`의 target 목록(`Image`, `Image.gz`, `Image.lz4`, `Image.zst` 등)에서 고릅니다. 커널에 압축 해제기가 없으므로(`booting.rst:63-65`) 압축 이미지를 푸는 시간은 부트로더 몫이고, 압축하면 저장 매체에서 읽을 바이트가 줄어듭니다. Ch 8 빌드에서 `Image`는 38,246,912바이트, `Image.gz`는 13,874,511바이트였습니다. 어느 쪽이 빠른지는 매체 읽기 속도와 부트로더의 해제 속도에 달려 있으므로 대상 보드에서 둘 다 잽니다. 예전 자료의 `lzImage` target은 arm64 Makefile에 없습니다.

콘솔 출력에도 시간이 듭니다. 115200 bps, 8N1이면 한 글자에 10비트이므로 80글자 한 줄은 80 × 10 / 115200 ≈ 6.9 ms입니다. 양산 이미지에서 `quiet`나 낮은 `loglevel`을 주는 이유입니다. 단, Ch 11의 진단은 이 출력에 기대므로 bring-up 동안에는 끄지 않습니다.

`rootwait`은 root 장치가 나타날 때까지 기다립니다(Ch 8). Ch 10의 커널은 `vda: vda1 vda15`(0.459초)를 본 뒤 0.667초에 root를 마운트했습니다.

## Initramfs — 최소화 또는 제거

initramfs는 `CONFIG_INITRAMFS_SOURCE`(`usr/Kconfig:6`)나 부트로더가 따로 넘기는 이미지로 들어갑니다. Ch 10의 부팅은 initramfs 없이 커널이 바로 virtio 디스크의 ext4를 root로 마운트했습니다. rootfs 검증이나 암호화 볼륨을 여는 단계가 필요할 때만 initramfs를 넣고, 넣으면 그 크기와 실행 시간을 같은 방식으로 잽니다.

```bash
#!/bin/sh
# /init - initramfs의 진입점 예
mount -t proc none /proc
mount -t sysfs none /sys
mount /dev/mmcblk0p2 /newroot
umount /proc /sys
exec switch_root /newroot /sbin/init
```

## Userspace — systemd 의존성 정리

`critical-chain`에 제품과 무관한 unit이 있으면 끕니다. 위 Debian 이미지라면 `unattended-upgrades.service`가 `multi-user.target` 직전에 있었습니다.

```bash
systemctl disable unattended-upgrades.service
systemctl mask grub-common.service
```

끈 뒤 `systemd-analyze`를 다시 돌려 목표 도달 시각을 비교합니다. 이 글에서는 끈 뒤의 재측정을 하지 않았습니다. application을 init으로 직접 등록하는 방법(`init=/usr/bin/my-app`)은 mount, 로그, 재시작을 그 프로그램이 모두 맡아야 하고, init이 없으면 커널이 `Requested init ... failed`로 panic합니다(Ch 11).

## 자주 하는 실수

**측정 없이 깎기.** 위 측정에서 가장 큰 구간은 userspace였고, 그 안에서도 디스크 장치 대기와 udev였습니다. 콘솔이나 PHY부터 끄는 것은 측정이 그쪽을 가리킬 때만 합니다.

**`initcall_debug`만 주기.** `ignore_loglevel` 없이는 콘솔에 나오지 않습니다(Ch 11).

**TCG·에뮬레이터 수치를 보드 수치로 옮기기.** 이 장의 숫자는 QEMU TCG의 값입니다. 절차는 같지만 숫자는 보드에서 다시 잽니다.

**Falcon mode 실패 경로 미준비.** Falcon이 실패했을 때 full U-Boot나 복구로 가는 경로는 자동으로 생기지 않습니다.

## 정리

- 부트 시간은 단계별 시작·끝 줄을 정해 같은 조건으로 잽니다.
- U-Boot는 `bootstage report`, 커널은 printk 시각과 `initcall_debug ignore_loglevel`, userspace는 `systemd-analyze blame`/`critical-chain`으로 쪼갭니다.
- QEMU 체인에서 가장 큰 구간은 userspace(약 11.6초)였고, 커널은 0.76초, U-Boot bootstage에서는 네트워크 초기화 전까지의 `board_init_r` 구간 67 ms가 가장 컸습니다.
- 예전 이름 `CONFIG_BOOT_TRACER`, `lzImage`, `CONFIG_SPL_FALCON_BOOT_MMC`는 현재 소스에 없습니다.
- 변경은 측정이 가리킨 곳부터 하고, 변경 뒤 같은 도구로 다시 잽니다.

## 다음 편 예고

[Ch 16: Buildroot/Yocto와 BSP](/blog/embedded/bsp/chapter16-rootfs)에서는 BSP를 빌드 시스템(Buildroot/Yocto)에 통합하는 방법을 다룹니다. 외부 트리, 메타레이어, 보드별 오버레이를 설계합니다.

## 관련 항목

- [Ch 10: 첫 부팅 추적](/blog/embedded/bsp/chapter10-first-boot) — 이 장이 잰 부팅 로그
- [Ch 11: 부트로그 디버깅](/blog/embedded/bsp/chapter11-bootlog-debugging) — `initcall_debug`
- [Ch 17: 이미지 패키징](/blog/embedded/bsp/chapter17-image-packaging) — 파티션 layout이 부트 경로와 맞물립니다
- [Bootloader Ch 5 — Falcon Mode](/blog/embedded/bootloader/chapter05-falcon-mode) — Falcon 빌드와 `spl export`
- [Modern Embedded Recipes — Boot 최적화](/blog/embedded/modern-recipes/00-preface) — recipe 묶음
